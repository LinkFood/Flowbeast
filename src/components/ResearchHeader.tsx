import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  CalendarDays, 
  Upload, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  Database,
  Search,
  Filter,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ResearchStats {
  totalFlows: number;
  uniqueTickers: number;
  totalPremium: number;
  unusualFlows: number;
  lastUpload: string | null;
  topMover: string | null;
}

interface ResearchHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export const ResearchHeader = ({ selectedDate, onDateChange }: ResearchHeaderProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ResearchStats>({
    totalFlows: 0,
    uniqueTickers: 0,
    totalPremium: 0,
    unusualFlows: 0,
    lastUpload: null,
    topMover: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchResearchStats();
    }
  }, [user, selectedDate]);

  const fetchResearchStats = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
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

      // Calculate stats
      const totalFlows = flows?.length || 0;
      const uniqueTickers = new Set(flows?.map(f => f.ticker_symbol)).size;
      const totalPremium = flows?.reduce((sum, f) => sum + f.premium, 0) || 0;
      
      // Find unusual flows (>$500K premium or high score)
      const unusualFlows = flows?.filter(f => 
        f.premium > 500000 || (f.score && f.score > 0.8)
      ).length || 0;

      // Get most recent upload
      const { data: recentFlow } = await supabase
        .from('options_flow')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Find top mover by volume
      const tickerCounts = flows?.reduce((acc, flow) => {
        acc[flow.ticker_symbol] = (acc[flow.ticker_symbol] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topMover = tickerCounts ? 
        Object.entries(tickerCounts).sort(([,a], [,b]) => b - a)[0]?.[0] : null;

      setStats({
        totalFlows,
        uniqueTickers,
        totalPremium,
        unusualFlows,
        lastUpload: recentFlow?.created_at || null,
        topMover
      });
    } catch (error) {
      console.error('Error fetching research stats:', error);
    } finally {
      setIsLoading(false);
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

  const formatLastUpload = (timestamp: string | null) => {
    if (!timestamp) return "No uploads";
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just uploaded";
    if (diffHours < 24) return `${diffHours}h ago`;
    return format(date, "MMM d, h:mm a");
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <div className="bg-slate-950 border-b border-slate-800 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        {/* Top Row - Title and Date */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Search className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Options Flow Research</h1>
                <p className="text-sm text-slate-400">End-of-day pattern analysis</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant={isToday ? "default" : "secondary"} className="text-xs">
                {isToday ? "Today" : "Historical"}
              </Badge>
              {stats.lastUpload && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatLastUpload(stats.lastUpload)}
                </Badge>
              )}
            </div>
          </div>

          {/* Date Selector */}
          <div className="flex items-center space-x-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal bg-slate-900 border-slate-700",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && onDateChange(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button size="sm" variant="outline" className="bg-slate-900 border-slate-700">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4 bg-slate-900 border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Flows</p>
                <p className="text-lg font-bold text-white">
                  {isLoading ? "..." : stats.totalFlows.toLocaleString()}
                </p>
              </div>
              <Database className="w-5 h-5 text-blue-400" />
            </div>
          </Card>

          <Card className="p-4 bg-slate-900 border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Unique Tickers</p>
                <p className="text-lg font-bold text-white">
                  {isLoading ? "..." : stats.uniqueTickers}
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
          </Card>

          <Card className="p-4 bg-slate-900 border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Total Premium</p>
                <p className="text-lg font-bold text-white">
                  {isLoading ? "..." : formatCurrency(stats.totalPremium)}
                </p>
              </div>
              <BarChart3 className="w-5 h-5 text-purple-400" />
            </div>
          </Card>

          <Card className="p-4 bg-slate-900 border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Unusual Flows</p>
                <p className="text-lg font-bold text-orange-400">
                  {isLoading ? "..." : stats.unusualFlows}
                </p>
              </div>
              <AlertCircle className="w-5 h-5 text-orange-400" />
            </div>
          </Card>

          <Card className="p-4 bg-slate-900 border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Top Mover</p>
                <p className="text-lg font-bold text-white font-mono">
                  {isLoading ? "..." : stats.topMover || "N/A"}
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-yellow-400" />
            </div>
          </Card>

          <Card className="p-4 bg-slate-900 border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Market Status</p>
                <p className="text-sm font-semibold text-white">
                  {isToday ? "Closed" : "Historical"}
                </p>
              </div>
              <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-red-500' : 'bg-slate-500'}`} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};