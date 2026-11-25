#!/usr/bin/env python3
"""Pangkas jeda panjang di audio TTS (gratis, tanpa TTS ulang).
Jeda > MAX detik dipotong jadi MAX (disisakan MAX/2 di tiap sisi). Audio asli disimpan sebagai audio-asli.mp3.
  python3 tools/trim-pauses.py episodes/<ep> [MAX=0.5]
Lalu jalankan ulang: node tools/timing.mjs episodes/<ep>
"""
import os, re, subprocess, sys
ep = sys.argv[1]; MAX = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
src, orig = os.path.join(ep, 'audio.mp3'), os.path.join(ep, 'audio-asli.mp3')
if not os.path.exists(orig): os.rename(src, orig)
log = subprocess.run(['ffmpeg', '-i', orig, '-af', f'silencedetect=n=-40dB:d={MAX}', '-f', 'null', '-'], capture_output=True, text=True).stderr
cuts, st = [], None
for line in log.splitlines():
    m = re.search(r'silence_start: ([\d.]+)', line)
    if m: st = float(m.group(1))
    m = re.search(r'silence_end: ([\d.]+)', line)
    if m and st is not None and st > 0.1:
        e = float(m.group(1))
        if e - st > MAX: cuts.append((st + MAX / 2, e - MAX / 2))
expr = '+'.join(f'between(t,{a:.3f},{b:.3f})' for a, b in cuts) or '0'
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', orig, '-af', f"aselect='not({expr})',asetpts=N/SR/TB", '-b:a', '192k', src], check=True)
print(f'{len(cuts)} jeda dipangkas, -{sum(b - a for a, b in cuts):.1f} dtk → {src}')
