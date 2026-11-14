class StageRitualBrush {
    constructor(deps) {
        this.deps = deps;
        this.K = this.deps.stageSkillKit;
        this.ST = this.deps.stageSkillStrokes;
        this.TAU = Math.PI * 2;
        this.WIDE = this.K.WIDE;
        this.DEEP = this.K.DEEP;
        this.GOLD = Object.freeze(['#6e4b14', '#c4953a', '#e3bf5e', '#fbecae']);
        this.ink = element => this.deps.STAGE_SKILL_VFX.elements[element] || this.deps.STAGE_SKILL_VFX.elements.phys;
        this.semi = r => [(r + 0.5) * this.WIDE, (r + 0.5) * this.DEEP];
        this.RING = Object.freeze({ x: 0, y: 0, step: 1, turn: 0, w: 2, h: 1, nudge: 0 });
        this.hangPair = (spot, life, ground, top) => this.ST.hang(this.K.at(spot), { life, ground, top });
        this.sprites = new Map();
        this.BRASS = Object.freeze({ OUT: '#3a2608', DK: '#6e4b14', MID: '#9c6f22', BASE: '#c4953a', LT: '#e3bf5e', HI: '#fbecae' });
    }

    /** 붓(도트 배율)의 원점에서 캔버스 위 끝까지(도트, 음수). */
    screenTop(ctx) { const m = ctx.getTransform(); return -m.f / m.d; }

    ovalFill(ctx, x, y, a, b) { ctx.beginPath(); ctx.ellipse(x, y, a, b, 0, 0, this.TAU); ctx.fill(); }

    /** 점선 고리: n 등분 가운데 step마다 w×h 점(nudge 점을 왼쪽으로 비킴). */
    dotRing(ctx, ring) {
        const o = { ...this.RING, ...ring };
        for (let i = 0; i < o.n; i += o.step) { const q = i / o.n * this.TAU + o.turn; ctx.fillRect(Math.round(o.x + Math.cos(q) * o.a) - o.nudge, Math.round(o.y + Math.sin(q) * o.b), o.w, o.h); }
    }

    /** 클립을 그 칸에 세운다(시뮬레이터 vfxBody): 바닥 기준 클립은 발 자리, 가운데 기준 클립은 몸 높이. o.dx, o.dy 도트 비킴. */
    standClip(ref, spot, o) {
        return this.deps.stageSkillVfx.play(ref, this.K.at(spot, o.dx || 0, (this.K.onGround(ref) ? 1 : -46) + (o.dy || 0)), o);
    }

    sprite(key, size, draw) {
        if (!this.sprites.has(key)) {
            const canvas = this.deps.document.createElement('canvas');
            canvas.width = size[0]; canvas.height = size[1];
            const g = canvas.getContext('2d');
            draw(g, (x, y, colour) => { g.fillStyle = colour; g.fillRect(x, y, 1, 1); });
            this.sprites.set(key, canvas);
        }
        return this.sprites.get(key);
    }
}

export function createStageRitualBrush(deps) {
    return new StageRitualBrush(deps);
}
