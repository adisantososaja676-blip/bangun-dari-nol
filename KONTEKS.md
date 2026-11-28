# Konteks Lengkap (arsip percakapan awal)

> Ringkasan semua yang dibahas & diputuskan di sesi Claude pertama (23 Nov 2026), karena chat aslinya dihapus.
> Sesi berikutnya: baca file ini + `PROGRESS.md` + `CLAUDE.md` dulu.

## 1. Asal-usul proyek

- Pemilik mengirim video referensi dari akun **@ngekepoyuk.id** (98 dtk, 9:16): 3D low-poly, maskot manusia "Bang Hakim" (helm kuning, rompi oranye) membangun jembatan dengan format **evolusi solusi**: coba → "Masalahnya, …" → perbaiki → berdiri. Bedahnya ada di `referensi/ANALISIS.md`.
- Pemilik ingin akun & konten serupa. Menurut pemilik, video referensi dibuat dengan bantuan AI (Claude). Kita membangun pipeline sendiri: **naskah → Three.js → render Chromium → MP4**.
- Prinsip: **format boleh mirip, identitas harus orisinal** (tanpa helm kuning/rompi oranye/pohon pinus/label kotak kuning).

## 2. Keputusan dari sesi "grill"

| Topik | Keputusan |
|---|---|
| Kemampuan 3D pemilik | Tidak membuat 3D sendiri. Claude yang membuat semuanya |
| Niche | Awalnya "semua", ditantang → dipilih satu payung: **"Bangun dari Nol"** |
| Tujuan | **Monetisasi** (adsense + brand deal) |
| Waktu/budget pemilik | < 5 jam/minggu, budget ~0 (di luar kredit TTS) |
| Maskot | **Berang-berang insinyur "Pak Bero"** |
| Durasi | 60–90 dtk |
| Cek fakta | Claude riset sendiri + sumber dicantumkan di naskah |
| Platform | YouTube Shorts, TikTok, Instagram Reels, Facebook Reels |
| Jadwal | Awalnya 3x/minggu → diubah pemilik jadi **setiap hari** (stok dulu 5–7 video, jaga ≥3 di depan) |

## 3. Suara (TTS)

- Pemilik memakai **KIE (kie.ai)**, API pay-as-you-go. Saldo awal ±1.080 kredit (sebelum tes).
- Dites 4 suara ElevenLabs Multilingual v2: Liam, Will, **Chris**, Jessica → **dipilih Chris, speed 1.1**.
- Teman pemilik menyarankan Gemini. Hasil tes:
  - **Gemini 2.5 Pro TTS** jalan, sangat murah (±1 kredit per 14 dtk). Pemilik tetap pilih Chris.
  - **Gemini 3.1 Flash & 3.8 Flash** selalu gagal di KIE (kode 524 "generate task timeout", termasuk teks Inggris sederhana). **3.8 Flash-Lite** berhasil.
  - **Keputusan final: ElevenLabs Chris** (setelan di `brand.json` → `tts`).
- KIE tidak memberi timestamp per kata → `tools/timing.mjs` menyelaraskan dari jeda audio.
- ⚠️ API key KIE sempat ditempel di chat → pemilik diminta **membuat key baru**. Key TIDAK disimpan di repo.
- ✅ Key baru disimpan pemilik sebagai **network secret** environment untuk `api.kie.ai` (sesi ep. 02). Proxy menyuntikkan key otomatis: `KIE_API_KEY=proxy-injected NODE_USE_ENV_PROXY=1 node tools/tts.mjs episodes/<ep>`.

## 4. Environment cloud (Claude Code)

- Environment pribadi **"bangun-dari-nol"** dibuat untuk repo ini. Pilih environment ini saat memulai sesi.
- Host yang diizinkan: `kie.ai`, `api.kie.ai`, `tempfile.aiquickdraw.com` (hasil ElevenLabs), `file.aiquickdraw.com` (hasil Gemini), `static.aiquickdraw.com` (contoh suara). Paket npm/pip diizinkan.
- `huggingface.co` **tidak** diizinkan (jadi `tools/align.py`/Whisper belum bisa unduh model).
- Node `fetch` butuh `NODE_USE_ENV_PROXY=1`. CLI KIE: `curl -fsSL https://kie.ai/cli/kie-cli.mjs -o ~/.kie/kie-cli.mjs`.
- GitHub: `gh` GraphQL diblokir. Buat PR lewat REST: `gh api repos/<owner>/<repo>/pulls -f title=… -f head=… -f base=main -F body=@file`.

## 5. Akun sosial media (semua sudah dibuat)

| Platform | Nama | Handle | Catatan |
|---|---|---|---|
| Instagram | Pak Bero \| Bangun Dari Nol | `@pakbero.id` | Foto avatar, bio "🦫 Berang-berang insinyur / Kenapa bangunan bisa berdiri? Aku coba, gagal, lalu bangun lagi 🏗️ / Video baru setiap hari 👇" |
| TikTok | Pak Bero \| Bangun dari Nol | `pakbero.id` | Bio maks 80 karakter: "🦫 Berang-berang insinyur / Coba, gagal, bangun lagi / Video baru tiap hari 👇" |
| YouTube | Pak Bero \| Bangun dari Nol | alternatif (`@pakbero.id` sudah dipakai orang; opsi: `@pakberoid`, `@pakbero-id`, …) | Banner `desain/banner-youtube.png`. Handle final belum dicatat; tanyakan pemilik |
| Facebook Page | Pak Bero Bangun dari Nol | | Kategori Education. Bio tanpa emoji (emoji rusak di FB): "Berang-berang insinyur. Coba, gagal, lalu bangun lagi. Video baru setiap hari!" Disarankan sambung ke IG |

Watermark video = `@pakbero.id` (`brand.json`).

Saran yang sudah diberikan ke pemilik (status belum dikonfirmasi): akun Creator/Bisnis (kategori Education) di IG & TikTok, nomor HP untuk pemulihan, email bisnis khusus, label AI per postingan (narasi suara AI), YouTube "bukan untuk anak-anak" bila target umum.

## 6. Episode

| # | Topik | Status |
|---|---|---|
| 01 | Bendungan | ✅ **Sudah diunggah pemilik ke semua platform (23 Nov 2026)** dengan cover `01-bendungan-cover.jpg` |
| 02 | Rumah tahan gempa | ✅ **Tayang** (sesi 3). Menyebut gempa Nias 2005 (visual tenang) |
| 03 | Pondasi di tanah lembek | ✅ **Tayang** (sesi 3) |
| 04 | Jembatan lengkung (**request penonton** @Danzzz_W2s di YouTube ep. 01) | ✅ Diproduksi di sesi 4, siap upload. Rantai sengaja beda dari video referensi (jembatan gantung) |
| 05 | Jalan raya | ✅ Siap upload (sesi 4) |
| 06 | Kolam renang (request penonton) | ✅ Siap upload (sesi 4) |

Ep. 01 menyebut tragedi **Situ Gintung (2009)**: visual dibuat tenang & serius. Kalau ada komentar korban/keluarga, balas dengan empati.

## 7. Masalah teknis yang sudah dipecahkan (jangan diulang)

- Kamera di lembah sempit tertutup tebing → taruh kamera di atas alur (|x|<3.5) atau pakai diagram potongan.
- Panah gaya tertutup air → `depthTest:false` + `renderOrder`.
- Tanah z-fighting (berkedip cokelat) → jangan biarkan dua permukaan di ketinggian sama.
- Render macet di akhir → audio lebih pendek dari video + `-shortest`. Diperbaiki dengan `apad` + deteksi ffmpeg tertutup + coba ulang per frame.
- Cover/thumbnail: judul harus di 15–80% tinggi (grid IG memotong ke 3:4).
- Banner YouTube: isi penting di area aman 1546x423 tengah.
- Kecepatan render: preview 540x960 ±10 menit; final 1080x1920 ±25 menit untuk 90 dtk.

## 8. Cara kerja dengan pemilik

- Bahasa Indonesia santai. Pemilik suka langkah konkret ("isi apa", "klik apa").
- Setiap hasil kerja → commit → push → PR (pemilik ingin progres tersimpan walau pindah akun Claude).
- Kirim file ke pemilik (video/gambar) saat selesai. Video final tidak di-commit (besar); bisa dirender ulang.

---

# Sesi 2 (23 Nov 2026): Ep. 02 Rumah tahan gempa

> Arsip chat sesi kedua (pemilik akan menghapus chat-nya). Sesi berikutnya: baca juga bagian ini.

## Yang dikerjakan

- Pemilik minta "gas lagi untuk konten besok". Repo `main` masih versi lama; pekerjaan terbaru ada di branch `pilot-bendungan` (PR #1, **belum di-merge**). Sesi ini bekerja di branch `claude/trusting-ptolemy-6xa877` yang dibuat dari `pilot-bendungan`.
- **PR #2** (`claude/trusting-ptolemy-6xa877` → base `pilot-bendungan`) berisi ep. 02. Setelah PR #1 di-merge, base PR #2 otomatis pindah ke `main`. Urutan merge: **PR #1 dulu, lalu PR #2**.
- Ep. 02 selesai penuh: riset + naskah + cek fakta → TTS → animasi → preview → **disetujui pemilik ("OK")** → final 1080x1920 (39 MB, 81 dtk) + cover. File video & cover dikirim ke pemilik di chat (tidak di-commit; render ulang dengan perintah di bawah).

## Keputusan & catatan

| Topik | Catatan |
|---|---|
| API key KIE | Pemilik memasukkan key baru lewat formulir aman → tersimpan sebagai **network secret** environment untuk host `api.kie.ai`. Tidak perlu minta key lagi. Jalankan: `KIE_API_KEY=proxy-injected NODE_USE_ENV_PROXY=1 node tools/tts.mjs episodes/<ep>` |
| Biaya TTS ep. 02 | 24 kredit (1.280 karakter) |
| Cover ep. 02 | Dipilih frame **t=53.9** (rumah oleng, atap genteng berat, Pak Bero terlihat), bukan frame runtuh (t=21.8) yang kurang jelas. Teks: "Rumah tahan\|*gempa*?" + tag "Bisa nggak?" |
| Fakta sensitif ep. 02 | Gempa Nias 2005: visual tenang. Angka "hampir 30 ribu gempa" = versi Kepala BMKG (BPS: 7.442, metode beda) |
| Kit baru | `buildField` (tanah lapang) & `quake` (goyangan gempa) di `engine/kit.js`, dipakai ulang untuk episode di darat |
| Kirim file ke pemilik | Panel file di aplikasi Claude **tidak bisa membuka file repo** (izin sesi). Kirim file sebagai lampiran (SendUserFile) dan/atau tempel isi caption langsung di chat |

## Render ulang ep. 02

```bash
node tools/render.mjs --ep 02-rumah-gempa --scale 2                       # final → out/02-rumah-gempa.mp4 (±21 menit)
node tools/render.mjs --ep 02-rumah-gempa --still 53.9 --scale 2 --clean  # frame cover
node tools/cover.mjs out/02-rumah-gempa-t53_9.png "Rumah tahan|*gempa*?" "Bisa nggak?" out/02-rumah-gempa-cover.jpg
```

## Status per akhir sesi 2

- Ep. 02: **siap upload** (pemilik upload besok, caption di `episodes/02-rumah-gempa/upload.md`).
- Ep. 03: usulan Claude **"Pondasi di tanah lembek"** (rumah ep. 02 dipindah ke rawa lalu amblas; hook Jakarta turun; rantai: pondasi dangkal → pondasi telapak → konsolidasi → penurunan tidak seragam → tiang pancang; fakta penutup Menara Pisa / pondasi cakar ayam, **perlu riset**). Pemilik sempat mengetik "gas ep 3" tapi belum dikirim → anggap **belum disetujui**, tanyakan dulu.
- Cadangan ep. 04–05: Gedung pencakar langit vs angin (peredam Taipei 101), Jalan raya.

---

# Sesi 3 (23 Nov 2026): Ep. 03 Pondasi di tanah lembek + naskah ep. 04

> Arsip chat sesi ketiga (pemilik menghapus chat-nya setelah sesi ini). Sesi berikutnya: baca juga bagian ini.

## Yang dikerjakan

- PR #1 & #2 sudah di-merge sebelumnya. Sesi ini bekerja di branch `claude/determined-fermat-dkrh49` → **PR #3**, di-merge ke `main` di akhir sesi atas permintaan pemilik.
- **Ep. 03 selesai penuh:** pemilik mengunggah `naskah.md` + `script.json` (hasil sesi sebelumnya) dan menulis "lanjut ep 3" → TTS → animasi → preview → **disetujui ("OK gas")** → final 1080x1920 (24 MB, 81,5 dtk) + cover. Video, cover, dan `upload.md` dikirim ke pemilik sebagai lampiran (pemilik sudah mengunduh ketiganya).
- **Ep. 04 = request penonton:** komentar YouTube ep. 01 dari @Danzzz_W2s: "Buat jembatan" (2 like). Pemilik minta riset "super akurat dan berdaging". Naskah **jembatan lengkung** + cek fakta ditulis, direview pemilik (pemilik mengecek langsung ke sumber), direvisi, lalu pemilik memutuskan **"dokumen aja untuk ep 4"**.

## Keputusan & catatan

| Topik | Catatan |
|---|---|
| API key KIE | Key lama ditolak (401). Pemilik menyimpan key baru lewat formulir aman → network secret `api.kie.ai` (Authorization: Bearer). Saldo sebelum TTS ep. 03: 982,86 kredit; TTS ep. 03 = 24 kredit (1.295 karakter) → sisa ±959 |
| Gaya visual ep. 03 | **Diorama potongan tanah**: balok tanah melayang, muka depan terpotong di garis dinding depan rumah, supaya lapisan tanah, air pori, pondasi & tiang pancang terlihat |
| Aset baru | `engine/house.js` (`createHouse`: rumah akhir ep. 02, retak via `setCrack`) & `engine/soil.js` (`buildDiorama`: lapisan tanah, rawa, batu). Dipakai ulang untuk ep. jalan raya/terowongan |
| Hook ep. 03 | Rumah sudah amblas & miring (teaser), lalu rumah "diterbangkan" ke rawa |
| Pisa | Visual miring 5,5° → berkurang 0,5°; angka populer 3,97° sengaja tidak dipakai |
| Cover ep. 03 | Frame t=1.5 (rumah amblas, miring, retak). Teks "Rumah di tanah\|*lembek*?" + "Bisa nggak?" |
| Kecepatan render | Preview 540x960 ±6 menit; final 1080x1920 ±15 menit (81 dtk) |
| Ep. 04 vs referensi | Video referensi = jembatan **gantung** (tali → kabel → angkur → Tacoma → rangka pengaku). Ep. 04 sengaja **lengkung**: lempeng batu → lengkung batu → pangkal → lengkung baja + batang pengikat → pemuaian → perletakan + siar muai. Penggantung jalan di animasi = **batang baja tegak**, jangan tonjolkan kabel |
| Review pemilik ep. 04 | Fakta benar (Fabricius 62 SM, metode Kalikuto, lengkung terikat, 3,6 cm). Diperbaiki: alasan pangkal raksasa = **tepi tanah lunak** (bukan sungai lebar); "Batang Semarang" tanpa tanda pisah (aman untuk TTS); link VINCI rusak dihapus; durasi ±89 dtk (batas 90 dtk). Label tahap baja (`batang pengikat`, `perletakan`, `siar muai`) harus muncul **satu per satu** |
| Riset dari container | Jaringan container memblokir WebFetch ke situs sumber (DNS ENOTFOUND). Verifikasi lewat WebSearch silang; pemilik bisa cek langsung |
| Ide engagement | Pemilik membalas komentar request ("Siap, request diterima! 🦫🌉 …") |
| Nama penonton di video | **Tidak ditampilkan** (pemilik: "kalo ragu gausah aja"). Ep. 04 cukup "request dari komentar kalian" seperti di naskah; **jangan** buat kartu "Request: @…". Berlaku juga untuk request berikutnya kecuali pemilik bilang lain |

## Pertanyaan terbuka untuk pemilik

- Kapan ep. 04 lanjut produksi (TTS ±24 kredit + animasi)?
- Handle YouTube final (dari sesi 1, masih belum dicatat).

## Status per akhir sesi 3

| Ep | Status |
|---|---|
| 01 Bendungan | Tayang |
| 02 Rumah tahan gempa | ✅ **Tayang** (diunggah pemilik di akhir sesi 3) |
| 03 Pondasi di tanah lembek | ✅ **Tayang** (diunggah pemilik di akhir sesi 3) |
| 04 Jembatan lengkung | 📄 Dokumen saja: `script.json` final, `naskah.md` (cek fakta + rencana adegan per baris + perintah produksi). (→ diproduksi di sesi 4) |

## Render ulang ep. 03

```bash
node tools/render.mjs --ep 03-pondasi-lembek --scale 2                       # final → out/03-pondasi-lembek.mp4
node tools/render.mjs --ep 03-pondasi-lembek --still 1.5 --scale 2 --clean   # frame cover
node tools/cover.mjs out/03-pondasi-lembek-t1_5.png "Rumah di tanah|*lembek*?" "Bisa nggak?" out/03-pondasi-lembek-cover.jpg
```

---

# Sesi 4 (25 Nov 2026): Ep. 04 Jembatan lengkung, Ep. 05 Jalan raya, Ep. 06 Kolam renang

> Arsip chat sesi keempat (pemilik menghapus chat-nya setelah sesi ini). Sesi berikutnya: baca juga bagian ini.

## Yang dikerjakan

- Pemilik: "baca KONTEKS.md dan PROGRESS.md, lanjut ep 4" = aba-aba produksi ep. 04. Branch sesi `claude/ecstatic-albattani-p2o9xb` → **PR #5** (ep. 04 + 05 + 06 dalam satu PR karena sesi hanya punya satu branch; judul PR diganti atas pilihan pemilik). **Di-merge ke `main` di akhir sesi atas permintaan pemilik.**
- **Ep. 04 Jembatan lengkung** (request penonton): TTS → animasi → preview OK → final + cover + `upload.md`.
- **Ep. 05 Jalan raya** (dipilih pemilik dari usulan Claude; alternatif waktu itu: gedung vs angin, candi tanpa semen). Pemilik minta "risetnya akurat" → naskah + cek fakta → OK → produksi → final.
- **Ep. 06 Kolam renang** (request penonton, disampaikan pemilik di chat) → naskah + cek fakta → OK → produksi → final.
- Semua video final, cover & `upload.md` dikirim ke pemilik sebagai lampiran (tidak di-commit; render ulang dengan perintah di bawah).

## Keputusan & catatan

| Topik | Catatan |
|---|---|
| API key KIE | Key sesi 3 **kedaluwarsa** (401 "API key expired at 2026-11-24"). Pemilik menyimpan key baru lewat formulir aman (network secret `api.kie.ai`). Kalau muncul 401 expired lagi: minta pemilik isi formulir lagi, jangan minta key di chat |
| Saldo KIE | 958,86 → 3 × 24 kredit → **886,86 kredit** di akhir sesi |
| Durasi > 90 dtk | Jangan TTS ulang (bayar). Pakai `python3 tools/trim-pauses.py episodes/<ep>` (jeda > 0,5 dtk dipangkas jadi 0,5 dtk; audio asli disimpan sebagai `audio-asli.mp3`, tidak di-commit), lalu `node tools/timing.mjs episodes/<ep>`. Ep. 04: 91,6 → 85,8; ep. 05: 87,3 → 83,1; ep. 06: 85,6 → 79,3 dtk |
| Alur kerja yang disukai pemilik | Naskah + cek fakta + "catatan akurasi (minta pemilik cek)" dulu → pemilik bilang OK → TTS + animasi → preview → OK → final + cover + `upload.md`. Pemilik membalas singkat ("OK", "ok", "1") |
| Request penonton | Nama penonton **tidak** ditampilkan (kartu intro "Request dari komentar"). `upload.md` menyertakan template balasan komentar request |
| Kamera 9:16 | Benda lebar (jembatan, jalan, kolam) gampang terpotong. Taruh Pak Bero di belakang objek (z negatif) supaya ikut terlihat; kamera agak tinggi melihat ke bawah. Label dekat tepi layar terpotong → geser ke tengah |
| Gaya visual ep. 05 & 06 | Diorama potongan (dipotong di z=0 melewati garis tengah jalan/kolam). Ep. 06 membangun tanah dari balok di sekitar lubang (bukan `buildDiorama` utuh) supaya lubang bisa digali; muka air tanah = bidang biru di muka potongan |
| Cover | Ep. 04: t=62.5 (jembatan baja merah), "Bikin jembatan\|*lengkung*?". Ep. 05: t=2 (mobil hampir masuk lubang), "Jalan nggak gampang\|*bolong*?". Ep. 06: t=1.2 (kolam biru + pelampung), "Bikin kolam\|*renang*?". Semua + tag "Bisa nggak?". Judul cover sering menutupi kepala Pak Bero; pilih frame yang tetap jelas |
| Fakta yang sengaja dibuat hati-hati | Ep. 05: "sekitar 2 persen", "bisa … sampai 16 kali lipat" (AASHO; analisis ulang ≈ 8×), Buton "salah satu yang terbesar" (bukan "80% dunia"). Ep. 06: "bisa terangkat" + "air tanah yang tinggi", "kalau dalamnya 2 meter" (aturan baru World Aquatics min. 2,5 m) |
| Aset baru | `engine/car.js` (mobil), `engine/truck.js` (truk, `setLoad` 0–2 untuk kelebihan muatan), `tools/trim-pauses.py` |
| Render paralel | Dua render bisa jalan bersamaan dengan `--port` berbeda (mis. `--port 8125`). Final 1080x1920 ±15–20 menit, preview ±5–6 menit |

## Status per akhir sesi 4

| Ep | Status |
|---|---|
| 01–03 | Tayang |
| 04 Jembatan lengkung | ✅ **Siap upload** (video, cover, `upload.md` sudah di tangan pemilik) |
| 05 Jalan raya | ✅ **Siap upload** |
| 06 Kolam renang | ✅ **Siap upload** |
| 07 | Belum. Cek request di komentar dulu; cadangan: gedung vs angin (Taipei 101), terowongan, candi tanpa semen |

## Pertanyaan terbuka untuk pemilik

- Handle YouTube final (dari sesi 1, masih belum dicatat).
- Topik ep. 07 (request baru?).

## Render ulang ep. 04–06

```bash
node tools/render.mjs --ep 04-jembatan-lengkung --scale 2
node tools/render.mjs --ep 04-jembatan-lengkung --still 62.5 --scale 2 --clean
node tools/cover.mjs out/04-jembatan-lengkung-t62_5.png "Bikin jembatan|*lengkung*?" "Bisa nggak?" out/04-jembatan-lengkung-cover.jpg

node tools/render.mjs --ep 05-jalan-raya --scale 2
node tools/render.mjs --ep 05-jalan-raya --still 2 --scale 2 --clean
node tools/cover.mjs out/05-jalan-raya-t2.png "Jalan nggak gampang|*bolong*?" "Bisa nggak?" out/05-jalan-raya-cover.jpg

node tools/render.mjs --ep 06-kolam-renang --scale 2
node tools/render.mjs --ep 06-kolam-renang --still 1.2 --scale 2 --clean
node tools/cover.mjs out/06-kolam-renang-t1_2.png "Bikin kolam|*renang*?" "Bisa nggak?" out/06-kolam-renang-cover.jpg
```

---

# Sesi 5 (28 Nov 2026): Ep. 07 Gedung pencakar langit vs angin

> Arsip chat sesi kelima. Sesi berikutnya: baca juga bagian ini.

## Yang dikerjakan

- Pemilik: "baca KONTEKS.md dan PROGRESS.md, lanjut ep 7". Tidak ada request penonton baru → Claude menawarkan 4 topik (gedung vs angin, candi tanpa semen, terowongan, rel kereta) → pemilik pilih **gedung vs angin**.
- Branch sesi `claude/bold-ptolemy-x1c1pf`. Alur sama dengan sesi 4: naskah + cek fakta → "OK" → TTS + animasi → preview → "OK" → final + cover + `upload.md` (dikirim sebagai lampiran, tidak di-commit).

## Keputusan & catatan

| Topik | Catatan |
|---|---|
| API key KIE | Kedaluwarsa lagi (401 "expired at 2026-11-26"), ±2 hari setelah disimpan. Disimpan ulang lewat formulir aman (`request_credential`, host `api.kie.ai`). Perkirakan tiap sesi perlu isi ulang |
| Saldo KIE | 886,86 → 24 kredit → **862,86** |
| Durasi | Audio 86,1 → **79,7 dtk** setelah `trim-pauses.py` |
| Rantai | Bata (dinding menebal, Monadnock 1891) → rangka baja (goyang, mual) → pengaku silang + inti beton → pusaran bergantian (resonansi) → sudut bertangga → topan → peredam massa → Taipei 101 (660 ton, lantai 87–92, ayunan 1 m topan Soudelor 2015) |
| Fakta hati-hati | Angka 25% (sudut) & 40% (peredam) sengaja tidak dipakai (sumber slide/pabrikan). "1 meter" = ayunan bola, bukan gedung |
| Aset baru | `engine/tower.js` (`createTower`): gedung per lantai, goyangan geser via matriks per lantai (fungsi murni dari t), pengaku, inti, kaca kotak/bertangga, opsi `coreTop`/`braceTop`. Bisa dipakai ulang untuk gedung parkir, gempa gedung tinggi, tower crane |
| Visual | Pusaran ditampilkan dari **tampak atas** (kamera di atas sisi hulu angin, layar-atas = arah angin). Bola peredam harus emisif + pengaku atas disembunyikan supaya terlihat |
| Cover | t=26.5 (rangka baja melengkung + panah angin), "Gedung tinggi tahan\|*angin*?" + "Bisa nggak?" |
| Render final | ±12,5 menit (2.390 frame), 50 MB |

## Status per akhir sesi 5

| Ep | Status |
|---|---|
| 01–03 | Tayang |
| 04–06 | ✅ **Tayang** (dikonfirmasi pemilik di akhir sesi 5) |
| 07 Gedung vs angin | ✅ **Siap upload** |
| 08 Candi tanpa semen | ✅ **Siap upload** (lihat bagian ep. 08 di bawah) |
| 09 Rel kereta | ✅ **Siap upload** (lihat bagian ep. 09 di bawah) |
| 10 | Belum. Cadangan: terowongan, kapal besi mengapung, tower crane |

## Render ulang ep. 07

```bash
node tools/render.mjs --ep 07-gedung-angin --scale 2
node tools/render.mjs --ep 07-gedung-angin --still 26.5 --scale 2 --clean
node tools/cover.mjs out/07-gedung-angin-t26_5.png "Gedung tinggi tahan|*angin*?" "Bisa nggak?" out/07-gedung-angin-cover.jpg
```

## Ep. 08 Candi tanpa semen (sesi 5, lanjutan)

- Pemilik: "lanjut ep 8" → pilih **candi tanpa semen** dari 4 usulan → naskah OK → preview OK → final.
- TTS 24 kredit (sisa **838,86**), 79,7 → 73,7 dtk. Key KIE masih berlaku di hari yang sama.
- Rantai: batu tumpuk → gempa, bergeser → ekor burung & takikan → ambang pintu patah → lengkung semu → hujan menggenang → jaladwara (Borobudur 100) → air meresap, dinding miring → pemugaran (saluran air + lapisan kedap). Fakta: pemugaran 1973–1983, ±1 juta batu dibongkar & dipasang lagi (NatGeo, angka bulat).
- **Sensitivitas:** candi = tempat ibadah aktif. Candi di animasi = rekaan sederhana (bukan replika), tanpa arca, Pak Bero tidak memanjat stupa. Borobudur hanya siluet di bagian fakta.
- Cover t=1.5 (candi utuh), "Bikin candi tanpa|*semen*?" + "Bisa nggak?".

```bash
node tools/render.mjs --ep 08-candi --scale 2
node tools/render.mjs --ep 08-candi --still 1.5 --scale 2 --clean
node tools/cover.mjs out/08-candi-t1_5.png "Bikin candi tanpa|*semen*?" "Bisa nggak?" out/08-candi-cover.jpg
```

## Penutup sesi 5

- Pemilik: ep. 04–06 **sudah tayang**; **belum ada request penonton** baru untuk ep. 09.
- Semua pekerjaan sesi 5 (ep. 07 + 08) di-PR & di-merge ke `main` atas permintaan pemilik ("push semua ke github karena aku akan hapus sesi ini"). Sesi berikutnya mulai dari `main`.
- Stok siap upload: ep. 07, 08 (video/cover/upload.md sudah di tangan pemilik; render ulang dengan perintah di atas kalau hilang).

## Ep. 09 Rel kereta (sesi 5, lanjutan setelah PR #6)

- Pemilik: "lanjut ep 9", belum ada request → pilih **rel kereta**. Branch sesi dimulai ulang dari `main` (PR #6 sudah merge).
- TTS 24 kredit (sisa **814,86**), 78,0 → 72,5 dtk.
- Rantai: rel di tanah amblas → bantalan → hujan, bantalan geser → kerikil balas → panas, memuai & melengkung → celah sambungan ("jeglek") → ujung rel aus → rel dilas panjang + dijepit. Fakta: Whoosh pakai pelat beton (slab track), sampai 350 km/jam. Kereta cepat di animasi = desain umum, bukan replika.
- Aset baru: `engine/train.js`. Cover t=34.8 (rel merah melengkung), "Bikin rel|*kereta*?".

```bash
node tools/render.mjs --ep 09-rel-kereta --scale 2
node tools/render.mjs --ep 09-rel-kereta --still 34.8 --scale 2 --clean
node tools/cover.mjs out/09-rel-kereta-t34_8.png "Bikin rel|*kereta*?" "Bisa nggak?" out/09-rel-kereta-cover.jpg
```
