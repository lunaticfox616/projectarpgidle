// Phase-2 extracted battlefield canvas renderer block.
function renderBattlefield() {
    const canvas = document.getElementById('battlefield-canvas');
    if (!canvas || canvas.offsetParent === null) return;
    if (!battleAssets.ready && !battleAssets.loading && !battleAssets.failed) initBattleAssets();
    const expectedScale = clampNumber(window.devicePixelRatio || 1, 1, 2);
    const expectedWidth = Math.max(1, Math.round((canvas.clientWidth || 1) * expectedScale));
    const expectedHeight = Math.max(1, Math.round((canvas.clientHeight || 1) * expectedScale));
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
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    let currentZone = getZone(game.currentZoneId);
    let zoneTheme = getBattleZoneTheme(currentZone);
    drawBattleBackdrop(ctx, width, height, zoneTheme, now, currentZone);
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
    let swingFx = battleFx.filter(fx => fx.type === 'playerSwing').slice(-1)[0];
    let swingPower = swingFx ? Math.sin(((now - swingFx.start) / swingFx.duration) * Math.PI) : 0;
    let playerFlash = battleFx.some(fx => fx.type === 'playerHit' && now - fx.start <= fx.duration);
    let playerDownActive = battleFx.some(fx => fx.type === 'playerDown' && now - fx.start <= fx.duration);
    let currentSkill = SKILL_DB[game.activeSkill] || SKILL_DB['기본 공격'];
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
    let attackInset = 84;
    let targetPlayerPos = {
        x: Math.max(width * 0.2, attackInset),
        y: height * 0.72 + downBlend * 0.6
    };
    if (!battleVisualState.playerPos) {
        battleVisualState.playerPos = { x: targetPlayerPos.x, y: targetPlayerPos.y };
    } else {
        battleVisualState.playerPos.x = approachNumber(battleVisualState.playerPos.x, targetPlayerPos.x, 2.6, deltaSec);
        battleVisualState.playerPos.y = approachNumber(battleVisualState.playerPos.y, targetPlayerPos.y, 2.6, deltaSec);
    }
    let playerPos = {
        x: battleVisualState.playerPos.x,
        y: battleVisualState.playerPos.y
    };
    let dynamicLayout = layout.map(entry => {
        let seed = entry.enemy.variantSeed || entry.enemy.id || 1;
        let driftX = Math.sin((now / 240) + seed * 0.9) * (entry.enemy.isBoss ? 1.8 : 2.4);
        let driftY = Math.cos((now / 300) + seed * 1.2) * (entry.enemy.isBoss ? 1.1 : 1.4);
        return {
            enemy: entry.enemy,
            x: entry.x + driftX,
            y: entry.y + driftY
        };
    });
    let enemyPosMap = {};
    dynamicLayout.forEach(entry => {
        enemyPosMap[entry.enemy.id] = entry;
        battleVisualState.enemyGhostPos[entry.enemy.id] = { x: entry.x, y: entry.y, stamp: now };
    });

    if (swingFx && swingFx.id !== battleVisualState.lastAutoSwingId && now >= (battleVisualState.lastAutoSkillAt || 0)) {
        playSkillFromActiveGem(game.activeSkill || '기본 공격');
        battleVisualState.lastAutoSwingId = swingFx.id;
        const _atkInterval = Math.min(600, Math.max(120, (1 / Math.max(0.1, getPlayerStats().aspd)) * 100));
        battleVisualState.lastAutoSkillAt = now + _atkInterval;
    }
    updateSkillPlayback(now, playerPos, width, enemyPosMap);
    drawSkillWeaponLayer(ctx, playerPos, now, 'back');
    drawPlayerSprite(ctx, playerPos.x, playerPos.y, 2.15, playerFlash, swingPower, currentSkillVisual, now, {
        advanceBlend: advanceBlend,
        attackBlend: attackBlend,
        attackProgress: swingFx ? clampNumber((now - swingFx.start) / Math.max(1, swingFx.duration), 0, 0.999) : 0,
        hurtBlend: hurtBlend,
        downBlend: downBlend
    });
    drawSkillWeaponLayer(ctx, playerPos, now, 'front');

    battleFx.forEach(fx => {
        if (battleVisualState.processedFxIds.has(fx.id)) return;
        let handled = false;
        if (fx.type === 'hit') {
            let enemyPos = enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId] || { x: width * 0.72, y: height * 0.58 };
            if (typeof fx.damage === 'number') {
                spawnDamageText({
                    x: enemyPos.x,
                    y: enemyPos.y - 30,
                    value: fx.damage,
                    crit: !!fx.crit
                });
            }
            handled = true;
        } else if (fx.type === 'playerHit') {
            let enemyPos = enemyPosMap[fx.enemyId] || battleVisualState.enemyGhostPos[fx.enemyId];
            if (typeof fx.damage === 'number') {
                spawnDamageText({
                    x: playerPos.x + 14,
                    y: playerPos.y - 36,
                    value: fx.damage,
                    enemyHit: true
                });
            }
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
        let age = enemy.spawnStamp ? clampNumber((now - enemy.spawnStamp) / 260, 0, 1) : 1;
        let hitFlash = battleFx.some(fx => fx.enemyId === enemy.id && (fx.type === 'hit' || fx.type === 'enemyDeath') && now - fx.start <= fx.duration * 0.45);
        ctx.save();
        ctx.globalAlpha = age;
        let crowdScale = dynamicLayout.length >= 9 ? (enemy.isBoss ? 2.15 : (enemy.isElite ? 1.72 : 1.46)) : (dynamicLayout.length >= 6 ? (enemy.isBoss ? 2.3 : (enemy.isElite ? 1.9 : 1.62)) : (enemy.isBoss ? 2.55 : (enemy.isElite ? 2.2 : 1.95)));
        drawEnemySprite(ctx, enemy, entry.x, entry.y, crowdScale, hitFlash, now);
        ctx.restore();
    });

    let currentTargets = getSkillTargets(getPlayerStats()).map(hit => hit.enemy && hit.enemy.id).filter(Boolean);
    dynamicLayout.forEach(entry => {
        let enemy = entry.enemy;
        let pct = clampNumber(enemy.hp / enemy.maxHp, 0, 1);
        let barWidth = enemy.isBoss ? 72 : 46;
        let barX = Math.round(entry.x - barWidth / 2);
        let barY = Math.round(entry.y - (enemy.isBoss ? 64 : 46));
        ctx.save();
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = 'rgba(7, 10, 16, 0.88)';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, 10);
        ctx.fillStyle = 'rgba(42, 48, 58, 0.95)';
        ctx.fillRect(barX, barY, barWidth, 6);
        ctx.fillStyle = currentTargets.includes(enemy.id) ? '#f1c40f' : '#e94f64';
        ctx.fillRect(barX, barY, Math.max(2, Math.round(barWidth * pct)), 6);
        ctx.strokeStyle = currentTargets.includes(enemy.id) ? 'rgba(255, 224, 130, 0.95)' : 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 0.5, barY - 0.5, barWidth + 1, 7);
        ctx.restore();
    });

    battleFx.forEach(fx => {
        let t = clampNumber((now - fx.start) / fx.duration, 0, 1);
        let ghostEnemy = (fx.enemyId && !enemyPosMap[fx.enemyId]) ? battleVisualState.enemyGhostPos[fx.enemyId] : null;
        if (ghostEnemy && !enemyPosMap[fx.enemyId]) {
            enemyPosMap[fx.enemyId] = { enemy: { id: fx.enemyId, hp: 0, maxHp: 1 }, x: ghostEnemy.x, y: ghostEnemy.y };
        }
        if (fx.type === 'playerSwing') {
            drawBattleSwingFx(ctx, fx, t, playerPos);
        } else if (fx.type === 'hit') {
            drawBattleHitFx(ctx, fx, t, playerPos, enemyPosMap);
        } else if (fx.type === 'playerHit') {
            return;
        } else if (fx.type === 'enemySpawn') {
            let enemy = enemyPosMap[fx.enemyId];
            if (!enemy) return;
            ctx.save();
            ctx.globalAlpha = (1 - t) * (fx.boss ? 0.58 : 0.42);
            ctx.strokeStyle = fx.color || '#9ed6ff';
            ctx.lineWidth = fx.boss ? 4 : 3;
            ctx.beginPath();
            ctx.arc(enemy.x, enemy.y - 4, (fx.boss ? 18 : 11) + t * (fx.boss ? 26 : 18), 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = fx.color || '#9ed6ff';
            ctx.globalAlpha = (1 - t) * 0.18;
            ctx.beginPath();
            ctx.ellipse(enemy.x, enemy.y + 8, fx.boss ? 28 : 18, fx.boss ? 12 : 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (fx.type === 'enemyDeath') {
            let enemy = enemyPosMap[fx.enemyId];
            if (!enemy) return;
            drawBattleImpactBurst(ctx, enemy.x, enemy.y - 6, fx.color || '#ffb0b0', '#ffffff', t);
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
            let endX = width - 26;
            let endY = 18;
            let x = startX + (endX - startX) * t;
            let y = startY + (endY - startY) * t - Math.sin(t * Math.PI) * 18;
            ctx.save();
            ctx.globalAlpha = 1 - t * 0.2;
            ctx.fillStyle = fx.color || '#9ed6ff';
            ctx.beginPath();
            ctx.arc(x, y, 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (fx.type === 'lootCelebration') {
            let enemy = enemyPosMap[fx.enemyId];
            let cx = enemy ? enemy.x : width * 0.72;
            let cy = enemy ? enemy.y - 10 : height * 0.62;
            ctx.save();
            ctx.globalAlpha = 0.45 * (1 - t);
            ctx.strokeStyle = fx.color || '#ffcf6b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 16 + t * 28, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        } else if (fx.type === 'spawnWave') {
            ctx.save();
            ctx.globalAlpha = 0.2 * (1 - t);
            ctx.fillStyle = fx.boss ? '#c993ff' : '#8fd0ff';
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        } else if (fx.type === 'playerDown') {
            ctx.save();
            ctx.globalAlpha = 0.25 * (1 - t);
            ctx.fillStyle = fx.color || '#ff6b6b';
            ctx.fillRect(0, 0, width, height);
            ctx.restore();
        }
    });
    drawDamageTexts(ctx, now);

    let caption = '전장을 스캔 중...';
    if (battleAssets.failed && !battleAssets.ready) caption = '전장 에셋 일부 로드 실패 (기본 렌더링으로 전투 진행)';
    if (game.moveTimer > 0) caption = game.isTownReturning ? '마을로 귀환 중...' : '다음 구간으로 이동 중...';
    else if (isCrowdProgressPaused()) caption = `적이 ${ENEMY_CROWD_PAUSE_LIMIT}기 이상 몰려 전진이 막혔습니다.`;
    else if (enemies.length > 0) caption = `${enemies.length}기와 교전 중`;
    else if ((game.encounterPlan || []).length > 0) caption = '다음 매복 지점을 탐색 중...';
    document.getElementById('ui-battlefield-caption').innerText = caption;
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


Object.assign(window, { renderBattlefield });
