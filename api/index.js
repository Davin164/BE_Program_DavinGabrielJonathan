/**
 * @file api/index.js
 * @description Vercel Serverless Function entry point exporting the Express app.
 * Allows deploying the Back-End REST API on Vercel as well as Docker/Railway/Render/Cloud Run.
 */

const app = require('../src/app');

module.exports = app;

