import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target,
  Zap,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface SentimentData {
  totalCallPremium: number;
  totalPutPremium: number;
  callFlowCount: number;
  putFlowCount: number;
  bullishScore: number;
  bearishScore: number;
  netSentiment: 'bullish' | 'bearish' | 'neutral';
  topBullishTickers: Array<{
    ticker: string;
    callPremium: number;
    putPremium: number;
    score: number;
  }>;
  topBearishTickers: Array<{
    ticker: string;
    callPremium: number;
    putPremium: number;
    score: number;
  }>;
}

interface TodaysSentimentProps {
  selectedDate: Date;
}

export const TodaysSentiment = ({ selectedDate }: TodaysSentimentProps) => {
  const { user } = useAuth();
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      analyzeTodaysSentiment();
    }
  }, [user, selectedDate]);

  const analyzeTodaysSentiment = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get flows for selected date
      const { data: flows, error } = await supabase
        .from('options_flow')
        .select('*')
        .eq('user_id', user.id)
        .gte('time_of_trade', startOfDay.toISOString())
        .lte('time_of_trade', endOfDay.toISOString());

      if (error) throw error;

      if (!flows || flows.length === 0) {
        setSentimentData(null);
        return;
      }

      // Calculate sentiment metrics
      const callFlows = flows.filter(f => 
        f.option_type.toLowerCase() === 'call' || f.option_type.toLowerCase() === 'c'
      );
      const putFlows = flows.filter(f => 
        f.option_type.toLowerCase() === 'put' || f.option_type.toLowerCase() === 'p'
      );

      const totalCallPremium = callFlows.reduce((sum, f) => sum + f.premium, 0);
      const totalPutPremium = putFlows.reduce((sum, f) => sum + f.premium, 0);
      const totalPremium = totalCallPremium + totalPutPremium;

      // Calculate bullish/bearish scores (0-100)
      const bullishScore = totalPremium > 0 ? (totalCallPremium / totalPremium) * 100 : 50;
      const bearishScore = totalPremium > 0 ? (totalPutPremium / totalPremium) * 100 : 50;

      // Determine net sentiment
      let netSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (bullishScore > 60) netSentiment = 'bullish';
      else if (bearishScore > 60) netSentiment = 'bearish';

      // Calculate ticker-level sentiment
      const tickerSentiment = flows.reduce((acc, flow) => {
        const ticker = flow.ticker_symbol;
        if (!acc[ticker]) {
          acc[ticker] = { callPremium: 0, putPremium: 0, flows: [] };
        }
        
        if (flow.option_type.toLowerCase() === 'call' || flow.option_type.toLowerCase() === 'c') {
          acc[ticker].callPremium += flow.premium;
        } else {
          acc[ticker].putPremium += flow.premium;
        }
        
        acc[ticker].flows.push(flow);
        return acc;
      }, {} as Record<string, any>);

      // Get top bullish and bearish tickers
      const tickerScores = Object.entries(tickerSentiment).map(([ticker, data]) => {
        const totalTickerPremium = data.callPremium + data.putPremium;
        const bullishScore = totalTickerPremium > 0 ? (data.callPremium / totalTickerPremium) * 100 : 50;
        const bearishScore = totalTickerPremium > 0 ? (data.putPremium / totalTickerPremium) * 100 : 50;
        
        return {
          ticker,
          callPremium: data.callPremium,
          putPremium: data.putPremium,
          score: bullishScore
        };
      });

      const topBullishTickers = tickerScores
        .filter(t => t.score > 60)
        .sort((a, b) => b.callPremium - a.callPremium)
        .slice(0, 5);

      const topBearishTickers = tickerScores
        .filter(t => t.score < 40)
        .sort((a, b) => b.putPremium - a.putPremium)
        .slice(0, 5);

      setSentimentData({
        totalCallPremium,
        totalPutPremium,
        callFlowCount: callFlows.length,
        putFlowCount: putFlows.length,
        bullishScore,
        bearishScore,
        netSentiment,
        topBullishTickers,
        topBearishTickers
      });

    } catch (error) {
      console.error('Error analyzing sentiment:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000000) {
      return `$${(amount / 1000000000).toFixed(1)}B`;
    } else if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp className="w-5 h-5" />;
      case 'bearish': return <TrendingDown className="w-5 h-5" />;
      default: return <BarChart3 className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-32 bg-slate-800 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!sentimentData) {
    return (
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No flow data available for this date</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Overall Sentiment */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className={getSentimentColor(sentimentData.netSentiment)}>
              {getSentimentIcon(sentimentData.netSentiment)}
            </div>
            <h3 className="text-lg font-semibold text-white">Today's Flow Sentiment</h3>
          </div>
          <Badge 
            variant={sentimentData.netSentiment === 'bullish' ? 'default' : 
                    sentimentData.netSentiment === 'bearish' ? 'destructive' : 'secondary'}
            className="capitalize"
          >
            {sentimentData.netSentiment}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bullish Flows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-white">Bullish Flows</span>
              </div>
              <span className="text-sm text-green-400">
                {sentimentData.bullishScore.toFixed(1)}%
              </span>
            </div>
            <Progress value={sentimentData.bullishScore} className="h-2" />
            <div className="flex justify-between text-sm text-slate-400">
              <span>{formatCurrency(sentimentData.totalCallPremium)}</span>
              <span>{sentimentData.callFlowCount} flows</span>
            </div>
          </div>

          {/* Bearish Flows */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-white">Bearish Flows</span>
              </div>
              <span className="text-sm text-red-400">
                {sentimentData.bearishScore.toFixed(1)}%
              </span>
            </div>
            <Progress value={sentimentData.bearishScore} className="h-2" />
            <div className="flex justify-between text-sm text-slate-400">
              <span>{formatCurrency(sentimentData.totalPutPremium)}</span>
              <span>{sentimentData.putFlowCount} flows</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Bullish and Bearish Tickers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Bullish Tickers */}
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Top Bullish Tickers</h3>
          </div>
          <div className="space-y-3">
            {sentimentData.topBullishTickers.length > 0 ? (
              sentimentData.topBullishTickers.map((ticker, index) => (
                <div key={ticker.ticker} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-slate-400">#{index + 1}</span>
                    <span className="font-mono font-bold text-blue-400">{ticker.ticker}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-green-400">
                      {formatCurrency(ticker.callPremium)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {ticker.score.toFixed(1)}% bullish
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No strong bullish flows detected</p>
              </div>
            )}
          </div>
        </Card>

        {/* Top Bearish Tickers */}
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-white">Top Bearish Tickers</h3>
          </div>
          <div className="space-y-3">
            {sentimentData.topBearishTickers.length > 0 ? (
              sentimentData.topBearishTickers.map((ticker, index) => (
                <div key={ticker.ticker} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-slate-400">#{index + 1}</span>
                    <span className="font-mono font-bold text-blue-400">{ticker.ticker}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-red-400">
                      {formatCurrency(ticker.putPremium)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {(100 - ticker.score).toFixed(1)}% bearish
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No strong bearish flows detected</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};