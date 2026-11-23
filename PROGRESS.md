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
| Ep. 01 Bendungan: animasi | ✅ versi 1 (timing estimasi, tanpa suara) |
| Ep. 01 Bendungan: audio TTS | ⏳ **menunggu pemilik**: generate dari naskah, upload sebagai `episodes/01-bendungan/audio.mp3` |
| Handle akun | ⏳ belum diputuskan (`brand.json` masih `@pakbero.id`) |
| Ep. 02 dst | ⬜ antrean di `IDE-VIDEO.md` |

## Langkah berikutnya

1. Pemilik: review preview ep. 01, beri catatan revisi.
2. Pemilik: generate TTS dari blok "Naskah untuk TTS" di `episodes/01-bendungan/naskah.md`, lalu upload audio (+ timestamp per kata kalau ada).
3. Claude: `tools/align.py` → `tools/timing.mjs` → render final 1080x1920 dengan audio. (`align.py` belum dites dengan audio asli.)
4. Pemilik: putuskan handle → update `brand.json`.
5. Lanjut ep. 02 (usulan: Rumah tahan gempa).

## Catatan teknis / kendala yang diketahui

- Kamera di lembah sempit gampang tertutup tebing. Taruh kamera di atas alur sungai (|x| < 3.5) atau di diagram potongan.
- Panah gaya pakai `depthTest:false` supaya terlihat menembus air.
- Durasi saat ini ±86 dtk (estimasi). Durasi final mengikuti audio.
- Render preview 540x960: sekitar beberapa menit di container cloud.

## Log

### 2026-11-23: Pilot "Bendungan" v1
- Engine 3D, maskot, pipeline render, naskah + riset, preview tanpa suara.

### 2026-11-23: Plan awal
- `PLAN.md`, `IDE-VIDEO.md`, analisis video referensi.
