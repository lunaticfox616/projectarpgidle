class StageGothicGavel {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.GAVEL_ANGLES = Object.freeze([-100, -94, -90, -82, -70, -55, -38, -22, -10, -3, 0, 3]);
        this.gavelHead = plan => plan.px + plan.f * (plan.L - 30);
    }

    /** 판결봉 길이(도트)에 맞춘 자세 열둘: 크기마다 한 묶음, 둘까지 둔다. */
    gavelPoses(L) {
        const len = Math.max(50, Math.min(220, Math.round(L / 2)));
        if (this.shared.built.gavels.has(len)) return this.shared.built.gavels.get(len);
        const factor = (len - 15) / 74, w = Math.ceil(96 * factor), px = Math.ceil(w * 0.25) + 12, py = w + 18, W = px + w + 12, H = py + Math.ceil(24 * factor) + 12;
        const list = this.GAVEL_ANGLES.map(a => this.shared.tilted(this.shared.image('gavel'), { size: [W, H], pivot: [px, py], at: [Math.round(-4 * factor), Math.round(-24 * factor)], w, h: Math.round(48 * factor) }, a));
        const set = { list, px, py, w: W, h: H, factor };
        if (this.shared.built.gavels.size >= 2) this.shared.built.gavels.delete(this.shared.built.gavels.keys().next().value);
        this.shared.built.gavels.set(len, set);
        return set;
    }

    nearestAngle(a) {
        let n = 0, d = 1e9;
        this.GAVEL_ANGLES.forEach((angle, i) => { if (Math.abs(angle - a) < d) { n = i; d = Math.abs(angle - a); } });
        return n;
    }

    /** 서서 살짝 뒤로 → 빨라지며 앞으로 넘어짐 → 닿고 살짝 튐(도). */
    gavelDegrees(t, plan) {
        if (t < plan.T0) return -90 - 10 * this.shared.clamp(t / plan.T0);
        if (t < plan.T1) return -100 * (1 - this.shared.clamp((t - plan.T0) / plan.swing) ** 2);
        return 3 * Math.sin(this.shared.clamp((t - plan.T1) / 110) * Math.PI);
    }

    gavelBody(ctx, t, alpha, plan) {
        const set = this.gavelPoses(plan.L);
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(this.shared.snap(plan.px), this.shared.snap(-44 * set.factor)); ctx.scale(plan.f, 1); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(set.list[this.nearestAngle(this.gavelDegrees(t, plan))], -set.px * 2, -set.py * 2, set.w * 2, set.h * 2);
        ctx.restore();
    }

    /** 땅: 판정 상자의 네 모서리(효과 확장 깊이까지), 닿으면 칸마다 짧은 바닥 균열과 머리 자리의 고리. */
    gavelGround(ctx, t, plan, cells) {
        const age = t - plan.T1, xa = plan.f * 0.5 * this.shared.WIDE, xb = plan.f * 3.5 * this.shared.WIDE, left = Math.min(xa, xb), right = Math.max(xa, xb);
        const top = -plan.depth * this.shared.DEEP, bottom = plan.depth * this.shared.DEEP;
        ctx.save(); ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = age < 0 ? 0.2 * this.shared.clamp(t / 100) : 0.6 * (1 - this.shared.clamp(age / 480));
        for (const x of [left, right]) for (const y of [top, bottom]) {
            const dx = x === left ? 1 : -1, dy = y === top ? 1 : -1;
            this.shared.pixelLine(ctx, [x, y], [x + dx * 16, y], '#bf9c66');
            this.shared.pixelLine(ctx, [x, y], [x, y + dy * 9], '#bf9c66');
        }
        if (age >= 0) {
            ctx.globalAlpha = 0.62 * (1 - this.shared.clamp((age - 90) / 380));
            cells.forEach(([x, y], i) => {
                const side = i % 2 ? 1 : -1;
                this.shared.pixelLine(ctx, [x - 10, y + 4], [x, y], '#65503d', 4);
                this.shared.pixelLine(ctx, [x, y], [x + side * 14, y - 4], '#c9ad7b', 2);
                this.shared.pixelLine(ctx, [x + side * 14, y - 4], [x + side * 22, y - 2], '#a58457', 2);
            });
            const u = this.shared.clamp(age / 280);
            this.shared.dotRing(ctx, this.gavelHead(plan), 18 + u * 55, 7 + u * 23, 0.72 * (1 - u));
        }
        ctx.restore();
    }

    /** 위: 판결봉(내리찍는 동안 옅은 잔상 하나)과 닿을 때 흩어지는 금빛 조각 열둘. */
    gavelSky(ctx, t, plan) {
        const age = t - plan.T1, fade = 1 - this.shared.clamp((age - 160) / 260), entrance = this.shared.clamp(t / 70);
        if (t > plan.T0 && t < plan.T1) this.gavelBody(ctx, t - 30, 0.15 * entrance, plan);
        if (fade > 0) this.gavelBody(ctx, t, entrance * fade, plan);
        if (age < 0 || age >= 350) return;
        const u = age / 350, head = this.gavelHead(plan);
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * this.shared.TAU, rad = 15 + u * (30 + (i % 3) * 9);
            ctx.globalAlpha = 0.75 * (1 - u); ctx.fillStyle = i % 3 === 0 ? '#e8d2a1' : '#a48659';
            ctx.fillRect(this.shared.snap(head + Math.cos(a) * rad), this.shared.snap(Math.sin(a) * rad * 0.4 - Math.sin(u * Math.PI) * (16 + (i % 2) * 9)), i % 2 ? 2 : 4, 2);
        }
        ctx.globalAlpha = 1;
    }
}

export function createStageGothicGavel(deps, shared) {
    return new StageGothicGavel(deps, shared);
}
