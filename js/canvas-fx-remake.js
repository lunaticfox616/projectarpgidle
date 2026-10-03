/** Hana 이펙트 리메이크 패스 (인계 리메이크_규칙.json · effect_remake_pass.js, 2026-09-28~29).
 * WorldTree v3.38 effects keep their shapes and timing but are drawn the way the Hana +6 characters are:
 * 16 dots per 48px cell. Each layer is drawn at original size into one board-space buffer (1px = 1 board px),
 * then every 3×3 block becomes one dot: the strongest alpha < 30% drops, 30–70% turns into the same colour
 * darkened and opaque, ≥ 70% stays; the colour is the light-weighted mean mapped to the 82-colour palette
 * (OKLab LUT in data/hana-skill-fx.js); the darkest palette colour on an edge is removed (no outlines).
 * Also: first 50ms of a hit/stage flashes white, the last 30% of life darkens, burst gems get a 1-dot
 * shock ring, seven projectiles use redrawn sprites, and the censer of 50/51 is brass.
 * Presentation only: nothing here reads or changes combat state.
 */
const fxRemake = (() => {
    const BLOCK = 3;
    const DROP_BELOW = 0.3;
    const DIM_BELOW = 0.7;
    // 17 혈기 폭쇄 and 37 룬 지뢰 bring their own shock ring (js/canvas-redrawn-skill-fx.js owns their stages).
    const RING_IDS = new Set([2, 12, 13, 26, 27, 34, 47]);
    const QUIET_ASSASSIN = new Set(['vanish', 'arrive', 'dagger']);
    const ELEMENT_RAMPS = {
        phys: ['#353844', '#7f899d', '#c4d5df', '#fff3d3'], fire: ['#572c31', '#c14936', '#ff963e', '#fff1b8'],
        cold: ['#263b59', '#378cb9', '#81ddef', '#ecfffb'], light: ['#4b3e39', '#c18b3a', '#ffd35a', '#fffbc9'],
        chaos: ['#352c4d', '#8151a8', '#d093ee', '#fae4ff']
    };
    // Silver → brass for the censer of 신성한 안개(50) and 파문심판(51): atlas region → exact colour map (patch_core.py).
    const BRASS = [
        [[896, 1792, 32, 32], { '30,29,29': '#2c1e11', '110,110,110': '#7a5422', '146,146,145': '#a0712d', '166,166,165': '#ba883a',
            '193,192,191': '#d6a650', '228,228,228': '#f0ce7a', '255,255,255': '#fff1c4' }],
        [[0, 1856, 32, 32], { '25,30,34': '#24190f', '37,41,46': '#5c3d1a', '63,69,76': '#8a5e28', '115,118,121': '#a0702c',
            '159,160,162': '#c6943e', '193,194,196': '#e8c06a' }],
        [[33, 1869, 30, 7], { '56,55,59': '#382614', '115,118,121': '#96672a', '159,160,162': '#c0903c', '193,194,196': '#e4bc64' }]
    ];
    let palette = null, surfaces = null, scope = null, brassAtlas = null;
    const projectileArt = new Map();
    // (atlas image) → 'x,y,w,h|filter' → canvas holding that frame with the filter already applied.
    const filteredFrames = new WeakMap();
    const scratch = { a: 0, r: 0, g: 0, b: 0, w: 0 };

    function rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
    function loadPalette() {
        if (palette || typeof HANA_SKILL_FX !== 'object' || typeof atob !== 'function') return palette;
        const bytes = atob(HANA_SKILL_FX.lut), lut = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) lut[i] = bytes.charCodeAt(i);
        const colours = HANA_SKILL_FX.palette.map(rgb);
        palette = { lut, rgb: colours, light: colours.map(([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255) };
        return palette;
    }
    function isEnabled() {
        return typeof game === 'object' && game?.settings?.skillFxStyle !== 'original' && !!loadPalette();
    }

    // ------------------------------------------------------------------ board buffer
    function ensureSurfaces(width, height) {
        if (surfaces && surfaces.full.width >= width && surfaces.full.height >= height) return surfaces;
        const full = document.createElement('canvas'), lo = document.createElement('canvas');
        full.width = Math.max(width, surfaces?.full.width || 0);
        full.height = Math.max(height, surfaces?.full.height || 0);
        lo.width = Math.ceil(full.width / BLOCK);
        lo.height = Math.ceil(full.height / BLOCK);
        surfaces = { full, lo, fullCtx: full.getContext('2d', { willReadFrequently: true }), loCtx: lo.getContext('2d') };
        surfaces.fullCtx.imageSmoothingEnabled = false;
        return surfaces;
    }
    function boardView(target, projection) {
        const canvas = target.canvas, scale = Number(canvas.dataset?.renderScale) || 1;
        const width = canvas.clientWidth || canvas.width / scale, height = canvas.clientHeight || canvas.height / scale;
        const origin = projection.cellToScreen(0, 0), s = projection.tileW / 48;
        const ox = Math.floor(((0 - origin.x) / s + 24 - 48) / BLOCK) * BLOCK;
        const oy = Math.floor(((0 - origin.y) / s + 24 - 48) / BLOCK) * BLOCK;
        const w = Math.ceil((width / s + 96) / BLOCK) * BLOCK, h = Math.ceil((height / s + 96) / BLOCK) * BLOCK;
        return { origin, s, ox, oy, w, h };
    }
    /** Opens a layer. Until end(), world-tree samples and redrawn dots land in the board buffer. */
    function begin(target, projection) {
        scope = null;
        if (!target?.canvas || typeof target.getTransform !== 'function' || !projection || !isEnabled()) return false;
        const view = boardView(target, projection);
        ensureSurfaces(view.w, view.h);
        scope = { target, projection, ...view, dirty: null, rings: new Set() };
        return true;
    }
    function isOpen() { return !!scope; }
    function projection() { return scope ? scope.projection : null; }
    /** Frame start: a layer left open by an interrupted frame must not leak into the next one. */
    function discard() {
        if (scope?.dirty) surfaces.fullCtx.clearRect(0, 0, surfaces.full.width, surfaces.full.height);
        scope = null;
    }
    function markDirty(x0, y0, x1, y1) {
        const d = scope.dirty;
        if (!d) { scope.dirty = { x0, y0, x1, y1 }; return; }
        d.x0 = Math.min(d.x0, x0); d.y0 = Math.min(d.y0, y0); d.x1 = Math.max(d.x1, x1); d.y1 = Math.max(d.y1, y1);
    }
    /** Board px (cell 0 corner = 0) of a screen point, relative to the buffer. */
    function toBuffer(screenX, screenY) {
        return { x: (screenX - scope.origin.x) / scope.s + 24 - scope.ox, y: (screenY - scope.origin.y) / scope.s + 24 - scope.oy };
    }

    // ------------------------------------------------------------------ atlas samples
    function isQuiet(e) {
        return !!(e.holyMistPhase || e.judgmentPhase === 'censer' || e.timePhase || e.effectRole === 'clock'
            || e.causalityPhase === 'sigil' || QUIET_ASSASSIN.has(e.assassinationPhase));
    }
    function isStruck(e, age) {
        return (e.kind === 'hit' || e.kind === 'stage') && age >= 0 && age < 50 && !isQuiet(e);
    }
    function sampleFilter(sample, width, height) {
        const e = sample.effect;
        if (!e || !Number.isFinite(sample.now)) return 'none';
        const age = sample.now - e.at, duration = e.duration || 300;
        if (isStruck(e, age)) return Math.max(width, height) <= 84 ? 'brightness(0) invert(1)' : 'brightness(1.45)';
        return age > duration * 0.7 && duration >= 160 ? 'brightness(0.72)' : 'none';
    }
    /** The frame with a brightness/invert filter baked in (per-pixel colour maths, so baking before the transform draws
     * the same dots). A filter on the board context itself re-filtered the whole buffer on every draw. */
    function filteredFrame(source, frame, filter) {
        let bySource = filteredFrames.get(source);
        if (!bySource) { bySource = new Map(); filteredFrames.set(source, bySource); }
        const key = `${frame.x},${frame.y},${frame.w},${frame.h}|${filter}`;
        let canvas = bySource.get(key);
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.width = frame.w; canvas.height = frame.h;
            const c = canvas.getContext('2d');
            c.filter = filter;
            c.drawImage(source, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
            bySource.set(key, canvas);
        }
        return canvas;
    }
    /** Draws one v3.38 sample into the open buffer. Returns false when no layer is open. */
    function capture(sample, projection, image) {
        if (!scope) return false;
        const origin = projection.cellToScreen(0, 0), psx = projection.tileW / 48, psy = projection.tileH / 48;
        const at = toBuffer(origin.x + (sample.x - 24) * psx, origin.y + (sample.y - 24) * psy);
        const frame = sample.frame, width = frame.w * sample.scale, height = frame.h * sample.scaleY;
        const k = psx / scope.s, reach = 0.5 * Math.hypot(width, height) * k + BLOCK;
        const c = surfaces.fullCtx;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = Math.max(0, Math.min(1, sample.alpha));
        const filter = sampleFilter(sample, Math.abs(width), Math.abs(height)), source = brass(image);
        const baked = filter !== 'none' && frame.w > 0 && frame.h > 0 ? filteredFrame(source, frame, filter) : null;
        c.translate(at.x, at.y); c.scale(k, psy / scope.s); c.rotate(sample.angle);
        if (height < 0) c.scale(1, -1);
        c.drawImage(baked || source, baked ? 0 : frame.x, baked ? 0 : frame.y, frame.w, frame.h, -width / 2, -Math.abs(height) / 2, width, Math.abs(height));
        markDirty(at.x - reach, at.y - reach, at.x + reach, at.y + reach);
        return true;
    }

    /** Runs fn(dot) with dot(x, y, colour) in board dots (cell = 16 dots) into the open buffer. */
    function drawDots(fn) {
        if (!scope) return false;
        const c = surfaces.fullCtx, ox = scope.ox, oy = scope.oy;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 1;
        const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
        fn((x, y, colour) => {
            const px = Math.round(x) * BLOCK - ox, py = Math.round(y) * BLOCK - oy;
            c.fillStyle = colour;
            c.fillRect(px, py, BLOCK, BLOCK);
            box.x0 = Math.min(box.x0, px); box.y0 = Math.min(box.y0, py); box.x1 = Math.max(box.x1, px + BLOCK); box.y1 = Math.max(box.y1, py + BLOCK);
        });
        if (box.x1 > box.x0) markDirty(box.x0, box.y0, box.x1, box.y1);
        return true;
    }

    // ------------------------------------------------------------------ shock ring (burst gems)
    function ringCells(e) {
        if (e.footprint?.center) return [e.footprint.center];
        return e.targetCells?.length ? e.targetCells : [e.sourceCell];
    }
    /** One expanding 1-dot ring for each burst stage (240ms, 9→43px), never on the caster's own cell. */
    function hasRing(e, spec) {
        return !!scope && RING_IDS.has(spec?.id) && e.kind === 'stage';
    }
    function ring(e, now, spec) {
        const age = now - e.at;
        if (!hasRing(e, spec) || !(age >= 0 && age < 240)) return;
        const ramp = ELEMENT_RAMPS[e.element] || ELEMENT_RAMPS.phys, u = age / 240, radius = 9 + 34 * (1 - (1 - u) * (1 - u));
        for (const cell of ringCells(e)) strokeRing(cell, e, radius, u < 0.45 ? ramp[2] : ramp[1]);
    }
    function strokeRing(cell, e, radius, colour) {
        if (!cell || (e.sourceCell && cell.gx === e.sourceCell.gx && cell.gy === e.sourceCell.gy)) return;
        const key = `${cell.gx},${cell.gy},${e.at}`;
        if (scope.rings.has(key)) return;
        scope.rings.add(key);
        const c = surfaces.fullCtx, x = cell.gx * 48 + 24 - scope.ox, y = cell.gy * 48 + 24 - scope.oy;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 1; c.strokeStyle = colour; c.lineWidth = 3;
        c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.stroke();
        markDirty(x - radius - 3, y - radius - 3, x + radius + 3, y + radius + 3);
    }

    // ------------------------------------------------------------------ redrawn projectiles (16 dots per cell)
    function projectileFor(id) {
        if (projectileArt.has(id)) return projectileArt.get(id);
        const entry = Object.values(HANA_SKILL_FX.projectiles || {}).find(sprite => sprite.ids.includes(id)) || null;
        projectileArt.set(id, entry ? { ...entry, canvas: paintProjectile(entry) } : null);
        return projectileArt.get(id);
    }
    function paintProjectile(sprite) {
        const canvas = document.createElement('canvas');
        canvas.width = sprite.rows[0].length; canvas.height = sprite.rows.length;
        const c = canvas.getContext('2d');
        sprite.rows.forEach((row, y) => [...row].forEach((ch, x) => {
            if (!sprite.pal[ch]) return;
            c.fillStyle = sprite.pal[ch]; c.fillRect(x, y, 1, 1);
        }));
        return canvas;
    }
    function travelPoint(e, age) {
        const centre = g => ({ x: g.gx * 48 + 24, y: g.gy * 48 + 24 }), path = e.travelPath;
        if (path?.length > 1) {
            let i = 0;
            while (i < path.length - 2 && path[i + 1].offsetMs <= age) i++;
            const a = centre(path[i]), b = centre(path[i + 1]);
            const u = Math.max(0, Math.min(1, (age - path[i].offsetMs) / Math.max(1, path[i + 1].offsetMs - path[i].offsetMs)));
            return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, angle: Math.atan2(b.y - a.y, b.x - a.x) };
        }
        const a = centre(e.sourceCell), b = centre(e.targetCells[0]), u = Math.max(0, Math.min(1, age / Math.max(1, e.duration)));
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, angle: Math.atan2(b.y - a.y, b.x - a.x) };
    }
    function hasProjectile(id) { return isEnabled() && !!projectileFor(id); }
    /** The caster's sprite in buffer px while it shows its back (facing north): a shot sent forward starts hidden by it.
     * Read at the frame's visual time — a projectile's own playback time may wait at an unconfirmed contact. */
    function bodyCut() {
        const now = typeof battleVisualState === 'object' ? battleVisualState.visualNow : NaN;
        const body = typeof hanaActors === 'object' ? hanaActors.drawnBody(now) : null;
        if (!body || body.dir !== 'north') return null;
        const at = toBuffer(body.dest.x, body.dest.y);
        return { image: body.image, srcs: body.srcs, x: at.x, y: at.y, size: body.dest.dot / scope.s };
    }
    function scratchCanvas(size) {
        if (!surfaces.cut || surfaces.cut.width < size || surfaces.cut.height < size) {
            surfaces.cut = document.createElement('canvas');
            surfaces.cut.width = surfaces.cut.height = size;
        }
        const c = surfaces.cut.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, size, size);
        return c;
    }
    /** A shot is drawn at PROJECTILE_SPRITE_SCALE of the effect dot (0.8 = the hero's own dot). `tail`: buffer px it has left its
     * start by; until the whole sprite is out, the part behind the start is not drawn, so the shot comes out of the hand. */
    function drawSprite(c, sprite, at, angle, tail = Infinity) {
        const w = sprite.canvas.width, h = sprite.canvas.height, k = BLOCK * PROJECTILE_SPRITE_SCALE;
        const left = -Math.round(w * 0.62) * k, top = -Math.floor(h / 2) * k, emerging = tail < -left;
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.imageSmoothingEnabled = false;
        c.translate(at.x, at.y); c.rotate(angle);
        if (emerging) { c.save(); c.beginPath(); c.rect(-tail, top - 1, w * k + 1, h * k + 2); c.clip(); }
        c.drawImage(sprite.canvas, left, top, w * k, h * k);
        if (emerging) c.restore();
        c.setTransform(1, 0, 0, 1, 0, 0);
    }
    /** Draws the sprite on a scratch square around (x, y), erases the caster's opaque pixels from it, then copies it in. */
    function drawBehindBody(sprite, box, cut) {
        const size = box.reach * 2, left = box.x - box.reach, top = box.y - box.reach, c = scratchCanvas(size);
        drawSprite(c, sprite, { x: box.reach, y: box.reach }, box.angle, box.tail);
        c.globalCompositeOperation = 'destination-out'; c.imageSmoothingEnabled = false;
        for (const src of cut.srcs) c.drawImage(cut.image, src.x, src.y, src.w, src.h, cut.x - left, cut.y - top, src.w * cut.size, src.h * cut.size);
        c.globalCompositeOperation = 'source-over';
        surfaces.fullCtx.setTransform(1, 0, 0, 1, 0, 0);
        surfaces.fullCtx.globalAlpha = 1;
        surfaces.fullCtx.drawImage(c.canvas, 0, 0, size, size, left, top, size, size);
    }
    /** Replaces the native travel sprite of a redrawn projectile. Returns true when drawn. */
    function projectile(e, now, id) {
        const sprite = scope && e.kind === 'travel' ? projectileFor(id) : null;
        const age = now - e.at;
        if (!sprite || !(age >= 0 && age < e.duration)) return false;
        const p = travelPoint(e, age), angle = Math.round(p.angle / (Math.PI / 16)) * (Math.PI / 16);
        const x = Math.round(p.x) - scope.ox, y = Math.round(p.y) - scope.oy, start = travelPoint(e, 0);
        const reach = Math.ceil(Math.hypot(sprite.canvas.width, sprite.canvas.height) * BLOCK * PROJECTILE_SPRITE_SCALE), cut = bodyCut();
        const tail = Math.hypot(p.x - start.x, p.y - start.y);
        if (cut) drawBehindBody(sprite, { x, y, reach, angle, tail }, cut);
        else drawSprite(surfaces.fullCtx, sprite, { x, y }, angle, tail);
        markDirty(x - reach, y - reach, x + reach, y + reach);
        return true;
    }

    // ------------------------------------------------------------------ brass censer atlas
    function recolourRegion(data, width, region) {
        const [[rx, ry, rw, rh], map] = region;
        for (let k = 0; k < rw * rh; k++) {
            const q = ((ry + ((k / rw) | 0)) * width + rx + (k % rw)) * 4, hex = data[q + 3] ? map[`${data[q]},${data[q + 1]},${data[q + 2]}`] : null;
            if (!hex) continue;
            const [r, g, b] = rgb(hex);
            data[q] = r; data[q + 1] = g; data[q + 2] = b;
        }
    }
    function brass(image) {
        if (brassAtlas?.source === image) return brassAtlas.canvas;
        if (!image?.complete || image.naturalWidth !== 1024 || typeof document === 'undefined') return image;
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const c = canvas.getContext('2d', { willReadFrequently: true });
        c.drawImage(image, 0, 0);
        const pixels = c.getImageData(0, 0, canvas.width, canvas.height);
        BRASS.forEach(region => recolourRegion(pixels.data, canvas.width, region));
        c.putImageData(pixels, 0, 0);
        brassAtlas = { source: image, canvas };
        return canvas;
    }

    // ------------------------------------------------------------------ re-dot and composite
    function blockColour(d, stride, q) {
        let amax = 0, wr = 0, wg = 0, wb = 0, ws = 0;
        for (let k = 0; k < 9; k++) {
            const p = q + ((k / 3) | 0) * stride + (k % 3) * 4, a = d[p + 3];
            if (!a) continue;
            if (a > amax) amax = a;
            const light = (0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]) / 255, w = a * (0.25 + light * light);
            wr += d[p] * w; wg += d[p + 1] * w; wb += d[p + 2] * w; ws += w;
        }
        scratch.a = amax / 255; scratch.w = ws;
        scratch.r = ws ? wr / ws : 0; scratch.g = ws ? wg / ws : 0; scratch.b = ws ? wb / ws : 0;
        return scratch;
    }
    function classify(d, stride, cols, rows, dots) {
        for (let j = 0; j < cols * rows; j++) {
            dots.keep[j] = 0;
            const c = blockColour(d, stride, ((j / cols) | 0) * BLOCK * stride + (j % cols) * BLOCK * 4);
            if (!c.w || c.a < DROP_BELOW) continue;
            const k = c.a < DIM_BELOW ? 0.3 + Math.max(c.a, 0.35) : 1;
            dots.index[j] = palette.lut[(((c.r * k) >> 3) << 10) | (((c.g * k) >> 3) << 5) | ((c.b * k) >> 3)];
            dots.keep[j] = 1;
        }
    }
    function isEdge(j, cols, rows, keep) {
        const x = j % cols, y = (j / cols) | 0;
        return x === 0 || y === 0 || x === cols - 1 || y === rows - 1 || !keep[j - 1] || !keep[j + 1] || !keep[j - cols] || !keep[j + cols];
    }
    function writeDots(out, cols, rows, dots) {
        for (let j = 0; j < cols * rows; j++) {
            const q = j * 4, k = dots.index[j];
            if (!dots.keep[j] || (palette.light[k] < 0.2 && isEdge(j, cols, rows, dots.keep))) { out[q + 3] = 0; continue; }
            const colour = palette.rgb[k];
            out[q] = colour[0]; out[q + 1] = colour[1]; out[q + 2] = colour[2]; out[q + 3] = 255;
        }
    }
    function dirtyBlocks(d) {
        const x0 = Math.max(0, Math.floor(d.x0 / BLOCK) - 1), y0 = Math.max(0, Math.floor(d.y0 / BLOCK) - 1);
        const x1 = Math.min(Math.floor(surfaces.full.width / BLOCK), Math.ceil(d.x1 / BLOCK) + 1);
        const y1 = Math.min(Math.floor(surfaces.full.height / BLOCK), Math.ceil(d.y1 / BLOCK) + 1);
        return { x0, y0, cols: x1 - x0, rows: y1 - y0 };
    }
    /** Closes the layer: re-dots the touched region and draws it on the screen canvas ×(tile/16). */
    function end() {
        const open = scope;
        scope = null;
        if (!open?.dirty) return;
        const area = dirtyBlocks(open.dirty), full = surfaces.fullCtx;
        if (area.cols <= 0 || area.rows <= 0) return;
        const px = area.x0 * BLOCK, py = area.y0 * BLOCK, pw = area.cols * BLOCK, ph = area.rows * BLOCK;
        full.setTransform(1, 0, 0, 1, 0, 0);
        const source = full.getImageData(px, py, pw, ph);
        const dots = { keep: new Uint8Array(area.cols * area.rows), index: new Uint8Array(area.cols * area.rows) };
        classify(source.data, pw * 4, area.cols, area.rows, dots);
        const image = surfaces.loCtx.createImageData(area.cols, area.rows);
        writeDots(image.data, area.cols, area.rows, dots);
        surfaces.loCtx.putImageData(image, 0, 0);
        full.clearRect(px, py, pw, ph);
        composite(open, area);
    }
    function composite(open, area) {
        const t = open.target, s = open.s, dot = BLOCK * s;
        const x = open.origin.x + (open.ox + area.x0 * BLOCK - 24) * s, y = open.origin.y + (open.oy + area.y0 * BLOCK - 24) * s;
        t.save();
        t.globalAlpha = 1; t.globalCompositeOperation = 'source-over'; t.filter = 'none'; t.imageSmoothingEnabled = false;
        t.drawImage(surfaces.lo, 0, 0, area.cols, area.rows, x, y, area.cols * dot, area.rows * dot);
        t.restore();
    }

    return Object.freeze({ begin, end, discard, isOpen, projection, isEnabled, capture, drawDots, ring, projectile, hasProjectile, brass, ELEMENT_RAMPS });
})();
safeExposeGlobals({ fxRemake });
