/**
 * Sapalens API Gateway
 * Main entry point
 */

import 'dotenv/config';
import express, { type Application } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import morgan from 'morgan';
import passport from 'passport';

import config from './config/index.js';
import RedisManager from './config/redis.js';
import { initializePassport } from './auth/passport.config.js';
import {
  corsMiddleware,
  errorHandler,
  rateLimiter,
  requestLogger
} from './middlewares/index.js';
import routes from './routes/index.js';

const app: Application = express();

// Compute __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find public folder
const candidates = [
  path.join(__dirname, '..', 'public'),
  path.join(process.cwd(), 'gateway', 'public'),
  path.join(process.cwd(), 'public')
];

let publicPath: string | null = null;
for (const c of candidates) {
  if (fs.existsSync(c)) {
    publicPath = c;
    break;
  }
}

if (!publicPath) {
  publicPath = candidates[0];
  console.warn('[router] public directory not found');
} else {
  console.log(`[router] serving static from: ${publicPath}`);
}

// ===========================
// MIDDLEWARES
// ===========================
app.use(express.json());
app.use(corsMiddleware);
app.use(requestLogger);
app.use(morgan('dev'));
app.use(rateLimiter());

// Initialize Passport
initializePassport();
app.use(passport.initialize());

// ===========================
// STATIC FILES
// ===========================
app.use(express.static(publicPath));

// ===========================
// SPA FALLBACK ROUTES (before API routes)
// ===========================
app.get('/auth/callback', (_req, res) => {
  const callbackPath = path.join(publicPath as string, 'auth-callback.html');
  if (fs.existsSync(callbackPath)) {
    res.sendFile(callbackPath);
  } else {
    res.status(404).json({ error: 'auth_callback_not_found' });
  }
});

// ===========================
// API ROUTES
// ===========================
app.use('/', routes);

// ===========================
// SPA FALLBACK
// ===========================
app.get('/', (_req, res) => {
  const indexPath = path.join(publicPath as string, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

app.get('/admin', (_req, res) => {
  const adminIndex = path.join(publicPath as string, 'admin', 'index.html');
  if (fs.existsSync(adminIndex)) {
    res.sendFile(adminIndex);
  } else {
    res.status(404).json({ error: 'admin_not_found' });
  }
});

app.get('/admin/*', (_req, res) => {
  const adminIndex = path.join(publicPath as string, 'admin', 'index.html');
  if (fs.existsSync(adminIndex)) {
    res.sendFile(adminIndex);
  } else {
    res.status(404).json({ error: 'admin_not_found' });
  }
});

// ===========================
// 404 HANDLER
// ===========================
app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// ===========================
// ERROR HANDLER
// ===========================
app.use(errorHandler);

// ===========================
// START SERVER
// ===========================
const PORT = config.port;

// Initialize Redis
RedisManager.connect().catch(err => {
  console.error('[router] Failed to connect to Redis:', err.message);
  console.warn('[router] Some features will be disabled without Redis');
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Gateway is running on port ${PORT}`);
  console.log(`📍 Environment: ${config.env}`);
  console.log(`🔗 Services registered: ${Object.keys(config.services).length}`);
});

// ===========================
// GRACEFUL SHUTDOWN
// ===========================
function shutdown(signal: string) {
  console.log(`[router] Received ${signal}, shutting down...`);
  
  // Disconnect Redis
  RedisManager.disconnect().then(() => {
    console.log('[router] Redis disconnected');
  }).catch(() => {
    console.log('[router] Redis disconnect skipped (not connected)');
  });
  
  server.close((err) => {
    if (err) {
      console.error('[router] Error during shutdown', err);
      process.exit(1);
    }
    console.log('[router] Shutdown complete');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;