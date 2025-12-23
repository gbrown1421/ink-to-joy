-- Make user_id NOT NULL to prevent orphaned records
-- First, delete any existing books without a user_id (orphaned data from before auth)
DELETE FROM public.books WHERE user_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE public.books 
ALTER COLUMN user_id SET NOT NULL;