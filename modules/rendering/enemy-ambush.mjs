// 기습 정예의 순간이동(js/enemy-ambush.js, battleFx 'ambushBlink'): 떠난 자리에 사라짐, 닿은 자리에 나타남 효과를 그리고(Codex 그림
// assets/stage-vfx/ambush, 192칸 6장, 발 자리 96, 168, 투명도 두 단계에 30색 안팎), 그사이 몸을 숨겼다가 나타남 효과와 함께 드러낸다. 칸은 이미 옮겨져 있다.
class EnemyAmbushView {
    constructor(deps) {
        this.deps = deps;
        this.RULE = this.deps.ELITE_AMBUSH;
        this.CELL = 192;
        this.FRAMES = 6;
        this.FEET = Object.freeze([96, 168]);
        this.FX_SCALE = 1.2;
        this.sheets = new Map();
    }

    /** 효과 그림(처음 부를 때 불러 둔다). 다 불러오기 전에는 null이라 그 프레임은 건너뛴다. */
    sheet(name) {
        if (!this.sheets.has(name)) this.sheets.set(name, this.deps.stageAssetRetry.image(`assets/stage-vfx/ambush/${name}.png?v=20261108-2`));
        const img = this.sheets.get(name);
        return this.deps.stageAssetRetry.loaded(img) ? img : null;
    }

    /** 이 몬스터의 가장 최근 순간이동 효과, 없으면 null(기습 외형이 아니면 찾지도 않는다). */
    blinkOf(enemy) {
        if (!this.deps.enemyAmbush.eligible(enemy)) return null;
        for (let i = this.deps.battleFx.length - 1; i >= 0; i--) {
            const fx = this.deps.battleFx[i];
            if (fx && fx.type === 'ambushBlink' && fx.enemyId === enemy.id) return fx;
        }
        return null;
    }

    /** 몸의 불투명도(0~1): 사라짐 효과가 시작되면 숨고, 나타남 효과 동안 드러난다. */
    alphaOf(enemy, now) {
        const fx = this.blinkOf(enemy);
        if (!fx || now < fx.start) return 1;
        const shown = now - fx.start - this.RULE.vanishMs - this.RULE.hiddenMs;
        return this.deps.clampNumber(shown / this.RULE.appearMs, 0, 1);
    }

    feetOf(cell, footprint, gridProj) {
        return gridProj.cellToScreen(cell.gx + (footprint.columns - 1) / 2, cell.gy + (footprint.rows - 1) / 2);
    }

    drawSheet(ctx, name, at, frame, dot) {
        const img = this.sheet(name);
        if (!img) return;
        const size = Math.round(this.CELL * dot);
        ctx.drawImage(img, frame * this.CELL, 0, this.CELL, this.CELL, Math.round(at.x - this.FEET[0] * dot), Math.round(at.y - this.FEET[1] * dot), size, size);
    }

    /** 사라짐(떠난 자리)과 나타남(닿은 자리) 효과 한 프레임. */
    draw(ctx, fx, now, gridProj) {
        if (!gridProj || !fx.from || !fx.to) return;
        const footprint = fx.footprint || { columns: 1, rows: 1 }, dot = this.deps.stageActors.scaleFor(gridProj.tileW) * this.FX_SCALE;
        const t = now - fx.start, appearAt = this.RULE.vanishMs + this.RULE.hiddenMs;
        const frameAt = (age, span) => Math.min(this.FRAMES - 1, Math.floor(age / span * this.FRAMES));
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (t < this.RULE.vanishMs) this.drawSheet(ctx, 'vanish', this.feetOf(fx.from, footprint, gridProj), frameAt(t, this.RULE.vanishMs), dot);
        if (t >= appearAt && t < appearAt + this.RULE.appearMs) this.drawSheet(ctx, 'appear', this.feetOf(fx.to, footprint, gridProj), frameAt(t - appearAt, this.RULE.appearMs), dot);
        ctx.restore();
    }
}

export function createEnemyAmbushView(deps) {
    const instance = new EnemyAmbushView(deps);
    return Object.freeze({ alphaOf: instance.alphaOf.bind(instance), draw: instance.draw.bind(instance) });
}
