class StageSkillSheets {
    constructor(deps) {
        this.deps = deps;
        this.TONE = Object.freeze({ s: 0.72, l0: 0.32, l1: 0.92 });
        this.CUT_BUDGET_MS = 3;
        this.CUT_GAP_MS = 16;
        this.ATLAS_IDLE_MS = 3000;
        this.pictures = null;
        this.tintBlocked = false;
        this.sheets = new Map();
        this.cutQueue = [];
        this.asked = new Set();
        this.atlases = new Map();
        this.atlasUsedAt = 0;
        this.pumpTimer = null;
        this.pumpDue = 0;
        this.boxes = new Map();
        this.tones = new Map();
        this.vfxPictureLoaded = image => !!image && !image.dataset.failed && image.complete && image.naturalWidth > 0;
        this.vfxPictureOf = anim => this.pictures && this.pictures[this.deps.STAGE_SKILL_VFX.atlas[anim].im || 0];
        this.vfxHueStep = (p, q, x) => { const t = x < 0 ? x + 1 : x > 1 ? x - 1 : x; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
        this.vfxRampColours = name => (this.deps.STAGE_SKILL_VFX.ramps[name] || null) && this.deps.STAGE_SKILL_VFX.ramps[name].map(hex => [1, 3, 5].map(i => this.deps.parseInt(hex.slice(i, i + 2), 16)));
        this.vfxClipOf = ref => this.deps.STAGE_SKILL_VFX.clips[String(Array.isArray(ref) ? ref[0] : ref).split('@')[0]] || null;
        this.vfxClipWidth = ref => { const clip = this.vfxClipOf(ref), name = String(Array.isArray(ref) ? ref[0] : ref).split('@')[0]; return clip ? this.vfxClipBox(name).w * (clip.sc || 1) : 0; };
        this.vfxClipLength = ref => { const clip = this.vfxClipOf(ref), name = String(Array.isArray(ref) ? ref[0] : ref).split('@')[0]; return clip ? this.vfxClipBox(name).frames * (clip.ms || 70) : 0; };
        this.vfxPicture = index => { this.loadVfxPicture(); return this.pictures && this.vfxPictureLoaded(this.pictures[index]) ? this.pictures[index] : null; };
    }

    loadVfxPicture() {
        if (this.pictures || typeof this.deps.STAGE_SKILL_VFX !== 'object') return;
        // 받지 못한 그림은 다시 받는다(js/stage-asset-retry.js): 기다리는 동안 dataset.failed가 '1'이라 그 클립은 건너뛴다.
        this.pictures = this.deps.STAGE_SKILL_VFX.files.map(file => this.deps.stageAssetRetry.image(this.deps.STAGE_SKILL_VFX.path + file + '?v=' + this.deps.STAGE_SKILL_VFX.version));
    }

    vfxReady(owner) {
        if ((typeof this.deps.stageView !== 'object') || owner.settings.stageSkillFx === 'off') return false;
        this.loadVfxPicture();
        return this.vfxPictureLoaded(this.pictures[0]);
    }

    vfxToneColour(r, g, b) {
        const R = r / 255, G = g / 255, B = b / 255, max = Math.max(R, G, B), min = Math.min(R, G, B), mid = (max + min) / 2, d = max - min;
        const light = this.TONE.l0 + (this.TONE.l1 - this.TONE.l0) * mid;
        if (!d) { const v = Math.round(light * 255); return [v, v, v]; }
        const sat = (mid > 0.5 ? d / (2 - max - min) : d / (max + min)) * this.TONE.s;
        const hue = (max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4) / 6;
        const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat, p = 2 * light - q;
        return [this.vfxHueStep(p, q, hue + 1 / 3), this.vfxHueStep(p, q, hue), this.vfxHueStep(p, q, hue - 1 / 3)].map(value => Math.round(value * 255));
    }

    vfxToned(colour) {
        const key = (colour[0] << 16) | (colour[1] << 8) | colour[2];
        if (!this.tones.has(key)) this.tones.set(key, this.vfxToneColour(colour[0], colour[1], colour[2]));
        return this.tones.get(key);
    }

    vfxRecolour(data, ramp, range) {
        const low = range[0], span = Math.max(1, range[1] - range[0]);
        for (let i = 0; i < data.length; i += 4) {
            if (!data[i + 3]) continue;
            const t = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2] - low) / span;
            const colour = this.vfxToned(ramp ? ramp[t < 0 ? 0 : 1 + Math.floor(Math.min(0.999, t) * 5)] : [data[i], data[i + 1], data[i + 2]]);
            data[i] = colour[0]; data[i + 1] = colour[1]; data[i + 2] = colour[2];
        }
    }

    vfxCutStrip(key, source) {
        const [anim, rampName] = key.split('|'), row = this.deps.STAGE_SKILL_VFX.atlas[anim], canvas = this.deps.document.createElement('canvas');
        canvas.width = row.w * row.n;
        canvas.height = row.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        row.fx.forEach(([x, y], index) => ctx.drawImage(source, x, y, row.w, row.h, index * row.w, 0, row.w, row.h));
        if (!this.tintBlocked) {
            try {
                const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
                this.vfxRecolour(pixels.data, rampName === '=' ? null : this.vfxRampColours(rampName), row.p);
                ctx.putImageData(pixels, 0, 0);
            } catch (error) {
                this.tintBlocked = true;
                this.deps.onTintBlocked(error, key);
            }   // 그림을 읽을 수 없는 환경: 원래 색 그대로 쓴다
        }
        this.sheets.set(key, canvas);
    }

    vfxAskStrip(key) {
        const anim = key.split('|')[0];
        if (this.sheets.has(key) || this.asked.has(key) || !this.deps.STAGE_SKILL_VFX.atlas[anim]) return;
        const image = this.vfxPictureOf(anim);
        if (!image || image.dataset.failed) return;   // 그 그림이 없는 판: 그 클립은 나오지 않는다
        this.asked.add(key);
        this.cutQueue.push(key);
        this.vfxSchedulePump(0);
    }

    vfxSchedulePump(delay) {
        const due = this.deps.performance.now() + delay;
        if (this.pumpTimer !== null && this.pumpDue <= due) return;
        if (this.pumpTimer !== null) this.deps.clearTimeout(this.pumpTimer);
        this.pumpDue = due;
        this.pumpTimer = this.deps.setTimeout(this.vfxCutPump.bind(this), delay);
    }

    vfxSourceOf(anim) {
        const im = this.deps.STAGE_SKILL_VFX.atlas[anim].im || 0, image = this.pictures[im];
        if (!this.vfxPictureLoaded(image)) return null;
        if (!this.atlases.has(im)) this.atlases.set(im, this.deps.stagePictures.openPicture(image.src));
        const open = this.atlases.get(im);
        return open.ready ? open.source : (open.failed ? image : null);
    }

    vfxCutPump() {
        this.pumpTimer = null;
        if (!this.cutQueue.length) { this.vfxRestAtlas(); return; }
        this.atlasUsedAt = this.deps.performance.now();
        const until = this.atlasUsedAt + this.CUT_BUDGET_MS, waiting = [];
        while (this.cutQueue.length && this.deps.performance.now() < until) {
            const key = this.cutQueue.shift(), anim = key.split('|')[0];
            if (this.vfxPictureOf(anim).dataset.failed) { this.asked.delete(key); continue; }   // 그 그림을 못 불러왔다: 띠를 만들지 않는다
            const source = this.vfxSourceOf(anim);
            if (!source) { waiting.push(key); continue; }
            this.asked.delete(key);
            this.vfxCutStrip(key, source);
        }
        this.cutQueue.unshift(...waiting);
        this.vfxSchedulePump(this.cutQueue.length ? this.CUT_GAP_MS : this.ATLAS_IDLE_MS);
    }

    vfxRestAtlas() {
        if (!this.atlases.size) return;
        const idle = this.deps.performance.now() - this.atlasUsedAt;
        if (idle < this.ATLAS_IDLE_MS) { this.vfxSchedulePump(this.ATLAS_IDLE_MS - idle + 20); return; }
        for (const open of this.atlases.values()) this.deps.stagePictures.closePicture(open);
        this.atlases.clear();
    }

    vfxSheetOf(anim, rampName) {
        const key = anim + '|' + rampName, sheet = this.sheets.get(key);
        if (!sheet) this.vfxAskStrip(key);
        return sheet || null;
    }

    vfxStripKey(ref) {
        const [name, rampName] = String(ref).split('@'), clip = this.deps.STAGE_SKILL_VFX.clips[name];
        return clip ? clip.a + '|' + (rampName !== undefined ? rampName : 'phys') : '';
    }

    vfxKeepStrips(owner, refs, live) {
        if (!this.vfxReady(owner)) return;
        const wanted = new Set(refs.map(this.vfxStripKey.bind(this)).filter(Boolean));
        for (const row of live) if (row.clip) wanted.add(row.clip.a + '|' + row.ramp);
        for (const [key, canvas] of [...this.sheets]) {
            if (wanted.has(key)) continue;
            canvas.width = canvas.height = 1;
            this.sheets.delete(key);
        }
        for (let i = this.cutQueue.length - 1; i >= 0; i--) if (!wanted.has(this.cutQueue[i])) this.asked.delete(this.cutQueue.splice(i, 1)[0]);
        wanted.forEach(this.vfxAskStrip.bind(this));
    }

    vfxFramesBox(row, f0, f1) {
        const boxes = row.fb.slice(f0, f1 + 1).filter(Boolean);
        if (!boxes.length) return [0, 0, row.w, row.h];
        return [Math.min(...boxes.map(q => q[0])), Math.min(...boxes.map(q => q[1])), Math.max(...boxes.map(q => q[2])), Math.max(...boxes.map(q => q[3]))];
    }

    vfxClipBox(name) {
        if (this.boxes.has(name)) return this.boxes.get(name);
        const clip = this.deps.STAGE_SKILL_VFX.clips[name], row = this.deps.STAGE_SKILL_VFX.atlas[clip.a];
        const [f0, f1] = clip.f || [0, row.n - 1], b = this.vfxFramesBox(row, f0, f1);
        const ax = { left: b[0], right: b[2] }[clip.an] ?? (b[0] + b[2]) / 2, ay = clip.an === 'bottom' ? b[3] : (b[1] + b[3]) / 2;
        // pivot: 칸 안의 자리로 정한 기준점(pixelfx로 구운 클립의 원점, 2026-11-02 전달본 V3.9.1)
        const box = { ax: clip.pivot ? clip.pivot[0] : ax, ay: clip.pivot ? clip.pivot[1] : ay, w: b[2] - b[0], h: b[3] - b[1], f0, f1, frames: f1 - f0 + 1 };
        this.boxes.set(name, box);
        return box;
    }
    dispose() {
        if (this.pumpTimer !== null) this.deps.clearTimeout(this.pumpTimer);
        this.pumpTimer = null;
        this.pumpDue = 0;
        this.cutQueue.length = 0;
        this.asked.clear();
        for (const open of this.atlases.values()) this.deps.stagePictures.closePicture(open);
        this.atlases.clear();
        for (const canvas of this.sheets.values()) canvas.width = canvas.height = 1;
        this.sheets.clear();
        this.boxes.clear();
        this.tones.clear();
        this.pictures = null;
        this.tintBlocked = false;
        this.atlasUsedAt = 0;
    }
}

export function createStageSkillSheets(deps) {
    const view=new StageSkillSheets(deps);
    return Object.freeze({ vfxReady:view.vfxReady.bind(view), vfxClipBox:view.vfxClipBox.bind(view), vfxAskStrip:view.vfxAskStrip.bind(view), vfxSheetOf:view.vfxSheetOf.bind(view), vfxKeepStrips:view.vfxKeepStrips.bind(view), vfxClipOf:view.vfxClipOf, vfxClipWidth:view.vfxClipWidth, vfxClipLength:view.vfxClipLength, vfxPicture:view.vfxPicture, dispose:view.dispose.bind(view) });
}
