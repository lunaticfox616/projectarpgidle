class StageElementalSpells {
    constructor(deps) {
        this.deps = deps;
        this.S = this.deps.stageSkillStrokes;
        this.WIDE = 64;
        this.DEEP = 32;
        this.TAU = Math.PI * 2;
        this.dot = g => (x, y) => g.fillRect(x, y, 1, 1);
        this.ICE = Object.freeze({ SW: 180, TURN: this.TAU * 1.12, HIP: 27, RIM: 0.91, WAVE_AT: 140, WAVE_MS: 364, LIFE: 820, STEPS: 84, SHARDS: 6, SHARD_MS: 304 });
        this.iceHead = t => { const u = Math.min(1, Math.max(0, t) / this.ICE.SW); return this.ICE.TURN * (1 - (1 - u) * (1 - u)); };
        this.iceTimeOf = a => this.ICE.SW * (1 - Math.sqrt(Math.max(0, 1 - a / this.ICE.TURN)));
        this.icePos = (ring, a) => [ring.face * ring.A * this.ICE.RIM * Math.cos(Math.PI + a), ring.B * this.ICE.RIM * Math.sin(Math.PI + a)];
        this.zoneEnvelope = (z, t) => (t < 0 ? 0 : Math.min(1, t / 220) * (t > z.life - 320 ? Math.max(0, (z.life - t) / 320) : 1));
        this.CRATER = Object.freeze({ openMs: 180,
            core: [[-0.30, -0.13], [-0.13, -0.27], [0.13, -0.23], [0.32, -0.09], [0.28, 0.12], [0.09, 0.27], [-0.15, 0.23], [-0.34, 0.06]],
            plates: [['#38282a', [[-0.37, -0.10], [-0.19, -0.31], [-0.04, -0.22], [-0.12, -0.07], [-0.29, 0.01]]], ['#44302d', [[0, -0.24], [0.15, -0.28], [0.36, -0.13], [0.24, -0.04], [0.07, -0.08]]],
                ['#2f2228', [[0.28, -0.03], [0.39, 0.04], [0.24, 0.21], [0.10, 0.13], [0.12, -0.01]]], ['#3c2827', [[0.08, 0.15], [0.23, 0.23], [0.06, 0.32], [-0.13, 0.26], [-0.07, 0.15]]],
                ['#342329', [[-0.18, 0.08], [-0.08, 0.20], [-0.25, 0.25], [-0.41, 0.10], [-0.33, 0.01]]]],
            fissures: [[[0.12, 0.02], [0.32, -0.02], [0.50, 0.09], [0.72, 0.06], [0.89, 0.13]], [[0.03, 0.12], [0.12, 0.27], [0.09, 0.42], [0.18, 0.53], [0.16, 0.66]],
                [[-0.12, 0.09], [-0.30, 0.20], [-0.49, 0.15], [-0.65, 0.33], [-0.76, 0.30]], [[-0.17, -0.03], [-0.34, -0.14], [-0.54, -0.11], [-0.71, -0.22], [-0.91, -0.18]],
                [[-0.05, -0.13], [-0.10, -0.29], [-0.27, -0.44], [-0.21, -0.63], [-0.33, -0.78]], [[0.07, -0.11], [0.24, -0.23], [0.32, -0.44], [0.51, -0.53], [0.62, -0.73]], [[0.12, 0.08], [0.30, 0.22], [0.43, 0.41], [0.60, 0.40], [0.70, 0.44]]],
            branches: [[[0.50, 0.09], [0.56, 0.18], [0.65, 0.20]], [[-0.54, -0.11], [-0.56, -0.25], [-0.63, -0.29]]],
            ledges: [[[-0.20, 0.10], [-0.10, 0.16], [0.02, 0.12]], [[0.15, -0.12], [0.23, -0.05], [0.18, 0.02]]] });
        this.QUAKE = Object.freeze({ path: [[0, 0], [0.11, -1], [0.22, 1], [0.34, -1], [0.46, 1], [0.58, 0], [0.7, -1], [0.82, 1], [0.92, 0], [1, 0]],
            branches: [[0.22, 0.34, -1], [0.46, 0.59, 1], [0.70, 0.84, -1]], rows: [1, 2, 2, 3], firstRow: 34, rowGap: 48, branchReach: 7, frontLength: 18, fade: 260 });
    }

    iceSlashStep(g, s) {
        g.globalAlpha = s.alpha * 0.55; g.fillStyle = '#207ea9'; this.S.line(s.x, s.y + 2, s.x2, s.y2 + 2, (px, py) => g.fillRect(px - 1, py, 3, s.w + 1));
        g.globalAlpha = s.alpha * 0.9; g.fillStyle = '#55d3f2'; this.S.line(s.x, s.y, s.x2, s.y2, (px, py) => g.fillRect(px, py, 2, s.w));
        if (s.bright) { g.globalAlpha = s.alpha; g.fillStyle = '#d9fbff'; this.S.line(s.x, s.y, s.x2, s.y2, this.dot(g)); }
    }

    /** 베기 고리에서 그 층의 몫(front면 주인공보다 앞쪽): 머리는 넓고 밝고 꼬리로 갈수록 옅다. */
    iceSlash(g, ring, t, front) {
        const head = this.iceHead(t), tail = Math.max(0, head - Math.PI * 1.5), fade = t < this.ICE.SW ? 1 : Math.max(0, 1 - (t - this.ICE.SW) / 150);
        if (fade <= 0 || head <= 0) return;
        for (let i = 0; i < this.ICE.STEPS; i++) {
            const u = i / this.ICE.STEPS, [x, y] = this.icePos(ring, tail + (head - tail) * u), [x2, y2] = this.icePos(ring, tail + (head - tail) * (i + 1) / this.ICE.STEPS);
            if ((y >= 0) === front) this.iceSlashStep(g, { x, y: y - this.ICE.HIP, x2, y2: y2 - this.ICE.HIP, alpha: fade * (0.2 + 0.8 * u), w: u > 0.9 ? 3 : 2, bright: u > 0.35 });
        }
        g.globalAlpha = 1;
    }

    /** 바닥에 눕혀 퍼지는 서리 윤곽: 그림을 범위의 타원에 맞춰 늘인다. */
    iceOutline(g, ring, t) {
        const k = t - this.ICE.WAVE_AT;
        if (k < 0 || k >= this.ICE.WAVE_MS) return;
        const row = this.deps.STAGE_SKILL_VFX.atlas[this.deps.stageSkillVfx.clipOf(ring.wave).a], wide = ring.A * 2.22 / row.w, high = ring.B * 2.18 / row.h;
        this.deps.stageSkillVfx.stamp(g, ring.wave, k, { x: 0, y: 1, dot: 1, face: 1, scale: wide, flat: high / wide, alpha: 0.58 * Math.min(1, k / 50, Math.max(0, (this.ICE.WAVE_MS - k) / 100)) });
    }

    /** 베기가 지난 자리의 얼음 조각에서 그 층의 몫. */
    iceShards(g, ring, t, front) {
        for (const shard of ring.shards) {
            const age = t - shard.at;
            if (age < 0 || age >= this.ICE.SHARD_MS || (shard.y >= 0) !== front) continue;
            this.deps.stageSkillVfx.stamp(g, ring.shard, age, { x: shard.x, y: shard.y, dot: 1, face: ring.face, alpha: 0.7 * Math.min(1, (this.ICE.SHARD_MS - age) / 90) });
        }
    }

    /** 얼어붙은 고리. @param {{at:object, face:number, radius:number, wave:string, shard:string}} o 건 자리(주인공), 반지름(칸), 서리 윤곽과 얼음 조각 클립 */
    spellIceRing(o) {
        const closureView = this;
        const ring = { A: (o.radius + 0.5) * this.WIDE, B: (o.radius + 0.5) * this.DEEP, face: o.face, wave: o.wave, shard: o.shard };
        ring.shards = Array.from({ length: this.ICE.SHARDS }, (_, i) => {
            const a = (i + 0.4) / this.ICE.SHARDS * this.TAU, [x, y] = this.icePos(ring, a);
            return { x, y, at: this.iceTimeOf(a) + 36 };
        });
        this.S.hang(o.at, { life: this.ICE.LIFE,
            ground(g, t) { closureView.iceOutline(g, ring, t); closureView.iceSlash(g, ring, t, false); closureView.iceShards(g, ring, t, false); },
            top(g, t) { closureView.iceSlash(g, ring, t, true); closureView.iceShards(g, ring, t, true); } });
    }

    // 밝은 색은 불꽃 끝 몇 점만(광과민 규칙). 피해는 게임의 땅 불길 틱(data/skills.js)이 준다.
    zonePlan(o) {
        const A = (o.radius + 0.5) * this.WIDE, B = (o.radius + 0.5) * this.DEEP, r = this.S.random(7717);
        const inside = () => { const a = r() * this.TAU, d = Math.sqrt(r()) * 0.92; return [Math.cos(a) * A * d, Math.sin(a) * B * d]; };
        const flames = Array.from({ length: 36 }, (_, i) => { const [x, y] = inside(); return { x, y, H: (i % 6 ? 10 : 18) + r() * 14, W: (i % 6 ? 3 : 5) + Math.round(r() * 2), ph: r() * this.TAU, sp: 0.8 + r() * 0.6, t0: r() * 220 }; });
        const embers = Array.from({ length: 34 }, () => { const [x, y] = inside(); return { x, y, t0: r() * 900, vy: 34 + r() * 30, vx: (r() - 0.5) * 14, life: 520 + r() * 420 }; });
        return { A, B, C: this.S.ramp('fire'), life: o.life, flames, embers, floor: null };
    }

    /** 그 줄 y가 다각형과 만나는 자리들(왼쪽부터). */
    craterSpans(points, y) {
        const xs = [];
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const a = points[j], b = points[i];
            if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
        }
        return xs.sort((a, b) => a - b);
    }

    /** 다각형을 도트 줄로 채운다: 부드러운 타원이나 겹치는 선 없이 딱딱한 도트로. */
    craterPolygon(g, points, color, alpha) {
        g.fillStyle = color; g.globalAlpha = alpha;
        const low = Math.floor(Math.min(...points.map(p => p[1]))), high = Math.ceil(Math.max(...points.map(p => p[1])));
        for (let y = low; y < high; y++) {
            const xs = this.craterSpans(points, y + 0.5);
            for (let i = 0; i + 1 < xs.length; i += 2) { const x = Math.ceil(xs[i]), end = Math.ceil(xs[i + 1]); if (end > x) g.fillRect(x, y, end - x, 1); }
        }
    }

    /** 굵기가 줄어드는 띠. o: near, far 양 끝 굵기, color, alpha, reach 그어진 몫, lift 아래로 민 도트. */
    craterRibbon(g, points, o) {
        const n = points.length - 1, reach = o.reach ?? 1, lift = o.lift || 0;
        for (let i = 0; i < n && i / n < reach; i++) {
            const u = i / n, a = points[i], b = points[i + 1], q = Math.min(1, (reach - u) * n), ex = a[0] + (b[0] - a[0]) * q, ey = a[1] + (b[1] - a[1]) * q;
            const length = Math.hypot(ex - a[0], ey - a[1]) || 1, nx = -(ey - a[1]) / length, ny = (ex - a[0]) / length;
            const wa = (o.near + (o.far - o.near) * u) / 2, wb = (o.near + (o.far - o.near) * (u + q / n)) / 2;
            this.craterPolygon(g, [[a[0] + nx * wa, a[1] + ny * wa + lift], [ex + nx * wb, ey + ny * wb + lift], [ex - nx * wb, ey - ny * wb + lift], [a[0] - nx * wa, a[1] - ny * wa + lift]], o.color, o.alpha);
        }
    }

    /** 크레이터 한 장: open은 틈이 벌어진 몫, e는 진하기. */
    craterPaint(g, z, open, e) {
        const map = points => points.map(p => [p[0] * z.A, p[1] * z.B]);
        this.craterPolygon(g, map(this.CRATER.core), '#160f15', 0.67 * e);
        for (const [color, points] of this.CRATER.plates) this.craterPolygon(g, map(points), color, 0.65 * e);
        for (const path of this.CRATER.fissures.map(map)) {
            this.craterRibbon(g, path, { near: 6.9, far: 2, color: '#4a2c25', alpha: 0.24 * e, reach: open, lift: 1 });
            this.craterRibbon(g, path, { near: 5.2, far: 1, color: '#100b10', alpha: 0.88 * e, reach: open });
            this.craterRibbon(g, path, { near: 1.25, far: 0.25, color: '#bc4d20', alpha: 0.32 * e, reach: Math.min(open, 0.67), lift: 0.4 });
        }
        for (const path of this.CRATER.branches.map(map)) this.craterRibbon(g, path, { near: 2, far: 0.65, color: '#100b10', alpha: 0.67 * e, reach: open });
        this.craterRibbon(g, map(this.CRATER.ledges[0]), { near: 2, far: 1, color: '#d37530', alpha: 0.23 * e });
        this.craterRibbon(g, map(this.CRATER.ledges[1]), { near: 1.6, far: 0.8, color: '#9c4926', alpha: 0.21 * e });
        g.globalAlpha = 1;
    }

    /** 다 벌어진 크레이터를 한 장으로 그려 둔다: 지대가 도는 내내 도트 줄을 다시 채우지 않게. */
    craterSheet(z) {
        if (z.floor) return z.floor;
        const canvas = this.deps.document.createElement('canvas'), x = Math.ceil(z.A) + 6, y = Math.ceil(z.B) + 6;
        canvas.width = x * 2; canvas.height = y * 2;
        const g = canvas.getContext('2d');
        g.translate(x, y);
        this.craterPaint(g, z, 1, 1);
        z.floor = { canvas, x, y };
        return z.floor;
    }

    zoneFloor(g, z, t, e) {
        if (t < this.CRATER.openMs) { this.craterPaint(g, z, t / this.CRATER.openMs, e); return; }
        const sheet = this.craterSheet(z);
        g.globalAlpha = e;
        g.imageSmoothingEnabled = false;
        g.drawImage(sheet.canvas, -sheet.x, -sheet.y);
        g.globalAlpha = 1;
    }

    /** 불꽃 혀 하나: 아래는 짙고 위로 갈수록 밝고 가늘어지며 끝이 흔들린다. */
    zoneFlame(g, z, fl, o) {
        const k = o.t - fl.t0;
        if (k < 0) return;
        const H = Math.round(fl.H * Math.min(1, k / 160) * o.e * (0.75 + 0.25 * Math.sin(o.t / 70 * fl.sp + fl.ph)) * (0.85 + 0.15 * Math.sin(o.t / 23 + fl.ph * 2)));
        const x0 = Math.round(fl.x), y0 = Math.round(fl.y), sway = Math.sin(o.t / 110 + fl.ph);
        for (let j = 0; j < H && H >= 2; j++) {
            const v = j / H, hw = Math.max(0, Math.round(fl.W / 2 * (1 - v * v))), cx = x0 + Math.round(sway * v * v * 2.5);
            g.globalAlpha = Math.min(1, o.e * 1.1) * (v > 0.8 ? 0.75 : 0.92); g.fillStyle = v < 0.35 ? z.C[2] : v < 0.7 ? z.C[3] : z.C[4]; g.fillRect(cx - hw, y0 - j, hw * 2 + 1, 1);
            if (v < 0.3 && hw > 0) { g.fillStyle = z.C[3]; g.fillRect(cx, y0 - j, 1, 1); }
        }
    }

    /** 떠오르는 불티 하나(되풀이된다). */
    zoneEmber(g, z, em, o) {
        const k = (o.t - em.t0) % (em.life + 400);
        if (o.t < em.t0 || k > em.life) return;
        const s2 = k / 1000;
        g.globalAlpha = o.e * (1 - k / em.life); g.fillStyle = k < em.life * 0.4 ? z.C[4] : z.C[3];
        g.fillRect(Math.round(em.x + em.vx * s2 + Math.sin(k / 90) * 2), Math.round(em.y - 6 - em.vy * s2), 1, k < 120 ? 2 : 1);
    }

    /** 불꽃과 불티 가운데 그 층의 몫(front면 지대 가운데보다 앞쪽). */
    zoneFire(g, z, t, front) {
        const e = this.zoneEnvelope(z, t);
        if (e <= 0) return;
        for (const fl of z.flames) if ((fl.y >= 0) === front) this.zoneFlame(g, z, fl, { t, e });
        for (const em of z.embers) if ((em.y >= 0) === front) this.zoneEmber(g, z, em, { t, e });
        g.globalAlpha = 1;
    }

    /** 유성 낙화의 불타는 지대. @param {{at:object, radius:number, delay:number, life:number}} o 지대 가운데, 반지름(칸), 늦춤(ms), 보이는 시간(ms) */
    spellFireZone(o) {
        const closureView = this;
        const z = this.zonePlan(o);
        this.S.hang(o.at, { life: o.life, delay: o.delay,
            ground(g, t) { const e = closureView.zoneEnvelope(z, t); if (e > 0) closureView.zoneFloor(g, z, t, e); closureView.zoneFire(g, z, t, false); g.globalAlpha = 1; },
            top(g, t) { closureView.zoneFire(g, z, t, true); } });
    }

    /** 금 위의 도트들을 앞에서부터 reach까지 찍는다. */
    quakeTrace(points, reach, plot) {
        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1], b = points[i];
            if (a[0] > reach) return;
            const u = Math.max(0, Math.min(1, (reach - a[0]) / ((b[0] - a[0]) || 1)));
            this.S.line(a[0], a[1], a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, plot);
        }
    }

    quakeSeamPlan(Lp) {
        const path = this.QUAKE.path.map(p => [p[0] * Lp, p[1]]);
        const heightAt = x => { for (let i = 1; i < path.length; i++) if (x <= path[i][0]) { const a = path[i - 1], b = path[i]; return a[1] + (b[1] - a[1]) * (x - a[0]) / ((b[0] - a[0]) || 1); } return 0; };
        const branches = this.QUAKE.branches.map(([from, to, side]) => { const a = from * Lp, b = to * Lp, y = heightAt(a); return [[a, y], [a + (b - a) * 0.55, y + side * this.QUAKE.branchReach * 0.35], [b, y + side * this.QUAKE.branchReach]]; });
        return { path, branches };
    }

    /** 바닥의 금: 겹치는 도트가 없게 한 번씩만 찍어 알파가 점으로 뭉치지 않는다. */
    quakeSeam(g, plan, o) {
        const C = o.C, face = o.face, set = (colour, alpha, cells) => { g.fillStyle = colour; g.globalAlpha = alpha; for (const key of cells) { const [x, y] = key.split(',').map(Number); g.fillRect(Math.round(face * x), Math.round(y + o.lane), 1, 1); } };
        const core = new Set(), frost = new Set(), twig = new Set(), bright = new Set();
        this.quakeTrace(plan.path, o.reach, (x, y) => { core.add(x + ',' + y); for (let q = -2; q <= 2; q++) if (q) frost.add(x + ',' + (y + q)); if (x >= o.reach - this.QUAKE.frontLength) bright.add(x + ',' + y); });
        for (const points of plan.branches) if (points[0][0] <= o.reach) this.quakeTrace(points, o.reach, (x, y) => { twig.add(x + ',' + y); frost.add(x + ',' + (y - 1)); frost.add(x + ',' + (y + 1)); });
        set(C[3], 0.10 * o.fade, frost); set(C[1], 0.32 * o.fade, twig); set(C[1], 0.48 * o.fade, core); set(C[4], 0.25 * o.fade * o.front, bright);
        g.globalAlpha = 1;
    }

    /** 쐐기를 따라 줄마다 결정과 가시. @returns {number} 마지막이 끝나는 때(ms) */
    quakeRows(o, Lp, r) {
        const V = o.clips, half = x => (o.rows ? (o.rows + 0.5) : 0.5 + Math.min(1, x / Lp) * (o.L / 2 - 0.5)) * this.DEEP;
        let last = 0;
        for (let x = this.QUAKE.firstRow, row = 0; x <= Lp - 14; x += this.QUAKE.rowGap, row++) {
            const count = this.QUAKE.rows[Math.min(row, this.QUAKE.rows.length - 1)];
            for (let i = 0; i < count; i++) {
                const k = count === 1 ? 0 : i / (count - 1) * 2 - 1, dx = x + (r() - 0.5) * 14, dy = k * half(x) * 0.78 + (r() - 0.5) * 6, big = (row + i) % 2 === 0, delay = dx / this.WIDE * o.rowMs + r() * 20 + 30;
                const ref = big ? V.crystal : V.spike;
                this.deps.stageSkillVfx.play(ref, { ...o.at, dx: o.face * dx, dy }, { delay, scale: big ? 0.6 + r() * 0.25 : 1.3 + r() * 0.5, alpha: 0.95, face: r() < 0.5 ? o.face : -o.face, layer: dy < 0 ? 'ground' : 'top' });
                last = Math.max(last, delay + this.deps.stageSkillVfx.clipLength(ref));
            }
        }
        return last;
    }

    /** 혹한의 지진의 둘째 단계. rows: 옆으로 치는 띠의 위아래 줄 수(줄마다 바닥의 금이 간다). @param {{at:object, face:number, L:number, rowMs:number, rows?:number, clips:object}} o */
    spellFrostQuake(o) {
        const closureView = this;
        const V = o.clips, Lp = o.L * this.WIDE, r = this.S.random(8117), C = this.S.ramp('frost'), plan = this.quakeSeamPlan(Lp);
        this.deps.stageSkillVfx.play(V.burst, { ...o.at, dx: o.face * 8 }, { face: o.face, alpha: 0.95 });
        this.deps.stageSkillVfx.play(V.shards, { ...o.at, dx: o.face * 14, dy: -2 }, { face: o.face, alpha: 0.85, delay: 40 });
        this.deps.stageSkillVfx.play(V.wave, { ...o.at, dx: o.face * 6, dy: -6 }, { face: o.face, alpha: 0.9, delay: 20, scale: Lp / 220, layer: 'ground' });
        const last = Math.max(600, this.quakeRows(o, Lp, r)) + 80, lanes = Array.from({ length: (o.rows || 0) * 2 + 1 }, (_, i) => (i - (o.rows || 0)) * this.DEEP * 0.9), frontEnd = Math.max(0, (Lp - 20) / this.WIDE * o.rowMs);
        for (let i = 0; i < 5; i++) {
            const x = 30 + r() * (Lp - 40);
            this.deps.stageSkillVfx.play(V.flake, { ...o.at, dx: o.face * x, dy: (r() - 0.5) * 2 * (0.5 + x / Lp * (o.L / 2 - 0.5)) * this.DEEP * 0.8 - 24 - r() * 30 }, { face: o.face, delay: 120 + r() * 420, alpha: 0.9, scale: 0.8 + r() * 0.5 });
        }
        this.S.hang(o.at, { life: last + 60, ground(g, t) {
            const reach = Math.max(0, Math.min(Lp, (t / o.rowMs) * closureView.WIDE + 20)), fade = Math.max(0, Math.min(1, (last - t) / closureView.QUAKE.fade)), front = Math.max(0, 1 - Math.max(0, t - frontEnd) / 100);
            for (const lane of lanes) closureView.quakeSeam(g, plan, { C, face: o.face, reach, fade, front, lane });
        } });
    }

    /** 맞은 적 발밑의 얼음 더미와 몸의 얼음 터짐(피해와 같은 때). @param {{at:object, delay:number, clips:object, seed:number}} o */
    spellFrostErupt(o) {
        const r = this.S.random(9311 + o.seed), V = o.clips;
        this.deps.stageSkillVfx.play(V.erupt, { ...o.at, dy: 1 }, { delay: Math.max(0, o.delay - 40), scale: 1.5 + r() * 0.3 });
        if (V.hit) this.deps.stageSkillVfx.play(V.hit, { ...o.at, dy: -30 }, { delay: o.delay, alpha: 0.9 });
    }

    /** 불씨의 함성의 클립: 둘레 여섯 곳의 폭발과 바닥 일곱 곳의 작은 불길. */
    emberClips(o, A, B, spread) {
        const clips = o.clips || {};
        if (clips.blast) for (let i = 0; i < 6; i++) {
            const a = i / 6 * this.TAU + 0.3, k = 0.72;
            this.deps.stageSkillVfx.play(clips.blast, { ...o.at, dx: Math.cos(a) * A * k, dy: Math.sin(a) * B * k - 22 }, { face: Math.cos(a) < 0 ? -1 : 1, delay: 60 + spread * k + (i % 2) * 40, scale: 0.55, alpha: 0.85 });
        }
        if (clips.flame) for (let i = 0; i < 7; i++) {
            const a = i / 7 * this.TAU + 0.9, k = i === 0 ? 0.2 : 0.45 + (i % 3) * 0.17, d = 140 + spread * k;
            this.deps.stageSkillVfx.play(clips.flame, { ...o.at, dx: Math.cos(a) * A * k, dy: Math.sin(a) * B * k }, { face: i % 2 ? 1 : -1, delay: d, life: Math.max(300, o.total - d), scale: 0.4 + (i % 3) * 0.08, alpha: 0.85, layer: 'ground' });
        }
    }

    emberGround(g, e, t) {
        const front = Math.min(1, t / e.spread), end = Math.min(1, Math.max(0, 1 - (t - e.total) / 200)), C = e.C;
        g.globalAlpha = 0.2 * end * front; g.fillStyle = '#3a2a22'; g.beginPath(); g.ellipse(0, 0, e.A * front, e.B * front, 0, 0, this.TAU); g.fill();   // 그을린 바닥
        for (const [ux, uy, ph] of e.specks) {
            if (Math.hypot(ux, uy) > front) continue;
            const q = (Math.sin(t / 70 + ph * 3) + 1) / 2;
            g.globalAlpha = end * (0.2 + 0.45 * q); g.fillStyle = q > 0.7 ? C[4] : C[3]; g.fillRect(Math.round(ux * e.A * 0.95), Math.round(uy * e.B * 0.95), 2, 1);
        }
        if (t < e.spread + 160) {   // 퍼지는 불씨 앞면
            const fa = t < e.spread ? 1 : 1 - (t - e.spread) / 160, rj = this.S.random(11 + Math.floor(t / 40));
            for (let i = 0; i < 90; i++) { const a = i / 90 * this.TAU, j = 1 + (rj() - 0.5) * 0.08; g.globalAlpha = fa * 0.75; g.fillStyle = i % 3 ? C[4] : C[3]; g.fillRect(Math.round(Math.cos(a) * e.A * front * j), Math.round(Math.sin(a) * e.B * front * j), 2, 2); }
        }
        g.globalAlpha = 1;
    }

    /** 외침 호: 머리 좌우로 커지며 퍼지는 불빛 호 세 겹(sides 1이면 앞으로만, 서리바람). */
    shoutArcs(g, t, o) {
        for (let i = 0; i < o.count; i++) {
            const k = (t - i * o.gap) / o.ms;
            if (k < 0 || k > 1) continue;
            const R = o.r0 + o.grow * k;
            g.globalAlpha = (1 - k) * o.alpha; g.fillStyle = i ? o.C[3] : o.C[4];
            for (const side of o.sides) for (let a = -o.span; a <= o.span; a += o.step) g.fillRect(Math.round(o.x + side * Math.cos(a) * R), Math.round(o.y + Math.sin(a) * R * o.squash), 2, 2);
        }
        g.globalAlpha = 1;
    }

    /** 불씨의 함성: 머리 좌우로 퍼지는 외침 호, 발밑에서 타원으로 퍼지는 불씨 앞면과 그을린 바닥, 둘레의 폭발, 타는 바닥.
     * @param {{at:object, radius:number, wave:number, total:number, clips:object}} o */
    spellEmberShout(o) {
        const A = (o.radius + 0.5) * this.WIDE, B = (o.radius + 0.5) * this.DEEP, spread = (o.radius + 0.5) * o.wave, r = this.S.random(5150);
        const e = { C: this.S.ramp('fire'), A, B, spread, total: o.total, specks: [...Array(70)].map(() => { const a = r() * this.TAU, d = Math.sqrt(r()); return [Math.cos(a) * d, Math.sin(a) * d, r() * this.TAU]; }) };
        this.emberClips(o, A, B, spread);
        this.S.hang(o.at, { life: o.total + 200, ground: (g, t) => this.emberGround(g, e, t),
            top: (g, t) => this.shoutArcs(g, t, { C: e.C, count: 3, gap: 70, ms: 300, r0: 10, grow: 34, alpha: 0.85, sides: [-1, 1], span: 0.7, step: 0.06, x: 0, y: -58, squash: 0.9 }) });
    }

    frostGround(g, c, t) {
        const front = c.Lp * Math.min(1, t / c.dur), end = t > c.dur + 260 ? Math.max(0, 1 - (t - c.dur - 260) / 420) : 1, C = c.C;
        for (const [u, k, ph] of c.frost) {
            const x = 12 + u * (c.Lp - 12);
            if (x > front) continue;
            g.globalAlpha = end * 0.5 * (0.5 + 0.5 * ph); g.fillStyle = ph > 0.65 ? C[5] : C[3]; g.fillRect(Math.round(c.face * x), Math.round(k * c.hd(x) * 0.95), ph > 0.82 ? 2 : 1, 1);
        }
        if (t < c.dur + 140) {   // 서리 앞면
            const fa = t < c.dur ? 1 : 1 - (t - c.dur) / 140, h = c.hd(front);
            for (let y = -h; y <= h; y += 2) { const q = (Math.sin(y * 0.9 + t / 30) + 1) / 2; g.globalAlpha = fa * (0.4 + 0.4 * q); g.fillStyle = q > 0.6 ? C[5] : C[4]; g.fillRect(Math.round(c.face * (front - q * 4)), Math.round(y), 2, 2); }
        }
        g.globalAlpha = 1;
    }

    /** 입 높이에서 나와 바닥 위 부채꼴로 퍼지는 자리(앞으로 x만큼 갔을 때). */
    frostY(c, x, k, lift) { const u = Math.min(1, x / 70), gy = k * c.hd(x) * 0.92 - lift; return -58 + (gy + 58) * (1 - (1 - u) * (1 - u)); }

    frostStreaks(g, c, t, end) {
        for (const st of c.streaks) {
            const x = (t - st.t0) * (c.Lp / c.dur) * st.sp;
            if (x < 0 || x - st.len > c.Lp) continue;
            for (let j = 0; j < st.len; j++) {
                const xx = x - j;
                if (xx < 0 || xx > c.Lp) continue;
                g.globalAlpha = end * 0.85 * (1 - j / st.len) * Math.min(1, (c.Lp - xx) / 40 + 0.2); g.fillStyle = j < 4 ? c.C[5] : c.C[3];
                g.fillRect(Math.round(c.face * (12 + xx)), Math.round(this.frostY(c, xx, st.k, st.lift)), 1, j < 6 ? 2 : 1);
            }
        }
    }

    frostTop(g, c, t) {
        const end = t > c.dur + 260 ? Math.max(0, 1 - (t - c.dur - 260) / 420) : 1;
        this.shoutArcs(g, t, { C: c.C, count: 2, gap: 80, ms: 260, r0: 8, grow: 22, alpha: 0.8, sides: [c.face], span: 0.8, step: 0.08, x: c.face * 12, y: -58, squash: 1 });
        this.frostStreaks(g, c, t, end);
        for (const sn of c.snow) {   // 눈송이
            const x = (t - sn.t0) * (c.Lp / c.dur) * sn.sp;
            if (x < 0 || x > c.Lp) continue;
            g.globalAlpha = end * 0.85 * Math.min(1, (c.Lp - x) / 50); g.fillStyle = sn.sz > 1 ? c.C[5] : c.C[4];
            g.fillRect(Math.round(c.face * (12 + x)), Math.round(this.frostY(c, x, sn.k, sn.lift) + Math.sin(t / 90 + sn.ph) * 3), sn.sz, sn.sz);
        }
        g.globalAlpha = 1;
    }

    /** 서리바람 내지르기: 입에서 앞으로 내지른 바람 줄기와 눈송이가 부채꼴을 따라 퍼지고, 바닥에는 서리 앞면이 나아가며 지나간 자리에 서리가
     * 끼었다 녹는다. 연기 물결 두 줄(smwave)이 따라간다. o.rows(옆으로 치는 띠의 위아래 줄 수, 2026-10-17)가 있으면 몸 앞에서 이미 그 줄들의
     * 가운데까지 덮고 반 칸 안에 다 퍼져 끝까지 같은 폭으로 나아가며, 연기 물결도 그 줄들로 벌어진다.
     * @param {{at:object, face:number, L:number, wave:number, smwave:?string, rows?:number}} o */
    spellFrostCone(o) {
        const Lp = o.L * this.WIDE, dur = o.L * o.wave, r = this.S.random(6203), rows = o.rows || 0;
        const hd = rows ? x => (0.5 + Math.min(1, Math.max(0, (x + this.WIDE / 2) / this.WIDE)) * rows) * this.DEEP : x => (0.5 + Math.min(1, Math.max(0, x / Lp)) * (o.L / 2 - 0.5)) * this.DEEP;
        const c = { C: this.S.ramp('frost'), face: o.face, Lp, dur, hd,
            streaks: [...Array(22)].map((_, i) => ({ k: i / 21 * 2 - 1, t0: r() * dur * 0.45, len: 14 + r() * 16, sp: 1.1 + r() * 0.35, lift: 8 + r() * 30 })),
            snow: [...Array(34)].map(() => ({ k: r() * 2 - 1, t0: r() * dur * 0.7, sp: 0.6 + r() * 0.45, lift: 4 + r() * 44, ph: r() * this.TAU, sz: r() < 0.3 ? 2 : 1 })),
            frost: [...Array(90)].map(() => [r(), r() * 2 - 1, r()]) };
        const spread = rows ? 2 : 1;
        if (o.smwave) [[-0.25, 0], [0.3, 70]].forEach(([k, delay]) => this.deps.stageSkillVfx.play(o.smwave, { ...o.at, dx: o.face * 50, dy: -24 + k * this.DEEP },
            { face: o.face, delay, alpha: 0.75, move: { dx: o.face * (Lp * 0.8 - 50), dy: k * spread * this.DEEP * 2, ms: dur + 160 } }));
        this.S.hang(o.at, { life: dur + 700, ground: (g, t) => this.frostGround(g, c, t), top: (g, t) => this.frostTop(g, c, t) });
    }

    /** 전도성 난격이 마지막으로 벤 자리의 바닥 방전: 바닥을 따라 여섯 갈래로 기는 짧은 번개와 가운데 작은 빛. delay 뒤에 일어난다. */
    spellDischarge(at, delay) {
        const closureView = this;
        const C = this.S.ramp('light');
        this.S.hang(at, { life: 320, delay, ground(g, t) {
            const fade = Math.max(0, 1 - t / 320), r = closureView.S.random(77 + Math.floor(t / 50));
            for (let i = 0; i < 6; i++) {
                const a = i / 6 * closureView.TAU + 0.4;
                let x = 0, y = 0;
                g.globalAlpha = fade * 0.9; g.fillStyle = i % 2 ? C[3] : C[4];
                for (let s = 0; s < 4; s++) { const x2 = x + Math.cos(a) * 11 + (r() - 0.5) * 8, y2 = y + Math.sin(a) * 5.5 + (r() - 0.5) * 4; closureView.S.line(x, y, x2, y2, closureView.dot(g)); x = x2; y = y2; }
            }
            g.globalAlpha = fade * 0.6; g.fillStyle = C[4]; g.fillRect(-3, -1, 7, 3); g.globalAlpha = 1;
        } });
    }
}

export function createStageElementalSpells(deps) {
    const instance = new StageElementalSpells(deps);
    return Object.freeze({ iceRing: instance.spellIceRing.bind(instance), frostQuake: instance.spellFrostQuake.bind(instance), frostErupt: instance.spellFrostErupt.bind(instance), emberShout: instance.spellEmberShout.bind(instance), frostCone: instance.spellFrostCone.bind(instance), discharge: instance.spellDischarge.bind(instance), fireZone: instance.spellFireZone.bind(instance) });
}
