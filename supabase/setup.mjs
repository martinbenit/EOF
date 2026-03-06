// Execute SQL schema against Supabase via direct Postgres connection
// Try all common Supabase pooler regions

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');

const PROJECT_REF = 'lipuwpscytovmrapsixq';
const DB_PASSWORD = 'qNms8iaxCjgLklih';

// All possible Supabase pooler regions
const REGIONS = [
    'aws-0-us-east-1',
    'aws-0-us-west-1',
    'aws-0-sa-east-1',
    'aws-0-eu-west-1',
    'aws-0-eu-central-1',
    'aws-0-ap-southeast-1',
    'aws-0-ap-northeast-1',
    'aws-0-us-east-2',
    'aws-0-eu-west-2',
];

async function tryRegion(region) {
    // Transaction mode (port 6543) via Supavisor
    const connStr = `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@${region}.pooler.supabase.com:6543/postgres`;
    const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
    try {
        await client.connect();
        console.log(`✅ Connected via ${region}!`);
        return client;
    } catch (err) {
        console.log(`   ✗ ${region}: ${err.message.substring(0, 60)}`);
        await client.end().catch(() => { });
        return null;
    }
}

async function tryDirect() {
    // Direct connection (port 5432) — bypasses pooler
    const connStr = `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`;
    const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
    try {
        await client.connect();
        console.log('✅ Connected via DIRECT connection!');
        return client;
    } catch (err) {
        console.log(`   ✗ Direct: ${err.message.substring(0, 80)}`);
        await client.end().catch(() => { });
        return null;
    }
}

async function main() {
    console.log('🔄 Connecting to Supabase Postgres...');
    console.log(`   Project: ${PROJECT_REF}\n`);

    // Try direct connection first
    let client = await tryDirect();

    if (!client) {
        console.log('\n🔄 Trying pooler regions...');
        for (const region of REGIONS) {
            client = await tryRegion(region);
            if (client) break;
        }
    }

    if (!client) {
        console.error('\n❌ Could not connect to any region.');
        console.log('Please check the database password and project reference.');
        process.exit(1);
    }

    try {
        console.log('\n🔄 Executing schema...');
        await client.query(sql);
        console.log('✅ Schema executed successfully!\n');

        // Verify tables
        const res = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
        console.log('📋 Tables:');
        res.rows.forEach(r => console.log(`   • ${r.table_name}`));

        // Verify challenges seed
        const challenges = await client.query('SELECT id, title, max_xp FROM challenges ORDER BY unit');
        console.log('\n🎮 Challenges:');
        challenges.rows.forEach(r => console.log(`   • ${r.id}: ${r.title} (${r.max_xp} XP)`));

        // Verify achievements seed
        const achievements = await client.query('SELECT key, title FROM achievement_definitions ORDER BY key');
        console.log('\n🏆 Achievements:');
        achievements.rows.forEach(r => console.log(`   • ${r.key}: ${r.title}`));

        console.log('\n✅ Database setup complete!');
    } catch (err) {
        console.error('❌ SQL Error:', err.message);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
