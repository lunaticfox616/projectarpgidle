class StageGothicChandelier {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;

    }

    /** plan: chandPlan({ A, B, T0 매달림, T1 부딪힘, fall, face, fireLag }). */
    chandGround(ctx, t, plan) {
        const age = t - plan.T1, fall = this.shared.clamp((t - plan.T0) / plan.fall);
        if (age < 0) { this.shared.oval(ctx, this.shared.built.shadow, 30 + fall * 37, 10 + fall * 12, 0.3 + fall * 0.35); return; }
        this.shared.oval(ctx, this.shared.built.shadow, 72, 25, 0.6 * (1 - this.shared.clamp(age / 1000)));
        const u = age / 350;
        if (u < 1.2) this.shared.oval(ctx, this.shared.built.gold, plan.A * Math.min(1, u), plan.B * Math.min(1, u), 0.84 * (1 - this.shared.clamp((u - 0.55) / 0.65)));
        const v = (age - plan.fireLag) / 440;
        if (v > 0 && v < 1.15) this.shared.oval(ctx, this.shared.built.fire, plan.A * Math.min(1, v), plan.B * Math.min(1, v), 0.6 * (1 - this.shared.clamp((v - 0.5) / 0.65)));
    }

    /** 매달림 → 가속하며 떨어짐 → 샹들리에 제 조각 여섯이 짧은 포물선으로 흩어져 내려앉는다. */
    chandSky(ctx, t, plan) {
        const age = t - plan.T1, fall = this.shared.clamp((t - plan.T0) / plan.fall), sky = this.shared.screenTop(ctx);
        ctx.save(); ctx.imageSmoothingEnabled = false;
        if (age < 0) {
            const top = sky - 34 + (-154 - (sky - 34)) * fall * fall, sway = fall ? plan.face * 4 * fall : Math.sin(t / 120) * 4;
            ctx.globalAlpha = this.shared.clamp(t / 55);
            if (t < plan.T0) { ctx.fillStyle = '#4b3829'; ctx.fillRect(-2, Math.floor(sky), 4, Math.max(0, this.shared.snap(top + 18 - sky))); }
            ctx.drawImage(this.shared.image('chandelier'), this.shared.snap(-96 + sway), this.shared.snap(top), 192, 160);
            if (fall > 0.2) for (let i = -1; i <= 1; i++) this.shared.streak(ctx, [i * 48, top + 18], [0, -20 * fall], '#a68857', 0.32 * fall);
        } else {
            const u = this.shared.clamp(age / 360), fade = 1 - this.shared.clamp((age - 400) / 400);
            this.shared.built.pieces.forEach(({ image: piece, rect: r }, i) => {
                const side = (i % 3) - 1, depth = i < 3 ? -1 : 1;
                const dx = side * (30 + Math.abs(side) * 38) * u, dy = depth * plan.B * 0.34 * u - Math.sin(u * Math.PI) * (26 + (i % 2) * 17);
                const x = -96 + r[0] * 2 + dx, y = -154 + r[1] * 2 + dy + u * (144 - r[1] * 2 - r[3] * 0.6);
                ctx.globalAlpha = fade;
                ctx.drawImage(piece, this.shared.snap(x), this.shared.snap(y), r[2] * 2, Math.max(2, this.shared.snap(r[3] * 2 * (1 - 0.7 * u))));
            });
            if (age < 300) for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4, u2 = age / 300;
                this.shared.streak(ctx, [Math.cos(a) * 18, -8 + Math.sin(a) * 6], [Math.cos(a) * (22 + u2 * 52), Math.sin(a) * (10 + u2 * 22) - 12 * (1 - u2)], '#d4b776', 0.65 * (1 - u2));
            }
        }
        ctx.restore();
    }
}

export function createStageGothicChandelier(deps, shared) {
    return new StageGothicChandelier(deps, shared);
}
