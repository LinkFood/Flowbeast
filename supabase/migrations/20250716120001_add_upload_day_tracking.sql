-- Add upload day tracking to prevent data clustering and enable day-over-day analysis

-- Add upload_date column to options_flow table
ALTER TABLE public.options_flow 
ADD COLUMN upload_date DATE DEFAULT CURRENT_DATE;

-- Add index for efficient day-based queries
CREATE INDEX idx_options_flow_upload_date ON public.options_flow(upload_date);
CREATE INDEX idx_options_flow_user_upload_date ON public.options_flow(user_id, upload_date);

-- Create a table to track daily upload sessions
CREATE TABLE public.daily_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_flows INTEGER NOT NULL DEFAULT 0,
    total_premium DECIMAL(15,2) NOT NULL DEFAULT 0,
    unique_tickers INTEGER NOT NULL DEFAULT 0,
    upload_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_names TEXT[], -- Store uploaded file names
    processing_stats JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for daily uploads
CREATE INDEX idx_daily_uploads_user_date ON public.daily_uploads(user_id, upload_date);
CREATE INDEX idx_daily_uploads_date ON public.daily_uploads(upload_date);

-- Create unique constraint to prevent duplicate uploads for same day
CREATE UNIQUE INDEX idx_daily_uploads_user_date_unique ON public.daily_uploads(user_id, upload_date);

-- Enable RLS for daily uploads
ALTER TABLE public.daily_uploads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily uploads
CREATE POLICY "Users can view their own daily uploads" ON daily_uploads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily uploads" ON daily_uploads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily uploads" ON daily_uploads
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily uploads" ON daily_uploads
    FOR DELETE USING (auth.uid() = user_id);

-- Create a function to automatically set upload_date when inserting flows
CREATE OR REPLACE FUNCTION set_upload_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Set upload_date to current date if not specified
    IF NEW.upload_date IS NULL THEN
        NEW.upload_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set upload_date
CREATE TRIGGER trigger_set_upload_date
    BEFORE INSERT ON public.options_flow
    FOR EACH ROW
    EXECUTE FUNCTION set_upload_date();

-- Create a function to update daily upload stats
CREATE OR REPLACE FUNCTION update_daily_upload_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert daily upload stats
    INSERT INTO public.daily_uploads (
        user_id, 
        upload_date, 
        total_flows, 
        total_premium, 
        unique_tickers
    )
    SELECT 
        NEW.user_id,
        NEW.upload_date,
        COUNT(*),
        SUM(premium),
        COUNT(DISTINCT ticker_symbol)
    FROM public.options_flow 
    WHERE user_id = NEW.user_id AND upload_date = NEW.upload_date
    GROUP BY user_id, upload_date
    ON CONFLICT (user_id, upload_date) 
    DO UPDATE SET 
        total_flows = EXCLUDED.total_flows,
        total_premium = EXCLUDED.total_premium,
        unique_tickers = EXCLUDED.unique_tickers,
        upload_timestamp = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update daily stats after flow insert
CREATE TRIGGER trigger_update_daily_stats
    AFTER INSERT ON public.options_flow
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_upload_stats();