/** 옆에서 보는 무대의 주인공 (data/stage-characters.js, data/stage-view.js; 2026-10-11 사용자: 던파식 캐릭터로 바꾼다).
 * 직업 × 무기 자세마다 가로 한 줄 시트(칸 128, 오른쪽을 보는 그림)를 쓰고 왼쪽은 좌우로 뒤집는다. 위아래(깊이)로 움직일 때는
 * 마지막에 보던 좌우를 그대로 본다. 공격 그림은 타격 프레임이 실제 타격 순간(swing.impactAt)에 오도록 준비 구간을 줄여 맞춘다
 * (js/canvas-hana-actors.js attackPose와 같은 규칙). 피격은 그림 없이 붉은 외곽선과 밀림이다(규격의 공용.피격).
 * 그림은 지금 쓰는 직업 × 무기 묶음만 들고 있는다(전부 풀면 약 196MB, 한 묶음은 9MB 이하). 그리기만 하고 전투 상태는 바꾸지 않는다.
 */
const stageActors = (() => {
    const DEATH = 'unarmed/death.png';
    const FALLBACK_HEADROOM = 96;      // 발에서 머리 꼭대기까지(도트), 대기 그림을 재기 전의 값
    const SILHOUETTE_LIMIT = 48;
    const images = new Map(), lists = new WeakMap(), silhouettes = new Map(), headrooms = new Map();
    let kept = '', body = null, facingLeft = false, probe = null, present = false;
    let chain = { start: -1, index: -1 };
    let hits = { at: -Infinity, chained: false };

    const table = () => (typeof STAGE_CHARACTERS === 'object' ? STAGE_CHARACTERS : null);
    const loaded = img => !!img && img.complete && img.naturalWidth > 0;

    /** Whether the stage art is on this server at all: one small sheet is asked for once. A build without the art folder
     * keeps the top-down field whatever the setting says (a save can carry the setting from a test build). */
    function available() {
        if (present || !table()) return present;
        if (!probe) {
            probe = new Image();
            probe.src = table().path + Object.values(table().classes)[0].weapons.unarmed.idle.file;
        }
        present = loaded(probe);
        return present;
    }
    function setOf(classId, stance) {
        const data = table(), entry = data && data.classes[classId];
        return entry ? entry.weapons[stance] || null : null;
    }
    function image(file) {
        let img = images.get(file);
        if (!img) {
            img = new Image();
            img.decoding = 'async';
            img.src = table().path + file;
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
            img.src = '';
            images.delete(file);
        }
        silhouettes.clear();
    }
    /** The set's sheets start loading on first use; standing, walking and the first attack are enough to draw. */
    function isReady(classId, stance) {
        const set = setOf(classId, stance);
        if (!set) return false;
        retain(classId, stance);
        Object.values(set).forEach(clip => image(clip.file));
        return ['idle', 'walk', 'attack'].every(id => loaded(image(set[id].file)));
    }

    /** The stance a class shows for the weapon it wears: its category through STAGE_VIEW.stanceByCategory, a 곡도 with a shield
     * shows 검방패, no weapon is bare hands. mode: a stance id forces that stance (test panel). */
    function stanceFor(item, mode, hasShield) {
        if (STAGE_VIEW.stances.includes(mode)) return mode;
        const category = getWeaponCategoryId(item);
        if (!category) return 'unarmed';
        if (category === 'scimitar' && hasShield) return STAGE_VIEW.shieldStance;
        return STAGE_VIEW.stanceByCategory[category] || 'unarmed';
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
        return Object.keys(set).filter(id => id.replace(/\d+$/, '') === base && loaded(image(set[id].file)))
            .sort((a, b) => (Number(a.slice(base.length)) || 1) - (Number(b.slice(base.length)) || 1));
    }
    /** The clips a swing may play: spells cast, a thrown flask throws, the rest attack. A quick windup keeps to the short clips. */
    function swingPool(set, state) {
        const kind = state.spell ? 'cast' : (state.throwsWeapon ? 'throw' : 'attack');
        const all = variants(set, kind), pool = all.length ? all : variants(set, 'attack');
        const quick = state.attack.impactAt - state.attack.start < STAGE_VIEW.shortWindupMs;
        const short = pool.filter(id => set[id].frames <= STAGE_VIEW.shortClipFrames);
        return quick && short.length ? short : pool;
    }
    /** Each new swing takes the next clip of the pool (공격 → 공격2 → …), so a row of attacks reads as a combo. */
    function swingClip(set, state) {
        if (state.attack.start !== chain.start) chain = { start: state.attack.start, index: chain.index + 1 };
        const pool = swingPool(set, state);
        return pool.length ? pool[chain.index % pool.length] : null;
    }

    function downPose(classId, state) {
        if (!Number.isFinite(state.downProgress)) return null;
        const clip = setOf(classId, 'unarmed').death;
        if (!loaded(image(clip.file))) return null;
        return { clip, frame: Math.min(clip.frames - 1, Math.floor(state.downProgress * clip.frames)) };
    }
    function swingPose(set, state, now) {
        if (!state.attack || state.moving) return null;
        const id = swingClip(set, state);
        if (!id) return null;
        const clip = set[id], hit = clip.hit ? clip.hit[clip.hit.length - 1] : clip.frames - 1;
        const pose = hanaActors.attackPose({ frames: clip.frames, ms: msOf(clip), hitFrame: hit }, state.attack, now);
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

    /** One frame of a sheet painted one colour (the hit outline), most recent SILHOUETTE_LIMIT kept. */
    function silhouette(img, frame, colour) {
        const key = `${img.src}|${frame}|${colour}`, cell = table().cell;
        let canvas = silhouettes.get(key);
        if (canvas) return canvas;
        canvas = document.createElement('canvas');
        canvas.width = canvas.height = cell;
        const c = canvas.getContext('2d');
        c.drawImage(img, frame * cell, 0, cell, cell, 0, 0, cell, cell);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = colour;
        c.fillRect(0, 0, cell, cell);
        silhouettes.set(key, canvas);
        if (silhouettes.size > SILHOUETTE_LIMIT) silhouettes.delete(silhouettes.keys().next().value);
        return canvas;
    }
    /** Dots from the feet line to the top of the head in the standing frame, measured once per set. */
    function headroom(set) {
        const img = image(set.idle.file), data = table();
        if (headrooms.has(img.src)) return headrooms.get(img.src);
        if (!loaded(img)) return FALLBACK_HEADROOM;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = data.cell;
        const c = canvas.getContext('2d', { willReadFrequently: true });
        c.drawImage(img, 0, 0, data.cell, data.cell, 0, 0, data.cell, data.cell);
        const alpha = c.getImageData(0, 0, data.cell, data.cell).data;
        let first = 3;
        while (first < alpha.length && alpha[first] < 128) first += 4;
        const top = first < alpha.length ? Math.floor((first - 3) / 4 / data.cell) : data.feetY - FALLBACK_HEADROOM;
        headrooms.set(img.src, data.feetY - top);
        return headrooms.get(img.src);
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
    function blit(ctx, source, sx, dest) {
        const cell = table().cell;
        stageDots.blit(ctx, source, { x: sx, y: 0, w: cell, h: cell }, { x: Math.round(dest.x), y: Math.round(dest.y), scale: dest.scale });
    }
    /** 시전 오라(js/canvas-stage-skill-sigil.js): 주문을 쓰는 예비 동작 동안 몸의 테두리에 속성 색이 돈다. 바깥 두 도트는 옅게, 안쪽 한 도트는 또렷하게. */
    function drawAura(ctx, img, pose, dest) {
        const colour = typeof stageSkillSigil === 'object' ? stageSkillSigil.aura() : null;
        if (!colour) return;
        const rim = silhouette(img, pose.frame, colour), alpha = ctx.globalAlpha;
        ctx.globalAlpha = alpha * 0.45;
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2]]) blit(ctx, rim, 0, { ...dest, x: dest.x + dx * dest.scale, y: dest.y + dy * dest.scale });
        ctx.globalAlpha = alpha;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blit(ctx, rim, 0, { ...dest, x: dest.x + dx * dest.scale, y: dest.y + dy * dest.scale });
    }
    function drawOutline(ctx, img, pose, dest, look) {
        if (!look || !look.outline) return;
        const rim = silhouette(img, pose.frame, look.outline), step = table().hit.outlinePx * dest.scale;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) blit(ctx, rim, 0, { ...dest, x: dest.x + dx * step, y: dest.y + dy * step });
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
    /** Where the figure lands: its scale, the side it faces, the mirror axis and the cell's top-left corner on screen.
     * A hit sets it back a little, away from where it faces. */
    function placeFigure(x, y, state, look) {
        const data = table(), scale = scaleFor(state.tile), left = turn(poseDirection(state));
        const axis = x + (look ? look.back * scale * (left ? 1 : -1) : 0);
        return { scale, left, axis, alpha: Math.max(0, Math.min(1, state.alpha ?? 1)),
            dest: { x: axis - (data.centerX + 0.5) * scale, y: y - data.feetY * scale, scale } };
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x feet x (CSS px)
     * @param {number} y feet y (CSS px)
     * @param {{classId:string, stance:string, tile:number, facing:string, moving?:boolean, moveRate?:number, moveDirection?:string,
     *   attack?:?object, spell?:boolean, throwsWeapon?:boolean, hurtAt?:?number, downProgress?:?number, alpha?:number}} state
     * @param {number} now visual clock
     * @returns {boolean} false when the set is not ready (the caller falls back to the other sprite sets)
     */
    function drawStageHero(ctx, x, y, state, now) {
        const set = setOf(state.classId, state.stance);
        if (!set || !isReady(state.classId, state.stance)) return false;
        const look = hitLook(state, now), pose = heldPose(look) || pickPose(set, state, now);
        const figure = placeFigure(x, y, state, look);
        ctx.save();
        drawShadow(ctx, x, y, figure.scale, 0.28 * figure.alpha);
        if (figure.left) { ctx.translate(figure.axis * 2, 0); ctx.scale(-1, 1); }
        ctx.globalAlpha = figure.alpha;
        if (!look || !look.outline) drawAura(ctx, image(pose.clip.file), pose, figure.dest);
        drawOutline(ctx, image(pose.clip.file), pose, figure.dest, look);
        blit(ctx, image(pose.clip.file), pose.frame * table().cell, figure.dest);
        ctx.restore();
        body = { now, pose, headY: y - headroom(set) * figure.scale };
        return true;
    }
    /** CSS y of the top of the head drawn this frame (overhead bars sit above it), or null when the stage hero was not drawn. */
    function headY(now) { return body && body.now === now ? body.headY : null; }

    /** 주인공 그림이 지금 보는 쪽: 1 오른쪽, -1 왼쪽. */
    const facing = () => (facingLeft ? -1 : 1);
    return { drawPlayer: drawStageHero, headY, isReady, stanceFor, scaleFor, available, facing };
})();

const sides = new WeakMap();
/** A local test page opened with ?stage=1 (the launcher's stage entry) starts on the stage without touching the save. */
const stageByAddress = typeof location === 'object' && ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
    && new URLSearchParams(location.search).get('stage') === '1';
/** The side-view stage (data/stage-view.js): whether the battlefield is drawn that way, and the numbers that follow from it. */
const stageView = Object.freeze({
    /** settings.battleView 'stage' turns it on and 'top' turns it off; with neither, the address decides. The art must be there. */
    wanted() {
        const choice = typeof game === 'object' && game.settings ? game.settings.battleView : '';
        return choice === 'stage' || (stageByAddress && choice !== 'top');
    },
    enabled: () => stageView.wanted() && stageActors.available(),
    /** 무대 시험판으로 연 창인가(주소에 stage=1). 방 단위 지도는 이 창에서만 만들고, 이 창은 클라우드 저장을 쓰지 않는다. */
    trial: () => stageByAddress,
    /** 새 탐험을 방 단위 지도로 여는가(js/act-exploration-doors.js): 시험판 창에서 무대가 켜져 있고 테스트 패널에서 끄지 않았을 때. */
    rooms: () => stageByAddress && stageView.enabled() && !!game.settings && game.settings.stageRooms !== 'off',
    /** 방을 배경 그림으로 그리는가(js/canvas-stage-backdrop.js): 테스트 패널에서 끄면 벽돌 뒷벽으로 돌아간다. */
    backdrops: () => typeof game === 'object' && !!game.settings && game.settings.stageBackdrop !== 'off',
    /** Screen height of one depth cell ÷ its width: STAGE_VIEW.depth on the stage, 1 on the top-down field. */
    depth: () => (stageView.enabled() ? STAGE_VIEW.depth : 1),
    /** Cell width of an exploration map on the stage: the view's width shared among STAGE_VIEW.minColumns cells, so the same
     * stretch of a room shows at any window size (a whole number of px, and no smaller than minDot per character dot).
     * settings.stageZoom (test panel) sets the dots per pixel directly. */
    tile(width) {
        const rule = STAGE_VIEW.minColumns, columns = width < rule.narrowBelow ? rule.narrow : rule.wide;
        const dots = Number(game.settings.stageZoom) || Math.max(STAGE_VIEW.minDot, Math.floor(width / columns) / STAGE_VIEW.heroTile);
        return STAGE_VIEW.heroTile * dots;
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
// 시험판 창은 그림이 있는지 미리 물어 둔다: 첫 탐험을 열 때(방 단위 지도를 고를 때) 이미 답이 와 있도록.
if (stageByAddress) stageActors.available();
safeExposeGlobals({ stageActors, stageView });
