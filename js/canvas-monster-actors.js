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
    /** The sheet a monster draws from: its side-view stage sheet while the stage is on (data MONSTER_STAGE_SHEETS), else its
     * four-direction sheet. A stage sheet that failed to load is not asked for again. */
    function sheetSource(id) {
        const art = stageArt(id);
        const staged = art && stageView.enabled() && !sheets.get('stage:' + art.id)?.failed ? art : null;
        if (staged) return { key: 'stage:' + art.id, spec: staged, kind: MONSTER_STAGE_KIND };
        const spec = typeof MONSTER_SPRITE_SHEETS === 'object' ? MONSTER_SPRITE_SHEETS[id] : null;
        return spec ? { key: id, spec, kind: MONSTER_SPRITE_KINDS[spec.kind] } : null;
    }
    /** A monster's stage sheet: its own, or for a wisp look (wisp-b01 …) the sheet of its element. */
    function stageArt(id) {
        if (MONSTER_STAGE_SHEETS[id]) return MONSTER_STAGE_SHEETS[id];
        const element = typeof WISP_SPRITE_BY_VISUAL === 'object' ? WISP_SPRITE_BY_VISUAL[id] : null;
        return element ? MONSTER_STAGE_SHEETS['wisp-' + element] || null : null;
    }
    /** The loaded (or loading) sheet pair of a source. A stage pair whose file is missing is marked, so the next look
     * falls back to the four-direction sheet. */
    function pairOf(source) {
        const { key, spec } = source;
        if (!sheets.has(key)) sheets.set(key, { spec, kind: source.kind, idle: load(spec.idle), attack: load(spec.attack) });
        const pair = sheets.get(key);
        if (source.kind.stage && (failed(pair.idle) || failed(pair.attack))) pair.failed = true;
        return pair;
    }
    /** { spec, kind, idle, attack } once both sheets decode; 'loading' meanwhile; null for other enemies or a failed load. */
    function sheetFor(id) {
        let source = sheetSource(id);
        if (!source) return null;
        let pair = pairOf(source);
        if (pair.failed) {
            source = sheetSource(id);
            if (!source) return null;
            pair = pairOf(source);
        }
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
    /** { clip: 'attack', index, bob } while the strike (on the hit or release) or its wind-up (the gauge's last fifth) shows,
     * else null. kind = { attackMs, impactFrame }: a sheet kind, or a roster actor (js/canvas-stage-roster.js). */
    function attackFrame(enemy, kind, now, moving) {
        const attackMs = sum(kind.attackMs), impactMs = sum(kind.attackMs.slice(0, kind.impactFrame));
        const release = lastRelease(enemy, now, attackMs);
        if (release !== null && now - release + impactMs < attackMs) return { clip: 'attack', index: frameAt(kind.attackMs, now - release + impactMs), bob: 0 };
        const wind = windUp(enemy, moving, now);
        return wind ? { clip: 'attack', index: frameAt(kind.attackMs, wind.share * impactMs), bob: wind.bob } : null;
    }
    /** { clip, index, bob }: the strike or its wind-up, else idle (faster with a hop when walking). */
    function clipFrame(enemy, kind, now, moving) {
        const strike = attackFrame(enemy, kind, now, moving);
        if (strike) return strike;
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
        if (pair.kind.stage) return stagePlacement(pair, frame, row, p);
        const kind = pair.kind, cell = kind.frame, dot = p.tile / 16 * (p.spawnScale || 1), own = pair.spec.feet;
        const feet = (own && (own[row] || own)) || kind.feet;
        const src = [frame.index * cell, kind.rows.indexOf(row) * cell, cell, cell];
        const left = snap(p.x - feet[0] * dot), top = snap(p.y - (feet[1] + frame.bob) * dot);
        return { src, left, top, size: cell * dot, dot, rim: stageRimStep(p, dot) };
    }
    /** 테의 굵기(px). 옆에서 보는 무대에서는 예전 그림(한 도트가 화면의 여섯 px쯤으로 커진다)도 새 그림과 같이 캐릭터 도트 하나만큼만
     * 두른다: 제 도트만큼 두르면 붉은 테가 새 그림의 네 배 굵기로 나와 한 무리 안에서 따로 놀았다(2026-10-13 지하계를 돌려 본 결과). */
    const stageRimStep = (p, dot) => (stageView.enabled() ? Math.max(1, Math.round(stageActors.scaleFor(p.tile))) : dot);
    /** A stage sheet: one row facing right at the character's dot size; facing left mirrors it about the feet (mirror = that x). */
    function stagePlacement(pair, frame, row, p) {
        const cell = pair.kind.frame, dot = stageActors.scaleFor(p.tile) * (p.spawnScale || 1), feet = pair.spec.feet;
        const left = snap(p.x - feet[0] * dot), top = snap(p.y - (feet[1] + frame.bob) * dot);
        return { src: [frame.index * cell, 0, cell, cell], left, top, size: cell * dot, dot, mirror: row === 'left' ? p.x : null, stage: true };
    }
    /** One frame at its place; a stage frame goes through stageDots so its dots stay even at any size. */
    function stamp(ctx, image, at, dx = 0, dy = 0) {
        if (!at.stage) { ctx.drawImage(image, ...at.src, at.left + dx, at.top + dy, at.size, at.size); return; }
        stageDots.blit(ctx, image, { x: at.src[0], y: at.src[1], w: at.src[2], h: at.src[3] }, { x: at.left + dx, y: at.top + dy, scale: at.dot });
    }
    /** A stage frame, and over it the hit flash as a pale silhouette. */
    function drawStageFrame(ctx, image, at, flash) {
        stamp(ctx, image, at);
        if (!(flash > 0)) return;
        ctx.globalAlpha *= Math.min(1, Number(flash));
        stamp(ctx, silhouette(image, '#fff4df'), at);
    }
    function drawFrame(ctx, pair, frame, at, look) {
        const image = pair[frame.clip];
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (Number.isFinite(at.mirror)) { ctx.translate(at.mirror * 2, 0); ctx.scale(-1, 1); }
        if (look.outline) {
            const rim = silhouette(image, look.outline.color);
            ctx.globalAlpha *= look.outline.alpha;
            const step = at.rim || at.dot;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) stamp(ctx, rim, at, dx * step, dy * step);
            ctx.globalAlpha /= look.outline.alpha;
        }
        if (at.stage) drawStageFrame(ctx, image, at, look.flash);
        else drawBattleSpriteImage(ctx, image, at.src, [at.left, at.top, at.size, at.size], look.flash);
        ctx.restore();
    }
    /** The shadow under a monster: a dot ellipse on the stage (js/canvas-stage-rings.js), the soft one elsewhere. */
    function groundShadow(ctx, pair, p) {
        const share = pair === 'loading' ? 0.3 : pair.kind.shadow;
        if (pair !== 'loading' && pair.kind.stage) stageRings.shadow(ctx, { x: p.x, y: p.y, dot: stageActors.scaleFor(p.tile) }, Math.round(share * 64), 0.34);
        else drawPixelShadow(ctx, p.x, p.y + 2, p.tile * share, p.tile * 0.09, 0.2);
    }
    /** Draws a sheet monster (act monsters and roots by spriteVariantId, realm sets by monsterVisualId). On the stage a
     * monster with newer art (js/canvas-stage-roster.js: walk and attack sheets, story bosses too) draws from that first.
     * p = { x, y (feet), tile, now, facing, flash, spawnScale, moving }. False → not one of these (or its sheet failed). */
    function draw(ctx, enemy, p) {
        if (!enemy || !(p.tile > 0) || typeof Image !== 'function') return false;
        if (stageRoster.draw(ctx, enemy, p)) return true;
        const pair = sheetFor(enemy.spriteVariantId || enemy.monsterVisualId);
        if (!pair) return false;
        groundShadow(ctx, pair, p);
        if (pair === 'loading') return true;
        const frame = clipFrame(enemy, pair.kind, p.now, p.moving);
        const at = placement(pair, frame, FACING_ROW[stageView.facing(enemy, p.facing)] || 'down', p);
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

    return { draw, drawSkin, isSheetMonster, clipFrame, frameAt, attackFrame, snap };
})();
safeExposeGlobals({ monsterActors });
