import { supabase } from '@/integrations/supabase/client';

export interface FlowAnalysisResult {
  insights: AIInsight[];
  patterns: DetectedPattern[];
  anomalies: FlowAnomaly[];
  summary: AnalysisSummary;
}

export interface AIInsight {
  id?: string;
  type: 'pattern' | 'anomaly' | 'trend' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  dataPoints: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

export interface DetectedPattern {
  id?: string;
  patternType: 'sweep' | 'block' | 'unusual_volume' | 'price_movement' | 'momentum';
  ticker: string;
  name: string;
  description: string;
  conditions: Record<string, unknown>;
  occurrences: number;
  successRate?: number;
  avgReturn?: number;
  timeHorizon?: number;
}

export interface FlowAnomaly {
  type: 'volume' | 'premium' | 'timing' | 'unusual_activity';
  ticker: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  dataPoints: Record<string, unknown>[];
  timestamp: Date;
}

export interface AnalysisSummary {
  totalFlowsAnalyzed: number;
  patternsDetected: number;
  anomaliesFound: number;
  topTickers: Array<{ ticker: string; activity: number }>;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  riskLevel: 'low' | 'medium' | 'high';
}

export class AIAnalysisService {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  async analyzeFlowData(timeRange: 'today' | 'week' | 'month' = 'today'): Promise<FlowAnalysisResult> {
    const flows = await this.getFlowData(timeRange);
    const historicalData = await this.getHistoricalData(timeRange);

    const insights = await this.generateInsights(flows, historicalData);
    const patterns = await this.detectPatterns(flows, historicalData);
    const anomalies = await this.detectAnomalies(flows, historicalData);
    const summary = this.generateSummary(flows, patterns, anomalies);

    // Store insights in database
    await this.storeInsights(insights);
    await this.storePatterns(patterns);

    return {
      insights,
      patterns,
      anomalies,
      summary
    };
  }

  private async getFlowData(timeRange: string) {
    const startDate = this.getStartDate(timeRange);
    
    const { data, error } = await supabase
      .from('options_flow')
      .select('*')
      .eq('user_id', this.userId)
      .gte('time_of_trade', startDate.toISOString())
      .order('time_of_trade', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async getHistoricalData(timeRange: string) {
    const endDate = this.getStartDate(timeRange);
    const historicalStartDate = new Date(endDate);
    historicalStartDate.setDate(historicalStartDate.getDate() - 30); // Get 30 days of historical data

    const { data, error } = await supabase
      .from('options_flow')
      .select('*')
      .eq('user_id', this.userId)
      .gte('time_of_trade', historicalStartDate.toISOString())
      .lt('time_of_trade', endDate.toISOString())
      .order('time_of_trade', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  private async generateInsights(flows: Record<string, unknown>[], historicalData: Record<string, unknown>[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // High-value flow analysis
    const highValueFlows = flows.filter(f => (f.premium as number) > 500000); // >$500K
    if (highValueFlows.length > 0) {
      const avgHistoricalHighValue = historicalData.filter(f => (f.premium as number) > 500000).length;
      const changePercent = ((highValueFlows.length - avgHistoricalHighValue) / Math.max(avgHistoricalHighValue, 1)) * 100;
      
      insights.push({
        type: 'trend',
        title: 'High-Value Flow Activity',
        description: `Detected ${highValueFlows.length} high-value flows (>$500K) today, ${changePercent > 0 ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(1)}% from recent average.`,
        confidence: 0.85,
        dataPoints: highValueFlows.map(f => ({
          ticker: f.ticker_symbol as string,
          premium: f.premium as number,
          type: f.option_type as string,
          trade_type: f.trade_type as string
        }))
      });
    }

    // Unusual volume patterns
    const tickerVolume = this.groupByTicker(flows);
    const historicalTickerVolume = this.groupByTicker(historicalData);
    
    for (const [ticker, todayFlows] of Object.entries(tickerVolume)) {
      const historicalAvg = (historicalTickerVolume[ticker]?.length || 0) / 30; // Daily average
      const volumeIncrease = todayFlows.length / Math.max(historicalAvg, 1);
      
      if (volumeIncrease > 3 && todayFlows.length > 5) { // 3x increase with minimum volume
        insights.push({
          type: 'anomaly',
          title: `Unusual Volume: ${ticker}`,
          description: `${ticker} showing ${volumeIncrease.toFixed(1)}x normal flow volume with ${todayFlows.length} flows vs ${historicalAvg.toFixed(1)} average.`,
          confidence: Math.min(0.9, 0.6 + (volumeIncrease - 3) * 0.1),
          dataPoints: todayFlows.slice(0, 5) // Top 5 flows
        });
      }
    }

    // Call/Put ratio analysis
    const callPutRatio = this.calculateCallPutRatio(flows);
    const historicalCallPutRatio = this.calculateCallPutRatio(historicalData);
    
    if (Math.abs(callPutRatio.ratio - historicalCallPutRatio.ratio) > 0.3) {
      insights.push({
        type: 'trend',
        title: 'Sentiment Shift Detected',
        description: `Call/Put ratio shifted to ${callPutRatio.ratio.toFixed(2)} from ${historicalCallPutRatio.ratio.toFixed(2)} historical average, indicating ${callPutRatio.ratio > historicalCallPutRatio.ratio ? 'bullish' : 'bearish'} sentiment.`,
        confidence: 0.75,
        dataPoints: [callPutRatio, historicalCallPutRatio]
      });
    }

    return insights;
  }

  private async detectPatterns(flows: Record<string, unknown>[], historicalData: Record<string, unknown>[]): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    const allData = [...flows, ...historicalData];

    // Detect sweep patterns
    const sweepPatterns = this.detectSweepPatterns(allData);
    patterns.push(...sweepPatterns);

    // Detect block patterns
    const blockPatterns = this.detectBlockPatterns(allData);
    patterns.push(...blockPatterns);

    // Detect momentum patterns
    const momentumPatterns = this.detectMomentumPatterns(allData);
    patterns.push(...momentumPatterns);

    return patterns;
  }

  private detectSweepPatterns(flows: Record<string, unknown>[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const sweepFlows = flows.filter(f => f.trade_type === 'sweep');
    
    // Group by ticker and look for patterns
    const tickerSweeps = this.groupByTicker(sweepFlows);
    
    for (const [ticker, sweeps] of Object.entries(tickerSweeps)) {
      if (sweeps.length < 3) continue; // Need at least 3 sweeps to identify pattern
      
      const highValueSweeps = sweeps.filter(s => s.premium > 100000);
      const avgPremium = sweeps.reduce((sum, s) => sum + s.premium, 0) / sweeps.length;
      
      if (highValueSweeps.length >= 2) {
        patterns.push({
          patternType: 'sweep',
          ticker,
          name: `${ticker} Large Sweep Activity`,
          description: `Pattern of ${highValueSweeps.length} high-value sweeps (avg $${(avgPremium / 1000).toFixed(0)}K) detected`,
          conditions: {
            minSweeps: 3,
            minPremium: 100000,
            timeWindow: '1day'
          },
          occurrences: highValueSweeps.length
        });
      }
    }

    return patterns;
  }

  private detectBlockPatterns(flows: Record<string, unknown>[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const blockFlows = flows.filter(f => f.trade_type === 'block');
    
    const tickerBlocks = this.groupByTicker(blockFlows);
    
    for (const [ticker, blocks] of Object.entries(tickerBlocks)) {
      if (blocks.length < 2) continue;
      
      const totalPremium = blocks.reduce((sum, b) => sum + b.premium, 0);
      if (totalPremium > 1000000) { // $1M+ in blocks
        patterns.push({
          patternType: 'block',
          ticker,
          name: `${ticker} Large Block Activity`,
          description: `Significant block trading detected: ${blocks.length} blocks totaling $${(totalPremium / 1000000).toFixed(1)}M`,
          conditions: {
            minBlocks: 2,
            minTotalPremium: 1000000
          },
          occurrences: blocks.length
        });
      }
    }

    return patterns;
  }

  private detectMomentumPatterns(flows: Record<string, unknown>[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const tickerFlows = this.groupByTicker(flows);
    
    for (const [ticker, tickerData] of Object.entries(tickerFlows)) {
      if (tickerData.length < 5) continue;
      
      // Sort by time
      const sortedFlows = tickerData.sort((a, b) => 
        new Date(a.time_of_trade).getTime() - new Date(b.time_of_trade).getTime()
      );
      
      // Look for increasing premium pattern
      let momentumCount = 0;
      for (let i = 1; i < sortedFlows.length; i++) {
        if (sortedFlows[i].premium > sortedFlows[i-1].premium) {
          momentumCount++;
        }
      }
      
      if (momentumCount >= 3) {
        patterns.push({
          patternType: 'momentum',
          ticker,
          name: `${ticker} Premium Momentum`,
          description: `Increasing premium trend detected across ${momentumCount} consecutive flows`,
          conditions: {
            minConsecutiveIncreases: 3,
            minFlows: 5
          },
          occurrences: momentumCount
        });
      }
    }

    return patterns;
  }

  private async detectAnomalies(flows: Record<string, unknown>[], historicalData: Record<string, unknown>[]): Promise<FlowAnomaly[]> {
    const anomalies: FlowAnomaly[] = [];
    
    // Detect unusual timing patterns
    const timingAnomalies = this.detectTimingAnomalies(flows);
    anomalies.push(...timingAnomalies);
    
    // Detect premium anomalies
    const premiumAnomalies = this.detectPremiumAnomalies(flows, historicalData);
    anomalies.push(...premiumAnomalies);
    
    return anomalies;
  }

  private detectTimingAnomalies(flows: Record<string, unknown>[]): FlowAnomaly[] {
    const anomalies: FlowAnomaly[] = [];
    const hourlyActivity = new Map<number, number>();
    
    flows.forEach(flow => {
      const hour = new Date(flow.time_of_trade).getHours();
      hourlyActivity.set(hour, (hourlyActivity.get(hour) || 0) + 1);
    });
    
    // Check for unusual after-hours activity
    const afterHours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 17, 18, 19, 20, 21, 22, 23];
    let afterHoursCount = 0;
    
    afterHours.forEach(hour => {
      afterHoursCount += hourlyActivity.get(hour) || 0;
    });
    
    if (afterHoursCount > flows.length * 0.3) { // More than 30% after hours
      anomalies.push({
        type: 'timing',
        ticker: 'MARKET',
        description: `Unusual after-hours activity detected: ${afterHoursCount} flows (${((afterHoursCount / flows.length) * 100).toFixed(1)}% of total)`,
        severity: 'medium',
        dataPoints: Array.from(hourlyActivity.entries()),
        timestamp: new Date()
      });
    }
    
    return anomalies;
  }

  private detectPremiumAnomalies(flows: Record<string, unknown>[], historicalData: Record<string, unknown>[]): FlowAnomaly[] {
    const anomalies: FlowAnomaly[] = [];
    
    if (historicalData.length === 0) return anomalies;
    
    const historicalAvgPremium = historicalData.reduce((sum, f) => sum + f.premium, 0) / historicalData.length;
    const todayAvgPremium = flows.reduce((sum, f) => sum + f.premium, 0) / flows.length;
    
    const premiumChange = (todayAvgPremium - historicalAvgPremium) / historicalAvgPremium;
    
    if (Math.abs(premiumChange) > 0.5) { // 50% change
      anomalies.push({
        type: 'premium',
        ticker: 'MARKET',
        description: `Average premium ${premiumChange > 0 ? 'increased' : 'decreased'} by ${(Math.abs(premiumChange) * 100).toFixed(1)}% from historical average`,
        severity: Math.abs(premiumChange) > 1 ? 'high' : 'medium',
        dataPoints: [
          { type: 'historical', value: historicalAvgPremium },
          { type: 'current', value: todayAvgPremium }
        ],
        timestamp: new Date()
      });
    }
    
    return anomalies;
  }

  private generateSummary(flows: Record<string, unknown>[], patterns: DetectedPattern[], anomalies: FlowAnomaly[]): AnalysisSummary {
    const tickerActivity = this.groupByTicker(flows);
    const topTickers = Object.entries(tickerActivity)
      .map(([ticker, flows]) => ({ ticker, activity: flows.length }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 5);
    
    const callPutRatio = this.calculateCallPutRatio(flows);
    const marketSentiment = callPutRatio.ratio > 1.2 ? 'bullish' : 
                           callPutRatio.ratio < 0.8 ? 'bearish' : 'neutral';
    
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high').length;
    const riskLevel = highSeverityAnomalies > 2 ? 'high' : 
                     anomalies.length > 3 ? 'medium' : 'low';
    
    return {
      totalFlowsAnalyzed: flows.length,
      patternsDetected: patterns.length,
      anomaliesFound: anomalies.length,
      topTickers,
      marketSentiment,
      riskLevel
    };
  }

  private async storeInsights(insights: AIInsight[]): Promise<void> {
    const insightsToStore = insights.map(insight => ({
      user_id: this.userId,
      insight_type: insight.type,
      title: insight.title,
      description: insight.description,
      confidence_score: insight.confidence,
      data_points: insight.dataPoints,
      metadata: insight.metadata || {}
    }));

    const { error } = await supabase
      .from('ai_insights')
      .insert(insightsToStore);

    if (error) {
      console.error('Error storing insights:', error);
    }
  }

  private async storePatterns(patterns: DetectedPattern[]): Promise<void> {
    for (const pattern of patterns) {
      // Check if pattern already exists
      const { data: existing } = await supabase
        .from('flow_patterns')
        .select('id, occurrences')
        .eq('user_id', this.userId)
        .eq('ticker_symbol', pattern.ticker)
        .eq('pattern_type', pattern.patternType)
        .single();

      if (existing) {
        // Update existing pattern
        await supabase
          .from('flow_patterns')
          .update({
            occurrences: existing.occurrences + pattern.occurrences,
            last_seen: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new pattern
        await supabase
          .from('flow_patterns')
          .insert({
            user_id: this.userId,
            pattern_type: pattern.patternType,
            ticker_symbol: pattern.ticker,
            pattern_name: pattern.name,
            description: pattern.description,
            occurrences: pattern.occurrences,
            conditions: pattern.conditions,
            success_rate: pattern.successRate,
            avg_return: pattern.avgReturn,
            time_horizon: pattern.timeHorizon
          });
      }
    }
  }

  private groupByTicker(flows: Record<string, unknown>[]): Record<string, Record<string, unknown>[]> {
    return flows.reduce((acc, flow) => {
      const ticker = flow.ticker_symbol as string;
      if (!acc[ticker]) acc[ticker] = [];
      acc[ticker].push(flow);
      return acc;
    }, {});
  }

  private calculateCallPutRatio(flows: Record<string, unknown>[]): { ratio: number; calls: number; puts: number } {
    const calls = flows.filter(f => (f.option_type as string).toLowerCase() === 'call' || (f.option_type as string).toLowerCase() === 'c').length;
    const puts = flows.filter(f => (f.option_type as string).toLowerCase() === 'put' || (f.option_type as string).toLowerCase() === 'p').length;
    const ratio = puts === 0 ? calls : calls / puts;
    
    return { ratio, calls, puts };
  }

  private getStartDate(timeRange: string): Date {
    const now = new Date();
    switch (timeRange) {
      case 'today':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'week': {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        return weekAgo;
      }
      case 'month': {
        const monthAgo = new Date(now);
        monthAgo.setMonth(now.getMonth() - 1);
        return monthAgo;
      }
      default:
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  // Public method to get stored insights
  async getStoredInsights(limit: number = 10): Promise<AIInsight[]> {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching insights:', error);
      return [];
    }

    return data?.map(insight => ({
      id: insight.id,
      type: insight.insight_type as 'pattern' | 'anomaly' | 'trend' | 'prediction',
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence_score,
      dataPoints: insight.data_points,
      metadata: insight.metadata
    })) || [];
  }

  // Public method to get stored patterns
  async getStoredPatterns(ticker?: string): Promise<DetectedPattern[]> {
    let query = supabase
      .from('flow_patterns')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_active', true);

    if (ticker) {
      query = query.eq('ticker_symbol', ticker);
    }

    const { data, error } = await query
      .order('last_seen', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching patterns:', error);
      return [];
    }

    return data?.map(pattern => ({
      id: pattern.id,
      patternType: pattern.pattern_type as 'sweep' | 'block' | 'unusual_volume' | 'price_movement' | 'momentum',
      ticker: pattern.ticker_symbol,
      name: pattern.pattern_name,
      description: pattern.description,
      conditions: pattern.conditions,
      occurrences: pattern.occurrences,
      successRate: pattern.success_rate,
      avgReturn: pattern.avg_return,
      timeHorizon: pattern.time_horizon
    })) || [];
  }
}