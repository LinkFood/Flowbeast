-- Create options flow data table
CREATE TABLE public.options_flow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  time_of_trade TIMESTAMP WITH TIME ZONE NOT NULL,
  ticker_symbol TEXT NOT NULL,
  premium DECIMAL(15,2) NOT NULL,
  option_type TEXT NOT NULL, -- 'call' or 'put'
  trade_type TEXT NOT NULL, -- 'buy' or 'sell'
  score DECIMAL(5,2),
  spot_price DECIMAL(15,2),
  strike_price DECIMAL(15,2),
  implied_volatility DECIMAL(8,4),
  open_interest INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.options_flow ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own options flow data" 
ON public.options_flow 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own options flow data" 
ON public.options_flow 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own options flow data" 
ON public.options_flow 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own options flow data" 
ON public.options_flow 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_options_flow_updated_at
BEFORE UPDATE ON public.options_flow
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_options_flow_user_id ON public.options_flow(user_id);
CREATE INDEX idx_options_flow_ticker_symbol ON public.options_flow(ticker_symbol);
CREATE INDEX idx_options_flow_time_of_trade ON public.options_flow(time_of_trade);
CREATE INDEX idx_options_flow_option_type ON public.options_flow(option_type);
CREATE INDEX idx_options_flow_trade_type ON public.options_flow(trade_type);