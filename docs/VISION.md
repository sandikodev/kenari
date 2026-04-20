# Kenari — Vision & Long-term Strategy

> This document captures the strategic vision for Kenari as a universal observability
> ecosystem. It is a living document — updated as the project evolves.

---

## The Repositioning

**From:** SSO gateway for monitoring tools (Grafana, Uptime Kuma)

**To:** Universal observability agent ecosystem — edge-first, zero-dependency, multi-platform

The original Kenari was built to solve a specific problem: one login for all monitoring
tools. That problem is solved. But in solving it, we discovered something bigger.

The Kenari CLI agent — a ~2MB Rust binary that runs anywhere and pushes metrics to an
edge gateway — is the real product. The gateway is just the receiver.

**The insight:** If the agent can run on a Raspberry Pi, it can run on a router.
If it can run on a router, it can run on an ESP32. If it compiles to WebAssembly,
it can run in a browser, a Cloudflare Worker, or a Deno Deploy function.
And if it can run everywhere, it can monitor everything.

---

## The Three-Layer Architecture

### Layer 1 — Kenari Gateway (Production-ready)

```
Edge Cloud (Cloudflare Pages / VPS)
├── SvelteKit 5 + Lucia auth
├── Single dashboard for all agents
├── Audit log with hash chaining
├── Brute force protection
├── Telegram + webhook alerts
└── Role-based access control
```

**Positioning:** The "brain" of the system. Receives metrics from all agents,
provides SSO, stores audit trail. Runs at the edge — far from what it monitors.
This is intentional: if the monitored server goes down, the gateway stays up.

**Current state:** Production at `monitor.smauiiyk.sch.id`. 44 E2E tests passing.

---

### Layer 2 — Kenari CLI Agent (In development)

```
Any Host (server, Pi, router, embedded)
├── Rust binary (~2MB, zero runtime deps)
├── Push-only model (no inbound ports)
├── Auto-detect init system (systemd, OpenRC, runit, s6, Dinit, SysV, launchd)
├── kenari doctor --fix (auto-setup)
└── HTTPS push to gateway every N seconds
```

**Current metrics:** CPU, memory, disk, uptime

**Planned expansion (v0.3+):**

#### System-level (HIDS)
- File integrity monitoring (inotify/FSEvents)
- New process detection
- Open port monitoring
- Login event forwarding (PAM integration)

#### Web server log parsing
- **nginx** — access log, error log, rate spike detection
- **Apache** — access log, error log
- **Litespeed** — access log

#### Application runtime metrics
- **PHP** — error log parsing, slow query log, FPM pool stats
- **Node.js / Bun / Deno** — memory, event loop lag, active handles
  (via HTTP endpoint or IPC)
- **Golang** — scrape `/metrics` endpoint (Prometheus-compatible)
- **Python** — process metrics, WSGI/ASGI stats

#### Database metrics
- **MySQL/MariaDB** — slow query log, connection pool, replication lag
- **PostgreSQL** — pg_stat_activity, connection count, query duration
- **Redis** — memory, hit rate, connected clients
- **SQLite** — file size, WAL size (relevant for Turso/libSQL)

**Why Rust for all of this:**
- Single binary, no runtime dependencies
- Cross-compile to any target (ARM, MIPS, RISC-V, x86)
- ~2MB binary vs ~50MB for Node.js agent
- ~2MB RAM idle vs ~50MB for Datadog agent
- Compile to WebAssembly for browser/edge deployment

---

### Layer 3 — Kenari WASM Agent (Vision — v0.5)

```
Web Application (browser / edge runtime)
├── kenari-wasm (Rust → WebAssembly)
├── Runs inside the app, not as external probe
├── Collects: JS errors, performance metrics, user timing
└── Push to Kenari Gateway via HTTPS
```

**Why this matters:**

Current monitoring approaches for web apps are either:
1. **External probes** (Blackbox Exporter, Uptime Kuma) — only see if the URL responds
2. **Heavy APM agents** (Datadog, New Relic) — expensive, complex, vendor lock-in
3. **Browser SDKs** (Sentry, LogRocket) — JavaScript, large bundle size

Kenari WASM would be:
- Compiled from Rust → tiny WASM bundle (~50KB)
- Runs inside the browser or edge runtime
- No external dependencies
- Reports to your own Kenari gateway (not a third-party SaaS)
- Works in Cloudflare Workers, Deno Deploy, Bun edge functions

**Use cases:**
- Monitor SaaS applications from inside the runtime
- Collect real user metrics (Core Web Vitals, JS errors)
- Edge function performance monitoring
- IoT web interfaces

**Technical approach:**
```rust
// kenari-wasm/src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn collect_metrics() -> JsValue {
    // Collect performance.now(), memory, errors
    // Return as JSON for push to gateway
}
```

---

## Language SDKs (v0.4)

For applications that can't run a binary agent, Kenari will provide lightweight
SDK libraries that push metrics directly to the gateway API.

### PHP SDK
```php
// composer require kenari/sdk
$kenari = new Kenari\Client('https://monitor.example.com', 'agent-token');
$kenari->push([
    'php_version' => PHP_VERSION,
    'memory_usage' => memory_get_usage(true),
    'error_count' => $errorCount,
]);
```

**Why PHP first:** Most Indonesian web infrastructure runs PHP (WordPress, Laravel,
SLiMS, Moodle). This is the highest-impact first SDK.

### Node.js / Bun SDK
```javascript
// npm install @kenari/sdk
import { KenariAgent } from '@kenari/sdk';
const agent = new KenariAgent({ gateway: 'https://monitor.example.com', token: '...' });
agent.start(); // auto-collect process metrics, push every 30s
```

### Go SDK
```go
// go get github.com/sandikodev/kenari-go
agent := kenari.NewAgent("https://monitor.example.com", "token")
agent.Start(context.Background())
```

---

## Competitive Positioning

| | Datadog | Grafana + Prometheus | New Relic | **Kenari** |
|--|---------|---------------------|-----------|------------|
| Setup complexity | High | Very High | High | **Low** (`kenari register`) |
| Agent binary size | ~200MB | ~20MB | ~100MB | **~2MB** |
| Memory (idle) | ~200MB | ~50MB | ~150MB | **~2MB** |
| Edge deployment | No | Partial | No | **Native** |
| Embedded systems | No | No | No | **Yes** |
| WASM agent | No | No | No | **Planned** |
| Open source | No | Partial | No | **Full MIT** |
| Self-hosted | Paid | Yes | Paid | **Yes** |
| Multi-language SDK | Yes | Partial | Yes | **Planned** |
| Price | $$$$ | Free (infra cost) | $$$$ | **Free** |

**Kenari is not a Grafana replacement.** Grafana is a visualization layer.
Kenari is an agent ecosystem with a built-in lightweight dashboard.
They can coexist — Kenari agents can push to Prometheus, which Grafana visualizes.

**Kenari's unique position:** The only observability agent that runs natively on
embedded systems, compiles to WebAssembly, and reports to an edge-hosted gateway.

---

## Target Users

### Primary (current)
- Small organizations (schools, clinics, local government, SMEs)
- Self-hosted infrastructure operators
- Indonesian tech community

### Secondary (v0.3-v0.4)
- SaaS developers who want lightweight monitoring
- IoT/embedded system operators
- Edge computing practitioners

### Tertiary (v0.5+)
- Web application developers (WASM agent)
- Multi-tenant SaaS platforms

---

## Roadmap (Updated)

### v0.1 — Gateway Foundation ✅
SSO gateway, proxy routes, audit log, agents dashboard, PWA, CLI basics.

### v0.2 — Security Hardening ✅
IP geolocation, brute force auto-block, hash chaining, webhook notifications,
role-based access, Prometheus + Blackbox monitoring stack.

### v0.3 — kenari-cli HIDS + Log Collection
- File integrity monitoring (inotify/FSEvents)
- nginx/Apache log parsing and forwarding to Loki
- Process monitoring (new process, suspicious names)
- PAM integration for login event forwarding
- PHP error log parsing
- Node.js/Bun process metrics

### v0.4 — Language SDKs
- PHP SDK (`composer require kenari/sdk`)
- Node.js/Bun SDK (`npm install @kenari/sdk`)
- Go SDK (`go get github.com/sandikodev/kenari-go`)
- Python SDK (`pip install kenari`)
- Generic HTTP API documentation for any language

### v0.5 — WASM Agent
- Rust → WebAssembly compilation
- Browser SDK for Core Web Vitals, JS errors
- Cloudflare Workers integration
- Deno Deploy integration
- Bun edge function integration

### v1.0 — Production Ready
- Multi-tenant support
- Helm chart for Kubernetes
- Full SIEM correlation engine
- Threat intelligence feed integration
- Compliance reporting (UU ITE, PDNS)

---

## The Embedded Vision

One of the most compelling aspects of Kenari's architecture is its applicability
to resource-constrained environments.

**Scenario: School network monitoring**
```
School Router (OpenWRT, MIPS)
└── kenari-cli (cross-compiled for MIPS musl)
    └── push metrics → Kenari Gateway (Cloudflare Pages)
        └── Dashboard accessible from anywhere
```

**Scenario: IoT sensor monitoring**
```
Raspberry Pi Zero (ARM6, 512MB RAM)
└── kenari-cli (~2MB binary, ~2MB RAM idle)
    └── push: temperature, humidity, custom sensors
        └── Kenari Gateway → alert if sensor offline
```

**Scenario: ESP32 monitoring (future)**
```
ESP32 (Xtensa LX7, 520KB SRAM)
└── kenari-nano (Rust, no_std, ~50KB)
    └── push: uptime, free heap, WiFi RSSI, custom ADC
        └── Kenari Gateway → alert if device offline
```

The agent runs forever on battery-powered devices. The gateway runs forever on
Cloudflare's edge. Neither needs maintenance.

**"Run live forever"** — this is the promise.

---

## The SaaS Monitoring Vision

For SaaS applications, Kenari provides a different value proposition than
traditional APM tools:

**Traditional APM (Datadog, New Relic):**
- Install agent on server
- Data goes to vendor's cloud
- Pay per host, per metric, per log line
- Vendor lock-in

**Kenari for SaaS:**
- Install kenari-cli on server (system metrics)
- Add SDK to application (app metrics)
- Data goes to YOUR Kenari gateway (self-hosted or Cloudflare Pages)
- Pay nothing (open source)
- No vendor lock-in

**For multi-tenant SaaS platforms:**
```
SaaS Platform
├── kenari-cli on each server → system metrics
├── kenari SDK in application → app metrics
│   ├── request count, error rate, latency
│   ├── database query time
│   └── custom business metrics
└── Kenari Gateway → per-tenant dashboards
```

---

## Why This Matters for Indonesia

Indonesia has thousands of schools, clinics, local government offices, and SMEs
running digital infrastructure with zero monitoring. They can't afford Datadog.
They don't have the expertise to set up Grafana + Prometheus.

Kenari's value proposition for this market:
1. **One command to install:** `curl -fsSL https://kenari.dev/install.sh | sh`
2. **One command to register:** `kenari register`
3. **Zero ongoing maintenance:** agent runs as systemd service, gateway on Cloudflare
4. **Free forever:** MIT license, self-hosted or Cloudflare free tier

This is the same market that Grafana Cloud, Datadog, and New Relic have ignored
because the revenue per customer is too low. Kenari doesn't need revenue per customer
— it's open source infrastructure.

---

## Grafana and Uptime Kuma — Their Place in the Ecosystem

Grafana and Uptime Kuma are **optional integrations**, not core components.

- **Uptime Kuma** — good for teams that want a dedicated uptime monitoring UI.
  Kenari proxies it behind SSO. The Kenari dashboard shows basic health checks,
  Kuma shows detailed incident history.

- **Grafana** — good for teams that need advanced visualization (time-series graphs,
  custom dashboards, alerting rules). Kenari proxies it behind SSO. Prometheus
  collects metrics, Grafana visualizes them.

- **Kenari dashboard** — the lightweight default. No setup required. Shows agent
  metrics, service health, audit log. Sufficient for 90% of use cases.

The goal is not to replace Grafana or Kuma. The goal is to make them accessible
to organizations that couldn't set them up before — by putting them behind a
single authenticated entry point that anyone can deploy in minutes.

---

*This document is maintained alongside the codebase.*
*Last updated: April 20, 2026*
*See also: [ROADMAP.md](./ROADMAP.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [IDS_SIEM_GUIDE.md](./IDS_SIEM_GUIDE.md)*
