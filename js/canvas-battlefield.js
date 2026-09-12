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

function getCanvasCrowdProgressPaused() {
    let provider = getCanvasRuntimeFunction('isCrowdProgressPaused');
    return provider ? !!provider() : false;
}

const BATTLE_SKILL_EFFECT_CAP = 56;

function getBattleVfxDensity() {
    return clampNumber(Number(battleVisualState.vfxDensity) || 1, 0.42, 1);
}

function updateBattleVfxDensity(frameMs, enemyCount) {
    let elapsed = clampNumber(Number(frameMs) || 16.7, 1, 50);
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
    let profile = typeof getBattleFeedbackProfile === 'function' ? getBattleFeedbackProfile(fx) : null;
    let duration = Math.max(0, Number(profile && profile.hitStopMs) || 0);
    battleVisualState.lastHitStopFxId = fx.id;
    if (duration <= 0) return;
    battleVisualState.hitStopRemainingMs = Math.max(Number(battleVisualState.hitStopRemainingMs) || 0, duration);
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
    bite: 'skillFxFenrirFang',
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
    summon: 'skillFxSummonStrike',
    focusBeam: 'skillFxFocusBeam',
    dragonBreath: 'skillFxDragonBreath',
    voidCutter: 'skillFxVoidCutter'
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
    } else if (style === 'potion') {
        ctx.rotate(-0.2 + progress * 0.5);
        ctx.strokeStyle = '#f1f7ff'; ctx.strokeRect(-height * 0.08, -height * 0.4, height * 0.22, height * 0.22);
        ctx.beginPath(); ctx.arc(0, height * 0.1, height * 0.34, 0, Math.PI * 2); ctx.globalAlpha *= 0.62; ctx.fill(); ctx.globalAlpha /= 0.62; ctx.stroke();
    } else {
        drawPolygonPath(ctx, [[-width * 0.48, -height * 0.08], [width * 0.22, -height * 0.08], [width * 0.5, 0], [width * 0.22, height * 0.08], [-width * 0.48, height * 0.08]]);
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function getSkillGemVfxFilter(element, imageKey) {
    if (imageKey === 'skillFxFenrirFang') return 'none';
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
            duration: family === 'dot' ? 720 : (family === 'breath' ? 380 : (family === 'whirlwind' ? 260 : (connector ? 170 : 300))),
            x: family === 'whirlwind' ? source.x : target.x + (connector ? 0 : repeatOffset * 5),
            y: family === 'whirlwind' ? source.y - 3 : target.y - (connector ? 8 : 5) + Math.abs(repeatOffset) * 2,
            fromX: source.x + (family === 'breath' ? Math.cos(baseRotation) * 14 : (family === 'projectile' ? 15 : 0)),
            fromY: source.y - (family === 'breath' ? 18 : (family === 'projectile' ? 18 : 7)) + (family === 'breath' ? Math.sin(baseRotation) * 10 : 0),
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

/** One filled breath sprite follows the cast triangle, never the victim count. */
function drawChannelBreathImage(ctx, image, fx, geometry, fadeOut) {
    let source = fx.screenSource;
    geometry = fx.screenFootprint?.cone || geometry;
    ctx.save();
    ctx.translate(source.x, source.y);
    ctx.rotate(geometry.angle);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.48 * fadeOut;
    ctx.filter = 'none';
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, -geometry.width / 2, geometry.length, geometry.width);
    ctx.restore();
    return true;
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
    let isBreath = !!(profile && profile.family === 'breath');
    if (isBreath && image && drawChannelBreathImage(ctx, image, fx, geometry, fadeOut)) return;
    ctx.save();
    ctx.translate(geometry.x, geometry.y);
    ctx.rotate(geometry.angle);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = (isBreath ? 0.42 : 0.68) * fadeOut;
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
        ctx.filter = isSpecializedCombatTravelImage(imageKey) ? 'none' : getSkillGemVfxFilter(element, imageKey);
        ctx.imageSmoothingEnabled = false;
        if (image) drawCombatCellImage(ctx, image, { fieldImpact, size, progress, fade, fx, now, arriveAt });
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
function drawCombatCellImage(ctx, image, view) {
    let { fieldImpact, size, progress, fx, now, arriveAt } = view;
    if (fx.patternKind === 'mine' && now >= arriveAt) image = getSkillGemVfxImage(SKILL_GEM_VFX_IMAGE_KEYS.radialWave) || image;
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
        ctx.filter = dedicatedProjectileImage || isSpecializedCombatTravelImage(imageKey) ? 'none' : getSkillGemVfxFilter(element, imageKey);
        ctx.imageSmoothingEnabled = false;
        if (useProjectileImage) ctx.drawImage(image, -width / 2, -height / 2, width, height);
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

function drawCombatTravelFx(ctx, fx, now, gridProj, playerPos, enemyPosMap) {
    if (worldTreeSkillFx.travel(ctx, fx, now, gridProj)) return;
    if (fx.travelPath) return drawCombatPathFx(ctx, fx, now, gridProj);
    let launchAt = fx.start + Math.max(0, Number(fx.releaseDelayMs) || 0);
    let arriveAt = launchAt + Math.max(1, Number(fx.flightMs) || 1);
    let source = getCombatTravelScreenPos(gridProj, fx.sourceCell, playerPos);
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
        fx.screenFootprint = projectSkillFootprint(fx.attackFootprint, gridProj);
        if (fx.patternKind === 'radialBurst') fx.screenRadius = getRadialBurstScreenRadius(fx, gridProj);
        drawFootprintCombatCell(ctx, fx, { now, arriveAt, targets, imageKey, element, playerPoint: playerPos });
    }
    else drawCombatMovingFx(ctx, fx, now, launchAt, arriveAt, source, targets, imageKey, element);
}

/** Ground spells belong below actors; vertical fire remains in the foreground. */
function isGroundSkillCast(fx) {
    if (fx.type !== 'combatTravel' || fx.delivery !== 'magicCell') return false;
    if ([10, 28, 29, 32].includes(SKILL_FX_ATLAS[fx.skillName]?.id)) return true;
    let profile = getSkillGemVfxProfile(fx.skillName);
    return ['gravity', 'erosion', 'decay', 'resonance', 'mine'].includes(profile?.signature);
}

/** Paint ground spells first and summons above them, before the main actor layer. */
function drawBattleGroundLayer(ctx, effects, view) {
    worldTreeSkillFx.castFrame(ctx,view.gridProj,'ground');
    sideEncounterCanvas.portals(ctx, view.gridProj, getCombatTime());
    worldTreeSkillFx.drawQueued(ctx, battleVisualState.skillEffects || [], view.now, 'ground');
    for (let fx of effects) {
        if (!isGroundSkillCast(fx)) continue;
        drawCombatTravelFx(ctx, fx, view.now, view.gridProj, view.playerPos, view.enemyPosMap);
    }
    let motions = buildSummonAttackMotionMap(effects, game.summons, view.gridProj, view.enemyPosMap, view.now);
    drawActiveSummons(ctx, view.playerPos, view.now, view.gridProj, motions);
}

/** Preserve special spell animation while fitting its range to the cast-time grid snapshot. */
function drawFootprintCombatCell(ctx, fx, view) {
    let { now, arriveAt, targets, imageKey, element } = view;
    let footprint = fx.screenFootprint;
    if (!footprint) return drawCombatCellFx(ctx, fx, now, arriveAt, targets, imageKey, element);
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

function drawBeamSkillVfx(ctx, effect, progress) {
    let dx = effect.toX - effect.fromX;
    let dy = effect.toY - effect.fromY;
    let length = Math.max(20, Math.hypot(dx, dy));
    ctx.translate((effect.fromX + effect.toX) / 2, (effect.fromY + effect.toY) / 2);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.fillStyle = getElementColor(effect.element);
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 10;
    let thickness = Math.max(4, effect.size * (0.055 + Math.sin(progress * Math.PI) * 0.035));
    ctx.fillRect(-length / 2, -thickness / 2, length, thickness);
    ctx.globalAlpha *= 0.38;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-length / 2, -thickness * 0.16, length, thickness * 0.32);
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

function drawBreathSkillVfx(ctx, effect, progress) {
    let dx = effect.toX - effect.fromX;
    let dy = effect.toY - effect.fromY;
    let length = Math.max(76, Math.hypot(dx, dy));
    let reach = length * (0.36 + Math.min(1, progress * 2.5) * 0.64);
    let baseAlpha = ctx.globalAlpha;
    let colors = ['#c52c18', '#ff5b1f', '#ff9b24', '#ffe37a'];
    ctx.translate(effect.fromX, effect.fromY);
    ctx.rotate(Math.atan2(dy, dx));
    ctx.filter = 'none';
    ctx.shadowColor = '#ff6a24';
    ctx.shadowBlur = Math.max(5, effect.size * 0.09);
    for (let index = 0; index < 16; index++) {
        let random = Math.abs(Math.sin((effect.seed + 1) * 12.9898 + index * 78.233) * 43758.5453) % 1;
        let lane = Math.abs(Math.sin((effect.seed + 7) * 39.346 + index * 21.719) * 24634.6345) % 1;
        let phase = (progress * 1.45 + random + index / 23) % 1;
        let spread = effect.size * (0.035 + phase * 0.28);
        let x = reach * (0.08 + phase * 0.92);
        let y = (lane * 2 - 1) * spread + Math.sin(progress * 13 + index) * spread * 0.16;
        let radius = effect.size * (0.045 + phase * 0.07) * (0.72 + Math.sin(phase * Math.PI) * 0.42);
        let tail = radius * (1.65 + phase * 0.85);
        ctx.globalAlpha = baseAlpha * (0.3 + Math.sin(phase * Math.PI) * 0.58);
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.bezierCurveTo(x + radius * 0.25, y - radius, x - tail * 0.35, y - radius * 0.72, x - tail, y);
        ctx.bezierCurveTo(x - tail * 0.28, y + radius * 0.78, x + radius * 0.32, y + radius, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }
    ctx.shadowBlur = 4;
    for (let ember = 0; ember < 6; ember++) {
        let phase = (progress * 1.8 + ember * 0.173 + effect.seed * 0.011) % 1;
        let x = reach * (0.45 + phase * 0.58);
        let y = Math.sin(effect.seed + ember * 2.4) * effect.size * (0.08 + phase * 0.25);
        ctx.globalAlpha = baseAlpha * (1 - phase) * 0.75;
        ctx.fillStyle = ember % 2 ? '#fff0a0' : '#ff8b28';
        ctx.beginPath(); ctx.arc(x, y, Math.max(1, effect.size * 0.018), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = baseAlpha;
}

function drawProceduralSkillImpact(ctx, effect, progress) {
    if (effect.family === 'iai') drawIaiSkillVfx(ctx, effect, progress);
    else if (effect.family === 'stormStrike') drawStormStrikeVfx(ctx, effect, progress);
    else if (effect.family === 'beam') drawBeamSkillVfx(ctx, effect, progress);
    else if (effect.family === 'fireCore' || effect.family === 'mine' || effect.family === 'voidBlade') drawCoreSkillVfx(ctx, effect, progress);
    else if (effect.family === 'breath') drawBreathSkillVfx(ctx, effect, progress);
    else if (effect.family === 'charge') drawShieldChargeImpactVfx(ctx, effect, progress);
    else return false;
    return true;
}

function drawPlayerMobilityFx(ctx, fx, progress, gridProj) {
    if (!gridProj || !fx.fromCell || !fx.toCell) return;
    worldTreeSkillFx.mobility(ctx, fx, progress, gridProj);
}

function drawTrialTrapGridFx(ctx, fx, progress, gridProj, warning) {
    if (fx.type === 'bossAreaImpact') return drawBossPatternArea(ctx, fx.footprint, gridProj, (1 - progress) * 5);
    if (!gridProj || !Array.isArray(fx.targetCells)) return;
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
    if (!footprint || ['projectile', 'chain', 'summon', 'stormStrike', 'bite'].includes(effect.family)) return false;
    ctx.save();
    let fade = Math.min(1, progress / 0.045) * Math.pow(1 - progress, 1.1);
    drawSkillFootprintGround(ctx, footprint, getElementColor(effect.element), fade);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = (effect.alpha || 0.82) * fade;
    ctx.filter = effect.filter || 'none';
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
    worldTreeSkillFx.castFrame(ctx,gridProj,'foreground');
    let list = battleVisualState.skillEffects || [];
    worldTreeSkillFx.drawQueued(ctx, list, now, 'foreground');
    const spriteRenderers = {continuousSlash:drawSwordSlashVfx, bite:drawFenrirBiteVfx};
    list.forEach(effect => {
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
        ctx.filter = imageProjectile ? 'none' : (effect.filter || 'none');
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
    });
}

function getConditionGemVfxElement(name) {
    let db = typeof CONDITION_GEM_DB !== 'undefined' ? CONDITION_GEM_DB : null;
    let entry = db ? Object.values(db).reduce((found, rows) => found || (Array.isArray(rows) ? rows.find(row => row && row.name === name) : null), null) : null;
    let tags = entry && Array.isArray(entry.tags) ? entry.tags : [];
    return tags.includes('fire') ? 'fire' : (tags.includes('cold') ? 'cold' : (tags.includes('lightning') ? 'light' : (tags.includes('chaos') ? 'chaos' : 'phys')));
}

function drawConditionGemImageVfx(ctx, condCast, playerPos, targetPos, now) {
    if (!condCast) return false;
    let isCurse = condCast.type === 'curse';
    let imageKey = isCurse ? SKILL_GEM_VFX_IMAGE_KEYS.dot : SKILL_GEM_VFX_IMAGE_KEYS.rune;
    let image = getSkillGemVfxImage(imageKey);
    let pos = isCurse ? targetPos : playerPos;
    if (!image || !pos) return false;
    let remaining = clampNumber(((condCast.expiresAt || getCombatTime()) - getCombatTime()) / 1100, 0, 1);
    let progress = 1 - remaining;
    let pulse = Math.sin(progress * Math.PI);
    let size = (isCurse ? 72 : (condCast.type === 'guard' ? 68 : 88)) * (0.84 + progress * 0.22);
    ctx.save();
    ctx.translate(pos.x, pos.y - (isCurse ? 5 : 16));
    ctx.rotate((condCast.type === 'warcry' ? -1 : 1) * progress * 0.34);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = (0.22 + pulse * 0.32) * Math.min(1, remaining / 0.2);
    ctx.filter = getSkillGemVfxFilter(getConditionGemVfxElement(condCast.name), imageKey);
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
}

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
    const y = Math.round(Math.max(6,entry.y-(enemy.isBoss ? 106 : 56)-13));
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
function drawBossPatternArea(ctx, area, projection, alpha = 3) {
    if (!area) return;
    let footprint = projectSkillFootprint(area, projection);
    if (footprint) drawSkillFootprintGround(ctx, footprint, '#ff684f', alpha);
}

function drawEnemyAttackTelegraphs(ctx, layout, gridUnitScale, projection, pendingAttacks) {
    sideEncounterCanvas.pendingWarnings(ctx, projection, pendingAttacks);
    (layout || []).forEach(entry => {
        let enemy = entry.enemy;
        if (!enemy || enemy.noAttack || enemy.hp <= 0 || !Number.isFinite(Number(enemy.attackTimer))) return;
        let frozen = (enemy.ailments || []).some(ailment => ['freeze','stun','silence'].includes(ailment.type) && ailment.time > 0);
        if (frozen) return;
        if (enemy.isBoss) {
            drawBossPatternArea(ctx, enemy.patternArea, projection);
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
}

function drawBattlefieldPlayerHealthBar(ctx, playerPos, hpPct, ghostPct, esPct) {
    let width = 64;
    let x = Math.round(playerPos.x - width / 2);
    let y = Math.round(playerPos.y - 82);
    ctx.save();
    ctx.globalAlpha = 0.97;
    if (ghostPct > hpPct + 0.003) {
        ctx.fillStyle = 'rgba(255, 126, 76, 0.58)';
        ctx.fillRect(x, y, Math.max(1, Math.round(width * ghostPct)), 8);
    }
    ctx.fillStyle = '#20bf6b';
    ctx.fillRect(x, y, Math.max(2, Math.round(width * hpPct)), 8);
    if (esPct > 0) {
        ctx.fillStyle = 'rgba(75,123,236,0.85)';
        ctx.fillRect(x, y, Math.max(1, Math.round(width * esPct)), 8);
    }
    ctx.strokeStyle = 'rgba(200, 232, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, width + 1, 9);
    ctx.restore();
}

function drawBattlefieldEnemyHealthBars(ctx, layout, targetIds) {
    (layout || []).forEach(entry => {
        let enemy = entry.enemy;
        let pct = clampNumber(enemy.hp / enemy.maxHp, 0, 1);
        let width = enemy.isBoss ? 96 : 46;
        let x = Math.round(entry.x - width / 2);
        let y = Math.round(entry.y - (enemy.isBoss ? 106 : 56));
        let targeted = targetIds.includes(enemy.id);
        ctx.save();
        ctx.globalAlpha = 0.96;
        let ghostPct = typeof updateEnemyHpDamageGhost === 'function' ? updateEnemyHpDamageGhost(enemy.id, pct * 100) / 100 : pct;
        if (ghostPct > pct + 0.002) {
            ctx.fillStyle = 'rgba(255, 138, 80, 0.58)';
            ctx.fillRect(x + Math.round(width * pct), y, Math.max(2, Math.round(width * (ghostPct - pct))), 6);
        }
        ctx.fillStyle = targeted ? '#f1c40f' : '#e94f64';
        ctx.fillRect(x, y, Math.max(2, Math.round(width * pct)), 6);
        let esPct = (enemy.maxEnergyShield || 0) > 0 ? clampNumber((enemy.energyShield || 0) / Math.max(1, enemy.maxEnergyShield), 0, 1) : 0;
        if (esPct > 0) {
            ctx.fillStyle = 'rgba(92, 184, 255, 0.92)';
            ctx.fillRect(x, y - 4, Math.max(2, Math.round(width * esPct)), 3);
        }
        ctx.strokeStyle = targeted ? 'rgba(255, 224, 130, 0.95)' : 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 0.5, y - 0.5, width + 1, 7);
        ctx.restore();
        drawBossPatternLabel(ctx, entry, enemy);
    });
}

function drawDamageImpactAccent(ctx, fx, t, enemyPosMap) {
    if (!fx || !['heavy', 'annihilate'].includes(fx.impactTier)) return;
    if (String(fx.element || '').toLowerCase() === 'light') return;
    let profile = fx.skillName ? getSkillGemVfxProfile(fx.skillName) : null;
    if (profile && profile.impactAccentVfx === false) return;
    let target = enemyPosMap[fx.enemyId];
    if (!target) return;
    let annihilate = fx.impactTier === 'annihilate';
    let fade = Math.pow(1 - t, 1.35);
    let cx = target.x;
    let cy = target.y - 9;
    ctx.save();
    ctx.strokeStyle = annihilate ? '#fff0a8' : (fx.color || '#ffd36b');
    ctx.lineWidth = annihilate ? 2.8 : 2.4;
    ctx.globalAlpha = fade * (annihilate ? 0.42 : 0.54);
    let rings = 1;
    for (let index = 0; index < rings; index++) {
        ctx.beginPath();
        ctx.arc(cx, cy, 12 + t * (annihilate ? 42 : 36), 0, Math.PI * 2);
        ctx.stroke();
    }
    let rays = annihilate ? 3 : 2;
    for (let index = 0; index < rays; index++) {
        let angle = index * Math.PI * 2 / rays + t * 0.35;
        let inner = 17 + t * 20;
        let outer = inner + (annihilate ? 24 : 18) * fade;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
        ctx.stroke();
    }
    ctx.restore();
}

function drawLevelUpFx(ctx, fx, t, playerPos) {
    let fade = t < 0.48 ? 0.56 : ((1 - t) / 0.52) * 0.56;
    let radius = 16 + t * 30;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.strokeStyle = '#ffe59a';
    ctx.lineWidth = 1.8 * (1 - t) + 0.8;
    for (let ring = 0; ring < 1; ring++) {
        ctx.beginPath();
        ctx.arc(playerPos.x, playerPos.y - 15, radius + ring * 10, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.font = '900 12px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(25,9,0,.9)';
    ctx.strokeText(`LEVEL ${fx.level || ''} UP`, playerPos.x, playerPos.y - 58 - t * 9);
    ctx.fillStyle = '#fff2b4';
    ctx.fillText(`LEVEL ${fx.level || ''} UP`, playerPos.x, playerPos.y - 58 - t * 9);
    ctx.restore();
}

function getBattlefieldClientPoint(canvas, clientX, clientY) {
    if (!canvas) return null;
    let rect = canvas.getBoundingClientRect();
    return {
        x:(clientX - rect.left) * ((canvas.clientWidth || rect.width) / Math.max(1, rect.width)),
        y:(clientY - rect.top) * ((canvas.clientHeight || rect.height) / Math.max(1, rect.height))
    };
}

function getBattlefieldShrineAtClientPosition(canvas, clientX, clientY) {
    let hitbox = battleVisualState.shrineHitbox;
    let point = getBattlefieldClientPoint(canvas, clientX, clientY);
    if (!point || !hitbox) return null;
    return point.x >= hitbox.x && point.x <= hitbox.x + hitbox.width && point.y >= hitbox.y && point.y <= hitbox.y + hitbox.height
        ? hitbox.encounter : null;
}

function drawShrineFallback(ctx, width, height, color) {
    ctx.fillStyle = '#242b31';
    ctx.fillRect(-width * 0.24, -height * 0.58, width * 0.48, height * 0.58);
    ctx.fillStyle = '#4e5960';
    ctx.beginPath();
    ctx.moveTo(0, -height);
    ctx.lineTo(width * 0.24, -height * 0.58);
    ctx.lineTo(0, -height * 0.46);
    ctx.lineTo(-width * 0.24, -height * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -height * 0.94);
    ctx.lineTo(width * 0.1, -height * 0.68);
    ctx.lineTo(0, -height * 0.55);
    ctx.lineTo(-width * 0.1, -height * 0.68);
    ctx.closePath();
    ctx.fill();
}

function drawBattlefieldShrine(ctx, gridProj, now, gridScale, cameraShake) {
    let encounter = typeof shrineRuntime !== 'undefined' ? shrineRuntime.getActiveEncounter() : null;
    if (!encounter || !gridProj) {
        battleVisualState.shrineHitbox = null;
        battleVisualState.shrineHovered = false;
        return;
    }
    let pos = gridProj.cellToScreen(encounter.cell.gx, encounter.cell.gy);
    let height = Math.round(88 * clampNumber(gridScale, 0.72, 1.18));
    let width = Math.round(height * 0.8);
    let color = { power: '#ffbd55', guard: '#73d4ff', haste: '#d6f06b' }[encounter.blessing.id] || '#ffd36b';
    let hovered = battleVisualState.shrineHovered === true;
    let image = battleAssets && battleAssets.images ? battleAssets.images.shrineInteractable : null;
    ctx.save();
    ctx.translate(pos.x, pos.y + 5);
    ctx.globalAlpha = 0.92 + Math.sin(now / 310) * 0.05;
    ctx.shadowColor = color;
    ctx.shadowBlur = hovered ? 16 : 8;
    if (image && image.naturalWidth > 0) ctx.drawImage(image, -width / 2, -height, width, height);
    else drawShrineFallback(ctx, width, height, color);
    ctx.shadowBlur = 0;
    let label = `${encounter.blessing.name} · 클릭`;
    ctx.font = `700 ${hovered ? 12 : 11}px Malgun Gothic`;
    let labelWidth = Math.ceil(ctx.measureText(label).width) + 16;
    ctx.fillStyle = 'rgba(8, 12, 18, 0.88)';
    ctx.fillRect(-labelWidth / 2, -height - 19, labelWidth, 17);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, -height - 10);
    ctx.restore();
    battleVisualState.shrineHitbox = {
        x: pos.x + cameraShake.x - Math.max(28, width * 0.58),
        y: pos.y + cameraShake.y - height - 20,
        width: Math.max(56, width * 1.16),
        height: height + 28,
        encounter
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
    let position = state.playerPos;
    let returnWarp = state.returnWarp;
    let returnDeparture = state.returnDeparture;
    let warpPosition = returnWarp && returnWarp.position ? returnWarp.position : position;
    let departurePosition = returnDeparture && returnDeparture.position ? returnDeparture.position : position;
    let transition = returnWarp || returnDeparture;
    let transitionPosition = returnWarp ? warpPosition : departurePosition;
    let walkingDirection = state.motionState.advanceBlend > 0.08 ? state.motionState.moveDirection : null;
    let poseDirection = state.motionState.facingDirection || state.motionState.attackDirection || 'east';
    let facingLeft = !walkingDirection && poseDirection === 'west';
    drawPlayerReturnWhiteShroud(ctx, transitionPosition, transition && transition.whiteShroud, false);
    drawPlayerReturnWarpEffect(ctx, warpPosition, returnWarp, false);
    drawPlayerReturnDepartureEffect(ctx, departurePosition, returnDeparture, false);
    ctx.save();
    if (transition) ctx.globalAlpha = transition.actorAlpha;
    if (facingLeft) {
        ctx.translate(position.x * 2, 0);
        ctx.scale(-1, 1);
    }
    drawSkillWeaponLayer(ctx, position, state.now, 'back');
    drawBattlePlayerBody(ctx,state,position);
    drawSkillWeaponLayer(ctx, position, state.now, 'front');
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
    let duration = Math.max(1, Number(fx.duration) || 220);
    let progress = (Number(now) - Number(fx.start)) / duration;
    if (!Number.isFinite(progress) || progress < 0 || progress > 1) return null;
    let dx = Number(playerPos.x) - Number(enemyPos.x);
    let dy = Number(playerPos.y) - Number(enemyPos.y);
    let length = Math.hypot(dx, dy);
    if (length < 0.01) return { progress, x: 0, y: 0 };
    let stride = Math.sin(progress * Math.PI) * Math.max(0, Number(distance) || 0);
    return { progress, x: dx / length * stride, y: dy / length * stride };
}

function buildEnemyAttackMotionMap(effects, enemyPosMap, playerPos, now) {
    let result = {};
    (effects || []).forEach(fx => {
        if (!fx || fx.type !== 'enemyAttack' || fx.enemyId == null) return;
        let entry = enemyPosMap[fx.enemyId];
        if (!entry) return;
        let distance = entry.enemy.isBoss ? 10 : (entry.enemy.isElite ? 8 : 6);
        let motion = getEnemyAttackMotion(fx, entry, playerPos, now, distance);
        if (motion) result[fx.enemyId] = motion;
    });
    return result;
}

function resolveEnemyFacingDirection(enemyPos, playerPos) {
    if (game.activeSkill==='암살' && enemyPos.enemy?.facingDirection) return ({2:'south',4:'west',6:'east',8:'north'})[enemyPos.enemy.facingDirection];
    if (!enemyPos || !playerPos) return 'south';
    const dx = Number(playerPos.x) - Number(enemyPos.x);
    const dy = Number(playerPos.y) - Number(enemyPos.y);
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'west' : 'east';
    return dy < 0 ? 'north' : 'south';
}

function buildSummonAttackMotionMap(effects, summons, proj, enemyPosMap, now) {
    let result = {};
    if (!proj || typeof proj.cellToScreen !== 'function') return result;
    let summonById = new Map((summons || []).filter(summon => summon
        && Number.isFinite(summon.gx) && Number.isFinite(summon.gy))
        .map(summon => [summon.id, summon]));
    (effects || []).forEach(fx => {
        if (!fx || fx.type !== 'summonAttack' || fx.summonId == null) return;
        let summon = summonById.get(fx.summonId);
        if (!summon) return;
        let source = proj.cellToScreen(summon.gx, summon.gy);
        let target = enemyPosMap && enemyPosMap[fx.targetEnemyId];
        if (!target && Number.isFinite(fx.targetGx) && Number.isFinite(fx.targetGy)) {
            target = proj.cellToScreen(fx.targetGx, fx.targetGy);
        }
        let motion = getEnemyAttackMotion(fx, source, target, now, 5);
        if (motion) result[fx.summonId] = motion;
    });
    return result;
}

function drawBattleEnemyActor(ctx, entry, state) {
    let enemy = entry.enemy;
    let spawnDuration = enemy.isBoss ? 640 : (enemy.isElite ? 460 : 360);
    let age = enemy.spawnStamp ? clampNumber((state.now - enemy.spawnStamp) / spawnDuration, 0, 1) : 1;
    let easedAge = 1 - Math.pow(1 - age, 3);
    let spawnScale = (enemy.isBoss ? 0.46 : 0.68) + easedAge * (enemy.isBoss ? 0.54 : 0.32);
    if (enemy.isBoss) spawnScale += Math.sin(age * Math.PI) * 0.08;
    let count = state.enemyCount;
    let crowdScale = count >= 9 ? (enemy.isBoss ? 3.25 : (enemy.isElite ? 1.72 : 1.46))
        : (count >= 6 ? (enemy.isBoss ? 3.45 : (enemy.isElite ? 1.9 : 1.62))
            : (enemy.isBoss ? 3.65 : (enemy.isElite ? 2.2 : 1.95)));
    ctx.save();
    ctx.globalAlpha = easedAge;
    drawEnemySprite(ctx, enemy, entry.x, entry.y - (1 - easedAge) * (enemy.isBoss ? 28 : 18),
        crowdScale * state.gridUnitScale * spawnScale, state.flashingEnemyIds.has(enemy.id), state.now, entry.moving,
        state.enemyAttackMotions[enemy.id], resolveEnemyFacingDirection(entry, state.playerPos));
    ctx.restore();
}

function drawBattleActorLayer(ctx, enemyEntries, state) {
    let actors = (enemyEntries || []).map(entry => ({
        kind: 'enemy', id: entry.enemy.id, y: entry.y, entry
    }));
    actors.push({ kind: 'player', id: -1, y: state.playerPos.y });
    sortBattleActorsByDepth(actors).forEach(actor => {
        if (actor.kind === 'player') drawBattlePlayerActor(ctx, state);
        else drawBattleEnemyActor(ctx, actor.entry, state);
    });
}

// Phase-2 extracted battlefield canvas renderer block.
function drawLootHighlightLabel(ctx, fx, position, progress) {
    if (!fx.reason) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - progress) * 3);
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const name = String(fx.itemName || '').slice(0, 24);
    const width = Math.min(250, Math.max(ctx.measureText(name).width, ctx.measureText(fx.reason).width) + 24);
    const top = position.y - 66;
    ctx.fillStyle = 'rgba(15,23,22,0.94)';
    ctx.fillRect(position.x - width / 2, top, width, 43);
    ctx.fillStyle = fx.color;
    ctx.fillRect(position.x - width / 2, top, 3, 43);
    ctx.fillText(fx.reason, position.x, top + 15);
    ctx.fillStyle = '#f4eedf';
    ctx.font = '11px sans-serif';
    ctx.fillText(name, position.x, top + 32, width - 16);
    ctx.restore();
}

function drawLegacyHitFeedback(ctx, fx, progress, playerPos, enemyPosMap) {
    if (SKILL_FX_ATLAS[fx.skillName]) return;
    drawBattleHitFx(ctx, fx, progress, playerPos, enemyPosMap);
    drawDamageImpactAccent(ctx, fx, progress, enemyPosMap);
}

function renderBattlefield(forceWhenHidden) {
    worldTreeSkillFx.beginFrame();
    const canvas = document.getElementById('battlefield-canvas');
    if (!canvas || (!forceWhenHidden && canvas.offsetParent === null)) return;
    if (!battleAssets.ready && !battleAssets.loading && !battleAssets.failed && window.__battleAssetAutoloadEnabled !== false) initBattleAssets();
    const expectedScale = uiDisplay.battleRenderScale;
    const baseWidth = canvas.clientWidth || Math.round((canvas.width || 960) / expectedScale) || 960;
    const baseHeight = canvas.clientHeight || Math.round((canvas.height || 540) / expectedScale) || 540;
    const expectedWidth = Math.max(1, Math.round(baseWidth * expectedScale));
    const expectedHeight = Math.max(1, Math.round(baseHeight * expectedScale));
    if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) resizeBattlefieldCanvas();
    let ctx = canvas.getContext('2d');
    if (!ctx) return;
    const renderScale = clampNumber(Number(canvas.dataset.renderScale) || 1, 1, 2);
    const width = Math.max(1, canvas.clientWidth || Math.round(canvas.width / renderScale) || canvas.width);
    const height = Math.max(1, canvas.clientHeight || Math.round(canvas.height / renderScale) || canvas.height);
    const wallNow = performance.now();
    const rawDeltaMs = battleVisualState.lastWallNow > 0 ? clampNumber(wallNow - battleVisualState.lastWallNow, 0, 50) : 16;
    battleVisualState.lastWallNow = wallNow;
    if (!Number.isFinite(battleVisualState.visualNow) || battleVisualState.visualNow <= 0) battleVisualState.visualNow = wallNow;
    let frozenMs = Math.min(rawDeltaMs, Math.max(0, Number(battleVisualState.hitStopRemainingMs) || 0));
    battleVisualState.hitStopRemainingMs = Math.max(0, (Number(battleVisualState.hitStopRemainingMs) || 0) - frozenMs);
    const deltaMs = Math.max(0, rawDeltaMs - frozenMs);
    battleVisualState.visualNow += deltaMs;
    const now = battleVisualState.visualNow;
    const deltaSec = deltaMs / 1000;
    battleVisualState.lastNow = now;
    cleanupBattleFx(now);
    let activeEnemyCount = (game.enemies || []).reduce((count, enemy) => count + (enemy && enemy.hp > 0 ? 1 : 0), 0);
    let vfxDensity = updateBattleVfxDensity(rawDeltaMs, activeEnemyCount);
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
    let flashingEnemyIds = new Set();
    for (let i = battleFx.length - 1; i >= 0; i--) {
        let fx = battleFx[i];
        if (!fx) continue;
        let age = now - fx.start;
        if (age < 0 || age > fx.duration) continue;
        if (fx.type === 'playerHit') playerFlash = true;
        else if (fx.type === 'playerDown') playerDownActive = true;
        if (fx.enemyId != null && (fx.type === 'hit' || fx.type === 'enemyDeath') && age <= fx.duration * 0.45) {
            flashingEnemyIds.add(fx.enemyId);
        }
    }
    let currentSkill = SKILL_DB[game.activeSkill] || SKILL_DB['기본 공격'];
    let skillAreaCells = getCanvasSkillAreaCells(game.activeSkill || '기본 공격', currentSkill, currentTargets);
    drawBattleGridFloor(ctx, gridProj, zoneTheme, currentTargets, skillAreaCells, backdropActive);
    if (!battleAssets.ready && battleAssets.loading) {
        ctx.save();
        ctx.fillStyle = 'rgba(6,10,16,0.55)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(201, 223, 244, 0.82)';
        ctx.font = 'bold 14px Malgun Gothic';
        ctx.textAlign = 'center';
        ctx.fillText('전장 에셋 로딩 중...', width / 2, height / 2);
        ctx.restore();
        document.getElementById('ui-battlefield-caption').innerText = '전장 에셋 로딩 중...';
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
    let playerPos = {
        x: playerMotion.position.x,
        y: playerMotion.position.y + downBlend * 0.6
    };
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
    if (!battleVisualState.enemySmoothPos) battleVisualState.enemySmoothPos = {};
    let dynamicLayout = layout.map(entry => {
        // 칸 단위 이동이 순간이동으로 보이지 않게 화면 좌표를 목표 칸으로 보간한다.
        let smooth = battleVisualState.enemySmoothPos[entry.enemy.id];
        if (!smooth) {
            smooth = { x: entry.x, y: entry.y };
            battleVisualState.enemySmoothPos[entry.enemy.id] = smooth;
        } else {
            smooth.x = approachNumber(smooth.x, entry.x, 20.0, deltaSec);
            smooth.y = approachNumber(smooth.y, entry.y, 20.0, deltaSec);
        }
        const movingDistance = Math.hypot(entry.x - smooth.x, entry.y - smooth.y);
        if (movingDistance < 0.65) { smooth.x = entry.x; smooth.y = entry.y; }
        entry = { enemy: entry.enemy, x: smooth.x, y: smooth.y, moving: movingDistance >= 0.65 };
        return {
            enemy: entry.enemy,
            x: entry.x,
            y: entry.y,
            moving: entry.moving
        };
    });
    let enemyPosMap = {};
    dynamicLayout.forEach(entry => {
        enemyPosMap[entry.enemy.id] = entry;
        battleVisualState.enemyGhostPos[entry.enemy.id] = {
            x: entry.x,
            y: entry.y,
            stamp: now,
            enemy: { ...entry.enemy }
        };
    });
    playerMotionState.attackDirection = resolvePlayerAttackDirection(playerPos, currentTargets, enemyPosMap);
    if (playerMotion.animating) battleVisualState.playerFacingDirection = playerMotion.direction;
    else if (swingFx) battleVisualState.playerFacingDirection = playerMotionState.attackDirection;
    playerMotionState.facingDirection = battleVisualState.playerFacingDirection || playerMotionState.attackDirection;

    // getPlayerStats()는 장비/패시브 전체를 재계산하는 무거운 함수다.
    // 한 프레임 안에서는 결과가 동일하므로 프레임당 1회만 계산해 재사용한다.
    if (latestSwingFx && latestSwingFx.id !== battleVisualState.lastAutoSwingId && now >= (battleVisualState.lastAutoSkillAt || 0)) {
        playSkillFromActiveGem(game.activeSkill || '기본 공격');
        battleVisualState.lastAutoSwingId = latestSwingFx.id;
        const _atkInterval = Math.min(600, Math.max(120, (1 / Math.max(0.1, framePlayerStats.aspd)) * 100));
        battleVisualState.lastAutoSkillAt = now + _atkInterval;
    }
    if (latestSwingFx && latestSwingFx.projectile && !latestSwingFx.combatTravel) {
        const viewportProjectileFxScale = Math.min(width / 960, height / 540);
        queueSkillGemProjectileLaunch(latestSwingFx, currentTargets, playerPos, enemyPosMap, viewportProjectileFxScale);
    }
    updateSkillPlayback(now, playerPos, width, enemyPosMap);
    let gridUnitScale = clampNumber(gridProj.tileW / 46, 0.48, 1.3);
    drawBattlefieldShrine(ctx, gridProj, now, gridUnitScale, cameraShake);
    drawBattleGroundLayer(ctx, battleFx, { now, gridProj, playerPos, enemyPosMap });

    battleFx.forEach(fx => {
        if (battleVisualState.processedFxIds.has(fx.id)) return;
        if (now < fx.start) return;
        let handled = false;
        if (fx.type === 'hit') {
            requestBattleHitStop(fx);
            let enemyPos = enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId] || { x: width * 0.72, y: height * 0.58 };
            if (typeof fx.damage === 'number') {
                spawnDamageText({
                    start: now,
                    x: enemyPos.x,
                    y: enemyPos.y - 30,
                    value: Number.isFinite(Number(fx.rawDamage)) ? Number(fx.rawDamage) : fx.damage,
                    crit: !!fx.crit,
                    dot: !!fx.dot,
                    dotType: fx.element || '',
                    impactTier: fx.impactTier || 'normal',
                    damageRatio: fx.damageRatio || 0,
                    // Same skill/target within 250 ms shares a sum and hit count at high attack speeds.
                    aggregateKey: `${fx.skillName}:${fx.enemyId}:${Math.floor(fx.start / 250)}`
                });
            }
            if (!fx.dot && fx.skillName) {
                const viewportSkillFxScale = Math.min(width / 960, height / 540);
                queueSkillGemVfx({ ...fx, combatFx:fx, footprint: projectSkillFootprint(fx.attackFootprint, gridProj, fx.sourceCell) }, enemyPos, getCombatTravelScreenPos(gridProj, fx.sourceCell, playerPos), enemyPosMap, now, viewportSkillFxScale);
            }
            if (!fx.dot && !SKILL_FX_ATLAS[fx.skillName] && typeof attackFxSpawn === 'function') {
                const viewportFxScale = Math.min(width / 960, height / 540);
                const attackFxOpts = getAttackFxSpawnOpts(fx, enemyPos.enemy, currentSkillVisual, viewportFxScale);
                if (attackFxOpts) attackFxSpawn(fx.element || 'phys', enemyPos.x, enemyPos.y - 6, attackFxOpts);
            }
            handled = true;
        } else if (fx.type === 'playerHit') {
            let enemyPos = enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId];
            if (typeof fx.damage === 'number') {
                spawnDamageText({
                    start: now,
                    x: playerPos.x + 14,
                    y: playerPos.y - 36,
                    value: fx.damage,
                    enemyHit: true,
                    deflected: !!fx.deflected
                });
            }
            handled = true;
        } else if (fx.type === 'summonHit') {
            let summon = (game.summons || []).find(row => row && row.id === fx.summonId);
            let summonPos = summon && gridProj && hasGridCell(summon)
                ? gridProj.cellToScreen(summon.gx, summon.gy)
                : playerPos;
            if (typeof fx.damage === 'number') {
                spawnDamageText({
                    start: now,
                    x: summonPos.x,
                    y: summonPos.y - 34,
                    value: fx.damage,
                    enemyHit: true
                });
            }
            handled = true;
        } else if (fx.type === 'enemyEvade') {
            let enemyPos = enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId] || { x: width * 0.72, y: height * 0.58 };
            spawnDamageText({
                start: now,
                x: enemyPos.x + 18,
                y: enemyPos.y - 22,
                value: fx.text || '회피!',
                miss: true,
                bodyCue: true,
                duration: 420,
                color: fx.color || '#9fb4c8'
            });
            handled = true;
        } else if (fx.type === 'statusText') {
            let bodyCue = fx.bodyCue === true;
            let anchorPos = fx.enemyId
                ? (enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId] || playerPos)
                : playerPos;
            spawnDamageText({
                start: now,
                x: anchorPos.x + (bodyCue ? 18 : 14),
                y: anchorPos.y - (bodyCue ? 22 : 40),
                value: fx.text || '회피!',
                miss: true,
                bodyCue: bodyCue,
                duration: bodyCue ? 420 : undefined,
                color: fx.color || '#9fb4c8'
            });
            handled = true;
        } else if (fx.type === 'enemyDeath') {
            if (typeof playUiFeedbackSound === 'function') {
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
    let enemyAttackMotions = buildEnemyAttackMotionMap(battleFx, enemyPosMap, playerPos, now);
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
        now, gridProj, gridUnitScale, flashingEnemyIds, enemyCount: dynamicLayout.length,
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
        drawEnemySprite(ctx, ghost.enemy, ghost.x, ghost.y, (ghost.enemy.isBoss ? 3.65 : (ghost.enemy.isElite ? 2.2 : 1.95)) * gridUnitScale, false, now);
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
    let condCast = game.lastConditionGemCast;
    if (condCast && (condCast.expiresAt || 0) > getCombatTime()) {
        let pulse = 0.6 + Math.sin(now / 80) * 0.4;
        let conditionTargetPos = condCast.targetId != null ? enemyPosMap[condCast.targetId] : null;
        drawConditionGemImageVfx(ctx, condCast, playerPos, conditionTargetPos, now);
        ctx.save();
        if (condCast.type === 'warcry') {
            ctx.strokeStyle = `rgba(255, 208, 96, ${0.45 + pulse * 0.35})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(playerPos.x, playerPos.y - 14, 26 + pulse * 6, 0, Math.PI * 2);
            ctx.stroke();
        } else if (condCast.type === 'guard') {
            ctx.fillStyle = `rgba(118, 197, 255, ${0.2 + pulse * 0.2})`;
            ctx.beginPath();
            ctx.arc(playerPos.x, playerPos.y - 18, 20 + pulse * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(167, 224, 255, 0.8)';
            ctx.stroke();
        } else if (condCast.type === 'curse') {
            let targetPos = enemyPosMap[condCast.targetId];
            if (targetPos) {
                ctx.strokeStyle = `rgba(181, 117, 255, ${0.5 + pulse * 0.35})`;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(targetPos.x, targetPos.y - 28, 16 + pulse * 6, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    currentTargets = currentTargets.map(hit => hit.enemy && hit.enemy.id).filter(Boolean);

    battleFx.filter(fx => !isGroundSkillCast(fx) && !fx.loot && !fx.groundLoot).forEach(fx => {
        if (now < fx.start) return;
        let t = clampNumber((now - fx.start) / fx.duration, 0, 1);
        let ghostEnemy = (fx.enemyId && !enemyPosMap[fx.enemyId]) ? battleVisualState.enemyGhostPos[fx.enemyId] : null;
        if (ghostEnemy && !enemyPosMap[fx.enemyId]) {
            enemyPosMap[fx.enemyId] = { enemy: ghostEnemy.enemy || { id: fx.enemyId, hp: 0, maxHp: 1 }, x: ghostEnemy.x, y: ghostEnemy.y };
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
            drawLevelUpFx(ctx, fx, t, playerPos);
        } else if (fx.type === 'playerHit') {
            return;
        } else if (fx.type === 'enemySpawn') {
            let enemy = enemyPosMap[fx.enemyId];
            if (!enemy) return;
            ctx.save();
            ctx.globalAlpha = (1 - t) * (fx.boss ? 0.72 : 0.5);
            ctx.strokeStyle = fx.color || '#9ed6ff';
            ctx.lineWidth = fx.boss ? 4 : 3;
            const ringCount = fx.boss ? 3 : 2;
            for (let ring = 0; ring < ringCount; ring++) {
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y - 4, (fx.boss ? 15 : 10) + t * (fx.boss ? 34 : 22) + ring * 6, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.fillStyle = fx.color || '#9ed6ff';
            ctx.globalAlpha = (1 - t) * (fx.boss ? 0.28 : 0.18);
            ctx.beginPath();
            ctx.ellipse(enemy.x, enemy.y + 8, fx.boss ? 28 : 18, fx.boss ? 12 : 8, 0, 0, Math.PI * 2);
            ctx.fill();
            if (fx.boss) {
                ctx.globalAlpha = (1 - t) * 0.5;
                for (let ray = 0; ray < 8; ray++) {
                    const angle = ray * Math.PI / 4 + t * 0.6;
                    ctx.beginPath();
                    ctx.moveTo(enemy.x + Math.cos(angle) * 24, enemy.y - 5 + Math.sin(angle) * 12);
                    ctx.lineTo(enemy.x + Math.cos(angle) * (46 + t * 18), enemy.y - 5 + Math.sin(angle) * (24 + t * 10));
                    ctx.stroke();
                }
            }
            ctx.restore();
        } else if (fx.type === 'enemyDeath') {
            let enemy = enemyPosMap[fx.enemyId];
            if (!enemy) return;
            const deathEnemy = enemy.enemy || {};
            const isBossDeath = !!(fx.boss || deathEnemy.isBoss);
            const deathMotion = getEnemyDeathMotion(enemy, playerPos, t, isBossDeath, !!fx.elite);
            const dissolve = deathMotion.dissolve;
            const dissolveFade = Math.pow(1 - dissolve, 1.62);
            drawEnemyDeathGroundReaction(ctx, enemy, deathMotion, fx.color, isBossDeath, !!fx.elite);
            drawEnemyDeathContactFlash(ctx, enemy, deathMotion, fx.color, isBossDeath, !!fx.elite);
            ctx.save();
            ctx.globalAlpha = dissolveFade * (isBossDeath ? 0.98 : (fx.elite ? 0.94 : 0.9));
            ctx.translate(deathMotion.x, deathMotion.y);
            ctx.scale(deathMotion.scaleX, deathMotion.scaleY);
            ctx.filter = `grayscale(${Math.floor(dissolve * 78)}%) saturate(${1 - dissolve * 0.62}) brightness(${1 + deathMotion.impactAlpha * 0.45 + dissolve * 0.16})`;
            drawEnemySprite(ctx, deathEnemy, 0, 0, isBossDeath ? 3.65 : (fx.elite ? 2.1 : 1.9), deathMotion.impactAlpha > 0.45, now);
            ctx.restore();
            ctx.save();
            const moteCount = isBossDeath ? 18 : (fx.elite ? 11 : 6);
            const seed = Math.abs(Number(fx.enemyId) || 1) * 0.731;
            ctx.fillStyle = fx.color || (isBossDeath ? '#ffd58a' : '#d8d1c7');
            for (let mote = 0; mote < moteCount; mote++) {
                let phase = clampNumber((dissolve - mote / moteCount * 0.42) / 0.58, 0, 1);
                if (phase <= 0 || phase >= 1) continue;
                let angleSeed = seed + mote * 2.417;
                let spread = isBossDeath ? 31 : (fx.elite ? 22 : 15);
                let px = enemy.x + Math.sin(angleSeed) * spread * (0.35 + phase * 0.65) + Math.cos(now / 310 + mote) * 2;
                let py = enemy.y - (isBossDeath ? 48 : 30) + (mote % 5) * (isBossDeath ? 11 : 8) + phase * (isBossDeath ? 10 : 7);
                let size = (isBossDeath ? 2.8 : 1.8) * (1 - phase * 0.62);
                ctx.globalAlpha = Math.sin(phase * Math.PI) * (isBossDeath ? 0.62 : 0.42);
                ctx.save();
                ctx.translate(px, py);
                ctx.rotate(angleSeed + phase);
                ctx.fillRect(-size, -size * 0.42, size * 2, size * 0.84);
                ctx.restore();
            }
            ctx.restore();
            // 일반 적은 반투명 퇴장 자체만 보여 준다. 정예·보스에만 파열을 더해
            // 대량 원킬 때 적 수만큼 무거운 버스트가 중첩되지 않게 한다.
            if (fx.elite || isBossDeath) drawBattleImpactBurst(ctx, enemy.x, enemy.y - 6, fx.color || '#ffb0b0', '#ffffff', t);
            if (isBossDeath) {
                ctx.save();
                ctx.globalAlpha = (1 - t) * 0.75;
                ctx.strokeStyle = fx.color || '#ffd58a';
                ctx.lineWidth = 4;
                for (let ring = 0; ring < 3; ring++) {
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y - 8, 24 + ring * 12 + t * 58, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.restore();
            }
        } else if (['bossAreaImpact', 'trialTrapWarning', 'trialTrap'].includes(fx.type)) {
            drawTrialTrapGridFx(ctx, fx, t, gridProj, fx.type === 'trialTrapWarning');
        } else if (fx.type === 'lootPickup') {
            let enemy = enemyPosMap[fx.enemyId];
            let startX = enemy ? enemy.x : width * 0.72;
            let startY = enemy ? enemy.y - 10 : height * 0.62;
            let endX = playerPos.x;
            let endY = playerPos.y - 24;
            let x = startX + (endX - startX) * t;
            let y = startY + (endY - startY) * t - Math.sin(t * Math.PI) * 18;
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
        } else if (fx.type === 'lootCelebration') {
            let enemy = enemyPosMap[fx.enemyId];
            let cx = enemy ? enemy.x : width * 0.72;
            let cy = enemy ? enemy.y - 10 : height * 0.62;
            ctx.save();
            const intensity = fx.tier === 'unique' ? 1 : (fx.tier === 'rare' ? 0.72 : 0.5);
            const beamHeight = (fx.tier === 'unique' ? 220 : 145) * (0.82 + 0.18 * Math.sin(t * Math.PI));
            const beam = ctx.createLinearGradient(cx, cy, cx, cy - beamHeight);
            beam.addColorStop(0, fx.color || '#ffcf6b');
            beam.addColorStop(0.28, fx.color || '#ffcf6b');
            beam.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.globalAlpha = intensity * (1 - t) * 0.72;
            ctx.fillStyle = beam;
            ctx.fillRect(cx - (fx.tier === 'unique' ? 7 : 4), cy - beamHeight, fx.tier === 'unique' ? 14 : 8, beamHeight);
            ctx.globalAlpha = intensity * 0.58 * (1 - t);
            ctx.strokeStyle = fx.color || '#ffcf6b';
            ctx.lineWidth = fx.tier === 'unique' ? 4 : 3;
            for (let ring = 0; ring < (fx.tier === 'unique' ? 3 : 2); ring++) {
                ctx.beginPath();
                ctx.arc(cx, cy, 13 + ring * 8 + t * (fx.tier === 'unique' ? 44 : 30), 0, Math.PI * 2);
                ctx.stroke();
            }
            for (let spark = 0; spark < (fx.tier === 'unique' ? 10 : 6); spark++) {
                const angle = spark * (Math.PI * 2 / (fx.tier === 'unique' ? 10 : 6)) + t;
                const reach = 18 + t * 48;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach * 0.42);
                ctx.lineTo(cx + Math.cos(angle) * (reach + 8), cy + Math.sin(angle) * (reach + 8) * 0.42);
                ctx.stroke();
            }
            drawLootHighlightLabel(ctx, fx, { x: Math.max(130, Math.min(width - 130, cx)), y: Math.max(74, cy) }, t);
            ctx.restore();
        }
    });
    drawBattlefieldPlayerHealthBar(ctx, playerPos, playerHpPct, playerHpGhostPct, playerEsPct);
    drawBattlefieldEnemyHealthBars(ctx, dynamicLayout, currentTargets);
    drawDamageTexts(ctx, now);
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    drawBattleScreenGrade(ctx, width, height, now);

    let caption = '전장을 스캔 중...';
    if (battleAssets.failed && !battleAssets.ready) caption = '전장 에셋 일부 로드 실패 (기본 렌더링으로 전투 진행)';
    if (game.isTownReturning && game.moveTimer > 0) caption = '마을로 귀환 중...';
    else if (game.woodsmanEntrancePending) caption = '혼돈 밖이 침묵합니다… 나무꾼이 다가옵니다.';
    else if (game.moveTimer > 0) caption = '';
    else if (getCanvasCrowdProgressPaused()) caption = '';
    else caption = `몬스터 수 ${enemies.length}마리`;
    document.getElementById('ui-battlefield-caption').innerText = caption;
}

function getBattleCameraShake(now) {
    if (typeof game !== 'undefined' && game.settings && game.settings.cameraShake === false) return { x: 0, y: 0 };
    let amplitude = 0;
    (battleFx || []).forEach(fx => {
        if (!fx || fx.dot || !['hit', 'playerHit', 'enemyDeath', 'enemySpawn'].includes(fx.type)) return;
        let profile = typeof getBattleFeedbackProfile === 'function' ? getBattleFeedbackProfile(fx) : null;
        let duration = Math.max(80, Number(profile && profile.duration) || 110);
        let age = now - fx.start;
        if (age < 0 || age > duration) return;
        let hitStrength = Math.max(0, Number(profile && profile.shake) || 0);
        let strength = fx.type === 'enemyDeath'
            ? (fx.boss ? 8.2 : (fx.elite ? 3.1 : 0.8))
            : (fx.type === 'enemySpawn'
                ? (fx.boss ? 2.8 : (fx.elite ? 0.8 : 0))
                : (fx.type === 'playerHit' ? Math.max(0.45, hitStrength * 0.32) : hitStrength));
        amplitude = Math.max(amplitude, strength * (1 - age / duration));
    });
    return {
        x: Math.sin(now * 0.72) * amplitude,
        y: Math.cos(now * 0.94) * amplitude * 0.56
    };
}

function drawBattleScreenGrade(ctx, width, height, now) {
    ctx.save();
    let edgeSizeX = Math.max(72, width * 0.2);
    let edgeSizeY = Math.max(58, height * 0.18);
    let leftEdge = ctx.createLinearGradient(0, 0, edgeSizeX, 0);
    leftEdge.addColorStop(0, 'rgba(1,3,7,0.44)');
    leftEdge.addColorStop(1, 'rgba(1,3,7,0)');
    ctx.fillStyle = leftEdge;
    ctx.fillRect(0, 0, edgeSizeX, height);
    let rightEdge = ctx.createLinearGradient(width, 0, width - edgeSizeX, 0);
    rightEdge.addColorStop(0, 'rgba(1,3,7,0.44)');
    rightEdge.addColorStop(1, 'rgba(1,3,7,0)');
    ctx.fillStyle = rightEdge;
    ctx.fillRect(width - edgeSizeX, 0, edgeSizeX, height);
    let topEdge = ctx.createLinearGradient(0, 0, 0, edgeSizeY);
    topEdge.addColorStop(0, 'rgba(1,3,7,0.34)');
    topEdge.addColorStop(1, 'rgba(1,3,7,0)');
    ctx.fillStyle = topEdge;
    ctx.fillRect(0, 0, width, edgeSizeY);
    let bottomEdge = ctx.createLinearGradient(0, height, 0, height - edgeSizeY);
    bottomEdge.addColorStop(0, 'rgba(1,3,7,0.5)');
    bottomEdge.addColorStop(1, 'rgba(1,3,7,0)');
    ctx.fillStyle = bottomEdge;
    ctx.fillRect(0, height - edgeSizeY, width, edgeSizeY);
    ctx.restore();
}

function getBattleMarkerLabel(marker) {
    if (marker.boss) return '보';
    if (marker.elite) return `정${marker.count || 1}`;
    return `${marker.count || 1}기`;
}
function getElementLabel(ele) {
    if (ele === 'fire') return '화염';
    if (ele === 'cold') return '냉기';
    if (ele === 'light') return '번개';
    if (ele === 'chaos') return '공허';
    return '물리';
}
function getEnemyDisplayName(enemy) {
    if (!enemy) return '미확인 적';
    return String(enemy.name || '미확인 적')
        .replace(/[🔥❄️⚡☠️🩸👿]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function getEnemyTraitSummary(enemy) {
    let tags = [];
    if (!enemy) return ['일반'];
    tags.push(getElementLabel(enemy.ele));
    if (enemy.traitName) tags.push(enemy.traitName);
    if (enemy.patternMode && typeof getBossPatternModeLabel === 'function') {
        let patternLabel = getBossPatternModeLabel(enemy.patternMode);
        if (patternLabel) tags.push(`패턴: ${patternLabel}`);
        let nextPattern = enemy.nextPatternState || (typeof getBossPatternPreview === 'function' ? getBossPatternPreview(enemy) : null);
        if (nextPattern && nextPattern.isSpecial && nextPattern.label) tags.push(`다음: ${nextPattern.label}`);
    }
    if ((enemy.firstHitGuard || 0) > 0 && !enemy.firstHitConsumed) tags.push(`첫타보호 ${Math.floor((enemy.firstHitGuard || 0) * 100)}%`);
    if ((enemy.hitRateGuard || 0) > 0) tags.push(`연타경감 ${Math.floor((enemy.hitRateGuard || 0) * 100)}%/후속타`);
    if ((enemy.leechEffMul || 1) <= 0) tags.push('흡혈불가');
    else if ((enemy.leechEffMul || 1) < 1) tags.push(`흡혈저항 ${Math.floor((enemy.leechEffMul || 1) * 100)}%`);
    return Array.from(new Set(tags.filter(Boolean)));
}
function getEnemyShortLabel(enemy) {
    if (enemy.isSeveredWanderer) return '방랑자';
    if (enemy.isBoss) return '보스';
    if (enemy.isElite) return '정예';
    if (enemy.ele === 'fire') return '화염';
    if (enemy.ele === 'cold') return '냉기';
    if (enemy.ele === 'light') return '번개';
    if (enemy.ele === 'chaos') return '공허';
    return '추종자';
}


const SUMMON_SPRITE_ORDER = ['서리늑대 소환', '불곰 소환', '벼락멧돼지 소환', '칼날까마귀 소환', '공허 유충 소환', '벌떼 소환', '수액 골렘 소환'];
const SUMMON_SPRITE_FALLBACK_BY_NAME = Object.freeze({
    '폭풍 정령 소환': '벼락멧돼지 소환',
    '철갑 거북 소환': '불곰 소환'
});
const summonSpriteFrameCache = new WeakMap();
const SUMMON1_CANONICAL_WIDTH = 540;
// summon1.png 수동 분석 기준 경계(좌->우, 7프레임).
const SUMMON1_FRAME_BOUNDARIES = [0, 74, 152, 233, 313, 396, 464, 540];

function buildSummonSpriteFramesByContent(image) {
    if (!image || !image.width || !image.height) return null;
    const cached = summonSpriteFrameCache.get(image);
    if (cached) return cached;
    const frameCount = SUMMON_SPRITE_ORDER.length;
    const scale = image.width / SUMMON1_CANONICAL_WIDTH;
    const boundaries = SUMMON1_FRAME_BOUNDARIES.map((value, idx) => {
        if (idx === 0) return 0;
        if (idx === SUMMON1_FRAME_BOUNDARIES.length - 1) return image.width;
        return clampNumber(Math.round(value * scale), 0, image.width);
    });
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
        const sx = boundaries[i];
        const ex = boundaries[i + 1];
        const sw = Math.max(1, ex - sx);
        frames.push({ sx, sy: 0, sw, sh: image.height });
    }
    summonSpriteFrameCache.set(image, frames);
    return frames;
}

function getSummonSpriteFrameRectByName(name, image) {
    if (!image) return null;
    const frames = buildSummonSpriteFramesByContent(image);
    if (!frames || frames.length <= 0) return null;
    const rawName = String(name || '').replace(/\s+/g, ' ').trim();
    const normalizeName = SUMMON_SPRITE_FALLBACK_BY_NAME[rawName] || rawName;
    const index = Math.max(0, SUMMON_SPRITE_ORDER.findIndex(label => label === normalizeName));
    const safeIndex = Math.min(index, frames.length - 1);
    return frames[safeIndex];
}

function resolvePlayerAttackDirection(playerPos, currentTargets, enemyPosMap) {
    let primary = currentTargets && currentTargets[0] ? currentTargets[0].enemy : null;
    let anchor = primary ? enemyPosMap[primary.id] : null;
    if (!anchor) return battleVisualState.playerAttackDirection || 'east';
    let dx = Number(anchor.x) - Number(playerPos.x);
    let dy = Number(anchor.y) - Number(playerPos.y);
    let direction = Math.abs(dy) > 6 ? (dy < 0 ? 'north' : 'south') : (dx < 0 ? 'west' : 'east');
    battleVisualState.playerAttackDirection = direction;
    return direction;
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
    const halfW = proj.tileW / 2;
    const halfH = proj.tileH / 2;
    const tilePath = (gx, gy) => {
        const c = proj.cellToScreen(gx, gy);
        ctx.beginPath();
        ctx.rect(c.x - halfW, c.y - halfH, proj.tileW, proj.tileH);
    };
    const fillCell = (unit, fillStyle, strokeStyle, alpha) => {
        if (!hasGridCell(unit)) return;
        getGridUnitCells(unit).forEach(cell => {
            tilePath(cell.gx, cell.gy);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = fillStyle;
            ctx.fill();
            ctx.globalAlpha = Math.min(0.95, alpha + 0.25);
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 2.4;
            ctx.stroke();
        });
    };
    ctx.save();
    for (let gx = 0; gx < COMBAT_GRID_CONFIG.columns; gx++) {
        for (let gy = 0; gy < COMBAT_GRID_CONFIG.rows; gy++) {
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
    drawBattleGridCombatOccupants(ctx, tilePath, fillCell, { backdropActive, skillTargets, skillAreaCells });
    ctx.restore();
}

function drawBattleGridCombatOccupants(ctx, tilePath, fillCell, layers) {
    fillCell(game.gridPlayer, 'rgba(134, 190, 255, 0.13)', 'rgba(150, 203, 255, 0.55)', 0.9);
    (game.enemies || []).forEach(enemy => {
        if (enemy && enemy.hp > 0) fillCell(enemy, 'rgba(255, 87, 87, 0.12)', 'rgba(255, 140, 120, 0.38)', 0.7);
    });
    (game.summons || []).forEach(summon => {
        if (summon && !summon.isGhost && summon.alive && (summon.hp || 0) > 0) fillCell(summon, 'rgba(126, 255, 173, 0.12)', 'rgba(154, 255, 192, 0.38)', 0.75);
    });
    (layers.skillAreaCells || []).forEach(cell => fillCell(cell, 'rgba(124, 255, 214, 0.12)', 'rgba(124, 255, 214, 0.5)', 0.9));
    (layers.skillTargets || []).forEach(hit => fillCell(hit && hit.enemy, 'rgba(255, 211, 91, 0.18)', 'rgba(255, 225, 151, 0.75)', 0.95));
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

function drawActiveSummons(ctx, playerPos, now, proj, attackMotions) {
    const summons = (game.summons || []).filter(s => s && s.alive && (s.hp || 0) > 0);
    if (summons.length <= 0) return;
    const image = battleAssets && battleAssets.images ? battleAssets.images.summon1 : null;
    const radius = 24 + Math.min(40, summons.length * 4);
    summons.forEach((summon, idx) => {
        // 그리드 유닛: 자기 칸에 그린다. 칸이 아직 없으면(스폰 직후) 플레이어 주변 궤도로 표시한다.
        const angle = (now / 1000) * 0.9 + (idx / Math.max(1, summons.length)) * Math.PI * 2;
        const cellPos = (proj && hasGridCell(summon)) ? proj.cellToScreen(summon.gx, summon.gy) : null;
        const attackMotion = attackMotions && attackMotions[summon.id];
        const x = (cellPos ? cellPos.x : playerPos.x + Math.cos(angle) * radius) + (attackMotion ? attackMotion.x : 0);
        const y = (cellPos ? cellPos.y + (Number(proj.actorGroundOffsetY) || 0) : playerPos.y - 18 + Math.sin(angle) * 12)
            + (attackMotion ? attackMotion.y : 0);
        let drewImage = false;
        ctx.save();
        if (summon.isGhost) ctx.globalAlpha = 0.46;
        if (image) {
            const frame = getSummonSpriteFrameRectByName(summon.gemName, image);
            if (frame) {
                const size = summon.role === 'guard' ? 42 : 34;
                const drawW = size;
                const drawH = Math.max(18, Math.round(size * (frame.sh / Math.max(1, frame.sw))));
                ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, Math.round(x - drawW / 2), Math.round(y - drawH + 3), drawW, drawH);
                drewImage = true;
            }
        }
        if (!drewImage) {
            ctx.save();
            ctx.fillStyle = summon.role === 'guard' ? 'rgba(132, 205, 167, 0.8)' : 'rgba(159, 212, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, summon.role === 'guard' ? 8 : 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        if (summon.isGhost) {
            ctx.strokeStyle = 'rgba(204, 174, 255, 0.94)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(x, y - 10, summon.role === 'guard' ? 15 : 12, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
        const hpPct = clampNumber(summon.hp / Math.max(1, summon.maxHp || summon.hp), 0, 1);
        const hpWidth = summon.role === 'guard' ? 38 : 32;
        const hpX = Math.round(x - hpWidth / 2);
        const hpY = Math.round(y - (summon.role === 'guard' ? 48 : 40));
        ctx.save();
        ctx.fillStyle = summon.isGhost ? '#c9a8ff' : (summon.role === 'guard' ? '#59d98e' : '#78d9ff');
        ctx.fillRect(hpX, hpY, Math.max(1, Math.round(hpWidth * hpPct)), 4);
        ctx.strokeStyle = 'rgba(220, 248, 255, 0.72)';
        ctx.strokeRect(hpX - 0.5, hpY - 0.5, hpWidth + 1, 5);
        ctx.restore();
    });
}


safeExposeGlobals({
    renderBattlefield, getPlayableHeroWalkMotion,
    getBattlefieldShrineAtClientPosition
});
