/** Battle units on the field: the player figure (Hana +6 sheets with the legacy strip as fallback) and the summons.
 * Split out of canvas-battlefield.js along the unit-drawing boundary; renderBattlefield still decides when they draw
 * (drawBattlePlayerActor → drawBattlePlayerFigure, drawBattleGroundLayer → drawActiveSummons). Rendering only.
 */

function canDrawHanaPlayer() {
    if (typeof hanaActors !== 'object' || game.settings?.heroSpriteSet === 'legacy') return false;
    return !getSelectedMonsterSkinId() && hanaActors.isReady(getHeroAppearanceId());
}

/** Legacy strips face east and are mirrored for west poses; Hana sheets carry their own west row. */
function isBattlePlayerMirrored(motion) {
    if (canDrawHanaPlayer()) return false;
    let pose = motion.facingDirection || motion.attackDirection || 'east';
    return motion.advanceBlend <= 0.08 && pose === 'west';
}

function drawBattlePlayerFigure(ctx, state, position) {
    if (canDrawHanaPlayer() && drawHanaPlayerBody(ctx, state, position)) return;
    drawBattlePlayerBody(ctx, state, position);
}

function drawHanaPlayerBody(ctx, state, position) {
    let motion = state.motionState, hana = collectHanaPlayerMotion(motion, state.now);
    let spin = redrawnSkillFx.playerSpin(state.now);
    if (spin && hana.attack) Object.assign(hana.attack, { direction: spin.facing, channelUntil: Math.max(hana.attack.channelUntil, spin.holdUntil) });
    let previous = ctx.battleActorAlpha;
    ctx.battleActorAlpha = state.actorAlpha;
    try {
        return hanaActors.drawPlayer(ctx, position.x, position.y, {
            ...hana, classId: getHeroAppearanceId(), tile: state.gridProj.tileW,
            facing: spin ? spin.facing : motion.facingDirection || motion.attackDirection || 'east',
            moving: motion.advanceBlend > 0.08, moveDirection: motion.moveDirection,
            alpha: getBattleActorDrawAlpha(ctx, 1), tint: redrawnSkillFx.playerTint(state.now)
        }, state.now);
    } finally { ctx.battleActorAlpha = previous; }
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
    return { start: swing.start, impactAt: swing.start + windup, direction, channelUntil };
}

/** Only a hit worth at least 6% of max life flashes the sprite; chip damage from archers just plays the hurt pose. */
function isHeavyPlayerHit(hit, stats) {
    if (!hit) return false;
    return Number(hit.damage) >= Math.max(1, Number(stats.maxHp) || 0) * 0.06;
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
        hurtHeavy: isHeavyPlayerHit(found.hit, stats),
        downProgress: found.down ? clampNumber((now - found.down.start) / Math.max(1, found.down.duration), 0, 1) : null,
        running: move >= 90,
        moveRate: clampNumber(move / 100, 0.8, 1.8)
    };
}

function drawActiveSummons(ctx, playerPos, now, proj, attackMotions) {
    const summons = (game.summons || []).filter(s => s && s.alive && (s.hp || 0) > 0);
    if (summons.length <= 0) return;
    const strikes = getLatestSummonStrikes(now);
    summons.forEach((summon, index) => {
        const at = getSummonDrawPosition(summon, index, { count: summons.length, playerPos, now, proj, motion: attackMotions && attackMotions[summon.id] });
        ctx.save();
        if (summon.isGhost) ctx.globalAlpha = 0.46;
        const top = drawHanaSummon(ctx, summon, at, { now, proj, strike: strikes.get(summon.id) }) ?? drawLegacySummon(ctx, summon, at);
        if (summon.isGhost) drawSummonGhostRing(ctx, summon, at);
        ctx.restore();
        drawSummonHpBar(ctx, summon, at.x, top);
    });
}

/** 그리드 유닛: 자기 칸(발 위치)에 그린다. 칸이 아직 없으면(스폰 직후) 플레이어 주변 궤도로 표시한다. */
function getSummonDrawPosition(summon, index, view) {
    const lunge = view.motion || { x: 0, y: 0 };
    if (view.proj && hasGridCell(summon)) {
        const cell = view.proj.cellToScreen(summon.gx, summon.gy);
        return { x: cell.x + lunge.x, y: cell.y + (Number(view.proj.actorGroundOffsetY) || 0) + lunge.y };
    }
    const angle = (view.now / 1000) * 0.9 + (index / Math.max(1, view.count)) * Math.PI * 2, radius = 24 + Math.min(40, view.count * 4);
    return { x: view.playerPos.x + Math.cos(angle) * radius + lunge.x, y: view.playerPos.y - 18 + Math.sin(angle) * 12 + lunge.y };
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

const hanaSummonFacesLeft = new WeakMap();
/** Hana summon sheets are side views facing right; they turn toward the enemy they last struck. */
function isHanaSummonFacingLeft(summon, at, view) {
    const strike = view.strike;
    if (strike && view.proj && Number.isFinite(strike.targetGx)) {
        const target = view.proj.cellToScreen(strike.targetGx, strike.targetGy);
        if (Math.abs(target.x - at.x) > 1) hanaSummonFacesLeft.set(summon, target.x < at.x);
    }
    return hanaSummonFacesLeft.get(summon) === true;
}

/** @returns {?number} top of the drawn body, or null when the Hana sheet is not available (legacy fallback). */
function drawHanaSummon(ctx, summon, at, view) {
    if (typeof hanaActors !== 'object' || game.settings?.heroSpriteSet === 'legacy' || !view.proj) return null;
    const drawn = hanaActors.drawSummon(ctx, {
        skillName: summon.gemName, x: at.x, y: at.y, now: view.now, tile: view.proj.tileW, phase: (Number(summon.id) || 0) * 97,
        attackAt: view.strike ? view.strike.start : -Infinity, flipX: isHanaSummonFacingLeft(summon, at, view), alpha: ctx.globalAlpha
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
