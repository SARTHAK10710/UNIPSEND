const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const migrationsDir = path.join(__dirname, 'migrations');

const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT, 10) || 5433,
  database: process.env.POSTGRES_DB || 'unispend',
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'password',
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8').trim();

      if (!sql) {
        console.log(`⏩ ${file} — empty, skipping`);
        continue;
      }

      try {
        await client.query(sql);
        console.log(`✅ ${file} — success`);
      } catch (err) {
        if (err.code === '42P07') {
          console.log(`⏩ ${file} — table already exists, skipping`);
        } else {
          console.error(`❌ ${file} — FAILED: ${err.message}`);
        }
      }
    }

    console.log('\n✓ All migrations processed');
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
