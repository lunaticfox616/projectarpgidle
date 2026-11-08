"""Cut each BGM to a ~100 s seamless loop and encode it as Ogg Vorbis.

The file plays once from 0, then loops [loopStart, loopEnd). The loop seam is chosen where the music after
loopStart sounds like the music after loopEnd (chroma + onset match, beat-aligned to the sample), and the last
2 s before loopEnd are cross-faded into the 2 s before loopStart, so jumping back is inaudible.
usage: python scripts/prepare-bgm-loops.py <mp3 dir> assets/audio/bgm scripts/bgm-names.json <report.json>
A name maps to the output key, or to {"key": ..., "targetEnd": seconds} for a song whose theme comes back only later than ~100 s
(고대미궁 보스, 2026-11-08: every cut near 100 s landed half a beat off; the theme returns after 104 bars at 181 s).
Needs NumPy and soundfile (libsndfile with MP3 and Vorbis), e.g. the Codex runtime venv. Copy the printed loop points into data/bgm.js.
"""
import json
import sys
from pathlib import Path
import numpy as np
import soundfile as sf

FEAT_RATE = 12000
N_FFT, HOP = 1024, 256
XFADE = 2.0
TARGET_RMS_DB = -20.0


def downsample(mono, rate):
    step = rate // FEAT_RATE
    usable = len(mono) // step * step
    return mono[:usable].reshape(-1, step).mean(axis=1)


def features(y):
    count = 1 + (len(y) - N_FFT) // HOP
    idx = np.arange(N_FFT)[None, :] + HOP * np.arange(count)[:, None]
    spec = np.abs(np.fft.rfft(y[idx] * np.hanning(N_FFT).astype(np.float32), axis=1)).astype(np.float32)
    freqs = np.fft.rfftfreq(N_FFT, 1 / FEAT_RATE)
    valid = (freqs > 60) & (freqs < 5000)
    pitch_class = (np.round(12 * np.log2(freqs[valid] / 440) + 69).astype(int)) % 12
    onehot = np.zeros((valid.sum(), 12), np.float32)
    onehot[np.arange(valid.sum()), pitch_class] = 1
    chroma = (spec[:, valid] ** 2) @ onehot
    chroma /= np.linalg.norm(chroma, axis=1, keepdims=True) + 1e-9
    log_spec = np.log1p(spec * 10)
    flux = np.concatenate([[0], np.maximum(0, np.diff(log_spec, axis=0)).sum(axis=1)])
    flux = (flux - flux.mean()) / (flux.std() + 1e-9)
    return chroma, flux.astype(np.float32)


def find_loop(chroma, flux, seconds, target_end):
    fps = FEAT_RATE / HOP
    win = int(4 * fps)
    pre = int(XFADE * fps)
    frames = len(flux)
    s_min, s_max = int(3 * fps), int(20 * fps)
    l_min = int(max(target_end - 15, 40) * fps)
    l_max = min(int((target_end + 12) * fps), frames - win - 1)
    best = (-9, 0, 0)
    for d in range(max(1, l_min - s_max), l_max - s_min + 1):
        sim = (chroma[:-d] * chroma[d:]).sum(axis=1) + 0.5 * flux[:-d] * flux[d:]
        csum = np.concatenate([[0], np.cumsum(sim)])
        lo, hi = max(s_min, l_min - d), min(s_max, l_max - d)
        if lo > hi:
            continue
        starts = np.arange(lo, hi + 1)
        scores = (csum[starts + win] - csum[starts - pre]) / (win + pre)
        k = int(scores.argmax())
        if scores[k] > best[0]:
            best = (float(scores[k]), int(starts[k]), int(starts[k] + d))
    return best


def refine(y_feat, start, end):
    """Sample-align the seam: best lag (짹20 ms) between the 1.5 s after loopStart and after loopEnd."""
    span, reach = int(1.5 * FEAT_RATE), int(0.02 * FEAT_RATE)
    a = y_feat[start: start + span]
    best, best_lag = -1e9, 0
    for lag in range(-reach, reach + 1):
        b = y_feat[end + lag: end + lag + span]
        if len(b) < span:
            continue
        c = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))
        if c > best:
            best, best_lag = c, lag
    return best_lag, best


def main():
    src, out, names_path, report_path = map(Path, sys.argv[1:5])
    names = json.loads(names_path.read_text(encoding='utf-8'))
    out.mkdir(parents=True, exist_ok=True)
    report = {}
    for path in sorted(src.glob('*.mp3')):
        entry = names[path.stem]
        key, target_end = (entry, None) if isinstance(entry, str) else (entry['key'], entry.get('targetEnd'))
        x, rate = sf.read(str(path), always_2d=True, dtype='float32')
        mono = x.mean(axis=1)
        y_feat = downsample(mono, rate)
        chroma, flux = features(y_feat)
        target = target_end or min(100.0, len(mono) / rate - 20)
        score, s_frame, l_frame = find_loop(chroma, flux, len(mono) / rate, target)
        s_feat, l_feat = s_frame * HOP, l_frame * HOP
        lag, corr = refine(y_feat, s_feat, l_feat)
        ratio = rate / FEAT_RATE
        loop_start, loop_end = int(round(s_feat * ratio)), int(round((l_feat + lag) * ratio))
        fade = int(XFADE * rate)
        y = x[:loop_end].copy()
        t = (np.arange(fade, dtype=np.float32) + 0.5) / fade
        fade_in, fade_out = np.sin(t * np.pi / 2)[:, None], np.cos(t * np.pi / 2)[:, None]
        y[loop_end - fade:] = x[loop_end - fade: loop_end] * fade_out + x[loop_start - fade: loop_start] * fade_in
        rms = float(np.sqrt(np.mean(y ** 2)))
        y *= 10 ** (TARGET_RMS_DB / 20) / rms
        peak = float(np.abs(y).max())
        if peak > 0.89:  # soft knee above -1 dBFS instead of a hard clip
            over = np.abs(y) > 0.8
            y[over] = np.sign(y[over]) * (0.8 + 0.19 * np.tanh((np.abs(y[over]) - 0.8) / 0.19))
        # libsndfile's Vorbis writer stacks the whole block: write in small blocks or the process dies (stack overflow)
        with sf.SoundFile(str(out / f'{key}.ogg'), 'w', rate, y.shape[1], format='OGG', subtype='VORBIS', compression_level=0.72) as handle:
            for i in range(0, len(y), 4096):
                handle.write(y[i: i + 4096])
        seam = np.concatenate([y[loop_end - 6 * rate: loop_end], y[loop_start: loop_start + 6 * rate]])
        sf.write(str(out.parent / 'seams' / f'{key}-seam.wav'), seam, rate, subtype='PCM_16') if (out.parent / 'seams').exists() else None
        report[key] = {'source': path.name, 'sourceSeconds': round(len(mono) / rate, 2), 'loopStart': round(loop_start / rate, 4),
                       'loopEnd': round(loop_end / rate, 4), 'matchScore': round(score, 3), 'seamCorrelation': round(corr, 3),
                       'kb': round((out / f'{key}.ogg').stat().st_size / 1024), 'peakDb': round(float(20 * np.log10(np.abs(y).max())), 1)}
        print(key, report[key], flush=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')


main()
