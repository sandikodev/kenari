# Kenari Architecture

This document describes the technical architecture of Kenari, the decisions behind it,
and how all components fit together.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Component Map](#2-component-map)
3. [Data Flow](#3-data-flow)
4. [Technology Decisions](#4-technology-decisions)
5. [Authentication Architecture](#5-authentication-architecture)
6. [Proxy Architecture](#6-proxy-architecture)
7. [Agent Architecture](#7-agent-architecture)
8. [Database Schema](#8-database-schema)
9. [Deployment Targets](#9-deployment-targets)
10. [Security Boundaries](#10-security-boundaries)

---

## 1. Overview

Kenari is a **monitoring gateway** — a single authenticated entry point that proxies
access to multiple monitoring tools (Grafana, Uptime Kuma, etc.) while maintaining
a full audit trail of who accessed what and when.

It is designed around three principles:

**Edge-first** — The gateway should run far from the infrastructure it monitors.
If your server is compromised or goes down, the gateway remains accessible and
continues to record events. This is the "canary in a different mine" principle.

**Minimal surface** — The gateway exposes as little as possible. Monitoring tools
run on an internal Docker network with no public ports. Only the gateway is exposed.

**Audit by default** — Every login, logout, and access event is recorded automatically.
No configuration required. The audit log is the foundation for forensic analysis.

---

## 2. Component Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PUBLIC INTERNET                              │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      Cloudflare / CDN      │  ← DDoS, WAF, Bot protection
                    └─────────────┬─────────────┘
                                  │ HTTPS
                    ┌─────────────▼─────────────┐
                    │           nginx            │  ← TLS termination, reverse proxy
                    └─────────────┬─────────────┘
                                  │ HTTP (internal)
                    ┌─────────────▼─────────────┐
                    │      Kenari Gateway        │  ← SvelteKit 5, Lucia auth
                    │                            │
                    │  /           Dashboard     │
                    │  /login      Auth          │
                    │  /console    Admin         │
                    │  /agents     Agent mgmt    │
                    │  /status     Public status │
                    │  /settings   User settings │
                    │  /uptime/*   Proxy → Kuma  │
                    │  /grafana/*  Proxy → Graf  │
                    │  /api/agent  Agent API     │
                    └──────┬──────────┬──────────┘
                           │          │
              ┌────────────▼──┐  ┌────▼────────────┐
              │  Uptime Kuma  │  │    Grafana       │
              │  (internal)   │  │   (internal)     │
              └───────────────┘  └─────────────────┘
                           │          │
                    ┌──────▼──────────▼──────┐
                    │    SQLite / Turso DB    │  ← users, sessions, audit, metrics
                    └────────────────────────┘
                                  ▲
                    ┌─────────────┴─────────────┐
                    │      kenari-cli (Rust)     │  ← HIDS agent on monitored hosts
                    │  POST /api/agent/push      │
                    └───────────────────────────┘
```

---

## 3. Data Flow

### User Login (GitHub OAuth)

```
Browser → GET /auth/github
        → Redirect to github.com/login/oauth/authorize
        → User approves
        → GitHub redirects to /auth/github/callback?code=xxx&state=yyy
        → Kenari validates state (CSRF protection)
        → Kenari exchanges code for access token (Arctic library)
        → Kenari fetches user profile from GitHub API
        → Kenari checks whitelist (GITHUB_ALLOWED_USERS / GITHUB_ALLOWED_ORGS)
        → If allowed: create/update user in DB, create Lucia session
        → Set session cookie
        → Redirect to /
        → Audit log: action=login, detail=github oauth, ip=x.x.x.x
```

### Proxy Request (e.g., /uptime/dashboard)

```
Browser → GET /uptime/dashboard (with session cookie)
        → hooks.server.ts validates session via Lucia
        → +server.ts checks locals.user (redirect to /login if null)
        → Audit log: action=access, detail=uptime-kuma, ip=x.x.x.x
        → Fetch upstream: GET http://kenari-kuma:3001/dashboard
          with injected auth headers (X-Kuma-Token: xxx)
        → Stream response back to browser
```

### Agent Metrics Push

```
kenari-cli → POST /api/agent/push
             Authorization: Bearer <agent-token>
             Body: { host_id, timestamp, metrics: { cpu, mem, disk, ... } }
           → Kenari validates Bearer token against agents table
           → Insert into agent_metrics
           → Update agents.last_seen
           → Return { ok: true }
```

---

## 4. Technology Decisions

### SvelteKit 5 (not Next.js, Nuxt, Remix)

SvelteKit compiles to minimal JavaScript with no virtual DOM overhead.
For a monitoring dashboard that needs to be fast on mobile and low-bandwidth
connections, this matters. Svelte 5's runes system (`$state`, `$derived`, `$props`)
provides fine-grained reactivity without the complexity of React hooks.

### Lucia v3 (not better-auth, NextAuth, Auth.js)

The original implementation used `better-auth`, which pulled in `kysely` as a
dependency. `kysely` has ESM circular dependency issues that caused build failures
with Bun's bundler. Lucia v3 is a minimal auth library with zero circular deps,
and it's the same library used in the Digital Lab project — consistency matters.

### Drizzle ORM (not Prisma, TypeORM)

Drizzle generates SQL at build time, not runtime. No reflection, no metadata,
no runtime overhead. The schema is plain TypeScript — readable, versionable,
and works identically with SQLite (local) and libSQL/Turso (edge).

### libSQL / Turso (not PostgreSQL, MySQL)

SQLite is the right database for a single-tenant monitoring gateway.
It requires zero infrastructure, zero connection pooling, and zero maintenance.
For edge deployment, Turso provides a remote libSQL endpoint that's API-compatible
with local SQLite — the same Drizzle schema works for both.

### Rust for kenari-cli (not Go, Python, Node)

| Criterion | Rust | Go | Python | Node |
|-----------|------|----|--------|------|
| Binary size | ~2MB | ~8MB | N/A | N/A |
| Memory (idle) | ~2MB | ~10MB | ~30MB | ~50MB |
| Startup time | <5ms | ~20ms | ~100ms | ~200ms |
| Single binary | ✅ | ✅ | ❌ | ❌ |
| Cross-compile | Excellent | Good | Hard | Hard |

An agent that runs 24/7 on potentially resource-constrained servers (Raspberry Pi,
old VPS, embedded Linux) must be as lightweight as possible. Rust wins on all metrics.

### Tailwind CSS v4 (not CSS modules, styled-components)

Utility-first CSS with zero runtime. Tailwind v4 uses a Vite plugin for
build-time processing — no PostCSS config, no separate build step.

---

## 5. Authentication Architecture

Kenari uses **Lucia v3** for session management with two authentication methods:

### Email/Password

```
Login form → verify password with @node-rs/argon2 (Argon2id)
           → create Lucia session
           → set HttpOnly session cookie
```

Argon2id is the winner of the Password Hashing Competition (2015) and is
recommended by OWASP for password hashing. It is resistant to GPU and
side-channel attacks.

### GitHub OAuth

```
/auth/github → Arctic library generates state + authorization URL
             → User authenticates with GitHub
             → /auth/github/callback validates state, exchanges code
             → Whitelist check (username or email)
             → Create/update user, create session
```

Arctic is a minimal OAuth 2.0 library with no dependencies beyond `fetch`.

### Session Management

Sessions are stored in the `sessions` table with an expiry timestamp.
Lucia automatically:
- Refreshes sessions that are close to expiry (sliding window)
- Invalidates expired sessions on next request
- Creates blank session cookies on logout

### Rate Limiting

Failed login attempts are tracked in `failed_logins` table with IP and timestamp.
If an IP has ≥10 failed attempts in the last 60 seconds, the login endpoint
returns HTTP 429 before even checking credentials.

---

## 6. Proxy Architecture

Kenari proxies requests to upstream tools by:

1. Validating the user session (redirect to `/login` if invalid)
2. Logging the access event to `audit_log`
3. Constructing the upstream URL from the route config
4. Forwarding the request with injected auth headers
5. Streaming the response back to the browser

```typescript
// Simplified proxy handler
const upstreamUrl = `${route.upstreamUrl}/${path}${queryString}`;
const headers = new Headers(request.headers);
headers.set('X-WEBAUTH-USER', 'admin');  // Grafana auth proxy
headers.delete('host');

const response = await fetch(upstreamUrl, {
  method: request.method,
  headers,
  body: request.body,
  duplex: 'half'  // required for streaming request bodies
});

return new Response(response.body, {
  status: response.status,
  headers: response.headers
});
```

### Grafana Auth Proxy

Grafana is configured with `GF_AUTH_PROXY_ENABLED=true` and
`GF_AUTH_PROXY_HEADER_NAME=X-WEBAUTH-USER`. When Kenari proxies a request
to Grafana, it injects `X-WEBAUTH-USER: admin` — Grafana trusts this header
and logs the user in automatically. This means users never see Grafana's own
login page.

### WebSocket Support

Uptime Kuma uses WebSockets for real-time updates. The nginx configuration
includes `Upgrade` and `Connection` headers to support WebSocket proxying.

---

## 7. Agent Architecture

### Push Model (not Pull)

kenari-cli uses a **push model** — the agent sends metrics to the gateway,
not the other way around. This means:

- No inbound ports required on monitored hosts
- Monitored hosts can be behind NAT/firewall
- The gateway never needs to know the host's IP address
- Compromising the gateway does not give access to monitored hosts

### Token Authentication

Each agent has a unique 64-character random token stored in the `agents` table.
The token is presented as a Bearer token in the `Authorization` header.
Tokens can be revoked from the `/agents` page.

### Metrics Collection

kenari-cli uses the `sysinfo` crate to collect:
- CPU usage (global percentage, refreshed every push)
- Memory (used/total in MB)
- Disk (used/total in GB, all mount points summed)
- Uptime (seconds since boot)

### Init System Detection

`kenari doctor` and `kenari agent install` auto-detect the init system by:
1. Reading `/proc/1/comm` (Linux only)
2. Checking for init-specific paths (`/run/systemd/private`, `/sbin/openrc`, etc.)
3. Falling back to `Unknown` if detection fails

Supported init systems: systemd, OpenRC, runit, SysV init, launchd (macOS), Windows SCM.

---

## 8. Database Schema

```sql
-- Authenticated users
CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  password_hash TEXT,           -- NULL for OAuth-only users
  github_id    TEXT UNIQUE,     -- NULL for email-only users
  avatar_url   TEXT,
  role         TEXT NOT NULL DEFAULT 'viewer',  -- 'admin' | 'viewer'
  created_at   INTEGER NOT NULL  -- Unix timestamp ms
);

-- Lucia auth sessions
CREATE TABLE sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL
);

-- All security-relevant events
CREATE TABLE audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT REFERENCES users(id),  -- NULL for unauthenticated events
  action     TEXT NOT NULL,  -- 'login' | 'logout' | 'access' | 'admin'
  detail     TEXT,           -- e.g. 'github oauth', 'uptime-kuma', 'set role admin'
  ip         TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

-- Failed login attempts (for rate limiting and threat detection)
CREATE TABLE failed_logins (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT NOT NULL,
  email      TEXT,           -- The email that was attempted
  created_at INTEGER NOT NULL
);

-- Registered kenari-cli agents
CREATE TABLE agents (
  id         TEXT PRIMARY KEY,  -- slug of the host name
  name       TEXT NOT NULL,
  token      TEXT NOT NULL UNIQUE,  -- 64-char random hex
  last_seen  INTEGER,          -- Unix timestamp ms of last push
  created_at INTEGER NOT NULL
);

-- Time-series metrics from agents
CREATE TABLE agent_metrics (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id        TEXT NOT NULL REFERENCES agents(id),
  cpu_percent     REAL NOT NULL,
  memory_used_mb  REAL NOT NULL,
  memory_total_mb REAL NOT NULL,
  disk_used_gb    REAL NOT NULL,
  disk_total_gb   REAL NOT NULL,
  uptime_secs     INTEGER NOT NULL,
  created_at      INTEGER NOT NULL
);
```

---

## 9. Deployment Targets

| Target | Adapter | Database | Build Command |
|--------|---------|----------|---------------|
| Docker / VPS | `@sveltejs/adapter-node` | SQLite (local file) | `bun run build` |
| Cloudflare Pages | `@sveltejs/adapter-cloudflare` | Turso (remote libSQL) | `bun run build:edge` |
| Development | Vite dev server | SQLite (local file) | `bun run dev` |

The adapter is selected at build time via the `DEPLOY_TARGET` environment variable:

```javascript
// svelte.config.js
const isEdge = process.env.DEPLOY_TARGET === 'cloudflare';
adapter: isEdge ? adapterCloudflare() : adapterNode()
```

---

## 10. Security Boundaries

```
TRUST BOUNDARY 1: Internet → nginx
  - TLS termination
  - DDoS protection (Cloudflare)
  - Rate limiting (nginx limit_req)

TRUST BOUNDARY 2: nginx → Kenari Gateway
  - Session validation (Lucia)
  - GitHub OAuth whitelist
  - Rate limiting (failed login counter)
  - CSRF protection (OAuth state parameter)

TRUST BOUNDARY 3: Kenari Gateway → Upstream Tools
  - Internal Docker network only (no public ports)
  - Auth header injection (Grafana auth proxy)
  - API token injection (Uptime Kuma)

TRUST BOUNDARY 4: kenari-cli → Kenari Gateway
  - Bearer token authentication
  - HTTPS only (TLS 1.2+)
  - Push-only (no inbound ports on monitored hosts)
```

### What Kenari Does NOT Protect Against

- A compromised admin account — if an admin's GitHub account is taken over,
  the attacker can access all monitoring tools
- Server-level compromise — if the host running Kenari is compromised,
  all data including the SQLite database is accessible
- Upstream tool vulnerabilities — Kenari proxies requests but does not
  sanitize or inspect the content of responses from Grafana or Uptime Kuma

These are documented in [SECURITY.md](./SECURITY.md).
