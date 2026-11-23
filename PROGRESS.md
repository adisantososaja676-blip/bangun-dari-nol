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
| Ep. 02: upload kit + render final + cover | ✅ final 1080x1920 & cover dikirim. **TAYANG** |
| Dunia "tanah lapang" + helper gempa | ✅ `buildField`, `quake` di `engine/kit.js` (bisa dipakai ep. 03–05) |
| Ep. 03 Pondasi di tanah lembek: naskah + cek fakta + audio + animasi | ✅ `episodes/03-pondasi-lembek/` (81,5 dtk), preview disetujui pemilik ("OK gas") |
| Ep. 03: upload kit + render final + cover | ✅ final 1080x1920 & cover (frame t=1.5) dikirim. **TAYANG** |
| Aset baru: rumah & diorama potongan tanah | ✅ `engine/house.js` (`createHouse`), `engine/soil.js` (`buildDiorama`) |
| Ep. 04 Jembatan lengkung (request penonton): naskah + cek fakta | 🟡 `episodes/04-jembatan-lengkung/` (±89 dtk), 📄 **dokumen saja** (naskah + cek fakta + rencana adegan); produksi menunggu aba-aba pemilik |
| Ep. 05 dst | ⬜ antrean di `IDE-VIDEO.md` |

## Langkah berikutnya

> Jadwal target: **posting harian** jam 18.00–19.00 WIB. Ep. 01, 02, 03 sudah tayang. **Stok siap upload: 0** → ep. 04 perlu diproduksi.

1. ✅ Ep. 02 & 03 sudah diunggah pemilik.
2. ✅ Komentar request "Buat jembatan" dibalas. Nama penonton **tidak** ditampilkan di video.
3. **Pemilik:** pantau komentar ep. 01–03 untuk request topik berikutnya.
4. **Claude (setelah pemilik bilang lanjut):** ep. 04 Jembatan lengkung: `script.json` sudah final (±89 dtk), rencana adegan per baris ada di `episodes/04-jembatan-lengkung/naskah.md`. Langkah: TTS → stills → preview → OK → final + cover + `upload.md`.
5. **Claude:** ep. 05 usulan: Gedung vs angin (Taipei 101) atau Jalan raya (pakai `buildDiorama` untuk lapisan jalan). Cek komentar penonton dulu.
6. **Pemilik:** kabari handle YouTube final, lalu catat di `KONTEKS.md`.
7. Setelah 12 video: evaluasi (retensi 3 dtk, % ditonton, komentar).

✅ API key KIE tersimpan sebagai **network secret** environment (host `api.kie.ai`, disimpan ulang di sesi 3). TTS: `KIE_API_KEY=proxy-injected NODE_USE_ENV_PROXY=1 node tools/tts.mjs episodes/<ep>`. Cek saldo: `curl -s -H "Authorization: Bearer x" https://api.kie.ai/api/v1/chat/credit` (sisa ±959 kredit per akhir sesi 3).

## Catatan teknis / kendala yang diketahui

- Kamera di lembah sempit gampang tertutup tebing. Taruh kamera di atas alur sungai (|x| < 3.5) atau di diagram potongan.
- Panah gaya pakai `depthTest:false` supaya terlihat menembus air.
- Durasi ep. 01: ±90 dtk (mengikuti audio).
- Render preview 540x960 ±6–9 menit di container cloud; final 1080x1920 ±15 menit (ep. 03, 81 dtk).
- WebFetch ke situs sumber riset diblokir jaringan container; pakai WebSearch silang, dan minta pemilik cek langsung untuk klaim berisiko.
- Narasi dibaca satu tarikan; bagian Situ Gintung belum dibuat lebih pelan (TTS satu task). Bisa dipecah jadi beberapa task kalau perlu.

## Log

### 2026-11-23: Ep. 04 Jembatan lengkung (dokumen)
- Request penonton (YouTube ep. 01). Naskah + cek fakta 13 klaim, direview & dikoreksi pemilik, rencana adegan per baris. Produksi ditunda (keputusan pemilik).

### 2026-11-23: Ep. 03 Pondasi di tanah lembek
- Preview disetujui → final 1080x1920 (24 MB) + cover t=1.5 dikirim & diunduh pemilik.
- Naskah + cek fakta dari pemilik (hasil sesi sebelumnya) dimasukkan ke repo.
- Key KIE lama ditolak (401) → pemilik simpan ulang lewat formulir aman. Saldo sebelum TTS: 982,86 kredit.
- TTS Chris (24 kredit, 1.295 karakter), timing dari jeda audio (38/40 jeda cocok), 81,5 dtk.
- `scene.js`: diorama potongan tanah rawa, rumah amblas → pondasi telapak → air pori keluar (konsolidasi) → miring & retak → tiang pancang dipukul sampai tanah keras (panah ujung + gesekan). Menara Pisa (miring 5,5° → berkurang 0,5° lewat penggalian sisi tinggi) di x=300, menara listrik + cakar ayam di x=600.
- Aset baru: `engine/house.js`, `engine/soil.js`.

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
