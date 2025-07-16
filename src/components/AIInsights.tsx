import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Lightbulb, 
  Clock,
  Loader2,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AIAnalysisService } from "@/lib/aiAnalysis";

interface AIInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'trend' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  timestamp: Date;
}

export const AIInsights = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoAnalyzing, setAutoAnalyzing] = useState(false);

  const loadInsights = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      // For now, return mock insights since AI tables don't exist
      setInsights([
        {
          id: '1',
          type: 'trend',
          title: 'High Volume Activity',
          description: 'Unusual trading volume detected in AAPL options',
          confidence: 0.85,
          timestamp: new Date()
        },
        {
          id: '2',
          type: 'pattern',
          title: 'Sweep Pattern',
          description: 'Large sweep orders identified in tech sector',
          confidence: 0.72,
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void loadInsights();
    }
  }, [user, loadInsights]);


  const runQuickAnalysis = async () => {
    if (!user) return;

    setAutoAnalyzing(true);
    try {
      // Mock analysis - in future this would call actual AI service
      setTimeout(() => {
        setInsights(prev => [...prev, {
          id: Math.random().toString(),
          type: 'anomaly',
          title: 'New Pattern Detected',
          description: 'Fresh analysis revealed unusual market behavior',
          confidence: 0.78,
          timestamp: new Date()
        }]);
        setAutoAnalyzing(false);
      }, 2000);
    } catch (error) {
      console.error('Quick analysis error:', error);
      setAutoAnalyzing(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <Target className="w-4 h-4" />;
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4" />;
      case 'trend':
        return <TrendingUp className="w-4 h-4" />;
      case 'prediction':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern':
        return 'text-blue-500';
      case 'anomaly':
        return 'text-red-500';
      case 'trend':
        return 'text-green-500';
      case 'prediction':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-card border-border shadow-terminal">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading AI insights...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-card border-border shadow-terminal">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">AI Insights</h3>
        <Button
          onClick={runQuickAnalysis}
          disabled={autoAnalyzing}
          size="sm"
          variant="outline"
        >
          {autoAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Quick Analysis
            </>
          )}
        </Button>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No AI insights yet.</p>
          <p className="text-xs mt-1">Upload some flow data and run an analysis to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="p-4 bg-secondary/50 rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className={getInsightColor(insight.type)}>
                    {getInsightIcon(insight.type)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {insight.type}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className={`w-2 h-2 rounded-full ${getConfidenceColor(insight.confidence)}`} />
                    <span className="text-xs text-muted-foreground">
                      {(insight.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(insight.timestamp)}</span>
                  </div>
                </div>
              </div>
              
              <h4 className="font-medium text-sm mb-1">{insight.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {insight.description}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          AI insights are generated automatically when you upload new flow data.
        </p>
      </div>
    </Card>
  );
};