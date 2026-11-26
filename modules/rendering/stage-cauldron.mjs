/** 연금 가마솥(88)의 큰 고딕 가마솥(2026-11-26 스킬 전달본 V3.24 후속 cauldron-gothic-vfx.js): 황동 장식의 주물 솥이 대상 위에 떠서 기울고,
 * 끓는 물약이 굵은 줄기로 쏟아져 세 번 덮친 뒤 바닥의 웅덩이가 약 1초에 걸쳐 옅어진다. 피해의 때는 전투가 정한다(modules/combat/gem-extension-flasks.mjs).
 * 솥은 84×64 도트를 한 번 그려 두고 2배(전달본 2.05배를 도트가 고른 정수 배율로)로 그린다. 웅덩이는 범위 크기로 한 장 그려 두고
 * 넓어지는 만큼 타원으로 잘라 보인다(늘이지 않는다). 그 밖의 줄기, 물방울, 물결, 거품은 그때그때 도트로 찍는다. */
const INK = '#18141f', BRASS = '#a38560', GOLD = '#d6b786', TARNISH = '#634c40', IRON = '#343242', SILVER = '#777487';
const SCALE = 2;
const clamp = value => Math.max(0, Math.min(1, value));
const easeOut = value => 1 - (1 - clamp(value)) ** 2;
const smooth = value => { const u = clamp(value); return u * u * (3 - 2 * u); };

class StageCauldron {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.TAU = Math.PI * 2;
        this.vessel = null;
        this.pools = new Map();
    }

    surface(width, height) {
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const g = canvas.getContext('2d');
        g.imageSmoothingEnabled = false;
        return g;
    }

    polygon(g, colour, vertices) {
        const ys = vertices.map(v => v[1]);
        g.fillStyle = colour;
        for (let y = Math.min(...ys); y < Math.max(...ys); y++) {
            const cuts = [];
            for (let i = 0; i < vertices.length; i++) {
                const [a, b] = vertices[i], [c, d] = vertices[(i + 1) % vertices.length];
                if (y + 0.5 < Math.min(b, d) || y + 0.5 >= Math.max(b, d)) continue;
                cuts.push(a + (c - a) * (y + 0.5 - b) / (d - b));
            }
            cuts.sort((a, b) => a - b);
            for (let i = 0; i < cuts.length; i += 2) { const x = Math.ceil(cuts[i] - 0.5); g.fillRect(x, y, Math.ceil(cuts[i + 1] - 0.5) - x, 1); }
        }
    }

    ellipsePixels(g, colour, [cx, cy], rx, ry) {
        g.fillStyle = colour;
        for (let y = Math.ceil(cy - ry); y < cy + ry; y++) {
            const u = (y + 0.5 - cy) / ry, width = Math.floor(rx * Math.sqrt(Math.max(0, 1 - u * u)));
            if (width > 0) g.fillRect(Math.round(cx) - width, y, width * 2, 1);
        }
    }

    /** 뒤 다리와 발톱 다리 둘(몸과 함께 기운다), 구멍이 뚫린 무쇠 손잡이 둘. */
    vesselFeet(g, p) {
        p(INK, [[-9, 19], [9, 19], [6, 27], [6, 30], [0, 32], [-7, 29], [-7, 25]]);
        p(IRON, [[-6, 21], [6, 20], [4, 28], [0, 29], [-4, 28]]);
        for (const side of [-1, 1]) {
            g.save(); g.scale(side, 1);
            p(INK, [[11, 19], [26, 17], [25, 23], [22, 29], [25, 31], [29, 30], [31, 33], [26, 34], [17, 34], [15, 31], [16, 26]]);
            p(IRON, [[16, 21], [24, 19], [22, 24], [20, 29], [22, 31], [27, 32], [19, 33], [17, 31], [19, 24]]);
            p(BRASS, [[18, 23], [23, 22], [20, 25], [19, 29], [17, 30], [17, 27]]);
            p(TARNISH, [[21, 31], [27, 31], [28, 33], [22, 33]]);
            g.restore();
        }
        for (const side of [-1, 1]) {
            g.save(); g.scale(side, 1);
            p(INK, [[27, -19], [33, -24], [39, -23], [42, -19], [42, -13], [38, -9], [31, -8], [28, -11], [29, -15], [35, -14], [37, -17], [36, -19], [33, -18], [30, -14]]);
            p(TARNISH, [[30, -18], [33, -22], [38, -22], [40, -19], [40, -14], [37, -11], [32, -10], [31, -12], [36, -13], [38, -17], [36, -21], [33, -20], [31, -16]]);
            p(GOLD, [[32, -21], [36, -22], [39, -20], [40, -17], [38, -16], [37, -19], [35, -20], [32, -18]]);
            g.restore();
        }
    }

    /** 둥근 무쇠 몸통을 띠와 면으로 나눈다. */
    vesselBody(p) {
        p(INK, [[-35, -16], [-31, -19], [31, -19], [35, -15], [35, 1], [31, 12], [23, 21], [12, 26], [-11, 26], [-23, 21], [-31, 12], [-35, 1]]);
        p('#262331', [[-33, -14], [-29, -17], [30, -17], [33, -13], [33, 0], [29, 11], [22, 19], [11, 24], [-12, 24], [-23, 19], [-29, 11], [-33, 1]]);
        p(IRON, [[-30, -13], [-24, -16], [21, -14], [27, -8], [26, 6], [20, 15], [11, 20], [-8, 22], [-20, 19], [-27, 11], [-30, 4]]);
        p('#4b4757', [[-28, -12], [-21, -11], [-19, -4], [-20, 7], [-13, 19], [-21, 16], [-25, 10], [-28, 4]]);
        p(SILVER, [[-27, -9], [-23, -9], [-22, -6], [-23, 1], [-22, 6], [-24, 6], [-26, 1]]);
        p('#484353', [[-15, -13], [15, -13], [22, -3], [20, 10], [11, 18], [-3, 20], [-12, 16], [-16, 7]]);
        p(INK, [[29, -9], [33, -7], [33, 0], [29, 11], [22, 19], [13, 23], [11, 23], [18, 18], [23, 12], [27, 5]]);
    }

    /** 단조한 띠와 고딕 성유물함 같은 첨두 아치 셋, 리벳. */
    vesselBand(g, p) {
        p(TARNISH, [[-33, -8], [-17, -4], [0, -3], [17, -4], [33, -8], [32, -3], [16, 0], [0, 1], [-16, 0], [-32, -3]]);
        p(BRASS, [[-32, -7], [-17, -4], [0, -3], [17, -4], [32, -7], [31, -5], [17, -2], [0, -1], [-16, -2], [-31, -5]]);
        p(GOLD, [[-31, -7], [-17, -5], [-12, -4], [-12, -3], [-22, -4], [-31, -6]]);
        for (const [x, y, wide] of [[-16, 7, 5], [0, 6, 7], [16, 7, 5]]) {
            p(INK, [[x, y - 5], [x + wide + 1, y + 1], [x + wide + 1, y + 9], [x, y + 12], [x - wide - 1, y + 9], [x - wide - 1, y + 1]]);
            p(TARNISH, [[x, y - 4], [x + wide, y + 1], [x + wide, y + 8], [x, y + 11], [x - wide, y + 8], [x - wide, y + 1]]);
            p('#33283a', [[x, y - 2], [x + wide - 2, y + 2], [x + wide - 2, y + 7], [x, y + 9], [x - wide + 2, y + 7], [x - wide + 2, y + 2]]);
            p(BRASS, [[x, y - 4], [x - 1, y - 2], [x - wide + 1, y + 2], [x - wide + 1, y + 7], [x - wide, y + 7], [x - wide, y + 1]]);
            p(GOLD, [[x, y - 3], [x + 1, y - 2], [x, y], [x - 1, y - 2]]);
        }
        p(TARNISH, [[-27, 14], [-17, 20], [-8, 23], [10, 22], [20, 19], [27, 13], [24, 18], [15, 23], [9, 25], [-10, 25], [-20, 22]]);
        for (const [x, y] of [[-28, -3], [-23, -2], [-12, 0], [12, 0], [24, -2], [29, -3]]) { g.fillStyle = TARNISH; g.fillRect(x, y, 2, 2); g.fillStyle = GOLD; g.fillRect(x, y, 1, 1); }
    }

    /** 앞 테두리: 안티에일리어스 없이 가로 띠로 찍는다. */
    vesselRim() {
        const rim = this.surface(76, 12);
        rim.translate(38, 17);
        this.polygon(rim, INK, [[-35, -16], [-26, -13], [-11, -11], [11, -11], [26, -13], [35, -16], [33, -11], [25, -8], [11, -6], [-11, -6], [-26, -8], [-33, -11]]);
        this.polygon(rim, TARNISH, [[-33, -14], [-25, -11], [-11, -9], [11, -9], [25, -11], [33, -14], [31, -11], [24, -9], [11, -7], [-11, -7], [-25, -9], [-31, -11]]);
        rim.fillStyle = GOLD;
        [[-31, -13, 7], [-24, -12, 7], [-17, -11, 9], [-8, -10, 11]].forEach(([x, y, w]) => rim.fillRect(x, y, w, 1));
        rim.fillStyle = BRASS;
        [[3, -10, 12], [15, -11, 10], [25, -12, 5]].forEach(([x, y, w]) => rim.fillRect(x, y, w, 1));
        return rim.canvas;
    }

    makeVessel() {
        const g = this.surface(84, 64), p = (colour, vertices) => this.polygon(g, colour, vertices);
        g.translate(42, 28);
        this.vesselFeet(g, p);
        this.vesselBody(p);
        this.vesselBand(g, p);
        this.ellipsePixels(g, INK, [0, -16], 36, 10); this.ellipsePixels(g, BRASS, [0, -17], 34, 8); this.ellipsePixels(g, TARNISH, [0, -17], 32, 6);
        this.ellipsePixels(g, '#231b2b', [0, -17], 30, 5); this.ellipsePixels(g, '#130f1b', [0, -18], 27, 4);
        return { body: g.canvas, rim: this.vesselRim() };
    }

    /** 범위 크기의 웅덩이 한 장(가장자리가 고르지 않은 타원, 결과 반사). 물결과 줄무늬는 전달본의 180×88 판의 줄(row)로 재서 큰 판에서도 같은 모양이다. */
    makePool(colour, A, B) {
        const width = Math.max(16, Math.round(A * 2)), height = Math.max(8, Math.round(B * 2)), cx = width / 2, cy = height / 2, g = this.surface(width, height);
        for (let y = 2; y < height - 2; y++) {
            const ny = (y - cy) / (cy - 5), span = Math.sqrt(Math.max(0, 1 - ny * ny)) * (cx - 6), row = Math.floor(y * 88 / height);
            const left = Math.round(cx - span * (0.89 + 0.065 * Math.cos(row * 0.47) + 0.045 * Math.sin(row * 0.19)) - 2);
            const right = Math.round(cx + span * (0.87 + 0.07 * Math.cos(row * 0.36 + 2) + 0.05 * Math.sin(row * 0.19)) + 2);
            if (right - left < 8) continue;
            g.fillStyle = INK; g.fillRect(left - 1, y, right - left + 2, 1);
            g.globalAlpha = 0.84; g.fillStyle = colour.c3; g.fillRect(left + 2, y, right - left - 4, 1); g.globalAlpha = 1;
            if (row % 7 < 3) { g.fillStyle = colour.c2; g.fillRect(left + 2, y, 2, 1); g.fillRect(right - 4, y, 2, 1); }
            if (row % 10 < 3 && Math.abs(ny) < 0.86) {
                const offset = Math.round(Math.sin(row * 2.1) * span * 0.45 + span * 0.16);
                g.globalAlpha = 0.28 + (row % 3) * 0.13; g.fillStyle = colour.c2; g.fillRect(cx + offset - 12, y, 8 + row % 13, 1); g.globalAlpha = 1;
            }
        }
        return g.canvas;
    }

    poolFor(colour, A, B) {
        const key = `${colour.c3}|${Math.round(A)}|${Math.round(B)}`;
        if (!this.pools.has(key)) {
            if (this.pools.size >= 12) this.pools.delete(this.pools.keys().next().value);
            this.pools.set(key, this.makePool(colour, A, B));
        }
        return this.pools.get(key);
    }

    /** 사건 하나의 계획: 때(전투의 붓기, 떨어짐, 간격), 범위, 방울과 거품의 자리. */
    potPlan(event, E) {
        const [A, B] = this.shared.semi(Number(event.cauldronRadius) || 2.5), rr = this.shared.ST.random(Math.floor(event.landingCell.gx * 320 + event.landingCell.gy * 32));
        const pour = event.cauldronPour, fall = Math.max(1, event.cauldronFall), every = event.cauldronEvery, hits = event.cauldronHits || 3;
        const impact = pour + fall, lastHit = impact + every * (hits - 1), pot = { A, B, E, dir: event.cauldronDir < 0 ? -1 : 1, pour, fall, every, hits, impact, lastHit,
            cut: lastHit + 105, poolEnd: lastHit + 975, top: null };
        pot.droplets = Array.from({ length: 21 }, (_, i) => {
            const ang = (i + rr() * 0.65) * this.TAU / 21, length = 0.35 + rr() * 0.56;
            return { x: Math.cos(ang) * A * length, y: Math.sin(ang) * B * length, height: 12 + rr() * 35, width: 2 + i % 4, life: 195 + rr() * 245, hit: i < 13 ? 0 : i < 17 ? 1 : 2 };
        });
        pot.bubbles = Array.from({ length: 17 }, (_, i) => {
            const ang = (i + rr()) * this.TAU / 17, distance = 0.15 + rr() * 0.65;
            return { x: Math.cos(ang) * distance, y: Math.sin(ang) * distance, phase: rr(), interval: 260 + rr() * 300 };
        });
        pot.LIFE = pot.poolEnd + 100;
        return pot;
    }

    /** 그때 솥의 자세(자리, 기운 각, 입), 줄기의 앞과 꼬리, 웅덩이의 깊이와 남은 몫. */
    pose(t, pot) {
        const { dir } = pot, fall = clamp((t - pot.pour) / pot.fall), pull = smooth((t - pot.cut - 80) / 250), tip = smooth((t - (pot.pour - 115)) / 220);
        const angle = (tip * 1.28 + 0.022 * Math.sin(t / 64)) * (1 - pull);
        const px = -dir * (33 + 15 * tip) + dir * 8 * pull, py = pot.top + 8 * tip - 16 * pull + Math.sin(t / 120) * (1 - tip) * 2, lipX = 31 * SCALE, lipY = -17 * SCALE;
        return { t, x: px, y: py, angle, fall, alpha: easeOut(t / 128) * (1 - smooth((t - pot.cut - 80) / 325)),
            mouthX: px + dir * (Math.cos(angle) * lipX - Math.sin(angle) * lipY), mouthY: py + Math.sin(angle) * lipX + Math.cos(angle) * lipY,
            tail: clamp((t - pot.cut) / pot.fall), depth: t < pot.impact ? 0 : 0.26 + 0.74 * easeOut((t - pot.impact) / 420),
            residue: t < pot.impact ? 0 : 1 - smooth((t - (pot.lastHit + 260)) / (pot.poolEnd - pot.lastHit - 260)) };
    }

    ripple(g, pot, [phase, rx, ry], alpha) {
        g.globalAlpha = alpha; g.fillStyle = pot.E.c1;
        for (let i = 0; i < 38; i++) {
            if (i % 5 === 0) continue;
            const angle = i / 38 * this.TAU + 0.26 * phase;
            g.fillRect(Math.round(Math.cos(angle) * rx), Math.round(Math.sin(angle) * ry), 2 + i % 3, 1);
        }
    }

    poolBubbles(g, p, pot, shrink) {
        for (const bubble of pot.bubbles) {
            const u = (p.t / bubble.interval + bubble.phase) % 1;
            if (u < 0.28 || Math.hypot(bubble.x, bubble.y) > p.depth * 0.9) continue;
            const x = Math.round(bubble.x * pot.A * shrink), y = Math.round(bubble.y * pot.B * shrink), radius = 1 + Math.round(u * 2);
            g.globalAlpha = (u < 0.87 ? 0.68 : 0.32) * p.residue; g.fillStyle = u < 0.87 ? pot.E.c2 : pot.E.c1;
            g.fillRect(x - radius, y, radius * 2 + 1, 1); g.fillRect(x - 1, y - radius, 2, 1);
        }
    }

    /** 바닥: 쏟기 전에는 부르는 물결과 그림자, 닿은 뒤에는 넓어지는 웅덩이(타원으로 잘라 보인다), 타격마다 물결, 거품. */
    ground(g, t, pot) {
        const p = this.pose(t, pot), { A, B } = pot;
        if (!p.depth) {
            const rise = easeOut(t / 180);
            this.ripple(g, pot, [rise, A * 0.91, B * 0.9], 0.34 * rise);
            g.globalAlpha = 0.31 * rise; this.ellipsePixels(g, INK, [0, 0], 29 + 12 * rise, 11);
            return;
        }
        if (!p.residue) return;
        const shrink = 1 - 0.11 * (1 - p.residue), rx = Math.round(A * p.depth * shrink), ry = Math.round(B * p.depth * shrink), pool = this.poolFor(pot.E, A, B);
        g.save();
        g.beginPath(); g.ellipse(0, 0, Math.max(1, rx), Math.max(1, ry), 0, 0, this.TAU); g.clip();
        g.globalAlpha = 0.78 * p.residue; g.drawImage(pool, -Math.round(pool.width / 2), -Math.round(pool.height / 2));
        g.restore();
        for (let i = 0; i < pot.hits; i++) {
            const u = (t - pot.impact - i * pot.every) / 305;
            if (u < 0 || u >= 1) continue;
            const extent = (0.2 + 0.8 * easeOut(u)) * p.depth;
            this.ripple(g, pot, [u, A * extent, B * extent], (1 - u) * 0.62 * p.residue);
        }
        this.poolBubbles(g, p, pot, shrink);
    }

    /** 솥 안의 물약(쏟을수록 준다)과 끓는 거품, 앞 테두리. 붓은 솥의 몸 원점(2배, 기운 상태)에 있다. */
    drawVessel(g, t, E, fill) {
        g.drawImage(this.vessel.body, -42, -28);
        this.ellipsePixels(g, E.c3, [0, -17], 28, 4);
        this.ellipsePixels(g, E.c2, [-2 * (1 - fill), -16], 25 * fill, 3);
        g.fillStyle = E.c1;
        for (let i = 0; i < 5; i++) {
            const x = -19 + i * 8 + Math.sin(i + t / 115) * 2;
            if (Math.abs(x) < 23 * fill) g.fillRect(Math.round(x), -17 + i % 2, 2 + i % 3, 1);
        }
        g.drawImage(this.vessel.rim, -38, -17);
    }

    /** 줄기: 입에서 넓은 막, 가운데 좁은 목, 바닥에 닿으며 무겁게 넓어진다. */
    stream(g, p, pot) {
        if (p.fall <= p.tail) return;
        const top = Math.round(p.mouthY - p.mouthY * p.tail), bottom = Math.round(p.mouthY - p.mouthY * p.fall), pathHeight = Math.max(1, -p.mouthY), E = pot.E;
        for (let py = top; py <= bottom; py += 2) {
            const u = (py - p.mouthY) / pathHeight, wave = Math.sin(u * 14 - p.t / 35);
            const width = Math.round(23 - 8 * Math.sin(Math.PI * u) + 9 * (u ** 4) + wave * 2);
            const center = p.mouthX - p.mouthX * u + pot.dir * Math.sin(Math.PI * u) * 7 + wave * 2, x = Math.round(center - width / 2), height = Math.min(2, bottom - py + 1);
            g.globalAlpha = 0.91;
            g.fillStyle = INK; g.fillRect(x - 2, py, width + 4, height);
            g.fillStyle = E.c3; g.fillRect(x, py, width, height);
            g.fillStyle = E.c2; g.fillRect(x + 3, py, Math.round(width * 0.68), height);
            g.globalAlpha = 0.69; g.fillStyle = E.c1;
            g.fillRect(x + 3 + Math.round((wave + 1) * 2), py, 2 + Math.round((1 - u) * 3), height);
            if (Math.sin(u * 91 - p.t / 24) > 0.38) g.fillRect(x + width - 4, py, 2, height);
        }
    }

    splash(g, p, pot) {
        for (const drop of pot.droplets) {
            const u = (p.t - pot.impact - drop.hit * pot.every) / drop.life;
            if (u < 0 || u >= 1) continue;
            const drift = 0.16 + 0.84 * easeOut(u), x = Math.round(drop.x * drift), y = Math.round(drop.y * drift - Math.sin(Math.PI * u) * drop.height);
            g.globalAlpha = 0.85 * (1 - u);
            g.fillStyle = pot.E.c3; g.fillRect(x - 1, y - 1, drop.width + 2, 4);
            g.fillStyle = u < 0.38 ? pot.E.c1 : pot.E.c2; g.fillRect(x, y, drop.width, 2);
        }
    }

    /** 위: 솥(2배, 기울기), 줄기, 물방울. 솥은 대상 위 151도트에 뜨고, 화면 위 끝에서 55도트보다 올라가지 않는다. */
    sky(g, t, pot) {
        if (pot.top === null) pot.top = Math.max(this.shared.screenTop(g) + 55, -151);
        const p = this.pose(t, pot);
        if (p.alpha > 0) {
            g.save();
            g.globalAlpha = p.alpha;
            g.translate(Math.round(p.x), Math.round(p.y)); g.scale(pot.dir * SCALE, SCALE); g.rotate(p.angle);
            g.imageSmoothingEnabled = false;
            this.drawVessel(g, t, pot.E, 1 - clamp((t - pot.pour) / (pot.cut - pot.pour)) * 0.76);
            g.restore();
        }
        this.stream(g, p, pot);
        this.splash(g, p, pot);
        g.globalAlpha = 1;
    }

    /** 대상 위의 큰 고딕 가마솥이 기울어 물약을 쏟는다. */
    cauldron(c) {
        if (!c.first) return true;
        if (!this.vessel) this.vessel = this.makeVessel();
        const pot = this.potPlan(c.event, this.shared.ink(c.element));
        this.shared.hangPair(c.event.landingCell, pot.LIFE, (g, t) => { g.imageSmoothingEnabled = false; this.ground(g, t, pot); g.globalAlpha = 1; }, (g, t) => this.sky(g, t, pot));
        return true;
    }

    /** 첫 닿음에 맞은 적마다 물보라 클립(시뮬레이터 doCauldron). */
    cauldronSplash(c) {
        const ref = c.gem.map.splash, centre = c.event.landingCell;
        if (!c.first || !ref) return true;
        for (const cell of c.event.targetCells || []) this.shared.standClip(ref, cell, { face: Math.sign(cell.gx - centre.gx) || 1, ramp: c.look.ramp, scale: 0.7, alpha: 0.85 });
        return true;
    }
}

export function createStageCauldron(deps, shared) {
    return new StageCauldron(deps, shared);
}
