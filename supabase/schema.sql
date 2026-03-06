-- ============================================
-- EOF-Gamificado (EON) — Database Schema
-- Execute this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES — Synced from auth or manual
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id TEXT UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Estudiante',
  avatar_url TEXT,
  email TEXT,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- CHALLENGES — The 4 challenge definitions
-- ============================================
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  unit INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  max_xp INTEGER NOT NULL DEFAULT 0,
  unlock_level INTEGER DEFAULT 1,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- PROGRESS — User progress per challenge
-- ============================================
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id TEXT REFERENCES challenges(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'available' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
  xp_earned INTEGER DEFAULT 0,
  best_score REAL DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, challenge_id)
);

-- ============================================
-- ACHIEVEMENT DEFINITIONS
-- ============================================
CREATE TABLE IF NOT EXISTS achievement_definitions (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ACHIEVEMENTS — User unlocked achievements
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_key TEXT REFERENCES achievement_definitions(key) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, achievement_key)
);

-- ============================================
-- SEED: Challenge definitions
-- ============================================
INSERT INTO challenges (id, unit, title, subtitle, description, max_xp, unlock_level, icon, color)
VALUES
  ('lorentz', 1, 'El Laberinto de Lorentz', 'Control de Haces de Partículas',
   'Ajustá la intensidad de campos magnéticos para desviar cargas en movimiento y alcanzar el objetivo.',
   350, 1, '🧲', '#00f0ff'),
  ('maxwell', 2, 'El Enigma de Maxwell', 'Confinamiento Total',
   'Simulá la incidencia de ondas en una interfaz óptica. Encontrá el ángulo crítico para generar reflexión interna total.',
   450, 1, '⚡', '#ff00aa'),
  ('quantum', 3, 'El Salto Cuántico', 'Sintonizando Quantum Dots',
   'Ajustá las dimensiones de un pozo de potencial cuántico para que el Quantum Dot emita fotones de un color específico.',
   550, 1, '🔮', '#8b5cf6'),
  ('nanophotonic', 4, 'El Maestro Nanofotónico', 'Diseño de Metasuperficies',
   'Utilizá plasmones y cristales fotónicos para manipular la luz y superar el límite de difracción.',
   700, 1, '💎', '#ffd700')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SEED: Achievement definitions
-- ============================================
INSERT INTO achievement_definitions (key, title, description, icon, xp_reward)
VALUES
  ('first_challenge', 'Primer Paso', 'Completaste tu primer desafío', '🚀', 50),
  ('lorentz_master', 'Domador de la Fuerza de Lorentz', 'Obtuviste score perfecto en el Laberinto de Lorentz', '🧲', 100),
  ('maxwell_master', 'Maestro de las Ecuaciones de Maxwell', 'Unificaste campos variables y dominaste la reflexión total', '⚡', 100),
  ('quantum_master', 'Sintonizador Cuántico', 'Sintonizaste los Quantum Dots con precisión perfecta', '🔮', 100),
  ('nanophotonic_master', 'Arquitecto Nanofotónico', 'Diseñaste una nanoantena con eficiencia máxima', '💎', 150),
  ('efficiency_king', 'Rey de la Eficiencia', 'Completaste un desafío con eficiencia > 90%', '👑', 75),
  ('all_challenges', 'Maestro EOF', 'Completaste los 4 desafíos', '🏆', 500),
  ('heisenberg_limit', 'Más allá de Heisenberg', 'Superaste el Límite de Incertidumbre', '🌀', 100)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

-- Challenges and achievement_definitions are public read
CREATE POLICY "Challenges are viewable by everyone" ON challenges
  FOR SELECT USING (true);

CREATE POLICY "Achievement definitions are viewable by everyone" ON achievement_definitions
  FOR SELECT USING (true);

-- Profiles: users can read all profiles (for leaderboard), but only update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (true);

-- Progress: users can read all (for comparison), manage their own
CREATE POLICY "Progress is viewable by everyone" ON progress
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own progress" ON progress
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own progress" ON progress
  FOR UPDATE USING (true);

-- Achievements: readable by all, manageable by service role
CREATE POLICY "Achievements are viewable by everyone" ON achievements
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own achievements" ON achievements
  FOR INSERT WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_id ON profiles(clerk_id);
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_progress_profile_id ON progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_progress_challenge_id ON progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_achievements_profile_id ON achievements(profile_id);

-- ============================================
-- FUNCTION: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER progress_updated_at
  BEFORE UPDATE ON progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
