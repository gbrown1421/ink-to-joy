-- Fix any existing rows with invalid difficulty values first
UPDATE books 
SET difficulty = CASE 
  WHEN LOWER(difficulty) LIKE '%quick%' OR LOWER(difficulty) LIKE '%easy%' THEN 'Quick and Easy'
  WHEN LOWER(difficulty) LIKE '%beginner%' THEN 'Beginner'
  WHEN LOWER(difficulty) LIKE '%advanced%' THEN 'Intermediate'
  ELSE 'Intermediate'
END
WHERE difficulty NOT IN ('Quick and Easy', 'Beginner', 'Intermediate');

-- Now lock books.difficulty to only three allowed values
ALTER TABLE books 
DROP CONSTRAINT IF EXISTS books_difficulty_check;

ALTER TABLE books 
ADD CONSTRAINT books_difficulty_check 
CHECK (difficulty IN ('Quick and Easy', 'Beginner', 'Intermediate'));