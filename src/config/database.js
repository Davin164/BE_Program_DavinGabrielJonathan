const { Pool } = require('pg');
const env = require('./env');

const isLocalDb =
  env.DATABASE_URL.includes('localhost') ||
  env.DATABASE_URL.includes('127.0.0.1') ||
  env.DATABASE_URL.includes('@db:');

if (!isLocalDb) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const cleanConnectionString = env.DATABASE_URL.replace(/[?&]sslmode=[^&]+/g, '');

const pool = new Pool({
  connectionString: cleanConnectionString,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
  max: process.env.VERCEL ? 3 : 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = {
  pool,
  query,
  getClient,
};
