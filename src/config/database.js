/**
 * @file database.js
 * @description PostgreSQL connection pool setup using the pg library.
 * Parameterized queries are enforced; no ORM is used for security and explicit control.
 */

const { Pool } = require('pg');
const env = require('./env');

const isProduction = env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Return an error after 5 seconds if connection cannot be established
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
