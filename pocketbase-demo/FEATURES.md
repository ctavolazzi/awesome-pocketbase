# PocketBase Demo Feature Guide

This guide explains the capabilities baked into `pocketbase-demo/` and links directly to runnable scripts that highlight each feature area.

## Data Model & Access Rules

`npm run setup` provisions four collections with opinionated rules to mimic a production-grade workflow:

| Collection | Type | Purpose | Access Rules |
| ---------- | ---- | ------- | ------------ |
| `users` | `auth` | Account management with profile fields (`displayName`, `bio`). Seeds include `Ollama Bot` and four themed personas. | List/view limited to self. Update/delete self only. |
| `categories` | `base` | Lightweight tags for grouping posts. | Public read. Authenticated create/update/delete. |
| `posts` | `base` | Social feed posts with relations to authors/categories and an `aiGenerated` toggle. | Public read. Authenticated create. Updates/deletes restricted to author (`@request.auth.id = author.id`). |
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

## Pagination & Infinite Scroll

- Browser feed loads 20 posts per page and automatically fetches the next page when you scroll within 200px of the bottom.
- A neon loading indicator appears while requests are in flight, and an “end of feed” marquee confirms when you’ve reached the first post.
- The scroll container is capped at 600px so large timelines remain smooth; older posts stream in seamlessly without repainting the entire DOM.
- When realtime inserts arrive and you’re not at the top, a sticky “↑ X new posts” banner tracks unseen activity—clicking it (or scrolling back up) pulls the latest page.

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

## Ollama Social Stream (`npm run ollama`)

`ollama-feed.mjs` turns the local Ollama service into an automated account:

```bash
npm run ollama
# Optional overrides:
#   OLLAMA_MODEL=llama3.1 OLLAMA_INTERVAL_MS=60000 npm run ollama
```

Highlights:

- Authenticates with admin credentials (same as the other automation scripts).
- Rotates through four themed personas (`TechGuru42`, `DeepThoughts`, `LOL_Master`, `NewsBot90s`) without repeating the same voice twice in a row.
- Persona-specific prompt banks steer Ollama’s style, and each request includes contextual instructions to keep output short (≤350 chars) and conversational.
- Ensures the persona user accounts exist, grabs available category IDs, and tags every publish with `aiGenerated = true` for UI badging.
- Streams indefinitely with a small jitter so the feed feels organic. Pass `--once` to generate a single post.

If Ollama is not active the script logs the failure and retries after the configured interval.

## Browser UI (`public/`)

The PocketFeed interface is framework-free and optimised for a laptop viewport:

- **Account sidebar** – Log in with the demo credentials (`demo@pocketbase.dev` / `PocketBaseDemo42`) or register a fresh account. Forms disable automatically when signed out.
- **Composer** – Create posts with live character counts; slugs/titles are generated automatically and the submit button is disabled until you sign in.
- **Live feed** – Realtime posts render with avatars, relative timestamps, category chips, and an AI badge when `aiGenerated` is true. Infinite scroll loads 20 posts at a time, surfaces a loading spinner/end-of-feed banner, and shows a sticky “↑ X new posts” indicator when you’re away from the top.
- **Activity column** – Mirrors REST + realtime events for quick debugging and demos while streaming aggregate stats (total posts, AI share).

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
| `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` | `porchroot@gmail.com` / `AdminPassword69!` | Credentials for admin automation (setup, CRUD, Ollama feed). |
| `PB_USER_EMAIL` / `PB_USER_PASSWORD` | `demo@pocketbase.dev` / `PocketBaseDemo42` | Credentials for user-facing demos (realtime/auth). |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Base URL for the local Ollama HTTP API. |
| `OLLAMA_MODEL` | `llama3` | Model name supplied to Ollama during feed generation. |
| `OLLAMA_INTERVAL_MS` | `45000` | Delay between automatic posts (jitter is added each cycle). |

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
