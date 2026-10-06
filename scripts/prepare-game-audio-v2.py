"""Extract compact game events from NEW Agent Audio source reels only.

Preserve source WAVs. Runtime assets get onset alignment, bounded duration,
edge fades and level matching. Ordinary rare drops are intentionally silent.
Run with the installed audio runtime Python (NumPy already bundled there).
"""
import argparse
import hashlib
import json
from pathlib import Path
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'artifacts/audio-production/v2-sources'
DEST = ROOT / 'assets/audio/game-sfx-v2'
# Runtime event, source material, variations, maximum seconds, label.
ATTACKS = [
    ('hitPhysical', 'blade', 3, .32, '근접 타격'),
    ('hitProjectile', 'arrow', 3, .28, '투사체 적중'),
    ('hitMagic', 'arcane', 3, .44, '마법 적중'),
    ('hitThrust', 'blade', 2, .23, '찌르기'),
    ('hitWhirl', 'blade', 2, .4, '회전·파동'),
    ('hitSlam', 'heavy', 2, .48, '강타·지진'),
    ('hitShield', 'heavy', 2, .3, '방패'),
    ('hitFireBlade', 'fire', 2, .32, '화염 참격'),
    ('hitFireBurst', 'fire', 2, .48, '화염 폭발'),
    ('hitFireBreath', 'fire', 2, .6, '화염 숨결·장판'),
    ('hitColdPierce', 'ice', 2, .3, '냉기 관통'),
    ('hitColdBurst', 'ice', 2, .5, '냉기 폭발·파동'),
    ('hitLightArc', 'electric-discharge', 2, .4, '번개·연쇄'),
    ('hitLightBeam', 'electric-discharge', 2, .55, '번개 광선'),
    ('hitLightBurst', 'thunder-contact', 2, .75, '낙뢰·룬 폭발'),
    ('hitChaosCut', 'void', 2, .32, '공허 절단'),
    ('hitChaosPulse', 'void', 2, .46, '카오스·공허 광선'),
    ('hitVenom', 'venom', 2, .36, '독·카오스 투척'),
    ('hitFlask', 'flask', 2, .42, '플라스크'),
]
EVENTS = [
    ('playerHurt', 'body', 2, .28, '플레이어 피격', 'hurt', 220, 1),
    ('kill', 'void', 1, .4, '일반 처치', 'death', 160, 0),
    ('potBreak', 'pot', 1, .55, '항아리 파괴', 'object', 100, 1),
    ('woodBreak', 'wood', 1, .5, '목재 파괴', 'object', 100, 1),
    ('chestOpen', 'chest', 1, .8, '상자 개봉', 'chest', 300, 1),
    ('lootMajor', 'treasure-alert', 1, 2.4, '귀중품 드롭', 'lootMajor', 1600, 2),
    ('levelUp', 'level-cadence', 1, 3.2, '레벨업', 'level', 2500, 2),
    ('killBoss', 'reward', 1, 1.3, '보스 처치', 'boss', 1600, 2),
    ('returnWarp', 'portal', 1, .8, '귀환', 'return', 1500, 1),
]


def read_wav(path):
    with wave.open(str(path), 'rb') as wav:
        if wav.getsampwidth() != 2:
            raise ValueError('Expected PCM16')
        rate, channels = wav.getframerate(), wav.getnchannels()
        pcm = np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2')
    return rate, pcm.reshape(-1, channels).astype(np.float64) / 32768


def regions(rate, signal):
    step = round(rate * .005)
    count = len(signal) // step
    energy = np.sqrt(np.mean(signal[:count * step].reshape(count, -1) ** 2, axis=1))
    threshold = max(.003, np.percentile(energy, 95) * .12, np.percentile(energy, 10) * 3)
    active = np.flatnonzero(energy > threshold)
    if not len(active):
        raise ValueError('No usable event detected')
    split = np.flatnonzero(np.diff(active) > 16) + 1
    groups = np.split(active, split)
    candidates = []
    for group in groups:
        start, stop = int(group[0] * step), min(len(signal), int((group[-1] + 1) * step))
        if stop - start < rate * .035:
            continue
        peak = float(np.max(np.abs(signal[start:stop])))
        candidates.append({'start': start / rate, 'end': stop / rate, 'peak': peak})
    return candidates


def inspect():
    result = {}
    for path in sorted(SOURCE.glob('*.wav')):
        rate, signal = read_wav(path)
        result[path.stem] = regions(rate, signal)
    (SOURCE / 'regions.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2))


def split_sustained_region(rate, signal, region):
    """Separate fresh strikes whose resonance bridges the nominal quiet gap."""
    if region['end'] - region['start'] <= 1.4:
        return [region]
    step = round(rate * .01)
    start, stop = round(region['start'] * rate), round(region['end'] * rate)
    clip = signal[start:stop]
    count = len(clip) // step
    energy = np.sqrt(np.mean(clip[:count * step].reshape(count, -1) ** 2, axis=1))
    previous = np.convolve(energy, np.ones(10) / 10, mode='full')[:count]
    previous = np.concatenate(([0], previous[:-1]))
    rise = np.maximum(0, energy - previous)
    selected = []
    for index in np.argsort(rise)[::-1]:
        if rise[index] < rise.max() * .18:
            break
        if all(abs(int(index) - other) > 95 for other in selected):
            selected.append(int(index))
    result = []
    ordered = sorted(selected)
    for position, index in enumerate(ordered):
        begin = max(start, start + index * step - round(rate * .03))
        finish = min(stop, begin + round(rate * 1.35))
        if position + 1 < len(ordered):
            finish = min(finish, start + ordered[position + 1] * step - round(rate * .04))
        result.append({'start': begin / rate, 'end': finish / rate,
                       'peak': float(np.max(np.abs(signal[begin:finish])))})
    return result


def candidates(rate, signal):
    choices = []
    detected = [event for region in regions(rate, signal) for event in split_sustained_region(rate, signal, region)]
    for region in detected:
        if region['peak'] < .09 or region['end'] - region['start'] < .06:
            continue
        start = round(region['start'] * rate)
        # Find the main contact within this event, so a long approach never delays a hit.
        window = signal[start:min(len(signal), start + round(rate * .45))]
        step = round(rate * .01)
        blocks = len(window) // step
        energy = np.mean(window[:blocks * step].reshape(blocks, -1) ** 2, axis=1)
        contact = start + int(np.argmax(energy)) * step
        audible = max(start, contact - round(rate * .04))
        choices.append({**region, 'audible': audible / rate, 'strength': float(energy.max())})
    # Strong material contacts first; lower-energy falling fragments are a last choice.
    return sorted(choices, key=lambda item: item['strength'], reverse=True)


def write_take(source, region, maximum, filename):
    rate, signal = source['rate'], source['signal']
    start = max(0, round(region['audible'] * rate) - round(rate * .006))
    end = min(len(signal), start + round(maximum * rate), round((region['end'] + .08) * rate))
    clip = signal[start:end].copy()
    if len(clip) < rate * .08:
        raise ValueError(f'Transient is too short: {filename}')
    peak = np.max(np.abs(clip))
    # Match the audible body, not the silent fraction of a file.
    audible = clip[np.max(np.abs(clip), axis=1) > peak * .08]
    level = min(3.0, .15 / np.sqrt(np.mean(audible ** 2)), .65 / peak)
    clip *= level
    fade_in, fade_out = (.015, .18) if filename.startswith('levelUp-') else (.0015, .045)
    if filename.startswith('lootMajor-'):
        fade_in, fade_out = .004, 1.1
    if filename.startswith(('bossEntrance-', 'stageClear-')):
        fade_in, fade_out = .006, .55
    attack, tail = min(round(rate * fade_in), len(clip)), min(round(rate * fade_out), len(clip))
    clip[:attack] *= np.linspace(0, 1, attack)[:, None]
    clip[-tail:] *= np.linspace(1, 0, tail)[:, None]
    pcm = np.round(clip * 32767).astype('<i2')
    path = DEST / filename
    with wave.open(str(path), 'wb') as wav:
        wav.setparams((signal.shape[1], 2, rate, len(pcm), 'NONE', 'not compressed'))
        wav.writeframes(pcm.tobytes())
    return {'file': filename, 'source': source['file'], 'sourceSha256': source['sha256'],
            'sourceStart': start / rate, 'sourceEnd': end / rate,
            'processing': 'onset alignment, duration trim, endpoint fades, level matching; no pitch or EQ',
            'seconds': len(pcm) / rate, 'sampleRate': rate, 'channels': signal.shape[1],
            'peak': float(np.max(np.abs(clip))), 'rms': float(np.sqrt(np.mean(clip ** 2))),
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}


def completed_cadence(rate, signal):
    """Keep the final resolving phrase through the measured natural decay."""
    step = round(rate * .01)
    count = len(signal) // step
    rms = np.sqrt(np.mean(signal[:count * step].reshape(count, -1) ** 2, axis=1))
    active = np.flatnonzero(rms > rms.max() * .025)
    end = min(len(signal) / rate, (int(active[-1]) + 1) * step / rate + .32)
    start = max(0, end - 3.194)
    peak = float(np.max(np.abs(signal[round(start * rate):round(end * rate)])))
    return [{'start': start, 'audible': start, 'end': end, 'peak': peak, 'strength': peak ** 2}]


def prepare_source(key):
    take = {'void': 'void-retake', 'portal': 'portal-retake'}.get(key, key)
    path = SOURCE / f'{take}.wav'
    rate, signal = read_wav(path)
    choices = completed_cadence(rate, signal) if key == 'level-cadence' else candidates(rate, signal)
    if key == 'treasure-alert':
        # Keep the attack and ringing body together; shorten only its long resonance with a fade.
        start = max(0, int(np.flatnonzero(np.max(np.abs(signal), axis=1) > .04)[0]) / rate)
        choices = [{'start': start, 'audible': start, 'end': start + 2.4}]
    if key in {'electric-discharge', 'thunder-contact'}:
        for choice in choices:
            choice['audible'] = choice['start']
    if not choices:
        raise ValueError(f'No usable source events: {key}')
    return {'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'rate': rate, 'signal': signal, 'candidates': choices, 'used': set()}


def prepare_entry(row, sources, assets):
    key, material, count, maximum, label, group, cooldown, priority = row
    source = sources[material]
    available = [r for r in source['candidates'] if r['start'] not in source['used']]
    if len(available) < count:
        raise ValueError(f'{material} needs {count} distinct events for {key}, only {len(available)} available')
    # Keep the existing victory fragment when level-up and loot get their own reels.
    chosen = [source['candidates'][2]] if key == 'killBoss' else available[:count]
    files = []
    for index, region in enumerate(chosen):
        source['used'].add(region['start'])
        filename = f'{key}-{chr(97 + index)}.wav'
        assets.append(write_take(source, region, maximum, filename))
        files.append(filename)
    gain = .4 if priority else .32
    if key == 'playerHurt':
        gain = .48
    elif key == 'lootMajor':
        gain = .6
    return {'label': label, 'files': files, 'gain': gain, 'rate': 1,
            'group': group, 'cooldown': cooldown, 'priority': priority}


def prepare():
    materials = {row[1] for row in ATTACKS + EVENTS}
    sources = {key: prepare_source(key) for key in materials}
    DEST.mkdir(parents=True, exist_ok=True)
    rows = [(*row, 'impact', 180 if 'Breath' in row[0] or 'Beam' in row[0] else 110, 0) for row in ATTACKS]
    assets, bank = [], {}
    for row in rows + EVENTS:
        bank[row[0]] = prepare_entry(row, sources, assets)
    bank['hitSlash'] = {**bank['hitPhysical'], 'label': '베기'}
    bank['hitCritical'] = {**bank['hitPhysical'], 'label': '강한 타격', 'gain': .43}
    bank['killElite'] = {**bank['kill'], 'label': '정예 처치', 'gain': .42, 'priority': 1}
    report = {'model': 'Stable Audio 3 Medium', 'generation': 'Fresh 20-second Agent Audio MCP reels',
              'sources': {key: value['sha256'] for key, value in sources.items()}, 'assets': assets}
    for name, content in [('bank.json', bank), ('provenance.json', report)]:
        (DEST / name).write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding='utf-8')
    prepare_boss_stage()


def prepare_boss_stage():
    """Update only the two new cues, preserving all other samples and their provenance."""
    folder = ROOT / 'artifacts/audio-production/boss-stage-20261006'
    bank = json.loads((DEST / 'bank.json').read_text(encoding='utf-8'))
    report = json.loads((DEST / 'provenance.json').read_text(encoding='utf-8'))
    # Measured isolated phrases: the third boss warning and first completed clear cadence.
    cues = [('bossEntrance', 'boss-entrance', 15.6, 19.6, 3.1, '보스 등장', .5, 3000),
            ('stageClear', 'stage-clear', 0, 4.5, 3.4, '스테이지 클리어', .44, 3000)]
    replaced = {'killBoss-a.wav', 'bossEntrance-a.wav', 'stageClear-a.wav'}
    report['assets'] = [row for row in report['assets'] if row['file'] not in replaced]
    for key, source_key, begin, end, length, label, gain, cooldown in cues:
        path = folder / f'{source_key}-source.wav'
        rate, signal = read_wav(path)
        window = signal[round(begin * rate):round(end * rate)]
        peak = float(np.max(np.abs(window)))
        active = np.flatnonzero(np.max(np.abs(window), axis=1) > peak * .035)
        if not len(active):
            raise ValueError(f'No audible cue in {path}')
        start = begin + int(active[0]) / rate
        source = {'file': str(path.relative_to(ROOT)).replace('\\', '/'),
                  'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'rate': rate, 'signal': signal}
        asset = write_take(source, {'audible': start, 'end': min(end, start + length)}, length, f'{key}-a.wav')
        report['assets'].append(asset)
        report['sources'][source_key] = source['sha256']
        bank[key] = {'label': label, 'files': [asset['file']], 'gain': gain, 'rate': 1,
                     'group': key, 'cooldown': cooldown, 'priority': 2}
    # A boss dying is a short impact. The full reward phrase belongs to encounter-finished.
    bank['killBoss'] = {**bank['kill'], 'label': '보스 처치', 'gain': .5,
                        'group': 'boss', 'cooldown': 1600, 'priority': 2}
    retired = DEST / 'killBoss-a.wav'
    if retired.exists():
        archive = folder / 'retired-killBoss-a.wav'
        if not archive.exists():
            archive.write_bytes(retired.read_bytes())
        retired.unlink()
    for name, content in [('bank.json', bank), ('provenance.json', report)]:
        (DEST / name).write_text(json.dumps(content, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'updated': [row for row in report['assets'] if row['file'] in replaced]}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare', action='store_true')
    parser.add_argument('--boss-stage', action='store_true')
    args = parser.parse_args()
    if args.boss_stage:
        prepare_boss_stage()
    elif args.prepare:
        prepare()
    else:
        inspect()
