# Etika Penggunaan Kenari — Surat Terbuka

> Dokumen ini ditulis bukan karena kewajiban hukum, tapi karena kesadaran moral.
> Ia adalah pernyataan sikap komunitas Kenari terhadap penyalahgunaan teknologi,
> sekaligus surat terbuka kepada pemangku kebijakan dan perancang undang-undang
> di Indonesia.

---

## Latar Belakang

Kenari lahir dari kebutuhan sederhana: monitoring infrastruktur sekolah yang
terjangkau dan mudah digunakan. Tapi dalam perjalanan pengembangannya, kami
menyadari bahwa tools yang kami bangun — khususnya kenari-cli yang dirancang
untuk berjalan di berbagai platform termasuk Android — memiliki potensi
disalahgunakan sebagai alat pengintaian.

Kami tidak menutup mata terhadap kenyataan ini.

Dokumen ini adalah respons jujur kami terhadap kenyataan tersebut.

---

## Daftar Isi

1. [Apa yang Bisa Disalahgunakan](#1-apa-yang-bisa-disalahgunakan)
2. [Perbedaan Monitoring Etis dan Spyware](#2-perbedaan-monitoring-etis-dan-spyware)
3. [Preseden: Tools Legitimate yang Disalahgunakan](#3-preseden-tools-legitimate-yang-disalahgunakan)
4. [Landasan Hukum di Indonesia](#4-landasan-hukum-di-indonesia)
5. [Celah Hukum yang Perlu Dibenahi](#5-celah-hukum-yang-perlu-dibenahi)
6. [Komitmen Komunitas Kenari](#6-komitmen-komunitas-kenari)
7. [Surat Terbuka kepada Pemangku Kebijakan](#7-surat-terbuka-kepada-pemangku-kebijakan)
8. [Apa yang Bisa Kamu Lakukan](#8-apa-yang-bisa-kamu-lakukan)

---

## 1. Apa yang Bisa Disalahgunakan

Kenari CLI dalam konteks jahat dapat difungsikan sebagai:

### Spyware / Stalkerware
Install kenari-cli di perangkat seseorang tanpa sepengetahuan mereka.
Gateway yang dikontrol attacker menerima metrics: kapan perangkat aktif,
berapa lama, pola penggunaan. Dalam mode HIDS (planned v0.3), bahkan
perubahan file dan proses yang berjalan bisa dipantau.

**Korban yang rentan:** pasangan dalam hubungan abusif, karyawan yang
diawasi secara berlebihan oleh atasan, anak-anak yang dimonitor tanpa
transparansi oleh orang tua.

### Corporate Espionage
Install di laptop karyawan tanpa disclosure yang jelas dalam kontrak kerja.
Monitor aktivitas, jam kerja, aplikasi yang digunakan.

### Botnet Command & Control
Gateway Kenari sebagai C2 server, agent sebagai bot. Setiap agent yang
"push metrics" bisa dimodifikasi untuk menerima perintah balik.

### Infrastructure Reconnaissance
Install di server target untuk memetakan arsitektur jaringan internal
sebelum serangan lebih lanjut.

---

## 2. Perbedaan Monitoring Etis dan Spyware

Garis pembeda antara monitoring yang sah dan pengintaian ilegal bukan pada
teknologinya — tapi pada **consent, transparency, dan purpose**.

| Aspek | Monitoring Etis | Spyware |
|-------|----------------|---------|
| **Consent** | Subjek yang dimonitor tahu dan setuju secara eksplisit | Dipasang diam-diam tanpa sepengetahuan |
| **Transparency** | Agent terlihat di process list, bisa dihentikan | Disembunyikan, sulit dihapus |
| **Data ownership** | Data milik organisasi/individu yang dimonitor | Data dikirim ke pihak ketiga tanpa izin |
| **Purpose** | Keamanan infrastruktur, troubleshooting, compliance | Pengintaian, kontrol, manipulasi |
| **Scope** | Terbatas pada metrics teknis yang relevan | Tidak terbatas, bisa mencakup konten pribadi |
| **Revocability** | Subjek bisa meminta penghentian monitoring | Tidak bisa dihentikan oleh subjek |

### Prinsip Consent yang Benar

Consent yang sah bukan sekadar klausa kecil di halaman 47 kontrak kerja
yang tidak dibaca siapa pun. Consent yang sah adalah:

1. **Informed** — subjek memahami apa yang dimonitor, oleh siapa, dan untuk apa
2. **Explicit** — dinyatakan secara aktif, bukan diasumsikan
3. **Revocable** — subjek bisa menarik consent kapan pun
4. **Proportionate** — scope monitoring sesuai dengan kebutuhan yang dinyatakan

---

## 3. Preseden: Tools Legitimate yang Disalahgunakan

Kenari bukan yang pertama menghadapi dilema ini. Berikut tools legitimate
yang pernah atau sering disalahgunakan:

### Autopsy (Digital Forensics)
Autopsy adalah tools forensik digital open source yang digunakan oleh
penegak hukum di seluruh dunia untuk investigasi kejahatan siber.
Tools yang sama digunakan oleh pelaku kejahatan untuk menghapus jejak
digital mereka sebelum perangkat disita.

**Respons komunitas:** Autopsy tetap open source. Komunitas percaya bahwa
manfaat untuk penegak hukum dan peneliti keamanan jauh melebihi risiko
penyalahgunaan.

### Ghidra (Reverse Engineering)
NSA merilis Ghidra sebagai open source. Tools ini digunakan untuk:
- Analisis malware (etis)
- Vulnerability research (etis)
- Reverse engineering software tanpa izin (ilegal di banyak yurisdiksi)
- Bypass DRM (abu-abu secara hukum)

### Frida (Dynamic Instrumentation)
Frida digunakan untuk:
- Security research dan penetration testing (etis, dengan izin)
- Bypass proteksi aplikasi mobile (ilegal tanpa izin)
- Cheating di game online (melanggar ToS)
- Analisis malware (etis)

### Metasploit (Penetration Testing)
Framework penetration testing paling populer di dunia. Digunakan oleh:
- Security professionals untuk authorized pen testing (etis)
- Attacker untuk serangan nyata (ilegal)

### Wireshark (Network Analysis)
Digunakan untuk:
- Network troubleshooting (etis)
- Security monitoring (etis)
- Sniffing traffic jaringan orang lain tanpa izin (ilegal)

### Kesimpulan dari Preseden

Semua tools di atas tetap exist dan berkembang. Komunitas keamanan siber
global telah mencapai konsensus: **tools tidak bisa disalahkan atas
penyalahgunaannya**. Yang bertanggung jawab adalah penggunanya.

Tapi konsensus ini tidak berarti komunitas lepas tangan. Ia berarti:
- Dokumentasi etika penggunaan harus jelas
- Komunitas aktif mengecam penyalahgunaan
- Kontribusi yang jelas-jelas bertujuan jahat ditolak
- Hukum yang berlaku harus ditegakkan terhadap pelaku

---

## 4. Landasan Hukum di Indonesia

### UU ITE (UU No. 11 Tahun 2008 jo. UU No. 19 Tahun 2016)

**Pasal 30 — Akses Ilegal:**
> (1) Setiap Orang dengan sengaja dan tanpa hak atau melawan hukum mengakses
> Komputer dan/atau Sistem Elektronik milik Orang lain dengan cara apa pun.
>
> Ancaman: pidana penjara paling lama 6 tahun dan/atau denda paling banyak
> Rp600.000.000,00

Memasang kenari-cli di perangkat orang lain tanpa izin = akses ilegal ke
sistem elektronik milik orang lain.

**Pasal 31 — Intersepsi Ilegal:**
> (1) Setiap Orang dengan sengaja dan tanpa hak atau melawan hukum melakukan
> intersepsi atau penyadapan atas Informasi Elektronik dan/atau Dokumen
> Elektronik dalam suatu Komputer dan/atau Sistem Elektronik tertentu milik
> Orang lain.
>
> Ancaman: pidana penjara paling lama 10 tahun dan/atau denda paling banyak
> Rp800.000.000,00

Menggunakan kenari-cli untuk memantau aktivitas perangkat orang lain tanpa
izin = intersepsi ilegal.

**Pasal 32 — Pengubahan/Perusakan Data:**
> (1) Setiap Orang dengan sengaja dan tanpa hak atau melawan hukum dengan cara
> apa pun mengubah, menambah, mengurangi, melakukan transmisi, merusak,
> menghilangkan, memindahkan, menyembunyikan suatu Informasi Elektronik
> dan/atau Dokumen Elektronik milik Orang lain atau milik publik.

**Pasal 46 — Ketentuan Pidana untuk Pasal 30:**
> (1) Setiap Orang yang memenuhi unsur sebagaimana dimaksud dalam Pasal 30
> ayat (1) dipidana dengan pidana penjara paling lama 6 (enam) tahun
> dan/atau denda paling banyak Rp600.000.000,00

### KUHP (Kitab Undang-Undang Hukum Pidana)

**Pasal 335 — Perbuatan Tidak Menyenangkan (sebelum revisi):**
Pengintaian yang menyebabkan ketakutan atau tekanan psikologis pada korban
dapat dijerat dengan pasal ini.

**Pasal 263 — Pemalsuan:**
Jika kenari-cli disamarkan sebagai aplikasi lain untuk menipu korban agar
menginstallnya, ini masuk kategori pemalsuan.

### UU PKDRT (UU No. 23 Tahun 2004)

Penggunaan stalkerware dalam konteks kekerasan dalam rumah tangga —
memantau pasangan secara diam-diam untuk mengontrol atau mengintimidasi —
dapat dijerat dengan UU Penghapusan Kekerasan Dalam Rumah Tangga.

**Pasal 5:** Setiap orang dilarang melakukan kekerasan dalam rumah tangga
terhadap orang dalam lingkup rumah tangganya, termasuk kekerasan psikis.

Pengintaian digital yang menyebabkan tekanan psikologis = kekerasan psikis.

### UU Perlindungan Data Pribadi (UU No. 27 Tahun 2022)

UU PDP yang baru disahkan memberikan perlindungan eksplisit terhadap
pemrosesan data pribadi tanpa consent:

**Pasal 65:**
> Setiap Orang dilarang secara melawan hukum memperoleh atau mengumpulkan
> Data Pribadi yang bukan miliknya dengan maksud untuk menguntungkan diri
> sendiri atau orang lain yang dapat mengakibatkan kerugian Subjek Data Pribadi.
>
> Ancaman: pidana penjara paling lama 5 tahun dan/atau denda paling banyak
> Rp5.000.000.000,00

Mengumpulkan metrics dari perangkat orang lain tanpa consent = pelanggaran UU PDP.

### Ringkasan Ancaman Pidana

| Tindakan | Pasal | Ancaman Maksimal |
|----------|-------|-----------------|
| Install tanpa izin | UU ITE Pasal 30 | 6 tahun + Rp600 juta |
| Intersepsi/penyadapan | UU ITE Pasal 31 | 10 tahun + Rp800 juta |
| Kumpulkan data tanpa consent | UU PDP Pasal 65 | 5 tahun + Rp5 miliar |
| Stalkerware dalam KDRT | UU PKDRT | 3 tahun + Rp9 juta |

---

## 5. Celah Hukum yang Perlu Dibenahi

Ini adalah bagian yang paling penting dari dokumen ini — dan yang paling
jarang ditulis oleh komunitas teknologi karena dianggap bukan urusan mereka.

Kami percaya sebaliknya: **komunitas teknologi yang membangun tools ini
punya tanggung jawab moral untuk menunjukkan celah hukum yang ada.**

### Celah 1: Definisi "Tanpa Hak" yang Ambigu

UU ITE menggunakan frasa "tanpa hak atau melawan hukum" tapi tidak
mendefinisikan dengan jelas apa yang dimaksud "hak" dalam konteks
monitoring karyawan oleh perusahaan, atau monitoring anak oleh orang tua.

**Akibatnya:** Banyak kasus stalkerware di lingkungan kerja dan keluarga
tidak bisa diproses karena pelaku berargumen bahwa mereka "berhak" memantau
perangkat yang mereka miliki atau bayar.

**Yang dibutuhkan:** Definisi eksplisit bahwa kepemilikan perangkat tidak
otomatis memberikan hak untuk memantau aktivitas penggunanya tanpa consent.

### Celah 2: Tidak Ada Regulasi Khusus Stalkerware

Indonesia belum memiliki regulasi yang secara eksplisit melarang stalkerware
— software yang dirancang khusus untuk memantau seseorang secara diam-diam.

Negara-negara seperti Australia (Stalking Amendment Act), Inggris (Stalking
Protection Act 2019), dan beberapa negara bagian AS sudah memiliki regulasi
spesifik yang melarang penggunaan software pengintaian dalam konteks
kekerasan berbasis gender dan stalking.

**Yang dibutuhkan:** Regulasi spesifik yang mendefinisikan stalkerware dan
melarang penggunaannya, terlepas dari siapa yang memiliki perangkat.

### Celah 3: Lemahnya Perlindungan Whistleblower Teknologi

Peneliti keamanan yang menemukan dan melaporkan kerentanan sering kali
justru dijerat hukum menggunakan UU ITE Pasal 30 (akses ilegal) meskipun
mereka bertindak dengan itikad baik.

Ini menciptakan chilling effect — peneliti takut melaporkan kerentanan,
kerentanan tidak diperbaiki, publik menjadi korban.

**Yang dibutuhkan:** Safe harbor provision yang melindungi peneliti keamanan
yang bertindak dengan itikad baik dan mengikuti responsible disclosure.

### Celah 4: Yurisdiksi Digital yang Tidak Jelas

Jika gateway Kenari berada di Cloudflare (AS), agent di Indonesia, dan
operator di negara ketiga — hukum mana yang berlaku?

UU ITE tidak memberikan panduan yang jelas tentang yurisdiksi lintas negara
untuk kejahatan siber yang melibatkan infrastruktur di multiple jurisdictions.

**Yang dibutuhkan:** Ratifikasi dan implementasi Budapest Convention on
Cybercrime yang memberikan kerangka kerjasama internasional untuk kejahatan
siber lintas yurisdiksi.

### Celah 5: Tidak Ada Kewajiban Disclosure untuk Monitoring Karyawan

Di banyak negara (GDPR di Eropa, misalnya), perusahaan wajib memberitahu
karyawan secara eksplisit jika mereka dimonitor, apa yang dimonitor, dan
bagaimana data tersebut digunakan.

Di Indonesia, tidak ada kewajiban disclosure yang jelas untuk monitoring
karyawan, meskipun UU PDP yang baru mulai mengisi celah ini.

**Yang dibutuhkan:** Regulasi teknis turunan UU PDP yang secara eksplisit
mengatur monitoring di lingkungan kerja, termasuk kewajiban disclosure,
batasan scope, dan hak karyawan untuk menolak.

---

## 6. Komitmen Komunitas Kenari

Sebagai komunitas yang membangun Kenari, kami berkomitmen untuk:

### Yang Akan Kami Lakukan

**1. Menolak kontribusi yang bertujuan menyembunyikan agent**
Pull request yang menambahkan fitur untuk menyembunyikan kenari-cli dari
process list, menyamarkannya sebagai aplikasi lain, atau membuatnya sulit
dihapus akan ditolak tanpa pengecualian.

**2. Mempertahankan transparency by design**
kenari-cli selalu terlihat di process list dengan nama yang jelas.
Tidak ada mode "stealth". Tidak ada fitur untuk menyembunyikan diri.

**3. Mendokumentasikan etika penggunaan secara jelas**
Dokumen ini adalah buktinya. Kami tidak menyembunyikan potensi
penyalahgunaan di balik disclaimer legal yang tidak dibaca siapa pun.

**4. Merespons laporan penyalahgunaan**
Jika ada laporan bahwa Kenari digunakan untuk tujuan jahat, kami akan
merespons secara serius dan bekerja sama dengan pihak berwenang jika diperlukan.

**5. Mendukung penelitian keamanan yang bertanggung jawab**
Kami mendukung responsible disclosure dan tidak akan mengambil tindakan
hukum terhadap peneliti yang menemukan kerentanan dan melaporkannya
dengan itikad baik.

### Yang Tidak Akan Kami Lakukan

- Menambahkan fitur stealth atau anti-detection
- Menyediakan panduan untuk menggunakan Kenari sebagai alat pengintaian
- Menutup mata terhadap laporan penyalahgunaan
- Mengklaim bahwa kami tidak bertanggung jawab atas penyalahgunaan

---

## 7. Surat Terbuka kepada Pemangku Kebijakan

*Kepada Yth.*
*Anggota DPR RI Komisi I (Pertahanan, Intelijen, Komunikasi dan Informatika)*
*Kementerian Komunikasi dan Digital Republik Indonesia*
*Badan Siber dan Sandi Negara (BSSN)*
*Komisi Nasional Hak Asasi Manusia (Komnas HAM)*

Kami adalah komunitas pengembang open source yang membangun tools keamanan
jaringan. Kami menulis surat ini bukan sebagai ancaman atau tuntutan, tapi
sebagai kontribusi dari mereka yang setiap hari berhadapan langsung dengan
realitas teknologi yang sedang Anda regulasi.

**Tentang UU ITE:**

UU ITE dalam bentuknya saat ini masih memiliki celah yang membuat korban
kejahatan siber — khususnya korban stalkerware dan pengintaian digital —
kesulitan mendapatkan keadilan. Di sisi lain, pasal-pasal yang sama sering
digunakan untuk menjerat peneliti keamanan dan whistleblower yang justru
bekerja untuk kepentingan publik.

Kami memohon agar revisi UU ITE berikutnya mempertimbangkan:

1. **Definisi eksplisit stalkerware** sebagai kategori kejahatan tersendiri,
   terlepas dari kepemilikan perangkat

2. **Safe harbor untuk peneliti keamanan** yang melakukan responsible disclosure
   dengan itikad baik

3. **Kewajiban consent yang jelas** untuk monitoring di lingkungan kerja dan
   keluarga, dengan sanksi yang proporsional

4. **Panduan yurisdiksi** untuk kejahatan siber yang melibatkan infrastruktur
   di multiple negara

**Tentang UU PDP:**

UU Perlindungan Data Pribadi yang baru disahkan adalah langkah maju yang
signifikan. Tapi implementasinya membutuhkan regulasi teknis turunan yang
konkret, khususnya untuk:

1. Monitoring di lingkungan kerja — apa yang boleh, apa yang tidak, dan
   bagaimana disclosure yang sah

2. Monitoring anak oleh orang tua — bagaimana menyeimbangkan perlindungan
   anak dengan hak privasi mereka seiring bertambahnya usia

3. Monitoring infrastruktur publik — sekolah, pemerintah daerah, fasilitas
   kesehatan — yang menyimpan data sensitif jutaan warga

**Tentang Literasi Digital:**

Celah terbesar bukan di hukum — tapi di literasi. Jutaan warga Indonesia
menggunakan perangkat digital tanpa memahami bahwa mereka bisa dimonitor,
bagaimana cara mendeteksinya, dan apa hak mereka.

Kami mendukung program literasi digital yang tidak hanya mengajarkan cara
menggunakan teknologi, tapi juga cara melindungi diri dari penyalahgunaannya.

Kenari, dalam visi kami, adalah salah satu kontribusi kecil untuk tujuan itu:
tools monitoring yang transparan, terdokumentasi, dan dibangun dengan etika
sebagai fondasi — bukan afterthought.

Hormat kami,
Komunitas Kenari

---

## 8. Apa yang Bisa Kamu Lakukan

### Sebagai pengguna Kenari

- Selalu dapatkan consent eksplisit sebelum menginstall agent di perangkat orang lain
- Dokumentasikan consent tersebut secara tertulis
- Informasikan kepada semua pihak yang dimonitor tentang apa yang dikumpulkan
- Berikan cara yang mudah untuk menghentikan monitoring

### Sebagai developer yang berkontribusi

- Tolak fitur yang bertujuan menyembunyikan agent
- Laporkan jika kamu melihat penggunaan Kenari untuk tujuan jahat
- Ikuti prinsip privacy by design dalam setiap kontribusi

### Sebagai warga digital

- Pelajari cara memeriksa proses yang berjalan di perangkatmu
- Ketahui hak-hakmu di bawah UU PDP dan UU ITE
- Laporkan penyalahgunaan ke BSSN (bssn.go.id) atau Komnas HAM

### Sebagai korban pengintaian digital

Jika kamu mencurigai perangkatmu dimonitor tanpa izin:

1. **Jangan hapus bukti dulu** — catat apa yang kamu temukan
2. **Hubungi lembaga bantuan:**
   - LBH APIK (untuk kasus KDRT/kekerasan berbasis gender)
   - SAFEnet (Southeast Asia Freedom of Expression Network)
   - BSSN untuk pelaporan insiden siber
3. **Laporkan ke polisi** dengan membawa bukti digital
4. **Konsultasi hukum** — UU ITE Pasal 31 memberikan perlindungan

---

## Penutup

Kami membangun Kenari karena kami percaya bahwa infrastruktur kecil —
sekolah, klinik, kantor desa — berhak mendapat monitoring yang layak.

Kami menulis dokumen ini karena kami percaya bahwa teknologi yang sama
tidak boleh digunakan untuk mengintai, mengontrol, atau menyakiti orang.

Kedua keyakinan ini tidak bertentangan. Mereka adalah dua sisi dari
satu prinsip yang sama: **teknologi harus melayani manusia, bukan
menguasainya.**

Kenari adalah open source. Kodenya bisa dilihat siapa pun. Niatnya
bisa dibaca di sini. Komunitas yang membangunnya bisa dimintai
pertanggungjawaban.

Itu adalah standar yang kami pegang untuk diri kami sendiri.
Dan standar yang kami harapkan dari siapa pun yang menggunakan tools ini.

---

*Dokumen ini adalah living document. Jika ada aspek hukum, etika, atau
teknis yang perlu ditambahkan atau dikoreksi, silakan buka issue atau
pull request di GitHub.*

*Referensi hukum dalam dokumen ini berdasarkan peraturan yang berlaku
pada saat penulisan. Selalu verifikasi dengan sumber resmi terbaru.*
