/**
 * ============================================================================
 *  AI WEATHERWISE  -  Application Entry Point (index.js)
 *  Mohamed Sathak College of Arts and Science | 3rd Year BCA
 * ============================================================================
 *  Initialises the Express server, loads environment variables, configures
 *  middleware, establishes the MongoDB connection, registers API routes and
 *  starts listening only after a successful database handshake.
 * ============================================================================
 */
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const sanitizeRequest = require('./middleware/sanitizeMiddleware');
const logger = require('./utils/logger');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const aiService = require('./services/aiService');

const app = express();

/* -------------------- 1. Global middleware -------------------- */
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeRequest);
app.use(logger);

/* -------------------- 2. Static frontend (View layer) -------------------- */
app.use(express.static(path.join(__dirname, 'public')));

/* -------------------- 3. Root + health -------------------- */
app.get('/api/info', (_req, res) => {
  res.json({
    success: true,
    application: 'AI WeatherWise API',
    version: '1.0.0',
    developer: 'Hasna',
    institution: 'Mohamed Sathak College of Arts and Science - 3rd Year BCA',
    frontend: '/',
    weatherProvider: 'Open-Meteo (free, no key)',
    aiMode: aiService.isAiEnabled() ? 'Gemini live' : 'Deterministic fallback',
  });
});

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    aiEnabled: aiService.isAiEnabled(),
  });
});

/* -------------------- 4. API routes -------------------- */
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/locations', require('./routes/locationRoutes'));
app.use('/api/weather', require('./routes/weatherRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

/* Inline machine-readable API index */
app.get('/api/docs', (_req, res) => {
  res.json({
    success: true,
    endpoints: [
      { method: 'POST', path: '/api/auth/register', access: 'Public' },
      { method: 'POST', path: '/api/auth/login', access: 'Public' },
      { method: 'GET', path: '/api/auth/me', access: 'User' },
      { method: 'PUT', path: '/api/auth/profile', access: 'User' },
      { method: 'PUT', path: '/api/auth/password', access: 'User' },
      { method: 'GET', path: '/api/locations/search?q=', access: 'Public' },
      { method: 'GET', path: '/api/locations', access: 'User' },
      { method: 'POST', path: '/api/locations', access: 'User' },
      { method: 'PUT', path: '/api/locations/:id', access: 'Owner' },
      { method: 'DELETE', path: '/api/locations/:id', access: 'Owner' },
      { method: 'GET', path: '/api/weather?city=', access: 'Public' },
      { method: 'GET', path: '/api/weather/favourite/:id', access: 'Owner' },
      { method: 'GET', path: '/api/ai/status', access: 'Public' },
      { method: 'POST', path: '/api/ai/summary', access: 'Public' },
      { method: 'POST', path: '/api/ai/recommendation', access: 'Public' },
      { method: 'POST', path: '/api/ai/activity', access: 'Public' },
      { method: 'GET', path: '/api/ai/favourite/:id?type=', access: 'Owner' },
      { method: 'GET', path: '/api/admin/stats', access: 'Admin' },
      { method: 'GET', path: '/api/admin/users', access: 'Admin' },
      { method: 'GET', path: '/api/admin/logs', access: 'Admin' },
      { method: 'PUT', path: '/api/admin/users/:id/role', access: 'Admin' },
      { method: 'PUT', path: '/api/admin/users/:id/suspend', access: 'Admin' },
      { method: 'DELETE', path: '/api/admin/users/:id', access: 'Admin' },
    ],
  });
});

/* -------------------- 5. Error handling -------------------- */
app.use(notFound);
app.use(errorHandler);

/* -------------------- 6. Boot sequence -------------------- */
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log('--------------------------------------------------');
      console.log('  AI WEATHERWISE API');
      console.log(`  Mode        : ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Frontend    : http://localhost:${PORT}/`);
      console.log(`  API         : http://localhost:${PORT}/api`);
      console.log(`  Health      : http://localhost:${PORT}/api/health`);
      console.log(`  Docs index  : http://localhost:${PORT}/api/docs`);
      console.log(`  AI engine   : ${aiService.isAiEnabled() ? 'Google Gemini (live)' : 'Fallback mode (no GEMINI_API_KEY)'}`);
      console.log('--------------------------------------------------');
    });
  } catch (error) {
    console.error(`[SERVER] Startup aborted -> ${error.message}`);
    process.exit(1);
  }
};

if (require.main === module) start();

process.on('unhandledRejection', (err) => {
  console.error(`[SERVER] Unhandled rejection -> ${err.message}`);
});

module.exports = app;
