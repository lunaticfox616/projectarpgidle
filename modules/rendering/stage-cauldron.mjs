class StageCauldron {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.easeOut = u => 1 - (1 - u) * (1 - u);
        this.POT = Object.freeze({ OUT: '#0d0b11', D: '#1d1924', M: '#2c2736', L: '#433c4f', HL: '#655c74', HOLE: '#100d15' });
        this.potShade = (r, lit) => (r > 0.86 ? this.POT.OUT : lit > 0.62 ? this.POT.HL : lit > 0.18 ? this.POT.L : lit > -0.4 ? this.POT.M : this.POT.D);
        this.rimShade = (r, inner, dy) => (inner <= 1 ? this.POT.HOLE : r > 0.84 ? this.POT.OUT : dy < -0.1 ? this.POT.HL : this.POT.L);
        this.POUR = Object.freeze({ tip: 2.25, scale: 1.75, green: '#7fc96a', lift: 132, top: 52 });
    }

    cauldronBelly(px) {
        for (let y = 12; y < 42; y++) for (let x = 2; x < 50; x++) {
            const dx = (x + 0.5 - 26) / 22.5, dy = (y + 0.5 - 26) / 15, r = dx * dx + dy * dy;
            if (r <= 1) px(x, y, this.potShade(r, -dx * 0.55 - dy * 0.75 + (Math.abs(dx) < 0.25 ? 0.05 : 0)));
        }
    }

    cauldronRim(px) {
        for (let y = 6; y < 20; y++) for (let x = 0; x < 52; x++) {
            const dx = (x + 0.5 - 26) / 25, dy = (y + 0.5 - 12.5) / 5.6, ix = (x + 0.5 - 26) / 20.5, iy = (y + 0.5 - 12.8) / 3.6, r = dx * dx + dy * dy;
            if (r <= 1) px(x, y, this.rimShade(r, ix * ix + iy * iy, dy));
        }
    }

    /** 52×44 무쇠 가마솥(시뮬레이터 cauldronSprite): 다리 셋, 둥근 몸, 손잡이 고리, 넓은 테와 입. 왼쪽 위에서 빛. */
    cauldronSprite() {
        return this.shared.sprite('cauldron', [52, 44], (g, px) => {
            [[11, 38, 4, 5], [24, 40, 4, 4], [37, 38, 4, 5]].forEach(([x, y, w, h]) => { g.fillStyle = this.POT.OUT; g.fillRect(x - 1, y, w + 2, h); g.fillStyle = this.POT.D; g.fillRect(x, y, w, h - 1); });
            this.cauldronBelly(px);
            for (const s of [-1, 1]) {
                const x0 = s < 0 ? 1 : 47;
                g.fillStyle = this.POT.OUT; g.fillRect(x0, 17, 4, 1); g.fillRect(x0, 23, 4, 1); g.fillRect(s < 0 ? x0 : x0 + 3, 17, 1, 7);
                g.fillStyle = this.POT.L; g.fillRect(s < 0 ? x0 + 1 : x0 + 2, 18, 1, 5);
            }
            this.cauldronRim(px);
        });
    }

    /** 가마솥 실루엣을 그 색으로 칠한 사본(테두리 빛). */
    cauldronGlow(colour) {
        return this.shared.sprite('cauldron|' + colour, [52, 44], g => { g.drawImage(this.cauldronSprite(), 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = colour; g.fillRect(0, 0, 52, 44); });
    }

    potBits(spot, A, B, pot) {
        const rr = this.shared.ST.random(Math.floor(spot.gx * 320 + spot.gy * 32)), E = pot.E, G = this.POUR.green;
        pot.puffs = Array.from({ length: 10 }, () => ({ a: rr() * this.shared.TAU, d: 14 + rr() * 22, r: 4 + rr() * 5 }));
        pot.drops = Array.from({ length: 28 }, () => {
            const a = rr() * this.shared.TAU, k = 0.35 + rr() * 0.65;
            return { x1: Math.cos(a) * A * k, y1: Math.sin(a) * B * k, h: 18 + rr() * 26, dur: 260 + rr() * 200, c: rr() < 0.25 ? G : rr() < 0.5 ? E.c1 : E.c2 };
        });
        pot.bubbles = Array.from({ length: 16 }, () => { const a = rr() * this.shared.TAU, k = Math.sqrt(rr()) * 0.8; return { x: Math.cos(a) * A * k, y: Math.sin(a) * B * k, ph: rr(), per: 260 + rr() * 260, g: rr() < 0.3 }; });
        pot.fumes = Array.from({ length: 9 }, () => { const a = rr() * this.shared.TAU, k = rr() * 0.7; return { x: Math.cos(a) * A * k, y: Math.sin(a) * B * k, t0: pot.T0 + rr() * (pot.T_END - pot.T0), r: 5 + rr() * 5, g: rr() < 0.4 }; });
    }

    potPlan(event, E) {
        const [A, B] = this.shared.semi(Number(event.cauldronRadius) || 2.5), pour = event.cauldronPour, fall = Math.max(1, event.cauldronFall), every = event.cauldronEvery, hits = event.cauldronHits;
        const T0 = pour + fall, T_END = T0 + every * (hits - 1) + 160, T_OUT = T_END + 200;
        const pot = { A, B, E, dir: event.cauldronDir || 1, fall, every, hits, T_IN: pour - 120, T_TIP: pour, T0, T_END, T_OUT, LIFE: T_OUT + 520, cy: null };
        this.potBits(event.landingCell, A, B, pot);
        return pot;
    }

    /** 기우는 각(바로 섬 → 살짝 뒤로 → 0.12초에 쏟는 각 → 쏟는 동안 흔들림 → 0.2초에 바로 섬). */
    potAngle(t, pot) {
        if (t < pot.T_IN) return 0;
        if (t < pot.T_TIP) return -0.12 * Math.sin((t - pot.T_IN) / 120 * Math.PI);
        if (t < pot.T_TIP + 120) return this.POUR.tip * this.easeOut((t - pot.T_TIP) / 120);
        if (t < pot.T_END) return this.POUR.tip + Math.sin(t / 70) * 0.04;
        return t < pot.T_OUT ? this.POUR.tip * (1 - this.easeOut((t - pot.T_END) / 200)) : 0;
    }

    potMouth(a, pot) { const k = 12 * this.POUR.scale; return { x: k * Math.sin(a * pot.dir), y: pot.cy - k * Math.cos(a * pot.dir) }; }

    potCall(ctx, t, pot) {
        const a = Math.min(1, t / 200) * (t > pot.T0 ? Math.max(0, 1 - (t - pot.T0) / 120) : 1);
        ctx.globalAlpha = 0.7 * a; ctx.fillStyle = pot.E.c2; this.shared.dotRing(ctx, { a: pot.A, b: pot.B, n: 64, step: 2, turn: t / 500 });
        ctx.fillStyle = pot.E.c1; this.shared.dotRing(ctx, { a: pot.A * 0.86, b: pot.B * 0.86, n: 6, turn: -t / 400, w: 3, nudge: 1 });
    }

    potBubbles(ctx, t, pot, kA, fade) {
        for (const b of pot.bubbles) {
            if (Math.hypot(b.x / pot.A, b.y / pot.B) > kA) continue;
            const u = ((t / b.per) + b.ph) % 1, r = Math.round(1 + u * 2.5), x = Math.round(b.x), y = Math.round(b.y);
            ctx.globalAlpha = (u < 0.85 ? 0.85 : 0.3) * fade; ctx.fillStyle = b.g ? this.POUR.green : pot.E.c1;
            ctx.fillRect(x - r, y, 1, 1); ctx.fillRect(x + r, y, 1, 1); ctx.fillRect(x, y - r, 1, 1); ctx.fillRect(x, y + r, 1, 1);
        }
    }

    /** 피해마다 웅덩이 가운데에서 번지는 물결. */
    potRipples(ctx, t, pot) {
        ctx.fillStyle = pot.E.c1;
        for (let i = 0; i < pot.hits; i++) {
            const tw = t - (pot.T0 + i * pot.every), u = tw / 260, k = 0.2 + 0.85 * u;
            if (tw < 0 || tw > 260) continue;
            ctx.globalAlpha = 0.8 * (1 - u); this.shared.dotRing(ctx, { a: pot.A * k, b: pot.B * k, n: 40, step: 2 });
        }
    }

    /** 웅덩이: 땅에 닿은 뒤 범위 끝까지 퍼지고 쏟기가 끝나면 0.5초에 증발한다. 지대처럼 안 보이게 옅게. */
    potPuddle(ctx, t, pot) {
        const { A, B, E } = pot, grow = this.easeOut(Math.min(1, (t - pot.T0) / 280)), fade = t < pot.T_END ? 1 : Math.max(0, 1 - (t - pot.T_END) / 500);
        const kA = (0.25 + 0.7 * grow) * (t < pot.T_END ? 1 : 1 - 0.12 * (1 - fade));
        ctx.globalAlpha = 0.5 * fade; ctx.fillStyle = E.c3; this.shared.ovalFill(ctx, 0, 0, A * kA, B * kA);
        ctx.globalAlpha = 0.28 * fade; ctx.fillStyle = E.c2; this.shared.ovalFill(ctx, -A * 0.06, -B * 0.08, A * kA * 0.72, B * kA * 0.62);
        ctx.globalAlpha = 0.85 * fade; this.shared.dotRing(ctx, { a: A * kA, b: B * kA, n: 48, step: 2 });
        this.potBubbles(ctx, t, pot, kA, fade);
        this.potRipples(ctx, t, pot);
    }

    /** 바닥: 가마솥 그림자, 부르는 고리, 웅덩이. */
    potGround(ctx, t, pot) {
        const appear = Math.min(1, t / 160), gone = t > pot.T_OUT ? Math.max(0, 1 - (t - pot.T_OUT) / 200) : 1;
        ctx.globalAlpha = 0.3 * appear * gone; ctx.fillStyle = '#0d0b11'; this.shared.ovalFill(ctx, 0, 0, 26, 8);
        if (t < pot.T0 + 120) this.potCall(ctx, t, pot);
        if (t >= pot.T0) this.potPuddle(ctx, t, pot);
        ctx.globalAlpha = 1;
    }

    /** 나타날 때와 사라질 때의 연기. */
    potPuff(ctx, t, t0, a0, pot) {
        const u = (t - t0) / 360;
        if (u < 0 || u > 1) return;
        ctx.fillStyle = '#3a3246'; ctx.globalAlpha = a0 * (1 - u);
        for (const p of pot.puffs) { const d = p.d * (0.4 + u); ctx.beginPath(); ctx.arc(Math.cos(p.a) * d, pot.cy + Math.sin(p.a) * d * 0.6, p.r * (0.6 + u * 0.8), 0, this.shared.TAU); ctx.fill(); }
    }

    potStreamRow(ctx, t, y, pot) {
        const E = pot.E, Mo = pot.mouthTip, k = (y - Mo.y) / Math.max(1, -Mo.y), x = Mo.x - Mo.x * k + Math.sin(y * 0.21 + t * 0.025) * 1.6;
        const w = Math.round(10 + 10 * k + Math.sin(y * 0.33 + t * 0.04) * 1.5), x0 = Math.round(x - w / 2);
        ctx.globalAlpha = 0.95; ctx.fillStyle = E.c3; ctx.fillRect(x0 - 1, y, w + 2, 1); ctx.fillStyle = E.c2; ctx.fillRect(x0, y, w, 1);
        ctx.globalAlpha = 0.8; ctx.fillStyle = E.c1; ctx.fillRect(x0 + 3, y, 2, 1);
        if ((y + Math.floor(t / 40)) % 9 === 0) { ctx.fillStyle = this.POUR.green; ctx.fillRect(x0 + w - 3, y, 2, 1); }
    }

    /** 물줄기: 입에서 땅까지(앞이 떨어지는 동안 내려오고, 끝나면 꼬리가 떨어진다). 줄기 둘레의 방울 여섯. */
    potStream(ctx, t, pot) {
        const sOn = pot.T_TIP + 60, Mo = pot.mouthTip = this.potMouth(this.POUR.tip, pot);
        const top = t < pot.T_END ? Mo.y : Mo.y - Mo.y * Math.min(1, (t - pot.T_END) / pot.fall), bot = Mo.y - Mo.y * Math.min(1, (t - sOn) / Math.max(1, pot.T0 - sOn));
        for (let y = Math.round(top); y <= Math.round(bot); y++) this.potStreamRow(ctx, t, y, pot);
        ctx.globalAlpha = 0.8;
        for (let i = 0; i < 6; i++) {
            const u = ((t / 260) + i / 6) % 1, yy = Mo.y + (bot - Mo.y) * u;
            if (yy > bot) continue;
            ctx.fillStyle = i % 2 ? pot.E.c2 : this.POUR.green; ctx.fillRect(Math.round(Mo.x - Mo.x * u + (i % 2 ? 9 : -9) * (0.4 + u)), Math.round(yy), 2, 2);
        }
    }

    /** 첫 닿음 물보라: 방울이 둘레로 튀어 떨어진다. */
    potDrops(ctx, t, pot) {
        for (const d of pot.drops) {
            const u = (t - pot.T0) / d.dur, uu = Math.min(1, u), landed = u >= 1;
            if (u > 1.6) continue;
            ctx.globalAlpha = landed ? Math.max(0, 0.9 - (u - 1) * 1.5) : 0.95; ctx.fillStyle = d.c;
            ctx.fillRect(Math.round(d.x1 * uu), Math.round(d.y1 * uu - Math.sin(uu * Math.PI) * d.h), landed ? 3 : 2, landed ? 1 : 2);
        }
    }

    /** 웅덩이에서 피어오르는 보라와 초록 김. */
    potFumes(ctx, t, pot) {
        for (const fm of pot.fumes) {
            const u = (t - fm.t0) / 700;
            if (u < 0 || u > 1) continue;
            ctx.globalAlpha = 0.28 * (1 - u); ctx.fillStyle = fm.g ? this.POUR.green : pot.E.c2;
            ctx.beginPath(); ctx.arc(fm.x + Math.sin(u * 5) * 3, fm.y - 8 - u * 34, fm.r * (0.6 + u * 0.7), 0, this.shared.TAU); ctx.fill();
        }
    }

    /** 바로 선 동안: 끓는 물약 표면, 거품, 김. */
    potBrew(ctx, t, pot, gone) {
        const E = pot.E, G = this.POUR.green;
        ctx.fillStyle = E.c3; ctx.fillRect(-19, -12, 38, 2); ctx.fillStyle = E.c2; ctx.fillRect(-17, -13, 34, 2); ctx.fillRect(-13, -14, 26, 1);
        ctx.fillStyle = G; ctx.fillRect(-15, -13, 5, 1); ctx.fillRect(4, -13, 7, 1); ctx.fillStyle = E.c1; ctx.fillRect(-9, -14, 3, 1); ctx.fillRect(6, -14, 2, 1); ctx.fillRect(-2, -13, 2, 1);
        for (let i = 0; i < 6; i++) {
            const u = ((t / 300) + i / 6) % 1, bx = -14 + i * 5.6 + Math.sin(i * 7) * 2;
            ctx.globalAlpha = gone * (1 - u); ctx.fillStyle = i % 2 ? G : E.c1; ctx.fillRect(Math.round(bx), Math.round(-15 - u * 14), 2, 2);
        }
        for (let i = 0; i < 3; i++) {
            const u = ((t / 520) + i / 3) % 1;
            ctx.globalAlpha = gone * 0.3 * (1 - u); ctx.fillStyle = i % 2 ? G : E.c2;
            ctx.beginPath(); ctx.arc(-8 + i * 8 + Math.sin(u * 6 + i) * 3, -18 - u * 22, 3 + u * 4, 0, this.shared.TAU); ctx.fill();
        }
    }

    /** 가마솥: 나타나며 커지고, 기울어 쏟고, 테두리에 원소색 빛. 쏟는 동안 입에서 물약이 넘친다. */
    potVessel(ctx, t, pot) {
        const gone = t > pot.T_OUT ? Math.max(0, 1 - (t - pot.T_OUT) / 200) : 1, show = gone * Math.min(1, t / 90), a = this.potAngle(t, pot);
        const sc = this.POUR.scale * (0.6 + 0.4 * this.easeOut(Math.min(1, t / 160))), bob = t < pot.T_TIP ? Math.sin(t / 90) * 1.5 : 0, glow = this.cauldronGlow(pot.E.c2);
        ctx.save();
        ctx.translate(0, Math.round(pot.cy + bob)); ctx.rotate(a * pot.dir); ctx.scale(sc, sc); ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = show * 0.85;
        for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) ctx.drawImage(glow, -26 + ox, -24 + oy);
        ctx.globalAlpha = show; ctx.drawImage(this.cauldronSprite(), -26, -24);
        if (a < 0.6) this.potBrew(ctx, t, pot, gone);
        ctx.restore();
        if (t < pot.T_END && t > pot.T_TIP) { const Mo = this.potMouth(a, pot); ctx.globalAlpha = 0.9; ctx.fillStyle = pot.E.c2; ctx.fillRect(Math.round(Mo.x) - 4, Math.round(Mo.y) - 1, 8, 2); }
    }

    /** 위: 연기, 물줄기, 물보라, 김, 가마솥. 가마솥은 대상 위 132도트(화면 위 끝에서 52도트보다 내려오지 않게)에 뜬다. */
    potSky(ctx, t, pot) {
        if (pot.cy === null) pot.cy = Math.max(this.shared.screenTop(ctx) + this.POUR.top, -this.POUR.lift);
        this.potPuff(ctx, t, 0, 0.45, pot); this.potPuff(ctx, t, pot.T_OUT - 60, 0.4, pot);
        if (t > pot.T_TIP + 60 && t < pot.T_END + pot.fall) this.potStream(ctx, t, pot);
        if (t > pot.T0 && t < pot.T0 + 700) this.potDrops(ctx, t, pot);
        this.potFumes(ctx, t, pot);
        if (t < pot.T_OUT + 200) this.potVessel(ctx, t, pot);
        ctx.globalAlpha = 1;
    }

    /** 대상 머리 위의 마녀 가마솥이 기울어 물약을 쏟는다(시뮬레이터 cauldronFx). */
    cauldron(c) {
        if (!c.first) return true;
        const pot = this.potPlan(c.event, this.shared.ink(c.element));
        this.shared.hangPair(c.event.landingCell, pot.LIFE, (g, t) => this.potGround(g, t, pot), (g, t) => this.potSky(g, t, pot));
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
