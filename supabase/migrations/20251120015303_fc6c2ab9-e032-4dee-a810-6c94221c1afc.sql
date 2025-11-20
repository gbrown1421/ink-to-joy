-- Add project_type column to books table
ALTER TABLE public.books 
ADD COLUMN project_type TEXT NOT NULL DEFAULT 'coloring' CHECK (project_type IN ('coloring', 'toon'));