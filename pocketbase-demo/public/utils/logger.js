/**
 * Centralized Logger Utility
 * Provides consistent logging across console, toast notifications, and persistent storage
 *
 * Features:
 * - Console logging with severity levels
 * - Toast notifications for user feedback
 * - Persistent error logs in database
 * - Automatic cleanup of old logs
 * - Stack trace capture
 * - Context information
 */

import { showToast } from '../components/toast.js';

/**
 * Log severity levels
 */
export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal',
};

/**
 * Logger configuration
 */
const config = {
  enableConsole: true,
  enableToast: true,
  enablePersistence: true,
  minConsoleLevel: LogLevel.DEBUG,
  minToastLevel: LogLevel.ERROR,
  minPersistLevel: LogLevel.WARN,
};

/**
 * Queue for storing logs before persistence service is ready
 */
let logQueue = [];
let errorLogService = null;

/**
 * Initialize logger with error log service
 * @param {ErrorLogService} service - Error log service instance
 */
export function initLogger(service) {
  errorLogService = service;

  // Flush queued logs
  if (logQueue.length > 0) {
    console.log(`[Logger] Flushing ${logQueue.length} queued logs`);
    logQueue.forEach(log => persistLog(log));
    logQueue = [];
  }
}

/**
 * Main logging function
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 * @param {Error} error - Optional error object
 */
function log(level, message, context = {}, error = null) {
  const timestamp = new Date().toISOString();

  const logEntry = {
    timestamp,
    level,
    message,
    context: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context,
    },
    stack: error?.stack || new Error().stack,
    error: error ? {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
    } : null,
  };

  // Console logging
  if (config.enableConsole && shouldLog(level, config.minConsoleLevel)) {
    logToConsole(logEntry);
  }

  // Toast notification
  if (config.enableToast && shouldLog(level, config.minToastLevel)) {
    logToToast(logEntry);
  }

  // Persistent storage
  if (config.enablePersistence && shouldLog(level, config.minPersistLevel)) {
    persistLog(logEntry);
  }

  return logEntry;
}

/**
 * Check if log level should be logged based on minimum level
 */
function shouldLog(level, minLevel) {
  const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
  return levels.indexOf(level) >= levels.indexOf(minLevel);
}

/**
 * Log to browser console with color coding
 */
function logToConsole(entry) {
  const colors = {
    debug: 'color: #888',
    info: 'color: #0088ff',
    warn: 'color: #ff8800',
    error: 'color: #ff0000',
    fatal: 'color: #ff0000; font-weight: bold',
  };

  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const style = colors[entry.level] || '';

  console.log(`%c${prefix} ${entry.message}`, style);

  if (entry.context && Object.keys(entry.context).length > 0) {
    console.log('Context:', entry.context);
  }

  if (entry.error) {
    console.error('Error details:', entry.error);
  }

  if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
    console.trace('Stack trace:');
  }
}

/**
 * Show toast notification
 */
function logToToast(entry) {
  const icons = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    fatal: '💀',
  };

  const icon = icons[entry.level] || '📝';
  const message = `${icon} ${entry.message}`;

  showToast(message, entry.level);
}

/**
 * Persist log to database
 */
async function persistLog(entry) {
  if (!errorLogService) {
    // Queue log if service not ready
    logQueue.push(entry);
    return;
  }

  try {
    await errorLogService.createLog(entry);
  } catch (error) {
    // Don't recursively log persistence errors, just console
    console.error('[Logger] Failed to persist log:', error);
  }
}

/**
 * Public API - Debug level
 */
export function debug(message, context = {}) {
  return log(LogLevel.DEBUG, message, context);
}

/**
 * Public API - Info level
 */
export function info(message, context = {}) {
  return log(LogLevel.INFO, message, context);
}

/**
 * Public API - Warning level
 */
export function warn(message, context = {}, error = null) {
  return log(LogLevel.WARN, message, context, error);
}

/**
 * Public API - Error level
 */
export function error(message, context = {}, error = null) {
  return log(LogLevel.ERROR, message, context, error);
}

/**
 * Public API - Fatal level
 */
export function fatal(message, context = {}, error = null) {
  return log(LogLevel.FATAL, message, context, error);
}

/**
 * Update logger configuration
 */
export function configure(updates) {
  Object.assign(config, updates);
}

/**
 * Get current configuration
 */
export function getConfig() {
  return { ...config };
}

/**
 * Format error for logging
 * @param {Error} err - Error object
 * @returns {Object} Formatted error
 */
export function formatError(err) {
  if (!err) return null;

  return {
    name: err.name || 'Error',
    message: err.message || 'Unknown error',
    code: err.code,
    status: err.status,
    stack: err.stack,
    data: err.response?.data || err.data,
  };
}

/**
 * Wrap async function with error logging
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context description
 * @returns {Function} Wrapped function
 */
export function withErrorLogging(fn, context) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      error(`Error in ${context}`, { args }, err);
      throw err;
    }
  };
}

// Global error handler
window.addEventListener('error', (event) => {
  error('Uncaught error', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  }, event.error);
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  error('Unhandled promise rejection', {
    reason: event.reason,
  }, event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
});

export default {
  debug,
  info,
  warn,
  error,
  fatal,
  configure,
  getConfig,
  initLogger,
  formatError,
  withErrorLogging,
  LogLevel,
};

