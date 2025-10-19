import { pb } from '../services/pocketbaseClient.mjs';
import { HttpError } from '../utils/errors.mjs';
import { info, warn } from '../utils/logger.mjs';

/**
 * Authentication Middleware
 * Validates PocketBase user tokens and attaches user to request
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new HttpError(401, 'Authentication required'));
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    return next(new HttpError(401, 'Invalid authorization header format'));
  }

  try {
    // Validate token by loading auth store
    pb.authStore.save(token);

    // Verify the token is valid by making a request
    const authData = await pb.collection('users').authRefresh();

    if (!authData || !authData.record) {
      throw new Error('Invalid token');
    }

    // Attach user to request
    req.user = authData.record;

    info('User authenticated', {
      userId: req.user.id,
      email: req.user.email,
      path: req.path
    });

    next();
  } catch (error) {
    warn('Authentication failed', {
      error: error.message,
      path: req.path,
      ip: req.ip
    });

    // Clear invalid auth
    pb.authStore.clear();

    next(new HttpError(401, 'Invalid or expired token'));
  }
}

/**
 * Optional Auth Middleware
 * Attaches user if token is valid, but doesn't block if missing
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token) {
    return next();
  }

  try {
    pb.authStore.save(token);
    const authData = await pb.collection('users').authRefresh();

    if (authData && authData.record) {
      req.user = authData.record;
    }
  } catch (error) {
    // Silent fail for optional auth
    pb.authStore.clear();
  }

  next();
}

