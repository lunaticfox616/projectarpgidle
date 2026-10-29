function getCanvasRuntimeFunction(name) {
    if (typeof window === 'undefined') return null;
    let provider = window[name];
    if (typeof provider !== 'function' || provider.__placeholderGlobal === true) return null;
    return provider;
}

// 렌더 전용 짧은 캐시. getPlayerStats()는 장비/패시브 전체를 재계산하는 무거운
// 함수인데, 렌더 경로는 결과를 읽기만 하고(HP/ES 바, 스킬 타겟, 공속 타이밍) 이
// 값들은 천천히 변하므로 ~150ms 캐시해도 시각적으로 무해하다. 전투 틱(coreLoop)과
// updateCombatUI는 별도로 getPlayerStats()를 직접 호출하므로 이 캐시의 영향을 받지 않는다.
let __canvasStatsCache = null;
let __canvasStatsCacheAt = 0;
const CANVAS_STATS_CACHE_MS = 150;
// 전장 글자도 갈무리11의 12px 격자를 쓴다. 독립 제목은 실제 Bold, 본문은 Regular.
// 흐린 그림자(shadowBlur) 대신 한 도트 어긋난 검은 글자를 먼저 찍는다.
const BATTLE_PIXEL_FONT = "'Galmuri11', 'Galmuri14', 'Malgun Gothic', sans-serif";
const BATTLE_TITLE_FONT = "'Galmuri11', 'Galmuri14', 'Malgun Gothic', sans-serif";
function fillPixelText(ctx, text, x, y, color) {
    ctx.fillStyle = '#000';
    drawCrispCanvasText(ctx, text, x + 1, y + 1);
    ctx.fillStyle = color;
    drawCrispCanvasText(ctx, text, x, y);
}
/** Centred pixel text whose keywords and numbers take the item tone colours (js/stat-tone-text-ui.js segments, 2026-10-06);
 * the rest keeps baseColor. Drawn piece by piece from the left edge of the whole line. */
function fillPixelToneText(ctx, text, centerX, y, baseColor) {
    const parts = statToneText.segments(text), widths = parts.map(part => ctx.measureText(part.text).width);
    let x = Math.round(centerX - widths.reduce((sum, w) => sum + w, 0) / 2);
    const align = ctx.textAlign;
    ctx.textAlign = 'left';
    parts.forEach((part, index) => {
        fillPixelText(ctx, part.text, x, y, part.color || baseColor);
        x += widths[index];
    });
    ctx.textAlign = align;
}
function getCanvasPlayerStats(fallback = {}) {
    let provider = getCanvasRuntimeFunction('getPlayerStats');
    if (!provider) return fallback;
    let now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let wallNow = getCombatTime();
    if (typeof game !== 'undefined' && game.lastCombatStats && (wallNow - (game.lastCombatStatsAt || 0) < 250)) {
        __canvasStatsCache = game.lastCombatStats;
        __canvasStatsCacheAt = now;
        return __canvasStatsCache;
    }
    if (__canvasStatsCache && (now - __canvasStatsCacheAt) < CANVAS_STATS_CACHE_MS) return __canvasStatsCache;
    let result = provider() || fallback;
    __canvasStatsCache = result;
    __canvasStatsCacheAt = now;
    return result;
}

function getCanvasSkillTargets(stats) {
    let provider = getCanvasRuntimeFunction('getSkillTargets');
    return provider ? (provider(stats) || []) : [];
}

const BATTLE_SKILL_EFFECT_CAP = 56;

function getBattleVfxDensity() {
    return clampNumber(Number(battleVisualState.vfxDensity) || 1, 0.42, 1);
}

/** frameMs: time since the last drawn frame; targetMs: the cadence the frame loop asked for (js/ui.js renderBattlefieldThrottled:
 * 30 fps on phones and in arenas, slower while resting), rounded up to whole 60 Hz frames. Only lateness against that cadence reads
 * as load, as a 60 Hz frame time: an on-time 30 fps frame used to read as overload, so every phone fight and every resting PC drew
 * the fewest effects (2026-10-07 review). */
function getBattleFrameLoadMs(frameMs, targetMs) {
    const expected = Math.max(16.7, Math.ceil(((Number(targetMs) || 16.7) - 0.5) / 16.7) * 16.7);
    return clampNumber(16.7 + Math.max(0, (Number(frameMs) || 16.7) - expected), 1, 50);
}

function updateBattleVfxDensity(frameMs, enemyCount, targetMs) {
    let elapsed = getBattleFrameLoadMs(frameMs, targetMs);
    let previousEma = clampNumber(Number(battleVisualState.frameTimeEma) || 16.7, 1, 50);
    let ema = previousEma * 0.92 + elapsed * 0.08;
    let crowdTarget = enemyCount >= 8 ? 0.62 : (enemyCount >= 5 ? 0.78 : 1);
    let frameTarget = ema >= 32 ? 0.42 : (ema >= 24 ? 0.56 : (ema >= 18 ? 0.74 : 1));
    let target = Math.min(crowdTarget, frameTarget, elapsed >= 45 ? 0.48 : 1);
    let current = getBattleVfxDensity();
    battleVisualState.frameTimeEma = ema;
    battleVisualState.vfxDensity = target < current
        ? Math.max(target, current - 0.08)
        : Math.min(target, current + 0.012);
    return battleVisualState.vfxDensity;
}

function trimBattleSkillEffects(list) {
    let cap = Math.max(24, Math.round(BATTLE_SKILL_EFFECT_CAP * getBattleVfxDensity()));
    if (list.length > cap) list.splice(0, list.length - cap);
}

// Attack impact effects expand to a circular reach. Physical keeps its full
// shockwave; every other element is capped to roughly the monster's footprint
// so the rings/glow do not balloon past the target. When the enemy object is
// unavailable (ghost/fallback position) we fall back to a much smaller scale.
function getAttackFxSpawnOpts(fx, enemy, skillVisual, viewportScale) {
    const skillProfile = fx.skillName ? getSkillGemVfxProfile(fx.skillName) : null;
    // 스킬 전용 이미지/절차형 이펙트가 적중 실루엣을 이미 담당한다. 같은 적중에
    // 입자 엔진까지 겹치면 단일 공격부터 고해상도 캔버스 비용이 두 배로 뛴다.
    if (skillProfile) return null;
    let variant = (skillVisual && skillVisual.variant) || 'melee';
    if (fx.chain) variant = 'chain';
    else if (fx.pierce || fx.penetrate) variant = 'pierce';
    else if (fx.slam) variant = 'slam';
    const opts = {
        crit: !!fx.crit,
        variant
    };
    const element = String(fx.element || 'phys').toLowerCase();
    const screenMul = clampNumber(Number(viewportScale) || 1, 0.68, 1.18);
    if (element === 'phys' || element === 'physical') opts.scale = 0.68 * screenMul;
    else if (enemy) opts.scale = (enemy.isBoss ? 0.82 : (enemy.isElite ? 0.6 : 0.44)) * screenMul;
    else opts.scale = 0.4 * screenMul;
    if (fx.impactTier === 'heavy') opts.scale *= 1.04;
    else if (fx.impactTier === 'annihilate') {
        // 원킬은 이미 피해 숫자·히트스톱·사망 모션으로 충분히 구분된다. 입자 엔진까지
        // 크게 키우면 다중 처치 순간 할당량이 폭증하므로 크기와 밀도를 오히려 낮춘다.
        opts.scale *= 0.82;
        opts.densityMul = 0.48;
    }
    opts.densityMul = (Number(opts.densityMul) || 1) * getBattleVfxDensity();
    return opts;
}

function requestBattleHitStop(fx) {
    if (!fx || fx.dot || battleVisualState.lastHitStopFxId === fx.id) return;
    const profile = getBattleFeedbackProfile(fx), killStopMs = getKillHitStopMs(fx);
    const duration = Math.max(profile.hitStopMs, killStopMs);
    battleVisualState.lastHitStopFxId = fx.id;
    if (duration <= 0) return;
    const now=performance.now();
    if (now < battleVisualState.nextHitStopAt && killStopMs < KILL_HIT_STOP_MS.boss) return;
    battleVisualState.nextHitStopAt=now+250;
    battleVisualState.hitStopRemainingMs = Math.max(Number(battleVisualState.hitStopRemainingMs) || 0, duration);
}

// Finishing blows on elites and bosses hold the frame a little longer. Ordinary kills stay fluid: an idle fight
// kills constantly, and a stop on each would read as stutter.
const KILL_HIT_STOP_MS = Object.freeze({ elite: 45, boss: 110 });
/** The death effect starts on the killing hit (getBattleFxStart), so a death stamped with this hit's start is its kill. */
function getKillHitStopMs(fx) {
    if (fx.enemyId === undefined || fx.enemyId === null) return 0;
    const death = battleFx.find(other => other && other.type === 'enemyDeath' && other.enemyId === fx.enemyId
        && Math.abs(Number(other.start) - Number(fx.start)) < 1);
    if (!death) return 0;
    return death.boss ? KILL_HIT_STOP_MS.boss : (death.elite ? KILL_HIT_STOP_MS.elite : 0);
}

/** 쓰러짐 그림이 없는 보스의 사라짐 길이(ms). 보스의 쓰러짐 효과는 쓰러짐 그림을 보여 주려고 1.6초다(js/combat.js handleEnemyDeath). */
const BOSS_DEATH_LEGACY_MS = 840;
/** 쓰러진 보스가 흐려지기 시작하는 때(효과 길이의 비율): 그 앞까지는 쓰러짐 그림의 마지막 장(누운 모습)이 또렷하다. */
const BOSS_DEFEAT_FADE_FROM = 0.78;
/** 몬스터가 쓰러지는 연출(전투 효과 enemyDeath). 바닥 반응과 맞은 번쩍임은 모두 같다. 쓰러짐 그림이 있는 스토리 보스는 그 그림을 제자리에서
 * 끝까지 보여 준다(drawBossDefeat). 그 밖에는 예전처럼 밀리며 바래 사라진다(쓰러짐 그림이 없는 보스는 예전 길이 BOSS_DEATH_LEGACY_MS로).
 * at = { enemy (그 몬스터의 자리, 없으면 그리지 않는다), playerPos, gridProj, now }. */
function drawEnemyDeathFx(ctx, fx, t, at) {
    const enemy = at.enemy;
    if (!enemy) return;
    const deathEnemy = enemy.enemy || {}, isBossDeath = !!(fx.boss || deathEnemy.isBoss), elite = !!fx.elite;
    const legacyT = isBossDeath ? Math.min(1, t * fx.duration / BOSS_DEATH_LEGACY_MS) : t;
    const deathMotion = getEnemyDeathMotion(enemy, at.playerPos, legacyT, isBossDeath, elite);
    drawEnemyDeathGroundReaction(ctx, enemy, deathMotion, fx.color, isBossDeath, elite);
    drawEnemyDeathContactFlash(ctx, enemy, deathMotion, fx.color, isBossDeath, elite);
    if (!(isBossDeath && drawBossDefeat(ctx, fx, t, at))) drawEnemyDeathAfterimage(ctx, fx, deathMotion, at);
    worldTreeSkillFx.feedback.death(ctx, fx, legacyT, enemy);
}
/** 스토리 보스의 쓰러짐 그림(js/canvas-stage-roster.js drawDeath): 서 있던 자리에서 쓰러져 누운 채 머물다 끝에서 흐려진다. 다시 일어나는
 * 보스(js/canvas-stage-story.js revive, 액트 2 부제녀)는 쓰러짐 뒤에 일어나는 그림을 잇고 선 채로 흐려진다. 그림이 없으면 false. */
function drawBossDefeat(ctx, fx, t, at) {
    const enemy = at.enemy, deathEnemy = enemy.enemy || {}, rise = stageStory.revive(deathEnemy);
    const fadeFrom = rise ? rise.fadeFrom / rise.total : BOSS_DEFEAT_FADE_FROM;
    const p = { x: enemy.x, y: enemy.y, tile: at.gridProj && at.gridProj.tileW, now: at.now,
        facing: resolveEnemyFacingDirection(enemy, at.playerPos), deathMs: t * fx.duration, spawnScale: getBossDrawScale(deathEnemy) };
    ctx.save();
    ctx.globalAlpha = t < fadeFrom ? 1 : Math.max(0, (1 - t) / (1 - fadeFrom));
    const drawn = (rise && p.deathMs >= rise.start && stageStory.drawRevive(ctx, deathEnemy, p, rise)) || stageRoster.drawDeath(ctx, deathEnemy, p);
    ctx.restore();
    return drawn;
}
/** 예전 사라짐: 맞은 쪽으로 조금 밀리며 바래고 흐려지는 잔상. */
function drawEnemyDeathAfterimage(ctx, fx, deathMotion, at) {
    const enemy = at.enemy, deathEnemy = enemy.enemy || {}, isBossDeath = !!(fx.boss || deathEnemy.isBoss), dissolve = deathMotion.dissolve;
    ctx.save();
    ctx.globalAlpha = Math.pow(1 - dissolve, 1.62) * (isBossDeath ? 0.98 : (fx.elite ? 0.94 : 0.9));
    ctx.translate(deathMotion.x, deathMotion.y);
    ctx.scale(deathMotion.scaleX, deathMotion.scaleY);
    ctx.filter = `grayscale(${Math.floor(dissolve * 78)}%) saturate(${1 - dissolve * 0.62}) brightness(${1 + deathMotion.impactAlpha * 0.45 + dissolve * 0.16})`;
    drawEnemyAfterimage(ctx, deathEnemy, { x: 0, y: 0, scale: isBossDeath ? 3.65 : (fx.elite ? 2.1 : 1.9), flash: deathMotion.impactAlpha > 0.45,
        gridProj: at.gridProj, now: at.now, facing: resolveEnemyFacingDirection(enemy, at.playerPos) });
    ctx.restore();
}

function getEnemyDeathMotion(enemyPos, playerPos, progress, boss, elite) {
    let t = clampNumber(Number(progress) || 0, 0, 1);
    let dx = Number(enemyPos && enemyPos.x) - Number(playerPos && playerPos.x);
    let dy = Number(enemyPos && enemyPos.y) - Number(playerPos && playerPos.y);
    let distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance < 0.01) { dx = 1; dy = 0; distance = 1; }
    let directionX = dx / distance;
    let directionY = dy / distance;
    let impactPhase = clampNumber(t / 0.16, 0, 1);
    let knockbackDistance = boss ? 4 : (elite ? 6 : 8);
    let knockback = (1 - Math.pow(1 - impactPhase, 3)) * knockbackDistance;
    let dissolve = clampNumber((t - 0.08) / 0.92, 0, 1);
    let uniformScale = 1 - dissolve * (boss ? 0.035 : 0.055);
    return {
        x: Number(enemyPos && enemyPos.x) + directionX * knockback,
        y: Number(enemyPos && enemyPos.y) + directionY * knockback + dissolve * (boss ? 3 : 2),
        scaleX: uniformScale,
        scaleY: uniformScale,
        directionX: directionX,
        directionY: directionY,
        dissolve: dissolve,
        impactAlpha: Math.max(0, 1 - t / 0.18)
    };
}

function drawEnemyDeathGroundReaction(ctx, enemy, motion, color, boss, elite) {
    if (motion.impactAlpha <= 0) return;
    let size = boss ? 27 : (elite ? 21 : 16);
    ctx.save();
    ctx.globalAlpha = motion.impactAlpha * (boss ? 0.34 : 0.24);
    ctx.strokeStyle = color || '#d8d1c7';
    ctx.lineWidth = boss ? 3 : 2;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 12, size * (1.2 - motion.impactAlpha * 0.28), size * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

function drawEnemyDeathContactFlash(ctx, enemy, motion, color, boss, elite) {
    if (motion.impactAlpha <= 0) return;
    let reach = boss ? 24 : (elite ? 18 : 13);
    let centerY = enemy.y - (boss ? 15 : (elite ? 11 : 8));
    ctx.save();
    ctx.translate(enemy.x, centerY);
    ctx.rotate(Math.atan2(motion.directionY, motion.directionX) + Math.PI / 2);
    ctx.globalAlpha = motion.impactAlpha * (boss ? 0.9 : 0.72);
    ctx.strokeStyle = '#fff8de';
    ctx.lineWidth = boss ? 3.2 : 2.2;
    ctx.beginPath();
    ctx.moveTo(-reach, 0);
    ctx.lineTo(reach, 0);
    ctx.moveTo(-reach * 0.42, -4);
    ctx.lineTo(reach * 0.42, 4);
    ctx.stroke();
    ctx.globalAlpha *= 0.42;
    ctx.strokeStyle = color || '#d8d1c7';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-reach * 0.72, -5);
    ctx.lineTo(reach * 0.72, 5);
    ctx.stroke();
    ctx.restore();
}

const SKILL_GEM_VFX_IMAGE_KEYS = Object.freeze({
    whirlwind: 'skillFxWhirlwind',
    chainPrimary: 'skillFxChainPrimary',
    chain: 'skillFxChainPrimary',
    chainJump: 'skillFxChainJump',
    slamPrimary: 'skillFxSlamPrimary',
    slamAftershock: 'skillFxSlamAftershock',
    meteorProjectile: 'skillFxMeteorProjectile',
    meteorImpact: 'skillFxMeteorImpact',
    meteorGround: 'skillFxMeteorGround',
    slash: 'skillFxContinuousSlash',
    basicSlash: 'skillFxBasicSlash',
    continuousSlash: 'skillFxDoubleSlash',
    slam: 'skillFxSlamPrimary',
    projectile: 'skillFxProjectile',
    venomFang: 'skillFxVenomFang',
    frostField: 'skillFxFrostField',
    blizzardAmbient: 'skillFxBlizzardAmbient',
    blizzardImpact: 'skillFxBlizzardImpact',
    frostWave: 'skillFxFrostWave',
    chaosBoomerang: 'skillFxChaosBoomerang',
    frostBurst: 'skillFxFrostBurst',
    frostWaveRing: 'skillFxFrostWaveRing',
    burst: 'skillFxImpactFlare',
    radialWave: 'skillFxRadialWave',
    rune: 'skillFxBurst',
    dot: 'skillFxDotField',
    summon: 'skillFxSummonStrike'
});

function getSkillGemVfxProfile(skillName) {
    let profiles = typeof SKILL_GEM_VFX_PROFILES !== 'undefined' ? SKILL_GEM_VFX_PROFILES : null;
    return profiles && profiles[skillName] ? profiles[skillName] : null;
}

function normalizeSkillGemVfxElement(element, accent) {
    if (accent === 'blood') return 'blood';
    let key = String(element || 'phys').toLowerCase();
    if (key === 'lightning') return 'light';
    if (key === 'physical') return 'phys';
    return ['phys', 'fire', 'cold', 'light', 'chaos', 'blood'].includes(key) ? key : 'phys';
}

function getSkillProjectileVfxStyle(skillName, element) {
    let profile = getSkillGemVfxProfile(skillName);
    if (profile && profile.projectileStyle) return profile.projectileStyle;
    return normalizeSkillGemVfxElement(element, profile && profile.accent);
}

function drawPolygonPath(ctx, points) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(point => ctx.lineTo(point[0], point[1]));
    ctx.closePath();
}

function drawElementProjectileVfx(ctx, style, width, height, progress) {
    let color = getElementColor(style === 'shield' ? 'phys' : style);
    ctx.filter = 'none';
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, height * 0.09);
    if (style === 'fire') {
        drawPolygonPath(ctx, [[-width * 0.54, 0], [-width * 0.12, -height * 0.38], [width * 0.18, 0], [-width * 0.12, height * 0.38]]);
        ctx.globalAlpha *= 0.52;
        ctx.fill();
        ctx.globalAlpha /= 0.52;
        ctx.beginPath(); ctx.arc(width * 0.2, 0, height * 0.31, 0, Math.PI * 2); ctx.fill();
    } else if (style === 'cold') {
        drawPolygonPath(ctx, [[-width * 0.46, 0], [width * 0.08, -height * 0.22], [width * 0.5, 0], [width * 0.08, height * 0.22]]);
        ctx.fill(); ctx.strokeStyle = '#e9fbff'; ctx.stroke();
    } else if (style === 'light') {
        ctx.beginPath();
        for (let step = 0; step <= 6; step++) {
            let x = -width * 0.5 + width * step / 6;
            let y = step === 0 || step === 6 ? 0 : ((step + Math.floor(progress * 8)) % 2 ? -height * 0.24 : height * 0.24);
            if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#f8f2a0'; ctx.stroke();
    } else if (style === 'chaos') {
        ctx.beginPath(); ctx.arc(0, 0, height * 0.38, -2.35, 2.35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-width * 0.45, 0); ctx.lineTo(width * 0.42, 0); ctx.stroke();
    } else if (style === 'shield') {
        let radius = height * 0.42;
        let points = Array.from({ length: 8 }, (_, index) => {
            let angle = index * Math.PI / 4 + progress * Math.PI * 3;
            return [Math.cos(angle) * radius, Math.sin(angle) * radius];
        });
        drawPolygonPath(ctx, points); ctx.globalAlpha *= 0.56; ctx.fill(); ctx.globalAlpha /= 0.56; ctx.stroke();
    } else {
        drawPolygonPath(ctx, [[-width * 0.48, -height * 0.08], [width * 0.22, -height * 0.08], [width * 0.5, 0], [width * 0.22, height * 0.08], [-width * 0.48, height * 0.08]]);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function getSkillGemVfxFilter(element, imageKey) {
    let key = normalizeSkillGemVfxElement(element);
    if (imageKey === 'skillFxChainPrimary' || imageKey === 'skillFxChainJump') {
        if (key === 'light') return 'none';
        if (key === 'chaos') return 'hue-rotate(78deg) saturate(1.35) brightness(0.94)';
    }
    return ({
        fire: 'sepia(0.65) saturate(3.2) hue-rotate(338deg) brightness(1.12)',
        cold: 'sepia(0.65) saturate(2.8) hue-rotate(155deg) brightness(1.18)',
        light: 'sepia(0.55) saturate(2.8) hue-rotate(172deg) brightness(1.2)',
        chaos: 'sepia(0.7) saturate(3.4) hue-rotate(232deg) brightness(1.08)',
        blood: 'sepia(0.8) saturate(4) hue-rotate(315deg) brightness(0.96)'
    })[key] || 'none';
}

// Color-only VFX filters are fixed per image, so bake each (image, filter) pair once.
// A live ctx.filter forces an offscreen pass on every draw, which dominated busy endgame frames.
const filteredVfxImageCache = new WeakMap();

/**
 * Set ctx.filter for one image draw and return the image to draw. A loaded image gets a cached
 * pre-filtered copy (ctx.filter becomes 'none'); a missing image keeps the live filter so the
 * procedural fallback is tinted as before.
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource|null} image
 * @param {string} filter CSS filter string or 'none'.
 */
function useFilteredVfxImage(ctx, image, filter) {
    filter = filter || 'none';
    if (!image || filter === 'none' || !image.width || !image.height) {
        ctx.filter = filter;
        return image;
    }
    let byFilter = filteredVfxImageCache.get(image);
    if (!byFilter) filteredVfxImageCache.set(image, byFilter = new Map());
    let baked = byFilter.get(filter);
    if (!baked) {
        baked = document.createElement('canvas');
        baked.width = image.width;
        baked.height = image.height;
        let bakeCtx = baked.getContext('2d');
        bakeCtx.filter = filter;
        bakeCtx.drawImage(image, 0, 0);
        byFilter.set(filter, baked);
    }
    ctx.filter = 'none';
    return baked;
}

/** Sword-slash sprites clear ctx.filter themselves, so their effect.filter never tinted them. */
function getDrawnSkillEffectFilter(effect) {
    return effect.family === 'continuousSlash' || effect.skillName === '기본 공격' ? 'none' : effect.filter;
}

function getSkillGemVfxBaseSize(family, stageKind) {
    if (stageKind === 'slamAftershock') return 132;
    if (stageKind === 'slamPrimary') return 104;
    if (stageKind === 'chainPrimary') return 82;
    if (family === 'whirlwind') return 118;
    if (family === 'projectile' || stageKind === 'chainJump') return 44;
    if (family === 'dot') return 116;
    if (family === 'burst') return 94;
    if (family === 'summon') return 78;
    return 82;
}

function getSkillGemVfxStageFamily(profile, stageKind) {
    let family = (profile && profile.family) || 'slash';
    if (stageKind === 'chainPrimary' && profile && profile.primaryFamily) return profile.primaryFamily;
    if (stageKind === 'chainJump') return 'chain';
    return family;
}

function hasMatchingTravelProjectile(skillName, now) {
    return (battleVisualState.skillEffects || []).some(effect => effect
        && effect.travel
        && effect.skillName === skillName
        && Math.abs((Number(effect.arriveAt) || 0) - now) <= 150);
}

function reuseStormStrikeImpact(list, profile, fx, target, now) {
    let targetKey = target && target.enemy && target.enemy.id != null
        ? `enemy:${target.enemy.id}`
        : `cell:${Math.round(Number(target && target.x) || 0)}:${Math.round(Number(target && target.y) || 0)}`;
    let active = list.filter(effect => effect && effect.family === 'stormStrike'
        && effect.skillName === fx.skillName && now - effect.startAt <= effect.duration);
    let reusable = active.find(effect => effect.targetKey === targetKey);
    let cap = Math.max(1, Math.floor(Number(profile.maxActiveImpacts) || 4));
    if (!reusable && active.length >= cap) {
        reusable = active.reduce((oldest, effect) => effect.startAt < oldest.startAt ? effect : oldest);
    }
    if (!reusable) return false;
    reusable.targetKey = targetKey;
    reusable.startAt = now;
    reusable.x = target.x;
    reusable.y = target.y - 5;
    reusable.seed = Math.max(1, Number(fx.id) || 1);
    return true;
}

function getBattleHitVfxGroupSize(fx, stageKind) {
    if (!fx || !fx.damageTextGroupId) return 0;
    return (battleFx || []).reduce((count, row) => count + (row
        && row.type === 'hit'
        && row.damageTextGroupId === fx.damageTextGroupId
        && row.skillName === fx.skillName
        && String(row.stageKind || 'primary') === stageKind ? 1 : 0), 0);
}

function getSkillGemVfxStageImageKey(family, stageKind) {
    if (stageKind === 'chainJump') return SKILL_GEM_VFX_IMAGE_KEYS.chainJump;
    if (stageKind === 'slamPrimary') return SKILL_GEM_VFX_IMAGE_KEYS.slamPrimary;
    if (stageKind === 'slamAftershock') return SKILL_GEM_VFX_IMAGE_KEYS.slamAftershock;
    if (family === 'chain' && stageKind === 'chainPrimary') return SKILL_GEM_VFX_IMAGE_KEYS.chainPrimary;
    if (family === 'projectile') return SKILL_GEM_VFX_IMAGE_KEYS.burst;
    // 전용 절삭·낙뢰·돌진은 이미지가 아닌 아래의 절차적 렌더러가 소유한다.
    return SKILL_GEM_VFX_IMAGE_KEYS[family] || null;
}

/** One small contact per victim; the enclosing cast retains its own geometry. */
function queueSkillHitSpark(list, fx, target, now) {
    let profile = getSkillGemVfxProfile(fx.skillName);
    let element = normalizeSkillGemVfxElement(fx.element, profile.accent);
    list.push({ family: 'hitSpark', skillName: fx.skillName, imageKey: SKILL_GEM_VFX_IMAGE_KEYS.burst,
        startAt: now, duration: 130, x: target.x, y: target.y, size: 24, alpha: 0.64,
        rotation: (Number(fx.id) || 0) * 0.7, seed: Number(fx.id) || 1,
        filter: getSkillGemVfxFilter(element, SKILL_GEM_VFX_IMAGE_KEYS.burst) });
}

/** Merge only confirmed victims of the same combat stage and real repeat. */
function mergeSkillCastVfx(list, fx, profile, target, now) {
    if (!fx.damageTextGroupId) return false;
    if (!['slash', 'slam', 'whirlwind', 'burst', 'dot', 'charge'].includes(profile.family)) return false;
    queueSkillHitSpark(list, fx, target, now);
    if (fx.stageKind === 'earthSpikes') return true;
    trimBattleSkillEffects(list);
    // Area spells already have one cast image in the combat-travel layer.
    if (['burst', 'dot'].includes(profile.family) && getSkillCombatDelivery(SKILL_DB[fx.skillName]) === 'magicCell') return true;
    let cast = list.find(effect => effect.vfxGroupId === fx.damageTextGroupId
        && effect.skillName === fx.skillName && effect.repeatIndex === (Number(fx.repeatIndex) || 0)
        && effect.stageKind === String(fx.stageKind || 'primary'));
    if (!cast) return false;
    return true;
}

function queueSkillGemVfx(fx, enemyPos, playerPos, enemyPosMap, now, viewportScale) {
    if (!fx || fx.dot || !fx.skillName) return;
    // 옆에서 보는 무대의 새 스킬 이펙트: 맞은 적마다의 타격 클립과 연쇄 번개(js/canvas-stage-skill-rules.js).
    if (typeof stageSkillRules === 'object') stageSkillRules.hit(fx, enemyPosMap);
    if (worldTreeSkillFx.queueHit(fx, enemyPos, playerPos || enemyPos, now)) {
        trimBattleSkillEffects(battleVisualState.skillEffects);
        return;
    }
    let profile = getSkillGemVfxProfile(fx.skillName);
    if (!profile) return;
    let stageKind = String(fx.stageKind || 'primary');
    if (profile.impactVfx === false || stageKind.startsWith('meteor')) return;
    let list = battleVisualState.skillEffects || (battleVisualState.skillEffects = []);
    if (profile.family === 'continuousSlash') {
        queueContinuousSlashVfx(list, fx, { source: playerPos || { x: enemyPos.x - 70, y: enemyPos.y }, target: enemyPos }, { now, scale: viewportScale || 1 });
        trimBattleSkillEffects(list);
        return;
    }
    let hitGroupSize = getBattleHitVfxGroupSize(fx, stageKind);
    let crowdedImpact = hitGroupSize >= 5;
    let family = getSkillGemVfxStageFamily(profile, stageKind);
    if (profile.family === 'projectile' && stageKind !== 'chainJump' && hasMatchingTravelProjectile(fx.skillName, now)) return;
    if (mergeSkillCastVfx(list, fx, profile, enemyPos, now)) return;
    let imageKey = fx.skillName === '기본 공격' ? 'skillFxBasicSlash' : getSkillGemVfxStageImageKey(family, stageKind);
    let connector = stageKind === 'chainJump';
    let source = playerPos || { x: enemyPos.x - 70, y: enemyPos.y };
    if (stageKind === 'chainJump' && fx.chainFromEnemyId != null) {
        source = (enemyPosMap && enemyPosMap[fx.chainFromEnemyId])
            || (battleVisualState.enemyGhostPos && battleVisualState.enemyGhostPos[fx.chainFromEnemyId])
            || source;
    }
    let target = enemyPos || { x: source.x + 70, y: source.y };
    let scale = Math.max(0.45, Number(profile.scale) || 1) * clampNumber(Number(viewportScale) || 1, 0.7, 1.16);
    if (target.enemy && target.enemy.isBoss) scale *= 1.08;
    if (crowdedImpact) scale *= 0.82;
    let repeatCount = Math.max(1, Math.min(3, Math.floor(Number(profile.repeats) || 1)));
    if (crowdedImpact) repeatCount = 1;
    if (getBattleVfxDensity() < 0.84) repeatCount = 1;
    if (stageKind === 'chainJump' || stageKind === 'slamAftershock' || stageKind === 'slamPrimary' || family === 'whirlwind') repeatCount = 1;
    let seed = Math.max(1, Number(fx.id) || 1);
    if (family === 'stormStrike' && reuseStormStrikeImpact(list, profile, fx, target, now)) return;
    for (let repeat = 0; repeat < repeatCount; repeat++) {
        let repeatOffset = repeat - (repeatCount - 1) / 2;
        let baseRotation = Math.atan2(target.y - source.y, target.x - source.x);
        let rotation = connector ? baseRotation : baseRotation + Math.PI * 0.28 + repeatOffset * 0.16;
        if (family === 'whirlwind') rotation = (Number(fx.stageIndex) || 0) * (Math.PI / 4) + seed * 0.031;
        list.push({
            skillName: fx.skillName,
            vfxGroupId: fx.damageTextGroupId || '',
            repeatIndex: Number(fx.repeatIndex) || 0,
            element: normalizeSkillGemVfxElement(fx.element, profile.accent),
            family: family,
            footprint: fx.footprint,
            stageKind: stageKind,
            imageKey: imageKey,
            startAt: now + repeat * 44,
            duration: family === 'dot' ? 720 : (family === 'whirlwind' ? 260 : (connector ? 170 : 300)),
            x: family === 'whirlwind' ? source.x : target.x + (connector ? 0 : repeatOffset * 5),
            y: family === 'whirlwind' ? source.y - 3 : target.y - (connector ? 8 : 5) + Math.abs(repeatOffset) * 2,
            fromX: source.x + (family === 'projectile' ? 15 : 0),
            fromY: source.y - (family === 'projectile' ? 18 : 7),
            toX: target.x,
            toY: target.y - 8,
            connector: connector,
            rotation: rotation,
            size: getSkillGemVfxBaseSize(family, stageKind) * scale * (1 - Math.abs(repeatOffset) * 0.08),
            alpha: family === 'dot' ? 0.4 : (family === 'whirlwind' ? 0.62 : (crowdedImpact ? 0.58 : 0.82)),
            filter: getSkillGemVfxFilter(normalizeSkillGemVfxElement(fx.element, profile.accent), imageKey),
            seed: seed + repeat * 17,
            targetKey: family !== 'stormStrike' ? '' : (target.enemy && target.enemy.id != null
                ? `enemy:${target.enemy.id}`
                : `cell:${Math.round(Number(target.x) || 0)}:${Math.round(Number(target.y) || 0)}`)
        });
    }
    trimBattleSkillEffects(list);
}

function queueSkillGemProjectileLaunch(swingFx, targetEntries, playerPos, enemyPosMap, viewportScale) {
    if (!swingFx || swingFx.skillProjectileQueued || !swingFx.projectile || !swingFx.skillName) return;
    swingFx.skillProjectileQueued = true;
    let profile = getSkillGemVfxProfile(swingFx.skillName);
    if (!profile || profile.family !== 'projectile') return;
    let skill = (typeof SKILL_DB !== 'undefined' && SKILL_DB[swingFx.skillName]) || {};
    let targets = (targetEntries || []).map(entry => {
        let enemyId = entry && entry.enemy ? entry.enemy.id : null;
        return enemyId == null ? null : enemyPosMap[enemyId];
    }).filter(Boolean);
    let isPiercePath = skill.targetMode === 'pierce';
    let density = getBattleVfxDensity();
    if (skill.targetMode === 'chain') targets = targets.slice(0, 1);
    else if (isPiercePath) {
        // 관통은 대상 수만큼 탄환을 복제하지 않는다. 한 발이 같은 직선의 마지막 적까지 통과한다.
        targets.sort((a, b) => Math.hypot(a.x - playerPos.x, a.y - playerPos.y) - Math.hypot(b.x - playerPos.x, b.y - playerPos.y));
        targets = targets.length > 0 ? [targets[targets.length - 1]] : [];
    } else {
        let targetCap = skill.projectilePattern && skill.projectilePattern.kind === 'fan' ? 8 : 4;
        targetCap = Math.max(2, Math.round(targetCap * density));
        targets = targets.slice(0, targetCap);
    }
    if (targets.length <= 0) return;
    let imageKey = SKILL_GEM_VFX_IMAGE_KEYS[profile.projectileAsset] || SKILL_GEM_VFX_IMAGE_KEYS.projectile;
    let imageProjectile = !profile.projectileStyle;
    let dedicatedProjectileImage = !!profile.projectileAsset;
    let baseImpactAt = Number(swingFx.impactAt) || (swingFx.start + swingFx.duration);
    let piercedTargetCount = isPiercePath ? Math.max(1, Math.min(12, (targetEntries || []).length)) : 1;
    let arriveAt = baseImpactAt + (isPiercePath ? (piercedTargetCount - 1) * 30 : 0);
    // 공격 모션의 막바지에 빠르게 발사해 직선으로 꽂히며, 마지막 관통 피해와 도착 시점을 맞춘다.
    let releaseAt = Math.max(swingFx.start + 80, baseImpactAt - 82);
    let scale = Math.max(0.45, Number(profile.scale) || 1) * clampNumber(Number(viewportScale) || 1, 0.7, 1.16);
    let repeats = Math.max(1, Math.min(3, Math.floor(Number(profile.repeats) || 1)));
    if (density < 0.84) repeats = 1;
    let list = battleVisualState.skillEffects || (battleVisualState.skillEffects = []);
    targets.forEach((target, targetIndex) => {
        for (let repeat = 0; repeat < repeats; repeat++) {
            let stagger = repeat * 20;
            let startAt = Math.min(arriveAt - 58, releaseAt + stagger);
            let laneOffset = (repeat - (repeats - 1) / 2) * 4;
            list.push({
                skillName: swingFx.skillName,
                element: normalizeSkillGemVfxElement(swingFx.element, profile.accent),
                projectileStyle: getSkillProjectileVfxStyle(swingFx.skillName, swingFx.element),
                family: 'projectile',
                stageKind: 'projectileTravel',
                imageKey: imageKey,
                imageProjectile: imageProjectile,
                projectileWidth: Number(profile.projectileWidth) || 58,
                projectileHeight: Number(profile.projectileHeight) || 26,
                startAt: startAt,
                arriveAt: arriveAt,
                duration: Math.max(70, arriveAt - startAt),
                fromX: playerPos.x + 13,
                fromY: playerPos.y - 20 + laneOffset,
                toX: target.x,
                toY: target.y - 9 + laneOffset,
                travel: true,
                piercePath: isPiercePath,
                connector: false,
                rotation: Math.atan2((target.y - 9 + laneOffset) - (playerPos.y - 20 + laneOffset), target.x - (playerPos.x + 13)),
                size: getSkillGemVfxBaseSize('projectile', 'projectileTravel') * scale * (1 - targetIndex * 0.035),
                alpha: imageProjectile ? 0.94 : (isPiercePath ? 0.78 : 0.72),
                filter: dedicatedProjectileImage ? 'none' : getSkillGemVfxFilter(normalizeSkillGemVfxElement(swingFx.element, profile.accent), imageKey),
                seed: Math.max(1, Number(swingFx.id) || 1) + targetIndex * 19 + repeat * 7
            });
        }
    });
    trimBattleSkillEffects(list);
}

function getCombatTravelScreenPos(gridProj, cell, fallback) {
    if (!cell || !gridProj) return fallback;
    let pos = gridProj.cellToScreen(cell.gx, cell.gy);
    return { x: pos.x, y: pos.y - 10 };
}

function getCombatTravelImageKey(fx) {
    let element = fx.element ? normalizeSkillGemVfxElement(fx.element) : null;
    let profile = getSkillGemVfxProfile(fx.skillName);
    let projectileImageKey = profile && SKILL_GEM_VFX_IMAGE_KEYS[profile.projectileAsset];
    if (projectileImageKey) return projectileImageKey;
    let combatImageKey = profile && SKILL_GEM_VFX_IMAGE_KEYS[profile.combatAsset];
    if (combatImageKey) return combatImageKey;
    if (fx.patternKind === 'mine') return SKILL_GEM_VFX_IMAGE_KEYS.rune;
    if (fx.patternKind === 'field') return !element || element === 'cold' ? SKILL_GEM_VFX_IMAGE_KEYS.frostField : SKILL_GEM_VFX_IMAGE_KEYS.dot;
    if (fx.patternKind === 'moving') return !element || element === 'cold' ? SKILL_GEM_VFX_IMAGE_KEYS.frostWave : SKILL_GEM_VFX_IMAGE_KEYS.projectile;
    if (fx.patternKind === 'boomerang') return SKILL_GEM_VFX_IMAGE_KEYS.chaosBoomerang;
    if (fx.owner === 'enemy' && fx.delivery === 'magicCell') return 'bossTelegraphPulse';
    if (fx.delivery !== 'magicCell') return SKILL_GEM_VFX_IMAGE_KEYS.projectile;
    let family = profile && profile.family;
    return SKILL_GEM_VFX_IMAGE_KEYS[family] || SKILL_GEM_VFX_IMAGE_KEYS.burst;
}

function isSpecializedCombatTravelImage(imageKey) {
    return [SKILL_GEM_VFX_IMAGE_KEYS.frostField, SKILL_GEM_VFX_IMAGE_KEYS.frostWave,
        SKILL_GEM_VFX_IMAGE_KEYS.chaosBoomerang, SKILL_GEM_VFX_IMAGE_KEYS.venomFang].includes(imageKey);
}

function getCombatAreaBounds(targets) {
    let bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    targets.forEach(target => {
        bounds.minX = Math.min(bounds.minX, target.x);
        bounds.maxX = Math.max(bounds.maxX, target.x);
        bounds.minY = Math.min(bounds.minY, target.y);
        bounds.maxY = Math.max(bounds.maxY, target.y);
    });
    bounds.x = (bounds.minX + bounds.maxX) / 2;
    bounds.y = (bounds.minY + bounds.maxY) / 2;
    return bounds;
}

function getRadialBurstScreenRadius(fx, gridProj) {
    if (!gridProj) return 120;
    let profiles = typeof SKILL_GRID_DB !== 'undefined' ? SKILL_GRID_DB : null;
    let profile = profiles && profiles[fx.skillName];
    let radius = Math.max(1, Number(profile && profile.radius) || 1);
    return profile && profile.shape === 'circle' ? (radius + 0.5) * gridProj.tileW : Math.hypot(gridProj.tileW * radius, gridProj.tileH * radius);
}

function drawFrostBurstCombatFx(ctx, fx, now, arriveAt, targets) {
    let burstImage = getSkillGemVfxImage(SKILL_GEM_VFX_IMAGE_KEYS.frostBurst);
    let waveImage = getSkillGemVfxImage(SKILL_GEM_VFX_IMAGE_KEYS.frostWaveRing);
    if (!burstImage && !waveImage) return false;
    let bounds = getCombatAreaBounds(targets);
    let center = fx.screenAim && Number.isFinite(fx.screenAim.x) && Number.isFinite(fx.screenAim.y)
        ? fx.screenAim : { x: bounds.x, y: bounds.y };
    let chargeMs = 160;
    let waveMs = Math.max(120, Number(fx.waveDurationMs) || 255);
    let elapsed = now - arriveAt;
    if (elapsed < -chargeMs || elapsed > waveMs + 180) return true;
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = false;
    if (burstImage && elapsed < 0) {
        let charge = clampNumber((elapsed + chargeMs) / chargeMs, 0, 1);
        let size = 34 + charge * 20;
        ctx.globalAlpha = 0.32 + charge * 0.5;
        ctx.drawImage(burstImage, -size / 2, -size / 2, size, size);
    }
    if (waveImage && elapsed >= 0) {
        let progress = clampNumber(elapsed / waveMs, 0, 1);
        let radius = Math.max(60, Number(fx.screenRadius) || 120);
        let size = Math.max(1, radius * progress * 2);
        ctx.globalAlpha = elapsed <= waveMs ? 0.88
            : clampNumber((waveMs + 180 - elapsed) / 180, 0, 1) * 0.72;
        ctx.drawImage(waveImage, -size / 2, -size / 2, size, size);
    }
    if (burstImage && elapsed >= 0 && elapsed <= 120) {
        let burst = clampNumber(elapsed / 120, 0, 1);
        let size = 54 + burst * 42;
        ctx.globalAlpha = (1 - burst) * 0.9;
        ctx.drawImage(burstImage, -size / 2, -size / 2, size, size);
    }
    ctx.restore();
    return true;
}

function drawSpriteSheetFrame(ctx, image, frameIndex, columns, rows, x, y, width, height) {
    let sourceWidth = Math.max(1, Number(image.naturalWidth) || Number(image.width) || 1) / columns;
    let sourceHeight = Math.max(1, Number(image.naturalHeight) || Number(image.height) || 1) / rows;
    let frame = Math.max(0, Math.floor(frameIndex)) % (columns * rows);
    let sourceX = (frame % columns) * sourceWidth;
    let sourceY = Math.floor(frame / columns) * sourceHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight,
        x - width / 2, y - height / 2, width, height);
}

function drawBlizzardFallbackFx(ctx, bounds, now) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ccefff';
    ctx.lineWidth = 2;
    for (let streak = 0; streak < 4; streak++) {
        let offset = ((now / 12 + streak * 47) % 180) - 90;
        let y = bounds.y - 24 + streak * 16;
        ctx.globalAlpha = 0.18 + streak * 0.04;
        ctx.beginPath();
        ctx.moveTo(bounds.x + offset - 28, y + 8);
        ctx.lineTo(bounds.x + offset + 28, y - 8);
        ctx.stroke();
    }
    ctx.restore();
}

function drawBlizzardCombatFx(ctx, fx, now, arriveAt, targets) {
    let bounds = getCombatAreaBounds(targets);
    let width = Math.max(148, bounds.maxX - bounds.minX + 112);
    let height = Math.max(98, bounds.maxY - bounds.minY + 82);
    let ambient = getSkillGemVfxImage(SKILL_GEM_VFX_IMAGE_KEYS.blizzardAmbient);
    let impact = getSkillGemVfxImage(SKILL_GEM_VFX_IMAGE_KEYS.blizzardImpact);
    let fadeIn = clampNumber((now - fx.start) / 120, 0, 1);
    let fadeOut = clampNumber((fx.start + fx.duration - now) / 180, 0, 1);
    if (ambient) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.24 * fadeIn * fadeOut;
        let ambientFrame = Math.floor(now / 105) % 16;
        drawSpriteSheetFrame(ctx, ambient, ambientFrame, 4, 4, bounds.x, bounds.y, width, height);
        ctx.restore();
    } else {
        drawBlizzardFallbackFx(ctx, bounds, now);
    }
    let elapsed = Math.max(0, now - arriveAt);
    let hitIndex = Math.floor(elapsed / 300);
    let hitElapsed = elapsed - hitIndex * 300;
    if (impact && hitIndex < 4 && hitElapsed < 240) {
        let targetIndex = (Math.max(0, Number(fx.id) || 0) + hitIndex * 3) % targets.length;
        let target = targets[targetIndex];
        let impactFrames = [2, 5, 10, 13];
        let impactFrame = impactFrames[hitIndex];
        let impactSize = Math.max(86, Math.min(132, width * 0.48));
        let phase = clampNumber(hitElapsed / 240, 0, 1);
        let arrival = 1 - Math.pow(1 - phase, 3);
        let direction = hitIndex % 2 === 0 ? -1 : 1;
        ctx.save();
        ctx.translate(target.x + direction * (1 - arrival) * 24, target.y - 8 - (1 - arrival) * 42);
        ctx.rotate(direction * (1 - arrival) * 0.14);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = Math.min(1, phase / 0.12) * Math.pow(1 - phase, 0.65) * fadeOut;
        drawSpriteSheetFrame(ctx, impact, impactFrame, 4, 4,
            0, 0, impactSize * (0.62 + arrival * 0.48), impactSize * (0.62 + arrival * 0.48));
        ctx.restore();
    }
}

function getChannelEffectGeometry(source, aim, targets) {
    let dx = aim.x - source.x;
    let dy = aim.y - source.y;
    let aimLength = Math.max(1, Math.hypot(dx, dy));
    let unitX = dx / aimLength;
    let unitY = dy / aimLength;
    let length = aimLength;
    let halfWidth = 18;
    targets.forEach(target => {
        let offsetX = target.x - source.x;
        let offsetY = target.y - source.y;
        length = Math.max(length, offsetX * unitX + offsetY * unitY + 26);
        halfWidth = Math.max(halfWidth, Math.abs(offsetX * unitY - offsetY * unitX) + 22);
    });
    length = Math.max(52, length);
    return {
        x: source.x + unitX * length / 2,
        y: source.y + unitY * length / 2,
        angle: Math.atan2(dy, dx),
        length,
        width: halfWidth * 2
    };
}

function drawChannelCombatFx(ctx, fx, now, targets) {
    let source = fx.screenSource;
    if (!source || targets.length <= 0) return;
    let aim = fx.screenAim || targets[0];
    let geometry = getChannelEffectGeometry(source, aim, targets);
    let profile = getSkillGemVfxProfile(fx.skillName);
    let imageKey = profile && SKILL_GEM_VFX_IMAGE_KEYS[profile.channelAsset];
    let image = getSkillGemVfxImage(imageKey);
    let fadeOut = clampNumber((fx.start + fx.duration - now) / 160, 0, 1)
        * (0.88 + Math.sin((now - fx.start) / 48) * 0.12);
    ctx.save();
    ctx.translate(geometry.x, geometry.y);
    ctx.rotate(geometry.angle);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.68 * fadeOut;
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = false;
    if (image) ctx.drawImage(image, -geometry.length / 2, -geometry.width / 2, geometry.length, geometry.width);
    else {
        ctx.fillStyle = getElementColor(fx.element);
        ctx.fillRect(-geometry.length / 2, -3, geometry.length, 6);
    }
    ctx.restore();
}

function drawMeteorDescent(ctx, bounds, progress) {
    let eased = progress * progress * progress;
    let x = bounds.x - (1 - eased) * 54;
    let y = bounds.y - (1 - eased) * 120;
    let image = getSkillGemVfxImage(SKILL_GEM_VFX_IMAGE_KEYS.meteorProjectile);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(120, 54));
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.72 + progress * 0.24;
    ctx.imageSmoothingEnabled = false;
    if (image) {
        ctx.drawImage(image, -104, -28, 128, 34);
        ctx.restore();
        return;
    }
    ctx.fillStyle = '#8f1d0b';
    ctx.beginPath(); ctx.moveTo(-92, -5); ctx.lineTo(-18, -15); ctx.lineTo(5, 0);
    ctx.lineTo(-22, 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8a24';
    ctx.beginPath(); ctx.moveTo(-68, 0); ctx.lineTo(-12, -9); ctx.lineTo(8, 0);
    ctx.lineTo(-12, 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2d201d';
    ctx.beginPath(); ctx.moveTo(-12, -13); ctx.lineTo(8, -16); ctx.lineTo(19, -4);
    ctx.lineTo(15, 12); ctx.lineTo(-3, 17); ctx.lineTo(-18, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffc15a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(2, 0); ctx.lineTo(-5, 11); ctx.stroke();
    ctx.restore();
}

function drawMeteorBurningGround(ctx, bounds, now, endAt) {
    let fade = clampNumber((endAt - now) / 380, 0, 1);
    let image = getSkillGemVfxImage(SKILL_GEM_VFX_IMAGE_KEYS.meteorGround);
    let spanX = bounds.maxX - bounds.minX;
    let spanY = bounds.maxY - bounds.minY;
    let width = bounds.width || Math.max(150, spanX + 82, (spanY + 48) * 2.2);
    let height = bounds.height || width * 173 / 448;
    ctx.save(); ctx.translate(bounds.x, bounds.y); ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    if (image) {
        ctx.globalAlpha = fade * (0.44 + Math.sin(now / 130) * 0.04);
        ctx.drawImage(image, -width / 2, -height / 2 + 8, width, height);
        ctx.restore();
        return;
    }
    ctx.globalAlpha = 0.16 * fade; ctx.fillStyle = '#7a1508';
    ctx.beginPath(); ctx.moveTo(-width * 0.5, 2); ctx.lineTo(-width * 0.26, -height * 0.42);
    ctx.lineTo(width * 0.18, -height * 0.35); ctx.lineTo(width * 0.5, 4);
    ctx.lineTo(width * 0.22, height * 0.42); ctx.lineTo(-width * 0.32, height * 0.34); ctx.closePath(); ctx.fill();
    for (let flame = 0; flame < 7; flame++) {
        let phase = flame / 6;
        let x = (phase - 0.5) * width * 0.82;
        let y = Math.sin(flame * 2.1) * height * 0.22;
        let flicker = 9 + ((now / 70 + flame * 3) % 7);
        ctx.globalAlpha = (0.34 + (flame % 2) * 0.1) * fade;
        ctx.fillStyle = flame % 2 ? '#ffb22d' : '#ff5725';
        ctx.beginPath(); ctx.moveTo(x - 6, y + 6); ctx.lineTo(x - 2, y - flicker);
        ctx.lineTo(x + 2, y - flicker * 0.45); ctx.lineTo(x + 6, y + 6); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
}

function drawMeteorImpact(ctx, bounds, now, arriveAt) {
    let burst = clampNumber((now - arriveAt) / 220, 0, 1);
    if (burst >= 1) return;
    let image = getSkillGemVfxImage(SKILL_GEM_VFX_IMAGE_KEYS.meteorImpact);
    let span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    let width = Math.max(154, span + 72) * (0.78 + burst * 0.22);
    let height = width * 281 / 384;
    ctx.save(); ctx.translate(bounds.x, bounds.y); ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.pow(1 - burst, 0.72);
    ctx.imageSmoothingEnabled = false;
    if (image) {
        ctx.drawImage(image, -width / 2, -height * 0.68, width, height);
        ctx.restore();
        return;
    }
    ctx.fillStyle = '#ffd27a';
    for (let shard = 0; shard < 8; shard++) {
        let angle = -2.75 + shard * 0.7;
        let inner = 10 + burst * 18;
        let outer = 28 + burst * (36 + (shard % 3) * 8);
        let side = angle + 0.1;
        ctx.beginPath(); ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
        ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
        ctx.lineTo(Math.cos(side) * (inner + 5), Math.sin(side) * (inner + 5)); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#fff0b8';
    ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(0, -26 * (1 - burst));
    ctx.lineTo(14, 8); ctx.lineTo(0, 17); ctx.closePath(); ctx.fill();
    ctx.restore();
}

function drawMeteorCombatFx(ctx, fx, now, arriveAt, targets) {
    let bounds = getCombatAreaBounds(targets);
    let progress = clampNumber((now - fx.start) / Math.max(1, arriveAt - fx.start), 0, 1);
    if (now < arriveAt) {
        drawMeteorDescent(ctx, bounds, progress);
        return;
    }
    drawMeteorBurningGround(ctx, bounds, now, fx.start + fx.duration);
    drawMeteorImpact(ctx, bounds, now, arriveAt);
}

function drawCombatCellFx(ctx, fx, now, arriveAt, targets, imageKey, element) {
    if (targets.length <= 0) return;
    let profile = getSkillGemVfxProfile(fx.skillName);
    if (profile && profile.family === 'stormStrike') return;
    if (fx.patternKind === 'meteor') {
        drawMeteorCombatFx(ctx, fx, now, arriveAt, targets);
        return;
    }
    if (fx.patternKind === 'field' && fx.skillName === '난타 눈보라') {
        drawBlizzardCombatFx(ctx, fx, now, arriveAt, targets);
        return;
    }
    if (fx.patternKind === 'channel') {
        drawChannelCombatFx(ctx, fx, now, targets);
        return;
    }
    if (fx.patternKind === 'radialBurst' && drawFrostBurstCombatFx(ctx, fx, now, arriveAt, targets)) return;
    let image = getSkillGemVfxImage(imageKey);
    let progress = clampNumber((now - fx.start) / Math.max(1, arriveAt - fx.start), 0, 1);
    let fade = now <= arriveAt ? 0.24 + progress * 0.42
        : clampNumber((fx.start + fx.duration - now) / 260, 0, 1) * 0.48;
    let { drawTargets, size } = getCombatCellVfxLayout(fx, targets);
    let fieldImpact = fx.patternKind === 'field';
    if (fieldImpact) {
        let bounds = getCombatAreaBounds(targets);
        drawTargets = [fx.screenFootprint || { x: bounds.x, y: bounds.y }];
        let span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
        size = clampNumber(span + 78, 110, 360);
        fade = (0.28 + Math.sin(now / 180) * 0.04)
            * clampNumber((fx.start + fx.duration - now) / 220, 0, 1);
    } else if (drawTargets.length >= 4) {
        size *= 0.82;
        fade *= 0.78;
    }
    drawTargets.forEach(target => {
        ctx.save();
        ctx.translate(target.x, target.y);
        ctx.rotate(fieldImpact ? Math.sin(now / 900) * 0.025 : progress * 0.2);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = fade;
        let cellImage = useCombatCellImage(ctx, image, fx, now >= arriveAt,
            isSpecializedCombatTravelImage(imageKey) ? 'none' : getSkillGemVfxFilter(element, imageKey));
        ctx.imageSmoothingEnabled = false;
        if (cellImage) drawCombatCellImage(ctx, cellImage, { fieldImpact, size, progress, fade, fx, now, arriveAt });
        else {
            ctx.strokeStyle = getElementColor(element);
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (element === 'light') {
                for (let step = 0; step <= 5; step++) {
                    let y = -size * 0.34 + size * 0.68 * step / 5;
                    let x = step === 0 || step === 5 ? 0 : ((step + Math.floor(progress * 7)) % 2 ? -size * 0.12 : size * 0.12);
                    if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
            } else {
                ctx.arc(0, 0, size * (0.24 + progress * 0.15), 0, Math.PI * 2);
            }
            ctx.stroke();
        }
        ctx.restore();
    });
}

/** Keep one blast at its aim point; enemy warnings and chain bolts retain their cells. */
function getCombatCellVfxLayout(fx, targets) {
    if (fx.screenFootprint) return { drawTargets: [fx.screenFootprint], size: fx.screenFootprint.width };
    let grid = SKILL_GRID_DB[fx.skillName];
    if (fx.owner === 'enemy' || !grid || !['blast', 'nova'].includes(grid.kind)) {
        return { drawTargets: targets, size: fx.owner === 'enemy' ? 92 : 78 };
    }
    let bounds = getCombatAreaBounds(targets);
    let center = grid.kind === 'nova' ? fx.screenSource : fx.screenAim;
    center = center || { x: bounds.x, y: bounds.y };
    let reach = targets.reduce((max, target) => Math.max(max, Math.hypot(target.x - center.x, target.y - center.y)), 0);
    return { drawTargets: [center], size: clampNumber(reach * 2 + 64, 88, 300) };
}

/**
 * Render the existing cell image; timing is visual milliseconds, never combat state.
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} image
 * @param {{fieldImpact: boolean, size: number, progress: number, fx: {patternKind?: string|null}, now: number, arriveAt: number}} view
 */
/** A landed mine swaps to the shock ring; either image draws with the element tint baked in. */
function useCombatCellImage(ctx, image, fx, landed, filter) {
    if (image && landed && fx.patternKind === 'mine') image = getSkillGemVfxImage(SKILL_GEM_VFX_IMAGE_KEYS.radialWave) || image;
    return useFilteredVfxImage(ctx, image, filter);
}

function drawCombatCellImage(ctx, image, view) {
    let { fieldImpact, size, progress, fx, now, arriveAt } = view;
    if (fx.screenFootprint) {
        let { width, height } = fx.screenFootprint;
        ctx.drawImage(image, -width / 2, -height / 2, width, height);
        return;
    }
    let elapsed = Math.max(0, now - arriveAt);
    let expansion = 0.82 + (1 - Math.exp(-elapsed / 65)) * 0.3;
    if (fieldImpact) {
        ctx.drawImage(image, -size / 2, -size * 0.38, size, size * 0.76);
        return;
    }
    if (fx.patternKind === 'mine' && now < arriveAt) {
        let width = size * (0.62 + progress * 0.12);
        ctx.drawImage(image, -width / 2, -width * 0.32, width, width * 0.64);
        return;
    }
    let width = size * expansion;
    ctx.drawImage(image, -width / 2, -width * 0.56, width, width);
}

function drawCombatMovingFx(ctx, fx, now, launchAt, arriveAt, source, targets, imageKey, element) {
    if (now < launchAt || now > arriveAt || !source) return;
    let progress = clampNumber((now - launchAt) / Math.max(1, arriveAt - launchAt), 0, 1);
    if (enemyProjectileSprites.draw(ctx, fx, source, targets, progress)) return;
    let profile = getSkillGemVfxProfile(fx.skillName) || {};
    let image = getSkillGemVfxImage(imageKey);
    let dedicatedProjectileImage = !!profile.projectileAsset;
    let playerProjectile = fx.owner === 'player';
    let useProjectileImage = !!image && !profile.projectileStyle;
    let width = dedicatedProjectileImage ? (Number(profile.projectileWidth) || 58) : (fx.patternKind === 'moving' ? 112 : (fx.patternKind === 'boomerang' ? 72 : 64));
    let height = dedicatedProjectileImage ? (Number(profile.projectileHeight) || 26) : (fx.patternKind === 'moving' ? 58 : (fx.patternKind === 'boomerang' ? 48 : 24));
    targets.forEach(target => {
        let x = source.x + (target.x - source.x) * progress;
        let y = source.y + (target.y - source.y) * progress;
        let angle = Math.atan2(target.y - source.y, target.x - source.x);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        if (fx.patternKind === 'boomerang' && !useProjectileImage) ctx.rotate(progress * Math.PI * 3);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = useProjectileImage ? 0.94 : 0.82;
        let filter = dedicatedProjectileImage || isSpecializedCombatTravelImage(imageKey) ? 'none' : getSkillGemVfxFilter(element, imageKey);
        let drawnImage = useFilteredVfxImage(ctx, useProjectileImage ? image : null, filter);
        ctx.imageSmoothingEnabled = false;
        if (useProjectileImage) ctx.drawImage(drawnImage, -width / 2, -height / 2, width, height);
        else if (playerProjectile) drawElementProjectileVfx(ctx, getSkillProjectileVfxStyle(fx.skillName, element), width, height, progress);
        else { ctx.fillStyle = getElementColor(element); ctx.fillRect(-12, -3, 24, 6); }
        ctx.restore();
    });
}

/** Interpolate one moving image through its immutable cast-time waypoints. */
function drawCombatPathFx(ctx, fx, now, gridProj) {
    if (fx.enemyFlight?.finished) return;
    const releaseAt = fx.start + fx.releaseDelayMs;
    const elapsed = now - releaseAt, path = fx.travelPath;
    const next = path.findIndex(point => point.offsetMs > elapsed);
    const index = next < 0 ? path.length - 1 : Math.max(1, next);
    const source = getCombatTravelScreenPos(gridProj, path[index - 1]);
    const target = getCombatTravelScreenPos(gridProj, path[index]);
    drawCombatMovingFx(ctx, fx, now, releaseAt + path[index - 1].offsetMs,
        releaseAt + path[index].offsetMs, source, [target], getCombatTravelImageKey(fx),
        normalizeSkillGemVfxElement(fx.element));
}

/** Boss shots (2026-10-06): leave the body centre (half the drawn height above the feet) instead of the anchor cell's corner,
 * and the sprite grows with the tile (js/canvas-enemy-projectiles.js reads fx.screenShotScale). */
/** A boss shot leaves the middle of the body. Once the boss is gone (slain mid-flight) the shot keeps that offset from its source
 * cell instead of jumping back to the cell (2026-10-07 review: 33 px in one frame). */
function prepareBossShot(fx, gridProj, enemyPosMap) {
    const entry = fx.owner === 'enemy' && enemyPosMap ? enemyPosMap[fx.sourceId] : null;
    const cell = getCombatTravelScreenPos(gridProj, fx.sourceCell, null);
    if (!entry || !entry.enemy || !entry.enemy.isBoss) return fx.bossShotOffset && cell ? { x: cell.x + fx.bossShotOffset.x, y: cell.y + fx.bossShotOffset.y } : null;
    fx.screenShotScale = clampNumber(gridProj.tileW / 48, 0.75, 2) * 1.6;
    const origin = { x: entry.x, y: entry.y - Math.max(24, (enemyDrawnHeights.get(entry.enemy) || 0) * 0.5) };
    if (cell) fx.bossShotOffset = { x: origin.x - cell.x, y: origin.y - cell.y };
    return origin;
}

function drawCombatTravelFx(ctx, fx, now, gridProj, playerPos, enemyPosMap) {
    if (worldTreeSkillFx.travel(ctx, fx, now, gridProj)) return;
    if (fx.travelPath) return drawCombatPathFx(ctx, fx, now, gridProj);
    let launchAt = fx.start + Math.max(0, Number(fx.releaseDelayMs) || 0);
    let arriveAt = launchAt + Math.max(1, Number(fx.flightMs) || 1);
    let source = prepareBossShot(fx, gridProj, enemyPosMap) || getCombatTravelScreenPos(gridProj, fx.sourceCell, playerPos);
    let targets = (fx.targetCells || []).map((cell, index) => {
        let current = fx.owner === 'player' && fx.delivery === 'projectileTarget'
            ? enemyPosMap[(fx.targetIds || [])[index]] : null;
        if (fx.owner === 'enemy' && fx.delivery === 'projectileTarget') {
            const victim = fx.targetType === 'player' ? game.gridPlayer : game.summons.find(unit => unit.id === fx.targetId);
            return getCombatTravelScreenPos(gridProj, victim || cell, playerPos);
        }
        return current ? { x: current.x, y: current.y - 10 } : getCombatTravelScreenPos(gridProj, cell, playerPos);
    }).filter(Boolean);
    let imageKey = getCombatTravelImageKey(fx);
    let element = normalizeSkillGemVfxElement(fx.element, fx.element);
    if (drawSkillSignatureTravel(ctx, fx, { now, launchAt, arriveAt, source, targets }, gridProj)) return;
    if (fx.delivery === 'magicCell') {
        fx.screenSource = source;
        fx.screenAim = getCombatTravelScreenPos(gridProj, fx.aimCell, targets[0]);
        fx.screenFootprint = projectSkillFootprint(enemyProjectileSprites.groundArea(fx), gridProj);
        if (fx.patternKind === 'radialBurst') fx.screenRadius = getRadialBurstScreenRadius(fx, gridProj);
        drawFootprintCombatCell(ctx, fx, { now, arriveAt, targets, imageKey, element, playerPoint: playerPos });
    }
    else drawCombatMovingFx(ctx, fx, now, launchAt, arriveAt, source, targets, imageKey, element);
}

/** Ground spells belong below actors; vertical fire remains in the foreground. */
function isGroundSkillCast(fx) {
    if (fx.type !== 'combatTravel' || fx.delivery !== 'magicCell') return false;
    if (enemyProjectileSprites.isGround(fx)) return true;
    if ([10, 28, 29, 32].includes(SKILL_FX_ATLAS[fx.skillName]?.id)) return true;
    let profile = getSkillGemVfxProfile(fx.skillName);
    return ['gravity', 'erosion', 'decay', 'resonance', 'mine'].includes(profile?.signature);
}

/** Shade the environment, then paint ground spells and summons before the main actor layer. */
function drawBattleGroundLayer(ctx, effects, view) {
    drawBattleScreenGrade(ctx, view.width, view.height);
    drawRiftPlayerRing(ctx, view.gridProj, view.playerPos);
    sideEncounterCanvas.portals(ctx, view.gridProj, getCombatTime());
    trialTrapArt.drawGround(ctx, effects, view.now, view.gridProj); // trap cracks, glow, frost, rune, puddle, scorch
    fxRemake.begin(ctx, view.gridProj);
    if (typeof stageSkillVfx === 'object') stageSkillVfx.tick(view.now); // 무대의 새 스킬 이펙트(js/canvas-stage-skill-vfx.js): 프레임마다 시계를 맞춘다
    if (typeof stageBlessing === 'object') stageBlessing.frame(view.now); // 사역룬 가호의 발밑(js/canvas-stage-blessing.js)
    worldTreeSkillFx.castFrame(ctx,view.gridProj,'ground');
    worldTreeSkillFx.drawQueued(ctx, battleVisualState.skillEffects || [], view.now, 'ground');
    for (let fx of effects) {
        if (!isGroundSkillCast(fx)) continue;
        drawCombatTravelFx(ctx, fx, view.now, view.gridProj, view.playerPos, view.enemyPosMap);
    }
    redrawnSkillFx.drawLayer('ground', view.now);
    wispSummonFx.drawLayer('ground', view.now);
    fxRemake.end();
    if (typeof stageSkillVfx === 'object') stageSkillVfx.draw(ctx, 'ground', view.gridProj);
    if (typeof stageBlessing === 'object') stageBlessing.draw(ctx, view.gridProj);
    if (typeof stageOcean === 'object') stageOcean.ground(ctx, view); // 심해: 발밑 먼지와 공기 기둥
    if (typeof stageIncidents === 'object') stageIncidents.ground(ctx, view); // 잔잔한 사건: 별똥별
    drawActiveSummons(ctx, view.playerPos, view.now, view.gridProj);
}

/** Preserve special spell animation while fitting its range to the cast-time grid snapshot. */
function drawFootprintCombatCell(ctx, fx, view) {
    let { now, arriveAt, targets, imageKey, element } = view;
    let footprint = fx.screenFootprint;
    if (!footprint) return drawCombatCellFx(ctx, fx, now, arriveAt, targets, imageKey, element);
    if (enemyProjectileSprites.isGround(fx)) return enemyProjectileSprites.drawGround(ctx, fx, footprint, view);
    if (fx.patternKind === 'earthSpikes') return drawEarthSpikeField(ctx, footprint, { now, arriveAt, start: fx.start, end: fx.start + fx.duration, playerPoint: view.playerPoint }, { spike: getSkillGemVfxImage('skillFxEarthSpike'), crack: getSkillGemVfxImage('skillFxEarthCrack') });
    ctx.save();
    let fade = clampNumber((fx.start + fx.duration - now) / 180, 0, 1);
    drawSkillFootprintGround(ctx, footprint, getElementColor(element), fade);
    drawCombatCellFx(ctx, fx, now, arriveAt, footprint.points, imageKey, element);
    ctx.restore();
}

function drawIaiSkillVfx(ctx, effect, progress) {
    let length = Math.max(54, Math.hypot(effect.toX - effect.fromX, effect.toY - effect.fromY));
    let reveal = 0.65 + Math.min(1, progress / 0.18) * 0.35;
    ctx.translate(effect.x, effect.y);
    ctx.rotate(effect.rotation || 0);
    ctx.strokeStyle = effect.element === 'chaos' ? '#d88cff' : '#f5f7ff';
    ctx.lineWidth = Math.max(2, effect.size * 0.045);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(-length * 0.55 * reveal, 0); ctx.lineTo(length * 0.55 * reveal, 0); ctx.stroke();
    ctx.globalAlpha *= 0.34;
    ctx.beginPath(); ctx.moveTo(-length * 0.42, 6); ctx.lineTo(length * 0.48, -4); ctx.stroke();
}

function drawStormStrikeVfx(ctx, effect, progress) {
    let height = Math.max(70, effect.size * 1.15);
    ctx.translate(effect.x, effect.y);
    ctx.strokeStyle = '#f5ef91';
    ctx.lineWidth = Math.max(2, effect.size * 0.035);
    ctx.shadowColor = '#8edcff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    for (let step = 0; step <= 5; step++) {
        let y = -height + height * step / 5;
        let x = step === 0 || step === 5 ? 0 : (((effect.seed + step) % 3) - 1) * effect.size * 0.1;
        if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = '#f8fcff';
    ctx.lineWidth *= 0.4;
    ctx.globalAlpha *= 0.9 - progress * 0.2;
    ctx.stroke();
}

function drawCoreSkillVfx(ctx, effect, progress) {
    ctx.translate(effect.x, effect.y);
    ctx.rotate(progress * Math.PI * 1.4 + effect.seed * 0.01);
    ctx.strokeStyle = getElementColor(effect.element);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(0, 0, effect.size * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha *= 0.58;
    for (let ring = 1; ring <= 2; ring++) {
        ctx.beginPath();
        ctx.arc(0, 0, effect.size * (0.22 + ring * 0.11), ring * 0.5, Math.PI * 1.55 + ring * 0.4);
        ctx.stroke();
    }
}

function drawShieldChargeImpactVfx(ctx, effect, progress) {
    let pulse = Math.sin(progress * Math.PI);
    let size = Math.max(54, effect.size || 82);
    ctx.translate(effect.x, effect.y);
    ctx.rotate(Math.atan2(effect.toY - effect.fromY, effect.toX - effect.fromX));
    ctx.shadowColor = '#bde8ff';
    ctx.shadowBlur = 10 * pulse;
    ctx.strokeStyle = '#e8f5ff';
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.globalAlpha *= 0.4 + pulse * 0.5;
    for (let layer = 0; layer < 3; layer++) {
        let reach = size * (0.2 + layer * 0.12 + progress * 0.12);
        let spread = size * (0.24 + layer * 0.08);
        ctx.beginPath();
        ctx.moveTo(reach - size * 0.1, -spread);
        ctx.bezierCurveTo(reach + size * 0.16, -spread * 0.55, reach + size * 0.2, spread * 0.55, reach - size * 0.1, spread);
        ctx.stroke();
    }
    ctx.fillStyle = '#91b5c8';
    ctx.shadowBlur = 4;
    for (let shard = 0; shard < 6; shard++) {
        let lane = shard - 2.5;
        let distance = size * (0.14 + progress * (0.22 + (shard % 3) * 0.05));
        ctx.save();
        ctx.translate(distance, lane * size * 0.095);
        ctx.rotate(lane * 0.34 + progress * 0.8);
        ctx.fillRect(-size * 0.055, -size * 0.022, size * 0.11, size * 0.044);
        ctx.restore();
    }
    ctx.globalAlpha *= 0.45;
    ctx.fillStyle = '#7d91a0';
    ctx.beginPath();
    ctx.ellipse(size * 0.08, size * 0.28, size * (0.32 + progress * 0.18), size * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawProceduralSkillImpact(ctx, effect, progress) {
    if (effect.family === 'iai') drawIaiSkillVfx(ctx, effect, progress);
    else if (effect.family === 'stormStrike') drawStormStrikeVfx(ctx, effect, progress);
    else if (effect.family === 'fireCore' || effect.family === 'mine') drawCoreSkillVfx(ctx, effect, progress);
    else if (effect.family === 'charge') drawShieldChargeImpactVfx(ctx, effect, progress);
    else return false;
    return true;
}

function drawPlayerMobilityFx(ctx, fx, progress, gridProj) {
    if (!gridProj || !fx.fromCell || !fx.toCell) return;
    worldTreeSkillFx.mobility(ctx, fx, progress, gridProj);
}

function drawTrialTrapGridFx(ctx, fx, progress, gridProj, warning) {
    if (fx.type === 'bossAreaImpact') return bossAttackView.drawImpact(ctx, fx, progress, gridProj);
    if (!gridProj || !Array.isArray(fx.targetCells)) return;
    // 원소마다 바닥에서 솟는 실체(js/canvas-trial-traps.js; 바닥 부분은 drawBattleGroundLayer가 인물 아래에 그렸다).
    if (trialTrapArt.drawRise(ctx, fx, progress, gridProj)) return;
    let halfW = gridProj.tileW / 2;
    let halfH = gridProj.tileH / 2;
    let pulse = 0.5 + Math.sin(progress * Math.PI * 8) * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    fx.targetCells.forEach(cell => {
        let pos = gridProj.cellToScreen(cell.gx, cell.gy);
        ctx.beginPath();
        ctx.rect(pos.x - halfW, pos.y - halfH, gridProj.tileW, gridProj.tileH);
        ctx.globalAlpha = warning ? 0.1 + pulse * 0.16 : (1 - progress) * 0.5;
        ctx.fillStyle = fx.color || '#ffd36b';
        ctx.fill();
        ctx.globalAlpha = warning ? 0.48 + pulse * 0.38 : (1 - progress) * 0.95;
        ctx.strokeStyle = warning ? (fx.color || '#ffd36b') : '#fff3c6';
        ctx.lineWidth = warning ? 2 : 2.6;
        ctx.setLineDash(warning ? [5, 4] : []);
        ctx.stroke();
        if (warning) return;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(pos.x - halfW * 0.3, pos.y - halfH * 0.3);
        ctx.lineTo(pos.x + halfW * 0.3, pos.y + halfH * 0.3);
        ctx.moveTo(pos.x + halfW * 0.3, pos.y - halfH * 0.3);
        ctx.lineTo(pos.x - halfW * 0.3, pos.y + halfH * 0.3);
        ctx.stroke();
    });
    ctx.restore();
}

/**
 * Draw a local impact from the queued effect without changing it.
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} image
 * @param {Readonly<{family: string, size: number, x: number, y: number, fromX: number, fromY: number, toX: number, toY: number, rotation: number, seed: number}>} effect
 * @param {number} progress Normalized visual lifetime, 0..1.
 */
function drawSkillImpactImage(ctx, image, effect, progress) {
    if (effect.skillName === '기본 공격') {
        const angle = Math.atan2(effect.toY - effect.fromY, effect.toX - effect.fromX);
        drawSwordSlashVfx(ctx, { ...effect, rotation: angle, sweep: 1, size: effect.size * 1.6,
            x: effect.x - Math.cos(angle) * 8, y: effect.y - 14 - Math.sin(angle) * 8 }, image, progress);
        return;
    }
    if (!image) return drawProceduralSkillImpact(ctx, effect, progress);
    let grow = 0.8 + (1 - Math.pow(1 - progress, 3)) * 0.36;
    let size = effect.size * grow;
    ctx.translate(effect.x, effect.y);
    if (effect.family === 'slash') {
        let angle = Math.atan2(effect.toY - effect.fromY, effect.toX - effect.fromX);
        ctx.translate(-Math.cos(angle) * 8, -14 - Math.sin(angle) * 8);
        ctx.rotate(angle + (Math.min(1, progress / 0.36) - 1) * 0.65 + (effect.seed % 3 - 1) * 0.12);
        size *= 2;
        ctx.drawImage(image, -size * 0.79, -size * 0.48, size, size * 0.96);
        return;
    }
    if (['slam', 'dot', 'whirlwind'].includes(effect.family)) {
        ctx.scale(1, 0.64);
        if (effect.family === 'whirlwind') ctx.rotate(effect.rotation + progress * 2.4);
        ctx.drawImage(image, -size / 2, -size / 2, size, size);
        return;
    }
    ctx.translate(0, -12);
    ctx.rotate((effect.rotation || 0) + progress * 0.18);
    let height = effect.family === 'summon' ? size * 0.68 : size;
    ctx.drawImage(image, -size / 2, -height / 2, size, height);
}

/** Return true only when a large effect was fitted to the cast-time attack footprint. */
function drawFootprintSkillImpact(ctx, effect, image, progress) {
    if (drawSkillSignatureImpact(ctx, effect, progress)) return true;
    let footprint = effect.footprint;
    if (!footprint || ['projectile', 'chain', 'summon', 'stormStrike'].includes(effect.family)) return false;
    ctx.save();
    let fade = Math.min(1, progress / 0.045) * Math.pow(1 - progress, 1.1);
    drawSkillFootprintGround(ctx, footprint, getElementColor(effect.element), fade);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = (effect.alpha || 0.82) * fade;
    image = useFilteredVfxImage(ctx, image, getDrawnSkillEffectFilter(effect));
    ctx.imageSmoothingEnabled = false;
    let fitted = { ...effect, size: Math.min(footprint.width, footprint.height) };
    if (effect.family === 'continuousSlash') drawSwordSlashVfx(ctx, fitted, image, progress);
    else if (effect.family === 'slash') drawSkillImpactImage(ctx, image, fitted, progress);
    else if (image) ctx.drawImage(image, footprint.x - footprint.width * 0.56,
        footprint.y - footprint.height * 0.56, footprint.width * 1.12, footprint.height * 1.12);
    else drawProceduralSkillImpact(ctx, fitted, progress);
    ctx.restore();
    return true;
}

function drawSkillGemVfxLayer(ctx, now, gridProj) {
    fxRemake.begin(ctx, gridProj); // stays open through the battleFx overlay loop; closed in drawBattleLightingAndBars
    worldTreeSkillFx.castFrame(ctx,gridProj,'foreground');
    let list = battleVisualState.skillEffects || [];
    worldTreeSkillFx.drawQueued(ctx, list, now, 'foreground');
    if (typeof stageSkillVfx === 'object') { stageSkillVfx.draw(ctx, 'top', gridProj); stageSkillSigil.draw(ctx, gridProj); }
    bossMoveView.drawAir(ctx, gridProj); // boss moves: the charge at the hand, shots, beams (js/canvas-boss-moves.js)
    const spriteRenderers = {continuousSlash:drawSwordSlashVfx};
    list.forEach(drawSkillGemVfxLayer.ground.follow(ctx, gridProj, effect => {
        let image = getSkillGemVfxImage(effect.imageKey);
        let elapsed = now - effect.startAt;
        if (elapsed < 0 || elapsed > effect.duration) return;
        let t = clampNumber(elapsed / Math.max(1, effect.duration), 0, 1);
        if (SKILL_FX_ATLAS[effect.skillName]) return;
        if (drawFootprintSkillImpact(ctx, effect, image, t)) return;
        const spriteRenderer = spriteRenderers[effect.family];
        if (spriteRenderer) return spriteRenderer(ctx, effect, image, t);
        let fade = Math.min(1, t / 0.045) * Math.pow(1 - t, 1.1);
        if (effect.family === 'dot') fade = Math.min(1, t / 0.16) * Math.min(1, (1 - t) / 0.28);
        if (effect.travel) fade = Math.min(1, t / 0.12) * Math.min(1, (1 - t) / 0.1);
        ctx.save();
        let imageProjectile = !!(effect.travel && effect.imageProjectile);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = clampNumber((effect.alpha || 0.7) * fade, 0, imageProjectile ? 0.94 : 0.82);
        image = useFilteredVfxImage(ctx, image, imageProjectile ? 'none' : getDrawnSkillEffectFilter(effect));
        ctx.imageSmoothingEnabled = false;
        if (effect.travel) {
            // 모든 플레이어 투사체는 포물선 없이 실제 발사선 위를 빠르게 이동한다.
            let travelProgress = t;
            let x = effect.fromX + (effect.toX - effect.fromX) * travelProgress;
            let y = effect.fromY + (effect.toY - effect.fromY) * travelProgress;
            let width = imageProjectile ? effect.projectileWidth : effect.size * 1.52;
            let height = imageProjectile ? effect.projectileHeight : effect.size * 0.52;
            ctx.translate(x, y);
            ctx.rotate(effect.rotation || 0);
            if (imageProjectile && image) ctx.drawImage(image, -width / 2, -height / 2, width, height);
            else drawElementProjectileVfx(ctx, effect.projectileStyle || effect.element, width, height, t);
        } else if (effect.connector) {
            let reveal = Math.min(1, t / 0.22);
            let fromX = effect.toX + (effect.fromX - effect.toX) * reveal;
            let fromY = effect.toY + (effect.fromY - effect.toY) * reveal;
            let dx = effect.toX - fromX;
            let dy = effect.toY - fromY;
            let length = Math.max(8, Math.hypot(dx, dy));
            let thickness = Math.max(12, effect.size * (0.36 + Math.sin(t * Math.PI) * 0.12));
            ctx.translate((fromX + effect.toX) / 2, (fromY + effect.toY) / 2);
            ctx.rotate(Math.atan2(dy, dx));
            if (image) ctx.drawImage(image, -length / 2, -thickness / 2, length, thickness);
        } else {
            if (image || effect.skillName === '기본 공격') drawSkillImpactImage(ctx, image, effect, t);
            else drawProceduralSkillImpact(ctx, effect, t);
        }
        ctx.restore();
    }));
}

/** Common slashes and hit sparks keep their cast-time pixels and footprint. Move only the drawing context with the camera,
 * never their shared geometry or atlas-owned effects. A changed zoom/depth keeps the existing presentation until expiry. */
drawSkillGemVfxLayer.ground = (() => {
    function note(list, projection) {
        const origin = projection.cellToScreen(0, 0);
        for (const effect of list) {
            if (effect.spawnGround || SKILL_FX_ATLAS[effect.skillName] || (effect.family !== 'slash' && effect.family !== 'hitSpark')) continue;
            effect.spawnGround = { x: origin.x, y: origin.y, tileW: projection.tileW, tileH: projection.tileH };
        }
    }
    function follow(ctx, projection, paint) {
        return effect => {
            const anchor = effect.spawnGround;
            if (!anchor || anchor.tileW !== projection.tileW || anchor.tileH !== projection.tileH) return paint(effect);
            const now = projection.cellToScreen(0, 0);
            if (now.x === anchor.x && now.y === anchor.y) return paint(effect);
            ctx.save();
            ctx.translate(now.x - anchor.x, now.y - anchor.y);
            try { paint(effect); } finally { ctx.restore(); }
        };
    }
    return Object.freeze({ note, follow });
})();

function getEnemyTelegraphColor(enemy) {
    let element = String((enemy && (enemy.attackElement || enemy.element || enemy.damageElement || enemy.ele)) || 'phys').toLowerCase();
    if (element === 'fire') return { edge: '#ff7b4d', fill: 'rgba(255,76,38,0.18)' };
    if (element === 'cold') return { edge: '#85d8ff', fill: 'rgba(81,188,255,0.17)' };
    if (element === 'light' || element === 'lightning') return { edge: '#ffe873', fill: 'rgba(255,222,68,0.17)' };
    if (element === 'chaos') return { edge: '#cb80ff', fill: 'rgba(169,66,255,0.18)' };
    return { edge: '#ffb26b', fill: 'rgba(255,135,59,0.16)' };
}

function drawBossPatternLabel(ctx, entry, enemy) {
    if (!enemy.patternTelegraphKey && !enemy.attackCast && !(enemy.castInterruptedUntil > getCombatTime())) return;
    const cast = enemyAttackRules.castBar(enemy,getCombatTime(),pendingEnemyCombatAttacks.find(attack => attack.enemyId === enemy.id));
    if (!cast) return;
    ctx.save();
    const width = enemy.isBoss ? 84 : 60;
    const viewWidth = ctx.canvas.width / ctx.getTransform().a;
    const x = Math.round(clampNumber(entry.x-width/2,6,Math.max(6,viewWidth-width-6)));
    const y = Math.round(Math.max(6,entry.y-getEnemyFieldBarLift(enemy)-13));
    reserveBossText(enemy, { x: x - 3, y: y - 3, w: width + 6, h: 14 });
    const edge = cast.cancelled ? '#a8706a' : '#8e7951';
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = '#111310';
    ctx.beginPath();
    ctx.roundRect(x+0.5,y+0.5,width-1,7,3.5);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x+2,y+2,width-4,4,2);
    ctx.clip();
    const progressWidth = Math.round((width-4)*cast.progress);
    ctx.fillStyle = '#b69a60';
    ctx.fillRect(x+2,y+2,progressWidth,4);
    ctx.fillStyle = '#ead8a7';
    ctx.fillRect(x+2,y+2,progressWidth,1);
    ctx.restore();
}

/** The same immutable cell snapshot drives the red warning, impact and collision. */
function drawBossPatternArea(ctx, area, projection, alpha = 3, outlineOnly = false) {
    if (!area) return;
    let footprint = projectSkillFootprint(area, projection);
    if (footprint) drawSkillFootprintGround(ctx, footprint, outlineOnly ? '#ff9970' : '#ff684f', alpha, outlineOnly);
}

function drawEnemyAttackTelegraphs(ctx, layout, gridUnitScale, projection, pendingAttacks) {
    sideEncounterCanvas.pendingWarnings(ctx, projection, pendingAttacks);
    bossMoveView.drawGround(ctx, projection); // boss moves: each stage's warning and the bursts out of the ground (js/canvas-boss-moves.js)
    (layout || []).forEach(entry => {
        let enemy = entry.enemy;
        if (!enemy || enemy.noAttack || enemy.hp <= 0 || !Number.isFinite(Number(enemy.attackTimer))) return;
        let frozen = (enemy.ailments || []).some(ailment => ['freeze','stun','silence'].includes(ailment.type) && ailment.time > 0);
        if (frozen) return;
        if (enemy.isBoss) {
            drawBossPatternArea(ctx, enemy.patternArea, projection, bossAttackView.groundAlpha(enemy));
            return;
        }
        if (!enemy.isElite) return;
        let threshold = 0.84;
        let charge = Number(enemy.attackTimer) || 0;
        if (charge < threshold) return;
        let progress = clampNumber((charge - threshold) / Math.max(0.001, 1 - threshold), 0, 1);
        let palette = getEnemyTelegraphColor(enemy);
        let radiusX = 29 * gridUnitScale;
        let radiusY = radiusX * 0.43;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = palette.fill;
        ctx.strokeStyle = palette.edge;
        ctx.lineWidth = 1.35;
        ctx.globalAlpha = 0.18 + progress * 0.28;
        ctx.beginPath();
        ctx.ellipse(entry.x, entry.y + 8, radiusX * (0.84 + progress * 0.16), radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.08 + progress * 0.18;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.ellipse(entry.x, entry.y + 8, radiusX * 0.68, radiusY * 0.68, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    });
    bossAttackView.drawMarks(ctx, { layout, projection, pending: pendingAttacks }); // lines and fans, landings: on the floor, under the actors
}

/** The player's bar floats just above the drawn head — Hana sprites scale with the tile (×3~×5), so a fixed offset
 * cut across the face on large screens. Legacy sprites keep the old offset. */
/** Player bar fill by remaining life: green from 60%, amber from 35%, red below. Below 35% the bar also thickens and pulses
 * so the warning does not rest on colour alone (drawLowHealthEdge adds the screen-edge pulse at the same threshold). */
function getPlayerHealthBarLook(hpPct, now) {
    if (hpPct >= 0.6) return { fill: '#20bf6b', height: 6, alpha: 0.97 };
    if (hpPct >= 0.35) return { fill: '#e0a530', height: 6, alpha: 0.97 };
    return { fill: '#e2453c', height: 8, alpha: 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(now / 140)) };
}

function drawBattlefieldPlayerHealthBar(ctx, scene) {
    // 2026-10-04 visibility: 64 -> 48px wide so the bar covers less of the field; the height stays readable.
    const look = getPlayerHealthBarLook(scene.hpPct, scene.now);
    const width = 48, height = look.height, head = getHeroHeadY(scene.now), playerPos = scene.light;
    const x = Math.round(playerPos.x - width / 2), y = Math.round(head === null ? playerPos.y - 82 * HERO_SIZE_SCALE : head - 10) - (height - 6);
    ctx.save();
    ctx.globalAlpha = look.alpha;
    ctx.fillStyle = 'rgba(6, 5, 4, 0.72)';
    ctx.fillRect(x, y, width, height);
    if (scene.ghostPct > scene.hpPct + 0.003) {
        ctx.fillStyle = 'rgba(255, 126, 76, 0.58)';
        ctx.fillRect(x, y, Math.max(1, Math.round(width * scene.ghostPct)), height);
    }
    ctx.fillStyle = look.fill;
    ctx.fillRect(x, y, Math.max(2, Math.round(width * scene.hpPct)), height);
    if (scene.esPct > 0) {
        ctx.fillStyle = 'rgba(75,123,236,0.85)';
        ctx.fillRect(x, y, Math.max(1, Math.round(width * scene.esPct)), height);
    }
    ctx.strokeStyle = 'rgba(6, 5, 4, 0.9)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);
    ctx.restore();
}

// 정예는 일반 무리와 한눈에 구분되도록 체력바 위에 특성 이름표를 단다(보스는 상단 대형 바가 맡는다).
// 일반 · 정예 막대는 칸보다 좁게: 이웃한 두 적의 막대가 맞붙어 한 줄로 읽혔다(검토 4차).
/** 칸 폭을 넘지 않는다: 휴대폰은 칸이 좁아 이웃한 적의 막대가 한 줄로 이어져 보였다(검토 5차). */
function getEnemyFieldBarWidth(enemy, tileW) {
    if (enemy.isBoss) return 96;
    // 2026-10-04 visibility: narrower (40 -> 32, elite 54 -> 44) so packed rows read as separate bars.
    const base = enemy.isElite ? 44 : 32;
    return tileW > 0 ? Math.min(base, Math.max(18, Math.floor(tileW * 0.84))) : base;
}

function getEnemyFieldBarEdge(enemy, targeted) {
    if (targeted) return 'rgba(255, 224, 130, 0.95)';
    return enemy.isElite ? 'rgba(232, 196, 96, 0.8)' : 'rgba(255,255,255,0.14)';
}

function drawEliteNameplate(ctx, centerX, bottomY, enemy) {
    if (!enemy.isElite || enemy.isBoss) return;
    const label = enemy.traitName || '정예';
    ctx.save();
    ctx.font = `12px ${BATTLE_PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const width = Math.ceil(ctx.measureText(label).width) + 10;
    const x = Math.round(centerX), y = Math.round(bottomY);
    ctx.fillStyle = 'rgba(10, 9, 6, 0.82)';
    ctx.fillRect(Math.round(x - width / 2), y - 17, width, 16);
    // 특성 이름은 그 특성의 색(화염 장막은 화염 색, 2026-10-06), 핵심어가 없으면 예전 금빛.
    fillPixelText(ctx, label, x, y - 3, statToneText.lineColor(label, '#f3d77a'));
    ctx.restore();
}

/** Atlas sprites' drawn height this frame (js/ui.js drawEnemySprite), weakly keyed so dead enemies drop out. */
const enemyDrawnHeights = new WeakMap();
function noteEnemyDrawnHeight(enemy, height) { if (enemy && height > 0) enemyDrawnHeights.set(enemy, height); }

/** Bar height above the feet: clear of the drawn sprite (bosses grow with the tile), never below the old fixed lift; a wisp
 * floats its body higher (js/canvas-wisp-actors.js). */
function getEnemyFieldBarLift(enemy, bodyHeight) {
    const base = enemy.isBoss ? 106 : (wispActors.barLift(enemy) || 56);
    const drawn = bodyHeight ?? enemyDrawnHeights.get(enemy) ?? 0;
    return Math.max(base, Math.round(drawn + 10));
}

/** Damage numbers pop centred on the unit's body and rise from there (2026-10-05 user request): beside the body they read as
 * belonging to the neighbour, and over the head they drifted too far from the hit.
 * @param {number} feetY the unit's screen y at its feet in CSS px
 * @param {number} bodyHeight the unit's drawn height in CSS px */
function getDamageTextBodyY(feetY, bodyHeight) {
    return Math.round(feetY - bodyHeight * 0.5);
}

/** 회피 · 막아냄 같은 짧은 판정 글씨의 자리: 몸 위쪽(머리 높이) 가운데 — 몸통 가운데의 대미지 숫자와 겹치지 않는다. */
function getBodyCueAnchor(pos, bodyHeight) {
    return { x: Math.round(pos.x), y: Math.round(pos.y - bodyHeight * (pos.enemy?.isBoss ? 0.64 : 0.92)) };
}

/** The drawn body height an enemy's numbers and cues centre on: its bar lift less the gap (46 for a ghost left without its enemy). */
function getEnemyBodyHeight(enemyPos) {
    return enemyPos.enemy ? getEnemyFieldBarLift(enemyPos.enemy) - 10 : 46;
}

/** The hero's drawn body height: feet to the drawn head, or the old fixed height before the sprite has drawn. */
function getHeroBodyHeight(playerPos, now) {
    const head = getHeroHeadY(now);
    return head === null ? 82 * HERO_SIZE_SCALE : playerPos.y - head;
}

/** An untouched ordinary monster carries no bar: a pack walking in reads as monsters, not a row of full red strips (2026-10-04
 * visibility). The bar appears on the first hit or while targeted; elites and bosses always show theirs. */
function isEnemyFieldBarShown(enemy, targeted) {
    return targeted || enemy.isElite || enemy.isBoss || enemy.hp < enemy.maxHp || (enemy.energyShield || 0) < (enemy.maxEnergyShield || 0);
}

/** This frame's top of each drawn enemy bar with its elite nameplate (screen px): the lock-on arrow stands over it (drawLockOnMark). */
const enemyFieldBarTops = new Map();

/** Actual HP/cast rectangles, recorded as they draw, including screen-edge clamping. */
const bossTextExclusions = [];
function reserveBossText(enemy, box) { if (enemy.isBoss) bossTextExclusions.push(box); }

function drawBattlefieldEnemyHealthBars(ctx, layout, targetIds, tileW) {
    enemyFieldBarTops.clear();
    bossTextExclusions.length = 0;
    (layout || []).forEach(entry => {
        let enemy = entry.enemy;
        if (!isEnemyFieldBarShown(enemy, targetIds.includes(enemy.id))) {
            drawBossPatternLabel(ctx, entry, enemy);
            return;
        }
        let pct = clampNumber(enemy.hp / enemy.maxHp, 0, 1);
        let width = getEnemyFieldBarWidth(enemy, tileW);
        let x = Math.round(entry.x - width / 2);
        let baseY = Math.round(entry.y - getEnemyFieldBarLift(enemy));
        const nameHeight = enemy.isElite && !enemy.isBoss ? 24 : 6;
        const reserved = drawBattlePlayerFigure.readability.place({ x: x - 3, y: baseY - nameHeight, w: width + 6, h: nameHeight + 10 }, !enemy.isBoss);
        enemyFieldBarTops.set(enemy, reserved.y);
        reserveBossText(enemy, reserved);
        let y = reserved.y + nameHeight;
        let targeted = targetIds.includes(enemy.id);
        ctx.save();
        ctx.globalAlpha = 0.96;
        if (y < baseY) {
            ctx.strokeStyle = 'rgba(224,204,159,0.4)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(entry.x, y + 8); ctx.lineTo(entry.x, baseY + 6); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(12, 8, 10, 0.82)'; // 빈 몫도 보이게: 깎인 막대끼리 이어 보이지 않는다
        ctx.fillRect(x, y, width, 6);
        let ghostPct = typeof updateEnemyHpDamageGhost === 'function' ? updateEnemyHpDamageGhost(enemy.id, pct * 100) / 100 : pct;
        if (ghostPct > pct + 0.002) {
            ctx.fillStyle = '#ffd79a';
            ctx.fillRect(x + Math.round(width * pct), y, Math.max(2, Math.round(width * (ghostPct - pct))), 6);
        }
        // 조준한 적도 체력은 같은 빨강: 노란 막대는 무엇인지 알 수 없었다(검토 5차) — 조준은 금빛 두꺼운 테로만 보인다.
        ctx.fillStyle = '#e94f64';
        ctx.fillRect(x, y, Math.max(2, Math.round(width * pct)), 6);
        let esPct = (enemy.maxEnergyShield || 0) > 0 ? clampNumber((enemy.energyShield || 0) / Math.max(1, enemy.maxEnergyShield), 0, 1) : 0;
        if (esPct > 0) {
            ctx.fillStyle = 'rgba(92, 184, 255, 0.92)';
            ctx.fillRect(x, y - 4, Math.max(2, Math.round(width * esPct)), 3);
        }
        ctx.strokeStyle = getEnemyFieldBarEdge(enemy, targeted);
        let edge = targeted ? 1 : 0.5;
        ctx.lineWidth = edge * 2;
        ctx.strokeRect(x - edge, y - edge, width + edge * 2, 6 + edge * 2);
        ctx.restore();
        drawEliteNameplate(ctx, entry.x, y - (esPct > 0 ? 6 : 2), enemy);
        drawBossPatternLabel(ctx, entry, enemy);
    });
}

function drawDamageImpactAccent(ctx, fx, t, enemyPosMap, playerPos) {
    worldTreeSkillFx.feedback.contact(ctx, fx, t * fx.duration, { enemies: enemyPosMap, player: playerPos });
}

// 레벨업: 발밑 고리 + 금빛 기둥 + 떠오르는 레벨 글자. 지속 시간과 호출 시점은 전투 쪽 fx가 소유한다.
function drawLevelUpFx(ctx, fx, t, playerPos, now) {
    const fade = t < 0.4 ? 1 : Math.max(0, (1 - t) / 0.6);
    const cx = playerPos.x, footY = playerPos.y + 2;
    ctx.save();
    ctx.globalAlpha = 0.95 * fade;
    ctx.globalCompositeOperation = 'lighter';
    const pillarHeight = worldTreeSkillFx.feedback.reduced() ? 40 : 70 + 20 * Math.min(1, t * 2.4);
    const pillar = ctx.createLinearGradient(cx, footY, cx, footY - pillarHeight);
    pillar.addColorStop(0, 'rgba(255,214,120,0.85)');
    pillar.addColorStop(0.45, 'rgba(255,229,154,0.4)');
    pillar.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = pillar;
    const pillarWidth = 12 * (1 - t * 0.45);
    ctx.fillRect(cx - pillarWidth / 2, footY - pillarHeight, pillarWidth, pillarHeight);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.85 * fade;
    ctx.strokeStyle = '#ffe59a';
    ctx.lineWidth = 2 * (1 - t) + 0.8;
    ctx.beginPath();
    const radius = worldTreeSkillFx.feedback.reduced() ? 24 : 18 + t * 25;
    ctx.ellipse(cx, footY, radius, radius * 0.36, 0, 0, Math.PI * 2);
    ctx.stroke();
    // The stage hero changes size with the viewport. Keep the label above its head and health bar, not on its torso.
    const head = getHeroHeadY(now) ?? playerPos.y - 82 * HERO_SIZE_SCALE;
    drawLevelUpLabel(ctx, fx, { x: cx, y: Math.max(26, head - 28), alpha: fade });
    ctx.restore();
}

function drawLevelUpLabel(ctx, fx, pos) {
    ctx.globalAlpha = pos.alpha;
    ctx.font = `24px ${BATTLE_PIXEL_FONT}`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = 'rgba(25,9,0,.92)';
    const label = `레벨 ${fx.level || ''}`;
    const x = Math.round(pos.x), y = Math.round(pos.y);
    drawCrispCanvasText(ctx, label, x, y, 'strokeText');
    ctx.fillStyle = '#ffe9a8';
    drawCrispCanvasText(ctx, label, x, y);
}

function getBattlefieldClientPoint(canvas, clientX, clientY) {
    if (!canvas) return null;
    let rect = canvas.getBoundingClientRect();
    return {
        x:(clientX - rect.left) * ((canvas.clientWidth || rect.width) / Math.max(1, rect.width)),
        y:(clientY - rect.top) * ((canvas.clientHeight || rect.height) / Math.max(1, rect.height))
    };
}

function selectPlayerSwingEffects(effects, now, durationScale) {
    let latest = null;
    let frame = null;
    let frameProgress = -1;
    let safeDurationScale = Math.max(1, Math.min(1.6, Number(durationScale) || 1));
    for (let index = effects.length - 1; index >= 0; index--) {
        let fx = effects[index];
        if (!fx || fx.type !== 'playerSwing') continue;
        let duration = Math.max(1, Number(fx.duration) || 1) * safeDurationScale;
        let age = now - Number(fx.start);
        if (!Number.isFinite(age) || age < 0 || age > duration) continue;
        if (!latest) latest = fx;
        let progress = age / duration;
        if (progress <= frameProgress) continue;
        frame = fx;
        frameProgress = progress;
    }
    return { latest, frame };
}

function getPlayableHeroAttackDurationScale(heroId) {
    let classDefinitions = typeof PLAYER_CLASS_DEFS !== 'undefined' ? PLAYER_CLASS_DEFS : null;
    let talentDefinitions = typeof HERO_SELECTION_DEFS !== 'undefined' ? HERO_SELECTION_DEFS : null;
    let definition = (classDefinitions && classDefinitions[heroId]) || (talentDefinitions && talentDefinitions[heroId]);
    return clampNumber(Number(definition && definition.attackAnimationDurationScale) || 1, 1, 1.6);
}

function getPlayerGridMoveDurationMs(moveSpeed, distance) {
    let speed = clampNumber(Number(moveSpeed) || 100, 60, 320);
    let stepMs = COMBAT_GRID_CONFIG.playerMoveIntervalSec * 1000 * (100 / speed);
    return clampNumber(stepMs * 0.82 * Math.sqrt(Math.max(1, Number(distance) || 1)), 140, 520);
}

/**
 * 논리 칸 변경을 한 번의 화면 이동으로 변환한다.
 * 진행도만 오르거나 같은 칸에 머무는 동안에는 새 이동을 만들지 않는다.
 */
function updatePlayerGridVisualMotion(gridProj, playerCell, now, moveSpeed) {
    if (actExplorationState.current(game)) return getExplorationPlayerVisualMotion(gridProj, playerCell);
    let currentCell = { gx: playerCell.gx, gy: playerCell.gy };
    let state = battleVisualState.playerGridMotion;
    if (!state) {
        state = {
            lastCell: currentCell, fromCell: currentCell, toCell: currentCell,
            startedAt: now, durationMs: 0, holdUntil: now, direction: 'east'
        };
        battleVisualState.playerGridMotion = state;
    }
    let changed = state.lastCell.gx !== currentCell.gx || state.lastCell.gy !== currentCell.gy;
    if (changed) {
        let distance = Math.max(
            Math.abs(currentCell.gx - state.lastCell.gx),
            Math.abs(currentCell.gy - state.lastCell.gy)
        );
        const teleport = battleFx.some(fx => {
            if(fx.type !== 'playerMobility' || !fx.instant || !fx.fromCell || !fx.toCell) return false;
            return now >= fx.start && now < fx.start + fx.duration
                && gridCellKey(fx.fromCell.gx,fx.fromCell.gy) === gridCellKey(state.lastCell.gx,state.lastCell.gy)
                && gridCellKey(fx.toCell.gx,fx.toCell.gy) === gridCellKey(currentCell.gx,currentCell.gy);
        });
        let durationMs = teleport ? 0 : getPlayerGridMoveDurationMs(moveSpeed, distance);
        state = {
            lastCell: currentCell,
            fromCell: state.lastCell,
            toCell: currentCell,
            startedAt: now,
            durationMs,
            holdUntil: now + durationMs + Math.min(70, durationMs * 0.14),
            direction: getCardinalMoveDirection(state.lastCell, currentCell)
        };
        battleVisualState.playerGridMotion = state;
        battleVisualState.playerFacingDirection = state.direction;
    }
    let progress = state.durationMs > 0
        ? clampNumber((now - state.startedAt) / state.durationMs, 0, 1)
        : 1;
    let eased = progress * progress * (3 - 2 * progress);
    let from = gridProj.cellToScreen(state.fromCell.gx, state.fromCell.gy);
    let to = gridProj.cellToScreen(state.toCell.gx, state.toCell.gy);
    let groundOffsetY = Number(gridProj.actorGroundOffsetY) || 0;
    from.y += groundOffsetY;
    to.y += groundOffsetY;
    let moving = progress < 1;
    return {
        position: { x: lerpNumber(from.x, to.x, eased), y: lerpNumber(from.y, to.y, eased) },
        targetPosition: to,
        progress,
        direction: state.direction,
        animating: moving || (!moving && now < state.holdUntil)
    };
}

function getExplorationPlayerVisualMotion(projection, player) {
    const run = actExplorationState.current(game);
    const cell = getStageKickoffCell(player) || actExplorationMotion.position(run, player);
    const position = projection.cellToScreen(cell.gx, cell.gy);
    position.y += Number(projection.actorGroundOffsetY) || 0;
    // 걸음 도중에 게임이 멈추면(선택 창, 안내, 창 열림) 걷는 그림도 멈춘다: 멈춘 화면에서 제자리걸음을 하지 않는다.
    return {position, targetPosition: position, direction: run.motionDirection,
        progress: run.motion ? run.motion.elapsed / run.motion.duration : 1, animating: !!run.motion && !isForegroundGameplayPausedForBackground()};
}

/** 그림자 점멸이 박차고 나가는 동안(2026-10-20 스킬룬 전달본 v42, data/stage-view.js kickoffMs) 무대의 주인공 그림이 서 있는 칸: 떠난 칸.
 * 게임의 칸은 이미 닿는 칸이다(그림만 늦게 나타난다). 그때가 아니면 null. */
function getStageKickoffCell(player) {
    const now = battleVisualState.visualNow;
    if (!stageView.enabled() || !Number.isFinite(now)) return null;
    const move = battleFx.find(fx => fx && fx.type === 'playerMobility' && fx.kickoff && fx.fromCell && fx.toCell
        && now >= fx.start && now < fx.start + STAGE_VIEW.kickoffMs && fx.toCell.gx === player.gx && fx.toCell.gy === player.gy);
    return move ? { gx: move.fromCell.gx, gy: move.fromCell.gy } : null;
}

/** 몸이 뜨는 이동 룬(도약 강타, 섬머솔트 슬래시)을 쓰는 동안 주인공의 땅 위 자리는 떠난 칸에서 닿는 칸으로 공중 시간 동안 옮겨 간다
 * (js/canvas-stage-skill-runes.js heroAir). 발밑 고리와 주인공을 따라가는 연출이 이 자리를 쓰고, 높이와 돌기는 몸 그림에만 준다
 * (js/canvas-battle-units.js drawStageHeroAloft). 게임의 칸은 이미 닿는 칸이다(그림만 늦게 따라간다). */
function getStageHeroAirGround(playerPos, now, gridProj) {
    const air = stageView.enabled() && typeof stageSkillRunes === 'object' ? stageSkillRunes.heroAir(now) : null;
    battleVisualState.playerAir = air;
    if (!air) return playerPos;
    const at = gridProj.cellToScreen(air.gx, air.gy);
    return { x: at.x, y: at.y + (Number(gridProj.actorGroundOffsetY) || 0) };
}

function getCardinalMoveDirection(fromCell, toCell) {
    let dx = Number(toCell.gx) - Number(fromCell.gx);
    let dy = Number(toCell.gy) - Number(fromCell.gy);
    if (Math.abs(dy) > Math.abs(dx)) return dy > 0 ? 'south' : 'north';
    return dx < 0 ? 'west' : 'east';
}

function getPlayerReturnWarpPresentation(effects, now) {
    let activeFx = null;
    for (let index = (effects || []).length - 1; index >= 0; index--) {
        let fx = effects[index];
        if (!fx || fx.type !== 'playerReturnWarp') continue;
        let duration = Math.max(1, Number(fx.duration) || 720);
        let progress = (Number(now) - Number(fx.start)) / duration;
        if (!Number.isFinite(progress) || progress < 0 || progress > 1) continue;
        activeFx = { progress: clampNumber(progress, 0, 1), cell: fx.cell };
        break;
    }
    if (!activeFx) return null;
    let reveal = clampNumber(activeFx.progress / 0.34, 0, 1);
    let easedReveal = 1 - Math.pow(1 - reveal, 3);
    return {
        progress: activeFx.progress,
        actorAlpha: easedReveal,
        whiteShroud: Math.sin(clampNumber(activeFx.progress / 0.62, 0, 1) * Math.PI),
        ringScale: 0.55 + (1 - Math.pow(1 - activeFx.progress, 2)) * 1.25,
        fade: 1 - activeFx.progress,
        cell: activeFx.cell
    };
}

function getPlayerReturnDeparturePresentation(effects, now) {
    let activeFx = null;
    for (let index = (effects || []).length - 1; index >= 0; index--) {
        let fx = effects[index];
        if (!fx || fx.type !== 'playerReturnDepart') continue;
        let duration = Math.max(1, Number(fx.duration) || 720);
        let progress = (Number(now) - Number(fx.start)) / duration;
        if (!Number.isFinite(progress) || progress < 0 || progress > 1) continue;
        activeFx = { progress: clampNumber(progress, 0, 1), cell: fx.cell };
        break;
    }
    if (!activeFx) return null;
    let vanish = clampNumber((activeFx.progress - 0.66) / 0.34, 0, 1);
    let easedVanish = vanish * vanish * (3 - 2 * vanish);
    return {
        progress: activeFx.progress,
        actorAlpha: 1 - easedVanish,
        whiteShroud: Math.sin(activeFx.progress * Math.PI),
        fade: Math.sin(activeFx.progress * Math.PI),
        cell: activeFx.cell
    };
}

function getPlayableHeroWalkMotion(heroId, moveProgress, advanceBlend) {
    let blend = clampNumber(Number(advanceBlend) || 0, 0, 1);
    if (blend <= 0) return { x: 0, y: 0 };
    let phase = clampNumber(Number(moveProgress) || 0, 0, 1) * Math.PI * 2;
    let heavyStep = ['hero2', 'hero5', 'hero8'].includes(heroId) ? 1.16 : 1;
    return {
        x: Math.sin(phase) * 0.9 * heavyStep * blend,
        y: -Math.abs(Math.sin(phase * 2)) * 1.15 * heavyStep * blend
    };
}

function sortBattleActorsByDepth(actors) {
    return (actors || []).slice().sort((left, right) => {
        let depthDifference = Number(left.y) - Number(right.y);
        if (Math.abs(depthDifference) > 0.01) return depthDifference;
        if (left.kind !== right.kind) return left.kind === 'player' ? 1 : -1;
        return Number(left.id) - Number(right.id);
    });
}

function drawPlayerReturnWarpEffect(ctx, position, warp, frontLayer) {
    if (!warp) return;
    let ringRadius = 22 * warp.ringScale;
    let beamAlpha = Math.sin(warp.progress * Math.PI) * 0.42;
    ctx.save();
    if (!frontLayer) {
        let beam = ctx.createLinearGradient(position.x, position.y - 68, position.x, position.y + 8);
        beam.addColorStop(0, 'rgba(137, 218, 255, 0)');
        beam.addColorStop(0.58, `rgba(137, 218, 255, ${beamAlpha})`);
        beam.addColorStop(1, 'rgba(184, 156, 255, 0)');
        ctx.fillStyle = beam;
        ctx.fillRect(position.x - 7, position.y - 68, 14, 76);
        ctx.globalAlpha = warp.fade * 0.42;
        ctx.fillStyle = '#79cfff';
        ctx.beginPath();
        ctx.ellipse(position.x, position.y + 7, ringRadius, ringRadius * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = warp.fade * (frontLayer ? 0.9 : 0.68);
    ctx.strokeStyle = frontLayer ? '#e8e2ff' : '#86d9ff';
    ctx.lineWidth = frontLayer ? 2.1 : 2.8;
    ctx.beginPath();
    ctx.ellipse(position.x, position.y + 7, ringRadius, ringRadius * 0.32, 0,
        frontLayer ? 0 : Math.PI, frontLayer ? Math.PI : Math.PI * 2);
    ctx.stroke();
    if (frontLayer) {
        for (let spark = 0; spark < 4; spark++) {
            let angle = spark * Math.PI / 2 + warp.progress * 0.55;
            let reach = ringRadius * (0.72 + spark * 0.055);
            ctx.beginPath();
            ctx.moveTo(position.x + Math.cos(angle) * reach, position.y + 7 + Math.sin(angle) * reach * 0.32);
            ctx.lineTo(position.x + Math.cos(angle) * (reach + 7), position.y + 7 + Math.sin(angle) * (reach + 7) * 0.32);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawPlayerReturnDepartureEffect(ctx, position, departure, frontLayer) {
    if (!departure) return;
    ctx.save();
    if (!frontLayer) {
        let beam = ctx.createLinearGradient(position.x, position.y - 76, position.x, position.y + 8);
        beam.addColorStop(0, 'rgba(164, 229, 255, 0)');
        beam.addColorStop(0.72, `rgba(164, 229, 255, ${departure.fade * 0.28})`);
        beam.addColorStop(1, 'rgba(210, 177, 255, 0)');
        ctx.fillStyle = beam;
        ctx.fillRect(position.x - 7, position.y - 76, 14, 84);
        ctx.globalAlpha = departure.fade * 0.35;
        ctx.strokeStyle = '#91ddff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(position.x, position.y + 7, 22 - departure.progress * 6, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.7;
        for (let spark = 0; spark < 7; spark++) {
            let phase = (departure.progress * 1.45 + spark * 0.17) % 1;
            let x = position.x + (spark - 3) * 5 + Math.sin((phase + spark) * 3.2) * 2;
            let y = position.y + 6 - phase * 76;
            ctx.globalAlpha = Math.sin(phase * Math.PI) * departure.fade * 0.82;
            ctx.strokeStyle = spark % 2 ? '#d8c5ff' : '#b3edff';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - 7 - spark % 3);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawPlayerReturnWhiteShroud(ctx, position, strength, frontLayer) {
    let alpha = clampNumber(Number(strength) || 0, 0, 1);
    if (alpha <= 0.01) return;
    ctx.save();
    if (!frontLayer) {
        let halo = ctx.createRadialGradient(position.x, position.y - 25, 2, position.x, position.y - 22, 29);
        halo.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.34})`);
        halo.addColorStop(0.58, `rgba(232, 247, 255, ${alpha * 0.18})`);
        halo.addColorStop(1, 'rgba(216, 238, 255, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.ellipse(position.x, position.y - 22, 27, 43, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.globalAlpha = alpha * 0.2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(position.x, position.y - 22, 15, 36, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.62;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        for (let streak = -2; streak <= 2; streak++) {
            let x = position.x + streak * 6;
            ctx.beginPath();
            ctx.moveTo(x, position.y + 3 - Math.abs(streak) * 4);
            ctx.lineTo(x + streak, position.y - 37 - Math.abs(streak) * 3);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawBattlePlayerActor(ctx, state) {
    state = worldTreeSkillFx.actorState(state);
    let position = getPlayerHurtPosition(state);
    let returnWarp = state.returnWarp;
    let returnDeparture = state.returnDeparture;
    let warpPosition = returnWarp && returnWarp.position ? returnWarp.position : position;
    let departurePosition = returnDeparture && returnDeparture.position ? returnDeparture.position : position;
    let transition = returnWarp || returnDeparture;
    let transitionPosition = returnWarp ? warpPosition : departurePosition;
    let facingLeft = isBattlePlayerMirrored(state.motionState);
    drawPlayerReturnWhiteShroud(ctx, transitionPosition, transition && transition.whiteShroud, false);
    drawPlayerReturnWarpEffect(ctx, warpPosition, returnWarp, false);
    drawPlayerReturnDepartureEffect(ctx, departurePosition, returnDeparture, false);
    ctx.save();
    if (transition) ctx.globalAlpha = transition.actorAlpha;
    if (facingLeft) {
        ctx.translate(position.x * 2, 0);
        ctx.scale(-1, 1);
    }
    drawTintedBattlePlayerFigure(ctx, state, position);
    ctx.restore();
    drawPlayerReturnWhiteShroud(ctx, transitionPosition, transition && transition.whiteShroud, true);
    drawPlayerReturnWarpEffect(ctx, warpPosition, returnWarp, true);
    drawPlayerReturnDepartureEffect(ctx, departurePosition, returnDeparture, true);
}

function drawBattlePlayerBody(ctx,state,position) {
    const previous=ctx.battleActorAlpha;
    ctx.battleActorAlpha=state.actorAlpha;
    try {
        drawPlayerSprite(ctx,position.x,position.y,2.15*state.gridUnitScale,state.playerFlash,
            state.swingPower,state.currentSkillVisual,state.now,state.motionState);
    } finally {ctx.battleActorAlpha=previous;}
}

function getEnemyAttackMotion(fx, enemyPos, playerPos, now, distance) {
    if (!fx || !enemyPos || !playerPos) return null;
    let duration = Math.max(1, Number(fx.motionMs) || Number(fx.duration) || 220);
    let progress = (Number(now) - Number(fx.start)) / duration;
    if (!(progress >= 0 && progress <= 1)) return null;
    let dx = Number(playerPos.x) - Number(enemyPos.x);
    let dy = Number(playerPos.y) - Number(enemyPos.y);
    let length = Math.hypot(dx, dy);
    if (length < 0.01) return { progress, x: 0, y: 0 };
    let stride = Math.sin(progress * Math.PI) * Math.max(0, Number(distance) || 0);
    return { progress, x: dx / length * stride, y: dy / length * stride };
}

// 타격감(2026-10-04): a struck enemy flinches away from the hero for a moment, further on a crit or a heavy blow (tiles).
const ENEMY_HIT_RECOIL = Object.freeze({ ms: 170, normal: 0.085, crit: 0.14, heavy: 0.17 });
// 피격감(2026-10-04): the hero is knocked back from the attacker, further the more life the hit took (tiles).
const PLAYER_HURT_RECOIL = Object.freeze({ ms: 170, min: 0.035, perLife: 0.5, max: 0.13 });
// The hero's and each summon's incoming damage numbers add up per this many ms of combat (dealt hits: 250 per skill and target).
const HURT_TEXT_MERGE_MS = 400;

/** The damage a hit took, on the hero's body. Hits landing together add up into one number ("-60 2타"), like dealt hits: in a
 * crowd up to ten stacked over the hero and hid it (2026-10-19). Blocked hits keep their own number. */
function spawnHeroHurtText(fx, playerPos, now) {
    spawnDamageText({
        start: now,
        x: playerPos.x,
        y: getDamageTextBodyY(playerPos.y, getHeroBodyHeight(playerPos, now)),
        value: fx.damage,
        enemyHit: true,
        deflected: !!fx.deflected,
        aggregateKey: `hurt:${fx.deflected ? 'block' : 'hit'}:${Math.floor(fx.start / HURT_TEXT_MERGE_MS)}`
    });
}

/** The damage a summon took, on its body (on the hero when the summon is gone), added up per summon like the hero's. */
function spawnSummonHurtText(fx, gridProj, playerPos, now) {
    const summon = (game.summons || []).find(row => row && row.id === fx.summonId);
    const at = summon && gridProj && hasGridCell(summon) ? gridProj.cellToScreen(summon.gx, summon.gy) : playerPos;
    spawnDamageText({
        start: now,
        x: at.x,
        y: getDamageTextBodyY(at.y, 34),
        value: fx.damage,
        enemyHit: true,
        aggregateKey: `summon:${fx.summonId}:${Math.floor(fx.start / HURT_TEXT_MERGE_MS)}`
    });
}

/** Out fast, back slowly: 0 to 1 over the first fifth of the flinch, then eases home. */
function getHitRecoilCurve(t) {
    if (!(t >= 0 && t < 1)) return 0;
    return t < 0.2 ? t / 0.2 : Math.pow(1 - (t - 0.2) / 0.8, 2);
}

/** Offset of `at` pushed away from `from` by `reach` px. The board is seen from above at a slant, so a vertical push is shorter. */
function getRecoilOffset(at, from, reach) {
    const dx = at.x - from.x, dy = at.y - from.y, length = Math.hypot(dx, dy);
    if (!(length > 0.01) || !(reach > 0)) return null;
    return { x: dx / length * reach, y: dy / length * reach * 0.6 };
}

function getEnemyHitRecoilReach(fx) {
    if (fx.impactTier === 'heavy' || fx.impactTier === 'annihilate') return ENEMY_HIT_RECOIL.heavy;
    return fx.crit ? ENEMY_HIT_RECOIL.crit : ENEMY_HIT_RECOIL.normal;
}

function getEnemyHitRecoil(fx, state, tile) {
    const entry = fx.type === 'hit' && !fx.dot && fx.damage > 0 && state.enemyPosMap[fx.enemyId];
    const push = entry ? getHitRecoilCurve((state.now - fx.start) / ENEMY_HIT_RECOIL.ms) : 0;
    const weight = entry && entry.enemy && entry.enemy.isBoss ? 0.5 : 1;
    return push > 0 ? getRecoilOffset(entry, state.playerPos, tile * getEnemyHitRecoilReach(fx) * push * weight) : null;
}

/** Direct-hit flash in visual ms. Independent of skill-effect duration; DoT must not leave a monster permanently white. */
function getEnemyHitFlash(fx, now) {
    if (fx.dot || (fx.type !== 'hit' && fx.type !== 'enemyDeath')) return 0;
    if (fx.type === 'hit' && !(fx.damage > 0)) return 0;
    const age = now - fx.start, duration = fx.crit ? 140 : 110;
    if (age < 0 || age >= duration) return 0;
    const strength = game.settings.hitEmphasis === 'mild' ? 0.42 : 0.92;
    return strength * Math.min(1, (duration - age) / (duration - 40));
}

/** At least 80 ms of original art between pulses, even when a rapid skill keeps landing hits. */
function buildEnemyHitFlashMap(effects, now) {
    const pulses = battleVisualState.enemyHitPulses, result = new Map();
    pulses.forEach((pulse, id) => { if (now < pulse.start || now - pulse.start > 1000) pulses.delete(id); });
    for (let i = effects.length - 1; i >= 0; i--) {
        const fx = effects[i];
        if (fx?.enemyId == null || !getEnemyHitFlash(fx, now)) continue;
        const previous = pulses.get(fx.enemyId);
        if (!previous || fx.start - previous.start >= 220) pulses.set(fx.enemyId, fx);
    }
    for (const [id, pulse] of pulses) result.set(id, getEnemyHitFlash(pulse, now));
    return result;
}

/** Each enemy's flinch this frame, from its latest direct hit (damage over time does not flinch). */
function buildEnemyHitRecoilMap(effects, state) {
    const result = {}, tile = state.gridProj ? state.gridProj.tileW : 48;
    for (let index = (effects || []).length - 1; index >= 0; index--) {
        const fx = effects[index], offset = fx && !(fx.enemyId in result) && getEnemyHitRecoil(fx, state, tile);
        if (offset) result[fx.enemyId] = offset;
    }
    return result;
}

/** The newest effect of a type that started within the last `withinMs`. */
function findRecentBattleFx(type, now, withinMs) {
    for (let index = battleFx.length - 1; index >= 0; index--) {
        const fx = battleFx[index];
        if (fx && fx.type === type && now >= fx.start && now - fx.start < withinMs) return fx;
    }
    return null;
}

/** Where the hero is drawn while a hit knocks it back from its attacker. */
function getPlayerHurtPosition(state) {
    const at = state.playerPos, hit = findRecentBattleFx('playerHit', state.now, PLAYER_HURT_RECOIL.ms);
    const from = hit && Number(hit.damage) > 0 && state.enemyPosMap && state.enemyPosMap[hit.enemyId];
    if (!from) return at;
    const life = clampNumber(PLAYER_HURT_RECOIL.min + (Number(hit.damageRatio) || 0) * PLAYER_HURT_RECOIL.perLife, PLAYER_HURT_RECOIL.min, PLAYER_HURT_RECOIL.max);
    const push = getHitRecoilCurve((state.now - hit.start) / PLAYER_HURT_RECOIL.ms);
    const offset = getRecoilOffset(at, from, (state.gridProj ? state.gridProj.tileW : 48) * life * push);
    return offset ? { ...at, x: at.x + offset.x, y: at.y + offset.y } : at;
}

function buildEnemyAttackMotionMap(effects, enemyPosMap, playerPos, now, gridProj) {
    let result = {};
    // A release keeps its fixed aim for the whole attack clip, even after its short legacy lunge ends.
    function releaseAim(fx, entry) {
        if (now < fx.start || now - fx.start > fx.duration) return null;
        const cell = fx.targetCell, point = cell && gridProj ? gridProj.cellToScreen(cell.gx, cell.gy) : null;
        if (point) point.y += Number(gridProj.actorGroundOffsetY) || 0;
        entry.actualAim = point || playerPos;
        const ghost = battleVisualState.enemyGhostPos[entry.enemy.id];
        if (ghost) ghost.actualAim = { ...entry.actualAim };
        return entry.actualAim;
    }
    (effects || []).forEach(fx => {
        if (!fx || fx.type !== 'enemyAttack' || fx.enemyId == null) return;
        let entry = enemyPosMap[fx.enemyId];
        if (!entry) return;
        let distance = entry.enemy.isBoss ? 10 : (entry.enemy.isElite ? 8 : 6);
        let motion = getEnemyAttackMotion(fx, entry, releaseAim(fx, entry) || playerPos, now, distance);
        if (motion) result[fx.enemyId] = motion;
    });
    return result;
}

/** 옆에서 보는 무대의 몬스터는 왼쪽이나 오른쪽만 본다(2026-10-13 사용자: 걸어올 때 좌우가 맞지 않는다. 전에는 주인공이 위아래로 더
 * 멀면 위나 아래를 본다고 답했고, 무대는 그때 직전 방향을 지켜서 처음 나온 몬스터가 등을 보이며 걸어왔다).
 * 걷는 동안에는 가는 쪽(enemyPos.heading, glideBattleEnemy), 서 있거나 때릴 때는 기록된 실제 목표(없으면 주인공)를 본다. 위아래로만 걷거나
 * 주인공과 거의 같은 세로줄에 서 있으면 'south'를 답한다: 무대는 그때 직전 방향을 지킨다(stageView.facing). */
const STAGE_SIDE_DEAD_PX = 10;
function resolveStageEnemySide(enemyPos, playerPos) {
    if (enemyPos.heading) return enemyPos.heading;
    // 액트 1 입구 방의 첫 몬스터는 하켄을 치는 동안 하켄 쪽을 본다(js/combat.js strikeRescueTarget).
    const rescue = enemyPos.enemy && enemyPos.enemy.rescue;
    if (rescue) return rescue.gx < enemyPos.enemy.gx ? 'west' : 'east';
    const target = enemyPos.actualAim || playerPos, dx = Number(target.x) - Number(enemyPos.x);
    if (Math.abs(dx) <= STAGE_SIDE_DEAD_PX) return 'south';
    return dx < 0 ? 'west' : 'east';
}

function resolveEnemyFacingDirection(enemyPos, playerPos) {
    if (!enemyPos || !playerPos) return 'south';
    if (mobilitySkill.equipped()==='암살' && enemyPos.enemy?.facingDirection) return ({2:'south',4:'west',6:'east',8:'north'})[enemyPos.enemy.facingDirection];
    if (stageView.enabled()) return resolveStageEnemySide(enemyPos, playerPos);
    function cardinal(target) {
        const dx = Number(target.x) - Number(enemyPos.x), dy = Number(target.y) - Number(enemyPos.y);
        if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'west' : 'east';
        return dy < 0 ? 'north' : 'south';
    }
    return cardinal(enemyPos.actualAim || playerPos);
}

// 왼쪽을 보고 그린 보스 그림(data BOSS_ASSET_FRONT_FACING 밖)은 주인공이 오른쪽에 서면 좌우를 뒤집는다.
// 위아래 방향 대신 가로 거리만 본다: 오른쪽 아래의 주인공도 오른쪽이다. 보스 기둥을 지나갈 때 떨지 않게
// 4분의 1칸 안에서는 직전 방향을 지키고, 쓰러지는 잔상도 마지막 방향을 쓴다.
const ENEMY_SPRITE_SIDE_DEAD_ZONE = 0.25;
const enemySpriteSides = new WeakMap();
function noteEnemySpriteSide(enemy, enemyPos, playerPos, tile) {
    if (!enemy || !enemy.bossAssetKey || !enemyPos || !playerPos) return;
    const dx = Number((enemyPos.actualAim || playerPos).x) - Number(enemyPos.x);
    if (Math.abs(dx) > (Number(tile) || 0) * ENEMY_SPRITE_SIDE_DEAD_ZONE) enemySpriteSides.set(enemy, dx > 0 ? 'east' : 'west');
}

function shouldMirrorEnemySprite(enemy) {
    return !!enemy && enemySpriteSides.get(enemy) === 'east' && !BOSS_ASSET_FRONT_FACING.includes(enemy.bossAssetKey);
}

/** The death and hit ghosts draw a copy of the enemy: it keeps the side the living one faced (2026-10-07 review: a boss slain
 * from its right fell with its back turned, the copy had no side of its own). */
function copyEnemySpriteSide(from, to) {
    if (enemySpriteSides.has(from)) enemySpriteSides.set(to, enemySpriteSides.get(from));
    return to;
}

const ENEMY_SPAWN_STAMP_FUTURE_MS = 1000;
/** 0 → 1 while an enemy appears: its spawn stamp, or a boss rising through its entrance (js/canvas-boss-entrance.js).
 * A stamp well ahead of the clock came from another clock (an older session's save, a combat-clock stamp) and would keep
 * the body at alpha 0, so it counts as already appeared. */
function getEnemySpawnAge(enemy, now, duration) {
    const rising = bossEntranceView.enemyAge(enemy, now);
    if (rising !== null) return rising;
    if (!enemy.spawnStamp || enemy.spawnStamp > now + ENEMY_SPAWN_STAMP_FUTURE_MS) return 1;
    return clampNumber((now - enemy.spawnStamp) / duration, 0, 1);
}

function drawBattleEnemyActor(ctx, entry, state) {
    let enemy = entry.enemy;
    // 무대의 보스 입장: 그림을 키우며 띄우지 않고 제 크기로 선 검은 형체가 드러난다(js/canvas-boss-entrance.js stageLook)
    const veil = bossEntranceView.stageLook(enemy, state.now);
    if (veil) { drawEnteringEnemyActor(ctx, entry, state, veil); return; }
    let spawnDuration = enemy.isBoss ? 640 : (enemy.isElite ? 460 : 360);
    let age = getEnemySpawnAge(enemy, state.now, spawnDuration);
    let easedAge = 1 - Math.pow(1 - age, 3);
    let spawnScale = (enemy.isBoss ? 0.46 : 0.68) + easedAge * (enemy.isBoss ? 0.54 : 0.32);
    if (enemy.isBoss) spawnScale += Math.sin(age * Math.PI) * 0.08;
    const crowdScale = getEnemyCrowdScale(enemy, state.enemyCount);
    ctx.save();
    ctx.globalAlpha = easedAge;
    drawEnemyActorSprite(ctx, entry, state, { y: entry.y - (1 - easedAge) * (enemy.isBoss ? 28 : 18), scale: crowdScale * state.gridUnitScale * spawnScale, spawnScale });
    if (enemy.encounterSparks) drawEncounterSparks(ctx, entry, state, enemy.encounterSparks);
    ctx.restore();
}

/** 예전 그림(한 장의 큰 그림에서 잘라 쓰는 것)을 그리는 배율: 적이 많을수록 조금 작게, 보스와 정예는 크게. */
function getEnemyCrowdScale(enemy, count) {
    const row = count >= 9 ? [3.25, 1.72, 1.46] : (count >= 6 ? [3.45, 1.9, 1.62] : [3.65, 2.2, 1.95]);
    return enemy.isBoss ? row[0] : (enemy.isElite ? row[1] : row[2]);
}

/** 무대에서 입장 중인 적: 제 크기와 제자리에, 입장이 정한 모습(검은 형체, 속성 색 테, 드러나는 순간의 흰빛)으로 그린다. */
function drawEnteringEnemyActor(ctx, entry, state, veil) {
    ctx.save();
    ctx.globalAlpha = veil.alpha;
    drawEnemyActorSprite(ctx, entry, state, { y: entry.y, scale: getEnemyCrowdScale(entry.enemy, state.enemyCount) * state.gridUnitScale, spawnScale: 1, veil });
    ctx.restore();
}

/** 입장 중인 적의 모습(js/canvas-boss-entrance.js stageLook)을 시트 그리기에 넘기는 값으로: 흰빛, 검은 형체, 테. 입장 중이 아니면 모두 없다. */
function getEnemyVeilPose(veil) {
    if (!veil) return { flash: 0, shade: 0, rim: null };
    return { flash: veil.flash, shade: veil.shade, rim: veil.rim > 0 ? { color: veil.color, alpha: veil.rim } : null };
}

/** 잿불 터 무리(data/atlas.js encounters sparks): 몸에서 불씨 도트 셋이 떠올라 꺼진다. 그림만 그린다. */
function drawEncounterSparks(ctx, entry, state, color) {
    const tile = (state.gridProj && state.gridProj.tileW) || 32, dot = Math.max(1, Math.round(tile / 16)), seed = Math.abs(entry.enemy.id || 0) * 97;
    ctx.save();
    ctx.fillStyle = color;
    const alpha = ctx.globalAlpha;
    for (let index = 0; index < 3; index++) {
        const t = ((state.now + seed + index * 433) % 1300) / 1300, size = dot * (t < 0.5 ? 2 : 1);
        const x = entry.x + Math.sin((seed + index * 71) % 628 / 100 + t * 3) * tile * 0.22, y = entry.y - tile * (0.3 + t * 0.9);
        ctx.globalAlpha = alpha * (1 - t) * 0.9;
        ctx.fillRect(Math.round(x), Math.round(y), size, size);
    }
    ctx.restore();
}

/** An enemy drawn once more after it left the field (death dissolve, pending-hit ghost): sheet monsters from their sheets,
 * the rest from the atlas. pose = { x, y, scale (atlas), flash, gridProj, now, facing }. */
function drawEnemyAfterimage(ctx, enemy, pose) {
    const tile = pose.gridProj && pose.gridProj.tileW, boss = getBossDrawScale(enemy);
    const sheetPose = { x: pose.x, y: pose.y, tile, now: pose.now, facing: pose.facing, flash: !!pose.flash, spawnScale: boss };
    if (wispActors.draw(ctx, enemy, sheetPose) || monsterActors.draw(ctx, enemy, sheetPose)) return;
    drawEnemySprite(ctx, enemy, pose.x, pose.y, pose.scale * boss, !!pose.flash, pose.now);
}

/** Where an enemy is drawn this frame: { enemy, x, y, moving }. A step on the grid must not look like a jump, so its picture
 * glides from the cell it left: on the top-down field toward the new cell, most of the way at once (the wave judgement,
 * js/combat.js pickWaveFrontTargets, counts with the same glide); on the stage at a walk over the whole step
 * (js/canvas-stage-stride.js), with no follower in screen space, so a scrolling room does not drag the monsters.
 * frame = { now, deltaSec, gridProj }. */
function glideBattleEnemy(entry, frame) {
    const id = entry.enemy.id;
    if (stageView.enabled()) {
        const stride = stageStride.read(entry.enemy, frame.now) || { dx: 0, dy: 0, moving: false };
        const at = { x: entry.x + stride.dx * frame.gridProj.tileW, y: entry.y + stride.dy * frame.gridProj.tileH };
        battleVisualState.enemySmoothPos[id] = at;
        // 가는 쪽: 그려진 자리가 제 칸보다 왼쪽에 남아 있으면 오른쪽으로 걷는 중이다(위아래로만 걸으면 없다)
        const heading = stride.moving && Math.abs(stride.dx) > 0.02 ? (stride.dx < 0 ? 'east' : 'west') : null;
        return { enemy: entry.enemy, x: at.x, y: at.y, moving: stride.moving, heading };
    }
    let smooth = battleVisualState.enemySmoothPos[id];
    if (!smooth) {
        smooth = { x: entry.x, y: entry.y };
        battleVisualState.enemySmoothPos[id] = smooth;
    } else {
        smooth.x = approachNumber(smooth.x, entry.x, COMBAT_GRID_CONFIG.enemyGlideRate, frame.deltaSec);
        smooth.y = approachNumber(smooth.y, entry.y, COMBAT_GRID_CONFIG.enemyGlideRate, frame.deltaSec);
    }
    const distance = Math.hypot(entry.x - smooth.x, entry.y - smooth.y);
    if (distance < 0.65) { smooth.x = entry.x; smooth.y = entry.y; }
    return { enemy: entry.enemy, x: smooth.x, y: smooth.y, moving: distance >= 0.65 };
}

/** 옆에서 보는 무대: 주인공이 전투 기록이나 채팅 창 뒤에 서면 그 창이 옅어진다(js/message-frames-ui.js heroAt). 주인공의 키는 그림의
 * 도트 수로 어림한다(머리 위의 체력 막대까지, 2026-10-20 새 주인공은 키 약 110도트). 위에서 보는 전장에서는 주인공이 늘 화면 가운데라 쓰지 않는다. */
const STAGE_HERO_TALL_DOTS = 118;
function noteStageHeroBehindFrames(playerPos, gridProj) {
    if (typeof messageFrames !== 'object' || !messageFrames.isActive()) return;
    if (!stageView.enabled()) { messageFrames.heroAt(NaN, NaN, NaN); return; }
    messageFrames.heroAt(playerPos.x, playerPos.y, playerPos.y - STAGE_HERO_TALL_DOTS * stageActors.scaleFor(gridProj.tileW));
}

/** 보스는 BOSS_DRAW_SCALE배로 그린다(살아 있는 모습, 사라지는 잔상, 쓰러지는 모습 모두). 일반 몬스터는 1. */
function getBossDrawScale(enemy) {
    return enemy && enemy.isBoss ? BOSS_DRAW_SCALE : 1;
}

/** Wisps, act monsters, roots and realm sets draw from their own 16-dot sheets (js/canvas-wisp-actors.js,
 * js/canvas-monster-actors.js); story bosses keep their atlas sprites. */
function drawEnemyActorSprite(ctx, entry, state, pose) {
    const enemy = entry.enemy, veil = getEnemyVeilPose(pose.veil), facing = resolveEnemyFacingDirection(entry, state.playerPos);
    const flash = Math.max(state.enemyHitFlashes.get(enemy.id) || 0, veil.flash);
    const tile = state.gridProj && state.gridProj.tileW, recoil = (state.enemyHitRecoil || {})[enemy.id] || { x: 0, y: 0 };
    const x = entry.x + recoil.x, y = pose.y + recoil.y, boss = getBossDrawScale(enemy);
    const sheetPose = { x, y, tile, now: state.now, facing, flash, spawnScale: pose.spawnScale * boss, moving: entry.moving === true,
        shade: veil.shade, rim: veil.rim };
    if (wispActors.draw(ctx, enemy, sheetPose) || monsterActors.draw(ctx, enemy, sheetPose)) return;
    noteEnemySpriteSide(enemy, entry, state.playerPos, tile);
    drawEnemySprite(ctx, enemy, x, y, pose.scale * boss, flash, state.now, entry.moving, state.enemyAttackMotions[enemy.id], facing);
}

/** This frame's enemy screen positions and their after-image ghosts: every living enemy, on the screen or not (hits, projectiles
 * and chains aim by this list). On an exploration map an enemy out of the hero's sight (entry.seen, js/canvas-battle-draw-list.js)
 * gets no ghost, and its one-time combat text (hit numbers, evades, the alert "!") is skipped: a monster running in from the fog
 * stays unseen until it steps into sight (2026-10-09 사용자). */
const SIGHT_GATED_FX = new Set(['hit', 'enemyEvade', 'statusText']);
function buildBattleEnemyPosMap(layout, fxList, now, gridProj) {
    const map = {}, hidden = new Set();
    layout.forEach(entry => {
        map[entry.enemy.id] = entry;
        const cell = enemyAttackRules.aimCell(entry.enemy);
        if (cell && gridProj) {
            entry.actualAim = gridProj.cellToScreen(cell.gx, cell.gy);
            entry.actualAim.y += Number(gridProj.actorGroundOffsetY) || 0;
        }
        if (!entry.seen) {
            hidden.add(entry.enemy.id);
            delete battleVisualState.enemyGhostPos[entry.enemy.id];
            return;
        }
        battleVisualState.enemyGhostPos[entry.enemy.id] = { x: entry.x, y: entry.y, actualAim: entry.actualAim && { ...entry.actualAim },
            stamp: now, enemy: copyEnemySpriteSide(entry.enemy, { ...entry.enemy }) };
    });
    if (hidden.size) fxList.forEach(fx => { if (fx && SIGHT_GATED_FX.has(fx.type) && hidden.has(fx.enemyId)) battleVisualState.processedFxIds.add(fx.id); });
    return map;
}

/** Register bodies after drawing: a foreground body never fades a seal drawn behind it. Hidden enemies never reach here. */
function noteStageActorBody(actor, state) {
    if (!stageView.enabled()) return;
    const tile = state.gridProj.tileW;
    if (actor.kind === 'player') {
        stageDoorMarks.seal.body({ ...state.playerPos, halfW: tile * .4, h: getHeroBodyHeight(state.playerPos, state.now) });
    } else if (actor.kind === 'enemy' && actor.entry.enemy.hp > 0) {
        const entry = actor.entry, size = stageRoster.bodySize(entry.enemy, tile)
            || { halfW: tile * .45 * getGridUnitFootprint(entry.enemy).columns, h: getEnemyFieldBarLift(entry.enemy) - 10 };
        stageDoorMarks.seal.body({ x: entry.x, y: entry.y, ...size });
    }
}

function drawBattleActorLayer(ctx, enemyEntries, state) {
    state = { ...state, enemyHitRecoil: buildEnemyHitRecoilMap(battleFx, state) };
    const view = { width: state.width, height: state.height, tile: state.gridProj.tileW };
    // 서서 기다리는 무리도 그림이 화면에 걸치는 것만 그린다(이어진 지도에서는 발견한 곳의 무리가 모두 온다).
    const waiting=getBattleLayout(actExplorationView.waitingEnemies(),0,0,state.gridProj).filter(entry => battleDrawList.touchesView(entry, view));
    // 달려오는 몬스터도 시야 안에 들어와야 보이고(entry.seen), 그 가운데 그림이 화면에 걸치는 것만 그린다(entry.drawn). 화면 밖의 보이는
    // 몬스터는 보는 쪽만 이어 적는다.
    const seen = [];
    for (const entry of enemyEntries || []) {
        if (entry.drawn) seen.push(entry);
        else if (entry.seen) battleDrawList.keepFacing(entry, state.playerPos, view.tile);
    }
    battleDrawList.noteDrawn(seen.concat(waiting), state.gridProj.tileW); // 누른 몬스터 찾기(락온)와 락온 표시의 자리
    let actors = seen.concat(waiting).map(entry => ({
        kind: 'enemy', id: entry.enemy.id, y: entry.y, entry
    }));
    actors.push({ kind: 'player', id: -1, y: state.playerPos.y });
    actExplorationView.appendScenery(actors,state);
    actors.push(...trialTrapArt.riseActors(battleFx, state.now, state.gridProj)); // trap blades, flames, frost: in depth order
    bossEntranceView.drawGround(ctx, state);
    sortBattleActorsByDepth(actors).forEach(actor => {
        if (actor.kind === 'player') drawBattlePlayerActor(ctx, state);
        else if (actor.kind === 'trapRise') actor.draw(ctx);
        else if (actor.kind === 'gate' || actor.kind === 'scenery' || actor.kind === 'object') actExplorationView.drawScenery(ctx,actor,state);
        else drawBattleEnemyActor(ctx, actor.entry, state);
        noteStageActorBody(actor, state);
    });
    drawBattlePlayerFigure.readability.begin(state, seen.concat(waiting));
}

// Phase-2 extracted battlefield canvas renderer block.
function drawLootHighlightLabel(ctx, fx, position, progress) {
    if (!fx.reason) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - progress) * 3);
    ctx.font = `12px ${BATTLE_PIXEL_FONT}`;
    ctx.textAlign = 'center';
    const name = String(fx.itemName || '').slice(0, 24);
    const width = Math.min(250, Math.max(ctx.measureText(name).width, ctx.measureText(fx.reason).width) + 24);
    const top = position.y - 66;
    ctx.fillStyle = 'rgba(15,23,22,0.94)';
    ctx.fillRect(position.x - width / 2, top, width, 43);
    ctx.fillStyle = fx.color;
    ctx.fillRect(position.x - width / 2, top, 3, 43);
    drawCrispCanvasText(ctx, fx.reason, position.x, top + 15);
    ctx.fillStyle = '#f4eedf';
    // 칸보다 긴 이름만 줄여 그린다(줄이면 도트가 번진다).
    if (ctx.measureText(name).width <= width - 16) drawCrispCanvasText(ctx, name, position.x, top + 32);
    else ctx.fillText(name, position.x, top + 32, width - 16);
    ctx.restore();
}

function drawLegacyHitFeedback(ctx, fx, progress, playerPos, enemyPosMap) {
    if (!SKILL_FX_ATLAS[fx.skillName]) drawBattleHitFx(ctx, fx, progress, playerPos, enemyPosMap);
    drawDamageImpactAccent(ctx, fx, progress, enemyPosMap, playerPos);
}

/** The battlefield canvas's CSS box ({width, height, left, top}; width 0 = hidden, display:none here or above), measured once and
 * again only after it resizes, or a second later for a move without a resize. Reading offsetParent and clientWidth every frame
 * forced a style and layout pass right after the tick had touched the HUD (2026-10-07 frame drops: 1.5 s of 14 s on a 4x-throttled
 * phone in the endgame, with the reads in canvas-fx-remake.js boardView and battle-ground-loot-ui.js). A ResizeObserver, or
 * resizeBattlefieldCanvas, marks it stale. */
const battleCanvasBox = (() => {
    const MAX_AGE_MS = 1000;
    let observed = null, box = null, observer = null, hudObserver = null;
    function watch(canvas) {
        if (observed === canvas) return;
        observed = canvas; box = null;
        if (observer) observer.disconnect();
        if (hudObserver) hudObserver.disconnect();
        const hud = document.getElementById('ui-enemy-list');
        const observeSizes = () => {
            box = null;
            if (!observer) return;
            observer.disconnect(); observer.observe(canvas);
            if (hud) [hud, ...hud.querySelectorAll('.enemy-nameplate, .enemy-health-frame, .enemy-hud-meta, .enemy-ailments')].forEach(part => observer.observe(part));
        };
        if (typeof ResizeObserver === 'function') {
            observer = new ResizeObserver(() => { box = null; }); observeSizes();
        }
        if (hud && typeof MutationObserver === 'function') {
            // 같은 값을 다시 넣은 속성(틱마다 hidden = true)은 바뀐 것이 아니다: 그때마다 상자를 버리면 거의 매 프레임 배치를 다시 쟀다
            const changed = row => (row.type === 'attributes' ? row.oldValue !== row.target.getAttribute(row.attributeName)
                : [...row.addedNodes, ...row.removedNodes].some(node => node.nodeType === 1));
            hudObserver = new MutationObserver(rows => { if (rows.some(changed)) observeSizes(); });
            hudObserver.observe(hud, { childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'hidden'] });
        }
        document.addEventListener('scroll', forget, { capture: true, passive: true });
    }
    /** HUD children can extend outside their card. Convert their viewport bounds through CSS zoom, once per cached layout. */
    function enemyOverlays(canvas) {
        const hud = document.querySelector('#ui-enemy-list:not([hidden])');
        if (!hud) return [];
        const view = canvas.getBoundingClientRect();
        if (!view.width || !view.height) return [];
        const sx = canvas.clientWidth / view.width, sy = canvas.clientHeight / view.height;
        return [...hud.querySelectorAll('.enemy-nameplate, .enemy-health-frame, .enemy-hud-meta, .enemy-ailments')].map(element => {
            const rect = element.getBoundingClientRect();
            const x = Math.max(0, (rect.left - view.left) * sx), y = Math.max(0, (rect.top - view.top) * sy);
            const right = Math.min(canvas.clientWidth, (rect.right - view.left) * sx);
            const bottom = Math.min(canvas.clientHeight, (rect.bottom - view.top) * sy);
            return { x, y, w: right - x, h: bottom - y };
        }).filter(rect => rect.w > 0 && rect.h > 0);
    }
    function measure(canvas, now) {
        if (canvas.offsetParent === null) return { width: 0, height: 0, left: 0, top: 0, at: now, enemyOverlays: [] };
        return { width: canvas.clientWidth, height: canvas.clientHeight, left: canvas.offsetLeft, top: canvas.offsetTop, at: now, enemyOverlays: enemyOverlays(canvas) };
    }
    function read(canvas) {
        watch(canvas);
        const now = performance.now();
        if (!box || now - box.at >= MAX_AGE_MS || typeof ResizeObserver !== 'function') box = measure(canvas, now);
        return box;
    }
    function forget() { box = null; }
    return Object.freeze({ read, forget });
})();

const MAP_MONSTERS_LEFT_HINT = 5;
/** Regular monsters still on the map run (waiting packs included, the boss's stage not), or null outside a map. */
function getMapMonstersLeft() {
    const run = typeof actExplorationState === 'object' ? actExplorationState.current(game) : null;
    if (!run || !Array.isArray(run.packs)) return null;
    return run.packs.filter(pack => pack && pack.stage === null).reduce((sum, pack) => sum + (pack.aliveIds || []).length, 0);
}

/** The battlefield's corner caption. The monster count used to sit there all the time ("몬스터 수 3마리"); it now shows only
 * when a few regular monsters are left on the map, to find the stragglers (2026-10-07 user request). Empty hides the box.
 * (A failed-asset line used to sit here too but the chain always overwrote it; the loading screen reports that failure.) */
function getBattlefieldCaption() {
    if (game.isTownReturning && game.moveTimer > 0) return '마을로 귀환 중...';
    if (game.woodsmanEntrancePending) return '혼돈 밖이 침묵합니다… 나무꾼이 다가옵니다.';
    if (game.moveTimer > 0) return '';
    const left = getMapMonstersLeft();
    return left > 0 && left <= MAP_MONSTERS_LEFT_HINT ? `몬스터 ${left}마리 남음` : '';
}

// A monster's arrival: rings, a floor glow and, for a boss, rays (the values renderBattlefield drew inline until 2026-10-19).
const ENEMY_SPAWN_LOOK = Object.freeze({
    boss: Object.freeze({ alpha: 0.72, width: 4, rings: 3, radius: 15, grow: 34, glow: 0.28, rx: 28, ry: 12, rays: true }),
    plain: Object.freeze({ alpha: 0.5, width: 3, rings: 2, radius: 10, grow: 22, glow: 0.18, rx: 18, ry: 8, rays: false })
});
/** A monster's arrival: widening rings and a floor glow at its feet, rays too for a boss. */
function drawEnemySpawnFx(ctx, fx, t, enemy) {
    if (!enemy) return;
    const look = fx.boss ? ENEMY_SPAWN_LOOK.boss : ENEMY_SPAWN_LOOK.plain, colour = fx.color || '#9ed6ff';
    ctx.save();
    ctx.globalAlpha = (1 - t) * look.alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = look.width;
    for (let ring = 0; ring < look.rings; ring++) {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - 4, look.radius + t * look.grow + ring * 6, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.fillStyle = colour;
    ctx.globalAlpha = (1 - t) * look.glow;
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 8, look.rx, look.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    if (look.rays) drawEnemySpawnRays(ctx, t, enemy);
    ctx.restore();
}
function drawEnemySpawnRays(ctx, t, enemy) {
    ctx.globalAlpha = (1 - t) * 0.5;
    for (let ray = 0; ray < 8; ray++) {
        const angle = ray * Math.PI / 4 + t * 0.6;
        ctx.beginPath();
        ctx.moveTo(enemy.x + Math.cos(angle) * 24, enemy.y - 5 + Math.sin(angle) * 12);
        ctx.lineTo(enemy.x + Math.cos(angle) * (46 + t * 18), enemy.y - 5 + Math.sin(angle) * (24 + t * 10));
        ctx.stroke();
    }
}

/** Motes flying from the fallen monster (or the field's right side) to the hero. path = { from, to, width, height }. */
function drawLootPickupFx(ctx, fx, t, path) {
    const { from, to, width, height } = path;
    const startX = from ? from.x : width * 0.72, startY = from ? from.y - 10 : height * 0.62, endX = to.x, endY = to.y - 24;
    ctx.save();
    ctx.globalAlpha = 1 - t * 0.2;
    ctx.fillStyle = fx.color || '#9ed6ff';
    ctx.shadowColor = fx.color || '#9ed6ff';
    ctx.shadowBlur = fx.tier === 'unique' ? 18 : 10;
    for (let mote = 0; mote < 4; mote++) {
        const delay = mote * 0.045;
        const mt = clampNumber((t - delay) / Math.max(0.1, 1 - delay), 0, 1);
        const mx = startX + (endX - startX) * mt + Math.sin(mt * 12 + mote) * (4 - mote * 0.6);
        const my = startY + (endY - startY) * mt - Math.sin(mt * Math.PI) * (18 + mote * 3);
        ctx.globalAlpha = (1 - mt * 0.45) * (1 - mote * 0.14);
        ctx.beginPath();
        ctx.arc(mx, my, 3.5 - mote * 0.45, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// A good drop's beam, rings and sparks: a unique's are taller and more; its strength by tier (others 0.5).
const LOOT_CELEBRATION_LOOK = Object.freeze({
    unique: Object.freeze({ beam: 220, half: 7, width: 4, rings: 3, grow: 44, sparks: 10 }),
    other: Object.freeze({ beam: 145, half: 4, width: 3, rings: 2, grow: 30, sparks: 6 })
});
const LOOT_CELEBRATION_INTENSITY = Object.freeze({ unique: 1, rare: 0.72 });
/** A good drop's beam, rings, sparks and name over where the monster fell. area = { width, height }. */
function drawLootCelebrationFx(ctx, fx, t, enemy, area) {
    const cx = enemy ? enemy.x : area.width * 0.72, cy = enemy ? enemy.y - 10 : area.height * 0.62;
    const look = fx.tier === 'unique' ? LOOT_CELEBRATION_LOOK.unique : LOOT_CELEBRATION_LOOK.other;
    const intensity = LOOT_CELEBRATION_INTENSITY[fx.tier] || 0.5, colour = fx.color || '#ffcf6b';
    ctx.save();
    const beamHeight = look.beam * (0.82 + 0.18 * Math.sin(t * Math.PI));
    const beam = ctx.createLinearGradient(cx, cy, cx, cy - beamHeight);
    beam.addColorStop(0, colour);
    beam.addColorStop(0.28, colour);
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalAlpha = intensity * (1 - t) * 0.72;
    ctx.fillStyle = beam;
    ctx.fillRect(cx - look.half, cy - beamHeight, look.half * 2, beamHeight);
    ctx.globalAlpha = intensity * 0.58 * (1 - t);
    ctx.strokeStyle = colour;
    ctx.lineWidth = look.width;
    for (let ring = 0; ring < look.rings; ring++) {
        ctx.beginPath();
        ctx.arc(cx, cy, 13 + ring * 8 + t * look.grow, 0, Math.PI * 2);
        ctx.stroke();
    }
    drawLootCelebrationSparks(ctx, { x: cx, y: cy }, t, look.sparks);
    drawLootHighlightLabel(ctx, fx, { x: Math.max(130, Math.min(area.width - 130, cx)), y: Math.max(74, cy) }, t);
    ctx.restore();
}
function drawLootCelebrationSparks(ctx, at, t, count) {
    for (let spark = 0; spark < count; spark++) {
        const angle = spark * (Math.PI * 2 / count) + t;
        const reach = 18 + t * 48;
        ctx.beginPath();
        ctx.moveTo(at.x + Math.cos(angle) * reach, at.y + Math.sin(angle) * reach * 0.42);
        ctx.lineTo(at.x + Math.cos(angle) * (reach + 8), at.y + Math.sin(angle) * (reach + 8) * 0.42);
        ctx.stroke();
    }
}

function beginBattlefieldFrame() {
    stageDoorMarks.begin();
    worldTreeSkillFx.beginFrame();
}

/** targetFrameMs: the drawing cadence of the frame loop (js/ui.js renderBattlefieldThrottled), for the effect density.
 * @returns {(boolean|undefined)} true when the frame was drawn to the end (a hidden canvas or art still loading returns early):
 *   only such draws are counted as battlefield frames (js/battle-frame-stats.js). */
function renderBattlefield(forceWhenHidden, targetFrameMs) {
    beginBattlefieldFrame();
    const canvas = document.getElementById('battlefield-canvas');
    if (!canvas) return;
    const box = battleCanvasBox.read(canvas);
    if (!forceWhenHidden && box.width === 0) return;
    if (!battleAssets.ready && !battleAssets.loading && !battleAssets.failed && window.__battleAssetAutoloadEnabled !== false) initBattleAssets();
    const expectedScale = uiDisplay.battleRenderScale;
    const baseWidth = box.width || Math.round((canvas.width || 960) / expectedScale) || 960;
    const baseHeight = box.height || Math.round((canvas.height || 540) / expectedScale) || 540;
    const expectedWidth = Math.max(1, Math.round(baseWidth * expectedScale));
    const expectedHeight = Math.max(1, Math.round(baseHeight * expectedScale));
    if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) resizeBattlefieldCanvas();
    let ctx = canvas.getContext('2d');
    if (!ctx) return;
    const renderScale = clampNumber(Number(canvas.dataset.renderScale) || 1, 1, 2);
    const view = battleCanvasBox.read(canvas); // measured again only when the resize above changed it
    const width = Math.max(1, view.width || Math.round(canvas.width / renderScale) || canvas.width);
    const height = Math.max(1, view.height || Math.round(canvas.height / renderScale) || canvas.height);
    const { now, rawDeltaMs, deltaMs } = worldTreeSkillFx.feedback.advanceClock(performance.now());
    worldTreeSkillFx.feedback.begin(now);
    const deltaSec = deltaMs / 1000;
    battleVisualState.lastNow = now;
    cleanupBattleFx(now);
    let activeEnemyCount = (game.enemies || []).reduce((count, enemy) => count + (enemy && enemy.hp > 0 ? 1 : 0), 0);
    let vfxDensity = updateBattleVfxDensity(rawDeltaMs, activeEnemyCount, targetFrameMs);
    if (typeof attackFxUpdate === 'function') attackFxUpdate(deltaMs);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = vfxDensity < 0.7 ? 'medium' : 'high';

    const cameraShake = getBattleCameraShake(now);
    ctx.translate(cameraShake.x, cameraShake.y);

    let currentZone = getZone(game.currentZoneId);
    let zoneTheme = getBattleZoneTheme(currentZone);
    let gridProj = getBattleGridProjection(width, height, 'grid-contain');
    let backdropActive = drawBattleBackdrop(ctx, width, height, zoneTheme, now, currentZone, gridProj);
    let framePlayerStats = getCanvasPlayerStats();
    let currentTargets = getCanvasSkillTargets(framePlayerStats);
    let appearanceId = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedHeroId;
    let attackAnimationDurationScale = getPlayableHeroAttackDurationScale(appearanceId);
    let swingEffects = selectPlayerSwingEffects(battleFx, now, attackAnimationDurationScale);
    let latestSwingFx = swingEffects.latest;
    let swingFx = swingEffects.frame;
    let playerFlash = false;
    let playerDownActive = false;
    let enemyHitFlashes = buildEnemyHitFlashMap(battleFx, now);
    for (let i = battleFx.length - 1; i >= 0; i--) {
        let fx = battleFx[i];
        if (!fx) continue;
        let age = now - fx.start;
        if (age < 0 || age > fx.duration) continue;
        if (fx.type === 'playerHit') playerFlash = true;
        else if (fx.type === 'playerDown') playerDownActive = true;
    }
    let currentSkill = SKILL_DB[game.activeSkill] || SKILL_DB['기본 공격'];
    let skillAreaCells = getCanvasSkillAreaCells(game.activeSkill || '기본 공격', currentSkill, currentTargets);
    drawBattleGridFloor(ctx, gridProj, zoneTheme, currentTargets, skillAreaCells, backdropActive);
    if (!battleAssets.ready && battleAssets.loading) {
        ctx.save();
        ctx.fillStyle = 'rgba(6,10,16,0.55)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(201, 223, 244, 0.82)';
        ctx.font = `700 24px ${BATTLE_TITLE_FONT}`;
        ctx.textAlign = 'center';
        drawCrispCanvasText(ctx, '전장을 준비하는 중...', width / 2, height / 2);
        ctx.restore();
        document.getElementById('ui-battlefield-caption').innerText = '전장을 준비하는 중...';
        return;
    }
    let enemies = (game.enemies || []).filter(enemy => enemy.hp > 0);
    let swingPower = swingFx ? Math.sin(((now - swingFx.start) / (swingFx.duration * attackAnimationDurationScale)) * Math.PI) : 0;
    let currentSkillVisual = getBattleSkillVisual(game.activeSkill, currentSkill);
    battleVisualState.playerAttackBlend = approachNumber(battleVisualState.playerAttackBlend || 0, swingFx ? 1 : 0, swingFx ? 4 : 3, deltaSec);
    if (swingFx && Number.isFinite(swingFx.motionVariantSeed)) {
        battleVisualState.playerAttackMotionSeed = swingFx.motionVariantSeed;
    }
    battleVisualState.playerHurtBlend = approachNumber(battleVisualState.playerHurtBlend || 0, playerFlash ? 1 : 0, playerFlash ? 6.5 : 4.2, deltaSec);
    battleVisualState.playerDownBlend = approachNumber(battleVisualState.playerDownBlend || 0, playerDownActive ? 1 : 0, playerDownActive ? 7.5 : 4.8, deltaSec);
    let layout = getBattleLayout(enemies, width, height, gridProj);
    let attackBlend = battleVisualState.playerAttackBlend || 0;
    let hurtBlend = battleVisualState.playerHurtBlend || 0;
    let downBlend = battleVisualState.playerDownBlend || 0;
    let playerCell = hasGridCell(game.gridPlayer) ? game.gridPlayer : COMBAT_GRID_CONFIG.playerSpawn;
    let playerMoveSpeed = Number(framePlayerStats.moveSpeed) || Number(framePlayerStats.move) || 100;
    let playerMotion = updatePlayerGridVisualMotion(gridProj, playerCell, now, playerMoveSpeed);
    let advanceBlend = playerMotion.animating ? 1 : 0;
    let playerPos = getStageHeroAirGround({
        x: playerMotion.position.x,
        y: playerMotion.position.y + downBlend * 0.6
    }, now, gridProj);
    let playerMotionState = {
        playerStats: framePlayerStats,
        advanceBlend,
        moveProgress: playerMotion.progress,
        moveDirection: playerMotion.direction,
        attackBlend,
        attackActive: !!swingFx,
        attackProgress: swingFx
            ? clampNumber((now - swingFx.start) / Math.max(1, swingFx.duration * attackAnimationDurationScale), 0, 0.999)
            : 0,
        attackVariantSeed: battleVisualState.playerAttackMotionSeed,
        hurtBlend,
        downBlend
    };
    battleVisualState.playerPos = { x: playerPos.x, y: playerPos.y };
    noteStageHeroBehindFrames(playerPos, gridProj);
    if (!battleVisualState.enemySmoothPos) battleVisualState.enemySmoothPos = {};
    const glideFrame = { now, deltaSec, gridProj };
    // 자리 목록은 모든 적을 담고, 그릴 적은 따로 가른다(js/canvas-battle-draw-list.js: 보이는 적, 그 가운데 그림이 화면에 걸치는 적).
    let dynamicLayout = battleDrawList.markDrawn(layout.map(entry => glideBattleEnemy(entry, glideFrame)), { width, height, tile: gridProj.tileW });
    let enemyPosMap = buildBattleEnemyPosMap(dynamicLayout, battleFx, now, gridProj);
    playerMotionState.attackDirection = resolvePlayerAttackDirection(playerPos, currentTargets, enemyPosMap);
    const stageStrikeSide = stageView.enabled() ? resolveStageStrikeSide(now) : null;
    if (playerMotion.animating) battleVisualState.playerFacingDirection = playerMotion.direction;
    else if (stageStrikeSide) battleVisualState.playerFacingDirection = stageStrikeSide;
    else if (swingFx) battleVisualState.playerFacingDirection = playerMotionState.attackDirection;
    playerMotionState.facingDirection = battleVisualState.playerFacingDirection || playerMotionState.attackDirection;

    // getPlayerStats()는 장비/패시브 전체를 재계산하는 무거운 함수다.
    // 한 프레임 안에서는 결과가 동일하므로 프레임당 1회만 계산해 재사용한다.
    if (latestSwingFx && latestSwingFx.id !== battleVisualState.lastAutoSwingId && now >= (battleVisualState.lastAutoSkillAt || 0)) {
        playSkillFromActiveGem(latestSwingFx.skillName || '기본 공격');
        battleVisualState.lastAutoSwingId = latestSwingFx.id;
        const _atkInterval = Math.min(600, Math.max(120, (1 / Math.max(0.1, framePlayerStats.aspd)) * 100));
        battleVisualState.lastAutoSkillAt = now + _atkInterval;
    }
    if (latestSwingFx && latestSwingFx.projectile && !latestSwingFx.combatTravel) {
        const viewportProjectileFxScale = Math.min(width / 960, height / 540);
        queueSkillGemProjectileLaunch(latestSwingFx, currentTargets, playerPos, enemyPosMap, viewportProjectileFxScale);
    }
    let gridUnitScale = clampNumber(gridProj.tileW / 46, 0.48, Math.max(1.3, gridProj.unitScaleCap || 0));
    drawBattleGroundLayer(ctx, battleFx, { now, width, height, gridProj, playerPos, enemyPosMap });
    bossAttackView.drawGround(ctx, gridProj);

    battleFx.forEach(fx => {
        if (battleVisualState.processedFxIds.has(fx.id)) return;
        if (now < fx.start) return;
        worldTreeSkillFx.feedback.observe(fx, now);
        let handled = false;
        if (fx.type === 'hit') {
            requestBattleHitStop(fx);
            let enemyPos = enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId] || { x: width * 0.72, y: height * 0.58 };
            if (typeof fx.damage === 'number') {
                spawnDamageText.fromHit(fx, enemyPos.x, getDamageTextBodyY(enemyPos.y, getEnemyBodyHeight(enemyPos)), now);
            }
            if (!fx.dot && fx.skillName) {
                const viewportSkillFxScale = Math.min(width / 960, height / 540);
                queueSkillGemVfx({ ...fx, combatFx:fx, footprint: projectSkillFootprint(fx.attackFootprint, gridProj, fx.sourceCell) }, enemyPos, getCombatTravelScreenPos(gridProj, fx.sourceCell, playerPos), enemyPosMap, now, viewportSkillFxScale);
                drawSkillGemVfxLayer.ground.note(battleVisualState.skillEffects || [], gridProj);
            }
            if (!fx.dot && !SKILL_FX_ATLAS[fx.skillName] && typeof attackFxSpawn === 'function') {
                const viewportFxScale = Math.min(width / 960, height / 540);
                const attackFxOpts = getAttackFxSpawnOpts(fx, enemyPos.enemy, currentSkillVisual, viewportFxScale);
                if (attackFxOpts) attackFxSpawn(fx.element || 'phys', enemyPos.x, enemyPos.y - 6, attackFxOpts);
            }
            handled = true;
        } else if (fx.type === 'playerHit') {
            requestBattleHitStop(fx);
            let enemyPos = enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId];
            if (typeof fx.damage === 'number') spawnHeroHurtText(fx, playerPos, now);
            handled = true;
        } else if (fx.type === 'summonHit') {
            if (typeof fx.damage === 'number') spawnSummonHurtText(fx, gridProj, playerPos, now);
            handled = true;
        } else if (fx.type === 'enemyEvade') {
            let enemyPos = enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId] || { x: width * 0.72, y: height * 0.58 };
            spawnDamageText({ start: now, ...getBodyCueAnchor(enemyPos, getEnemyBodyHeight(enemyPos)),
                value: fx.text || '회피!', miss: true, bodyCue: true, color: fx.color || '#c4e2ff' });
            handled = true;
        } else if (fx.type === 'statusText') {
            let enemyPos = fx.enemyId ? (enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId]) : null;
            let anchorPos = enemyPos || playerPos;
            // 짧은 글씨는 모두 그 몸의 머리 위 가운데에 뜬다. 회피, 막아냄, 성채화(bodyCue)는 대미지 숫자와 같은 크기 결이다(2026-10-06
            // 사용자 요청: 몸 옆에 11px로 작게 떴다). 2026-10-19: 나머지(무효, 죽음 저항, 밀려남, 경계하는 무리의 "!")도 발에서 40px 위
            // 몸 오른쪽을 떠나 머리 위로 왔다. "!"는 달려오는 몬스터의 머리 위에 서야 했다.
            const bodyHeight = enemyPos ? getEnemyBodyHeight(enemyPos) : getHeroBodyHeight(playerPos, now);
            spawnDamageText({ start: now, ...getBodyCueAnchor(anchorPos, bodyHeight), value: fx.text || '회피!', miss: true,
                bodyCue: fx.bodyCue === true, color: fx.color || '#c4e2ff' });
            handled = true;
        } else if (fx.type === 'enemyDeath') {
            if (now - fx.start < 500 && typeof playUiFeedbackSound === 'function') {
                playUiFeedbackSound(fx.boss ? 'killBoss' : (fx.elite ? 'killElite' : 'kill'));
            }
            handled = true;
        } else {
            handled = true;
        }
        if (handled) battleVisualState.processedFxIds.add(fx.id);
    });
    cleanupBattleVisualState(now);
    ctx = battleGroundLoot.actorContext(canvas, ctx, now, gridProj);
    (battleVisualState.projectiles || []).forEach(projectile => drawVisualProjectile(ctx, projectile, now));
    drawEnemyAttackTelegraphs(ctx, dynamicLayout, gridUnitScale, gridProj, pendingEnemyCombatAttacks);
    let enemyAttackMotions = bossAttackView.addMotions(buildEnemyAttackMotionMap(battleFx, enemyPosMap, playerPos, now, gridProj), dynamicLayout, playerPos, now, gridProj.tileW);
    let attachGridEffectPosition = effect => {
        if (!effect) return null;
        let cell = hasGridCell(effect.cell) ? effect.cell : COMBAT_GRID_CONFIG.playerSpawn;
        let anchor = gridProj.cellToScreen(cell.gx, cell.gy);
        effect.position = { x: anchor.x, y: anchor.y + (Number(gridProj.actorGroundOffsetY) || 0) };
        return effect;
    };
    let returnWarp = attachGridEffectPosition(getPlayerReturnWarpPresentation(battleFx, now));
    let returnDeparture = attachGridEffectPosition(getPlayerReturnDeparturePresentation(battleFx, now));

    drawBattleActorLayer(ctx, dynamicLayout, {
        now, width, height, gridProj, gridUnitScale, enemyHitFlashes, enemyCount: dynamicLayout.length,
        playerPos, currentTargets, enemyPosMap,
        playerFlash, swingPower, currentSkillVisual, motionState: playerMotionState,
        enemyAttackMotions, returnWarp, returnDeparture
    });

    let pendingGhostIds = new Set();
    battleFx.forEach(fx => {
        if (!fx || fx.type !== 'hit' || now >= fx.start || enemyPosMap[fx.enemyId] || pendingGhostIds.has(fx.enemyId)) return;
        let ghost = battleVisualState.enemyGhostPos[fx.enemyId];
        if (!ghost || !ghost.enemy) return;
        pendingGhostIds.add(fx.enemyId);
        drawEnemyAfterimage(ctx, ghost.enemy, { x: ghost.x, y: ghost.y, scale: (ghost.enemy.isBoss ? 3.65 : (ghost.enemy.isElite ? 2.2 : 1.95)) * gridUnitScale,
            gridProj, now, facing: resolveEnemyFacingDirection(ghost, playerPos) });
    });

    // 반투명 스킬 이미지는 몬스터 위에 표시해 투사체 이동과 적중점을 읽기 쉽게 한다.
    // 생명력 바와 피해 숫자는 뒤에서 그려지므로 항상 스킬 이미지보다 위에 남는다.
    drawSkillGemVfxLayer(ctx, now, gridProj);
    if (typeof attackFxDraw === 'function') attackFxDraw(ctx);

    let pStatsNow = framePlayerStats;
    let playerHpPct = clampNumber((game.playerHp || 0) / Math.max(1, pStatsNow.maxHp || 1), 0, 1);
    if (!Number.isFinite(battleVisualState.playerHpGhostPct)) battleVisualState.playerHpGhostPct = playerHpPct;
    if (!Number.isFinite(battleVisualState.playerHpLastPct)) battleVisualState.playerHpLastPct = playerHpPct;
    if (!Number.isFinite(battleVisualState.playerHpGhostHoldUntil)) battleVisualState.playerHpGhostHoldUntil = 0;
    if (playerHpPct < battleVisualState.playerHpLastPct - 0.001) {
        battleVisualState.playerHpGhostPct = Math.max(battleVisualState.playerHpGhostPct, battleVisualState.playerHpLastPct);
        battleVisualState.playerHpGhostHoldUntil = now + 260;
    } else if (playerHpPct > battleVisualState.playerHpGhostPct) {
        battleVisualState.playerHpGhostPct = playerHpPct;
    }
    if (now >= battleVisualState.playerHpGhostHoldUntil && battleVisualState.playerHpGhostPct > playerHpPct) {
        battleVisualState.playerHpGhostPct = Math.max(playerHpPct, battleVisualState.playerHpGhostPct - 0.34 * deltaSec);
    }
    battleVisualState.playerHpLastPct = playerHpPct;
    let playerHpGhostPct = clampNumber(battleVisualState.playerHpGhostPct, playerHpPct, 1);
    let playerEsPct = (pStatsNow.energyShield || 0) > 0 ? clampNumber((game.playerEnergyShield || 0) / Math.max(1, pStatsNow.energyShield), 0, 1) : 0;
    currentTargets = currentTargets.map(hit => hit.enemy && hit.enemy.id).filter(Boolean);

    battleFx.filter(fx => !isGroundSkillCast(fx) && !fx.loot && !fx.groundLoot).forEach(fx => {
        if (now < fx.start) return;
        let t = clampNumber((now - fx.start) / fx.duration, 0, 1);
        let ghostEnemy = (fx.enemyId && !enemyPosMap[fx.enemyId]) ? battleVisualState.enemyGhostPos[fx.enemyId] : null;
        if (ghostEnemy && !enemyPosMap[fx.enemyId]) {
            enemyPosMap[fx.enemyId] = { enemy: ghostEnemy.enemy || { id: fx.enemyId, hp: 0, maxHp: 1 }, x: ghostEnemy.x, y: ghostEnemy.y, actualAim: ghostEnemy.actualAim };
        }
        if (fx.type === 'playerSwing') {
            worldTreeSkillFx.swing(ctx, fx, now, gridProj);
        } else if (fx.type === 'playerMobility') {
            drawPlayerMobilityFx(ctx, fx, t, gridProj);
        } else if (fx.type === 'combatTravel') {
            drawCombatTravelFx(ctx, fx, now, gridProj, playerPos, enemyPosMap);
        } else if (fx.type === 'hit') {
            drawLegacyHitFeedback(ctx, fx, t, playerPos, enemyPosMap);
        } else if (fx.type === 'levelUp') {
            drawLevelUpFx(ctx, fx, t, playerPos, now);
        } else if (fx.type === 'objectReward') {
            worldTreeSkillFx.feedback.object(ctx, fx, t, gridProj);
        } else if (fx.type === 'playerHit') {
            return;
        } else if (fx.type === 'enemySpawn') {
            drawEnemySpawnFx(ctx, fx, t, enemyPosMap[fx.enemyId]);
        } else if (fx.type === 'enemyDeath') {
            drawEnemyDeathFx(ctx, fx, t, { enemy: enemyPosMap[fx.enemyId], playerPos, gridProj, now });
        } else if (['bossAreaImpact', 'trialTrapWarning', 'trialTrap'].includes(fx.type)) {
            drawTrialTrapGridFx(ctx, fx, t, gridProj, fx.type === 'trialTrapWarning');
        } else if (fx.type === 'lootPickup') {
            drawLootPickupFx(ctx, fx, t, { from: enemyPosMap[fx.enemyId], to: playerPos, width, height });
        } else if (fx.type === 'lootCelebration') {
            drawLootCelebrationFx(ctx, fx, t, enemyPosMap[fx.enemyId], { width, height });
        }
    });
    const lightScene = { width, height, light: playerPos, hpPct: playerHpPct, ghostPct: playerHpGhostPct, esPct: playerEsPct, now, layout: dynamicLayout, targets: currentTargets, tileW: gridProj.tileW, projection: gridProj, pending: pendingEnemyCombatAttacks };
    drawBattleLightingAndBars(ctx, lightScene);
    if (typeof stageScene === 'object' && stageView.enabled()) stageScene.drawMarks(ctx, gridProj);
    drawDamageTexts(ctx, now, bossTextExclusions.concat(view.enemyOverlays.map(rect => ({ ...rect, x: rect.x - cameraShake.x, y: rect.y - cameraShake.y }))));
    actTitleCard.draw(ctx, lightScene); // over the damage numbers: a speech bubble above the hero stays readable
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    drawPlayerHurtEdge(ctx, width, height, now);
    worldTreeSkillFx.feedback.screen(ctx, { width, height, now });
    drawBossAnnouncement(ctx, { width, height, now }, updateBossAnnouncement(enemies, now));
    if (typeof stageRoomsView === 'object') stageRoomsView.drawOverlay(ctx, view, gridProj);

    // DOM은 그림을 다 그린 뒤에 만진다: 그리는 도중에 쓰면 다음 ctx.font나 ctx.filter가 문서 스타일을 다시 계산했다.
    setElementText(document.getElementById('ui-battlefield-caption'), getBattlefieldCaption());
    if (typeof actExplorationView === 'object' && actExplorationView.objects) actExplorationView.objects.flushButtons();
    stageWarmup.afterBattleDraw(ctx); // 낀 룬의 이펙트를 미리 준비해 둔다(전투에서 처음 그릴 때 그림을 푸느라 멈추지 않게)
    return true;
}

function getBattleCameraShake(now) {
    if (worldTreeSkillFx.feedback.reduced()) return { x: 0, y: 0 };
    if (typeof game !== 'undefined' && game.settings && game.settings.cameraShake === false) return { x: 0, y: 0 };
    let amplitude = bossEntranceView.shake(now);
    (battleFx || []).forEach(fx => {
        if (!fx || fx.dot || !['hit', 'playerHit', 'enemyDeath', 'enemySpawn', 'bossAreaImpact'].includes(fx.type)) return;
        let profile = typeof getBattleFeedbackProfile === 'function' ? getBattleFeedbackProfile(fx) : null;
        let duration = Math.max(80, Number(profile && profile.duration) || 110);
        let age = now - fx.start;
        if (age < 0 || age > duration) return;
        let hitStrength = Math.max(0, Number(profile && profile.shake) || 0);
        let strength = fx.type === 'enemyDeath'
            ? (fx.boss ? 8.2 : (fx.elite ? 3.1 : 0.8))
            : (fx.type === 'enemySpawn'
                ? (fx.boss ? 2.8 : (fx.elite ? 0.8 : 0))
                : hitStrength);
        amplitude = Math.max(amplitude, strength * (1 - age / duration));
    });
    // Whole device pixels: a fractional offset would resample every nearest-neighbour sprite and tile unevenly.
    const k = Math.max(1, Number(typeof uiDisplay === 'object' && uiDisplay && uiDisplay.battleRenderScale) || 1);
    return {
        x: Math.round(Math.sin(now * 0.72) * amplitude * k) / k,
        y: Math.round(Math.cos(now * 0.94) * amplitude * 0.56 * k) / k
    };
}

/** Edge shading over the battlefield. 2026-10-02: a little lighter (sides 0.44, top 0.34, bottom 0.5 before) so the map reads brighter. */
// 피격감(2026-10-04): every hit on the hero flashes the screen edge red for a moment, stronger the more life it took.
const PLAYER_HURT_EDGE = Object.freeze({ ms: 300, min: 0.16, perLife: 3, max: 0.7 });
function drawPlayerHurtEdge(ctx, width, height, now) {
    const hit = findRecentBattleFx('playerHit', now, PLAYER_HURT_EDGE.ms);
    if (!hit || !(Number(hit.damage) > 0)) return;
    const fade = 1 - (now - hit.start) / PLAYER_HURT_EDGE.ms;
    const strength = clampNumber(PLAYER_HURT_EDGE.min + (Number(hit.damageRatio) || 0) * PLAYER_HURT_EDGE.perLife, PLAYER_HURT_EDGE.min, PLAYER_HURT_EDGE.max);
    const edge = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.max(width, height) * 0.72);
    edge.addColorStop(0, 'rgba(150,12,18,0)');
    edge.addColorStop(1, `rgba(176,16,24,${(strength * fade * fade).toFixed(3)})`);
    ctx.save();
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

/** Environment edge shade stays below combat bodies and warnings; the damage vignette remains a final screen effect. */
function drawBattleScreenGrade(ctx, width, height) {
    ctx.save();
    let edgeSizeX = Math.max(72, width * 0.2);
    let edgeSizeY = Math.max(58, height * 0.18);
    let leftEdge = ctx.createLinearGradient(0, 0, edgeSizeX, 0);
    leftEdge.addColorStop(0, 'rgba(1,3,7,0.32)');
    leftEdge.addColorStop(1, 'rgba(1,3,7,0)');
    ctx.fillStyle = leftEdge;
    ctx.fillRect(0, 0, edgeSizeX, height);
    let rightEdge = ctx.createLinearGradient(width, 0, width - edgeSizeX, 0);
    rightEdge.addColorStop(0, 'rgba(1,3,7,0.32)');
    rightEdge.addColorStop(1, 'rgba(1,3,7,0)');
    ctx.fillStyle = rightEdge;
    ctx.fillRect(width - edgeSizeX, 0, edgeSizeX, height);
    let topEdge = ctx.createLinearGradient(0, 0, 0, edgeSizeY);
    topEdge.addColorStop(0, 'rgba(1,3,7,0.24)');
    topEdge.addColorStop(1, 'rgba(1,3,7,0)');
    ctx.fillStyle = topEdge;
    ctx.fillRect(0, 0, width, edgeSizeY);
    let bottomEdge = ctx.createLinearGradient(0, height, 0, height - edgeSizeY);
    bottomEdge.addColorStop(0, 'rgba(1,3,7,0.38)');
    bottomEdge.addColorStop(1, 'rgba(1,3,7,0)');
    ctx.fillStyle = bottomEdge;
    ctx.fillRect(0, height - edgeSizeY, width, edgeSizeY);
    ctx.restore();
}

// 균열 등불(rift) 스킨의 조명 패스. 플레이어 주변만 밝히고 바깥을 눌러 시선을 전투로 모은다.
// 렌더링 전용이며 판정·좌표·프레임 예산 계약에 영향을 주지 않는다(그라디언트 채우기 2~3회).
// 체력바·피해 숫자보다 먼저 그려 숫자 가독성은 유지하고, 다른 스킨에서는 그리지 않는다.
function isBattleLightingEnabled() {
    const body = typeof document !== 'undefined' ? document.body : null;
    return !!body && body.dataset.uiSkin === 'rift' && !body.classList.contains('high-contrast');
}

// 조명은 체력바·피해 숫자 아래에 깔린다. 순서: 조명 → 플레이어 바 → 적 바.
function drawBattleLightingAndBars(ctx, scene) {
    redrawnSkillFx.drawLayer('fore', scene.now);
    wispSummonFx.drawLayer('fore', scene.now);
    fxRemake.end(); // foreground skill effects opened in drawSkillGemVfxLayer, re-dotted below the lighting
    if (typeof stageOcean === 'object') stageOcean.front(ctx, scene); // 심해: 영웅 머리 위 거품과 가까운 입자(조명을 같이 받는다)
    drawBattleLightingPass(ctx, scene);
    drawBattlePlayerFigure.readability.draw(ctx);
    if (!stageActors.down()) drawBattlefieldPlayerHealthBar(ctx, scene); // not over the first start's lying hero (js/opening-journey-ui.js)
    // 락온한 몬스터(js/act-exploration-state.js lockOn)는 겨눈 적처럼 막대가 늘 보이고 금빛 테를 두른다. 그 위에 화살표가 선다.
    const locked = actExplorationState.lockedEnemy(actExplorationState.current(game));
    drawBattlefieldEnemyHealthBars(ctx, scene.layout.filter(entry => entry.drawn), locked ? scene.targets.concat(locked.id) : scene.targets, scene.tileW);
    drawLockOnMark(ctx, scene, locked);
}

/** The gold arrow over the locked-on monster (js/canvas-target-marks.js): above its bar and elite nameplate, or above where the bar
 * would stand for a monster still waiting in its pack. None for a monster not drawn this frame. */
function drawLockOnMark(ctx, scene, locked) {
    const entry = locked ? battleDrawList.drawnEntry(locked) : null;
    if (!entry) return;
    const top = enemyFieldBarTops.has(locked) ? enemyFieldBarTops.get(locked) : entry.y - getEnemyFieldBarLift(locked);
    targetMarks.arrow(ctx, entry.x, top - 3, stageActors.scaleFor(scene.tileW));
}

/** Only the existing cast boundary returns above foreground effects; never duplicate its opaque fill. */
/** Where the dark vignette opens: around the hero, or over the whole boss room while the hero stands in it. */
function getBattleLightFocus(scene) {
    const { width, height, light } = scene;
    const room = typeof actExplorationView === 'object' ? actExplorationView.bossRoomGlow() : null;
    if (room) return { x: room.x, y: room.y, inner: room.radius, outer: room.radius + Math.max(width, height) * 0.3 };
    return { x: light.x, y: light.y - 18, inner: Math.min(width, height) * 0.16, outer: Math.max(width, height) * 0.56 };
}

function drawBattleLightingPass(ctx, scene) {
    if (!isBattleLightingEnabled() || !scene.light) return;
    const { width, height, light } = scene;
    const cy = light.y - 18;
    const focus = getBattleLightFocus(scene), inner = Math.min(width, height) * 0.16;
    ctx.save();
    const dark = ctx.createRadialGradient(focus.x, focus.y, focus.inner, focus.x, focus.y, focus.outer);
    dark.addColorStop(0, 'rgba(4,5,7,0)');
    // 2026-10-02: a little lighter (0.24 / 0.62) so the map reads brighter; the hero's pool of light stays the same.
    dark.addColorStop(0.42, 'rgba(4,5,7,0.16)');
    dark.addColorStop(1, 'rgba(3,4,6,0.48)');
    ctx.fillStyle = dark;
    ctx.fillRect(-40, -40, width + 80, height + 80);
    const glowRadius = inner * 1.5;
    const warm = ctx.createRadialGradient(light.x, cy, 0, light.x, cy, glowRadius);
    // 2026-10-04 visibility: bloom at 70% (0.16 -> 0.112) so it stops washing out the hero's surroundings.
    warm.addColorStop(0, 'rgba(255,190,105,0.112)');
    warm.addColorStop(1, 'rgba(255,190,105,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = warm;
    ctx.fillRect(light.x - glowRadius, cy - glowRadius, glowRadius * 2, glowRadius * 2);
    ctx.restore();
    drawLowHealthEdge(ctx, scene);
}

// 체력 35% 미만: 화면 가장자리에 붉은 맥동. 낮을수록 짙어진다.
function drawLowHealthEdge(ctx, scene) {
    const hpPct = Number(scene.hpPct);
    if (!(hpPct < 0.35)) return;
    const { width, height, now } = scene;
    const danger = (0.35 - Math.max(0, hpPct)) / 0.35;
    const pulse = 0.7 + 0.3 * Math.sin(now * 0.006);
    const edge = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.34, width / 2, height / 2, Math.max(width, height) * 0.72);
    edge.addColorStop(0, 'rgba(120,10,16,0)');
    edge.addColorStop(1, `rgba(158,14,22,${((0.36 + 0.4 * danger) * pulse).toFixed(3)})`);
    ctx.save();
    ctx.fillStyle = edge;
    ctx.fillRect(-40, -40, width + 80, height + 80);
    ctx.restore();
}

// 보스가 처음 전장에 보이면 이름 배너를 잠깐 띄운다. 표시 전용이며 등장·판정 시점은 전투 쪽이 소유한다.
const BOSS_BANNER_MS = 2600;
function updateBossAnnouncement(enemies, now) {
    const boss = (enemies || []).find(enemy => enemy && enemy.isBoss) || bossEntranceView.revealedBoss(now);
    battleVisualState.bossBannerFor = null; // the boss whose name is up: the camera keeps it in view (js/canvas-act-exploration.js)
    if (!boss) return null;
    if (battleVisualState.bossAnnounceId !== boss.id) {
        battleVisualState.bossAnnounceId = boss.id;
        battleVisualState.bossAnnounceStart = now;
    }
    const age = now - battleVisualState.bossAnnounceStart;
    if (age < 0 || age > BOSS_BANNER_MS) return null;
    battleVisualState.bossBannerFor = boss.id;
    return { boss, age };
}

function getBossBannerAlpha(age) {
    if (age < 260) return age / 260;
    return Math.min(1, Math.max(0, (BOSS_BANNER_MS - age) / 640));
}

/** The band's centre line, chosen once per banner: out of the way of the boss (where it rises through its entrance and where it was
 * drawn this frame; 2026-10-19: the entrance alone guessed 2.6 tiles, and the band lay across a taller boss's head for its first
 * 2.6 s) and of the hero. */
function getBossBannerY(area, banner, down) {
    const held = battleVisualState.bossBannerY;
    if (held && held.start === battleVisualState.bossAnnounceStart) return held.y;
    const spans = bossEntranceView.enteringSpans(banner.boss).concat(drawnBossSpans(banner.boss));
    const y = bossEntranceView.bannerLine(area, spans, { up: 38, down });
    // Held once the boss's place is known: on the board a revealed boss is drawn a few frames after its name comes up.
    if (spans.length) battleVisualState.bossBannerY = { start: battleVisualState.bossAnnounceStart, y };
    return y;
}

/** A standing boss's drawn span, from its overhead bar to its feet, as this frame drew it; none while it is not drawn. */
function drawnBossSpans(boss) {
    const entry = typeof battleDrawList === 'object' ? battleDrawList.drawnEntry(boss) : null;
    return entry ? [[entry.y - getEnemyFieldBarLift(boss) - 14, entry.y + 8]] : [];
}

function drawBossAnnouncement(ctx, area, banner) {
    bossEntranceView.drawScreen(ctx, area);
    if (!banner) return;
    const { width } = area;
    const lines = getBossBannerSubLines(ctx, banner.boss, width);
    const cy = getBossBannerY(area, banner, 32 + (lines.length - 1) * 14);
    ctx.save();
    ctx.globalAlpha = getBossBannerAlpha(banner.age);
    ctx.textAlign = 'center';
    // 좁은 화면(휴대폰)에서는 제목 글꼴의 자모가 벌어져 "잔ㄱㅏㅈㅣ"처럼 읽혔다(검토 8차) — 본문 도트 글꼴로.
    ctx.font = `700 24px ${BATTLE_TITLE_FONT}`;
    const name = getEnemyDisplayName(banner.boss);
    const half = Math.min(width * 0.42, ctx.measureText(name).width / 2 + 60);
    const mid = Math.round(width / 2);
    drawBossBannerPlate(ctx, mid, cy, Math.round(half + 36));
    drawBossBannerRule(ctx, Math.round(mid - half), Math.round(mid + half), cy + 10);
    ctx.lineWidth = 4;
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = 'rgba(12,4,4,.95)';
    drawCrispCanvasText(ctx, name, mid, cy, 'strokeText');
    ctx.fillStyle = '#f0c46a';
    drawCrispCanvasText(ctx, name, mid, cy);
    ctx.font = `12px ${BATTLE_PIXEL_FONT}`;
    lines.forEach((line, index) => fillPixelToneText(ctx, line, mid, cy + 25 + index * 14, '#d98a6a'));
    ctx.restore();
}

/** The band's small lines: element, reach and standout defenses, the defenses on a line of their own when the screen is too narrow
 * for one (2026-10-19: with two of them the line was 371 px wide, wider than a 360 px phone). */
function getBossBannerSubLines(ctx, boss, width) {
    const head = [`${getElementLabel(boss.ele)} 속성 보스`, getBossReach(boss).label], defenses = getEnemyDefenseHighlights(boss);
    ctx.font = `12px ${BATTLE_PIXEL_FONT}`;
    const one = [...head, ...defenses].join(', ');
    return !defenses.length || ctx.measureText(one).width <= width - 24 ? [one] : [head.join(', '), defenses.join(', ')];
}

/** 이름 뒤의 그늘: 이름 둘레가 가장 짙고 위아래와 양옆 모두 둥글게 옅어져 사라지는 납작한 타원. 2026-10-16 사용자 "보스 등장씬에서
 * 보스 밑의 까만색이 네모낳게 보임": 예전 판(높이 66px, 위아래가 딱 끊기고 청동 선이 둘린 어둠)이 등장하는 보스 발밑의 검은 네모로 읽혔다.
 * reach: 이름 너비 바깥으로 그늘이 옅어지는 거리(px), height: 그늘의 위아래 반지름(px). */
const BOSS_BANNER_SHADE = Object.freeze({ reach: 150, height: 44 });
function drawBossBannerPlate(ctx, mid, cy, half) {
    const rx = half + BOSS_BANNER_SHADE.reach, ry = BOSS_BANNER_SHADE.height;
    const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
    shade.addColorStop(0, 'rgba(6,4,4,0.84)');
    shade.addColorStop(0.55, 'rgba(6,4,4,0.6)');
    shade.addColorStop(1, 'rgba(6,4,4,0)');
    ctx.save();
    ctx.translate(mid, cy - 3);
    ctx.scale(rx / ry, 1);
    ctx.fillStyle = shade;
    ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
    ctx.restore();
}

function drawBossBannerRule(ctx, left, right, y) {
    // 가운데는 금빛 2px 선, 양 끝은 2px 점선으로 흩어진다(도트식 그라디언트).
    const span = right - left, solid = span * 0.6, dotted = (span - solid) / 2;
    ctx.fillStyle = 'rgba(216,166,74,0.9)';
    ctx.fillRect(left + dotted, y, solid, 2);
    for (let x = 0; x < dotted; x += 4) {
        ctx.fillRect(left + dotted - 4 - x, y, 2, 2);
        ctx.fillRect(right - dotted + 2 + x, y, 2, 2);
    }
}

function getElementLabel(ele) {
    if (ele === 'fire') return '화염';
    if (ele === 'cold') return '냉기';
    if (ele === 'light') return '번개';
    if (ele === 'chaos') return '공허';
    return '물리';
}
/** The name without colour emoji: the pixel font draws them as a broken box (the beehive queen's crown did, 2026-10-06). */
function getEnemyDisplayName(enemy) {
    if (!enemy) return '미확인 적';
    return stripDecorativeEmoji(enemy.name) || '미확인 적';
}
// A boss's standout defenses (its one or two specialties, js/combat.js getBossDefenseTargets) as the live values, traits and zone
// wards included: at least 40% and 15 points above its weakest of the four. Early bosses whose defenses are all low show none.
const ENEMY_DEFENSE_LABELS = Object.freeze([['dr', '물리 피해 감소'], ['resF', '화염 저항'], ['resC', '냉기 저항'], ['resL', '번개 저항']]);
function getEnemyDefenseHighlights(enemy) {
    if (!enemy || !enemy.isBoss) return [];
    const rows = ENEMY_DEFENSE_LABELS.map(([key, label]) => ({ label, value: Math.floor(Number(enemy[key]) || 0) }));
    const floor = Math.min(...rows.map(row => row.value));
    return rows.filter(row => row.value >= 40 && row.value - floor >= 15).sort((a, b) => b.value - a.value)
        .map(row => `${row.label} ${row.value}%`);
}

function getEnemyTraitSummary(enemy) {
    let tags = [];
    if (!enemy) return ['일반'];
    tags.push(getElementLabel(enemy.ele));
    tags.push(...getEnemyDefenseHighlights(enemy));
    if (enemy.traitName) tags.push(enemy.traitName);
    if ((enemy.firstHitGuard || 0) > 0 && !enemy.firstHitConsumed) tags.push(`첫타보호 ${Math.floor((enemy.firstHitGuard || 0) * 100)}%`);
    if ((enemy.hitRateGuard || 0) > 0) tags.push(`연타경감 ${Math.floor((enemy.hitRateGuard || 0) * 100)}%/후속타`);
    if ((enemy.leechEffMul || 1) <= 0) tags.push('흡혈불가');
    else if ((enemy.leechEffMul || 1) < 1) tags.push(`흡혈저항 ${Math.floor((enemy.leechEffMul || 1) * 100)}%`);
    return Array.from(new Set(tags.filter(Boolean)));
}


// summon1.png(가로 540 기준 7칸, 수동 분석 경계) 중 아직 쓰는 칸: 방어 소환수 수액 골렘(마지막 칸). 공격 소환수는 위습이라
// 자기 시트로 그린다(hanaActors.drawSummon) — 그 밖의 이름은 칸이 없다(시트를 불러오는 동안 점으로 표시).
const SUMMON1_CANONICAL_WIDTH = 540;
const SUMMON1_FRAMES = Object.freeze({ '수액 골렘 소환': Object.freeze([464, 540]) });

function getSummonSpriteFrameRectByName(name, image) {
    const span = image && image.width && image.height ? SUMMON1_FRAMES[String(name || '').trim()] : null;
    if (!span) return null;
    const scale = image.width / SUMMON1_CANONICAL_WIDTH, sx = clampNumber(Math.round(span[0] * scale), 0, image.width - 1);
    return { sx, sy: 0, sw: Math.max(1, clampNumber(Math.round(span[1] * scale), 0, image.width) - sx), sh: image.height };
}

function resolvePlayerAttackDirection(playerPos, currentTargets, enemyPosMap) {
    let primary = currentTargets && currentTargets[0] ? currentTargets[0].enemy : null;
    let anchor = primary ? enemyPosMap[primary.id] : null;
    if (!anchor) return battleVisualState.playerAttackDirection || 'east';
    let dx = Number(anchor.x) - Number(playerPos.x);
    let dy = Number(anchor.y) - Number(playerPos.y);
    let direction = stageView.enabled() ? resolveStageAttackSide(dx)
        : Math.abs(dy) > 6 ? (dy < 0 ? 'north' : 'south') : (dx < 0 ? 'west' : 'east');
    battleVisualState.playerAttackDirection = direction;
    return direction;
}
const STAGE_ATTACK_SIDE_DEAD_PX = 10;     // 대상이 이만큼(px) 안의 같은 세로줄이면 직전에 보던 쪽을 지킨다
const STAGE_NATIVE_CAST_FACE_MS = 700;    // 따로 시전하는 룬을 쓴 뒤 그 겨냥한 쪽을 보는 동안
let stageNativeCastFace = null;           // { side, until }: 막 쓴 따로 시전하는 룬이 겨냥한 쪽(그 룬의 기록이 치워진 뒤에도 연출이 끝날 때까지 지킨다)
/** 옆에서 보는 무대: 주인공이 지금 치고 있는 쪽. 가장 늦게 시작한 공격이 겨냥한 칸(combatTravel 기록의 aimCell)이나, 그런 기록을 남기지
 * 않는 따로 시전하는 룬(js/skill-gem-casts.js)이 겨냥한 자리를 주인공이 지금 선 칸에서 본 쪽이다. 지금 선 칸에서 보므로 적 옆으로
 * 건너가 치는 이동기(그림자 점멸, 암살)는 건너간 뒤의 쪽을 답한다. 겨냥한 칸이 같은 세로줄이거나 치는 중이 아니면 null.
 * 주인공 그림과 주인공에게 붙는 스킬 이펙트(js/canvas-stage-skill-kit.js heroFace)가 이 한 값으로 같은 쪽을 본다. */
function resolveStageStrikeSide(now) {
    const hero = game.gridPlayer, side = cell => (cell && cell.gx !== hero.gx ? (cell.gx < hero.gx ? 'west' : 'east') : null);
    // 막 쓴 따로 시전하는 룬이 먼저다: 그 룬을 쓰는 동안에도 기본 공격은 다른 적을 겨냥해 이어질 수 있다(암살로 건너가 뒤를 베는 순간)
    const cast = resolveStageNativeCastSide(side);
    if (cast) return cast;
    for (let index = battleFx.length - 1; index >= 0; index--) {
        const strike = stageStrikeOf(battleFx[index], now, side);
        if (strike !== undefined) return strike;
    }
    return null;
}
/** 무대의 주인공이 볼 쪽을 정하는 공격 기록이면 그 쪽('west', 'east', 겨냥한 칸이 같은 세로줄이면 null), 아니면 undefined. 옆으로만 치는 룬
 * (js/combat-grid.js band)은 대상을 고를 때 정한 쪽을 본다: 대상이 바로 위나 아래에 서 있어도 띠를 치는 쪽이다. */
function stageStrikeOf(fx, now, side) {
    if (!fx || fx.start > now) return undefined;
    const band = stageBandSideOf(fx);
    if (band) return band < 0 ? 'west' : 'east';
    return fx.type === 'combatTravel' && fx.owner === 'player' && fx.aimCell ? side(fx.aimCell) : undefined;
}
/** 휘두름 기록(bandSide)이나 주인공 공격 단계 기록(attackFootprint.band)이 남긴 칠 쪽(1, -1). 없으면 0. */
function stageBandSideOf(fx) {
    if (fx.type === 'playerSwing') return fx.bandSide || 0;
    const footprint = fx.type === 'combatTravel' && fx.owner === 'player' ? fx.attackFootprint : null;
    return footprint && footprint.band ? footprint.band.side : 0;
}
function resolveStageNativeCastSide(side) {
    const clock = getCombatTime(), cast = latestStageNativeCast(clock), aimed = cast ? side(cast.aim) : null;
    if (aimed) stageNativeCastFace = { side: aimed, until: cast.at + STAGE_NATIVE_CAST_FACE_MS };
    // 암살은 베는 연출이 끝나기 전에 기록이 치워진다: 그동안 기본 공격의 다음 대상 쪽으로 돌아서면 등 뒤에서 베는 꼴이 된다
    const kept = stageNativeCastFace;
    if (kept && clock >= kept.until - STAGE_NATIVE_CAST_FACE_MS && clock <= kept.until) return kept.side;
    stageNativeCastFace = null;
    return null;
}
/** 막 쓴(STAGE_NATIVE_CAST_FACE_MS 안의) 따로 시전하는 룬의 기록: 주 스킬 자리의 것이 먼저, 없으면 이동기 자리의 것. */
function latestStageNativeCast(clock) {
    for (const state of [skillGemCombatRuntime, mobilitySkill.castState()]) {
        const cast = state && state.casts.length ? state.casts[state.casts.length - 1] : null;
        if (cast && cast.aim && clock >= cast.at && clock - cast.at <= STAGE_NATIVE_CAST_FACE_MS) return cast;
    }
    return null;
}
/** 옆에서 보는 무대의 주인공은 왼쪽이나 오른쪽만 본다: 대상이 선 쪽을 본다. 위에서 보는 전장의 규칙(대상이 다른 줄에 있으면 위나 아래)을
 * 그대로 쓰면 무대의 주인공은 그때 직전 방향을 지켜, 왼쪽 위의 적을 치면서 오른쪽을 보고 서 있었고 스킬 이펙트만 왼쪽에 나왔다
 * (2026-10-13 사용자: 이펙트가 "반대로 나오고"). 대상이 거의 같은 세로줄이면 직전에 보던 쪽을 지킨다. */
function resolveStageAttackSide(dx) {
    const last = battleVisualState.playerAttackDirection;
    if (Math.abs(dx) <= STAGE_ATTACK_SIDE_DEAD_PX) return last === 'west' || last === 'east' ? last : (stageActors.facing() < 0 ? 'west' : 'east');
    return dx < 0 ? 'west' : 'east';
}

// ACT 배경의 9x8 직교 그리드. 유닛 점유 칸과 플레이어의 현재 공격 칸을 함께 표시한다.
function drawCosmosGravityField(ctx, proj) {
    const field = cosmosRouteRuntime.gravityView();
    if (!field) return;
    const center = proj.cellToScreen(field.gx,field.gy);
    const radius = proj.tileW*(2.8-field.progress*2);
    ctx.save();
    ctx.strokeStyle = '#bba2ef';
    ctx.fillStyle = '#29203f';
    ctx.globalAlpha = .3+field.progress*.4;
    ctx.beginPath();
    ctx.ellipse(center.x,center.y,radius,radius*.65,0,0,Math.PI*2);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(center.x,center.y,proj.tileW*.35,proj.tileH*.25,0,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawBattleGridFloor(ctx, proj, theme, skillTargets, skillAreaCells, backdropActive) {
    drawCosmosGravityField(ctx,proj);
    const map=getCombatGridSize(),run=actExplorationState.current(game);
    if(map.tiles) {
        const sealed=actExplorationState.gateSealed(run);
        skillAreaCells=skillAreaCells.filter(cell=>actExplorationMap.walkable(map,cell,sealed));
    }
    ctx.save();
    // 9×8 칸 선은 위에서 보는 전장에만 긋는다: 무대에서는 지도가 놓이기 전의 순간(부팅, 구역을 여는 중)에도 옛 판이 비치지 않는다(2026-10-21).
    if (!run && stageView.topDown()) drawFixedBoardCells(ctx, proj, theme, backdropActive);
    drawRiftCombatOccupants(ctx, { proj, skillTargets, skillAreaCells });
    ctx.restore();
}

/** 위에서 보는 전장의 9×8 칸. 칠과 선의 투명도는 칸 다음에 그리는 표시(drawRiftCombatOccupants)까지 이어진다. */
function drawFixedBoardCells(ctx, proj, theme, backdropActive) {
    const halfW = proj.tileW / 2;
    const halfH = proj.tileH / 2;
    const tilePath = (gx, gy) => {
        const c = proj.cellToScreen(gx, gy);
        ctx.beginPath();
        ctx.rect(c.x - halfW, c.y - halfH, proj.tileW, proj.tileH);
    };
    for (let gx = 0; gx < getCombatGridSize().columns; gx++) {
        for (let gy = 0; gy < getCombatGridSize().rows; gy++) {
            tilePath(gx, gy);
            // 배경 디오라마가 깔린 경우 바닥 아트를 가리지 않게 체커 칠 없이 선만 긋는다.
            if (!backdropActive) {
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = (gx + gy) % 2 === 0 ? theme.pathA : theme.pathB;
                ctx.fill();
            }
            ctx.globalAlpha = backdropActive ? 0.5 : 0.62;
            ctx.strokeStyle = backdropActive ? 'rgba(171, 146, 104, 0.42)' : 'rgba(8, 12, 18, 0.6)';
            ctx.lineWidth = backdropActive ? 1 : 1.3;
            ctx.stroke();
        }
    }
}

// 칸 표시: 네모 칸 대신 발밑 타원과 모서리 표식만 그린다. 칸 판정과 범위 계산은 그대로이고 그리는 모양만 바꾼다.
// 고대비 모드도 같다(2026-10-16 사용자: 발밑이 네모로 바뀌고 캐릭터를 따라가지 않고 칸 단위로 옮겨 갔다. 고대비는 조명만 끈다).
const RIFT_CELL_TONES = {
    player: { fill: 'rgba(120, 210, 196, 0.22)', line: 'rgba(160, 236, 222, 0.7)' },
    enemy: { fill: 'rgba(170, 52, 40, 0.24)', line: 'rgba(226, 116, 94, 0.55)' },
    summon: { fill: 'rgba(110, 200, 140, 0.18)', line: 'rgba(150, 230, 176, 0.5)' },
    area: { fill: 'rgba(214, 170, 92, 0.12)', line: 'rgba(233, 203, 137, 0.42)' },
    target: { fill: 'rgba(233, 180, 84, 0.2)', line: 'rgba(246, 214, 146, 0.9)' }
};
/** The stage ring (js/canvas-stage-rings.js) each cell tone draws as; anything else is an enemy's. */
const RIFT_RING_LOOKS = new Map([[RIFT_CELL_TONES.summon, 'summon'], [RIFT_CELL_TONES.target, 'target']]);

function drawRiftCombatOccupants(ctx, layers) {
    const proj = layers.proj;
    if (!proj) return;
    (layers.skillAreaCells || []).forEach(cell => drawRiftAreaCell(ctx, proj, cell));
    (game.summons || []).forEach(summon => {
        if (summon && !summon.isGhost && summon.alive && (summon.hp || 0) > 0) drawRiftUnitRing(ctx, proj, summon, RIFT_CELL_TONES.summon);
    });
    const locked = actExplorationState.lockedEnemy(actExplorationState.current(game));
    (game.enemies || []).forEach(enemy => {
        if (enemy && enemy.hp > 0 && actExplorationView.inSight(enemy)) drawRiftUnitRing(ctx, proj, enemy, enemy === locked ? RIFT_CELL_TONES.target : RIFT_CELL_TONES.enemy);
    });
    (layers.skillTargets || []).forEach(hit => drawRiftTargetBrackets(ctx, proj, hit && hit.enemy));
}

/** The player's foot ring sits under the drawn figure, not on the hit cell: while walking, the body glides between
 * cells and the cell changes halfway, so a cell ring jumped ahead of the character. */
function drawRiftPlayerRing(ctx, proj, feet) {
    if (!proj || !feet) return;
    // 옆에서 보는 무대: 도트로 찍는 발밑 고리(js/canvas-stage-rings.js)
    if (stageView.enabled()) return stageRings.ring(ctx, { x: feet.x, y: feet.y, dot: stageActors.scaleFor(proj.tileW) }, { tone: 'player', rx: 22, turning: true });
    const rx = proj.tileW * 0.4, ry = Math.max(4, rx * 0.34), tone = RIFT_CELL_TONES.player;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = tone.fill;
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = tone.line;
    ctx.stroke();
    ctx.restore();
}

/** The screen box of a unit's cells. walking: an enemy on the stage is drawn short of its cell while it walks there
 * (js/canvas-stage-stride.js), and its ring and target marks go with the picture, as the hero's ring does (2026-10-13 사용자). */
function getRiftUnitFootprintBox(proj, unit, walking = false) {
    const cells = getGridUnitCells(unit);
    if (cells.length <= 0) return null;
    const points = cells.map(cell => proj.cellToScreen(cell.gx, cell.gy));
    const xs = points.map(p => p.x), ys = points.map(p => p.y), stride = walking ? stageStride.read(unit, battleVisualState.visualNow) : null;
    const dx = stride ? stride.dx * proj.tileW : 0, dy = stride ? stride.dy * proj.tileH : 0;
    const left = Math.min(...xs) - proj.tileW / 2 + dx, right = Math.max(...xs) + proj.tileW / 2 + dx;
    const top = Math.min(...ys) - proj.tileH / 2 + dy, bottom = Math.max(...ys) + proj.tileH / 2 + dy;
    return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
}

/** A unit's foot ring: an enemy's, a summon's, or the locked-on enemy's (RIFT_CELL_TONES.target: gold, turning like the hero's). */
function drawRiftUnitRing(ctx, proj, unit, tone) {
    // Boss bodies already cast a ground shadow. Keep red floor marks exclusive to attacks; manual lock-on stays gold.
    if (unit.isBoss && tone === RIFT_CELL_TONES.enemy) return;
    const box = getRiftUnitFootprintBox(proj, unit, tone !== RIFT_CELL_TONES.summon);
    if (!box) return;
    const rx = (box.right - box.left) * 0.4;
    const ry = Math.max(4, rx * 0.34);
    const cy = box.bottom - proj.tileH * 0.5 + (Number(proj.actorGroundOffsetY) || 0);
    if (stageView.enabled()) {
        const dot = stageActors.scaleFor(proj.tileW), look = RIFT_RING_LOOKS.get(tone) || 'enemy';
        return stageRings.ring(ctx, { x: box.cx, y: cy, dot }, { tone: look, rx: Math.round(rx / dot * 0.86), turning: look === 'target' });
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.ellipse(box.cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = tone.fill;
    ctx.fill();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = tone.line;
    ctx.stroke();
}

function drawRiftAreaCell(ctx, proj, cell) {
    if (!hasGridCell(cell)) return;
    const c = proj.cellToScreen(cell.gx, cell.gy);
    const inset = Math.min(proj.tileW, proj.tileH) * 0.08;
    ctx.globalAlpha = 1;
    ctx.fillStyle = RIFT_CELL_TONES.area.fill;
    if (stageView.enabled()) { drawStageAreaCell(ctx, c, proj, inset); return; }
    ctx.fillRect(c.x - proj.tileW / 2 + inset, c.y - proj.tileH / 2 + inset, proj.tileW - inset * 2, proj.tileH - inset * 2);
}
/** 옆에서 보는 무대: 스킬이 닿는 칸을 네모로 칠하면 그린 바닥 위에 상자가 얹힌 듯 보였다(2026-10-13 따로 맡긴 검토: "발밑에 황토색
 * 사각형"). 칸에 눕힌 옅은 타원으로 그린다: 닿는 칸은 그대로 읽히고 바닥의 얼룩처럼 놓인다. */
const STAGE_AREA_CELL_ALPHA = 0.6;
function drawStageAreaCell(ctx, c, proj, inset) {
    ctx.globalAlpha = STAGE_AREA_CELL_ALPHA;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, proj.tileW / 2 - inset, proj.tileH / 2 - inset, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
}

// 조준 대상: 발자국 상자의 네 모서리에만 짧은 꺾쇠를 긋는다.
function drawRiftTargetBrackets(ctx, proj, unit) {
    const box = getRiftUnitFootprintBox(proj, unit, true);
    if (!box) return;
    const arm = Math.min(box.right - box.left, box.bottom - box.top) * 0.22;
    const corners = [[box.left, box.top, 1, 1], [box.right, box.top, -1, 1], [box.left, box.bottom, 1, -1], [box.right, box.bottom, -1, -1]];
    ctx.globalAlpha = 1;
    ctx.strokeStyle = RIFT_CELL_TONES.target.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    corners.forEach(([x, y, dx, dy]) => {
        ctx.moveTo(x, y + dy * arm);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * arm, y);
    });
    ctx.stroke();
}

function getCanvasSkillAreaCells(skillName, skillDef, skillTargets) {
    let playerCell = hasGridCell(game.gridPlayer) ? game.gridPlayer : null;
    let targetHits = (skillTargets || []).filter(hit => hit && hasGridCell(hit.enemy));
    if (!playerCell || targetHits.length <= 0) return [];
    let profile = getSkillGridProfile(skillName, skillDef);
    if (profile.kind === 'chain') return targetHits.map(hit => ({ gx: hit.enemy.gx, gy: hit.enemy.gy }));
    let cells = getGridAttackAreaCells(profile, playerCell, targetHits[0].enemy);
    let seen = new Set();
    return cells.filter(cell => {
        let key = gridCellKey(cell.gx, cell.gy);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}



safeExposeGlobals({
    renderBattlefield, getPlayableHeroWalkMotion
});
