-- Add error_message column to persist failure reasons
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS error_message text;