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
    historicalStartDate.setDate(historicalStartDate.getDate() - 30);

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

  private async generateInsights(flows: any[], historicalData: any[]): Promise<AIInsight[]> {
    const insights: AIInsight[] = [];

    // High-value flow analysis
    const highValueFlows = flows.filter(f => (f.premium || 0) > 500000);
    if (highValueFlows.length > 0) {
      const avgHistoricalHighValue = historicalData.filter(f => (f.premium || 0) > 500000).length;
      const changePercent = avgHistoricalHighValue > 0 
        ? ((highValueFlows.length - avgHistoricalHighValue) / avgHistoricalHighValue) * 100 
        : 100;
      
      insights.push({
        type: 'trend',
        title: 'High-Value Flow Activity',
        description: `Detected ${highValueFlows.length} high-value flows (>$500K) today, ${changePercent > 0 ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(1)}% from recent average.`,
        confidence: 0.85,
        dataPoints: highValueFlows.map(f => ({
          ticker: f.ticker_symbol,
          premium: f.premium,
          type: f.option_type,
          trade_type: f.trade_type
        }))
      });
    }

    return insights;
  }

  private async detectPatterns(flows: any[], historicalData: any[]): Promise<DetectedPattern[]> {
    const patterns: DetectedPattern[] = [];
    
    // Detect sweep patterns
    const sweepFlows = flows.filter(f => f.trade_type === 'sweep');
    const tickerSweeps = this.groupByTicker(sweepFlows);
    
    for (const [ticker, sweeps] of Object.entries(tickerSweeps)) {
      if (sweeps.length >= 3) {
        const highValueSweeps = sweeps.filter(s => (s.premium || 0) > 100000);
        const avgPremium = sweeps.reduce((sum, s) => sum + (s.premium || 0), 0) / sweeps.length;
        
        if (highValueSweeps.length >= 2) {
          patterns.push({
            patternType: 'sweep',
            ticker,
            name: `${ticker} Large Sweep Activity`,
            description: `Pattern of ${highValueSweeps.length} high-value sweeps detected`,
            conditions: {
              minSweeps: 3,
              minPremium: 100000,
              timeWindow: '1day'
            },
            occurrences: highValueSweeps.length
          });
        }
      }
    }

    return patterns;
  }

  private async detectAnomalies(flows: any[], historicalData: any[]): Promise<FlowAnomaly[]> {
    const anomalies: FlowAnomaly[] = [];
    
    // Basic timing anomaly detection
    const afterHoursFlows = flows.filter(flow => {
      const hour = new Date(flow.time_of_trade).getHours();
      return hour < 9 || hour > 16;
    });
    
    if (afterHoursFlows.length > flows.length * 0.3) {
      anomalies.push({
        type: 'timing',
        ticker: 'MARKET',
        description: `Unusual after-hours activity: ${afterHoursFlows.length} flows`,
        severity: 'medium',
        dataPoints: afterHoursFlows,
        timestamp: new Date()
      });
    }
    
    return anomalies;
  }

  private generateSummary(flows: any[], patterns: DetectedPattern[], anomalies: FlowAnomaly[]): AnalysisSummary {
    const tickerActivity = this.groupByTicker(flows);
    const topTickers = Object.entries(tickerActivity)
      .map(([ticker, flowList]) => ({ ticker, activity: flowList.length }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 5);
    
    const calls = flows.filter(f => (f.option_type || '').toLowerCase() === 'call').length;
    const puts = flows.filter(f => (f.option_type || '').toLowerCase() === 'put').length;
    const callPutRatio = puts === 0 ? calls : calls / puts;
    
    const marketSentiment = callPutRatio > 1.2 ? 'bullish' : 
                           callPutRatio < 0.8 ? 'bearish' : 'neutral';
    
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

  private groupByTicker(flows: any[]): Record<string, any[]> {
    return flows.reduce((acc, flow) => {
      const ticker = flow.ticker_symbol || 'UNKNOWN';
      if (!acc[ticker]) acc[ticker] = [];
      acc[ticker].push(flow);
      return acc;
    }, {} as Record<string, any[]>);
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

  // Mock method for stored insights since ai_insights table doesn't exist
  async getStoredInsights(limit: number = 10): Promise<AIInsight[]> {
    return [
      {
        id: '1',
        type: 'trend',
        title: 'Market Momentum',
        description: 'Strong bullish momentum detected across tech sector',
        confidence: 0.82,
        dataPoints: []
      },
      {
        id: '2',
        type: 'pattern',
        title: 'Sweep Activity',
        description: 'Large sweep patterns identified in high-cap stocks',
        confidence: 0.75,
        dataPoints: []
      }
    ];
  }
}