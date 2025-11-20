-- Add keep column to pages table to track which pages to include in final book
ALTER TABLE public.pages 
ADD COLUMN keep BOOLEAN DEFAULT true;