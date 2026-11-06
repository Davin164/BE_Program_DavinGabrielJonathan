/**
 * @file testHelper.js
 * @description Helper functions and database setup utilities for automated Jest tests.
 */

const fs = require('fs');
const path = require('path');
const { pool, query } = require('../src/config/database');
const { hashPassword } = require('../src/utils/password');
const { generateAccessToken } = require('../src/utils/jwt');

let isInitialized = false;

/**
 * Initialize test database schema by executing migrations.
 */
const initTestDb = async () => {
  if (isInitialized) return;

  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
    }
    isInitialized = true;
  } catch (err) {
    console.warn('Could not run migrations directly (DB might be down or already initialized):', err.message);
  } finally {
    client.release();
  }
};

/**
 * Truncate test tables to ensure clean isolated test runs.
 */
const cleanTestDb = async () => {
  try {
    await query(`
      TRUNCATE TABLE audit_logs, attendances, registrations, events, users RESTART IDENTITY CASCADE;
    `);
    // Ensure divisions exist
    await query(`
      INSERT INTO divisions (name) VALUES ('Core Team'), ('Technology'), ('Design'), ('Marketing'), ('Event')
      ON CONFLICT (name) DO NOTHING;
    `);
  } catch (err) {
    // If DB is offline, ignore error during clean
  }
};

/**
 * Create a test user with a specified role and return user data + JWT token.
 */
const createTestUser = async ({
  email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`,
  name = 'Test User',
  role = 'MEMBER',
  password = 'Password123!',
  division_name = 'Technology',
} = {}) => {
  const divRes = await query('SELECT id FROM divisions WHERE name = $1 LIMIT 1', [division_name]);
  const division_id = divRes.rows[0]?.id || null;
  const password_hash = await hashPassword(password);

  const res = await query(
    `INSERT INTO users (email, name, password_hash, role, division_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, role, division_id;`,
    [email, name, role, division_id]
  );

  const user = res.rows[0];
  const token = generateAccessToken(user);

  return { user, token };
};

/**
 * Create a test event.
 */
const createTestEvent = async ({
  title = 'Test Event',
  quota = 10,
  created_by,
  start_time = new Date(Date.now() + 86400000).toISOString(),
  end_time = new Date(Date.now() + 90000000).toISOString(),
  location = 'Test Venue',
}) => {
  const res = await query(
    `INSERT INTO events (title, quota, created_by, start_time, end_time, location)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *;`,
    [title, quota, created_by, start_time, end_time, location]
  );
  return res.rows[0];
};

module.exports = {
  pool,
  query,
  initTestDb,
  cleanTestDb,
  createTestUser,
  createTestEvent,
};
