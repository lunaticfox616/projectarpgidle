"""Tone down the user's effect files and cut them for the game's sound bank.

Each source holds one sound near its start (and a stray click near its end, dropped). Per sound: cut the event
(10 ms before it, a short tail after), lower the pitch a little (resampling, like a slower tape), roll off the
highs, fade the edges, and set its loudness a little under the sound it replaces, so it sits in the same mix.
Variants b are pitched 3% lower again so repeated hits do not sound identical.
usage: python scripts/prepare-user-sfx.py <spec.json> assets/audio/game-sfx-v2 assets/audio/game-sfx-v2/sounds-20261104
spec rows: {source, name, slot, matchFiles (the slot's current files), pitch, maxSec, tailSec?, variant?}. 2026-11-04 use: docs/game-audio-20261006.md.
"""
import json
import sys
from pathlib import Path
import numpy as np
import soundfile as sf

RATE = 44100


def loudest(mono, rate):
    w = int(rate * 0.1)
    if len(mono) < w:
        return float(np.sqrt(np.mean(mono ** 2)))
    c = np.cumsum(np.concatenate([[0.0], mono.astype(np.float64) ** 2]))
    return float(np.sqrt(((c[w:] - c[:-w]) / w).max()))


def biquad(x, b, a):
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = np.zeros(x.shape[1])
    for i in range(len(x)):
        out = b[0] * x[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
        x2, x1, y2, y1 = x1, x[i], y1, out
        y[i] = out
    return y


def lowpass(x, freq, q=0.707):
    w = 2 * np.pi * freq / RATE
    alpha = np.sin(w) / (2 * q)
    cos = np.cos(w)
    b = np.array([(1 - cos) / 2, 1 - cos, (1 - cos) / 2])
    a = np.array([1 + alpha, -2 * cos, 1 - alpha])
    return biquad(x, b / a[0], a / a[0])


def highshelf(x, freq, gain_db):
    amp = 10 ** (gain_db / 40)
    w = 2 * np.pi * freq / RATE
    alpha = np.sin(w) / 2 * np.sqrt(2)
    cos = np.cos(w)
    b = np.array([amp * ((amp + 1) + (amp - 1) * cos + 2 * np.sqrt(amp) * alpha), -2 * amp * ((amp - 1) + (amp + 1) * cos),
                  amp * ((amp + 1) + (amp - 1) * cos - 2 * np.sqrt(amp) * alpha)])
    a = np.array([(amp + 1) - (amp - 1) * cos + 2 * np.sqrt(amp) * alpha, 2 * ((amp - 1) - (amp + 1) * cos),
                  (amp + 1) - (amp - 1) * cos - 2 * np.sqrt(amp) * alpha])
    return biquad(x, b / a[0], a / a[0])


def event_bounds(x, rate):
    env = np.abs(x).max(axis=1)
    hop = int(rate * 0.01)
    frames = env[: len(env) // hop * hop].reshape(-1, hop).max(axis=1)
    on = np.flatnonzero(frames > frames.max() * 10 ** (-38 / 20))
    start = on[0]
    end = start
    for i in on:  # first event only: stop at the first gap over 150 ms
        if i - end > 15:
            break
        end = i
    return max(0, (start - 1) * hop), (end + 1) * hop


def render(x, rate, pitch, max_sec, tail_sec):
    start, end = event_bounds(x, rate)
    end = min(len(x), end + int(tail_sec * rate))
    seg = x[start:end]
    # resample to RATE and lower the pitch at once: read the source slower
    step = rate / RATE * pitch
    pos = np.arange(0, len(seg) - 1, step)
    out = np.stack([np.interp(pos, np.arange(len(seg)), seg[:, c]) for c in range(seg.shape[1])], axis=1)
    out = out[: int(max_sec * RATE)]
    out = lowpass(out, 7500)
    out = highshelf(out, 3200, -4.0)
    fade_in, fade_out = int(0.002 * RATE), min(int(0.08 * RATE), len(out) // 3)
    out[:fade_in] *= np.linspace(0, 1, fade_in)[:, None]
    out[-fade_out:] *= (np.linspace(1, 0, fade_out) ** 2)[:, None]
    return out


def main():
    spec_path, game_dir, out_dir = map(Path, sys.argv[1:4])
    spec = json.loads(spec_path.read_text(encoding='utf-8'))
    out_dir.mkdir(parents=True, exist_ok=True)
    report = []
    for row in spec:
        x, rate = sf.read(row['source'], always_2d=True, dtype='float64')
        if x.shape[1] == 1:
            x = np.repeat(x, 2, axis=1)
        olds = [sf.read(str(game_dir / f), always_2d=True)[0].mean(axis=1) for f in row['matchFiles']]
        target = np.mean([loudest(o, RATE) for o in olds]) * 10 ** (row.get('underDb', -1.5) / 20)
        for suffix, extra in [('', 1.0)] + ([('-b', 0.97)] if row.get('variant', True) else []):
            y = render(x, rate, row['pitch'] * extra, row['maxSec'], row.get('tailSec', 0.12))
            y *= target / loudest(y.mean(axis=1), RATE)
            peak = np.abs(y).max()
            if peak > 0.89:
                y *= 0.89 / peak
            name = row['name'] + suffix + '.wav'
            sf.write(str(out_dir / name), y.astype(np.float32), RATE, subtype='PCM_16')
            report.append(f"{name:24s} {len(y) / RATE:5.2f}s loud {20 * np.log10(loudest(y.mean(axis=1), RATE)):6.1f} dB peak {20 * np.log10(np.abs(y).max()):6.1f} dB")
    print('\n'.join(report))


main()
