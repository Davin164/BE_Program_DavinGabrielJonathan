/**
 * Global Jest teardown to close database connection pool after all tests finish.
 */
const { pool } = require('../src/config/database');

module.exports = async () => {
  try {
    await pool.end();
  } catch (err) {
    // Ignore teardown errors
  }
};

