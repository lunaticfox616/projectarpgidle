// The loop cinematic's pictures. Everything but the hero and the core is drawn on one logical world (1376x768, the backdrop
// picture's own grid) and moved to the screen at whole device pixels; the hero and the core are drawn on the screen afterwards
// (loop-cinematic-hero.mjs). Timing comes from loop-cinematic-timeline.mjs.
import { SHOTS, clamp01, lerp, smooth, easeIn, easeOutCubic, hash, animMs, rewindPicture, graftTimes } from './loop-cinematic-timeline.mjs';
import { circlePath, idleFrame, drawHero, drawDissolve, drawMotesOut, drawMotesIn, drawCore, drawCoreMoving, chestOf } from './loop-cinematic-hero.mjs';
import { ACT1_REGION } from './loop-cinematic-snapshot.mjs';

const W = SHOTS.world.w, H = SHOTS.world.h;

export class LoopCinematicScene {
    constructor(deps, assets, backdrop) {
        this.deps = deps;
        this.assets = assets;
        this.backdrop = backdrop;
        this.world = null;
        this.w = null;
        this.grey = null;
        this.screen = null;
        this.s = null;
        this.layout = { ratio: 1, phone: false, scene: { x: 0, y: 0, w: 1, h: 1 }, view: { cx: W / 2, cy: H / 2, w: W, h: H }, baseScale: 1 };
        this.map = { s: 1, ox: 0, oy: 0 };
        this.proj = { toScreen: (x, y) => ({ x: this.map.ox + x * this.map.s, y: this.map.oy + y * this.map.s }), heroK: 2, coreK: 1 };
    }

    /** Neither the scene nor the plain backdrop can draw without a 2D canvas: the plain fade stands in. */
    canDraw() { return !!this.ensureWorld(); }

    ensureWorld() {
        if (this.world) return this.w;
        this.world = this.deps.document.createElement('canvas');
        this.world.width = W;
        this.world.height = H;
        this.w = this.world.getContext('2d');
        if (this.w) this.w.imageSmoothingEnabled = false;
        return this.w;
    }

    attach(canvas) {
        this.ensureWorld();
        this.screen = canvas;
        this.s = canvas.getContext('2d');
    }

    /** Sizes the screen canvas to the overlay (css px) and picks the camera. Returns the scene box in css px for the text layer. */
    resize(cssW, cssH, ratio) {
        const phone = cssW < 720 || cssW < cssH, cam = SHOTS.camera;
        const phoneH = Math.round(cssW * 9 / 16);
        const scene = phone ? { x: 0, y: Math.max(cam.phoneTopBar, Math.round((cssH - phoneH) * 0.36)), w: cssW, h: phoneH } : { x: 0, y: 0, w: cssW, h: cssH };
        this.screen.width = Math.round(cssW * ratio);
        this.screen.height = Math.round(cssH * ratio);
        if (this.s) this.s.imageSmoothingEnabled = false;
        const aspect = scene.w / scene.h;
        const view = phone ? { cx: cam.phoneCentre.x, cy: cam.phoneCentre.y, w: cam.phoneViewW, h: cam.phoneViewW / aspect }
            : aspect < W / H ? { cx: W / 2, cy: H / 2, w: H * aspect, h: H } : { cx: W / 2, cy: H / 2, w: W, h: W / aspect };
        const deviceScene = { x: scene.x * ratio, y: scene.y * ratio, w: scene.w * ratio, h: scene.h * ratio };
        this.layout = { ratio, phone, scene: deviceScene, view, baseScale: deviceScene.w / view.w };
        this.proj.heroK = Math.max(1, Math.round(SHOTS.hero.scale * this.layout.baseScale));
        this.proj.coreK = Math.max(1, Math.round(this.layout.baseScale));
        return { ...scene, phone };
    }

    /** z: zoom over the base view; anchor: the world point that stays put. */
    blit(cam) {
        const R = this.layout.scene, base = this.layout.view, z = cam.z, a = cam.anchor;
        const cx = a.x + (base.cx - a.x) / z, cy = a.y + (base.cy - a.y) / z, vw = base.w / z, vh = base.h / z, s = R.w / vw;
        const ox = Math.round(R.x - (cx - vw / 2) * s), oy = Math.round(R.y - (cy - vh / 2) * s);
        const ctx = this.s;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.screen.width, this.screen.height);
        ctx.save();
        ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.world, 0, 0, W, H, ox, oy, Math.round(W * s), Math.round(H * s));
        ctx.restore();
        this.map = { s, ox, oy };
    }

    /** Clip the screen layer to the scene box (the hero and the core never spill into the phone's caption band). */
    withSceneClip(draw) {
        const R = this.layout.scene, ctx = this.s;
        ctx.save();
        ctx.beginPath(); ctx.rect(R.x, R.y, R.w, R.h); ctx.clip();
        draw(ctx);
        ctx.restore();
    }

    sceneCentreCss() {
        const c = SHOTS.rewind.centre, p = this.proj.toScreen(c.x, c.y);
        return { x: p.x / this.layout.ratio, y: p.y / this.layout.ratio };
    }

    // ---- world pieces ----------------------------------------------------------------------------------------------------
    backdropAt(T, t, extra) {
        const a = animMs(T, t);
        this.backdrop.draw(this.w, Object.assign({ time: a / 1000, wave: -0.2, ang: this.vortexAngle(T, t), dim: 0, lean: 0, front: 0, ringLight: 0 }, extra));
    }

    vortexAngle(T, t) {
        const b = SHOTS.breakShot, start = T.mode === 'full' ? T.waveStart : 0, e = (t - start) / 1000, ramp = b.vortexRampMs / 1000;
        if (e <= 0) return 0;
        return b.vortexSpeed * (e < ramp ? e * e / (2 * ramp) : ramp / 2 + (e - ramp));
    }

    /** A region picture (or act 1's set) placed like the battlefield, dx the reverse drift. */
    drawRegion(id, dx, dy, filter) {
        const img = this.assets.region(id);
        if (!img) return false;
        if (filter) this.w.filter = filter;
        if (id === ACT1_REGION) this.drawAct1(dx, img);
        else this.w.drawImage(img, Math.round(SHOTS.battlefield.dx + dx), Math.round(dy));
        if (filter) this.w.filter = 'none';
        return true;
    }

    drawAct1(dx, img = this.assets.act1()) {
        if (!img) return;
        const s = SHOTS.act1.scale, w = Math.round(img.width * s), h = Math.round(img.height * s);
        this.w.drawImage(img, 0, 0, img.width, img.height, Math.round((W - w) / 2 + dx), Math.round(SHOTS.act1.groundY - img.groundY * s), w, h);
    }

    // ---- shots 0 and 1: the battlefield and the ground falling away -------------------------------------------------------
    battlefieldFilter(u) {
        const b = SHOTS.battlefield;
        return `saturate(${lerp(1, b.saturation, u).toFixed(3)}) brightness(${lerp(1, b.brightness, u).toFixed(3)})`;
    }

    drawBattlefield(snap, t) {
        this.w.fillStyle = '#000';
        this.w.fillRect(0, 0, W, H);
        this.drawRegion(snap.region, 0, SHOTS.battlefield.dy, this.battlefieldFilter(smooth(t / SHOTS.battlefield.fadeMs)));
    }

    drawFall(T, snap, e, t) {
        const f = SHOTS.fall, feetX = SHOTS.hero.feet.x;
        this.backdropAt(T, t, { dim: f.dimFrom * (1 - smooth(e / f.ms)) });
        const img = this.greyBattlefield(snap.region);
        if (!img) return;
        const maxDist = Math.max(feetX, W - feetX);
        for (let x = 0; x < W; x += f.columnPx) {
            const dist = Math.abs(x + f.columnPx / 2 - feetX) / maxDist;
            const age = Math.max(0, (e - (1 - dist) * f.edgeFirstMs - hash(x * 0.13) * f.jitterMs) / 1000), off = Math.round(0.5 * f.gravity * age * age);
            if (off < H) this.w.drawImage(img, x, 0, f.columnPx, H, x, off, f.columnPx, H);
        }
    }

    /** The last battlefield frame (region or act 1's set, greyed) as one world-sized picture, made once: a filter on each of the
     * 172 falling columns cost a frame. */
    greyBattlefield(id) {
        if (this.grey && this.grey.id === id) return this.grey.canvas;
        const canvas = this.deps.document.createElement('canvas'), ctx = canvas.getContext('2d'), world = this.w;
        canvas.width = W;
        canvas.height = H;
        ctx.imageSmoothingEnabled = false;
        this.w = ctx;
        const drawn = this.drawRegion(id, 0, SHOTS.battlefield.dy, this.battlefieldFilter(1));
        this.w = world;
        if (!drawn) return null;
        this.grey = { id, canvas };
        return canvas;
    }

    // ---- shots 2 to 4: the voice over the abyss, the break, the scatter ---------------------------------------------------
    leanAt(T, t) {
        const L = T.lines[1], v = SHOTS.voice;
        if (!L || t < L.start || t > L.end) return { lean: 0, front: v.leanFrontFrom };
        const inU = smooth((t - L.start) / v.leanInMs), outU = smooth((t - (L.end - v.leanOutMs)) / v.leanOutMs);
        return { lean: inU * (1 - outU) * 0.95, front: lerp(v.leanFrontFrom, v.leanFrontTo, inU) };
    }

    waveAt(T, t) { return t < T.waveStart ? -0.2 : 1.9 * easeOutCubic((t - T.waveStart) / (T.waveEnd - T.waveStart)); }

    drawAbyss(T, t) {
        const lean = this.leanAt(T, t), ringLight = t >= T.waveStart ? smooth((t - T.waveStart) / SHOTS.breakShot.ringLightMs) : 0;
        this.backdropAt(T, t, { wave: this.waveAt(T, t), lean: lean.lean, front: lean.front, ringLight });
    }

    coreAtAbyss(T, t) {
        const sc = SHOTS.scatter, s4 = T.starts[4], chest = chestOf(SHOTS.hero.feet), appear = s4 + sc.dissolveMs * 0.5, settled = s4 + sc.dissolveMs;
        if (t < appear) return null;
        const lift = sc.coreLiftPx * smooth((t - settled) / (T.starts[5] - settled));
        return { x: chest.x, y: chest.y - lift, a: clamp01((t - appear) / sc.coreFadeMs) };
    }

    camFull(T, t) {
        const v = SHOTS.voice, s = T.starts, cam = { z: 1, anchor: v.anchor };
        if (t >= s[2] && t < s[3]) cam.z = 1 + (v.push - 1) * smooth((t - s[2]) / (s[3] - s[2]));
        else if (t >= s[3] && t < s[4]) cam.z = v.push;
        else if (t >= s[4] && t < s[5]) cam.z = v.push - (v.push - 1) * smooth((t - s[4]) / SHOTS.scatter.pullMs);
        return cam;
    }

    // ---- shot 5: the rewind --------------------------------------------------------------------------------------------
    drawRewindPicture(snap, cfg, index, u) {
        const ids = snap.rewind, id = ids[Math.min(index, ids.length - 1)], scroll = cfg.scrollPx * (clamp01(u) - 0.5);
        if (id === ACT1_REGION) this.drawAct1(scroll);
        else this.drawRegion(id, scroll, -20);
    }

    drawRewindTear(snap, cfg, pic) {
        const w = this.w, tearY = Math.round(H * pic.local / cfg.tearMs);
        this.drawRewindPicture(snap, cfg, pic.i - 1, 1);
        w.save(); w.translate(14, 0); w.beginPath(); w.rect(-14, tearY, W + 14, H - tearY); w.clip(); this.drawRewindPicture(snap, cfg, pic.i - 1, 1); w.restore();
        w.save(); w.beginPath(); w.rect(0, 0, W, tearY); w.clip(); this.drawRewindPicture(snap, cfg, pic.i, 0); w.restore();
        w.fillStyle = '#e8fbff';
        w.fillRect(0, tearY, W, 2);
    }

    drawRewind(T, snap, e, t) {
        const ring = SHOTS.ring, cfg = T.rewind, iStart = cfg.coreFlyMs + cfg.flashMs, w = this.w;
        this.backdropAt(T, t, { wave: 1.9, ringLight: 1 });
        if (e < cfg.coreFlyMs) return;
        if (e < iStart) { w.fillStyle = '#fff'; w.fillRect(0, 0, W, H); return; }
        const R = lerp(ring.r, 940, easeOutCubic((e - iStart) / cfg.irisOpenMs)), pic = rewindPicture(cfg, e, snap.rewind.length);
        circlePath(w, ring.x, ring.y, R + 2, H);
        w.fillStyle = '#d8f3ff'; w.fill();
        w.save();
        circlePath(w, ring.x, ring.y, R, H); w.clip();
        w.fillStyle = '#000'; w.fillRect(0, 0, W, H);
        if (pic.i > 0 && pic.local < cfg.tearMs) this.drawRewindTear(snap, cfg, pic);
        else this.drawRewindPicture(snap, cfg, pic.i, pic.local / pic.hold);
        w.restore();
    }

    rewindCore(T, from) {
        const ring = SHOTS.ring, cfg = T.rewind, iStart = cfg.coreFlyMs + cfg.flashMs, c = SHOTS.rewind.centre;
        return ms => {
            if (ms < cfg.coreFlyMs) { const u = easeIn(ms / cfg.coreFlyMs); return { x: lerp(from.x, ring.x, u), y: lerp(from.y, ring.y, u) }; }
            if (ms < iStart) return null;
            const u = smooth((ms - iStart) / cfg.irisOpenMs);
            return { x: lerp(ring.x, c.x, u), y: lerp(ring.y, c.y, u) };
        };
    }

    // ---- shot 6: the well ----------------------------------------------------------------------------------------------
    wellLanded(cfg) { return cfg.fallStartMs + cfg.fallMs; }

    wellPoolR(cfg, e) { return e < cfg.poolAtMs ? 0 : lerp(cfg.poolR0, cfg.poolR1, smooth((e - cfg.poolAtMs) / (cfg.titleAtMs - cfg.poolAtMs))); }

    wellCore(cfg) {
        const m = cfg.mouth, c = SHOTS.rewind.centre;
        return e => {
            if (e < cfg.closeMs) { const u = smooth(e / cfg.closeMs); return { x: lerp(c.x, m.x, u), y: lerp(c.y, m.y, u) }; }
            if (e < cfg.fallStartMs) return { x: m.x, y: m.y };
            const u = (e - cfg.fallStartMs) / cfg.fallMs;
            if (u < 1) return { x: m.x, y: lerp(m.y, cfg.hover.y, smooth(u)) };
            return { x: cfg.hover.x, y: cfg.hover.y + (Math.floor((e - this.wellLanded(cfg)) / 420) % 2 ? 1 : 0) };
        };
    }

    /** The pool rim: r to r+rim shows the picture only on a 2 px checkerboard (no blur). */
    poolRimPath(c, r, R) {
        const w = this.w;
        w.beginPath();
        for (let y = Math.max(0, Math.floor(c.y - R) & ~1); y < Math.min(H, c.y + R); y += 2) {
            const dy = y + 1 - c.y, outer = Math.sqrt(Math.max(0, R * R - dy * dy)), inner = Math.sqrt(Math.max(0, r * r - dy * dy));
            for (let x = Math.floor(c.x - outer) & ~1; x < c.x + outer; x += 2) {
                if (Math.abs(x + 1 - c.x) >= inner && !(((x >> 1) + (y >> 1)) % 2)) w.rect(x, y, 2, 2);
            }
        }
    }

    drawPool(cfg, r, alpha) {
        if (r <= 0 || alpha <= 0) return;
        const c = cfg.poolCentre, w = this.w;
        w.globalAlpha = alpha;
        w.save(); circlePath(w, c.x, c.y, r, H); w.clip(); this.drawAct1(0); w.restore();
        if (r < 900) { w.save(); this.poolRimPath(c, r, r + cfg.poolRimPx); w.clip(); this.drawAct1(0); w.restore(); }
        w.globalAlpha = 1;
    }

    drawShaft(cfg, e) {
        const m = cfg.mouth, w = this.w, shaftU = smooth((e - cfg.closeMs) / cfg.shaftMs), thin = 1 - smooth((e - this.wellLanded(cfg)) / cfg.shaftThinMs);
        if (shaftU <= 0 || thin <= 0) return;
        const top = m.y + m.r, floorY = cfg.poolCentre.y, bottom = lerp(top, floorY, shaftU), floorW = 120 * thin;
        w.save();
        w.globalCompositeOperation = 'lighter';
        w.fillStyle = `rgba(255,232,190,${(0.08 * thin).toFixed(3)})`;
        w.beginPath();
        for (let y = Math.round(top); y < Math.round(bottom); y++) {
            const hw = Math.round(lerp(m.r * 0.6 * thin, floorW / 2, (y - top) / (floorY - top)));
            if (hw > 0) w.rect(m.x - hw, y, hw * 2, 1);
        }
        w.fill();
        const width = Math.max(0, Math.round(cfg.shaftPx * thin / 2) * 2), g = w.createLinearGradient(0, top, 0, floorY);
        g.addColorStop(0, `rgba(255,240,205,${(0.5 * thin).toFixed(3)})`); g.addColorStop(1, `rgba(255,230,180,${(0.18 * thin).toFixed(3)})`);
        w.fillStyle = g;
        if (width > 0) w.fillRect(m.x - width / 2, top, width, bottom - top);
        w.restore();
    }

    /** The iris closing into the mouth at the top: everything else is the well's black wall. */
    drawMouth(snap, cfg, e, alpha) {
        if (alpha <= 0) return;
        const ring = SHOTS.ring, m = cfg.mouth, w = this.w, cu = smooth(e / cfg.closeMs);
        const cx = lerp(ring.x, m.x, cu), cy = lerp(ring.y, m.y, cu), R = lerp(940, m.r, easeIn(cu));
        w.globalAlpha = alpha;
        circlePath(w, cx, cy, R + 2, H);
        w.fillStyle = '#e0c283'; w.fill();
        w.save();
        circlePath(w, cx, cy, R, H); w.clip();
        if (cu < 1) { this.drawRewindPicture(snap, cfg, snap.rewind.length - 1, 1); w.fillStyle = `rgba(255,244,214,${cu.toFixed(3)})`; }
        else w.fillStyle = '#fff4d6';
        w.fillRect(0, 0, W, H);
        w.restore();
        w.globalAlpha = 1;
    }

    drawWell(T, snap, e, opts = {}) {
        const cfg = T.well, w = this.w;
        w.fillStyle = '#000'; w.fillRect(0, 0, W, H);
        const reveal = Math.round(smooth((e - cfg.poolAtMs) / cfg.poolRevealMs) * 4) / 4;
        this.drawPool(cfg, opts.poolR == null ? this.wellPoolR(cfg, e) : opts.poolR, opts.poolR == null ? reveal : 1);
        if (!opts.noShaft) this.drawShaft(cfg, e);
        this.drawMouth(snap, cfg, e, opts.mouthAlpha == null ? 1 : opts.mouthAlpha);
    }

    // ---- the whole frame -----------------------------------------------------------------------------------------------
    /** One frame of the cinematic phase. scene: { T, t, snap, hero }. */
    renderCine(scene) {
        const { T, t } = scene;
        if (T.mode === 'full') this.renderFull(scene);
        else this.renderShort(scene);
        if (T.mode !== 'full' || t >= T.starts[5]) return;
        this.withSceneClip(ctx => this.fullHeroLayer(ctx, scene));
    }

    renderFull({ T, t, snap }) {
        const s = T.starts;
        if (t < s[1]) this.drawBattlefield(snap, t);
        else if (t < s[2]) this.drawFall(T, snap, t - s[1], t);
        else if (t < s[5]) this.drawAbyss(T, t);
        else if (t < s[6]) this.drawRewind(T, snap, t - s[5], t);
        else this.drawWell(T, snap, t - s[6]);
        this.blit(this.camFull(T, t));
        if (t >= s[5] && t < s[6]) this.withSceneClip(ctx => drawCoreMoving(ctx, this.proj, this.rewindCore(T, this.coreAtAbyss(T, s[5] - 1) || chestOf(SHOTS.hero.feet)), t - s[5]));
        if (t >= s[6]) this.withSceneClip(ctx => drawCoreMoving(ctx, this.proj, this.wellCore(T.well), t - s[6]));
    }

    fullHeroLayer(ctx, { T, t, hero }) {
        const s4 = T.starts[4], feet = SHOTS.hero.feet, sc = SHOTS.scatter;
        if (hero && t < T.starts[2]) ctx.filter = this.battlefieldFilter(smooth(t / SHOTS.battlefield.fadeMs));
        if (hero && t < s4) { drawHero(ctx, this.proj, hero, idleFrame(hero.sheet, animMs(T, t)), feet); return; }
        if (hero && t >= s4) {
            const frame = idleFrame(hero.sheet, animMs(T, s4));
            drawDissolve(ctx, this.proj, hero, { frame, feet, mode: 'out' }, clamp01((t - s4) / sc.dissolveMs));
            drawMotesOut(ctx, this.proj, hero, { frame, feet }, { start: s4, dur: sc.dissolveMs, now: t, life: sc.moteLifeMs });
        }
        const core = t >= s4 ? this.coreAtAbyss(T, t) : null;
        if (core) drawCore(ctx, this.proj, core, core.a, t);
    }

    renderShort({ T, t, snap, hero }) {
        const s = T.starts, cfg = T.cfg, feet = SHOTS.hero.feet;
        if (t < s[1]) this.backdropAt(T, t, { wave: 1.9 * easeOutCubic(t / cfg.waveMs), ringLight: smooth(t / 400) });
        else if (t < s[2]) this.drawRewind(T, snap, t - s[1], t);
        else this.drawWell(T, snap, t - s[2]);
        this.blit({ z: 1, anchor: SHOTS.voice.anchor });
        this.withSceneClip(ctx => {
            if (t < s[1] && hero) {
                drawDissolve(ctx, this.proj, hero, { frame: 0, feet, mode: 'out' }, clamp01(t / cfg.dissolveMs));
                drawMotesOut(ctx, this.proj, hero, { frame: 0, feet }, { start: 0, dur: cfg.dissolveMs, now: t, life: cfg.moteLifeMs });
            }
            if (t < s[1] && t > cfg.dissolveMs * 0.5) drawCore(ctx, this.proj, chestOf(feet), clamp01((t - cfg.dissolveMs * 0.5) / 120), t);
            else if (t >= s[1] && t < s[2]) drawCoreMoving(ctx, this.proj, this.rewindCore(T, chestOf(feet)), t - s[1]);
            else if (t >= s[2]) drawCoreMoving(ctx, this.proj, this.wellCore(T.well), t - s[2]);
        });
    }

    /** Steps 7 and 8: backdrop B lit and turning, dimmed under the window. */
    renderPanels(idle) {
        this.backdrop.draw(this.w, { time: idle / 1000, wave: 1.9, ang: 0.6 * idle / 1000, dim: SHOTS.panelDim, lean: 0, front: 0, ringLight: 1 });
        this.blit({ z: 1, anchor: SHOTS.voice.anchor });
    }

    /** Step 9: B gives way to the well, the core drops, the chosen hero forms while the pool widens to the whole scene. */
    renderGraft(T, snap, gt, hero) {
        const g = SHOTS.graft, Tg = graftTimes(), cfg = T.well, feet = cfg.heroFeet, chest = chestOf(feet);
        const open = smooth((gt - Tg.form) / g.poolOpenMs), poolR = lerp(cfg.poolR1, 1000, open);
        this.drawWell(T, snap, cfg.ms + 2000, { poolR, noShaft: true, mouthAlpha: Math.round((1 - open) * 4) / 4 });
        const fade = 1 - smooth(gt / g.fadeMs);
        if (fade > 0.01) {
            this.w.globalAlpha = fade;
            this.backdrop.draw(this.w, { time: gt / 1000, wave: 1.9, ang: 0, dim: SHOTS.panelDim, lean: 0, front: 0, ringLight: 1 });
            this.w.globalAlpha = 1;
        }
        this.blit({ z: 1, anchor: SHOTS.voice.anchor });
        this.withSceneClip(ctx => this.graftHeroLayer(ctx, { gt, Tg, feet, chest, hero, cfg }));
    }

    graftHeroLayer(ctx, { gt, Tg, feet, chest, hero, cfg }) {
        const g = SHOTS.graft;
        if (hero && gt >= Tg.form && gt < Tg.formed) {
            drawDissolve(ctx, this.proj, hero, { frame: 0, feet, mode: 'in' }, clamp01((gt - Tg.form) / g.formMs));
            drawMotesIn(ctx, this.proj, hero, { feet, core: chest }, { start: Tg.form, dur: g.formMs, now: gt, moteMs: g.moteMs });
        } else if (hero && gt >= Tg.formed) drawHero(ctx, this.proj, hero, idleFrame(hero.sheet, gt - Tg.formed), feet);
        const coreAt = ms => (ms < Tg.form
            ? { x: cfg.hover.x, y: lerp(cfg.hover.y, chest.y, easeIn((ms - Tg.drop) / g.dropMs)), a: 1 }
            : { x: chest.x, y: chest.y, a: hero ? 1 - smooth((ms - Tg.form - g.formMs * 0.6) / (g.formMs * 0.4)) : 1 - smooth((ms - Tg.form) / g.formMs) });
        if (coreAt(gt).a > 0) drawCoreMoving(ctx, this.proj, coreAt, gt);
    }

    /** Lets the screen canvas and the greyed picture go when the scene ends. */
    release() {
        this.grey = null;
        this.screen = null;
        this.s = null;
    }
}
