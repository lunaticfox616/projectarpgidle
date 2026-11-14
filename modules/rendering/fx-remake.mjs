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
class FxRemake {
    constructor(deps) {
        this.deps = deps;
        this.BLOCK = 3;
        this.DROP_BELOW = 0.3;
        this.DIM_BELOW = 0.7;
        this.RING_IDS = new Set([2, 12, 13, 26, 27, 34, 47]);
        this.QUIET_ASSASSIN = new Set(['vanish', 'arrive', 'dagger']);
        this.ELEMENT_RAMPS = {
            phys: ['#353844', '#7f899d', '#c4d5df', '#fff3d3'], fire: ['#572c31', '#c14936', '#ff963e', '#fff1b8'],
            cold: ['#263b59', '#378cb9', '#81ddef', '#ecfffb'], light: ['#4b3e39', '#c18b3a', '#ffd35a', '#fffbc9'],
            chaos: ['#352c4d', '#8151a8', '#d093ee', '#fae4ff']
        };
        this.BRASS = [
            [[896, 1792, 32, 32], { '30,29,29': '#2c1e11', '110,110,110': '#7a5422', '146,146,145': '#a0712d', '166,166,165': '#ba883a',
                '193,192,191': '#d6a650', '228,228,228': '#f0ce7a', '255,255,255': '#fff1c4' }],
            [[0, 1856, 32, 32], { '25,30,34': '#24190f', '37,41,46': '#5c3d1a', '63,69,76': '#8a5e28', '115,118,121': '#a0702c',
                '159,160,162': '#c6943e', '193,194,196': '#e8c06a' }],
            [[33, 1869, 30, 7], { '56,55,59': '#382614', '115,118,121': '#96672a', '159,160,162': '#c0903c', '193,194,196': '#e4bc64' }]
        ];
        this.palette = null;
        this.surfaces = null;
        this.scope = null;
        this.brassAtlas = null;
        this.sheetAhead = null;
        this.filtersPaid = 0;
        this.projectileArt = new Map();
        this.filteredFrames = new WeakMap();
        this.scratch = { a: 0, r: 0, g: 0, b: 0, w: 0 };
        this.FILTERS = Object.freeze({ flash: 'brightness(0) invert(1)', bright: 'brightness(1.45)', dim: 'brightness(0.72)' });
        this.brassable = image => !!image?.complete && image.naturalWidth === 1024 && typeof this.deps.document !== 'undefined';
    }

    rgb(hex) { return [this.deps.parseInt(hex.slice(1, 3), 16), this.deps.parseInt(hex.slice(3, 5), 16), this.deps.parseInt(hex.slice(5, 7), 16)]; }

    loadPalette() {
        if (this.palette || typeof this.deps.HANA_SKILL_FX !== 'object' || typeof this.deps.atob !== 'function') return this.palette;
        const bytes = this.deps.atob(this.deps.HANA_SKILL_FX.lut), lut = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) lut[i] = bytes.charCodeAt(i);
        const colours = this.deps.HANA_SKILL_FX.palette.map(this.rgb.bind(this));
        this.palette = { lut, rgb: colours, light: colours.map(([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255) };
        return this.palette;
    }

    isEnabled(owner) {
        return typeof owner === 'object' && owner?.settings?.skillFxStyle !== 'original' && !!this.loadPalette();
    }

    // ------------------------------------------------------------------ board buffer
    ensureSurfaces(width, height) {
        if (this.surfaces && this.surfaces.full.width >= width && this.surfaces.full.height >= height) return this.surfaces;
        const full = this.deps.document.createElement('canvas'), lo = this.deps.document.createElement('canvas');
        full.width = Math.max(width, this.surfaces?.full.width || 0);
        full.height = Math.max(height, this.surfaces?.full.height || 0);
        lo.width = Math.ceil(full.width / this.BLOCK);
        lo.height = Math.ceil(full.height / this.BLOCK);
        this.surfaces = { full, lo, fullCtx: full.getContext('2d', { willReadFrequently: true }), loCtx: lo.getContext('2d') };
        this.surfaces.fullCtx.imageSmoothingEnabled = false;
        return this.surfaces;
    }

    /** The battlefield and its ground-loot actor overlay share the measured box (battle-ground-loot-ui.js resize).
     * Reading the overlay's clientWidth after placing loot labels forced another style pass mid-frame (2026-10-17). */
    cssBox(canvas) {
        if (typeof this.deps.battleCanvasBox === 'object') {
            if (canvas.id === 'battlefield-canvas') return this.deps.battleCanvasBox.read(canvas);
            const source = canvas.classList.contains('battle-loot-foreground') && this.deps.document.getElementById('battlefield-canvas');
            if (source) return this.deps.battleCanvasBox.read(source);
        }
        return { width: canvas.clientWidth, height: canvas.clientHeight };
    }

    boardView(target, projection) {
        const canvas = target.canvas, scale = Number(canvas.dataset?.renderScale) || 1, css = this.cssBox(canvas);
        const width = css.width || canvas.width / scale, height = css.height || canvas.height / scale;
        // sy: 옆에서 보는 무대(data/stage-view.js)에서는 깊이 한 칸이 가로 한 칸보다 낮다. 판은 정사각 칸 그대로 두고 화면에 옮길 때만 누른다.
        const origin = projection.cellToScreen(0, 0), s = projection.tileW / 48, sy = projection.tileH / 48;
        const ox = Math.floor(((0 - origin.x) / s + 24 - 48) / this.BLOCK) * this.BLOCK;
        const oy = Math.floor(((0 - origin.y) / sy + 24 - 48) / this.BLOCK) * this.BLOCK;
        const w = Math.ceil((width / s + 96) / this.BLOCK) * this.BLOCK, h = Math.ceil((height / sy + 96) / this.BLOCK) * this.BLOCK;
        return { origin, s, sy, ox, oy, w, h };
    }

    /** Opens a layer. Until end(), world-tree samples and redrawn dots land in the board buffer. */
    begin(owner, target, projection) {
        this.scope = null;
        if (!target?.canvas || typeof target.getTransform !== 'function' || !projection || !this.isEnabled(owner)) return false;
        const view = this.boardView(target, projection);
        this.ensureSurfaces(view.w, view.h);
        this.scope = { target, projection, ...view, dirty: null, rings: new Set() };
        return true;
    }

    isOpen() { return !!this.scope; }

    projection() { return this.scope ? this.scope.projection : null; }

    /** Frame start: a layer left open by an interrupted frame must not leak into the next one. */
    discard() {
        if (this.scope?.dirty) this.surfaces.fullCtx.clearRect(0, 0, this.surfaces.full.width, this.surfaces.full.height);
        this.scope = null;
    }

    markDirty(x0, y0, x1, y1) {
        const d = this.scope.dirty;
        if (!d) { this.scope.dirty = { x0, y0, x1, y1 }; return; }
        d.x0 = Math.min(d.x0, x0); d.y0 = Math.min(d.y0, y0); d.x1 = Math.max(d.x1, x1); d.y1 = Math.max(d.y1, y1);
    }

    /** Board px (cell 0 corner = 0) of a screen point, relative to the buffer. */
    toBuffer(screenX, screenY) {
        return { x: (screenX - this.scope.origin.x) / this.scope.s + 24 - this.scope.ox, y: (screenY - this.scope.origin.y) / this.scope.sy + 24 - this.scope.oy };
    }

    // ------------------------------------------------------------------ atlas samples
    isQuiet(e) {
        return !!(e.holyMistPhase || e.judgmentPhase === 'censer' || e.timePhase || e.effectRole === 'clock'
            || this.QUIET_ASSASSIN.has(e.assassinationPhase));
    }

    isStruck(e, age) {
        return (e.kind === 'hit' || e.kind === 'stage') && age >= 0 && age < 50 && !this.isQuiet(e);
    }

    sampleFilter(sample, width, height) {
        const e = sample.effect;
        if (!e || !Number.isFinite(sample.now)) return 'none';
        const age = sample.now - e.at, duration = e.duration || 300;
        if (this.isStruck(e, age)) return Math.max(width, height) <= 84 ? this.FILTERS.flash : this.FILTERS.bright;
        return age > duration * 0.7 && duration >= 160 ? this.FILTERS.dim : 'none';
    }

    /** The frame with a brightness/invert filter baked in (per-pixel colour maths, so baking before the transform draws
     * the same dots). A filter on the board context itself re-filtered the whole buffer on every draw. */
    filteredFrame(source, frame, filter) {
        let bySource = this.filteredFrames.get(source);
        if (!bySource) { bySource = new Map(); this.filteredFrames.set(source, bySource); }
        const key = `${frame.x},${frame.y},${frame.w},${frame.h}|${filter}`;
        let canvas = bySource.get(key);
        if (!canvas) {
            canvas = this.deps.document.createElement('canvas');
            canvas.width = frame.w; canvas.height = frame.h;
            const c = canvas.getContext('2d');
            c.filter = filter;
            c.drawImage(source, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
            bySource.set(key, canvas);
        }
        return canvas;
    }

    /** Draws one v3.38 sample into the open buffer. Returns false when no layer is open. */
    capture(sample, projection, image) {
        if (!this.scope) return false;
        const origin = projection.cellToScreen(0, 0), psx = projection.tileW / 48, psy = projection.tileH / 48;
        const at = this.toBuffer(origin.x + (sample.x - 24) * psx, origin.y + (sample.y - 24) * psy);
        const frame = sample.frame, width = frame.w * sample.scale, height = frame.h * sample.scaleY;
        const k = psx / this.scope.s, reach = 0.5 * Math.hypot(width, height) * k + this.BLOCK;
        const c = this.surfaces.fullCtx;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = Math.max(0, Math.min(1, sample.alpha));
        const filter = this.sampleFilter(sample, Math.abs(width), Math.abs(height)), source = this.brass(image);
        const baked = filter !== 'none' && frame.w > 0 && frame.h > 0 ? this.filteredFrame(source, frame, filter) : null;
        c.translate(at.x, at.y); c.scale(k, psy / this.scope.sy); c.rotate(sample.angle);
        if (height < 0) c.scale(1, -1);
        c.drawImage(baked || source, baked ? 0 : frame.x, baked ? 0 : frame.y, frame.w, frame.h, -width / 2, -Math.abs(height) / 2, width, Math.abs(height));
        this.markDirty(at.x - reach, at.y - reach, at.x + reach, at.y + reach);
        return true;
    }

    /** Runs fn(dot) with dot(x, y, colour) in board dots (cell = 16 dots) into the open buffer. */
    drawDots(fn) {
        if (!this.scope) return false;
        const c = this.surfaces.fullCtx, ox = this.scope.ox, oy = this.scope.oy;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 1;
        const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
        fn((x, y, colour) => {
            const px = Math.round(x) * this.BLOCK - ox, py = Math.round(y) * this.BLOCK - oy;
            c.fillStyle = colour;
            c.fillRect(px, py, this.BLOCK, this.BLOCK);
            box.x0 = Math.min(box.x0, px); box.y0 = Math.min(box.y0, py); box.x1 = Math.max(box.x1, px + this.BLOCK); box.y1 = Math.max(box.y1, py + this.BLOCK);
        });
        if (box.x1 > box.x0) this.markDirty(box.x0, box.y0, box.x1, box.y1);
        return true;
    }

    // ------------------------------------------------------------------ shock ring (burst gems)
    ringCells(e) {
        if (e.footprint?.center) return [e.footprint.center];
        return e.targetCells?.length ? e.targetCells : [e.sourceCell];
    }

    /** One expanding 1-dot ring for each burst stage (240ms, 9→43px), never on the caster's own cell. */
    hasRing(e, spec) {
        return !!this.scope && this.RING_IDS.has(spec?.id) && e.kind === 'stage';
    }

    ring(e, now, spec) {
        const age = now - e.at;
        if (!this.hasRing(e, spec) || !(age >= 0 && age < 240)) return;
        const ramp = this.ELEMENT_RAMPS[e.element] || this.ELEMENT_RAMPS.phys, u = age / 240, radius = 9 + 34 * (1 - (1 - u) * (1 - u));
        for (const cell of this.ringCells(e)) this.strokeRing(cell, e, radius, u < 0.45 ? ramp[2] : ramp[1]);
    }

    strokeRing(cell, e, radius, colour) {
        if (!cell || (e.sourceCell && cell.gx === e.sourceCell.gx && cell.gy === e.sourceCell.gy)) return;
        const key = `${cell.gx},${cell.gy},${e.at}`;
        if (this.scope.rings.has(key)) return;
        this.scope.rings.add(key);
        const c = this.surfaces.fullCtx, x = cell.gx * 48 + 24 - this.scope.ox, y = cell.gy * 48 + 24 - this.scope.oy;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.globalAlpha = 1; c.strokeStyle = colour; c.lineWidth = 3;
        c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.stroke();
        this.markDirty(x - radius - 3, y - radius - 3, x + radius + 3, y + radius + 3);
    }

    // ------------------------------------------------------------------ redrawn projectiles (16 dots per cell)
    projectileFor(id) {
        if (this.projectileArt.has(id)) return this.projectileArt.get(id);
        const entry = Object.values(this.deps.HANA_SKILL_FX.projectiles || {}).find(sprite => sprite.ids.includes(id)) || null;
        this.projectileArt.set(id, entry ? { ...entry, canvas: this.paintProjectile(entry) } : null);
        return this.projectileArt.get(id);
    }

    paintProjectile(sprite) {
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = sprite.rows[0].length; canvas.height = sprite.rows.length;
        const c = canvas.getContext('2d');
        sprite.rows.forEach((row, y) => [...row].forEach((ch, x) => {
            if (!sprite.pal[ch]) return;
            c.fillStyle = sprite.pal[ch]; c.fillRect(x, y, 1, 1);
        }));
        return canvas;
    }

    travelPoint(e, age) {
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

    hasProjectile(owner, id) { return this.isEnabled(owner) && !!this.projectileFor(id); }

    /** A shot is drawn at PROJECTILE_SPRITE_SCALE of the effect dot (0.8 = the hero's own dot). `tail`: buffer px it has left its
     * start by; until the whole sprite is out, the part behind the start is not drawn, so the shot comes out of the hand. */
    drawSprite(c, sprite, at, angle, tail = Infinity) {
        const w = sprite.canvas.width, h = sprite.canvas.height, k = this.BLOCK * this.deps.PROJECTILE_SPRITE_SCALE;
        const left = -Math.round(w * 0.62) * k, top = -Math.floor(h / 2) * k, emerging = tail < -left;
        c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.imageSmoothingEnabled = false;
        c.translate(at.x, at.y); c.rotate(angle);
        if (emerging) { c.save(); c.beginPath(); c.rect(-tail, top - 1, w * k + 1, h * k + 2); c.clip(); }
        c.drawImage(sprite.canvas, left, top, w * k, h * k);
        if (emerging) c.restore();
        c.setTransform(1, 0, 0, 1, 0, 0);
    }

    /** Replaces the native travel sprite of a redrawn projectile. Returns true when drawn. */
    projectile(e, now, id) {
        const sprite = this.scope && e.kind === 'travel' ? this.projectileFor(id) : null;
        const age = now - e.at;
        if (!sprite || !(age >= 0 && age < e.duration)) return false;
        const p = this.travelPoint(e, age), angle = Math.round(p.angle / (Math.PI / 16)) * (Math.PI / 16);
        const x = Math.round(p.x) - this.scope.ox, y = Math.round(p.y) - this.scope.oy, start = this.travelPoint(e, 0);
        const reach = Math.ceil(Math.hypot(sprite.canvas.width, sprite.canvas.height) * this.BLOCK * this.deps.PROJECTILE_SPRITE_SCALE);
        const tail = Math.hypot(p.x - start.x, p.y - start.y);
        this.drawSprite(this.surfaces.fullCtx, sprite, { x, y }, angle, tail);
        this.markDirty(x - reach, y - reach, x + reach, y + reach);
        return true;
    }

    // ------------------------------------------------------------------ brass censer atlas
    recolourRegion(data, width, region) {
        const [[rx, ry, rw, rh], map] = region;
        for (let k = 0; k < rw * rh; k++) {
            const q = ((ry + ((k / rw) | 0)) * width + rx + (k % rw)) * 4, hex = data[q + 3] ? map[`${data[q]},${data[q + 1]},${data[q + 2]}`] : null;
            if (!hex) continue;
            const [r, g, b] = this.rgb(hex);
            data[q] = r; data[q + 1] = g; data[q + 2] = b;
        }
    }

    /** 시트의 사본을 만들고 향로 자리만 놋쇠로 칠한다. picture: 그 시트의 화소(시트 그대로, 또는 미리 풀어 둔 것). 칠하는 세 자리만
     * 읽고 쓴다: 시트 전체(8MB)를 읽고 다시 쓰던 것과 화소가 같다(2026-10-14에 견줌). */
    brassCopy(image, picture) {
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const c = canvas.getContext('2d', { willReadFrequently: true });
        c.drawImage(picture, 0, 0);
        for (const [[x, y, w, h], map] of this.BRASS) {
            const pixels = c.getImageData(x, y, w, h);
            this.recolourRegion(pixels.data, w, [[0, 0, w, h], map]);
            c.putImageData(pixels, x, y);
        }
        this.brassAtlas = { source: image, canvas };
        return canvas;
    }

    brass(image) {
        if (this.brassAtlas?.source === image) return this.brassAtlas.canvas;
        return this.brassable(image) ? this.brassCopy(image, image) : image;
    }

    /** 필터를 건 작은 캔버스를 판에 처음 그려 읽을 때 필터의 종류마다 한 번 드는 값(15~35ms, CPU가 느려도 같다)을 미리 치른다:
     * 판에 처음 맞는 섬광이 나오는 프레임이 그만큼 멈췄다. filteredFrame과 같은 길로 한 점을 그려 읽는다. 한 번 부를 때 필터
     * 하나만 한다(한 프레임에 몰리지 않게). 게임의 캔버스에는 닿지 않는다.
     * @returns {boolean} 모든 필터를 치렀는가 */
    payNextFilter(source) {
        const filters = Object.values(this.FILTERS);
        if (this.filtersPaid >= filters.length) return true;
        const cell = this.deps.document.createElement('canvas'), into = this.deps.document.createElement('canvas');
        cell.width = cell.height = 2; into.width = into.height = 8;
        const c = cell.getContext('2d'), t = into.getContext('2d', { willReadFrequently: true });
        c.filter = filters[this.filtersPaid++];
        c.drawImage(source, 0, 0, 2, 2, 0, 0, 2, 2);
        t.drawImage(cell, 0, 0);
        t.getImageData(0, 0, 1, 1);
        return this.filtersPaid >= filters.length;
    }

    /** 세계수 시트를 쓰는 이펙트가 전투에서 처음 나오기 전에 해 둔다(js/canvas-stage-warmup.js가 그 시트를 쓰는 룬을 꼈을 때 부른다).
     * 놋쇠 사본은 메인 스레드 밖에서 푼 그림으로 만든다(js/canvas-stage-pictures.js): 처음 쓰는 프레임에서 시트를 풀면 그 프레임이
     * 데스크톱에서 8ms, 느린 기기에서 30ms 넘게 멈췄다. 밖에서 풀지 못하면 예전처럼 처음 쓸 때 만든다.
     * @returns {boolean} 다 됐는가. 아직이면(그림을 푸는 중) 부른 쪽이 다시 부른다. */
    prepareSheet(owner, image) {
        if (!image || !this.isEnabled(owner)) return true;
        if (!image.complete) return false;
        if (!this.brassable(image)) return true;
        if (!this.brassAhead(image)) return false;
        return this.brassAtlas?.source !== image || this.payNextFilter(this.brassAtlas.canvas);
    }

    /** 놋쇠 사본을 미리 푼 그림으로 만든다. @returns {boolean} 끝났는가(만들었거나, 밖에서 풀지 못해 처음 쓸 때로 미뤘다). */
    brassAhead(image) {
        if (this.brassAtlas?.source === image) return true;
        if (!this.sheetAhead) this.sheetAhead = this.deps.stagePictures.openPicture(image.src);
        if (!this.sheetAhead.ready && !this.sheetAhead.failed) return false;
        if (this.sheetAhead.ready) this.brassCopy(image, this.sheetAhead.source);
        this.deps.stagePictures.closePicture(this.sheetAhead);
        this.sheetAhead = null;
        return true;
    }

    // ------------------------------------------------------------------ re-dot and composite
    blockColour(d, stride, q) {
        let amax = 0, wr = 0, wg = 0, wb = 0, ws = 0;
        for (let k = 0; k < 9; k++) {
            const p = q + ((k / 3) | 0) * stride + (k % 3) * 4, a = d[p + 3];
            if (!a) continue;
            if (a > amax) amax = a;
            const light = (0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]) / 255, w = a * (0.25 + light * light);
            wr += d[p] * w; wg += d[p + 1] * w; wb += d[p + 2] * w; ws += w;
        }
        this.scratch.a = amax / 255; this.scratch.w = ws;
        this.scratch.r = ws ? wr / ws : 0; this.scratch.g = ws ? wg / ws : 0; this.scratch.b = ws ? wb / ws : 0;
        return this.scratch;
    }

    classify(d, stride, cols, rows, dots) {
        for (let j = 0; j < cols * rows; j++) {
            dots.keep[j] = 0;
            const c = this.blockColour(d, stride, ((j / cols) | 0) * this.BLOCK * stride + (j % cols) * this.BLOCK * 4);
            if (!c.w || c.a < this.DROP_BELOW) continue;
            const k = c.a < this.DIM_BELOW ? 0.3 + Math.max(c.a, 0.35) : 1;
            dots.index[j] = this.palette.lut[(((c.r * k) >> 3) << 10) | (((c.g * k) >> 3) << 5) | ((c.b * k) >> 3)];
            dots.keep[j] = 1;
        }
    }

    isEdge(j, cols, rows, keep) {
        const x = j % cols, y = (j / cols) | 0;
        return x === 0 || y === 0 || x === cols - 1 || y === rows - 1 || !keep[j - 1] || !keep[j + 1] || !keep[j - cols] || !keep[j + cols];
    }

    writeDots(out, cols, rows, dots) {
        for (let j = 0; j < cols * rows; j++) {
            const q = j * 4, k = dots.index[j];
            if (!dots.keep[j] || (this.palette.light[k] < 0.2 && this.isEdge(j, cols, rows, dots.keep))) { out[q + 3] = 0; continue; }
            const colour = this.palette.rgb[k];
            out[q] = colour[0]; out[q + 1] = colour[1]; out[q + 2] = colour[2]; out[q + 3] = 255;
        }
    }

    dirtyBlocks(d) {
        const x0 = Math.max(0, Math.floor(d.x0 / this.BLOCK) - 1), y0 = Math.max(0, Math.floor(d.y0 / this.BLOCK) - 1);
        const x1 = Math.min(Math.floor(this.surfaces.full.width / this.BLOCK), Math.ceil(d.x1 / this.BLOCK) + 1);
        const y1 = Math.min(Math.floor(this.surfaces.full.height / this.BLOCK), Math.ceil(d.y1 / this.BLOCK) + 1);
        return { x0, y0, cols: x1 - x0, rows: y1 - y0 };
    }

    /** Closes the layer: re-dots the touched region and draws it on the screen canvas ×(tile/16). */
    end() {
        const open = this.scope;
        this.scope = null;
        if (!open?.dirty) return;
        const area = this.dirtyBlocks(open.dirty), full = this.surfaces.fullCtx;
        if (area.cols <= 0 || area.rows <= 0) return;
        const px = area.x0 * this.BLOCK, py = area.y0 * this.BLOCK, pw = area.cols * this.BLOCK, ph = area.rows * this.BLOCK;
        full.setTransform(1, 0, 0, 1, 0, 0);
        const source = full.getImageData(px, py, pw, ph);
        const dots = { keep: new Uint8Array(area.cols * area.rows), index: new Uint8Array(area.cols * area.rows) };
        this.classify(source.data, pw * 4, area.cols, area.rows, dots);
        const image = this.surfaces.loCtx.createImageData(area.cols, area.rows);
        this.writeDots(image.data, area.cols, area.rows, dots);
        this.surfaces.loCtx.putImageData(image, 0, 0);
        full.clearRect(px, py, pw, ph);
        this.composite(open, area);
    }

    composite(open, area) {
        const t = open.target, s = open.s, sy = open.sy;
        const x = open.origin.x + (open.ox + area.x0 * this.BLOCK - 24) * s, y = open.origin.y + (open.oy + area.y0 * this.BLOCK - 24) * sy;
        t.save();
        t.globalAlpha = 1; t.globalCompositeOperation = 'source-over'; t.filter = 'none'; t.imageSmoothingEnabled = false;
        t.drawImage(this.surfaces.lo, 0, 0, area.cols, area.rows, x, y, area.cols * this.BLOCK * s, area.rows * this.BLOCK * sy);
        t.restore();
    }
}

export function createFxRemake(deps) {
    const instance = new FxRemake(deps);
    return Object.freeze({ begin: instance.begin.bind(instance), end: instance.end.bind(instance), discard: instance.discard.bind(instance), isOpen: instance.isOpen.bind(instance), projection: instance.projection.bind(instance), isEnabled: instance.isEnabled.bind(instance), capture: instance.capture.bind(instance), drawDots: instance.drawDots.bind(instance), ring: instance.ring.bind(instance), projectile: instance.projectile.bind(instance), hasProjectile: instance.hasProjectile.bind(instance), brass: instance.brass.bind(instance), prepareSheet: instance.prepareSheet.bind(instance), ELEMENT_RAMPS: instance.ELEMENT_RAMPS });
}
