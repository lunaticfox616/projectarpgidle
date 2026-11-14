import { getBattleActorDrawAlpha } from './battle-sprite-alpha.mjs';

const OUTLINED_SPRITE_CACHE_LIMIT = 192;
export class BattleSpritePainter {
    constructor(inputs) {
        this.inputs = inputs;
        this.disposed = false;
        this.outlinedSpriteCache = new Map();
        this.outlinedSpriteImageIds = new WeakMap();
        this.outlinedSpriteNextImageId = 1;
    }
    getOutlinedSpriteSurface(sourceImage, src, size, outline) {
        let imageId = this.outlinedSpriteImageIds.get(sourceImage);
        if (!imageId) { imageId = this.outlinedSpriteNextImageId++; this.outlinedSpriteImageIds.set(sourceImage, imageId); }
        const key = [imageId, src.x, src.y, src.w, src.h, size.w, size.h, outline.color, outline.thickness, outline.smooth, outline.fill].join('|');
        const cached = this.outlinedSpriteCache.get(key);
        if (cached) {
            this.outlinedSpriteCache.delete(key);
            this.outlinedSpriteCache.set(key, cached);
            return cached;
        }
        const surface = this.createOutlinedSpriteSurface(sourceImage, src, size, outline);
        if (!surface) return null;
        this.outlinedSpriteCache.set(key, surface);
        if (this.outlinedSpriteCache.size > OUTLINED_SPRITE_CACHE_LIMIT) this.outlinedSpriteCache.delete(this.outlinedSpriteCache.keys().next().value);
        return surface;
    }

    createOutlinedSpriteSurface(sourceImage, src, size, outline) {
        if (typeof this.inputs.document === 'undefined' || typeof this.inputs.document.createElement !== 'function') return null;
        const t = outline.thickness, color = outline.color;
        const canvas = this.inputs.document.createElement('canvas');
        canvas.width = size.w + t * 2;
        canvas.height = size.h + t * 2;
        const c = canvas.getContext && canvas.getContext('2d');
        if (!c) return null;
        c.imageSmoothingEnabled = outline.smooth;
        if (!outline.fill) c.filter = `drop-shadow(0 ${t}px 0 ${color}) drop-shadow(0 ${-t}px 0 ${color}) drop-shadow(${t}px 0 0 ${color}) drop-shadow(${-t}px 0 0 ${color})`;
        c.drawImage(sourceImage, src.x, src.y, src.w, src.h, t, t, size.w, size.h);
        if (outline.fill) {
            c.globalCompositeOperation = 'source-in';
            c.fillStyle = color;
            c.fillRect(0, 0, canvas.width, canvas.height);
        }
        return canvas;
    }

    drawBattleSpriteImage(ctx, image, source, box, flash) {
        if (this.disposed) return;
        ctx.drawImage(image, ...source, ...box);
        if (!(flash > 0)) return;
        const [x, y, w, h] = source;
        const surface = this.getOutlinedSpriteSurface(image, { x, y, w, h }, { w, h },
            { color: '#fff4df', thickness: 0, smooth: false, fill: true });
        if (!surface) return;
        ctx.save();
        ctx.filter = 'none';
        ctx.globalAlpha *= Math.min(1, Number(flash));
        ctx.drawImage(surface, ...box);
        ctx.restore();
    }

    drawBattleSpriteOutline(ctx, sourceImage, src, box, options) {
        if (this.disposed) return;
        const thickness = Math.max(1, Math.round(options.outlineThickness || 1));
        const surface = this.getOutlinedSpriteSurface(sourceImage, src, { w: box.w, h: box.h },
            { color: options.outlineColor, thickness, smooth: ctx.imageSmoothingEnabled !== false });
        if (!surface) return;
        ctx.globalAlpha = (options.alpha === undefined ? 1 : options.alpha) * (options.outlineAlpha || 0.78);
        ctx.drawImage(surface, box.x - thickness, box.y - thickness, box.w + thickness * 2, box.h + thickness * 2);
        ctx.globalAlpha = options.alpha === undefined ? 1 : options.alpha;
    }

    drawBattleSprite([ctx, image, rect, x, y, desiredHeight, options]) {
        if (this.disposed) return;
        if (!rect) return;
        options = options || {};
        let sourceImage = rect.image || image;
        if (!sourceImage) return;
        let basisHeight = options.basisHeight || rect.basisHeight || rect.height;
        let scale = desiredHeight / basisHeight;
        let { cropLeft, cropRight, cropTop, cropBottom } = readBattleSpriteCrop(options, rect);
        let srcX = rect.x + cropLeft;
        let srcY = rect.y + cropTop;
        let srcW = Math.max(1, rect.width - cropLeft - cropRight);
        let srcH = Math.max(1, rect.height - cropTop - cropBottom);
        let drawWidth = Math.max(1, Math.round(srcW * scale));
        let drawHeight = Math.max(1, Math.round(srcH * scale));
        let { sourceAnchorX, sourceAnchorY } = readBattleSpriteAnchors.call(this, { options, rect, cropLeft, srcW, cropTop, srcH });
        let { dx, dy } = placeBattleSpriteOrigin({ options, rect, x, sourceAnchorX, scale, y, sourceAnchorY });
        ctx.save();
        ctx.globalAlpha = getBattleActorDrawAlpha(ctx,options.alpha);
        if (options.smoothing === 'high') {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        } else if (options.smoothing === 'pixel') {
            ctx.imageSmoothingEnabled = false;
            ctx.imageSmoothingQuality = 'low';
        }
        paintBattleSpriteTransform.call(this, { options, ctx, x, y, drawHeight, sourceImage, srcX, srcY, srcW, srcH, drawWidth, dx, dy });
        ctx.restore();
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.outlinedSpriteCache.clear();
        this.outlinedSpriteImageIds = new WeakMap();
        this.outlinedSpriteNextImageId = 1;
    }
}

function readBattleSpriteCrop(options, rect) {
    let cropLeft = Math.max(0, Math.round(options.cropLeft === undefined ? (rect.cropLeft || 0) : options.cropLeft));
    let cropRight = Math.max(0, Math.round(options.cropRight === undefined ? (rect.cropRight || 0) : options.cropRight));
    let cropTop = Math.max(0, Math.round(options.cropTop === undefined ? (rect.cropTop || 0) : options.cropTop));
    let cropBottom = Math.max(0, Math.round(options.cropBottom === undefined ? (rect.cropBottom || 0) : options.cropBottom));
    return { cropLeft, cropRight, cropTop, cropBottom };
}

function readBattleSpriteAnchors({ options, rect, cropLeft, srcW, cropTop, srcH }) {
    let rawAnchorX = Number.isFinite(options.anchorX) ? options.anchorX : (Number.isFinite(rect.anchorX) ? rect.anchorX : rect.width / 2);
    let rawAnchorY = Number.isFinite(options.anchorY) ? options.anchorY : (Number.isFinite(rect.anchorY) ? rect.anchorY : rect.height);
    let sourceAnchorX = this.inputs.clampNumber(rawAnchorX - cropLeft, 0, srcW);
    let sourceAnchorY = this.inputs.clampNumber(rawAnchorY - cropTop, 0, srcH);
    return { sourceAnchorX, sourceAnchorY };
}

function placeBattleSpriteOrigin({ options, rect, x, sourceAnchorX, scale, y, sourceAnchorY }) {
    let drawOffsetX = Number(options.offsetX !== undefined ? options.offsetX : rect.offsetX) || 0;
    let drawOffsetY = Number(options.offsetY !== undefined ? options.offsetY : rect.offsetY) || 0;
    let dx = Math.round(x - sourceAnchorX * scale + drawOffsetX);
    let dy = Math.round(y - sourceAnchorY * scale + drawOffsetY);
    return { dx, dy };
}

function paintBattleSpriteTransform({ options, ctx, x, y, drawHeight, sourceImage, srcX, srcY, srcW, srcH, drawWidth, dx, dy }) {
    if (options.rotation) {
        ctx.translate(Math.round(x + (options.offsetX || 0)), Math.round(y - drawHeight / 2 + (options.offsetY || 0)));
        ctx.rotate(options.rotation);
        if (options.outlineColor) this.drawBattleSpriteOutline(ctx, sourceImage, { x: srcX, y: srcY, w: srcW, h: srcH },
            { x: Math.round(-drawWidth / 2), y: Math.round(-drawHeight / 2), w: drawWidth, h: drawHeight }, options);
        this.drawBattleSpriteImage(ctx, sourceImage, [srcX, srcY, srcW, srcH], [Math.round(-drawWidth / 2), Math.round(-drawHeight / 2), drawWidth, drawHeight], options.flash);
    } else {
        if (options.devicePixelSnap === true) {
            let snappedRect = this.inputs.snapCanvasRectToDevicePixels(ctx, dx, dy, drawWidth, drawHeight);
            dx = snappedRect.x;
            dy = snappedRect.y;
            drawWidth = snappedRect.width;
            drawHeight = snappedRect.height;
        }
        if (options.flipX) {
            let centerX = dx + drawWidth / 2;
            ctx.translate(centerX, 0);
            ctx.scale(-1, 1);
            ctx.translate(-centerX, 0);
        }
        if (options.outlineColor) this.drawBattleSpriteOutline(ctx, sourceImage, { x: srcX, y: srcY, w: srcW, h: srcH },
            { x: dx, y: dy, w: drawWidth, h: drawHeight }, options);
        this.drawBattleSpriteImage(ctx, sourceImage, [srcX, srcY, srcW, srcH], [dx, dy, drawWidth, drawHeight], options.flash);
    }
}
