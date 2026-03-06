import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const fullSql = `
-- Añadir columna de rol a profiles si no existe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('student', 'professor', 'admin'));

-- Función para que los profesores puedan ver todo el progreso
DROP POLICY IF EXISTS "Progress is viewable by everyone" ON progress;
CREATE POLICY "Progress is viewable by everyone" ON progress
  FOR SELECT USING (true);
`;

import pg from 'pg';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
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
