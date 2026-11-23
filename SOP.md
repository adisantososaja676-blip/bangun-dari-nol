# SOP Produksi & Upload

Alur lengkap satu video, dari ide sampai tayang. **Claude** = sesi Claude Code di repo ini. **Kamu** = pemilik akun.

## A. Produksi (per video)

| # | Langkah | Siapa | Output |
|---|---|---|---|
| 1 | Pilih topik dari `IDE-VIDEO.md` (atau komentar "bangun apa lagi?") | Kamu / Claude | |
| 2 | Riset + naskah + tabel cek fakta + caption | Claude | `episodes/NN-topik/naskah.md`, `script.json` |
| 3 | Review naskah (±5 menit, terutama bagian fakta) | Kamu | OK / revisi |
| 4 | Generate suara (ElevenLabs Chris via KIE) + sinkron timing | Claude (`tools/tts.mjs`, butuh API key KIE) | `audio.mp3`, `timing.json` |
| 5 | Animasi 3D + preview 540x960 | Claude | `out/NN-preview.mp4` |
| 6 | Tonton preview (±3 menit) | Kamu | OK / revisi per detik |
| 7 | Render final 1080x1920 + cover | Claude | `out/NN-topik.mp4`, `out/NN-cover.jpg` |
| 8 | Commit + PR (progres tersimpan di GitHub) | Claude | PR |
| 9 | Upload ke 4 platform (bagian B) | Kamu (±20 menit) | Tayang |
| 10 | Balas komentar di 1 jam pertama, catat ide topik dari komentar | Kamu (±10 menit) | Ide baru → `IDE-VIDEO.md` |

**Jadwal:** posting **setiap hari** jam **18.00–19.00 WIB**, tapi baru mulai setelah ada stok 5–7 video. Selalu jaga ≥3 video siap di depan.

## B. Checklist upload (file yang SAMA ke semua platform)

Pakai file **final 1080x1920** (`out/NN-topik.mp4`), **bukan** hasil download dari platform lain, supaya tidak ada watermark platform lain yang bisa menurunkan jangkauan. Teks caption untuk setiap episode ada di `episodes/NN-topik/upload.md`.

### 1. YouTube Shorts (aplikasi YouTube → + → Upload video, atau YouTube Studio)
- [ ] Judul (maksimal 100 karakter) + deskripsi + hashtag dari `upload.md`
- [ ] **Audience:** "No, it's not made for kids" **kalau** targetnya umum/remaja-dewasa (ini keputusanmu sendiri dan harus jujur; "made for kids" mematikan komentar dan membatasi monetisasi)
- [ ] **Altered or synthetic content:** "No". Animasinya jelas kartun dan suaranya bukan tiruan orang nyata. Kalau aturan YouTube berubah, ikuti yang terbaru.
- [ ] Visibility: Public (atau Schedule ke jam 18.00)

### 2. TikTok (aplikasi → + → Upload)
- [ ] Caption + hashtag dari `upload.md`
- [ ] Cover: pilih frame Pak Bero (sekitar detik 3–5)
- [ ] More options → **AI-generated content: ON** (narasinya suara AI; lebih aman transparan)
- [ ] Allow comments, Duet, Stitch: ON

### 3. Instagram Reels (aplikasi → + → Reel)
- [ ] Caption + hashtag dari `upload.md`
- [ ] Cover: upload `out/NN-cover.jpg` atau pilih frame
- [ ] Advanced settings → **AI label: ON**
- [ ] **Share to Facebook: ON** (otomatis tayang juga di Facebook, jadi langkah 4 cukup dicek)

### 4. Facebook Reels
- [ ] Kalau "Share to Facebook" di IG aktif dan sudah tersambung ke Page "Pak Bero | Bangun dari Nol", cukup cek sudah tayang
- [ ] Kalau belum tersambung: upload manual di Page → Reel, caption sama

### 5. Setelah tayang
- [ ] Balas 5–10 komentar pertama (algoritma suka interaksi awal)
- [ ] Pin komentar sendiri: "Habis ini Pak Bero bangun apa? Tulis di bawah 👇"
- [ ] Catat usulan topik dari komentar

## C. Evaluasi (setelah 12 video)

Lihat di statistik tiap platform: **retensi 3 detik pertama**, **% rata-rata ditonton**, **komentar & share**. Topik/hook yang menang dibuat versi lanjutannya.
