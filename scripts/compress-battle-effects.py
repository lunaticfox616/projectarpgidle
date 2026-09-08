"""Build pixel-identical WebP runtime copies; keep PNG masters for art tools."""
import hashlib
import json
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def build():
    paths = set()
    for file in ['js/passives.js', 'data/skills.js']:
        paths.update(re.findall(r"skillFx\w+:\s*'(assets/effects/[^']+\.png)'", (ROOT / file).read_text(encoding='utf-8')))
    rows = []
    for path in sorted(paths):
        source = ROOT / path
        target = source.with_suffix('.webp')
        with Image.open(source) as image:
            original = image.convert('RGBA')
            original.save(target, format='WEBP', lossless=True, exact=True, method=6)
            with Image.open(target) as decoded:
                if decoded.convert('RGBA').tobytes() != original.tobytes():
                    raise ValueError(f'Pixel mismatch: {path}')
            rows.append({'source': path, 'output': target.relative_to(ROOT).as_posix(),
                         'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                         'outputSha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                         'size': list(original.size)})
    (ROOT / 'assets/effects/lossless-manifest.json').write_text(json.dumps(rows, indent=2) + '\n', encoding='utf-8')
    print(f'{len(rows)} lossless effects verified pixel-for-pixel')


if __name__ == '__main__':
    build()
