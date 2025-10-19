# Configuration Guide

This document describes all environment variables and configuration options for the Express API server.

## Environment Variables

Configuration is managed through environment variables. Copy `env.template` to `.env` and customize as needed:

```bash
cp env.template .env
```

### Required Variables

These variables **must** be set for the server to start:

| Variable | Description | Example |
|----------|-------------|---------|
| `PB_ADMIN_EMAIL` | PocketBase admin email | `admin@example.com` |
| `PB_ADMIN_PASSWORD` | PocketBase admin password | `SecurePassword123!` |

**Important:** The server will fail to start with a clear error message if these are missing.

### PocketBase Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PB_BASE_URL` | No | `http://127.0.0.1:8090` | PocketBase server URL |
| `PB_ADMIN_EMAIL` | **Yes** | - | Admin email for authentication |
| `PB_ADMIN_PASSWORD` | **Yes** | - | Admin password for authentication |

**Notes:**
- The admin credentials are used for server-side operations
- User authentication is handled via Bearer tokens in requests
- In Docker, use `http://pocketbase:8090` for the base URL

### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_PORT` | No | `3030` | Port for Express server to listen on |
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, or `test` |

**Notes:**
- In production, set `NODE_ENV=production`
- The port must not conflict with other services (PocketBase uses 8090)

### CORS Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ALLOWED_ORIGINS` | No | `http://localhost:4173,http://127.0.0.1:4173` | Comma-separated list of allowed origins |

**Example:**
```bash
ALLOWED_ORIGINS=https://myapp.com,https://www.myapp.com,http://localhost:3000
```

**Notes:**
- Controls which domains can make requests to the API
- Include all frontend URLs (production and development)
- No trailing slashes
- Wildcards are not supported for security

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | No | `900000` (15 min) | Time window for rate limiting in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window per IP |
| `CREATE_RATE_LIMIT_MAX` | No | `10` | Max post creations per minute per IP |

**Notes:**
- General rate limit applies to all `/api/*` endpoints
- Create rate limit specifically applies to `POST /api/posts`
- Rate limits are per IP address
- Requests exceeding limits receive HTTP 429 status

**Examples:**
```bash
# Strict limits for production
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
CREATE_RATE_LIMIT_MAX=5

# Relaxed limits for development
RATE_LIMIT_WINDOW_MS=60000   # 1 minute
RATE_LIMIT_MAX_REQUESTS=1000
CREATE_RATE_LIMIT_MAX=50
```

### Monitoring & Observability

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_METRICS` | No | `false` | Enable Prometheus metrics at `/metrics` |
| `SENTRY_DSN` | No | (empty) | Sentry DSN for error tracking |
| `SENTRY_TRACES_SAMPLE_RATE` | No | `0.1` | Percentage of transactions to trace (0.0-1.0) |
| `SENTRY_PROFILES_SAMPLE_RATE` | No | `0.1` | Percentage of profiles to collect (0.0-1.0) |

**Notes:**
- Metrics are disabled by default; set `ENABLE_METRICS=true` to enable
- Sentry is optional; only initializes if `SENTRY_DSN` is provided
- Sample rates control performance overhead vs. visibility

**Examples:**
```bash
# Development: minimal monitoring
ENABLE_METRICS=false
SENTRY_DSN=

# Production: full monitoring
ENABLE_METRICS=true
SENTRY_DSN=https://abc123@o123.ingest.sentry.io/456
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.05
```

## Configuration File Structure

### Local Development (.env)

```bash
# Required
PB_ADMIN_EMAIL=admin@localhost.com
PB_ADMIN_PASSWORD=DevPassword123!

# Optional (with good defaults)
PB_BASE_URL=http://127.0.0.1:8090
APP_PORT=3030
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:4173,http://127.0.0.1:4173
```

### Docker Deployment

Docker Compose uses environment variables from `.env` file:

```bash
# .env for Docker
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=ProductionPassword123!
NODE_ENV=production
ENABLE_METRICS=true
```

In `docker-compose.yml`, services use these variables:

```yaml
api:
  environment:
    - PB_BASE_URL=http://pocketbase:8090  # Docker network name
    - PB_ADMIN_EMAIL=${PB_ADMIN_EMAIL}
    - PB_ADMIN_PASSWORD=${PB_ADMIN_PASSWORD}
    - NODE_ENV=${NODE_ENV:-production}
```

### Production Deployment

For production:

1. **Use strong credentials:**
   ```bash
   PB_ADMIN_PASSWORD=$(openssl rand -base64 32)
   ```

2. **Enable monitoring:**
   ```bash
   ENABLE_METRICS=true
   SENTRY_DSN=your-sentry-dsn
   ```

3. **Restrict CORS:**
   ```bash
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

4. **Set production mode:**
   ```bash
   NODE_ENV=production
   ```

## Validation

The server validates configuration on startup:

```javascript
// Automatically runs before server starts
validateConfig();
```

**Validation checks:**
- Required variables are present
- Provides helpful error messages
- Points to `env.template` for reference

**Example error:**
```
Error: Missing required environment variables: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD

Please copy env.template to .env and configure the required values:
  cp env.template .env

Then edit .env with your PocketBase admin credentials.
```

## Configuration API

The `config.mjs` module exports:

```javascript
import { validateConfig, getConfig } from './config.mjs';

// Validate on startup
validateConfig();

// Get typed configuration object
const config = getConfig();
console.log(config.appPort); // 3030
console.log(config.isProduction); // false
```

**getConfig() returns:**
```typescript
{
  // Required
  pbAdminEmail: string;
  pbAdminPassword: string;

  // Optional
  pbBaseUrl: string;
  appPort: number;
  nodeEnv: string;
  allowedOrigins: string[];
  rateLimitWindow: number;
  rateLimitMax: number;
  createRateLimitMax: number;
  sentryDsn: string;
  enableMetrics: boolean;

  // Derived
  isProduction: boolean;
  isDevelopment: boolean;
}
```

## Troubleshooting

### Server Won't Start

**Problem:** Missing required environment variables

**Solution:** Check error message and update `.env`:
```bash
cp env.template .env
# Edit .env with your values
```

### CORS Errors in Browser

**Problem:** Frontend can't connect to API

**Solution:** Add frontend URL to `ALLOWED_ORIGINS`:
```bash
ALLOWED_ORIGINS=http://localhost:4173,http://localhost:3000
```

### Rate Limit Errors

**Problem:** Getting 429 errors during development

**Solution:** Increase rate limits temporarily:
```bash
RATE_LIMIT_MAX_REQUESTS=1000
CREATE_RATE_LIMIT_MAX=50
```

### Metrics Not Available

**Problem:** `/metrics` endpoint returns 404

**Solution:** Enable metrics:
```bash
ENABLE_METRICS=true
```

### Sentry Not Capturing Errors

**Problem:** Errors not showing in Sentry

**Solution:** Verify DSN is correct:
```bash
# Get DSN from Sentry project settings
SENTRY_DSN=https://your-key@o123.ingest.sentry.io/456
```

## Best Practices

1. **Never commit `.env` files** - Use `env.template` for examples
2. **Use different credentials per environment** - Dev, staging, and production should have separate credentials
3. **Rotate credentials regularly** - Especially in production
4. **Use strong passwords** - Generate with `openssl rand -base64 32`
5. **Monitor your rate limits** - Adjust based on actual usage patterns
6. **Start with low sample rates** - For Sentry, start with 10% and adjust based on costs
7. **Document custom values** - If you change defaults, document why

## Environment Templates

### Minimal Development
```bash
PB_ADMIN_EMAIL=dev@localhost.com
PB_ADMIN_PASSWORD=DevPassword123!
```

### Full Development
```bash
PB_ADMIN_EMAIL=dev@localhost.com
PB_ADMIN_PASSWORD=DevPassword123!
PB_BASE_URL=http://127.0.0.1:8090
APP_PORT=3030
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:4173,http://localhost:3000
RATE_LIMIT_MAX_REQUESTS=1000
CREATE_RATE_LIMIT_MAX=50
ENABLE_METRICS=true
```

### Production
```bash
PB_ADMIN_EMAIL=admin@yourdomain.com
PB_ADMIN_PASSWORD=<strong-generated-password>
PB_BASE_URL=http://pocketbase:8090
APP_PORT=3030
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CREATE_RATE_LIMIT_MAX=10
ENABLE_METRICS=true
SENTRY_DSN=https://your-key@sentry.io/project
SENTRY_TRACES_SAMPLE_RATE=0.1
```

## Related Documentation

- [Security Guide](./SECURITY.md) - Security configuration and best practices
- [Architecture](./ARCHITECTURE.md) - System architecture and design
- [Deployment](../DEPLOYMENT.md) - Deployment guides

