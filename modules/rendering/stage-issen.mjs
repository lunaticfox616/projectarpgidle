class StageIssen {
    constructor(deps, shared) {
        this.deps = deps;
        this.shared = shared;
        this.bar = (ctx, x, y, w, h) => ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
        this.ISSEN = Object.freeze({ reach: 70, lift: 50, tail: 260, shade: 200, bits: 40, cuts: 6, cutLift: -48, cutScale: 0.8, cutAlpha: 0.8, cutLag: 120, cutPace: 8 });
        this.STAR = Object.freeze({ frames: Object.freeze([2, 3]), edge: 90, green: 20, retry: 250 });
        this.cut = { picture: null, mask: null, strip: null, failed: false, triedAt: -Infinity };
    }

    /** 그 줄의 화면 자리: 쓴 자리의 x, 줄의 발 y와 선의 y, 지금 보이는 화면의 왼쪽과 오른쪽(붓의 좌표로). */
    issenFrame(ctx, p, event) {
        const at = this.shared.K.screen(p, { gx: event.sourceCell.gx, gy: event.issenRow }), m = ctx.getTransform(), scale = m.a || 1;
        const left = -m.e / scale, right = (ctx.canvas.width - m.e) / scale;
        return { x0: at.x, y: at.y, Y: Math.round(at.y - this.ISSEN.lift * at.dot), dot: at.dot, left, right, width: right - left };
    }

    /** 뻗는 선의 양 끝: 0.07초에 화면 끝까지. */
    issenEnds(f, t) {
        const reach = Math.min(1, t / this.ISSEN.reach);
        return { reach, L: Math.max(f.left, f.x0 - f.width * reach), R: Math.min(f.right, f.x0 + f.width * reach) };
    }

    /** 그은 선: 넓고 옅은 바람 띠, 옅은 테, 흰 심 한 도트, 뻗어 가는 끝의 빛. */
    issenStroke(ctx, f, z, ink) {
        const a = 1 - (z.t / z.delay) * 0.45, e = this.issenEnds(f, z.t), d = f.dot, w = e.R - e.L;
        ctx.globalAlpha = 0.16 * a; ctx.fillStyle = ink.c1; this.bar(ctx, e.L, f.Y - 5 * d, w, 10 * d);
        ctx.globalAlpha = 0.55 * a; ctx.fillStyle = ink.c2; this.bar(ctx, e.L, f.Y - d, w, 3 * d);
        ctx.globalAlpha = 0.95 * a; ctx.fillStyle = '#fbf8f0'; this.bar(ctx, e.L, f.Y, w, d);
        ctx.globalAlpha = 0.9 * (1 - e.reach * 0.6); this.bar(ctx, f.x0 + z.face * f.width * e.reach - 3 * d, f.Y - 2 * d, 6 * d, 5 * d);
    }

    /** 베인 뒤: 선이 위아래로 갈라져 흩어진다. */
    issenSplit(ctx, f, z, ink) {
        const a = Math.max(0, 0.55 - z.u), d = f.dot, sp = Math.round(2 + z.u * 9) * d, r = this.deps.stageSkillStrokes.random(z.seed);
        ctx.globalAlpha = a; ctx.fillStyle = ink.c1; this.bar(ctx, f.left, f.Y - sp, f.width, d); this.bar(ctx, f.left, f.Y + sp, f.width, d);
        ctx.globalAlpha = a * 0.5; ctx.fillStyle = ink.c2;
        for (let i = 0; i < this.ISSEN.bits; i++) this.bar(ctx, f.left + r() * f.width, f.Y + (r() - 0.5) * 2 * (sp + 4 * d), 3 * d, d);
    }

    /** 바닥: 그 줄의 깊이(±issenDepth칸)에 옅은 띠가 선을 따라 펴졌다가 옅어진다(바닥 층). */
    issenBand(ctx, p, now, event) {
        const t = now - event.at, life = event.issenDelay + this.ISSEN.shade;
        if (t < 0 || t >= life) return;
        const f = this.issenFrame(ctx, p, event), e = this.issenEnds(f, t), deep = event.issenDepth * this.shared.K.DEEP * f.dot;
        ctx.globalAlpha = 0.18 * (1 - t / life); ctx.fillStyle = this.shared.inkOf(event.element, 'phys').c2;
        this.bar(ctx, e.L, f.y - deep, e.R - e.L, deep * 2);
    }

    /** 흰 선이 화면 끝에서 끝까지 뻗고, issenDelay 뒤 위아래로 갈라져 흩어진다. 베기 자국은 그동안 준비해 둔다. */
    issenLine(c) {
        const event = c.event, t = c.view.now - event.at;
        this.cutStrip(c.gem.map.cut, c.view.now);
        this.shared.groundLayer(c, this.issenBand.bind(this));
        if (t < 0 || t > event.issenDelay + this.ISSEN.tail) return true;
        const ctx = c.view.ctx, f = this.issenFrame(ctx, c.view.projection, event), ink = this.shared.inkOf(c.element, 'phys');
        ctx.save();
        if (t < event.issenDelay) this.issenStroke(ctx, f, { t, face: event.issenFace || c.look.face, delay: event.issenDelay }, ink);
        else this.issenSplit(ctx, f, { u: (t - event.issenDelay) / this.ISSEN.tail, seed: Math.floor(event.sourceCell.gx * this.shared.K.WIDE) + 7 }, ink);
        ctx.restore();
        return true;
    }

    /** 베인 적마다(가까운 6명까지) 별을 지운 큰 베기 자국: 쓴 자리에서 먼 적일수록 늦게(도트/8 ms, 0.12초까지). */
    issenCut(c) {
        const strip = c.first ? this.cutStrip(c.gem.map.cut, c.view.now) : null;
        if (!strip) return true;   // 별을 지운 베기 자국을 만들 수 없으면 그 자국만 빠진다
        const from = c.event.sourceCell, face = c.event.issenFace || c.look.face;
        c.event.targetCells.slice(0, this.ISSEN.cuts).forEach(spot => this.cutPlay(strip, this.shared.K.at(spot, 0, this.ISSEN.cutLift), { face, delay: Math.min(this.ISSEN.cutLag, Math.abs(spot.gx - from.gx) * this.shared.K.WIDE / this.ISSEN.cutPace) }));
        return true;
    }

    cutStrip(ref, now) {
        if (this.cut.strip || this.cut.failed || !ref || !this.deps.stageSkillVfx.clipOf(ref)) return this.cut.strip;
        if (!this.cut.mask) this.cut.mask = this.cutMask(ref);
        if (!this.cut.mask || now - this.cut.triedAt < this.STAR.retry) return this.cut.strip;
        this.cut.triedAt = now;
        try { this.cut.strip = this.cutPaint(ref, this.cut.mask); } catch (error) {
            this.cut.failed = true;
            this.deps.onCutBlocked(error, 'paint');
        }   // 띠를 읽을 수 없는 환경(원래 색으로 그리는 판)
        return this.cut.strip;
    }

    /** 원본 아틀라스에서 장마다 지울 점. 원본이 아직 풀리지 않았으면 null(그동안 풀어 둔다). */
    cutMask(ref) {
        const row = this.deps.STAGE_SKILL_VFX.atlas[this.deps.stageSkillVfx.clipOf(ref).a];
        if (!this.cut.picture) this.cut.picture = this.deps.stagePictures.openPicture(this.deps.STAGE_SKILL_VFX.path + this.deps.STAGE_SKILL_VFX.files[row.im || 0] + '?v=' + this.deps.STAGE_SKILL_VFX.version);
        if (this.cut.picture.failed) this.cut.failed = true;
        if (!this.cut.picture.ready) return null;
        const masks = this.cutRead(this.cut.picture.source, row);
        this.deps.stagePictures.closePicture(this.cut.picture);
        if (!masks) this.cut.failed = true;
        return masks;
    }

    cutRead(source, row) {
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = row.w; canvas.height = row.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        try {
            return new Map(this.STAR.frames.map(frame => {
                ctx.clearRect(0, 0, row.w, row.h);
                ctx.drawImage(source, row.fx[frame][0], row.fx[frame][1], row.w, row.h, 0, 0, row.w, row.h);
                return [frame, this.starMask(ctx.getImageData(0, 0, row.w, row.h).data, row.w, row.h)];
            }));
        } catch (error) {
            this.deps.onCutBlocked(error, 'read');
            return null;
        }   // 그림을 읽을 수 없는 환경
    }

    /** 빨강이 더 센 점(별의 테)을 지우고, 그 뒤 초록이 하나도 없는 오른쪽(x ≥ 90) 덩어리(별의 속)를 지운다. 초승달은 초록 계열이라 남는다. @returns {Uint8Array} 지울 점이 1 */
    starMask(data, w, h) {
        const gone = new Uint8Array(w * h), seen = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] && data[i * 4] > data[i * 4 + 1]) gone[i] = 1;
        const z = { w, h, seen, data, on: i => data[i * 4 + 3] > 0 && !gone[i] };
        for (let i = 0; i < w * h; i++) {
            if (seen[i] || !z.on(i)) continue;
            const blob = this.starBlob(i, z);
            if (blob.left >= this.STAR.edge && !blob.green) blob.points.forEach(q => { gone[q] = 1; });
        }
        return gone;
    }

    /** 한 점에서 이어진(여덟 이웃) 덩어리: 점들, 가장 왼쪽 x, 초록 점의 수. */
    starBlob(start, z) {
        const points = [], stack = [start];
        let left = z.w, green = 0;
        z.seen[start] = 1;
        while (stack.length) {
            const q = stack.pop(), x = q % z.w;
            points.push(q); left = Math.min(left, x);
            if (z.data[q * 4 + 1] > z.data[q * 4] + this.STAR.green) green++;
            for (const next of this.starNear(x, (q - x) / z.w, z)) if (!z.seen[next] && z.on(next)) { z.seen[next] = 1; stack.push(next); }
        }
        return { points, left, green };
    }

    starNear(x, y, z) {
        const out = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const u = x + dx, v = y + dy;
            if (u >= 0 && v >= 0 && u < z.w && v < z.h) out.push(v * z.w + u);
        }
        return out;
    }

    /** 클립의 기준점(js/canvas-stage-skill-vfx.js vfxClipBox와 같은 셈). */
    cutBox(row, clip, f0, f1) {
        if (clip.pivot) return { ax: clip.pivot[0], ay: clip.pivot[1] };
        const boxes = row.fb.slice(f0, f1 + 1).filter(Boolean);
        const b = boxes.length ? [0, 1, 2, 3].map(k => (k < 2 ? Math.min : Math.max)(...boxes.map(q => q[k]))) : [0, 0, row.w, row.h];
        return { ax: { left: b[0], right: b[2] }[clip.an] ?? (b[0] + b[2]) / 2, ay: clip.an === 'bottom' ? b[3] : (b[1] + b[3]) / 2 };
    }

    /** 게임의 띠에서 그 클립의 장들을 한 도트 그대로 찍어 온 사본에서 별 조각을 지운다. 띠가 아직 없으면 null(조금 뒤에 다시). */
    cutPaint(ref, masks) {
        const clip = this.deps.stageSkillVfx.clipOf(ref), row = this.deps.STAGE_SKILL_VFX.atlas[clip.a], [f0, f1] = clip.f || [0, row.n - 1], frames = f1 - f0 + 1;
        const box = this.cutBox(row, clip, f0, f1), ms = clip.ms || 70, sc = clip.sc || 1, canvas = this.deps.document.createElement('canvas');
        canvas.width = row.w * frames; canvas.height = row.h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        for (let i = 0; i < frames; i++) this.deps.stageSkillVfx.stamp(ctx, ref, i * ms, { x: i * row.w - Math.round(-box.ax), y: -Math.round(-box.ay), dot: 1 / sc });
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!pixels.data.some((value, i) => i % 4 === 3 && value > 0)) return null;
        masks.forEach((gone, frame) => this.cutErase(pixels.data, gone, { left: (frame - f0) * row.w, w: row.w, stride: canvas.width }));
        ctx.putImageData(pixels, 0, 0);
        return { canvas, w: row.w, h: row.h, frames, ms, sc, ax: box.ax, ay: box.ay, tail: clip.fadeOut || 0 };
    }

    cutErase(data, gone, z) {
        if (z.left < 0 || z.left >= z.stride) return;
        for (let i = 0; i < gone.length; i++) if (gone[i]) data[(Math.floor(i / z.w) * z.stride + z.left + i % z.w) * 4 + 3] = 0;
    }

    /** 별을 지운 베기 자국 하나(play처럼 장을 넘기고 끝에서 옅어진다. 줄인 클립이라 부드럽게 그린다). */
    cutPlay(strip, at, o) {
        const life = strip.frames * strip.ms;
        this.deps.stageSkillVfx.paint(at, { life, delay: o.delay }, (ctx, t, dot) => {
            const i = Math.min(strip.frames - 1, Math.floor(t / strip.ms)), size = strip.sc * this.ISSEN.cutScale * dot;
            ctx.globalAlpha *= this.ISSEN.cutAlpha * (strip.tail ? this.shared.clamp((life - t) / strip.tail, 0, 1) : 1);
            if (o.face < 0) ctx.scale(-1, 1);
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(strip.canvas, i * strip.w, 0, strip.w, strip.h, Math.round(-strip.ax * size), Math.round(-strip.ay * size), Math.round(strip.w * size), Math.round(strip.h * size));
        });
    }
}

export function createStageIssen(deps, shared) {
    return new StageIssen(deps, shared);
}
