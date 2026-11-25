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
| 04 | Jembatan lengkung (**request penonton** @Danzzz_W2s di YouTube ep. 01) | 📄 Dokumen saja (naskah final + cek fakta + rencana adegan), produksi menunggu pemilik (sesi 3). Rantai sengaja beda dari video referensi (jembatan gantung) |
| 05 | Gedung vs angin / Jalan raya (usulan) | Belum |

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
| 04 Jembatan lengkung | 📄 Dokumen saja: `script.json` final, `naskah.md` (cek fakta + rencana adegan per baris + perintah produksi). **Jangan buat audio/animasi sebelum pemilik bilang lanjut** |

## Render ulang ep. 03

```bash
node tools/render.mjs --ep 03-pondasi-lembek --scale 2                       # final → out/03-pondasi-lembek.mp4
node tools/render.mjs --ep 03-pondasi-lembek --still 1.5 --scale 2 --clean   # frame cover
node tools/cover.mjs out/03-pondasi-lembek-t1_5.png "Rumah di tanah|*lembek*?" "Bisa nggak?" out/03-pondasi-lembek-cover.jpg
```

---

# Sesi 4 (25 Nov 2026): Produksi ep. 04 Jembatan lengkung

- Pemilik: "baca KONTEKS.md dan PROGRESS.md, lanjut ep 4" = aba-aba produksi ep. 04. Branch `claude/ecstatic-albattani-p2o9xb`.
- **Key KIE kedaluwarsa** (401 "API key expired at 2026-11-24") → pemilik menyimpan key baru lewat formulir aman (network secret `api.kie.ai`). Saldo 958,86 → TTS 24 kredit → **934,86**.
- Audio asli 91,6 dtk (> 90). Daripada TTS ulang (bayar), jeda antar-kalimat dipangkas ke maks. 0,5 dtk → 84,5 dtk. Cara ini bisa dipakai lagi kalau episode kepanjangan (perintah di log PROGRESS).
- Preview disetujui ("OK") → final 1080x1920 + cover (frame t=62.5, jembatan baja merah; teks "Bikin jembatan|*lengkung*?" + "Bisa nggak?") + `upload.md` dikirim.
- **Ep. 05 = Jalan raya** (pilihan pemilik dari usulan Claude; alternatif: gedung vs angin, candi tanpa semen). Pemilik minta riset super akurat → 3 catatan akurasi di `naskah.md` (2%, 16×, Buton). Naskah OK → audio + animasi + preview dikirim, menunggu OK.
- Render ulang ep. 04: `node tools/render.mjs --ep 04-jembatan-lengkung --scale 2`; cover: `--still 62.5 --scale 2 --clean` lalu `node tools/cover.mjs out/04-jembatan-lengkung-t62_5.png "Bikin jembatan|*lengkung*?" "Bisa nggak?" out/04-jembatan-lengkung-cover.jpg`.
- Keputusan visual: kartu intro "Request dari komentar / Bikin jembatan, yuk!" (tanpa nama penonton). Label baja muncul satu per satu (Baja → Jalan digantung → Batang pengikat → Memuai → +3,6 cm → Dikunci/Retak → Perletakan → Siar muai). Penggantung = batang baja tegak.
