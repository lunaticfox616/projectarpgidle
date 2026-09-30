#!/usr/bin/env node
/* 하단 HUD 그림: 사용자 HUD 그림(2026-10-01, tools/hud-kit/source)에서 생명 · 경험치 구슬, 미니맵 테, 메뉴 단추 틀을 잘라
 * 게임이 겹쳐 쓰는 층으로 나눈다.
 *
 *   node scripts/build-hud-kit.cjs
 *
 * 새로 그리지 않고 원본 도트를 그대로 옮긴다. 늘리거나 줄이는 곳은 두 군데뿐이다 — 미니맵 테는 창을 136px로 맞추려고 반지름 방향으로
 * 3도트 밀어 내고, 메뉴 단추 틀은 네 귀를 그대로 두고 변만 이어 40px로 맞춘다(9칸 자르기).
 * 구슬은 세 층: 윗층(유리를 비운 테 + 유리 위 반짝임) · 빈 유리 · 액체. 원본 생명 구슬은 액체가 반쯤 찬 그림이라 수면 위 액체는
 * 수면 아래를 뒤집어 채우고, 빈 유리는 그 액체를 어둡게 뺀 색으로 만든다. CSS가 액체를 --gauge-fill만큼 아래에서 잘라 겹친다.
 * 결과: assets/ui/pixel/hud-*.png. 유리 원 · 지도 창의 자리(아래 GEOMETRY)는 css/themes/pixel-hud.css와 맞물려 있다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');

const SOURCE = path.resolve(__dirname, '..', 'tools/hud-kit/source');
const OUT = path.resolve(__dirname, '..', 'assets/ui/pixel');
// 원본 그림 속 유리 원 · 지도 창의 중심과 반지름(도트). 바꾸면 pixel-hud.css의 --orb-x/--orb-y · 지도 테 자리도 바꾼다.
const GEOMETRY = {
    life: { file: 'health-orb.png', cx: 63, cy: 73, r: 50 },
    amber: { file: 'exp-orb.png', cx: 68, cy: 72.5, r: 50 },
    map: { file: 'mini-map.png', cx: 103, cy: 113.5, r: 65, grow: 3 },
    key: { file: 'inventory-button.png', size: 40, corner: 6, band: 6 },
    // 창 테: 같은 단추를 9칸으로. corner = 모서리 조각(매듭 포함), knot = 모서리에서 잰 매듭 삼각형 크기(x+y), band = 테 두께.
    window: { corner: 26, knot: 28, band: 6 },
};

// ─── 도트 다루기 ────────────────────────────────────────────────────────
function load(name) {
    const { width, height, data } = decodePng(fs.readFileSync(path.join(SOURCE, name)));
    return { w: width, h: height, d: data };
}
const blank = (w, h) => ({ w, h, d: Buffer.alloc(w * h * 4) });
const at = (img, x, y) => { const i = (y * img.w + x) * 4; return [img.d[i], img.d[i + 1], img.d[i + 2], img.d[i + 3]]; };
const put = (img, x, y, p) => img.d.set(p, (y * img.w + x) * 4);
const inside = (img, x, y) => x >= 0 && y >= 0 && x < img.w && y < img.h;
const hex = p => '#' + p.slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
const parse = k => [parseInt(k.slice(1, 3), 16), parseInt(k.slice(3, 5), 16), parseInt(k.slice(5, 7), 16), 255];
const avg = p => (p[0] + p[1] + p[2]) / 3;
const spread = p => Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]);
const median = list => list.slice().sort((a, b) => a - b)[Math.floor(list.length / 2)];
function mode(list) {
    const count = new Map();
    list.forEach(p => { const k = hex(p); count.set(k, (count.get(k) || 0) + 1); });
    const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
}
function each(img, visit) {
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) visit(x, y, at(img, x, y));
}
/** Layers painted in order onto one image (later layers win where opaque). */
function stack(...layers) {
    const out = blank(layers[0].w, layers[0].h);
    for (const layer of layers) each(layer, (x, y, p) => { if (p[3]) put(out, x, y, p); });
    return out;
}

// ─── 구슬 ──────────────────────────────────────────────────────────────
/** Checks the glass radius against the art: the black iron band starts 3 dots outside the glass on most of 72 rays. */
function measureGlass(img, { cx, cy, r }) {
    const iron = p => p[3] === 255 && avg(p) < 50 && spread(p) < 18;
    const found = [];
    for (let k = 0; k < 72; k++) {
        const a = k / 72 * Math.PI * 2;
        for (let d = 30; d < 80; d++) {
            const hit = [0, 1, 2].every(s => {
                const x = Math.round(cx + Math.cos(a) * (d + s)), y = Math.round(cy + Math.sin(a) * (d + s));
                return inside(img, x, y) && iron(at(img, x, y));
            });
            if (hit) { found.push(d); break; }
        }
    }
    if (median(found) - 3 !== r) throw new Error(`유리 반지름이 그림과 다릅니다: ${median(found) - 3} ≠ ${r}`);
}
const inGlass = ({ cx, cy, r }) => (x, y) => (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 < r * r;
function glassRows(img, geometry) {
    const rows = new Map(), test = inGlass(geometry);
    each(img, (x, y, p) => {
        if (!test(x, y)) return;
        if (!rows.has(y)) rows.set(y, []);
        rows.get(y).push(p);
    });
    return rows;
}
function frameOf(img, geometry) {
    const frame = blank(img.w, img.h), test = inGlass(geometry);
    each(img, (x, y, p) => { if (!test(x, y)) put(frame, x, y, p); });
    return frame;
}
/** Life: the painting is half full. Liquid above the surface is mirrored from below it; the empty glass is that liquid drained dark. */
function sliceLife(img, geometry) {
    const test = inGlass(geometry), rows = glassRows(img, geometry), ys = [...rows.keys()].sort((a, b) => a - b);
    const bright = p => p[0] >= 160 && p[1] <= 90 && p[2] >= 50;
    const speck = p => avg(p) > 120 && p[2] > p[1] + 10 && p[0] > 150;
    const surface = ys.filter(y => rows.get(y).filter(bright).length / rows.get(y).length > 0.35);
    const top = Math.min(...surface), seam = Math.max(...surface) + 3;
    const base = parse(mode(ys.filter(y => y > seam - 1).flatMap(y => rows.get(y))));
    const liquid = blank(img.w, img.h), empty = blank(img.w, img.h), glint = blank(img.w, img.h);
    each(img, (x, y, p) => {
        if (!test(x, y)) return;
        if (y < top && speck(p)) put(glint, x, y, p);
        const ly = y >= seam ? y : seam + (seam - y);
        const lp = inside(img, x, ly) && test(x, ly) ? at(img, x, ly) : base;
        put(liquid, x, y, lp);
        put(empty, x, y, [Math.round(lp[0] * 0.36 + 8), Math.round(lp[1] * 0.36 + 5), Math.round(lp[2] * 0.42 + 9), 255]);
    });
    return { top: stack(frameOf(img, geometry), glint), empty, liquid };
}
/** Amber: the painting is full. The empty glass is the same swirl dimmed to an ember; pale specks stay on as reflections. */
function sliceAmber(img, geometry) {
    const test = inGlass(geometry), liquid = blank(img.w, img.h), empty = blank(img.w, img.h), glint = blank(img.w, img.h);
    each(img, (x, y, p) => {
        if (!test(x, y)) return;
        if (p[0] > 225 && p[1] > 205 && p[2] > 120) put(glint, x, y, p);
        put(liquid, x, y, p);
        put(empty, x, y, [Math.round(p[0] * 0.26 + 10), Math.round(p[1] * 0.2 + 7), Math.round(p[2] * 0.18 + 6), 255]);
    });
    return { top: stack(frameOf(img, geometry), glint), empty, liquid };
}

// ─── 미니맵 테 ─────────────────────────────────────────────────────────
/** The rim with its window cleared, pushed `grow` dots outward along each ray so the window becomes r + grow. */
function mapRim(img, { cx, cy, r, grow }) {
    const out = blank(img.w + grow * 2, img.h + grow * 2), ox = cx + grow, oy = cy + grow;
    each(out, (x, y) => {
        const dx = x + 0.5 - ox, dy = y + 0.5 - oy, d = Math.hypot(dx, dy);
        if (d < r + grow) return;
        const s = (d - grow) / d, sx = Math.floor(cx + dx * s), sy = Math.floor(cy + dy * s);
        if (inside(img, sx, sy) && (sx + 0.5 - cx) ** 2 + (sy + 0.5 - cy) ** 2 >= r * r) put(out, x, y, at(img, sx, sy));
    });
    return out;
}
/** The minimap canvas mask: the window minus a `track` dot ring left for the exploration progress arc. */
function mapWindow({ r, grow }, track) {
    const size = (r + grow) * 2, out = blank(size, size), c = size / 2, keep = r + grow - track;
    each(out, (x, y) => { if ((x + 0.5 - c) ** 2 + (y + 0.5 - c) ** 2 < keep * keep) put(out, x, y, [0, 0, 0, 255]); });
    return out;
}

// ─── 메뉴 단추 틀 ──────────────────────────────────────────────────────
function trim(img) {
    let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
    each(img, (x, y, p) => { if (p[3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } });
    const out = blank(x1 - x0 + 1, y1 - y0 + 1);
    each(out, (x, y) => put(out, x, y, at(img, x0 + x, y0 + y)));
    return out;
}
/** 9-slice to size×size: corners copied as drawn, edges continue the middle of each side, the centre is the button's panel colour. */
function keyFrame(img, { size, corner, band }) {
    const midX = Math.floor(img.w / 2), midY = Math.floor(img.h / 2), last = size - 1, out = blank(size, size);
    const panel = parse(mode([...Array(10).keys()].flatMap(i => [at(img, 6 + i, midY), at(img, img.w - 7 - i, midY)])));
    const fromEdge = (v, length) => (v < corner ? v : v > last - corner ? length - 1 - (last - v) : null);
    each(out, (x, y) => {
        const sx = fromEdge(x, img.w), sy = fromEdge(y, img.h);
        if (sx !== null && sy !== null) put(out, x, y, at(img, sx, sy));
        else if (y < band) put(out, x, y, at(img, midX, y));
        else if (y > last - band) put(out, x, y, at(img, midX, img.h - 1 - (last - y)));
        else if (x < band) put(out, x, y, at(img, x, midY));
        else if (x > last - band) put(out, x, y, at(img, img.w - 1 - (last - x), midY));
        else put(out, x, y, panel);
    });
    return out;
}
/** The open-window state: bronze pixels lifted toward gold, iron and panel untouched. */
function litKey(img, lift) {
    const out = blank(img.w, img.h);
    each(img, (x, y, p) => {
        const bronze = p[3] && p[0] > p[1] && p[1] > p[2] && p[0] - p[2] > 30 && avg(p) > 55;
        put(out, x, y, bronze ? [Math.min(255, Math.round(p[0] * 1.25 + lift)), Math.min(255, Math.round(p[1] * 1.2 + lift * 0.7)), Math.min(255, Math.round(p[2] * 0.9 + lift * 0.1)), p[3]] : p);
    });
    return out;
}

// ─── 창 · 단추 · 칸 · 판(2026-10-01): UI 전체를 HUD 그림의 결로 ─────────────────────────
// 원본 단추의 테를 도트 단위로 읽은 색: 먹선 · 윗/왼 청동 빛 · 청동 · 아래/오른 어두운 청동 · 안쪽 그늘 · 숯빛 판.
const KIT = { ink: '#080508', hiTop: '#ecc476', hiSide: '#c59862', midTop: '#845f42', midSide: '#70513d', dark: '#483239', shade: '#19161c', panel: '#1e1c22' };
// 올렸을 때(조금 밝게) · 주 동작과 열린 상태(금빛, 원본 hud-key-on과 같은 방향) · 눌렀을 때(빛이 뒤집힘).
const KIT_TONES = {
    base: KIT,
    hot: { ...KIT, hiTop: '#f6d898', hiSide: '#dcb074', midTop: '#9e7148', midSide: '#8a6243', dark: '#574038', panel: '#25222a' },
    on: { ...KIT, hiTop: '#ffe39a', hiSide: '#f0c46e', midTop: '#c48a44', midSide: '#a8753c', dark: '#6a4a2e', panel: '#2a2420' },
    down: { ...KIT, hiTop: '#483239', hiSide: '#483239', midTop: '#2c2126', midSide: '#2c2126', dark: '#845f42', panel: '#19161c' },
};
const rgbaOf = color => parse(color);
/** The side of a square a pixel belongs to (nearest edge; ties go to top, then left) and how deep it sits. */
function edgeOf(x, y, last) {
    const d = { top: y, left: x, bottom: last - y, right: last - x };
    const side = ['top', 'left', 'bottom', 'right'].reduce((a, b) => (d[a] <= d[b] ? a : b));
    return { side, depth: d[side] };
}
/** Button frame 9×9 (9-slice 4): ink · light · bronze · ink, lit from the top left like the kit buttons; the centre is the panel. */
function bevelFrame(tone) {
    const n = 9, last = n - 1, out = blank(n, n);
    each(out, (x, y) => {
        if ((x === 0 || x === last) && (y === 0 || y === last)) return;
        const { side, depth } = edgeOf(x, y, last), lit = side === 'top' || side === 'left';
        const rows = [tone.ink, lit ? (side === 'top' ? tone.hiTop : tone.hiSide) : tone.midSide,
            lit ? (side === 'top' ? tone.midTop : tone.midSide) : tone.dark, tone.ink];
        put(out, x, y, rgbaOf(depth < rows.length ? rows[depth] : tone.panel));
    });
    return out;
}
/** Sunken field 5×5 (9-slice 2): ink, then shadow on the top left and dim bronze on the bottom right, dark centre. */
function insetFrame() {
    const n = 5, last = n - 1, out = blank(n, n);
    each(out, (x, y) => {
        const { side, depth } = edgeOf(x, y, last);
        const color = depth === 0 ? KIT.ink : depth === 1 ? (side === 'top' || side === 'left' ? '#0d0b0f' : '#3a2c30') : '#141216';
        put(out, x, y, rgbaOf(color));
    });
    return out;
}
/** Window / panel frame: the kit's square button grown to any size — its bronze bevel, rounded corners and the Celtic knot
 * triangles in each corner (a triangular mask keeps the icon out), a flat charcoal centre. 9-slice `corner`. */
function windowFrame(img, { corner, knot, band }) {
    const size = corner * 2 + 1, last = size - 1, out = blank(size, size), panel = rgbaOf(KIT.panel);
    const midX = Math.floor(img.w / 2), midY = Math.floor(img.h / 2);
    const source = (v, length, mid) => (v < corner ? v : v > last - corner ? length - 1 - (last - v) : mid);
    each(out, (x, y) => {
        const sx = source(x, img.w, midX), sy = source(y, img.h, midY);
        const dx = Math.min(sx, img.w - 1 - sx), dy = Math.min(sy, img.h - 1 - sy);
        put(out, x, y, dx < band || dy < band || dx + dy < knot ? at(img, sx, sy) : panel);
    });
    return out;
}
/** Charcoal panel tile: the kit panel colour with sparse one-dot specks (never a pattern that repeats visibly). */
function panelTile(base, seed) {
    const n = 64, out = blank(n, n), [r, g, b] = rgbaOf(base);
    const speck = (x, y) => (((x * 73856093) ^ (y * 19349663) ^ (seed * 83492791)) >>> 0) % 1000 / 1000;
    each(out, (x, y) => {
        const s = speck(x, y), lift = s < .035 ? 7 : s > .975 ? -5 : 0;
        put(out, x, y, [r + lift, g + lift, b + lift, 255]);
    });
    return out;
}

function build() {
    const life = load(GEOMETRY.life.file), amber = load(GEOMETRY.amber.file);
    measureGlass(life, GEOMETRY.life);
    measureGlass(amber, GEOMETRY.amber);
    const lifeParts = sliceLife(life, GEOMETRY.life), amberParts = sliceAmber(amber, GEOMETRY.amber);
    const key = keyFrame(trim(load(GEOMETRY.key.file)), GEOMETRY.key);
    return {
        'hud-orb-life-top.png': lifeParts.top,
        'hud-orb-life-empty.png': lifeParts.empty,
        'hud-orb-life-liquid.png': lifeParts.liquid,
        'hud-orb-amber-top.png': amberParts.top,
        'hud-orb-amber-empty.png': amberParts.empty,
        'hud-orb-amber-liquid.png': amberParts.liquid,
        'hud-map-rim.png': mapRim(load(GEOMETRY.map.file), GEOMETRY.map),
        'hud-map-window.png': mapWindow(GEOMETRY.map, 4),
        'hud-key.png': key,
        'hud-key-on.png': litKey(key, 40),
        'hud-window.png': windowFrame(trim(load(GEOMETRY.key.file)), GEOMETRY.window),
        'hud-btn.png': bevelFrame(KIT_TONES.base),
        'hud-btn-hot.png': bevelFrame(KIT_TONES.hot),
        'hud-btn-on.png': bevelFrame(KIT_TONES.on),
        'hud-btn-down.png': bevelFrame(KIT_TONES.down),
        'hud-inset.png': insetFrame(),
        'hud-panel.png': panelTile(KIT.panel, 3),
        'hud-panel-dark.png': panelTile(KIT.shade, 5),
    };
}

const files = build();
fs.mkdirSync(OUT, { recursive: true });
for (const [name, img] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), encodePng(img.w, img.h, img.d));
console.log(`HUD 그림 ${Object.keys(files).length}개를 ${path.relative(process.cwd(), OUT)}에 썼습니다.`);
