-- Remove unused mimi_key column from pages table
ALTER TABLE pages DROP COLUMN IF EXISTS mimi_key;

-- Also remove old difficulty variant columns that are no longer used
ALTER TABLE pages DROP COLUMN IF EXISTS intermediate_image_url;
ALTER TABLE pages DROP COLUMN IF EXISTS easy_image_url;
ALTER TABLE pages DROP COLUMN IF EXISTS beginner_image_url;