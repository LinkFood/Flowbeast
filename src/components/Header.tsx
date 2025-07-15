import { Button } from "@/components/ui/button";
import { BarChart3, Database, Upload, MessageSquare, TrendingUp } from "lucide-react";

export const Header = () => {
  return (
    <header className="bg-gradient-card border-b border-border shadow-terminal">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-primary rounded-lg shadow-data">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Options Flow Analyzer
              </h1>
              <p className="text-muted-foreground text-sm">Historical Pattern Analysis System</p>
            </div>
          </div>
          
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Database className="w-4 h-4 mr-2" />
              Database
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analysis
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <MessageSquare className="w-4 h-4 mr-2" />
              AI Chat
            </Button>
            <Button variant="terminal" size="sm">
              Get Started
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};