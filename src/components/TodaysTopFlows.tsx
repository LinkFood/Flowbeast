import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Target,
  Clock,
  DollarSign,
  Star,
  Filter
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface TopFlow {
  id: string;
  ticker_symbol: string;
  premium: number;
  option_type: string;
  trade_type: string;
  score: number | null;
  time_of_trade: string;
  strike_price: number | null;
  spot_price: number | null;
  sentiment: 'bullish' | 'bearish';
  rank: number;
}

interface TodaysTopFlowsProps {
  selectedDate: Date;
}

export const TodaysTopFlows = ({ selectedDate }: TodaysTopFlowsProps) => {
  const { user } = useAuth();
  const [topFlows, setTopFlows] = useState<{
    bullish: TopFlow[];
    bearish: TopFlow[];
    largest: TopFlow[];
    sweeps: TopFlow[];
    blocks: TopFlow[];
  }>({
    bullish: [],
    bearish: [],
    largest: [],
    sweeps: [],
    blocks: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bullish' | 'bearish' | 'largest' | 'sweeps' | 'blocks'>('largest');

  const analyzeTopFlows = useCallback(async () => {
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
        .lte('time_of_trade', endOfDay.toISOString())
        .order('premium', { ascending: false });

      if (error) throw error;

      if (!flows || flows.length === 0) {
        setTopFlows({
          bullish: [],
          bearish: [],
          largest: [],
          sweeps: [],
          blocks: []
        });
        return;
      }

      // Categorize flows
      const categorizedFlows = flows.map((flow, index) => {
        const isCall = flow.option_type.toLowerCase() === 'call' || flow.option_type.toLowerCase() === 'c';
        const sentiment = isCall ? 'bullish' : 'bearish';
        
        return {
          ...flow,
          sentiment,
          rank: index + 1
        } as TopFlow;
      });

      // Get top flows by category
      const topBullish = categorizedFlows
        .filter(f => f.sentiment === 'bullish')
        .slice(0, 10);

      const topBearish = categorizedFlows
        .filter(f => f.sentiment === 'bearish')
        .slice(0, 10);

      const topLargest = categorizedFlows.slice(0, 10);

      const topSweeps = categorizedFlows
        .filter(f => f.trade_type === 'sweep')
        .slice(0, 10);

      const topBlocks = categorizedFlows
        .filter(f => f.trade_type === 'block')
        .slice(0, 10);

      setTopFlows({
        bullish: topBullish,
        bearish: topBearish,
        largest: topLargest,
        sweeps: topSweeps,
        blocks: topBlocks
      });

    } catch (error) {
      console.error('Error analyzing top flows:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => {
    if (user) {
      analyzeTopFlows();
    }
  }, [user, selectedDate, analyzeTopFlows]);

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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'bullish': return <TrendingUp className="w-4 h-4" />;
      case 'bearish': return <TrendingDown className="w-4 h-4" />;
      case 'largest': return <DollarSign className="w-4 h-4" />;
      case 'sweeps': return <Zap className="w-4 h-4" />;
      case 'blocks': return <Target className="w-4 h-4" />;
      default: return <Filter className="w-4 h-4" />;
    }
  };

  const getTabColor = (tab: string) => {
    switch (tab) {
      case 'bullish': return 'text-green-400';
      case 'bearish': return 'text-red-400';
      case 'largest': return 'text-blue-400';
      case 'sweeps': return 'text-yellow-400';
      case 'blocks': return 'text-purple-400';
      default: return 'text-slate-400';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    return sentiment === 'bullish' ? 'text-green-400' : 'text-red-400';
  };

  const renderFlowCard = (flow: TopFlow) => (
    <Card key={flow.id} className="p-4 bg-slate-800 border-slate-700 hover:bg-slate-750 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-sm font-bold text-slate-400">#{flow.rank}</span>
            <span className="text-lg font-mono font-bold text-blue-400">
              {flow.ticker_symbol}
            </span>
            <Badge 
              variant={flow.option_type.toLowerCase().includes('c') ? 'default' : 'secondary'}
              className="text-xs"
            >
              {flow.option_type.toUpperCase()}
            </Badge>
            <Badge 
              variant={flow.trade_type === 'sweep' ? 'default' : 'outline'}
              className="text-xs"
            >
              {flow.trade_type.toUpperCase()}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4 mb-2">
            <div className="text-xl font-bold text-white">
              {formatCurrency(flow.premium)}
            </div>
            <div className={`text-sm font-medium ${getSentimentColor(flow.sentiment)}`}>
              {flow.sentiment.toUpperCase()}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-slate-400">
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(flow.time_of_trade)}</span>
            </div>
            {flow.strike_price && (
              <div>Strike: ${flow.strike_price}</div>
            )}
            {flow.spot_price && (
              <div>Spot: ${flow.spot_price.toFixed(2)}</div>
            )}
            {flow.score && (
              <div>Score: {flow.score.toFixed(2)}</div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
            <Star className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );

  const currentFlows = topFlows[activeTab];

  if (loading) {
    return (
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Today's Top Flows</h3>
          <Badge variant="outline" className="text-xs">
            {currentFlows.length} flows
          </Badge>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 mt-4">
          {(['largest', 'bullish', 'bearish', 'sweeps', 'blocks'] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className={`text-xs capitalize ${activeTab === tab ? '' : getTabColor(tab)}`}
            >
              {getTabIcon(tab)}
              <span className="ml-1">{tab}</span>
              <span className="ml-1">({topFlows[tab].length})</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {currentFlows.length === 0 ? (
          <div className="text-center py-8">
            <div className={getTabColor(activeTab)}>
              {getTabIcon(activeTab)}
            </div>
            <p className="text-slate-400 mt-2">No {activeTab} flows found for this date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentFlows.map(renderFlowCard)}
          </div>
        )}
      </div>
    </Card>
  );
};