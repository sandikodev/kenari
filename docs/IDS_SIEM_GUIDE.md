# Kenari — IDS/SIEM Ecosystem Design Document

> **Untuk komunitas open source Indonesia** — dokumen ini dirancang sebagai bahan pembelajaran
> penerapan sistem keamanan jaringan dari skala terkecil (sekolah, kantor, RT/RW) hingga
> skala kabupaten/kota. Ditulis dengan filosofi: **keamanan bukan kemewahan, keamanan adalah hak.**

---

## Daftar Isi

1. [Apa itu IDS?](#1-apa-itu-ids)
2. [Apa itu SIEM?](#2-apa-itu-siem)
3. [Mengapa IDS Penting di Skala Kecil?](#3-mengapa-ids-penting-di-skala-kecil)
4. [Aspek Hukum dan Forensik Digital](#4-aspek-hukum-dan-forensik-digital)
5. [Arsitektur Kenari sebagai Mini-SIEM](#5-arsitektur-kenari-sebagai-mini-siem)
6. [Fitur Wajib per Skala Deployment](#6-fitur-wajib-per-skala-deployment)
7. [Threat Landscape Indonesia](#7-threat-landscape-indonesia)
8. [Roadmap Kenari](#8-roadmap-kenari)
9. [Referensi dan Standar](#9-referensi-dan-standar)

---

## 1. Apa itu IDS?

**IDS (Intrusion Detection System)** adalah sistem yang secara otomatis memantau aktivitas
jaringan atau sistem komputer untuk mendeteksi tanda-tanda penyusupan, penyalahgunaan,
atau pelanggaran kebijakan keamanan.

### 1.1 Jenis-jenis IDS

#### NIDS — Network-based Intrusion Detection System
Memantau **traffic jaringan** secara real-time. Dipasang di titik strategis jaringan
(biasanya di belakang firewall atau di switch utama).

```
Internet ──► [Firewall] ──► [NIDS] ──► [Switch] ──► Internal Network
                                ↓
                          Alert/Log
```

**Cara kerja:**
- Packet sniffing — menangkap semua paket yang lewat
- Signature-based detection — mencocokkan pola dengan database serangan yang diketahui
- Anomaly-based detection — mendeteksi penyimpangan dari baseline normal

**Contoh tools:** Snort, Suricata, Zeek (Bro)

**Keterbatasan:**
- Tidak bisa inspect traffic yang terenkripsi (HTTPS, TLS) tanpa SSL inspection
- Tidak tahu apa yang terjadi *di dalam* host

#### HIDS — Host-based Intrusion Detection System
Memantau aktivitas **di dalam satu host/server** secara langsung.

**Yang dipantau:**
- File integrity — apakah file sistem kritis berubah? (`/etc/passwd`, `/etc/sudoers`, binary sistem)
- System calls — proses apa yang berjalan, syscall apa yang dipanggil
- Log files — auth.log, syslog, application logs
- Network connections — port apa yang terbuka, koneksi ke mana
- User activity — siapa login, kapan, dari mana, melakukan apa

**Contoh tools:** OSSEC, Wazuh, Tripwire, AIDE, Auditd

**Kenari CLI** adalah implementasi HIDS ringan yang dirancang untuk:
- Zero dependency (single binary Rust)
- Push-only (tidak butuh inbound port)
- Minimal resource usage (<5MB RAM)

#### WIDS — Wireless Intrusion Detection System
Khusus untuk jaringan WiFi — mendeteksi rogue access point, deauth attack, evil twin, dll.
Relevan untuk jaringan sekolah/kampus yang banyak menggunakan WiFi.

### 1.2 IDS vs IPS

| Aspek | IDS | IPS |
|-------|-----|-----|
| Fungsi | Deteksi dan alert | Deteksi dan **blokir** |
| Posisi | Out-of-band (passive) | Inline (active) |
| Risiko false positive | Alert palsu = gangguan kecil | Blokir palsu = layanan mati |
| Cocok untuk | Monitoring, forensik | Produksi dengan traffic tinggi |

> **Rekomendasi untuk pemula:** Mulai dengan IDS dulu. Pahami pola traffic normal
> sebelum mulai memblokir. IPS yang salah konfigurasi bisa memblokir traffic legitimate.

---

## 2. Apa itu SIEM?

**SIEM (Security Information and Event Management)** adalah platform yang:
1. **Mengumpulkan** log dan event dari semua sumber (server, firewall, aplikasi, IDS)
2. **Menormalkan** format yang berbeda-beda menjadi satu format standar
3. **Mengkorelasikan** event dari berbagai sumber untuk menemukan pola serangan
4. **Mengalertkan** tim keamanan saat ditemukan anomali
5. **Menyimpan** log untuk keperluan forensik dan compliance

### 2.1 Komponen SIEM

```
┌─────────────────────────────────────────────────────────────┐
│                        SIEM Platform                         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Log     │  │  Event   │  │Correlation│  │  Alert   │   │
│  │Collector │→ │Normalizer│→ │  Engine  │→ │  Engine  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                    ↓                         │
│                            ┌──────────────┐                 │
│                            │  Dashboard   │                 │
│                            │  & Reports   │                 │
│                            └──────────────┘                 │
└─────────────────────────────────────────────────────────────┘
         ↑              ↑              ↑              ↑
    Web Server      Firewall       Database        Endpoint
      Logs           Logs           Logs            Logs
```

### 2.2 Use Case SIEM

**Contoh korelasi sederhana:**
```
Event 1: 10:23:01 — IP 1.2.3.4 gagal login SSH (attempt 1)
Event 2: 10:23:02 — IP 1.2.3.4 gagal login SSH (attempt 2)
Event 3: 10:23:03 — IP 1.2.3.4 gagal login SSH (attempt 3)
...
Event 10: 10:23:09 — IP 1.2.3.4 gagal login SSH (attempt 10)

SIEM Rule: "Jika >5 gagal login dari IP yang sama dalam 60 detik"
→ ALERT: Possible SSH brute force from 1.2.3.4
→ ACTION: Notify admin via Telegram
→ ACTION: Add IP to temporary blocklist
```

### 2.3 SIEM Komersial vs Open Source

| Platform | Tipe | Cocok untuk |
|----------|------|-------------|
| Splunk | Komersial | Enterprise besar |
| IBM QRadar | Komersial | Enterprise besar |
| Microsoft Sentinel | Cloud | Azure ecosystem |
| **Wazuh** | Open Source | SME, sekolah, pemerintah |
| **Graylog** | Open Source | Log management |
| **ELK Stack** | Open Source | Flexible, butuh expertise |
| **Kenari** | Open Source | Minimal, edge-first |

---

## 3. Mengapa IDS Penting di Skala Kecil?

### 3.1 Mitos yang Harus Dihancurkan

> *"Sekolah/kantor kecil tidak menarik bagi hacker"*

**SALAH.** Justru sebaliknya:

- **Sekolah** menyimpan data pribadi ribuan siswa (NIK, alamat, nilai, foto)
- **Kantor desa/kelurahan** menyimpan data kependudukan yang sangat sensitif
- **Klinik/puskesmas** menyimpan rekam medis yang dilindungi hukum
- **Infrastruktur kecil** sering dijadikan **pivot point** — batu loncatan untuk menyerang target yang lebih besar
- **Ransomware** tidak pilih-pilih target — yang penting bisa dienkripsi dan diminta tebusan

### 3.2 Skala Deployment dan Kebutuhan Minimum

#### Skala RT/RW Net
```
Infrastruktur: 1 router, 1-2 server, 10-50 client
Ancaman utama: Bandwidth abuse, konten ilegal, akun sharing
Minimum IDS:
  - Log semua koneksi keluar (DNS query log)
  - Alert jika ada koneksi ke domain berbahaya
  - Monitor penggunaan bandwidth per client
Tools: Pi-hole (DNS filtering) + Kenari CLI
```

#### Skala Sekolah/Kampus
```
Infrastruktur: 1-5 server, WiFi multi-AP, 100-1000 client
Ancaman utama: Data siswa bocor, ransomware, akses tidak sah ke sistem akademik
Minimum IDS:
  - HIDS di server utama (file integrity, login monitoring)
  - Failed login tracking
  - Audit log semua akses ke sistem akademik
  - Alert jika ada akses di luar jam operasional
Tools: Kenari + Wazuh agent
```

#### Skala Kantor/UMKM
```
Infrastruktur: 2-10 server, VPN, 10-100 karyawan
Ancaman utama: Insider threat, phishing, data exfiltration
Minimum IDS:
  - SIEM sederhana untuk korelasi event
  - DLP (Data Loss Prevention) dasar
  - Email security monitoring
  - Endpoint monitoring
Tools: Kenari + Wazuh + Graylog
```

#### Skala Pemerintah Daerah (Desa/Kecamatan/Kabupaten)
```
Infrastruktur: 5-50 server, multiple lokasi, data kependudukan
Ancaman utama: Data kependudukan bocor, serangan APT, defacement website
Minimum IDS:
  - SIEM terpusat
  - NIDS di perimeter jaringan
  - HIDS di semua server
  - Incident response procedure
  - Log retention minimal 1 tahun (sesuai regulasi)
Tools: Wazuh (full stack) + Kenari sebagai gateway
```

---

## 4. Aspek Hukum dan Forensik Digital

### 4.1 Landasan Hukum di Indonesia

#### UU ITE (UU No. 11 Tahun 2008 jo. UU No. 19 Tahun 2016)
- **Pasal 30** — Akses ilegal ke sistem elektronik
- **Pasal 31** — Intersepsi ilegal
- **Pasal 32** — Pengubahan/penghapusan/perusakan informasi elektronik
- **Pasal 33** — Tindakan yang mengakibatkan sistem tidak bekerja

> IDS/SIEM yang mencatat log secara otomatis dapat menjadi **alat bukti elektronik**
> yang sah sesuai Pasal 5 UU ITE jika memenuhi syarat keaslian dan integritas.

#### PP No. 71 Tahun 2019 (PSTE)
Mengatur penyelenggaraan sistem dan transaksi elektronik, termasuk kewajiban:
- Menjaga kerahasiaan, keutuhan, dan ketersediaan data
- Melakukan audit keamanan secara berkala
- Menyimpan log transaksi elektronik

#### Perpres No. 82 Tahun 2022 (PDNS)
Mengatur keamanan infrastruktur digital nasional — relevan untuk instansi pemerintah.

### 4.2 Chain of Custody dalam Forensik Digital

**Chain of custody** adalah prosedur dokumentasi yang memastikan bukti digital tidak
dimanipulasi dari saat ditemukan hingga digunakan di pengadilan.

```
Insiden Terjadi
      ↓
Deteksi (IDS/SIEM alert)
      ↓
Preservasi (jangan ubah apapun, buat image/snapshot)
      ↓
Dokumentasi (catat: siapa, kapan, apa yang ditemukan)
      ↓
Analisis (di environment terpisah, bukan sistem asli)
      ↓
Pelaporan (laporan forensik dengan hash verification)
      ↓
Penyerahan ke penegak hukum (dengan berita acara)
```

### 4.3 Syarat Log sebagai Alat Bukti yang Sah

Agar log dari Kenari/IDS dapat diterima sebagai alat bukti:

1. **Timestamp akurat** — server harus sync dengan NTP (Network Time Protocol)
2. **Integritas log** — log tidak boleh bisa diubah setelah ditulis (append-only, hash verification)
3. **Keaslian** — log harus dari sistem yang terbukti tidak dimanipulasi
4. **Kontinuitas** — tidak ada gap dalam pencatatan
5. **Dokumentasi sistem** — ada dokumentasi bahwa sistem logging berjalan normal

> **Implementasi di Kenari:**
> - Audit log menggunakan `created_at` timestamp dari server
> - Server harus dikonfigurasi dengan `chrony` atau `ntpd` untuk akurasi waktu
> - Pertimbangkan log signing dengan private key untuk verifikasi integritas

### 4.4 Kasus Nyata: Pentingnya Log

**Kasus 1: Pembobolan Data Sekolah**
Tanpa IDS: "Kami tidak tahu kapan data bocor atau siapa yang mengaksesnya"
Dengan IDS: "Log menunjukkan pada 2024-03-15 02:34:17, IP 103.x.x.x mengakses
database siswa sebanyak 50.000 query dalam 3 menit — jelas bukan aktivitas normal"

**Kasus 2: Ransomware di Kantor**
Tanpa IDS: Semua file terenkripsi, tidak ada jejak
Dengan IDS: "HIDS mendeteksi proses `svchost.exe` membuat 10.000 file baru dalam
5 menit pada direktori `/home` — alert dikirim tapi tidak ditindaklanjuti"
→ Pelajaran: IDS tidak berguna tanpa prosedur respons insiden

**Kasus 3: Insider Threat**
Tanpa IDS: Karyawan mengunduh database pelanggan, tidak ketahuan
Dengan IDS: Audit log menunjukkan karyawan X mengakses 50.000 record pelanggan
pada hari terakhir sebelum resign — anomali terdeteksi

---

## 5. Arsitektur Kenari sebagai Mini-SIEM

### 5.1 Posisi Kenari dalam Ekosistem Keamanan

```
┌─────────────────────────────────────────────────────────────────┐
│                    INTERNET / WAN                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Cloudflare WAF  │  ← Layer 1: Edge Protection
                    │  (DDoS, Bot, WAF) │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Kenari Gateway   │  ← Layer 2: Auth + Audit
                    │  (SSO, Proxy,     │
                    │   Rate Limit,     │
                    │   Audit Log)      │
                    └─────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
    ┌─────────▼──┐  ┌─────────▼──┐  ┌────────▼───┐
    │Uptime Kuma │  │  Grafana   │  │  Custom    │
    │(Monitoring)│  │(Dashboards)│  │  Tools     │
    └─────────┬──┘  └─────────┬──┘  └────────┬───┘
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Your Servers    │  ← Layer 3: Host Monitoring
                    │  + kenari-cli 🦀  │
                    │  (HIDS Agent)     │
                    └───────────────────┘
```

### 5.2 Data Flow

```
kenari-cli (host)
    │
    │ HTTPS POST /api/agent/push
    │ {cpu, mem, disk, net, processes, file_changes, login_events}
    ▼
Kenari Gateway
    │
    ├── Store metrics → SQLite/Turso
    ├── Evaluate rules → Alert engine
    │       │
    │       ├── Telegram notification
    │       ├── Email notification
    │       └── Webhook (Slack, Discord, etc.)
    │
    └── Dashboard → /console (admin view)
                 → /agents (metrics view)
                 → /status (public view)
```

---

## 6. Fitur Wajib per Skala Deployment

### Tier 1 — Minimal (Sekolah/RT-RW) ✅ Sudah ada di Kenari v0.1

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| SSO Gateway | Satu login untuk semua tools | ✅ |
| Audit Log | Siapa akses apa kapan | ✅ |
| Health Check | Status upstream services | ✅ |
| Agent Metrics | CPU/mem/disk dari host | ✅ |
| GitHub OAuth | Login via GitHub | ✅ |
| Public Status Page | Status tanpa login | ✅ |

### Tier 2 — Standard (Kantor/UMKM) 🔧 Roadmap v0.2

| Fitur | Deskripsi | Prioritas |
|-------|-----------|-----------|
| Session Timeline | Visualisasi aktivitas per user | Tinggi |
| Failed Login Tracking | Brute force detection | Tinggi |
| Rate Limiting | Batas request per IP | Tinggi |
| Telegram Alert | Notifikasi real-time | Tinggi |
| IP Geolocation | Flag login dari luar negeri | Sedang |
| Log Export | Export CSV/JSON untuk forensik | Sedang |
| Log Integrity | Hash verification untuk audit | Sedang |

### Tier 3 — Advanced (Pemerintah/Enterprise) 🗺️ Roadmap v0.3+

| Fitur | Deskripsi | Prioritas |
|-------|-----------|-----------|
| kenari-cli HIDS | File integrity, process monitoring | Tinggi |
| Correlation Rules | "Jika X dan Y maka alert Z" | Tinggi |
| Threat Intel Feed | Check IP vs AbuseIPDB | Sedang |
| nginx Log Parser | Parse access log → event | Sedang |
| Docker Event Monitor | Container start/stop/crash | Sedang |
| Compliance Reports | Laporan untuk audit | Rendah |
| Log Retention Policy | Auto-archive/delete old logs | Rendah |

---

## 7. Threat Landscape Indonesia

### 7.1 Ancaman Umum yang Relevan

#### Brute Force Attack
Percobaan login berulang dengan kombinasi username/password.
```
Indikator: >10 gagal login dari IP yang sama dalam 1 menit
Mitigasi: Rate limiting, account lockout, 2FA
Kenari: Failed login tracking + Telegram alert
```

#### Credential Stuffing
Menggunakan kombinasi username/password yang bocor dari breach lain.
```
Indikator: Login berhasil dari IP/lokasi yang tidak biasa
Mitigasi: 2FA, anomaly detection (IP baru, jam aneh)
Kenari: IP geolocation + session anomaly detection
```

#### Web Application Attack
SQL injection, XSS, path traversal, dll.
```
Indikator: Request dengan karakter mencurigakan (', --, <script>, ../../../)
Mitigasi: WAF (Cloudflare), input validation, parameterized queries
Kenari: nginx log parser untuk detect pattern
```

#### Ransomware
Enkripsi file dan minta tebusan.
```
Indikator: Proses baru membuat banyak file dalam waktu singkat,
           file extension berubah massal, CPU spike
Mitigasi: Backup offline, least privilege, patch management
Kenari CLI: Process monitoring, file change detection
```

#### Data Exfiltration
Pencurian data secara diam-diam.
```
Indikator: Traffic keluar yang tidak biasa (volume besar ke IP asing),
           query database dalam jumlah besar di luar jam kerja
Mitigasi: DLP, network monitoring, audit log
Kenari: Audit log + network baseline dari kenari-cli
```

#### Insider Threat
Ancaman dari dalam — karyawan, kontraktor, atau akun yang dikompromis.
```
Indikator: Akses data di luar scope pekerjaan, akses jam aneh,
           download massal sebelum resign
Mitigasi: Least privilege, audit log, behavior analytics
Kenari: Session timeline + anomaly detection
```

### 7.2 Attack Patterns yang Sering Terlihat di Log

```
# Scanner bot — cari endpoint yang expose
GET /.env
GET /wp-admin
GET /phpmyadmin
GET /api/swagger.json
GET /.git/config
GET /backup.zip

# Brute force SSH
Failed password for root from 1.2.3.4 port 54321 ssh2
Failed password for admin from 1.2.3.4 port 54322 ssh2

# Web shell upload attempt
POST /upload.php
POST /wp-content/uploads/shell.php

# SQL injection
GET /index.php?id=1' OR '1'='1
GET /search?q=<script>alert(1)</script>
```

---

## 8. Roadmap Kenari

### v0.1 — Gateway Foundation (Current)
- [x] SvelteKit 5 + Lucia auth
- [x] Proxy routes dengan auth injection
- [x] Dashboard dengan health checks
- [x] Edge + self-hosted deployment
- [x] GitHub OAuth dengan whitelist
- [x] Audit log dasar
- [x] Public status page
- [x] Admin/console panel
- [x] PWA support
- [x] kenari-cli v0.1 (metrics push)

### v0.2 — Security Hardening
- [ ] Rename `/admin` → `/console`
- [ ] Session timeline per user (visualisasi aktivitas)
- [ ] Failed login tracking dengan counter
- [ ] Rate limiting di login endpoint (10 req/menit per IP)
- [ ] Telegram bot notification
- [ ] IP geolocation (flag login dari luar negeri)
- [ ] Log integrity (SHA-256 hash per batch)
- [ ] Log export (CSV/JSON)
- [ ] NTP sync verification

### v0.3 — kenari-cli HIDS
- [ ] File integrity monitoring (inotify-based)
- [ ] Process monitoring (new process, suspicious names)
- [ ] Network connection monitoring (new open ports)
- [ ] Login event forwarding (PAM integration)
- [ ] systemd service + auto-restart
- [ ] Cross-compile untuk ARM (Raspberry Pi)

### v0.4 — Correlation Engine
- [ ] Rule engine sederhana (YAML-based rules)
- [ ] Brute force detection rule
- [ ] Anomaly detection (baseline + deviation)
- [ ] Threat intel integration (AbuseIPDB)
- [ ] nginx access log parser
- [ ] Docker event monitoring

### v0.5 — Compliance & Reporting
- [ ] Laporan harian/mingguan otomatis
- [ ] Log retention policy (auto-archive)
- [ ] Compliance checklist (UU ITE, PDNS)
- [ ] Incident response workflow
- [ ] Evidence export dengan hash verification

### v1.0 — Production Ready
- [ ] Multi-tenant support
- [ ] Helm chart untuk Kubernetes
- [ ] Wazuh integration
- [ ] Suricata integration
- [ ] Full SIEM correlation

---

## 9. Referensi dan Standar

### Standar Internasional
- **NIST SP 800-94** — Guide to Intrusion Detection and Prevention Systems
- **NIST SP 800-92** — Guide to Computer Security Log Management
- **ISO/IEC 27001** — Information Security Management Systems
- **MITRE ATT&CK** — Framework taktik dan teknik serangan siber

### Regulasi Indonesia
- UU No. 11 Tahun 2008 jo. UU No. 19 Tahun 2016 (UU ITE)
- PP No. 71 Tahun 2019 (PSTE)
- Perpres No. 82 Tahun 2022 (PDNS)
- Peraturan BSSN No. 8 Tahun 2020 (Keamanan Siber)

### Tools Open Source yang Direkomendasikan
- **Wazuh** — HIDS + SIEM open source terlengkap, gratis
- **Suricata** — NIDS/IPS open source, performa tinggi
- **Zeek** — Network analysis framework
- **OSSEC** — HIDS klasik, ringan
- **Graylog** — Log management
- **Grafana** — Visualisasi metrics
- **Uptime Kuma** — Service monitoring

### Komunitas dan Pembelajaran
- **ID-SIRTII/CC** — Indonesia Security Incident Response Team
- **BSSN** — Badan Siber dan Sandi Negara (bssn.go.id)
- **OWASP Indonesia** — Web application security
- **Null Byte** — Komunitas keamanan siber Indonesia

---

## Penutup

Kenari lahir dari kebutuhan nyata: infrastruktur sekolah di Yogyakarta yang butuh
monitoring gateway yang sederhana, terjangkau, dan bisa di-deploy di edge.

Tapi visinya lebih besar dari itu.

Di Indonesia, ribuan sekolah, kantor desa, klinik, dan UMKM menjalankan sistem digital
tanpa *satu pun* mekanisme deteksi intrusi. Mereka tidak tahu kalau data mereka bocor.
Mereka tidak tahu kalau server mereka dijadikan bot. Mereka tidak tahu kalau ada yang
mengintip komunikasi mereka.

Kenari ingin mengubah itu — satu deployment pada satu waktu.

**Karena keamanan bukan kemewahan. Keamanan adalah hak.**

---

*Dokumen ini adalah living document — akan terus diperbarui seiring perkembangan Kenari.*
*Kontribusi sangat disambut: [github.com/sandikodev/kenari](https://github.com/sandikodev/kenari)*
