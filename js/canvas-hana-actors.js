/** Hana +6 player and summon sprites (data/hana-sprites.js).
 * One sprite pixel is one battle dot = tile/16 CSS px, the same grid the remade skill effects use.
 * Frames are drawn nearest-neighbour and snapped to device pixels. The attack clip is timed so its
 * authored hit frame lands on the swing's impactAt. Rendering only: it never changes combat state.
 */
const hanaActors = (() => {
    const ROW = { south: 0, west: 1, east: 2, north: 3 };
    const DOTS_PER_TILE = 16;
    const HURT_MS = 420;
    const FLASH_MS = 45;
    const FLASH_ALPHA = 0.45;
    const FLASH_COLOUR = '#ffe2dc';
    const images = new Map();
    const flashes = new Map();
    const masks = new Map();
    let body = null;

    function data() { return typeof HANA_SPRITES === 'object' && HANA_SPRITES ? HANA_SPRITES : null; }
    function classDef(classId) {
        const sprites = data();
        return sprites && sprites.classes ? sprites.classes[classId] || null : null;
    }
    function image(path) {
        let img = images.get(path);
        if (!img) {
            img = new Image();
            img.decoding = 'async';
            img.src = path;
            images.set(path, img);
        }
        return img;
    }
    function loaded(img) { return !!img && img.complete && img.naturalWidth > 0; }
    function sheet(classId, motion) { return image(`assets/playable/hana/${classId}/${motion}.png`); }
    function preload(classId) {
        const def = classDef(classId);
        if (def) Object.keys(def.motions).forEach(motion => sheet(classId, motion));
    }
    /** All motion sheets of the class are decoded, so a pose never falls back mid-fight. */
    function isReady(classId) {
        const def = classDef(classId);
        if (!def) return false;
        preload(classId);
        return Object.keys(def.motions).every(motion => loaded(sheet(classId, motion)));
    }
    function dotSize(tile) { return Math.max(1, (Number(tile) || 48) / DOTS_PER_TILE); }

    /** One-colour silhouette of a sheet: white for the first frames of a hit (a multiply tint vanishes on dark
     * sprites), crimson for 흡혈 타격's drain pulse. Cached per sheet and colour. */
    function silhouette(img, colour = '#ffffff') {
        const key = `${img.src}|${colour}`;
        let canvas = flashes.get(key);
        if (canvas) return canvas;
        canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const c = canvas.getContext('2d');
        c.drawImage(img, 0, 0);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = colour;
        c.fillRect(0, 0, canvas.width, canvas.height);
        flashes.set(key, canvas);
        return canvas;
    }
    const DRAIN_TINT = '#ba3e5f';

    /** Opaque pixels of a sheet (alpha ≥ 50%), read once per sheet. */
    function alphaMask(img) {
        let mask = masks.get(img.src);
        if (mask) return mask;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const c = canvas.getContext('2d', { willReadFrequently: true });
        c.drawImage(img, 0, 0);
        const rgba = c.getImageData(0, 0, canvas.width, canvas.height).data, bits = new Uint8Array(canvas.width * canvas.height);
        for (let i = 0; i < bits.length; i++) bits[i] = rgba[i * 4 + 3] >= 128 ? 1 : 0;
        mask = { width: canvas.width, bits };
        masks.set(img.src, mask);
        return mask;
    }
    /**
     * The player sprite as drawn at `now` (null when it was not drawn this frame): the facing row shown, the frame
     * (image, src rect, CSS dest with its dot size) and covers(x, y), true where an opaque sprite pixel sits at that
     * CSS point. Effects use it to pass behind the body.
     * @returns {?{dir:string, image:HTMLImageElement, src:object, dest:object, covers:function(number, number):boolean}}
     */
    function drawnBody(now) {
        if (!body || body.now !== now) return null;
        const { img, src, dest, dir } = body;
        let mask = null;
        return { dir, image: img, src, dest, covers(x, y) {
            const sx = Math.floor((x - dest.x) / dest.dot), sy = Math.floor((y - dest.y) / dest.dot);
            if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) return false;
            mask = mask || alphaMask(img);
            return mask.bits[(src.y + sy) * mask.width + src.x + sx] === 1;
        } };
    }

    function sum(list, from = 0, to = list.length) {
        let total = 0;
        for (let i = from; i < to; i++) total += list[i];
        return total;
    }
    function frameAt(ms, elapsed, loop) {
        const total = sum(ms);
        let t = loop ? ((elapsed % total) + total) % total : Math.max(0, Math.min(total - 0.001, elapsed));
        for (let i = 0; i < ms.length; i++) {
            if (t < ms[i]) return i;
            t -= ms[i];
        }
        return ms.length - 1;
    }

    /**
     * Attack clip for one swing. Frames before the authored hit frame are compressed into the combat
     * windup (start → impactAt); the recoil after the hit plays at a gentler speed. Channels hold the hit.
     * @returns {?{frame:number, end:number}}
     */
    function attackPose(clip, swing, now) {
        const hit = Math.max(1, Math.min(clip.frames - 1, clip.hitFrame || 1));
        const pre = sum(clip.ms, 0, hit), post = sum(clip.ms, hit);
        const windup = Math.max(1, swing.impactAt - swing.start);
        const speed = windup / pre, recover = Math.max(0.55, Math.min(1, speed));
        const hold = Math.max(0, (swing.channelUntil || 0) - (swing.start + windup));
        const elapsed = now - swing.start, end = swing.start + windup + hold + post * recover;
        if (elapsed < 0 || now >= end) return null;
        if (elapsed >= windup && elapsed < windup + hold) return { frame: hit, end };
        const local = elapsed < windup ? elapsed / speed : pre + (elapsed - windup - hold) / recover;
        return { frame: frameAt(clip.ms, local, false), end };
    }

    function downPose(def, state) {
        if (!Number.isFinite(state.downProgress)) return null;
        const frames = def.motions.hurt.frames;
        return { motion: 'hurt', frame: Math.min(frames - 1, Math.floor(state.downProgress * frames)), dir: state.facing };
    }
    function swingPose(def, state, now) {
        if (!state.attack || state.moving) return null;
        const pose = attackPose(def.motions.attack, state.attack, now);
        return pose ? { motion: 'attack', frame: pose.frame, dir: state.attack.direction || state.facing } : null;
    }
    function movePose(def, state, now) {
        if (!state.moving) return null;
        const motion = state.running ? 'run' : 'walk';
        const rate = Math.max(0.6, Math.min(2.2, Number(state.moveRate) || 1));
        return { motion, frame: frameAt(def.motions[motion].ms, now * rate, true), dir: state.moveDirection || state.facing };
    }
    function hurtPose(def, state, now) {
        const age = now - state.hurtAt;
        if (!(age >= 0 && age < HURT_MS)) return null;
        return { motion: 'hurt', frame: frameAt(def.motions.hurt.ms, age, false), dir: state.facing, flash: !!state.hurtHeavy && age < FLASH_MS };
    }
    function pickPose(def, state, now) {
        return downPose(def, state) || swingPose(def, state, now) || movePose(def, state, now)
            || hurtPose(def, state, now) || { motion: 'idle', frame: frameAt(def.motions.idle.ms, now, true), dir: state.facing };
    }

    /** Device-pixel snapped blit. The current transform may include camera shake or a mirror. */
    function blit(ctx, img, src, dest) {
        const m = ctx.getTransform();
        const devLeft = Math.round(m.a * dest.x + m.e), devTop = Math.round(m.d * dest.y + m.f);
        ctx.drawImage(img, src.x, src.y, src.w, src.h, (devLeft - m.e) / m.a, (devTop - m.f) / m.d, src.w * dest.dot, src.h * dest.dot);
    }

    function drawDotShadow(ctx, foot, dot, alpha) {
        const rows = [[-4, 4], [-5, 5], [-4, 4]];
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#000';
        rows.forEach(([a, b], i) => ctx.fillRect(Math.round(foot.x + a * dot), Math.round(foot.y - dot + i * dot), Math.round((b - a) * dot), Math.ceil(dot)));
        ctx.restore();
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x feet x (CSS px)
     * @param {number} y feet y (CSS px)
     * @param {{classId:string, tile:number, facing:string, moving?:boolean, running?:boolean, moveRate?:number,
     *   moveDirection?:string, attack?:?object, hurtAt?:?number, hurtHeavy?:boolean, downProgress?:?number, alpha?:number,
     *   tint?:number}} state
     * @param {number} now visual clock
     * @returns {boolean} false when the sheets are not ready (caller falls back to the legacy sprite)
     */
    function drawPlayer(ctx, x, y, state, now) {
        const def = classDef(state.classId);
        if (!def) return false;
        const pose = pickPose(def, state, now), img = sheet(state.classId, pose.motion);
        if (!loaded(img)) return false;
        const sprites = data(), cw = sprites.cell.w, ch = sprites.cell.h, dot = dotSize(state.tile);
        const alpha = Math.max(0, Math.min(1, state.alpha ?? 1));
        const sink = Number.isFinite(state.downProgress) ? state.downProgress * dot * 2 : 0;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        drawDotShadow(ctx, { x, y }, dot, 0.26 * alpha);
        ctx.globalAlpha = alpha;
        const src = { x: pose.frame * cw, y: (ROW[pose.dir] ?? ROW.east) * ch, w: cw, h: ch };
        const dest = { x: x - (cw / 2) * dot, y: y - (sprites.feetY + 1) * dot + sink, dot };
        blit(ctx, img, src, dest);
        body = { img, src, dest, dir: pose.dir, now };
        if (pose.flash) { ctx.globalAlpha = alpha * FLASH_ALPHA; blit(ctx, silhouette(img, FLASH_COLOUR), src, dest); }
        if (state.tint > 0) { ctx.globalAlpha = alpha * Math.min(1, state.tint); blit(ctx, silhouette(img, DRAIN_TINT), src, dest); }
        ctx.restore();
        return true;
    }

    // ------------------------------------------------------------------ summons
    const SUMMON_SLUGS = {
        '서리늑대 소환': 'frost-wolf', '불곰 소환': 'fire-bear', '벼락멧돼지 소환': 'thunder-boar',
        '칼날까마귀 소환': 'blade-raven', '공허 유충 소환': 'void-larva', '벌떼 소환': 'swarm',
        '폭풍 정령 소환': 'storm-spirit', '철갑 거북 소환': 'armored-turtle'
    };
    const SUMMON_TIMING = { idle: [180, 180, 180, 180], attack: [90, 70, 110, 110], strike: 2 };
    function summonStyle() {
        const style = typeof game === 'object' && game && game.settings ? game.settings.summonArtStyle : null;
        const summons = (data() || {}).summons || {};
        return summons[style] ? style : 'glow';
    }
    function summonSlug(skillName) { return SUMMON_SLUGS[skillName] || null; }
    function summonPose(summon) {
        const lead = sum(SUMMON_TIMING.attack, 0, SUMMON_TIMING.strike);
        const t = summon.now - (summon.attackAt - lead);
        if (t >= 0 && t < sum(SUMMON_TIMING.attack)) return { motion: 'attack', frame: frameAt(SUMMON_TIMING.attack, t, false) };
        return { motion: 'idle', frame: frameAt(SUMMON_TIMING.idle, summon.now + (summon.phase || 0), true) };
    }
    function summonSpec(slug) {
        const style = summonStyle(), summons = (data() || {}).summons || {};
        const spec = summons[style] && summons[style][slug];
        return spec ? { style, spec } : null;
    }

    /**
     * Draws a summon standing on (summon.x, summon.y); summon.attackAt is the visual time of its current strike
     * (the third attack frame lands on it). Style: settings.summonArtStyle (glow · dark · simple · cute).
     * @param {CanvasRenderingContext2D} ctx
     * @param {{skillName:string,x:number,y:number,now:number,tile?:number,attackAt?:number,flipX?:boolean,alpha?:number,phase?:number}} summon
     * @returns {?{top:number}} top edge of the drawn sprite, or null when this summon has no loaded Hana sheet
     */
    function drawSummon(ctx, summon) {
        const slug = summonSlug(summon.skillName), found = slug && summonSpec(slug);
        if (!found) return null;
        const pose = summonPose(summon), img = image(`assets/summon/hana/${found.style}/${slug}_${pose.motion}.png`);
        if (!loaded(img)) return null;
        const box = found.spec[pose.motion], dot = dotSize(summon.tile), top = summon.y - box.h * dot;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = Math.max(0, Math.min(1, summon.alpha ?? 1));
        drawDotShadow(ctx, summon, dot * 0.8, 0.22 * ctx.globalAlpha);
        if (summon.flipX) { ctx.translate(summon.x * 2, 0); ctx.scale(-1, 1); }
        blit(ctx, img, { x: pose.frame * box.w, y: 0, w: box.w, h: box.h }, { x: summon.x - (box.w / 2) * dot, y: top, dot });
        ctx.restore();
        return { top };
    }

    return { drawPlayer, drawSummon, drawnBody, preload, isReady, summonSlug, attackPose, frameAt };
})();
safeExposeGlobals({ hanaActors });
