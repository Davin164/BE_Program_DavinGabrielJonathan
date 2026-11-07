/**
 * @file env.js
 * @description Validates and exports application environment variables.
 */

const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];

// Validate required env vars in production
if (process.env.NODE_ENV === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gdgoc_db',
  JWT_SECRET: process.env.JWT_SECRET || 'default-gdgoc-jwt-access-secret-minimum-32-chars-long-123',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'default-gdgoc-jwt-refresh-secret-minimum-32-chars-long-456',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
};

module.exports = env;
