/** Hana +6 player sprites (data/hana-sprites.js, data/hana-weapon-combos.js) and the wisp summons (data/wisp-summons.js).
 * One sprite pixel is one battle dot = tile/16 CSS px, the same grid the remade skill effects use.
 * Frames are drawn nearest-neighbour and snapped to device pixels. The attack clip is timed so its
 * authored hit frame lands on the swing's impactAt. The class holds the weapon that fits the skill in use
 * (6 classes × 6 weapons, layered so a gem's own art can take the prop out of the hand).
 * Rendering only: it never changes combat state.
 */
const hanaActors = (() => {
    const ROW = { south: 0, west: 1, east: 2, north: 3 };
    // Class × weapon sheets keep one side row and mirror it for west.
    const COMBO_DIR = { south: ['down', false], north: ['up', false], east: ['side', false], west: ['side', true] };
    const WEAPON_LAYERS = [0, 1, 2];     // weapon behind · body · weapon in front
    const BARE_LAYERS = [3, 1, 4];       // hands without the weapon · body · hands
    const DOTS_PER_TILE = 16;
    const HURT_MS = 420;
    const FLASH_MS = 45;
    const FLASH_ALPHA = 0.45;
    const FLASH_COLOUR = '#ffe2dc';
    const DRAIN_TINT = '#ba3e5f';
    const images = new Map();
    const flashes = new Map();
    const masks = new Map();
    const comboDefs = new Map();
    let body = null;

    function data() { return typeof HANA_SPRITES === 'object' && HANA_SPRITES ? HANA_SPRITES : null; }
    function combos() { return typeof HANA_WEAPON_COMBOS === 'object' && HANA_WEAPON_COMBOS ? HANA_WEAPON_COMBOS : null; }
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
    function comboSheet(classId, weapon) { return image(`assets/playable/hana/combos/${classId}/${weapon}.png`); }
    function preload(classId) {
        const def = classDef(classId), table = combos();
        if (def) Object.keys(def.motions).forEach(motion => sheet(classId, motion));
        if (table && table.classWeapons[classId]) Object.keys(table.weapons).forEach(weapon => comboSheet(classId, weapon));
    }
    /** All motion sheets of the class are decoded, so a pose never falls back mid-fight. */
    function isReady(classId) {
        const def = classDef(classId);
        if (!def) return false;
        preload(classId);
        return Object.keys(def.motions).every(motion => loaded(sheet(classId, motion)));
    }
    function dotSize(tile) { return Math.max(1, (Number(tile) || 48) / DOTS_PER_TILE); }

    /** One-colour silhouette of a sheet: a soft light for the first frames of a heavy hit (a multiply tint vanishes
     * on dark sprites), crimson for 흡혈 타격's drain pulse. Cached per sheet and colour. */
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

    // ------------------------------------------------------------------ which weapon is in hand
    // Equipped weapon base → the Hana weapon drawn (the kit has six). First match wins: two-handers and polearms
    // before one-handed blades ("executioner_blade" is a greatsword), bows and launchers before everything.
    // Casting weapons (wands, rods, sceptres, staves) show the class's own casting prop — orb, censer or flask.
    const WEAPON_FAMILIES = [
        { weapon: 'shortbow', terms: ['bow', 'recurve', 'volley', 'launcher', 'ballista', 'railgun', 'repeater', '활', '궁', '발사', '발리스타', '레일건', '연사'] },
        { weapon: 'caster', terms: ['wand', 'rod', 'scepter', 'focus', 'staff', '완드', '봉', '홀', '로드', '지팡이', '초점'] },
        { weapon: 'greatsword', terms: ['greatblade', 'doomcleaver', 'executioner', 'spear', 'pike', 'lance', 'glaive', '대검', '창', '글레이브'] },
        { weapon: 'scimitar', terms: ['blade', 'fang', 'axe', '검', '송곳', '도끼'] }
    ];
    const CASTING_PROPS = ['orb', 'censer', 'flask'];
    /** The base an equipped weapon was made from (uniques name theirs in UNIQUE_EQUIPMENT_RULES). */
    function weaponBaseLabel(item) {
        const rule = typeof UNIQUE_EQUIPMENT_RULES === 'object' && item.name ? UNIQUE_EQUIPMENT_RULES[item.name] : null;
        return `${item.baseId || (rule && rule.baseId) || ''} ${item.baseName || ''}`.toLowerCase();
    }
    function weaponFamily(item) {
        if (!item) return null;
        const label = weaponBaseLabel(item);
        const found = WEAPON_FAMILIES.find(row => row.terms.some(term => label.includes(term)));
        return found ? found.weapon : null;
    }
    /**
     * The weapon a class holds (a weapon slug of data/hana-weapon-combos.js), from the weapon it has equipped:
     * blades and axes → scimitar, greatswords and polearms → greatsword, bows and launchers → shortbow, casting
     * weapons → the class's casting prop (orb · censer · flask, orb for the others). Unarmed or unknown: the class
     * weapon. mode 'class': always the class weapon; a weapon slug: always that weapon (test panel).
     * @param {string} classId
     * @param {?object} item the equipped '무기' item
     * @param {string} [mode='auto']
     * @returns {?string}
     */
    function weaponFor(classId, item, mode = 'auto') {
        const table = combos(), own = table && table.classWeapons[classId];
        if (!own) return null;
        if (table.weapons[mode]) return mode;
        if (mode === 'class') return own;
        const family = weaponFamily(item);
        if (family === 'caster') return CASTING_PROPS.includes(own) ? own : 'orb';
        return family || own;
    }
    /** Clip timing of one class × weapon sheet, in the per-class clip shape (walking plays the run cycle). */
    function comboDef(classId, weapon) {
        const key = `${classId}|${weapon}`;
        if (comboDefs.has(key)) return comboDefs.get(key);
        const table = combos(), spec = table && table.combos[key];
        const clip = motion => ({ frames: spec[motion].ms.length, ms: spec[motion].ms });
        const def = spec ? { spec, weapon, motions: { idle: clip('idle'), walk: clip('run'), run: clip('run'), hurt: clip('hurt'),
            attack: { ...clip('attack'), hitFrame: table.weapons[weapon].hitFrame } } } : null;
        comboDefs.set(key, def);
        return def;
    }

    // ------------------------------------------------------------------ what was drawn (effects read it)
    /**
     * The player sprite as drawn at `now` (null when it was not drawn this frame): the facing shown, the frame
     * (image, the layer src rects, CSS dest with its dot size, mirrored or not) and covers(x, y), true where an
     * opaque sprite pixel sits at that CSS point. Effects use it to pass behind the body.
     * @returns {?{dir:string, image:HTMLImageElement, srcs:object[], dest:object, flip:boolean, footX:number,
     *   covers:function(number, number):boolean}}
     */
    function drawnBody(now) {
        if (!body || body.now !== now) return null;
        const { img, srcs, dest, dir, flip, footX } = body;
        let mask = null;
        return { dir, image: img, srcs, dest, flip, footX, covers(x, y) {
            const lx = flip ? 2 * footX - x : x;
            const sx = Math.floor((lx - dest.x) / dest.dot), sy = Math.floor((y - dest.y) / dest.dot);
            if (sx < 0 || sy < 0 || sx >= srcs[0].w || sy >= srcs[0].h) return false;
            mask = mask || alphaMask(img);
            return srcs.some(src => mask.bits[(src.y + sy) * mask.width + src.x + sx] === 1);
        } };
    }
    /** The hand of the sprite drawn within the last 100ms of visual time, in board px (48 per cell): the censer of
     * 신성한 안개·파문심판 hangs from it instead of a fixed spot in the cell. */
    function handBoard(now) {
        const at = Number.isFinite(now) ? now : (typeof battleVisualState === 'object' ? battleVisualState.visualNow : NaN);
        return body && body.handBoard && at - body.now >= 0 && at - body.now <= 100 ? body.handBoard : null;
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

    // ------------------------------------------------------------------ sheet frames
    /** Per-class sheet (kit composite, class weapon baked in): 79×79 cells, rows south · west · east · north. */
    function classFrame(state, pose) {
        const sprites = data(), cw = sprites.cell.w, ch = sprites.cell.h;
        return { img: sheet(state.classId, pose.motion), flip: false, x0: 0, y0: 0, centerX: cw / 2, feetY: sprites.feetY, hand: null,
            srcs: [{ x: pose.frame * cw, y: (ROW[pose.dir] ?? ROW.east) * ch, w: cw, h: ch }] };
    }
    /** Class × weapon sheet: a crop of the 79×79 cell; columns = layer × 10 frames, rows = motion × (side · down · up).
     * A thrown flask leaves the hand from the release frame; hideWeapon leaves both hands empty. */
    function comboFrame(state, combo, pose) {
        const table = combos(), [x0, y0, cw, ch] = table.crop, [dir, flip] = COMBO_DIR[pose.dir] || COMBO_DIR.east;
        const motion = pose.motion === 'walk' ? 'run' : pose.motion, row = table.motions.indexOf(motion) * table.dirs.length + table.dirs.indexOf(dir);
        const thrown = state.throwsWeapon && pose.motion === 'attack' && pose.frame >= combo.motions.attack.hitFrame;
        const layers = state.hideWeapon || thrown ? BARE_LAYERS : WEAPON_LAYERS;
        const hand = combo.spec[motion].hand?.[dir]?.[pose.frame] || null;
        return { img: comboSheet(state.classId, combo.weapon), flip, x0, y0, centerX: table.centerX, feetY: table.feetY, hand,
            srcs: layers.map(li => ({ x: (li * table.maxFrames + pose.frame) * cw, y: row * ch, w: cw, h: ch })) };
    }
    /** The class × weapon sheet for the weapon in hand once it has loaded; the class sheet until then. */
    function figureSource(state) {
        const combo = state.weapon ? comboDef(state.classId, state.weapon) : null;
        if (combo && loaded(comboSheet(state.classId, state.weapon))) return { def: combo, frame: pose => comboFrame(state, combo, pose) };
        const def = classDef(state.classId);
        return def ? { def, frame: pose => classFrame(state, pose) } : null;
    }

    /** Device-pixel snapped blit. The current transform may include camera shake or a mirror. */
    function blit(ctx, img, src, dest) {
        const m = ctx.getTransform();
        const devLeft = Math.round(m.a * dest.x + m.e), devTop = Math.round(m.d * dest.y + m.f);
        ctx.drawImage(img, src.x, src.y, src.w, src.h, (devLeft - m.e) / m.a, (devTop - m.f) / m.d, src.w * dest.dot, src.h * dest.dot);
    }
    function overlay(ctx, frame, dest, strength, colour) {
        if (!(strength > 0)) return;
        ctx.globalAlpha = strength;
        frame.srcs.forEach(src => blit(ctx, silhouette(frame.img, colour), src, dest));
    }
    /** A one-dot rim round the figure (data BATTLE_SPRITE_OUTLINES.hero): the silhouette stamped a dot off in four directions,
     * drawn before the body so only the edge shows. */
    function rim(ctx, frame, dest, alpha) {
        const style = BATTLE_SPRITE_OUTLINES.hero, sheet = silhouette(frame.img, style.color);
        ctx.globalAlpha = alpha * style.alpha;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const shifted = { ...dest, x: dest.x + dx * dest.dot, y: dest.y + dy * dest.dot };
            frame.srcs.forEach(src => blit(ctx, sheet, src, shifted));
        }
    }
    function drawDotShadow(ctx, foot, dot, alpha) {
        const rows = [[-4, 4], [-5, 5], [-4, 4]];
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#000';
        rows.forEach(([a, b], i) => ctx.fillRect(Math.round(foot.x + a * dot), Math.round(foot.y - dot + i * dot), Math.round((b - a) * dot), Math.ceil(dot)));
        ctx.restore();
    }
    /** Board px of this frame's hand (a pixel of the 79×79 cell, mirrored with the sprite). */
    function handOnBoard(frame, foot, dest, projection) {
        if (!frame.hand || !projection || typeof projection.cellToScreen !== 'function') return null;
        const ex = frame.flip ? 79 - (frame.hand[0] + 1) : frame.hand[0] + 1;
        const x = foot.x + (ex - frame.centerX) * dest.dot, y = dest.y + (frame.hand[1] + 1 - frame.y0) * dest.dot;
        const origin = projection.cellToScreen(0, 0), s = projection.tileW / 48;
        return { x: (x - origin.x) / s + 24, y: (y - origin.y) / s + 24 };
    }
    /** Dots from the feet to the top of the head in the idle pose (sheet bounds) — steady while attacks swing a weapon up. */
    function headroom(classId) {
        const sprites = data(), idle = sprites && sprites.classes[classId] && sprites.classes[classId].motions.idle;
        return idle && idle.bounds ? sprites.feetY + 1 - idle.bounds[1] : 25;
    }
    function remember(frame, dest, pose, context) {
        body = { img: frame.img, srcs: frame.srcs, dest, dir: pose.dir, flip: frame.flip, footX: context.foot.x, now: context.now,
            headY: context.foot.y - headroom(context.classId) * dest.dot, handBoard: handOnBoard(frame, context.foot, dest, context.projection) };
    }
    /** CSS y of the top of the head drawn this frame (overhead bars sit above it), or null when no Hana body was drawn. */
    function headY(now) { return body && body.now === now ? body.headY : null; }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x feet x (CSS px)
     * @param {number} y feet y (CSS px)
     * @param {{classId:string, tile:number, facing:string, weapon?:?string, hideWeapon?:boolean, throwsWeapon?:boolean,
     *   projection?:object, moving?:boolean, running?:boolean, moveRate?:number, moveDirection?:string, attack?:?object,
     *   hurtAt?:?number, hurtHeavy?:boolean, downProgress?:?number, alpha?:number, tint?:number}} state
     * @param {number} now visual clock
     * @returns {boolean} false when the sheets are not ready (caller falls back to the legacy sprite)
     */
    function drawPlayer(ctx, x, y, state, now) {
        const source = figureSource(state);
        if (!source) return false;
        const pose = pickPose(source.def, state, now), frame = source.frame(pose);
        if (!loaded(frame.img)) return false;
        const dot = dotSize(state.tile), alpha = Math.max(0, Math.min(1, state.alpha ?? 1));
        const sink = Number.isFinite(state.downProgress) ? state.downProgress * dot * 2 : 0;
        const dest = { x: x - (frame.centerX - frame.x0) * dot, y: y - (frame.feetY + 1 - frame.y0) * dot + sink, dot };
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        drawDotShadow(ctx, { x, y }, dot, 0.26 * alpha);
        if (frame.flip) { ctx.translate(x * 2, 0); ctx.scale(-1, 1); }
        rim(ctx, frame, dest, alpha);
        ctx.globalAlpha = alpha;
        frame.srcs.forEach(src => blit(ctx, frame.img, src, dest));
        remember(frame, dest, pose, { foot: { x, y }, now, projection: state.projection, classId: state.classId });
        overlay(ctx, frame, dest, pose.flash ? alpha * FLASH_ALPHA : 0, FLASH_COLOUR);
        overlay(ctx, frame, dest, state.tint > 0 ? alpha * Math.min(1, state.tint) : 0, DRAIN_TINT);
        ctx.restore();
        return true;
    }

    // ------------------------------------------------------------------ summons: 위습 정령 6종 (data/wisp-summons.js)
    const WISP = WISP_SUMMON_SHEET;
    function summonSlug(skillName) { return (WISP_SUMMONS[skillName] && WISP_SUMMONS[skillName].slug) || null; }
    function summonPose(summon) {
        const lead = sum(WISP.attackMs, 0, WISP.strike);
        const t = summon.now - (summon.attackAt - lead);
        if (t >= 0 && t < sum(WISP.attackMs)) return { motion: 'attack', frame: frameAt(WISP.attackMs, t, false) };
        return { motion: 'idle', frame: frameAt(WISP.idleMs, summon.now + (summon.phase || 0), true) };
    }

    /**
     * Draws a wisp summon on (summon.x, summon.y): the 16×16 block's bottom edge on the feet line, like the handoff.
     * summon.attackAt is the visual time of its current strike (the second attack frame lands on it). Both sheets start
     * loading with the first draw; until the attack sheet is decoded the idle loop stands in.
     * @param {CanvasRenderingContext2D} ctx
     * @param {{skillName:string,x:number,y:number,now:number,tile?:number,attackAt?:number,flipX?:boolean,alpha?:number,phase?:number}} summon
     * @returns {?{top:number}} top edge of the drawn body, or null when this summon is not a wisp or its sheet is not loaded
     */
    function drawSummon(ctx, summon) {
        const slug = summonSlug(summon.skillName);
        if (!slug) return null;
        const sheets = { idle: image(`${WISP.path}${slug}_idle.png`), attack: image(`${WISP.path}${slug}_attack.png`) };
        const wanted = summonPose(summon), pose = loaded(sheets[wanted.motion]) ? wanted : { motion: 'idle', frame: 0 };
        const img = sheets[pose.motion];
        if (!loaded(img)) return null;
        const size = WISP.size, dot = dotSize(summon.tile), blockTop = summon.y - size * dot;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = Math.max(0, Math.min(1, summon.alpha ?? 1));
        drawDotShadow(ctx, summon, dot * 0.8, 0.22 * ctx.globalAlpha);
        if (summon.flipX) { ctx.translate(summon.x * 2, 0); ctx.scale(-1, 1); }
        blit(ctx, img, { x: pose.frame * size, y: 0, w: size, h: size }, { x: summon.x - (size / 2) * dot, y: blockTop, dot });
        ctx.restore();
        return { top: blockTop + opaqueTop(loaded(sheets.idle) ? sheets.idle : img) * dot };
    }
    const tops = new Map();
    /** First opaque row of a wisp sheet: the 16×16 blocks keep the body low, so the life bar sits on the body, not
     * on the empty top of the block (where it read as the life bar of the enemy standing behind). */
    function opaqueTop(img) {
        if (tops.has(img.src)) return tops.get(img.src);
        const mask = alphaMask(img), width = mask.width, height = mask.bits.length / width;
        const first = mask.bits.indexOf(1), top = first < 0 ? 0 : Math.floor(first / width);
        tops.set(img.src, Math.min(top, height));
        return tops.get(img.src);
    }

    return { drawPlayer, drawSummon, drawnBody, handBoard, headY, weaponFor, comboDef, preload, isReady, summonSlug, attackPose, frameAt };
})();
safeExposeGlobals({ hanaActors });
