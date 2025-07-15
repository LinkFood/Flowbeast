import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Filter, Search, TrendingUp, DollarSign, Clock } from "lucide-react";

export const DashboardSection = () => {
  // Mock data for demonstration
  const recentFlows = [
    {
      ticker: "AAPL",
      premium: "$2.4M",
      type: "CALL",
      tradeType: "SWEEP",
      score: 0.89,
      time: "09:31 AM",
      strike: "$190",
      expiry: "12/20",
      profit: true
    },
    {
      ticker: "NVDA", 
      premium: "$5.8M",
      type: "PUT",
      tradeType: "BLOCK",
      score: 0.94,
      time: "09:45 AM",
      strike: "$485",
      expiry: "12/27",
      profit: false
    },
    {
      ticker: "SPY",
      premium: "$12.1M",
      type: "CALL",
      tradeType: "SWEEP",
      score: 0.76,
      time: "10:15 AM",
      strike: "$460",
      expiry: "12/22",
      profit: true
    },
    {
      ticker: "QQQ",
      premium: "$3.2M",
      type: "PUT", 
      tradeType: "BLOCK",
      score: 0.82,
      time: "10:32 AM",
      strike: "$380",
      expiry: "01/17",
      profit: true
    }
  ];

  const dailyStats = {
    totalFlows: "28,547",
    totalPremium: "$2.8B",
    uniqueTickers: "1,247",
    avgScore: "0.73"
  };

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
                <p className="text-2xl font-bold text-primary">{dailyStats.totalFlows}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-card border-border shadow-terminal">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Premium</p>
                <p className="text-2xl font-bold text-accent">{dailyStats.totalPremium}</p>
              </div>
              <DollarSign className="w-8 h-8 text-accent" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-card border-border shadow-terminal">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Unique Tickers</p>
                <p className="text-2xl font-bold text-warning">{dailyStats.uniqueTickers}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-warning" />
            </div>
          </Card>
          
          <Card className="p-6 bg-gradient-card border-border shadow-terminal">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Avg Score</p>
                <p className="text-2xl font-bold text-info">{dailyStats.avgScore}</p>
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
              
              <div className="space-y-4">
                {recentFlows.map((flow, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="font-bold text-lg">{flow.ticker}</div>
                        <div className="text-xs text-muted-foreground">{flow.time}</div>
                      </div>
                      
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={flow.type === 'CALL' ? 'default' : 'secondary'} className="text-xs">
                            {flow.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {flow.tradeType}
                          </Badge>
                          <span className="text-lg font-bold text-primary">{flow.premium}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Strike: {flow.strike} • Exp: {flow.expiry} • Score: {flow.score}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant={flow.profit ? "default" : "destructive"} className="mb-2">
                        {flow.profit ? "Following" : "Watching"}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {flow.profit ? "+12.5%" : "Monitor"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <Button variant="data">
                  View All Flows
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