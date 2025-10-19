import { info } from '../utils/logger.mjs';

/**
 * Request Timing Middleware
 * Logs request duration and details
 */
export function requestTiming(req, res, next) {
  const start = Date.now();

  // Capture original end method
  const originalEnd = res.end;

  // Override end to log timing
  res.end = function endWithTiming(...args) {
    const duration = Date.now() - start;

    info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')?.substring(0, 100)
    });

    // Call original end
    return originalEnd.apply(res, args);
  };

  next();
}

export default requestTiming;

