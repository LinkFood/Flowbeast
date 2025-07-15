import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

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

interface SortConfig {
  key: keyof OptionsFlowData | null;
  direction: 'asc' | 'desc';
}

interface FlowsTableProps {
  flows: OptionsFlowData[];
  isLoading?: boolean;
}

export const FlowsTable = ({ flows, isLoading = false }: FlowsTableProps) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'desc' });

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

  const handleSort = (key: keyof OptionsFlowData) => {
    let direction: 'asc' | 'desc' = 'desc';
    
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    
    setSortConfig({ key, direction });
  };

  const sortedFlows = [...flows].sort((a, b) => {
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

  if (isLoading) {
    return (
      <Card className="p-6 bg-gradient-card border-border shadow-terminal">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary rounded w-1/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-secondary rounded"></div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-terminal">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold">Options Flow Data ({flows.length} flows)</h3>
      </div>
      
      {flows.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No flows match your current filters.</p>
          <p className="text-sm text-muted-foreground mt-2">Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('ticker_symbol')}
                    className="font-semibold text-foreground p-0 h-auto hover:bg-transparent"
                  >
                    Ticker {getSortIcon('ticker_symbol')}
                  </Button>
                </th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('premium')}
                    className="font-semibold text-foreground p-0 h-auto hover:bg-transparent"
                  >
                    Premium {getSortIcon('premium')}
                  </Button>
                </th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('score')}
                    className="font-semibold text-foreground p-0 h-auto hover:bg-transparent"
                  >
                    Score {getSortIcon('score')}
                  </Button>
                </th>
                <th className="text-left p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('time_of_trade')}
                    className="font-semibold text-foreground p-0 h-auto hover:bg-transparent"
                  >
                    Time {getSortIcon('time_of_trade')}
                  </Button>
                </th>
                <th className="text-left p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedFlows.map((flow) => (
                <tr key={flow.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="p-3">
                    <div className="font-mono font-bold text-primary">
                      {flow.ticker_symbol}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-accent">
                      {formatCurrency(flow.premium)}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col space-y-1">
                      <Badge variant={flow.option_type.toLowerCase().includes('c') ? 'default' : 'secondary'} className="text-xs w-fit">
                        {flow.option_type.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs w-fit">
                        {flow.trade_type.toUpperCase()}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge 
                      variant={flow.score && flow.score > 0.5 ? "default" : "secondary"} 
                      className="text-xs"
                    >
                      {flow.score ? flow.score.toFixed(2) : 'N/A'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="text-sm text-muted-foreground">
                      {formatTime(flow.time_of_trade)}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>Strike: {flow.strike_price ? `$${flow.strike_price}` : 'N/A'}</div>
                      <div>Spot: {flow.spot_price ? `$${flow.spot_price.toFixed(2)}` : 'N/A'}</div>
                      {flow.implied_volatility && (
                        <div>IV: {flow.implied_volatility}%</div>
                      )}
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