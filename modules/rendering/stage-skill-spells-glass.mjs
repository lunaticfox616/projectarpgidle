class StageGlassSpells {
    constructor(deps) {
        this.deps = deps;
        this.S = this.deps.stageSkillStrokes;
        this.WIDE = 64;
        this.DEEP = 32;
        this.TAU = Math.PI * 2;
        this.GLASS = Object.freeze({ OL: '#16211f', RIM: '#779186', GLS: '#8da6a1', HI: '#ccf4d2', WH: '#f4fff6' });
        this.SHARD_SHAPES = Object.freeze([[[0, 7], [20, 0], [15, 9], [4, 13]], [[0, 4], [16, 0], [19, 8], [6, 12]], [[1, 8], [9, 0], [18, 4], [13, 13], [4, 14]]]);
        this.shardSprites = new Map();
        this.shardInk = (edge, v, topEdge) => (edge ? (v < 0.4 && topEdge ? this.GLASS.RIM : this.GLASS.OL) : v < 0.33 ? this.GLASS.HI : v < 0.62 ? this.GLASS.GLS : this.GLASS.RIM);
        this.BREAK = Object.freeze({ life: 820, fadeFrom: 520, top: -24, floor: 4, colours: ['#ccf4d2', '#8da6a1', '#f4fff6', '#779186', '#a9c4bd'],
            chips: [[[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]], [[2, 0], [1, 0], [1, 1], [0, 1], [0, 2]], [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]], [[1, 0], [2, 0], [1, 1], [0, 2], [1, 2]]] });
        this.SHARD = Object.freeze({ scale: 1.3, ghostScale: 1.17, ghosts: [[64, 0.16], [32, 0.36]], tail: 55, spin: 60 });
        this.STAB = Object.freeze({ rise: 140, hover: 50, every: 95, dive: 80, stay: 380, fade: 140, scale: 1.2,
            tip: [Math.atan2(-7.5, 9.5), Math.atan2(-7.5, 5.5), Math.atan2(-7.5, -1.5)] });
        this.stabAim = (p, foot) => ({ x: foot.x + p.hx, y: foot.y - p.hy });
        this.stabPut = (g, p, q, o) => this.shardPut(g, this.shardSprite(p.k), { x: q.x, y: q.y, h: 0 }, o);
    }

    insidePolygon(shape, x, y) {
        let c = false;
        for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) { const [xi, yi] = shape[i], [xj, yj] = shape[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
        return c;
    }

    /** 유리 조각 그림(21×15) 셋 가운데 하나: 테두리, 밝은 면에서 어두운 면, 날 끝 반짝임. */
    shardSprite(k) {
        const key = k % 3;
        if (this.shardSprites.has(key)) return this.shardSprites.get(key);
        const shape = this.SHARD_SHAPES[key], W = 21, H = 15, canvas = this.deps.document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const g = canvas.getContext('2d'), on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && this.insidePolygon(shape, x + 0.5, y + 0.5);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            if (!on(x, y)) continue;
            const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1);
            g.fillStyle = this.shardInk(edge, (x / W + y / H) / 2, !on(x, y - 1)); g.fillRect(x, y, 1, 1);
        }
        const [gx, gy] = shape[1];
        g.fillStyle = this.GLASS.WH; g.fillRect(Math.min(W - 2, gx - 2), gy + 1, 2, 1); g.fillRect(Math.min(W - 1, gx - 1), gy + 2, 1, 1);
        const sprite = { canvas, cx: W / 2, cy: H / 2 };
        this.shardSprites.set(key, sprite);
        return sprite;
    }

    /** 튀어 나가는 조각들: 작은 조각과 가루 26개, 유리 파편 그림 7개, 반짝임 별 6개. */
    breakPieces(r) {
        const bits = [], stars = [];
        for (let i = 0; i < 26; i++) {
            const a = (i / 26) * this.TAU + (r() - 0.5) * 0.45, sp = 80 + r() * 150, big = i % 3 === 0;
            bits.push({ x: 0, y: this.BREAK.top, vx: Math.cos(a) * sp * 1.3, vy: Math.sin(a) * sp * 0.7 - 110 - r() * 90, size: big ? 3 : (r() < 0.45 ? 2 : 1), c: this.BREAK.colours[i % 5], big, turn: (r() * 4) | 0, floor: this.BREAK.floor + (r() - 0.5) * 16, bounces: 0, spin: r() < 0.5 ? -1 : 1 });
        }
        for (let i = 0; i < 7; i++) {   // 큰 파편: 유리 파편 그림(0.55~0.7배)이 멀리 튀며 45°씩 돈다
            const a = (i / 7) * this.TAU + 0.25 + (r() - 0.5) * 0.4, sp = 150 + r() * 110;
            bits.push({ x: 0, y: this.BREAK.top, vx: Math.cos(a) * sp * 1.25, vy: Math.sin(a) * sp * 0.55 - 170 - r() * 80, sprite: i % 3, scale: 0.55 + r() * 0.15, turn: (r() * 8) | 0, floor: this.BREAK.floor + (r() - 0.5) * 22, bounces: 0, spin: r() < 0.5 ? -1 : 1 });
        }
        for (let i = 0; i < 6; i++) stars.push({ t0: 40 + i * 60 + r() * 30, dx: (r() - 0.5) * 84, dy: -6 - r() * 44, size: r() < 0.4 ? 3 : 2 });
        return { bits, stars };
    }

    /** 떨어지며 바닥에 한두 번 튄다(튄 뒤에는 멈춘다). */
    breakStep(bits, dt) {
        for (const b of bits) {
            if (b.bounces >= 2) continue;
            b.vy += 600 * dt; b.vx *= 0.99; b.x += b.vx * dt; b.y += b.vy * dt;
            if (b.y > b.floor && b.vy > 0) { b.y = b.floor; b.bounces++; b.vy *= -0.32; b.vx *= 0.45; if (Math.abs(b.vy) < 30) b.bounces = 2; }
        }
    }

    /** 바닥: 퍼지는 유리 가루 점선 고리와 깨진 자리의 옅은 자국. */
    breakGround(g, t, out) {
        if (t < 340) {
            const u = t / 340, A = 8 + 46 * Math.sqrt(u), B = A * 0.38;
            g.globalAlpha = 0.6 * (1 - u); g.fillStyle = '#a9c4bd';
            for (let i = 0; i < 32; i += 2) { const a = i / 32 * this.TAU; g.fillRect(Math.round(Math.cos(a) * A), Math.round(this.BREAK.floor - 2 + Math.sin(a) * B), 1, 1); }
        }
        g.globalAlpha = 0.35 * out; g.fillStyle = '#779186'; g.beginPath(); g.ellipse(0, this.BREAK.floor - 1, 12, 3, 0, 0, this.TAU); g.fill(); g.globalAlpha = 1;
    }

    /** 깨지는 순간: 흰 마름모 심, 십자, 사선 빛살(0.14초). */
    breakFlash(g, t) {
        const k = t < 50 ? 1 : 1 - (t - 50) / 90, rr = Math.round(2 + 4 * k), L = Math.round(6 + 9 * k), Y = this.BREAK.top;
        g.globalAlpha = 0.95 * k; g.fillStyle = this.GLASS.WH;
        for (let i = -rr; i <= rr; i++) { const w = rr - Math.abs(i); g.fillRect(-w, Y + i, w * 2 + 1, 1); }
        g.fillStyle = this.GLASS.HI; g.fillRect(-L, Y, L * 2 + 1, 1); g.fillRect(0, Y - L, 1, L * 2 + 1);
        for (let s = rr + 1; s <= Math.round(L * 0.6); s++) { g.fillRect(s, Y - s, 1, 1); g.fillRect(-s, Y - s, 1, 1); g.fillRect(s, Y + s, 1, 1); g.fillRect(-s, Y + s, 1, 1); }
    }

    /** 조각 하나: 유리 파편 그림, 3×3 비스듬한 조각(어두운 그림자 테와 밝은 모서리, 날며 90°씩 돈다), 또는 가루 한 점. 멈춘 조각은 깜빡인다. */
    breakBit(g, b, t) {
        const bit = { x: Math.round(b.x), y: Math.round(b.y), still: b.bounces >= 2 };
        bit.blink = bit.still && ((Math.floor(t / 80) + b.turn) % 4 === 0);
        if (b.sprite !== undefined) this.breakSprite(g, b, bit, t);
        else if (b.big) this.breakChip(g, b, bit, t);
        else { g.fillStyle = bit.blink ? this.GLASS.WH : b.c; g.fillRect(bit.x, bit.y - b.size + 1, b.size, b.size); }
    }

    breakSprite(g, b, bit, t) {
        const rot = (b.turn + (bit.still ? 0 : Math.floor(t / 50) * b.spin)) * Math.PI / 4;
        this.shardPut(g, this.shardSprite(b.sprite), { x: bit.x, y: bit.y - 3, h: 0 }, { alpha: g.globalAlpha, rot, scale: b.scale });
        if (bit.blink) { g.fillStyle = this.GLASS.WH; g.fillRect(bit.x - 2, bit.y - 3, 5, 1); g.fillRect(bit.x, bit.y - 5, 1, 5); }
    }

    breakChip(g, b, bit, t) {
        const chip = this.BREAK.chips[(b.turn + (bit.still ? 0 : Math.floor(t / 55) * b.spin) + 8) & 3];
        g.fillStyle = this.GLASS.OL; for (const [i, j] of chip) g.fillRect(bit.x + i - 1, bit.y + j, 1, 1);
        g.fillStyle = b.c; for (const [i, j] of chip) g.fillRect(bit.x + i - 1, bit.y + j - 1, 1, 1);
        g.fillStyle = bit.blink ? this.GLASS.WH : this.GLASS.HI; g.fillRect(bit.x + chip[0][0] - 1, bit.y + chip[0][1] - 1, 1, 1);
    }

    /** 반짝임 별: 짧게 켜졌다 꺼진다. */
    breakStars(g, t, stars, out) {
        for (const s of stars) {
            const u = (t - s.t0) / 110;
            if (u < 0 || u > 1) continue;
            const k = u < 0.5 ? u * 2 : (1 - u) * 2, x = Math.round(s.dx), y = Math.round(this.BREAK.top + s.dy), L = Math.max(1, Math.round(s.size * k));
            g.globalAlpha = 0.9 * out; g.fillStyle = this.GLASS.WH; g.fillRect(x - L, y, L * 2 + 1, 1); g.fillRect(x, y - L, 1, L * 2 + 1);
        }
    }

    spellGlassBreak(at) {
        const closureView = this;
        const { bits, stars } = this.breakPieces(this.S.random(5150 + Math.floor(at.gx * 97 + at.gy * 31))), outOf = t => (t < this.BREAK.fadeFrom ? 1 : Math.max(0, 1 - (t - this.BREAK.fadeFrom) / 300));
        let last = 0;
        this.S.hang(at, { life: this.BREAK.life,
            ground(g, t) { closureView.breakGround(g, t, outOf(t)); },
            top(g, t) {
                closureView.breakStep(bits, Math.max(0, t - last) / 1000); last = t;
                if (t < 140) closureView.breakFlash(g, t);
                g.globalAlpha = outOf(t);
                for (const b of bits) { g.globalAlpha = outOf(t); closureView.breakBit(g, b, t); }
                closureView.breakStars(g, t, stars, outOf(t));
                g.globalAlpha = 1;
            } });
    }

    shardPut(g, sprite, p, o) { g.save(); g.globalAlpha = o.alpha; g.translate(Math.round(p.x), Math.round(p.y - p.h)); g.rotate(o.rot); g.imageSmoothingEnabled = false; g.scale(o.scale, o.scale); g.drawImage(sprite.canvas, -sprite.cx, -sprite.cy); g.restore(); }

    /** 날아가는 유리 조각 하나: 깨진 자리에서 포물선으로 날아 그 적의 몸에 꽂힌다(빗나가면 바닥에 떨어져 잠깐 남는다). 잔상 둘과 반짝이는 꼬리선,
     * 바닥에 그림자. @param {{at:object, to:{dx:number,dy:number}, k:number, ms:number, hit:boolean}} o 깨진 자리, 닿는 자리(도트), 조각 번호, 나는 시간 */
    spellGlassShard(o) {
        const closureView = this;
        const x0 = (o.k - 1) * 6, h1 = o.hit ? 46 : 0, dist = Math.hypot(o.to.dx - x0, o.to.dy * 2), peak = 20 + dist * 0.15, spin = o.k % 2 ? -1 : 1, sprite = this.shardSprite(o.k);
        const pos = t => { const u = Math.min(1, Math.max(0, t / o.ms)); return { u, x: x0 + (o.to.dx - x0) * u, y: o.to.dy * u, h: 12 + (h1 - 12) * u + Math.sin(u * Math.PI) * peak }; };
        const step = t => spin * Math.floor(t / this.SHARD.spin) * Math.PI / 4;
        this.S.hang(o.at, { life: o.ms + (o.hit ? 0 : 320),
            ground(g, t) { const p = pos(t); if (p.u < 1) { g.globalAlpha = 0.3; g.fillStyle = '#0a0810'; g.beginPath(); g.ellipse(Math.round(p.x), Math.round(p.y) + 1, 6, 2, 0, 0, closureView.TAU); g.fill(); g.globalAlpha = 1; } },
            top(g, t) {
                const p = pos(t);
                if (p.u >= 1) { if (!o.hit) closureView.shardPut(g, sprite, p, { alpha: Math.max(0, 1 - (t - o.ms) / 320), rot: spin * Math.PI / 4, scale: closureView.SHARD.scale }); return; }
                for (const [dt, alpha] of closureView.SHARD.ghosts) if (t > dt) closureView.shardPut(g, sprite, pos(t - dt), { alpha, rot: step(t - dt), scale: closureView.SHARD.ghostScale });   // 잔상
                const q = pos(Math.max(0, t - closureView.SHARD.tail));
                g.globalAlpha = 0.6; g.strokeStyle = closureView.GLASS.HI; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.round(q.x) + 0.5, Math.round(q.y - q.h) + 0.5); g.lineTo(Math.round(p.x) + 0.5, Math.round(p.y - p.h) + 0.5); g.stroke(); g.globalAlpha = 1;
                closureView.shardPut(g, sprite, p, { alpha: 1, rot: step(t), scale: closureView.SHARD.scale });
            } });
    }

    // 유리 조각 그림 셋의 날 끝 방향
    stabPlan(j, rate) {
        const r = this.S.random(7300 + j * 97), side = (j % 2 ? -1 : 1) * (j % 4 > 1 ? 0.6 : 1), dive0 = (this.STAB.rise + this.STAB.hover + j * this.STAB.every) / rate;
        const apex = { x: side * (24 + r() * 18), y: -84 - r() * 22 - (j % 3) * 6 };
        return { r, j, side, k: (j + 1) % 3, rise: this.STAB.rise / rate, dive0, dive: this.STAB.dive / rate, end: dive0 + this.STAB.dive / rate, apex, hy: 30 + r() * 24, hx: -side * (2 + r() * 4) };
    }

    stabPos(p, t, aim) {
        if (t <= p.rise) { const u = t / p.rise, e = 1 - (1 - u) * (1 - u); return { x: p.apex.x * e, y: -24 + (p.apex.y + 24) * e }; }
        if (t <= p.dive0) return { x: p.apex.x, y: p.apex.y + Math.sin((t - p.rise) / 60) * 1.5 };
        const e = Math.min(1, (t - p.dive0) / p.dive) ** 2;
        return { x: p.apex.x + (aim.x - p.apex.x) * e, y: p.apex.y + (aim.y - p.apex.y) * e };
    }

    stabTrack(p, s, t, here) {
        if (!s.target && t >= p.dive0) this.stabDive(p, s, here);
        if (s.target && !s.dead && here && t < p.end) s.target = this.stabAim(p, here);   // 내리꽂히는 동안 적을 따라간다
        if (!s.hit && t >= p.end) this.stabLand(s, here);
    }

    /** 내리꽂기 시작: 그 적을 겨눈다(그새 쓰러졌으면 옆 바닥으로). */
    stabDive(p, s, here) {
        s.dead = !here;
        s.target = here ? this.stabAim(p, here) : { x: p.apex.x + p.side * 10, y: (p.r() - 0.5) * 18 };
        s.rot = Math.atan2(s.target.y - p.apex.y, s.target.x - p.apex.x);
    }

    stabLand(s, here) {
        s.hit = true;
        if (!s.dead && here) s.stuck = { x: s.target.x - here.x, y: s.target.y - here.y };
        else s.dead = true;
    }

    /** 솟아오르고 떠 있는 동안: 45°씩 돌다가 꽂히기 직전 그 적을 겨누고 반짝인다. */
    stabRising(g, p, t, here) {
        const q = this.stabPos(p, t, null), toward = here ? { x: here.x + p.hx, y: here.y - p.hy } : { x: p.apex.x, y: 0 };
        const rot = t < p.dive0 - 50 ? (p.j % 2 ? -1 : 1) * Math.floor(t / 45) * Math.PI / 4 : Math.atan2(toward.y - p.apex.y, toward.x - p.apex.x) - this.STAB.tip[p.k];
        if (t < p.rise) for (const [dt, a] of [[40, 0.35], [80, 0.18]]) if (t > dt) this.stabPut(g, p, this.stabPos(p, t - dt, null), { alpha: a, rot, scale: this.STAB.scale * 0.9 });
        this.stabPut(g, p, q, { alpha: 1, rot, scale: this.STAB.scale });
        if (t >= p.dive0 - 50 && Math.floor(t / 40) % 2 === 0) { g.globalAlpha = 0.85; g.fillStyle = this.GLASS.WH; g.fillRect(Math.round(q.x) - 2, Math.round(q.y), 5, 1); g.fillRect(Math.round(q.x), Math.round(q.y) - 2, 1, 5); g.globalAlpha = 1; }
    }

    /** 내리꽂히는 동안: 잔상 둘과 꼬리선. */
    stabDiving(g, p, s, t) {
        const rot = s.rot - this.STAB.tip[p.k], q = this.stabPos(p, t, s.target), q2 = this.stabPos(p, t - 40, s.target);
        for (const [dt, a] of [[22, 0.38], [44, 0.18]]) this.stabPut(g, p, this.stabPos(p, t - dt, s.target), { alpha: a, rot, scale: this.STAB.scale * 0.9 });
        g.globalAlpha = 0.6; g.strokeStyle = this.GLASS.HI; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.round(q2.x) + 0.5, Math.round(q2.y) + 0.5); g.lineTo(Math.round(q.x) + 0.5, Math.round(q.y) + 0.5); g.stroke(); g.globalAlpha = 1;
        this.stabPut(g, p, { x: q.x - Math.cos(s.rot) * 6, y: q.y - Math.sin(s.rot) * 6 }, { alpha: 1, rot, scale: this.STAB.scale });
    }

    /** 꽂힌 뒤: 날 끝이 몸에 박힌 채 남고(바닥에 떨어진 조각이면 그 자리에), 꽂힌 순간 흰 베임 줄과 유리 부스러기. */
    stabStuck(g, p, s, t, foot) {
        const tt = t - p.end, a = tt < this.STAB.stay ? 1 : Math.max(0, 1 - (tt - this.STAB.stay) / this.STAB.fade), ux = Math.cos(s.rot), uy = Math.sin(s.rot);
        if (s.dead) { this.stabPut(g, p, s.target, { alpha: a, rot: (p.j % 2 ? -1 : 1) * Math.PI / 4, scale: this.STAB.scale }); return; }
        const bx = foot.x + s.stuck.x, by = foot.y + s.stuck.y;
        this.stabPut(g, p, { x: bx - ux * 7, y: by - uy * 7 }, { alpha: a, rot: s.rot - this.STAB.tip[p.k], scale: this.STAB.scale });
        if (tt >= 70) return;
        const k = 1 - tt / 70, L = Math.round(3 + 4 * k);
        g.globalAlpha = 0.9 * k; g.fillStyle = this.GLASS.WH;
        for (let i = -L; i <= L; i++) g.fillRect(Math.round(bx - uy * i), Math.round(by + ux * i), 1, 1);
        g.fillStyle = this.GLASS.HI;
        for (let i = 0; i < 4; i++) { const aa = s.rot + Math.PI + (i - 1.5) * 0.6, d = 3 + tt * 0.12 * (1 + i % 2); g.fillRect(Math.round(bx + Math.cos(aa) * d), Math.round(by + Math.sin(aa) * d + tt * tt * 0.0012), 1, 1); }
        g.globalAlpha = 1;
    }

    /** @param {{at:object, foe:Function, j:number, rate:number}} o 깨진 자리, 그 적의 지금 자리(칸, 쓰러졌으면 null)를 돌려주는 함수, 순번, 빠르기 */
    spellGlassStab(o) {
        const closureView = this;
        const p = this.stabPlan(o.j, o.rate || 1), s = { target: null, rot: 0, dead: false, hit: false, stuck: null };
        let foot = null;
        const here = () => { const spot = o.foe(); if (spot) foot = { x: (spot.gx - o.at.gx) * this.WIDE, y: (spot.gy - o.at.gy) * this.DEEP }; return spot ? foot : null; };
        this.S.hang(o.at, { life: p.end + this.STAB.stay + this.STAB.fade,
            ground(g, t) { if (t < p.end) { const q = closureView.stabPos(p, t, s.target || p.apex); g.globalAlpha = 0.28; g.fillStyle = '#0a0810'; g.beginPath(); g.ellipse(Math.round(q.x), 1, 5, 2, 0, 0, closureView.TAU); g.fill(); g.globalAlpha = 1; } },
            top(g, t) {
                const now = here();
                closureView.stabTrack(p, s, t, now);
                if (t < p.dive0) closureView.stabRising(g, p, t, now);
                else if (t < p.end) closureView.stabDiving(g, p, s, t);
                else closureView.stabStuck(g, p, s, t, foot);
            } });
    }

    /** 돌진: 달리는 동안 몸 앞에 밀려나는 공기 활(가운데가 앞으로 볼록)과 발밑에 남는 먼지. follow는 달리는 주인공의 자리. */
    spellCharge(o) {
        const closureView = this;
        const C = this.S.ramp('phys'), puffs = [];
        this.S.hang(o.at, { life: o.ms + 260, follow: o.follow,
            ground(g, t) {
                if (t <= o.ms && (!puffs.length || t - puffs[puffs.length - 1].t0 > 60)) puffs.push({ spot: o.follow(), t0: t });
                const here = o.follow();
                for (const p of puffs) {
                    const k = (t - p.t0) / 280;
                    if (k < 0 || k > 1) continue;
                    const x = (p.spot.gx - here.gx) * closureView.WIDE - o.face * 14, y = (p.spot.gy - here.gy) * closureView.DEEP, r = 2 + k * 5;
                    g.globalAlpha = 0.5 * (1 - k); g.fillStyle = k < 0.3 ? '#e4ddd2' : '#a39d92'; g.fillRect(Math.round(x - r), Math.round(y - 1 - k * 5), Math.round(r * 2), 2);
                }
                g.globalAlpha = 1;
            },
            top(g, t) { if (t <= o.ms + 120) closureView.chargeBow(g, C, { a: t > o.ms ? 1 - (t - o.ms) / 120 : Math.min(1, t / 60), face: o.face }); } });
    }

    chargeBow(g, C, o) {
        for (let yy = -40; yy <= 40; yy++) {
            const k = yy / 40, x = Math.round(o.face * (24 + (1 - k * k) * 12));
            g.globalAlpha = o.a * (0.3 + 0.6 * (1 - Math.abs(k))); g.fillStyle = Math.abs(k) < 0.45 ? C[5] : C[4]; g.fillRect(x, Math.round(-46 + yy), 2, 1);
            g.globalAlpha = o.a * 0.3; g.fillStyle = C[3]; g.fillRect(Math.round(x - o.face * 5), Math.round(-46 + yy), 1, 1);
        }
        g.globalAlpha = 1;
    }

    /** 섬머솔트 슬래시: 무기 궤적이 뜬 몸 둘레에 세로 원을 그리고(위에서 앞, 아래, 뒤로), 착지 뒤 0.14초 동안 앞 아래로 더 내려벤다.
     * lift는 그때 몸이 뜬 높이(도트)를 돌려준다. */
    spellFlipTrail(o) {
        const closureView = this;
        const C = this.S.ramp('phys'), R0 = 46, N = 90;
        this.S.hang(o.at, { life: o.ms + 200, follow: o.follow, top(g, t) {
            const head = t <= o.ms ? (t / o.ms) * closureView.TAU : closureView.TAU + Math.min(1, (t - o.ms) / 140) * Math.PI * 0.55, tail = Math.max(0, head - Math.PI * 0.9);
            const fade = t > o.ms + 60 ? Math.max(0, 1 - (t - o.ms - 60) / 140) : 1, up = o.lift ? o.lift() : 0;
            for (let i = 0; i <= N; i++) {
                const u = i / N, ang = -Math.PI / 2 + tail + (head - tail) * u, w = Math.max(1, Math.round(1 + 4 * u ** 1.3));
                g.globalAlpha = fade * (0.25 + 0.7 * u); g.fillStyle = u > 0.94 ? C[5] : u > 0.6 ? C[4] : u > 0.25 ? C[3] : C[2];
                g.fillRect(Math.round(o.face * R0 * Math.cos(ang)) - (w >> 1), Math.round(-46 - up + R0 * Math.sin(ang)) - (w >> 1), w, w);
            }
            g.globalAlpha = 1;
        } });
    }
}

export function createStageGlassSpells(deps) {
    const instance = new StageGlassSpells(deps);
    return Object.freeze({ glassBreak: instance.spellGlassBreak.bind(instance), glassShard: instance.spellGlassShard.bind(instance), glassStab: instance.spellGlassStab.bind(instance), charge: instance.spellCharge.bind(instance), flipTrail: instance.spellFlipTrail.bind(instance) });
}
