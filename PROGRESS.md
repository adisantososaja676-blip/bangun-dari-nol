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
| Akun | ✅ IG `@pakbero.id` · TikTok · YouTube (handle alternatif) · Facebook Page "Pak Bero Bangun dari Nol" (sambungkan ke IG) |
| SOP produksi & upload | ✅ `SOP.md` |
| Ep. 01: upload kit (caption 4 platform) + cover | ✅ `episodes/01-bendungan/upload.md`, cover via `tools/cover.mjs` |
| Ep. 01: render final 1080x1920 | ✅ dikirim ke pemilik (27 MB; file video tidak di-commit, render ulang dengan `--scale 2`) |
| **Ep. 01: TAYANG** | ✅ diunggah pemilik ke IG, TikTok, YouTube, Facebook (23 Nov 2026) |
| Ep. 02 Rumah tahan gempa: naskah + cek fakta + audio + animasi | ✅ `episodes/02-rumah-gempa/` (81 dtk), preview dikirim ke pemilik |
| Ep. 02: upload kit | ✅ `episodes/02-rumah-gempa/upload.md` (render final + cover setelah preview disetujui) |
| Dunia "tanah lapang" + helper gempa | ✅ `buildField`, `quake` di `engine/kit.js` (bisa dipakai ep. 03–05) |
| Ep. 03 dst | ⬜ antrean di `IDE-VIDEO.md` |

## Langkah berikutnya

> Jadwal target: **posting harian** jam 18.00–19.00 WIB. Ep. 01 sudah tayang; stok berikutnya belum ada.

1. **Pemilik:** tonton preview ep. 02, kasih OK/revisi. **Claude:** setelah OK → render final 1080x1920 + cover (`--still 3 --scale 2 --clean`).
2. **Claude:** lanjut ep. 03–05 untuk stok (usulan: Gedung vs angin, Pondasi tanah lembek, Jalan raya; pakai `buildField`).
2. ✅ API key KIE baru sudah tersimpan sebagai **network secret** environment (host `api.kie.ai`). Jalankan TTS dengan `KIE_API_KEY=proxy-injected` (proxy mengganti nilainya).
3. **Pemilik:** merge PR #1 (`pilot-bendungan`) ke `main`.
4. **Pemilik:** kabari handle YouTube final, lalu catat di `KONTEKS.md`.
5. **Pemilik:** pantau komentar ep. 01; usulan topik masuk `IDE-VIDEO.md`.
6. Setelah 12 video: evaluasi (retensi 3 dtk, % ditonton, komentar).

## Catatan teknis / kendala yang diketahui

- Kamera di lembah sempit gampang tertutup tebing. Taruh kamera di atas alur sungai (|x| < 3.5) atau di diagram potongan.
- Panah gaya pakai `depthTest:false` supaya terlihat menembus air.
- Durasi ep. 01: ±90 dtk (mengikuti audio).
- Render preview 540x960 ±9 menit (~5 fps) di container cloud; final 1080x1920 jauh lebih lama.
- Narasi dibaca satu tarikan; bagian Situ Gintung belum dibuat lebih pelan (TTS satu task). Bisa dipecah jadi beberapa task kalau perlu.

## Log

### 2026-11-23: Ep. 02 Rumah tahan gempa
- Riset + naskah + cek fakta (BMKG 2024, rumah tembokan terkekang, gaya inersia atap, Omo Hada Nias 2005).
- TTS Chris (24 kredit, 1.280 karakter), timing dari jeda audio (44/48 jeda cocok).
- `scene.js`: bata instanced (2 tata letak), runtuh balistik, rangka beton bertulang transparan → padat, 3 varian atap, goyang geser, Omo Hada di x=300.
- Kit baru: `buildField` (tanah lapang) & `quake` (goyangan tanah).

### 2026-11-23: Ep. 01 tayang + arsip konteks
- Pemilik mengunggah ep. 01 ke 4 platform. Semua konteks chat diarsipkan di `KONTEKS.md`.

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
