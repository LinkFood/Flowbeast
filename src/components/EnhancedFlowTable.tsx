import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  TrendingUp, 
  AlertTriangle,
  Target,
  Zap,
  Clock,
  Eye,
  Star,
  Search
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface OptionsFlowData {
  id: string;
  ticker_symbol: string;
  premium: number;
  option_type: string;
  trade_type: string;
  score: number | null;
  time_of_trade: string;
  strike_price: number | null;
  spot_price: number | null;
  implied_volatility: number | null;
  // Enhanced fields
  unusualness_score?: number;
  pattern_type?: string;
  similar_flows_count?: number;
  volume_vs_average?: number;
  historical_success_rate?: number;
}

interface SortConfig {
  key: keyof OptionsFlowData | null;
  direction: 'asc' | 'desc';
}

interface EnhancedFlowTableProps {
  flows: OptionsFlowData[];
  isLoading?: boolean;
  researchFilters?: any;
}

export const EnhancedFlowTable = ({ flows, isLoading = false, researchFilters = {} }: EnhancedFlowTableProps) => {
  const { user } = useAuth();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'premium', direction: 'desc' });
  const [historicalData, setHistoricalData] = useState<Record<string, any>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Enhanced flows with research metrics
  const enhancedFlows = useMemo(() => {
    return flows.map(flow => {
      const ticker = flow.ticker_symbol;
      const historical = historicalData[ticker] || {};
      
      // Calculate unusualness score (0-1, where 1 is most unusual)
      const avgPremium = historical.avgPremium || 100000;
      const premiumRatio = flow.premium / avgPremium;
      const volumeRatio = historical.todayVolume / Math.max(historical.avgVolume || 1, 1);
      const unusualness_score = Math.min(1, (premiumRatio * 0.6 + volumeRatio * 0.4) / 2);
      
      // Determine pattern type
      let pattern_type = 'normal';
      if (flow.trade_type === 'sweep' && flow.premium > 500000) pattern_type = 'large_sweep';
      else if (flow.trade_type === 'block' && flow.premium > 1000000) pattern_type = 'large_block';
      else if (unusualness_score > 0.7) pattern_type = 'unusual_volume';
      else if (flow.score && flow.score > 0.8) pattern_type = 'high_score';
      
      return {
        ...flow,
        unusualness_score,
        pattern_type,
        similar_flows_count: historical.similarFlows || 0,
        volume_vs_average: volumeRatio,
        historical_success_rate: historical.successRate || null
      };
    });
  }, [flows, historicalData]);

  useEffect(() => {
    if (user && flows.length > 0) {
      calculateHistoricalMetrics();
    }
  }, [user, flows]);

  const calculateHistoricalMetrics = async () => {
    if (!user || flows.length === 0) return;

    const uniqueTickers = [...new Set(flows.map(f => f.ticker_symbol))];
    const metrics: Record<string, any> = {};

    for (const ticker of uniqueTickers) {
      try {
        // Get historical data for this ticker (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: historicalFlows, error } = await supabase
          .from('options_flow')
          .select('*')
          .eq('user_id', user.id)
          .eq('ticker_symbol', ticker)
          .gte('time_of_trade', thirtyDaysAgo.toISOString());

        if (error) throw error;

        const todayFlows = flows.filter(f => f.ticker_symbol === ticker);
        const avgPremium = historicalFlows.reduce((sum, f) => sum + f.premium, 0) / Math.max(historicalFlows.length, 1);
        const avgVolume = historicalFlows.length / 30; // Average flows per day
        
        metrics[ticker] = {
          avgPremium,
          avgVolume,
          todayVolume: todayFlows.length,
          similarFlows: historicalFlows.filter(f => 
            Math.abs(f.premium - todayFlows[0]?.premium) < todayFlows[0]?.premium * 0.2
          ).length,
          successRate: 0.65 // Mock success rate - would come from tracking
        };
      } catch (error) {
        console.error(`Error calculating metrics for ${ticker}:`, error);
      }
    }

    setHistoricalData(metrics);
  };

  const handleSort = (key: keyof OptionsFlowData) => {
    let direction: 'asc' | 'desc' = 'desc';
    
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    
    setSortConfig({ key, direction });
  };

  const sortedFlows = [...enhancedFlows].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const getSortIcon = (columnKey: keyof OptionsFlowData) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4" /> : 
      <ArrowDown className="w-4 h-4" />;
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getPatternIcon = (patternType: string) => {
    switch (patternType) {
      case 'large_sweep':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'large_block':
        return <Target className="w-4 h-4 text-blue-400" />;
      case 'unusual_volume':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'high_score':
        return <Star className="w-4 h-4 text-purple-400" />;
      default:
        return null;
    }
  };

  const getUnusualnessBadge = (score: number) => {
    if (score > 0.8) return <Badge variant="destructive" className="text-xs">Highly Unusual</Badge>;
    if (score > 0.6) return <Badge variant="secondary" className="text-xs">Unusual</Badge>;
    if (score > 0.4) return <Badge variant="outline" className="text-xs">Notable</Badge>;
    return null;
  };

  const toggleRowExpansion = (flowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(flowId)) {
      newExpanded.delete(flowId);
    } else {
      newExpanded.add(flowId);
    }
    setExpandedRows(newExpanded);
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-800 rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="font-semibold text-white">Options Flow Analysis</h3>
            <Badge variant="outline" className="text-xs">
              {sortedFlows.length} flows
            </Badge>
            <Badge variant="outline" className="text-xs">
              {sortedFlows.filter(f => f.unusualness_score && f.unusualness_score > 0.6).length} unusual
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="text-xs bg-slate-800 border-slate-700">
              <Search className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>
      
      {sortedFlows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400">No flows match your current filters.</p>
          <p className="text-sm text-slate-500 mt-2">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800">
              <tr>
                <th className="text-left p-3 w-4"></th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('ticker_symbol')}
                    className="font-semibold text-slate-300 p-0 h-auto hover:bg-transparent hover:text-white"
                  >
                    Ticker {getSortIcon('ticker_symbol')}
                  </Button>
                </th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('premium')}
                    className="font-semibold text-slate-300 p-0 h-auto hover:bg-transparent hover:text-white"
                  >
                    Premium {getSortIcon('premium')}
                  </Button>
                </th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('unusualness_score')}
                    className="font-semibold text-slate-300 p-0 h-auto hover:bg-transparent hover:text-white"
                  >
                    Unusualness {getSortIcon('unusualness_score')}
                  </Button>
                </th>
                <th className="text-left p-3">Pattern</th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('score')}
                    className="font-semibold text-slate-300 p-0 h-auto hover:bg-transparent hover:text-white"
                  >
                    Score {getSortIcon('score')}
                  </Button>
                </th>
                <th className="text-left p-3">Time</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedFlows.map((flow) => (
                <tr key={flow.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpansion(flow.id)}
                      className="p-0 h-auto text-slate-400 hover:text-white"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                  <td className="p-3">
                    <div className="font-mono font-bold text-blue-400">
                      {flow.ticker_symbol}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-green-400">
                      {formatCurrency(flow.premium)}
                    </div>
                    {flow.volume_vs_average && flow.volume_vs_average > 1.5 && (
                      <div className="text-xs text-orange-400">
                        {flow.volume_vs_average.toFixed(1)}x avg volume
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col space-y-1">
                      <Badge 
                        variant={flow.option_type.toLowerCase().includes('c') ? 'default' : 'secondary'} 
                        className="text-xs w-fit"
                      >
                        {flow.option_type.toUpperCase()}
                      </Badge>
                      <Badge 
                        variant={flow.trade_type === 'sweep' ? 'default' : 'outline'} 
                        className="text-xs w-fit"
                      >
                        {flow.trade_type.toUpperCase()}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col space-y-1">
                      {flow.unusualness_score && getUnusualnessBadge(flow.unusualness_score)}
                      <div className="text-xs text-slate-400">
                        {flow.unusualness_score ? (flow.unusualness_score * 100).toFixed(0) : 0}%
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      {getPatternIcon(flow.pattern_type || 'normal')}
                      <span className="text-xs text-slate-400 capitalize">
                        {flow.pattern_type?.replace('_', ' ') || 'Normal'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge 
                      variant={flow.score && flow.score > 0.7 ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {flow.score ? flow.score.toFixed(2) : 'N/A'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="text-sm text-slate-400">
                      {formatTime(flow.time_of_trade)}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="sm" className="p-1 h-auto text-slate-400 hover:text-white">
                        <Star className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-1 h-auto text-slate-400 hover:text-white">
                        <Search className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};