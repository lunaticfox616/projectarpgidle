/** Battle units on the field: the player figure (the side-view stage sheets when the stage is on, else Hana +6 sheets with the
 * legacy strip as fallback) and the summons
 * (wisps from their own sheets, js/canvas-hana-actors.js; the guard golem from the legacy summon1.png frame).
 * Split out of canvas-battlefield.js along the unit-drawing boundary; renderBattlefield still decides when they draw
 * (drawBattlePlayerActor → drawBattlePlayerFigure, drawBattleGroundLayer → drawActiveSummons). Rendering only.
 */

function canDrawHanaPlayer() {
    if (typeof hanaActors !== 'object' || game.settings?.heroSpriteSet === 'legacy') return false;
    return hanaActors.isReady(getHeroAppearanceId());
}

/** The stance the stage hero holds: the worn weapon's (settings.stageStance forces one from the test panel). */
function getStageHeroStance() {
    return stageActors.stanceFor(game.equipment?.['무기'], game.settings?.stageStance || 'auto', !!game.equipment?.['방패']);
}

/** The side-view stage draws its own hero (js/canvas-stage-actors.js) once the worn class × stance sheets have loaded. */
function canDrawStagePlayer() {
    return stageView.enabled() && stageActors.isReady(getHeroAppearanceId(), getStageHeroStance());
}

/** The hero's head top drawn this frame, whichever sprite set drew it (null: neither did). */
function getHeroHeadY(now) {
    return stageActors.headY(now) ?? hanaActors.headY(now);
}

/** Legacy strips face east and are mirrored for west poses; stage, Hana and monster sheets turn by themselves. */
function isBattlePlayerMirrored(motion) {
    if (canDrawStagePlayer() || canDrawHanaPlayer()) return false;
    let pose = motion.facingDirection || motion.attackDirection || 'east';
    return motion.advanceBlend <= 0.08 && pose === 'west';
}

function drawBattlePlayerFigure(ctx, state, position) {
    if (canDrawStagePlayer() && drawStagePlayerBody(ctx, state, position)) return;
    if (canDrawHanaPlayer() && drawHanaPlayerBody(ctx, state, position)) return;
    drawBattlePlayerBody(ctx, state, position);
}

const OCCLUDED_RIM_DIRECTIONS = Object.freeze([[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]);
/** Frame-local readability layout. CSS-pixel boxes and two small reused masks; never serialized with game data. */
drawBattlePlayerFigure.readability = (() => {
    let hero = null, boxes = [], mask, edge, cover, outline = null;
    const overlaps = (a, b) => a.x < b.x + b.w + 3 && a.x + a.w + 3 > b.x && a.y < b.y + b.h + 3 && a.y + a.h + 3 > b.y;
    function surface(current, size) {
        const canvas = current || document.createElement('canvas');
        if (canvas.width !== size || canvas.height !== size) canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.resetTransform(); ctx.clearRect(0, 0, size, size); ctx.imageSmoothingEnabled = false;
        return canvas;
    }
    function capture(state, position, clips) {
        const tile = state.gridProj.tileW, size = Math.ceil(Math.min(512, Math.max(128, tile * 5)));
        mask = surface(mask, size); edge = surface(edge, size);
        const x = Math.round(position.x - size / 2), y = Math.round(position.y - size * 0.8), body = mask.getContext('2d');
        body.save(); body.translate(-x, -y);
        if (isBattlePlayerMirrored(state.motionState)) { body.translate(position.x * 2, 0); body.scale(-1, 1); }
        drawBattlePlayerFigure(body, state, position); body.restore();
        const style = BATTLE_SPRITE_OUTLINES.heroOccluded;
        body.save(); body.globalCompositeOperation = 'source-in'; body.fillStyle = style.color; body.fillRect(0, 0, size, size); body.restore();
        // 테는 여덟 방향으로 찍어 모서리가 비지 않게 굵게(예전 한 도트 네 방향은 몬스터 테두리에 묻혔다).
        const ctx = edge.getContext('2d'), step = style.dots[tile >= 64 ? 1 : 0];
        ctx.save();
        for (const [dx, dy] of OCCLUDED_RIM_DIRECTIONS) ctx.drawImage(mask, dx * step, dy * step);
        ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(mask, 0, 0); ctx.restore();
        if (stageView.enabled()) cutToCover(state, { x, y, size }, clips);
        outline = { x, y, clips };
    }
    /** On the stage the pale body and its rim stay only where a monster in front really covers the hero: those monsters are
     * drawn once more onto a mask and both layers are cut to it. Monsters there are wide and low or tall and thin, and the
     * boxes alone lit the hero up beside them (2026-10-13 사용자: 겹친 부분이 하얗게 뜬다). */
    function cutToCover(state, origin, clips) {
        cover = surface(cover, origin.size);
        const ctx = cover.getContext('2d');
        ctx.save(); ctx.translate(-origin.x, -origin.y);
        clips.forEach(box => drawBattleEnemyActor(ctx, box.entry, state));
        ctx.restore();
        for (const layer of [mask, edge]) {
            const cut = layer.getContext('2d');
            cut.save(); cut.globalCompositeOperation = 'destination-in'; cut.drawImage(cover, 0, 0); cut.restore();
        }
    }
    function begin(scene, entries) {
        boxes = []; outline = null;
        const state = worldTreeSkillFx.actorState(scene);
        const p = getPlayerHurtPosition(state), tile = state.gridProj.tileW;
        const head = getHeroHeadY(state.now) ?? p.y - 82 * HERO_SIZE_SCALE;
        hero = { x: p.x - Math.max(26, tile * 0.38), y: head - 16, w: Math.max(52, tile * 0.76), h: p.y - head + 24 };
        if (state.returnWarp || state.returnDeparture || state.actorAlpha === 0) return;
        const clips = entries.filter(entry => entry.y >= p.y).map(entry => {
            const height = getEnemyFieldBarLift(entry.enemy) - 8;
            return { x: entry.x - height * 0.5, y: entry.y - height, w: height, h: height + 10, entry };
        }).filter(box => overlaps(box, hero));
        if (clips.length) capture(scene, p, clips);
    }
    /** 가린 몬스터 자리에서만: 주인공의 몸이 반투명하게 비치고 그 둘레에 굵은 테. */
    function draw(ctx) {
        if (!outline) return;
        const style = BATTLE_SPRITE_OUTLINES.heroOccluded;
        ctx.save(); ctx.beginPath();
        outline.clips.forEach(box => ctx.rect(box.x, box.y, box.w, box.h)); ctx.clip();
        ctx.globalAlpha = style.fill; ctx.drawImage(mask, outline.x, outline.y);
        ctx.globalAlpha = style.alpha; ctx.drawImage(edge, outline.x, outline.y); ctx.restore();
    }
    /** A free spot for a label or bar: it steps up past the hero and the boxes already placed. avoidHero false keeps it over its
     * owner even across the hero (a boss bar beside its own cast bar; 2026-10-07 user: a boss bar leaping over the hero looked odd). */
    function place(box, avoidHero = true) {
        // 옆에서 보는 무대: 몬스터가 주인공과 늘 겹쳐 서므로 비켜 올리면 막대가 걸음마다 위아래로 튄다. 제 몬스터 위에 그대로 둔다.
        if (stageView.enabled()) return { ...box };
        const result = { ...box }, taken = avoidHero && hero ? [hero, ...boxes] : boxes;
        for (let n = 0; n < 12 && taken.some(other => overlaps(result, other)); n++) result.y -= result.h + 5;
        boxes.push(result);
        return result;
    }
    return { begin, draw, place };
})();

function drawHanaPlayerBody(ctx, state, position) {
    let motion = state.motionState, hana = collectHanaPlayerMotion(motion, state.now);
    let spin = redrawnSkillFx.playerSpin(state.now);
    if (spin && hana.attack) Object.assign(hana.attack, { direction: spin.facing, channelUntil: Math.max(hana.attack.channelUntil, spin.holdUntil) });
    let previous = ctx.battleActorAlpha;
    ctx.battleActorAlpha = state.actorAlpha;
    try {
        return hanaActors.drawPlayer(ctx, position.x, position.y, {
            ...hana, ...getHanaWeaponState(state.now), classId: getHeroAppearanceId(), tile: state.gridProj.tileW, projection: state.gridProj,
            facing: spin ? spin.facing : motion.facingDirection || motion.attackDirection || 'east',
            moving: motion.advanceBlend > 0.08, moveDirection: motion.moveDirection,
            alpha: getBattleActorDrawAlpha(ctx, 1), tint: redrawnSkillFx.playerTint(state.now)
        }, state.now);
    } finally { ctx.battleActorAlpha = previous; }
}

/** 이 휘두름의 룬이 무대 주인공에게 정하는 것: 주문이면 시전, 던지는 플라스크면 던지기, 찌르기와 베기와 회전의 모양, 룬의 동작(인계의 동작 표).
 * 휘두름에 적힌 룬을 따른다(이동 칸의 룬을 쓰는 동안에는 주 룬이 아니다). */
function getStageHeroSwingLook(timing, stance) {
    const name = (timing.attack && timing.attack.skillName) || game.activeSkill, skill = SKILL_DB[name] || {};
    return { spell: (skill.tags || []).includes('spell'), throwsWeapon: stance === 'flask' && HANA_THROWN_FLASK_GEMS.has(SKILL_FX_ATLAS[name]?.id),
        strike: stageActors.strikeFor(name), motion: stageActors.motionFor(name, getHeroAppearanceId(), stance) };
}

/** 몸이 뜨는 이동 룬(도약 강타, 섬머솔트 슬래시) 동안의 몸 그림: 포물선 높이만큼 띄우고, 공중제비는 몸 가운데를 축으로 돌린다
 * (battleVisualState.playerAir, js/canvas-battlefield.js getStageHeroAirGround). 2026-10-17 사용자가 시뮬레이터처럼 이 두 룬만 그림을 움직이게 했다.
 * drawHeroBodyAt(y)는 발의 y로 몸을 그린다. */
function drawStageHeroAloft(ctx, position, tile, drawHeroBodyAt) {
    const air = battleVisualState.playerAir;
    if (!air) return drawHeroBodyAt(position.y);
    const dot = stageActors.scaleFor(tile), y = position.y - air.lift * dot, centre = y - 46 * dot;
    ctx.save();
    ctx.translate(position.x, centre); ctx.rotate(air.rot); ctx.translate(-position.x, -centre);
    try { return drawHeroBodyAt(y); } finally { ctx.restore(); }
}

/** The stage hero: timing from the same battle effects as the Hana figure; spells play the cast clips, a thrown flask the throw. */
function drawStagePlayerBody(ctx, state, position) {
    const motion = state.motionState, stance = getStageHeroStance();
    const previous = ctx.battleActorAlpha;
    ctx.battleActorAlpha = state.actorAlpha;
    // 무대의 주인공은 휘두르는 동안에도 보는 쪽(facingDirection: 걷는 쪽, 치는 쪽. js/canvas-battlefield.js resolveStageStrikeSide)을 본다.
    // 휘두름에 따로 적힌 방향(주 스킬의 첫 대상 쪽)을 따르면, 이동기로 건너가 뒤를 베는 동안 다른 적을 겨냥한 쪽으로 돌아섰다.
    const facing = motion.facingDirection || motion.attackDirection || 'east', timing = collectHanaPlayerMotion(motion, state.now);
    if (timing.attack) timing.attack = { ...timing.attack, direction: facing };
    try {
        return drawStageHeroAloft(ctx, position, state.gridProj.tileW, y => stageActors.drawPlayer(ctx, position.x, y, {
            ...timing, ...getStageHeroSwingLook(timing, stance), classId: getHeroAppearanceId(), stance, tile: state.gridProj.tileW,
            facing,
            moving: motion.advanceBlend > 0.08, moveDirection: motion.moveDirection,
            alpha: getBattleActorDrawAlpha(ctx, 1)
        }, state.now));
    } finally { ctx.battleActorAlpha = previous; }
}

// Gems whose art throws the flask itself: from the release frame the character's hand is empty.
const HANA_THROWN_FLASK_GEMS = new Set([38, 44, 47, 48, 49]);
/** The weapon in hand is the one equipped (settings.heroWeaponMode: 'auto' · 'class' · a weapon slug), and the
 * active skill says when its own art takes it out of the hand. */
function getHanaWeaponState(now) {
    const gemId = SKILL_FX_ATLAS[game.activeSkill]?.id;
    const weapon = hanaActors.weaponFor(getHeroAppearanceId(), game.equipment?.['무기'], game.settings?.heroWeaponMode || 'auto');
    return { weapon, throwsWeapon: weapon === 'flask' && HANA_THROWN_FLASK_GEMS.has(gemId), hideWeapon: redrawnSkillFx.weaponHidden(now) };
}

function notePlayerMotionFx(found, fx, now) {
    if (fx.type === 'playerSwing') found.swing = found.swing || fx;
    else if (fx.type === 'playerHit') found.hit = found.hit || fx;
    else if (fx.type === 'playerDown' && now - fx.start <= fx.duration) found.down = found.down || fx;
}

function getHanaSwingTiming(swing, direction) {
    if (!swing) return null;
    let windup = Math.max(1, (Number(swing.impactAt) || swing.start) - swing.start);
    let channelUntil = swing.duration > windup + 40 ? swing.start + swing.duration : 0;
    return { start: swing.start, impactAt: swing.start + windup, direction, channelUntil, skillName: swing.skillName };
}

/** A hit worth at least 6% of max life tints the body harder than chip damage from archers. */
function isHeavyPlayerHit(hit, stats) {
    if (!hit) return false;
    return Number(hit.damage) >= Math.max(1, Number(stats.maxHp) || 0) * 0.06;
}

const HERO_HIT_TINT_MS = 280;
const HERO_HIT_TINT_HOLD_MS = 90;
const HERO_HIT_TINT_COLOUR = '#ff2a1f';
/** Red hit tint strength (0..1) at `now`: every hit on the hero tints its body red, holds for HERO_HIT_TINT_HOLD_MS and fades by
 * HERO_HIT_TINT_MS, whatever it is doing — attacking, walking or standing (2026-10-05 user request). Heavy hits tint harder. */
function getHeroHitTintStrength(now, stats) {
    for (let index = battleFx.length - 1; index >= 0; index--) {
        const fx = battleFx[index];
        if (!fx || fx.type !== 'playerHit' || fx.start > now) continue;
        const age = now - fx.start;
        if (age >= HERO_HIT_TINT_MS) continue;
        const fade = age < HERO_HIT_TINT_HOLD_MS ? 1 : 1 - (age - HERO_HIT_TINT_HOLD_MS) / (HERO_HIT_TINT_MS - HERO_HIT_TINT_HOLD_MS);
        return (isHeavyPlayerHit(fx, stats || {}) ? 0.82 : 0.62) * fade;
    }
    return 0;
}

/** Draws the hero figure with the red hit tint laid inside its own silhouette. The figure is drawn a second time, with the same
 * transform, onto one reused offscreen layer only while a tint is fading, so an untouched hero costs nothing extra. */
const drawTintedBattlePlayerFigure = (() => {
    let layer = null;
    return function draw(ctx, state, position) {
        // Some sprite paths leave a shadow's low alpha on the context, so the tint is scaled by the alpha before the figure.
        const baseAlpha = ctx.globalAlpha;
        drawBattlePlayerFigure(ctx, state, position);
        // 무대의 주인공은 몸 전체를 붉게 칠하지 않는다: 붉은 외곽선이 피격 표시다(js/canvas-stage-actors.js hitLook).
        const strength = canDrawStagePlayer() ? 0 : getHeroHitTintStrength(state.now, state.motionState && state.motionState.playerStats);
        if (!(strength > 0) || !ctx.canvas) return;
        layer = layer || document.createElement('canvas');
        if (layer.width !== ctx.canvas.width || layer.height !== ctx.canvas.height) {
            layer.width = ctx.canvas.width; layer.height = ctx.canvas.height;
        }
        const paint = layer.getContext('2d');
        paint.save();
        paint.setTransform(1, 0, 0, 1, 0, 0); paint.clearRect(0, 0, layer.width, layer.height);
        paint.setTransform(ctx.getTransform()); paint.imageSmoothingEnabled = false;
        drawBattlePlayerFigure(paint, state, position);
        paint.setTransform(1, 0, 0, 1, 0, 0);
        paint.globalCompositeOperation = 'source-in'; paint.globalAlpha = 1;
        paint.fillStyle = HERO_HIT_TINT_COLOUR; paint.fillRect(0, 0, layer.width, layer.height);
        paint.restore();
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = baseAlpha * strength;
        ctx.drawImage(layer, 0, 0);
        ctx.restore();
    };
})();

/** How fast the legs run (1 = the base step, COMBAT_GRID_CONFIG.playerMoveIntervalSec): on a map exploration the actual time the
 * hero takes for this tile, elsewhere the movement speed. Above HERO_RUN_RATE_MAX the cycle would flicker, so it stops there. */
function getHeroRunRate(move) {
    const run = actExplorationState.current(game), step = COMBAT_GRID_CONFIG.playerMoveIntervalSec * 1000;
    const rate = run && run.motion ? step / run.motion.duration : move / 100;
    return clampNumber(rate, 0.8, HERO_RUN_RATE_MAX);
}

/** Timing the Hana sprite needs. Its attack clip outlives the legacy swing window, so it reads battleFx directly. */
function collectHanaPlayerMotion(motion, now) {
    let found = { swing: null, hit: null, down: null };
    for (let index = battleFx.length - 1; index >= 0; index--) {
        let fx = battleFx[index];
        if (fx && fx.start <= now) notePlayerMotionFx(found, fx, now);
    }
    let stats = motion.playerStats || {};
    let move = Number(stats.moveSpeed || stats.move) || 100;
    return {
        attack: getHanaSwingTiming(found.swing, motion.attackDirection),
        hurtAt: found.hit ? found.hit.start : null,
        downProgress: found.down ? clampNumber((now - found.down.start) / Math.max(1, found.down.duration), 0, 1) : null,
        running: move >= 90,
        moveRate: getHeroRunRate(move)
    };
}

function drawActiveSummons(ctx, playerPos, now, proj) {
    const summons = (game.summons || []).filter(s => s && s.alive && (s.hp || 0) > 0);
    if (summons.length <= 0) return;
    const strikes = getLatestSummonStrikes(now);
    summons.forEach((summon, index) => {
        const at = getSummonDrawPosition(summon, index, { count: summons.length, playerPos, now, proj });
        ctx.save();
        if (summon.isGhost) ctx.globalAlpha = 0.46;
        const top = drawWispSummon(ctx, summon, at, { now, proj, strike: strikes.get(summon.id) }) ?? drawLegacySummon(ctx, summon, at);
        if (summon.isGhost) drawSummonGhostRing(ctx, summon, at);
        ctx.restore();
        drawSummonHpBar(ctx, summon, at.x, top);
    });
}

/** 그리드 유닛: 자기 칸(발 위치)에 그린다 — 위습은 공격할 때도 제자리에서 쏜다(인계 lunge 0). 칸이 아직 없으면(스폰 직후)
 * 플레이어 주변 궤도로 표시한다. */
function getSummonDrawPosition(summon, index, view) {
    if (view.proj && hasGridCell(summon)) {
        const cell = view.proj.cellToScreen(summon.gx, summon.gy);
        return { x: cell.x, y: cell.y + (Number(view.proj.actorGroundOffsetY) || 0) };
    }
    const angle = (view.now / 1000) * 0.9 + (index / Math.max(1, view.count)) * Math.PI * 2, radius = 24 + Math.min(40, view.count * 4);
    return { x: view.playerPos.x + Math.cos(angle) * radius, y: view.playerPos.y - 18 + Math.sin(angle) * 12 };
}

/** Latest visible strike per summon (the hit resolves as the effect starts, so it is also the strike frame's time). */
function getLatestSummonStrikes(now) {
    const strikes = new Map();
    for (const fx of battleFx) {
        if (!fx || fx.type !== 'summonAttack' || fx.start > now) continue;
        const known = strikes.get(fx.summonId);
        if (!known || fx.start > known.start) strikes.set(fx.summonId, fx);
    }
    return strikes;
}

const wispSummonFacesLeft = new WeakMap();
/** Wisp sheets face right; a wisp turns toward the enemy it last struck. */
function isWispSummonFacingLeft(summon, at, view) {
    const strike = view.strike;
    if (strike && view.proj && Number.isFinite(strike.targetGx)) {
        const target = view.proj.cellToScreen(strike.targetGx, strike.targetGy);
        if (Math.abs(target.x - at.x) > 1) wispSummonFacesLeft.set(summon, target.x < at.x);
    }
    return wispSummonFacesLeft.get(summon) === true;
}

/** @returns {?number} top of the drawn body, or null when the summon is no wisp or its sheet is still loading. */
function drawWispSummon(ctx, summon, at, view) {
    // 옆에서 보는 무대: 인계 받은 새 스킬 이펙트의 위습 몸(js/canvas-stage-skill-casts.js).
    const staged = view.proj && typeof stageSkillCasts === 'object' ? stageSkillCasts.wispBody(ctx, summon, at, view) : null;
    if (staged !== null) return staged;
    if (typeof hanaActors !== 'object' || !view.proj) return null;
    const drawn = hanaActors.drawSummon(ctx, {
        skillName: summon.gemName, x: at.x, y: at.y, now: view.now, tile: view.proj.tileW, phase: (Number(summon.id) || 0) * 97,
        attackAt: view.strike ? view.strike.start : -Infinity, flipX: isWispSummonFacingLeft(summon, at, view), alpha: ctx.globalAlpha
    });
    return drawn ? drawn.top : null;
}

function drawLegacySummon(ctx, summon, at) {
    const image = battleAssets && battleAssets.images ? battleAssets.images.summon1 : null;
    const frame = image ? getSummonSpriteFrameRectByName(summon.gemName, image) : null;
    const guard = summon.role === 'guard';
    if (frame) {
        const drawW = guard ? 42 : 34, drawH = Math.max(18, Math.round(drawW * (frame.sh / Math.max(1, frame.sw))));
        ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, Math.round(at.x - drawW / 2), Math.round(at.y - drawH + 3), drawW, drawH);
    } else {
        ctx.fillStyle = guard ? 'rgba(132, 205, 167, 0.8)' : 'rgba(159, 212, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(at.x, at.y, guard ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();
    }
    return at.y - (guard ? 42 : 34);
}

function drawSummonGhostRing(ctx, summon, at) {
    ctx.strokeStyle = 'rgba(204, 174, 255, 0.94)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(at.x, at.y - 10, summon.role === 'guard' ? 15 : 12, 0, Math.PI * 2);
    ctx.stroke();
}

function drawSummonHpBar(ctx, summon, x, top) {
    const hpPct = clampNumber(summon.hp / Math.max(1, summon.maxHp || summon.hp), 0, 1);
    const hpWidth = summon.role === 'guard' ? 38 : 32;
    const hpX = Math.round(x - hpWidth / 2), hpY = Math.round(top - 7);
    ctx.save();
    ctx.fillStyle = summon.isGhost ? '#c9a8ff' : (summon.role === 'guard' ? '#59d98e' : '#78d9ff');
    ctx.fillRect(hpX, hpY, Math.max(1, Math.round(hpWidth * hpPct)), 4);
    ctx.strokeStyle = 'rgba(220, 248, 255, 0.72)';
    ctx.strokeRect(hpX - 0.5, hpY - 0.5, hpWidth + 1, 5);
    ctx.restore();
}
