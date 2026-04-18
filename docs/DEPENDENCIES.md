# Kenari — Dependency Strategy

This document defines the dependency decisions for both the gateway (SvelteKit) and
the CLI (Rust), aligned with the roadmap in `docs/ROADMAP.md`. It serves as the
authoritative reference for what to add, when, and why — so contributors don't
introduce unnecessary dependencies and maintainers can make informed decisions.

---

## Table of Contents

1. [Philosophy](#1-philosophy)
2. [Gateway — Current Dependencies](#2-gateway--current-dependencies)
3. [Gateway — Planned Additions](#3-gateway--planned-additions)
4. [Gateway — Explicitly Not Needed](#4-gateway--explicitly-not-needed)
5. [CLI — Current Crates](#5-cli--current-crates)
6. [CLI — Planned Additions](#6-cli--planned-additions)
7. [CLI — Explicitly Not Needed](#7-cli--explicitly-not-needed)
8. [Dependency Evaluation Criteria](#8-dependency-evaluation-criteria)
9. [Adding a New Dependency — Checklist](#9-adding-a-new-dependency--checklist)

---

## 1. Philosophy

**Every dependency is a liability.** It adds:
- Attack surface (supply chain attacks)
- Binary size
- Build time
- Maintenance burden when it breaks or goes unmaintained

Before adding any dependency, ask:
1. Can this be implemented in <50 lines without the dependency?
2. Is this dependency actively maintained?
3. Does it have a history of security vulnerabilities?
4. Does it pull in transitive dependencies that conflict with existing ones?

If the answer to (1) is yes, implement it yourself.
If the answer to (2) or (3) is no, find an alternative.

---

## 2. Gateway — Current Dependencies

### Production

| Package | Version | Purpose | Why This One |
|---------|---------|---------|--------------|
| `@sveltejs/kit` | 2.x | Framework | — |
| `svelte` | 5.x | UI framework | Runes system, zero runtime overhead |
| `lucia` | 3.x | Session management | Minimal, no circular deps (replaced better-auth) |
| `@lucia-auth/adapter-drizzle` | 1.x | Lucia ↔ Drizzle bridge | Official adapter |
| `@node-rs/argon2` | 2.x | Password hashing | Native Rust binding, Argon2id, fastest option |
| `arctic` | 3.x | OAuth 2.0 | Minimal, uses native fetch, no transitive deps |
| `drizzle-orm` | 0.45.x | ORM | Build-time SQL, no reflection, works with libSQL |
| `@libsql/client` | 0.17.x | Database client | Official libSQL/Turso client |
| `@sveltejs/adapter-node` | 5.x | Node.js deployment | — |
| `@sveltejs/adapter-cloudflare` | 7.x | Edge deployment | — |
| `tailwindcss` | 4.x | Styling | Zero runtime, Vite plugin |
| `nanoid` | 5.x | ID generation | Smaller than uuid, URL-safe |

### Dev Only

| Package | Purpose |
|---------|---------|
| `drizzle-kit` | Schema push, migrations, studio |
| `svelte-check` | TypeScript + Svelte diagnostics |
| `prettier` + `prettier-plugin-svelte` | Code formatting |
| `eslint` + `eslint-plugin-svelte` | Linting |
| `vite` | Build tool |
| `playwright` | E2E testing (not yet used) |
| `vitest` | Unit testing (not yet used) |

---

## 3. Gateway — Planned Additions

### v0.1.x — Immediate

#### `zod` ^3

**Why:** The `/api/agent/push` endpoint accepts data from external untrusted sources
(kenari-cli agents). Currently there is zero runtime validation — if an agent sends
a malformed payload, the gateway will crash or insert garbage into the database.

**Scope:** Only `/api/agent/push`. Do not add Zod to form handlers or internal
server functions — TypeScript is sufficient there.

**Implementation:**

```typescript
// src/routes/api/agent/push/+server.ts
import { z } from 'zod';

const PushSchema = z.object({
  host_id: z.string().min(1).max(100),
  timestamp: z.number().int().positive(),
  metrics: z.object({
    cpu_percent:     z.number().min(0).max(100),
    memory_used_mb:  z.number().nonnegative(),
    memory_total_mb: z.number().positive(),
    disk_used_gb:    z.number().nonnegative(),
    disk_total_gb:   z.number().positive(),
    uptime_secs:     z.number().int().nonnegative(),
    // Allow extra fields for future CLI versions (forward compatibility)
  }).passthrough()
});

// In handler:
const result = PushSchema.safeParse(await request.json());
if (!result.success) error(400, result.error.issues[0].message);
const { metrics: m } = result.data;
```

**Tradeoffs:**
- ✅ Runtime type safety for external data
- ✅ Clear error messages for debugging CLI issues
- ✅ Foundation for future OpenAPI schema generation
- ✅ `passthrough()` ensures forward compatibility when CLI adds new metrics
- ❌ ~13KB added to server bundle (acceptable — server-only, not client)
- ❌ One more dependency to maintain

**Install:** `bun add zod`

---

### v0.2 — Security Hardening

#### `node-cron` ^3 (or native `setInterval` in a SvelteKit hook)

**Why:** Several v0.2 features require scheduled background tasks:
- Check agent `last_seen` every 5 minutes → send Telegram alert if offline
- Clean up `failed_logins` older than 24 hours (prevent unbounded table growth)
- Send daily security digest via Telegram

**Alternative considered:** SvelteKit does not have a built-in scheduler.
`node-cron` is the standard Node.js solution. Alternative: use a simple
`setInterval` in `hooks.server.ts` — works but less readable for complex schedules.

**Implementation location:** `src/lib/server/scheduler.ts`, initialized in
`hooks.server.ts` on first request.

```typescript
// src/lib/server/scheduler.ts
import cron from 'node-cron';
import { checkAgentsOffline } from './agents';
import { cleanupFailedLogins } from './audit';

let initialized = false;

export function initScheduler() {
  if (initialized) return;
  initialized = true;

  // Check agent status every 5 minutes
  cron.schedule('*/5 * * * *', checkAgentsOffline);

  // Clean up old failed logins daily at 3am
  cron.schedule('0 3 * * *', cleanupFailedLogins);
}
```

**Tradeoffs:**
- ✅ Readable cron expressions
- ✅ Handles timezone correctly
- ❌ Does not persist across restarts (acceptable — tasks are idempotent)
- ❌ Not suitable for distributed/edge deployment (Cloudflare Pages has no persistent process)
  → For edge: use Cloudflare Cron Triggers instead

**Install:** `bun add node-cron` + `bun add -d @types/node-cron`

---

#### `geoip-lite` ^1 (or `@maxmind/geoip2-node`)

**Why:** IP geolocation for login anomaly detection (v0.2 roadmap item).
Flag logins from unexpected countries. Show country in audit log.

**Comparison:**

| | `geoip-lite` | `@maxmind/geoip2-node` |
|--|--|--|
| Database | Bundled (auto-updated via npm) | Separate download, MaxMind account required |
| Accuracy | Good (city-level) | Excellent (city-level) |
| Bundle size | ~30MB (database) | ~50MB (database) |
| License | MIT | MaxMind EULA |
| Maintenance | Community | MaxMind (official) |
| Free tier | Yes | Yes (GeoLite2) |

**Recommendation:** Start with `geoip-lite` for simplicity. Migrate to MaxMind
if accuracy becomes important.

**Implementation:**

```typescript
// src/lib/server/geo.ts
import geoip from 'geoip-lite';

export function getCountry(ip: string): string | null {
  const geo = geoip.lookup(ip);
  return geo?.country ?? null;
}
```

**Tradeoffs:**
- ✅ No external API calls (offline lookup)
- ✅ Fast (~1ms per lookup)
- ❌ Database needs periodic updates (`npm run geoip-update`)
- ❌ ~30MB added to Docker image
- ❌ Not available on Cloudflare Pages (no filesystem) → use Cloudflare's built-in CF-IPCountry header instead

**Install:** `bun add geoip-lite` + `bun add -d @types/geoip-lite`

**Note for edge deployment:** Cloudflare automatically adds `CF-IPCountry` header
to every request. No library needed on edge — just read `request.headers.get('CF-IPCountry')`.

---

### v0.3+ — Future

#### OpenAPI / `@hono/zod-openapi` (if API grows)

If Kenari's agent API grows significantly (more endpoints, versioning), consider
generating an OpenAPI spec from Zod schemas. This enables:
- Auto-generated API documentation
- Client SDK generation for CLI
- API testing with tools like Bruno/Insomnia

Not needed now. Revisit when `/api/agent/*` has more than 3 endpoints.

---

## 4. Gateway — Explicitly Not Needed

These are dependencies that might seem useful but should NOT be added:

| Package | Why Not |
|---------|---------|
| `axios` | Native `fetch` is sufficient. Axios adds 40KB for no benefit. |
| `react-query` / `@tanstack/query` | SvelteKit's `invalidateAll()` handles data freshness. |
| `pinia` / `zustand` | Svelte 5 runes (`$state`, `$derived`) replace external state managers. |
| `socket.io` | WebSocket proxying is handled at nginx level. No need for a WS library in the gateway. |
| `passport` | Lucia + Arctic already handle auth. Passport is a Node.js pattern, not SvelteKit. |
| `express` / `fastify` | SvelteKit IS the server framework. |
| `winston` / `pino` | SvelteKit adapter-node logs to stdout automatically. Docker captures it. |
| `helmet` | Security headers belong in nginx config, not application code. |
| `cors` | SvelteKit handles CORS via `hooks.server.ts`. |
| `dotenv` | SvelteKit's `$env/dynamic/private` handles env vars natively. |
| `prisma` | Drizzle is already chosen and working. Prisma would be a full migration. |
| `better-auth` | Replaced by Lucia due to kysely circular dependency issues. Do not re-add. |

---

## 5. CLI — Current Crates

| Crate | Version | Purpose | Notes |
|-------|---------|---------|-------|
| `tokio` | 1 | Async runtime | `features = ["full"]` — consider trimming to `["rt-multi-thread", "time", "macros"]` |
| `clap` | 4 | Argument parsing | `features = ["derive"]` |
| `serde` | 1 | Serialization | `features = ["derive"]` |
| `serde_json` | 1 | JSON | — |
| `reqwest` | 0.12 | HTTP client | Currently uses `native-tls` — should switch to `rustls-tls` |
| `sysinfo` | 0.32 | System metrics | Cross-platform, actively maintained |
| `toml` | 0.8 | Config file parsing | — |
| `dirs` | 5 | Platform config paths | `~/.config/kenari/` on Linux, `%APPDATA%\kenari\` on Windows |
| `anyhow` | 1 | Error handling | Ergonomic for CLI, not for libraries |

---

## 6. CLI — Planned Additions

### v0.1.x — Immediate

#### Switch `reqwest` to `rustls-tls`

**Why:** The current `reqwest` build uses `native-tls` which depends on OpenSSL.
This breaks musl static builds — the primary target for cross-compilation.

```toml
# Cargo.toml — change this:
reqwest = { version = "0.12", features = ["json"] }

# To this:
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
```

**Impact:**
- ✅ Enables fully static musl binaries (no OpenSSL dependency)
- ✅ Smaller binary (~500KB reduction)
- ✅ Faster cross-compilation (no need to cross-compile OpenSSL)
- ✅ Pure Rust TLS — no C FFI
- ⚠️ Some TLS edge cases differ from OpenSSL (not relevant for Kenari's use case)

**This should be done before the first release.**

---

#### `colored` ^2

**Why:** Currently `ui.rs` uses raw ANSI escape codes:
```rust
println!("  \x1b[32m✓\x1b[0m {}", msg);  // hard to read, hard to maintain
```

With `colored`:
```rust
println!("  {} {}", "✓".green(), msg);    // readable, maintainable
```

`colored` also automatically disables colors when output is piped (not a TTY),
which is important for CI/CD environments and log parsing.

**Tradeoffs:**
- ✅ Readable code
- ✅ Auto-detects TTY (disables colors in pipes/CI)
- ✅ Respects `NO_COLOR` environment variable (standard)
- ❌ +50KB binary size (negligible)

**Install:** Add to `Cargo.toml`: `colored = "2"`

---

#### `clap_complete` ^4

**Why:** Shell completions dramatically improve CLI UX for power users.
Generated from the existing `clap` definitions — zero maintenance overhead.

```rust
// kenari completions bash  → paste into ~/.bashrc
// kenari completions zsh   → paste into ~/.zshrc
// kenari completions fish  → auto-installed to ~/.config/fish/completions/
```

**Implementation:**

```rust
// Add to Commands enum in main.rs:
Completions {
    #[arg(value_enum)]
    shell: clap_complete::Shell,
},

// Handler:
Commands::Completions { shell } => {
    clap_complete::generate(shell, &mut Cli::command(), "kenari", &mut std::io::stdout());
}
```

**Tradeoffs:**
- ✅ Zero maintenance — generated from existing clap definitions
- ✅ Supports bash, zsh, fish, PowerShell, elvish
- ✅ Same crate family as clap (no new author to trust)
- ❌ +100KB binary size (negligible)

**Install:** Add to `Cargo.toml`: `clap_complete = "4"`

---

### v0.2 — Security Hardening

#### `rustls` (via reqwest feature flag — already covered above)

No additional crate needed. Just the feature flag change.

---

### v0.3 — HIDS

#### `notify` ^6

**Why:** File integrity monitoring requires watching filesystem events in real-time.
Without `notify`, the only option is polling — checking file hashes every N seconds.
Polling is inefficient (CPU overhead) and slow (events detected late).

`notify` uses OS-native APIs:
- Linux: `inotify`
- macOS: `FSEvents`
- Windows: `ReadDirectoryChangesW`
- Fallback: polling (for platforms without native support)

**Implementation:**

```rust
// src/commands/hids.rs
use notify::{Watcher, RecursiveMode, Event, EventKind};

pub async fn watch(paths: Vec<String>) -> anyhow::Result<()> {
    let (tx, rx) = std::sync::mpsc::channel();
    let mut watcher = notify::recommended_watcher(tx)?;

    for path in &paths {
        watcher.watch(path.as_ref(), RecursiveMode::NonRecursive)?;
    }

    for event in rx {
        match event {
            Ok(Event { kind: EventKind::Modify(_), paths, .. }) => {
                // Hash the file, compare with baseline, push event to gateway
            }
            _ => {}
        }
    }
    Ok(())
}
```

**Tradeoffs:**
- ✅ OS-native efficiency (inotify uses ~0% CPU when idle)
- ✅ Sub-second event detection
- ✅ Cross-platform
- ❌ +500KB binary size
- ❌ Requires baseline creation before monitoring is useful
- ❌ High-frequency directories (logs, tmp) can flood events — need filtering

**Install:** Add to `Cargo.toml`: `notify = "6"`

---

#### `indicatif` ^0.17

**Why:** Long-running operations in `kenari doctor --fix` and `kenari hids baseline`
need visual feedback. Currently we print dots (`print!(".")`) which is primitive.

```rust
// kenari hids baseline — hashing thousands of files
let pb = ProgressBar::new(file_count);
pb.set_style(ProgressStyle::default_bar()
    .template("{spinner} [{bar:40}] {pos}/{len} {msg}")?);

for file in files {
    pb.set_message(file.display().to_string());
    // hash file...
    pb.inc(1);
}
pb.finish_with_message("Baseline created");
```

**Tradeoffs:**
- ✅ Professional UX for long operations
- ✅ Automatically hides when output is not a TTY
- ✅ Supports spinners, progress bars, ETAs
- ❌ +200KB binary size
- ❌ Only useful for interactive operations — not for daemon mode

**Install:** Add to `Cargo.toml`: `indicatif = "0.17"`

---

#### `sha2` ^0.10

**Why:** File integrity monitoring requires hashing files. `sha2` provides
SHA-256 implementation in pure Rust, part of the RustCrypto project.

```rust
use sha2::{Sha256, Digest};

fn hash_file(path: &Path) -> anyhow::Result<String> {
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher)?;
    Ok(format!("{:x}", hasher.finalize()))
}
```

**Tradeoffs:**
- ✅ Pure Rust, no C dependencies
- ✅ Part of RustCrypto — well-audited
- ✅ Streaming API (handles large files without loading into memory)
- ✅ Tiny (+50KB)
- ❌ None significant

**Install:** Add to `Cargo.toml`: `sha2 = "0.10"`

---

#### `syslog` ^6 (optional, enterprise feature)

**Why:** Forward HIDS events to external syslog server for integration with
Wazuh, Graylog, Splunk, or any SIEM that accepts syslog.

```rust
use syslog::{Facility, Formatter3164, Logger};

fn send_syslog(message: &str) -> anyhow::Result<()> {
    let formatter = Formatter3164 {
        facility: Facility::LOG_DAEMON,
        hostname: None,
        process: "kenari-agent".to_string(),
        pid: std::process::id(),
    };
    let mut writer = syslog::unix(formatter)?;
    writer.err(message)?;
    Ok(())
}
```

**Tradeoffs:**
- ✅ Standard protocol — works with any SIEM
- ✅ Enables Kenari to be part of larger security ecosystems
- ❌ +100KB binary
- ❌ Only useful for enterprise deployments with existing SIEM
- ❌ Syslog is UDP by default — no delivery guarantee

**Recommendation:** Make this optional via a compile-time feature flag:
```toml
[features]
syslog = ["dep:syslog"]
```

---

### v0.4+ — Future Consideration

#### `tui-rs` / `ratatui` (not planned, just documented)

Terminal UI for `kenari tui` — a live dashboard in the terminal like `htop`.
Would show real-time metrics from all agents in a terminal interface.

**Not planned** because:
- The web dashboard already serves this purpose
- Adds significant complexity (~2MB binary increase)
- Limited use case (requires terminal access to the machine running kenari-cli)

Revisit if there is significant community demand.

---

#### `prometheus` client (not planned)

Expose a `/metrics` endpoint in Prometheus format so existing Prometheus scrapers
can collect Kenari agent data.

**Not planned** because:
- Changes the model from push to pull (contradicts Kenari's design)
- Requires opening an inbound port on monitored hosts
- Prometheus already has its own agent (node_exporter)

If someone wants Prometheus integration, the right approach is to have the
gateway expose a Prometheus endpoint that aggregates all agent metrics.

---

## 7. CLI — Explicitly Not Needed

| Crate | Why Not |
|-------|---------|
| `log` + `env_logger` | kenari-cli is a CLI tool, not a library. `println!` and `eprintln!` are sufficient. Add structured logging only if daemon mode requires it. |
| `tracing` | Same as above. Overkill for current scope. |
| `async-std` | `tokio` is already chosen. Two async runtimes in one binary is a disaster. |
| `actix-web` / `axum` | kenari-cli does not serve HTTP. It only makes HTTP requests. |
| `diesel` | No database in the CLI. Config is TOML, metrics are pushed via HTTP. |
| `openssl` (direct) | Use `rustls` via reqwest feature flag instead. |
| `nix` | Only needed for low-level Unix syscalls. `sysinfo` abstracts this away. Add only if sysinfo is insufficient for a specific metric. |
| `libc` | Same as `nix`. |
| `crossbeam` | `tokio` channels are sufficient for current concurrency needs. |
| `rayon` | No CPU-intensive parallel workloads in current scope. |

---

## 8. Dependency Evaluation Criteria

When evaluating a new dependency, score it on these criteria:

### For npm packages (gateway)

```
1. Weekly downloads > 100k?          (popularity = community support)
2. Last publish < 6 months ago?      (actively maintained)
3. Zero known CVEs in last 2 years?  (security history)
4. Bundle size < 50KB (client-side)? (performance)
5. TypeScript types included?        (developer experience)
6. Can be tree-shaken?               (only import what you use)
```

Score 5/6 or higher to proceed. Score 4/6 requires justification.

### For Rust crates

```
1. crates.io downloads > 1M total?   (popularity)
2. Last release < 6 months ago?      (actively maintained)
3. No `unsafe` or justified `unsafe`?(safety)
4. Part of a trusted org?            (RustCrypto, tokio-rs, serde-rs, etc.)
5. Binary size increase < 500KB?     (for non-optional features)
6. No duplicate functionality?       (don't add if existing crate covers it)
```

Score 5/6 or higher to proceed.

---

## 9. Adding a New Dependency — Checklist

Before opening a PR that adds a new dependency:

**Gateway (npm):**
- [ ] Checked `npm audit` — no known vulnerabilities
- [ ] Checked bundle size impact with `bun run build` before and after
- [ ] Added to this document under the appropriate section
- [ ] If server-only: confirmed it's in `dependencies`, not `devDependencies`
- [ ] If client-side: confirmed it's tree-shakeable

**CLI (Rust):**
- [ ] Checked `cargo audit` — no known vulnerabilities
- [ ] Checked binary size impact with `cargo build --release` before and after
- [ ] Added to this document under the appropriate section
- [ ] If optional feature: added as `[features]` in `Cargo.toml`
- [ ] Confirmed it compiles for `x86_64-unknown-linux-musl` (primary target)
- [ ] Confirmed it compiles for `aarch64-unknown-linux-musl` (ARM target)

**Both:**
- [ ] The functionality cannot be implemented in <50 lines without the dependency
- [ ] The dependency is documented in this file with rationale and tradeoffs
- [ ] The roadmap version that requires this dependency is noted
