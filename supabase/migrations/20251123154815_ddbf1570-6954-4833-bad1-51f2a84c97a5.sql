-- Add columns to books table for order tracking and PDF metadata
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS order_id TEXT,
ADD COLUMN IF NOT EXISTS total_price NUMERIC,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS pdf_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pdf_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pdf_deleted BOOLEAN DEFAULT false;

-- Add index for cleanup query performance
CREATE INDEX IF NOT EXISTS idx_books_cleanup 
ON public.books(status, pdf_expires_at, pdf_deleted) 
WHERE status = 'completed' AND pdf_deleted = false;

-- Add status column to pages table if not exists
ALTER TABLE public.pages
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_mimi';