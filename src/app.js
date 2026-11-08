const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { query } = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

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

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

const allowedOrigins = env.FRONTEND_URL.split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

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

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api', apiLimiter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await query('SELECT NOW() as now, current_database() as db');
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      db: dbRes.rows[0].db,
      timestamp: dbRes.rows[0].now,
    });
  } catch (err) {
    const isConfigured = Boolean(process.env.DATABASE_URL);
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: err.message,
      code: err.code || null,
      db_url_configured: isConfigured,
      db_url_target: isConfigured
        ? process.env.DATABASE_URL.replace(/:[^:@]*@/, ':****@')
        : 'fallback localhost (DATABASE_URL not set in environment)',
      timestamp: new Date().toISOString(),
    });
  }
});

app.get('/openapi.yaml', (req, res) => {
  res.type('text/yaml').send(openapiSpec);
});

app.get(['/', '/docs'], (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(swaggerHtml);
});

app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/events', eventsRouter);
app.use('/api/registrations', registrationsRouter);
app.use('/api/attendances', attendancesRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/divisions', divisionsRouter);

app.use(notFoundHandler);

app.use(errorHandler);

module.exports = app;
