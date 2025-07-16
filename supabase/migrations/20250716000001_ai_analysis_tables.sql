-- Create tables for AI analysis and pattern storage

-- Table to store AI-generated insights about flow patterns
CREATE TABLE public.ai_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- 'pattern', 'anomaly', 'trend', 'prediction'
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    data_points JSONB NOT NULL, -- Store relevant data points that led to the insight
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration for time-sensitive insights
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Table to store detected patterns
CREATE TABLE public.flow_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pattern_type VARCHAR(50) NOT NULL, -- 'sweep', 'block', 'unusual_volume', 'price_movement'
    ticker_symbol VARCHAR(10) NOT NULL,
    pattern_name VARCHAR(100) NOT NULL,
    description TEXT,
    occurrences INTEGER DEFAULT 1,
    success_rate DECIMAL(5,2), -- Percentage of successful outcomes
    avg_return DECIMAL(10,4), -- Average return when pattern occurs
    time_horizon INTEGER, -- Days typically held
    conditions JSONB NOT NULL, -- The conditions that define this pattern
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Table to store AI chat conversations
CREATE TABLE public.ai_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Table to store individual AI chat messages
CREATE TABLE public.ai_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB, -- Store query results, data used, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track pattern performance over time
CREATE TABLE public.pattern_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pattern_id UUID NOT NULL REFERENCES flow_patterns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker_symbol VARCHAR(10) NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    outcome VARCHAR(20), -- 'success', 'failure', 'pending'
    return_percentage DECIMAL(10,4),
    days_held INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_ai_insights_created_at ON ai_insights(created_at);

CREATE INDEX idx_flow_patterns_user_id ON flow_patterns(user_id);
CREATE INDEX idx_flow_patterns_ticker ON flow_patterns(ticker_symbol);
CREATE INDEX idx_flow_patterns_type ON flow_patterns(pattern_type);
CREATE INDEX idx_flow_patterns_last_seen ON flow_patterns(last_seen);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX idx_ai_messages_created_at ON ai_messages(created_at);

CREATE INDEX idx_pattern_performance_pattern_id ON pattern_performance(pattern_id);
CREATE INDEX idx_pattern_performance_ticker ON pattern_performance(ticker_symbol);
CREATE INDEX idx_pattern_performance_detected_at ON pattern_performance(detected_at);

-- Enable Row Level Security
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flow_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pattern_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own AI insights" ON ai_insights
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI insights" ON ai_insights
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI insights" ON ai_insights
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI insights" ON ai_insights
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own flow patterns" ON flow_patterns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own flow patterns" ON flow_patterns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own flow patterns" ON flow_patterns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own flow patterns" ON flow_patterns
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own AI conversations" ON ai_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI conversations" ON ai_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI conversations" ON ai_conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI conversations" ON ai_conversations
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own AI messages" ON ai_messages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI messages" ON ai_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own pattern performance" ON pattern_performance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pattern performance" ON pattern_performance
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pattern performance" ON pattern_performance
    FOR UPDATE USING (auth.uid() = user_id);