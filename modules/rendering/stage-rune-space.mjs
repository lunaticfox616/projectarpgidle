class StageRuneSpace {
    constructor(deps) {
        this.deps = deps;
        this.K = this.deps.stageSkillKit;
        this.TAU = Math.PI * 2;
        this.ORIGIN = Object.freeze({ gx: 0, gy: 0 });
        this.clamp = (value, low, high) => Math.min(high, Math.max(low, value));
        this.inkOf = (element, fallback) => this.deps.STAGE_SKILL_VFX.elements[element] || this.deps.STAGE_SKILL_VFX.elements[fallback];
        this.standDy = ref => (this.K.onGround(ref) ? 1 : -46);
        this.grounds = new WeakMap();
    }

    disc(ctx, x, y, r, colour) {
        ctx.fillStyle = colour;
        ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, this.TAU); ctx.fill();
    }

    /** 도트 붓: 그 자리(발, K.screen)로 옮겨 도트 단위로 draw를 부른다. */
    inDots(ctx, at, draw) {
        ctx.save();
        ctx.translate(Math.round(at.x), Math.round(at.y));
        ctx.scale(at.dot, at.dot);
        draw();
        ctx.restore();
    }

    /** 화면 좌표로 그리는 연출 하나: 붓을 칸 0,0에서 화면 원점으로 되돌리고 draw(ctx, 투영, t)를 부른다. */
    screenRow(o, draw) {
        return this.deps.stageSkillVfx.paint(this.K.at(this.ORIGIN), o, (ctx, t) => {
            const p = this.deps.stageSkillVfx.projection();
            if (!p) return;
            const at = this.K.screen(p, this.ORIGIN);
            ctx.translate(-Math.round(at.x), -Math.round(at.y));
            draw(ctx, p, t);
        });
    }

    /** 사건이 불리는 동안 바닥 층(캐릭터 뒤)에 draw(ctx, 투영, 전투 시각, 사건)를 그린다. 사건이 그치면 0.15초 뒤에 걷힌다. */
    groundLayer(c, draw) {
        const clock = this.deps.stageSkillVfx.now();
        let run = this.grounds.get(c.event);
        if (!run) { run = { row: null, drawnAt: 0, offset: 0 }; this.grounds.set(c.event, run); }
        run.offset = c.view.now - clock;
        if (!run.row || clock - run.drawnAt > 200) {   // 처음이거나, 방을 옮겨 걷힌 줄
            run.drawnAt = clock;
            run.row = this.screenRow({ life: 150, layer: 'ground' }, (ctx, p) => { run.drawnAt = this.deps.stageSkillVfx.now(); draw(ctx, p, run.drawnAt + run.offset, c.event); });
        }
        if (run.row) run.row.life = clock - run.row.start + 150;
    }
}

export function createStageRuneSpace(deps) {
    return new StageRuneSpace(deps);
}
