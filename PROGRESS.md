# Progres

_Update file ini di setiap PR. Paling baru di atas._

## Status sekarang

| Item | Status |
|---|---|
| Plan & strategi | ✅ `PLAN.md` |
| Maskot Pak Bero (3D) | ✅ `engine/bero.js`, spek di `desain/MASKOT.md` |
| Scene kit (lembah sungai, hujan, panah, label, subtitle) | ✅ `engine/` |
| Pipeline render (Three.js → Chromium headless → ffmpeg) | ✅ `tools/render.mjs` |
| Ep. 01 Bendungan: naskah + cek fakta | ✅ `episodes/01-bendungan/naskah.md` |
| Ep. 01 Bendungan: animasi | ✅ versi 1, disinkronkan ke audio |
| Suara TTS | ✅ KIE → ElevenLabs Multilingual v2, suara Chris, speed 1.1 (`tools/tts.mjs`) |
| Ep. 01 Bendungan: audio + sinkron | ✅ `episodes/01-bendungan/audio.mp3` (89 dtk), timing dari jeda audio |
| Handle akun | ✅ `@pakbero.id` (IG sudah dibuat + foto profil + bio; belum ada postingan) |
| Foto profil | ✅ `desain/avatar-*.png` (`tools/avatar.mjs`) |
| Banner YouTube | ✅ `desain/banner-youtube.png` (`tools/banner.mjs`) |
| Akun | IG ✅ `@pakbero.id` · TikTok ⏳ bio · YouTube ✅ channel dibuat (handle `@pakbero.id` sudah dipakai orang, pakai alternatif) · FB Page ⏳ |
| SOP produksi & upload | ✅ `SOP.md` |
| Ep. 01: upload kit (caption 4 platform) + cover | ✅ `episodes/01-bendungan/upload.md`, cover via `tools/cover.mjs` |
| Ep. 01: render final 1080x1920 | ✅ dikirim ke pemilik (27 MB; file video tidak di-commit, render ulang dengan `--scale 2`) |
| Ep. 02 dst | ⬜ antrean di `IDE-VIDEO.md` |

## Langkah berikutnya

> Jadwal: **posting harian**, mulai setelah stok 5–7 video siap. Bio IG sudah "Video baru setiap hari".

1. ✅ Ep. 01 final + cover sudah dikirim ke pemilik.
2. Pemilik: simpan file final & cover, JANGAN posting dulu sampai stok 5–7 video.
3. Pemilik: buat akun TikTok/YouTube/FB dengan handle yang sama `pakbero.id`, pasang foto profil.
4. Belum ada musik latar / efek suara (opsional, perlu sumber bebas lisensi).
5. Lanjut ep. 02 (usulan: Rumah tahan gempa).

## Catatan teknis / kendala yang diketahui

- Kamera di lembah sempit gampang tertutup tebing. Taruh kamera di atas alur sungai (|x| < 3.5) atau di diagram potongan.
- Panah gaya pakai `depthTest:false` supaya terlihat menembus air.
- Durasi ep. 01: ±90 dtk (mengikuti audio).
- Render preview 540x960 ±9 menit (~5 fps) di container cloud; final 1080x1920 jauh lebih lama.
- Narasi dibaca satu tarikan; bagian Situ Gintung belum dibuat lebih pelan (TTS satu task). Bisa dipecah jadi beberapa task kalau perlu.

## Log

### 2026-11-23: Perbaikan render
- Render macet di akhir karena `-shortest` membuat ffmpeg berhenti saat audio (89,2 dtk) lebih pendek dari video (90,45 dtk). Diperbaiki dengan `apad` + deteksi ffmpeg tertutup + coba ulang per frame.

### 2026-11-23: Suara TTS via KIE
- Dibandingkan dengan Gemini TTS di KIE: **2.5 Pro** jalan (sangat murah, ±1 kredit per 14 dtk, hasil `.wav` dari `file.aiquickdraw.com`); **3.1 Flash & 3.8 Flash gagal** ("generate task timeout", 3x percobaan, tanpa biaya). Pemilik tetap memilih **ElevenLabs Chris**.
- Tes ulang 3.8 Flash (4 variasi, termasuk teks Inggris): semua gagal kode 524 dalam ±7 dtk → masalah di sisi KIE. 3.8 Flash-Lite berhasil. **Keputusan final: ElevenLabs Chris.**
- Format input Gemini: `speakers[{speaker_id:"Speaker 1", voice_name, accent:"Neutral", style, pace, audio_profile}]` + `dialogue_turns[{speaker_id, text}]` + `sample_context`/`scene` sebagai arahan gaya.
- `tools/tts.mjs`, penyelarasan jeda audio di `tools/timing.mjs`, suara Chris dipilih pemilik dari 4 sampel (Liam, Will, Chris, Jessica).

### 2026-11-23: Pilot "Bendungan" v1
- Engine 3D, maskot, pipeline render, naskah + riset, preview tanpa suara.

### 2026-11-23: Plan awal
- `PLAN.md`, `IDE-VIDEO.md`, analisis video referensi.
