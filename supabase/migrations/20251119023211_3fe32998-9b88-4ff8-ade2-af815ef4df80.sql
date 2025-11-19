-- Create storage bucket for book images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('book-images', 'book-images', true);

-- Create storage policies for book images
CREATE POLICY "Anyone can view book images"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-images');

CREATE POLICY "Anyone can upload book images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'book-images');

CREATE POLICY "Anyone can update book images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'book-images');

CREATE POLICY "Anyone can delete book images"
ON storage.objects FOR DELETE
USING (bucket_id = 'book-images');