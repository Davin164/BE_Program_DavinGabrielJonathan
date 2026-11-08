// HTTP server entry point GDGoC UNSRI API

const app = require('./app');
const env = require('./config/env');
const { pool } = require('./config/database');

const server = app.listen(env.PORT, () => {
  console.log(`GDGoC UNSRI API running on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`Healthcheck: http://localhost:${env.PORT}/health`);
});

const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down...`);
  server.close(async () => {
    try {
      await pool.end();
      process.exit(0);
    } catch (err) {
      console.error('Error closing DB pool:', err.message);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
