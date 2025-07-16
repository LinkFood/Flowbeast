import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  Lightbulb,
  BarChart3 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AIAnalysisService, FlowAnalysisResult } from "@/lib/aiAnalysis";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface AIInsightCard {
  type: 'pattern' | 'anomaly' | 'trend' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  icon: React.ReactNode;
}

export const AIChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FlowAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      initializeChat();
    }
  }, [user]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const initializeChat = async () => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to FlowBeast AI! I'm here to help you analyze your options flow data and identify patterns. 

I can help you with:
• Pattern recognition in your flow data
• Anomaly detection and unusual activity
• Historical trend analysis
• Market sentiment insights
• Risk assessment

Ask me anything about your options flow data, or type "analyze" to get started with today's analysis.`,
      timestamp: new Date()
    };

    setMessages([welcomeMessage]);
  };

  const runAnalysis = async () => {
    if (!user) return;

    setIsAnalyzing(true);
    try {
      const aiService = new AIAnalysisService(user.id);
      const result = await aiService.analyzeFlowData('today');
      setAnalysisResult(result);

      // Add analysis summary message
      const analysisMessage: ChatMessage = {
        id: `analysis-${Date.now()}`,
        role: 'assistant',
        content: `Analysis complete! Here's what I found:

📊 **Summary**
- Analyzed ${result.summary.totalFlowsAnalyzed} flows
- Detected ${result.summary.patternsDetected} patterns
- Found ${result.summary.anomaliesFound} anomalies
- Market sentiment: ${result.summary.marketSentiment}
- Risk level: ${result.summary.riskLevel}

**Top Active Tickers:**
${result.summary.topTickers.slice(0, 3).map(ticker => `• ${ticker.ticker}: ${ticker.activity} flows`).join('\n')}

${result.insights.length > 0 ? '\n**Key Insights:**\n' + result.insights.slice(0, 2).map(insight => `• ${insight.title}: ${insight.description}`).join('\n') : ''}

Ask me specific questions about any patterns or anomalies you'd like to explore further!`,
        timestamp: new Date(),
        metadata: { analysis: result }
      };

      setMessages(prev => [...prev, analysisMessage]);
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Error",
        description: "Failed to analyze flow data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await processUserQuery(inputValue);
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processUserQuery = async (query: string): Promise<string> => {
    const lowerQuery = query.toLowerCase();

    // Handle analysis request
    if (lowerQuery.includes('analyze') || lowerQuery.includes('analysis')) {
      await runAnalysis();
      return "Running analysis now...";
    }

    // Handle pattern queries
    if (lowerQuery.includes('pattern') || lowerQuery.includes('patterns')) {
      if (analysisResult && analysisResult.patterns.length > 0) {
        return `I found ${analysisResult.patterns.length} patterns in your data:

${analysisResult.patterns.map(pattern => 
  `**${pattern.name}** (${pattern.patternType})
  - Ticker: ${pattern.ticker}
  - Occurrences: ${pattern.occurrences}
  - ${pattern.description}`
).join('\n\n')}`;
      } else {
        return "No recent patterns found. Try running an analysis first by typing 'analyze' or upload some recent flow data.";
      }
    }

    // Handle anomaly queries
    if (lowerQuery.includes('anomaly') || lowerQuery.includes('anomalies') || lowerQuery.includes('unusual')) {
      if (analysisResult && analysisResult.anomalies.length > 0) {
        return `I detected ${analysisResult.anomalies.length} anomalies:

${analysisResult.anomalies.map(anomaly => 
  `**${anomaly.type.toUpperCase()} Anomaly** (${anomaly.severity} severity)
  - Ticker: ${anomaly.ticker}
  - ${anomaly.description}`
).join('\n\n')}`;
      } else {
        return "No anomalies detected in recent data. This could indicate normal market conditions.";
      }
    }

    // Handle ticker-specific queries
    const tickerMatch = query.match(/\b[A-Z]{1,5}\b/g);
    if (tickerMatch) {
      const ticker = tickerMatch[0];
      return await getTickerInsights(ticker);
    }

    // Handle sentiment queries
    if (lowerQuery.includes('sentiment') || lowerQuery.includes('bullish') || lowerQuery.includes('bearish')) {
      if (analysisResult) {
        return `Current market sentiment based on your flow data is **${analysisResult.summary.marketSentiment}**.

This assessment is based on:
- Call/Put ratio analysis
- Premium flow patterns
- Trade type distribution
- Volume patterns

Risk level: ${analysisResult.summary.riskLevel}`;
      } else {
        return "Please run an analysis first to get sentiment insights.";
      }
    }

    // Handle help queries
    if (lowerQuery.includes('help') || lowerQuery.includes('what can you do')) {
      return `I can help you with:

🔍 **Analysis Commands:**
- "analyze" - Run complete flow analysis
- "patterns" - Show detected patterns
- "anomalies" - Show unusual activity
- "sentiment" - Market sentiment analysis

📊 **Ticker Queries:**
- "Tell me about AAPL" - Get specific ticker insights
- "What's unusual about NVDA?" - Ticker-specific anomalies

💡 **Questions I can answer:**
- "What patterns do you see?"
- "Are there any red flags?"
- "What should I watch for?"
- "How's the market sentiment?"

Just ask me anything about your options flow data!`;
    }

    // Default response for unrecognized queries
    return `I'm not sure how to help with that specific query. Here are some things you can try:

• Type "analyze" to run a complete analysis
• Ask about specific tickers (e.g., "Tell me about AAPL")
• Ask about patterns, anomalies, or market sentiment
• Type "help" for more command options

What would you like to know about your options flow data?`;
  };

  const getTickerInsights = async (ticker: string): Promise<string> => {
    if (!user) return "Please log in to get ticker insights.";

    try {
      // Get recent flows for this ticker
      const { data: tickerFlows, error } = await supabase
        .from('options_flow')
        .select('*')
        .eq('user_id', user.id)
        .eq('ticker_symbol', ticker)
        .order('time_of_trade', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (!tickerFlows || tickerFlows.length === 0) {
        return `No recent flow data found for ${ticker}. Make sure you've uploaded data containing this ticker.`;
      }

      // Analyze this ticker's data
      const totalPremium = tickerFlows.reduce((sum, flow) => sum + flow.premium, 0);
      const avgPremium = totalPremium / tickerFlows.length;
      const calls = tickerFlows.filter(f => f.option_type.toLowerCase() === 'call').length;
      const puts = tickerFlows.filter(f => f.option_type.toLowerCase() === 'put').length;
      const sweeps = tickerFlows.filter(f => f.trade_type === 'sweep').length;
      const blocks = tickerFlows.filter(f => f.trade_type === 'block').length;

      // Check for patterns specific to this ticker
      const patterns = analysisResult?.patterns.filter(p => p.ticker === ticker) || [];
      const anomalies = analysisResult?.anomalies.filter(a => a.ticker === ticker) || [];

      return `**${ticker} Analysis:**

📊 **Recent Activity:**
- ${tickerFlows.length} total flows
- $${(totalPremium / 1000000).toFixed(2)}M total premium
- $${(avgPremium / 1000).toFixed(0)}K average premium

📈 **Flow Composition:**
- Calls: ${calls} (${((calls / tickerFlows.length) * 100).toFixed(1)}%)
- Puts: ${puts} (${((puts / tickerFlows.length) * 100).toFixed(1)}%)
- Sweeps: ${sweeps}
- Blocks: ${blocks}

${patterns.length > 0 ? `\n🎯 **Patterns Detected:**\n${patterns.map(p => `• ${p.name}: ${p.description}`).join('\n')}` : ''}

${anomalies.length > 0 ? `\n⚠️ **Anomalies:**\n${anomalies.map(a => `• ${a.description}`).join('\n')}` : ''}

${patterns.length === 0 && anomalies.length === 0 ? '\n✅ **No unusual patterns detected** - activity appears normal.' : ''}`;

    } catch (error) {
      console.error('Ticker insights error:', error);
      return `Sorry, I encountered an error analyzing ${ticker}. Please try again.`;
    }
  };

  const getInsightCards = (): AIInsightCard[] => {
    if (!analysisResult) return [];

    return analysisResult.insights.slice(0, 3).map(insight => ({
      type: insight.type,
      title: insight.title,
      description: insight.description,
      confidence: insight.confidence,
      icon: insight.type === 'pattern' ? <Target className="w-5 h-5" /> :
            insight.type === 'anomaly' ? <AlertTriangle className="w-5 h-5" /> :
            insight.type === 'trend' ? <TrendingUp className="w-5 h-5" /> :
            <Lightbulb className="w-5 h-5" />
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* AI Insights Cards */}
      {analysisResult && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {getInsightCards().map((card, index) => (
            <Card key={index} className="p-4 bg-gradient-card border-border">
              <div className="flex items-start space-x-3">
                <div className="text-primary">{card.icon}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{card.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{card.description}</p>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-muted-foreground">Confidence:</div>
                    <div className="flex-1 bg-secondary rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${card.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{(card.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Chat Interface */}
      <Card className="bg-gradient-card border-border shadow-terminal">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">FlowBeast AI</h3>
                <p className="text-sm text-muted-foreground">
                  {isAnalyzing ? 'Analyzing your flow data...' : 'Ready to analyze your options flow'}
                </p>
              </div>
            </div>
            <Button 
              onClick={runAnalysis} 
              disabled={isAnalyzing}
              variant="outline"
              size="sm"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-2" />
              )}
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
          </div>
        </div>

        <ScrollArea className="h-96 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-accent text-white' 
                      : 'bg-primary text-white'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div className={`rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-accent text-white'
                      : 'bg-secondary text-foreground'
                  }`}>
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-secondary rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about your options flow data..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Try: "analyze", "patterns", "Tell me about AAPL", or "help"
          </div>
        </div>
      </Card>
    </div>
  );
};