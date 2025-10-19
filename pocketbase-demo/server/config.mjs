/**
 * Configuration and Environment Validation
 */

const REQUIRED_ENV_VARS = [
  'PB_ADMIN_EMAIL',
  'PB_ADMIN_PASSWORD'
];

const OPTIONAL_ENV_VARS = {
  PB_BASE_URL: 'http://127.0.0.1:8090',
  APP_PORT: '3030',
  NODE_ENV: 'development',
  ALLOWED_ORIGINS: 'http://localhost:4173,http://127.0.0.1:4173',
  RATE_LIMIT_WINDOW_MS: '900000',
  RATE_LIMIT_MAX_REQUESTS: '100',
  CREATE_RATE_LIMIT_MAX: '10',
  SENTRY_DSN: '',
  ENABLE_METRICS: 'false'
};

/**
 * Validate that all required environment variables are present
 * @throws {Error} If any required variables are missing
 */
export function validateConfig() {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n\n` +
      'Please copy env.template to .env and configure the required values:\n' +
      '  cp env.template .env\n\n' +
      'Then edit .env with your PocketBase admin credentials.'
    );
  }
}

/**
 * Get configuration with defaults
 */
export function getConfig() {
  return {
    // Required (validated at startup)
    pbAdminEmail: process.env.PB_ADMIN_EMAIL,
    pbAdminPassword: process.env.PB_ADMIN_PASSWORD,

    // Optional (with defaults)
    pbBaseUrl: process.env.PB_BASE_URL || OPTIONAL_ENV_VARS.PB_BASE_URL,
    appPort: Number.parseInt(process.env.APP_PORT || OPTIONAL_ENV_VARS.APP_PORT, 10),
    nodeEnv: process.env.NODE_ENV || OPTIONAL_ENV_VARS.NODE_ENV,
    allowedOrigins: (process.env.ALLOWED_ORIGINS || OPTIONAL_ENV_VARS.ALLOWED_ORIGINS).split(','),
    rateLimitWindow: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || OPTIONAL_ENV_VARS.RATE_LIMIT_WINDOW_MS, 10),
    rateLimitMax: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || OPTIONAL_ENV_VARS.RATE_LIMIT_MAX_REQUESTS, 10),
    createRateLimitMax: Number.parseInt(process.env.CREATE_RATE_LIMIT_MAX || OPTIONAL_ENV_VARS.CREATE_RATE_LIMIT_MAX, 10),
    sentryDsn: process.env.SENTRY_DSN || OPTIONAL_ENV_VARS.SENTRY_DSN,
    enableMetrics: process.env.ENABLE_METRICS === 'true',

    // Derived
    isProduction: (process.env.NODE_ENV || OPTIONAL_ENV_VARS.NODE_ENV) === 'production',
    isDevelopment: (process.env.NODE_ENV || OPTIONAL_ENV_VARS.NODE_ENV) === 'development',
  };
}

export default {
  validateConfig,
  getConfig
};

