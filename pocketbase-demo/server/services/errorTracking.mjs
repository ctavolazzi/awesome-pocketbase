import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { info, warn } from '../utils/logger.mjs';

let initialized = false;

/**
 * Initialize Sentry error tracking
 * Only initializes if SENTRY_DSN is configured
 */
export function initializeSentry(app) {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn || dsn.trim() === '') {
    info('Sentry not configured (SENTRY_DSN not set)');
    return false;
  }

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',

      // Performance monitoring
      tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE
        ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
        : 0.1, // Sample 10% of transactions

      // Profiling
      profilesSampleRate: process.env.SENTRY_PROFILES_SAMPLE_RATE
        ? parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE)
        : 0.1, // Sample 10% of profiling data

      integrations: [
        // Express integration
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app }),
        nodeProfilingIntegration(),
      ],

      // Filter out noise
      ignoreErrors: [
        // Ignore common browser errors
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        // Ignore rate limit errors (expected)
        'Too many requests',
      ],

      // Before sending events, you can modify them
      beforeSend(event, hint) {
        // Don't send 404 errors
        if (event.exception?.values?.[0]?.value?.includes('Route not found')) {
          return null;
        }

        // Don't send rate limit errors
        if (event.exception?.values?.[0]?.value?.includes('Too many')) {
          return null;
        }

        return event;
      },
    });

    initialized = true;
    info('Sentry error tracking initialized', {
      environment: process.env.NODE_ENV,
      tracesSampleRate: Sentry.getCurrentHub().getClient()?.getOptions().tracesSampleRate
    });

    return true;
  } catch (error) {
    warn('Failed to initialize Sentry', { error: error.message });
    return false;
  }
}

/**
 * Request handler middleware (must be first)
 */
export function sentryRequestHandler() {
  if (!initialized) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.requestHandler();
}

/**
 * Tracing middleware (after request handler)
 */
export function sentryTracingHandler() {
  if (!initialized) {
    return (req, res, next) => next();
  }
  return Sentry.Handlers.tracingHandler();
}

/**
 * Error handler middleware (must be after all routes)
 */
export function sentryErrorHandler() {
  if (!initialized) {
    return (err, req, res, next) => next(err);
  }
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all 5xx errors
      if (error.status >= 500) {
        return true;
      }
      // Don't capture 4xx errors (client errors)
      return false;
    }
  });
}

/**
 * Capture exception manually
 */
export function captureException(error, context = {}) {
  if (!initialized) {
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message manually
 */
export function captureMessage(message, level = 'info', context = {}) {
  if (!initialized) {
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb) {
  if (!initialized) {
    return;
  }

  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set user context
 */
export function setUser(user) {
  if (!initialized) {
    return;
  }

  Sentry.setUser(user ? {
    id: user.id,
    email: user.email,
    username: user.displayName || user.email,
  } : null);
}

/**
 * Check if Sentry is initialized
 */
export function isInitialized() {
  return initialized;
}

export default {
  initializeSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  isInitialized
};

