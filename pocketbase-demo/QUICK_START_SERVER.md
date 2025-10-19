# 🚀 Quick Start - Full Stack Edition

## One-Command Start

```bash
./start.sh
```

This will start:
- PocketBase (port 8090)
- Express API Server (port 3030)
- Web UI (port 4173)

---

## Manual Start (Step by Step)

### 1. Install Dependencies

```bash
./install.sh
```

or manually:

```bash
npm install
```

### 2. Start PocketBase

```bash
npm run serve
```

PocketBase will run on http://127.0.0.1:8090

### 3. Start API Server (in new terminal)

```bash
npm run server
```

API Server will run on http://127.0.0.1:3030

### 4. Start Web UI (in new terminal)

```bash
npx live-server --port=4173 --entry-file=public/index.html
```

Web UI will open at http://localhost:4173

---

## API Endpoints

### Health Check
```bash
curl http://127.0.0.1:3030/healthz
```

### List Posts
```bash
curl http://127.0.0.1:3030/api/posts
```

### Get Single Post
```bash
curl http://127.0.0.1:3030/api/posts/{id}
```

### Create Post
```bash
curl -X POST http://127.0.0.1:3030/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post",
    "content": "Hello from API",
    "author": "{userId}",
    "status": "published"
  }'
```

### Update Post
```bash
curl -X PATCH http://127.0.0.1:3030/api/posts/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title"
  }'
```

---

## Architecture

```
┌─────────────┐
│   Browser   │
│  (port 4173)│
└──────┬──────┘
       │
       ├─────────────────────────────┐
       │                             │
       v                             v
┌──────────────┐            ┌───────────────┐
│ Express API  │ ◄────────► │  PocketBase   │
│ (port 3030)  │            │  (port 8090)  │
└──────────────┘            └───────────────┘
       │                             │
       v                             v
┌──────────────┐            ┌───────────────┐
│ Validation   │            │   Database    │
│ Error        │            │   (SQLite)    │
│ Handling     │            │               │
└──────────────┘            └───────────────┘
```

### Flow

1. **Browser** → Makes optimistic UI update
2. **Browser** → Sends POST to Express API (port 3030)
3. **Express** → Validates data against schemas
4. **Express** → Authenticates with PocketBase (admin)
5. **Express** → Creates post in PocketBase
6. **PocketBase** → Stores in SQLite database
7. **PocketBase** → Broadcasts realtime update
8. **Browser** → Receives realtime update
9. **Browser** → Updates UI with real post ID

---

## Server Features

### ✅ Data Validation
- Schema validation using shared schemas
- Auto-slugification of titles
- Default value injection
- Merge validation on updates

### ✅ Error Handling
- HTTP error classes
- Validation error details
- Centralized error middleware
- Structured error responses

### ✅ Logging
- Structured JSON logging
- Context tracking
- Error logging
- Debug mode

### ✅ Authentication
- Admin authentication on startup
- Auto-retry on 401
- Token management
- Auth state checking

### ✅ Testing
```bash
npm run test:server
```

---

## Environment Variables

```bash
# Optional - defaults provided
export PB_BASE_URL=http://127.0.0.1:8090
export PB_ADMIN_EMAIL=porchroot@gmail.com
export PB_ADMIN_PASSWORD=AdminPassword69!
export APP_PORT=3030
```

---

## Development Workflow

### Frontend Development
```bash
# Terminal 1: PocketBase
npm run serve

# Terminal 2: API Server
npm run server

# Terminal 3: Web UI
npx live-server --port=4173 --entry-file=public/index.html
```

### Backend Development
```bash
# Run tests on file change
npm run test:server -- --watch

# Check server logs
tail -f server.log
```

### Full Stack Testing
1. Create a post in the UI
2. Check server.log for validation
3. Check pocketbase.log for database
4. Verify realtime updates work

---

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port
lsof -ti:3030 | xargs kill -9
lsof -ti:8090 | xargs kill -9
lsof -ti:4173 | xargs kill -9
```

### Server Won't Start
```bash
# Check if PocketBase is running
curl http://127.0.0.1:8090/api/health

# Check server logs
cat server.log

# Restart everything
./start.sh
```

### Database Issues
```bash
# Reset and re-seed
rm -rf pb_data
npm run setup
```

---

## API Server Code Structure

```
server/
├── index.mjs              # Express app + startup
├── routes/
│   └── posts.mjs          # POST routes
├── services/
│   ├── pocketbaseClient.mjs  # PB auth & client
│   └── postService.mjs       # Business logic
├── utils/
│   ├── errors.mjs         # Error classes
│   └── logger.mjs         # Structured logging
└── tests/
    ├── postService.test.mjs     # Unit tests
    └── postsRoutes.test.mjs     # Route tests
```

---

## Next Steps

- [ ] Add authentication middleware
- [ ] Add rate limiting
- [ ] Add request validation middleware
- [ ] Add CORS configuration
- [ ] Add API documentation (OpenAPI/Swagger)
- [ ] Add Docker support
- [ ] Add CI/CD pipeline

---

## Demo Accounts

```
Email: demo@pocketbase.dev
Password: PocketBaseDemo42
```

---

**Happy Coding!** 🎉


