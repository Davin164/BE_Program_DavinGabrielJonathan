/**
 * @file migrate.js
 * @description Migration runner script.
 * Reads SQL migration files from the migrations directory in numerical order and applies them.
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const runMigrations = async () => {
  console.log('Starting PostgreSQL migrations...');
  const migrationsDir = path.join(__dirname, '../../migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Executing migration: ${file}`);
      await client.query(sql);
    }
    console.log('All migrations applied successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;
