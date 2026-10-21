/** 옆에서 보는 무대의 주인공 (data/stage-characters.js, data/stage-view.js; 2026-10-20 사용자가 모션 공방으로 만든 6직업 × 7무기 모션).
 * 동작마다 가로 한 줄 시트(칸 w × h, 칸 안의 발 기준점 ax, ay, 오른쪽을 보는 그림)를 쓰고 왼쪽은 좌우로 뒤집는다. 위아래(깊이)로 움직일 때는
 * 마지막에 보던 좌우를 그대로 본다. 공격 그림은 타격 프레임이 실제 타격 순간(swing.impactAt)에 오도록 준비 구간을 줄여 맞춘다
 * (js/canvas-hana-actors.js attackPose와 같은 규칙). 피격은 그림 없이 붉은 외곽선과 밀림이다(규격의 hit).
 * 그림은 지금 쓰는 직업 × 무기 묶음만 들고 있는다. 그리기만 하고 전투 상태는 바꾸지 않는다.
 */
const stageActors = (() => {
    const DEATH = 'unarmed/death.png';
    const FALLBACK_HEADROOM = 110;     // 발에서 머리 꼭대기까지(도트), 대기 그림을 재기 전의 값
    const SILHOUETTE_LIMIT = 48;
    const images = new Map(), lists = new WeakMap(), silhouettes = new Map(), headrooms = new Map();
    let kept = '', body = null, facingLeft = false, probe = null, present = false;
    let chain = { start: -1, index: -1 };
    let hits = { at: -Infinity, chained: false };

    const table = () => (typeof STAGE_CHARACTERS === 'object' ? STAGE_CHARACTERS : null);
    /** 그 시트의 주소: 이름이 같아도 칸이 바뀐 그림을 브라우저가 새로 받게 시트 묶음의 해시를 붙인다(data/stage-characters.js version). */
    const sheetUrl = file => table().path + file + (table().version ? `?v=${table().version}` : '');
    const loaded = img => !!img && img.complete && img.naturalWidth > 0;

    /** A web bundle made without the art folder says so in index.html (scripts/build-web.js): there the art is never asked for,
     * since asking for a file that is not there answers 404 on every page load. Anywhere else (a dev server) one sheet is asked for. */
    const packed = typeof document !== 'object' || typeof document.querySelector !== 'function' || !document.querySelector('meta[name="stage-art"][content="none"]');
    /** Whether the stage art is on this server at all: one small sheet is asked for once. A build without the art folder
     * keeps the top-down field whatever the setting says (a save can carry the setting from a test build). */
    function available() {
        if (present || !table() || !packed) return present;
        if (!probe) {
            probe = new Image();
            probe.src = sheetUrl(Object.values(table().classes)[0].weapons.unarmed.idle.file);
        }
        present = loaded(probe);
        return present;
    }
    /** Whether this page knows yet if the stage art is here: the probe sheet loaded or failed, or no sheet is ever asked for. */
    function stageArtKnown() { return present || !table() || !packed || (!!probe && probe.complete); }
    /** Resolves once stageArtKnown() is true (the boot waits for it: js/main.js). */
    function whenStageArtKnown() {
        available();
        if (stageArtKnown()) return Promise.resolve();
        return new Promise(done => { probe.addEventListener('load', done, { once: true }); probe.addEventListener('error', done, { once: true }); });
    }
    function setOf(classId, stance) {
        const data = table(), entry = data && data.classes[classId];
        return entry ? entry.weapons[stance] || null : null;
    }
    /** 그 룬을 그 직업이 그 자세로 쓸 때의 동작(스킬룬 전달본의 동작 표, data/stage-skill-vfx.js motions): 'slam', 'flurry', 'cast2',
     * 'throw' 같은 동작 이름. 표에 없으면 null(그 자세의 기본 휘두름을 쓴다). */
    function motionFor(skillName, classId, stance) {
        const gem = typeof stageSkillKit === 'object' && typeof STAGE_SKILL_VFX === 'object' ? stageSkillKit.gemOf(skillName) : null;
        const row = gem && STAGE_SKILL_VFX.motions[gem.id];
        return (row && row[classId] && row[classId][stance]) || null;
    }
    /** 그 직업과 자세의 그 동작(data/stage-characters.js의 칸, 장, 시간, lift). 없으면 null. */
    function clipOf(classId, stance, motion) {
        const set = setOf(classId, stance);
        return (set && motion && set[motion]) || null;
    }
    /** 그 시트(js/canvas-stage-pictures.js의 그림 한 장): 메인 스레드 밖에서 미리 풀어 두므로 그 동작을 처음 그릴 때 멈추지 않는다.
     * ready가 참이면 source를 그릴 수 있다. 지금 직업과 자세의 시트만 열어 두고 나머지는 닫는다(retain). */
    function image(file) {
        let img = images.get(file);
        if (!img) {
            img = stagePictures.openPicture(sheetUrl(file));
            images.set(file, img);
        }
        return img;
    }
    /** Lets go of every sheet outside the set in use (and the class's shared death sheet). */
    function retain(classId, stance) {
        const prefix = `${classId}/${stance}/`, death = `${classId}/${DEATH}`;
        if (kept === prefix) return;
        kept = prefix;
        for (const [file, img] of images) {
            if (file.startsWith(prefix) || file === death) continue;
            stagePictures.closePicture(img);
            images.delete(file);
        }
        silhouettes.clear();
    }
    /** The set's sheets start loading on first use; standing, walking and the plain swing (a flask has no attack: its throw) are
     * enough to draw. */
    function isReady(classId, stance) {
        const set = setOf(classId, stance);
        if (!set) return false;
        retain(classId, stance);
        Object.values(set).forEach(clip => image(clip.file));
        return [set.idle, set.walk, set.attack || set.throw].every(clip => clip && image(clip.file).ready);
    }

    /** The stance a class shows for the weapon it wears: its category through SKILL_RUNE_STANCE_BY_CATEGORY (data/skills.js, the same
     * table the rune weapon rules read), no weapon is bare hands. mode: a stance id forces that stance (test panel). */
    function stanceFor(item, mode) {
        if (STAGE_VIEW.stances.includes(mode)) return mode;
        const category = getWeaponCategoryId(item);
        return (category && SKILL_RUNE_STANCE_BY_CATEGORY[category]) || 'unarmed';
    }

    function msOf(clip) {
        let list = lists.get(clip);
        if (!list) {
            list = Array.isArray(clip.ms) ? clip.ms : Array(clip.frames).fill(clip.ms);
            lists.set(clip, list);
        }
        return list;
    }
    /** Clip ids of one kind in order: 'attack' → attack, attack2, attack3 … (only those whose sheet has loaded). */
    function variants(set, base) {
        return Object.keys(set).filter(id => id.replace(/\d+$/, '') === base && image(set[id].file).ready)
            .sort((a, b) => (Number(a.slice(base.length)) || 1) - (Number(b.slice(base.length)) || 1));
    }
    /** The clips a swing without its own motion may play: spells cast, a thrown flask throws, the rest attack (a flask has no attack:
     * it throws). A quick windup keeps to the short clips. */
    function swingPool(set, state) {
        const kind = state.spell ? 'cast' : (state.throwsWeapon ? 'throw' : 'attack');
        const pool = [kind, 'attack', 'throw'].map(base => variants(set, base)).find(list => list.length) || [];
        const quick = state.attack.impactAt - state.attack.start < STAGE_VIEW.shortWindupMs;
        const short = pool.filter(id => set[id].frames <= STAGE_VIEW.shortClipFrames);
        return quick && short.length ? short : pool;
    }
    /** Each new swing takes the next clip of the pool (공격 → 공격2 → …), so a row of attacks reads as a combo. After a pause
     * (STAGE_VIEW.comboResetMs) the combo starts again from its first swing, which begins from the ready pose. */
    function swingClip(set, state) {
        if (state.attack.start !== chain.start) {
            const paused = !(state.attack.start - chain.start < STAGE_VIEW.comboResetMs);
            chain = { start: state.attack.start, index: paused ? 0 : chain.index + 1 };
        }
        const own = ownMotion(set, state);
        if (own) return own;
        const pool = swingPool(set, state);
        return pool.length ? pool[chain.index % pool.length] : null;
    }
    /** 그 룬에 정해진 동작(state.motion, motionFor): 그 시트가 와 있을 때. */
    function ownMotion(set, state) {
        return state.motion && set[state.motion] && image(set[state.motion].file).ready ? state.motion : null;
    }

    // 처음 장면의 쓰러진 주인공과 일어나는 동작(js/opening-journey-ui.js가 정한다, data/stage-view.js STAGE_HERO_RISE): null이면 보통 자세,
    // start가 null이면 쓰러진 채(0번 프레임), 아니면 그 시각(그림 시계)부터 한 번 일어난다. 맨손 그림이라 들고 있는 무기와 상관없이 쓴다.
    // 그림은 맨손 사망을 거꾸로 이은 시트라 칸과 발 기준점이 사망과 같다(scripts/import-stage-characters.cjs).
    let rise = null;
    const riseClips = new Map();
    function riseClip(classId) {
        if (!riseClips.has(classId)) {
            const { w, h, ax, ay } = setOf(classId, 'unarmed').death;
            riseClips.set(classId, Object.freeze({ file: `${classId}/${STAGE_HERO_RISE.file}`, frames: STAGE_HERO_RISE.ms.length, ms: STAGE_HERO_RISE.ms, w, h, ax, ay }));
        }
        return riseClips.get(classId);
    }
    function risePose(classId, now) {
        if (!rise) return null;
        const clip = riseClip(classId);
        if (!image(clip.file).ready) return null;
        return { clip, frame: rise.start === null ? 0 : hanaActors.frameAt(clip.ms, Math.max(0, now - rise.start), false) };
    }
    function downPose(classId, state) {
        if (!Number.isFinite(state.downProgress)) return null;
        const clip = setOf(classId, 'unarmed').death;
        if (!image(clip.file).ready) return null;
        return { clip, frame: Math.min(clip.frames - 1, Math.floor(state.downProgress * clip.frames)) };
    }
    function swingPose(set, state, now) {
        if (!state.attack || state.moving) return null;
        return kickoffPose(set, state, now) || strikePose(set, afterKickoff(set, state), now);
    }
    /** 박차고 나간 뒤의 휘두름은 그 뒤부터 준비한다. */
    const afterKickoff = (set, state) => (state.attack.kickoff && set.move
        ? { ...state, attack: { ...state.attack, start: state.attack.start + kickoffMs(state.attack) } } : state);
    /** 휘두름의 칸과 장. 활 연타사격(연발 사격의 나눠 쏘기, 2026-10-20 v42)은 첫 사격을 발사 순간에 맞추고 나머지 사격은 그림의 시간대로
     * (js/combat-grid.js volley와 같은 때), 다른 동작은 마지막 타격 장을 타격 순간에 맞춘다. */
    function strikePose(set, state, now) {
        const id = swingClip(set, state);
        if (!id) return null;
        const clip = set[id], volley = id === 'volley' && !!clip.hit, hit = clip.hit ? clip.hit[volley ? 0 : clip.hit.length - 1] : clip.frames - 1;
        const pose = hanaActors.attackPose({ frames: clip.frames, ms: msOf(clip), hitFrame: hit, steady: volley }, state.attack, now);
        return pose ? { clip, frame: pose.frame } : null;
    }
    /** 그림자 점멸이 박차고 나가는 동안(STAGE_VIEW.kickoffMs, 휘두름 준비의 절반까지): 그 자세의 이동 동작, 미는 장이 끝 무렵에 온다. 그 뒤는 null. */
    const kickoffMs = attack => Math.min(STAGE_VIEW.kickoffMs, (attack.impactAt - attack.start) * 0.5);
    function kickoffPose(set, state, now) {
        const clip = state.attack.kickoff ? set.move : null;
        if (!clip || !image(clip.file).ready || now - state.attack.start >= kickoffMs(state.attack)) return null;
        const lead = kickoffMs(state.attack), push = clip.hit ? clip.hit[0] : clip.frames - 1;
        const pose = hanaActors.attackPose({ frames: clip.frames, ms: msOf(clip), hitFrame: push }, { start: state.attack.start, impactAt: state.attack.start + lead * 0.8 }, now);
        return pose ? { clip, frame: pose.frame } : null;
    }
    function movePose(set, state, now) {
        if (!state.moving) return null;
        const rules = table().move, rate = Math.max(rules.rateMin, Math.min(rules.rateMax, Number(state.moveRate) || 1));
        return { clip: set.walk, frame: hanaActors.frameAt(msOf(set.walk), now * rate, true) };
    }
    function pickPose(set, state, now) {
        return downPose(state.classId, state) || swingPose(set, state, now) || movePose(set, state, now)
            || { clip: set.idle, frame: hanaActors.frameAt(msOf(set.idle), now, true) };
    }

    /** The look of a hit at `now`: the outline colour, how far back the figure sits, and whether its frame holds.
     * A hit within comboMs of the one before keeps the dark outline on instead of flashing again. null: nothing to show. */
    function hitLook(state, now) {
        const rules = table().hit, at = state.hurtAt;
        if (!Number.isFinite(at)) return null;
        if (at !== hits.at) hits = { at, chained: at - hits.at < rules.comboMs };
        let age = now - at;
        if (age < 0) return null;
        if (hits.chained) return age < rules.comboMs ? { outline: rules.steps[1].outline, back: 0, hold: false } : null;
        for (const step of rules.steps) {
            if (age < step.ms) return step;
            age -= step.ms;
        }
        return null;
    }

    /** One frame of a clip's sheet painted one colour (the hit outline), most recent SILHOUETTE_LIMIT kept. */
    function silhouette(img, clip, frame, colour) {
        const key = `${img.url}|${frame}|${colour}`;
        let canvas = silhouettes.get(key);
        if (canvas) return canvas;
        canvas = document.createElement('canvas');
        canvas.width = clip.w;
        canvas.height = clip.h;
        const c = canvas.getContext('2d');
        c.drawImage(img.source, frame * clip.w, 0, clip.w, clip.h, 0, 0, clip.w, clip.h);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = colour;
        c.fillRect(0, 0, clip.w, clip.h);
        silhouettes.set(key, canvas);
        if (silhouettes.size > SILHOUETTE_LIMIT) silhouettes.delete(silhouettes.keys().next().value);
        return canvas;
    }
    /** Dots from the feet line to the top of the head in the standing frame, measured once per set. */
    function headroom(set) {
        const clip = set.idle, img = image(clip.file);
        if (headrooms.has(img.url)) return headrooms.get(img.url);
        if (!img.ready) return FALLBACK_HEADROOM;
        const canvas = document.createElement('canvas');
        canvas.width = clip.w;
        canvas.height = clip.h;
        const c = canvas.getContext('2d', { willReadFrequently: true });
        c.drawImage(img.source, 0, 0, clip.w, clip.h, 0, 0, clip.w, clip.h);
        const alpha = c.getImageData(0, 0, clip.w, clip.h).data;
        let first = 3;
        while (first < alpha.length && alpha[first] < 128) first += 4;
        const top = first < alpha.length ? Math.floor((first - 3) / 4 / clip.w) : clip.ay - FALLBACK_HEADROOM;
        headrooms.set(img.url, clip.ay - top);
        return headrooms.get(img.url);
    }

    /** Screen px per art px for a cell width. Any scale: js/canvas-stage-dots.js keeps the dots even where a dot is not a whole
     * number of canvas pixels. */
    function scaleFor(tile) {
        return (Number(tile) || STAGE_VIEW.heroTile) / STAGE_VIEW.heroTile;
    }
    /** Left and right follow the pose; up and down keep the side the figure faced last. */
    function turn(direction) {
        if (direction === 'west') facingLeft = true;
        else if (direction === 'east') facingLeft = false;
        return facingLeft;
    }
    /** 발밑 그림자: 도트로 찍는 납작한 타원(js/canvas-stage-rings.js). */
    function drawShadow(ctx, x, y, scale, alpha) {
        stageRings.shadow(ctx, { x, y, dot: scale }, 15, alpha * 1.5);
    }
    /** One cell of a clip (frame index along its strip; a silhouette canvas is frame 0) with its top-left corner at dest. */
    function blit(ctx, source, clip, frame, dest) {
        stageDots.blit(ctx, source, { x: frame * clip.w, y: 0, w: clip.w, h: clip.h }, { x: Math.round(dest.x), y: Math.round(dest.y), scale: dest.scale });
    }
    /** 시전 오라(js/canvas-stage-skill-sigil.js): 주문을 쓰는 예비 동작 동안 몸의 테두리에 속성 색이 돈다. 바깥 두 도트는 옅게, 안쪽 한 도트는 또렷하게. */
    function drawAura(ctx, img, pose, dest) {
        const colour = typeof stageSkillSigil === 'object' ? stageSkillSigil.aura() : null;
        if (!colour) return;
        const rim = silhouette(img, pose.clip, pose.frame, colour), alpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha * 0.45;
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2]]) blit(ctx, rim, pose.clip, 0, { ...dest, x: dest.x + dx * dest.scale, y: dest.y + dy * dest.scale });
        ctx.globalAlpha = alpha;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blit(ctx, rim, pose.clip, 0, { ...dest, x: dest.x + dx * dest.scale, y: dest.y + dy * dest.scale });
    }
    function drawOutline(ctx, img, pose, dest, look) {
        if (!look || !look.outline) return;
        const rim = silhouette(img, pose.clip, pose.frame, look.outline), step = table().hit.outlinePx * dest.scale;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blit(ctx, rim, pose.clip, 0, { ...dest, x: dest.x + dx * step, y: dest.y + dy * step });
    }

    /** The frame a hit holds for its first moment: the pose drawn last frame. */
    function heldPose(look) {
        return look && look.hold && body ? body.pose : null;
    }
    /** Which way the figure looks this frame: where it walks, else where it swings, else where it faced. */
    function poseDirection(state) {
        if (state.moving) return state.moveDirection;
        return (state.attack && state.attack.direction) || state.facing;
    }
    /** Where the figure lands: its scale, the side it faces and the mirror axis. A hit sets it back a little, away from where it faces. */
    function placeFigure(x, y, state, look) {
        const scale = scaleFor(state.tile), left = turn(poseDirection(state));
        const axis = x + (look ? look.back * scale * (left ? 1 : -1) : 0);
        return { scale, left, axis, alpha: Math.max(0, Math.min(1, state.alpha ?? 1)) };
    }
    /** The top-left corner of a clip's cell on screen: its feet anchor (ax, ay) on the figure's axis and feet line. */
    function cellCorner(clip, axis, y, scale) {
        return { x: axis - (clip.ax + 0.5) * scale, y: y - clip.ay * scale, scale };
    }

    /** 몸: 시전 오라나 맞았을 때의 테, 그 위에 그 동작의 칸. 시트가 아직 오지 않은 동작은 그 프레임을 건너뛴다. */
    function drawBody(ctx, sheet, o) {
        if (!sheet.ready) return;
        if (!o.look || !o.look.outline) drawAura(ctx, sheet, o.pose, o.dest);
        drawOutline(ctx, sheet, o.pose, o.dest, o.look);
        blit(ctx, sheet.source, o.pose.clip, o.pose.frame, o.dest);
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
    function drawStageHero(ctx, x, y, state, now) {
        const set = setOf(state.classId, state.stance);
        if (!set || !isReady(state.classId, state.stance)) return false;
        const look = hitLook(state, now), pose = risePose(state.classId, now) || heldPose(look) || pickPose(set, state, now);
        const figure = placeFigure(x, y, state, look);
        ctx.save();
        drawShadow(ctx, x, y, figure.scale, 0.28 * figure.alpha);
        if (figure.left) { ctx.translate(figure.axis * 2, 0); ctx.scale(-1, 1); }
        ctx.globalAlpha = figure.alpha;
        drawBody(ctx, image(pose.clip.file), { pose, look, dest: cellCorner(pose.clip, figure.axis, y, figure.scale) });
        ctx.restore();
        body = { now, pose, sheet: image(pose.clip.file), left: figure.left, headY: y - headroom(set) * figure.scale };
        return true;
    }
    /** CSS y of the top of the head drawn this frame (overhead bars sit above it), or null when the stage hero was not drawn. */
    function headY(now) { return body && body.now === now ? body.headY : null; }
    /** 지난 프레임에 그린 자세를 한 색으로(전도성 난격이 떠난 자리의 잔상, js/canvas-stage-skill-casts.js). 아직 그린 적이 없으면 null.
     * 돌려준 함수(ctx, dot, alpha)는 붓의 원점에 발을 두고 그때 보던 쪽을 보며 빛을 더해 그린다. */
    function afterimage(colour) {
        if (!body || !body.sheet || !body.sheet.ready) return null;
        const clip = body.pose.clip, rim = silhouette(body.sheet, clip, body.pose.frame, colour), left = body.left;
        return (ctx, dot, alpha) => {
            ctx.save();
            if (left) ctx.scale(-1, 1);
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha *= Math.max(0, alpha);
            blit(ctx, rim, clip, 0, cellCorner(clip, 0, 0, dot));
            ctx.restore();
        };
    }

    /** 주인공 그림이 지금 보는 쪽: 1 오른쪽, -1 왼쪽. */
    const facing = () => (facingLeft ? -1 : 1);
    /** The opening's hero pose (risePose): null, { start: null } lying, { start: visual ms } rising. */
    const setRise = value => { rise = value; };
    /** Starts loading a class's rise sheet (the intro plays while it decodes). */
    const preloadRise = classId => { if (table() && classId) image(riseClip(classId).file); };
    /** The hero lies or is getting up (the overhead bar waits: it would float over the air where a standing head would be). */
    const down = () => !!rise;
    return { drawPlayer: drawStageHero, headY, afterimage, isReady, stanceFor, motionFor, clipOf, scaleFor, available, stageArtKnown, whenStageArtKnown, facing, setRise, preloadRise, down };
})();

const sides = new WeakMap();
/** A local test page opened with ?stage=1 (the launcher's stage entry): a test window that keeps its own local save and
 * never uses the cloud save (stageView.trial). The stage itself no longer needs the flag (see stageView.wanted).
 * Only the leading 1 counts: a link pasted into a sentence can drag what followed it into the value ("1)에서"). */
const stageByAddress = typeof location === 'object' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
    && /^1(?!\d)/.test(new URLSearchParams(location.search).get('stage') || '');
/** The side-view stage (data/stage-view.js): whether the battlefield is drawn that way, and the numbers that follow from it. */
const stageView = Object.freeze({
    /** The stage is the game's own battlefield (2026-10-13 사용자: "이제 새로 만든 전투방식 (방 탐색) 을 제대로 사용하도록 해줘").
     * settings.battleView 'top' (test panel) goes back to the top-down field. The art must be there (enabled). */
    wanted() {
        const choice = typeof game === 'object' && game.settings ? game.settings.battleView : '';
        return choice !== 'top';
    },
    enabled: () => stageView.wanted() && stageActors.available(),
    /** 무대 시험판으로 연 창인가(주소에 stage=1): 이 창은 클라우드 저장을 쓰지 않는다(시험하는 판이 계정의 저장을 고쳐 쓰지 않게). */
    trial: () => stageByAddress,
    /** 새 탐험을 방 단위 지도로 여는가(js/act-exploration-doors.js): 무대가 켜져 있고 테스트 패널에서 끄지 않았을 때. */
    rooms: () => stageView.enabled() && !!game.settings && game.settings.stageRooms !== 'off',
    /** 방을 배경 그림으로 그리는가(js/canvas-stage-backdrop.js): 테스트 패널에서 끄면 벽돌 뒷벽으로 돌아간다. */
    backdrops: () => typeof game === 'object' && !!game.settings && game.settings.stageBackdrop !== 'off',
    /** Screen height of one depth cell ÷ its width: STAGE_VIEW.depth on the stage, 1 on the top-down field. */
    depth: () => (stageView.enabled() ? STAGE_VIEW.depth : 1),
    /** Cell width of an exploration map on the stage: the view's width shared among STAGE_VIEW.minColumns cells, so the same
     * stretch of a room shows at any window size (a whole number of px, and no smaller than minDot per character dot).
     * settings.stageZoom (test panel) sets the dots per pixel directly. */
    /** height와 rows(방이나 판의 깊이 칸 수)를 주면 화면 높이도 따른다: 바닥의 앞쪽 끝(floorShare)에서 뒤쪽 끝까지와 그 위의
     * 머리 높이(STAGE_VIEW.headroom)가 화면에 들어오는 칸까지만 커진다. 가로로 긴 창에서 뒤쪽 줄이 화면 위로 나가던 것을 막는다. */
    tile(width, height, rows) {
        const rule = STAGE_VIEW.minColumns, columns = width < rule.narrowBelow ? rule.narrow : rule.wide;
        if (Number(game.settings.stageZoom)) return STAGE_VIEW.heroTile * Number(game.settings.stageZoom);
        const widest = Math.floor(Math.min(width / columns, rows ? stageView.tallestTile(width, height, rows) : Infinity));
        return STAGE_VIEW.heroTile * Math.max(STAGE_VIEW.minDot, widest / STAGE_VIEW.heroTile);
    },
    /** 바닥의 앞쪽 끝이 놓이는 세로 자리(화면 높이의 비율): 그 아래는 HUD가 덮는다. 좁은 화면(휴대폰)은 narrow. */
    floorShare(width, height) {
        if (width < STAGE_VIEW.minColumns.narrowBelow) return STAGE_ROOMS.floorBottom.narrow;
        return Math.min(STAGE_ROOMS.floorBottom.wide, 1 - STAGE_ROOMS.hudClear / height);
    },
    /** 깊이 rows칸의 바닥과 그 위의 머리 높이가 화면에 다 들어오는 가장 큰 칸 너비(px). */
    tallestTile(width, height, rows) {
        const room = STAGE_VIEW.headroom, floor = height * stageView.floorShare(width, height);
        return (floor - room.top) / (rows * STAGE_VIEW.depth + room.dots / STAGE_VIEW.heroTile);
    },
    /** Where the hero stands down the view (share of its height): the middle on the top-down field. */
    anchorY: () => (stageView.enabled() ? STAGE_VIEW.anchorY : 0.5),
    /** The sheet row a monster shows: on the stage only its side rows, turned by its last left or right step. */
    facing(unit, direction) {
        if (!stageView.enabled()) return direction;
        if (direction === 'east' || direction === 'west') sides.set(unit, direction);
        return sides.get(unit) || 'west';
    }
});
// 그림이 있는지 미리 물어 둔다: 첫 탐험을 열 때(방 단위 지도를 고를 때) 이미 답이 와 있도록.
stageActors.available();
safeExposeGlobals({ stageActors, stageView });
