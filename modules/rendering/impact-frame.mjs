/** 충격 장면(2026-11-19 카메라 연출): 몇십 ms 동안 방 전체가 검게 칠해지고 보스와 주인공만 하얀 형체로 남는다. 주인공의 피격 실루엣
 * (player-tint.mjs)처럼 같은 그림을 한 장의 판에 한 번 더 그린 뒤 그 판을 한 색으로 채운다. 새 그림은 없다. */
export class ImpactFrame {
    /** createCanvas: () => a fresh canvas element. */
    constructor(createCanvas) {
        this.createCanvas = createCanvas;
        this.layer = null;
        this.keys = null;
        this.used = false;
        /** Alpha (0..255) from which a captured pixel counts as the figure: the floor shadow is drawn at about 87. */
        this.SOLID = 160;
    }

    /** Called once per frame before the actors: keys = the actor keys drawn as silhouettes (a Set), or null when no impact plays. */
    begin(keys) { this.keys = keys; this.used = false; }

    active() { return !!this.keys; }

    /** Draws an actor as usual and, while an impact plays and key is one of its keys, again into the silhouette layer. */
    capture(ctx, key, draw) {
        const result = draw(ctx);
        if (!this.keys || !this.keys.has(key) || !ctx.canvas) return result;
        const paint = this.surface(ctx.canvas);
        paint.save();
        paint.setTransform(ctx.getTransform());
        paint.imageSmoothingEnabled = ctx.imageSmoothingEnabled;
        draw(paint);
        paint.restore();
        return result;
    }

    surface(canvas) {
        this.layer = this.layer || this.createCanvas();
        if (this.layer.width !== canvas.width || this.layer.height !== canvas.height) {
            this.layer.width = canvas.width; this.layer.height = canvas.height;
        }
        const paint = this.layer.getContext('2d', { willReadFrequently: true });
        if (!this.used) { paint.setTransform(1, 0, 0, 1, 0, 0); paint.clearRect(0, 0, this.layer.width, this.layer.height); this.used = true; }
        return paint;
    }

    /** Over everything drawn so far on ctx's canvas: black, then the captured actors in flat white. Returns whether it drew. */
    finish(ctx) {
        if (!this.keys || !ctx.canvas) return false;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if (this.used) { this.whiten(); ctx.drawImage(this.layer, 0, 0); }
        ctx.restore();
        this.keys = null;
        return true;
    }

    /** Flat opaque white where the figures are solid; faint pixels (floor shadows, light, soft edges) drop out. */
    whiten() {
        const paint = this.layer.getContext('2d'), image = paint.getImageData(0, 0, this.layer.width, this.layer.height), data = image.data;
        for (let index = 0; index < data.length; index += 4) {
            const solid = data[index + 3] >= this.SOLID;
            data[index] = data[index + 1] = data[index + 2] = 255;
            data[index + 3] = solid ? 255 : 0;
        }
        paint.putImageData(image, 0, 0);
    }

    dispose() { this.layer = null; this.keys = null; }
}
