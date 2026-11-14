/** 옆에서 보는 무대의 주인공 (data/stage-characters.js, data/stage-view.js; 2026-10-20 사용자가 모션 공방으로 만든 6직업 × 7무기 모션).
 * 동작마다 가로 한 줄 시트(칸 w × h, 칸 안의 발 기준점 ax, ay, 오른쪽을 보는 그림)를 쓰고 왼쪽은 좌우로 뒤집는다. 위아래(깊이)로 움직일 때는
 * 마지막에 보던 좌우를 그대로 본다. 공격 그림은 타격 프레임이 실제 타격 순간(swing.impactAt)에 오도록 준비 구간을 줄여 맞춘다
 * (attackPose). 피격은 그림 없이 붉은 외곽선과 밀림이다(규격의 hit).
 * 그림은 지금 쓰는 직업 × 무기 묶음만 들고 있는다. 그리기만 하고 전투 상태는 바꾸지 않는다.
 */
import { scaleForStageArt } from '../common/stage-art-scale.mjs';

class StageActors {
    constructor(deps) {
        this.deps = deps;
        this.DEATH = 'unarmed/death.png';
        this.FALLBACK_HEADROOM = 110;
        this.SILHOUETTE_LIMIT = 48;
        this.images = new Map();
        this.lists = new WeakMap();
        this.silhouettes = new Map();
        this.headrooms = new Map();
        this.kept = '';
        this.body = null;
        this.facingLeft = false;
        this.POSE_TRAIL_MS = 600;
        this.poseTrail = [];
        this.chain = { start: -1, index: -1 };
        this.hits = { at: -Infinity, chained: false };
        this.table = () => (typeof this.deps.STAGE_CHARACTERS === 'object' ? this.deps.STAGE_CHARACTERS : null);
        this.sheetUrl = file => this.table().path + file + (this.table().version ? `?v=${this.table().version}` : '');
        this.rise = null;
        this.riseClips = new Map();
        this.afterKickoff = (set, state) => (state.attack.kickoff && set.move
            ? { ...state, attack: { ...state.attack, start: state.attack.start + this.kickoffMs(state.attack) } } : state);
        this.kickoffMs = attack => Math.min(this.deps.STAGE_VIEW.kickoffMs, (attack.impactAt - attack.start) * 0.5);
        this.lastPose = () => this.body;
        this.facing = () => (this.facingLeft ? -1 : 1);
        this.setRise = value => { this.rise = value; };
        this.preloadRise = classId => { if (this.table() && classId) this.image(this.riseClip(classId).file); };
        this.down = () => !!this.rise;
    }

    sum(list, from = 0, to = list.length) {
        let total = 0;
        for (let i = from; i < to; i++) total += list[i];
        return total;
    }

    frameAt(ms, elapsed, loop) {
        const total = this.sum(ms);
        let t = loop ? ((elapsed % total) + total) % total : Math.max(0, Math.min(total - 0.001, elapsed));
        for (let i = 0; i < ms.length; i++) {
            if (t < ms[i]) return i;
            t -= ms[i];
        }
        return ms.length - 1;
    }

    /**
     * Attack clip for one swing. Frames before the authored hit frame are compressed into the combat
     * windup (start → impactAt); the recoil after the hit plays at a gentler speed (clip.steady: at the clip's own speed, for frames
     * that still fire after the hit, the bow volley). Channels hold the hit.
     * @returns {?{frame:number, end:number}}
     */
    attackPose(clip, swing, now) {
        const hit = Math.max(1, Math.min(clip.frames - 1, clip.hitFrame || 1));
        const pre = this.sum(clip.ms, 0, hit), post = this.sum(clip.ms, hit);
        const windup = Math.max(1, swing.impactAt - swing.start);
        const speed = windup / pre, recover = clip.steady ? 1 : Math.max(0.55, Math.min(1, speed));
        const hold = Math.max(0, (swing.channelUntil || 0) - (swing.start + windup));
        const elapsed = now - swing.start, end = swing.start + windup + hold + post * recover;
        if (elapsed < 0 || now >= end) return null;
        if (elapsed >= windup && elapsed < windup + hold) return { frame: hit, end };
        const local = elapsed < windup ? elapsed / speed : pre + (elapsed - windup - hold) / recover;
        return { frame: this.frameAt(clip.ms, local, false), end };
    }

    setOf(classId, stance) {
        const data = this.table(), entry = data && data.classes[classId];
        return entry ? entry.weapons[stance] || null : null;
    }

    /** 그 룬을 그 직업이 그 자세로 쓸 때의 동작(스킬룬 전달본의 동작 표, data/stage-skill-vfx.js motions): 'slam', 'flurry', 'cast2',
     * 'throw' 같은 동작 이름. 표에 없으면 null(그 자세의 기본 휘두름을 쓴다). */
    motionFor(skillName, classId, stance) {
        const own = this.deps.STAGE_VIEW.runeStanceMotions[skillName]?.[stance];
        if (own) return own;
        const gem = typeof this.deps.stageSkillKit === 'object' && typeof this.deps.STAGE_SKILL_VFX === 'object' ? this.deps.stageSkillKit.gemOf(skillName) : null;
        const row = gem && this.deps.STAGE_SKILL_VFX.motions[gem.id];
        return (row && row[classId] && row[classId][stance]) || null;
    }

    /** 그 직업과 자세의 그 동작(data/stage-characters.js의 칸, 장, 시간, lift). 없으면 null. */
    clipOf(classId, stance, motion) {
        const set = this.setOf(classId, stance);
        return (set && motion && set[motion]) || null;
    }

    /** 그 시트(js/canvas-stage-pictures.js의 그림 한 장): 메인 스레드 밖에서 미리 풀어 두므로 그 동작을 처음 그릴 때 멈추지 않는다.
     * ready가 참이면 source를 그릴 수 있다. 지금 직업과 자세의 시트만 열어 두고 나머지는 닫는다(retain). */
    image(file) {
        let img = this.images.get(file);
        if (!img) {
            img = this.deps.stagePictures.openPicture(this.sheetUrl(file));
            this.images.set(file, img);
        }
        return img;
    }

    /** Lets go of every sheet outside the set in use (and the class's shared death sheet). */
    retain(classId, stance) {
        const prefix = `${classId}/${stance}/`, death = `${classId}/${this.DEATH}`;
        if (this.kept === prefix) return;
        this.kept = prefix;
        for (const [file, img] of this.images) {
            if (file.startsWith(prefix) || file === death) continue;
            this.deps.stagePictures.closePicture(img);
            this.images.delete(file);
        }
        this.silhouettes.clear();
    }

    /** The set's sheets start loading on first use; standing, walking and the plain swing (a flask has no attack: its throw) are
     * enough to draw. */
    isReady(classId, stance) {
        const set = this.setOf(classId, stance);
        if (!set) return false;
        this.retain(classId, stance);
        Object.values(set).forEach(clip => this.image(clip.file));
        return [set.idle, set.walk, set.attack || set.throw].every(clip => clip && this.image(clip.file).ready);
    }

    /** The stance a class shows for the weapon it wears: its category through SKILL_RUNE_STANCE_BY_CATEGORY (data/skills.js, the same
     * table the rune weapon rules read), no weapon is bare hands. mode: a stance id forces that stance (test panel). */
    stanceFor(item, mode) {
        if (this.deps.STAGE_VIEW.stances.includes(mode)) return mode;
        const category = this.deps.getWeaponCategoryId(item);
        return (category && this.deps.SKILL_RUNE_STANCE_BY_CATEGORY[category]) || 'unarmed';
    }

    msOf(clip) {
        let list = this.lists.get(clip);
        if (!list) {
            list = Array.isArray(clip.ms) ? clip.ms : Array(clip.frames).fill(clip.ms);
            this.lists.set(clip, list);
        }
        return list;
    }

    /** Clip ids of one kind in order: 'attack' → attack, attack2, attack3 … (only those whose sheet has loaded). */
    variants(set, base) {
        return Object.keys(set).filter(id => id.replace(/\d+$/, '') === base && this.image(set[id].file).ready)
            .sort((a, b) => (Number(a.slice(base.length)) || 1) - (Number(b.slice(base.length)) || 1));
    }

    /** The clips a swing without its own motion may play: spells cast, a thrown flask throws, the rest attack (a flask has no attack:
     * it throws). A quick windup keeps to the short clips. */
    swingPool(set, state) {
        const kind = state.spell ? 'cast' : (state.throwsWeapon ? 'throw' : 'attack');
        const pool = [kind, 'attack', 'throw'].map(base => this.variants(set, base)).find(list => list.length) || [];
        const quick = state.attack.impactAt - state.attack.start < this.deps.STAGE_VIEW.shortWindupMs;
        const short = pool.filter(id => set[id].frames <= this.deps.STAGE_VIEW.shortClipFrames);
        return quick && short.length ? short : pool;
    }

    /** Each new swing takes the next clip of the pool (공격 → 공격2 → …), so a row of attacks reads as a combo. After a pause
     * (STAGE_VIEW.comboResetMs) the combo starts again from its first swing, which begins from the ready pose. */
    swingClip(set, state) {
        if (state.attack.start !== this.chain.start) {
            const paused = !(state.attack.start - this.chain.start < this.deps.STAGE_VIEW.comboResetMs);
            this.chain = { start: state.attack.start, index: paused ? 0 : this.chain.index + 1 };
        }
        const own = this.ownMotion(set, state);
        if (own) return own;
        const pool = this.swingPool(set, state);
        return pool.length ? pool[this.chain.index % pool.length] : null;
    }

    /** 그 룬에 정해진 동작(state.motion, motionFor): 그 시트가 와 있을 때. */
    ownMotion(set, state) {
        return state.motion && set[state.motion] && this.image(set[state.motion].file).ready ? state.motion : null;
    }

    riseClip(classId) {
        if (!this.riseClips.has(classId)) {
            const { w, h, ax, ay } = this.setOf(classId, 'unarmed').death;
            this.riseClips.set(classId, Object.freeze({ file: `${classId}/${this.deps.STAGE_HERO_RISE.file}`, frames: this.deps.STAGE_HERO_RISE.ms.length, ms: this.deps.STAGE_HERO_RISE.ms, w, h, ax, ay }));
        }
        return this.riseClips.get(classId);
    }

    risePose(classId, now) {
        if (!this.rise) return null;
        const clip = this.riseClip(classId);
        if (!this.image(clip.file).ready) return null;
        return { clip, frame: this.rise.start === null ? 0 : this.frameAt(clip.ms, Math.max(0, now - this.rise.start), false) };
    }

    downPose(classId, state) {
        if (!Number.isFinite(state.downProgress)) return null;
        const clip = this.setOf(classId, 'unarmed').death;
        if (!this.image(clip.file).ready) return null;
        return { clip, frame: Math.min(clip.frames - 1, Math.floor(state.downProgress * clip.frames)) };
    }

    swingPose(set, state, now) {
        if (!state.attack || state.moving) return null;
        return this.kickoffPose(set, state, now) || this.strikePose(set, this.afterKickoff(set, state), now);
    }

    /** 휘두름의 칸과 장. 활 연타사격(연발 사격의 나눠 쏘기, 2026-10-20 v42)은 첫 사격을 발사 순간에 맞추고 나머지 사격은 그림의 시간대로
     * (js/combat-grid.js volley와 같은 때), 다른 동작은 마지막 타격 장을 타격 순간에 맞춘다. */
    strikePose(set, state, now) {
        const id = this.swingClip(set, state);
        if (!id) return null;
        const clip = set[id], volley = id === 'volley' && !!clip.hit, hit = this.strikeFrame(clip, state.attack, volley);
        const pose = this.attackPose({ frames: clip.frames, ms: this.msOf(clip), hitFrame: hit, steady: volley }, state.attack, now);
        return pose ? { clip, frame: pose.frame } : null;
    }

    /** 타격 순간에 올 장: 그 시전이 정한 장(파문심판은 향로가 바닥에 닿는 장), 아니면 동작의 마지막 타격 장(연타사격은 첫 장), 그것도 없으면 끝 장. */
    strikeFrame(clip, attack, volley) {
        if (Number.isInteger(attack.contactFrame)) return attack.contactFrame;
        return clip.hit ? clip.hit[volley ? 0 : clip.hit.length - 1] : clip.frames - 1;
    }

    kickoffPose(set, state, now) {
        const clip = state.attack.kickoff ? set.move : null;
        if (!clip || !this.image(clip.file).ready || now - state.attack.start >= this.kickoffMs(state.attack)) return null;
        const lead = this.kickoffMs(state.attack), push = clip.hit ? clip.hit[0] : clip.frames - 1;
        const pose = this.attackPose({ frames: clip.frames, ms: this.msOf(clip), hitFrame: push }, { start: state.attack.start, impactAt: state.attack.start + lead * 0.8 }, now);
        return pose ? { clip, frame: pose.frame } : null;
    }

    movePose(set, state, now) {
        if (!state.moving) return null;
        const rules = this.table().move, rate = Math.max(rules.rateMin, Math.min(rules.rateMax, Number(state.moveRate) || 1));
        return { clip: set.walk, frame: this.frameAt(this.msOf(set.walk), now * rate, true) };
    }

    pickPose(set, state, now) {
        return this.downPose(state.classId, state) || this.swingPose(set, state, now) || this.movePose(set, state, now)
            || { clip: set.idle, frame: this.frameAt(this.msOf(set.idle), now, true) };
    }

    /** The look of a hit at `now`: the outline colour, how far back the figure sits, and whether its frame holds.
     * A hit within comboMs of the one before keeps the dark outline on instead of flashing again. null: nothing to show. */
    hitLook(state, now) {
        const rules = this.table().hit, at = state.hurtAt;
        if (!Number.isFinite(at)) return null;
        if (at !== this.hits.at) this.hits = { at, chained: at - this.hits.at < rules.comboMs };
        let age = now - at;
        if (age < 0) return null;
        if (this.hits.chained) return age < rules.comboMs ? { outline: rules.steps[1].outline, back: 0, hold: false } : null;
        for (const step of rules.steps) {
            if (age < step.ms) return step;
            age -= step.ms;
        }
        return null;
    }

    /** One frame of a clip's sheet painted one colour (the hit outline), most recent SILHOUETTE_LIMIT kept. */
    silhouette(img, clip, frame, colour) {
        const key = `${img.url}|${frame}|${colour}`;
        let canvas = this.silhouettes.get(key);
        if (canvas) return canvas;
        canvas = this.deps.document.createElement('canvas');
        canvas.width = clip.w;
        canvas.height = clip.h;
        const c = canvas.getContext('2d');
        c.drawImage(img.source, frame * clip.w, 0, clip.w, clip.h, 0, 0, clip.w, clip.h);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = colour;
        c.fillRect(0, 0, clip.w, clip.h);
        this.silhouettes.set(key, canvas);
        if (this.silhouettes.size > this.SILHOUETTE_LIMIT) this.silhouettes.delete(this.silhouettes.keys().next().value);
        return canvas;
    }

    /** Dots from the feet line to the top of the head in the standing frame, measured once per set. */
    headroom(set) {
        const clip = set.idle, img = this.image(clip.file);
        if (this.headrooms.has(img.url)) return this.headrooms.get(img.url);
        if (!img.ready) return this.FALLBACK_HEADROOM;
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = clip.w;
        canvas.height = clip.h;
        const c = canvas.getContext('2d', { willReadFrequently: true });
        c.drawImage(img.source, 0, 0, clip.w, clip.h, 0, 0, clip.w, clip.h);
        const alpha = c.getImageData(0, 0, clip.w, clip.h).data;
        let first = 3;
        while (first < alpha.length && alpha[first] < 128) first += 4;
        const top = first < alpha.length ? Math.floor((first - 3) / 4 / clip.w) : clip.ay - this.FALLBACK_HEADROOM;
        this.headrooms.set(img.url, clip.ay - top);
        return this.headrooms.get(img.url);
    }

    /** Screen px per art px for a cell width. Any scale: js/canvas-stage-dots.js keeps the dots even where a dot is not a whole
     * number of canvas pixels. */
    scaleFor(tile) {
        return scaleForStageArt(tile, this.deps.STAGE_VIEW.heroTile);
    }

    /** Left and right follow the pose; up and down keep the side the figure faced last. */
    turn(direction) {
        if (direction === 'west') this.facingLeft = true;
        else if (direction === 'east') this.facingLeft = false;
        return this.facingLeft;
    }

    /** 발밑 그림자: 도트로 찍는 납작한 타원(js/canvas-stage-rings.js). */
    drawShadow(ctx, x, y, scale, alpha) {
        this.deps.stageRings.shadow(ctx, { x, y, dot: scale }, 15, alpha * 1.5);
    }

    /** One cell of a clip (frame index along its strip; a silhouette canvas is frame 0) with its top-left corner at dest. */
    blit(ctx, source, clip, frame, dest) {
        this.deps.stageDots.blit(ctx, source, { x: frame * clip.w, y: 0, w: clip.w, h: clip.h }, { x: Math.round(dest.x), y: Math.round(dest.y), scale: dest.scale });
    }

    /** 시전 오라(js/canvas-stage-skill-sigil.js): 주문을 쓰는 예비 동작 동안 몸의 테두리에 속성 색이 돈다. 바깥 두 도트는 옅게, 안쪽 한 도트는 또렷하게.
     * 사역룬 가호가 걸리는 순간에도 같은 테두리가 돈다(js/canvas-stage-blessing.js). */
    drawAura(ctx, img, pose, dest) {
        const colour = (typeof this.deps.stageSkillSigil === 'object' ? this.deps.stageSkillSigil.aura() : null) || (typeof this.deps.stageBlessing === 'object' ? this.deps.stageBlessing.aura() : null) || (typeof this.deps.stageSkillPolish === 'object' ? this.deps.stageSkillPolish.forgeAura() : null);
        if (!colour) return;
        const rim = this.silhouette(img, pose.clip, pose.frame, colour), alpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha * 0.45;
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2]]) this.blit(ctx, rim, pose.clip, 0, { ...dest, x: dest.x + dx * dest.scale, y: dest.y + dy * dest.scale });
        ctx.globalAlpha = alpha;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.blit(ctx, rim, pose.clip, 0, { ...dest, x: dest.x + dx * dest.scale, y: dest.y + dy * dest.scale });
    }

    drawOutline(ctx, img, pose, dest, look) {
        if (!look || !look.outline) return;
        const rim = this.silhouette(img, pose.clip, pose.frame, look.outline), step = this.table().hit.outlinePx * dest.scale;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) this.blit(ctx, rim, pose.clip, 0, { ...dest, x: dest.x + dx * step, y: dest.y + dy * step });
    }

    /** The frame a hit holds for its first moment: the pose drawn last frame. */
    heldPose(look) {
        return look && look.hold && this.body ? this.body.pose : null;
    }

    /** Which way the figure looks this frame: where it walks, else where it swings, else where it faced. */
    poseDirection(state) {
        if (state.moving) return state.moveDirection;
        return (state.attack && state.attack.direction) || state.facing;
    }

    /** Where the figure lands: its scale, the side it faces and the mirror axis. A hit sets it back a little, away from where it faces. */
    placeFigure(x, y, state, look) {
        const scale = this.scaleFor(state.tile), left = this.turn(this.poseDirection(state));
        const axis = x + (look ? look.back * scale * (left ? 1 : -1) : 0);
        return { scale, left, axis, alpha: Math.max(0, Math.min(1, state.alpha ?? 1)) };
    }

    /** The top-left corner of a clip's cell on screen: its feet anchor (ax, ay) on the figure's axis and feet line. */
    cellCorner(clip, axis, y, scale) {
        return { x: axis - (clip.ax + 0.5) * scale, y: y - clip.ay * scale, scale };
    }

    /** 몸: 시전 오라나 맞았을 때의 테, 그 위에 그 동작의 칸. 시트가 아직 오지 않은 동작은 그 프레임을 건너뛴다. */
    drawBody(ctx, sheet, o) {
        if (!sheet.ready) return;
        if (!o.look || !o.look.outline) this.drawAura(ctx, sheet, o.pose, o.dest);
        this.drawOutline(ctx, sheet, o.pose, o.dest, o.look);
        this.blit(ctx, sheet.source, o.pose.clip, o.pose.frame, o.dest);
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x feet x (CSS px)
     * @param {number} y feet y (CSS px)
     * @param {{classId:string, stance:string, tile:number, facing:string, moving?:boolean, moveRate?:number, moveDirection?:string,
     *   attack?:?object, spell?:boolean, throwsWeapon?:boolean, motion?:?string, hurtAt?:?number, downProgress?:?number,
     *   alpha?:number}} state (motion: 그 룬의 동작 이름, motionFor)
     * @param {number} now visual clock
     * @returns {boolean} false when the set is not ready (the caller falls back to the other sprite sets)
     */
    drawStageHero(ctx, x, y, state, now) {
        const set = this.setOf(state.classId, state.stance);
        if (!set || !this.isReady(state.classId, state.stance)) return false;
        const look = this.hitLook(state, now), pose = this.risePose(state.classId, now) || this.heldPose(look) || this.pickPose(set, state, now);
        const figure = this.placeFigure(x, y, state, look);
        ctx.save();
        this.drawShadow(ctx, x, y, figure.scale, 0.28 * figure.alpha);
        if (figure.left) { ctx.translate(figure.axis * 2, 0); ctx.scale(-1, 1); }
        ctx.globalAlpha = figure.alpha;
        this.drawBody(ctx, this.image(pose.clip.file), { pose, look, dest: this.cellCorner(pose.clip, figure.axis, y, figure.scale) });
        ctx.restore();
        this.body = { now, pose, sheet: this.image(pose.clip.file), left: figure.left, headY: y - this.headroom(set) * figure.scale };
        this.keepPose(this.body);
        return true;
    }

    /** 그린 자세를 자취에 남기고 오래된 것을 걷는다. 시계가 되돌아가면(다른 판) 자취를 비운다. */
    keepPose(drawn) {
        if (this.poseTrail.length && drawn.now < this.poseTrail[this.poseTrail.length - 1].now) this.poseTrail.length = 0;
        this.poseTrail.push(drawn);
        while (drawn.now - this.poseTrail[0].now > this.POSE_TRAIL_MS) this.poseTrail.shift();
    }

    /** agoMs 전에 그린 자세: 그때나 그 바로 앞에 그린 것, 자취가 그보다 짧으면 가장 오래된 것. */
    poseAgo(agoMs) {
        const at = this.body.now - agoMs;
        let found = this.poseTrail[0] || this.body;
        for (const drawn of this.poseTrail) {
            if (drawn.now > at) break;
            found = drawn;
        }
        return found;
    }

    /** CSS y of the top of the head drawn this frame (overhead bars sit above it), or null when the stage hero was not drawn. */
    headY(now) { return this.body && this.body.now === now ? this.body.headY : null; }

    /** 지난 프레임에 그린 자세를 한 색으로(전도성 난격이 떠난 자리의 잔상, js/canvas-stage-skill-casts.js). 아직 그린 적이 없으면 null.
     * agoMs를 주면 그만큼 앞에 그린 자세(0.6초까지, 이중 발동의 잔상이 앞 발동의 타격 자세를 쓴다: js/canvas-stage-skill-rules.js).
     * 돌려준 함수(ctx, dot, alpha)는 붓의 원점에 발을 두고 그때 보던 쪽을 보며 빛을 더해 그린다. */
    afterimage(colour, agoMs = 0) {
        const drawn = this.body && this.poseAgo(agoMs);
        if (!drawn || !drawn.sheet || !drawn.sheet.ready) return null;
        const clip = drawn.pose.clip, rim = this.silhouette(drawn.sheet, clip, drawn.pose.frame, colour), left = drawn.left;
        return (ctx, dot, alpha) => {
            ctx.save();
            if (left) ctx.scale(-1, 1);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha *= Math.max(0, alpha);
            this.blit(ctx, rim, clip, 0, this.cellCorner(clip, 0, 0, dot));
            ctx.restore();
        };
    }
}

export function createStageActors(deps) {
    const instance = new StageActors(deps);
    return { drawPlayer: instance.drawStageHero.bind(instance), headY: instance.headY.bind(instance), afterimage: instance.afterimage.bind(instance), pose: instance.lastPose, isReady: instance.isReady.bind(instance), stanceFor: instance.stanceFor.bind(instance), motionFor: instance.motionFor.bind(instance), clipOf: instance.clipOf.bind(instance), scaleFor: instance.scaleFor.bind(instance), facing: instance.facing, setRise: instance.setRise, preloadRise: instance.preloadRise, down: instance.down };
}
