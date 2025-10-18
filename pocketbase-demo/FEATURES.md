# PocketBase Demo Feature Guide

This guide explains the capabilities baked into `pocketbase-demo/` and links directly to runnable scripts that highlight each feature area.

## Data Model & Access Rules

`npm run setup` provisions four collections with opinionated rules to mimic a production-grade workflow:

| Collection | Type | Purpose | Access Rules |
| ---------- | ---- | ------- | ------------ |
| `users` | `auth` | Account management with profile fields (`displayName`, `bio`). | List/view limited to self. Update/delete self only. | 
| `categories` | `base` | Taxonomy used to segment posts. | Public read. Authenticated create/update/delete. |
| `posts` | `base` | Primary content model referencing authors and categories. | Public read. Authenticated create. Updates/deletes restricted to author (`@request.auth.id = author.id`). |
| `comments` | `base` | Discussion tied to posts. Cascades on post removal. | Same author-driven rules as `posts`. |

All relations are wired automatically:

- `posts.categories` → `categories`
- `posts.author` → `users`
- `comments.post` → `posts`
- `comments.author` → `users`

## CRUD Scenarios (`npm run crud`)

`crud-demo.mjs` authenticates as an admin and demonstrates how to orchestrate full lifecycle operations with the JS SDK:

```bash
# Run against the local server (override credentials via env vars as needed)
npm run crud
```

Highlighted flows:

- **Create** – Inserts a post using relational IDs and logs validation errors for incomplete payloads.
- **Read** – Uses `.getList(page, perPage, { filter, expand })` to demonstrate pagination, filtering by status, and expanding `author` + `categories` references.
- **Update** – Patches title/status on an existing record.
- **Delete** – Cleans up demo content and shows graceful handling of missing IDs.
- **Errors** – Captures 404s/validation errors and prints human-readable summaries.

Refer to `crud-demo.mjs` for reusable helper patterns (`summariseError`, `fetchPagedPosts`).

## Realtime Events (`npm run realtime`)

`realtime-demo.mjs` logs in as the demo user (`demo@pocketbase.dev`) and illustrates websocket subscriptions:

```bash
npm run realtime
```

What it covers:

- Subscribes to `posts` and `comments` using `pb.collection('name').subscribe('*', handler)`.
- Emits create/update/delete events to broadcast change notifications.
- Shows how to unsubscribe and disconnect cleanly (`unsubscribe()`, `pb.realtime.unsubscribeAll()`).
- Uses authenticated requests so the user can create posts/comments and trigger their own events.

You can open the browser UI simultaneously to watch realtime updates propagate into the live list.

## Authentication Walkthrough (`npm run auth`)

`auth-demo.mjs` focuses on end-user flows:

```bash
npm run auth
```

Scenarios covered:

1. **Registration** – Creates a user with additional profile fields, ensuring password confirmation is supplied.
2. **Login** – Authenticates via `authWithPassword` and prints the JWT expiry timestamp.
3. **Token refresh** – Exercises `authRefresh` to renew sessions.
4. **Profile updates** – Saves `displayName` / `bio` changes under the authenticated user.
5. **Password reset** – Requests a reset email (token appears in `pocketbase.log` when an SMTP provider is not configured).
6. **Logout guard** – Attempts a post-logout update to show 401 handling.

`PB_USER_EMAIL` and `PB_USER_PASSWORD` can be exported to reuse specific accounts during debugging.

## Browser UI (`public/`)

The frontend is intentionally framework-free so it can run from any static file server:

- **Authentication panel** – Register, log in, and log out. Buttons and forms automatically disable when the auth store is empty.
- **Realtime post list** – Uses `pb.collection('posts').subscribe('*', …)` to refresh the list whenever a websocket event fires.
- **Post editor** – Provides create/update/delete actions with category selection, featured toggle, and slug validation.
- **Activity log** – Streams REST + realtime events with timestamps for demos or debugging.

Launch steps:

```bash
python3 -m http.server 4173
open http://127.0.0.1:4173/public/
```

Because the page loads the PocketBase SDK from `../node_modules/pocketbase/dist/pocketbase.umd.js`, serve the repository root or adjust the `<script>` path if you deploy elsewhere.

## Environment Variables

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `PB_BASE_URL` | `http://127.0.0.1:8090` | Override the PocketBase host when running scripts outside localhost. |
| `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` | `porchroot@gmail.com` / `AdminPassword69!` | Credentials for admin automation (setup/crud). |
| `PB_USER_EMAIL` / `PB_USER_PASSWORD` | `demo@pocketbase.dev` / `PocketBaseDemo42` | Credentials for user-facing demos (realtime/auth). |

Export them before invoking any `npm run <script>` command.

## Additional API Examples

```bash
# List published posts only
curl -G \
  --data-urlencode 'filter=status = "published"' \
  http://127.0.0.1:8090/api/collections/posts/records

# Create a comment (requires auth token)
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"post": "<postId>", "author": "<userId>", "content": "CLI comment"}' \
  http://127.0.0.1:8090/api/collections/comments/records

# Refresh an auth token
curl -X POST \
  -H "Authorization: Bearer <token>" \
  http://127.0.0.1:8090/api/collections/users/auth-refresh
```

For more REST endpoints and payload shapes, review [`setup.mjs`](./setup.mjs) alongside the scenario scripts.
