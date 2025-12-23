-- Add user_id column to books table
ALTER TABLE public.books 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to pages table (via book relationship, but we'll add directly for easier RLS)
-- Pages inherit access through their book, so we don't need user_id on pages

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on books" ON public.books;
DROP POLICY IF EXISTS "Allow all operations on pages" ON public.pages;

-- Create proper RLS policies for books
CREATE POLICY "Users can view their own books" 
ON public.books 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own books" 
ON public.books 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own books" 
ON public.books 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own books" 
ON public.books 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create proper RLS policies for pages (access through book ownership)
CREATE POLICY "Users can view pages of their books" 
ON public.pages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = pages.book_id 
    AND books.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create pages for their books" 
ON public.pages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = pages.book_id 
    AND books.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update pages of their books" 
ON public.pages 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = pages.book_id 
    AND books.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete pages of their books" 
ON public.pages 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.books 
    WHERE books.id = pages.book_id 
    AND books.user_id = auth.uid()
  )
);