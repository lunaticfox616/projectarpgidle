"""Package supplied artwork preserving dimensions, without running archive code."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'artifacts/imports'
JOURNAL = ROOT / 'assets/journal'
EFFECTS = ROOT / 'assets/effects'
JOURNAL.mkdir(exist_ok=True)
mapping = {
    '프롤로그.png': 'prologue', '액트 2.png': 'act-2', '액트 3.png': 'act-3',
    '액트 4.png': 'act-4', '액트 5.png': 'act-5', '액트 6.png': 'act-6',
    '액트 7.png': 'act-7', '액트 8.png': 'act-8', '액트 9-1.png': 'act-9-start',
    '액트9-2.png': 'act-9-end', '액트 10.png': 'act-10',
}
for filename, stem in mapping.items():
    with Image.open(SOURCE / 'journal/리그닌 저널' / filename) as image:
        image.save(JOURNAL / (stem + '.webp'), quality=90, method=6)
with Image.open(SOURCE / 'pixellab-v3.7/img/WorldTreePixelLabFX.png') as image:
    image.save(EFFECTS / 'world-tree-skills.webp', lossless=True, method=6)
print(json.dumps({'journalImages': len(mapping), 'journalBytes': sum(p.stat().st_size for p in JOURNAL.glob('*.webp')),
                  'atlasBytes': (EFFECTS / 'world-tree-skills.webp').stat().st_size}))
