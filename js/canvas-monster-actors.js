// 액트 몬스터 · 뿌리촉수 · 영역 몬스터 그리기(data/monster-sprites.js): 대기 반복 · 공격 1회를 16도트 칸 격자(도트 = 칸/16)로 찍는다.
// 공격 클립의 타격 프레임을 실제로 때린 순간(근접 enemyAttack 효과) 또는 투사체가 떠난 순간(원거리 combatTravel 효과, 보스는 bossRelease)에
// 맞추고, 공격 게이지 0.8→1 구간에서는 준비 프레임을 보인다. 걷는 동안은 대기를 빠르게 돌리며 한 도트씩 튄다(걷기 그림 없음).
// 테두리는 주인공처럼 그림 실루엣을 한 도트씩 네 방향으로 찍는다(색 = getEnemyOutlineStyle). 그림만 그린다.
const monsterActors = (() => {
    const FACING_ROW = { north: 'up', south: 'down', west: 'left', east: 'right' };
    const WIND_UP_FROM = 0.8;      // 공격 게이지가 이만큼 차면 준비 동작을 시작한다
    const WALK_SPEED = 1.8;        // 걷는 동안 대기 동작을 이만큼 빠르게
    const SILHOUETTE_LIMIT = 48;
    const sum = list => list.reduce((total, value) => total + value, 0);
    const sheets = new Map(), silhouettes = new Map();

    function load(src) {
        const image = new Image();
        image.decoding = 'async';
        image.src = src;
        return image;
    }
    const ready = image => image.complete && image.naturalWidth > 0;
    const failed = image => image.complete && image.naturalWidth === 0;
    /** { spec, kind, idle, attack } once both sheets decode; 'loading' meanwhile; null for other enemies or a failed load. */
    function sheetFor(id) {
        const spec = typeof MONSTER_SPRITE_SHEETS === 'object' ? MONSTER_SPRITE_SHEETS[id] : null;
        if (!spec) return null;
        if (!sheets.has(id)) sheets.set(id, { spec, kind: MONSTER_SPRITE_KINDS[spec.kind], idle: load(spec.idle), attack: load(spec.attack) });
        const pair = sheets.get(id);
        if (failed(pair.idle) || failed(pair.attack)) return null;
        return ready(pair.idle) && ready(pair.attack) ? pair : 'loading';
    }
    /** Frame index for elapsed ms inside a clip (the last frame holds). */
    function frameAt(durations, ms) {
        let rest = ms;
        for (let index = 0; index < durations.length; index++) {
            if (rest < durations[index]) return index;
            rest -= durations[index];
        }
        return durations.length - 1;
    }
    /** A boss strikes once, when it lets the attack go (bossRelease, 2026-10-06): a shot used to strike again when it landed
     * and a dodged area special never struck at all. Other monsters strike on the hit or the shot leaving. */
    function isRelease(fx, enemy) {
        if (enemy.isBoss) return fx.type === 'bossRelease' && fx.enemyId === enemy.id;
        if (fx.type === 'combatTravel') return fx.owner === 'enemy' && fx.sourceId === enemy.id;
        return fx.type === 'enemyAttack' && fx.enemyId === enemy.id;
    }
    function lastRelease(enemy, now, clipMs) {
        let found = null;
        for (const fx of battleFx) {
            if (!fx || now - fx.start > clipMs || !isRelease(fx, enemy)) continue;
            if (found === null || fx.start > found) found = fx.start;
        }
        return found;
    }
    /** 0..1 through the wind-up: the gauge's last fifth, or a boss's warning (its gauge waits at 1 for the warning to run out,
     * so it fell back to idle before), trembling a dot at the end. null → not winding up. */
    function windUp(enemy, moving, now) {
        if (moving) return null;
        const warning = enemy.isBoss ? bossAttackView.warningShare(enemy) : null;
        if (warning !== null) return { share: Math.min(0.999, warning), bob: warning > 0.6 ? Math.floor(now / 70) % 2 : 0 };
        const gauge = Number(enemy.attackTimer);
        return gauge >= WIND_UP_FROM && gauge < 1 ? { share: (gauge - WIND_UP_FROM) / (1 - WIND_UP_FROM), bob: 0 } : null;
    }
    /** { clip, index, bob }: strike on the hit or release, wind-up while the gauge fills its last fifth, else idle (faster with a hop when walking). */
    function clipFrame(enemy, kind, now, moving) {
        const attackMs = sum(kind.attackMs), impactMs = sum(kind.attackMs.slice(0, kind.impactFrame));
        const release = lastRelease(enemy, now, attackMs);
        if (release !== null && now - release + impactMs < attackMs) return { clip: 'attack', index: frameAt(kind.attackMs, now - release + impactMs), bob: 0 };
        const wind = windUp(enemy, moving, now);
        if (wind) return { clip: 'attack', index: frameAt(kind.attackMs, wind.share * impactMs), bob: wind.bob };
        const speed = moving ? WALK_SPEED : 1, idleMs = sum(kind.idleMs);
        const index = frameAt(kind.idleMs, (now * speed + Math.abs(enemy.id || 0) * 137) % idleMs);
        return { clip: 'idle', index, bob: moving && index % 2 === 1 ? 1 : 0 };
    }
    function snap(value) {
        const scale = typeof uiDisplay === 'object' ? uiDisplay.battleRenderScale : 1;
        return Math.round(value * scale) / scale;
    }
    /** The sheet with every opaque pixel painted one colour (cached per sheet and colour). */
    function silhouette(image, colour) {
        const key = image.src + '|' + colour;
        if (silhouettes.has(key)) return silhouettes.get(key);
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const c = canvas.getContext('2d');
        c.drawImage(image, 0, 0);
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = colour;
        c.fillRect(0, 0, canvas.width, canvas.height);
        silhouettes.set(key, canvas);
        if (silhouettes.size > SILHOUETTE_LIMIT) silhouettes.delete(silhouettes.keys().next().value);
        return canvas;
    }
    /** Where one frame lands: source rect in the sheet and destination box (feet on (x, y)). A sheet may set its own feet,
     * one pair for every direction or one per direction. */
    function placement(pair, frame, row, p) {
        const kind = pair.kind, cell = kind.frame, dot = p.tile / 16 * (p.spawnScale || 1), own = pair.spec.feet;
        const feet = (own && (own[row] || own)) || kind.feet;
        const src = [frame.index * cell, kind.rows.indexOf(row) * cell, cell, cell];
        const left = snap(p.x - feet[0] * dot), top = snap(p.y - (feet[1] + frame.bob) * dot);
        return { src, left, top, size: cell * dot, dot };
    }
    function stamp(ctx, image, at, dx = 0, dy = 0) {
        ctx.drawImage(image, ...at.src, at.left + dx, at.top + dy, at.size, at.size);
    }
    function drawFrame(ctx, pair, frame, at, look) {
        const image = pair[frame.clip];
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (look.outline) {
            const rim = silhouette(image, look.outline.color);
            ctx.globalAlpha *= look.outline.alpha;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) stamp(ctx, rim, at, dx * at.dot, dy * at.dot);
            ctx.globalAlpha /= look.outline.alpha;
        }
        drawBattleSpriteImage(ctx, image, at.src, [at.left, at.top, at.size, at.size], look.flash);
        ctx.restore();
    }
    /** Draws a sheet monster (act monsters and roots by spriteVariantId, realm sets by monsterVisualId).
     * p = { x, y (feet), tile, now, facing, flash, spawnScale, moving }. False → not one of these (or its sheet failed). */
    function draw(ctx, enemy, p) {
        if (!enemy || !(p.tile > 0) || typeof Image !== 'function') return false;
        const pair = sheetFor(enemy.spriteVariantId || enemy.monsterVisualId);
        if (!pair) return false;
        drawPixelShadow(ctx, p.x, p.y + 2, p.tile * (pair === 'loading' ? 0.3 : pair.kind.shadow), p.tile * 0.09, 0.2);
        if (pair === 'loading') return true;
        const frame = clipFrame(enemy, pair.kind, p.now, p.moving);
        const at = placement(pair, frame, FACING_ROW[p.facing] || 'down', p);
        noteEnemyDrawnHeight(enemy, (pair.spec.height + frame.bob) * at.dot);
        drawFrame(ctx, pair, frame, at, { outline: getEnemyOutlineStyle(enemy), flash: p.flash });
        return true;
    }
    /** The player wearing a collected monster look: the idle loop with the hero's cream rim (so it never reads as an enemy).
     * False → not a sheet monster or not loaded yet. */
    function drawSkin(ctx, id, p) {
        const pair = sheetFor(id);
        if (!pair || pair === 'loading' || !(p.tile > 0)) return false;
        drawPixelShadow(ctx, p.x, p.y + 2, p.tile * pair.kind.shadow, p.tile * 0.09, 0.2);
        const frame = clipFrame({ id: 0 }, pair.kind, p.now, p.moving);
        drawFrame(ctx, pair, frame, placement(pair, frame, FACING_ROW[p.facing] || 'right', p), { outline: BATTLE_SPRITE_OUTLINES.hero, flash: p.flash });
        return true;
    }
    const isSheetMonster = id => typeof MONSTER_SPRITE_SHEETS === 'object' && !!MONSTER_SPRITE_SHEETS[id];

    return { draw, drawSkin, isSheetMonster, clipFrame, frameAt };
})();
safeExposeGlobals({ monsterActors });
