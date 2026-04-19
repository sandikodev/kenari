# Kenari — Claude Context

## Project Philosophy
Kenari is an open source SSO monitoring gateway. The core design decisions:

**Why edge-first?** The gateway should run far from what it monitors. If the monitored server goes down, the gateway stays up. This is the "canary in a different mine" principle.

**Why Lucia over better-auth?** better-auth pulled in kysely which has ESM circular dependency issues with Bun's bundler. Lucia v3 is minimal, no circular deps, same library used across the ecosystem.

**Why push model for CLI?** Agents push metrics to gateway — no inbound ports needed on monitored hosts. Works behind NAT, firewall, anywhere with outbound HTTPS.

**Why SQLite/libSQL?** Single-tenant monitoring gateway doesn't need PostgreSQL. Zero infrastructure, zero connection pooling. Same Drizzle schema works for local SQLite and remote Turso.

## Architecture
```
Internet → nginx (TLS) → Kenari Gateway (SvelteKit) → Upstream tools (internal Docker network)
                                    ↑
                         kenari-cli agents (HTTPS push, no inbound ports)
```

## Tech Stack & Rationale
| Layer | Choice | Why |
|-------|--------|-----|
| Framework | SvelteKit 5 | Minimal JS, SSR, file-based routing |
| Auth | Lucia v3 | No circular deps, minimal, session-based |
| OAuth | Arctic | Minimal, native fetch, no transitive deps |
| ORM | Drizzle | Build-time SQL, works with libSQL |
| DB | libSQL/Turso | SQLite-compatible, works local + edge |
| Styling | Tailwind v4 | Zero runtime, Vite plugin |
| CLI | Rust | ~2MB binary, ~2MB RAM, static musl |

## Critical Constraints
- `bun run check` → 0 errors, 0 warnings (pre-commit hook enforced)
- Svelte 5 runes only (`$state`, `$derived`, `$props`) — no Svelte 4 patterns
- `onclick={}` not `on:click={}` — Svelte 5 event syntax
- `$derived()` for values from props, not `const`
- Lazy DB init via `getDb()` — prevents build-time DB connections
- All secrets via `$env/dynamic/private` — never hardcoded

## Key Files
```
src/hooks.server.ts          — Session validation, WebSocket proxy, scheduler init, IP blocking
src/lib/server/auth.ts       — getLucia() with getUserAttributes (email, name, role, avatarUrl)
src/lib/server/db/schema.ts  — Full schema including blockedIps, agentMetrics
src/lib/server/audit.ts      — log(), trackFailedLogin(), isBlocked() with auto-block at 20 failures
src/lib/server/telegram.ts   — alertFailedLoginSpike, alertUpstreamDown/Up, alertNewLogin, alertAgentOffline
src/lib/server/geo.ts        — getCountry(ip) via ip-api.com with in-memory cache
src/lib/server/scheduler.ts  — node-cron: agent offline check every 5min, cleanup failed_logins daily
src/lib/monitor.config.ts    — getRoutes() reads KUMA_URL/GRAFANA_URL from env
```

## Security Model
- Rate limiting: 10 failed logins/min per IP → 429
- Auto-block: 20 failed logins/5min → blocked_ips table, 1 hour
- IP blocking checked in hooks.server.ts on every request
- GitHub OAuth whitelist: GITHUB_ALLOWED_USERS (username or email) + GITHUB_ALLOWED_ORGS
- `/api/test` endpoint: dev-only via `import { dev } from '$app/environment'`
- Audit log: every login, logout, access, admin action with IP + User-Agent

## Development Workflow
```bash
bun run dev          # Dev server (reads .env.local → data/monitor.db)
bun run check        # Must pass before commit
bun run test:e2e     # 44 Playwright tests (separate port 5174, reads .env.test)
bun run db:push      # Schema push to dev DB
```

## E2E Test Architecture
Tests use `/api/test` endpoint (dev-only) for DB seeding/reset instead of direct DB access.
This ensures tests use the same DB instance as the running server.
Test server runs on port 5174 to avoid conflicts with dev server on 5173.

## CLI (Rust) Context
```
cli/src/main.rs      — dotenvy::dotenv().ok() at start, reads cli/.env for dev
cli/src/config.rs    — KENARI_CONFIG env var override for dev/test
cli/src/init.rs      — Detects: systemd, OpenRC, runit, s6, Dinit, SysV, launchd, Windows SCM
cli/src/commands/
  doctor.rs          — Diagnose + --fix flag (escalates sudo only when needed)
  install.rs         — Service install for all init systems
  agent.rs           — start/install/stop/restart/logs
  register.rs        — Interactive wizard with token verification
  onboard.rs         — Shown when `kenari` run with no args
```

## MCP Tools (Svelte)
Always use `list-sections` → `get-documentation` for Svelte 5 / SvelteKit questions.
Use `svelte-autofixer` on every `.svelte` file — it catches Svelte 5 migration issues.
