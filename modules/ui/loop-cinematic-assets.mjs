// Pictures of the loop cinematic. Loading starts when the loop card shows (or at the latest when the reset runs); a picture that
// has not arrived is skipped by the scenes, never waited for.
import { regionUrl, ACT1_REGION } from './loop-cinematic-snapshot.mjs';

export const BACKDROPS = Object.freeze({ A: 'assets/ui/loop-pixel-abyss.webp', B: 'assets/ui/loop-pixel-rewind.webp' });

export class LoopCinematicAssets {
    constructor(deps) {
        this.deps = deps;
        this.images = new Map();
        this.act1Canvas = null;
        this.pixels = new Map();
    }

    load(key, url) {
        if (this.images.has(key)) return this.images.get(key);
        const img = new this.deps.Image();
        img.decoding = 'async';
        img.src = url;
        this.images.set(key, img);
        return img;
    }

    /** The picture when it has arrived, else null. */
    ready(key) {
        const img = this.images.get(key);
        return img && img.complete && img.naturalWidth > 0 ? img : null;
    }

    act1Parts() {
        const biome = this.deps.STAGE_SCENES?.biomes?.root;
        return biome ? { biome, base: this.deps.STAGE_SCENES.path + biome.dir, query: '?v=' + this.deps.STAGE_SCENES.version } : null;
    }

    loadAct1() {
        const parts = this.act1Parts();
        if (!parts) return;
        this.load('act1:far', parts.base + parts.biome.far.file + parts.query);
        this.load('act1:back', parts.base + parts.biome.back.file + parts.query);
        this.load('act1:floor', parts.base + parts.biome.floor.files[0] + parts.query);
    }

    loadRegion(id) {
        if (id === ACT1_REGION) this.loadAct1();
        else if (id) this.load('region:' + id, regionUrl(this.deps, id));
    }

    loadHero(sheet) { if (sheet) this.load('hero:' + sheet.key, sheet.url); }

    /** Starts every picture a snapshot needs. */
    preload(snapshot, extraSheets = []) {
        this.load('A', BACKDROPS.A);
        this.load('B', BACKDROPS.B);
        this.loadAct1();
        this.loadRegion(snapshot.region);
        snapshot.rewind.forEach(id => this.loadRegion(id));
        this.loadHero(snapshot.hero);
        extraSheets.forEach(sheet => this.loadHero(sheet));
    }

    region(id) {
        return id === ACT1_REGION ? this.act1() : this.ready('region:' + id);
    }

    hero(sheet) { return sheet ? this.ready('hero:' + sheet.key) : null; }

    /** Act 1's set as one picture (far backdrop, rear strip, floor at the stage's own placing around the ground line). */
    act1() {
        if (this.act1Canvas) return this.act1Canvas;
        const parts = this.act1Parts(), far = this.ready('act1:far'), back = this.ready('act1:back'), floor = this.ready('act1:floor');
        if (!parts || !far || !back || !floor) return null;
        const b = parts.biome, ground = 364, canvas = this.deps.document.createElement('canvas');
        canvas.width = b.far.width;
        canvas.height = ground + b.floor.top + b.floor.height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = b.sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(far, 0, ground + b.far.bottom + 1 - b.far.height);
        for (let x = b.back.shift - 1; x < canvas.width; x += b.back.width) ctx.drawImage(back, x, ground + b.back.bottom - b.back.height);
        ctx.drawImage(floor, 0, ground + b.floor.top);
        canvas.groundY = ground;
        this.act1Canvas = canvas;
        return canvas;
    }

    /** One idle frame's opaque dots (read once per sheet and frame, for the dissolve and the motes). */
    framePixels(sheet, img, frame) {
        const key = sheet.key + ':' + frame;
        if (this.pixels.has(key)) return this.pixels.get(key);
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = sheet.w;
        canvas.height = sheet.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, frame * sheet.w, 0, sheet.w, sheet.h, 0, 0, sheet.w, sheet.h);
        const data = ctx.getImageData(0, 0, sheet.w, sheet.h).data, px = [];
        let minY = sheet.h;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] <= 8) continue;
            const at = (i - 3) / 4, y = Math.floor(at / sheet.w);
            px.push({ x: at % sheet.w, y, i: i - 3 });
            minY = Math.min(minY, y);
        }
        const out = { data, px, minY, canvas, ctx, image: ctx.createImageData(sheet.w, sheet.h), th: {} };
        this.pixels.set(key, out);
        return out;
    }

    /** Lets the decoded pictures go (a dozen full room pictures are tens of megabytes); the next loop loads them again. */
    dispose() {
        this.images.clear();
        this.pixels.clear();
        this.act1Canvas = null;
    }
}
