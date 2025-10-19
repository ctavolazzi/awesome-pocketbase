/**
 * Minimal structured logger for the server side.
 * Provides leveled logging with timestamps and contextual metadata.
 */

const LEVELS = ['debug', 'info', 'warn', 'error'];

function formatMessage(level, message, context) {
  const timestamp = new Date().toISOString();
  const meta = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${meta}`;
}

export function log(level, message, context) {
  if (!LEVELS.includes(level)) {
    throw new Error(`Unknown log level "${level}"`);
  }

  const line = formatMessage(level, message, context);

  switch (level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    case 'info':
      console.info(line);
      break;
    default:
      console.log(line);
      break;
  }
}

export const debug = (msg, ctx) => log('debug', msg, ctx);
export const info = (msg, ctx) => log('info', msg, ctx);
export const warn = (msg, ctx) => log('warn', msg, ctx);
export const error = (msg, ctx) => log('error', msg, ctx);
