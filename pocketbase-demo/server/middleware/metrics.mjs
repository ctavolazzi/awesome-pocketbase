import promClient from 'prom-client';
import { info } from '../utils/logger.mjs';

// Create a Registry
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestErrors = new promClient.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new promClient.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections'
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);
register.registerMetric(activeConnections);

/**
 * Prometheus metrics middleware
 */
export function metricsMiddleware(req, res, next) {
  // Skip metrics endpoint itself
  if (req.path === '/metrics') {
    return next();
  }

  const start = Date.now();
  activeConnections.inc();

  // Capture original end method
  const originalEnd = res.end;

  res.end = function endWithMetrics(...args) {
    const duration = (Date.now() - start) / 1000; // Convert to seconds

    // Normalize route for metrics (replace IDs with :id)
    const route = normalizeRoute(req.path);

    const labels = {
      method: req.method,
      route: route,
      status_code: res.statusCode
    };

    // Record metrics
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);

    // Track errors (4xx and 5xx)
    if (res.statusCode >= 400) {
      httpRequestErrors.inc(labels);
    }

    activeConnections.dec();

    // Call original end
    return originalEnd.apply(res, args);
  };

  next();
}

/**
 * Normalize route by replacing IDs with :id placeholder
 */
function normalizeRoute(path) {
  // Replace UUIDs and IDs with :id
  return path
    .replace(/\/[a-f0-9]{15,}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
}

/**
 * Metrics endpoint handler
 */
export async function metricsEndpoint(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error.message);
  }
}

/**
 * Initialize metrics collection
 */
export function initializeMetrics() {
  info('Prometheus metrics initialized', {
    endpoint: '/metrics',
    defaultMetrics: true
  });
}

export { register };
export default {
  metricsMiddleware,
  metricsEndpoint,
  initializeMetrics,
  register
};

