function isAtlasBackgroundPixel(r, g, b, a) {
    if (a < 20) return true;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const avg = (r + g + b) / 3;
    if (avg >= 240) return true;
    if (avg >= 222 && spread <= 18) return true;
    return avg >= 206 && spread <= 12;
}

function contentBounds(frame, rect) {
    const { data } = frame;
    const { width, height } = rect;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            if (isAtlasBackgroundPixel(data[idx], data[idx + 1], data[idx + 2], data[idx + 3])) continue;
            minX = Math.min(minX, x); minY = Math.min(minY, y);
            maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
        }
    }
    return { minX, minY, maxX, maxY };
}

/** Browser image readback boundary; failed/cross-origin reads retain the original cell. */
export class BattleSpriteContent {
    constructor(deps) {
        this.deps = deps;
        this.cache = new WeakMap();
        this.warnedImages = new WeakSet();
    }

    context(image) {
        if (!image) return null;
        if (this.cache.has(image)) return this.cache.get(image);
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        this.cache.set(image, ctx);
        return ctx;
    }

    trimRectToContent(image, rect, padding) {
        padding = padding || 2;
        try {
            const ctx = this.context(image);
            if (!ctx) return rect;
            const frame = ctx.getImageData(rect.x, rect.y, rect.width, rect.height);
            const { minX, minY, maxX, maxY } = contentBounds(frame, rect);
            if (maxX < minX || maxY < minY) return rect;
            const x = Math.max(0, rect.x + minX - padding), y = Math.max(0, rect.y + minY - padding);
            const right = Math.min(image.width, rect.x + maxX + 1 + padding);
            const bottom = Math.min(image.height, rect.y + maxY + 1 + padding);
            return { x, y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
        } catch (error) {
            this.warnReadback(image, rect, error);
            return rect;
        }
    }

    warnReadback(image, rect, error) {
        const reference = image !== null && (typeof image === 'object' || typeof image === 'function');
        if (reference && this.warnedImages.has(image)) return;
        if (reference) this.warnedImages.add(image);
        this.deps.console.warn('Battle sprite crop failed; using original cell.', { image: image?.src, rect, error });
    }
}
