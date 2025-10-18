# PocketBase Demo - Deployment Guide

This guide covers deploying the PocketBase demo to various hosting platforms.

## Table of Contents

- [Docker Deployment](#docker-deployment)
- [Fly.io Deployment](#flyio-deployment)
- [Railway Deployment](#railway-deployment)
- [DigitalOcean Deployment](#digitalocean-deployment)
- [Environment Variables](#environment-variables)
- [Backup Strategies](#backup-strategies)

## Docker Deployment

### Using Docker Compose (Recommended)

The demo includes a `docker-compose.yml` for easy containerized deployment.

**Start the service:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f pocketbase
```

**Stop the service:**
```bash
docker-compose down
```

**Rebuild after updates:**
```bash
docker-compose down
docker-compose up -d --build
```

### Manual Docker Build

If you prefer building your own image:

**Create a Dockerfile:**
```dockerfile
FROM alpine:latest

# Install wget for healthchecks
RUN apk add --no-cache wget ca-certificates

WORKDIR /app

# Copy PocketBase binary
COPY pocketbase /app/pocketbase
RUN chmod +x /app/pocketbase

# Expose port
EXPOSE 8090

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8090/api/health || exit 1

# Run PocketBase
CMD ["/app/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

**Build and run:**
```bash
docker build -t pocketbase-demo .
docker run -d -p 8090:8090 -v $(pwd)/pb_data:/app/pb_data --name pocketbase pocketbase-demo
```

## Fly.io Deployment

[Fly.io](https://fly.io) offers free tier hosting suitable for demos and small applications.

### Prerequisites
- Install [flyctl CLI](https://fly.io/docs/hands-on/install-flyctl/)
- Sign up for Fly.io account

### Step 1: Create fly.toml

Create `fly.toml` in `pocketbase-demo/`:

```toml
app = "your-pocketbase-demo"
primary_region = "sjc"

[build]
  [build.args]
    POCKETBASE_VERSION = "0.22.0"

[env]
  PORT = "8090"

[http_service]
  internal_port = 8090
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 256

[mounts]
  source = "pb_data"
  destination = "/app/pb_data"
```

### Step 2: Create Dockerfile for Fly

```dockerfile
FROM alpine:latest

ARG POCKETBASE_VERSION=0.22.0

RUN apk add --no-cache \
    ca-certificates \
    unzip \
    wget \
    && wget https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip \
    && unzip pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip \
    && rm pocketbase_${POCKETBASE_VERSION}_linux_amd64.zip \
    && chmod +x pocketbase

EXPOSE 8090

CMD ["/pocketbase", "serve", "--http=0.0.0.0:8090"]
```

### Step 3: Deploy

```bash
# Login to Fly
flyctl auth login

# Launch the app (first time)
flyctl launch

# Create persistent volume
flyctl volumes create pb_data --size 1

# Deploy
flyctl deploy

# Open in browser
flyctl open

# View logs
flyctl logs
```

### Step 4: Create Admin Account

```bash
flyctl ssh console
/pocketbase superuser upsert admin@example.com YourSecurePassword
exit
```

## Railway Deployment

[Railway](https://railway.app) offers easy deployment with automatic SSL.

### Step 1: Prepare Repository

Ensure your `Dockerfile` is at the root of `pocketbase-demo/`.

### Step 2: Deploy via Railway

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect the Dockerfile
5. Add environment variables (if needed)
6. Click "Deploy"

### Step 3: Configure Domain

1. Go to Settings → Domains
2. Generate a Railway domain or add your custom domain
3. SSL is automatic

### Step 4: Persistent Storage

1. Go to your service → Data tab
2. Click "Add Volume"
3. Mount path: `/app/pb_data`
4. Size: 1GB (or more)

## DigitalOcean Deployment

Deploy to a DigitalOcean droplet for full control.

### Step 1: Create Droplet

1. Create a Ubuntu 22.04 droplet (minimum $6/month)
2. Add SSH key
3. Note the IP address

### Step 2: SSH and Install Dependencies

```bash
ssh root@YOUR_DROPLET_IP

# Update system
apt update && apt upgrade -y

# Install dependencies
apt install -y wget unzip

# Download PocketBase
cd /opt
wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip
unzip pocketbase_0.22.0_linux_amd64.zip
chmod +x pocketbase
```

### Step 3: Create systemd Service

Create `/etc/systemd/system/pocketbase.service`:

```ini
[Unit]
Description=PocketBase Demo
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt
ExecStart=/opt/pocketbase serve --http=0.0.0.0:8090
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
systemctl daemon-reload
systemctl enable pocketbase
systemctl start pocketbase
systemctl status pocketbase
```

### Step 4: Configure Firewall

```bash
ufw allow 22/tcp
ufw allow 8090/tcp
ufw enable
```

### Step 5: Setup Reverse Proxy (Optional)

Install Caddy for automatic HTTPS:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update
apt install caddy
```

Create `/etc/caddy/Caddyfile`:

```
your-domain.com {
    reverse_proxy localhost:8090
}
```

Restart Caddy:
```bash
systemctl restart caddy
```

## Environment Variables

Configure your deployment using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `PB_BASE_URL` | Base URL for API | `http://127.0.0.1:8090` |
| `PB_ADMIN_EMAIL` | Admin email | `porchroot@gmail.com` |
| `PB_ADMIN_PASSWORD` | Admin password | `AdminPassword69!` |
| `PB_ENCRYPTION_KEY` | Encryption key (optional) | - |

**Setting in Docker:**
```bash
docker run -e PB_ENCRYPTION_KEY=your-key-here ...
```

**Setting in Fly.io:**
```bash
flyctl secrets set PB_ENCRYPTION_KEY=your-key-here
```

## Backup Strategies

### Manual Backup

Backup the `pb_data` directory:

```bash
tar -czf pb_data_backup_$(date +%Y%m%d).tar.gz pb_data/
```

### Automated Backup Script

Create `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Stop PocketBase (optional, for consistency)
systemctl stop pocketbase

# Backup
tar -czf $BACKUP_DIR/pb_data_$DATE.tar.gz /opt/pb_data/

# Start PocketBase
systemctl start pocketbase

# Keep only last 7 days
find $BACKUP_DIR -name "pb_data_*.tar.gz" -mtime +7 -delete
```

Add to cron:
```bash
crontab -e
# Add: 0 2 * * * /opt/backup.sh
```

### Litestream Integration

Use [Litestream](https://litestream.io/) for real-time SQLite replication to S3:

```bash
# Install Litestream
wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.tar.gz
tar -xzf litestream-v0.3.13-linux-amd64.tar.gz
mv litestream /usr/local/bin/
```

Create `/etc/litestream.yml`:

```yaml
dbs:
  - path: /opt/pb_data/data.db
    replicas:
      - url: s3://your-bucket/db
        access-key-id: YOUR_ACCESS_KEY
        secret-access-key: YOUR_SECRET_KEY
```

Update systemd service to use Litestream:
```bash
ExecStart=/usr/local/bin/litestream replicate -config /etc/litestream.yml
```

## SSL/HTTPS

### Using Caddy (Recommended)

Caddy automatically handles SSL certificates. See DigitalOcean deployment section.

### Using Let's Encrypt + Nginx

Install certbot:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

## Health Checks

Test your deployment:

```bash
# Health endpoint
curl https://your-domain.com/api/health

# List collections
curl https://your-domain.com/api/collections

# Check specific collection
curl https://your-domain.com/api/collections/posts/records
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8090
lsof -i :8090
# Kill it
kill -9 PID
```

### Permission Issues
```bash
# Fix ownership
chown -R $USER:$USER pb_data/
chmod -R 755 pb_data/
```

### Database Locked
```bash
# Stop all PocketBase instances
pkill pocketbase
# Or with systemd
systemctl stop pocketbase
```

### Logs Location

- **Docker**: `docker-compose logs -f`
- **Fly.io**: `flyctl logs`
- **Systemd**: `journalctl -u pocketbase -f`
- **File**: `pocketbase-demo/pocketbase.log`

## Production Checklist

- [ ] Change default admin credentials
- [ ] Set strong PB_ENCRYPTION_KEY
- [ ] Configure SSL/HTTPS
- [ ] Set up automated backups
- [ ] Configure firewall rules
- [ ] Enable monitoring/alerts
- [ ] Test backup restoration
- [ ] Document recovery procedures
- [ ] Set up staging environment
- [ ] Configure rate limiting (via proxy)

## Support

- [PocketBase Discussions](https://github.com/pocketbase/pocketbase/discussions)
- [PocketBase Discord](https://discord.gg/pocketbase)
- [Deployment Guide](https://pocketbase.io/docs/going-to-production/)

---

Happy deploying! 🚀

