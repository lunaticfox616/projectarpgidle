/** 옆에서 보는 무대의 몬스터 새 그림 (data/monster-stage-roster.js, docs/stage-view-20261011.md).
 * 몬스터마다 걷기와 공격 두 장을 쓴다. 공격은 앞서와 같은 규칙으로 타격 프레임을 때린 순간에 맞춘다(js/canvas-monster-actors.js).
 * 걷는 모습은 두 가지다(settings.stageMonsterWalk, 테스트 패널에서 바꾼다):
 *   clip  걷기 그림을 돌린다. 프레임은 그림마다 정해진 대로 걸어온 거리(js/canvas-stage-stride.js: 걸음이 빠르면 빨리 돈다)나
 *         시간(영상에서 뽑은 그림: 만든 빠르기 그대로)으로 고른다.
 *   code  걷기 그림을 쓰지 않는다. 서 있는 그림 한 장을 걸음마다 한쪽으로 기울이고 살짝 띄워 걷는 척한다.
 *         통통 뛰는 몬스터는 늘었다 눌리며 뛰고, 기어가는 몬스터는 늘었다 줄며 간다.
 * 걷기 그림이 한 장뿐인 몬스터(외형만 고른 것)는 늘 걷는 척한다. 공격 그림이 없는 몬스터는 서 있는 그림을 뒤로 뺐다 앞으로 내밀어 때린다.
 * 떠서 움직이는 몬스터(날기, 떠다니기, 헤엄)는 다리가 없어 두 방식이 같다: 걷기 그림(날갯짓)을 늘 돌린다.
 * 서 있을 때는 서 있는 그림에 숨을 쉬듯 윗몸만 한 도트 오르내린다. 움직임은 모두 그림의 도트 단위다(기울임도 줄을 한 도트씩 민다).
 * 그림은 보이는 몬스터 것만 들고 있는다. 그리기만 하고 전투 상태는 바꾸지 않는다.
 */
const stageRoster = (() => {
    const KEEP = 20;                 // 들고 있는 그림 묶음 수(넘으면 한동안 안 쓴 것부터 놓는다. 화면에 나와 있는 묶음은 넘어도 놓지 않는다)
    const TINT_PIXELS = 1024 * 1024; // 한 가지 색으로 칠한 프레임(테 색, 맞았을 때의 흰빛): RGBA 합계 4MB, 최대 256장
    const BREATH_MS = 1700;          // 숨 한 번
    const HANG_DOTS = 4, HANG_MS = 2300;   // 그림이 한 장뿐인 떠 있는 몬스터가 오르내리는 높이(도트)와 한 번에 걸리는 시간
    const FLASH = '#fff4df';
    const RIM = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]), RIM_NONE = Object.freeze([0, 0]);
    const AIRBORNE = Object.freeze(['fly', 'float', 'swim']);
    /** 공격 그림이 없는 몬스터의 공격: 프레임 시간, 타격 프레임, 프레임마다 앞으로 내미는 거리(몸 너비 80도트 기준, 도트). */
    const MADE_STRIKE = Object.freeze({ attackMs: Object.freeze([110, 90, 70, 100, 150]), impactFrame: 2 });
    const MADE_REACH = Object.freeze([-2, -4, 9, 5, 1]);
    /** 그 공격에서 몸이 기우는 몫(프레임마다): 뒤로 젖혔다가 앞으로 숙이며 내민다. 가장 많이 기울 때 머리가 MADE_LEAN_DOTS 도트쯤 나간다
     * (2026-10-13: 한 장뿐인 보스가 선 채로 밀려 나갔다 돌아오기만 해서 때리는 것으로 읽히지 않았다). */
    const MADE_LEAN = Object.freeze([-0.4, -0.8, 1, 0.5, 0.1]), MADE_LEAN_DOTS = 12;
    const sheets = new Map();
    const scales = new Map();        // 외형 id → 그리는 배율
    const FRAME_PIXELS = 2 * 1024 * 1024; // Immutable composed poses: at most 8 MB of RGBA and 160 entries.
    // 세 캐시 모두 방금까지 쓰인 그림은 놓지 않는다(js/canvas-stage-cache.js): 자리가 없으면 새 그림은 들이지 않고 그 자리에서 그린다.
    const shrink = canvas => { canvas.width = canvas.height = 1; };
    const tints = stageCache.stageCacheOf({ pixels: TINT_PIXELS, entries: 256, hotMs: stageCache.HOT_MS }, shrink);
    const frames = stageCache.stageCacheOf({ pixels: FRAME_PIXELS, entries: 160, hotMs: stageCache.HOT_MS }, pose => shrink(pose.canvas));
    let tick = 0;                    // 지금 그리는 때(performance.now): 캐시와 그림 묶음이 방금 쓰인 것을 가린다
    let work = null, tintWork = null;

    const table = () => (typeof MONSTER_STAGE_ROSTER === 'object' ? MONSTER_STAGE_ROSTER : null);
    const settings = () => (typeof game === 'object' && game.settings) || {};
    const ready = image => image.complete && image.naturalWidth > 0;
    const failed = image => image.complete && image.naturalWidth === 0;
    const frac = value => value - Math.floor(value);
    const sum = list => list.reduce((total, value) => total + value, 0);
    const seedOf = enemy => Math.abs(enemy.id || 0);

    /** The roster actor an enemy shows: the look picked in the test panel, its own look (or the look it wears for now,
     * data wears), or (a story boss) its asset key. */
    function actorFor(enemy) {
        const data = table();
        if (!data) return null;
        const look = enemy.spriteVariantId || enemy.monsterVisualId;
        const own = data.actors[data.wears[look] || look] || data.actors[enemy.bossAssetKey];
        return data.actors[settings().stageMonsterLook] || own || null;
    }
    function load(file) {
        const image = new Image();
        image.decoding = 'async';
        image.src = `${table().path}${file}?v=${table().version}`;
        return image;
    }
    /** Past KEEP sheets, lets go of the ones not drawn for a while, longest ago first. Sheets on screen stay whatever their
     * number: dropping one meant fetching and decoding it again on the next frame. Their painted frames and composed poses stay
     * in their own caches (the pictures are the same when the sheet comes back) until those need the room. */
    function trim() {
        if (sheets.size <= KEEP) return;
        const idle = [...sheets].filter(entry => tick - entry[1].at > stageCache.HOT_MS).sort((a, b) => a[1].at - b[1].at);
        for (const [id, pair] of idle.slice(0, sheets.size - KEEP)) {
            pair.walk.src = '';
            if (pair.attack) pair.attack.src = '';
            sheets.delete(id);
        }
    }
    /** { walk, attack } once the sheets decode (attack is null for an actor without attack art), 'loading' meanwhile, null
     * when a file is missing (the older art draws instead). */
    function pairOf(actor) {
        let pair = sheets.get(actor.id);
        if (!pair) {
            // 쓴 때를 적고 나서 묶음을 줄인다: 0으로 넣고 줄이면 방금 넣은 묶음이 가장 오래된 것으로 뽑혀 바로 버려졌고, 그림을 비운
            // 묶음은 '불러오지 못함'으로 읽혀 그 몬스터가 예전 그림으로 그려졌다(2026-10-13: 한 번의 플레이에서 열다섯 번째 모습부터 모두).
            pair = { walk: load(actor.id + '-walk.png'), attack: actor.attackMs ? load(actor.id + '-attack.png') : null, failed: false, at: tick };
            sheets.set(actor.id, pair);
            trim();
        }
        pair.at = tick;
        if (failed(pair.walk) || (pair.attack && failed(pair.attack))) pair.failed = true;
        if (pair.failed) return null;
        return ready(pair.walk) && (!pair.attack || ready(pair.attack)) ? pair : 'loading';
    }

    /** How a walker moves without walk frames, t = dots walked. hop: dots off the ground. lean: dots a row slides per dot of
     * height (the trunk tips one way on each step). sx, sy: stretch about the feet. */
    const FAKE = Object.freeze({
        legs(actor, t) {
            const swing = Math.sin(Math.PI * t / (actor.stride / 2)), lift = Math.max(1, Math.min(5, Math.round(actor.height * 0.04)));
            return { hop: Math.round(lift * Math.abs(swing)), lean: swing * Math.min(0.09, 5 / actor.height) };
        },
        hop(actor, t) {
            const u = frac(t / actor.stride), stretch = 1 + 0.18 * Math.sin(2 * Math.PI * u);
            return { hop: Math.round(actor.height * 0.32 * Math.sin(Math.PI * u)), sx: 1 / stretch, sy: stretch };
        },
        crawl(actor, t) {
            const stretch = 1 + 0.09 * Math.sin(2 * Math.PI * t / actor.stride);
            return { sx: stretch, sy: 1 / stretch };
        }
    });
    /** The frame an actor stands on: its attack's first frame (the ready pose), or its walk's when it has no attack art. */
    const rest = actor => (actor.attackMs ? { clip: 'attack', index: 0 } : { clip: 'walk', index: 0 });
    /** The walk clip's frame: by the clock for clips made to play at their own pace and for monsters that fly, else by the
     * dots walked (a loop per stride). */
    function walkFrame(enemy, actor, p) {
        if (AIRBORNE.includes(actor.gait) || actor.pace === 'time') return monsterActors.frameAt(actor.walkMs, (p.now + seedOf(enemy) * 137) % sum(actor.walkMs));
        return Math.floor(frac(stageStride.walked(enemy, p.now) / actor.stride) * actor.walkMs.length);
    }
    /** The strike or its wind-up: from the attack sheet, or (no attack art) the standing frame drawn back and thrust forward. */
    function striking(enemy, actor, p) {
        const strike = monsterActors.attackFrame(enemy, actor.attackMs ? actor : MADE_STRIKE, p.now, p.moving);
        if (!strike) return null;
        if (actor.attackMs) return { clip: 'attack', index: strike.index, hop: strike.bob };
        return { ...rest(actor), hop: strike.bob, nudge: Math.round(MADE_REACH[strike.index] * Math.max(0.6, Math.min(2.5, actor.width / 80))),
            lean: MADE_LEAN[strike.index] * Math.min(0.1, MADE_LEAN_DOTS / actor.height) };
    }
    /** Walking: by code when asked or when there is only one picture, else the walk clip. */
    function walking(enemy, actor, p) {
        const fake = (actor.still || settings().stageMonsterWalk === 'code') && FAKE[actor.gait];
        return fake ? { ...rest(actor), ...fake(actor, stageStride.walked(enemy, p.now)) } : { clip: 'walk', index: walkFrame(enemy, actor, p) };
    }
    /** An airborne actor with one picture has no wing or drift clip to run: it hangs in the air, rising and sinking a few dots. */
    const hangs = actor => actor.still && AIRBORNE.includes(actor.gait);
    const hangLift = (enemy, p) => Math.round(HANG_DOTS * (0.5 + 0.5 * Math.sin((p.now + seedOf(enemy) * 211) * 2 * Math.PI / HANG_MS)));
    /** { clip, index, hop, lean, sx, sy, breath, nudge }: the strike, else hanging in the air or flying on, else walking, else
     * standing with a breath. */
    function poseOf(enemy, actor, p) {
        const strike = striking(enemy, actor, p), lift = hangs(actor) ? hangLift(enemy, p) : 0;
        if (strike) return lift ? { ...strike, hop: (strike.hop || 0) + lift } : strike;
        if (hangs(actor)) return { ...rest(actor), hop: lift };
        if (AIRBORNE.includes(actor.gait)) return { clip: 'walk', index: walkFrame(enemy, actor, p) };
        if (p.moving) return walking(enemy, actor, p);
        return { ...rest(actor), breath: frac((p.now + seedOf(enemy) * 211) / BREATH_MS) < 0.45 };
    }

    /** The working surface (the art's own dots, one dot = one px), cleared for a picture of this size. */
    function surface(width, height) {
        if (!work) work = document.createElement('canvas');
        if (work.width < width) work.width = width;
        if (work.height < height) work.height = height;
        const ctx = work.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, width, height);
        return ctx;
    }
    /** One frame painted one colour (the rim, the flash of a hit): the frame's own cell only, kept in a cache capped by area.
     * A whole painted sheet per colour used to be kept with every pair (50 MB after eight regions). When everything kept is
     * on screen the frame is painted on a scratch surface and not kept. The frame sits at the canvas's top left. */
    function tintedFrame(pair, actor, pose, colour) {
        const key = `${actor.id}|${pose.clip}|${pose.index}|${colour}`, kept = tints.cachedValue(key, tick);
        if (kept) return kept;
        const pixels = actor.w * actor.h, keeping = tints.cacheRoomFor(pixels, tick);
        const canvas = keeping ? document.createElement('canvas') : (tintWork || (tintWork = document.createElement('canvas')));
        canvas.width = actor.w;    // 크기를 넣으면 비워진다
        canvas.height = actor.h;
        const ctx = canvas.getContext('2d'), cell = cellOf(actor, pose);
        ctx.drawImage(pair[pose.clip], cell.x, cell.y, actor.w, actor.h, 0, 0, actor.w, actor.h);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = colour;
        ctx.fillRect(0, 0, actor.w, actor.h);
        if (keeping) tints.cacheKeep(key, canvas, pixels, tick);
        return canvas;
    }
    /** The frame's rows in bands, each slid sideways by whole dots (more the higher it is), or with the upper body a dot lower. */
    function bands(actor, pose) {
        if (pose.breath) { const cut = Math.max(1, actor.feet[1] - Math.round(actor.height * 0.55)); return [[0, cut, 0, 1], [cut, actor.h, 0, 0]]; }
        if (!pose.lean) return [[0, actor.h, 0, 0]];
        const list = [];
        for (let y = 0, from = 0; y <= actor.h; y++) {
            const slide = row => Math.round(pose.lean * (actor.feet[1] - row));
            if (y < actor.h && slide(y) === slide(from)) continue;
            list.push([from, y, slide(from), 0]);
            from = y;
        }
        return list;
    }
    /** Room around the cell (dots) for what the pose pushes out of it: the lean at the top, the stretch, the rim. */
    function padFor(actor, pose) {
        const lean = Math.abs(pose.lean || 0) * Math.max(actor.h, actor.feet[1]);
        const stretch = pose.sx ? Math.max(actor.w * Math.abs(pose.sx - 1), actor.feet[1] * Math.abs(pose.sy - 1)) : 0;
        return 2 + Math.ceil(Math.max(lean, stretch));
    }
    /** Stamps the bands of one frame from `image` (a sheet, or a one-colour copy of the frame: then frame.x and y are 0), moved
     * by `shift` dots. */
    function stamp(ctx, image, frame, shift) {
        for (const [from, until, dx, dy] of frame.rows) {
            ctx.drawImage(image, frame.x, frame.y + from, frame.w, until - from, frame.pad + dx + shift[0], frame.pad + from + dy + shift[1], frame.w, until - from);
        }
    }
    /** Where a clip's frame sits in its sheet (a grid, `cols` to a row). */
    function cellOf(actor, pose) {
        const cols = pose.clip === 'attack' ? actor.attackCols : actor.walkCols;
        return { x: (pose.index % cols) * actor.w, y: Math.floor(pose.index / cols) * actor.h };
    }
    /** The pose on the working surface: the rim (the silhouette a dot out on four sides), the frame, and over it the pale
     * flash of a hit. Returns the size drawn and the room left around the cell (dots). */
    function compose(pair, actor, pose, look) {
        const pad = padFor(actor, pose), width = actor.w + pad * 2, height = actor.h + pad * 2, ctx = surface(width, height);
        const fx = pad + actor.feet[0], fy = pad + actor.feet[1], frame = { ...cellOf(actor, pose), w: actor.w, pad, rows: bands(actor, pose) };
        const own = { ...frame, x: 0, y: 0 }; // 한 가지 색 프레임은 제 칸만 담은 그림이다
        if (pose.sx) ctx.setTransform(pose.sx, 0, 0, pose.sy, fx - fx * pose.sx, fy - fy * pose.sy);
        if (look.outline) {
            const rim = tintedFrame(pair, actor, pose, look.outline.color);
            ctx.globalAlpha = look.outline.alpha;
            for (const shift of RIM) stamp(ctx, rim, own, shift);
            ctx.globalAlpha = 1;
        }
        stamp(ctx, pair[pose.clip], frame, RIM_NONE);
        if (look.flash > 0) {
            ctx.globalAlpha = Math.min(1, Number(look.flash));
            stamp(ctx, tintedFrame(pair, actor, pose, FLASH), own, RIM_NONE);
        }
        return { width, height, pad, canvas: ctx.canvas, fixed: false };
    }
    /** Only discrete poses recur exactly. Continuous lean, stretch and partial hit flashes keep the live working surface ('').
     * The rim is told by its colour and strength (all compose reads of it). */
    function frameKey(actor, pose, look) {
        const flash = look.flash > 0 ? Math.min(1, Number(look.flash)) : 0;
        if (pose.lean || pose.sx || (flash > 0 && flash < 1)) return '';
        const rim = look.outline ? look.outline.color + '@' + look.outline.alpha : '';
        return `${actor.id}|${pose.clip}|${pose.index}|${pose.breath ? 1 : 0}|${rim}|${flash}`;
    }
    /** Keep an immutable copy, never cache the shared mutable work canvas. Position, mirroring, alpha and scaling remain live.
     * When every kept pose is on screen the new one is drawn from the work canvas and not kept. */
    function picture(pair, actor, pose, look) {
        const key = frameKey(actor, pose, look);
        if (!key) return compose(pair, actor, pose, look);
        const kept = frames.cachedValue(key, tick);
        if (kept) return kept;
        const size = compose(pair, actor, pose, look), pixels = size.width * size.height;
        if (!frames.cacheRoomFor(pixels, tick)) return size;
        const canvas = document.createElement('canvas');
        canvas.width = size.width; canvas.height = size.height;
        canvas.getContext('2d').drawImage(size.canvas, 0, 0, size.width, size.height, 0, 0, size.width, size.height);
        const result = { ...size, canvas, fixed: true };
        frames.cacheKeep(key, result, pixels, tick);
        return result;
    }
    /** One dot of the art on screen: the character's dot size, eased in while the monster appears (a boss is not enlarged:
     * the art is already drawn at its size). */
    function dotFor(enemy, actor, p) {
        return stageActors.scaleFor(p.tile) * lookScale(actor) * (p.spawnScale || 1) / getBossDrawScale(enemy);
    }
    /** 그 외형을 그리는 배율(data/stage-view.js STAGE_MONSTER_SCALE: 외형 id의 앞머리로 정한다). 표에 없으면 1. */
    function lookScale(actor) {
        if (!scales.has(actor.id)) {
            const rule = typeof STAGE_MONSTER_SCALE === 'object' ? STAGE_MONSTER_SCALE : {}, prefix = Object.keys(rule).find(head => actor.id.startsWith(head));
            scales.set(actor.id, prefix ? rule[prefix] : 1);
        }
        return scales.get(actor.id);
    }
    function shadow(ctx, actor, p, dot, hop) {
        const air = AIRBORNE.includes(actor.gait), rx = Math.round(actor.width * (air ? 0.26 : 0.38)) - Math.min(6, hop || 0);
        stageRings.shadow(ctx, { x: p.x, y: p.y, dot }, Math.max(6, rx), air ? 0.2 : 0.34);
    }
    /** Draws a roster monster with its feet on (p.x, p.y). p as in monsterActors.draw. False → not in the roster, the stage
     * is off, or its pictures are missing here. */
    function draw(ctx, enemy, p) {
        tick = performance.now();
        const actor = stageView.enabled() ? actorFor(enemy) : null, pair = actor ? pairOf(actor) : null;
        if (!pair) return false;
        const dot = dotFor(enemy, actor, p);
        if (pair === 'loading') { shadow(ctx, actor, p, dot, 0); return true; }
        const pose = poseOf(enemy, actor, p), hop = pose.hop || 0;
        const size = picture(pair, actor, pose, { outline: getEnemyOutlineStyle(enemy), flash: p.flash });
        shadow(ctx, actor, p, dot, hop);
        noteEnemyDrawnHeight(enemy, actor.height * dot);   // 뛰는 높이는 넣지 않는다: 체력 막대가 걸음마다 따라 튄다
        ctx.save();
        if (stageView.facing(enemy, p.facing) === 'west') { ctx.translate(p.x * 2, 0); ctx.scale(-1, 1); }
        const left = monsterActors.snap(p.x - (size.pad + actor.feet[0] - (pose.nudge || 0)) * dot), top = monsterActors.snap(p.y - (size.pad + actor.feet[1] + hop) * dot);
        stageDots.blit(ctx, size.canvas, { x: 0, y: 0, w: size.width, h: size.height }, { x: left, y: top, scale: dot }, size.fixed);
        ctx.restore();
        return true;
    }
    /** The looks the test panel can pick: [id, name], by name. */
    const looks = () => (table() ? Object.values(table().actors).map(actor => [actor.id, actor.name]).sort((a, b) => a[1].localeCompare(b[1], 'ko')) : []);

    return Object.freeze({ draw, looks });
})();
safeExposeGlobals({ stageRoster });
