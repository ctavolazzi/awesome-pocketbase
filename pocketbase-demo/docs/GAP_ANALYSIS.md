# Express API Server - Gap Analysis

**Date:** 2025-10-18
**Status:** Production Planning
**Related:** [Express Server Work Effort](../../work_efforts/00-09_project_management/01_work_efforts/00.06_express_api_server.md)

## Executive Summary

The Express API server is functionally complete with solid foundations in validation, error handling, logging, and testing. However, **it is not production-ready**. This document identifies critical gaps that must be addressed before deployment and provides prioritized recommendations.

## Priority Levels

- **P0 (Blocker):** Must be implemented before ANY deployment
- **P1 (Critical):** Required for production deployment
- **P2 (Important):** Should be implemented soon after launch
- **P3 (Nice to Have):** Future improvements

---

## Security Gaps

### P0: CORS Configuration (BLOCKING)

**Current State:** No CORS configuration

**Risk:** Frontend cannot make requests to API from different origin

**Impact:** Complete failure of frontend-backend communication

**Solution:**
```javascript
// server/index.mjs
import cors from 'cors';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:4173',
    'http://127.0.0.1:4173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

**Dependencies:**
- Install: `npm install cors`
- Environment: `ALLOWED_ORIGINS` variable

**Estimate:** 30 minutes

---

### P1: Request Authentication

**Current State:** Server uses admin auth, no per-request authentication

**Risk:** Anyone can create/update/delete posts if they reach the API

**Impact:** High - Data integrity, potential abuse

**Solution:**
```javascript
// server/middleware/auth.mjs
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new HttpError(401, 'Authentication required'));
  }

  try {
    // Validate token with PocketBase
    const user = await validateUserToken(token);
    req.user = user;
    next();
  } catch (err) {
    next(new HttpError(401, 'Invalid token'));
  }
}

// Apply to protected routes
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const created = await deps.createPost({
    ...req.body,
    author: req.user.id  // Use authenticated user
  });
  res.status(201).json(created);
}));
```

**Estimate:** 4 hours

---

### P1: Rate Limiting

**Current State:** No rate limiting

**Risk:** API abuse, DoS attacks, excessive load on PocketBase

**Impact:** High - Service availability, costs

**Solution:**
```javascript
// server/index.mjs
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 creates per minute
  message: 'Too many posts created, please slow down'
});

app.use('/api/', apiLimiter);
router.post('/', createLimiter, asyncHandler(...));
```

**Dependencies:**
- Install: `npm install express-rate-limit`

**Estimate:** 1 hour

---

### P1: Security Headers

**Current State:** No security headers configured

**Risk:** XSS, clickjacking, MIME sniffing attacks

**Impact:** Medium - Client-side security vulnerabilities

**Solution:**
```javascript
// server/index.mjs
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Dependencies:**
- Install: `npm install helmet`

**Estimate:** 1 hour

---

### P2: Input Sanitization

**Current State:** Basic validation only

**Risk:** XSS through user content, potential injection attacks

**Impact:** Medium - Could affect other users

**Solution:**
```javascript
// server/utils/sanitize.mjs
import DOMPurify from 'isomorphic-dompurify';

export function sanitizePost(data) {
  return {
    ...data,
    title: DOMPurify.sanitize(data.title, { ALLOWED_TAGS: [] }),
    content: DOMPurify.sanitize(data.content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
      ALLOWED_ATTR: ['href']
    })
  };
}
```

**Dependencies:**
- Install: `npm install isomorphic-dompurify`

**Estimate:** 2 hours

---

### P2: SQL Injection Protection

**Current State:** Relies on PocketBase SDK

**Risk:** Low (PocketBase SDK handles this), but not verified

**Impact:** High if vulnerable - Database compromise

**Action Required:**
1. Review PocketBase SDK security documentation
2. Audit all raw query usage (if any)
3. Add integration test with injection attempts
4. Document security posture

**Estimate:** 2 hours

---

## Configuration & Environment

### P0: Environment Variables Template

**Current State:** No `.env.example` file

**Risk:** Developers don't know what to configure

**Impact:** Deployment failures, misconfiguration

**Solution:**
```bash
# .env.example
# PocketBase Configuration
PB_BASE_URL=http://127.0.0.1:8090
PB_ADMIN_EMAIL=admin@example.com
PB_ADMIN_PASSWORD=your-secure-password-here

# Server Configuration
APP_PORT=3030
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:4173,http://127.0.0.1:4173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Estimate:** 15 minutes

---

### P1: Environment Validation

**Current State:** Server starts even with missing critical config

**Risk:** Runtime failures, confusing errors

**Impact:** Medium - Poor developer experience

**Solution:**
```javascript
// server/config.mjs
const required = ['PB_ADMIN_EMAIL', 'PB_ADMIN_PASSWORD'];

export function validateConfig() {
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please copy .env.example to .env and configure.'
    );
  }
}

// server/index.mjs
import { validateConfig } from './config.mjs';

export async function start() {
  validateConfig();
  await ensureAuth('server bootstrap');
  // ...
}
```

**Estimate:** 30 minutes

---

### P2: Configuration Documentation

**Current State:** No dedicated config docs

**Risk:** Confusion about settings, misconfiguration

**Solution:** Create `docs/CONFIGURATION.md` with all environment variables, defaults, and examples

**Estimate:** 1 hour

---

## Testing Gaps

### P1: Integration Tests with Live PocketBase

**Current State:** Tests mock PocketBase, never test real integration

**Risk:** Integration bugs not caught until production

**Impact:** High - Runtime failures

**Solution:**
```javascript
// server/tests/integration.test.mjs
import test from 'node:test';
import { start } from '../index.mjs';

test('POST /api/posts creates real record in PocketBase', async () => {
  const server = await start();

  const response = await fetch('http://localhost:3030/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Integration Test',
      content: 'Testing real creation',
      author: 'test-user-id'
    })
  });

  const data = await response.json();
  assert.equal(response.status, 201);
  assert.ok(data.id);

  // Cleanup
  await pb.collection('posts').delete(data.id);
  server.close();
});
```

**Estimate:** 4 hours

---

### P2: Error Scenario Coverage

**Current State:** Happy path tested, error scenarios incomplete

**Risk:** Poor error handling in edge cases

**Solution:**
- Test network failures
- Test PocketBase downtime
- Test invalid data edge cases
- Test rate limit scenarios
- Test auth failures

**Estimate:** 3 hours

---

### P3: Load Testing

**Current State:** No performance testing

**Risk:** Unknown performance characteristics

**Solution:** Add `k6` or `artillery` load tests

**Estimate:** 4 hours

---

## Deployment Infrastructure

### P1: Docker Configuration

**Current State:** No containerization

**Risk:** "Works on my machine" problems

**Solution:**
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server ./server
COPY public ./public

EXPOSE 3030

CMD ["node", "server/index.mjs"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  pocketbase:
    image: pocketbase/pocketbase:latest
    ports:
      - "8090:8090"
    volumes:
      - ./pb_data:/pb/pb_data

  api:
    build: .
    ports:
      - "3030:3030"
    environment:
      - PB_BASE_URL=http://pocketbase:8090
      - PB_ADMIN_EMAIL=${PB_ADMIN_EMAIL}
      - PB_ADMIN_PASSWORD=${PB_ADMIN_PASSWORD}
    depends_on:
      - pocketbase

  frontend:
    image: nginx:alpine
    ports:
      - "4173:80"
    volumes:
      - ./public:/usr/share/nginx/html
```

**Estimate:** 3 hours

---

### P2: Graceful Shutdown

**Current State:** Server stops abruptly on SIGTERM

**Risk:** In-flight requests fail, data corruption

**Solution:**
```javascript
// server/index.mjs
export async function start() {
  const app = createApp();
  const server = app.listen(PORT);

  async function shutdown(signal) {
    info(`Received ${signal}, starting graceful shutdown`);

    server.close(async () => {
      info('HTTP server closed');

      // Close PocketBase connection
      pb.authStore.clear();

      process.exit(0);
    });

    // Force shutdown after 30s
    setTimeout(() => {
      error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}
```

**Estimate:** 1 hour

---

### P2: Health Check Enhancement

**Current State:** Basic health endpoint, doesn't check dependencies

**Risk:** Load balancer routes traffic to unhealthy instances

**Solution:**
```javascript
// server/routes/health.mjs
export async function healthCheck(req, res) {
  const checks = {
    server: 'ok',
    pocketbase: 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    await pb.health.check();
    checks.pocketbase = 'ok';
  } catch (err) {
    checks.pocketbase = 'error';
    return res.status(503).json(checks);
  }

  res.json(checks);
}
```

**Estimate:** 30 minutes

---

## Monitoring & Observability

### P2: Request Timing Middleware

**Current State:** No performance metrics

**Risk:** Can't identify slow endpoints

**Solution:**
```javascript
// server/middleware/timing.mjs
export function requestTiming(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
}
```

**Estimate:** 30 minutes

---

### P3: Structured Metrics Export

**Current State:** Logs only

**Risk:** Can't build dashboards or alerts

**Solution:** Add Prometheus metrics endpoint

**Estimate:** 4 hours

---

### P3: Error Tracking Integration

**Current State:** Errors only in logs

**Risk:** Errors go unnoticed

**Solution:** Integrate Sentry or similar

**Estimate:** 2 hours

---

## Documentation Gaps

### P1: API Documentation

**Current State:** No formal API docs

**Risk:** Frontend developers guess at API contract

**Solution:** Add OpenAPI/Swagger specification

**Estimate:** 3 hours

---

### P2: Architecture Diagrams

**Current State:** Text descriptions only

**Risk:** Harder to onboard new developers

**Solution:** Create architecture diagrams showing:
- Request flow
- Authentication flow
- Error handling flow
- Deployment architecture

**Estimate:** 2 hours

---

## Frontend Integration Plan

### Current Architecture
```
Frontend ──────> PocketBase SDK ──────> PocketBase
```

### Target Architecture (Hybrid)
```
Frontend ──POST/PATCH──> Express API ──> PocketBase Client ──> PocketBase
Frontend ──GET/Subscribe──> PocketBase SDK ──────> PocketBase
```

### Integration Steps

#### Step 1: Create API Client Service (P0)
```javascript
// public/services/api.service.js
class ApiService {
  constructor(baseUrl = 'http://127.0.0.1:3030') {
    this.baseUrl = baseUrl;
  }

  async createPost(postData) {
    const response = await fetch(`${this.baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pb.authStore.token}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create post');
    }

    return response.json();
  }

  async updatePost(id, updates) {
    const response = await fetch(`${this.baseUrl}/api/posts/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pb.authStore.token}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update post');
    }

    return response.json();
  }
}

export const apiService = new ApiService();
```

**Estimate:** 2 hours

---

#### Step 2: Update Composer Component (P0)
```javascript
// public/components/composer.js
import { apiService } from '../services/api.service.js';

async handleSubmit(data) {
  try {
    // Use Express API instead of direct PocketBase
    const created = await apiService.createPost(data);

    // Rest of optimistic UI logic remains the same
    this.onSuccess(created);
  } catch (error) {
    this.onError(error);
  }
}
```

**Estimate:** 1 hour

---

#### Step 3: Maintain Realtime (P0)
```javascript
// public/app.js
// Keep existing PocketBase realtime subscriptions
pb.collection('posts').subscribe('*', (e) => {
  // Existing realtime logic unchanged
});
```

**Estimate:** No changes needed

---

#### Step 4: Error Handling Enhancement (P1)
```javascript
// public/services/api.service.js
async createPost(postData) {
  try {
    const response = await fetch(`${this.baseUrl}/api/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pb.authStore.token}`
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const error = await response.json();

      // Handle validation errors with field-level details
      if (error.details?.issues) {
        throw new ValidationError(error.message, error.details.issues);
      }

      throw new ApiError(error.message, response.status);
    }

    return response.json();
  } catch (error) {
    if (error.name === 'TypeError' && !navigator.onLine) {
      throw new NetworkError('No internet connection');
    }
    throw error;
  }
}
```

**Estimate:** 2 hours

---

## Summary of Critical Path

### Before ANY Deployment (P0)
1. ✅ Add CORS configuration (30 min)
2. ✅ Create `.env.example` (15 min)
3. ✅ Create API client service (2 hours)
4. ✅ Update composer to use Express API (1 hour)

**Total:** ~4 hours

---

### Before Production (P1)
1. ✅ Add request authentication (4 hours)
2. ✅ Add rate limiting (1 hour)
3. ✅ Add security headers (1 hour)
4. ✅ Add environment validation (30 min)
5. ✅ Add integration tests (4 hours)
6. ✅ Create Docker setup (3 hours)
7. ✅ Add API documentation (3 hours)

**Total:** ~17 hours

---

### Post-Launch Improvements (P2)
1. Input sanitization (2 hours)
2. SQL injection audit (2 hours)
3. Graceful shutdown (1 hour)
4. Enhanced health checks (30 min)
5. Request timing (30 min)
6. Error scenarios testing (3 hours)
7. Configuration docs (1 hour)
8. Architecture diagrams (2 hours)

**Total:** ~12 hours

---

## Recommendations

### Immediate Actions (This Session)
1. Add CORS configuration
2. Create `.env.example`
3. Test server with live PocketBase
4. Document integration strategy

### Next Session
1. Implement request authentication
2. Add rate limiting and security headers
3. Create API client service
4. Update frontend to use Express API

### Within 1 Week
1. Complete all P1 items
2. Docker containerization
3. Integration testing
4. API documentation

### Within 1 Month
1. Complete all P2 items
2. Load testing
3. Monitoring setup
4. Production deployment

---

## Risk Assessment

| Category | Current Risk | With P0/P1 Complete | Notes |
|----------|--------------|---------------------|-------|
| Security | **HIGH** | MEDIUM | Auth required for production |
| Stability | MEDIUM | LOW | Integration tests critical |
| Performance | UNKNOWN | KNOWN | Load testing needed |
| Operations | HIGH | MEDIUM | Monitoring needed |
| Developer Experience | MEDIUM | LOW | Documentation helps |

---

## Last Updated
2025-10-18 20:53

