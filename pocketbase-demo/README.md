# PocketBase Demo

End-to-end sandbox that ships a PocketBase binary, seeded collections, Node.js automation scripts, and a lightweight browser UI for exercising CRUD, realtime, and authentication flows.

## Quick Start

1. **Install dependencies** (first run only):
   ```bash
   npm install
   ```
2. **Start PocketBase** (foreground):
   ```bash
   npm run serve
   ```
   The server exposes:
   - REST API: http://127.0.0.1:8090/api/
   - Admin dashboard: http://127.0.0.1:8090/_/
3. **Create an admin account** (browser): open `http://127.0.0.1:8090/_/#/pb_instal` or run
   ```bash
   ./pocketbase superuser upsert YOUR_EMAIL@example.com YOUR_PASSWORD
   ```
4. **Provision demo data** (collections, rules, sample records):
   ```bash
   PB_ADMIN_EMAIL=YOUR_EMAIL@example.com \
   PB_ADMIN_PASSWORD=YOUR_PASSWORD \
   npm run setup
   ```

> The default scripts fall back to `porchroot@gmail.com` / `AdminPassword69!` for local automation. Override them with `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` in your shell to match the admin account you created.

## Version Compatibility

This demo is designed for **PocketBase 0.30.4+** and requires **PocketBase JS SDK 0.26.2+**.

**Important API Changes in PocketBase 0.30.4:**
- Collection `schema` field renamed to `fields`
- Field options (like `collectionId`, `values`, `maxSelect`) moved from nested `options` object to field level
- Automatic `created`/`updated` timestamp fields no longer present by default
- Admin authentication endpoint and initial setup process updated

The setup script (`setup.mjs`) handles these API differences automatically and is compatible with both older and newer PocketBase versions.

**Tested with:**
- PocketBase Server: 0.30.4
- PocketBase JS SDK: 0.26.2
- Node.js: 18.x+

## Collections & Rules

`npm run setup` ensures the following model:

- **users** (auth) – adds `displayName` & `bio` profile fields, requires auth to update/delete `self`. Seeds demo/content editor accounts plus `Ollama Bot` and four themed AI personas.
- **categories** (base) – public read, authenticated create/update/delete for lightweight topic tagging.
- **posts** (base) – public read, authenticated create, author-restricted update/delete, relations to `users` and `categories`, plus an `aiGenerated` flag to highlight model-created content.
- **comments** (base) – public read, authenticated create, author-restricted update/delete, cascades on post deletion.

Sample records include two demo users, three categories, spotlight posts, and a starter comment.

## Express API Server (Production-Ready)

A production-ready Express API server provides validated, secure access to PocketBase with comprehensive features:

### Starting the API Server

```bash
# Start PocketBase first
npm run serve

# In another terminal, start Express API
npm run server
```

The Express API runs on **http://localhost:3030** and provides:
- **RESTful API** - `/api/posts` endpoints
- **API Documentation** - Interactive docs at `/api-docs`
- **Health Checks** - `/healthz` and `/health` endpoints
- **Metrics** - `/metrics` endpoint (if enabled)

### Key Features

✅ **Authentication** - Bearer token validation via PocketBase
✅ **Input Sanitization** - XSS protection with DOMPurify
✅ **Request Validation** - Zod schema validation
✅ **Rate Limiting** - Protection against abuse and DoS
✅ **Security Headers** - Helmet.js with CORS configuration
✅ **Error Tracking** - Optional Sentry integration
✅ **Monitoring** - Optional Prometheus metrics
✅ **API Documentation** - Interactive Swagger UI
✅ **Graceful Shutdown** - Clean process termination

### API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/healthz` | GET | No | Health check with PocketBase connectivity |
| `/api-docs` | GET | No | Interactive API documentation |
| `/metrics` | GET | No | Prometheus metrics (if enabled) |
| `/api/posts` | GET | No | List posts with pagination |
| `/api/posts/:id` | GET | No | Get single post |
| `/api/posts` | POST | **Yes** | Create new post |
| `/api/posts/:id` | PATCH | **Yes** | Update post |

### Configuration

Copy `env.template` to `.env` and configure:

```bash
cp env.template .env
```

**Required:**
- `PB_ADMIN_EMAIL` - PocketBase admin email
- `PB_ADMIN_PASSWORD` - PocketBase admin password

**Optional:**
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per 15 minutes
- `ENABLE_METRICS` - Enable Prometheus metrics (`true`/`false`)
- `SENTRY_DSN` - Sentry error tracking DSN

See [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) for complete configuration guide.

### Security Features

The Express API implements multiple security layers:

1. **Authentication** - All mutations require valid Bearer tokens
2. **Rate Limiting** - 100 requests/15min per IP, 10 posts/min creation limit
3. **Input Sanitization** - All HTML is sanitized before storage
4. **CORS Protection** - Only configured origins can access the API
5. **Security Headers** - Helmet.js protection against common attacks
6. **SQL Injection Protection** - PocketBase SDK uses prepared statements

See [docs/SECURITY.md](./docs/SECURITY.md) for detailed security documentation.

## Automation Scripts

Each script accepts optional environment overrides for `PB_BASE_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, `PB_USER_EMAIL`, and `PB_USER_PASSWORD`.

### Demo & Setup Scripts

| Command | Description |
| ------- | ----------- |
| `npm run setup` | Authenticates as an admin, creates/updates collections, and seeds demo data. |
| `npm run crud` | Walks through create, read (filter + pagination), update, delete, and error handling for the `posts` collection. |
| `npm run realtime` | Signs in as a demo user, subscribes to `posts` and `comments`, triggers lifecycle events, and showcases unsubscribe handling. |
| `npm run auth` | Registers a new user, demonstrates login, token refresh, profile updates, password reset requests, and logout guards. |
| `npm run ollama` | Drives the `Ollama Bot` user to generate short-form posts by calling the local Ollama REST API on an interval. |
| `npm start` | Original read-only example that lists posts via the JS SDK. |
| `npm run serve` | Convenience wrapper for `./pocketbase serve --http=127.0.0.1:8090`. |
| `npm run server` | Start the Express API server on port 3030. |

### Testing Scripts

| Command | Description |
| ------- | ----------- |
| `npm test` | Run all tests (validation suite). |
| `npm run test:server` | Run Express API unit tests. |
| `npm run test:integration` | Run integration tests with live PocketBase. |
| `npm run test:errors` | Run error scenario tests. |
| `npm run test:load` | Run k6 load tests (requires k6 installed). |
| `npm run test:stress` | Run k6 stress tests. |
| `npm run verify` | Quick health check of the entire system. |

### Docker Scripts

| Command | Description |
| ------- | ----------- |
| `npm run docker:build` | Build Docker images. |
| `npm run docker:up` | Start all services in Docker. |
| `npm run docker:down` | Stop all Docker services. |
| `npm run docker:logs` | View Docker logs (follow mode). |

### Documentation Scripts

| Command | Description |
| ------- | ----------- |
| `npm run docs:api` | Instructions for viewing API documentation. |

## Browser Walkthrough (`public/`)

A minimal single-page interface showcases realtime CRUD with visual feedback:

1. Serve the static assets (from `pocketbase-demo/`):
   ```bash
   python3 -m http.server 4173
   # or: npx serve public
   ```
2. Visit `http://127.0.0.1:4173/public/`.
3. Use the **Account** sidebar to register/sign in. Demo credentials: `demo@pocketbase.dev` / `PocketBaseDemo42`.
4. Publish updates from the composer. Infinite scroll loads 20 posts per page and shows an end-of-feed badge when you reach the beginning.
5. Stay near the top to see realtime inserts instantly; if you are browsing older posts a sticky “↑ X new posts” banner appears so you can jump back.
6. Run `npm run ollama` in another terminal to let the rotating AI personas drip fresh content into the feed.

The UI loads the PocketBase SDK directly from `../node_modules/pocketbase/dist/pocketbase.umd.js`, so host the repo root when serving locally.

## API Reference Cheatsheet

- Health check – `GET /api/health`
- Posts – `GET /api/collections/posts/records`
- Comments – `GET /api/collections/comments/records`
- Auth login – `POST /api/collections/users/auth-with-password`
- Admin login – `POST /api/admins/auth-with-password`

Additional examples and REST payloads live in [`FEATURES.md`](./FEATURES.md).

## Testing & Validation

### Unit Tests

Run Express API unit tests:

```bash
npm run test:server
```

Tests cover:
- Route handlers
- Validation logic
- Error handling
- Service layer

### Integration Tests

Run integration tests with live PocketBase:

```bash
# Ensure PocketBase is running first
npm run serve

# In another terminal
npm run test:integration
```

Integration tests verify:
- Authentication flows
- CRUD operations via API
- Input sanitization
- Rate limiting
- Error responses

### Load Testing

Performance testing with k6 (requires k6 installed):

```bash
# Install k6
brew install k6  # macOS
# or see https://k6.io/docs/getting-started/installation/

# Run load tests
npm run test:load

# Run stress tests
npm run test:stress
```

See [docs/LOAD_TESTING.md](./docs/LOAD_TESTING.md) for detailed load testing guide.

### Quick Verification

For a rapid health check of the entire system:

```bash
# Human-readable output
npm run verify

# JSON output (for CI/CD)
npm run verify:json
```

The verification suite checks:
- Server connectivity
- Admin authentication
- Collection schemas
- CRUD operations
- Pagination and filtering
- Relations and expand
- User authentication
- Sample data presence

## Deployment

### Docker Deployment (Recommended)

The easiest way to deploy the full stack:

```bash
# 1. Create .env file with production credentials
cp env.template .env
# Edit .env with your production values

# 2. Build and start all services
npm run docker:up

# 3. View logs
npm run docker:logs

# 4. Stop services
npm run docker:down
```

The Docker stack includes:
- **PocketBase** - Database backend (port 8090)
- **Express API** - REST API server (port 3030)
- **Frontend** - Nginx serving static files (port 4173)

All services include health checks and auto-restart policies.

### Production Checklist

Before deploying to production:

- [ ] Set strong `PB_ADMIN_PASSWORD` (use `openssl rand -base64 32`)
- [ ] Configure `ALLOWED_ORIGINS` for your domain
- [ ] Set `NODE_ENV=production`
- [ ] Enable metrics: `ENABLE_METRICS=true`
- [ ] Configure Sentry DSN for error tracking (optional)
- [ ] Set up SSL/HTTPS via reverse proxy
- [ ] Configure backup strategy for `pb_data/`
- [ ] Review rate limits for your traffic

See [docs/CONFIGURATION.md](./docs/CONFIGURATION.md) for detailed configuration guide.

### Other Deployment Options

See [DEPLOYMENT.md](./DEPLOYMENT.md) for guides covering:

- **Fly.io** - Free tier hosting with automatic SSL
- **Railway** - One-click deployment from GitHub
- **DigitalOcean** - Traditional VPS setup
- **Kubernetes** - Production orchestration
- **Backup strategies** - Data protection and recovery

## Troubleshooting

- **403 or EPERM when scripts run:** expose `PB_BASE_URL` explicitly (for example `export PB_BASE_URL=http://127.0.0.1:8090`). Some sandboxes restrict loopback without elevated privileges.
- **Realtime demo shows no events:** ensure PocketBase is running, you are authenticated, and collection rules permit your user to write.
- **Password reset:** PocketBase logs the reset token to stdout when no mailer is configured. Check `pocketbase.log` for the payload during local demos.
- **Re-running setup:** The script is idempotent—collections are updated in-place and sample data is only inserted when missing.
- **Test failures:** Run `npm run verify` to identify specific issues, then check the troubleshooting guide in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Project Structure

```
pocketbase-demo/
├── server/                    # Express API (production-ready)
│   ├── index.mjs             # Main server file
│   ├── config.mjs            # Configuration & validation
│   ├── middleware/           # Express middleware
│   │   ├── auth.mjs          # Authentication
│   │   ├── timing.mjs        # Request timing
│   │   └── metrics.mjs       # Prometheus metrics
│   ├── routes/               # API routes
│   │   ├── posts.mjs         # Posts endpoints
│   │   └── health.mjs        # Health checks
│   ├── services/             # Business logic
│   │   ├── pocketbaseClient.mjs
│   │   ├── postService.mjs
│   │   └── errorTracking.mjs
│   ├── utils/                # Utilities
│   │   ├── errors.mjs
│   │   ├── logger.mjs
│   │   └── sanitize.mjs
│   ├── docs/                 # API documentation
│   │   ├── openapi.yml       # OpenAPI spec
│   │   └── swagger.mjs       # Swagger setup
│   └── tests/                # Test suites
│       ├── integration.test.mjs
│       ├── error-scenarios.test.mjs
│       └── load/             # k6 load tests
│
├── public/                   # Frontend
│   ├── index.html
│   ├── app.js
│   ├── components/
│   ├── services/
│   └── schemas/
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # System architecture
│   ├── CONFIGURATION.md      # Configuration guide
│   ├── SECURITY.md           # Security documentation
│   ├── LOAD_TESTING.md       # Load testing guide
│   └── GAP_ANALYSIS.md       # Requirements analysis
│
├── pb_data/                  # PocketBase data
├── pb_migrations/            # Database migrations
├── pocketbase               # PocketBase binary
├── Dockerfile               # API container
├── docker-compose.yml       # Full stack
├── nginx.conf              # Frontend server config
├── env.template            # Environment template
├── setup.mjs               # Collection setup
├── *-demo.mjs              # Demo scripts
├── FEATURES.md             # Feature tour
├── DEPLOYMENT.md           # Deployment guides
└── README.md               # This file
```

## Monitoring & Observability

### Prometheus Metrics

Enable metrics collection:

```bash
# In .env
ENABLE_METRICS=true
```

Access metrics at `http://localhost:3030/metrics`

Metrics include:
- Request rate and duration
- Error rate by endpoint
- Active connections
- System resources (CPU, memory)

### Sentry Error Tracking

Configure Sentry for error tracking:

```bash
# In .env
SENTRY_DSN=https://your-key@sentry.io/project
SENTRY_TRACES_SAMPLE_RATE=0.1
```

Sentry captures:
- Server errors (5xx)
- Performance traces
- User context
- Request details

### Logs

Structured JSON logging with context:

```javascript
// Request logs include:
{
  "level": "info",
  "message": "Request completed",
  "method": "POST",
  "path": "/api/posts",
  "status": 201,
  "duration": "245ms",
  "userId": "abc123"
}
```

## Documentation

### API Documentation

- **Interactive API Docs** - http://localhost:3030/api-docs
- **OpenAPI Spec** - http://localhost:3030/api-docs.json
- **Architecture** - [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- **Configuration** - [docs/CONFIGURATION.md](./docs/CONFIGURATION.md)
- **Security** - [docs/SECURITY.md](./docs/SECURITY.md)
- **Load Testing** - [docs/LOAD_TESTING.md](./docs/LOAD_TESTING.md)
- **Features** - [FEATURES.md](./FEATURES.md)
- **Deployment** - [DEPLOYMENT.md](./DEPLOYMENT.md)

### Architecture Diagrams

The [Architecture documentation](./docs/ARCHITECTURE.md) includes Mermaid diagrams for:
- System overview
- Request flow (read/write/realtime)
- Authentication flow
- Error handling
- Deployment architecture
- Security layers
- Database schema

## Additional Resources

- **Main Repository**: [awesome-pocketbase](../)
- **Contributing**: See [../CONTRIBUTING.md](../CONTRIBUTING.md)
- **PocketBase Docs**: https://pocketbase.io/docs/
- **Express Best Practices**: https://expressjs.com/en/advanced/best-practice-security.html
- **Community**: https://discord.gg/pocketbase

## Production Ready ✅

This demo is production-ready with:

✅ Authentication & authorization
✅ Input validation & sanitization
✅ Rate limiting & DDoS protection
✅ Security headers & CORS
✅ Error tracking & monitoring
✅ Comprehensive testing
✅ API documentation
✅ Docker deployment
✅ Graceful shutdown
✅ Health checks
✅ Load tested

See [docs/GAP_ANALYSIS.md](./docs/GAP_ANALYSIS.md) for complete production readiness checklist.

Happy hacking! 🚀
