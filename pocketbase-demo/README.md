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

- **users** (auth) – adds `displayName` & `bio` profile fields, requires auth to update/delete `self`. Seeds three accounts: demo, content editor, and `Ollama Bot`.
- **categories** (base) – public read, authenticated create/update/delete for lightweight topic tagging.
- **posts** (base) – public read, authenticated create, author-restricted update/delete, relations to `users` and `categories`, plus an `aiGenerated` flag to highlight model-created content.
- **comments** (base) – public read, authenticated create, author-restricted update/delete, cascades on post deletion.

Sample records include two demo users, three categories, spotlight posts, and a starter comment.

## Automation Scripts

Each script accepts optional environment overrides for `PB_BASE_URL`, `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD`, `PB_USER_EMAIL`, and `PB_USER_PASSWORD`.

| Command | Description |
| ------- | ----------- |
| `npm run setup` | Authenticates as an admin, creates/updates collections, and seeds demo data. |
| `npm run crud` | Walks through create, read (filter + pagination), update, delete, and error handling for the `posts` collection. |
| `npm run realtime` | Signs in as a demo user, subscribes to `posts` and `comments`, triggers lifecycle events, and showcases unsubscribe handling. |
| `npm run auth` | Registers a new user, demonstrates login, token refresh, profile updates, password reset requests, and logout guards. |
| `npm run ollama` | Drives the `Ollama Bot` user to generate short-form posts by calling the local Ollama REST API on an interval. |
| `npm start` | Original read-only example that lists posts via the JS SDK. |
| `npm run serve` | Convenience wrapper for `./pocketbase serve --http=127.0.0.1:8090`. |

## Browser Walkthrough (`public/`)

A minimal single-page interface showcases realtime CRUD with visual feedback:

1. Serve the static assets (from `pocketbase-demo/`):
   ```bash
   python3 -m http.server 4173
   # or: npx serve public
   ```
2. Visit `http://127.0.0.1:4173/public/`.
3. Use the **Account** sidebar to register/sign in. Demo credentials: `demo@pocketbase.dev` / `PocketBaseDemo42`.
4. Publish updates from the composer. Realtime updates automatically refresh the feed.
5. Run `npm run ollama` in another terminal to let the local model drip fresh content into the feed.

The UI loads the PocketBase SDK directly from `../node_modules/pocketbase/dist/pocketbase.umd.js`, so host the repo root when serving locally.

## API Reference Cheatsheet

- Health check – `GET /api/health`
- Posts – `GET /api/collections/posts/records`
- Comments – `GET /api/collections/comments/records`
- Auth login – `POST /api/collections/users/auth-with-password`
- Admin login – `POST /api/admins/auth-with-password`

Additional examples and REST payloads live in [`FEATURES.md`](./FEATURES.md).

## Testing & Validation

### Automated Test Suite

Run comprehensive tests to validate the demo:

```bash
npm test
```

The test suite verifies:
- Server connectivity
- Admin authentication
- Collection schemas
- CRUD operations
- Pagination and filtering
- Relations and expand
- User authentication
- Sample data presence

### Quick Verification

For a rapid health check:

```bash
# Human-readable output
npm run verify

# JSON output (for CI/CD)
npm run verify:json
```

## Deployment

This demo can be deployed to production environments. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed guides covering:

- **Docker & Docker Compose** - Containerized deployment
- **Fly.io** - Free tier hosting with automatic SSL
- **Railway** - One-click deployment from GitHub
- **DigitalOcean** - Traditional VPS setup
- **Backup strategies** - Data protection and recovery
- **SSL/HTTPS** - Secure production configuration

### Quick Docker Deployment

```bash
# Using Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f pocketbase

# Stop
docker-compose down
```

## Troubleshooting

- **403 or EPERM when scripts run:** expose `PB_BASE_URL` explicitly (for example `export PB_BASE_URL=http://127.0.0.1:8090`). Some sandboxes restrict loopback without elevated privileges.
- **Realtime demo shows no events:** ensure PocketBase is running, you are authenticated, and collection rules permit your user to write.
- **Password reset:** PocketBase logs the reset token to stdout when no mailer is configured. Check `pocketbase.log` for the payload during local demos.
- **Re-running setup:** The script is idempotent—collections are updated in-place and sample data is only inserted when missing.
- **Test failures:** Run `npm run verify` to identify specific issues, then check the troubleshooting guide in [DEPLOYMENT.md](./DEPLOYMENT.md).

## Project Structure

- `pocketbase` – PocketBase 0.30.4 binary
- `pb_data/` – SQLite database and config
- `script.mjs` – Legacy read script (still available via `npm start`)
- `setup.mjs` – Collection and seed automation
- `crud-demo.mjs` / `realtime-demo.mjs` / `auth-demo.mjs` – Scenario scripts
- `ollama-feed.mjs` – Streams micro-posts from the local Ollama model
- `public/` – Browser UI (`index.html`, `app.js`, `style.css`)
- `docker-compose.yml` – Docker deployment configuration
- `FEATURES.md` – Detailed feature tour and snippets
- `DEPLOYMENT.md` – Production deployment guides
- `pocketbase.log` – Server logs

## Additional Resources

- **Main Repository**: [awesome-pocketbase](../)
- **Contributing**: See [../CONTRIBUTING.md](../CONTRIBUTING.md)
- **PocketBase Docs**: https://pocketbase.io/docs/
- **Community**: https://discord.gg/pocketbase

Happy hacking! 🚀
