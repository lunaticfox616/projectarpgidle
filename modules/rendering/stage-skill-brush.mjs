class StageSkillBrush {
    constructor(deps) {
        this.deps = deps;
        this.drawMix = (a, b, t) => '#' + [1, 3, 5].map(i => Math.round(this.deps.parseInt(a.slice(i, i + 2), 16) + (this.deps.parseInt(b.slice(i, i + 2), 16) - this.deps.parseInt(a.slice(i, i + 2), 16)) * t).toString(16).padStart(2, '0')).join('');
        this.drawInk = element => this.deps.STAGE_SKILL_VFX.elements[element] || this.deps.STAGE_SKILL_VFX.elements.phys;
        this.sprites = new Map();
    }

    drawCanvas(width, height) {
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        return { canvas, ctx, px: (x, y, colour) => { ctx.fillStyle = colour; ctx.fillRect(x, y, 1, 1); } };
    }

    cached(key, make) {
        if (!this.sprites.has(key)) this.sprites.set(key, make());
        return this.sprites.get(key);
    }
}

export function createStageSkillBrush(deps) {
    const instance = new StageSkillBrush(deps);
    return Object.freeze({ drawCanvas: instance.drawCanvas.bind(instance), cached: instance.cached.bind(instance), drawMix: instance.drawMix, drawInk: instance.drawInk });
}
