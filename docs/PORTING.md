# Kenari CLI — Porting & Platform Support

> **Dokumen ini adalah undangan terbuka untuk kontributor.**
>
> Kenari CLI adalah proyek yang terlalu besar untuk dikerjakan satu orang.
> Setiap platform, setiap arsitektur, setiap init system membutuhkan
> seseorang yang benar-benar hidup di ekosistem tersebut.
> Jika kamu adalah orang itu — selamat datang.

---

## Mengapa Ini Penting

Kenari CLI adalah agen monitoring yang idealnya berjalan di **setiap perangkat
yang terhubung ke jaringan** — dari server enterprise hingga Raspberry Pi di
warung kopi, dari router OpenWRT hingga sensor IoT di ladang.

Visi ini tidak bisa dicapai oleh satu orang atau satu tim kecil.
Ia membutuhkan komunitas yang beragam: embedded engineer, mobile developer,
BSD sysadmin, IoT hobbyist, dan siapa pun yang peduli bahwa infrastruktur
kecil pun berhak mendapat monitoring yang layak.

---

## Daftar Isi

1. [Platform yang Sudah Didukung](#1-platform-yang-sudah-didukung)
2. [Platform yang Dibutuhkan Kontributor](#2-platform-yang-dibutuhkan-kontributor)
3. [Embedded Systems](#3-embedded-systems)
4. [Mobile Platforms](#4-mobile-platforms)
5. [BSD Ecosystem](#5-bsd-ecosystem)
6. [RISC-V](#6-risc-v)
7. [ARM Architecture Variants](#7-arm-architecture-variants)
8. [Cara Berkontribusi](#8-cara-berkontribusi)
9. [Panduan Porting](#9-panduan-porting)

---

## 1. Platform yang Sudah Didukung

| Platform | Arsitektur | Init System | Status |
|----------|-----------|-------------|--------|
| Linux (Debian/Ubuntu) | x86_64 | systemd | ✅ Stable |
| Linux (Alpine) | x86_64 | OpenRC | ✅ Stable |
| Linux (Void) | x86_64 | runit | ✅ Stable |
| Linux (Artix) | x86_64 | Dinit | ✅ Stable |
| Linux (Slackware) | x86_64 | BSD-style rc.d | ✅ Stable |
| Linux (Devuan) | x86_64 | SysV init | ✅ Stable |
| macOS | x86_64, ARM64 | launchd | ✅ Stable |
| Windows | x86_64 | SCM | ⚠️ Manual only |

---

## 2. Platform yang Dibutuhkan Kontributor

### Linux ARM

| Platform | Arsitektur | Contoh Hardware | Status |
|----------|-----------|-----------------|--------|
| Linux ARM64 | aarch64 | Raspberry Pi 4/5, AWS Graviton, Apple M1 server | 🔧 Binary tersedia, belum diuji |
| Linux ARMv7 | armv7hf | Raspberry Pi 2/3, Orange Pi, BeagleBone | 🔧 Binary tersedia, belum diuji |
| Linux ARMv6 | armv6 | Raspberry Pi 1, Pi Zero | ❌ Belum ada |
| Linux ARM Thumb-2 | armv7m | Cortex-M (bare metal) | ❌ Tidak applicable |

### Windows

| Platform | Status | Kebutuhan |
|----------|--------|-----------|
| Windows 10/11 x86_64 | ⚠️ Manual | Windows Service (SCM) auto-install |
| Windows ARM64 | ❌ | Cross-compile + SCM support |
| Windows Server | ⚠️ Manual | Same as desktop |

**Kontributor dibutuhkan untuk:**
- Implementasi `install_windows()` menggunakan Windows Service Control Manager API
- Testing di Windows 10, 11, dan Windows Server
- PowerShell install script sebagai alternatif `install-cli.sh`

### BSD Ecosystem

| Platform | Status | Kebutuhan |
|----------|--------|-----------|
| FreeBSD | ❌ | rc.d service script |
| OpenBSD | ❌ | rc.d + pledge/unveil security |
| NetBSD | ❌ | rc.d service script |
| DragonFlyBSD | ❌ | rc.d service script |
| TrueNAS (FreeBSD-based) | ❌ | Plugin/jail support |

### Mobile

| Platform | Status | Kebutuhan |
|----------|--------|-----------|
| Android (Termux) | ❌ | Termux service + aarch64 binary |
| Android (root) | ❌ | init.d / Magisk module |
| iOS (jailbreak) | ❌ | launchd plist (restricted) |

### Embedded / IoT

| Platform | Status | Kebutuhan |
|----------|--------|-----------|
| OpenWRT (MIPS/ARM) | ❌ | procd init, opkg package |
| ESP32 (Xtensa LX6/LX7) | ❌ | esp-idf port, FreeRTOS |
| STM32 (Cortex-M) | ❌ | Bare metal / RTOS port |
| Raspberry Pi Pico (RP2040) | ❌ | Bare metal, sangat terbatas |
| RISC-V (Linux) | ❌ | riscv64gc-unknown-linux-gnu |
| RISC-V (bare metal) | ❌ | Sangat eksperimental |

---

## 3. Embedded Systems

### Filosofi untuk Embedded

Kenari CLI di embedded systems harus mengikuti prinsip **"trim to fit"**:
fitur dikurangi sesuai kemampuan hardware, tapi protokol komunikasi tetap sama.
Gateway tidak perlu tahu apakah metrics datang dari server 64-core atau ESP32.

```
Full kenari-cli (Linux server):
  CPU, memory, disk, network, processes, file integrity, port monitoring
  → ~2MB binary, ~2MB RAM

kenari-cli lite (OpenWRT router):
  CPU load, memory, uptime, interface stats
  → ~500KB binary, ~512KB RAM

kenari-cli nano (ESP32):
  Uptime, free heap, WiFi RSSI, custom sensor values
  → ~200KB flash, ~50KB RAM
```

---

### ESP32 (Xtensa LX6/LX7)

**Hardware:** Espressif ESP32, ESP32-S2, ESP32-S3, ESP32-C3 (RISC-V)

**Tantangan:**
- Tidak ada OS — hanya FreeRTOS atau bare metal
- RAM sangat terbatas (520KB SRAM pada ESP32 klasik)
- Tidak ada filesystem standar (SPIFFS/LittleFS)
- TLS membutuhkan ~100KB RAM (mbedTLS)
- Rust support untuk ESP32 masih eksperimental (`esp-rs`)

**Pendekatan yang direkomendasikan:**

```
Opsi A: esp-idf + Rust (esp-rs)
  - Gunakan esp-hal dan esp-wifi crate
  - HTTP client: embedded-svc
  - TLS: esp-tls (wraps mbedTLS)
  - Cocok untuk ESP32-S3 (lebih banyak RAM)

Opsi B: esp-idf + C (lebih mature)
  - esp_http_client untuk push metrics
  - cJSON untuk serialisasi
  - Lebih stabil, lebih banyak contoh

Opsi C: MicroPython (paling mudah, performa rendah)
  - urequests untuk HTTP
  - ujson untuk JSON
  - Tidak direkomendasikan untuk produksi
```

**Contoh payload yang realistis dari ESP32:**

```json
{
  "host_id": "esp32-sensor-01",
  "timestamp": 1776536079,
  "metrics": {
    "uptime_secs": 86400,
    "free_heap_bytes": 245760,
    "wifi_rssi_dbm": -65,
    "cpu_freq_mhz": 240,
    "custom": {
      "temperature_c": 28.5,
      "humidity_pct": 72.3
    }
  }
}
```

**Kontributor dibutuhkan:**
- Pengalaman dengan esp-idf atau esp-rs
- Hardware ESP32 untuk testing
- Implementasi `kenari-nano` sebagai subproject terpisah

---

### STM32 (ARM Cortex-M)

**Hardware:** STM32F4, STM32H7, STM32L4, dan ratusan varian lainnya

**Tantangan:**
- Cortex-M adalah arsitektur 32-bit tanpa MMU (tidak bisa jalankan Linux)
- RAM sangat terbatas (64KB - 2MB tergantung varian)
- Tidak ada TCP/IP stack bawaan — butuh lwIP atau FreeRTOS+TCP
- Koneksi jaringan via Ethernet (LAN8720) atau WiFi module (ESP8266/ESP-AT)
- Rust support: `thumbv7em-none-eabihf` (Cortex-M4/M7 dengan FPU)

**Pendekatan:**

```
STM32 + Ethernet (LAN8720):
  - FreeRTOS + lwIP
  - HTTP client via lwIP raw API atau netconn API
  - JSON serialisasi manual (tidak ada heap allocator)
  - Push interval: 60 detik (hemat bandwidth)

STM32 + ESP-AT (WiFi via UART):
  - Kirim AT commands ke ESP8266/ESP32 via UART
  - Lebih mudah diimplementasi
  - Latency lebih tinggi
```

**Metrics yang realistis:**
- Uptime
- Free heap
- Task count (FreeRTOS)
- Custom ADC readings (sensor suhu, tegangan, dll)
- Stack high watermark per task

**Kontributor dibutuhkan:**
- Embedded C/C++ atau Rust embedded experience
- Hardware STM32 development board (Nucleo, Discovery)
- Pengetahuan FreeRTOS

---

### OpenWRT (Router)

**Hardware:** TP-Link, Xiaomi, GL.iNet, dan ratusan router lainnya

**Arsitektur:** MIPS32, MIPS64, ARM, x86 (tergantung router)

**Kenapa ini penting:**
Router adalah titik masuk jaringan. Monitoring router berarti monitoring
seluruh traffic jaringan — siapa yang terhubung, berapa bandwidth yang dipakai,
apakah ada koneksi mencurigakan.

**Pendekatan:**

```
kenari-cli untuk OpenWRT:
  - Cross-compile untuk target MIPS: mips-unknown-linux-musl
  - Metrics: CPU load, memory, uptime, interface stats, connected clients
  - Init: procd (OpenWRT's init system)
  - Package: .ipk format untuk opkg
  - Size target: <500KB (flash sangat terbatas)
```

**Contoh procd service file:**

```json
{
  "name": "kenari-agent",
  "start": {
    "command": ["/usr/bin/kenari", "agent", "start"]
  },
  "respawn": {
    "threshold": 3600,
    "timeout": 5,
    "retry": 5
  }
}
```

**Kontributor dibutuhkan:**
- OpenWRT development experience
- Router hardware untuk testing
- Pengetahuan cross-compilation untuk MIPS

---

## 4. Mobile Platforms

### Android (Termux)

**Kenapa Termux:**
Termux adalah terminal emulator Android yang menyediakan environment Linux
lengkap tanpa root. Banyak developer dan sysadmin menggunakan Android sebagai
monitoring device sekunder.

**Pendekatan:**

```bash
# Install via Termux
pkg install kenari-agent

# Atau manual
wget https://github.com/sandikodev/kenari/releases/latest/download/kenari-aarch64-linux-android
chmod +x kenari-aarch64-linux-android
mv kenari-aarch64-linux-android $PREFIX/bin/kenari

# Register
kenari register

# Run as Termux service (persists after app close)
sv-enable kenari-agent  # Termux uses runit
```

**Target compile:** `aarch64-linux-android`

**Tantangan:**
- Android tidak mengizinkan background process tanpa foreground notification
- Termux:Boot diperlukan untuk auto-start
- Battery optimization dapat membunuh proses

**Kontributor dibutuhkan:**
- Android development experience
- Termux packaging knowledge
- Testing di berbagai versi Android

### Android (Root / Magisk)

Untuk device yang di-root, kenari-cli dapat diinstall sebagai Magisk module
dan berjalan sebagai system service dengan akses penuh ke metrics hardware.

**Kontributor dibutuhkan:**
- Magisk module development experience
- Rooted Android device untuk testing

---

## 5. BSD Ecosystem

### FreeBSD

**Kenapa FreeBSD penting:**
FreeBSD digunakan di Netflix, WhatsApp (sebelum akuisisi), PlayStation,
dan banyak infrastruktur enterprise. TrueNAS (storage OS populer) berbasis FreeBSD.

**Perbedaan dari Linux:**
- Init system: rc.d (bukan systemd)
- Package manager: pkg
- Filesystem: ZFS (metrics ZFS sangat berguna)
- `/proc` tidak ada secara default (gunakan `sysctl` untuk metrics)

**Implementasi yang dibutuhkan:**

```rust
// FreeBSD metrics via sysctl
// sysinfo crate mungkin tidak support FreeBSD
// Perlu implementasi manual menggunakan nix crate

use nix::sys::sysctl;

fn get_cpu_usage() -> f64 {
    // sysctl kern.cp_time
    todo!()
}

fn get_memory() -> (u64, u64) {
    // sysctl vm.stats.vm.v_free_count
    // sysctl hw.physmem
    todo!()
}
```

**rc.d service file:**

```sh
#!/bin/sh
# PROVIDE: kenari_agent
# REQUIRE: NETWORKING
# KEYWORD: shutdown

. /etc/rc.subr

name="kenari_agent"
rcvar="kenari_agent_enable"
command="/usr/local/bin/kenari"
command_args="agent start"
pidfile="/var/run/${name}.pid"

load_rc_config $name
run_rc_command "$1"
```

**Kontributor dibutuhkan:**
- FreeBSD sysadmin experience
- Pengetahuan rc.d dan pkg packaging
- FreeBSD machine untuk testing

### OpenBSD

**Kenapa OpenBSD spesial:**
OpenBSD adalah OS paling security-focused di dunia. Jika kenari-cli berjalan
di OpenBSD, ia harus menggunakan `pledge()` dan `unveil()` untuk membatasi
syscall yang diizinkan — ini adalah best practice keamanan yang luar biasa.

```c
// OpenBSD security primitives yang harus diimplementasi
pledge("stdio rpath inet", NULL);  // hanya izinkan syscall yang dibutuhkan
unveil("/etc/kenari", "r");        // hanya bisa baca config directory
unveil(NULL, NULL);                // lock unveil
```

**Kontributor dibutuhkan:**
- OpenBSD experience
- Pengetahuan pledge/unveil
- OpenBSD machine untuk testing

---

## 6. RISC-V

### Mengapa RISC-V Menarik

RISC-V adalah arsitektur ISA open source yang sedang berkembang pesat.
Tidak seperti ARM atau x86 yang dimiliki perusahaan, RISC-V bebas digunakan
siapa saja tanpa lisensi. Ini sejalan dengan filosofi open source Kenari.

**Hardware RISC-V yang tersedia:**
- **SiFive HiFive Unmatched** — development board Linux-capable
- **StarFive VisionFive 2** — single-board computer seperti Raspberry Pi
- **Milk-V Duo** — tiny RISC-V board, mirip Pi Zero
- **ESP32-C3/C6** — Espressif's RISC-V microcontroller (IoT)
- **Kendryte K210** — RISC-V dengan AI accelerator

### RISC-V Linux (64-bit)

**Target Rust:** `riscv64gc-unknown-linux-gnu`

Ini adalah target yang paling mudah — Linux berjalan normal, hanya arsitektur
yang berbeda. Rust sudah support target ini dengan baik.

```bash
# Cross-compile dari x86_64 Linux
rustup target add riscv64gc-unknown-linux-gnu
cargo build --release --target riscv64gc-unknown-linux-gnu
```

**Tantangan:**
- Toolchain cross-compile perlu dikonfigurasi
- `sysinfo` crate perlu diverifikasi support RISC-V
- Testing membutuhkan hardware atau QEMU

### RISC-V Bare Metal (32-bit)

**Target Rust:** `riscv32imac-unknown-none-elf`

Ini jauh lebih kompleks — tidak ada OS, tidak ada stdlib, tidak ada heap allocator
secara default. Cocok untuk ESP32-C3 (RISC-V core) atau microcontroller RISC-V lainnya.

```rust
#![no_std]
#![no_main]

// Kenari nano untuk RISC-V bare metal
// Hanya push metrics minimal via HTTP
```

**Kontributor dibutuhkan:**
- RISC-V hardware (StarFive VisionFive 2, SiFive HiFive, atau QEMU)
- Embedded Rust experience untuk bare metal
- Pengetahuan RISC-V ISA

---

## 7. ARM Architecture Variants

ARM adalah arsitektur yang paling tersebar luas di dunia — dari smartphone
hingga server cloud. Berikut varian yang relevan untuk Kenari:

### ARM64 / AArch64 (Cortex-A, 64-bit)

**Target:** `aarch64-unknown-linux-musl`

Ini adalah ARM modern — Raspberry Pi 4/5, Apple Silicon, AWS Graviton,
Ampere Altra, Qualcomm server chips. Binary sudah tersedia, perlu testing.

**Hardware untuk testing:**
- Raspberry Pi 4/5 (paling mudah didapat)
- Orange Pi 5 (lebih murah)
- AWS Graviton instance (gratis tier tersedia)

### ARMv7 / ARM32 (Cortex-A, 32-bit)

**Target:** `armv7-unknown-linux-musleabihf`

Raspberry Pi 2/3 (mode 32-bit), Orange Pi, BeagleBone Black, banyak router ARM.

**Catatan:** Raspberry Pi 4/5 bisa menjalankan OS 32-bit, tapi lebih baik
gunakan 64-bit untuk performa optimal.

### ARMv6 (Raspberry Pi 1, Pi Zero)

**Target:** `arm-unknown-linux-musleabihf`

Raspberry Pi 1 dan Pi Zero menggunakan ARM1176JZF-S (ARMv6).
Binary ARMv7 tidak berjalan di ARMv6 — perlu target terpisah.

**Kontributor dibutuhkan:**
- Raspberry Pi 1 atau Pi Zero untuk testing
- Verifikasi bahwa `sysinfo` crate bekerja di ARMv6

### ARM Cortex-M (Microcontroller, 32-bit)

**Target:** `thumbv7em-none-eabihf` (Cortex-M4/M7 dengan FPU)

Ini adalah domain embedded — STM32, nRF52, SAMD51, dan ratusan MCU lainnya.
Tidak ada OS, tidak ada stdlib. Lihat [Embedded Systems](#3-embedded-systems).

### ARM Cortex-M0/M0+ (Ultra-low power)

**Target:** `thumbv6m-none-eabi`

STM32F0, STM32L0, nRF51, SAMD21. RAM sangat terbatas (8-32KB).
Kenari nano harus sangat minimal untuk berjalan di sini.

---

## 8. Cara Berkontribusi

### Jika kamu punya hardware yang belum didukung

1. **Buka issue** di GitHub dengan label `platform-support`
2. Deskripsikan hardware, OS, dan init system
3. Coba build kenari-cli untuk target tersebut:
   ```bash
   rustup target add <target-triple>
   cargo build --release --target <target-triple>
   ```
4. Laporkan hasilnya — error, warning, atau sukses

### Jika kamu ingin mengimplementasi platform baru

1. Fork repository
2. Tambahkan variant baru di `src/init.rs` (untuk init system baru)
3. Implementasi `install_<platform>()` di `src/commands/install.rs`
4. Test di hardware nyata
5. Buka PR dengan:
   - Deskripsi platform
   - Hardware yang digunakan untuk testing
   - Output `kenari doctor` di platform tersebut

### Jika kamu ingin port ke embedded (ESP32, STM32, dll)

Embedded port adalah proyek tersendiri. Buka diskusi di GitHub Discussions
terlebih dahulu untuk mendiskusikan arsitektur sebelum mulai coding.

Pertanyaan yang perlu dijawab:
- Berapa RAM yang tersedia?
- Apakah ada TCP/IP stack?
- Apakah ada TLS support?
- Metrics apa yang bisa dikumpulkan?
- Bagaimana cara auto-start setelah power cycle?

### Jika kamu tidak bisa coding tapi punya hardware

Testing sama pentingnya dengan coding. Kamu bisa membantu dengan:
- Menjalankan `kenari doctor` di platform kamu dan melaporkan hasilnya
- Testing binary yang sudah ada di hardware kamu
- Mendokumentasikan quirks dan workarounds untuk platform tertentu

---

## 9. Panduan Porting

### Checklist untuk platform baru

```
[ ] Binary dapat di-compile untuk target ini
[ ] Binary dapat dijalankan di hardware target
[ ] `kenari status` menampilkan metrics yang benar
[ ] `kenari push` berhasil mengirim ke gateway
[ ] `kenari agent install` menginstall service dengan benar
[ ] Service auto-start setelah reboot
[ ] `kenari agent logs` menampilkan log
[ ] `kenari doctor` mendeteksi platform dengan benar
[ ] Dokumentasi ditambahkan ke AGENT.md
[ ] Target ditambahkan ke install-cli.sh
[ ] GitHub Actions CI dikonfigurasi untuk target ini
```

### Minimal implementation untuk platform baru

Jika platform tidak support semua fitur, implementasi minimal yang diterima:

```rust
// Minimal: hanya push metrics, tanpa service management
// Ini sudah cukup untuk embedded systems

pub fn run() -> anyhow::Result<()> {
    // 1. Load config
    // 2. Collect metrics (minimal: uptime + free memory)
    // 3. Push via HTTP
    // 4. Return
    Ok(())
}
```

### Target triple reference

| Platform | Target Triple |
|----------|--------------|
| Linux x86_64 (musl) | `x86_64-unknown-linux-musl` |
| Linux ARM64 (musl) | `aarch64-unknown-linux-musl` |
| Linux ARMv7 (musl) | `armv7-unknown-linux-musleabihf` |
| Linux ARMv6 (musl) | `arm-unknown-linux-musleabihf` |
| Linux RISC-V 64 | `riscv64gc-unknown-linux-gnu` |
| Linux MIPS (OpenWRT) | `mips-unknown-linux-musl` |
| macOS x86_64 | `x86_64-apple-darwin` |
| macOS ARM64 | `aarch64-apple-darwin` |
| Windows x86_64 | `x86_64-pc-windows-msvc` |
| Windows ARM64 | `aarch64-pc-windows-msvc` |
| Android ARM64 | `aarch64-linux-android` |
| FreeBSD x86_64 | `x86_64-unknown-freebsd` |
| Cortex-M4/M7 | `thumbv7em-none-eabihf` |
| Cortex-M0/M0+ | `thumbv6m-none-eabi` |
| ESP32 (Xtensa) | `xtensa-esp32-none-elf` (via esp-rs) |
| RISC-V bare metal | `riscv32imac-unknown-none-elf` |

---

## Penutup

Kenari dimulai sebagai gateway monitoring sederhana untuk satu sekolah.
Tapi visinya jauh lebih besar dari itu.

Bayangkan: setiap perangkat yang terhubung ke jaringan — dari server enterprise
hingga sensor suhu di greenhouse, dari router RT/RW Net hingga ESP32 di panel
listrik — semuanya mengirim metrics ke satu dashboard yang sama, dengan satu
protokol yang sama, dengan satu agen yang sama.

Ini bukan mimpi yang tidak realistis. Ini adalah apa yang dilakukan Prometheus,
Telegraf, dan Datadog Agent — tapi mereka besar, berat, dan mahal.

Kenari ingin menjadi alternatif yang ringan, open source, dan dibuat oleh
komunitas Indonesia untuk dunia.

**Jika kamu membaca ini dan punya hardware yang belum didukung — itu adalah
undangan untuk kamu.**

[Buka issue →](https://github.com/sandikodev/kenari/issues/new?labels=platform-support)
[Mulai diskusi →](https://github.com/sandikodev/kenari/discussions)
