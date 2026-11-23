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
- ⚠️ API key KIE sempat ditempel di chat → pemilik diminta **membuat key baru**. Key TIDAK disimpan di repo. Minta key ke pemilik saat perlu TTS.

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
| 02 | Rumah tahan gempa (usulan) | Belum dimulai |
| 03–05 | Pondasi tanah lembek, Gedung vs angin, Jalan raya (usulan, aset saling pakai ulang) | Belum |

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
