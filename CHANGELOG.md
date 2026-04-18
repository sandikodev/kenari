# Changelog

All notable changes to Kenari are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Kenari uses [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Planned for v0.2
- Telegram bot notifications
- IP geolocation for login anomaly detection
- Log export UI (CSV/JSON from /console)
- Hash chaining for tamper-evident audit log
- Role-based access per proxy route

---

## [0.1.0] — 2026-04-19

First public release of Kenari. Built in a single session from scratch.

### Gateway

**Authentication**
- Email/password login with Argon2id password hashing
- GitHub OAuth login via Arctic library
- GitHub whitelist by username or email (`GITHUB_ALLOWED_USERS`, `GITHUB_ALLOWED_ORGS`)
- Lucia v3 session management with HttpOnly, Secure, SameSite=Lax cookies
- Rate limiting: 10 failed login attempts per IP per minute → HTTP 429
- Failed login tracking in `failed_logins` table
- First-run setup wizard at `/setup` (disappears after first user created)

**Dashboard (`/`)**
- Real-time health checks for all configured upstream tools
- Response latency display per service
- Auto-refresh every 10 seconds

**Proxy Routes**
- `/uptime/*` → Uptime Kuma with auth header injection
- `/grafana/*` → Grafana with auth proxy header (`X-WEBAUTH-USER`)
- WebSocket upgrade support for Uptime Kuma real-time updates
- Audit log entry on first access per session

**Console (`/console`)**
- User management: list, promote/demote role, remove user
- Session timeline: all events with IP, User-Agent, timestamp
- Threats tab: failed login heatmap by IP (last 24 hours)
- GitHub avatar display

**Agents (`/agents`)**
- Register agents with auto-generated 64-char tokens
- Real-time metrics display: CPU, memory, disk, uptime with progress bars
- Online/offline status (90-second threshold)
- Auto-refresh every 5 seconds

**Status Page (`/status`)**
- Public, no login required
- Service status with latency
- Auto-refresh every 30 seconds
- "Powered by Kenari" footer

**Settings (`/settings`)**
- Change password (with current password verification)
- Delete account (requires typing "DELETE" to confirm)
- GitHub avatar display

**Profile Dropdown**
- Avatar (GitHub photo or initial)
- Role badge
- Links to Status Page, Settings, Console (admin only), GitHub
- Sign out

**PWA**
- Web app manifest with icons (192px, 512px)
- Install prompt (`beforeinstallprompt` API)
- Apple mobile web app meta tags
- `color-scheme: dark` for native form elements

**Mobile**
- Bottom navigation bar (Dashboard, Agents, Status, Admin, Sign out)
- Responsive layout for all pages
- `safe-area-inset-bottom` for notch devices

**Splash Screen**
- Animated bird drop with spring bounce
- Progress bar fill animation
- Fade out after 1.2 seconds

**Security**
- All proxy routes require authentication
- `/status` is the only public route
- `color-scheme: dark` prevents browser from rendering light-mode form elements
- Pre-commit hook: `svelte-check` must pass with 0 errors before every commit

### kenari-cli (Rust)

**Commands**
- `kenari` — onboarding screen, shows config if registered
- `kenari register` — interactive wizard with gateway token verification
- `kenari doctor` — system diagnostics (OS, init system, config, connectivity, metrics, service)
- `kenari doctor --fix` — auto-fix issues, escalates to sudo only when needed
- `kenari status` — print current metrics to stdout
- `kenari push` — one-time metrics push to gateway
- `kenari agent start` — foreground daemon with timestamped output
- `kenari agent install` — install as system service (auto-detect init system)
- `kenari agent stop` — stop system service
- `kenari agent restart` — restart system service
- `kenari agent logs` — tail service logs (journalctl / log file)

**Init System Support**
- systemd — unit file with security hardening (NoNewPrivileges, ProtectSystem)
- OpenRC — init script with rc-update integration
- runit — run script with /var/service symlink
- SysV init — init script with update-rc.d
- launchd (macOS) — LaunchDaemon plist
- Windows SCM — manual instructions

**Metrics Collected**
- CPU usage (global percentage)
- Memory (used/total MB)
- Disk (used/total GB, all mounts)
- System uptime (seconds)

**UX**
- Colored output: ✓ (green), ✗ (red), ⚠ (yellow), → (blue)
- Interactive prompts with defaults
- Token verification before saving config
- Actionable error messages

### Database Schema

- `users` — id, email, name, password_hash, github_id, avatar_url, role, created_at
- `sessions` — id, user_id, expires_at (Lucia-managed)
- `audit_log` — id, user_id, action, detail, ip, user_agent, created_at
- `failed_logins` — id, ip, email, created_at
- `agents` — id, name, token, last_seen, created_at
- `agent_metrics` — id, agent_id, cpu_percent, memory_used_mb, memory_total_mb, disk_used_gb, disk_total_gb, uptime_secs, created_at

### Deployment

- Docker Compose with gateway, Uptime Kuma, Grafana
- Separate Docker networks: `proxy-net` (external, for nginx) + `internal-net` (bridge)
- Grafana auth proxy configuration
- nginx configuration with WebSocket support and security headers
- Let's Encrypt SSL via Certbot
- Edge deployment via Cloudflare Pages (`bun run build:edge`)

### Scripts

- `bun run deploy` — rebuild and redeploy gateway container
- `bun run deploy:all` — rebuild and redeploy all services
- `bun run db:push` — push schema to dev SQLite
- `bun run db:push:prod` — migrate production database inside container
- `bun run db:studio` — open Drizzle Studio for dev database
- `bun run logs` — tail gateway logs
- `bun run logs:all` — tail all service logs
- `scripts/install-cli.sh` — one-liner install script for kenari-cli

### Documentation

- `README.md` — project overview, quick start, architecture diagram, roadmap
- `CONTRIBUTING.md` — development setup, code style, PR process
- `docs/DEPLOYMENT.md` — complete self-hosted deployment guide
- `docs/ARCHITECTURE.md` — technical architecture, technology decisions, data flow
- `docs/SECURITY.md` — threat model, hardening checklist, incident response
- `docs/AGENT.md` — kenari-cli installation and usage guide
- `docs/FORENSICS.md` — audit log forensics, chain of custody, SQL queries
- `docs/ROADMAP.md` — development roadmap v0.1 → v1.0
- `docs/IDS_SIEM_GUIDE.md` — IDS/SIEM concepts for Indonesian OSS community
- `docs/CLI_DESIGN.md` — kenari-cli technical design document
- `docs/GITHUB_OAUTH.md` — GitHub OAuth setup guide

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | SvelteKit | 5.x |
| Auth | Lucia | 3.x |
| Database | libSQL / Turso | — |
| ORM | Drizzle | 0.45.x |
| Styling | Tailwind CSS | 4.x |
| Runtime | Bun | 1.3.x |
| Edge Adapter | @sveltejs/adapter-cloudflare | 7.x |
| Node Adapter | @sveltejs/adapter-node | 5.x |
| OAuth | Arctic | 3.x |
| Password | @node-rs/argon2 | 2.x |
| CLI Language | Rust | 1.75+ |
| CLI HTTP | reqwest | 0.12 |
| CLI Metrics | sysinfo | 0.32 |
| CLI Args | clap | 4.x |

### Why Lucia instead of better-auth

The original implementation used `better-auth`, which pulled in `kysely` as a
dependency. `kysely` has ESM circular dependency issues that caused build failures
with Bun's bundler. Lucia v3 is a minimal auth library with zero circular deps.
See `docs/ARCHITECTURE.md` for full rationale.

---

## [0.0.1] — 2026-04-18 (internal)

Initial scaffolding. SvelteKit project with better-auth (later replaced).
Not publicly released.
