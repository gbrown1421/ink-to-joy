-- Update books.difficulty constraint to allow both coloring and toon difficulty values
ALTER TABLE books 
DROP CONSTRAINT IF EXISTS books_difficulty_check;

ALTER TABLE books 
ADD CONSTRAINT books_difficulty_check 
CHECK (difficulty IN ('Quick and Easy', 'Beginner', 'Intermediate', 'Adv Beginner'));