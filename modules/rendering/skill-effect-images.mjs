/** Bake each image/filter pair once. Unloaded images keep the old live-filter fallback. */
export class SkillEffectImages {
    constructor(createCanvas) { this.createCanvas = createCanvas; this.cache = new WeakMap(); }

    use(ctx, image, filter) {
        filter = filter || 'none';
        if (!image || filter === 'none' || !image.width || !image.height) {
            ctx.filter = filter;
            return image;
        }
        let byFilter = this.cache.get(image);
        if (!byFilter) this.cache.set(image, byFilter = new Map());
        let baked = byFilter.get(filter);
        if (!baked) {
            baked = this.createCanvas();
            baked.width = image.width;
            baked.height = image.height;
            const bakeCtx = baked.getContext('2d');
            bakeCtx.filter = filter;
            bakeCtx.drawImage(image, 0, 0);
            byFilter.set(filter, baked);
        }
        ctx.filter = 'none';
        return baked;
    }

    dispose() { this.cache = new WeakMap(); }
}
