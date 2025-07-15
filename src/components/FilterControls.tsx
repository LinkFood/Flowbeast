import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface FilterState {
  ticker: string;
  premiumMin: string;
  premiumMax: string;
  tradeType: string;
  optionType: string;
  scoreMin: string;
  scoreMax: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface FilterControlsProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isLoading?: boolean;
}

export const FilterControls = ({ 
  filters, 
  onFiltersChange, 
  onApplyFilters, 
  onClearFilters,
  isLoading = false 
}: FilterControlsProps) => {
  const hasActiveFilters = Object.values(filters).some(value => 
    value !== "" && value !== undefined
  );

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-terminal">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold flex items-center">
          <Filter className="w-5 h-5 mr-2 text-primary" />
          Filter & Search
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Ticker Search */}
        <div>
          <label className="text-sm font-medium mb-2 block">Ticker Symbol</label>
          <Input
            placeholder="e.g., AAPL, NVDA, SPY"
            value={filters.ticker}
            onChange={(e) => updateFilter('ticker', e.target.value)}
            className="bg-secondary border-border"
          />
        </div>

        {/* Premium Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Min Premium</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.premiumMin}
              onChange={(e) => updateFilter('premiumMin', e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Max Premium</label>
            <Input
              type="number"
              placeholder="No limit"
              value={filters.premiumMax}
              onChange={(e) => updateFilter('premiumMax', e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        {/* Trade Type */}
        <div>
          <label className="text-sm font-medium mb-2 block">Trade Type</label>
          <Select value={filters.tradeType} onValueChange={(value) => updateFilter('tradeType', value)}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="sweep">SWEEP</SelectItem>
              <SelectItem value="block">BLOCK</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Option Type */}
        <div>
          <label className="text-sm font-medium mb-2 block">Option Type</label>
          <Select value={filters.optionType} onValueChange={(value) => updateFilter('optionType', value)}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="All Options" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border z-50">
              <SelectItem value="">All Options</SelectItem>
              <SelectItem value="call">CALL</SelectItem>
              <SelectItem value="put">PUT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Score Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium mb-2 block">Min Score</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              placeholder="0.0"
              value={filters.scoreMin}
              onChange={(e) => updateFilter('scoreMin', e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Max Score</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              placeholder="1.0"
              value={filters.scoreMax}
              onChange={(e) => updateFilter('scoreMax', e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium mb-2 block">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-secondary border-border",
                    !filters.dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateFrom ? format(filters.dateFrom, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border-border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => updateFilter('dateFrom', date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-secondary border-border",
                    !filters.dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateTo ? format(filters.dateTo, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background border-border z-50" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => updateFilter('dateTo', date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <Button 
          variant="terminal" 
          className="w-full mt-6" 
          onClick={onApplyFilters}
          disabled={isLoading}
        >
          {isLoading ? "Applying..." : "Apply Filters"}
        </Button>
      </div>
    </Card>
  );
};