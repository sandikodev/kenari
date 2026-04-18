# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Kenari, please **do not** open a public
GitHub issue. Instead, report it responsibly via a
[GitHub Security Advisory](https://github.com/sandikodev/kenari/security/advisories/new).

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge your report within 48 hours and aim to release a fix within 14 days
for critical issues. We will credit you in the changelog unless you prefer to remain anonymous.

---

## Threat Model

### What Kenari Protects

| Threat | Mitigation |
|--------|-----------|
| Unauthenticated access to monitoring tools | Session-based auth on all proxy routes |
| Brute force login | Rate limiting (10 attempts/min per IP), failed login tracking |
| Credential stuffing | GitHub OAuth whitelist, anomaly detection (planned v0.2) |
| CSRF on OAuth flow | State parameter validation (Arctic library) |
| Session hijacking | HttpOnly, Secure, SameSite=Lax cookies via Lucia |
| Weak passwords | Argon2id hashing (Argon2id, winner of PHC 2015), minimum 8 chars |
| Unauthorized GitHub login | `GITHUB_ALLOWED_USERS` / `GITHUB_ALLOWED_ORGS` whitelist |
| Agent token abuse | Per-agent tokens, revocable from `/agents` UI |
| Scanner bots | All unknown routes return 404, no information disclosure |

### What Kenari Does NOT Protect Against

**Compromised admin account**
If an admin's GitHub account is taken over, the attacker gains full access to
all monitoring tools proxied by Kenari. Mitigate with: GitHub 2FA, hardware
security keys, and regular audit log review.

**Server-level compromise**
If the host running Kenari is compromised (root access), the attacker can read
the SQLite database including all session tokens and user data. Mitigate with:
full-disk encryption, minimal attack surface, regular OS security updates.

**Upstream tool vulnerabilities**
Kenari proxies requests to Grafana and Uptime Kuma but does not inspect or
sanitize their responses. A vulnerability in Grafana is not mitigated by Kenari.
Keep upstream tools updated independently.

**Insider threat**
A legitimate admin user can access all monitoring tools and read the audit log.
Kenari provides visibility but not prevention for insider threats.

**Network-level attacks**
Kenari does not protect against ARP spoofing, DNS poisoning, or other
network-layer attacks on the internal Docker network.

---

## Hardening Checklist

### Essential (required before production)

- [ ] Set a strong `AUTH_SECRET` — minimum 32 random bytes: `openssl rand -hex 32`
- [ ] Set `GITHUB_ALLOWED_USERS` and/or `GITHUB_ALLOWED_ORGS` — never leave both empty in production
- [ ] Use HTTPS — never run Kenari over plain HTTP in production
- [ ] Set a strong `GRAFANA_PASSWORD` — `openssl rand -base64 16`
- [ ] Enable GitHub 2FA on all accounts in the whitelist
- [ ] Verify `.env.production` is in `.gitignore` and never committed

### Recommended

- [ ] Run behind Cloudflare (free tier) for DDoS protection and WAF
- [ ] Add nginx rate limiting:
  ```nginx
  limit_req_zone $binary_remote_addr zone=kenari:10m rate=30r/m;
  location / { limit_req zone=kenari burst=10 nodelay; ... }
  ```
- [ ] Set up Fail2ban to block IPs with repeated 401/429 responses
- [ ] Configure log rotation (already in `docker-compose.yml`: `max-size: 10m, max-file: 3`)
- [ ] Set up automated backups of the SQLite database volume
- [ ] Enable Cloudflare Bot Fight Mode
- [ ] Review audit log weekly for anomalies

### Advanced

- [ ] Enable Cloudflare Access in front of Kenari for zero-trust access
- [ ] Set up Telegram alerting for failed login spikes (planned v0.2)
- [ ] Implement log integrity verification with hash chaining (planned v0.2)
- [ ] Run `kenari-cli` on all monitored hosts for HIDS coverage
- [ ] Set up a read-only database replica for audit log queries

---

## Dependency Security

Security-critical dependencies:

| Package | Purpose | Algorithm/Notes |
|---------|---------|-----------------|
| `lucia` | Session management | Minimal, no circular deps, no transitive auth deps |
| `@node-rs/argon2` | Password hashing | Native Rust binding, Argon2id variant |
| `arctic` | OAuth 2.0 | Minimal, uses native `fetch`, no transitive deps |
| `@libsql/client` | Database client | Official libSQL/Turso client |
| `drizzle-orm` | ORM | Parameterized queries only, no raw string interpolation |

Run periodically:
```bash
bun audit
```

---

## Data Privacy

Kenari stores the following personal data:

| Data | Table | Retention |
|------|-------|-----------|
| Email address | `users` | Until account deleted |
| Display name | `users` | Until account deleted |
| GitHub avatar URL | `users` | Until account deleted |
| GitHub user ID | `users` | Until account deleted |
| IP addresses | `audit_log`, `failed_logins` | Indefinite (configurable in v0.2) |
| User-Agent strings | `audit_log` | Indefinite (configurable in v0.2) |
| Session tokens (hashed) | `sessions` | Until session expires |

**Recommendations for GDPR/UU PDP compliance:**
- Implement log retention policy (auto-delete audit logs older than 90 days)
- Consider IP anonymization (mask last octet: `192.168.1.x`)
- Document your data retention policy and make it accessible to users
- Provide a way for users to request account deletion (currently via `/settings`)

---

## Incident Response

If you suspect a security incident on your Kenari instance:

### Immediate Steps

1. **Preserve evidence** — do not restart containers or modify logs
   ```bash
   docker logs kenari-gateway > /tmp/kenari-incident-$(date +%Y%m%d).log
   ```

2. **Export audit log** before any changes
   ```bash
   docker exec kenari-gateway node -e "
   const {createClient} = require('@libsql/client');
   const db = createClient({url:'file:/app/data/monitor.db'});
   db.execute('SELECT * FROM audit_log ORDER BY created_at DESC').then(r =>
     console.log(JSON.stringify(r.rows))
   );
   " > /tmp/audit-log-$(date +%Y%m%d).json
   ```

3. **Revoke all sessions**
   ```bash
   docker exec kenari-gateway node -e "
   const {createClient} = require('@libsql/client');
   const db = createClient({url:'file:/app/data/monitor.db'});
   db.execute('DELETE FROM sessions').then(() => console.log('All sessions revoked'));
   "
   ```

4. **Rotate secrets** — generate new `AUTH_SECRET`, revoke and regenerate GitHub OAuth secret

5. **Revoke suspicious agent tokens** from `/agents` UI

6. **Update** — pull latest Kenari and rebuild
   ```bash
   git pull && bun run deploy && bun run db:push:prod
   ```

### Documentation

Record and preserve:
- Timeline of events (when detected, when it started, what was accessed)
- Affected data (which users, which tools, what was accessed)
- Remediation steps taken
- Evidence files with SHA-256 hashes for chain of custody

For forensic analysis of the audit log, see [FORENSICS.md](./FORENSICS.md).
