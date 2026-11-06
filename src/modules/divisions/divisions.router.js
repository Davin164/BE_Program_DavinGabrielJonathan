/**
 * @file divisions.router.js
 * @description Express router for organizational divisions.
 */

const { Router } = require('express');
const { query } = require('../../config/database');
const { success } = require('../../utils/apiResponse');

const router = Router();

// GET /api/divisions - Get all available divisions
router.get('/', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, name, description, created_at FROM divisions ORDER BY name ASC'
    );
    return success(res, result.rows, 200);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
