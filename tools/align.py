"""Bikin words.json (timestamp per kata) dari audio TTS pakai faster-whisper.

    pip install faster-whisper
    python3 tools/align.py episodes/01-bendungan/audio.mp3

Output: episodes/<ep>/words.json → lalu jalankan `node tools/timing.mjs episodes/<ep>`.
Kalau TTS-mu sudah memberi timestamp per kata (mis. ElevenLabs), konversi saja
ke format [{"word": "...", "start": 0.0, "end": 0.0}, ...] dan lewati skrip ini.
"""
import json
import pathlib
import sys

from faster_whisper import WhisperModel

audio = pathlib.Path(sys.argv[1])
model_size = sys.argv[2] if len(sys.argv) > 2 else "small"
model = WhisperModel(model_size, device="cpu", compute_type="int8")
segments, _ = model.transcribe(str(audio), language="id", word_timestamps=True, vad_filter=False)
words = [
    {"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)}
    for seg in segments
    for w in seg.words
    if w.word.strip()
]
out = audio.parent / "words.json"
out.write_text(json.dumps(words, ensure_ascii=False, indent=1))
print(f"{out}: {len(words)} kata")
