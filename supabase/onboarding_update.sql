ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
UPDATE profiles SET onboarding_completed = true WHERE role = 'professor' OR role = 'admin' OR total_xp > 0;
UPDATE profiles SET role = 'professor', onboarding_completed = true WHERE email = 'obenitez@caece.edu.ar';
