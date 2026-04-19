# Kenari — Agent Instructions

## Identity
You are working on **Kenari**, an open source SSO monitoring gateway built with SvelteKit 5, Lucia auth, Drizzle ORM, and a Rust CLI agent.

## Critical Rules
1. `bun run check` MUST pass 0 errors, 0 warnings before any commit — enforced by pre-commit hook
2. Svelte 5 runes ONLY: `$state`, `$derived`, `$props`, `$effect` — never `$:` or `export let`
3. Event syntax: `onclick={}` NOT `on:click={}` — Svelte 5 breaking change
4. `$derived()` for values from props, NOT `const`
5. Never import server-only modules in `.svelte` files
6. All DB access via `getDb()` lazy init — never top-level DB connections
7. Never hardcode secrets — all via `$env/dynamic/private`
8. `bun run db:push` for schema changes in dev, `bun run db:push:prod` for production

## Stack
- SvelteKit 5 + Svelte 5 runes
- Lucia v3 (auth) + Arctic (GitHub OAuth)
- Drizzle ORM + libSQL/Turso
- Tailwind CSS v4
- Bun runtime
- Rust CLI (kenari-cli) with tokio, clap, sysinfo, reqwest/rustls

## File Structure
```
src/lib/server/     — Server-only: auth, db, audit, geo, scheduler, telegram
src/lib/components/ — AppShell.svelte, InstallPrompt.svelte
src/routes/         — SvelteKit routes
  +page.server.ts   — Load functions (server-side only)
  +server.ts        — API endpoints
  +page.svelte      — UI components
cli/src/            — Rust CLI agent
  main.rs           — CLI entry, dotenvy::dotenv().ok() at start
  commands/         — register, agent, doctor, push, status, onboard, install
  config.rs         — KENARI_CONFIG env var support
  init.rs           — Init system detection (systemd, OpenRC, runit, s6, Dinit, SysV, launchd)
```

## Database Schema (Drizzle)
```typescript
users         — id, email, name, passwordHash, githubId, avatarUrl, role, createdAt
sessions      — id, userId, expiresAt
auditLog      — id, userId, action, detail, ip, userAgent, createdAt
failedLogins  — id, ip, email, createdAt
blockedIps    — ip, reason, blockedAt, expiresAt
agents        — id, name, token, lastSeen, createdAt
agentMetrics  — id, agentId, cpuPercent, memoryUsedMb, memoryTotalMb, diskUsedGb, diskTotalGb, uptimeSecs, createdAt
```

## Key Patterns
```typescript
// ✅ Correct — lazy DB init
import { getDb } from '$lib/server/db';
export const load = async () => { const db = getDb(); ... }

// ✅ Correct — Svelte 5 props
let { data }: { data: PageData } = $props();
const user = $derived(data.user as unknown as { name: string; role: string });

// ✅ Correct — event handler
<button onclick={() => doSomething()}>

// ❌ Wrong — top-level DB
import { db } from '$lib/server/db'; // breaks build

// ❌ Wrong — Svelte 4 syntax
export let data; // use $props()
on:click={handler} // use onclick={handler}
```

## Dev Commands
```bash
bun run dev          # Start dev server
bun run check        # Type check (must pass before commit)
bun run build        # Production build
bun run test:e2e     # Run 44 Playwright E2E tests
bun run db:push      # Push schema to dev DB (data/monitor.db)
bun run db:push:prod # Migrate production DB inside container
bun run logs         # Tail production gateway logs

# CLI development
cd cli && cargo run -- agent start   # Run agent (reads cli/.env)
cd cli && cargo watch -x 'run -- agent start'  # Auto-reload
```

## MCP Tools (Svelte)
Use `list-sections` first, then `get-documentation` for relevant sections.
Use `svelte-autofixer` on ALL `.svelte` files before finalizing.
