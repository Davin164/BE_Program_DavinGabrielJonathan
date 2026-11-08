/**
 * @file app.js
 * @description Express application configuration with security middleware,
 * route mounts, and centralized error handling.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Route Handlers
const authRouter = require('./modules/auth/auth.router');
const membersRouter = require('./modules/members/members.router');
const eventsRouter = require('./modules/events/events.router');
const registrationsRouter = require('./modules/registrations/registrations.router');
const attendancesRouter = require('./modules/attendances/attendances.router');
const auditLogsRouter = require('./modules/audit-logs/audit-logs.router');
const divisionsRouter = require('./modules/divisions/divisions.router');
const swaggerHtml = require('./modules/docs/swaggerHtml');
const openapiSpec = require('../docs/openapiSpec');

const app = express();

// Trust reverse proxy headers (Vercel, Render, Railway, Cloud Run) for accurate IP rate limiting
app.set('trust proxy', 1);

// Security HTTP headers (disable CSP so Swagger UI CDN assets load seamlessly)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Parse comma-separated allowed origins (normalized without trailing slashes)
const allowedOrigins = env.FRONTEND_URL.split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      const normalizedOrigin = origin ? origin.replace(/\/$/, '') : '';
      if (
        !origin ||
        allowedOrigins.includes(normalizedOrigin) ||
        env.NODE_ENV !== 'production' ||
        normalizedOrigin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request logging (silent during tests)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing with strict size limits to prevent body-inflation DoS
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global API rate limiter
app.use('/api', apiLimiter);

// Liveness / health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OpenAPI YAML specification endpoint
app.get('/openapi.yaml', (req, res) => {
  res.type('text/yaml').send(openapiSpec);
});

// Swagger UI interactive documentation
app.get(['/', '/docs'], (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(swaggerHtml);
});

// Mount application API modules
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/attendances', attendancesRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/divisions', divisionsRouter);

// Handle 404 routes
app.use(notFoundHandler);

// Centralized error handling middleware
app.use(errorHandler);

module.exports = app;
