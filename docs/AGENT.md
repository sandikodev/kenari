# Kenari CLI — Agent Guide

Complete guide for installing, configuring, and running `kenari-cli` on monitored hosts.

---

## Table of Contents

1. [What is kenari-cli?](#1-what-is-kenari-cli)
2. [Installation](#2-installation)
3. [Quick Start](#3-quick-start)
4. [Command Reference](#4-command-reference)
5. [Running as a System Service](#5-running-as-a-system-service)
6. [Configuration File](#6-configuration-file)
7. [Metrics Collected](#7-metrics-collected)
8. [Troubleshooting](#8-troubleshooting)
9. [Building from Source](#9-building-from-source)
10. [Cross-Compilation](#10-cross-compilation)

---

## 1. What is kenari-cli?

`kenari-cli` is a lightweight agent written in Rust that runs on monitored hosts.
It collects system metrics (CPU, memory, disk, uptime) and pushes them to your
Kenari gateway over HTTPS.

**Key design principles:**
- **Single binary** — no runtime dependencies, no package manager required
- **Push-only** — no inbound ports required on the monitored host
- **Minimal resources** — ~2MB binary, ~2MB RAM idle
- **Auto-detect** — `kenari doctor` detects your init system and guides setup

---

## 2. Installation

### One-liner (Linux/macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/sandikodev/kenari/main/scripts/install-cli.sh | sh
```

This script:
1. Detects your OS and architecture
2. Downloads the latest binary from GitHub Releases
3. Installs to `/usr/local/bin/kenari`

### Manual Download

```bash
# Linux x86_64
wget https://github.com/sandikodev/kenari/releases/latest/download/kenari-x86_64-unknown-linux-musl
chmod +x kenari-x86_64-unknown-linux-musl
sudo mv kenari-x86_64-unknown-linux-musl /usr/local/bin/kenari

# Linux ARM64 (Raspberry Pi 4, AWS Graviton)
wget https://github.com/sandikodev/kenari/releases/latest/download/kenari-aarch64-unknown-linux-musl
chmod +x kenari-aarch64-unknown-linux-musl
sudo mv kenari-aarch64-unknown-linux-musl /usr/local/bin/kenari
```

### Verify Installation

```bash
kenari --version
kenari doctor
```

---

## 3. Quick Start

### Step 1: Get an agent token

1. Open your Kenari gateway at `https://monitor.yourdomain.com/agents`
2. Click **+ Add agent**
3. Enter a name for this host (e.g., `prod-server-1`)
4. Click **Register** and copy the token — it is shown only once

### Step 2: Register

```bash
kenari register
```

You will be prompted for:
- **Gateway URL** — your Kenari instance URL
- **Agent token** — from the previous step
- **Host name** — defaults to your system hostname

Or pass flags directly:

```bash
kenari register \
  --gateway https://monitor.yourdomain.com \
  --token your_agent_token \
  --name prod-server-1
```

### Step 3: Verify

```bash
kenari doctor
```

### Step 4: Push metrics

```bash
kenari push        # one-time push
kenari agent start # continuous push (foreground)
```

### Step 5: Install as system service

```bash
kenari doctor --fix
# → detects init system
# → asks to install service
# → escalates to sudo only for the install step
```

---

## 4. Command Reference

### `kenari` (no arguments)

Shows onboarding screen. If registered, shows current config and available commands.
If not registered, offers to run the registration wizard.

```
🐦 Kenari — A canary for your monitoring gateway

  Registered as prod-server-1 → https://monitor.yourdomain.com

  kenari status       Show current metrics
  kenari push         Push metrics once
  kenari agent start  Start background agent
  kenari doctor       Diagnose & fix issues
```

---

### `kenari register`

Interactive registration wizard. Prompts for gateway URL, token, and host name.
Verifies the token against the gateway before saving.

```bash
kenari register
kenari register --gateway URL --token TOKEN --name NAME
```

**Options:**
- `--gateway` — Kenari gateway URL (prompted if omitted)
- `--token` — Agent token from the gateway UI (prompted if omitted)
- `--name` — Host name (defaults to system hostname if omitted)

---

### `kenari doctor`

Diagnoses system health and configuration. Checks:
- OS and architecture detection
- Init system detection (systemd, OpenRC, runit, SysV, launchd)
- Configuration file presence and validity
- Gateway connectivity
- Current system metrics
- Agent service installation status

```bash
kenari doctor          # diagnose only
kenari doctor --fix    # diagnose and fix issues interactively
```

**`--fix` behavior:**
- Not registered → offers to run `kenari register`
- Service not installed → asks permission, then escalates to `sudo` for install only
- Service stopped → asks permission, then starts with `sudo systemctl start`
- Gateway unreachable → reports issue, cannot auto-fix

---

### `kenari status`

Prints current system metrics to stdout. Does not push to gateway.

```bash
kenari status
```

Output:
```
CPU:    12.3%
Memory: 1024 / 4096 MB (25.0%)
Disk:   45.2 / 100.0 GB
Uptime: 86400s
```

---

### `kenari push`

Collects current metrics and pushes them to the gateway once.
Useful for testing or cron-based setups.

```bash
kenari push
```

---

### `kenari agent start`

Starts the agent in the foreground. Pushes metrics every N seconds (default: 30).
Press Ctrl+C to stop.

```bash
kenari agent start
```

Output:
```
🐦 Kenari Agent
✓ Host: prod-server-1 → https://monitor.yourdomain.com
✓ Interval: 30s  (Ctrl+C to stop)

  ↑ 01:23:45 pushed (cpu 12.3%)
  ↑ 01:24:15 pushed (cpu 11.8%)
```

---

### `kenari agent install`

Installs the agent as a persistent system service. Auto-detects init system.
Requires root privileges (will prompt for sudo password).

```bash
kenari agent install
# or via doctor:
kenari doctor --fix
```

**Supported init systems:**
- **systemd** — creates `/etc/systemd/system/kenari-agent.service`, enables and starts
- **OpenRC** — creates `/etc/init.d/kenari-agent`, adds to default runlevel
- **runit** — creates `/etc/sv/kenari-agent/run`, symlinks to `/var/service/`
- **SysV init** — creates `/etc/init.d/kenari-agent`, runs `update-rc.d defaults`
- **launchd** (macOS) — creates `/Library/LaunchDaemons/dev.kenari.agent.plist`
- **Windows SCM** — manual setup instructions provided

---

### `kenari agent stop`

Stops the system service.

```bash
kenari agent stop
```

---

### `kenari agent restart`

Restarts the system service.

```bash
kenari agent restart
```

---

### `kenari agent logs`

Tails the service logs.

```bash
kenari agent logs
# systemd: equivalent to journalctl -u kenari-agent -f
# OpenRC: equivalent to tail -f /var/log/kenari-agent.log
```

---

## 5. Running as a System Service

### systemd (most Linux distributions)

After `kenari agent install`, the service file at
`/etc/systemd/system/kenari-agent.service` looks like:

```ini
[Unit]
Description=Kenari Agent — monitoring metrics pusher
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/kenari agent start
Restart=always
RestartSec=30
User=nobody
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=read-only

[Install]
WantedBy=multi-user.target
```

**Security notes:**
- Runs as `nobody` — minimal privileges
- `NoNewPrivileges=true` — cannot escalate privileges
- `ProtectSystem=strict` — cannot write to system directories
- `ProtectHome=read-only` — read-only access to home directories
- `Restart=always` — automatically restarts after reboot or crash

**Useful commands:**
```bash
systemctl status kenari-agent
systemctl stop kenari-agent
systemctl restart kenari-agent
journalctl -u kenari-agent -f
journalctl -u kenari-agent --since "1 hour ago"
```

### OpenRC (Alpine Linux, Gentoo)

```bash
rc-service kenari-agent status
rc-service kenari-agent stop
rc-service kenari-agent restart
```

### Verifying auto-start after reboot

```bash
# systemd
systemctl is-enabled kenari-agent  # should output "enabled"

# OpenRC
rc-update show | grep kenari       # should show "default"
```

---

## 6. Configuration File

The configuration is stored at:
- **Linux/macOS:** `~/.config/kenari/config.toml`
- **Windows:** `%APPDATA%\kenari\config.toml`

```toml
gateway = "https://monitor.yourdomain.com"
token = "your_64_char_agent_token"
name = "prod-server-1"
interval = 30  # seconds between pushes
```

To update the configuration, run `kenari register` again — it overwrites the existing config.

---

## 7. Metrics Collected

| Metric | Description | Unit |
|--------|-------------|------|
| `cpu_percent` | Global CPU usage | % (0-100) |
| `memory_used_mb` | Used memory (RAM) | MB |
| `memory_total_mb` | Total memory (RAM) | MB |
| `disk_used_gb` | Used disk space (all mounts summed) | GB |
| `disk_total_gb` | Total disk space (all mounts summed) | GB |
| `uptime_secs` | System uptime since last boot | seconds |

**Planned metrics (v0.3):**
- Per-CPU core usage
- Network I/O (bytes in/out per interface)
- Top processes by CPU/memory
- Open file descriptors
- System load average (1m, 5m, 15m)
- File integrity events (HIDS mode)
- New process/port detection (HIDS mode)

---

## 8. Troubleshooting

**`Config not found. Run kenari register first.`**
→ Run `kenari register` to create the configuration file.

**`Gateway unreachable`**
→ Check that your Kenari gateway is running and accessible.
→ Check firewall rules — the agent needs outbound HTTPS (port 443).
→ Verify the gateway URL in your config: `cat ~/.config/kenari/config.toml`

**`403 Forbidden` on push**
→ The agent token is invalid or has been revoked.
→ Generate a new token from `/agents` in the Kenari UI and re-register.

**`Service not starting after reboot`**
→ Run `kenari doctor` to diagnose.
→ Check service logs: `journalctl -u kenari-agent -n 50`
→ Verify the binary path in the service file matches `which kenari`

**Metrics not appearing in UI**
→ Run `kenari push` manually and check for errors.
→ Verify the agent is listed in `/agents` and has a recent `last_seen` timestamp.
→ Check that `agent_metrics` table exists: run `bun run db:push:prod` on the gateway.

---

## 9. Building from Source

```bash
git clone https://github.com/sandikodev/kenari
cd kenari/cli
cargo build --release
./target/release/kenari --version
```

**Requirements:**
- Rust 1.75+ (install via https://rustup.rs)
- OpenSSL development headers (for `reqwest` TLS)
  ```bash
  # Debian/Ubuntu
  sudo apt install libssl-dev pkg-config
  # Alpine
  apk add openssl-dev pkgconfig
  ```

---

## 10. Cross-Compilation

Build for multiple platforms from a single Linux machine:

```bash
# Install cross-compilation tool
cargo install cross

# Linux x86_64 (musl — fully static, no glibc dependency)
cross build --release --target x86_64-unknown-linux-musl

# Linux ARM64 (Raspberry Pi 4, AWS Graviton, Apple Silicon servers)
cross build --release --target aarch64-unknown-linux-musl

# Linux ARMv7 (Raspberry Pi 2/3)
cross build --release --target armv7-unknown-linux-musleabihf

# macOS x86_64 (requires macOS host or osxcross)
cross build --release --target x86_64-apple-darwin

# macOS ARM64 (Apple Silicon)
cross build --release --target aarch64-apple-darwin

# Windows x86_64
cross build --release --target x86_64-pc-windows-gnu
```

Binaries are output to `target/<target>/release/kenari`.

**Why musl?**
Static musl binaries have zero runtime dependencies — they run on any Linux
distribution regardless of glibc version. This is critical for compatibility
with Alpine Linux, old Debian/Ubuntu, and embedded systems.
