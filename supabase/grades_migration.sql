-- Add columns for traditional grading (Parcial 1 and Parcial 2) to the profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS parcial1_score FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS parcial2_score FLOAT DEFAULT 0;
