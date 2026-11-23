# CLAUDE.md: panduan untuk sesi Claude berikutnya

Repo ini adalah dapur produksi akun video pendek edukasi 3D **"Bangun dari Nol"** dengan maskot **Pak Bero** (berang-berang insinyur). Pemilik bisa pindah akun Claude; **semua konteks harus ada di repo ini**.

## Baca dulu (urut)

1. `PROGRESS.md`: status terakhir & langkah berikutnya (**selalu update di akhir sesi**)
2. `PLAN.md`: strategi & keputusan (jangan diubah tanpa persetujuan pemilik)
3. `desain/MASKOT.md`: aturan desain (konsistensi visual)
4. `IDE-VIDEO.md`: antrean topik

## Aturan kerja

- **Bahasa:** komunikasi & naskah dalam Bahasa Indonesia santai.
- **Simpan progres lewat PR:** setiap hasil kerja → branch baru → commit → push → buat PR ke `main`. Update `PROGRESS.md` di PR yang sama.
- **Jangan commit:** `node_modules/`, `out/` (hasil render). Video final dikirim ke pemilik, bukan di-commit. Pengecualian: gambar desain kecil di `desain/`.
- **Fakta:** setiap klaim di naskah harus punya sumber di tabel "Cek fakta" pada `naskah.md`. Topik tragedi nyata ditulis hati-hati & visualnya tenang.
- **Orisinalitas:** format boleh mirip akun referensi (@ngekepoyuk.id), tapi karakter/gaya **tidak**: tanpa helm kuning, rompi oranye, pohon pinus, label kotak kuning.

## Pipeline produksi

```
episodes/<ep>/script.json   ← naskah (sumber kebenaran; *kuning* !merah!)
episodes/<ep>/naskah.md     ← versi baca + cek fakta + caption
episodes/<ep>/audio.mp3     ← dari pemilik (TTS berbayar)  [opsional]
episodes/<ep>/words.json    ← timestamp per kata (tools/align.py atau ekspor TTS) [opsional]
episodes/<ep>/timing.json   ← hasil tools/timing.mjs (estimasi kalau belum ada audio)
episodes/<ep>/scene.js      ← adegan 3D, diikat ke id baris naskah
```

Perintah:

```bash
npm install                                            # three + font
node tools/timing.mjs episodes/01-bendungan            # bikin timing.json
node tools/render.mjs --ep 01-bendungan --still 5,20   # cek frame (out/*.png)
node tools/render.mjs --ep 01-bendungan --scale 1      # preview 540x960 → out/
node tools/render.mjs --ep 01-bendungan --scale 2      # final 1080x1920 (+audio kalau ada)
node tools/render.mjs --serve                          # buka di browser, ?play=1 untuk putar
```

### Suara (TTS)

TTS memakai **KIE** (kie.ai) → model `elevenlabs/text-to-speech-multilingual-v2`, suara **Chris**, speed **1.1** (setelan di `brand.json` → `tts`; bisa ditimpa per episode lewat `"tts"` di `script.json`).

```bash
KIE_API_KEY=<key pemilik> NODE_USE_ENV_PROXY=1 node tools/tts.mjs episodes/<ep>   # → audio.mp3 + timing.json
```

- **API key tidak boleh di-commit.** Minta ke pemilik (atau simpan sebagai network secret di environment).
- Jaringan environment harus mengizinkan: `api.kie.ai`, `kie.ai`, `tempfile.aiquickdraw.com`, `static.aiquickdraw.com` (contoh suara). Node butuh `NODE_USE_ENV_PROXY=1` di container cloud.
- Biaya: ±12 kredit per 1.000 karakter, minimal 12 kredit per task. 1 episode ≈ 24 kredit.
- KIE **tidak** mengembalikan timestamp per kata, jadi `tools/timing.mjs` menyelaraskan sendiri: jeda di audio (ffmpeg silencedetect) dicocokkan ke tanda baca naskah dengan DP yang menjaga kecepatan bicara konsisten. Cek hasilnya (`timing.json`) dan beberapa still sebelum render final.
- Alternatif lebih presisi: `python3 tools/align.py` (faster-whisper → `words.json`; perlu akses huggingface.co untuk unduh model).
- Contoh suara lain ada di `out/tts/` lokal (tidak di-commit). Daftar ID suara: `node kie-cli.mjs doc elevenlabs/text-to-speech-multilingual-v2`.

Animasi otomatis ikut waktu suara karena adegan diikat ke id baris naskah.

## Engine (ringkas)

- `engine/kit.js`: renderer, palet `PAL`, lembah sungai `buildValley`, hujan, panah, partikel instanced, kamera `cameraAt(keys,t)`.
- `engine/bero.js`: model & pose Pak Bero.
- `engine/overlay.js`: subtitle per kata, label 3D→2D, kartu, watermark.
- `engine/main.js`: memuat episode & `window.renderAt(t)`.
- **Aturan emas:** `update(t)` harus fungsi murni dari waktu `t` (tanpa state yang menumpuk) supaya render frame-per-frame deterministik.
- Render memakai Chromium headless (SwiftShader). ±2–4 frame/detik di scale 1.

## Episode baru

1. Salin `episodes/01-bendungan` → `episodes/NN-topik`, tulis `script.json` & `naskah.md` (rumus di `PLAN.md` §3).
2. Tulis `scene.js` (pakai ulang kit; tambah aset baru ke `engine/` kalau bisa dipakai episode lain).
3. Cek still di setiap baris, lalu render preview, kirim ke pemilik, buat PR.
