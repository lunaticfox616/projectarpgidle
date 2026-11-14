class StageRitualChandelier {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.FIRE = Object.freeze(['#ffd36b', '#ff9a3c', '#e8602c']);
        this.brassSide = (x, cx, colours) => (x < cx ? colours[0] : x > cx ? colours[2] : colours[1]);
        this.CHAND = Object.freeze({ scale: 1.9, hang: 34, flameMs: 385 });
        this.CHAND_CANDLE = Object.freeze([[-24, 20], [-12, 20], [0, 18], [12, 20], [24, 20]]);
        this.CHAND_RIPPLES = Object.freeze([[0, this.shared.GOLD[2], 0.95], [60, this.shared.GOLD[1], 0.6], [110, this.FIRE[1], 0.75]]);
    }

    /** 샹들리에의 타원 테(시뮬레이터 chandelierSprite ring, 칸이 소수여도 그대로). */
    chandRing(px, y0, radii, th) {
        const [rx, ry] = radii, cx = 30;
        for (let y = y0 - ry - th; y <= y0 + ry + th; y++) for (let x = cx - rx - th; x <= cx + rx + th; x++) {
            const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - y0) / ry, r = Math.sqrt(dx * dx + dy * dy);
            if (Math.abs(r - 1) * Math.min(rx, ry) <= th * 0.75) px(x, y, dy < -0.3 ? this.shared.BRASS.LT : dy < 0.4 ? this.shared.BRASS.BASE : this.shared.BRASS.DK);
        }
    }

    /** 매단 고리. */
    chandHook(px) {
        for (let y = 0; y < 5; y++) for (let x = 27; x <= 33; x++) {
            const dx = (x + 0.5 - 30) / 3, dy = (y + 0.5 - 2.5) / 2.5, r = dx * dx + dy * dy;
            if (r <= 1 && r >= 0.3) px(x, y, r > 0.75 ? this.shared.BRASS.OUT : this.shared.BRASS.LT);
        }
    }

    /** 가운데 줄 하나(y, 반폭 w)를 테와 함께. */
    chandStem(px, y, w, colours) {
        for (let x = 30 - w; x <= 30 + w; x++) px(x, y, this.brassSide(x, 30, colours));
        px(30 - w - 1, y, this.shared.BRASS.OUT); px(30 + w + 1, y, this.shared.BRASS.OUT);
    }

    /** 고리, 기둥과 매듭, 아래 꼭지. */
    chandPost(px) {
        const B = this.shared.BRASS;
        this.chandHook(px);
        for (let y = 5; y < 26; y++) this.chandStem(px, y, y > 10 && y < 15 ? 3 : 1, [B.LT, B.BASE, B.DK]);
        for (let y = 33; y < 45; y++) this.chandStem(px, y, Math.max(0, Math.round((45 - y) / 4)), [B.HI, B.LT, B.MID]);
    }

    /** 아래로 처진 팔 넷. */
    chandArms(px) {
        for (const s of [-1, 1]) for (const k of [0.5, 1]) {
            const x1 = 30 + s * 24 * k;
            for (let i = 0; i <= 16; i++) { const u = i / 16, x = Math.round(30 + (x1 - 30) * u), y = Math.round(24 + 3 * u + Math.sin(u * Math.PI) * 4); px(x, y, this.shared.BRASS.BASE); px(x, y + 1, this.shared.BRASS.DK); }
        }
    }

    /** 촛대와 초 다섯, 크리스털 방울. */
    chandCandles(g, px) {
        for (const dx of [-24, -12, 0, 12, 24]) {
            const x = 30 + dx, y = dx ? 22 : 20;
            g.fillStyle = this.shared.BRASS.OUT; g.fillRect(x - 3, y + 4, 7, 3); g.fillStyle = this.shared.BRASS.LT; g.fillRect(x - 2, y + 4, 5, 2);
            g.fillStyle = '#f4ecd8'; g.fillRect(x - 1, y - 2, 3, 6); g.fillStyle = '#cfc2a4'; g.fillRect(x + 1, y - 2, 1, 6);
        }
        for (let i = -5; i <= 5; i++) {
            if (!i) continue;
            const x = 30 + Math.round(i * 4.7), y0 = 34 + Math.round(Math.abs(Math.sin(i)) * 2), len = 3 + (i % 2 ? 2 : 0);
            for (let j = 0; j < len; j++) px(x, y0 + j, j === len - 1 ? '#93bfe0' : '#dff3ff');
            px(x - 1, y0 + len - 2, '#93bfe0');
        }
    }

    /** 60×46 금빛 샹들리에(시뮬레이터 chandelierSprite). */
    chandelierSprite() {
        return this.shared.sprite('chandelier', [60, 46], (g, px) => {
            this.chandPost(px);
            this.chandRing(px, 19, [12, 3], 1);
            this.chandArms(px);
            this.chandRing(px, 30, [26, 5], 1.2);
            this.chandCandles(g, px);
        });
    }

    chandBits(spot, plan) {
        const rr = this.shared.ST.random(Math.floor(spot.gx * 704 + spot.gy * 160)), { A, B } = plan;
        plan.shards = Array.from({ length: 22 }, () => { const a = -Math.PI * (0.05 + rr() * 0.9), sp = 90 + rr() * 150; return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, c: rr() < 0.5 ? '#dff3ff' : '#93bfe0', s: rr() < 0.3 ? 2 : 1 }; });
        plan.coins = Array.from({ length: 16 }, () => { const a = rr() * this.shared.TAU, k = 0.35 + rr() * 0.6; return { x1: Math.cos(a) * A * k, y1: Math.sin(a) * B * k, h: 24 + rr() * 30, dur: 340 + rr() * 220, ph: rr() * 6 }; });
        plan.smoke = Array.from({ length: 8 }, () => ({ dx: (rr() - 0.5) * 70, r: 6 + rr() * 6, t0: rr() * 160 }));
    }

    chandPlan(c) {
        const event = c.event, [A, B] = this.shared.semi(Number(event.chandRadius) || 2), hang = Math.max(1, event.chandHang), fall = Math.max(1, event.chandFall);
        const plan = { A, B, face: Number(event.chandFace) || c.look.face, T0: hang, T1: hang + fall, fall, LIFE: hang + fall + 1100, hy: null, GY: -46 * this.CHAND.scale * 0.82, fireLag: 70 };
        this.chandBits(event.landingCell, plan);
        return plan;
    }

    /** 스프라이트 위 끝의 높이: 매달림 → 가속하며 떨어짐 → 땅. */
    chandY(t, plan) {
        if (t < plan.T0) return plan.hy;
        return t < plan.T1 ? plan.hy + (plan.GY - plan.hy) * Math.pow((t - plan.T0) / plan.fall, 2) : plan.GY;
    }

    chandTilt(t, plan) {
        if (t < plan.T0) return Math.sin(t / 60) * 0.07;
        return t < plan.T1 ? 0.07 * Math.sin(t / 40) + plan.face * 0.12 * ((t - plan.T0) / plan.fall) : plan.face * 0.18;
    }

    /** 부서진 자리, 파문 고리 셋(금, 금, 불), 바닥에 떨어진 금화. */
    chandWreckGround(ctx, after1, plan) {
        ctx.globalAlpha = 0.4 * Math.max(0, 1 - after1 / 1000); ctx.fillStyle = '#20170c'; this.shared.ovalFill(ctx, 0, 0, 50, 15);
        for (const [lag, colour, alpha] of this.CHAND_RIPPLES) {
            const u = (after1 - lag) / 340, k = 0.12 + 0.88 * u;
            if (u < 0 || u > 1) continue;
            ctx.globalAlpha = alpha * (1 - u); ctx.fillStyle = colour; this.shared.dotRing(ctx, { a: plan.A * k, b: plan.B * k, n: Math.round(40 + 80 * k), h: lag ? 1 : 2 });
        }
        for (const cn of plan.coins) {
            const u = after1 / cn.dur, x = Math.round(cn.x1), y = Math.round(cn.y1);
            if (u < 1 || u > 1.8) continue;
            ctx.globalAlpha = Math.max(0, 1 - (u - 1) * 1.3); ctx.fillStyle = this.shared.GOLD[1]; ctx.fillRect(x - 2, y, 4, 2); ctx.fillStyle = this.shared.GOLD[3]; ctx.fillRect(x - 1, y, 2, 1);
        }
    }

    chandGround(ctx, t, plan) {
        if (t < plan.T1) { const u = Math.min(1, t / plan.T1); ctx.globalAlpha = 0.15 + 0.3 * u; ctx.fillStyle = '#1b140a'; this.shared.ovalFill(ctx, 0, 0, 14 + 34 * u, 5 + 10 * u); }
        if (t >= plan.T1) this.chandWreckGround(ctx, t - plan.T1, plan);
        ctx.globalAlpha = 1;
    }

    /** 매단 사슬(화면 위 끝에서, 끊어지면 위로 걷힌다). */
    chandChain(ctx, t, plan, sky) {
        const end = t < plan.T0 ? plan.hy : plan.hy - 10 - (t - plan.T0) * 0.3;
        ctx.globalAlpha = 1; ctx.fillStyle = this.shared.BRASS.OUT;
        for (let yy = -6; sky + yy < end; yy += 4) { ctx.fillRect(-1, Math.round(sky + yy), 3, 2); ctx.fillStyle = yy % 8 ? this.shared.BRASS.DK : this.shared.BRASS.OUT; }
    }

    /** 사슬이 끊어질 때의 불꽃 여덟. */
    chandSnap(ctx, t, plan) {
        const u = (t - plan.T0 + 10) / 130;
        ctx.globalAlpha = 1 - u; ctx.fillStyle = this.shared.GOLD[3];
        for (let i = 0; i < 8; i++) { const q = i / 8 * this.shared.TAU; ctx.fillRect(Math.round(Math.cos(q) * (3 + u * 14)), Math.round(plan.hy - 8 + Math.sin(q) * (2 + u * 8)), 2, 2); }
    }

    candleFlame(ctx, x, y, t, k) {
        const fl = Math.sin(t / 45 + x) * 1.2;
        ctx.fillStyle = this.FIRE[2]; ctx.fillRect(Math.round(x - 2 * k), Math.round(y - 5 * k + fl), Math.round(4 * k), Math.round(5 * k));
        ctx.fillStyle = this.FIRE[1]; ctx.fillRect(Math.round(x - 1.5 * k), Math.round(y - 6 * k + fl), Math.round(3 * k), Math.round(4 * k));
        ctx.fillStyle = this.FIRE[0]; ctx.fillRect(Math.round(x - 0.5 * k), Math.round(y - 5 * k + fl), Math.max(1, Math.round(1.5 * k)), Math.round(3 * k));
    }

    /** 샹들리에: 흔들리며 매달렸다가 떨어지고(촛불이 위로 길어진다), 부딪히면 납작해졌다가 0.5초 뒤 0.3초에 사라진다. */
    chandFixture(ctx, t, plan) {
        const after1 = t - plan.T1, vis = after1 < 500 ? 1 : Math.max(0, 1 - (after1 - 500) / 300), sc = this.CHAND.scale;
        if (vis <= 0) return;
        const squash = after1 >= 0 ? Math.max(0.72, 1 - after1 / 120 * 0.28) : 1, flame = t > plan.T0 && t < plan.T1 ? 1.4 : 1;
        ctx.save();
        ctx.globalAlpha = vis; ctx.translate(0, Math.round(this.chandY(t, plan) + 46 * sc * 0.5)); ctx.rotate(this.chandTilt(t, plan)); ctx.scale(sc, sc * squash); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.chandelierSprite(), -30, -23);
        ctx.globalAlpha = vis * (after1 > 0 ? Math.max(0, 1 - after1 / 380) : 1);
        if (after1 < 380) for (const [dx, dy] of this.CHAND_CANDLE) this.candleFlame(ctx, dx, dy - 23, t, flame);
        ctx.restore();
    }

    /** 떨어지는 동안의 속도선 다섯. */
    chandSpeed(ctx, t, plan) {
        const u = (t - plan.T0) / plan.fall, y = this.chandY(t, plan);
        ctx.globalAlpha = 0.5 * u; ctx.fillStyle = this.shared.GOLD[2];
        for (let i = -2; i <= 2; i++) ctx.fillRect(i * 18, Math.round(y - 10 - 24 * u), 1, Math.round(20 * u));
    }

    /** 부딪힌 뒤: 불빛, 크리스털 조각, 돌며 튀는 금화, 연기. */
    chandCrash(ctx, after1, plan) {
        const s2 = after1 / 1000;
        if (after1 < 160) { const u = after1 / 160; ctx.globalAlpha = 0.55 * (1 - u); ctx.fillStyle = this.FIRE[0]; this.shared.ovalFill(ctx, 0, -14, 30 + 40 * u, 12 + 14 * u); }
        ctx.globalAlpha = Math.max(0, 1 - s2 / 0.55);
        for (const sh of s2 > 0.55 ? [] : plan.shards) { ctx.fillStyle = sh.c; ctx.fillRect(Math.round(sh.vx * s2), Math.round(-16 + sh.vy * s2 + 420 * s2 * s2), sh.s + 1, sh.s); }
        ctx.globalAlpha = 1;
        for (const cn of plan.coins) {
            const u = after1 / cn.dur, x = cn.x1 * u, yy = Math.round(cn.y1 * u - Math.sin(u * Math.PI) * cn.h - 10), w = Math.abs(Math.cos(after1 / 40 + cn.ph));
            if (u >= 1) continue;
            ctx.fillStyle = this.shared.GOLD[0]; ctx.fillRect(Math.round(x - 2 * w) - 1, yy - 2, Math.round(4 * w) + 2, 4);
            ctx.fillStyle = this.shared.GOLD[2]; ctx.fillRect(Math.round(x - 2 * w), yy - 1, Math.max(1, Math.round(4 * w)), 2);
        }
        ctx.fillStyle = '#4a4038';
        for (const sm of plan.smoke) {
            const u = (after1 - 380 - sm.t0) / 600;
            if (u < 0 || u > 1) continue;
            ctx.globalAlpha = 0.3 * (1 - u); ctx.beginPath(); ctx.arc(sm.dx, -14 - u * 30, sm.r * (0.6 + u), 0, this.shared.TAU); ctx.fill();
        }
    }

    chandSky(ctx, t, plan) {
        const sky = this.shared.screenTop(ctx);
        if (plan.hy === null) plan.hy = sky + this.CHAND.hang;
        if (t < plan.T0 + 40) this.chandChain(ctx, t, plan, sky);
        if (t >= plan.T0 - 10 && t < plan.T0 + 120) this.chandSnap(ctx, t, plan);
        this.chandFixture(ctx, t, plan);
        if (t > plan.T0 && t < plan.T1) this.chandSpeed(ctx, t, plan);
        if (t >= plan.T1) this.chandCrash(ctx, t - plan.T1, plan);
        ctx.globalAlpha = 1;
    }

    /** 부딪히는 순간의 불 터짐 클립과 촛불 자리 다섯의 바닥 불꽃(시뮬레이터 doChandelier). */
    chandImpact(c, plan, gothic) {
        const map = c.gem.map, spot = c.event.landingCell;
        // 리메이크(gothic): 넓은 불 고리 터짐은 빼고, 바닥 불꽃은 도트 불꽃 클립(gothic_flame) 한 번씩.
        if (map.burst && !gothic) this.shared.standClip(map.burst, spot, { face: plan.face, scale: 0.4, alpha: 0.75, delay: plan.T1 });
        if (!map.flame) return;
        const flame = gothic ? 'gothic_flame@fire' : map.flame, size = gothic ? { scale: 1, alpha: 0.85 } : { scale: 0.8, life: this.CHAND.flameMs };
        this.CHAND_CANDLE.forEach(([dx], i) => this.shared.standClip(flame, spot, { dx: dx * 1.9 + (i % 2 ? 6 : -6), dy: i % 2 ? 10 : -6, face: i % 2 ? 1 : -1, delay: plan.T1 + 40 + i * 30, ...size }));
    }

    /** 대상 위 천장의 금빛 샹들리에가 흔들리다 사슬이 끊어져 떨어진다(시뮬레이터 chandelierFx). */
    chandelier(c) {
        if (!c.first) return true;
        const plan = this.chandPlan(c), G = this.deps.stageGothicRemakes, gothic = G.ready();
        this.chandImpact(c, plan, gothic);
        if (gothic) this.shared.hangPair(c.event.landingCell, plan.LIFE, (g, t) => G.chandGround(g, t, plan), (g, t) => G.chandSky(g, t, plan));
        else this.shared.hangPair(c.event.landingCell, plan.LIFE, (g, t) => this.chandGround(g, t, plan), (g, t) => this.chandSky(g, t, plan));
        return true;
    }

    /** 화염 반: 맞은 적마다 불 타격 클립. */
    chandelierBurn(c) {
        const ref = c.gem.map.fire, centre = c.event.landingCell;
        if (!c.first || !ref) return true;
        const look = this.deps.stageGothicRemakes.ready() ? { scale: 0.49, alpha: 0.585 } : { scale: 0.7, alpha: 0.9 };   // 리메이크: 불 타격을 작고 옅게
        for (const cell of c.event.targetCells || []) this.shared.standClip(ref, cell, { face: Math.sign(cell.gx - centre.gx) || c.look.face, ...look });
        return true;
    }
}

export function createStageRitualChandelier(deps, shared) {
    return new StageRitualChandelier(deps, shared);
}
