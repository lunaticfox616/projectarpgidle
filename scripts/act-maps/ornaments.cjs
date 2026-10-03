'use strict';
/* 방 바닥 무늬(디오라마의 바닥 장식): 금 상감 테두리와 호, 새긴 동심원, 네잎 무늬, 방사형 뿌리·널, 널빤지 고리.
 * 방 상자(칸 경계)에 맞춰 그리므로 방 크기가 달라도 가운데를 중심으로 같은 모양이 된다. */
const { drawTube } = require('./paint.cjs');
const { roomBox } = require('./terrain.cjs');

/** 선 한 도트: gold = 금선 + 아래 그늘, etched = 파인 홈 + 아래 밝은 턱, pale = 옅은 선. */
function lineDot(cv, g, x, y, look, seen) {
    x = Math.round(x); y = Math.round(y);
    const i = y * cv.w + x;
    if (!cv.inside(x, y) || !g.floor[i] || seen.has(i)) return;
    seen.add(i);
    if (look.style === 'gold') {
        cv.px[i] = cv.col(look.ramp || 'warm', look.level ?? 1);
        if (cv.inside(x, y + 1) && g.floor[i + cv.w] && !seen.has(i + cv.w)) cv.px[i + cv.w] = cv.pal.shade(cv.px[i + cv.w], -1);
    } else if (look.style === 'pale') {
        cv.px[i] = cv.col(look.ramp || 'stone', look.level ?? 4);
    } else {
        cv.px[i] = cv.pal.shade(cv.px[i], -2);
        if (cv.inside(x, y + 1) && g.floor[i + cv.w] && !seen.has(i + cv.w)) cv.px[i + cv.w] = cv.pal.shade(cv.px[i + cv.w], 1);
    }
}

function circleDots(cx, cy, rx, ry, clip) {
    const out = [], steps = Math.max(24, Math.ceil(Math.max(rx, ry) * 7));
    for (let s = 0; s < steps; s++) {
        const a = s / steps * Math.PI * 2, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
        if (!clip || (x >= clip[0] && x <= clip[2] && y >= clip[1] && y <= clip[3])) out.push([x, y]);
    }
    return out;
}
function rectDots(x0, y0, x1, y1) {
    const out = [];
    for (let x = x0; x <= x1; x++) out.push([x, y0], [x, y1]);
    for (let y = y0; y <= y1; y++) out.push([x0, y], [x1, y]);
    return out;
}

function frame(room, inset) {
    const [x0, y0, x1, y1] = roomBox(room);
    const b = [x0 + inset, y0 + inset, x1 - 1 - inset, y1 - 1 - inset];
    return { box: [x0, y0, x1, y1], inner: b, cx: (x0 + x1) / 2 - 0.5, cy: (y0 + y1) / 2 - 0.5, hw: (b[2] - b[0]) / 2, hh: (b[3] - b[1]) / 2 };
}

const KINDS = {
    /** 이중 금선 테두리(디오라마 액트 2). */
    border(cv, g, f, look, seen) {
        const [a, b, c, d] = f.inner;
        for (const p of [...rectDots(a, b, c, d), ...rectDots(a + 3, b + 3, c - 3, d - 3)]) lineDot(cv, g, p[0], p[1], look, seen);
    },
    /** 테두리 + 네 변 가운데에서 안으로 부푼 이중 호, 가운데 마름모(액트 2 금 상감, 액트 9 옅은 선). */
    arcs(cv, g, f, look, seen) {
        KINDS.border(cv, g, f, look, seen);
        const [a, b, c, d] = f.inner, rx = f.hw * 0.62, ry = f.hh * 0.62, clip = [a + 3, b + 3, c - 3, d - 3], mx = (a + c) / 2, my = (b + d) / 2;
        for (const [x, y, r] of [[a, my, rx], [c, my, rx], [mx, b, ry], [mx, d, ry]]) {
            for (const p of circleDots(x, y, r * 0.8, r * 0.8, clip)) lineDot(cv, g, p[0], p[1], look, seen);
        }
        const k = Math.min(f.hw, f.hh) * 0.18;
        for (let t = -k; t <= k; t += 0.5) for (const [x, y] of [[mx + t, my - (k - Math.abs(t))], [mx + t, my + (k - Math.abs(t))]]) lineDot(cv, g, x, y, look, seen);
    },
    /** 방 가운데 동심원 셋 + 바깥 두 원 사이 눈금(액트 5 새김, 액트 10 금). */
    rings(cv, g, f, look, seen) {
        const m = Math.min(f.hw, f.hh);
        for (const k of [0.16, 0.5, 0.82]) for (const p of circleDots(f.cx, f.cy, m * k, m * k)) lineDot(cv, g, p[0], p[1], look, seen);
    },
    /** 테두리(look.frame: false면 생략) + 둥글게 늘어선 판석마다 작은 네잎 무늬(액트 6). */
    quatrefoil(cv, g, f, look, seen) {
        if (look.frame !== false) KINDS.border(cv, g, f, look, seen);
        const m = Math.min(f.hw, f.hh);
        for (let y = f.box[1] + 8; y < f.box[3]; y += 16) for (let x = f.box[0] + 8; x < f.box[2]; x += 16) {
            const d = Math.hypot(x - f.cx, y - f.cy);
            if (d < m * 0.35 || d > m * 0.8) continue;
            for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) for (const p of circleDots(x + ox, y + oy, 1.6, 1.6)) lineDot(cv, g, p[0], p[1], look, seen);
        }
    },
    /** 방 가운데 둘레에서 굽이치며 뻗고 곁뿌리를 치는 뿌리(액트 1 디오라마의 바닥). */
    burst(cv, g, f) {
        const n = cv.rng.int(4, 7), turn = cv.rng.uniform(0, Math.PI * 2);
        for (let k = 0; k < n; k++) {
            const a0 = turn + k / n * Math.PI * 2 + cv.rng.uniform(-0.35, 0.35), start = cv.rng.uniform(2, 7);
            const reach = Math.hypot(Math.cos(a0) * f.hw, Math.sin(a0) * f.hh) * cv.rng.uniform(0.75, 1.15);
            rootWalk(cv, g, { x: f.cx + Math.cos(a0) * start, y: f.cy + Math.sin(a0) * start, a: a0, reach, width: cv.rng.uniform(5, 7.5), depth: 0, seed: k });
        }
    },
    /** 가운데에서 네 모서리로 갈라지는 굵은 뿌리 X(액트 4). */
    cross(cv, g, f) {
        const [x0, y0, x1, y1] = f.box;
        [[x0 - 6, y0 - 6], [x1 + 6, y0 - 6], [x0 - 6, y1 + 6], [x1 + 6, y1 + 6]].forEach(([tx, ty], k) => {
            const pts = [];
            for (let t = 0; t <= 1.001; t += 0.08) {
                const wob = Math.sin(t * 7 + k) * 2.2;
                pts.push([f.cx + (tx - f.cx) * t + wob, f.cy + (ty - f.cy) * t - wob * 0.6]);
            }
            drawTube(cv, pts, 8, { taper: 0.6, seed: 40 + k, mask: g.floor, base: 2 });
        });
    },
    /** 해살처럼 퍼진 널빤지 바닥(액트 7). */
    sunburst(cv, g, f) { planks(cv, g, f, 0, 1.08); },
    /** 판석을 두른 널빤지 고리(액트 8). */
    ringwalk(cv, g, f) { planks(cv, g, f, 0.62, 0.98); }
};

/** 굽이치는 뿌리 한 가닥과 곁뿌리(깊이 2까지). */
function rootWalk(cv, g, r) {
    let { x, y, a } = r;
    const pts = [[x, y]];
    for (let s = 0; s < r.reach; s += 2.5) {
        a += cv.rng.normal(0, 0.16) + Math.sin(s / 9 + r.seed) * 0.05;
        x += Math.cos(a) * 2.5; y += Math.sin(a) * 2.5;
        pts.push([x, y]);
        if (r.depth < 2 && s > 8 && cv.rng.random() < 0.07) {
            rootWalk(cv, g, { x, y, a: a + (cv.rng.random() < 0.5 ? -1 : 1) * cv.rng.uniform(0.5, 1), reach: (r.reach - s) * 0.6, width: r.width * 0.55, depth: r.depth + 1, seed: r.seed + 7 });
        }
    }
    drawTube(cv, pts, r.width, { taper: 0.8, seed: r.seed, mask: g.floor, base: 2 });
}

/** 방 타원 안 r0~r1(비율) 사이를 방사형 널로 덮는다. 이음매·나이테 줄·중심 쇠테. */
function planks(cv, g, f, r0, r1) {
    const { w } = cv, n = 30, tone = Array.from({ length: n * 8 }, () => cv.rng.choice([2, 2, 3, 3, 1]));
    for (let y = f.box[1]; y < f.box[3]; y++) for (let x = f.box[0]; x < f.box[2]; x++) {
        const i = y * w + x;
        if (!cv.inside(x, y) || !g.floor[i]) continue;
        const nx = (x - f.cx) / (f.hw + 5), ny = (y - f.cy) / (f.hh + 5), d = Math.hypot(nx, ny);
        if (d < r0 || d > r1) continue;
        const rpx = Math.hypot(x - f.cx, y - f.cy), t = (Math.atan2(y - f.cy, x - f.cx) + Math.PI) / (Math.PI * 2) * n, ring = Math.floor(rpx / 14);
        const seam = (t - Math.floor(t)) * (Math.PI * 2 * Math.max(rpx, 1) / n) < 1 || rpx % 14 < 1;
        const edge = Math.abs(d - r0) < 0.03 || Math.abs(d - r1) < 0.03;
        if (edge || rpx < 3.5) { cv.px[i] = cv.pal.ink; continue; }
        cv.px[i] = seam ? cv.col('wood', 0) : cv.col('wood', tone[(Math.floor(t) + ring * n) % tone.length] + (rpx % 14 < 2.2 ? 1 : 0));
    }
}

/** 방마다 무늬를 그린다. spec = { kind, roles, inset, look: { style, ramp, level } }. */
function ornaments(cv, g, spec) {
    if (!spec) return;
    for (const room of Object.values(g.rooms)) {
        if (spec.roles && !spec.roles.includes(room.role)) continue;
        const f = frame(room, spec.inset ?? 5);
        if (f.hw < 8 || f.hh < 8) continue;
        KINDS[spec.kind](cv, g, f, spec.look || { style: 'etched' }, new Set());
    }
}

module.exports = { ornaments };
