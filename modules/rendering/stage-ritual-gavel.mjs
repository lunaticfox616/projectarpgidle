class StageRitualGavel {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;

    }

    /** 판결봉 머리(원통, 띠 두 줄, 두 면, 저울 새김). */
    gavelHead(R, hx) {
        const B = this.shared.BRASS;
        R(hx - 1, 2, 32, 40, B.OUT); R(hx, 3, 30, 38, B.BASE); R(hx, 3, 5, 38, B.LT); R(hx + 5, 3, 4, 38, B.HI); R(hx + 21, 3, 5, 38, B.MID); R(hx + 26, 3, 4, 38, B.DK);
        for (const y of [7, 34]) { R(hx - 2, y, 34, 4, B.OUT); R(hx - 1, y, 32, 1, B.HI); R(hx - 1, y + 1, 32, 2, B.LT); }
        R(hx - 2, 0, 34, 3, B.OUT); R(hx - 1, 1, 32, 1, B.LT); R(hx - 2, 41, 34, 3, B.OUT); R(hx - 1, 42, 32, 1, B.MID);
        R(hx + 14, 14, 2, 15, B.MID); R(hx + 8, 16, 14, 2, B.MID); R(hx + 7, 18, 4, 1, B.DK); R(hx + 19, 18, 4, 1, B.DK); R(hx + 6, 19, 6, 3, B.DK); R(hx + 18, 19, 6, 3, B.DK); R(hx + 11, 29, 8, 2, B.MID);
    }

    /** 반 크기 판결봉(시뮬레이터 gavelSprite, 화면에서 2배): x 0이 손잡이 끝(축), 가운데 줄 y 22. */
    gavelSprite(L) {
        const Lh = Math.max(70, Math.round(L / 2));
        return this.shared.sprite('gavel|' + Lh, [Lh + 2, 44], g => {
            const B = this.shared.BRASS, R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, hl = Lh - 32;
            R(2, 17, hl, 10, B.OUT); R(3, 18, hl - 2, 1, B.HI); R(3, 19, hl - 2, 2, B.LT); R(3, 21, hl - 2, 2, B.BASE); R(3, 23, hl - 2, 2, B.MID); R(3, 25, hl - 2, 1, B.DK);
            for (let x = 18; x < hl - 6; x += 24) { R(x, 15, 4, 14, B.OUT); R(x + 1, 16, 2, 2, B.HI); R(x + 1, 18, 2, 5, B.LT); R(x + 1, 23, 2, 5, B.MID); }
            R(0, 14, 8, 16, B.OUT); R(1, 15, 6, 3, B.HI); R(1, 18, 6, 6, B.LT); R(1, 24, 6, 5, B.MID);
            this.gavelHead(R, Lh - 31);
        });
    }

    // ---------------------------------------------------------------- 91 판결-유죄
    gavelBits(event, plan) {
        const src = event.sourceCell, rr = this.shared.ST.random(Math.floor(src.gx * this.shared.WIDE + src.gy * this.shared.DEEP) + 77);
        plan.cracks = (event.gavelCells || []).map(cell => {
            let x = (cell.gx - src.gx) * this.shared.WIDE, y = (cell.gy - src.gy) * this.shared.DEEP;
            const pts = [[x, y]], a0 = rr() * this.shared.TAU;
            for (let j = 0; j < 5; j++) { x += Math.cos(a0 + (rr() - 0.5) * 1.6) * 9; y += Math.sin(a0 + (rr() - 0.5) * 1.6) * 4; pts.push([x, y]); }
            return { pts, d0: cell.gy === src.gy ? 0 : 40 };   // 가운데 줄이 먼저, 양옆 줄은 0.04초 늦게
        });
        plan.dust = Array.from({ length: 30 }, () => ({ x: plan.L * (0.55 + rr() * 0.45), vy: -20 - rr() * 40, vx: (rr() - 0.5) * 40 }));
    }

    gavelPlan(c) {
        const event = c.event, f = Number(event.gavelFace) || c.look.face, L = (Number(event.gavelLength) || 2.3) * this.shared.WIDE;
        const windup = Math.max(1, event.gavelWindup), swing = Math.max(1, event.gavelSwing);
        const plan = { f, L, E: this.shared.ink(c.element), px: f * 0.35 * this.shared.WIDE, PY: -40, T0: windup, T1: windup + swing, swing, depth: Number(event.gavelDepth) || 1.5, LIFE: windup + swing + 820 };
        this.gavelBits(event, plan);
        return plan;
    }

    /** 손잡이 끝을 축으로 한 각: 서서 살짝 뒤로 → 빨라지며 앞으로 넘어짐 → 닿고 살짝 튐 → 누움. */
    gavelAngle(t, plan) {
        if (t < plan.T0) return -Math.PI / 2 - 0.16 * Math.min(1, t / plan.T0);
        if (t < plan.T1) return (-Math.PI / 2 - 0.16) * (1 - Math.pow((t - plan.T0) / plan.swing, 2));
        return t < plan.T1 + 90 ? -0.06 * Math.sin((t - plan.T1) / 90 * Math.PI) : 0;
    }

    gavelDraw(ctx, a, alpha, plan) {
        const art = this.gavelSprite(plan.L);
        ctx.save();
        ctx.globalAlpha = alpha; ctx.translate(Math.round(plan.px), plan.PY); ctx.scale(plan.f, 1); ctx.rotate(a); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(art, 0, -44, art.width * 2, art.height * 2);
        ctx.restore();
    }

    /** 앞 3칸 × 판정 깊이의 금빛 점선 테와 칸 사이 선. */
    gavelFrame(ctx, u, plan) {
        const x0 = Math.min(plan.px + plan.f * 0.15 * this.shared.WIDE, plan.px + plan.f * 3.15 * this.shared.WIDE), w = 3 * this.shared.WIDE, y0 = -plan.depth * this.shared.DEEP, h = 2 * plan.depth * this.shared.DEEP;
        ctx.globalAlpha = 0.8 * (1 - u); ctx.fillStyle = this.shared.GOLD[2];
        for (let x = 0; x <= w; x += 4) { ctx.fillRect(Math.round(x0 + x), Math.round(y0), 2, 2); ctx.fillRect(Math.round(x0 + x), Math.round(y0 + h), 2, 2); }
        for (let y = 0; y <= h; y += 4) { ctx.fillRect(Math.round(x0), Math.round(y0 + y), 2, 2); ctx.fillRect(Math.round(x0 + w), Math.round(y0 + y), 2, 2); }
        ctx.globalAlpha = 0.45 * (1 - u); ctx.fillStyle = this.shared.GOLD[1];
        for (const k2 of [1, 2]) for (let y = 0; y <= h; y += 4) ctx.fillRect(Math.round(x0 + k2 * this.shared.WIDE), Math.round(y0 + y), 1, 2);
        for (let b = 0.5; b < plan.depth; b += 1) for (const side of [-1, 1]) for (let x = 0; x <= w; x += 4) ctx.fillRect(Math.round(x0 + x), Math.round(side * b * this.shared.DEEP), 2, 1);
    }

    /** 땅: 9칸 테두리, 머리가 닿은 자리의 고리(0.52초). */
    gavelGround(ctx, t, plan) {
        const aft = t - plan.T1, u = aft / 520;
        if (aft < 0 || aft >= 520) return;
        this.gavelFrame(ctx, u, plan);
        const k = 0.3 + 0.9 * Math.min(1, aft / 260);
        ctx.globalAlpha = 0.85 * (1 - u); ctx.fillStyle = this.shared.GOLD[3];
        this.shared.dotRing(ctx, { x: plan.px + plan.f * (plan.L - 30), a: 1.6 * this.shared.WIDE * k, b: 1.6 * this.shared.DEEP * k, n: 40, step: 2, h: 2 });
        ctx.globalAlpha = 1;
    }

    /** 칸마다 번개 갈라짐(가운데 줄부터, 0.22초). */
    gavelCracks(ctx, aft, plan) {
        const passes = [[5, plan.E.c2, 0.35], [2, plan.E.c1, 0.95]];
        for (const crack of aft < 220 ? plan.cracks : []) {
            const d0 = crack.d0, a = aft < d0 ? 0 : aft < d0 + 120 ? 1 : Math.max(0, 1 - (aft - d0 - 120) / 60);
            if (!a) continue;
            for (const [w, colour, alpha] of passes) {
                ctx.globalAlpha = alpha * a; ctx.fillStyle = colour;
                for (let i = 0; i + 1 < crack.pts.length; i++) this.shared.ST.line(crack.pts[i][0], crack.pts[i][1], crack.pts[i + 1][0], crack.pts[i + 1][1], (X, Y) => ctx.fillRect(X - (w >> 1), Y - (w >> 1), w, w));
            }
        }
    }

    /** 금빛 가루(0.7초). */
    gavelDust(ctx, aft, plan) {
        const s2 = aft / 1000;
        ctx.globalAlpha = Math.max(0, 0.9 - aft / 700);
        for (const d of aft < 700 ? plan.dust : []) { ctx.fillStyle = d.x % 3 < 1 ? this.shared.GOLD[3] : this.shared.GOLD[2]; ctx.fillRect(Math.round(plan.px + plan.f * d.x + d.vx * s2), Math.round(plan.PY - 6 + d.vy * s2 * 3), 2, 2); }
    }

    /** 위: 나타날 때 빛기둥(화면 위 끝에서), 내리찍을 때 잔상 셋, 판결봉, 번개 갈라짐, 금빛 가루. */
    gavelSky(ctx, t, plan) {
        const aft = t - plan.T1, vis = aft < 380 ? 1 : Math.max(0, 1 - (aft - 380) / 300);
        if (t < plan.T0) { const sky = Math.floor(this.shared.screenTop(ctx)); ctx.globalAlpha = 0.3 * (t / plan.T0); ctx.fillStyle = this.shared.GOLD[2]; ctx.fillRect(Math.round(plan.px - 8), sky, 16, Math.round(plan.PY - sky)); }
        if (t > plan.T0 && t < plan.T1) for (let k = 3; k >= 1; k--) this.gavelDraw(ctx, this.gavelAngle(t - k * 22, plan), 0.16 * (4 - k) / 3, plan);
        if (vis > 0) this.gavelDraw(ctx, this.gavelAngle(t, plan), Math.min(1, t / 90) * vis, plan);
        if (aft >= 0) { this.gavelCracks(ctx, aft, plan); this.gavelDust(ctx, aft, plan); }
        ctx.globalAlpha = 1;
    }

    /** 주인공 앞에 금빛 판결봉이 서서 나타났다가 앞으로 넘어지며 내리찍는다(시뮬레이터 gavelFx). 머리가 닿는 순간 땅 클립. */
    gavel(c) {
        if (!c.first) return true;
        const plan = this.gavelPlan(c), src = c.event.sourceCell, G = this.deps.stageGothicRemakes;
        if (G.ready()) {
            // 리메이크 V3.14.3: 저울 문양 판결봉, 판정 상자의 모서리와 칸마다 바닥 균열(땅 클립은 쓰지 않는다).
            const cells = (c.event.gavelCells || []).map(cell => [(cell.gx - src.gx) * this.shared.WIDE, (cell.gy - src.gy) * this.shared.DEEP]);
            this.shared.hangPair(src, plan.LIFE, (g, t) => G.gavelGround(g, t, plan, cells), (g, t) => G.gavelSky(g, t, plan));
            return true;
        }
        if (c.gem.map.ground) this.shared.standClip(c.gem.map.ground, src, { dx: plan.px + plan.f * (plan.L - 30), face: plan.f, scale: 1.1, delay: plan.T1 });
        this.shared.hangPair(src, plan.LIFE, (g, t) => this.gavelGround(g, t, plan), (g, t) => this.gavelSky(g, t, plan));
        return true;
    }

    /** 유죄의 낙뢰: 맞은 적에게 하늘에서 낙뢰 클립. */
    verdict(c) {
        if (!c.first) return true;
        if (this.deps.stageGothicRemakes.ready()) this.deps.stageGothicRemakes.verdictBolt(c.event.landingCell);
        else if (c.gem.map.bolt) this.shared.standClip(c.gem.map.bolt, c.event.landingCell, { face: 1, scale: 1.1 });
        return true;
    }
}

export function createStageRitualGavel(deps, shared) {
    return new StageRitualGavel(deps, shared);
}
