class StageRitualBell {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.bellHalf = y => (y < 11 ? 5 + (y - 6) * 1.5 : y < 28 ? 12.5 + (y - 11) * 0.13 : y < 35 ? 14.7 + Math.pow(y - 28, 1.5) * 0.18 : 17.6);
        this.bellLip = (u, y) => (Math.abs(u) > 0.94 || y > 35 ? this.shared.BRASS.OUT : u < 0.4 ? this.shared.BRASS.LT : this.shared.BRASS.MID);
        this.bellSide = u => (u < -0.62 ? this.shared.BRASS.LT : u < -0.4 ? this.shared.BRASS.HI : u < 0.15 ? this.shared.BRASS.BASE : u < 0.58 ? this.shared.BRASS.MID : this.shared.BRASS.DK);
        this.BELL = Object.freeze({ scale: 2.2, lift: 140, top: 62 });
        this.bellIn = (t, plan) => Math.min(1, t / plan.drop);
        this.bellOut = (t, plan) => (t < plan.T1 + 260 ? 1 : Math.max(0, 1 - (t - plan.T1 - 260) / 260));
        this.bellSwing = (t, plan) => 0.3 * this.bellIn(t, plan) * Math.sin(this.shared.TAU * (t - plan.tolls[0] + plan.period / 4) / plan.period);
    }

    bellBand(u, y) {
        if (y === 12 || y === 31) return u < -0.4 ? this.shared.BRASS.HI : u < 0.3 ? this.shared.BRASS.LT : this.shared.BRASS.MID;
        return Math.abs(u) > 0.9 ? this.shared.BRASS.OUT : this.shared.BRASS.DK;
    }

    bellShade(u, y) {
        if (y >= 35) return this.bellLip(u, y);
        if ([12, 13, 31, 32].includes(y)) return this.bellBand(u, y);
        return Math.abs(u) > 0.9 || y === 6 ? this.shared.BRASS.OUT : this.bellSide(u);
    }

    bellHook(px) {
        for (let y = 0; y < 6; y++) for (let x = 13; x < 23; x++) {
            const dx = (x + 0.5 - 18) / 4.6, dy = (y + 0.5 - 3.2) / 3.1, r = dx * dx + dy * dy;
            if (r <= 1 && r >= 0.32) px(x, y, r > 0.8 ? this.shared.BRASS.OUT : dx < -0.1 ? this.shared.BRASS.LT : this.shared.BRASS.MID);
        }
    }

    /** 36×40 금빛 성당 종(시뮬레이터 bellSprite): 고리, 어깨, 허리, 넓은 입, 띠 두 줄, 새긴 십자. 왼쪽에서 빛. */
    bellSprite() {
        return this.shared.sprite('bell', [36, 40], (g, px) => {
            this.bellHook(px);
            for (let y = 6; y < 37; y++) for (let x = 0; x < 36; x++) { const u = (x + 0.5 - 18) / this.bellHalf(y); if (Math.abs(u) <= 1) px(x, y, this.bellShade(u, y)); }
            g.fillStyle = this.shared.BRASS.MID; g.fillRect(17, 17, 2, 10); g.fillRect(14, 20, 8, 2);
            g.fillStyle = this.shared.BRASS.LT; g.fillRect(17, 17, 1, 10); g.fillRect(14, 20, 8, 1);
        });
    }

    bellPlan(event) {
        const [A, B] = this.shared.semi(Number(event.bellRadius) || 3), tolls = event.bellTolls, T1 = tolls[tolls.length - 1], spot = event.landingCell;
        const rr = this.shared.ST.random(Math.floor(spot.gx * 192 + spot.gy * 224)), dust = Array.from({ length: 26 }, () => ({ a: rr() * this.shared.TAU, h: 4 + rr() * 9, s: rr() < 0.4 ? 2 : 1 }));
        return { A, B, tolls, T1, drop: Math.max(1, event.bellDrop), wave: Math.max(1, event.bellWave), period: tolls.length > 1 ? 2 * (tolls[1] - tolls[0]) : 900,
            LIFE: T1 + event.bellWave + 520, dust, by: null, piv: 0 };
    }

    /** 땅 음파 띠와 고리(뒤 고리는 0.07초 늦게, 점선). */
    bellBandRing(ctx, u, lag, plan) {
        const k = 0.08 + 0.92 * u, alpha = (1 - u) * (lag ? 0.5 : 0.9), A = plan.A * k, B = plan.B * k;
        ctx.globalAlpha = alpha * 0.34; ctx.fillStyle = this.shared.GOLD[1];
        ctx.beginPath(); ctx.ellipse(0, 0, A, B, 0, 0, this.shared.TAU); ctx.ellipse(0, 0, Math.max(1, A - 12), Math.max(1, B - 6), 0, 0, this.shared.TAU); ctx.fill('evenodd');
        ctx.globalAlpha = alpha; ctx.fillStyle = lag ? this.shared.GOLD[1] : this.shared.GOLD[2];
        this.shared.dotRing(ctx, { a: A, b: B, n: Math.round(40 + 80 * k), step: lag ? 2 : 1, h: lag ? 1 : 2 });
    }

    /** 음파가 지나간 자리에서 튀는 먼지. */
    bellDust(ctx, tw, plan) {
        const u0 = Math.min(1, tw / plan.wave), life = plan.wave + 200;
        ctx.globalAlpha = 0.6 * (1 - tw / life); ctx.fillStyle = '#8a7a5c';
        for (const d of plan.dust) {
            const k = 0.1 + 0.9 * u0 * (0.7 + 0.3 * Math.sin(d.a * 3)), lift = Math.sin(Math.min(1, tw / life) * Math.PI) * d.h;
            ctx.fillRect(Math.round(Math.cos(d.a) * plan.A * k), Math.round(Math.sin(d.a) * plan.B * k - lift), d.s, d.s);
        }
    }

    bellGround(ctx, t, plan) {
        ctx.globalAlpha = 0.28 * this.bellIn(t, plan) * this.bellOut(t, plan); ctx.fillStyle = '#20180a'; this.shared.ovalFill(ctx, 0, 0, 22, 7);
        for (const tt of plan.tolls) {
            const tw = t - tt;
            if (tw < 0 || tw > plan.wave + 200) continue;
            for (const lag of [0, 70]) { const u = (tw - lag) / plan.wave; if (u >= 0 && u <= 1) this.bellBandRing(ctx, u, lag, plan); }
            this.bellDust(ctx, tw, plan);
        }
        ctx.globalAlpha = 1;
    }

    /** 울릴 때: 종 둘레 빛무리와 양옆으로 퍼지는 소리 결. */
    bellToll(ctx, tw, y) {
        const u = tw / 380;
        ctx.globalAlpha = 0.2 * (1 - u); ctx.fillStyle = this.shared.GOLD[2]; this.shared.ovalFill(ctx, 0, y, 44 + 30 * u, 40 + 22 * u);
        for (let j = 0; j < 3; j++) {
            const v = u * 1.2 - j * 0.18, R = 40 + 80 * v;
            if (v <= 0 || v >= 1) continue;
            ctx.globalAlpha = 0.9 * (1 - v); ctx.fillStyle = j ? this.shared.GOLD[2] : this.shared.GOLD[3];
            for (const sd of [-1, 1]) for (let q = -0.55; q <= 0.55; q += 0.06) ctx.fillRect(Math.round(sd * Math.cos(q) * R), Math.round(y + Math.sin(q) * R * 0.8), 2, 2);
        }
    }

    /** 매단 점을 축으로 흔들리는 종과 매단 줄, 반대로 늦게 흔들리는 추. */
    bellHang(ctx, t, plan, alpha, drop) {
        const a = this.bellSwing(t, plan);
        ctx.save();
        ctx.globalAlpha = alpha; ctx.translate(0, Math.round(plan.piv + drop)); ctx.rotate(a); ctx.scale(this.BELL.scale, this.BELL.scale); ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = this.shared.BRASS.OUT; ctx.fillRect(-1, -9, 2, 9);
        ctx.save();
        ctx.translate(0, 30); ctx.rotate(-a * 0.9);
        ctx.fillStyle = this.shared.BRASS.OUT; ctx.fillRect(-1, 0, 2, 7); ctx.fillStyle = this.shared.BRASS.DK; ctx.fillRect(-2, 6, 4, 4); ctx.fillStyle = this.shared.BRASS.BASE; ctx.fillRect(-2, 6, 2, 2);
        ctx.restore();
        ctx.drawImage(this.bellSprite(), -18, 0);
        ctx.restore();
    }

    /** 위: 내려오는 옅은 빛줄기(화면 위 끝에서), 울림의 빛무리, 종. 끝나면 위로 사라진다. */
    bellSky(ctx, t, plan) {
        const sky = Math.floor(this.shared.screenTop(ctx)), vis = this.bellIn(t, plan) * this.bellOut(t, plan);
        if (plan.by === null) { plan.by = Math.max(sky + this.BELL.top, -this.BELL.lift); plan.piv = plan.by - 34 * this.BELL.scale * 0.5; }
        if (vis <= 0) return;
        const drop = (1 - this.bellIn(t, plan)) * -40 + (t > plan.T1 + 260 ? -(t - plan.T1 - 260) * 0.12 : 0), shaft = Math.round(plan.piv + drop - sky);
        ctx.globalAlpha = 0.12 * vis; ctx.fillStyle = this.shared.GOLD[2]; ctx.fillRect(-18, sky, 36, shaft);
        ctx.globalAlpha = 0.22 * vis; ctx.fillStyle = this.shared.GOLD[3]; ctx.fillRect(-2, sky, 4, shaft);
        for (const tt of plan.tolls) if (t >= tt && t - tt <= 380) this.bellToll(ctx, t - tt, plan.by + drop);
        this.bellHang(ctx, t, plan, vis, drop);
        ctx.globalAlpha = 1;
    }

    /** 대상 위에 금빛 종이 빛 속에서 내려와 흔들리며 울린다(시뮬레이터 bellFx). */
    bell(c) {
        if (!c.first) return true;
        const plan = this.bellPlan(c.event), G = this.deps.stageGothicRemakes;
        // 리메이크 V3.14.2(2026-11-10): 그림이 오면 고딕 종과 고리 그림(js/canvas-stage-gothic-remakes.js), 아니면 이 파일의 그림.
        if (G.ready()) this.shared.hangPair(c.event.landingCell, plan.LIFE, (g, t) => G.bellGround(g, t, plan), (g, t) => G.bellSky(g, t, plan));
        else this.shared.hangPair(c.event.landingCell, plan.LIFE, (g, t) => this.bellGround(g, t, plan), (g, t) => this.bellSky(g, t, plan));
        return true;
    }
}

export function createStageRitualBell(deps, shared) {
    return new StageRitualBell(deps, shared);
}
