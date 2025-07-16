import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Filter, Search, TrendingUp, DollarSign, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FilterControls, FilterState } from "@/components/FilterControls";
import { FlowsTable } from "@/components/FlowsTable";
import { EnhancedFlowTable } from "@/components/EnhancedFlowTable";
import { FlowCharts } from "@/components/FlowCharts";
import { AIChat } from "@/components/AIChat";
import { AIInsights } from "@/components/AIInsights";
import { MissedOpportunities } from "@/components/MissedOpportunities";

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

interface DashboardSectionProps {
  researchFilters?: any;
  selectedDate?: Date;
}

export const DashboardSection = ({ researchFilters, selectedDate }: DashboardSectionProps) => {
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
    <div className="space-y-6">
      {/* Missed Opportunities */}
      <MissedOpportunities selectedDate={selectedDate || new Date()} />

      {/* AI Insights Panel */}
      <AIInsights />

      {/* Enhanced Flow Table */}
      <EnhancedFlowTable 
        flows={filteredFlows} 
        isLoading={filterLoading}
        researchFilters={researchFilters}
      />

      {/* Data Visualization Charts */}
      <div>
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2 text-white">Flow Analytics & Trends</h3>
          <p className="text-slate-400">Visual insights into your options flow patterns and market activity.</p>
        </div>
        <FlowCharts flows={filteredFlows} />
      </div>

      {/* AI Chat Interface */}
      <div>
        <div className="mb-6">
          <h3 className="text-xl font-bold mb-2 text-white">AI Research Assistant</h3>
          <p className="text-slate-400">
            Ask questions about patterns, get insights, and discover overlooked opportunities.
          </p>
        </div>
        <AIChat />
      </div>
    </div>
  );
};