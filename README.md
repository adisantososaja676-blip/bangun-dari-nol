# Bangun dari Nol

Akun edukasi 3D pendek (9:16, 60–90 detik) tentang cara manusia membangun sesuatu, lewat format **evolusi solusi**: coba → gagal → perbaiki → berdiri.

Maskot: **berang-berang insinyur**.

## Isi repo

| File | Isi |
|---|---|
| [`PLAN.md`](PLAN.md) | Strategi lengkap: konsep, rumus naskah, pipeline, jadwal, monetisasi, risiko |
| [`IDE-VIDEO.md`](IDE-VIDEO.md) | 30 ide video pertama |
| [`referensi/ANALISIS.md`](referensi/ANALISIS.md) | Bedah video referensi (@ngekepoyuk.id) |
| [`PROGRESS.md`](PROGRESS.md) | **Status terakhir & langkah berikutnya** |
| [`CLAUDE.md`](CLAUDE.md) | Panduan teknis untuk sesi Claude berikutnya (pipeline, engine, aturan) |
| [`desain/MASKOT.md`](desain/MASKOT.md) | Desain Pak Bero, palet, gaya teks |
| [`episodes/`](episodes) | Naskah, timing, dan adegan 3D per episode |
| `engine/`, `tools/` | Engine Three.js & alat render |
| `referensi/sheet*.jpg` | Contact sheet frame video referensi (untuk studi internal, jangan dipublikasikan) |

## Status

- [x] Plan
- [x] Desain maskot & scene kit
- [x] Pipeline render (Three.js → MP4)
- [x] Pilot "Bendungan" v1 (tanpa suara)
- [ ] Pilot dengan audio TTS

## Mulai cepat

```bash
npm install
node tools/render.mjs --ep 01-bendungan --scale 1   # → out/01-bendungan-preview.mp4
```
