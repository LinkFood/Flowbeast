import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Filter, Search, TrendingUp, DollarSign, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const [stats, setStats] = useState({
    totalFlows: 0,
    totalPremium: 0,
    uniqueTickers: 0,
    avgScore: 0
  });
  const [loading, setLoading] = useState(true);

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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Controls Panel */}
          <Card className="p-6 bg-gradient-card border-border shadow-terminal">
            <h3 className="font-semibold mb-6 flex items-center">
              <Filter className="w-5 h-5 mr-2 text-primary" />
              Filter & Search
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Ticker Symbol</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="e.g., AAPL, NVDA" 
                    className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Premium Range</label>
                <select className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option>All Premiums</option>
                  <option>$100K - $1M</option>
                  <option>$1M - $10M</option>
                  <option>$10M+</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Trade Type</label>
                <select className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option>All Types</option>
                  <option>SWEEP</option>
                  <option>BLOCK</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Score Range</label>
                <select className="w-full p-2 bg-secondary border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent">
                  <option>All Scores</option>
                  <option>0.8 - 1.0</option>
                  <option>0.6 - 0.8</option>
                  <option>0.4 - 0.6</option>
                </select>
              </div>
              
              <Button variant="terminal" className="w-full mt-6">
                Apply Filters
              </Button>
            </div>
          </Card>

          {/* Recent Flows */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-gradient-card border-border shadow-terminal">
              <h3 className="font-semibold mb-6">Recent High-Value Flows</h3>
              
              {recentFlows.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No options flow data found.</p>
                  <p className="text-sm text-muted-foreground mt-2">Upload a CSV file to see your data here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentFlows.map((flow) => (
                    <div key={flow.id} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="font-bold text-lg">{flow.ticker_symbol}</div>
                          <div className="text-xs text-muted-foreground">{formatTime(flow.time_of_trade)}</div>
                        </div>
                        
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant={flow.option_type.toLowerCase().includes('c') ? 'default' : 'secondary'} className="text-xs">
                              {flow.option_type.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {flow.trade_type.toUpperCase()}
                            </Badge>
                            <span className="text-lg font-bold text-primary">{formatCurrency(flow.premium)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Strike: {flow.strike_price ? `$${flow.strike_price}` : 'N/A'} • 
                            Spot: {flow.spot_price ? `$${flow.spot_price.toFixed(2)}` : 'N/A'} • 
                            Score: {flow.score || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant={flow.score && flow.score > 0.5 ? "default" : "secondary"} className="mb-2">
                          {flow.score && flow.score > 0.5 ? "High Score" : "Monitor"}
                        </Badge>
                        <div className="text-xs text-muted-foreground">
                          {flow.implied_volatility ? `IV: ${flow.implied_volatility}%` : 'No IV'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 text-center">
                <Button variant="data" onClick={fetchDashboardData}>
                  Refresh Data
                </Button>
              </div>
            </Card>
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