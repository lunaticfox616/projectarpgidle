class StageGothicJudgment {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;

    }

    /** 유죄의 낙뢰: 내려오는 줄기가 발에 닿는 때가 피해의 때(만든 뒤 0.05초)이고, 그 뒤 위쪽부터 걷힌다. 발밑에 작은 고리와 불티. */
    verdictBolt(cell) {
        const impact = 50;
        this.deps.stageSkillStrokes.hang(this.shared.K.at(cell), { life: 340,
            ground: (ctx, age) => { if (age >= impact) { const u = this.shared.clamp((age - impact) / 240); this.shared.dotRing(ctx, 0, 10 + u * 20, 4 + u * 8, 0.65 * (1 - u)); } },
            top: (ctx, age) => {
                const fade = 1 - this.shared.clamp((age - 110) / 220), reveal = Math.floor(128 * this.shared.clamp(age / impact)), crop = Math.floor(96 * this.shared.clamp((age - 160) / 170)), h = reveal - crop;
                ctx.save(); ctx.imageSmoothingEnabled = false;
                if (h > 0) { ctx.globalAlpha = 0.95 * fade; ctx.drawImage(this.shared.image('bolt'), 0, crop, 40, h, -28, this.shared.snap(-256 + crop * 2), 56, h * 2); }
                if (age >= impact && age < impact + 150) {
                    const u = (age - impact) / 150;
                    ctx.globalAlpha = 0.8 * (1 - u);
                    for (const side of [-1, 1]) this.shared.pixelLine(ctx, [side * 5, -7], [side * (12 + u * 20), -12 - u * 12], '#dfc797', 2);
                }
                ctx.restore();
            } });
    }

    /** 칸 하나의 가는 금빛 낙뢰(at: 그 칸의 발 자리): 닿는 때는 그 칸의 피해와 같고, 그 뒤 위쪽부터 사라져 접촉부만 남는다. wide: 첫 칸은 조금 굵다. */
    judgmentBolt(at, delay, wide) {
        this.deps.stageSkillVfx.paint(at, { life: 260, delay, layer: 'top' }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            const fade = 1 - this.shared.clamp((t - 65) / 195), crop = Math.floor(this.shared.clamp((t - 85) / 175) * 105), h = 128 - crop, width = wide ? 64 : 48;
            ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = (wide ? 1 : 0.92) * fade;
            ctx.drawImage(this.shared.image('bolt'), 0, crop, 40, h, this.shared.snap(-width / 2), this.shared.snap(-256 + crop * 2), width, h * 2);
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2, travel = this.shared.clamp(t / 180);
                this.shared.streak(ctx, [Math.cos(a) * 7, Math.sin(a) * 4], [Math.cos(a) * (12 + 22 * travel), Math.sin(a) * (7 + 10 * travel)], '#c9ad75', 0.6 * fade);
            }
            ctx.restore();
        });
    }

    /** 닿은 자리(at)의 상아색 납작한 고리(예전의 밝은 고리와 충격 대신). */
    judgmentRing(at, delay, life) {
        this.deps.stageSkillVfx.paint(at, { life, delay, layer: 'ground' }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            const u = this.shared.clamp(t / life);
            this.shared.oval(ctx, this.shared.built.ivory, 14 + u * 30, 6 + u * 12, 0.7 * (1 - u));
        });
    }

    /** 십자의 가로, 세로 칸을 잇는 금빛 바닥 선(0.44초에 옅어진다). centre: 십자 가운데 칸, cells: 십자 칸들. */
    judgmentCross(centre, cells) {
        const xs = cells.map(cell => (cell.gx - centre.gx) * this.shared.WIDE), ys = cells.map(cell => (cell.gy - centre.gy) * this.shared.DEEP);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        this.deps.stageSkillVfx.paint(this.shared.K.at(centre), { life: 440, layer: 'ground' }, (ctx, t, dot) => {
            ctx.scale(dot, dot);
            ctx.globalAlpha = 0.48 * (1 - this.shared.clamp((t - 160) / 280));
            ctx.fillStyle = '#ba935e'; ctx.fillRect(this.shared.snap(x0), -2, this.shared.snap(x1 - x0), 4); ctx.fillRect(-2, this.shared.snap(y0), 4, this.shared.snap(y1 - y0));
            ctx.fillStyle = '#e5cd98'; ctx.fillRect(this.shared.snap(x0), 0, this.shared.snap(x1 - x0), 2); ctx.fillRect(0, this.shared.snap(y0), 2, this.shared.snap(y1 - y0));
        });
    }
}

export function createStageGothicJudgment(deps, shared) {
    return new StageGothicJudgment(deps, shared);
}
