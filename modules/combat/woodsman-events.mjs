import { clampNumber } from '../common/numbers.mjs';

export function woodEvents(type, hero, variant) {
        if (type === 'spire') return [hero, { x: clampNumber(hero.x - 300, 320, 1350), y: clampNumber(hero.y + 70, 540, 820) },
            { x: clampNumber(hero.x + 300, 320, 1350), y: clampNumber(hero.y - 70, 540, 820) }]
            .map((p, i) => ({ ...p, at: i * 280, duration: 850, rx: 100, ry: 43, kind: 'ellipse', fx: 'spire' }));
        if (type === 'wheel') return [{ at: 0, duration: 1600, x: [620, 836, 1052][variant % 3], y: 655, kind: 'annulus', fx: 'wheel' }];
        if (type === 'lance') return (variant % 2 ? [528, 938, 1348] : [323, 733, 1143]).map((x, i) => ({ at: i * 320, duration: 820, x, y: 675,
            width: 176, top: 492, bottom: 860, kind: 'lane', fx: 'lance' }));
        if (type === 'nova') return [[836, 620], [1140, 625], [1090, 790], [580, 790], [530, 625]]
            .map(([x, y], i) => ({ x, y, at: i * 270, duration: 1000, rx: 155, ry: 66, kind: 'ellipse', fx: 'nova' }));
        if (type === 'wave') return [[510, 836, 1162][variant % 3], [510, 836, 1162][Math.floor(variant / 3) % 3]]
            .map((gap, i) => ({ at: i * 1600, duration: 1900, x: 836, y: 500,
            gap, gapWidth: 260, kind: 'front', fx: 'wave' }));
        return [{ at: 0, duration: 850, a: { x: 1100, y: 505 }, b: { x: 560, y: 850 },
            halfWidth: 100, kind: 'segment', fx: 'cleave', x: 830, y: 675 },
        ...[.2, .45, .7].map((f, i) => ({ x: 1100 - 540 * f, y: 505 + 345 * f, at: 500 + i * 200,
            duration: 700, rx: 105, ry: 46, kind: 'ellipse', fx: 'spire' }))];
    }

export function woodCoverEvents(type, cover) {
        if (type === 'cover-tide') return [0, 1500].map(at => ({ at, duration: 1800, x: 836, y: 500,
            gap: -1000, gapWidth: 0, kind: 'front', fx: 'wave' }));
        if (type === 'cover-sweep') return [{ at: 0, duration: 2200, kind: 'sidefront', fx: 'lance',
            x: cover.direction === 'east' ? 220 : 1452, y: 680, fromX: cover.direction === 'east' ? 220 : 1452, toX: cover.direction === 'east' ? 1452 : 220 }];
        return [{ at: 0, duration: 2300, ...cover.origin, kind: 'annulus', fx: 'wheel', range: 1250 }];
    }

export function woodMirrorEvent(row) {
        row.x = 1672 - row.x;
        row.mirrored = true;
        if (row.a) { row.a.x = 1672 - row.a.x; row.b.x = 1672 - row.b.x; }
    }
