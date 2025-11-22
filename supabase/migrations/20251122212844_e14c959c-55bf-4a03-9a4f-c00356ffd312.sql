-- Add columns to store all three difficulty versions of the coloring image
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS easy_image_url text,
ADD COLUMN IF NOT EXISTS beginner_image_url text,
ADD COLUMN IF NOT EXISTS intermediate_image_url text;

-- Migrate existing coloring_image_url data to intermediate_image_url
UPDATE pages 
SET intermediate_image_url = coloring_image_url 
WHERE coloring_image_url IS NOT NULL AND intermediate_image_url IS NULL;