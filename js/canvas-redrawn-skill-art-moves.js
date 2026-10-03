/** 새로 그린 이동기 4종(54 차원찢기 · 55 향로구름 · 56 작살화살 · 57 공중강타)과 위습 정령 소환 공격 6종 (Hana 스킬 인계 변경분 2).
 * Ported from the handoff's void_fx.js (docs/skill-assets-hana/reference/void_fx.js.txt) like js/canvas-redrawn-skill-art.js;
 * scripts/smoke-redrawn-skill-art.js compares every dot. Board dots (one cell = 16 dots); pure drawing, no timers.
 */
const redrawnSkillArtMoves = (() => {
    const A = redrawnSkillArt;
    const { rng, layer, jag, stroke } = A.lib;
    const { puffBounds, puffField } = redrawnSkillArtExtra.lib;
    const C = { D: '#352c4d', M: '#8151a8', L: '#d093ee', H: '#fae4ff', W: '#ffffff' };
    const F = { D: '#263b59', M: '#378cb9', L: '#81ddef', H: '#ecfffb', W: '#ffffff' };
    const Y = { D: '#4b3e39', M: '#c18b3a', L: '#ffd35a', H: '#fffbc9', W: '#ffffff' };
    const R = { D: '#572c31', M: '#c14936', L: '#ff963e', H: '#fff1b8', W: '#ffffff' };
    const PLUS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const DIAG = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
    const TAU = Math.PI * 2;

    // ---------------------------------------------------------------- 위습 정령 공격 6종 (소환 젬): t = 0 when the wisp's strike frame fires
    // W = the wisp, T = the target. fire: lobbed fireball → burst; cold: ice shard thrown straight → shatter; light: bolts,
    // the target crackles; phys: a crack runs to the target, roots burst up and wrap it; chaos: lobbed void orb → mist left
    // on the floor (ground layer); spectral: a beam braided from fire / cold / lightning strands → tri-colour sparks.
    const WOODC = { K: '#4d3817', D: '#703f25', M: '#8c5222', L: '#b6854c', H: '#e0af4a' };
    const WISP_PAL = { fire: R, cold: F, light: Y, chaos: C };
    const WISP_TAIL = { fire: 460, cold: 260, light: 520, phys: 720, chaos: 760, spectral: 520 };
    function wispFlight(el, d) {
        if (el === 'fire' || el === 'chaos') return 260 + d * 2;
        if (el === 'cold') return 110 + d * 2;
        return el === 'phys' ? 90 + d * 3 : 0;
    }
    /** Flight time + how long the whole attack lasts. */
    function wispTiming(el, W, T) {
        const d = Math.hypot(T.x - W.x, T.y - W.y), fly = wispFlight(el, d);
        return { d, fly, end: fly + (WISP_TAIL[el] || 400) };
    }
    function lobAt(W, T, u, h) { return { x: W.x + (T.x - W.x) * u, y: W.y + (T.y - W.y) * u - 4 * h * u * (1 - u) }; }
    function orbFlight(put, s, age) {
        const P = WISP_PAL[s.el], h = 8 + s.d * .22, u = age / s.fly, p = lobAt(s.W, s.T, u, h);
        for (const [de, c, pr] of [[.1, P.M, 2], [.06, P.L, 3], [.03, s.el === 'fire' ? P.H : P.L, 3]]) {
            const q = lobAt(s.W, s.T, Math.max(0, u - de), h);
            put(Math.round(q.x), Math.round(q.y), c, pr);
        }
        const X = Math.round(p.x), Y0 = Math.round(p.y), core = s.el === 'fire' ? [P.W, P.H, P.L] : [P.D, P.M, P.L];
        put(X, Y0, core[0], 5);
        for (const [ox, oy] of PLUS) put(X + ox, Y0 + oy, core[1], 4);
        for (const [ox, oy] of DIAG) put(X + ox, Y0 + oy, core[2], 3);
        if (s.el === 'chaos' && Math.floor(age / 70) % 2 === 0) put(X - Math.sign(s.dir.x || 1) * 2, Y0 + 2, P.M, 2);
    }
    function hitDiamond(put, TX, TY, col) {
        for (let yy = -3; yy <= 3; yy++) for (let xx = -3; xx <= 3; xx++) if (Math.abs(xx) + Math.abs(yy) <= 3) put(TX + xx, TY + yy, col, 5);
    }
    function fireHit(dot, lay, s, hitAge) {
        const P = R, TX = s.TX, TY = s.TY;
        if (hitAge < 60) hitDiamond(lay.put, TX, TY, hitAge < 30 ? P.W : P.H);
        lay.flush(dot);
        A.DragonSweep.flame(dot, TX, TY + 5, hitAge, { life: 440, big: 1, seed: 3 });
        A.DragonSweep.flame(dot, TX - 5, TY + 6, hitAge - 40, { life: 300, big: 0, seed: 5 });
        A.DragonSweep.flame(dot, TX + 5, TY + 6, hitAge - 70, { life: 280, big: 0, seed: 7 });
        const rs = rng(29);
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (i - 2) * .55 + (rs() - .5) * .3, t = hitAge / 1000, sp = 60 + rs() * 30;
            if (hitAge > 260) break;
            dot(Math.round(TX + Math.cos(a) * sp * t), Math.round(TY + Math.sin(a) * sp * t + 160 * t * t), hitAge < 130 ? P.H : P.L);
        }
    }
    /** Chaos: a small implosion ring at the landing (the mist is on the ground layer). */
    function chaosHit(put, s, hitAge) {
        const P = C;
        if (hitAge < 180) {
            const u = hitAge / 180, rr = 7 - 5 * u, c = u < .4 ? P.L : P.M;
            for (let k = 0; k < 20; k++) { const a = k / 20 * TAU; put(Math.round(s.TX + Math.cos(a) * rr), Math.round(s.TY + Math.sin(a) * rr * .8), c, 3); }
        }
        if (hitAge < 70) { put(s.TX, s.TY, P.H, 5); for (const [ox, oy] of PLUS) put(s.TX + ox, s.TY + oy, P.L, 4); }
    }
    /** fire / chaos: lobbed orb. Returns true when it already painted everything (the fire burst). */
    function lobbedOrb(dot, lay, s, age) {
        if (age < s.fly) { orbFlight(lay.put, s, age); return false; }
        if (s.el === 'fire') { fireHit(dot, lay, s, age - s.fly); return true; }
        chaosHit(lay.put, s, age - s.fly);
        return false;
    }
    function shardRow(put, s, at, k) {
        const w = k >= 2 ? 0 : k <= -3 ? 0 : 1, c = k === 3 ? F.W : k >= 1 ? F.H : k >= -1 ? F.L : F.M;
        for (let q = -w; q <= w; q++) put(Math.round(at.x + s.dir.x * k + s.n.x * q), Math.round(at.y + s.dir.y * k + s.n.y * q), q ? F.M : c, 4);
    }
    function shardFlight(put, s, age) {
        const u = age / s.fly, at = { x: s.W.x + (s.T.x - s.W.x) * u, y: s.W.y + (s.T.y - s.W.y) * u };
        for (let k = -4; k <= 3; k++) shardRow(put, s, at, k);
        for (const de of [7, 10]) put(Math.round(at.x - s.dir.x * de), Math.round(at.y - s.dir.y * de), de === 7 ? F.L : F.M, 2);
    }
    function shardHit(dot, lay, s, hitAge) {
        if (hitAge < 170) for (let i = 0; i < 6; i++) {
            const a = i / 6 * TAU + .3, r0 = 2 + hitAge / 170 * 7;
            lay.put(Math.round(s.TX + Math.cos(a) * r0), Math.round(s.TY + Math.sin(a) * r0), hitAge < 80 ? F.H : F.L, 3);
            lay.put(Math.round(s.TX + Math.cos(a) * (r0 - 1)), Math.round(s.TY + Math.sin(a) * (r0 - 1)), F.M, 2);
        }
        lay.flush(dot);
        A.FrostRing.flake(dot, s.TX, s.TY, hitAge * 200 / 260);
    }
    /** cold: ice shard thrown straight. Returns true when it already painted everything. */
    function coldShard(dot, lay, s, age) {
        if (age < s.fly) { shardFlight(lay.put, s, age); return false; }
        shardHit(dot, lay, s, age - s.fly);
        return true;
    }
    function crackleSpots(put, s, age) {
        const v = Math.floor(age / 60) % 3, spots = [[[3, -4], [-4, 1], [1, 4]], [[-3, -3], [4, 2], [-1, 5]], [[4, -1], [-3, 3], [0, -5]]][v];
        for (const [ox, oy] of spots) for (const [gx, gy] of [[0, 0], [1, 1], [0, 2]]) put(s.TX + ox + gx, s.TY + oy + gy, age < 300 ? Y.H : Y.L, 4);
        if (age < 120) { put(s.TX, s.TY, Y.W, 5); for (const [ox, oy] of PLUS) put(s.TX + ox, s.TY + oy, Y.H, 4); }
    }
    /** light: flickering bolts wisp → target, then the target crackles (electrocuted). */
    function electrocute(put, s, age) {
        if (age < 280) {
            const v = Math.floor(age / 50), u = age / 280, cols = u < .35 ? [Y.W, Y.H, Y.L] : u < .7 ? [Y.H, Y.L] : [Y.L, Y.M];
            for (let k = 0; k < 2; k++) {
                const r = rng(8800 + v * 17 + k * 5), from = { x: s.W.x + s.dir.x * 4, y: s.W.y + s.dir.y * 4 };
                stroke(put, jag(from, { x: s.T.x, y: s.T.y }, { rough: .45, minSeg: 2, r, cap: 2.6 }), 1e9, k ? [cols[1], cols[1]] : cols, k ? 0 : (u < .35 ? 1 : 0));
            }
        }
        if (age < 520 && age >= 40) crackleSpots(put, s, age);
    }
    /** A crack running through the ground to the target. */
    function rootCrack(put, s, age) {
        const u = Math.min(1, age / s.fly), fade = age > s.fly ? (age - s.fly) / 120 : 0, L = Math.round(s.d * u);
        for (let k = 3; k <= L; k++) {
            if (fade && ((k * 7) % 10) / 10 < fade) continue;
            const w = Math.sin(k * .7) * 1.1;
            put(Math.round(s.W.x + s.dir.x * k + s.n.x * w), Math.round(s.W.y + 6 + s.dir.y * k + s.n.y * w), k > L - 2 ? WOODC.L : WOODC.D, 1);
        }
    }
    function rootCurl(put, s, root, i) {
        const [bx, by] = root, TX = s.TX, TY = s.TY;
        const P0 = { x: TX + bx, y: TY + by }, P2 = { x: TX + (i % 2 ? -2 : 2), y: TY - 5 + i }, P1 = { x: TX + bx * 1.3, y: TY - 3 };
        const steps = 14, upto = Math.floor(steps * s.g);
        for (let k = 0; k <= upto; k++) {
            const t = k / steps, x = (1 - t) * (1 - t) * P0.x + 2 * (1 - t) * t * P1.x + t * t * P2.x, y = (1 - t) * (1 - t) * P0.y + 2 * (1 - t) * t * P1.y + t * t * P2.y;
            put(Math.round(x), Math.round(y), k === upto && s.grow < 1 ? WOODC.H : t < .5 ? WOODC.D : WOODC.M, 3 + (i % 2));
            if (t < .35) put(Math.round(x) + (bx < 0 ? 1 : -1), Math.round(y), WOODC.K, 2);
        }
    }
    /** Roots rise from the ground, curl over the target, hold, then withdraw. */
    function rootBind(put, s, hitAge) {
        const grow = Math.min(1, hitAge / 180), shrink = hitAge >= 540 ? (hitAge - 540) / 180 : 0, c = { ...s, grow, g: grow * (1 - shrink) };
        [[-7, 6], [7, 6], [-4, 7], [5, 7], [0, 8]].forEach((root, i) => rootCurl(put, c, root, i));
        if (hitAge < 90) for (const [ox, oy] of [[-3, 8], [3, 8], [-6, 7], [6, 7]]) put(s.TX + ox, s.TY + oy - Math.floor(hitAge / 30), WOODC.L, 1);
        if (hitAge < 540 && hitAge > 180 && Math.floor(hitAge / 90) % 2 === 0) put(s.TX + 1, s.TY - 1, WOODC.H, 5);
    }
    function physRoots(put, s, age) {
        if (age < s.fly + 120) rootCrack(put, s, age);
        if (age - s.fly >= 0) rootBind(put, s, age - s.fly);
    }
    function braidStrands(put, s, age, at) {
        const thin = age > 320 ? (age - 320) / 120 : 0, cols = [R.L, F.L, Y.L], dark = [R.M, F.M, Y.M];
        put(Math.round(s.W.x + s.dir.x * at), Math.round(s.W.y + s.dir.y * at), thin > .5 ? Y.H : '#ffffff', 5);
        if (thin > .8) return;
        for (let k = 0; k < 3; k++) {
            const ph = at * .45 - age * .02 + k * TAU / 3, off = Math.sin(ph) * 2.4 * (1 - thin), front = Math.cos(ph) > 0;
            put(Math.round(s.W.x + s.dir.x * at + s.n.x * off), Math.round(s.W.y + s.dir.y * at + s.n.y * off), front ? cols[k] : dark[k], front ? 4 : 2);
        }
    }
    /** spectral: a beam braided from fire / cold / lightning strands round a white core, then tri-colour sparks. */
    function spectralBeam(dot, lay, s, age) {
        if (age < 440) {
            const reach = s.d * Math.min(1, age / 80);
            for (let at = 3; at <= reach; at++) braidStrands(lay.put, s, age, at);
            if (age < 90) {
                const X = Math.round(s.W.x + s.dir.x * 3), Y0 = Math.round(s.W.y + s.dir.y * 3);
                lay.put(X, Y0, '#ffffff', 6);
                for (const [ox, oy] of PLUS) lay.put(X + ox, Y0 + oy, Y.H, 5);
            }
        }
        lay.flush(dot);
        if (age >= 80) for (let k = 0; k < 3; k++) A.TriWave.spark(dot, s.TX + (k - 1) * 4, s.TY + (k === 1 ? -3 : 1), age - 80 - k * 60, { el: ['fire', 'cold', 'light'][k], seed: k + 1 });
    }
    /** Paints one attack; returns true when the element's own drawing already flushed everything. */
    function wispStrike(dot, lay, s, age) {
        if (s.el === 'fire' || s.el === 'chaos') return lobbedOrb(dot, lay, s, age);
        if (s.el === 'cold') return coldShard(dot, lay, s, age);
        if (s.el === 'light') electrocute(lay.put, s, age);
        if (s.el === 'phys') physRoots(lay.put, s, age);
        if (s.el === 'spectral') { spectralBeam(dot, lay, s, age); return true; }
        return false;
    }
    function wispAttack(dot, el, W, T, age) {
        const { d, fly, end } = wispTiming(el, W, T);
        if (age < 0 || age >= end) return;
        const dir = { x: (T.x - W.x) / (d || 1), y: (T.y - W.y) / (d || 1) };
        const s = { el, W, T, d, fly, dir, n: { x: -dir.y, y: dir.x }, TX: Math.round(T.x), TY: Math.round(T.y) }, lay = layer();
        if (!wispStrike(dot, lay, s, age)) lay.flush(dot);
    }
    function mistPuffBlob(put, b, i, fade) {
        for (let yy = -6; yy <= 6; yy++) for (let xx = -6; xx <= 6; xx++) {
            const dd = Math.hypot(xx, yy * 1.3);
            if (dd > b.rr) continue;
            if (fade && ((xx * 37 + yy * 11 + i * 5) >>> 0) % 100 < fade * 100) continue;
            put(Math.round(b.cx) + xx, Math.round(b.cy) + yy, dd > b.rr - 1 ? C.M : dd < b.rr * .4 && i % 2 ? C.L : C.M, 1 + (i % 2));
        }
    }
    /** Ground layer (chaos only): mist left where the orb landed. */
    function wispMist(dot, el, W, T, age) {
        if (el !== 'chaos') return;
        const { fly, end } = wispTiming(el, W, T), a = age - fly, life = end - fly;
        if (a < 0 || a >= life) return;
        const lay = layer(), X = Math.round(T.x), Y0 = Math.round(T.y) + 4, rs = rng(515), grow = Math.min(1, a / 200);
        const fade = a > life - 260 ? (a - (life - 260)) / 260 : 0;
        for (let i = 0; i < 6; i++) {
            const ang = i / 6 * TAU + rs() * .6 + a * .0012, r0 = (5 + rs() * 5) * grow;
            const b = { cx: X + Math.cos(ang) * r0, cy: Y0 + Math.sin(ang) * r0 * .6, rr: (3 + rs() * 2.2) * grow * (1 - fade * .6) };
            mistPuffBlob(lay.put, b, i, fade);
        }
        lay.flush(dot);
    }

    // ---------------------------------------------------------------- 이동기 4종 (54 차원찢기 · 55 향로구름 · 56 작살화살 · 57 공중강타)
    const MB = { K: '#1e1b38', D: '#352c4d', M: '#8151a8', L: '#d093ee', H: '#fae4ff', W: '#ffffff' };
    const SM = { D: '#3e444a', M: '#6c757b', L: '#b0aca6', H: '#fff3d3', G: '#f2d380', E: '#ff963e' };
    const RP = { D: '#8c7432', L: '#c18b3a', S: '#7f899d', H: '#c4d5df', W: '#ffffff', B: '#353844' };
    const DU = { D: '#3e444a', M: '#6c757b', L: '#b0aca6', H: '#d4d6d2', W: '#ffffff' };
    const hsh = (x, y, k = 0) => (((x * 73856093) ^ (y * 19349663) ^ (k * 83492791)) >>> 0) % 1000 / 1000;
    function riftLip(put, s, cx, y) {
        const half = Math.round(s.w), jagged = hsh(y, s.x) > .55 ? 1 : 0;
        for (let dx = -half - jagged; dx <= half + (1 - jagged); dx++) {
            const edge = Math.abs(dx) >= half;
            if (edge) put(cx + dx, y, Math.abs(dx) > half ? MB.M : MB.L, 2);
            else put(cx + dx, y, hsh(cx + dx, y, 3) > .9 ? MB.M : hsh(cx + dx, y, 4) > .7 ? MB.D : MB.K, 1);
        }
    }
    function riftRow(put, s, y) {
        const t = (y - s.top) / 22, cx = s.x + Math.round(Math.sin(t * 2.6 + 1) * 1.2), w = s.W * Math.sin(Math.PI * t);
        if (w < .6) { put(cx, y, s.age < 60 || s.shut > .6 ? MB.W : MB.H, 3); return; }
        riftLip(put, { ...s, w }, cx, y);
    }
    function riftMotes(put, s) {
        for (let k = 0; k < 4; k++) {
            const ph = ((s.age + k * 90) % 360) / 360, a = k * 1.7 + .5, d = 9 * (1 - ph) + 2;
            put(Math.round(s.x + Math.cos(a) * d), Math.round(s.top + 22 * (.3 + .12 * k) + Math.sin(a) * d * .5), ph > .6 ? MB.H : MB.L, 4);
        }
    }
    /** The tear closes to a line and snaps with a flash. */
    function riftSnap(put, s, f) {
        if (f < 30) for (let y = s.top + 3; y <= s.foot - 3; y++) put(s.x + Math.round(Math.sin((y - s.top) / 22 * 2.6 + 1) * 1.2), y, MB.W, 5);
    }
    /** 차원찢기: a standing tear (22 dots tall, foot = its lower end); o.closeAt = age it starts closing. */
    function rift(dot, x, foot, age, o) {
        const closeAt = o.closeAt, top = foot - 22;
        if (age < 0 || age >= closeAt + 90) return;
        const cut = Math.min(1, age / 50), open = age < 50 ? 0 : Math.min(1, (age - 50) / 70), shut = age > closeAt ? Math.min(1, (age - closeAt) / 60) : 0;
        const lay = layer(), s = { x, top, age, shut, W: 3.6 * open * (1 - shut) };
        for (let y = top; y <= top + Math.round(22 * cut); y++) riftRow(lay.put, s, y);
        if (open >= 1 && !shut) riftMotes(lay.put, s);
        if (shut >= 1) riftSnap(lay.put, { x, top, foot }, age - closeAt - 60);
        lay.flush(dot);
    }
    /** Void shards thrown out when the exit tear snaps shut; dr = extra radius. */
    function riftShards(put, x, y, u, dr) {
        for (let k = 0; k < 8; k++) {
            const a = k / 8 * TAU + .3, d = 3 + (16 + 16 * dr) * (1 - (1 - u) * (1 - u)), px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * .8;
            put(Math.round(px), Math.round(py), u < .3 ? MB.H : u < .65 ? MB.L : MB.M, 2);
            if (u < .7) put(Math.round(px - Math.cos(a) * 1.5), Math.round(py - Math.sin(a) * 1.2), MB.M, 1);
        }
    }
    function riftBurst(dot, x, y, age, dr = 0) {
        if (age < 0 || age >= 260) return;
        const lay = layer();
        riftShards(lay.put, x, y, age / 260, dr);
        if (age < 70) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) lay.put(x + dx, y + dy, dx || dy ? MB.H : MB.W, 3);
        lay.flush(dot);
    }
    function smokePuffs(at, age, s) {
        const r = rng(s.seed), puffs = [];
        for (let k = 0; k < 8; k++) {
            const a = k / 8 * TAU + (r() - .5) * .6, st = r() * 50, t = Math.max(0, age - st), g = Math.min(1, t / 110);
            const rise = 3 + 9 * Math.min(1, t / 500) + r() * 3, spread = (4 + r() * 4) * (.5 + .5 * g);
            const px = at.x + Math.cos(a) * spread, py = at.foot - 5 - rise * (.4 + (k % 3) * .35) + Math.sin(a) * spread * .45;
            puffs.push({ x: px, y: py, r: (3.2 + r() * 2.6) * g * (1 - s.dis * .7) });
        }
        puffs.push({ x: at.x, y: at.foot - 10 - 4 * Math.min(1, age / 400), r: 7.5 * Math.min(1, age / 90) * (1 - s.dis * .8) });
        return puffs;
    }
    function smokeBody(dot, puffs, dis) {
        const b = puffBounds(puffs);
        for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
            const p = puffField(puffs, x, y);
            if (p.f <= 0) continue;
            if (dis > 0 && hsh(x, y, 9) < dis * 1.3 - p.f * .5) continue;
            const tone = p.f - .6 * p.ny - dis * .4;
            dot(x, y, tone > .8 && dis < .3 ? SM.H : tone > .38 ? SM.L : tone > 0 ? SM.M : SM.D);
        }
    }
    /** 향로구름: censer smoke billowing round a spot and hiding whoever stands in it. at = { x, foot }; o = { seed }. */
    function smoke(dot, at, age, life, o = {}) {
        if (age < 0 || age >= life) return;
        const u = age / life, dis = u > .55 ? (u - .55) / .45 : 0;
        smokeBody(dot, smokePuffs(at, age, { seed: o.seed || 55, dis }), dis);
        for (let k = 0; k < 4; k++) {
            const t = age - (60 + k * 90);
            if (t < 0 || t > 320) continue;
            dot(Math.round(at.x + (k - 1.5) * 4), Math.round(at.foot - 6 - t / 320 * 14), t < 160 ? SM.G : SM.E);
        }
    }
    /** 작살화살: barbed steel head on a short wooden shaft, drawn along its flight angle. */
    function harpoon(dot, x, y, ang) {
        const c = Math.cos(ang), s = Math.sin(ang), P = (a, b) => [Math.round(x + c * a - s * b), Math.round(y + s * a + c * b)];
        for (let i = -7; i <= -1; i++) { const [px, py] = P(i, 0); dot(px, py, i < -5 ? RP.L : RP.D); }
        for (const [a, b, col] of [[0, 0, RP.W], [1, 0, RP.H], [-1, 0, RP.H], [-2, 0, RP.S], [-1, -1, RP.S], [-1, 1, RP.S], [-2, -2, RP.H], [-2, 2, RP.H]]) { const [px, py] = P(a, b); dot(px, py, col); }
    }
    /** 1-dot rope from S to T with a sag in the middle (o.sag 0 = taut) and an optional wobble. */
    function rope(dot, S, T, o) {
        const L = Math.max(Math.abs(T.x - S.x), Math.abs(T.y - S.y), 1), n = Math.ceil(L);
        for (let i = 0; i <= n; i++) {
            const t = i / n, px = S.x + (T.x - S.x) * t, py = S.y + (T.y - S.y) * t + o.sag * 4 * t * (1 - t) + (o.wob && i % 4 < 2 ? o.wob : 0);
            dot(Math.round(px), Math.round(py), i % 3 ? RP.L : RP.D);
        }
    }
    /** Small physical impact on a target. */
    function strikeArms(dot, x, y, age, P) {
        const L = age < 50 ? 3 : 2;
        for (const [dx, dy] of PLUS) for (let j = 1; j <= L; j++) dot(x + dx * j, y + dy * j, age < 60 ? P.W : j === L ? P.L : P.H);
    }
    function strikeStar(dot, x, y, age, pal) {
        if (age < 0 || age >= 150) return;
        const P = pal || DU;
        strikeArms(dot, x, y, age, P);
        const corners = age > 30 && age < 120;
        for (const [dx, dy] of DIAG) if (corners) dot(x + dx * 2, y + dy * 2, P.L);
        dot(x, y, age < 80 ? P.W : P.H);
    }
    /** 공중강타 takeoff dust at the feet. */
    function dustPuff(dot, x, foot, age) {
        if (age < 0 || age >= 240) return;
        const u = age / 240;
        for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
            const px = Math.round(x + s * (3 + k * 2 + u * 6)), py = Math.round(foot - k - u * 2), r = u < .5 ? 1 : 0;
            for (let dx = -r; dx <= r; dx++) dot(px + dx, py, u < .4 ? DU.H : u < .75 ? DU.L : DU.M);
        }
    }
    function slamRing(put, x, y, s) {
        const u = s.age / 240, R0 = 4 + (20 + 16 * s.dr) * (1 - (1 - u) * (1 - u)), B = Math.ceil(R0 + 1);
        for (let yy = -B; yy <= B; yy++) for (let xx = -B; xx <= B; xx++) {
            const d = Math.hypot(xx + .5, (yy + .5) / .8) - R0;
            if (d > .5 || d < -1.5) continue;
            if (u > .6 && hsh(x + xx, y + yy, 2) < (u - .6) * 2.5) continue;
            put(x + xx, y + yy, d > -.5 ? (u < .35 ? DU.W : DU.L) : DU.M, 1);
        }
    }
    function slamCrack(put, c, k, rs) {
        const a = k / 6 * TAU + rs() * .5, len = (7 + rs() * 6 + 8 * c.dr) * Math.min(1, c.age / 70);
        let px = c.x, py = c.y, aa = a;
        for (let j = 0; j < len; j++) {
            aa += (rs() - .5) * .5; px += Math.cos(aa); py += Math.sin(aa) * .8;
            if (c.fade && hsh(Math.round(px), Math.round(py), k) < c.fade) continue;
            put(Math.round(px), Math.round(py), DU.D, 2);
            if (j < len - 2) put(Math.round(px), Math.round(py) - 1, DU.L, 1);
        }
    }
    function slamDent(put, x, y, col) {
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1]]) put(x + dx, y + dy, col, 3);
    }
    /** Landing on the floor: shock ring, six cracks, the dent. o = { seed, dr }. */
    function slamGround(dot, x, y, age, o = {}) {
        if (age < 0 || age >= 520) return;
        const lay = layer(), rs = rng(o.seed || 57), dr = o.dr || 0;
        if (age < 240) slamRing(lay.put, x, y, { age, dr });
        const c = { x, y, age, dr, fade: age > 380 ? (age - 380) / 140 : 0 };
        for (let k = 0; k < 6; k++) slamCrack(lay.put, c, k, rs);
        slamDent(lay.put, x, y, age < 120 ? DU.M : DU.D);
        lay.flush(dot);
    }
    function slamChips(put, x, y, age) {
        const rs = rng(571);
        for (let k = 0; k < 6; k++) {
            const a = k / 6 * TAU + rs() * .6, v = 10 + rs() * 8, u = Math.min(1, age / 320);
            const px = x + Math.cos(a) * v * u, py = y + Math.sin(a) * v * u * .7 - 10 * u * (1 - u) * 2;
            if (age >= 320) continue;
            put(Math.round(px), Math.round(py), k % 2 ? DU.L : DU.H, 3);
            if (k % 3 === 0) put(Math.round(px) + 1, Math.round(py), DU.M, 3);
        }
    }
    function dustBlob(put, px, py, u) {
        const r = u < .5 ? 2 : 1, c = u < .3 ? DU.H : u < .7 ? DU.L : DU.M;
        for (let dy = -r + 1; dy <= 0; dy++) for (let dx = -r; dx <= r; dx++) if (!(Math.abs(dx) === r && dy === -r + 1)) put(px + dx, py + dy, c, 2);
    }
    function slamDust(put, x, y, age) {
        for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
            const t = age - k * 30;
            if (t < 0 || t > 300) continue;
            const u = t / 300;
            dustBlob(put, Math.round(x + s * (6 + k * 4 + u * 8)), Math.round(y - 1 - k * .5 - u * 3), u);
        }
    }
    /** Landing in front: a flat white impact line, stone chips hopping out, dust rolling at the feet. */
    function slamFore(dot, x, y, age) {
        if (age < 0 || age >= 380) return;
        const lay = layer();
        if (age < 60) for (let dx = -7; dx <= 7; dx++) lay.put(x + dx, y, Math.abs(dx) < 4 ? DU.W : DU.H, 4);
        slamChips(lay.put, x, y, age);
        slamDust(lay.put, x, y, age);
        lay.flush(dot);
    }

    return Object.freeze({
        WispAttack: { attack: wispAttack, mist: wispMist, timing: wispTiming, wood: WOODC },
        Mobility4: { rift, riftBurst, smoke, harpoon, rope, strikeStar, dustPuff, slamGround, slamFore, colors: { MB, SM, RP, DU } }
    });
})();
safeExposeGlobals({ redrawnSkillArtMoves });
