import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from "lucide-react";

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

interface FlowChartsProps {
  flows: OptionsFlowData[];
}

export const FlowCharts = ({ flows }: FlowChartsProps) => {
  const chartData = useMemo(() => {
    if (!flows.length) return { hourly: [], typeBreakdown: [], topTickers: [], volumeTrend: [] };

    // Group by hour for volume/premium trends
    const hourlyData = flows.reduce((acc, flow) => {
      const hour = new Date(flow.time_of_trade).getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      
      if (!acc[hourKey]) {
        acc[hourKey] = {
          hour: hourKey,
          volume: 0,
          premium: 0,
          sweeps: 0,
          blocks: 0,
        };
      }
      
      acc[hourKey].volume += 1;
      acc[hourKey].premium += flow.premium;
      if (flow.trade_type === 'sweep') acc[hourKey].sweeps += 1;
      if (flow.trade_type === 'block') acc[hourKey].blocks += 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Sort by hour and format premium
    const sortedHourly = Object.values(hourlyData)
      .sort((a: any, b: any) => a.hour.localeCompare(b.hour))
      .map((item: any) => ({
        ...item,
        premium: Math.round(item.premium / 1000000), // Convert to millions
      }));

    // Option type breakdown
    const typeBreakdown = flows.reduce((acc, flow) => {
      const type = flow.option_type === 'call' ? 'Calls' : 'Puts';
      const existing = acc.find(item => item.name === type);
      
      if (existing) {
        existing.value += 1;
        existing.premium += flow.premium;
      } else {
        acc.push({
          name: type,
          value: 1,
          premium: flow.premium,
        });
      }
      
      return acc;
    }, [] as any[]);

    // Top tickers by volume
    const tickerData = flows.reduce((acc, flow) => {
      // Extract base ticker from options symbol
      const baseTicker = flow.ticker_symbol.split(':')[1]?.substring(0, 3) || flow.ticker_symbol.substring(0, 5);
      
      if (!acc[baseTicker]) {
        acc[baseTicker] = {
          ticker: baseTicker,
          volume: 0,
          premium: 0,
        };
      }
      
      acc[baseTicker].volume += 1;
      acc[baseTicker].premium += flow.premium;
      
      return acc;
    }, {} as Record<string, any>);

    const topTickers = Object.values(tickerData)
      .sort((a: any, b: any) => b.volume - a.volume)
      .slice(0, 10)
      .map((item: any) => ({
        ...item,
        premium: Math.round(item.premium / 1000000), // Convert to millions
      }));

    // Volume trend with trade type split
    const volumeTrend = sortedHourly.map(item => ({
      hour: item.hour,
      sweeps: item.sweeps,
      blocks: item.blocks,
      total: item.volume,
    }));

    return {
      hourly: sortedHourly,
      typeBreakdown,
      topTickers,
      volumeTrend,
    };
  }, [flows]);

  const formatCurrency = (value: number) => {
    return `$${value}M`;
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--info))'];

  if (!flows.length) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 bg-gradient-card border-border shadow-terminal">
            <div className="animate-pulse">
              <div className="h-6 bg-secondary rounded w-1/3 mb-4"></div>
              <div className="h-64 bg-secondary rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Hourly Premium Volume */}
        <Card className="p-6 bg-gradient-card border-border shadow-terminal">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-primary" />
              Hourly Premium Flow
            </h3>
            <Badge variant="outline" className="text-xs">Last 24hrs</Badge>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData.hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="hour" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Premium']}
              />
              <Area 
                type="monotone" 
                dataKey="premium" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary) / 0.3)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Call vs Put Distribution */}
        <Card className="p-6 bg-gradient-card border-border shadow-terminal">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center">
              <PieChartIcon className="w-5 h-5 mr-2 text-accent" />
              Call vs Put Distribution
            </h3>
            <Badge variant="outline" className="text-xs">{flows.length} flows</Badge>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chartData.typeBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.typeBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value: number, name: string) => [
                  `${value} flows (${((value / flows.length) * 100).toFixed(1)}%)`, 
                  name
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Tickers by Volume */}
        <Card className="p-6 bg-gradient-card border-border shadow-terminal">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-warning" />
              Top Tickers by Volume
            </h3>
            <Badge variant="outline" className="text-xs">Top 10</Badge>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData.topTickers} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                type="category" 
                dataKey="ticker" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                width={60}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value: number, name: string) => [
                  name === 'volume' ? `${value} flows` : formatCurrency(value),
                  name === 'volume' ? 'Volume' : 'Premium'
                ]}
              />
              <Bar dataKey="volume" fill="hsl(var(--warning))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Trade Type Volume Trend */}
        <Card className="p-6 bg-gradient-card border-border shadow-terminal">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center">
              <Activity className="w-5 h-5 mr-2 text-info" />
              Sweep vs Block Activity
            </h3>
            <Badge variant="outline" className="text-xs">Hourly</Badge>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.volumeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="hour" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                formatter={(value: number, name: string) => [`${value} flows`, name.toUpperCase()]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="sweeps" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="blocks" 
                stroke="hsl(var(--accent))" 
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};