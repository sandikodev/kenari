# Kenari — Gemini Context

## What is Kenari?
Open source SSO monitoring gateway. Single login → access Grafana, Uptime Kuma, and any monitoring tool. Deploy on Cloudflare Pages (edge) or Docker (self-hosted).

## Quick Reference

### Stack
```
Gateway:  SvelteKit 5 + Lucia v3 + Drizzle + libSQL + Tailwind v4 + Bun
CLI:      Rust (tokio + clap + sysinfo + reqwest/rustls + colored + dotenvy)
Deploy:   Docker Compose (self-hosted) or Cloudflare Pages (edge)
DB:       SQLite local (dev/prod) or Turso remote (edge)
```

### Non-negotiable Rules
```
✓ bun run check → 0 errors, 0 warnings (pre-commit hook)
✓ Svelte 5 runes: $state, $derived, $props, $effect
✓ onclick={} not on:click={} (Svelte 5 event syntax)
✓ $derived() for prop-derived values, not const
✓ getDb() lazy init — never top-level DB import
✓ $env/dynamic/private for all secrets
✓ cargo build with 0 errors, 0 warnings for CLI
```

### Routes Map
```
/              Dashboard (health checks, non-blocking cache)
/login         Email/password + GitHub OAuth
/setup         First-run wizard (disappears after first user)
/agents        Agent metrics (5s polling, smooth transitions)
/status        Public status page (no auth, 30s polling)
/console       Admin: users, timeline, threats, blocked IPs
/settings      User: password, sessions, delete account
/uptime/*      Proxy → Uptime Kuma (WebSocket supported)
/grafana/*     Proxy → Grafana (auth proxy header)
/auth/github   GitHub OAuth initiation
/api/agent/push     Receive metrics from kenari-cli (Zod validated)
/api/agent/register Admin: create agent token
/api/auth/check     nginx auth_request endpoint (200/401)
/api/export         Audit log download (JSON/CSV)
/api/test           Dev-only: DB reset/seed for E2E
```

### Schema Summary
```typescript
users         { id, email, name, passwordHash?, githubId?, avatarUrl?, role, createdAt }
sessions      { id, userId, expiresAt }
auditLog      { id, userId?, action, detail?, ip?, userAgent?, createdAt }
failedLogins  { id, ip, email?, createdAt }
blockedIps    { ip, reason, blockedAt, expiresAt? }
agents        { id, name, token, lastSeen?, createdAt }
agentMetrics  { id, agentId, cpuPercent, memoryUsedMb, memoryTotalMb, diskUsedGb, diskTotalGb, uptimeSecs, createdAt }
```

### Environment Variables
```bash
ORIGIN                   # https://monitor.yourdomain.com
AUTH_SECRET              # openssl rand -hex 32
DATABASE_URL             # file:./data/monitor.db or libsql://...turso.io
DATABASE_AUTH_TOKEN      # Turso only
GITHUB_CLIENT_ID/SECRET  # GitHub OAuth app
GITHUB_ALLOWED_USERS     # comma-separated usernames or emails
GITHUB_ALLOWED_ORGS      # comma-separated GitHub org names
KUMA_URL                 # http://kenari-kuma:3001 (Docker internal)
GRAFANA_URL              # http://kenari-grafana:3000 (Docker internal)
TELEGRAM_BOT_TOKEN       # optional
TELEGRAM_CHAT_ID         # optional
```

### Common Tasks
```bash
# Dev
bun run dev              # Start dev server (port 5173)
bun run check            # Type check
bun run db:push          # Push schema to data/monitor.db
bun run test:e2e         # Run 44 E2E tests (port 5174)

# Production
bash scripts/deploy.sh   # Build + redeploy gateway
bash scripts/db-migrate-prod.sh  # Migrate production DB

# CLI dev
cd cli
cargo run -- agent start          # Run with cli/.env (KENARI_CONFIG)
cargo watch -x 'run -- doctor'    # Auto-reload on change
```

### Svelte 5 Patterns
```svelte
<!-- Props -->
<script lang="ts">
  let { data }: { data: PageData } = $props();
  const user = $derived(data.user as unknown as { name: string });
  let count = $state(0);
</script>

<!-- Events -->
<button onclick={() => count++}>Click</button>

<!-- NOT these (Svelte 4) -->
<!-- export let data -->
<!-- $: derived = data.value -->
<!-- on:click={handler} -->
```

## MCP Tools (Svelte)
- `list-sections` → discover available Svelte 5 / SvelteKit docs
- `get-documentation` → fetch specific sections
- `svelte-autofixer` → validate `.svelte` files (use before every response with Svelte code)
- `playground-link` → only when user explicitly asks
