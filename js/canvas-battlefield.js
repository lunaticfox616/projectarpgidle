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
    let wallNow = Date.now();
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

function getCanvasCrowdPauseLimit() {
    if (typeof ENEMY_CROWD_PAUSE_LIMIT !== 'undefined') return ENEMY_CROWD_PAUSE_LIMIT;
    if (typeof window !== 'undefined' && Number.isFinite(Number(window.ENEMY_CROWD_PAUSE_LIMIT))) return Number(window.ENEMY_CROWD_PAUSE_LIMIT);
    return 20;
}

// Attack impact effects expand to a circular reach. Physical keeps its full
// shockwave; every other element is capped to roughly the monster's footprint
// so the rings/glow do not balloon past the target. When the enemy object is
// unavailable (ghost/fallback position) we fall back to a much smaller scale.
function getAttackFxSpawnOpts(fx, enemy, skillVisual, viewportScale) {
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
    if (fx.skillName && getSkillGemVfxProfile(fx.skillName)) {
        // 생성 이미지가 주 실루엣을 담당하므로 기존 입자는 적중점의 짧은 보조광만 남긴다.
        opts.scale *= 0.72;
        opts.densityMul = (Number(opts.densityMul) || 1) * 0.5;
    }
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

const SKILL_GEM_VFX_IMAGE_KEYS = Object.freeze({
    whirlwind: 'skillFxWhirlwind',
    chainPrimary: 'skillFxChainPrimary',
    chainJump: 'skillFxChainJump',
    slamPrimary: 'skillFxSlamPrimary',
    slamAftershock: 'skillFxSlamAftershock',
    slash: 'skillFxSlash',
    projectile: 'skillFxProjectile',
    burst: 'skillFxBurst',
    dot: 'skillFxDotField',
    summon: 'skillFxSummonStrike'
});

function getSkillGemVfxProfile(skillName) {
    let profiles = typeof SKILL_GEM_VFX_PROFILES !== 'undefined' ? SKILL_GEM_VFX_PROFILES : null;
    return profiles && profiles[skillName] ? profiles[skillName] : null;
}

function getSkillGemVfxImage(imageKey) {
    let image = battleAssets && battleAssets.images ? battleAssets.images[imageKey] : null;
    return image && image.complete && image.naturalWidth ? image : null;
}

function normalizeSkillGemVfxElement(element, accent) {
    if (accent === 'blood') return 'blood';
    let key = String(element || 'phys').toLowerCase();
    if (key === 'lightning') return 'light';
    if (key === 'physical') return 'phys';
    return ['phys', 'fire', 'cold', 'light', 'chaos', 'blood'].includes(key) ? key : 'phys';
}

function getSkillGemVfxFilter(element, imageKey) {
    let key = normalizeSkillGemVfxElement(element);
    if (imageKey === 'skillFxChainPrimary' || imageKey === 'skillFxChainJump') {
        if (key === 'light') return 'none';
        if (key === 'chaos') return 'hue-rotate(78deg) saturate(1.35) brightness(0.94)';
    }
    if (key === 'fire') return 'sepia(1) saturate(5.4) hue-rotate(338deg) brightness(1.05)';
    if (key === 'cold') return 'sepia(1) saturate(4.4) hue-rotate(155deg) brightness(1.12)';
    if (key === 'light') return 'sepia(1) saturate(5.2) hue-rotate(172deg) brightness(1.16)';
    if (key === 'chaos') return 'sepia(1) saturate(5.4) hue-rotate(232deg) brightness(0.98)';
    if (key === 'blood') return 'sepia(1) saturate(6.2) hue-rotate(315deg) brightness(0.88)';
    return 'none';
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

function queueSkillGemVfx(fx, enemyPos, playerPos, enemyPosMap, now, viewportScale) {
    if (!fx || fx.dot || !fx.skillName) return;
    let profile = getSkillGemVfxProfile(fx.skillName);
    if (!profile) return;
    let stageKind = String(fx.stageKind || 'primary');
    let family = getSkillGemVfxStageFamily(profile, stageKind);
    if (profile.family === 'projectile' && stageKind !== 'chainJump' && hasMatchingTravelProjectile(fx.skillName, now)) return;
    let imageKey = SKILL_GEM_VFX_IMAGE_KEYS[family] || SKILL_GEM_VFX_IMAGE_KEYS.slash;
    let connector = false;
    if (family === 'chain' && stageKind === 'chainPrimary') imageKey = SKILL_GEM_VFX_IMAGE_KEYS.chainPrimary;
    if (stageKind === 'chainJump') {
        imageKey = SKILL_GEM_VFX_IMAGE_KEYS.chainJump;
        connector = true;
    } else if (stageKind === 'slamPrimary') {
        imageKey = SKILL_GEM_VFX_IMAGE_KEYS.slamPrimary;
        connector = false;
    } else if (stageKind === 'slamAftershock') {
        imageKey = SKILL_GEM_VFX_IMAGE_KEYS.slamAftershock;
        connector = false;
    }
    let source = playerPos || { x: enemyPos.x - 70, y: enemyPos.y };
    if (stageKind === 'chainJump' && fx.chainFromEnemyId != null) {
        source = (enemyPosMap && enemyPosMap[fx.chainFromEnemyId])
            || (battleVisualState.enemyGhostPos && battleVisualState.enemyGhostPos[fx.chainFromEnemyId])
            || source;
    }
    let target = enemyPos || { x: source.x + 70, y: source.y };
    let scale = Math.max(0.45, Number(profile.scale) || 1) * clampNumber(Number(viewportScale) || 1, 0.7, 1.16);
    if (target.enemy && target.enemy.isBoss) scale *= 1.08;
    let repeatCount = Math.max(1, Math.min(3, Math.floor(Number(profile.repeats) || 1)));
    if (stageKind === 'chainJump' || stageKind === 'slamAftershock' || stageKind === 'slamPrimary' || family === 'whirlwind') repeatCount = 1;
    let seed = Math.max(1, Number(fx.id) || 1);
    let list = battleVisualState.skillEffects || (battleVisualState.skillEffects = []);
    for (let repeat = 0; repeat < repeatCount; repeat++) {
        let repeatOffset = repeat - (repeatCount - 1) / 2;
        let baseRotation = Math.atan2(target.y - source.y, target.x - source.x);
        let rotation = connector ? baseRotation : baseRotation + Math.PI * 0.28 + repeatOffset * 0.16;
        if (family === 'whirlwind') rotation = (Number(fx.stageIndex) || 0) * (Math.PI / 4) + seed * 0.031;
        list.push({
            skillName: fx.skillName,
            family: family,
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
            alpha: family === 'dot' ? 0.4 : (family === 'whirlwind' ? 0.54 : 0.72),
            filter: getSkillGemVfxFilter(normalizeSkillGemVfxElement(fx.element, profile.accent), imageKey),
            seed: seed + repeat * 17
        });
    }
    if (list.length > 96) list.splice(0, list.length - 96);
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
    if (skill.targetMode === 'chain') targets = targets.slice(0, 1);
    else targets = targets.slice(0, 4);
    if (targets.length <= 0) return;
    let imageKey = SKILL_GEM_VFX_IMAGE_KEYS.projectile;
    let releaseAt = swingFx.start + Math.max(90, swingFx.duration * 0.42);
    let arriveAt = Number(swingFx.impactAt) || (swingFx.start + swingFx.duration);
    let scale = Math.max(0.45, Number(profile.scale) || 1) * clampNumber(Number(viewportScale) || 1, 0.7, 1.16);
    let repeats = Math.max(1, Math.min(3, Math.floor(Number(profile.repeats) || 1)));
    let list = battleVisualState.skillEffects || (battleVisualState.skillEffects = []);
    targets.forEach((target, targetIndex) => {
        for (let repeat = 0; repeat < repeats; repeat++) {
            let stagger = repeat * 32;
            let startAt = Math.min(arriveAt - 70, releaseAt + stagger);
            let laneOffset = (repeat - (repeats - 1) / 2) * 4;
            list.push({
                skillName: swingFx.skillName,
                family: 'projectile',
                stageKind: 'projectileTravel',
                imageKey: imageKey,
                startAt: startAt,
                arriveAt: arriveAt,
                duration: Math.max(70, arriveAt - startAt),
                fromX: playerPos.x + 13,
                fromY: playerPos.y - 20 + laneOffset,
                toX: target.x,
                toY: target.y - 9 + laneOffset,
                travel: true,
                connector: false,
                rotation: Math.atan2((target.y - 9 + laneOffset) - (playerPos.y - 20 + laneOffset), target.x - (playerPos.x + 13)),
                size: getSkillGemVfxBaseSize('projectile', 'projectileTravel') * scale * (1 - targetIndex * 0.035),
                alpha: 0.7,
                filter: getSkillGemVfxFilter(normalizeSkillGemVfxElement(swingFx.element, profile.accent), imageKey),
                seed: Math.max(1, Number(swingFx.id) || 1) + targetIndex * 19 + repeat * 7
            });
        }
    });
    if (list.length > 96) list.splice(0, list.length - 96);
}

function drawSkillGemVfxLayer(ctx, now) {
    let list = battleVisualState.skillEffects || [];
    list.forEach(effect => {
        let image = getSkillGemVfxImage(effect.imageKey);
        if (!image) return;
        let elapsed = now - effect.startAt;
        if (elapsed < 0 || elapsed > effect.duration) return;
        let t = clampNumber(elapsed / Math.max(1, effect.duration), 0, 1);
        let fade = Math.sin(Math.PI * t);
        if (effect.family === 'dot') fade = Math.min(1, t / 0.16) * Math.min(1, (1 - t) / 0.28);
        if (effect.travel) fade = Math.min(1, t / 0.12) * Math.min(1, (1 - t) / 0.1);
        ctx.save();
        ctx.globalCompositeOperation = (effect.stageKind === 'slamPrimary' || effect.stageKind === 'slamAftershock') ? 'source-over' : 'screen';
        ctx.globalAlpha = clampNumber((effect.alpha || 0.7) * fade, 0, 0.82);
        ctx.filter = effect.filter || 'none';
        if (effect.travel) {
            let eased = t * t * (3 - 2 * t);
            let arc = Math.sin(t * Math.PI) * Math.min(13, Math.hypot(effect.toX - effect.fromX, effect.toY - effect.fromY) * 0.09);
            let x = effect.fromX + (effect.toX - effect.fromX) * eased;
            let y = effect.fromY + (effect.toY - effect.fromY) * eased - arc;
            let width = effect.size * 1.52;
            let height = effect.size * 0.52;
            ctx.translate(x, y);
            ctx.rotate(effect.rotation || 0);
            for (let trail = 3; trail >= 1; trail--) {
                ctx.globalAlpha *= 0.28;
                ctx.drawImage(image, -width / 2 - trail * 7, -height / 2, width * (1 - trail * 0.07), height * (1 - trail * 0.08));
                ctx.globalAlpha /= 0.28;
            }
            ctx.drawImage(image, -width / 2, -height / 2, width, height);
        } else if (effect.connector) {
            let reveal = Math.min(1, t / 0.22);
            let fromX = effect.toX + (effect.fromX - effect.toX) * reveal;
            let fromY = effect.toY + (effect.fromY - effect.toY) * reveal;
            let dx = effect.toX - fromX;
            let dy = effect.toY - fromY;
            let length = Math.max(8, Math.hypot(dx, dy));
            let thickness = Math.max(18, effect.size * (0.82 + Math.sin(t * Math.PI) * 0.18));
            ctx.translate((fromX + effect.toX) / 2, (fromY + effect.toY) / 2);
            ctx.rotate(Math.atan2(dy, dx));
            ctx.drawImage(image, -length / 2, -thickness / 2, length, thickness);
        } else {
            let grow = effect.family === 'dot' ? (0.9 + t * 0.1) : (0.72 + (1 - Math.pow(1 - t, 3)) * 0.36);
            let width = effect.size * grow;
            let height = width;
            if (effect.family === 'slash' || effect.family === 'summon') height *= 0.88;
            ctx.translate(effect.x, effect.y);
            ctx.rotate(effect.rotation || 0);
            ctx.drawImage(image, -width / 2, -height / 2, width, height);
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
    let imageKey = isCurse ? SKILL_GEM_VFX_IMAGE_KEYS.dot : SKILL_GEM_VFX_IMAGE_KEYS.burst;
    let image = getSkillGemVfxImage(imageKey);
    let pos = isCurse ? targetPos : playerPos;
    if (!image || !pos) return false;
    let remaining = clampNumber(((condCast.expiresAt || Date.now()) - Date.now()) / 1100, 0, 1);
    let progress = 1 - remaining;
    let pulse = Math.sin(progress * Math.PI);
    let size = (isCurse ? 72 : (condCast.type === 'guard' ? 68 : 88)) * (0.84 + progress * 0.22);
    ctx.save();
    ctx.translate(pos.x, pos.y - (isCurse ? 5 : 16));
    ctx.rotate((condCast.type === 'warcry' ? -1 : 1) * progress * 0.34);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.18 + pulse * 0.34;
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

function getBossTelegraphDecalImage(kind) {
    if (!battleAssets || !battleAssets.images) return null;
    if (kind === 'ring') return battleAssets.images.bossTelegraphRing || null;
    if (kind === 'fan') return battleAssets.images.bossTelegraphFan || null;
    if (kind === 'pulse') return battleAssets.images.bossTelegraphPulse || null;
    return null;
}

function drawBossTelegraphDecal(ctx, kind, x, y, width, height, rotation, progress, pulse, palette, anchorY) {
    let image = getBossTelegraphDecalImage(kind);
    if (!image || !image.complete || !image.naturalWidth) return false;
    let charge = clampNumber(Number(progress) || 0, 0, 1);
    let flicker = clampNumber(Number(pulse) || 1, 0.68, 1.2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Number(rotation) || 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = (0.18 + charge * 0.42) * flicker;
    ctx.shadowColor = palette.edge;
    ctx.shadowBlur = 5 + charge * 9;
    ctx.filter = `saturate(${0.72 + charge * 0.4}) brightness(${0.78 + charge * 0.36})`;
    let top = -(Number(anchorY) || 0.5) * height;
    ctx.drawImage(image, -width / 2, top, width, height);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.06 + charge * 0.15;
    ctx.shadowBlur = 10 + charge * 12;
    ctx.drawImage(image, -width / 2, top, width, height);
    ctx.restore();
    return true;
}

function drawEnemyAttackTelegraphs(ctx, layout, playerPos, now, gridUnitScale) {
    (layout || []).forEach(entry => {
        let enemy = entry.enemy;
        if (!enemy || enemy.noAttack || enemy.hp <= 0 || !Number.isFinite(Number(enemy.attackTimer))) return;
        let frozen = (enemy.ailments || []).some(ailment => ailment && ailment.type === 'freeze' && (ailment.time || 0) > 0);
        if (frozen) return;
        // Ordinary monsters no longer carry a ground aura/charge ring. Their attack
        // remains readable through motion, player damage feedback, and the health UI.
        if (!enemy.isElite && !enemy.isBoss) return;
        let pattern = enemy.isBoss
            ? (enemy.nextPatternState || (typeof getBossPatternPreview === 'function' ? getBossPatternPreview(enemy) : null))
            : null;
        let threshold = pattern && pattern.isSpecial ? 0.56 : (enemy.isBoss ? 0.68 : 0.84);
        let charge = Number(enemy.attackTimer) || 0;
        if (charge < threshold) return;
        let progress = clampNumber((charge - threshold) / Math.max(0.001, 1 - threshold), 0, 1);
        let pulse = 0.9 + Math.sin(now / (enemy.isBoss ? 105 : 125)) * 0.1;
        let palette = getEnemyTelegraphColor(enemy);
        let ranged = enemy.attackKind === 'ranged';
        let radiusX = (enemy.isBoss ? 38 : (enemy.isElite ? 29 : 22)) * gridUnitScale;
        let radiusY = radiusX * 0.43;
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = palette.fill;
        ctx.strokeStyle = palette.edge;
        ctx.lineWidth = (enemy.isBoss ? 2.4 : 1.35) * pulse;
        ctx.globalAlpha = enemy.isBoss ? (0.24 + progress * 0.48) : (0.18 + progress * 0.28);
        ctx.beginPath();
        ctx.ellipse(entry.x, entry.y + 8, radiusX * (0.84 + progress * 0.16), radiusY, 0, 0, Math.PI * 2);
        if (enemy.isBoss) ctx.fill();
        ctx.stroke();
        if (enemy.isElite) {
            ctx.globalAlpha = 0.08 + progress * 0.18;
            ctx.setLineDash([3, 5]);
            ctx.beginPath();
            ctx.ellipse(entry.x, entry.y + 8, radiusX * 0.68, radiusY * 0.68, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        if (enemy.isBoss && ranged && playerPos) {
            let dx = playerPos.x - entry.x;
            let dy = (playerPos.y - 10) - (entry.y - 8);
            let length = Math.max(1, Math.hypot(dx, dy));
            let nx = -dy / length;
            let ny = dx / length;
            let halfWidth = (enemy.isBoss ? 7 : 4) * (0.7 + progress * 0.3);
            ctx.globalAlpha = 0.08 + progress * 0.22;
            ctx.beginPath();
            ctx.moveTo(entry.x + nx * halfWidth, entry.y - 8 + ny * halfWidth);
            ctx.lineTo(playerPos.x + nx * halfWidth, playerPos.y - 10 + ny * halfWidth);
            ctx.lineTo(playerPos.x - nx * halfWidth, playerPos.y - 10 - ny * halfWidth);
            ctx.lineTo(entry.x - nx * halfWidth, entry.y - 8 - ny * halfWidth);
            ctx.closePath();
            ctx.fill();
        }
        if (enemy.isBoss) {
            ctx.globalAlpha = 0.24 + progress * 0.38;
            for (let bossRay = 0; bossRay < 4; bossRay++) {
                let angle = bossRay * Math.PI / 2 - Math.PI / 2;
                let inner = radiusX * 0.72;
                let outer = radiusX * (0.95 + progress * 0.28);
                ctx.beginPath();
                ctx.moveTo(entry.x + Math.cos(angle) * inner, entry.y + 8 + Math.sin(angle) * inner * 0.43);
                ctx.lineTo(entry.x + Math.cos(angle) * outer, entry.y + 8 + Math.sin(angle) * outer * 0.43);
                ctx.stroke();
            }
            if (pattern && pattern.telegraphKind === 'ring' && playerPos) {
                let ringRadius = (30 + progress * 18) * gridUnitScale;
                let drawn = drawBossTelegraphDecal(ctx, 'ring', playerPos.x, playerPos.y + 5, ringRadius * 2.35, ringRadius * 1.68, now / 6200, progress, pulse, palette, 0.5);
                if (!drawn) {
                    ctx.globalAlpha = 0.25 + progress * 0.58;
                    ctx.lineWidth = 2.2 + progress * 1.4;
                    ctx.beginPath();
                    ctx.arc(playerPos.x, playerPos.y + 5, ringRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }
            } else if (pattern && pattern.telegraphKind === 'fan' && playerPos) {
                let baseAngle = Math.atan2(playerPos.y - entry.y, playerPos.x - entry.x);
                let length = (48 + progress * 26) * gridUnitScale;
                let drawn = drawBossTelegraphDecal(ctx, 'fan', entry.x, entry.y - 4, length * 1.55, length * 1.22, baseAngle + Math.PI / 2, progress, pulse, palette, 1);
                if (!drawn) {
                    ctx.globalAlpha = 0.26 + progress * 0.5;
                    ctx.lineWidth = 2 + progress * 1.4;
                    [-0.16, 0, 0.16].forEach(offset => {
                        let angle = baseAngle + offset;
                        ctx.beginPath();
                        ctx.moveTo(entry.x, entry.y - 4);
                        ctx.lineTo(entry.x + Math.cos(angle) * length, entry.y - 4 + Math.sin(angle) * length);
                        ctx.stroke();
                    });
                }
            } else if (pattern && pattern.telegraphKind === 'pulse') {
                let decalWidth = radiusX * (2.45 + progress * 0.75);
                let drawn = drawBossTelegraphDecal(ctx, 'pulse', entry.x, entry.y + 8, decalWidth, decalWidth * 0.58, -now / 8500, progress, pulse, palette, 0.5);
                if (!drawn) {
                    ctx.globalAlpha = 0.18 + progress * 0.42;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.ellipse(entry.x, entry.y + 8, radiusX * (1.15 + progress * 0.35), radiusY * (1.35 + progress * 0.25), 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            if (pattern && pattern.isSpecial && pattern.label) {
                let label = String(pattern.label);
                ctx.font = '700 11px "Noto Sans KR", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                let textWidth = Math.ceil(ctx.measureText(label).width);
                let labelX = entry.x;
                let labelY = entry.y - 102 * gridUnitScale;
                ctx.globalAlpha = 0.88;
                ctx.fillStyle = 'rgba(7, 10, 16, 0.82)';
                ctx.fillRect(labelX - textWidth / 2 - 6, labelY - 9, textWidth + 12, 18);
                ctx.globalAlpha = 0.98;
                ctx.fillStyle = palette.edge;
                ctx.fillText(label, labelX, labelY);
            }
        }
        ctx.restore();
    });
}

function drawBattlefieldPlayerHealthBar(ctx, playerPos, hpPct, ghostPct, esPct) {
    let width = 64;
    let x = Math.round(playerPos.x - width / 2);
    let y = Math.round(playerPos.y - 82);
    ctx.save();
    ctx.globalAlpha = 0.97;
    ctx.fillStyle = 'rgba(7, 10, 16, 0.9)';
    ctx.fillRect(x - 2, y - 2, width + 4, 12);
    ctx.fillStyle = 'rgba(36, 48, 62, 0.95)';
    ctx.fillRect(x, y, width, 8);
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
        let width = enemy.isBoss ? 72 : 46;
        let x = Math.round(entry.x - width / 2);
        let y = Math.round(entry.y - (enemy.isBoss ? 78 : 56));
        let targeted = targetIds.includes(enemy.id);
        ctx.save();
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = 'rgba(7, 10, 16, 0.88)';
        ctx.fillRect(x - 2, y - 2, width + 4, 10);
        ctx.fillStyle = 'rgba(42, 48, 58, 0.95)';
        ctx.fillRect(x, y, width, 6);
        let ghostPct = typeof updateEnemyHpDamageGhost === 'function' ? updateEnemyHpDamageGhost(enemy.id, pct * 100) / 100 : pct;
        if (ghostPct > pct + 0.002) {
            ctx.fillStyle = 'rgba(255, 138, 80, 0.58)';
            ctx.fillRect(x, y, Math.max(2, Math.round(width * ghostPct)), 6);
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
    });
}

function drawDamageImpactAccent(ctx, fx, t, enemyPosMap) {
    if (!fx || !['heavy', 'annihilate'].includes(fx.impactTier)) return;
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

// Phase-2 extracted battlefield canvas renderer block.
function renderBattlefield(forceWhenHidden) {
    const canvas = document.getElementById('battlefield-canvas');
    if (!canvas || (!forceWhenHidden && canvas.offsetParent === null)) return;
    if (!battleAssets.ready && !battleAssets.loading && !battleAssets.failed && window.__battleAssetAutoloadEnabled !== false) initBattleAssets();
    const expectedScale = clampNumber(window.devicePixelRatio || 1, 1, 2);
    const baseWidth = canvas.clientWidth || Math.round((canvas.width || 960) / expectedScale) || 960;
    const baseHeight = canvas.clientHeight || Math.round((canvas.height || 540) / expectedScale) || 540;
    const expectedWidth = Math.max(1, Math.round(baseWidth * expectedScale));
    const expectedHeight = Math.max(1, Math.round(baseHeight * expectedScale));
    if (canvas.width !== expectedWidth || canvas.height !== expectedHeight) resizeBattlefieldCanvas();
    const ctx = canvas.getContext('2d');
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
    if (typeof attackFxUpdate === 'function') attackFxUpdate(deltaMs);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const cameraShake = getBattleCameraShake(now);
    ctx.translate(cameraShake.x, cameraShake.y);

    let currentZone = getZone(game.currentZoneId);
    let zoneTheme = getBattleZoneTheme(currentZone);
    let gridProj = getBattleGridProjection(width, height);
    let backdropActive = drawBattleBackdrop(ctx, width, height, zoneTheme, now, currentZone, gridProj);
    let framePlayerStats = getCanvasPlayerStats();
    let currentTargets = getCanvasSkillTargets(framePlayerStats);
    let swingFx = null;
    let playerFlash = false;
    let playerDownActive = false;
    let flashingEnemyIds = new Set();
    for (let i = battleFx.length - 1; i >= 0; i--) {
        let fx = battleFx[i];
        if (!fx) continue;
        let age = now - fx.start;
        if (!swingFx && fx.type === 'playerSwing') swingFx = fx;
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
    let swingPower = swingFx ? Math.sin(((now - swingFx.start) / swingFx.duration) * Math.PI) : 0;
    let currentSkillVisual = getBattleSkillVisual(game.activeSkill, currentSkill);
    let desiredAdvancing = enemies.length === 0 && game.moveTimer <= 0 && game.runProgress < 100;
    if (battleVisualState.advanceDesired !== desiredAdvancing) {
        battleVisualState.advanceDesired = desiredAdvancing;
        battleVisualState.advanceChangedAt = now;
    }
    let advanceTarget = 0;
    if (desiredAdvancing) {
        let changedAt = Number.isFinite(battleVisualState.advanceChangedAt) ? battleVisualState.advanceChangedAt : now;
        advanceTarget = clampNumber((now - changedAt - 260) / 700, 0, 1);
    }
    battleVisualState.playerAdvanceBlend = approachNumber(battleVisualState.playerAdvanceBlend || 0, advanceTarget, desiredAdvancing ? 2.2 : 2.8, deltaSec);
    battleVisualState.playerAttackBlend = approachNumber(battleVisualState.playerAttackBlend || 0, swingFx ? 1 : 0, swingFx ? 4 : 3, deltaSec);
    battleVisualState.playerHurtBlend = approachNumber(battleVisualState.playerHurtBlend || 0, playerFlash ? 1 : 0, playerFlash ? 6.5 : 4.2, deltaSec);
    battleVisualState.playerDownBlend = approachNumber(battleVisualState.playerDownBlend || 0, playerDownActive ? 1 : 0, playerDownActive ? 7.5 : 4.8, deltaSec);
    let layout = getBattleLayout(enemies, width, height);
    let engagementBob = enemies.length > 0 ? 1 : 0.45;
    let advanceBlend = battleVisualState.playerAdvanceBlend || 0;
    let attackBlend = battleVisualState.playerAttackBlend || 0;
    let hurtBlend = battleVisualState.playerHurtBlend || 0;
    let downBlend = battleVisualState.playerDownBlend || 0;
    let playerCell = hasGridCell(game.gridPlayer) ? game.gridPlayer : COMBAT_GRID_CONFIG.playerSpawn;
    let playerCellPos = gridProj.cellToScreen(playerCell.gx, playerCell.gy);
    let targetPlayerPos = {
        x: playerCellPos.x,
        y: playerCellPos.y + downBlend * 0.6
    };
    if (!battleVisualState.playerPos) {
        battleVisualState.playerPos = { x: targetPlayerPos.x, y: targetPlayerPos.y };
    } else {
        battleVisualState.playerPos.x = approachNumber(battleVisualState.playerPos.x, targetPlayerPos.x, 20.0, deltaSec);
        battleVisualState.playerPos.y = approachNumber(battleVisualState.playerPos.y, targetPlayerPos.y, 20.0, deltaSec);
    }
    let playerPos = {
        x: battleVisualState.playerPos.x,
        y: battleVisualState.playerPos.y
    };
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
        let rawSeed = entry.enemy.variantSeed;
        if (!Number.isFinite(rawSeed)) rawSeed = entry.enemy.id;
        let seed = Number(rawSeed);
        if (!Number.isFinite(seed)) {
            let textSeed = String(rawSeed || 'enemy');
            seed = 0;
            for (let i = 0; i < textSeed.length; i++) seed = (seed * 31 + textSeed.charCodeAt(i)) % 100000;
        }
        let driftMul = entry.moving ? 0.12 : 1;
        let driftX = Math.sin((now / 240) + seed * 0.9) * (entry.enemy.isBoss ? 1.8 : 2.4) * driftMul;
        let driftY = Math.cos((now / 300) + seed * 1.2) * (entry.enemy.isBoss ? 1.1 : 1.4) * driftMul;
        return {
            enemy: entry.enemy,
            x: entry.x + driftX,
            y: entry.y + driftY
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

    // getPlayerStats()는 장비/패시브 전체를 재계산하는 무거운 함수다.
    // 한 프레임 안에서는 결과가 동일하므로 프레임당 1회만 계산해 재사용한다.
    if (swingFx && swingFx.id !== battleVisualState.lastAutoSwingId && now >= (battleVisualState.lastAutoSkillAt || 0)) {
        playSkillFromActiveGem(game.activeSkill || '기본 공격');
        battleVisualState.lastAutoSwingId = swingFx.id;
        const _atkInterval = Math.min(600, Math.max(120, (1 / Math.max(0.1, framePlayerStats.aspd)) * 100));
        battleVisualState.lastAutoSkillAt = now + _atkInterval;
    }
    if (swingFx && swingFx.projectile) {
        const viewportProjectileFxScale = Math.min(width / 960, height / 540);
        queueSkillGemProjectileLaunch(swingFx, currentTargets, playerPos, enemyPosMap, viewportProjectileFxScale);
    }
    updateSkillPlayback(now, playerPos, width, enemyPosMap);
    drawActiveSummons(ctx, playerPos, now, gridProj);
    let gridUnitScale = clampNumber(gridProj.tileW / 46, 0.62, 1.3);
    let playerFacingLeft = resolvePlayerFacingLeft(playerPos, targetPlayerPos, currentTargets, enemyPosMap);
    if (playerFacingLeft) {
        ctx.save();
        ctx.translate(playerPos.x * 2, 0);
        ctx.scale(-1, 1);
    }
    drawSkillWeaponLayer(ctx, playerPos, now, 'back');
    drawPlayerSprite(ctx, playerPos.x, playerPos.y, 2.15 * gridUnitScale, playerFlash, swingPower, currentSkillVisual, now, {
        advanceBlend: advanceBlend,
        attackBlend: attackBlend,
        attackProgress: swingFx ? clampNumber((now - swingFx.start) / Math.max(1, swingFx.duration), 0, 0.999) : 0,
        hurtBlend: hurtBlend,
        downBlend: downBlend
    });
    drawSkillWeaponLayer(ctx, playerPos, now, 'front');
    if (playerFacingLeft) ctx.restore();

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
                    damageRatio: fx.damageRatio || 0
                });
            }
            if (!fx.dot && fx.skillName) {
                const viewportSkillFxScale = Math.min(width / 960, height / 540);
                queueSkillGemVfx(fx, enemyPos, playerPos, enemyPosMap, now, viewportSkillFxScale);
            }
            if (!fx.dot && typeof attackFxSpawn === 'function') {
                const viewportFxScale = Math.min(width / 960, height / 540);
                attackFxSpawn(fx.element || 'phys', enemyPos.x, enemyPos.y - 6, getAttackFxSpawnOpts(fx, enemyPos.enemy, currentSkillVisual, viewportFxScale));
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
        } else if (fx.type === 'enemyEvade') {
            let enemyPos = enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId] || { x: width * 0.72, y: height * 0.58 };
            spawnDamageText({
                start: now,
                x: enemyPos.x,
                y: enemyPos.y - 30,
                value: fx.text || '회피!',
                miss: true,
                color: fx.color || '#9fb4c8'
            });
            handled = true;
        } else if (fx.type === 'statusText') {
            spawnDamageText({
                start: now,
                x: playerPos.x + 14,
                y: playerPos.y - 40,
                value: fx.text || '회피!',
                miss: true,
                color: fx.color || '#9fb4c8'
            });
            handled = true;
        } else {
            handled = true;
        }
        if (handled) battleVisualState.processedFxIds.add(fx.id);
    });
    cleanupBattleVisualState(now);
    (battleVisualState.projectiles || []).forEach(projectile => drawVisualProjectile(ctx, projectile, now));
    drawEnemyAttackTelegraphs(ctx, dynamicLayout, playerPos, now, gridUnitScale);

    dynamicLayout.forEach(entry => {
        let enemy = entry.enemy;
        let spawnDuration = enemy.isBoss ? 640 : (enemy.isElite ? 460 : 360);
        let age = enemy.spawnStamp ? clampNumber((now - enemy.spawnStamp) / spawnDuration, 0, 1) : 1;
        let easedAge = 1 - Math.pow(1 - age, 3);
        let spawnScale = (enemy.isBoss ? 0.46 : 0.68) + easedAge * (enemy.isBoss ? 0.54 : 0.32);
        if (enemy.isBoss) spawnScale += Math.sin(age * Math.PI) * 0.08;
        let hitFlash = flashingEnemyIds.has(enemy.id);
        ctx.save();
        ctx.globalAlpha = easedAge;
        let crowdScale = dynamicLayout.length >= 9 ? (enemy.isBoss ? 2.15 : (enemy.isElite ? 1.72 : 1.46)) : (dynamicLayout.length >= 6 ? (enemy.isBoss ? 2.3 : (enemy.isElite ? 1.9 : 1.62)) : (enemy.isBoss ? 2.55 : (enemy.isElite ? 2.2 : 1.95)));
        drawEnemySprite(ctx, enemy, entry.x, entry.y - (1 - easedAge) * (enemy.isBoss ? 28 : 18), crowdScale * gridUnitScale * spawnScale, hitFlash, now);
        ctx.restore();
    });

    let pendingGhostIds = new Set();
    battleFx.forEach(fx => {
        if (!fx || fx.type !== 'hit' || now >= fx.start || enemyPosMap[fx.enemyId] || pendingGhostIds.has(fx.enemyId)) return;
        let ghost = battleVisualState.enemyGhostPos[fx.enemyId];
        if (!ghost || !ghost.enemy) return;
        pendingGhostIds.add(fx.enemyId);
        drawEnemySprite(ctx, ghost.enemy, ghost.x, ghost.y, (ghost.enemy.isBoss ? 2.55 : (ghost.enemy.isElite ? 2.2 : 1.95)) * gridUnitScale, false, now);
    });

    // 반투명 스킬 이미지는 몬스터 위에 표시해 투사체 이동과 적중점을 읽기 쉽게 한다.
    // 생명력 바와 피해 숫자는 뒤에서 그려지므로 항상 스킬 이미지보다 위에 남는다.
    drawSkillGemVfxLayer(ctx, now);
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
    if (condCast && (condCast.expiresAt || 0) > Date.now()) {
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

    battleFx.forEach(fx => {
        if (now < fx.start) return;
        let t = clampNumber((now - fx.start) / fx.duration, 0, 1);
        let ghostEnemy = (fx.enemyId && !enemyPosMap[fx.enemyId]) ? battleVisualState.enemyGhostPos[fx.enemyId] : null;
        if (ghostEnemy && !enemyPosMap[fx.enemyId]) {
            enemyPosMap[fx.enemyId] = { enemy: ghostEnemy.enemy || { id: fx.enemyId, hp: 0, maxHp: 1 }, x: ghostEnemy.x, y: ghostEnemy.y };
        }
        if (fx.type === 'playerSwing') {
            drawBattleSwingFx(ctx, fx, t, playerPos);
        } else if (fx.type === 'hit') {
            drawBattleHitFx(ctx, fx, t, playerPos, enemyPosMap);
            drawDamageImpactAccent(ctx, fx, t, enemyPosMap);
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
            const dissolve = clampNumber((t - 0.04) / 0.96, 0, 1);
            const dissolveFade = Math.pow(1 - dissolve, 1.62);
            ctx.save();
            ctx.globalAlpha = dissolveFade * (isBossDeath ? 0.82 : (fx.elite ? 0.72 : 0.64));
            ctx.translate(enemy.x, enemy.y + dissolve * (isBossDeath ? 4 : 2));
            ctx.scale(1 - dissolve * 0.05, 1 - dissolve * 0.11);
            ctx.filter = `grayscale(${Math.floor(dissolve * 78)}%) saturate(${1 - dissolve * 0.62}) brightness(${1 + dissolve * 0.22})`;
            drawEnemySprite(ctx, deathEnemy, 0, 0, isBossDeath ? 2.65 : (fx.elite ? 2.1 : 1.9), false, now);
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
        } else if (fx.type === 'trialTrap') {
            ctx.save();
            ctx.globalAlpha = 0.24 * (1 - t);
            ctx.fillStyle = fx.color || '#ffd36b';
            ctx.fillRect(0, height * 0.58, width, 12);
            ctx.fillRect(width * 0.1, height * 0.2, width * 0.8, 4);
            ctx.strokeStyle = '#fff3c6';
            ctx.lineWidth = 2.5;
            for (let i = 0; i < 3; i++) {
                let x = width * (0.24 + i * 0.22);
                ctx.beginPath();
                ctx.moveTo(x, height * 0.24);
                ctx.lineTo(x - 18, height * 0.56);
                ctx.lineTo(x + 12, height * 0.56);
                ctx.stroke();
            }
            ctx.restore();
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
    else if (game.moveTimer > 0) caption = '다음 구간으로 이동 중...';
    else if (getCanvasCrowdProgressPaused()) caption = `적이 ${getCanvasCrowdPauseLimit()}기 이상 몰려 전진이 막혔습니다.`;
    else if (enemies.length > 0) caption = `${enemies.length}기와 교전 중`;
    else if ((game.encounterPlan || []).length > 0) caption = '다음 매복 지점을 탐색 중...';
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
            ? (fx.boss ? 7.8 : (fx.elite ? 2.5 : 0))
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
    if (enemy.isBoss) tags.push('보스');
    else if (enemy.isElite) tags.push('정예');
    tags.push(getElementLabel(enemy.ele));
    if (enemy.traitName) tags.push(enemy.traitName);
    if (enemy.patternMode && typeof getBossPatternModeLabel === 'function') {
        let patternLabel = getBossPatternModeLabel(enemy.patternMode);
        if (patternLabel) tags.push(`패턴: ${patternLabel}`);
        let nextPattern = enemy.nextPatternState || (typeof getBossPatternPreview === 'function' ? getBossPatternPreview(enemy) : null);
        if (nextPattern && nextPattern.isSpecial && nextPattern.label) tags.push(`다음: ${nextPattern.label}`);
    }
    if ((enemy.firstHitGuard || 0) > 0 && !enemy.firstHitConsumed) tags.push(`첫타보호 ${Math.floor((enemy.firstHitGuard || 0) * 100)}%`);
    if ((enemy.hitRateGuard || 0) > 0) tags.push(`연타경감 ${Math.floor((enemy.hitRateGuard || 0) * 100)}%`);
    if ((enemy.leechEffMul || 1) <= 0) tags.push('흡혈불가');
    else if ((enemy.leechEffMul || 1) < 1) tags.push(`흡혈저항 ${Math.floor((enemy.leechEffMul || 1) * 100)}%`);
    return Array.from(new Set(tags.filter(Boolean)));
}
function getEnemyShortLabel(enemy) {
    if (enemy.isBoss) return '보스';
    if (enemy.isElite) return '정예';
    if (enemy.ele === 'fire') return '화염';
    if (enemy.ele === 'cold') return '냉기';
    if (enemy.ele === 'light') return '번개';
    if (enemy.ele === 'chaos') return '공허';
    return '추종자';
}


const SUMMON_SPRITE_ORDER = ['서리늑대 소환', '불곰 소환', '벼락멧돼지 소환', '칼날까마귀 소환', '공허 유충 소환', '벌떼 소환', '수액 골렘 소환'];
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
    const normalizeName = String(name || '').replace(/\s+/g, ' ').trim();
    const index = Math.max(0, SUMMON_SPRITE_ORDER.findIndex(label => label === normalizeName));
    const safeIndex = Math.min(index, frames.length - 1);
    return frames[safeIndex];
}

// 캐릭터가 바라볼 좌우 방향을 정한다. 공격 대상이 왼쪽이면 왼쪽을 보고,
// 대상이 없으면 이동 방향을 따르며, 판단 근거가 없으면 직전 방향을 유지한다(기본 오른쪽).
function resolvePlayerFacingLeft(playerPos, targetPlayerPos, currentTargets, enemyPosMap) {
    let primary = currentTargets && currentTargets[0] ? currentTargets[0].enemy : null;
    let anchor = primary ? enemyPosMap[primary.id] : null;
    if (anchor) {
        battleVisualState.playerFacingLeft = anchor.x < playerPos.x - 0.5;
    } else {
        let dx = targetPlayerPos.x - playerPos.x;
        if (Math.abs(dx) > 0.8) battleVisualState.playerFacingLeft = dx < 0;
    }
    return !!battleVisualState.playerFacingLeft;
}

// 8x8 아이소메트릭 그리드 바닥. 유닛 점유 칸과 플레이어의 현재 공격 칸을 함께 표시한다.
function drawBattleGridFloor(ctx, proj, theme, skillTargets, skillAreaCells, backdropActive) {
    const size = COMBAT_GRID_CONFIG.size;
    const halfW = proj.tileW / 2;
    const halfH = proj.tileH / 2;
    const tilePath = (gx, gy) => {
        const c = proj.cellToScreen(gx, gy);
        ctx.beginPath();
        ctx.moveTo(c.x, c.y - halfH);
        ctx.lineTo(c.x + halfW, c.y);
        ctx.lineTo(c.x, c.y + halfH);
        ctx.lineTo(c.x - halfW, c.y);
        ctx.closePath();
    };
    const fillCell = (unit, fillStyle, strokeStyle, alpha) => {
        if (!hasGridCell(unit)) return;
        tilePath(unit.gx, unit.gy);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.globalAlpha = Math.min(0.95, alpha + 0.25);
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 2.4;
        ctx.stroke();
    };
    ctx.save();
    for (let gx = 0; gx < size; gx++) {
        for (let gy = 0; gy < size; gy++) {
            tilePath(gx, gy);
            // 배경 디오라마가 깔린 경우 바닥 아트를 가리지 않게 체커 칠 없이 선만 긋는다.
            if (!backdropActive) {
                ctx.globalAlpha = 0.4;
                ctx.fillStyle = (gx + gy) % 2 === 0 ? theme.pathA : theme.pathB;
                ctx.fill();
            }
            ctx.globalAlpha = backdropActive ? 0.3 : 0.62;
            ctx.strokeStyle = backdropActive ? 'rgba(214, 230, 246, 0.5)' : 'rgba(8, 12, 18, 0.6)';
            ctx.lineWidth = backdropActive ? 1 : 1.3;
            ctx.stroke();
        }
    }
    ctx.globalAlpha = backdropActive ? 0.24 : 0.4;
    tilePath(COMBAT_GRID_CONFIG.playerSpawn.gx, COMBAT_GRID_CONFIG.playerSpawn.gy);
    ctx.fillStyle = 'rgba(120, 202, 255, 0.4)';
    ctx.fill();
    tilePath(COMBAT_GRID_CONFIG.bossSpawn.gx, COMBAT_GRID_CONFIG.bossSpawn.gy);
    ctx.fillStyle = 'rgba(255, 92, 92, 0.4)';
    ctx.fill();
    (game.enemies || []).forEach(enemy => {
        if (enemy && enemy.hp > 0) fillCell(enemy, 'rgba(255, 87, 87, 0.28)', 'rgba(255, 140, 120, 0.8)', 0.34);
    });
    (game.summons || []).forEach(summon => {
        if (summon && summon.alive && (summon.hp || 0) > 0) fillCell(summon, 'rgba(126, 255, 173, 0.26)', 'rgba(154, 255, 192, 0.76)', 0.32);
    });
    (skillAreaCells || []).forEach(cell => fillCell(cell, 'rgba(124, 255, 214, 0.2)', 'rgba(124, 255, 214, 0.72)', 0.26));
    (skillTargets || []).forEach(hit => fillCell(hit && hit.enemy, 'rgba(255, 211, 91, 0.5)', 'rgba(255, 238, 153, 0.95)', 0.54));
    fillCell(game.gridPlayer, 'rgba(107, 190, 255, 0.5)', 'rgba(168, 226, 255, 0.98)', 0.56);
    ctx.restore();
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

function drawActiveSummons(ctx, playerPos, now, proj) {
    const summons = (game.summons || []).filter(s => s && s.alive && (s.hp || 0) > 0);
    if (summons.length <= 0) return;
    const image = battleAssets && battleAssets.images ? battleAssets.images.summon1 : null;
    const radius = 24 + Math.min(40, summons.length * 4);
    summons.forEach((summon, idx) => {
        // 그리드 유닛: 자기 칸에 그린다. 칸이 아직 없으면(스폰 직후) 플레이어 주변 궤도로 표시한다.
        const angle = (now / 1000) * 0.9 + (idx / Math.max(1, summons.length)) * Math.PI * 2;
        const cellPos = (proj && hasGridCell(summon)) ? proj.cellToScreen(summon.gx, summon.gy) : null;
        const x = cellPos ? cellPos.x : playerPos.x + Math.cos(angle) * radius;
        const y = cellPos ? cellPos.y : playerPos.y - 18 + Math.sin(angle) * 12;
        if (image) {
            const frame = getSummonSpriteFrameRectByName(summon.gemName, image);
            if (frame) {
                const size = summon.role === 'guard' ? 42 : 34;
                const drawW = size;
                const drawH = Math.max(18, Math.round(size * (frame.sh / Math.max(1, frame.sw))));
                ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, Math.round(x - drawW / 2), Math.round(y - drawH + 3), drawW, drawH);
                return;
            }
        }
        ctx.save();
        ctx.fillStyle = summon.role === 'guard' ? 'rgba(132, 205, 167, 0.8)' : 'rgba(159, 212, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(x, y, summon.role === 'guard' ? 8 : 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}


Object.assign(window, { renderBattlefield });
