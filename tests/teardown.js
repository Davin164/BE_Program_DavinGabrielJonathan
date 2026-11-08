const { pool } = require('../src/config/database');

module.exports = async () => {
  try {
    await pool.end();
  } catch (err) {
  }
};

