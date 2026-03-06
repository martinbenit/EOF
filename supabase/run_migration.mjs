import pg from 'pg';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read .env.local manually
const envPath = join(__dirname, '..', '.env.local');
let envContent = '';
if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf8');
}
const env = {};
envContent.replace(/\r/g, '').split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim();
    }
});

const migrationFile = process.argv[2];
if (!migrationFile) {
    console.error('Please provide a migration file name (e.g. node run_migration.mjs onboarding_update.sql)');
    process.exit(1);
}

const sql = readFileSync(join(__dirname, migrationFile), 'utf-8');

const PROJECT_REF = env.SUPABASE_PROJECT_REF;
const DB_PASSWORD = env.SUPABASE_DB_PASSWORD;
if (!PROJECT_REF || !DB_PASSWORD) {
    console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_DB_PASSWORD in .env.local');
    process.exit(1);
}
const connStr = `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

async function main() {
    const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('✅ Connected to DB');
        await client.query(sql);
        console.log(`✅ Executed migration: ${migrationFile}`);
    } catch (e) {
        console.error('❌ SQL Error:', e);
    } finally {
        await client.end();
    }
}

main();
