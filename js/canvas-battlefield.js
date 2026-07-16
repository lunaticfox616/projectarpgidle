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
    const opts = {
        crit: !!fx.crit || fx.impactTier === 'heavy' || fx.impactTier === 'annihilate',
        variant: (skillVisual && skillVisual.variant) || 'melee'
    };
    const element = String(fx.element || 'phys').toLowerCase();
    const screenMul = clampNumber(Number(viewportScale) || 1, 0.68, 1.18);
    if (element === 'phys' || element === 'physical') opts.scale = 0.68 * screenMul;
    else if (enemy) opts.scale = (enemy.isBoss ? 0.82 : (enemy.isElite ? 0.6 : 0.44)) * screenMul;
    else opts.scale = 0.4 * screenMul;
    if (fx.impactTier === 'heavy') opts.scale *= 1.22;
    else if (fx.impactTier === 'annihilate') opts.scale *= 1.52;
    return opts;
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
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = annihilate ? '#fff0a8' : (fx.color || '#ffd36b');
    ctx.lineWidth = annihilate ? 4.5 : 3;
    ctx.globalAlpha = fade * (annihilate ? 0.92 : 0.7);
    let rings = annihilate ? 4 : 2;
    for (let index = 0; index < rings; index++) {
        ctx.beginPath();
        ctx.arc(cx, cy, 12 + index * 7 + t * (annihilate ? 72 : 43), 0, Math.PI * 2);
        ctx.stroke();
    }
    let rays = annihilate ? 12 : 6;
    for (let index = 0; index < rays; index++) {
        let angle = index * Math.PI * 2 / rays + t * 0.35;
        let inner = 18 + t * 24;
        let outer = inner + (annihilate ? 42 : 24) * fade;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
        ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
        ctx.stroke();
    }
    if (annihilate) {
        let glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 92 * (0.35 + t));
        glow.addColorStop(0, `rgba(255,244,196,${0.38 * fade})`);
        glow.addColorStop(0.35, `rgba(255,112,42,${0.2 * fade})`);
        glow.addColorStop(1, 'rgba(255,62,20,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - 110, cy - 110, 220, 220);
    }
    ctx.restore();
}

function drawLevelUpFx(ctx, fx, t, playerPos) {
    let fade = t < 0.68 ? 1 : (1 - t) / 0.32;
    let radius = 22 + t * 76;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(0, fade);
    ctx.strokeStyle = '#ffe59a';
    ctx.lineWidth = 4 * (1 - t) + 1.5;
    for (let ring = 0; ring < 3; ring++) {
        ctx.beginPath();
        ctx.arc(playerPos.x, playerPos.y - 15, radius + ring * 10, 0, Math.PI * 2);
        ctx.stroke();
    }
    for (let ray = 0; ray < 12; ray++) {
        let angle = ray * Math.PI / 6 - Math.PI / 2;
        let inner = 22 + t * 18;
        let outer = inner + 34 * (1 - t);
        ctx.beginPath();
        ctx.moveTo(playerPos.x + Math.cos(angle) * inner, playerPos.y - 15 + Math.sin(angle) * inner);
        ctx.lineTo(playerPos.x + Math.cos(angle) * outer, playerPos.y - 15 + Math.sin(angle) * outer);
        ctx.stroke();
    }
    ctx.font = '900 17px "Malgun Gothic", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(25,9,0,.9)';
    ctx.strokeText(`LEVEL ${fx.level || ''} UP`, playerPos.x, playerPos.y - 70 - t * 18);
    ctx.fillStyle = '#fff2b4';
    ctx.fillText(`LEVEL ${fx.level || ''} UP`, playerPos.x, playerPos.y - 70 - t * 18);
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
    const now = performance.now();
    const deltaMs = battleVisualState.lastNow > 0 ? clampNumber(now - battleVisualState.lastNow, 16, 50) : 16;
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
            let enemyPos = enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId] || { x: width * 0.72, y: height * 0.58 };
            if (typeof fx.damage === 'number') {
                spawnDamageText({
                    x: enemyPos.x,
                    y: enemyPos.y - 30,
                    value: fx.damage,
                    crit: !!fx.crit,
                    dot: !!fx.dot,
                    dotType: fx.element || '',
                    impactTier: fx.impactTier || 'normal',
                    damageRatio: fx.damageRatio || 0
                });
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
                x: enemyPos.x,
                y: enemyPos.y - 30,
                value: fx.text || '회피!',
                miss: true,
                color: fx.color || '#9fb4c8'
            });
            handled = true;
        } else if (fx.type === 'statusText') {
            spawnDamageText({
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
    let pBarWidth = 64;
    let pBarX = Math.round(playerPos.x - pBarWidth / 2);
    let pBarY = Math.round(playerPos.y - 82);
    ctx.save();
    ctx.globalAlpha = 0.97;
    ctx.fillStyle = 'rgba(7, 10, 16, 0.9)';
    ctx.fillRect(pBarX - 2, pBarY - 2, pBarWidth + 4, 12);
    ctx.fillStyle = 'rgba(36, 48, 62, 0.95)';
    ctx.fillRect(pBarX, pBarY, pBarWidth, 8);
    if (playerHpGhostPct > playerHpPct + 0.003) {
        ctx.fillStyle = 'rgba(255, 126, 76, 0.58)';
        ctx.fillRect(pBarX, pBarY, Math.max(1, Math.round(pBarWidth * playerHpGhostPct)), 8);
    }
    ctx.fillStyle = '#20bf6b';
    ctx.fillRect(pBarX, pBarY, Math.max(2, Math.round(pBarWidth * playerHpPct)), 8);
    if (playerEsPct > 0) {
        ctx.fillStyle = 'rgba(75,123,236,0.85)';
        let esW = Math.max(1, Math.round(pBarWidth * playerEsPct));
        ctx.fillRect(pBarX, pBarY, esW, 8);
    }
    ctx.strokeStyle = 'rgba(200, 232, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pBarX - 0.5, pBarY - 0.5, pBarWidth + 1, 9);
    ctx.restore();

    let condCast = game.lastConditionGemCast;
    if (condCast && (condCast.expiresAt || 0) > Date.now()) {
        let pulse = 0.6 + Math.sin(now / 80) * 0.4;
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
    dynamicLayout.forEach(entry => {
        let enemy = entry.enemy;
        let pct = clampNumber(enemy.hp / enemy.maxHp, 0, 1);
        let barWidth = enemy.isBoss ? 72 : 46;
        let barX = Math.round(entry.x - barWidth / 2);
        let barY = Math.round(entry.y - (enemy.isBoss ? 78 : 56));
        ctx.save();
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = 'rgba(7, 10, 16, 0.88)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, 10);
        ctx.fillStyle = 'rgba(42, 48, 58, 0.95)';
        ctx.fillRect(barX, barY, barWidth, 6);
        let ghostPct = typeof updateEnemyHpDamageGhost === 'function' ? updateEnemyHpDamageGhost(enemy.id, pct * 100) / 100 : pct;
        if (ghostPct > pct + 0.002) {
            ctx.fillStyle = 'rgba(255, 138, 80, 0.58)';
            ctx.fillRect(barX, barY, Math.max(2, Math.round(barWidth * ghostPct)), 6);
        }
        ctx.fillStyle = currentTargets.includes(enemy.id) ? '#f1c40f' : '#e94f64';
        ctx.fillRect(barX, barY, Math.max(2, Math.round(barWidth * pct)), 6);
        let esPct = (enemy.maxEnergyShield || 0) > 0 ? clampNumber((enemy.energyShield || 0) / Math.max(1, enemy.maxEnergyShield), 0, 1) : 0;
        if (esPct > 0) {
            ctx.fillStyle = 'rgba(92, 184, 255, 0.92)';
            ctx.fillRect(barX, barY - 4, Math.max(2, Math.round(barWidth * esPct)), 3);
        }
        ctx.strokeStyle = currentTargets.includes(enemy.id) ? 'rgba(255, 224, 130, 0.95)' : 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 0.5, barY - 0.5, barWidth + 1, 7);
        ctx.restore();
    });

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
            ctx.save();
            ctx.globalAlpha = Math.pow(1 - t, 1.4) * (isBossDeath ? 0.92 : 0.75);
            ctx.translate(enemy.x, enemy.y - t * (isBossDeath ? 24 : 14));
            ctx.rotate((isBossDeath ? -0.12 : 0.16) * t);
            drawEnemySprite(ctx, deathEnemy, 0, 0, (isBossDeath ? 2.65 : (fx.elite ? 2.1 : 1.9)) * (1 + t * 0.16), true, now);
            ctx.restore();
            drawBattleImpactBurst(ctx, enemy.x, enemy.y - 6, fx.color || '#ffb0b0', '#ffffff', t);
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
        let duration = fx.impactTier === 'annihilate' ? 260 : (fx.impactTier === 'heavy' ? 210 : (fx.crit ? 180 : 120));
        let age = now - fx.start;
        if (age < 0 || age > duration) return;
        let hitStrength = fx.impactTier === 'annihilate' ? 10.5 : (fx.impactTier === 'heavy' ? 6.6 : (fx.crit ? 4.1 : 1.8));
        let strength = fx.type === 'enemyDeath' ? (fx.boss ? 8.4 : 4.8) : (fx.type === 'enemySpawn' ? (fx.boss ? 3.4 : 0) : hitStrength);
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
