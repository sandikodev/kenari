# Kenari Roadmap

This document describes the planned development trajectory for Kenari.
It is a living document — priorities may shift based on community feedback.

---

## Guiding Principles

1. **Security by default** — every feature must not weaken the security posture
2. **Minimal surface** — add features only when they provide clear value
3. **Edge-first** — features must work on Cloudflare Pages, not just self-hosted
4. **Community-driven** — the roadmap is shaped by real use cases, not speculation
5. **Open source forever** — Kenari will never have a paid tier for core features

---

## v0.1 — Gateway Foundation ✅ (Current)

The minimum viable monitoring gateway.

### Completed
- [x] SvelteKit 5 + Lucia v3 authentication (email/password + GitHub OAuth)
- [x] GitHub OAuth whitelist (by username or email)
- [x] Proxy routes with auth header injection (Grafana, Uptime Kuma)
- [x] Real-time health checks on dashboard
- [x] Setup wizard (first-run experience)
- [x] Public status page (`/status`) — no login required
- [x] Admin/console panel (`/console`) with user management
- [x] Audit log (login, logout, access, admin actions)
- [x] Failed login tracking and rate limiting (10 attempts/min per IP)
- [x] Session timeline with IP and User-Agent
- [x] Threat detection tab (failed login heatmap by IP)
- [x] Agent registration and metrics API (`/api/agent/push`)
- [x] Agents dashboard with real-time metrics (5s polling)
- [x] User settings (change password, delete account)
- [x] GitHub avatar in profile
- [x] Profile dropdown with settings and sign out
- [x] PWA support (manifest, install prompt, icons)
- [x] Mobile-responsive with bottom navigation
- [x] Splash screen
- [x] Auto-refresh polling (agents: 5s, dashboard: 10s, status: 30s)
- [x] Edge deployment (Cloudflare Pages) + self-hosted (Docker/Node)
- [x] kenari-cli v0.1 (Rust agent: register, push, status, doctor, agent install)
- [x] `kenari doctor` — system diagnostics with auto-fix
- [x] `kenari agent install` — auto-detect init system (systemd, OpenRC, runit, SysV, launchd)
- [x] Deploy scripts (`bun run deploy`, `bun run logs`, `bun run db:push:prod`)
- [x] Pre-commit hook (svelte-check must pass before every commit)
- [x] Comprehensive documentation (DEPLOYMENT, ARCHITECTURE, SECURITY, AGENT, FORENSICS, IDS_SIEM_GUIDE)

---

## v0.2 — Security Hardening 🔧 (Next)

Focus: make Kenari production-ready for teams that take security seriously.

### Notifications
- [ ] **Telegram bot integration** — alert on: failed login spike, login from new IP,
      upstream service down, agent offline
- [ ] **Webhook support** — generic webhook for Slack, Discord, custom integrations
- [ ] **Email notifications** — SMTP-based alerts for critical events

### Threat Detection
- [ ] **IP geolocation** — flag logins from unexpected countries using ip-api.com or MaxMind
- [ ] **Anomaly detection** — baseline normal login hours/IPs per user, alert on deviation
- [ ] **Brute force auto-block** — automatically add IPs to a blocklist after N failures
      (stored in DB, checked in hooks.server.ts)

### Audit Log Improvements
- [ ] **Log retention policy** — configurable auto-delete (e.g., keep last 90 days)
- [ ] **Log export UI** — download audit log as CSV/JSON from `/console`
- [ ] **Hash chaining** — SHA-256 chain for tamper-evident logs
- [ ] **Log shipping** — optional webhook to send events to external SIEM in real-time

### Access Control
- [ ] **Role-based access per route** — configure which roles can access which proxy routes
- [ ] **Invite system** — admin can invite users by email without requiring GitHub
- [ ] **Session management** — view and revoke individual sessions from `/settings`

### Public Status Page
- [ ] **Incident history** — show past incidents with duration and resolution
- [ ] **Custom status messages** — admin can post maintenance notices
- [ ] **Embed widget** — `<iframe>` embeddable status badge for other websites
- [ ] **RSS/Atom feed** — subscribe to status updates

---

## v0.3 — kenari-cli HIDS 🦀

Focus: turn kenari-cli into a real Host-based Intrusion Detection System.

### File Integrity Monitoring
- [ ] **Baseline creation** — `kenari hids baseline` scans specified paths and records hashes
- [ ] **Change detection** — detect modifications to critical files:
      `/etc/passwd`, `/etc/sudoers`, `/etc/crontab`, `/etc/ssh/sshd_config`,
      system binaries in `/usr/bin`, `/usr/sbin`
- [ ] **Alert on change** — push file change events to gateway audit log
- [ ] **Configurable paths** — specify which paths to monitor in `config.toml`

### Process Monitoring
- [ ] **New process detection** — alert when a new process appears that wasn't in baseline
- [ ] **Suspicious process names** — flag known malware process names
- [ ] **Port monitoring** — alert when a new listening port appears

### Login Event Forwarding
- [ ] **PAM integration** — forward SSH login events to Kenari gateway
- [ ] **Failed SSH detection** — parse `/var/log/auth.log` and forward to gateway
- [ ] **sudo usage tracking** — log all sudo commands

### Network Baseline
- [ ] **Connection monitoring** — track active network connections
- [ ] **New connection alert** — flag connections to new external IPs
- [ ] **Bandwidth anomaly** — alert on unusual outbound traffic volume

### CLI Improvements
- [ ] **`kenari hids baseline`** — create file integrity baseline
- [ ] **`kenari hids check`** — one-time integrity check against baseline
- [ ] **`kenari hids watch`** — continuous monitoring mode
- [ ] **Cross-compile CI** — GitHub Actions builds for all platforms on every release

---

## v0.4 — Correlation Engine

Focus: connect the dots between events from multiple sources.

### Rule Engine
- [ ] **YAML-based rules** — define correlation rules without code:
  ```yaml
  - name: brute_force_ssh
    description: More than 10 failed SSH logins from same IP in 60 seconds
    conditions:
      - source: agent_events
        event: ssh_failed_login
        count: ">10"
        window: 60s
        group_by: ip
    actions:
      - alert: telegram
      - block_ip: 3600  # block for 1 hour
  ```
- [ ] **Built-in rules** — brute force, off-hours access, new IP login, file change
- [ ] **Rule management UI** — create and manage rules from `/console`

### nginx Log Integration
- [ ] **kenari-cli nginx parser** — tail nginx access log and forward events to gateway
- [ ] **Attack pattern detection** — flag requests matching known attack patterns:
      `/.env`, `/wp-admin`, `/phpmyadmin`, SQL injection patterns, path traversal
- [ ] **4xx spike detection** — alert when 404/403 rate exceeds threshold

### Docker Event Monitoring
- [ ] **Container events** — forward Docker events (start, stop, crash, OOM) to gateway
- [ ] **Image change detection** — alert when a container image changes unexpectedly

### Threat Intelligence
- [ ] **AbuseIPDB integration** — check IPs against known malicious IP database
- [ ] **Tor exit node detection** — flag logins from Tor exit nodes
- [ ] **VPN detection** — optional flag for logins from known VPN providers

---

## v0.5 — Compliance & Reporting

Focus: make Kenari useful for organizations with compliance requirements.

### Automated Reports
- [ ] **Daily security digest** — email/Telegram summary of previous day's events
- [ ] **Weekly threat report** — top IPs, unusual access patterns, agent health
- [ ] **Monthly compliance report** — user access summary, admin actions, data retention status

### Compliance Features
- [ ] **UU ITE compliance checklist** — built-in checklist with status indicators
- [ ] **Log retention enforcement** — automatic archival and deletion per policy
- [ ] **Data export for DSAR** — export all data for a specific user (GDPR/UU PDP)
- [ ] **Audit trail for compliance** — immutable log with hash verification

### Multi-Instance
- [ ] **Instance federation** — aggregate events from multiple Kenari instances
      into a single dashboard (for organizations with multiple deployments)

---

## v1.0 — Production Ready

The milestone for recommending Kenari for critical infrastructure.

### Stability
- [ ] Comprehensive test suite (unit + integration + e2e)
- [ ] Load testing and performance benchmarks
- [ ] Documented upgrade path from every previous version
- [ ] Semantic versioning with stable API guarantees

### Ecosystem
- [ ] **Helm chart** — deploy Kenari on Kubernetes
- [ ] **Ansible role** — automated deployment for traditional servers
- [ ] **Wazuh integration** — forward Wazuh alerts to Kenari
- [ ] **Suricata integration** — forward NIDS alerts to Kenari
- [ ] **Grafana data source plugin** — query Kenari audit log from Grafana

### Community
- [ ] Plugin SDK for custom metric collectors
- [ ] Community rule repository for correlation engine
- [ ] Official Docker Hub image
- [ ] Package manager distributions (Homebrew, AUR, apt repository)

---

## Long-term Vision

Kenari's long-term goal is to be the **standard monitoring gateway for small and
medium organizations in Indonesia and Southeast Asia** — schools, local government,
clinics, SMEs — that need security monitoring but cannot afford enterprise solutions.

The CLI ecosystem (kenari-cli) should eventually cover:
- Every major Linux distribution and init system
- macOS (launchd)
- Windows (SCM)
- Embedded Linux (OpenWRT, Alpine on Raspberry Pi)
- Android (Termux-based, for monitoring Android servers)

This is a long journey. It requires a community. If you want to help, start with
the [CONTRIBUTING.md](../CONTRIBUTING.md) guide.

---

## How to Influence the Roadmap

1. **Open an issue** — describe your use case and why a feature matters
2. **Vote on existing issues** — 👍 reactions help prioritize
3. **Submit a PR** — the fastest way to get a feature is to build it
4. **Join discussions** — https://github.com/sandikodev/kenari/discussions

Features with clear real-world use cases and community demand will be prioritized
over technically interesting but rarely-needed features.
