import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Filter, Search, TrendingUp, DollarSign, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FilterControls, FilterState } from "@/components/FilterControls";
import { FlowsTable } from "@/components/FlowsTable";

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
}

export const DashboardSection = () => {
  const { user } = useAuth();
  const [recentFlows, setRecentFlows] = useState<OptionsFlowData[]>([]);
  const [filteredFlows, setFilteredFlows] = useState<OptionsFlowData[]>([]);
  const [stats, setStats] = useState({
    totalFlows: 0,
    totalPremium: 0,
    uniqueTickers: 0,
    avgScore: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ticker: "",
    premiumMin: "",
    premiumMax: "",
    tradeType: "all",
    optionType: "all",
    scoreMin: "",
    scoreMax: "",
    dateFrom: undefined,
    dateTo: undefined,
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent high-value flows
      const { data: flows, error: flowsError } = await supabase
        .from('options_flow')
        .select('*')
        .eq('user_id', user?.id)
        .order('premium', { ascending: false })
        .limit(10);

      if (flowsError) throw flowsError;

      // Fetch stats
      const { data: statsData, error: statsError } = await supabase
        .from('options_flow')
        .select('premium, ticker_symbol, score')
        .eq('user_id', user?.id);

      if (statsError) throw statsError;

      // Calculate stats
      const totalFlows = statsData?.length || 0;
      const totalPremium = statsData?.reduce((sum, row) => sum + (row.premium || 0), 0) || 0;
      const uniqueTickers = new Set(statsData?.map(row => row.ticker_symbol)).size;
      const avgScore = statsData?.filter(row => row.score !== null).reduce((sum, row, _, arr) => sum + (row.score || 0) / arr.length, 0) || 0;

      setRecentFlows(flows || []);
      setFilteredFlows(flows || []);
      setStats({
        totalFlows,
        totalPremium,
        uniqueTickers,
        avgScore: Math.round(avgScore * 100) / 100
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    try {
      setFilterLoading(true);
      
      let query = supabase
        .from('options_flow')
        .select('*')
        .eq('user_id', user?.id);

      // Apply filters
      if (filters.ticker) {
        query = query.ilike('ticker_symbol', `%${filters.ticker}%`);
      }
      
      if (filters.premiumMin) {
        query = query.gte('premium', parseFloat(filters.premiumMin));
      }
      
      if (filters.premiumMax) {
        query = query.lte('premium', parseFloat(filters.premiumMax));
      }
      
      if (filters.tradeType && filters.tradeType !== "all") {
        query = query.eq('trade_type', filters.tradeType);
      }
      
      if (filters.optionType && filters.optionType !== "all") {
        query = query.eq('option_type', filters.optionType);
      }
      
      if (filters.scoreMin) {
        query = query.gte('score', parseFloat(filters.scoreMin));
      }
      
      if (filters.scoreMax) {
        query = query.lte('score', parseFloat(filters.scoreMax));
      }
      
      if (filters.dateFrom) {
        query = query.gte('time_of_trade', filters.dateFrom.toISOString());
      }
      
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('time_of_trade', endOfDay.toISOString());
      }

      const { data, error } = await query.order('premium', { ascending: false }).limit(1000);
      
      if (error) throw error;
      
      setFilteredFlows(data || []);
    } catch (error) {
      console.error('Error applying filters:', error);
    } finally {
      setFilterLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      ticker: "",
      premiumMin: "",
      premiumMax: "",
      tradeType: "all",
      optionType: "all",
      scoreMin: "",
      scoreMax: "",
      dateFrom: undefined,
      dateTo: undefined,
    });
    setFilteredFlows(recentFlows);
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

  if (loading) {
    return (
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-7xl mx-auto text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your options flow data...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Options Flow Dashboard</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Analyze patterns, filter data, and track your trading success with powerful analytics tools.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 bg-gradient-card border-border shadow-terminal">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Flows</p>
                <p className="text-2xl font-bold text-primary">{stats.totalFlows.toLocaleString()}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-card border-border shadow-terminal">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Premium</p>
                <p className="text-2xl font-bold text-accent">{formatCurrency(stats.totalPremium)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-accent" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-card border-border shadow-terminal">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Unique Tickers</p>
                <p className="text-2xl font-bold text-warning">{stats.uniqueTickers}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-warning" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-card border-border shadow-terminal">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Score</p>
                <p className="text-2xl font-bold text-info">{stats.avgScore}</p>
              </div>
              <Clock className="w-8 h-8 text-info" />
            </div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filter Controls */}
          <FilterControls
            filters={filters}
            onFiltersChange={setFilters}
            onApplyFilters={applyFilters}
            onClearFilters={clearFilters}
            isLoading={filterLoading}
          />

          {/* Filtered Results Table */}
          <div className="lg:col-span-3">
            <FlowsTable 
              flows={filteredFlows} 
              isLoading={filterLoading}
            />
          </div>
        </div>

        {/* AI Chat Preview */}
        <Card className="mt-12 p-8 bg-gradient-card border-border shadow-terminal">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-4">AI-Powered Analysis</h3>
            <p className="text-muted-foreground mb-6">
              Ask natural language questions about your options flow data and get intelligent insights.
            </p>
            
            <div className="bg-secondary/50 rounded-lg p-6 mb-6 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">AI</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    "Based on today's data, I found 12 NVDA sweeps above $2M with scores over 0.8. 
                    Similar patterns in the past 30 days showed a 67% success rate when held for 2-3 days. 
                    The current implied volatility is 15% below the 30-day average, suggesting potential upside."
                  </p>
                </div>
              </div>
            </div>
            
            <Button variant="terminal" size="lg">
              <BarChart3 className="w-5 h-5 mr-2" />
              Start AI Analysis
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};