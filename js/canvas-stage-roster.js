/** 옆에서 보는 무대의 몬스터 새 그림 (data/monster-stage-roster.js, docs/stage-view-20261011.md).
 * 몬스터마다 걷기와 공격 두 장을 쓴다. 공격은 앞서와 같은 규칙으로 타격 프레임을 때린 순간에 맞춘다(js/canvas-monster-actors.js).
 * 걷는 모습은 두 가지다(settings.stageMonsterWalk, 테스트 패널에서 바꾼다):
 *   clip  걷기 그림을 돌린다. 프레임은 시간이 아니라 걸어온 거리로 고른다(js/canvas-stage-stride.js): 걸음이 빠르면 빨리 돈다.
 *   code  걷기 그림을 쓰지 않는다. 서 있는 그림 한 장(공격의 첫 프레임)을 걸음마다 한쪽으로 기울이고 살짝 띄워 걷는 척한다.
 *         통통 뛰는 몬스터는 늘었다 눌리며 뛰고, 기어가는 몬스터는 늘었다 줄며 간다.
 * 떠서 움직이는 몬스터(날기, 떠다니기, 헤엄)는 다리가 없어 두 방식이 같다: 걷기 그림(날갯짓)을 늘 돌린다.
 * 서 있을 때는 서 있는 그림에 숨을 쉬듯 윗몸만 한 도트 오르내린다. 움직임은 모두 그림의 도트 단위다(기울임도 줄을 한 도트씩 민다).
 * 그림은 보이는 몬스터 것만 들고 있는다. 그리기만 하고 전투 상태는 바꾸지 않는다.
 */
const stageRoster = (() => {
    const KEEP = 14;                 // 들고 있는 그림 묶음 수(넘으면 가장 오래 안 쓴 것을 놓는다)
    const BREATH_MS = 1700;          // 숨 한 번
    const FLASH = '#fff4df';
    const RIM = Object.freeze([[1, 0], [-1, 0], [0, 1], [0, -1]]), RIM_NONE = Object.freeze([0, 0]);
    const TINTS = 8;                 // 한 묶음이 들고 있는 한 가지 색 그림 수(테 색, 맞았을 때의 흰빛)
    const AIRBORNE = Object.freeze(['fly', 'float', 'swim']);
    const sheets = new Map();
    let clock = 0, work = null;

    const table = () => (typeof MONSTER_STAGE_ROSTER === 'object' ? MONSTER_STAGE_ROSTER : null);
    const settings = () => (typeof game === 'object' && game.settings) || {};
    const ready = image => image.complete && image.naturalWidth > 0;
    const failed = image => image.complete && image.naturalWidth === 0;
    const frac = value => value - Math.floor(value);
    const sum = list => list.reduce((total, value) => total + value, 0);

    /** The roster actor an enemy shows: the look picked in the test panel, its own look, or its story boss picture. */
    function actorFor(enemy) {
        const data = table();
        if (!data) return null;
        const own = data.actors[enemy.spriteVariantId || enemy.monsterVisualId] || data.actors[data.bossByAsset[enemy.bossAssetKey]];
        return data.actors[settings().stageMonsterLook] || own || null;
    }
    function load(file) {
        const image = new Image();
        image.decoding = 'async';
        image.src = table().path + file;
        return image;
    }
    /** Lets go of the sheets used longest ago. */
    function trim() {
        while (sheets.size > KEEP) {
            const [oldest] = [...sheets].reduce((least, entry) => (entry[1].used < least[1].used ? entry : least));
            const pair = sheets.get(oldest);
            pair.walk.src = '';
            pair.attack.src = '';
            sheets.delete(oldest);
        }
    }
    /** { walk, attack } once both decode, 'loading' meanwhile, null when a file is missing (the older art draws instead). */
    function pairOf(actor) {
        let pair = sheets.get(actor.id);
        if (!pair) {
            pair = { walk: load(actor.id + '-walk.png'), attack: load(actor.id + '-attack.png'), tints: new Map(), failed: false, used: 0 };
            sheets.set(actor.id, pair);
            trim();
        }
        pair.used = ++clock;
        if (failed(pair.walk) || failed(pair.attack)) pair.failed = true;
        if (pair.failed) return null;
        return ready(pair.walk) && ready(pair.attack) ? pair : 'loading';
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
    /** The walk clip's frame for the dots walked (a loop per stride), or for the time on a monster that flies. */
    function walkFrame(enemy, actor, p, walked) {
        if (AIRBORNE.includes(actor.gait)) return monsterActors.frameAt(actor.walkMs, (p.now + Math.abs(enemy.id || 0) * 137) % sum(actor.walkMs));
        return Math.floor(frac(walked / actor.stride) * actor.walkMs.length);
    }
    /** { clip, index, hop, lean, sx, sy, breath }: the strike or its wind-up, else walking (by clip or by code), else standing. */
    function poseOf(enemy, actor, p) {
        const strike = monsterActors.attackFrame(enemy, actor, p.now, p.moving);
        if (strike) return { clip: 'attack', index: strike.index, hop: strike.bob };
        const walked = stageStride.walked(enemy, p.now);
        if (AIRBORNE.includes(actor.gait)) return { clip: 'walk', index: walkFrame(enemy, actor, p, walked) };
        if (!p.moving) return { clip: 'attack', index: 0, breath: frac((p.now + Math.abs(enemy.id || 0) * 211) / BREATH_MS) < 0.45 };
        const fake = settings().stageMonsterWalk === 'code' && FAKE[actor.gait];
        return fake ? { clip: 'attack', index: 0, ...fake(actor, walked) } : { clip: 'walk', index: walkFrame(enemy, actor, p, walked) };
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
    /** A sheet painted one colour (the rim, the flash of a hit). Made once and kept with its pair. */
    function tint(pair, clip, colour) {
        const key = clip + colour;
        if (pair.tints.has(key)) return pair.tints.get(key);
        const image = pair[clip], canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = colour;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (pair.tints.size >= TINTS) pair.tints.delete(pair.tints.keys().next().value);
        pair.tints.set(key, canvas);
        return canvas;
    }
    /** The frame's rows in bands, each slid sideways by whole dots (more the higher it is), or with the upper body a dot lower. */
    function bands(actor, pose) {
        if (pose.breath) { const cut = actor.feet[1] - Math.round(actor.height * 0.55); return [[0, cut, 0, 1], [cut, actor.h, 0, 0]]; }
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
        const lean = Math.abs(pose.lean || 0) * actor.h;
        const stretch = pose.sx ? Math.max(actor.w * Math.abs(pose.sx - 1), actor.h * Math.abs(pose.sy - 1)) : 0;
        return 2 + Math.ceil(Math.max(lean, stretch));
    }
    /** Stamps the bands of one frame from `image` (a sheet, or its one-colour copy), moved by `shift` dots. */
    function stamp(ctx, image, frame, shift) {
        for (const [from, until, dx, dy] of frame.rows) {
            ctx.drawImage(image, frame.x, from, frame.w, until - from, frame.pad + dx + shift[0], frame.pad + from + dy + shift[1], frame.w, until - from);
        }
    }
    /** The pose on the working surface: the rim (the silhouette a dot out on four sides), the frame, and over it the pale
     * flash of a hit. Returns the size drawn and the room left around the cell (dots). */
    function compose(pair, actor, pose, look) {
        const pad = padFor(actor, pose), width = actor.w + pad * 2, height = actor.h + pad * 2, ctx = surface(width, height);
        const fx = pad + actor.feet[0], fy = pad + actor.feet[1], frame = { x: pose.index * actor.w, w: actor.w, pad, rows: bands(actor, pose) };
        if (pose.sx) ctx.setTransform(pose.sx, 0, 0, pose.sy, fx - fx * pose.sx, fy - fy * pose.sy);
        if (look.outline) {
            ctx.globalAlpha = look.outline.alpha;
            for (const shift of RIM) stamp(ctx, tint(pair, pose.clip, look.outline.color), frame, shift);
            ctx.globalAlpha = 1;
        }
        stamp(ctx, pair[pose.clip], frame, RIM_NONE);
        if (look.flash > 0) {
            ctx.globalAlpha = Math.min(1, Number(look.flash));
            stamp(ctx, tint(pair, pose.clip, FLASH), frame, RIM_NONE);
        }
        return { width, height, pad };
    }
    /** One dot of the art on screen: the character's dot size, eased in while the monster appears (a boss is not enlarged:
     * the art is already drawn at its size). */
    function dotFor(enemy, p) {
        return stageActors.scaleFor(p.tile) * (p.spawnScale || 1) / getBossDrawScale(enemy);
    }
    function shadow(ctx, actor, p, dot, hop) {
        const air = AIRBORNE.includes(actor.gait), rx = Math.round(actor.width * (air ? 0.26 : 0.38)) - Math.min(6, hop || 0);
        stageRings.shadow(ctx, { x: p.x, y: p.y, dot }, Math.max(6, rx), air ? 0.2 : 0.34);
    }
    /** Draws a roster monster with its feet on (p.x, p.y). p as in monsterActors.draw. False → not in the roster, the stage
     * is off, or its pictures are missing here. */
    function draw(ctx, enemy, p) {
        const actor = stageView.enabled() ? actorFor(enemy) : null, pair = actor ? pairOf(actor) : null;
        if (!pair) return false;
        const dot = dotFor(enemy, p);
        if (pair === 'loading') { shadow(ctx, actor, p, dot, 0); return true; }
        const pose = poseOf(enemy, actor, p), hop = pose.hop || 0;
        const size = compose(pair, actor, pose, { outline: getEnemyOutlineStyle(enemy), flash: p.flash });
        shadow(ctx, actor, p, dot, hop);
        noteEnemyDrawnHeight(enemy, (actor.height + hop) * dot);
        ctx.save();
        if (stageView.facing(enemy, p.facing) === 'west') { ctx.translate(p.x * 2, 0); ctx.scale(-1, 1); }
        const left = monsterActors.snap(p.x - (size.pad + actor.feet[0]) * dot), top = monsterActors.snap(p.y - (size.pad + actor.feet[1] + hop) * dot);
        stageDots.blit(ctx, work, { x: 0, y: 0, w: size.width, h: size.height }, { x: left, y: top, scale: dot });
        ctx.restore();
        return true;
    }
    /** The looks the test panel can pick: [id, name], by name. */
    const looks = () => (table() ? Object.values(table().actors).map(actor => [actor.id, actor.name]).sort((a, b) => a[1].localeCompare(b[1], 'ko')) : []);

    return Object.freeze({ draw, looks });
})();
safeExposeGlobals({ stageRoster });
