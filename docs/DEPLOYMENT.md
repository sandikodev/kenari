# Deploying Kenari

This guide covers self-hosted deployment using Docker Compose with nginx as a reverse proxy.
It assumes you are running on a Linux server with a public domain name.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone and Configure](#2-clone-and-configure)
3. [GitHub OAuth App](#3-github-oauth-app)
4. [Docker Network Setup](#4-docker-network-setup)
5. [Build and Start Services](#5-build-and-start-services)
6. [Database Migration](#6-database-migration)
7. [nginx Configuration](#7-nginx-configuration)
8. [SSL Certificate](#8-ssl-certificate)
9. [First Login and Setup](#9-first-login-and-setup)
10. [Updating Kenari](#10-updating-kenari)
11. [Logs and Monitoring](#11-logs-and-monitoring)
12. [Troubleshooting](#12-troubleshooting)
13. [Edge Deployment (Cloudflare Pages)](#13-edge-deployment-cloudflare-pages)

---

## 1. Prerequisites

**Server requirements:**
- Linux server — Debian 12 or Ubuntu 22.04 LTS recommended
- Minimum 1 vCPU, 512MB RAM (1GB recommended for Grafana)
- Docker Engine 24+ and Docker Compose v2
- Ports 80 and 443 open in firewall

**Domain requirements:**
- A domain name you control
- DNS A record pointing to your server's public IP
- DNS propagation complete before requesting SSL

**Tools on your local machine (for development):**
- Bun runtime (https://bun.sh)
- Git

---

## 2. Clone and Configure

```bash
git clone https://github.com/sandikodev/kenari
cd kenari
cp .env.example .env.production
```

Open `.env.production` and fill in all values:

```env
# ── App ───────────────────────────────────────────────────────────────────────
# Must match your exact public URL — used for OAuth callbacks and cookie security
ORIGIN=https://monitor.yourdomain.com

# ── Auth ──────────────────────────────────────────────────────────────────────
# Generate a strong secret: openssl rand -hex 32
AUTH_SECRET=your_generated_secret_here

# ── Database ──────────────────────────────────────────────────────────────────
# SQLite file inside the container volume — do not change this path
DATABASE_URL=file:/app/data/monitor.db

# ── GitHub OAuth ──────────────────────────────────────────────────────────────
# See Section 3 for how to create these
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Whitelist — comma-separated GitHub usernames and/or email addresses
# Leave both empty to allow ANY GitHub user (not recommended for production)
GITHUB_ALLOWED_USERS=yourusername,colleague
GITHUB_ALLOWED_ORGS=yourorganization

# ── Upstream Tools ────────────────────────────────────────────────────────────
# Internal Docker network names — do not use localhost here
KUMA_URL=http://kenari-kuma:3001
KUMA_API_TOKEN=

GRAFANA_URL=http://kenari-grafana:3000
GRAFANA_USER=admin
# Generate a strong password: openssl rand -base64 16
GRAFANA_PASSWORD=your_grafana_password
```

> **Security note:** Never commit `.env.production` to version control.
> It is already in `.gitignore` — verify this before pushing.

---

## 3. GitHub OAuth App

### Production App

Go to **https://github.com/settings/applications/new**
(or your organization's settings if registering under an org):

| Field | Value |
|-------|-------|
| Application name | `Kenari` |
| Homepage URL | `https://monitor.yourdomain.com` |
| Application description | *(optional)* |
| Authorization callback URL | `https://monitor.yourdomain.com/auth/github/callback` |

After registering, click **Generate a new client secret**.
Copy both the **Client ID** and **Client Secret** into `.env.production`.

### Development App (separate)

Create a second OAuth App for local development:

| Field | Value |
|-------|-------|
| Application name | `Kenari — Dev` |
| Homepage URL | `http://localhost:5173` |
| Authorization callback URL | `http://localhost:5173/auth/github/callback` |

Copy these credentials into `.env.local`.

> **Why two apps?** GitHub OAuth Apps are bound to a single callback URL.
> `localhost` and your production domain require separate registrations.

See [GITHUB_OAUTH.md](./GITHUB_OAUTH.md) for full details.

---

## 4. Docker Network Setup

Kenari's gateway container must share a Docker network with your reverse proxy
so nginx can reach it by container name.

```bash
# Create the shared network if it doesn't exist
docker network create proxy-net
```

If you already use `nginx-proxy`, `traefik`, or another proxy with an existing
external network, update the `proxy-net` reference in `docker-compose.yml` to
match your existing network name.

---

## 5. Build and Start Services

### Build the gateway image

```bash
docker build -t kenari:latest .
```

### Start all services

```bash
docker compose --env-file .env.production up -d
```

### Verify all containers are running

```bash
docker compose ps
```

Expected output:
```
NAME                STATUS          PORTS
kenari-gateway      Up X seconds    3000/tcp
kenari-kuma         Up X seconds    3001/tcp
kenari-grafana      Up X seconds    3000/tcp
```

### Using the deploy scripts

```bash
bun run deploy        # rebuild and redeploy gateway only (fastest for updates)
bun run deploy:all    # rebuild and redeploy all services
```

---

## 6. Database Migration

Run this after the first deploy and after every update that changes the schema:

```bash
bun run db:push:prod
```

This script connects to the SQLite database inside the running container and
applies all schema changes using Drizzle ORM.

**What it creates:**
- `users` — authenticated users
- `sessions` — active login sessions (Lucia auth)
- `audit_log` — all login, logout, and access events
- `failed_logins` — failed login attempts for threat detection
- `agents` — registered kenari-cli agents
- `agent_metrics` — time-series metrics from agents

---

## 7. nginx Configuration

Create `/etc/nginx/conf.d/kenari.conf` (or equivalent path for your setup):

```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name monitor.yourdomain.com;

    # Let's Encrypt webroot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl;
    server_name monitor.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/monitor.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;

    location / {
        proxy_pass http://kenari-gateway:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (required for Uptime Kuma real-time)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Test and reload nginx:

```bash
nginx -t && nginx -s reload
# or if nginx is in Docker:
docker exec nginx-proxy nginx -t && docker exec nginx-proxy nginx -s reload
```

---

## 8. SSL Certificate

```bash
sudo certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d monitor.yourdomain.com \
  --non-interactive \
  --agree-tos \
  -m admin@yourdomain.com
```

Certbot will automatically renew certificates. Verify auto-renewal:

```bash
sudo certbot renew --dry-run
```

---

## 9. First Login and Setup

1. Open `https://monitor.yourdomain.com` in your browser
2. If no users exist in the database, you will be automatically redirected to `/setup`
3. Fill in your name, email, and password to create the first admin account
4. Alternatively, click **Continue with GitHub** to use GitHub OAuth

> **Note:** The `/setup` page is only accessible when the database has zero users.
> After the first user is created, it redirects to `/login` permanently.

---

## 10. Updating Kenari

```bash
# Pull latest changes
git pull

# Rebuild and redeploy
bun run deploy

# Apply any schema changes
bun run db:push:prod
```

For zero-downtime updates, only the gateway container is recreated.
Uptime Kuma and Grafana data is preserved in Docker volumes.

---

## 11. Logs and Monitoring

```bash
# Follow gateway logs only
bun run logs

# Follow all services
bun run logs:all

# Direct Docker commands
docker logs kenari-gateway -f --tail=100
docker compose logs -f --tail=50
```

Log format: `[STATUS] METHOD /path` with color coding.
All 4xx and 5xx errors are logged to stdout automatically.

---

## 12. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `500` on `/auth/github/callback` | Database tables not created | Run `bun run db:push:prod` |
| `403` on `/auth/github/callback` | GitHub user not in whitelist | Add to `GITHUB_ALLOWED_USERS` in `.env.production` and redeploy |
| `bad_verification_code` | OAuth code expired or reused | Start fresh from `/auth/github` — never refresh the callback URL |
| Gateway unreachable (nginx 502) | Wrong Docker network | Ensure gateway is on `proxy-net` |
| Grafana shows blank page | Wrong root URL | Verify `GF_SERVER_ROOT_URL=${ORIGIN}/grafana` |
| Login redirects in a loop | `ORIGIN` mismatch | Must exactly match your public URL including protocol |
| `/setup` redirects to `/login` | Users already exist in DB | Login normally or check DB |
| Agent metrics not appearing | Tables not migrated | Run `bun run db:push:prod` |

---

## 13. Edge Deployment (Cloudflare Pages)

For edge deployment, Kenari uses Turso (remote libSQL) instead of local SQLite.

```bash
# Build for Cloudflare Pages
bun run build:edge
```

Environment variables to set in Cloudflare Pages dashboard:

```env
ORIGIN=https://monitor.yourdomain.com
AUTH_SECRET=<generated>
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=<turso auth token>
GITHUB_CLIENT_ID=<prod client id>
GITHUB_CLIENT_SECRET=<prod client secret>
GITHUB_ALLOWED_USERS=yourusername
KUMA_URL=https://uptime.yourdomain.com
GRAFANA_URL=https://grafana.yourdomain.com
```

> **Why edge?** Running Kenari on Cloudflare Pages means the gateway is
> geographically separated from the infrastructure it monitors.
> If your server goes down, the gateway is still accessible.
> This is the "canary in a different mine" principle.
