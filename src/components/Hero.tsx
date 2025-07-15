import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Database, BarChart3, Brain, Upload, Target, Clock, DollarSign } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary/20" />
      
      {/* Main Hero Content */}
      <div className="relative container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4 bg-gradient-card rounded-full px-6 py-3 border border-border shadow-terminal">
              <TrendingUp className="w-6 h-6 text-primary" />
              <span className="text-sm font-medium">Professional Options Flow Analysis</span>
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Historical Options Flow
            </span>
            <br />
            <span className="text-foreground">Pattern Analysis</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your daily BullFlow.io data and leverage AI to identify patterns, track success rates, 
            and make data-driven trading decisions based on historical options flow analysis.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button variant="terminal" size="xl" className="shadow-data">
              <Upload className="w-5 h-5 mr-2" />
              Upload Flow Data
            </Button>
            <Button variant="data" size="xl">
              <BarChart3 className="w-5 h-5 mr-2" />
              View Analytics
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="p-6 bg-gradient-card border-border shadow-terminal hover:shadow-data transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">Data Storage</h3>
            <p className="text-sm text-muted-foreground">
              Secure storage of all historical BullFlow CSV uploads with efficient querying capabilities.
            </p>
          </Card>
          
          <Card className="p-6 bg-gradient-card border-border shadow-terminal hover:shadow-data transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mb-4">
              <Brain className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-semibold mb-2">Pattern Recognition</h3>
            <p className="text-sm text-muted-foreground">
              AI-powered analysis to identify similar flows and trading patterns across historical data.
            </p>
          </Card>
          
          <Card className="p-6 bg-gradient-card border-border shadow-terminal hover:shadow-data transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-lg mb-4">
              <Target className="w-6 h-6 text-warning" />
            </div>
            <h3 className="font-semibold mb-2">Success Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Track your followed trades and calculate win rates for different flow types and strategies.
            </p>
          </Card>
          
          <Card className="p-6 bg-gradient-card border-border shadow-terminal hover:shadow-data transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-center w-12 h-12 bg-info/10 rounded-lg mb-4">
              <Clock className="w-6 h-6 text-info" />
            </div>
            <h3 className="font-semibold mb-2">Historical Context</h3>
            <p className="text-sm text-muted-foreground">
              Access comprehensive historical analysis with filtering by ticker, premium, and trade type.
            </p>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="mt-20">
          <Card className="p-8 bg-gradient-card border-border shadow-terminal">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-primary mb-2">30K+</div>
                <div className="text-muted-foreground">Daily Flow Records</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-accent mb-2">1000+</div>
                <div className="text-muted-foreground">Unique Tickers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-warning mb-2">$100M+</div>
                <div className="text-muted-foreground">Premium Range</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};