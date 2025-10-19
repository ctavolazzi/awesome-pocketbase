# 🔍 Inspecting PocketBase Data in Docker

## Quick Data Inspection Methods

### Method 1: Direct API Queries (Easiest!)

```bash
# Get first 5 posts with all fields
curl -s "http://localhost:8090/api/collections/posts/records?perPage=5" | jq '.'

# Get specific post by ID
curl -s "http://localhost:8090/api/collections/posts/records/YOUR_ID_HERE" | jq '.'

# See all available fields in posts
curl -s "http://localhost:8090/api/collections/posts/records?perPage=1" | jq '.items[0] | keys'

# Get posts with expanded author info
curl -s "http://localhost:8090/api/collections/posts/records?expand=author&perPage=3" | jq '.items[] | {id, title, author: .expand.author.displayName}'

# Count total posts
curl -s "http://localhost:8090/api/collections/posts/records?perPage=1" | jq '.totalItems'

# Get users
curl -s "http://localhost:8090/api/collections/users/records" | jq '.items[] | {id, email, displayName}'

# Get categories
curl -s "http://localhost:8090/api/collections/categories/records" | jq '.items[] | {id, label, slug}'
```

### Method 2: Access PocketBase Admin UI

Open in browser: **http://localhost:8090/_/**

Login with your admin credentials from `.env`:
- Email: `porchroot@gmail.com`
- Password: `AdminPassword69!`

Then browse collections visually!

### Method 3: Direct Database Access (Advanced)

```bash
# Enter the PocketBase container
docker exec -it pocketbase-demo sh

# Check if SQLite CLI is available
which sqlite3

# If sqlite3 is available, query directly
cd /app/pb_data
sqlite3 data.db "SELECT COUNT(*) FROM posts;"
sqlite3 data.db "SELECT id, title, created FROM posts LIMIT 5;"

# Exit container
exit
```

### Method 4: Export Data via PocketBase API

```bash
# Export all posts to JSON file
curl -s "http://localhost:8090/api/collections/posts/records?perPage=500" > posts_backup.json

# Pretty print and save
curl -s "http://localhost:8090/api/collections/posts/records?perPage=500" | jq '.' > posts_formatted.json
```

## Current Data Analysis

### What We Found

Running:
```bash
curl -s "http://localhost:8090/api/collections/posts/records?perPage=1" | jq '.items[0]'
```

**Available Fields:**
```json
{
  "aiGenerated": false,
  "author": "user_id_here",
  "categories": ["cat_id"],
  "collectionId": "...",
  "collectionName": "posts",
  "content": "Post content here",
  "downvotedBy": [],
  "downvotes": 0,
  "featured": false,
  "id": "record_id",
  "slug": "post-slug",
  "status": "published",
  "title": "Post Title",
  "upvotedBy": [],
  "upvotes": 0
}
```

**Missing Fields:**
- ❌ `created` - null (PocketBase 0.30.4+ doesn't auto-populate)
- ❌ `updated` - null (PocketBase 0.30.4+ doesn't auto-populate)

### Why created/updated are null

PocketBase 0.30.4+ changed to **opt-in timestamps**. Collections must explicitly define these fields in the schema.

**Solution:** We sort by `id` instead, which implicitly reflects creation order:
```javascript
// In postService.mjs
sort: '-id'  // Instead of '-created'
```

## Checking Data Completeness

### Check for incomplete posts

```bash
# Find posts with empty or short content
curl -s "http://localhost:8090/api/collections/posts/records?perPage=100" | jq '.items[] | select((.content | length) < 10) | {id, title, contentLength: (.content | length)}'

# Find posts without authors
curl -s "http://localhost:8090/api/collections/posts/records?perPage=100" | jq '.items[] | select(.author == "" or .author == null) | {id, title}'

# Find posts without categories
curl -s "http://localhost:8090/api/collections/posts/records?perPage=100" | jq '.items[] | select(.categories == [] or .categories == null) | {id, title}'

# Check AI-generated posts
curl -s "http://localhost:8090/api/collections/posts/records?perPage=100" | jq '[.items[] | select(.aiGenerated == true)] | length'
```

### Verify Data Through Express API

```bash
# Via our production Express API
curl -s "http://localhost:3030/api/posts?perPage=5" | jq '.'

# Check health including PocketBase connection
curl -s "http://localhost:3030/healthz" | jq '.'

# Check API documentation
curl -s "http://localhost:3030/api-docs.json" | jq '.info'
```

## Real-Time Data Monitoring

### Watch for new posts

```bash
# Poll every 2 seconds (Ctrl+C to stop)
watch -n 2 'curl -s "http://localhost:8090/api/collections/posts/records?perPage=1&sort=-id" | jq ".items[0] | {id, title, created}"'
```

### Check Docker logs

```bash
# PocketBase logs
docker logs pocketbase-demo --tail=50 -f

# Express API logs
docker logs express-api --tail=50 -f

# All logs combined
docker-compose logs -f
```

## Troubleshooting Data Issues

### No posts appearing?

```bash
# Check total count
curl -s "http://localhost:8090/api/collections/posts/records?perPage=1" | jq '.totalItems'

# If 0, you need to run setup
npm run setup
```

### Data seems stale?

```bash
# Check PocketBase health
curl -s "http://localhost:8090/api/health" | jq '.'

# Restart PocketBase container
docker restart pocketbase-demo
```

### Wrong data format?

```bash
# Check collection schema via admin UI
open http://localhost:8090/_/

# Or via API (requires admin auth)
# Login first, then:
curl -s "http://localhost:8090/api/collections/posts" | jq '.'
```

## Data Backup & Restore

### Backup all data

```bash
# Backup PocketBase data directory
docker exec pocketbase-demo sh -c "cd /app && tar czf - pb_data" > pb_data_backup.tar.gz

# Or just copy the data
docker cp pocketbase-demo:/app/pb_data ./pb_data_backup/
```

### Restore data

```bash
# Stop services
docker-compose down

# Restore data
tar xzf pb_data_backup.tar.gz

# Start services
docker-compose up -d
```

## Performance Monitoring

### Check query performance

```bash
# Time a query
time curl -s "http://localhost:8090/api/collections/posts/records?perPage=100" > /dev/null

# Check API response times
curl -w "\nTime: %{time_total}s\n" -s "http://localhost:3030/api/posts?perPage=50" | jq '.totalItems'
```

### Monitor Prometheus metrics

```bash
# If metrics enabled
curl -s http://localhost:3030/metrics | grep http_requests_total
curl -s http://localhost:3030/metrics | grep http_request_duration
```

## Summary Commands

```bash
# Quick health check script
cat << 'EOF' > check_data.sh
#!/bin/bash
echo "=== PocketBase Status ==="
curl -s http://localhost:8090/api/health | jq '.'

echo -e "\n=== Total Posts ==="
curl -s "http://localhost:8090/api/collections/posts/records?perPage=1" | jq '.totalItems'

echo -e "\n=== Latest Post ==="
curl -s "http://localhost:8090/api/collections/posts/records?perPage=1&sort=-id" | jq '.items[0] | {id, title, author}'

echo -e "\n=== Express API Status ==="
curl -s http://localhost:3030/healthz | jq '.'
EOF

chmod +x check_data.sh
./check_data.sh
```

---

**Quick Reference:**
- **Admin UI:** http://localhost:8090/_/
- **API Endpoint:** http://localhost:8090/api/
- **Express API:** http://localhost:3030/api/
- **API Docs:** http://localhost:3030/api-docs

