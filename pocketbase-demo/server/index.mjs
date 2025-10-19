import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ensureAuth, pb } from './services/pocketbaseClient.mjs';
import { createPostsRouter } from './routes/posts.mjs';
import { healthCheck } from './routes/health.mjs';
import { requestTiming } from './middleware/timing.mjs';
import { metricsMiddleware, metricsEndpoint, initializeMetrics } from './middleware/metrics.mjs';
import { initializeSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './services/errorTracking.mjs';
import { setupSwagger } from './docs/swagger.mjs';
import { validateConfig, getConfig } from './config.mjs';
import { info, error as logError } from './utils/logger.mjs';
import { HttpError } from './utils/errors.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number.parseInt(process.env.APP_PORT || '3030', 10);

export function createApp() {
  const app = express();
  const config = getConfig();

  // Initialize Sentry (must be first)
  const sentryEnabled = initializeSentry(app);
  if (sentryEnabled) {
    app.use(sentryRequestHandler());
    app.use(sentryTracingHandler());
  }

  // Request timing middleware (early in the stack)
  app.use(requestTiming);

  // Metrics middleware (if enabled)
  if (config.enableMetrics) {
    app.use(metricsMiddleware);
    initializeMetrics();
  }

  // CORS configuration
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:4173',
      'http://127.0.0.1:4173',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  app.use(cors(corsOptions));

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable for now to avoid breaking existing setup
    crossOriginEmbedderPolicy: false
  }));

  // Rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  const createLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 creates per minute
    message: 'Too many posts created, please slow down'
  });

  app.use('/api/', apiLimiter);

  app.use(express.json({ limit: '1mb' }));

  // Enhanced health check
  app.get('/healthz', healthCheck);
  app.get('/health', healthCheck);

  // Metrics endpoint (if enabled)
  if (config.enableMetrics) {
    app.get('/metrics', metricsEndpoint);
  }

  // API documentation
  setupSwagger(app);

  app.use('/api/posts', createPostsRouter({ createLimiter }));

  app.use((req, res, next) => {
    next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
  });

  // Sentry error handler (must be before other error handlers)
  if (sentryEnabled) {
    app.use(sentryErrorHandler());
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || 500;
    const payload = {
      error: err.message || 'Internal server error',
    };

    if (err.details) {
      payload.details = err.details;
    }

    if (!err.status || err.status >= 500) {
      logError('Unhandled server error', {
        status,
        method: req.method,
        path: req.originalUrl,
        error: err.message,
      });
    }

    res.status(status).json(payload);
  });

  return app;
}

export async function start() {
  // Validate configuration before starting
  validateConfig();

  await ensureAuth('server bootstrap');
  const app = createApp();

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      info('Server listening', { port: PORT, cwd: __dirname });

      // Setup graceful shutdown handlers
      setupGracefulShutdown(server);

      resolve(server);
    });
  });
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(server) {
  async function shutdown(signal) {
    info(`Received ${signal}, starting graceful shutdown`);

    // Stop accepting new connections
    server.close(async () => {
      info('HTTP server closed');

      try {
        // Clear PocketBase auth store
        pb.authStore.clear();
        info('PocketBase connection cleaned up');
      } catch (error) {
        logError('Error during cleanup', { error: error.message });
      }

      info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logError('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (process.argv[1] === __filename) {
  start().catch((err) => {
    logError('Failed to start server', { error: err?.message || err });
    process.exitCode = 1;
  });
}
