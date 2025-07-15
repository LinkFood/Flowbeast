-- Update the database to handle additional trade types from BullFlow data
-- Add a check constraint to allow the trade types we see in BullFlow exports
ALTER TABLE public.options_flow DROP CONSTRAINT IF EXISTS options_flow_trade_type_check;
ALTER TABLE public.options_flow ADD CONSTRAINT options_flow_trade_type_check 
CHECK (trade_type IN ('buy', 'sell', 'block', 'sweep'));

-- Also update option_type to handle 'C' and 'P' variations
ALTER TABLE public.options_flow DROP CONSTRAINT IF EXISTS options_flow_option_type_check;
ALTER TABLE public.options_flow ADD CONSTRAINT options_flow_option_type_check 
CHECK (LOWER(option_type) IN ('call', 'put', 'c', 'p'));