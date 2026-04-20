# Kenari — Backlog

Active task list. Items are ordered by priority within each section.
See [ROADMAP.md](./ROADMAP.md) for version-level planning.
See [VISION.md](./VISION.md) for long-term strategic direction.

---

## Navigation Restructure

Agreed structure:
```
/                → Dashboard (shortcuts + dynamic widgets)
/registry        → Agents tab + Services tab
/console         → Users, Security, Audit log, Blocked IPs
/status          → Public status page
/settings        → User settings
```

### Tasks

- [ ] **Create `/registry` page** with two tabs:
  - **Agents tab** — move current `/agents` content here (metrics, register, online status)
  - **Services tab** — new: CRUD for `services` table (add/edit/delete proxy routes)
- [ ] **Update nav** — replace "Agents" link with "Registry" in AppShell (desktop + mobile)
- [ ] **Redirect `/agents`** → `/registry` for backward compatibility
- [ ] **Services CRUD UI** — form to add/edit/delete services in Registry > Services tab:
  - Fields: name, icon, description, proxy path, upstream URL, auth header (key/value), allowed roles
  - Admin only
- [ ] **Migrate DB** — add `services` table to production DB (`bun run db:push:prod`)
- [ ] **Dashboard widgets** — make dashboard customizable:
  - Show/hide shortcuts per user preference
  - Add summary widgets: agent count, service health, recent alerts
  - Store preferences in user settings or localStorage

---

## Security & Hardening

- [ ] **Anomaly detection** — baseline normal login hours/IPs per user, alert on deviation
- [ ] **Log retention policy** — auto-delete audit logs older than N days (configurable)
- [ ] **Log shipping** — optional webhook to send events to external SIEM in real-time
- [ ] **Email notifications** — SMTP-based alerts for critical events

---

## Proxy & Integration

- [ ] **Dynamic proxy routing** — proxy handler should check `services` table for routes
  (currently only checks `getRoutes()` which is env-based)
- [ ] **Grafana WebSocket** — verify `wss://monitor.domain/grafana/api/live/ws` works end-to-end
- [ ] **Grafana `react/jsx-runtime`** — investigate if disabling `grafana-lokiexplore-app`
  fully resolves the error or if there's a deeper module federation issue
- [ ] **Health check for DB services** — include `services` table entries in dashboard health checks

---

## kenari-cli (Rust)

- [ ] **HIDS — file integrity monitoring** (`notify` crate, inotify/FSEvents)
- [ ] **HIDS — process monitoring** (new process detection, suspicious names)
- [ ] **Log collection — nginx** (tail access log, parse error patterns)
- [ ] **Log collection — PHP** (error log parsing, slow query)
- [ ] **Log collection — Node/Bun** (process metrics via HTTP or IPC)
- [ ] **PAM integration** — forward login events to gateway
- [ ] **systemd journal** — forward journal entries to Loki

---

## Language SDKs (v0.4)

- [ ] **PHP SDK** (`composer require kenari/sdk`) — push custom metrics from PHP apps
- [ ] **Node.js/Bun SDK** (`npm install @kenari/sdk`) — process metrics + custom events
- [ ] **Go SDK** (`go get github.com/sandikodev/kenari-go`)
- [ ] **Python SDK** (`pip install kenari`)
- [ ] **Generic HTTP API docs** — for any language without an SDK

---

## Infrastructure

- [ ] **Deploy production** with latest changes (Grafana proxy, dynamic routes, services table)
- [ ] **`bun run db:push:prod`** — migrate `services` table to production
- [ ] **Update `db-migrate-prod.sh`** — add `services` table to migration script
- [ ] **E2E tests** — add tests for `/registry` page and services CRUD
- [ ] **Update `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`** — reflect new navigation structure

---

## Documentation

- [ ] **Update README** — reflect new navigation structure (`/registry` instead of `/agents`)
- [ ] **Update `examples/nginx/monitor.conf`** — add `/registry` location if needed
- [ ] **CHANGELOG v0.2.0** — finalize and tag release

---

## Completed (recently)

- [x] Dynamic routes via `KENARI_ROUTES` env var
- [x] `services` table schema added to DB
- [x] `getAllRoutes()` merges env + DB routes
- [x] Move Grafana/Prometheus/nginx configs to `examples/`
- [x] Slim down root `docker-compose.yml` to core only
- [x] Prometheus + Blackbox Exporter monitoring elearning/library/lab
- [x] Grafana proxy via nginx with `X-WEBAUTH-USER` auth injection
- [x] Grafana WebSocket location in nginx (`/grafana/api/live/`)
- [x] Loki service provisioned (plugin disabled until v0.3)
- [x] Hash chaining for audit log
- [x] Blocked IPs tab in `/console`
- [x] Webhook notifications (`WEBHOOK_URL`)
- [x] Role-based access per proxy route
- [x] Uptime Kuma at `/uptime/` with `UPTIME_KUMA_BASE_PATH` patch
- [x] VISION.md — universal observability ecosystem strategy
