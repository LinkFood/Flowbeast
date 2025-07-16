import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface HourlyData {
  hour: string;
  totalFlows: number;
  totalPremium: number;
  callPremium: number;
  putPremium: number;
  sweeps: number;
  blocks: number;
  avgScore: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface IntradayFlowTimingProps {
  selectedDate: Date;
}

export const IntradayFlowTiming = ({ selectedDate }: IntradayFlowTimingProps) => {
  const { user } = useAuth();
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<{
    busiestHour: string;
    highestPremiumHour: string;
    mostBullishHour: string;
    mostBearishHour: string;
    afterHoursActivity: boolean;
  } | null>(null);

  useEffect(() => {
    if (user) {
      analyzeIntradayTiming();
    }
  }, [user, selectedDate]);

  const analyzeIntradayTiming = async () => {
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
        setHourlyData([]);
        setInsights(null);
        return;
      }

      // Group flows by hour
      const hourlyGroups = flows.reduce((acc, flow) => {
        const hour = new Date(flow.time_of_trade).getHours();
        const hourKey = hour.toString().padStart(2, '0') + ':00';
        
        if (!acc[hourKey]) {
          acc[hourKey] = [];
        }
        acc[hourKey].push(flow);
        return acc;
      }, {} as Record<string, typeof flows>);

      // Calculate hourly metrics
      const hourlyMetrics: HourlyData[] = [];
      
      // Generate all hours (0-23)
      for (let hour = 0; hour < 24; hour++) {
        const hourKey = hour.toString().padStart(2, '0') + ':00';
        const hourFlows = hourlyGroups[hourKey] || [];
        
        if (hourFlows.length === 0) {
          continue; // Skip empty hours
        }

        const callFlows = hourFlows.filter(f => 
          f.option_type.toLowerCase() === 'call' || f.option_type.toLowerCase() === 'c'
        );
        const putFlows = hourFlows.filter(f => 
          f.option_type.toLowerCase() === 'put' || f.option_type.toLowerCase() === 'p'
        );

        const totalPremium = hourFlows.reduce((sum, f) => sum + f.premium, 0);
        const callPremium = callFlows.reduce((sum, f) => sum + f.premium, 0);
        const putPremium = putFlows.reduce((sum, f) => sum + f.premium, 0);
        
        const sweeps = hourFlows.filter(f => f.trade_type === 'sweep').length;
        const blocks = hourFlows.filter(f => f.trade_type === 'block').length;
        
        const avgScore = hourFlows.reduce((sum, f) => sum + (f.score || 0), 0) / hourFlows.length;

        // Determine sentiment
        let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        if (totalPremium > 0) {
          const bullishRatio = callPremium / totalPremium;
          if (bullishRatio > 0.6) sentiment = 'bullish';
          else if (bullishRatio < 0.4) sentiment = 'bearish';
        }

        hourlyMetrics.push({
          hour: hourKey,
          totalFlows: hourFlows.length,
          totalPremium: totalPremium / 1000000, // Convert to millions
          callPremium: callPremium / 1000000,
          putPremium: putPremium / 1000000,
          sweeps,
          blocks,
          avgScore,
          sentiment
        });
      }

      // Sort by hour
      hourlyMetrics.sort((a, b) => a.hour.localeCompare(b.hour));

      // Calculate insights
      const busiestHour = hourlyMetrics.reduce((max, curr) => 
        curr.totalFlows > max.totalFlows ? curr : max
      );
      
      const highestPremiumHour = hourlyMetrics.reduce((max, curr) => 
        curr.totalPremium > max.totalPremium ? curr : max
      );
      
      const mostBullishHour = hourlyMetrics.reduce((max, curr) => 
        curr.callPremium > max.callPremium ? curr : max
      );
      
      const mostBearishHour = hourlyMetrics.reduce((max, curr) => 
        curr.putPremium > max.putPremium ? curr : max
      );

      // Check for after-hours activity (before 9 AM or after 4 PM)
      const afterHoursActivity = hourlyMetrics.some(h => {
        const hour = parseInt(h.hour.split(':')[0]);
        return (hour < 9 || hour > 16) && h.totalFlows > 0;
      });

      setHourlyData(hourlyMetrics);
      setInsights({
        busiestHour: busiestHour.hour,
        highestPremiumHour: highestPremiumHour.hour,
        mostBullishHour: mostBullishHour.hour,
        mostBearishHour: mostBearishHour.hour,
        afterHoursActivity
      });

    } catch (error) {
      console.error('Error analyzing intraday timing:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(1)}M`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Premium') ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-64 bg-slate-800 rounded"></div>
        </div>
      </Card>
    );
  }

  if (hourlyData.length === 0) {
    return (
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="text-center py-8">
          <Clock className="w-12 h-12 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No intraday flow data available for this date</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Timing Insights */}
      {insights && (
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center space-x-2 mb-4">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Intraday Flow Timing</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{insights.busiestHour}</div>
              <div className="text-sm text-slate-400">Busiest Hour</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{insights.highestPremiumHour}</div>
              <div className="text-sm text-slate-400">Highest Premium</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{insights.mostBullishHour}</div>
              <div className="text-sm text-slate-400">Most Bullish</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{insights.mostBearishHour}</div>
              <div className="text-sm text-slate-400">Most Bearish</div>
            </div>
          </div>
          
          {insights.afterHoursActivity && (
            <div className="flex items-center space-x-2 p-3 bg-orange-400/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-orange-400" />
              <span className="text-sm text-orange-400">After-hours activity detected</span>
            </div>
          )}
        </Card>
      )}

      {/* Flow Volume Chart */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Hourly Flow Volume</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            {hourlyData.reduce((sum, h) => sum + h.totalFlows, 0)} total flows
          </Badge>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="hour" 
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="totalFlows" 
              fill="#3b82f6" 
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Premium Flow Chart */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Hourly Premium Flow</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            Calls vs Puts
          </Badge>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="hour" 
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="callPremium" 
              stackId="1"
              stroke="#10b981" 
              fill="#10b981"
              fillOpacity={0.6}
              name="Call Premium"
            />
            <Area 
              type="monotone" 
              dataKey="putPremium" 
              stackId="1"
              stroke="#ef4444" 
              fill="#ef4444"
              fillOpacity={0.6}
              name="Put Premium"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Sweep vs Block Activity */}
      <Card className="p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Sweep vs Block Activity</h3>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="hour" 
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="sweeps" 
              stroke="#eab308" 
              strokeWidth={3}
              dot={{ fill: '#eab308', strokeWidth: 2, r: 4 }}
              name="Sweeps"
            />
            <Line 
              type="monotone" 
              dataKey="blocks" 
              stroke="#8b5cf6" 
              strokeWidth={3}
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              name="Blocks"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};