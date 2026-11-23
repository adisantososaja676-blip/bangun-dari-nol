# Plan: Akun Edukasi 3D "Bangun dari Nol"

## 1. Keputusan (hasil sesi grill)

| Pertanyaan | Keputusan |
|---|---|
| Payung konten | **"Bangun dari nol"**: maskot membangun sesuatu, gagal, lalu memperbaikinya. Satu video = satu rantai evolusi solusi. |
| Maskot | **Berang-berang insinyur**. Usulan nama: *Pak Bero*, *Bang Berang*, *Si Bendu*. |
| Tujuan | Monetisasi (adsense + brand deal) |
| Kapasitas | < 5 jam/minggu, budget ~0 (di luar TTS). Jadwal harian ≈ 3–3,5 jam/minggu waktu pemilik |
| Suara | AI TTS berbayar, di-generate sendiri |
| Durasi | 60–90 detik, 9:16 |
| Platform | YouTube Shorts, TikTok, Instagram Reels, Facebook Reels (file yang sama, tanpa watermark) |
| Cek fakta | Riset oleh Claude, sumber dilampirkan di setiap naskah |

## 2. Pembeda dari referensi

Format boleh sama, identitas harus milik sendiri:

- **Maskot:** berang-berang dengan kacamata pelindung + sabuk alat (bukan manusia berhelm kuning/rompi oranye)
- **Palet:** lebih hangat (langit sore, air toska) daripada biru-hijau standar
- **Label:** pil putih membulat (bukan kotak kuning)
- **Catchphrase penutup** sendiri
- **Handle:** hindari pola "…yuk.id". Usulan: `@daribero`, `@berangbangun`, `@kokbisaberdiri`
- Topik **jembatan gantung** ditunda ke paling akhir karena terlalu mirip video referensi

## 3. Rumus naskah (template wajib)

1. **Hook (0–3 dtk):** tantangan. Contoh: *"Nahan sungai cuma pakai ranting, bisa nggak?"*
2. **Solusi 1** (paling sederhana) → **"Masalahnya, …"** → gagal secara visual (patah, bocor, roboh)
3. Ulangi 3–4 kali. **Satu istilah teknis baru per tahap**, diberi label di layar
4. **Fakta kejutan** sejarah/dunia nyata (seperti Tacoma di video referensi)
5. **Hasil akhir berdiri** → tutup dengan *"Habis ini, bangun apa lagi ya?"* (memancing komentar = sumber ide berikutnya)

Aturan teks layar: subtitle per kata, **kuning** = istilah teknis, **merah** = kata kegagalan.

## 4. Pipeline produksi (target waktumu ±1–1,5 jam/video)

| Langkah | Siapa | Waktumu |
|---|---|---|
| Riset, naskah, shot list, dan sumber | Claude | 10 menit review |
| Generate TTS dan upload audio | Kamu | 10 menit |
| Timestamp per kata (Whisper), scene Three.js, subtitle, render MP4 | Claude | 0 |
| Review render dan minta revisi | Kamu | 10–15 menit |
| Upload ke 4 platform beserta caption dan hashtag | Kamu | 20 menit |

Catatan:
- Kalau TTS bisa ekspor timestamp per kata (mis. ElevenLabs), pakai itu: lebih presisi daripada Whisper.
- Tetap baca bagian "fakta kejutan" di setiap naskah (2 menit): bagian ini paling sering dikoreksi penonton.

### Setup satu kali (minggu 0)

- Model berang-berang low-poly + animasi: jalan, panik, senang, menunjuk
- Scene kit yang bisa dipakai ulang: tanah, sungai, tebing, pohon, langit, air
- Gaya subtitle, label, panah gaya, efek angin & retak
- Template intro/outro + watermark handle

## 5. Jadwal

- **Minggu 0:** setup pipeline, maskot, pilot "Bendungan" ✅
- **Sebelum posting pertama:** kumpulkan stok 5–7 video + perbanyak aset 3D yang bisa dipakai ulang (tanah, beton, baja, crane, gedung)
- **Lalu posting SETIAP HARI** (diubah dari 3x/minggu, 2026-11-23), jam sama (usulan 18.00–19.00 WIB)
- **Aturan stok:** selalu ≥3 video siap di depan; kalau menipis, turun sementara ke 5x/minggu daripada kualitas turun
- **Evaluasi setelah 12 video:** retensi 3 detik pertama, % rata-rata ditonton, jumlah komentar. Gandakan topik yang menang.

## 6. Realita monetisasi

Cek lagi syarat terbaru saat mendaftar.

- **YouTube Partner Program:** 1.000 subscriber + 10 juta views Shorts dalam 90 hari. Jalur adsense paling jelas.
- **TikTok Creator Rewards:** setahu kami belum tersedia untuk Indonesia. TikTok tetap dipakai untuk jangkauan dan brand deal.
- **Brand deal:** sumber uang paling realistis di niche ini (semen, cat, alat konstruksi, ed-tech). Pasang email bisnis di bio sejak video pertama.

## 7. Risiko

| Risiko | Mitigasi |
|---|---|
| Terlalu mirip referensi | Maskot, palet, label, catchphrase sendiri; jembatan gantung ditunda |
| Kesalahan fakta | Sumber dilampirkan di setiap naskah |
| Label konten AI | Animasi kartun umumnya tidak wajib label "realistic AI"; ikuti setting tiap platform |
| Watermark lintas platform | Selalu upload file master, bukan hasil download dari platform lain |
