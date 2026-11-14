class StageSkillRaw {
    constructor(deps) {
        this.deps = deps;
        this.RAW_SHEET = 2;
        this.tinted = new Map();
    }

    /** 그 칸이 든 그림과 자리: o.source(금빛으로 칠한 띠)가 있으면 그 그림에서, 아니면 vfx3.png에서. */
    rawCell(row, frame, o) {
        return o.source ? { image: o.source, x: frame * row.w, y: 0 } : { image: this.deps.stageSkillVfx.picture(this.RAW_SHEET), x: row.x + frame * row.w, y: row.y };
    }

    /** 띠의 한 칸을 붓의 원점에 그린다. 붓은 도트 단위다. o: x, y 자리, anchor [x, y] 칸 안의 기준점, scale, flat 눕히는 비율, rot, alpha, source 대신 쓸 그림. */
    drawRaw(ctx, name, frame, o) {
        const row = this.deps.STAGE_SKILL_VFX.raw[name], cell = row ? this.rawCell(row, frame, o) : null;
        if (!cell || !cell.image) return false;
        const look = { x: 0, y: 0, scale: 1, flat: 1, rot: 0, alpha: 1, anchor: [row.w / 2, row.h / 2], ...o };
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha *= look.alpha;
        ctx.translate(Math.round(look.x), Math.round(look.y));
        ctx.rotate(look.rot);
        ctx.drawImage(cell.image, cell.x, cell.y, row.w, row.h, Math.round(-look.anchor[0] * look.scale), Math.round(-look.anchor[1] * look.scale * look.flat), Math.round(row.w * look.scale), Math.round(row.h * look.scale * look.flat));
        ctx.restore();
        return true;
    }

    tintRaw(name, swaps) {
        if (this.tinted.has(name)) return this.tinted.get(name);
        const image = this.deps.stageSkillVfx.picture(this.RAW_SHEET), row = this.deps.STAGE_SKILL_VFX.raw[name];
        if (!image || !row) return null;
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = row.w * row.n; canvas.height = row.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, row.x, row.y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
            const colour = pixels.data[i + 3] ? swaps.get(`${pixels.data[i]},${pixels.data[i + 1]},${pixels.data[i + 2]}`) : null;
            if (colour) pixels.data.set(colour, i);
        }
        ctx.putImageData(pixels, 0, 0);
        this.tinted.set(name, canvas);
        return canvas;
    }
}

export function createStageSkillRaw(deps) {
    return new StageSkillRaw(deps);
}
