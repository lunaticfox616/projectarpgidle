// 속성 위습 그리기: 인계 시트(data/wisp-sprites.js) — 대기 4프레임 반복, 공격 6프레임 1회를 16도트 칸 격자(도트 = 칸/16)로 찍는다.
// 위습은 원거리라 투사체가 떠나는 순간(combatTravel 효과 시작)에 공격 클립의 타격 프레임(3번)을 맞추고, 그 직전 공격 게이지
// 0.8→1 구간에서는 준비 프레임(0~2)을 보인다. 그림만 그린다 — 공격 판정과 시점은 전투(js/combat.js)가 가진다.
const wispActors = (() => {
    const ROWS = { north: 0, south: 1, west: 2, east: 3 };
    const ATTACK = WISP_SPRITE_CLIPS.attack, IDLE = WISP_SPRITE_CLIPS.idle;
    const sum = list => list.reduce((total, value) => total + value, 0);
    const ATTACK_MS = sum(ATTACK.durationsMs), IMPACT_MS = sum(ATTACK.durationsMs.slice(0, ATTACK.impactFrame)), IDLE_MS = sum(IDLE.durationsMs);
    const WIND_UP_FROM = 0.8;   // 공격 게이지가 이만큼 차면 준비 동작을 시작한다
    const FLOAT_TILES = 0.62;   // 몸 가운데를 발 자리에서 칸의 이만큼 위에 띄운다
    const BODY_HALF_TILES = 0.6; // 몸(14~18도트)의 절반 남짓 — 체력바를 그 위에 둔다
    let sheets = null, lastTile = 0;

    function load(src) {
        const image = new Image();
        image.decoding = 'async';
        image.src = src;
        return image;
    }
    /** All twelve sheets start loading with the first wisp; until they are decoded the atlas sprite draws instead. */
    function sheetFor(enemy) {
        if (!sheets) sheets = Object.fromEntries(Object.entries(WISP_SPRITE_SHEETS).map(([id, row]) => [id, { idle: load(row.idle), attack: load(row.attack) }]));
        const pair = sheets[WISP_SPRITE_BY_VISUAL[enemy.spriteVariantId] || WISP_SPRITE_BY_ELEMENT[enemy.ele] || 'void'];
        return pair && pair.idle.naturalWidth > 0 && pair.attack.naturalWidth > 0 ? pair : null;
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
    function isRelease(fx, enemy) {
        if (fx.type === 'combatTravel') return fx.owner === 'enemy' && fx.sourceId === enemy.id;
        return fx.type === 'enemyAttack' && fx.enemyId === enemy.id;
    }
    /** When this wisp last let fly (visual ms), within one attack clip; null otherwise. */
    function lastRelease(enemy, now) {
        let found = null;
        for (const fx of battleFx) {
            if (!fx || now - fx.start > ATTACK_MS || !isRelease(fx, enemy)) continue;
            if (found === null || fx.start > found) found = fx.start;
        }
        return found;
    }
    /** { clip, index }: strike on the release, wind-up while the gauge fills its last fifth, otherwise the idle loop. */
    function clipFrame(enemy, now) {
        const release = lastRelease(enemy, now);
        if (release !== null && now - release + IMPACT_MS < ATTACK_MS) return { clip: 'attack', index: frameAt(ATTACK.durationsMs, now - release + IMPACT_MS) };
        const gauge = Number(enemy.attackTimer);
        if (gauge >= WIND_UP_FROM && gauge < 1) return { clip: 'attack', index: frameAt(ATTACK.durationsMs, (gauge - WIND_UP_FROM) / (1 - WIND_UP_FROM) * IMPACT_MS) };
        return { clip: 'idle', index: frameAt(IDLE.durationsMs, (now + Math.abs(enemy.id) * 137) % IDLE_MS) };
    }
    function snap(value) {
        const scale = typeof uiDisplay === 'object' ? uiDisplay.battleRenderScale : 1;
        return Math.round(value * scale) / scale;
    }
    /** Elites keep their trait colour as a thin ring under the body (the atlas sprite used an outline). */
    function eliteRing(ctx, enemy, at, tile) {
        if (!enemy.isElite) return;
        ctx.save();
        ctx.globalAlpha *= 0.85;
        ctx.strokeStyle = enemy.traitOutlineColor || '#e2b94f';
        ctx.lineWidth = Math.max(1, tile / 24);
        ctx.beginPath();
        ctx.ellipse(at.x, at.y, tile * 0.3, tile * 0.11, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    /** How far above the feet the field HP bar sits for a wisp drawn from these sheets (0 → use the default height). */
    function barLift(enemy) {
        if (!enemy || enemy.monsterArchetype !== 'wisp' || !lastTile || !sheets) return 0;
        return Math.round(lastTile * (FLOAT_TILES + BODY_HALF_TILES) + 8);
    }
    /** Draws a wisp enemy. p = { x, y (feet), tile, now, facing, flash, spawnScale }. False → not a wisp or not loaded yet. */
    function draw(ctx, enemy, p) {
        if (!enemy || enemy.monsterArchetype !== 'wisp' || !(p.tile > 0) || typeof Image !== 'function') return false;
        const pair = sheetFor(enemy);
        if (!pair) return false;
        lastTile = p.tile;
        const frame = clipFrame(enemy, p.now), row = ROWS[p.facing] ?? ROWS.south, size = WISP_SPRITE_FRAME * p.tile / 16 * (p.spawnScale || 1);
        const left = snap(p.x - size / 2), top = snap(p.y - p.tile * FLOAT_TILES - size / 2), source = [frame.index * WISP_SPRITE_FRAME, row * WISP_SPRITE_FRAME, WISP_SPRITE_FRAME, WISP_SPRITE_FRAME];
        drawPixelShadow(ctx, p.x, p.y + 2, p.tile * 0.18, p.tile * 0.07, 0.2);
        eliteRing(ctx, enemy, { x: p.x, y: p.y + 2 }, p.tile);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        drawBattleSpriteImage(ctx, pair[frame.clip], source, [left, top, size, size], p.flash);
        ctx.restore();
        return true;
    }

    return { draw, barLift, clipFrame, frameAt };
})();
safeExposeGlobals({ wispActors });
