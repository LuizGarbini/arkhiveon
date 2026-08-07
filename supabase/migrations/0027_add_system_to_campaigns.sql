-- Migration 0027: Add system column to campaigns table
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS system text DEFAULT 'dnd5e';

-- Update existing campaigns without system to default 'dnd5e'
UPDATE public.campaigns SET system = 'dnd5e' WHERE system IS NULL;
