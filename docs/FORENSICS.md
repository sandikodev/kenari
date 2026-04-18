# Forensic Analysis with Kenari Audit Log

This document explains how to use Kenari's audit log as a source of digital evidence,
including chain of custody procedures, log export, and analysis techniques.

It is written for system administrators, security analysts, and anyone who may need
to present digital evidence in a legal or compliance context — particularly under
Indonesian law (UU ITE, PP PSTE).

---

## Table of Contents

1. [Legal Basis for Digital Evidence in Indonesia](#1-legal-basis-for-digital-evidence-in-indonesia)
2. [What Kenari Records](#2-what-kenari-records)
3. [Chain of Custody Procedure](#3-chain-of-custody-procedure)
4. [Exporting the Audit Log](#4-exporting-the-audit-log)
5. [Log Integrity Verification](#5-log-integrity-verification)
6. [Analysis Queries](#6-analysis-queries)
7. [Incident Timeline Reconstruction](#7-incident-timeline-reconstruction)
8. [Presenting Evidence](#8-presenting-evidence)
9. [Limitations](#9-limitations)

---

## 1. Legal Basis for Digital Evidence in Indonesia

### UU ITE (UU No. 11 Tahun 2008 jo. UU No. 19 Tahun 2016)

**Pasal 5 ayat (1):** Informasi Elektronik dan/atau Dokumen Elektronik dan/atau
hasil cetaknya merupakan alat bukti hukum yang sah.

**Pasal 5 ayat (2):** Informasi Elektronik dan/atau Dokumen Elektronik dan/atau
hasil cetaknya sebagaimana dimaksud pada ayat (1) merupakan perluasan dari alat
bukti yang sah sesuai dengan Hukum Acara yang berlaku di Indonesia.

**Pasal 6:** Dalam hal terdapat ketentuan lain selain yang diatur dalam Pasal 5
ayat (4) yang mensyaratkan bahwa suatu informasi harus berbentuk tertulis atau
asli, Informasi Elektronik dan/atau Dokumen Elektronik dianggap sah sepanjang
informasi yang tercantum di dalamnya dapat diakses, ditampilkan, dijamin
keutuhannya, dan dapat dipertanggungjawabkan sehingga menerangkan suatu keadaan.

### Syarat Agar Log Dapat Diterima sebagai Alat Bukti

Berdasarkan Pasal 6 UU ITE, log elektronik harus memenuhi empat syarat:

1. **Dapat diakses** — log tersimpan dan dapat dibaca kapan pun dibutuhkan
2. **Dapat ditampilkan** — dapat dicetak atau ditampilkan dalam format yang dapat dibaca manusia
3. **Dijamin keutuhannya** — tidak ada modifikasi setelah pencatatan (integritas data)
4. **Dapat dipertanggungjawabkan** — ada dokumentasi sistem yang mencatat log tersebut

### Regulasi Pendukung

- **PP No. 71 Tahun 2019 (PSTE)** — Pasal 12: penyelenggara sistem elektronik wajib
  menjaga kerahasiaan, keutuhan, keautentikan, dan ketersediaan informasi elektronik
- **Perpres No. 82 Tahun 2022 (PDNS)** — kewajiban pencatatan log untuk instansi pemerintah
- **Peraturan BSSN No. 8 Tahun 2020** — standar keamanan siber termasuk audit trail

### Implikasi untuk Kenari

Untuk memenuhi syarat di atas:
- Server harus disinkronisasi dengan NTP (waktu akurat dan dapat diverifikasi)
- Log tidak boleh dimodifikasi setelah ditulis (append-only)
- Harus ada dokumentasi bahwa sistem logging berjalan normal saat kejadian
- Export log harus disertai hash SHA-256 untuk verifikasi integritas
- Idealnya log dikirim ke sistem eksternal secara real-time (log shipping)

---

## 2. What Kenari Records

### audit_log table

Every security-relevant event is recorded automatically without any configuration:

| Field | Description | Example |
|-------|-------------|---------|
| `id` | Auto-increment row ID | `42` |
| `user_id` | User who performed the action (NULL if unauthenticated) | `fo6lnnbvg3e2mqv` |
| `action` | Event type | `login`, `logout`, `access`, `admin` |
| `detail` | Human-readable description | `github oauth`, `uptime-kuma`, `set role admin for user xyz` |
| `ip` | Client IP address as seen by the server | `103.x.x.x` |
| `user_agent` | Browser/client User-Agent string | `Mozilla/5.0 (Linux; Android 13...)` |
| `created_at` | Unix timestamp in milliseconds (UTC) | `1776536079859` |

### Action types

| Action | When recorded |
|--------|--------------|
| `login` | Successful login via email/password or GitHub OAuth |
| `logout` | User explicitly clicked logout |
| `access` | User accessed a proxied monitoring tool |
| `admin` | Admin performed a management action (role change, user deletion, etc.) |

### failed_logins table

| Field | Description |
|-------|-------------|
| `id` | Auto-increment row ID |
| `ip` | IP address of the failed attempt |
| `email` | Email address that was attempted (may be invalid) |
| `created_at` | Unix timestamp in milliseconds (UTC) |

---

## 3. Chain of Custody Procedure

When you need to preserve audit log evidence for legal or compliance purposes,
follow this procedure strictly. Do not skip steps.

### Step 1: Document the system state before touching anything

```bash
# Record current time and NTP sync status
date -u
timedatectl status

# Record container state
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"

# Record database file metadata
docker exec kenari-gateway stat /app/data/monitor.db
```

Save this output to a file with your name and timestamp.

### Step 2: Export the evidence

```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_FILE="kenari-audit-${TIMESTAMP}.json"

docker exec kenari-gateway node -e "
const {createClient} = require('@libsql/client');
const db = createClient({url:'file:/app/data/monitor.db'});
Promise.all([
  db.execute('SELECT * FROM audit_log ORDER BY created_at ASC'),
  db.execute('SELECT * FROM failed_logins ORDER BY created_at ASC'),
  db.execute('SELECT id, email, name, role, created_at FROM users')
]).then(([audit, failures, users]) => {
  process.stdout.write(JSON.stringify({
    exported_at: new Date().toISOString(),
    exported_by: process.env.USER,
    hostname: require('os').hostname(),
    kenari_version: require('./package.json').version,
    audit_log: audit.rows,
    failed_logins: failures.rows,
    users: users.rows
  }, null, 2));
});
" > "${EXPORT_FILE}"

echo "Exported: ${EXPORT_FILE} ($(wc -c < ${EXPORT_FILE}) bytes)"
```

### Step 3: Generate and record the hash

```bash
sha256sum "${EXPORT_FILE}" | tee "${EXPORT_FILE}.sha256"
```

**Record this hash in your berita acara.** This is the fingerprint that proves
the file has not been modified since export.

### Step 4: Create a read-only snapshot of the database

```bash
# Copy the database file (do not modify the original)
docker exec kenari-gateway cp /app/data/monitor.db /app/data/monitor-evidence-${TIMESTAMP}.db
docker exec kenari-gateway chmod 444 /app/data/monitor-evidence-${TIMESTAMP}.db

# Hash the database file itself
docker exec kenari-gateway sha256sum /app/data/monitor-evidence-${TIMESTAMP}.db
```

### Step 5: Write the berita acara

Document the following in writing, signed by the responsible person:

```
BERITA ACARA PENGAMBILAN BUKTI DIGITAL
=======================================
Tanggal/Waktu  : [tanggal dan waktu pengambilan]
Petugas        : [nama dan jabatan]
Sistem         : Kenari Gateway v[versi]
Hostname       : [hostname server]
Alamat IP      : [IP server]
Lokasi DB      : /app/data/monitor.db

FILE BUKTI
==========
Nama file      : kenari-audit-[timestamp].json
Ukuran         : [bytes]
Hash SHA-256   : [hash]
Diverifikasi   : [tanggal verifikasi]

KETERANGAN
==========
[Deskripsi singkat mengapa bukti ini diambil]

Tanda tangan   : ___________________
```

---

## 4. Exporting the Audit Log

### Full export (JSON)

```bash
docker exec kenari-gateway node -e "
const {createClient} = require('@libsql/client');
const db = createClient({url:'file:/app/data/monitor.db'});
db.execute(\`
  SELECT
    al.id,
    COALESCE(u.email, '[unauthenticated]') as user_email,
    COALESCE(u.name, '') as user_name,
    al.action,
    al.detail,
    al.ip,
    al.user_agent,
    datetime(al.created_at/1000, 'unixepoch') as timestamp_utc,
    al.created_at as timestamp_ms
  FROM audit_log al
  LEFT JOIN users u ON u.id = al.user_id
  ORDER BY al.created_at ASC
\`).then(r => console.log(JSON.stringify(r.rows, null, 2)));
"
```

### CSV export (for spreadsheet analysis)

```bash
docker exec kenari-gateway node -e "
const {createClient} = require('@libsql/client');
const db = createClient({url:'file:/app/data/monitor.db'});
db.execute(\`
  SELECT
    al.id,
    COALESCE(u.email, '[unauthenticated]') as email,
    al.action,
    al.detail,
    al.ip,
    datetime(al.created_at/1000, 'unixepoch', '+7 hours') as timestamp_wib
  FROM audit_log al
  LEFT JOIN users u ON u.id = al.user_id
  ORDER BY al.created_at ASC
\`).then(r => {
  if (!r.rows.length) return;
  const headers = Object.keys(r.rows[0]).join(',');
  const rows = r.rows.map(row =>
    Object.values(row).map(v => JSON.stringify(v ?? '')).join(',')
  );
  console.log([headers, ...rows].join('\n'));
});
" > audit-export.csv
```

### Date-range export

```bash
# Export events between two dates (WIB = UTC+7)
START="2024-03-15 00:00:00"
END="2024-03-16 23:59:59"

docker exec kenari-gateway node -e "
const {createClient} = require('@libsql/client');
const db = createClient({url:'file:/app/data/monitor.db'});
const start = new Date('${START}+07:00').getTime();
const end = new Date('${END}+07:00').getTime();
db.execute({
  sql: 'SELECT * FROM audit_log WHERE created_at BETWEEN ? AND ? ORDER BY created_at ASC',
  args: [start, end]
}).then(r => console.log(JSON.stringify(r.rows, null, 2)));
"
```

---

## 5. Log Integrity Verification

### Verify an exported file

```bash
# Verify the hash matches the recorded value
sha256sum -c kenari-audit-20240315_143022.json.sha256
# Output: kenari-audit-20240315_143022.json: OK
```

If the output is `FAILED`, the file has been modified since export and cannot
be used as evidence without explanation.

### Planned: Hash chaining (v0.2)

In a future version, each audit log entry will include a hash of the previous entry,
creating a tamper-evident chain. Any modification to a historical entry will break
the chain and be immediately detectable.

```
entry_1: { data: {...}, hash: sha256(data_1) }
entry_2: { data: {...}, prev_hash: hash_1, hash: sha256(data_2 + hash_1) }
entry_3: { data: {...}, prev_hash: hash_2, hash: sha256(data_3 + hash_2) }
```

Verification: recalculate the chain from entry 1 and compare with stored hashes.
Any gap or mismatch indicates tampering.

---

## 6. Analysis Queries

### All logins in the last 7 days

```sql
SELECT
  u.email,
  u.name,
  al.detail as method,
  al.ip,
  datetime(al.created_at/1000, 'unixepoch', '+7 hours') as time_wib
FROM audit_log al
JOIN users u ON u.id = al.user_id
WHERE al.action = 'login'
  AND al.created_at > (unixepoch() - 604800) * 1000
ORDER BY al.created_at DESC;
```

### Failed login attempts by IP (last 24 hours)

```sql
SELECT
  ip,
  COUNT(*) as attempts,
  GROUP_CONCAT(DISTINCT email) as emails_tried,
  MIN(datetime(created_at/1000, 'unixepoch', '+7 hours')) as first_attempt,
  MAX(datetime(created_at/1000, 'unixepoch', '+7 hours')) as last_attempt
FROM failed_logins
WHERE created_at > (unixepoch() - 86400) * 1000
GROUP BY ip
ORDER BY attempts DESC;
```

### Full activity timeline for a specific user

```sql
SELECT
  al.action,
  al.detail,
  al.ip,
  al.user_agent,
  datetime(al.created_at/1000, 'unixepoch', '+7 hours') as time_wib
FROM audit_log al
JOIN users u ON u.id = al.user_id
WHERE u.email = 'user@example.com'
ORDER BY al.created_at ASC;
```

### All admin actions (role changes, deletions)

```sql
SELECT
  u.email,
  al.detail,
  al.ip,
  datetime(al.created_at/1000, 'unixepoch', '+7 hours') as time_wib
FROM audit_log al
JOIN users u ON u.id = al.user_id
WHERE al.action = 'admin'
ORDER BY al.created_at DESC;
```

### Logins outside business hours (before 07:00 or after 22:00 WIB)

```sql
SELECT
  u.email,
  al.ip,
  datetime(al.created_at/1000, 'unixepoch', '+7 hours') as time_wib,
  CAST(strftime('%H', al.created_at/1000, 'unixepoch', '+7 hours') AS INTEGER) as hour_wib
FROM audit_log al
JOIN users u ON u.id = al.user_id
WHERE al.action = 'login'
  AND (
    CAST(strftime('%H', al.created_at/1000, 'unixepoch', '+7 hours') AS INTEGER) < 7
    OR
    CAST(strftime('%H', al.created_at/1000, 'unixepoch', '+7 hours') AS INTEGER) >= 22
  )
ORDER BY al.created_at DESC;
```

### Detect rapid successive access (possible automated scraping)

```sql
SELECT
  u.email,
  al.ip,
  COUNT(*) as access_count,
  MIN(datetime(al.created_at/1000, 'unixepoch', '+7 hours')) as window_start,
  MAX(datetime(al.created_at/1000, 'unixepoch', '+7 hours')) as window_end
FROM audit_log al
JOIN users u ON u.id = al.user_id
WHERE al.action = 'access'
  AND al.created_at > (unixepoch() - 3600) * 1000
GROUP BY u.id, al.ip
HAVING access_count > 20
ORDER BY access_count DESC;
```

### Logins from new/unusual IP addresses

```sql
-- Find IPs that have never logged in before the last 24 hours
SELECT DISTINCT al.ip, u.email,
  datetime(al.created_at/1000, 'unixepoch', '+7 hours') as time_wib
FROM audit_log al
JOIN users u ON u.id = al.user_id
WHERE al.action = 'login'
  AND al.created_at > (unixepoch() - 86400) * 1000
  AND al.ip NOT IN (
    SELECT DISTINCT ip FROM audit_log
    WHERE action = 'login'
      AND created_at < (unixepoch() - 86400) * 1000
  );
```

---

## 7. Incident Timeline Reconstruction

To reconstruct what happened during an incident, combine audit_log and failed_logins:

```sql
-- Full timeline for a specific IP address (replace 1.2.3.4)
SELECT
  COALESCE(u.email, '[unauthenticated]') as actor,
  COALESCE(al.action, 'failed_login') as event_type,
  COALESCE(al.detail, fl.email) as detail,
  COALESCE(al.ip, fl.ip) as ip,
  datetime(COALESCE(al.created_at, fl.created_at)/1000, 'unixepoch', '+7 hours') as time_wib,
  COALESCE(al.created_at, fl.created_at) as ts_ms
FROM (
  SELECT 'audit' as src, id, user_id, action, detail, ip, created_at, NULL as email
  FROM audit_log WHERE ip = '1.2.3.4'
  UNION ALL
  SELECT 'failed' as src, id, NULL, NULL, NULL, ip, created_at, email
  FROM failed_logins WHERE ip = '1.2.3.4'
) combined
LEFT JOIN audit_log al ON combined.src = 'audit' AND al.id = combined.id
LEFT JOIN failed_logins fl ON combined.src = 'failed' AND fl.id = combined.id
LEFT JOIN users u ON u.id = al.user_id
ORDER BY ts_ms ASC;
```

---

## 8. Presenting Evidence

### Format for official reports

```
LAPORAN FORENSIK DIGITAL
========================
Tanggal Pembuatan  : [tanggal]
Dibuat oleh        : [nama, jabatan, instansi]
Sistem             : Kenari Gateway v[versi]
Hostname           : [hostname]
Alamat IP Server   : [IP]

VERIFIKASI WAKTU
================
NTP Status         : [synchronized / not synchronized]
Sumber waktu       : [NTP server address]
Offset             : [offset in ms]

HASH INTEGRITAS BUKTI
=====================
File               : kenari-audit-[timestamp].json
Ukuran             : [bytes]
SHA-256            : [hash]
Tanggal hash dibuat: [tanggal]
Diverifikasi oleh  : [nama]

RINGKASAN TEMUAN
================
[Deskripsi temuan dengan referensi ke entri log spesifik,
termasuk timestamp, IP, dan aksi yang dilakukan]

ENTRI LOG RELEVAN
=================
[Tabel atau daftar entri log yang relevan dengan insiden]

KESIMPULAN
==========
[Kesimpulan berdasarkan bukti yang ada]

LAMPIRAN
========
A. File JSON audit log lengkap
B. File SHA-256 hash
C. Screenshot sistem saat pengambilan bukti
D. Output timedatectl / NTP verification
```

### NTP verification (include in report)

```bash
timedatectl show --property=NTPSynchronized,TimeUSec
chronyc tracking 2>/dev/null || ntpq -p 2>/dev/null
```

---

## 9. Limitations

**Kenari records what it can observe.** It cannot record:

- Actions taken directly on the server via SSH or physical access
- Actions taken within Grafana or Uptime Kuma after the proxy passes the request
- Network-level events (port scans, DDoS) — these require a NIDS like Suricata
- File system changes on monitored hosts — requires kenari-cli HIDS mode (planned v0.3)
- Actions by users with direct database access

**Timestamps depend on server clock accuracy.** If NTP sync was disrupted during
the incident period, timestamps may be unreliable. Always document NTP status
as part of evidence collection.

**IP addresses can be spoofed or proxied.** An IP address in the audit log
identifies the source of the HTTP request as seen by nginx — not necessarily
the physical location of the attacker. VPNs, Tor, and compromised intermediary
systems can obscure the true origin.

**The audit log can be deleted** by anyone with root access to the server.
For high-security environments, ship logs to an external append-only aggregator
(Graylog, Loki, CloudWatch Logs) in real-time so that local deletion does not
destroy evidence.

**Kenari is not a certified forensic tool.** For criminal proceedings, consult
a certified digital forensics examiner (CFCE, EnCE, or equivalent) and use
court-accepted forensic tools alongside Kenari's audit log.
