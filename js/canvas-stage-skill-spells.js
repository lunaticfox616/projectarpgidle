/** 스킬룬 이펙트 가운데 코드로 그리는 범위와 이동 연출 (2026-10-17 "스킬룬 디렉터 전달" v32의 그리기 코드를 옮긴 것이다. 근접 베기 연출은
 * js/canvas-stage-skill-strokes.js). 얼어붙은 고리, 혹한의 지진의 얼음 기둥, 불씨의 함성, 서리바람 내지르기, 전도성 난격의 바닥 방전,
 * 신성한 단두대, 신성한 기도의 빛의 창, 화살비, 차원찢기의 우주 구체, 빈 플라스크의 유리, 돌진의 공기 활과 먼지, 섬머솔트 슬래시의 궤적.
 * 자리는 그 연출을 건 곳(발 자리)에서의 도트이고, 칸으로 잰 범위는 게임의 칸(64×32도트)으로 옮긴다. 인계는 캐릭터와 연출을 깊이 순서로
 * 섞어 그리지만 게임의 무대는 바닥 층과 캐릭터 위 층뿐이라, 건 자리보다 뒤쪽(화면 위)의 조각은 바닥 층에, 앞쪽은 위 층에 그린다.
 * 그리기만 한다: 언제 어디에 걸지는 js/canvas-stage-skill-runes.js가 정한다.
 */
const stageSkillSpells = (() => {
    const S = stageSkillStrokes, WIDE = 64, DEEP = 32, TAU = Math.PI * 2;
    const dot = g => (x, y) => g.fillRect(x, y, 1, 1);

    // ---------------------------------------------------------------- frozen ring (얼어붙은 고리)
    const ICE = Object.freeze({ HH: 30, SW: 180, TURN: TAU * 1.12, SPAN: Math.PI * 1.45, D0: 150, D1: 240, W0: 240, WD: 440, RW0: 0.8, RW1: 1.45, RING: 0.8 });
    const iceHead = t => { const u = Math.min(1, t / ICE.SW); return ICE.TURN * (1 - (1 - u) * (1 - u)); };
    const iceWave = t => { const u = Math.min(1, Math.max(0, (t - ICE.W0) / ICE.WD)); return ICE.RW0 + (ICE.RW1 - ICE.RW0) * (1 - Math.pow(1 - u, 1.5)); };
    const iceWaveAt = d => (d <= ICE.RW0 ? ICE.W0 : ICE.W0 + ICE.WD * (1 - Math.pow(1 - Math.min(1, (d - ICE.RW0) / (ICE.RW1 - ICE.RW0)), 1 / 1.5)));
    /** 칼날 고리 위의 한 점: a는 등 뒤에서부터 돈 각, R은 가로 반지름, h는 높이. 바닥 자리의 y(깊이)도 함께. */
    function icePos(ring, a, R, h) { const p = Math.PI + a, y = R * ring.q * Math.sin(p); return [ring.face * R * Math.cos(p), y - h, y]; }
    /** 파동 마루가 지나간 자리의 작은 잔해. 실제 피격 대상의 큰 가시는 spellIceRingSpikes가 그린다. */
    function iceSpikes(ring) {
        const r = S.random(5531), spikes = [];
        [0.86, 1.04, 1.22, 1.38].forEach((d, j) => {
            const n = 11 + j * 2, a0 = r() * TAU;
            for (let i = 0; i < n; i++) {
                const a = a0 + i / n * TAU + (r() - 0.5) * 0.25, dd = d + (r() - 0.5) * 0.06, x = Math.cos(a) * ring.A * dd, y = Math.sin(a) * ring.B * dd;
                if (j < 2 && y > 0 && Math.abs(x) < 26) continue;   // 캐릭터 바로 앞을 가리는 가시는 뺀다
                spikes.push({ x, y, H: Math.round((13 - j * 1.5) * (0.7 + r() * 0.6)), W: Math.max(4, Math.round(6 - j * 0.5 + r() * 2)), lean: Math.cos(a) * (0.1 + r() * 0.15),
                    t0: iceWaveAt(dd) + 30 + r() * 20, hold: 40 + r() * 30, sd: 17 + i * 31 + j * 7 });
            }
        });
        return spikes;
    }
    /** 실제 피격 대상 발밑의 큰 가시 셋. v는 고리를 건 자리에서 본 적의 위치(도트). */
    function victimSpikes(ring, v) {
        const t0 = iceWaveAt(Math.hypot(v.dx / ring.A, v.dy / ring.B));
        return [[-10, 22, 8], [1, 32, 11], [11, 20, 7]].map(([dx, H, W], i) => ({ x: v.dx + dx, y: v.dy + 2, H, W, lean: dx * 0.012, t0: t0 + i * 20, hold: 230, big: true, sd: 900 + i }));
    }
    /** 얼음 가시 한 개: 밑동 그림자, 짙은 테, 왼면 밝게, 오른면 어둡게, 가운데 능선. */
    function iceSpike(g, ring, s) {
        const hw0 = s.W / 2, C = ring.C, F = ring.F;
        g.globalAlpha = s.al * 0.7; g.fillStyle = C[1]; g.fillRect(s.x - Math.round(hw0) - 2, s.y, Math.round(hw0) * 2 + 5, 1);
        g.globalAlpha = s.al;
        for (let j = 0; j < s.H; j++) {
            const v = j / s.H, hw = Math.round(hw0 * Math.pow(1 - v, 0.85)), cx = s.x + Math.round(s.lean * j), y = s.y - j;
            g.fillStyle = C[1]; g.fillRect(cx - hw - 1, y, hw * 2 + 3, 1);
            if (hw > 0) { g.fillStyle = v < 0.3 ? F[2] : F[3]; g.fillRect(cx - hw, y, hw, 1); g.fillStyle = F[1]; g.fillRect(cx + 1, y, hw, 1); }
            g.fillStyle = v > 0.5 ? F[5] : F[2]; g.fillRect(cx, y, 1, 1);
        }
        g.globalAlpha = 1;
    }
    /** 남은 가시의 지금 높이와 투명도: 솟고(살짝 넘쳤다 돌아오고), 버티고, 큰 가시는 부서지고 잔해는 가라앉는다. */
    function iceSpikeLife(sp, k) {
        const RISE = 80, BRK = 190;
        if (k < RISE) { const u = k / RISE; return { h: sp.H * (u < 0.75 ? u / 0.75 * 1.12 : 1.12 - 0.12 * (u - 0.75) / 0.25), al: 1, brk: 0 }; }
        if (k < RISE + sp.hold) return { h: sp.H, al: 1, brk: 0 };
        const brk = Math.min(1, (k - RISE - sp.hold) / BRK);
        return { h: sp.H * (1 - brk * (sp.big ? 0.5 : 0.8)), al: 1 - brk * brk, brk };
    }
    function iceSpikeAt(g, ring, sp, t) {
        const life = iceSpikeLife(sp, t - sp.t0);
        if (life.al <= 0.02) return;
        const x0 = Math.round(sp.x), y0 = Math.round(sp.y), H = Math.max(2, Math.round(life.h));
        iceSpike(g, ring, { x: x0, y: y0, H, W: sp.W, lean: sp.lean, al: life.al });
        if (life.brk > 0 && sp.H > 16) iceSpikeBreak(g, ring, { sp, x0, y0: y0 - Math.round(H * 0.55), brk: life.brk });
    }
    /** 부서짐: 금 하나와 바깥으로 튀어 떨어지는 조각 셋. */
    function iceSpikeBreak(g, ring, o) {
        const rr = S.random(o.sp.sd), hw0 = o.sp.W / 2;
        if (o.brk < 0.5) { g.fillStyle = ring.C[1]; S.line(o.x0 - Math.round(hw0 * 0.6), o.y0 + 2, o.x0 + Math.round(hw0 * 0.5), o.y0 - 3, dot(g)); }
        for (let i = 0; i < 3; i++) {
            const vx = (rr() - 0.5) * 34 + (o.sp.x > 0 ? 8 : -8), vy = -16 - rr() * 22, s2 = o.brk * 0.32;
            g.fillStyle = i ? ring.F[3] : ring.F[4]; g.fillRect(Math.round(o.x0 + vx * o.brk * 0.9), Math.round(o.y0 + vy * s2 * 2 + 300 * s2 * s2), i ? 2 : 3, 2);
        }
        g.globalAlpha = 1;
    }
    /** 칼날 고리의 띠 한 점(앞쪽이면 위 층, 뒤쪽이면 바닥 층에서만 그린다). */
    function icePut(g, ring, o) {
        const [x, y, ground] = icePos(ring, o.a, o.R, o.h);
        if ((ground >= 0) !== ring.front) return;
        g.globalAlpha = o.al; g.fillStyle = o.col; g.fillRect(Math.round(x), Math.round(y) - o.hh, o.w, o.hh * 2 + 1);
    }
    const iceBandInk = (C, u, rr) => (u > 0.8 ? (rr > 0.86 ? C[5] : rr > 0.45 ? C[4] : C[3]) : u > 0.4 ? (rr > 0.8 ? C[4] : C[3]) : (rr > 0.7 ? C[3] : C[2]));
    /** ① 칼날 고리: 등 뒤에서 시작해 한 바퀴 넘게 돌며, 머리는 굵고 밝고 꼬리는 가늘다. */
    function iceBlade(g, ring, t) {
        const hd = iceHead(t), close = t > ICE.SW ? Math.min(1, (t - ICE.SW) / 130) : 0, span = Math.min(hd, ICE.SPAN * (1 - close)), fade = t < ICE.SW ? 1 : Math.max(0, 1 - (t - ICE.SW) / 150);
        if (fade <= 0 || span <= 0.02) return;
        const tail = hd - span, N = Math.ceil(span * ring.R_OUT * 0.9);
        for (let i = 0; i <= N; i++) {
            const u = i / N, a = tail + span * u, wid = ring.BAND * (0.12 + 0.88 * Math.pow(u, 1.3)) * (u > 0.95 ? 0.35 + 0.65 * (1 - u) / 0.05 : 1);
            const hv = Math.round(1 + 2.5 * u), al = fade * (0.3 + 0.7 * u), Rhi = ring.R_OUT - (1 - u) * 8, Rlo = Rhi - wid, st = Math.max(1, Math.round(wid / 2));
            for (let k = 0; k <= st; k++) icePut(g, ring, { a, R: Rlo + (Rhi - Rlo) * k / st, h: ICE.HH, w: 2, hh: hv, col: iceBandInk(ring.C, u, k / st), al });
        }
    }
    /** ② 내려앉는 서리 고리: 칼날이 지나간 자리의 서리 알갱이가 바닥으로 떨어진다. */
    function iceSettle(g, ring, t) {
        if (t <= ICE.D0 || t >= ICE.D1 + 40) return;
        const u = Math.min(1, (t - ICE.D0) / (ICE.D1 - ICE.D0)), h = ICE.HH * (1 - u * u), al = Math.min(1, (t - ICE.D0) / 50) * (t > ICE.D1 ? 1 - (t - ICE.D1) / 40 : 1);
        for (let i = 0; i < 64; i++) {
            const a = i / 64 * TAU + (i % 3) * 0.02, tw = (i * 7 + Math.floor(t / 40)) % 5, col = tw === 0 ? ring.C[5] : tw < 3 ? ring.C[4] : ring.F[2];
            icePut(g, ring, { a, R: ring.A * ICE.RING * (1 + (i % 4 - 1.5) * 0.015), h: h + (i % 3) * 2 * (1 - u), w: tw ? 2 : 1, hh: 0, col, al });
        }
    }
    /** ③ 파동 마루: 파동 반지름을 따라 바깥으로 밀려가는 들쭉날쭉한 얼음 가시 고리. 0.25까지 솟고 0.6부터 낮아진다. */
    function iceCrest(g, ring, t) {
        if (t < ICE.W0 || t >= ICE.W0 + ICE.WD) return;
        const u = (t - ICE.W0) / ICE.WD, env = u < 0.25 ? 1 - Math.pow(1 - u / 0.25, 2) : u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.4), R = iceWave(t), al = u > 0.85 ? (1 - u) / 0.15 : 1;
        for (const c of ring.crest) {
            const d = R + c.dr, x = Math.cos(c.a) * ring.A * d, y = Math.sin(c.a) * ring.B * d, H = Math.round(30 * env * c.h * (1 + 0.12 * Math.sin(t / 40 + c.a * 5)));
            if (crestHidden(ring, { x, y, d, H })) continue;
            iceSpike(g, ring, { x: Math.round(x), y: Math.round(y), H, W: Math.max(4, Math.round(c.W * (0.6 + 0.4 * env))), lean: Math.cos(c.a) * c.ln, al });
        }
    }
    /** 그리지 않는 마루 가시: 너무 낮거나, 캐릭터 바로 앞을 가리거나, 다른 층의 몫. */
    const crestHidden = (ring, c) => c.H < 2 || (c.y > 0 && Math.abs(c.x) < 26 && c.d < 1) || (c.y >= 0) !== ring.front;
    /** ①~④를 그 층의 몫만: 앞(front)이면 건 자리보다 앞쪽 조각, 아니면 뒤쪽 조각. */
    function icePieces(g, ring, t, front) {
        ring.front = front;
        iceBlade(g, ring, t);
        iceSettle(g, ring, t);
        iceCrest(g, ring, t);
        for (const sp of ring.spikes) if (t >= sp.t0 && (sp.y >= 0) === front) iceSpikeAt(g, ring, sp, t);
        g.globalAlpha = 1;
    }
    /** 바닥: 서리 바닥, 파동 띠, 바깥으로 뻗는 금. */
    function iceFloor(g, ring, t) {
        if (t < ICE.W0 - 10) return;
        const R = iceWave(t), u = Math.min(1, (t - ICE.W0) / ICE.WD), out = t > ICE.W0 + ICE.WD ? Math.max(0, 1 - (t - ICE.W0 - ICE.WD) / 420) : 1;
        if (out <= 0) return;
        g.globalAlpha = 0.16 * out; g.fillStyle = ring.F[0]; g.beginPath(); g.ellipse(0, 0, ring.A * R, ring.B * R, 0, 0, TAU); g.fill();
        iceCracks(g, ring, { R, out });
        if (u < 1) iceWaveBand(g, ring, { R, u });
        g.globalAlpha = 1;
    }
    function iceCracks(g, ring, o) {
        const rc = S.random(4409);
        g.globalAlpha = 0.75 * o.out; g.fillStyle = ring.C[1];
        for (let i = 0; i < 9; i++) {
            const a = i / 9 * TAU + rc() * 0.5;
            let d = ICE.RW0 - 0.05, x = Math.cos(a) * ring.A * d, y = Math.sin(a) * ring.B * d;
            while (d < o.R - 0.04) { const d2 = d + 0.1, aa = a + (rc() - 0.5) * 0.18, x2 = Math.cos(aa) * ring.A * d2, y2 = Math.sin(aa) * ring.B * d2; S.line(x, y, x2, y2, dot(g)); x = x2; y = y2; d = d2; }
        }
    }
    function iceWaveBand(g, ring, o) {
        const N = 220, w = 1 - o.u * 0.6;
        for (let i = 0; i < N; i++) {
            const a = i / N * TAU, c = Math.cos(a), s = Math.sin(a);
            g.globalAlpha = 0.35 * w; g.fillStyle = ring.F[1];
            for (let k = 1; k <= 3; k++) g.fillRect(Math.round(c * ring.A * (o.R - k * 0.035)), Math.round(s * ring.B * (o.R - k * 0.035)), 2, 1);
            g.globalAlpha = 0.8 * w; g.fillStyle = i % 9 ? ring.F[2] : ring.F[4]; g.fillRect(Math.round(c * ring.A * o.R), Math.round(s * ring.B * o.R), 2, 1);
        }
    }
    /** 날 끝 서리 조각: 칼날 머리에서 돌아가는 쪽 바깥으로 튄다. */
    function iceShards(g, ring, t) {
        for (let i = 0; i < 18; i++) {
            const te = i * 10, k = t - te;
            if (k < 0 || k > 280) continue;
            const rr = S.random(71 + i), a = iceHead(te), p = Math.PI + a, [x0, y0] = icePos(ring, a, ring.R_OUT * 0.95, 0);
            let tx = -ring.face * Math.sin(p), ty = ring.q * Math.cos(p); const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
            const sp = 150 + rr() * 70, ro = 40 + rr() * 30, s2 = k / 1000, vz = 50 + rr() * 90;
            const gx = x0 + (tx * sp + ring.face * Math.cos(p) * ro) * s2, gy = y0 + (ty * sp + Math.sin(p) * ring.q * ro) * s2, hz = ICE.HH + vz * s2 - 260 * s2 * s2;
            g.globalAlpha = 1 - k / 280; g.fillStyle = i % 3 ? ring.C[4] : ring.C[5]; g.fillRect(Math.round(gx), Math.round(gy - Math.max(0, hz)), i % 2 ? 1 : 2, i % 2 ? 1 : 2);
        }
        g.globalAlpha = 1;
    }
    /** 얼어붙은 고리: 칼날 고리, 바닥 서리, 바깥으로 퍼지는 파동과 작은 가시. 큰 가시는 실제 피격 사건에서 따로 건다.
     * @param {{at:object, face:number, radius:number}} o 건 자리(주인공), 반지름(칸) */
    function spellIceRing(o) {
        const A = (o.radius + 0.5) * WIDE, B = (o.radius + 0.5) * DEEP, r = S.random(77);
        const ring = { C: S.ramp('cold'), F: S.ramp('frost'), A, B, q: B / A, face: o.face, R_OUT: A * 0.98, BAND: A * 0.36, front: true };
        ring.spikes = iceSpikes(ring);
        ring.crest = Array.from({ length: 46 }, (_, i) => ({ a: i / 46 * TAU + (r() - 0.5) * 0.08, h: 0.55 + r() * 0.45 * (i % 2 ? 0.6 : 1), dr: (r() - 0.5) * 0.06, W: 7 + Math.round(r() * 3), ln: 0.15 + r() * 0.15 }));
        S.hang(o.at, { life: ICE.W0 + ICE.WD + 480,
            ground(g, t) { iceFloor(g, ring, t); icePieces(g, ring, t, false); },
            top(g, t) { icePieces(g, ring, t, true); iceShards(g, ring, t); } });
    }

    /** 실제 피격 대상 하나의 큰 가시 셋. 고리와 같은 앞/뒤 층을 쓰되 독립된 생애로 끝까지 그린다.
     * @param {{at:object, radius:number, victim:{dx:number,dy:number}}} o 고리 위치, 반지름(칸), 그 위치에서 본 적의 위치(도트) */
    function spellIceRingSpikes(o) {
        const A = (o.radius + 0.5) * WIDE, B = (o.radius + 0.5) * DEEP, ring = { C: S.ramp('cold'), F: S.ramp('frost'), A, B }, spikes = victimSpikes(ring, o.victim);
        const draw = (g, t) => { for (const sp of spikes) if (t >= sp.t0) iceSpikeAt(g, ring, sp, t); g.globalAlpha = 1; };
        S.hang(o.at, { life: spikes[2].t0 + 520, [o.victim.dy + 2 >= 0 ? 'top' : 'ground']: draw });
    }

    // ---------------------------------------------------------------- ice columns (혹한의 지진)
    const COLUMN = Object.freeze({ RISE: 90, HOLD: 330, BRK: 220 });
    /** 앞 쐐기를 따라 50도트 간격의 기둥 열. 실제 피격 대상의 큰 기둥은 spellIceColumn이 그린다. o.rows(옆으로 치는 띠의 위아래 줄 수)가 있으면
     * 쐐기 대신 그 줄마다 한 열씩 서고, 바닥의 금도 줄마다 하나씩 간다. */
    function columnPlan(o) {
        const r = S.random(8117), Lp = o.L * WIDE, cols = [], rows = o.rows || 0;
        for (let x = 30; x <= Lp - 6; x += 50) {
            for (const y0 of columnRows(o, x)) {
                const dx = x + (r() - 0.5) * 10;
                cols.push({ x: o.face * dx, y: y0 + (r() - 0.5) * 5, H: 46 + r() * 18 + dx / Lp * 18, W: 20 + Math.round(r() * 6), lean: (r() - 0.5) * 0.14, t0: dx / WIDE * o.rowMs + r() * 16 });
            }
        }
        for (const c of cols) c.sh = [...Array(8)].map(() => [r() * 0.9, (r() - 0.5) * 80, -20 - r() * 50, r() < 0.5 ? 3 : 4]);
        cols.sort((a, b) => a.y - b.y);
        const cracks = [0, 1, 2].map(i => { const pts = [[0, (i - 1) * rows * DEEP * 0.9]]; let x = 0, y = pts[0][1]; while (x < Lp) { x += 10 + r() * 12; y += (r() - 0.5) * 8 + (rows ? 0 : (i - 1) * 2.2); pts.push([x, y]); } return pts; });
        return { cols, cracks, Lp, last: Math.max(...cols.map(c => c.t0)) + COLUMN.RISE + COLUMN.HOLD + COLUMN.BRK };
    }
    /** 앞으로 x도트인 곳에 설 기둥들의 높이 자리(y, 도트): 옆으로 치는 띠면 줄마다 하나(줄 가운데 조금 안쪽), 아니면 쐐기 폭에 고르게. */
    function columnRows(o, x) {
        if (o.rows) return Array.from({ length: o.rows * 2 + 1 }, (_, i) => (i - o.rows) * DEEP * 0.9);
        const h = (0.5 + Math.min(1, Math.max(0, x / (o.L * WIDE))) * (o.L / 2 - 0.5)) * DEEP, n = Math.max(1, Math.round(h * 2 / 42));
        return Array.from({ length: n }, (_, i) => (n === 1 ? 0 : i / (n - 1) * 2 - 1) * h * 0.8);
    }
    /** 서 있는 기둥 한 개: 왼쪽 밝은 면, 정면, 오른쪽 어두운 면, 가운데 능선, 양 끝 테두리, 위는 뾰족. */
    function columnBody(g, C, c, h) {
        const bx = Math.round(c.x), by = Math.round(c.y), tip = Math.round(c.W * 1.2);
        for (let j = 0; j < h; j++) {
            const w = j < h - tip ? c.W : Math.max(1, Math.round(c.W * (h - j) / tip)), x0 = Math.round(bx - w / 2 + c.lean * j), y = by - j;
            const a1 = Math.max(1, Math.round(w * 0.38)), a2 = Math.max(1, Math.round(w * 0.3));
            g.globalAlpha = 1; g.fillStyle = C[1]; g.fillRect(x0 - 1, y, 1, 1); g.fillRect(x0 + w, y, 1, 1);
            g.fillStyle = C[3]; g.fillRect(x0, y, a1, 1); g.fillStyle = C[2]; g.fillRect(x0 + a1, y, w - a1 - a2, 1); g.fillStyle = C[1]; g.fillRect(x0 + w - a2, y, a2, 1);
            if (j % 4 !== 2) { g.fillStyle = C[4]; g.fillRect(x0 + a1 - 1, y, 1, 1); }
            if (j > 4 && (j + Math.round(c.x)) % 13 === 0) { g.fillStyle = C[3]; g.fillRect(x0 + a1, y, Math.max(1, w - a1 - a2 - 2), 1); }
        }
        g.fillStyle = C[1]; g.fillRect(Math.round(bx - c.W / 2 + c.lean * h), by - h, 1, 1);
    }
    /** 솟는 기둥: 솟을 때 튀는 부스러기, 부서지기 전의 금. */
    function columnRising(g, C, c, lt) {
        const bx = Math.round(c.x), by = Math.round(c.y), u = Math.min(1, lt / COLUMN.RISE);
        const h = Math.round(c.H * (u < 1 ? 1 - (1 - u) ** 3 : 1 + 0.06 * Math.sin(Math.min(1, (lt - COLUMN.RISE) / 120) * Math.PI)));
        columnBody(g, C, c, h);
        if (lt < COLUMN.RISE + 40) { const k = lt / (COLUMN.RISE + 40); g.globalAlpha = 1 - k; g.fillStyle = C[4]; for (let q = 0; q < 4; q++) g.fillRect(Math.round(bx + (q - 1.5) * (c.W * 0.6) * (1 + k * 1.5)), Math.round(by - 2 - k * 10 * (1 + (q % 2))), 2, 2); }
        if (lt > COLUMN.RISE + COLUMN.HOLD - 90) { g.globalAlpha = (lt - (COLUMN.RISE + COLUMN.HOLD - 90)) / 90; g.fillStyle = C[5]; S.line(bx - 2 + c.lean * h * 0.3, by - h * 0.35, bx + 2 + c.lean * h * 0.6, by - h * 0.62, dot(g)); }
    }
    /** 부서져 조각이 튀었다 떨어지고, 남은 밑동이 가라앉는다. */
    function columnBreaking(g, C, c, o) {
        const bx = Math.round(c.x), by = Math.round(c.y), q = (o.lt - COLUMN.RISE - COLUMN.HOLD) / COLUMN.BRK, sec = q * COLUMN.BRK / 1000;
        for (const [hy, vx, vy, sz] of c.sh) {
            const x = bx + vx * sec * o.face, y = by - c.H * hy + vy * sec + 420 * sec * sec;
            if (y > by + 4) continue;
            g.globalAlpha = 1 - q; g.fillStyle = sz > 2 ? C[3] : C[4]; g.fillRect(Math.round(x), Math.round(y), sz, sz + 1); g.fillStyle = C[1]; g.fillRect(Math.round(x) + sz, Math.round(y) + 1, 1, sz);
        }
        g.globalAlpha = 1 - q; g.fillStyle = C[2]; const stub = Math.round(c.H * 0.25 * (1 - q)); g.fillRect(bx - (c.W >> 1), by - stub, c.W, stub);
    }
    function columnOne(g, plan, c, o) {
        const lt = o.t - c.t0;
        if (lt < 0) return;
        g.globalAlpha = 0.5 * Math.max(0, Math.min(1, (plan.last - o.t) / 200)); g.fillStyle = o.C[3];
        g.beginPath(); g.ellipse(Math.round(c.x), Math.round(c.y), c.W * 1.1, c.W * 0.45, 0, 0, TAU); g.fill();   // 기둥 밑 서리 자국
        if (lt < COLUMN.RISE + COLUMN.HOLD) columnRising(g, o.C, c, lt);
        else if (lt < COLUMN.RISE + COLUMN.HOLD + COLUMN.BRK) columnBreaking(g, o.C, c, { lt, face: o.face });
    }
    /** 혹한의 지진의 얼음 기둥: 친 자리에서 앞 쐐기를 따라 가까운 줄부터 솟아 0.33초 버틴 뒤 부서진다. 바닥에는 앞으로 뻗는 금 세 줄.
     * 바닥 층에 그려 적이 기둥 앞에 선다(인계도 바닥 쪽에 그린다). rows: 옆으로 치는 띠의 위아래 줄 수(columnPlan).
     * @param {{at:object, face:number, L:number, rowMs:number, rows?:number}} o */
    function spellIceColumns(o) {
        const plan = columnPlan(o), C = S.ramp('frost');
        S.hang(o.at, { life: plan.last + 60, ground(g, t) {
            const reach = Math.min(plan.Lp, (t / o.rowMs) * WIDE + 20), endA = Math.max(0, Math.min(1, (plan.last - t) / 260));
            g.fillStyle = C[1]; g.globalAlpha = 0.75 * endA;
            for (const pts of plan.cracks) for (let i = 1; i < pts.length && pts[i][0] <= reach; i++) S.line(o.face * pts[i - 1][0], pts[i - 1][1], o.face * pts[i][0], pts[i][1], dot(g));
            for (const c of plan.cols) columnOne(g, plan, c, { t, C, face: o.face });
            g.globalAlpha = 1;
        } });
    }

    /** 실제 피격 대상 발밑의 큰 기둥 하나. 기본 기둥 열 앞의 바닥 층에서 온전한 생애를 그린다.
     * @param {{at:object, delay:number, face:number, seed:number}} o 적의 발 위치, 지연(ms), 파편 방향, 모양 씨앗 */
    function spellIceColumn(o) {
        const r = S.random(8117 + o.seed), C = S.ramp('frost'), last = COLUMN.RISE + COLUMN.HOLD + COLUMN.BRK;
        const c = { x: 0, y: -2, H: 82 + r() * 10, W: 30, lean: 0, t0: 0, big: true };
        c.sh = [...Array(8)].map(() => [r() * 0.9, (r() - 0.5) * 80, -20 - r() * 50, r() < 0.5 ? 3 : 4]);
        S.hang(o.at, { life: last, delay: o.delay, ground(g, t) { columnOne(g, { last }, c, { t, C, face: o.face }); g.globalAlpha = 1; } });
    }

    // ---------------------------------------------------------------- shouts (불씨의 함성, 서리바람 내지르기)
    /** 불씨의 함성의 클립: 둘레 여섯 곳의 폭발과 바닥 일곱 곳의 작은 불길. */
    function emberClips(o, A, B, spread) {
        const clips = o.clips || {};
        if (clips.blast) for (let i = 0; i < 6; i++) {
            const a = i / 6 * TAU + 0.3, k = 0.72;
            stageSkillVfx.play(clips.blast, { ...o.at, dx: Math.cos(a) * A * k, dy: Math.sin(a) * B * k - 22 }, { face: Math.cos(a) < 0 ? -1 : 1, delay: 60 + spread * k + (i % 2) * 40, scale: 0.55, alpha: 0.85 });
        }
        if (clips.flame) for (let i = 0; i < 7; i++) {
            const a = i / 7 * TAU + 0.9, k = i === 0 ? 0.2 : 0.45 + (i % 3) * 0.17, d = 140 + spread * k;
            stageSkillVfx.play(clips.flame, { ...o.at, dx: Math.cos(a) * A * k, dy: Math.sin(a) * B * k }, { face: i % 2 ? 1 : -1, delay: d, life: Math.max(300, o.total - d), scale: 0.4 + (i % 3) * 0.08, alpha: 0.85, layer: 'ground' });
        }
    }
    function emberGround(g, e, t) {
        const front = Math.min(1, t / e.spread), end = Math.min(1, Math.max(0, 1 - (t - e.total) / 200)), C = e.C;
        g.globalAlpha = 0.2 * end * front; g.fillStyle = '#3a2a22'; g.beginPath(); g.ellipse(0, 0, e.A * front, e.B * front, 0, 0, TAU); g.fill();   // 그을린 바닥
        for (const [ux, uy, ph] of e.specks) {
            if (Math.hypot(ux, uy) > front) continue;
            const q = (Math.sin(t / 70 + ph * 3) + 1) / 2;
            g.globalAlpha = end * (0.2 + 0.45 * q); g.fillStyle = q > 0.7 ? C[4] : C[3]; g.fillRect(Math.round(ux * e.A * 0.95), Math.round(uy * e.B * 0.95), 2, 1);
        }
        if (t < e.spread + 160) {   // 퍼지는 불씨 앞면
            const fa = t < e.spread ? 1 : 1 - (t - e.spread) / 160, rj = S.random(11 + Math.floor(t / 40));
            for (let i = 0; i < 90; i++) { const a = i / 90 * TAU, j = 1 + (rj() - 0.5) * 0.08; g.globalAlpha = fa * 0.75; g.fillStyle = i % 3 ? C[4] : C[3]; g.fillRect(Math.round(Math.cos(a) * e.A * front * j), Math.round(Math.sin(a) * e.B * front * j), 2, 2); }
        }
        g.globalAlpha = 1;
    }
    /** 외침 호: 머리 좌우로 커지며 퍼지는 불빛 호 세 겹(sides 1이면 앞으로만, 서리바람). */
    function shoutArcs(g, t, o) {
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
    function spellEmberShout(o) {
        const A = (o.radius + 0.5) * WIDE, B = (o.radius + 0.5) * DEEP, spread = (o.radius + 0.5) * o.wave, r = S.random(5150);
        const e = { C: S.ramp('fire'), A, B, spread, total: o.total, specks: [...Array(70)].map(() => { const a = r() * TAU, d = Math.sqrt(r()); return [Math.cos(a) * d, Math.sin(a) * d, r() * TAU]; }) };
        emberClips(o, A, B, spread);
        S.hang(o.at, { life: o.total + 200, ground: (g, t) => emberGround(g, e, t),
            top: (g, t) => shoutArcs(g, t, { C: e.C, count: 3, gap: 70, ms: 300, r0: 10, grow: 34, alpha: 0.85, sides: [-1, 1], span: 0.7, step: 0.06, x: 0, y: -58, squash: 0.9 }) });
    }
    function frostGround(g, c, t) {
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
    function frostY(c, x, k, lift) { const u = Math.min(1, x / 70), gy = k * c.hd(x) * 0.92 - lift; return -58 + (gy + 58) * (1 - (1 - u) * (1 - u)); }
    function frostStreaks(g, c, t, end) {
        for (const st of c.streaks) {
            const x = (t - st.t0) * (c.Lp / c.dur) * st.sp;
            if (x < 0 || x - st.len > c.Lp) continue;
            for (let j = 0; j < st.len; j++) {
                const xx = x - j;
                if (xx < 0 || xx > c.Lp) continue;
                g.globalAlpha = end * 0.85 * (1 - j / st.len) * Math.min(1, (c.Lp - xx) / 40 + 0.2); g.fillStyle = j < 4 ? c.C[5] : c.C[3];
                g.fillRect(Math.round(c.face * (12 + xx)), Math.round(frostY(c, xx, st.k, st.lift)), 1, j < 6 ? 2 : 1);
            }
        }
    }
    function frostTop(g, c, t) {
        const end = t > c.dur + 260 ? Math.max(0, 1 - (t - c.dur - 260) / 420) : 1;
        shoutArcs(g, t, { C: c.C, count: 2, gap: 80, ms: 260, r0: 8, grow: 22, alpha: 0.8, sides: [c.face], span: 0.8, step: 0.08, x: c.face * 12, y: -58, squash: 1 });
        frostStreaks(g, c, t, end);
        for (const sn of c.snow) {   // 눈송이
            const x = (t - sn.t0) * (c.Lp / c.dur) * sn.sp;
            if (x < 0 || x > c.Lp) continue;
            g.globalAlpha = end * 0.85 * Math.min(1, (c.Lp - x) / 50); g.fillStyle = sn.sz > 1 ? c.C[5] : c.C[4];
            g.fillRect(Math.round(c.face * (12 + x)), Math.round(frostY(c, x, sn.k, sn.lift) + Math.sin(t / 90 + sn.ph) * 3), sn.sz, sn.sz);
        }
        g.globalAlpha = 1;
    }
    /** 서리바람 내지르기: 입에서 앞으로 내지른 바람 줄기와 눈송이가 부채꼴을 따라 퍼지고, 바닥에는 서리 앞면이 나아가며 지나간 자리에 서리가
     * 끼었다 녹는다. 연기 물결 두 줄(smwave)이 따라간다. o.rows(옆으로 치는 띠의 위아래 줄 수, 2026-10-17)가 있으면 몸 앞에서 이미 그 줄들의
     * 가운데까지 덮고 반 칸 안에 다 퍼져 끝까지 같은 폭으로 나아가며, 연기 물결도 그 줄들로 벌어진다.
     * @param {{at:object, face:number, L:number, wave:number, smwave:?string, rows?:number}} o */
    function spellFrostCone(o) {
        const Lp = o.L * WIDE, dur = o.L * o.wave, r = S.random(6203), rows = o.rows || 0;
        const hd = rows ? x => (0.5 + Math.min(1, Math.max(0, (x + WIDE / 2) / WIDE)) * rows) * DEEP : x => (0.5 + Math.min(1, Math.max(0, x / Lp)) * (o.L / 2 - 0.5)) * DEEP;
        const c = { C: S.ramp('frost'), face: o.face, Lp, dur, hd,
            streaks: [...Array(22)].map((_, i) => ({ k: i / 21 * 2 - 1, t0: r() * dur * 0.45, len: 14 + r() * 16, sp: 1.1 + r() * 0.35, lift: 8 + r() * 30 })),
            snow: [...Array(34)].map(() => ({ k: r() * 2 - 1, t0: r() * dur * 0.7, sp: 0.6 + r() * 0.45, lift: 4 + r() * 44, ph: r() * TAU, sz: r() < 0.3 ? 2 : 1 })),
            frost: [...Array(90)].map(() => [r(), r() * 2 - 1, r()]) };
        const spread = rows ? 2 : 1;
        if (o.smwave) [[-0.25, 0], [0.3, 70]].forEach(([k, delay]) => stageSkillVfx.play(o.smwave, { ...o.at, dx: o.face * 50, dy: -24 + k * DEEP },
            { face: o.face, delay, alpha: 0.75, move: { dx: o.face * (Lp * 0.8 - 50), dy: k * spread * DEEP * 2, ms: dur + 160 } }));
        S.hang(o.at, { life: dur + 700, ground: (g, t) => frostGround(g, c, t), top: (g, t) => frostTop(g, c, t) });
    }

    // ---------------------------------------------------------------- 전도성 난격
    /** 전도성 난격이 마지막으로 벤 자리의 바닥 방전: 바닥을 따라 여섯 갈래로 기는 짧은 번개와 가운데 작은 빛. delay 뒤에 일어난다. */
    function spellDischarge(at, delay) {
        const C = S.ramp('light');
        S.hang(at, { life: 320, delay, ground(g, t) {
            const fade = Math.max(0, 1 - t / 320), r = S.random(77 + Math.floor(t / 50));
            for (let i = 0; i < 6; i++) {
                const a = i / 6 * TAU + 0.4;
                let x = 0, y = 0;
                g.globalAlpha = fade * 0.9; g.fillStyle = i % 2 ? C[3] : C[4];
                for (let s = 0; s < 4; s++) { const x2 = x + Math.cos(a) * 11 + (r() - 0.5) * 8, y2 = y + Math.sin(a) * 5.5 + (r() - 0.5) * 4; S.line(x, y, x2, y2, dot(g)); x = x2; y = y2; }
            }
            g.globalAlpha = fade * 0.6; g.fillStyle = C[4]; g.fillRect(-3, -1, 7, 3); g.globalAlpha = 1;
        } });
    }

    // ---------------------------------------------------------------- 신성한 단두대
    const GOLD_LOW = Object.freeze(['#2a2116', '#4e3f26', '#6f5b34', '#8f7845', '#ad9459']);
    let gothicFrame = null;
    /** 정삼각 뾰족 아치 안쪽인지(폭 x0..x1, 받침 높이 ys). */
    function inArch(x, y, o) { const R = o.x1 - o.x0; if (y >= o.ys) return x >= o.x0 && x <= o.x1; return (x - o.x1) ** 2 + (y - o.ys) ** 2 <= R * R && (x - o.x0) ** 2 + (y - o.ys) ** 2 <= R * R; }
    const archAt = (x, y, x0, x1) => inArch(x + 0.5, y + 0.5, { x0, x1, ys: 54 });
    /** 창틀: 바깥 테 어둡게, 가운데 밝게, 안쪽 그늘. */
    function gothicRim(px) {
        for (let y = 0; y < 142; y++) for (let x = 0; x < 64; x++) {
            if (!archAt(x, y, 6, 58) || archAt(x, y, 11, 53)) continue;
            px(x, y, !archAt(x, y, 7, 57) ? GOLD_LOW[0] : archAt(x, y, 10, 54) ? GOLD_LOW[1] : archAt(x, y, 9, 55) ? GOLD_LOW[2] : (x < 32 ? GOLD_LOW[3] : GOLD_LOW[2]));
        }
    }
    /** 아치 머리 유리(옅은 호박빛), 장미창(네 잎), 작은 뾰족 아치 둘. */
    function gothicGlass(g, px) {
        const G = GOLD_LOW;
        g.globalAlpha = 0.45;
        for (let y = 10; y < 56; y++) for (let x = 11; x < 54; x++) if (archAt(x, y, 11, 53)) px(x, y, (x + y) % 7 ? '#3b2e1c' : '#5e4626');
        g.globalAlpha = 1;
        const ring = (cx, cy, r, c) => { for (let a = 0; a < TAU; a += 0.06) px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), c); };
        ring(32, 27, 7, G[3]); ring(32, 27, 8, G[0]);
        for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) ring(32 + dx, 27 + dy, 2.5, G[4]);
        px(32, 27, G[4]);
        for (const [x0, x1] of [[12, 31], [33, 52]]) gothicSmallArch(px, x0, x1);
    }
    /** 아치 머리 아래의 작은 뾰족 아치 테 하나. */
    function gothicSmallArch(px, x0, x1) {
        for (let y = 36; y < 56; y++) for (let x = x0 - 1; x <= x1 + 1; x++) if (archAt(x, y, x0 - 1, x1 + 1) && !archAt(x, y, x0 + 1, x1 - 1)) px(x, y, GOLD_LOW[2]);
    }
    /** 기둥 금띠, 아치 받침, 창살, 칸막이, 목 받침(반달 홈), 계단 창턱, 꼭대기 십자. */
    function gothicParts(g, px) {
        const G = GOLD_LOW, rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
        for (let y = 66; y < 140; y += 18) { rect(7, y, 4, 1, G[4]); rect(54, y, 4, 1, G[4]); }
        rect(4, 52, 9, 3, G[0]); rect(5, 52, 7, 1, G[4]); rect(52, 52, 9, 3, G[0]); rect(53, 52, 7, 1, G[4]);
        rect(31, 40, 3, 16, G[0]); rect(32, 40, 1, 16, G[3]);
        rect(10, 56, 45, 4, G[0]); rect(10, 57, 45, 2, G[2]); rect(10, 57, 45, 1, G[4]);
        rect(10, 101, 45, 9, G[0]); rect(10, 102, 45, 7, G[1]); rect(10, 102, 45, 1, G[3]);
        g.clearRect(27, 102, 11, 4);
        for (let a = 0; a <= Math.PI; a += 0.05) px(Math.round(32 + Math.cos(a) * 6), Math.round(102 + Math.sin(a) * 5), G[0]);
        rect(3, 140, 58, 4, G[0]); rect(4, 140, 56, 1, G[3]); rect(4, 141, 56, 2, G[1]); rect(1, 144, 62, 6, G[0]); rect(2, 144, 60, 1, G[3]); rect(2, 145, 60, 4, G[1]);
        rect(31, 0, 3, 11, G[0]); rect(32, 1, 1, 9, G[4]); rect(28, 3, 9, 3, G[0]); rect(29, 4, 7, 1, G[4]);
    }
    /** 고딕 창문 모양 단두대 틀(64×152, 가운데 x32, 바닥 y150, 목 받침 y102): 한 번 그려 둔다. */
    function guillotineFrame() {
        if (gothicFrame) return gothicFrame;
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 152;
        const g = canvas.getContext('2d'), px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
        gothicRim(px);
        gothicParts(g, px);
        gothicGlass(g, px);
        gothicFrame = canvas;
        return canvas;
    }
    /** 칼날(40×24): 등의 금띠와 네 잎 무늬, 두 단의 몸, 비스듬한 날과 날 끝 옅은 금. */
    function guillotineBlade(g, by) {
        const G = GOLD_LOW;
        for (let i = 0; i < 40; i++) {
            const xx = -20 + i, edge = Math.round(14 + i * 0.3);
            g.fillStyle = G[0]; g.fillRect(xx, by - 1, 1, edge + 2);
            g.fillStyle = G[2]; g.fillRect(xx, by + 4, 1, edge - 4); g.fillStyle = G[3]; g.fillRect(xx, by + 5, 1, Math.max(1, edge - 9));
            g.fillStyle = G[1]; g.fillRect(xx, by, 1, 4); g.fillStyle = G[4]; g.fillRect(xx, by + 1, 1, 1); g.fillRect(xx, by + edge - 3, 1, 2); g.fillStyle = '#c7b27a'; g.fillRect(xx, by + edge - 1, 1, 1);
        }
        g.fillStyle = '#c7b27a';
        for (const [dx, dy] of [[0, 1], [-1, 2], [1, 2], [0, 3]]) g.fillRect(dx, by + dy, 1, 1);
        g.fillStyle = G[2]; g.fillRect(-12, by + 2, 1, 1); g.fillRect(12, by + 2, 1, 1);
    }
    function guillotineSparks(g, t, by, fade) {
        const r = S.random(13 + Math.floor(t / 40)), L = S.ramp('light');
        g.globalAlpha = fade * 0.85;
        for (let b = 0; b < 3; b++) {
            let bx = r() < 0.5 ? -19 : 19, byy = by + r() * 22;
            const dir = bx < 0 ? -1 : 1;
            g.fillStyle = b ? L[3] : L[5];
            for (let s = 0; s < 3; s++) { const x2 = bx + dir * (3 + r() * 6), y2 = byy + (r() - 0.5) * 8; S.line(bx, byy, x2, y2, dot(g)); bx = x2; byy = y2; }
        }
    }
    /** 신성한 단두대 하나: 대상 위에 고딕 창문 모양의 틀이 내려와 서고, 번개를 두른 칼날이 가속하며 떨어져 0.15초에 목 받침에 닿는다. */
    function spellGuillotine(at, delay) {
        const DROP = 150, STAY = 140, FADE = 160, H = S.ramp('holy');
        S.hang(at, { life: DROP + STAY + FADE, delay, top(g, t) {
            const down = Math.min(1, t / 90), fade = t < DROP + STAY ? 1 : Math.max(0, 1 - (t - DROP - STAY) / FADE), top = -150 + Math.round((1 - down) * -30);
            g.save(); g.globalAlpha = fade * Math.min(1, t / 60);
            g.drawImage(guillotineFrame(), -32, top);
            const u = Math.min(1, Math.max(0, (t - 70) / (DROP - 70))), by = Math.round(top + 61 + 19 * u * u);
            guillotineBlade(g, by);
            if (t > 50 && t < DROP + STAY) guillotineSparks(g, t, by, fade);
            if (t >= DROP && t < DROP + 80) { const k = (t - DROP) / 80; g.globalAlpha = (1 - k) * 0.8; g.fillStyle = H[5]; g.fillRect(-22, -38, 44, 2); g.fillRect(-1, -50 - k * 10, 2, 14 + k * 20); }
            g.restore();
        } });
    }

    // ---------------------------------------------------------------- lances and arrows (신성한 기도, 화살비)
    /** 빛의 창: 대상 머리 위 높은 곳에서 창끝을 아래로 0.17초에 떨어져 꽂히고, 위로 빛 꼬리, 둘레로 번개 가지. 꽂히는 순간 타격 클립. */
    function spellFallSpear(o) {
        const FALL = 170, STAY = 300, C = S.ramp('light');
        if (o.hit) stageSkillVfx.play(o.hit, { ...o.at, dy: 0 }, { delay: o.delay + FALL, ramp: o.ramp });
        S.hang(o.at, { life: FALL + STAY + 160, delay: o.delay,
            ground(g, t) { if (t > FALL) { g.globalAlpha = 0.5 * (t < FALL + STAY ? 1 : Math.max(0, 1 - (t - FALL - STAY) / 160)); g.fillStyle = C[3]; g.beginPath(); g.ellipse(0, 0, 14, 5, 0, 0, TAU); g.fill(); g.globalAlpha = 1; } },
            top(g, t) {
                const u = Math.min(1, t / FALL), y = -2 - 180 * (1 - u * u), fade = t < FALL + STAY ? 1 : Math.max(0, 1 - (t - FALL - STAY) / 160);
                g.save(); g.globalAlpha *= fade; stageSkillDraws.body(g, 'spear', { x: 0, y: y - 4, dot: 1, face: 1, angle: Math.PI / 2, t, element: o.element }); g.restore();
                if (t < FALL) { g.globalAlpha = 0.5; g.fillStyle = C[4]; g.fillRect(0, Math.round(y - 100), 1, Math.round(60 * u)); }
                const r = S.random(91 + Math.floor(t / 45));
                g.globalAlpha = fade * 0.85;
                for (let b = 0; b < 3; b++) {
                    let bx = (r() - 0.5) * 6, by = y - 20 - r() * 50;
                    const dir = r() < 0.5 ? -1 : 1;
                    g.fillStyle = b ? C[3] : C[5];
                    for (let s = 0; s < 3; s++) { const x2 = bx + dir * (3 + r() * 7), y2 = by + (r() - 0.5) * 8; S.line(bx, by, x2, y2, dot(g)); bx = x2; by = y2; }
                }
                g.globalAlpha = 1;
            } });
    }
    /** 화살 하나(나무 살, 강철 촉, 흰 깃): a는 날아가는 쪽. streak이면 뒤로 옅은 줄. */
    function rainArrow(g, o) {
        const c = Math.cos(o.a), s = Math.sin(o.a), put = (d, w, col) => { g.fillStyle = col; g.fillRect(Math.round(o.x - c * d), Math.round(o.y - s * d), w, w); };
        if (o.streak) for (let d = 26; d < 46; d += 2) { g.globalAlpha = o.alpha * 0.35 * (1 - (d - 26) / 20); put(d, 1, '#e8e2d6'); }
        g.globalAlpha = o.alpha;
        for (let d = 2; d < 22; d++) put(d, 1, d % 5 ? '#b08858' : '#8a6b48');
        put(0, 2, '#cfd3dc'); put(-1, 1, '#f1ece2'); put(1, 2, '#9aa1ad');
        g.fillStyle = '#e8e2d6';
        for (const off of [-1, 1]) { g.fillRect(Math.round(o.x - c * 21 - s * off * 2), Math.round(o.y - s * 21 + c * off * 2), 1, 1); g.fillRect(Math.round(o.x - c * 19 - s * off * 2), Math.round(o.y - s * 19 + c * off * 2), 1, 1); }
        g.globalAlpha = 1;
    }
    /** 화살비의 쏘아 올림: 활에서 화살 다섯 발이 하늘로 솟아 화면 위로 사라진다. */
    function spellVolleyUp(at, face, delay) {
        S.hang(at, { life: 300, delay, top(g, t) {
            const k = t / 300;
            for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + face * (0.18 + i * 0.07), d = 30 + k * 420 + i * 12; rainArrow(g, { x: face * 22 + Math.cos(a) * d, y: -62 + Math.sin(a) * d, a, alpha: 1 - k * 0.6, streak: true }); }
        } });
    }
    /** 화살비: 범위 타원 안의 무작위 자리로 화살이 위 뒤쪽에서 비스듬히 0.13초에 떨어져 꽂히고, 0.35초 꽂혀 있다 옅어진다. 꽂힐 때 작은 흙먼지.
     * @param {{at:object, face:number, radius:number, ms:number}} o 범위 가운데, 반지름(칸), 비가 내리는 시간 */
    function spellArrowRain(o) {
        const A = (o.radius + 0.5) * WIDE, B = (o.radius + 0.5) * DEEP, r = S.random(2468), N = 26, FALL = 130, STICK = 350;
        const arrows = [...Array(N)].map((_, i) => { const a = r() * TAU, d = Math.sqrt(r()) * 0.95; return { x: Math.cos(a) * A * d, y: Math.sin(a) * B * d, t0: (i / N) * (o.ms - FALL - 60) + r() * 40, ang: Math.PI / 2 - o.face * (0.32 + r() * 0.12) }; });
        arrows.sort((p, q) => p.y - q.y);
        S.hang(o.at, { life: o.ms + STICK + 200,
            ground(g, t) {
                for (const a of arrows) {
                    const k = (t - a.t0 - FALL) / 160;
                    if (k < 0 || k >= 1) continue;
                    g.globalAlpha = 0.6 * (1 - k); g.fillStyle = '#a69886';
                    for (let q = 0; q < 4; q++) g.fillRect(Math.round(a.x + (q - 1.5) * (3 + k * 6)), Math.round(a.y - 1 - k * 3 * (q % 2)), 1, 1);
                }
                g.globalAlpha = 1;
            },
            top(g, t) { for (const a of arrows) rainArrowAt(g, a, t - a.t0, { FALL, STICK }); } });
    }
    function rainArrowAt(g, a, lt, o) {
        if (lt < 0) return;
        const c = Math.cos(a.ang), s = Math.sin(a.ang);
        if (lt < o.FALL) { const d = (1 - lt / o.FALL) * 170; rainArrow(g, { x: a.x - c * d, y: a.y - s * d, a: a.ang, alpha: 0.95, streak: true }); }
        else if (lt < o.FALL + o.STICK + 160) rainArrow(g, { x: a.x - c * 6, y: a.y - s * 6, a: a.ang, alpha: lt < o.FALL + o.STICK ? 1 : 1 - (lt - o.FALL - o.STICK) / 160, streak: false });   // 촉이 바닥에 박힌 채 남는다
    }

    // ---------------------------------------------------------------- cosmos (차원찢기)
    const NEBULA = Object.freeze(['#7a3fd0', '#3b2a9c', '#b04aa0', '#2a6fb0']);
    function cosmosInside(g, c, t, o) {
        g.globalAlpha = o.inner; g.fillStyle = '#07040f'; g.beginPath(); g.arc(0, 0, o.rr, 0, TAU); g.fill();
        g.save(); g.beginPath(); g.arc(0, 0, o.rr, 0, TAU); g.clip();
        for (const [a, d, s, col] of c.neb) { const aa = a + t / 1400; g.globalAlpha = 0.45 * o.inner; g.fillStyle = col; g.beginPath(); g.ellipse(Math.cos(aa) * o.rr * d, Math.sin(aa) * o.rr * d * 0.8, o.rr * s, o.rr * s * 0.55, aa, 0, TAU); g.fill(); }
        for (const [a, d, s, ph] of c.stars) { const aa = a + t / 1800; g.globalAlpha = o.inner * (0.5 + 0.5 * Math.sin(t / 110 + ph)); g.fillStyle = s > 1 ? '#fff6ff' : '#d9c8ff'; g.fillRect(Math.round(Math.cos(aa) * o.rr * d), Math.round(Math.sin(aa) * o.rr * d), s, s); }
        g.restore();
        g.globalAlpha = o.inner * 0.95; g.strokeStyle = c.E.c1; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, o.rr, 0, TAU); g.stroke();   // 보라 테두리
        g.globalAlpha = o.inner * 0.6; g.strokeStyle = c.E.c2; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, o.rr + 2, -0.6 + t / 300, 1.6 + t / 300); g.stroke();
    }
    function cosmosRadius(o, t) {
        const grow = Math.min(1, t / 120);
        if (o.mode === 'burst') return o.R * (0.35 + 0.65 * (1 - (1 - grow) * (1 - grow))) * (1 + Math.max(0, t - 160) / 900);
        return o.R * (1 - (1 - grow) * (1 - grow)) * Math.max(0, Math.min(1, (o.life - t) / 140));
    }
    /** 차원찢기의 우주 구체: 검은 구 안에 성운 네 덩이가 천천히 돌고 별이 반짝인다. close는 커졌다 오그라들며 닫히고, open은 열렸다 닫히고,
     * burst는 크게 부풀며 테두리가 흩어지고 별이 바깥으로 튄다. @param {{at:object, R:number, delay:number, life:number, mode:string}} o */
    function spellCosmos(o) {
        const r = S.random(4242 + Math.round(o.R)), c = { E: S.ink('chaos'),
            stars: [...Array(46)].map(() => [r() * TAU, Math.sqrt(r()), r() < 0.3 ? 2 : 1, r() * TAU]), neb: NEBULA.map(col => [r() * TAU, 0.25 + r() * 0.45, 0.35 + r() * 0.3, col]) };
        S.hang({ ...o.at, dy: -46 }, { life: o.life, delay: o.delay, top(g, t) {
            const rr = cosmosRadius(o, t), inner = o.mode === 'burst' ? Math.max(0, 1 - Math.max(0, t - 140) / 260) : 1;
            if (rr < 1) return;
            g.globalAlpha = 0.35 * inner; g.fillStyle = c.E.c2; g.beginPath(); g.arc(0, 0, rr + 4, 0, TAU); g.fill();   // 빛무리
            if (inner > 0.02) cosmosInside(g, c, t, { rr, inner });
            if (o.mode === 'burst' && t > 140) {
                const k = Math.min(1, (t - 140) / (o.life - 140));
                for (const [a, d, s] of c.stars) { const dd = rr * (0.6 + d * 0.9) * (1 + k * 1.2); g.globalAlpha = 1 - k; g.fillStyle = s > 1 ? '#fff6ff' : c.E.c1; g.fillRect(Math.round(Math.cos(a) * dd), Math.round(Math.sin(a) * dd * 0.6), s, s); }
            }
            g.globalAlpha = 1;
        } });
    }

    // ---------------------------------------------------------------- glass (빈 플라스크)
    const GLASS = Object.freeze({ OL: '#16211f', RIM: '#779186', GLS: '#8da6a1', HI: '#ccf4d2', WH: '#f4fff6' });
    const SHARD_SHAPES = Object.freeze([[[0, 7], [20, 0], [15, 9], [4, 13]], [[0, 4], [16, 0], [19, 8], [6, 12]], [[1, 8], [9, 0], [18, 4], [13, 13], [4, 14]]]);
    const shardSprites = new Map();
    function insidePolygon(shape, x, y) {
        let c = false;
        for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) { const [xi, yi] = shape[i], [xj, yj] = shape[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
        return c;
    }
    const shardInk = (edge, v, topEdge) => (edge ? (v < 0.4 && topEdge ? GLASS.RIM : GLASS.OL) : v < 0.33 ? GLASS.HI : v < 0.62 ? GLASS.GLS : GLASS.RIM);
    /** 유리 조각 그림(21×15) 셋 가운데 하나: 테두리, 밝은 면에서 어두운 면, 날 끝 반짝임. */
    function shardSprite(k) {
        const key = k % 3;
        if (shardSprites.has(key)) return shardSprites.get(key);
        const shape = SHARD_SHAPES[key], W = 21, H = 15, canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const g = canvas.getContext('2d'), on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && insidePolygon(shape, x + 0.5, y + 0.5);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            if (!on(x, y)) continue;
            const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1);
            g.fillStyle = shardInk(edge, (x / W + y / H) / 2, !on(x, y - 1)); g.fillRect(x, y, 1, 1);
        }
        const [gx, gy] = shape[1];
        g.fillStyle = GLASS.WH; g.fillRect(Math.min(W - 2, gx - 2), gy + 1, 2, 1); g.fillRect(Math.min(W - 1, gx - 1), gy + 2, 1, 1);
        const sprite = { canvas, cx: W / 2, cy: H / 2 };
        shardSprites.set(key, sprite);
        return sprite;
    }
    /** 병이 깨지는 자리: 흰 십자 반짝임과 작은 유리 조각 여덟 개가 튀었다 떨어진다(0.42초). */
    function spellGlassBreak(at) {
        const r = S.random(5150), bits = [], colours = ['#ccf4d2', '#8da6a1', '#f4fff6', '#779186'];
        for (let i = 0; i < 8; i++) { const a = -Math.PI * (0.1 + 0.8 * r()), sp = 30 + r() * 50; bits.push([Math.cos(a) * sp * (r() < 0.5 ? -1 : 1), Math.sin(a) * sp, 1 + (r() < 0.4 ? 1 : 0), colours[i % 4]]); }
        S.hang(at, { life: 420, top(g, t) {
            const s = t / 1000;
            if (t < 110) { const rr = t < 50 ? 6 : 4; g.globalAlpha = 0.9; g.fillStyle = GLASS.WH; g.fillRect(-rr, -22, rr * 2 + 1, 1); g.fillRect(0, -22 - rr, 1, rr * 2 + 1); }
            for (const [vx, vy, sz, c] of bits) { const y = -22 + vy * s + 260 * s * s; if (y > 2) continue; g.globalAlpha = Math.max(0, 1 - t / 420); g.fillStyle = c; g.fillRect(Math.round(vx * s), Math.round(y), sz, sz); }
            g.globalAlpha = 1;
        } });
    }
    function shardPut(g, sprite, p, o) { g.save(); g.globalAlpha = o.alpha; g.translate(Math.round(p.x), Math.round(p.y - p.h)); g.rotate(o.rot); g.drawImage(sprite.canvas, -sprite.cx, -sprite.cy); g.restore(); }
    /** 날아가는 유리 조각 하나: 깨진 자리에서 포물선으로 날아 그 적의 몸에 꽂힌다(빗나가면 바닥에 떨어져 잠깐 남는다). 잔상 둘과 반짝이는 꼬리선,
     * 바닥에 그림자. @param {{at:object, to:{dx:number,dy:number}, k:number, ms:number, hit:boolean}} o 깨진 자리, 닿는 자리(도트), 조각 번호, 나는 시간 */
    function spellGlassShard(o) {
        const x0 = (o.k - 1) * 6, h1 = o.hit ? 46 : 0, dist = Math.hypot(o.to.dx - x0, o.to.dy * 2), peak = 20 + dist * 0.15, spin = o.k % 2 ? -1 : 1, sprite = shardSprite(o.k);
        const pos = t => { const u = Math.min(1, Math.max(0, t / o.ms)); return { u, x: x0 + (o.to.dx - x0) * u, y: o.to.dy * u, h: 12 + (h1 - 12) * u + Math.sin(u * Math.PI) * peak }; };
        const step = t => spin * Math.floor(t / 45) * Math.PI / 4;
        S.hang(o.at, { life: o.ms + (o.hit ? 0 : 320),
            ground(g, t) { const p = pos(t); if (p.u < 1) { g.globalAlpha = 0.35; g.fillStyle = '#0a0810'; g.beginPath(); g.ellipse(Math.round(p.x), Math.round(p.y) + 1, 5, 2, 0, 0, TAU); g.fill(); g.globalAlpha = 1; } },
            top(g, t) {
                const p = pos(t);
                if (p.u >= 1) { if (!o.hit) shardPut(g, sprite, p, { alpha: Math.max(0, 1 - (t - o.ms) / 320), rot: spin * Math.PI / 4 }); return; }
                for (const [dt, alpha] of [[50, 0.18], [25, 0.38]]) if (t - dt > 0) shardPut(g, sprite, pos(t - dt), { alpha, rot: step(t - dt) });   // 잔상
                const q = pos(Math.max(0, t - 70));
                g.globalAlpha = 0.55; g.strokeStyle = GLASS.HI; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(q.x) + 0.5, Math.round(q.y - q.h) + 0.5); g.lineTo(Math.round(p.x) + 0.5, Math.round(p.y - p.h) + 0.5); g.stroke(); g.globalAlpha = 1;
                shardPut(g, sprite, p, { alpha: 1, rot: step(t) });
            } });
    }

    // ---------------------------------------------------------------- movement trails (돌진, 섬머솔트 슬래시)
    /** 돌진: 달리는 동안 몸 앞에 밀려나는 공기 활(가운데가 앞으로 볼록)과 발밑에 남는 먼지. follow는 달리는 주인공의 자리. */
    function spellCharge(o) {
        const C = S.ramp('phys'), puffs = [];
        S.hang(o.at, { life: o.ms + 260, follow: o.follow,
            ground(g, t) {
                if (t <= o.ms && (!puffs.length || t - puffs[puffs.length - 1].t0 > 60)) puffs.push({ spot: o.follow(), t0: t });
                const here = o.follow();
                for (const p of puffs) {
                    const k = (t - p.t0) / 280;
                    if (k < 0 || k > 1) continue;
                    const x = (p.spot.gx - here.gx) * WIDE - o.face * 14, y = (p.spot.gy - here.gy) * DEEP, r = 2 + k * 5;
                    g.globalAlpha = 0.5 * (1 - k); g.fillStyle = k < 0.3 ? '#e4ddd2' : '#a39d92'; g.fillRect(Math.round(x - r), Math.round(y - 1 - k * 5), Math.round(r * 2), 2);
                }
                g.globalAlpha = 1;
            },
            top(g, t) { if (t <= o.ms + 120) chargeBow(g, C, { a: t > o.ms ? 1 - (t - o.ms) / 120 : Math.min(1, t / 60), face: o.face }); } });
    }
    function chargeBow(g, C, o) {
        for (let yy = -40; yy <= 40; yy++) {
            const k = yy / 40, x = Math.round(o.face * (24 + (1 - k * k) * 12));
            g.globalAlpha = o.a * (0.3 + 0.6 * (1 - Math.abs(k))); g.fillStyle = Math.abs(k) < 0.45 ? C[5] : C[4]; g.fillRect(x, Math.round(-46 + yy), 2, 1);
            g.globalAlpha = o.a * 0.3; g.fillStyle = C[3]; g.fillRect(Math.round(x - o.face * 5), Math.round(-46 + yy), 1, 1);
        }
        g.globalAlpha = 1;
    }
    /** 섬머솔트 슬래시: 무기 궤적이 뜬 몸 둘레에 세로 원을 그리고(위에서 앞, 아래, 뒤로), 착지 뒤 0.14초 동안 앞 아래로 더 내려벤다.
     * lift는 그때 몸이 뜬 높이(도트)를 돌려준다. */
    function spellFlipTrail(o) {
        const C = S.ramp('phys'), R0 = 46, N = 90;
        S.hang(o.at, { life: o.ms + 200, follow: o.follow, top(g, t) {
            const head = t <= o.ms ? (t / o.ms) * TAU : TAU + Math.min(1, (t - o.ms) / 140) * Math.PI * 0.55, tail = Math.max(0, head - Math.PI * 0.9);
            const fade = t > o.ms + 60 ? Math.max(0, 1 - (t - o.ms - 60) / 140) : 1, up = o.lift ? o.lift() : 0;
            for (let i = 0; i <= N; i++) {
                const u = i / N, ang = -Math.PI / 2 + tail + (head - tail) * u, w = Math.max(1, Math.round(1 + 4 * u ** 1.3));
                g.globalAlpha = fade * (0.25 + 0.7 * u); g.fillStyle = u > 0.94 ? C[5] : u > 0.6 ? C[4] : u > 0.25 ? C[3] : C[2];
                g.fillRect(Math.round(o.face * R0 * Math.cos(ang)) - (w >> 1), Math.round(-46 - up + R0 * Math.sin(ang)) - (w >> 1), w, w);
            }
            g.globalAlpha = 1;
        } });
    }

    return Object.freeze({ iceRing: spellIceRing, iceRingSpikes: spellIceRingSpikes, iceColumns: spellIceColumns, iceColumn: spellIceColumn, emberShout: spellEmberShout, frostCone: spellFrostCone,
        discharge: spellDischarge, guillotine: spellGuillotine, fallSpear: spellFallSpear, volleyUp: spellVolleyUp, arrowRain: spellArrowRain, cosmos: spellCosmos,
        glassBreak: spellGlassBreak, glassShard: spellGlassShard, charge: spellCharge, flipTrail: spellFlipTrail });
})();
safeExposeGlobals({ stageSkillSpells });
