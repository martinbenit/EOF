import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lipuwpscytovmrapsixq.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcHV3cHNjeXRvdm1yYXBzaXhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mjc0ODc2MywiZXhwIjoyMDg4MzI0NzYzfQ.APvU8-R8EXqy52jVqGbm1zN82IKF4d8O7sQzz_aULH4';

const fullSql = `
-- Añadir columna de rol a profiles si no existe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('student', 'professor', 'admin'));

-- Función para que los profesores puedan ver todo el progreso
DROP POLICY IF EXISTS "Progress is viewable by everyone" ON progress;
CREATE POLICY "Progress is viewable by everyone" ON progress
  FOR SELECT USING (true);
`;

import pg from 'pg';

const PROJECT_REF = 'lipuwpscytovmrapsixq';
const DB_PASSWORD = 'qNms8iaxCjgLklih';
const connStr = `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

async function main() {
    const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('✅ Connected to DB');
        await client.query(fullSql);
        console.log('✅ Added role column to profiles');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

main();
