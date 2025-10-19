import { pb } from '../services/pocketbaseClient.mjs';
import { warn } from '../utils/logger.mjs';

/**
 * Enhanced health check endpoint
 * Checks server and PocketBase connectivity
 */
export async function healthCheck(req, res) {
  const checks = {
    server: 'ok',
    pocketbase: 'unknown',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  };

  try {
    // Check PocketBase health
    await pb.health.check();
    checks.pocketbase = 'ok';

    res.json(checks);
  } catch (error) {
    checks.pocketbase = 'error';
    checks.error = error.message;

    warn('PocketBase health check failed', { error: error.message });

    res.status(503).json(checks);
  }
}

export default healthCheck;

