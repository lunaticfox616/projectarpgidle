class StageStormFlask {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.clamp = (value, low, high) => Math.min(high, Math.max(low, value));
        this.STORM = Object.freeze({ k: 1.8, clip: 2.2 });
    }

    /** 던진 병의 자리(js/canvas-stage-skill-casts.js castDrawLob과 같은 포물선): 발 자리와 병의 높이. */
    stormLobAt(c, t) {
        const event = c.event, from = event.sourceCell, to = event.landingCell, far = Math.hypot((to.gx - from.gx) * this.shared.WIDE, (to.gy - from.gy) * this.shared.DEEP * 2);
        const peak = far < 8 ? 44 : 24 + far * 0.12, k = this.clamp(t / Math.max(1, event.duration), 0, 1);
        const at = this.shared.K.screen(c.view.projection, { gx: from.gx + (to.gx - from.gx) * k, gy: from.gy + (to.gy - from.gy) * k });
        return { ...at, top: at.y - ((1 - k) * 55 + Math.sin(k * Math.PI) * peak) * at.dot };
    }

    /** 병 둘레에서 튀는 정전기(0.07초마다 바뀐다): 반지름 11에서 바깥으로 세 마디씩 두 줄. */
    stormStatic(ctx, at, t) {
        const r = this.shared.ST.random(Math.floor(t / 70) + 31);
        ctx.save();
        ctx.translate(Math.round(at.x), Math.round(at.top)); ctx.scale(at.dot, at.dot);
        ctx.globalAlpha = 0.85; ctx.fillStyle = this.shared.ink('light').c1;
        for (let k = 0; k < 2; k++) {
            const a = r() * this.shared.TAU;
            let x = Math.cos(a) * 11, y = Math.sin(a) * 11;
            for (let j = 0; j < 3; j++) {
                const nx = x + Math.cos(a) * 4 + (r() - 0.5) * 5, ny = y + Math.sin(a) * 4 + (r() - 0.5) * 5;
                this.shared.ST.line(x, y, nx, ny, (px, py) => ctx.fillRect(px, py, 1, 1));
                x = nx; y = ny;
            }
        }
        ctx.restore();
    }

    /** 정전기 병: 플라스크가 포물선으로 날고(그림자) 둘레에 정전기가 튄다. */
    stormFlight(c) {
        const t = c.view.now - c.event.at, ctx = c.view.ctx;
        if (t < 0 || t >= c.event.duration) return true;
        const at = this.stormLobAt(c, t);
        ctx.save();
        ctx.fillStyle = 'rgba(8,6,12,0.35)';
        this.shared.ovalFill(ctx, Math.round(at.x), Math.round(at.y) + 1, 11 * at.dot, 3 * at.dot);
        ctx.restore();
        this.deps.stageSkillDraws.body(ctx, 'flask', { x: at.x, y: at.top, dot: at.dot, face: 1, t, element: c.element });
        this.stormStatic(ctx, at, t);
        return true;
    }

    chargePlan(spot, radius, E) {
        const [A, B] = this.shared.semi(radius), rr = this.shared.ST.random(Math.floor(spot.gx * 192 + spot.gy * 32));
        const motes = Array.from({ length: 22 }, () => ({ a: rr() * this.shared.TAU, k: 0.75 + rr() * 0.45, t0: rr() * 0.35 }));
        const arcs = Array.from({ length: 6 }, () => ({ dx: (rr() - 0.5) * A * 0.9, dy: (rr() - 0.5) * B * 0.9, t0: rr() * 0.6, h: 6 + rr() * 10 }));
        return { A, B, E, rr, motes, arcs, x: spot.gx * this.shared.WIDE };
    }

    /** 모으기의 바닥: 범위 끝으로 조여 드는 점선 테, 아주 옅은 바닥, 가운데로 빨려 드는 불꽃 조각, 커지는 가운데 빛. */
    chargeGround(ctx, u, plan) {
        const { A, B, E } = plan, k = 1.3 - u * 0.3;
        ctx.globalAlpha = 0.25 + 0.5 * u; ctx.fillStyle = E.c2;
        this.shared.dotRing(ctx, { a: A * k, b: B * k, n: 56, step: 2, turn: -u * 1.2 });
        ctx.globalAlpha = 0.03 + 0.05 * u; ctx.fillStyle = E.c3; this.shared.ovalFill(ctx, 0, 0, A, B);
        ctx.globalAlpha = 0.85;
        for (const m of plan.motes) {
            const w = this.clamp((u - m.t0) / (1 - m.t0), 0, 1), d = (1 - w) * m.k;
            if (w <= 0 || w >= 1) continue;
            ctx.fillStyle = w > 0.6 ? E.c1 : E.c2; ctx.fillRect(Math.round(Math.cos(m.a) * A * d), Math.round(Math.sin(m.a) * B * d), 2, 1);
        }
        ctx.globalAlpha = 0.5 * u; ctx.fillStyle = E.c2; this.shared.ovalFill(ctx, 0, 0, 6 + 14 * u, 3 + 6 * u);
        ctx.globalAlpha = 1;
    }

    /** 먹구름 아래로 내리는 잔번개 셋(0.06초마다 바뀐다). */
    chargeCloudSparks(ctx, t, u, cy, plan) {
        const r2 = this.shared.ST.random(Math.floor(t / 60) + Math.floor(plan.x));
        ctx.fillStyle = plan.E.c2; ctx.globalAlpha = 0.8;
        for (let i = 0; i < 3; i++) {
            if (r2() > 0.4 + u * 0.5) continue;
            let x = (r2() - 0.5) * 50 * (0.6 + u), y = cy;
            for (let j = 0; j < 4; j++) { const nx = x + (r2() - 0.5) * 8, ny = y + 3 + r2() * 3; this.shared.ST.line(x, y, nx, ny, (px, py) => ctx.fillRect(px, py, 1, 1)); x = nx; y = ny; }
        }
    }

    /** 땅에서 위로 튀는 잔불꽃. */
    chargeArcs(ctx, u, plan) {
        ctx.fillStyle = plan.E.c1;
        for (const a of plan.arcs) {
            const w = (u - a.t0) / 0.25;
            if (w <= 0 || w >= 1) continue;
            ctx.globalAlpha = 0.9 * (1 - w);
            let x = Math.round(a.dx), y = Math.round(a.dy);
            for (let j = 0; j < 3; j++) { const nx = Math.round(x + (plan.rr() - 0.5) * 5), ny = Math.round(y - a.h / 3); this.shared.ST.line(x, y, nx, ny, (px, py) => ctx.fillRect(px, py, 1, 1)); x = nx; y = ny; }
        }
    }

    /** 모으기의 위: 화면 위 끝 가까이 작은 먹구름과 잔번개, 땅의 잔불꽃. */
    chargeSky(ctx, t, u, plan) {
        const cy = this.shared.screenTop(ctx) + 16;
        ctx.globalAlpha = 0.28 + 0.3 * u; ctx.fillStyle = '#17141f'; this.shared.ovalFill(ctx, 0, cy, 34 + 30 * u, 9 + 5 * u);
        ctx.globalAlpha = 0.35 + 0.4 * u; ctx.fillStyle = plan.E.c3; this.shared.ovalFill(ctx, 0, cy + 3, 22 + 20 * u, 5 + 3 * u);
        this.chargeCloudSparks(ctx, t, u, cy, plan);
        this.chargeArcs(ctx, u, plan);
        ctx.globalAlpha = 1;
    }

    /** 병이 깨진 자리로 정전기가 모인다(시뮬레이터 nukeLand, nukeChargeFx): 작은 땅 섬광 클립과 함께. */
    stormCharge(c) {
        if (!c.first) return true;
        const event = c.event, spot = event.landingCell, L = Math.max(60, event.duration - 40), plan = this.chargePlan(spot, Number(event.stormRadius) || 2, this.shared.ink(c.element));
        if (c.gem.map.burst) this.shared.standClip(c.gem.map.burst, spot, { face: c.look.face, ramp: c.look.ramp, scale: 0.5, alpha: 0.75 });
        this.shared.hangPair(spot, L + 40, (g, t) => this.chargeGround(g, Math.min(1, t / L), plan), (g, t) => this.chargeSky(g, t, Math.min(1, t / L), plan));
        return true;
    }

    boltPlan(spot, radius, E) {
        const k = this.STORM.k, rr = this.shared.ST.random(Math.floor(spot.gx * 448 + spot.gy * 96 + this.deps.stageSkillVfx.now())), RA = radius * this.shared.WIDE + 6, RB = radius * this.shared.DEEP + 3;
        const sparks = Array.from({ length: Math.round(12 * k) }, () => {
            const a = -Math.PI * (0.08 + rr() * 0.84), sp = (50 + rr() * 90) * (0.8 + 0.25 * k);
            return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75, s: rr() < 0.4 ? 2 : 1 };
        });
        const W = [11, 5, 1, 7, 3, 4, 2].map(w => Math.max(1, Math.round(w * (w === 1 ? Math.min(2, k) : k))));
        return { k, rr, E, RA, RB, SCR: Math.min(0.75, 40 * k / RA), RD: 245 + 80 * (k - 1), W, sparks, life: 700 + 120 * (k - 1), pts: null, br: [], top: 0 };
    }

    boltBranch(rr, pts, q, k) {
        const i0 = 2 + Math.floor(rr() * (pts.length - 5)), dir = q % 2 ? 1 : -1, branch = [pts[i0]];
        let [bx, by] = pts[i0];
        for (let j = 0; j < 4 + (k > 1.4 ? 1 : 0); j++) { bx += dir * (5 + rr() * 9) * Math.min(1.5, k); by += 9 + rr() * 8; branch.push([Math.round(bx), Math.round(by)]); }
        return branch;
    }

    /** 화면 위 끝에서 떨어진 자리까지 꺾이는 줄기와 갈래. 처음 그릴 때 그 화면의 위 끝으로 만든다. */
    boltPath(bolt, top) {
        const rr = bolt.rr, pts = [];
        let cx = (rr() - 0.5) * 28;
        for (let yy = top; yy < -8; yy += 14 + rr() * 10) { pts.push([Math.round(cx), Math.round(yy)]); cx += (rr() - 0.5) * 24; cx -= cx * 0.2; }
        pts.push([0, -2]);
        for (let q = 0; q < (bolt.k > 1.4 ? 4 : 2) && pts.length > 6; q++) bolt.br.push(this.boltBranch(rr, pts, q, bolt.k));
        bolt.pts = pts; bolt.top = top;
    }

    /** 꺾인 줄기 하나를 yMax까지 wd 굵기로. */
    boltStrip(ctx, P, yMax, wd) {
        for (let i = 0; i + 1 < P.length; i++) {
            const [x0, y0] = P[i], [x1, y1] = P[i + 1];
            if (y0 > yMax) break;
            this.shared.ST.line(x0, y0, x1, Math.min(y1, Math.round(yMax)), (px, py) => ctx.fillRect(px - (wd >> 1), py, wd, 1));
        }
    }

    /** 0.04초에 땅까지 뻗고 0.12초까지 굵게(흰 심과 갈래), 0.26초까지 가늘어지며 사라진다(깜빡임 없음). */
    boltStrips(ctx, t, bolt) {
        const { E, W, pts, top } = bolt, yMax = top - top * Math.min(1, t / 40), thick = t < 120, a = thick ? 1 : Math.max(0, 1 - (t - 120) / 140);
        ctx.globalAlpha = 0.3 * a; ctx.fillStyle = E.c2; this.boltStrip(ctx, pts, yMax, thick ? W[0] : W[3]);
        ctx.globalAlpha = 0.95 * a; ctx.fillStyle = E.c1; this.boltStrip(ctx, pts, yMax, thick ? W[1] : W[4]);
        if (!thick) return;
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff'; this.boltStrip(ctx, pts, yMax, W[2]);
        for (const branch of bolt.br) {
            ctx.globalAlpha = 0.45; ctx.fillStyle = E.c2; this.boltStrip(ctx, branch, yMax, W[5]);
            ctx.globalAlpha = 0.9; ctx.fillStyle = E.c1; this.boltStrip(ctx, branch, yMax, W[6]);
        }
    }

    boltSparks(ctx, t, bolt) {
        const s = (t - 40) / 1000;
        ctx.globalAlpha = Math.max(0, 1 - (t - 40) / 480); ctx.fillStyle = t < 200 ? bolt.E.c1 : bolt.E.c2;
        for (const p of bolt.sparks) ctx.fillRect(Math.round(p.vx * s), Math.round(-4 + p.vy * s + 260 * s * s), p.s, p.s);
    }

    boltSky(ctx, t, bolt) {
        if (!bolt.pts) this.boltPath(bolt, this.shared.screenTop(ctx) - 4);
        if (t < 260) this.boltStrips(ctx, t, bolt);
        if (t > 40 && t < 520) this.boltSparks(ctx, t, bolt);
        ctx.globalAlpha = 1;
    }

    /** 땅: 그을음, 범위 끝까지 퍼지는 충격 고리(옅은 빛과 점선 테). */
    boltGround(ctx, t, bolt) {
        const { E, RA, RB, SCR, RD } = bolt;
        ctx.globalAlpha = 0.32 * Math.max(0, 1 - t / bolt.life); ctx.fillStyle = '#1b1922'; this.shared.ovalFill(ctx, 0, 0, RA * SCR, RB * SCR);
        if (t > 35 && t < 35 + RD) {
            const u = (t - 35) / RD, kk = 0.55 + u * 0.55;
            ctx.globalAlpha = (bolt.k > 1.4 ? 0.26 : 0.4) * (1 - u) * (1 - u); ctx.fillStyle = E.c2; this.shared.ovalFill(ctx, 0, 0, RA * kk, RB * kk);
            ctx.globalAlpha = 0.85 * (1 - u); ctx.fillStyle = E.c1;
            this.shared.dotRing(ctx, { a: RA * kk, b: RB * kk, n: Math.round(36 * Math.max(1, RA / 64)), step: 2 });
        }
        ctx.globalAlpha = 1;
    }

    /** 거대한 낙뢰 한 번(시뮬레이터 bigBoltFx, 굵기 1.8배): 낙뢰 클립(2.2배)과 함께. */
    stormBolt(c) {
        if (!c.first) return true;
        const event = c.event, spot = event.landingCell, bolt = this.boltPlan(spot, Number(event.stormRadius) || 2, this.shared.ink(c.element));
        if (c.gem.map.bolt) this.shared.standClip(c.gem.map.bolt, spot, { face: c.look.face, ramp: c.look.ramp, scale: this.STORM.clip });
        this.shared.hangPair(spot, bolt.life, (g, t) => this.boltGround(g, t, bolt), (g, t) => this.boltSky(g, t, bolt));
        return true;
    }
}

export function createStageStormFlask(deps, shared) {
    return new StageStormFlask(deps, shared);
}
