/**
 * @file database.js
 * @description PostgreSQL connection pool setup using the pg library.
 * Parameterized queries are enforced; no ORM is used for security and explicit control.
 * Automatically enables TLS/SSL when connecting to cloud PostgreSQL (e.g. Supabase, Railway, Render).
 */

const { Pool } = require('pg');
const env = require('./env');

const isLocalDb =
  env.DATABASE_URL.includes('localhost') ||
  env.DATABASE_URL.includes('127.0.0.1') ||
  env.DATABASE_URL.includes('@db:');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Execute a parameterized query using the pool.
 * @param {string} text - SQL query string with $1, $2 placeholders
 * @param {Array<any>} [params] - Parameter values
 * @returns {Promise<import('pg').QueryResult>} Query result
 */
const query = (text, params) => pool.query(text, params);

/**
 * Acquire a client from the pool (for multi-statement transactions).
 * Remember to call client.release() when done!
 * @returns {Promise<import('pg').PoolClient>} Client instance
 */
const getClient = () => pool.connect();

module.exports = {
  pool,
  query,
  getClient,
};
