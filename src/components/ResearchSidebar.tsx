import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  Star, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Clock,
  Bookmark,
  History,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ResearchFilters {
  search: string;
  minPremium: number;
  maxPremium: number;
  optionTypes: string[];
  tradeTypes: string[];
  scoreRange: [number, number];
  timeRange: string;
  unusualOnly: boolean;
  patternTypes: string[];
}

interface SavedQuery {
  id: string;
  name: string;
  filters: ResearchFilters;
  lastUsed: Date;
}

interface ResearchSidebarProps {
  onFiltersChange: (filters: ResearchFilters) => void;
  selectedDate: Date;
}

export const ResearchSidebar = ({ onFiltersChange, selectedDate }: ResearchSidebarProps) => {
  const { user } = useAuth();
  const [filters, setFilters] = useState<ResearchFilters>({
    search: "",
    minPremium: 0,
    maxPremium: 10000000,
    optionTypes: [],
    tradeTypes: [],
    scoreRange: [0, 1],
    timeRange: "all",
    unusualOnly: false,
    patternTypes: []
  });
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [recentPatterns, setRecentPatterns] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadWatchlist();
      loadSavedQueries();
      loadRecentPatterns();
    }
  }, [user]);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const loadWatchlist = async () => {
    // For now, use a default watchlist - could be stored in user preferences
    setWatchlist(['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'META', 'AMZN', 'SPY', 'QQQ']);
  };

  const loadSavedQueries = async () => {
    // Mock saved queries - these would be stored in database
    setSavedQueries([
      {
        id: '1',
        name: 'High Premium Sweeps',
        filters: { ...filters, minPremium: 1000000, tradeTypes: ['sweep'] },
        lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        id: '2',
        name: 'Unusual Volume',
        filters: { ...filters, unusualOnly: true },
        lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ]);
  };

  const loadRecentPatterns = async () => {
    if (!user) return;

    try {
      // Mock patterns since flow_patterns table doesn't exist
      setRecentPatterns([
        {
          id: '1',
          ticker_symbol: 'AAPL',
          pattern_type: 'High Volume',
          occurrences: 12
        },
        {
          id: '2',
          ticker_symbol: 'TSLA',
          pattern_type: 'Sweep Pattern',
          occurrences: 8
        }
      ]);
    } catch (error) {
      console.error('Error loading recent patterns:', error);
    }
  };

  const updateFilter = (key: keyof ResearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      minPremium: 0,
      maxPremium: 10000000,
      optionTypes: [],
      tradeTypes: [],
      scoreRange: [0, 1],
      timeRange: "all",
      unusualOnly: false,
      patternTypes: []
    });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  return (
    <div className="w-80 bg-slate-950 border-r border-slate-800 h-screen overflow-y-auto">
      <div className="p-4 space-y-6">
        
        {/* Search */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-300">Search Tickers</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Enter ticker symbols..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10 bg-slate-900 border-slate-700 text-white"
            />
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* Quick Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-300">Quick Filters</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear All
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="unusual"
                checked={filters.unusualOnly}
                onCheckedChange={(checked) => updateFilter('unusualOnly', checked)}
              />
              <Label htmlFor="unusual" className="text-sm text-slate-300">
                Unusual flows only
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant={filters.tradeTypes.includes('sweep') ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                const newTypes = filters.tradeTypes.includes('sweep') 
                  ? filters.tradeTypes.filter(t => t !== 'sweep')
                  : [...filters.tradeTypes, 'sweep'];
                updateFilter('tradeTypes', newTypes);
              }}
              className="text-xs"
            >
              <Zap className="w-3 h-3 mr-1" />
              Sweeps
            </Button>
            <Button 
              variant={filters.tradeTypes.includes('block') ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                const newTypes = filters.tradeTypes.includes('block') 
                  ? filters.tradeTypes.filter(t => t !== 'block')
                  : [...filters.tradeTypes, 'block'];
                updateFilter('tradeTypes', newTypes);
              }}
              className="text-xs"
            >
              <Target className="w-3 h-3 mr-1" />
              Blocks
            </Button>
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* Premium Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-slate-300">Premium Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-400">Min</Label>
              <Input
                type="number"
                placeholder="0"
                value={filters.minPremium}
                onChange={(e) => updateFilter('minPremium', Number(e.target.value))}
                className="bg-slate-900 border-slate-700 text-white text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">Max</Label>
              <Input
                type="number"
                placeholder="10M"
                value={filters.maxPremium}
                onChange={(e) => updateFilter('maxPremium', Number(e.target.value))}
                className="bg-slate-900 border-slate-700 text-white text-sm"
              />
            </div>
          </div>
          <div className="text-xs text-slate-400">
            {formatCurrency(filters.minPremium)} - {formatCurrency(filters.maxPremium)}
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* Score Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-slate-300">Score Range</Label>
          <Slider
            value={filters.scoreRange}
            onValueChange={(value) => updateFilter('scoreRange', value)}
            max={1}
            min={0}
            step={0.1}
            className="w-full"
          />
          <div className="text-xs text-slate-400">
            {filters.scoreRange[0].toFixed(1)} - {filters.scoreRange[1].toFixed(1)}
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* Watchlist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-300">Watchlist</Label>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400">
              <Star className="w-3 h-3 mr-1" />
              Edit
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {watchlist.map((ticker) => (
              <Button
                key={ticker}
                variant="ghost"
                size="sm"
                onClick={() => updateFilter('search', ticker)}
                className="text-xs font-mono text-slate-300 hover:text-white hover:bg-slate-800"
              >
                {ticker}
              </Button>
            ))}
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* Recent Patterns */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-300">Recent Patterns</Label>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400">
              <History className="w-3 h-3 mr-1" />
              View All
            </Button>
          </div>
          <div className="space-y-2">
            {recentPatterns.map((pattern) => (
              <Card key={pattern.id} className="p-3 bg-slate-900 border-slate-800 hover:bg-slate-800 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{pattern.ticker_symbol}</div>
                    <div className="text-xs text-slate-400">{pattern.pattern_type}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {pattern.occurrences}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Separator className="bg-slate-800" />

        {/* Saved Queries */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-300">Saved Queries</Label>
            <Button variant="ghost" size="sm" className="text-xs text-slate-400">
              <Bookmark className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
          <div className="space-y-2">
            {savedQueries.map((query) => (
              <Card key={query.id} className="p-3 bg-slate-900 border-slate-800 hover:bg-slate-800 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{query.name}</div>
                    <div className="text-xs text-slate-400">
                      {query.lastUsed.toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters(query.filters)}
                    className="text-xs"
                  >
                    Apply
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};