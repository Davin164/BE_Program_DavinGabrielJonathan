/**
 * @file server.js
 * @description Application entry point that starts the HTTP server
 * and handles graceful process termination.
 */

const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/database');

const server = app.listen(env.PORT, () => {
  console.log(`===================================================`);
  console.log(`GDGoC UNSRI Management API running on port ${env.PORT}`);
  console.log(`Environment : ${env.NODE_ENV}`);
  console.log(`Database    : ${env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Healthcheck : http://localhost:${env.PORT}/health`);
  console.log(`===================================================`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await pool.end();
      console.log('PostgreSQL database pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing database pool:', err.message);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds timeout
  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
