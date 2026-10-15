#!/usr/bin/env node
/* 이야기 NPC 다섯(하켄, 베른, 오르가, 이벨, 베일라)의 도트와 일러스트를 게임이 읽는 모양으로 옮긴다(docs/stage-view-20261011.md).
 *
 *   node scripts/build-stage-npcs.cjs <npc-idle 폴더> [복사해 둘 폴더]
 *
 * <npc-idle 폴더>: export/<id>/idle-sheet.png(칸 128×128, 3열 2행, 발 (64,112))와 idle.json(프레임 시간),
 *   illustrations/<id>-selective-v4.png(1024×1536 투명 일러스트).
 * 도트의 색 맞춤(2026-10-15 사용자 "도트는 이미지랑 색 검수"): 도트가 일러스트보다 채도가 낮고 회색, 분홍 쪽으로 쏠려 있었다
 *   (오르가의 살색과 가죽, 이벨의 망토, 베일라의 연보라, 하켄의 망토). 도트의 색 칸마다 일러스트에서 밝기와 색조가 가까운 화소를
 *   모아 그 채도와 색조 쪽으로 옮긴다(밝기는 그대로). 화소 하나하나의 자리와 모양은 바꾸지 않고 색 칸만 바꾼다.
 * 쓰는 곳: assets/stage-npcs/<id>-idle.png(6칸 한 줄, 128×128), <id>-portrait.png(일러스트를 480×720으로 줄인 것).
 *   저장소에 넣지 않는다(.gitignore). [복사해 둘 폴더](런처의 rignin-ui\stage-npcs)에도 똑같이 둔다.
 * 원본은 읽기만 한다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');

const root = path.join(__dirname, '..');
const IDS = ['haken', 'bern', 'orga', 'ivel', 'veila'];
const CELL = 128, PORTRAIT = Object.freeze({ width: 480, height: 720 });
// 색 맞춤: 밝기 차 lightness 안, 색조 차 hue도 안의 일러스트 화소가 enough개 넘으면 채도를 chroma만큼, 색조를 hueShare만큼 옮긴다.
// 아주 어두운 색(dark 밑)은 채도를 darkChroma까지만 바꾼다(그늘이 물들지 않게). 밝은 색(light 위: 흰머리, 천의 밝은 면)은 lightChroma까지만
// 바꾼다: 그 밝기의 일러스트 화소는 대개 살색이라 하켄의 흰머리가 금발로 물들었다. 채도가 낮은 색(muted 밑: 흰머리의 그늘, 회색 천)도
// mutedChroma까지만 올린다.
const MATCH = Object.freeze({ lightness: 7, hue: 30, enough: 200, chroma: 0.7, hueShare: 0.6, dark: 18, darkChroma: 6, light: 70, lightChroma: 3,
    muted: 10, mutedChroma: 5, grey: 6, step: 3, heights: Object.freeze([0.15, 0.3, 2]), head: 0.2 });
// head: 머리(위에서 head 안)에 주로 쓰인 색(머리카락, 얼굴)은 그대로 둔다. 일러스트의 같은 높이에 얼굴 살색이 섞여 하켄의 흰머리가
// 금발로 물들었다.
// KEEP: 그래도 바뀌는 색 가운데 그대로 둘 것(하켄의 흰머리와 수염 그늘: 손과 띠에도 쓰여 높이로 가려지지 않는다).
const KEEP = Object.freeze({ haken: Object.freeze(['ac9690', '9a7c74']) });
// ACCENT: 일러스트의 작은 색 하나를 도트의 그 자리 화소에 칠한다(화소의 자리와 모양은 그대로). 칸 안 box(x, y, 너비, 높이)에서 to에
// 적힌 색을 쓰는 화소만 바꾼다. 하켄: 지팡이 고리 안의 2×2 밝은 점(흰머리 색을 빌려 썼다)이 일러스트의 보라 구슬 자리다.
// 베일라의 파란 구슬은 고리와 옷이 같은 색을 써서 색으로 가를 수 없다(그림을 다시 받아야 한다).
const ACCENT = Object.freeze({ haken: Object.freeze({ box: Object.freeze([86, 47, 2, 2]),
    to: Object.freeze({ ac9690: Object.freeze([0xb5, 0x8b, 0xd6]), '9a7c74': Object.freeze([0x8a, 0x5c, 0xb4]), '816f5f': Object.freeze([0x63, 0x40, 0x8a]) }) }) });

// ---- 색 공간(sRGB D65 ↔ CIE Lab) ------------------------------------------------------------------------------------
const lin = v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = v => Math.round(255 * Math.min(1, Math.max(0, v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)));
const WHITE = [0.95047, 1, 1.08883];
const f = t => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const fi = t => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
function toLch(r, g, b) {
    const R = lin(r), G = lin(g), B = lin(b);
    const xyz = [0.4124 * R + 0.3576 * G + 0.1805 * B, 0.2126 * R + 0.7152 * G + 0.0722 * B, 0.0193 * R + 0.1192 * G + 0.9505 * B];
    const [fx, fy, fz] = xyz.map((v, i) => f(v / WHITE[i]));
    const L = 116 * fy - 16, a = 500 * (fx - fy), bb = 200 * (fy - fz);
    return { L, C: Math.hypot(a, bb), h: (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360 };
}
function toRgb({ L, C, h }) {
    const a = C * Math.cos(h * Math.PI / 180), b = C * Math.sin(h * Math.PI / 180), fy = (L + 16) / 116;
    const [X, Y, Z] = [fi(fy + a / 500), fi(fy), fi(fy - b / 200)].map((v, i) => v * WHITE[i]);
    return [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z].map(gam);
}
const hueGap = (a, b) => ((b - a + 540) % 360) - 180;

// ---- 색 맞춤 ----------------------------------------------------------------------------------------------------------
/** The opaque rows of an RGBA picture's region: [top, bottom]. */
function rowsOf(png, region) {
    let top = Infinity, bottom = -1;
    for (let y = region.y; y < region.y + region.h; y++) {
        for (let x = region.x; x < region.x + region.w; x++) if (png.data[(y * png.width + x) * 4 + 3] >= 128) { top = Math.min(top, y); bottom = y; break; }
    }
    return [top, Math.max(top + 1, bottom)];
}
/** The illustration's opaque pixels in LCh, each with its height on the figure (0 at the top of the head, 1 at the feet). */
function illustrationSamples(png) {
    const out = [], [top, bottom] = rowsOf(png, { x: 0, y: 0, w: png.width, h: png.height });
    for (let y = 0; y < png.height; y += MATCH.step) {
        for (let x = 0; x < png.width; x += MATCH.step) {
            const i = (y * png.width + x) * 4;
            if (png.data[i + 3] >= 250) out.push({ ...toLch(png.data[i], png.data[i + 1], png.data[i + 2]), y: (y - top) / (bottom - top) });
        }
    }
    return out;
}
const median = list => list.slice().sort((a, b) => a - b)[list.length >> 1];
/** Illustration pixels of near lightness and hue at about the height the colour is used (head, body, legs), the window
 * widening when too few match: hair and robe can share a lightness and hue, and only where they sit tells them apart. */
function nearSamples(colour, samples) {
    for (const reach of MATCH.heights) {
        const near = samples.filter(s => Math.abs(s.L - colour.L) < MATCH.lightness && Math.abs(s.y - colour.y) < reach
            && (colour.C < MATCH.grey || Math.abs(hueGap(colour.h, s.h)) < MATCH.hue));
        if (near.length >= MATCH.enough) return near;
    }
    return null;
}
/** The colour a palette colour takes: chroma and hue moved toward the near illustration pixels, lightness kept. */
function matchedColour(colour, samples) {
    const near = colour.y < MATCH.head ? null : nearSamples(colour, samples);
    if (!near) return null;
    const weight = near.reduce((sum, s) => sum + s.C, 0) || 1;
    const hueTarget = (colour.h + near.reduce((sum, s) => sum + hueGap(colour.h, s.h) * s.C, 0) / weight + 360) % 360;
    let C = colour.C + (median(near.map(s => s.C)) - colour.C) * MATCH.chroma;
    const limit = colour.L < MATCH.dark ? MATCH.darkChroma : colour.L > MATCH.light ? MATCH.lightChroma : colour.C < MATCH.muted ? MATCH.mutedChroma : Infinity;
    C = Math.max(colour.C - limit, Math.min(colour.C + limit, C));
    const share = colour.L > MATCH.light ? MATCH.hueShare / 3 : MATCH.hueShare;
    const h = colour.C < MATCH.grey && colour.L <= MATCH.light ? hueTarget : (colour.h + hueGap(colour.h, hueTarget) * share + 360) % 360;
    return toRgb({ L: colour.L, C: Math.max(0, C), h });
}
/** Every opaque palette colour of the sheet → its matched colour (unchanged when the illustration has too few near pixels).
 * A colour's height is the mean height of its pixels on the figure across the six frames. */
function paletteMap(sheet, samples, frames, keep = []) {
    const uses = new Map();
    for (const frame of frames) {
        const [top, bottom] = rowsOf(sheet, frame);
        for (let y = frame.y; y < frame.y + frame.h; y++) {
            for (let x = frame.x; x < frame.x + frame.w; x++) {
                const i = (y * sheet.width + x) * 4;
                if (sheet.data[i + 3] === 0) continue;
                const key = sheet.data.readUInt32BE(i) >>> 8, use = uses.get(key) || { rgb: [sheet.data[i], sheet.data[i + 1], sheet.data[i + 2]], y: 0, n: 0 };
                use.y += (y - top) / (bottom - top); use.n++;
                uses.set(key, use);
            }
        }
    }
    const map = new Map();
    for (const [key, use] of uses) {
        const kept = keep.includes(key.toString(16).padStart(6, '0'));
        map.set(key, (!kept && matchedColour({ ...toLch(...use.rgb), y: use.y / use.n }, samples)) || use.rgb);
    }
    return map;
}

// ---- 시트와 초상 --------------------------------------------------------------------------------------------------------
/** A pixel's colour: the accent's when the pixel sits in the accent box (cell coordinates) and uses one of its colours, otherwise
 * the matched one. */
function pixelColour(map, accent, x, y, key) {
    const [bx, by, bw, bh] = accent ? accent.box : [];
    const inBox = !!accent && x >= bx && x < bx + bw && y >= by && y < by + bh;
    return (inBox && accent.to[key.toString(16).padStart(6, '0')]) || map.get(key);
}
/** The 3×2 idle sheet as one row of six cells, recoloured. */
function stripOf(sheet, map, frames, accent) {
    const out = Buffer.alloc(CELL * frames.length * CELL * 4);
    frames.forEach((frame, index) => {
        for (let y = 0; y < CELL; y++) {
            for (let x = 0; x < CELL; x++) {
                const from = ((frame.y + y) * sheet.width + frame.x + x) * 4, to = (y * CELL * frames.length + index * CELL + x) * 4;
                if (sheet.data[from + 3] === 0) continue;
                const [r, g, b] = pixelColour(map, accent, x, y, sheet.data.readUInt32BE(from) >>> 8);
                out[to] = r; out[to + 1] = g; out[to + 2] = b; out[to + 3] = sheet.data[from + 3];
            }
        }
    });
    return encodePng(CELL * frames.length, CELL, out);
}
/** The illustration shrunk by area averaging (alpha-weighted colour). */
function portraitOf(png) {
    const { width, height } = PORTRAIT, out = Buffer.alloc(width * height * 4), sx = png.width / width, sy = png.height / height;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, n = 0;
            for (let yy = Math.floor(y * sy); yy < Math.floor((y + 1) * sy); yy++) {
                for (let xx = Math.floor(x * sx); xx < Math.floor((x + 1) * sx); xx++) {
                    const i = (yy * png.width + xx) * 4, w = png.data[i + 3];
                    r += png.data[i] * w; g += png.data[i + 1] * w; b += png.data[i + 2] * w; a += w; n++;
                }
            }
            const o = (y * width + x) * 4;
            if (a) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
            out[o + 3] = Math.round(a / n);
        }
    }
    return encodePng(width, height, out);
}
function framesOf(json) {
    const frames = Object.values(json.frames).map(row => ({ ...row.frame, ms: row.duration }));
    if (frames.length !== 6 || frames.some(frame => frame.w !== CELL || frame.h !== CELL)) throw new Error('6 frames of 128×128 expected');
    return frames;
}

function main([source, copy]) {
    if (!source) { console.log('node scripts/build-stage-npcs.cjs <npc-idle 폴더> [복사해 둘 폴더]'); return 2; }
    const target = path.join(root, 'assets/stage-npcs');
    fs.mkdirSync(target, { recursive: true });
    for (const id of IDS) {
        const sheet = decodePng(fs.readFileSync(path.join(source, 'export', id, 'idle-sheet.png')));
        const frames = framesOf(JSON.parse(fs.readFileSync(path.join(source, 'export', id, 'idle.json'), 'utf8')));
        const art = decodePng(fs.readFileSync(path.join(source, 'illustrations', `${id}-selective-v4.png`)));
        const map = paletteMap(sheet, illustrationSamples(art), frames, KEEP[id]);
        fs.writeFileSync(path.join(target, `${id}-idle.png`), stripOf(sheet, map, frames, ACCENT[id]));
        fs.writeFileSync(path.join(target, `${id}-portrait.png`), portraitOf(art));
        const moved = [...map].filter(([key, rgb]) => key !== ((rgb[0] << 16) | (rgb[1] << 8) | rgb[2])).length;
        console.log(`${id}: 색 ${map.size}칸 가운데 ${moved}칸 맞춤, 프레임 ${frames.map(frame => frame.ms).join('/')}ms`);
    }
    if (copy) {
        fs.mkdirSync(copy, { recursive: true });
        for (const file of fs.readdirSync(target)) fs.copyFileSync(path.join(target, file), path.join(copy, file));
        console.log(`복사: ${copy}`);
    }
    return 0;
}
try {
    process.exitCode = main(process.argv.slice(2));
} catch (error) {
    console.error(`멈춤: ${error.message}`);
    process.exitCode = 1;
}
