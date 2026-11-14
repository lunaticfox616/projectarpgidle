const OCCLUDED_RIM_DIRECTIONS = Object.freeze([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]);
const overlaps = (a, b) => a.x < b.x + b.w + 3 && a.x + a.w + 3 > b.x && a.y < b.y + b.h + 3 && a.y + a.h + 3 > b.y;

/** Frame-local actor masks, owned and released by the scene. Never serialized. */
class PlayerOcclusionRenderer {
    constructor(deps) {
        this.deps = deps;
        this.mask = this.edge = this.cover = this.outline = null;
    }

    surface(current, size) {
        const canvas = current || this.deps.createCanvas();
        if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.resetTransform(); ctx.clearRect(0, 0, size, size); ctx.imageSmoothingEnabled = false;
        return canvas;
    }

    capture(state, position, clips) {
        const tile = state.gridProj.tileW, size = Math.ceil(Math.min(512, Math.max(128, tile * 5)));
        this.mask = this.surface(this.mask, size); this.edge = this.surface(this.edge, size);
        const x = Math.round(position.x - size / 2), y = Math.round(position.y - size * 0.8), body = this.mask.getContext('2d');
        body.save(); body.translate(-x, -y);
        if (this.deps.isMirrored(state.motionState)) { body.translate(position.x * 2, 0); body.scale(-1, 1); }
        this.deps.drawFigure(body, state, position); body.restore();
        const style = this.deps.outlineStyle;
        body.save(); body.globalCompositeOperation = 'source-in'; body.fillStyle = style.color; body.fillRect(0, 0, size, size); body.restore();
        // 테는 여덟 방향으로 찍어 모서리가 비지 않게 굵게(예전 한 도트 네 방향은 몬스터 테두리에 묻혔다).
        const ctx = this.edge.getContext('2d'), step = style.dots[tile >= 64 ? 1 : 0];
        ctx.save();
        for (const [dx, dy] of OCCLUDED_RIM_DIRECTIONS) ctx.drawImage(this.mask, dx * step, dy * step);
        ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(this.mask, 0, 0); ctx.restore();
        this.cutToCover(state, { x, y, size }, clips);
        this.outline = { x, y, clips };
    }

    /** On the stage the pale body and its rim stay only where a monster in front really covers the hero: those monsters are
     * drawn once more onto a mask and both layers are cut to it. Monsters there are wide and low or tall and thin, and the
     * boxes alone lit the hero up beside them (2026-10-13 사용자: 겹친 부분이 하얗게 뜬다). */
    cutToCover(state, origin, clips) {
        this.cover = this.surface(this.cover, origin.size);
        const ctx = this.cover.getContext('2d');
        ctx.save(); ctx.translate(-origin.x, -origin.y);
        clips.forEach(box => this.deps.drawEnemy(ctx, box.entry, state));
        ctx.restore();
        for (const layer of [this.mask, this.edge]) {
            const cut = layer.getContext('2d');
            cut.save(); cut.globalCompositeOperation = 'destination-in'; cut.drawImage(this.cover, 0, 0); cut.restore();
        }
    }

    begin(scene, entries) {
        this.outline = null;
        const state = this.deps.actorState(scene);
        const p = this.deps.hurtPosition(state), tile = state.gridProj.tileW;
        const head = this.deps.headY(state.now) ?? p.y - 82 * this.deps.heroSizeScale;
        const hero = { x: p.x - Math.max(26, tile * 0.38), y: head - 16, w: Math.max(52, tile * 0.76), h: p.y - head + 24 };
        if (state.returnWarp || state.returnDeparture || state.actorAlpha === 0) return;
        const clips = entries.filter(entry => entry.y >= p.y).map(entry => {
            const height = this.deps.enemyBarLift(entry.enemy) - 8;
            return { x: entry.x - height * 0.5, y: entry.y - height, w: height, h: height + 10, entry };
        }).filter(box => overlaps(box, hero));
        if (clips.length) this.capture(scene, p, clips);
    }

    /** 가린 몬스터 자리에서만: 주인공의 몸이 반투명하게 비치고 그 둘레에 굵은 테. */
    draw(ctx) {
        if (!this.outline) return;
        const style = this.deps.outlineStyle;
        ctx.save(); ctx.beginPath();
        this.outline.clips.forEach(box => ctx.rect(box.x, box.y, box.w, box.h)); ctx.clip();
        ctx.globalAlpha = style.fill; ctx.drawImage(this.mask, this.outline.x, this.outline.y);
        ctx.globalAlpha = style.alpha; ctx.drawImage(this.edge, this.outline.x, this.outline.y); ctx.restore();
    }

    /** The spot of a label or bar: over its own monster. 몬스터가 주인공과 늘 겹쳐 서므로 비켜 올리면 막대가 걸음마다 위아래로 튄다. */
    place(box) {
        return { ...box };
    }

    dispose() { this.mask = this.edge = this.cover = this.outline = null; }
}

export function createPlayerOcclusionRenderer(deps) {
    const owner = new PlayerOcclusionRenderer(deps);
    return Object.freeze({ begin: owner.begin.bind(owner), draw: owner.draw.bind(owner), place: owner.place.bind(owner), dispose: owner.dispose.bind(owner) });
}
