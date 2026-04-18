<div align="center">

<img src="https://raw.githubusercontent.com/sandikodev/kenari/main/static/favicon.svg" width="80" alt="Kenari">

# Kenari

**A canary for your monitoring gateway.**

*Like the canary that warned miners of danger, Kenari watches your infrastructure and alerts you before things go wrong.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Built with SvelteKit](https://img.shields.io/badge/Built%20with-SvelteKit-FF3E00?logo=svelte)](https://kit.svelte.dev)
[![Deploy to Cloudflare](https://img.shields.io/badge/Deploy%20to-Cloudflare-F38020?logo=cloudflare)](https://pages.cloudflare.com)

[Live Demo](https://kenari.sandikodev.com) · [Documentation](./docs) · [Roadmap](#roadmap)

</div>

---

## What is Kenari?

Kenari is a **self-hosted SSO gateway** for your monitoring tools. Instead of logging into Grafana, Uptime Kuma, and other dashboards separately — login once to Kenari and access everything from a single, beautiful interface.

```
your-domain.com/          → Kenari Dashboard (login once)
your-domain.com/uptime    → Uptime Kuma  (auto-authenticated)
your-domain.com/grafana   → Grafana      (auto-authenticated)
your-domain.com/custom    → Any tool     (you configure it)
```

**Designed for edge deployment** — run Kenari on Cloudflare Pages/Workers, far away from the infrastructure it monitors. Because a canary that lives in the mine isn't much use.

---

## Features

- 🔐 **Single Sign-On** — one login, all your monitoring tools
- 🌍 **Edge-first** — deploy on Cloudflare Pages, Vercel, or any edge runtime
- 🔌 **Config-driven** — add monitoring routes without touching code
- 🟢 **Health checks** — real-time upstream status on your dashboard
- 🦀 **Kenari CLI** *(coming soon)* — install on monitored hosts for deep metrics
- 🔑 **GitHub OAuth** — team login via GitHub organizations
- 📊 **Audit log** — who accessed what, when
- 🌙 **Dark mode** — because monitoring at 3am

---

## Quick Start

### Deploy to Cloudflare Pages (recommended)

```bash
# 1. Fork this repo
# 2. Connect to Cloudflare Pages
# 3. Set environment variables in CF dashboard
# 4. Deploy
```

### Self-hosted with Docker

```bash
git clone https://github.com/sandikodev/kenari
cd kenari
cp .env.example .env.production
# Fill in .env.production
docker compose up -d
```

### Local Development

```bash
git clone https://github.com/sandikodev/kenari
cd kenari
bun install
cp .env.example .env.local
# Fill in .env.local
bun run db:push
bun run dev
```

---

## Configuration

Add monitoring routes in `src/lib/monitor.config.ts`:

```typescript
export function getRoutes(): MonitorRoute[] {
  return [
    {
      id: 'uptime-kuma',
      name: 'Uptime Kuma',
      icon: '🟢',
      description: 'Service uptime monitoring',
      proxyPath: '/uptime',
      upstreamUrl: process.env.KUMA_URL,
      authHeader: { 'X-Kuma-Token': process.env.KUMA_API_TOKEN }
    },
    {
      id: 'grafana',
      name: 'Grafana',
      icon: '📊',
      description: 'Metrics & dashboards',
      proxyPath: '/grafana',
      upstreamUrl: process.env.GRAFANA_URL,
      authHeader: { 'X-WEBAUTH-USER': 'admin' }
    }
  ];
}
```

---

## Deployment Targets

| Target | Command | Database |
|--------|---------|----------|
| **Cloudflare Pages** | `bun run build:edge` | Turso (remote libSQL) |
| **Docker / VPS** | `bun run build:node` | SQLite (local file) |
| **Development** | `bun run dev` | SQLite (local file) |

---

## Roadmap

### v0.1 — Gateway (current)
- [x] SvelteKit + Lucia auth
- [x] Proxy routes with auth injection
- [x] Dashboard with health checks
- [x] Edge + self-hosted deployment
- [ ] GitHub OAuth
- [ ] First user setup wizard
- [ ] Docker Compose example

### v0.2 — Polish
- [ ] Public status page (no login required)
- [ ] Audit log
- [ ] Role-based access (admin / viewer)
- [ ] Notification on upstream down (Telegram / email)
- [ ] WebSocket proxy support

### v0.3 — Kenari CLI 🦀
> A lightweight agent installed on monitored hosts.
> Sends metrics to Kenari without exposing ports.

```bash
# Install on monitored host
curl -fsSL https://kenari.dev/install.sh | sh

# Register with your Kenari instance
kenari register --gateway https://monitor.yourdomain.com --token xxx

# Start agent
kenari agent start
```

**CLI Design Decisions:**
- Written in **Rust** — single binary, zero dependencies, minimal resource usage
- Communicates via **HTTPS polling** or **WebSocket** to Kenari gateway
- Collects: CPU, memory, disk, network, custom metrics via plugins
- No inbound ports required on monitored host

### v1.0 — Production Ready
- [ ] Kenari CLI stable release
- [ ] Plugin system for custom metrics
- [ ] Multi-tenant support
- [ ] Helm chart for Kubernetes

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Edge (Cloudflare)                   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              Kenari Gateway                  │   │
│  │         (SvelteKit + Lucia Auth)             │   │
│  │                                              │   │
│  │  /uptime  ──proxy──▶  Uptime Kuma           │   │
│  │  /grafana ──proxy──▶  Grafana               │   │
│  │  /custom  ──proxy──▶  Any Tool              │   │
│  └──────────────────────────────────────────────┘   │
│                        │                            │
│                   Turso DB                          │
│              (sessions + users)                     │
└─────────────────────────────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
    ┌─────────────────┐   ┌─────────────────┐
    │   Your Server   │   │   Your Server   │
    │  Uptime Kuma    │   │    Grafana      │
    │  kenari-cli     │   │  kenari-cli     │
    └─────────────────┘   └─────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 5 |
| Auth | Lucia v3 |
| Database | libSQL / Turso |
| ORM | Drizzle |
| Styling | Tailwind CSS v4 |
| Edge Adapter | Cloudflare Pages |
| Node Adapter | @sveltejs/adapter-node |
| CLI (planned) | Rust |

---

## Contributing

Kenari is open source and welcomes contributions.

```bash
git clone https://github.com/sandikodev/kenari
cd kenari
bun install
bun run dev
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Why "Kenari"?

*Kenari* is the Indonesian word for canary. In mining history, canaries were used as early warning systems — their sensitivity to toxic gases made them the first to detect danger, giving miners time to escape.

Kenari does the same for your infrastructure: it watches everything from a safe distance (edge deployment), and warns you the moment something goes wrong.

Built with ❤️ in Yogyakarta, Indonesia.

---

## License

MIT © [sandikodev](https://github.com/sandikodev)
