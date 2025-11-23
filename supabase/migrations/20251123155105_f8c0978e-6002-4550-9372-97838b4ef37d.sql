-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-pdfs', 'book-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to PDFs
CREATE POLICY "Public read access for book PDFs"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-pdfs');

-- Allow service role to upload PDFs
CREATE POLICY "Service role can upload PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'book-pdfs');