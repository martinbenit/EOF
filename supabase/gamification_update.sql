-- 1. Create Challenge Attempts Table
CREATE TABLE IF NOT EXISTS challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id TEXT REFERENCES challenges(id),
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  score FLOAT,
  xp_earned INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  time_seconds INTEGER
);

ALTER TABLE progress DROP CONSTRAINT IF EXISTS progress_profile_id_fkey;
ALTER TABLE progress ADD CONSTRAINT progress_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Setup Storage Bucket for Avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar." ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can update their own avatar." ON storage.objects;
CREATE POLICY "Anyone can update their own avatar." ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can delete their own avatar." ON storage.objects;
CREATE POLICY "Anyone can delete their own avatar." ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars');

-- 3. Delete Mock Users (Cleanup)
DELETE FROM profiles WHERE role = 'student' AND (email IS NULL OR email = '' OR display_name LIKE '%(Mock)%');
