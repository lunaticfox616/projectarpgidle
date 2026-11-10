// 전투 틱: 조건 효과, 이동과 멈춤, 공격 순서(coreLoop) (2026-11-10에 js/combat.js에서 그대로 옮겼다. js/combat.js 뒤에 옮기기 전과 같은 순서로 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
/** The tick's conditions on the hero's stats: condition debuffs and hexes, casts and channels, pending hits, talisman condition
 * effects and the cosmos debuffs, then ailments. */
function applyTickConditions(pStats) {
    if (pStats.uniqueClosedEyes) {
        game.enemyConditionDebuffs = {};
    } else {
        expireConditionEffects(getCombatTime()); runReturnRules(pStats); talismanCombat.applyHexes(pStats, getCombatTime());
    }
    advanceSkillGemCasts(pStats);
    updateCombatChannelRuntime(getCombatTime());
    processPendingSkillStageHits();
    processPendingSlamEchoHits();
    ascendancyNodeRules.tick(pStats, getCombatTime());
    processTalentInquisitorMarks();
    // 부적 조건 효과와 우주계 약화가 먼저: 이번 틱 지속 피해가 이독제독, 조건부 저항과 피해 감소, 정화를 읽는다(2026-11-07 리뷰).
    const activeConditionEffects = talismanCombat.effects(pStats);
    applyConditionPhysicalReductionEffects(pStats, activeConditionEffects);
    activeConditionEffects.forEach(({ delta }) => applyConditionDelta(pStats, delta));
    applyCosmosPlayerDebuffsToStats(pStats);
    tickAilments(pStats, 0.1);
    applyPlayerAilmentsToTick(pStats);
}

/** Chill slows the swing; the strongest shock raises the damage the hero takes. */
function applyPlayerAilmentsToTick(pStats) {
    const ailmentMap = {};
    let activePlayerShock = null;
    (game.playerAilments || []).forEach(ail => {
        ailmentMap[ail.type] = Math.max(ailmentMap[ail.type] || 0, ail.time || 0);
        if (isStrongerShock(ail, activePlayerShock)) activePlayerShock = ail;
    });
    if (ailmentMap.chill) pStats.aspd *= 1 - 0.32 * (1 - clampNumber(pStats.chillEffectReducePct || 0, 0, 100) / 100);
    pStats.playerShockTakenDamageIncreasePct = activePlayerShock ? getPlayerShockTakenDamageIncreasePct(pStats, activePlayerShock.power) : 0;
}

/** One talisman condition effect's delta on the tick's stats, in its fixed order (damage first, the element bonuses after it). */
function applyConditionDelta(pStats, delta) {
    applyConditionOffence(pStats, delta);
    applyConditionDefence(pStats, delta);
    applyConditionElement(pStats, delta);
    applyConditionFlags(pStats, delta);
    applyConditionCleanse(pStats, delta);
}

function applyConditionOffence(pStats, delta) {
    if (delta.pctDmg) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta.pctDmg / 100));
    if (delta.aspd) pStats.aspd *= (1 + delta.aspd / 100);
    for (const key of ['regen', 'crit', 'critDmg', 'resPen']) if (delta[key]) pStats[key] += delta[key];
    if (delta.targetAny) pStats.sSkill.targets = Math.min(12, (pStats.sSkill.targets || 1) + delta.targetAny);
    for (const key of ['leech', 'move']) if (delta[key]) pStats[key] += delta[key];
}

function applyConditionDefence(pStats, delta) {
    for (const key of ['resAll', 'maxResAll']) {
        if (!delta[key]) continue;
        pStats.resF += delta[key];
        pStats.resC += delta[key];
        pStats.resL += delta[key];
    }
    if (delta.resChaos) pStats.resChaos += delta.resChaos;
    if (delta.energyShieldRegen) pStats.energyShieldRegenRate = Math.max(0, (pStats.energyShieldRegenRate || 0) + delta.energyShieldRegen);
}

function applyConditionElement(pStats, delta) {
    for (const [key, ele] of CONDITION_ELEMENT_BONUS) if (delta[key] && (pStats.sSkill.ele === ele)) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta[key]));
    if (delta.energyShieldRechargeDelayDelta) pStats.energyShieldRechargeDelay = Math.max(0, (pStats.energyShieldRechargeDelay || 3) + delta.energyShieldRechargeDelayDelta);
}

function applyConditionFlags(pStats, delta) {
    for (const key of CONDITION_FLAG_KEYS) if (delta[key]) pStats[key] = true;
    if (delta.delayedRegenFromTakenDamage) pStats.delayedRegenFromTakenDamage = Math.max(pStats.delayedRegenFromTakenDamage || 0, delta.delayedRegenFromTakenDamage);
    for (const key of CONDITION_IMMUNITIES) if (delta[key]) pStats[key] = true;
}

/** The ailments a condition cleanses end now (the passive cycle records each end). */
function applyConditionCleanse(pStats, delta) {
    const types = Object.entries(CONDITION_CLEANSES).filter(([key]) => delta[key]).map(([, type]) => type);
    if (!types.length) return;
    game.playerAilments = (game.playerAilments || []).filter(ail => {
        if (!ail) return false;
        if (!types.includes(ail.type)) return true;
        if (typeof recordPassiveCycleAilmentEnd === 'function') recordPassiveCycleAilmentEnd(ail.type, pStats.cycle, getCombatTime());
        return false;
    });
}

/** Whether the tick stops before any fighting: the hero fell, the woodsman's entrance finishes, a halted fight still walks, or a
 * halted fight stays halted (true = stop). */
function stopTickBeforeCombat(pStats) {
    sanitizeRunTimers();
    if ((Number(game.playerHp) || 0) <= 0) {
        handlePlayerDefeat(getZone(game.currentZoneId) || getZone(0), pStats, "☠️ 치명상을 입어 쓰러졌습니다.", { fatalElement: 'other', sourceName: '치명상' });
        return true;
    }
    if (game.woodsmanEntrancePending && game.moveTimer <= 0) {
        finishWoodsmanEntrance();
        return true;
    }
    return stopHaltedTick();
}

function sanitizeRunTimers() {
    if (!Number.isFinite(game.runProgress) || game.runProgress < 0) game.runProgress = 0;
    if (!Number.isFinite(game.moveTimer)) game.moveTimer = 0;
}

/** A halted fight: it still walks (true), stays halted (true) or resumes (false). */
function stopHaltedTick() {
    if (!game.combatHalted) return false;
    if (game.moveTimer > 0) {
        finishHaltedTravel();
        return true;
    }
    return !resumeHaltedCombat();
}

function finishHaltedTravel() {
    game.moveTimer -= 0.1;
    if (game.moveTimer > 0) return;
    markPlayerMovementCompleted();
    if (!finishWoodsmanEntrance()) startEncounterRun();
}

/** A halted fight resumes unless something still holds it: an active beehive expedition (stale beehive flags from older saves could
 * keep combatHalted forever on normal zones, so only an active one blocks), a ticket boss fight, or a stop the player chose. true
 * when it resumed. */
function resumeHaltedCombat() {
    const beehive = game.beehive || {};
    const beehiveLocked = typeof isBeehiveRunLockedForMapTravel === 'function'
        ? isBeehiveRunLockedForMapTravel()
        : (!!beehive.inRun && game.currentZoneId === 'beehive_run');
    const beehivePause = !!(beehiveLocked && game.currentZoneId === 'beehive_run' && !beehive.awaitingClear);
    if (beehivePause || game.inTicketBossFight || isCombatProgressStopped()) return false;
    game.combatHalted = false;
    return true;
}

function isCombatProgressStopped(zone = getZone(game.currentZoneId)) {
    const settings = game.settings || {};
    return settings.mapCompleteAction === 'stop' || settings.townReturnAction === 'stop'
        || !!game.pendingLoopDecision || !!game.pendingLoopReady || isSkyTowerAtRewardLimit(zone);
}

/** The tick's recovery: life regen (under a bloom trial's suppression), act rest, the delayed guard heal, leech, recoup, and the
 * energy shield. */
function recoverPlayerTick(pStats) {
    const recoveryHpCap = getPlayerRecoveryHpCap(pStats);
    if (game.playerHp > 0 && game.playerHp < recoveryHpCap) {
        const bloomRegenMul = Math.max(0.05, 1 - Math.max(0, Math.min(0.95, game.bloomTrialRegenSuppress || 0)));
        game.playerHp = Math.min(recoveryHpCap, game.playerHp + (pStats.maxHp * (pStats.regen / 100)) * 0.1 * bloomRegenMul);
    }
    applyActRestRecovery(pStats, recoveryHpCap);
    if ((game.delayedGuardHealPool || 0) > 0) {
        const tickHeal = Math.max(0, (game.delayedGuardHealPool / 4) * 0.1);
        game.playerHp = Math.min(recoveryHpCap, game.playerHp + tickHeal);
        game.delayedGuardHealPool = Math.max(0, game.delayedGuardHealPool - tickHeal);
    }
    tickPlayerLeech(pStats, 0.1);
    tickPlayerRecoup(pStats, 0.1);
    rechargeEnergyShieldTick(pStats);
}

function rechargeEnergyShieldTick(pStats) {
    const cap = getPlayerEnergyShieldRecoveryCap(pStats);
    sanitizeEnergyShieldTick(pStats, cap);
    if ((pStats.energyShield || 0) > 0 && game.playerEnergyShield < cap) refillEnergyShieldTick(pStats, cap);
}

function sanitizeEnergyShieldTick(pStats, cap) {
    if (!Number.isFinite(game.playerEnergyShield)) game.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    game.playerEnergyShield = Math.max(0, Math.min(game.playerEnergyShield, cap));
    if (!Number.isFinite(game.playerEsLastHitAt)) game.playerEsLastHitAt = 0;
}

/** cr5 turns life regen into shield, the crusader window adds 25% a second, and the shield's own recharge when it runs now. */
function refillEnergyShieldTick(pStats, cap) {
    const add = perSec => { game.playerEnergyShield = Math.min(cap, game.playerEnergyShield + perSec * 0.1); };
    if (hasKeystone('cr5')) add((pStats.maxHp || 0) * ((pStats.regen || 0) / 100));
    if ((game.crusaderEsRegenUntil || 0) > getCombatTime()) add((pStats.energyShield || 0) * 0.25);
    if (energyShieldRechargesNow(pStats)) add((pStats.energyShield || 0) * ((pStats.energyShieldRegenRate || 12.5) / 100));
}

/** Whether the energy shield refills this tick: no interruption (e3, a broken-shield unique window), moving with no delay, or the
 * recharge delay passed since the last hit. */
function energyShieldRechargesNow(pStats) {
    const sinceHit = (getCombatTime() - (game.playerEsLastHitAt || 0)) / 1000;
    const noInterruptEsRegen = (hasKeystone('e3')) || uniqueShieldWindowOpen(pStats);
    const allowRechargeWhileMoving = (game.moveTimer || 0) > 0 && (pStats.energyShieldRechargeDelay || 0) <= 0;
    return Boolean(noInterruptEsRegen || allowRechargeWhileMoving || sinceHit >= (pStats.energyShieldRechargeDelay || 3));
}

/** The hero walks (or the woodsman's entrance waits): the tick only moves. true when it did. */
function advanceTravelTick() {
    if (game.moveTimer > 0) {
        game.moveTimer -= 0.1;
        if (game.moveTimer <= 0) finishTravelMove();
        return true;
    }
    if (!game.woodsmanEntrancePending) return false;
    finishWoodsmanEntrance();
    return true;
}

function finishTravelMove() {
    markPlayerMovementCompleted();
    if (game.isTownReturning) {
        game.isTownReturning = false;
        if (finishTownReturnAction()) return;
    }
    if (!finishWoodsmanEntrance()) startEncounterRun();
}

/** Every 2 s the per-monster debuff maps lose monsters that are gone. */
function pruneEnemyRuntimeOnSchedule() {
    const now = getCombatTime();
    game._nextEnemyRuntimePruneAt = Number.isFinite(game._nextEnemyRuntimePruneAt) ? game._nextEnemyRuntimePruneAt : 0;
    if (now < game._nextEnemyRuntimePruneAt) return;
    pruneEnemyRuntimeDebuffMaps();
    game._nextEnemyRuntimePruneAt = now + 2000;
}

/** A beehive expedition that is not waiting to be cleared holds the tick here. */
function beehiveHoldsTick() {
    const locked = typeof isBeehiveRunLockedForMapTravel === 'function' ? isBeehiveRunLockedForMapTravel() : !!(game.beehive && game.beehive.inRun);
    return locked && !(game.beehive && game.beehive.awaitingClear);
}

/** The zone's own tick: the colony run, and from underworld floor 15 the life drain. */
function tickZoneHazards(zone, pStats) {
    if (zone?.type === 'colony' && game.colony.inRun) tickColonyRun(pStats);
    if (!zone || zone.type !== 'underworld' || game.playerHp <= 0) return;
    const floor = Math.max(1, Math.floor(zone.floor || 1));
    if (floor < 15) return;
    let tickDmg = getUnderworldLifeDrainPerTick(pStats.maxHp, floor, getSkyStoneReductionPct());
    tickDmg = floorIncomingDamage(tickDmg);
    tickDmg = absorbDamageWithTalentStoneShield(tickDmg);
    game.playerHp = Math.max(0, Math.floor(game.playerHp - tickDmg));
}

/** 20 ticks with no map progress where progress is tracked: the run is rebuilt and nudged forward. */
function trackProgressStall(progressBefore) {
    if (!actExplorationProgress.shouldTrackStall()) { progressStallTicks = 0; return; }
    if (game.runProgress <= progressBefore + 0.0001) progressStallTicks++;
    else progressStallTicks = 0;
    if (progressStallTicks < 20) return;
    ensureEncounterRun();
    game.runProgress = Math.min(99.9, progressBefore + 0.4);
    progressStallTicks = 0;
}

/** The fight's tick: monster dots and ailments, the hero's swings (held while a cast delays them or a danger is walked out of; out
 * of range the swing charge stops at one), double strikes, the mobility skill, summons, the monsters' attacks. */
function runFightTick(pStats, hazardEvasion, walkedMs) {
    tickEnemyDotEffects(pStats, 0.1);
    tickEnemyAilments(pStats, 0.1);
    const nowCast = getCombatTime();
    const channelGate = getCombatChannelGate(pStats, nowCast);
    const castBlocked = nowCast < getAttackDelayUntil(nowCast) || hazardEvasion.avoiding;
    const inSkillRange = resolveSkillRange(pStats, channelGate, hazardEvasion);
    if (!castBlocked) {
        pTimer += 0.1 * pStats.aspd * getWalkingChargeScale(pStats, walkedMs);
        // 사거리 밖이면 스윙 게이지를 1회분까지만 모아 두고, 붙는 즉시 공격한다.
        if (!inSkillRange) pTimer = Math.min(pTimer, 1.0);
    }
    while (!castBlocked && inSkillRange && pTimer >= 1.0 && game.enemies.length > 0) {
        pTimer -= 1.0;
        performPlayerAttack(pStats);
        combatTacticsRuntime.recoverUntil = Math.max(combatTacticsRuntime.recoverUntil || 0, nowCast + getPlayerAttackRecoveryMs(pStats.aspd));
        performDoubleStrikes(pStats);
    }
    mobilitySkill.cast({ blocked: castBlocked, inRange: inSkillRange, auto: !actExplorationProgress.holdPosition(hazardEvasion.holdPosition || hazardEvasion.warning), stats: pStats }); // 이동 스킬: the player's key, or (auto-move on) closing the gap the main gem can't reach
    runSummonAttackTick(pStats);
    performMonsterAttacks(pStats);
}

/** Whether the main gem reaches a target: never while walking out of danger; a locked channel by its targets; else the grid
 * engagement (which also steps the hero in). */
function resolveSkillRange(pStats, channelGate, hazardEvasion) {
    if (hazardEvasion.avoiding) return false;
    if (channelGate.locked) return channelGate.hasTargets;
    return updatePlayerGridEngagement(pStats, { holdPosition: actExplorationProgress.holdPosition(hazardEvasion.holdPosition), avoidCells: hazardEvasion.avoidCells });
}

/** When the cast delay ends (a delay over 5 s away is a stale one: 0.5 s). */
function getAttackDelayUntil(nowCast) {
    const castUntil = Math.max(0, Number(combatTacticsRuntime.attackDelayUntil) || 0);
    return castUntil > nowCast + 5000 ? nowCast + 500 : castUntil;
}

/** 연속 타격: every full 100% is an extra swing, the rest a chance of one more (rolled every swing). g2 and w2 count each. */
function performDoubleStrikes(pStats) {
    const dsChance = Math.max(0, pStats.ds || 0);
    const guaranteedExtra = Math.floor(dsChance / 100);
    const extraRemainder = dsChance - (guaranteedExtra * 100);
    const extraHits = guaranteedExtra + ((Math.random() * 100 < extraRemainder) ? 1 : 0);
    for (let chain = 0; chain < extraHits && game.enemies.length > 0; chain++) {
        // 연속 타격은 줄을 남기지 않는다(2026-10-18): 후반에는 보이는 전투 기록 60줄 가운데 열 줄 남짓을 차지했고, 희귀 전리품 색이라
        // 전리품 줄처럼 보였다. 추가 타격마다 피해 줄은 그대로 남는다.
        performPlayerAttack(pStats, { repeatChannelCast: true });
        if (hasKeystone('g2')) stackKeystoneRhythm('gladiatorFlurry', 12, 3000);
        if (hasKeystone('w2')) stackKeystoneRhythm('warriorRhythmDouble', 5, 2000);
    }
}

/** A keystone's short stack (game[prefix + 'Stacks'], game[prefix + 'ExpiresAt']): +1 up to cap, its timer restarted. */
function stackKeystoneRhythm(prefix, cap, durationMs) {
    const now = getCombatTime(), countKey = prefix + 'Stacks', untilKey = prefix + 'ExpiresAt';
    const stacks = (game[untilKey] || 0) > now ? Math.max(0, Math.min(cap, Math.floor(game[countKey] || 0))) : 0;
    game[countKey] = Math.min(cap, stacks + 1);
    game[untilKey] = now + durationMs;
}

/** From loop 9 in void rift zones, an open rift's wave: reinforcements arrive, and when all came and fell the rift closes with its
 * rewards and maybe opens the grand breach. ui: { say (addLog), enterGrand (the grand breach auto entry) } from the tick. */
function tickVoidRiftWave(zone, ui) {
    if ((game.season || 1) < 9 || !isVoidRiftCombatZone(zone)) return;
    const v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    if (!v.active) return;
    sanitizeVoidRiftWave(v);
    if (spawnVoidBreachReinforcement(zone, v) && game.settings.showSpawnLog !== false) {
        ui.say(_t('🕳️ 균열 출현 {spawnedCount}/{totalToSpawn}', { spawnedCount: v.spawnedCount, totalToSpawn: v.totalToSpawn }), 'attack-monster', { noToast: true });
    }
    if (voidRiftWaveCleared(v)) closeVoidRiftWave(v, ui);
}

function sanitizeVoidRiftWave(v) {
    v.pendingWave = v.pendingWave !== false;
    v.totalToSpawn = Math.max(3, Math.floor(v.totalToSpawn || (6 + Math.floor(Math.random() * 4))));
    v.spawnedCount = Math.max(0, Math.floor(v.spawnedCount || 0));
    v.spawnTick = Math.max(0, Math.floor(v.spawnTick || 0));
}

function closeVoidRiftWave(v, ui) {
    v.active = false;
    v.pendingWave = false;
    v.breachClears = (v.breachClears || 0) + 1;
    let reward = 1 + (Math.random() < 0.2 ? 1 : 0);
    reward = combatLootReceipts.capture(game,()=>awardCurrency('voidChisel', reward, 'drop'));
    let unlockedGrand = false;
    if (Math.random() < GRAND_BREACH_ENCOUNTER.unlockChance) {
        v.grandBreachUnlock = true;
        unlockedGrand = true;
    }
    ui.say(_t('🕳️ 공허의 구멍 정리 완료!{reward}', { reward: reward ? ` ${_t('공허의 끌')} +${reward}` : '' }), 'loot-magic', { noToast: true });
    if (unlockedGrand) announceGrandBreachOpen(v, ui);
}

function announceGrandBreachOpen(v, ui) {
    const enteredGrand = ui.enterGrand();
    if (!enteredGrand) ui.say(_t('🚨 대균열이 열렸습니다! [대균열 입장] 버튼을 확인하세요.'), 'loot-unique');
    if (!enteredGrand && !v.grandNoticeShown && typeof queueTutorialNotice === 'function') {
        v.grandNoticeShown = true;
        queueTutorialNotice('void_grand_breach_ready_once', _t('대균열'), _t('대균열이 열렸습니다.\n‘지도 → 탐험 → 공허 균열, 대균열’에서 ‘대균열 입장’을 누르세요.'), 'tab-map');
    }
}

function processPendingSlamEchoHits() {
    let now = getCombatTime();
    let list = Array.isArray(game.pendingSlamEchoHits) ? game.pendingSlamEchoHits : [];
    let next = [];
    list.forEach(row => {
        if (!row || !row.enemyId || !row.at) return;
        if (row.at > now) { next.push(row); return; }
        let enemy = (game.enemies || []).find(e => e && e.id === row.enemyId && e.hp > 0);
        if (!enemy) return;
        let bonus = Math.max(1, Math.floor(row.damage || 0));
        applyDamageToEnemyResource(enemy, bonus);
        addBattleFx('hit', { enemyId: enemy.id, color: getElementColor(row.element || 'phys'), damage: bonus, duration: 220, syncToSwing: false });
        if (game.settings && game.settings.showCombatLog !== false) addLog(_t('🌋 여진으로 {name}에게 {bonus} 추가 피해', { name: i18n.enemyName(enemy.name), bonus: formatNumberKR(bonus) }), 'attack-player', { noToast: true });
        if (enemy.hp <= 0) handleEnemyDeath(enemy, getPlayerStats());
    });
    game.pendingSlamEchoHits = next;
}

function copyCombatGridCell(unit) {
    return hasGridCell(unit) ? { gx: unit.gx, gy: unit.gy } : null;
}

function getSkillCombatDelivery(skill) {
    let tags = skill && Array.isArray(skill.tags) ? skill.tags : [];
    if (skill && skill.combatPattern && skill.combatPattern.kind === 'channel') return 'magicCell';
    if (tags.includes('projectile') || (skill && skill.targetMode === 'pierce')) {
        return skill && skill.targetMode === 'pierce' ? 'projectileCell' : 'projectileTarget';
    }
    if (tags.includes('spell') || (tags.includes('aoe') && !tags.includes('melee'))) return 'magicCell';
    return 'instantTarget';
}

function getCombatTravelMs(sourceCell, targetCell, skill) {
    let distance = sourceCell && targetCell
        ? gridChebyshevDist(sourceCell.gx, sourceCell.gy, targetCell.gx, targetCell.gy) : 0;
    let baseTravelMs = COMBAT_PROJECTILE_MIN_TRAVEL_MS + distance * COMBAT_PROJECTILE_MS_PER_CELL;
    return Math.max(36, Math.round(baseTravelMs * getCombatTravelMultiplier(skill)));
}

function getCombatTravelMultiplier(skill) {
    return clampNumber(Number(skill && skill.projectileTravelTimeMultiplier) || 1, 0.15, 2);
}

/** How long a projectile takes per cell on screen: the distance part of getCombatTravelMs. The renderer holds the fixed part
 * back before the release, so the image keeps one speed from the hand to its last cell (js/canvas-world-tree-fx.js). */
function getCombatTravelCellMs(skill) {
    return COMBAT_PROJECTILE_MS_PER_CELL * getCombatTravelMultiplier(skill);
}

function getPendingSkillCollisionCells(row) {
    if (!row || !row.sourceCell || !row.targetCells || row.targetCells.length <= 0) return row && row.targetCells || [];
    if (row.delivery !== 'projectileCell' && row.delivery !== 'magicMoving') return row.targetCells;
    let target = row.targetCells[0];
    let maxLen = Math.max(1, gridChebyshevDist(row.sourceCell.gx, row.sourceCell.gy, target.gx, target.gy));
    let path = gridLineCells(row.sourceCell.gx, row.sourceCell.gy, target.gx, target.gy, maxLen);
    return path.length > 0 ? path.map(cell => ({ ...cell, mult: target.mult })) : row.targetCells;
}

/** 회오리: this spin's victim, chosen as it lands — the nearest enemy not yet struck around the caster's current cell,
 * with the whirl's falloff by strike order. Nobody around: the spin whiffs. */
function pickWhirlSpinTargets(row) {
    let struck = row.whirl.struck;
    let fresh = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !struck.includes(enemy.id));
    let pick = selectGridSkillTargets(row.options.skillName, row.pStats.sSkill, game.gridPlayer, fresh)[0];
    if (!pick) return [];
    struck.push(pick.enemy.id);
    row.options.sourceCell = copyCombatGridCell(game.gridPlayer);
    return [{ enemy: pick.enemy, mult: getGridSkillTargetMult('whirl', struck.length - 1) }];
}

/** 대지의 함성 · 서리바람 내지르기 (js/combat-grid.js buildRadialBurstHitSequence): the monsters the drawn ring has touched since the last
 * check. The ring grows one cell per msPerCell from the wave's start up to its reach; the time since the last check is sampled every
 * COMBAT_GRID_CONFIG.waveContactSampleMs against where each monster was drawn then (just after a step it glides between its cells).
 * One wave strikes a monster once, first touched first, up to the skill's targets. Stepping inside the burst no longer dodges it. */
function pickWaveFrontTargets(row) {
    const wave = row.wave, now = getCombatTime(), start = row.at - (Number(row.options.stageDelayMs) || 0);
    const span = { start, from: Math.min(now, Math.max(start, wave.checkedAt ?? start)), now };
    wave.checkedAt = now;
    // 원뿔 파동은 시전 때의 원뿔 칸 안에 선 몬스터만 친다(js/combat-grid.js getRadialWaveShape)
    const inside = enemy => !wave.cells || getGridUnitCells(enemy).some(cell => wave.cells.has(gridCellKey(cell.gx, cell.gy)));
    const reached = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0 && !wave.struck.includes(enemy.id) && inside(enemy))
        .map(enemy => ({ enemy, touchedAt: waveTouchTime(wave, enemy, span) }))
        .filter(entry => entry.touchedAt !== null).sort((a, b) => a.touchedAt - b.touchedAt)
        .slice(0, Math.max(0, wave.limit - wave.struck.length));
    reached.forEach(entry => wave.struck.push(entry.enemy.id));
    return reached.map(entry => ({ enemy: entry.enemy, mult: wave.mults[entry.enemy.id] ?? 1 }));
}

/** The first sampled moment in span when the ring (radius = time since start / msPerCell, at most reach) touches the drawn enemy. */
function waveTouchTime(wave, enemy, span) {
    const step = Math.max(1, COMBAT_GRID_CONFIG.waveContactSampleMs);
    for (let t = span.from; ; t = Math.min(span.now, t + step)) {
        const ring = Math.min(wave.reach, Math.max(0, t - span.start) / wave.msPerCell);
        if (getGridWaveDrawnDistance(wave, enemy, t) <= ring) return t;
        if (t >= span.now) return null;
    }
}

function getPendingSkillImpactTargets(row) {
    if (!row || row.delivery === 'instantTarget' || row.delivery === 'projectileTarget') {
        return (row && row.targetEntries || []).map(entry => {
            let enemy = (game.enemies || []).find(candidate => candidate && candidate.id === entry.enemyId && candidate.hp > 0);
            return enemy ? { enemy, mult: entry.mult } : null;
        }).filter(Boolean);
    }
    let used = new Set();
    let maxTargets = Math.max(1, row.options?.targetLimit || (row.targetEntries || []).length);
    let cells = getPendingSkillCollisionCells(row);
    // 단두대처럼 시전 대상에게 예고하는 기술: 아직 판정 칸에 남은 대상을 먼저 치고, 빈자리는 기존 칸 순서로 채운다.
    function keptCastTargets() {
        if (!row.pStats?.sSkill?.combatPattern?.keepCastTargets) return [];
        const kept = [];
        for (let entry of row.targetEntries) {
            let enemy = (game.enemies || []).find(candidate => candidate && candidate.id === entry.enemyId && candidate.hp > 0);
            let cell = enemy && !used.has(enemy.id) && cells.find(c => getGridUnitCells(enemy).some(o => o.gx === c.gx && o.gy === c.gy));
            if (!cell) continue;
            used.add(enemy.id);
            kept.push({ enemy, mult: cell.mult });
        }
        return kept;
    }
    return keptCastTargets().concat(cells.map(cell => {
        let enemy = (game.enemies || []).find(candidate => candidate && candidate.hp > 0
            && getGridUnitCells(candidate).some(occupied => occupied.gx === cell.gx && occupied.gy === cell.gy) && !used.has(candidate.id));
        if (!enemy) return null;
        used.add(enemy.id);
        return { enemy, mult: cell.mult };
    }).filter(Boolean)).slice(0, maxTargets);
}

/** Visual anchors are independent of integer collision cells and contact times. */
function getSkillTravelVisualEndpoints(row) {
    if (row.delivery !== 'projectileTarget' || row.travelPath || row.patternKind === 'boomerang') {
        return { sourceCell: row.sourceCell, targetCells: row.targetCells };
    }
    const enemies = game.enemies || [];
    const source = enemies.find(enemy => enemy.id === row.options.chainFromEnemyId);
    const targetCells = row.targetCells.map((cell, index) => {
        const target = enemies.find(enemy => enemy.id === row.targetEntries[index]?.enemyId);
        return hasGridCell(target) ? getGridUnitCenter(target) : cell;
    });
    return { sourceCell: hasGridCell(source) ? getGridUnitCenter(source) : row.sourceCell, targetCells };
}

/** Projectile rows only; ground waves and areas keep their scheduled motion. */
function getPendingSkillTravelCellMs(row) {
    return row.delivery?.startsWith('projectile') ? getCombatTravelCellMs(row.pStats && row.pStats.sSkill) : 0;
}

function addChainHopTravelFx(row, attackContext, now) {
    const kind = row.options.stageKind, from = row.options.chainFromEnemyId;
    // 투사체 태그나 관통으로 나는 룬(빙결 파열창은 주문 태그뿐이다)
    if (!['supportChain', 'chainJump'].includes(kind) || from == null || !getSkillCombatDelivery(row.pStats.sSkill).startsWith('projectile')) return;
    const source = (game.enemies || []).find(enemy => enemy && enemy.id === from);
    if (!source || !hasGridCell(source)) return;
    delayChainHopAfterSource(row, from);
    const flightMs = Math.max(1, Math.min(CHAIN_HOP_MS, row.at - now));
    addBattleFx('combatTravel', { owner: 'player', delivery: 'projectileTarget', chainHop: true, stageKind: kind, stageIndex: row.options.stageIndex,
        sourceCell: copyCombatGridCell(source), targetCells: row.targetCells, targetIds: row.targetEntries.map(entry => entry.enemyId),
        skillName: attackContext.skillName, damageTextGroupId: row.options.damageTextGroupId, element: row.options.forcedElement,
        releaseDelayMs: Math.max(0, row.at - flightMs - now), flightMs, duration: Math.max(260, row.at - now + 260) });
}

/** 앞 적을 친 단계(이번 단계보다 늦지 않은 것 가운데 가장 늦은 것) 뒤 CHAIN_HOP_MS에 닿게 이번 연쇄 단계를 미룬다. 둘째 연쇄는 미뤄진 첫 연쇄를 따른다. */
function delayChainHopAfterSource(row, sourceId) {
    const sourceAt = pendingSkillStageHits.reduce((latest, other) => (other !== row && other.at < row.at + CHAIN_HOP_MS
        && (other.targetEntries || []).some(entry => entry.enemyId === sourceId) ? Math.max(latest, other.at) : latest), -Infinity);
    const late = sourceAt + CHAIN_HOP_MS - row.at;
    if (!(late > 0)) return;
    row.at += late;
    row.launchAt += late;
}

function addPendingSkillTravelFx(row, attackContext, now) {
    if (!row) return;
    if (row.delivery === 'instantTarget') { addChainHopTravelFx(row, attackContext, now); return; }
    if (['field', 'channel', 'meteor'].includes(row.patternKind) && row.options.stageIndex > 0) return;
    let boomerangReturn = row.patternKind === 'boomerang' && row.options.stageKind === 'boomerangReturn';
    const visual = getSkillTravelVisualEndpoints(row);
    let visualTargetCells = visual.targetCells;
    let visualTargetIds = row.targetEntries.map(entry => entry.enemyId);
    if (row.patternKind === 'boomerang') {
        visualTargetCells = boomerangReturn
            ? [copyCombatGridCell(game.gridPlayer)]
            : row.targetCells.slice(-1);
        visualTargetIds = boomerangReturn ? [] : visualTargetIds.slice(-1);
    }
    let fx = {
        owner: 'player', channelId: row.channelId,
        delivery: row.delivery,
        patternKind: row.patternKind, stageKind: row.options.stageKind, stageIndex: row.options.stageIndex, stageDelayMs: row.options.stageDelayMs,
        sourceCell: visual.sourceCell,
        aimCell: copyCombatGridCell(row.aimCell) || copyCombatGridCell((game.enemies || []).find(enemy => enemy
            && row.targetEntries[0] && String(enemy.id) === String(row.targetEntries[0].enemyId))) || visualTargetCells[0],
        targetCells: visualTargetCells, travelPath: row.travelPath,
        contactSchedule: row.contactSchedule,
        attackFootprint: row.options.attackFootprint,
        targetIds: visualTargetIds,
        skillName: attackContext.skillName, damageTextGroupId: row.options.damageTextGroupId,
        element: row.options.forcedElement,
        releaseDelayMs: Math.max(0, row.launchAt - now),
        flightMs: Math.max(1, row.at - row.launchAt),
        travelCellMs: getPendingSkillTravelCellMs(row),
        waveDurationMs: Math.max(0, Number(row.waveDurationMs) || 0),
        duration: row.fieldDurationMs || Math.max(260, row.at - now + 260)
    };
    addBattleFx('combatTravel', fx);
}

function buildRadialBurstVisualRow(rows, now) {
    let first = rows[0];
    let waveDurationMs = Math.max(120, Number(first.waveDurationMs) || 0);
    return {
        ...first,
        targetCells: rows.flatMap(row => row.targetCells || []),
        targetEntries: rows.flatMap(row => row.targetEntries || []),
        waveDurationMs,
        fieldDurationMs: Math.max(360, first.at - now + waveDurationMs + 180)
    };
}

/** Preserve hit times on one straight visual ray, then cross empty cells to the cast's range.
 * @param {Readonly<typeof pendingSkillStageHits>} rows Scheduled rows; never mutated.
 * @returns {(typeof pendingSkillStageHits)[number] & {travelPath:Array<{gx:number,gy:number,offsetMs:number}>}}
 */
function buildLinearSkillVisualRow(rows) {
    const first = rows[0], last = rows[rows.length - 1];
    const source = first.sourceCell;
    const distance = cell => gridChebyshevDist(source.gx, source.gy, cell.gx, cell.gy);
    const end = first.options.attackFootprint.cells.reduce((a, b) => distance(b) > distance(a) ? b : a);
    const path = [{ ...source, offsetMs: 0 }];
    const dx = end.gx-source.gx, dy = end.gy-source.gy, lengthSq = dx*dx+dy*dy;
    rows.forEach((row, index) => {
        const cell = row.targetCells[0];
        const progress = lengthSq ? clampNumber(((cell.gx-source.gx)*dx+(cell.gy-source.gy)*dy)/lengthSq,0,1) : 0;
        const point = {gx:source.gx+dx*progress,gy:source.gy+dy*progress,offsetMs:Math.max(path[path.length-1].offsetMs,row.at-first.launchAt)};
        const next = rows[index + 1];
        path.push(point);
        if (next) path.push({ ...point, offsetMs: point.offsetMs + Math.min(SKILL_HIT_SEQUENCE_CONFIG.pierceHoldMs.longest, Math.max(0, (Number(next.holdMs) || 0) - (Number(row.holdMs) || 0))) });
    });
    const tip = path[path.length - 1];
    const remaining = gridChebyshevDist(tip.gx, tip.gy, end.gx, end.gy);
    if (remaining > 0) {
        const skill = first.pStats.sSkill;
        const tailMs = first.patternKind === 'moving'
            ? remaining * Math.max(80, Number(skill.combatPattern.intervalMs) || 160)
            : getCombatTravelMs(tip, end, skill) - getCombatTravelMs(tip, tip, skill);
        path.push({ ...end, offsetMs: tip.offsetMs + Math.max(1, tailMs) });
    }
    return { ...first, at: first.launchAt + path[path.length - 1].offsetMs,
        contactSchedule: rows.map(row => ({offsetMs: row.at - first.launchAt, state: row.contactState})),
        targetCells: [{ ...end }], targetEntries: last.targetEntries, travelPath: path };
}

/** Only a simple pierce/moving wave shares one ray; authored phases own their routes. */
function groupsSkillTravelOnRay(row) {
    const skill = row.pStats.sSkill;
    if (skill.projectilePattern?.trajectory === 'stages' || skill.combatPattern?.stages) return false;
    return row.patternKind === 'moving' || (row.delivery === 'projectileCell' && !row.patternKind);
}

/** 발마다 제 길로 난다(js/combat-projectile-shots.js). 더 나가는 발이 없으면 전부 한 발이다. */
function addPendingSkillTravelFxRows(rows, attackContext, now) {
    const shots = new Map();
    (rows || []).filter(Boolean).forEach(row => shots.set(row.shot, (shots.get(row.shot) || []).concat(row)));
    shots.forEach(shotRows => addShotTravelFx(shotRows, attackContext, now));
}

function addShotTravelFx(queuedRows, attackContext, now) {
    let firstRow = queuedRows[0];
    if (attackContext.skillName === '빙결 침식') {
        const last = queuedRows[queuedRows.length - 1];
        addPendingSkillTravelFx({
            ...firstRow, options: { ...firstRow.options, attackFootprint: last.options.attackFootprint },
            fieldDurationMs: Math.max(last.at - now + 160, firstRow.at - now + 1000 / Math.max(0.01, firstRow.pStats.aspd))
        }, attackContext, now);
        return;
    }
    if (firstRow.patternKind === 'radialBurst') {
        addPendingSkillTravelFx(buildRadialBurstVisualRow(queuedRows, now), attackContext, now);
        return;
    }
    if (!groupsSkillTravelOnRay(firstRow)) {
        queuedRows.forEach(row => addPendingSkillTravelFx(row, attackContext, now));
        return;
    }
    addPendingSkillTravelFx(buildLinearSkillVisualRow(queuedRows), attackContext, now);
}

/** 공격을 시작해 맞히기까지(ms): 강타는 내려찍을 준비가 길다. 뛰어올라 내려찍는 도약 강타는 착지가 곧 타격이라(landingMs) 강타 준비를 쓰지 않는다. */
function getAttackMotionMs(tags) {
    if (tags.includes('slam') && !tags.includes('mobility')) return 460;
    return tags.includes('projectile') ? 400 : 360;
}

/** Schedules one attack-speed cycle. Double strikes share its time window.
 * Channel continuity follows absolute stage times, independently of visual/tick cadence.
 * @param {ReturnType<typeof getPlayerStats>} pStats
 * @param {ReturnType<typeof buildSkillHitSequence>} stages
 * @param {{skillName:string,forcedCrit:boolean,forcedElement:string,stageCount:number,talentAttackMultiplier:number,attackDamageMultiplier:number,channelContinuation:boolean,repeatChannelCast:boolean,landingMs:number}} context
 *   landingMs: actual airborne movement duration in combat milliseconds; zero when this attack did not move the hero.
 */
function queuePlayerAttackSequence(pStats, stages, context) {
    const shots = projectileShots.plan(context.skillName, pStats, stages);   // 더 나가는 발은 저마다 제 길로 난다. 다 나눴으니 타격 때 다시 늘지 않는다
    stages = shots || window.GameModules.combat.supports.stages(stages, pStats.sSkill);
    if (shots) pStats = { ...pStats, projectileExtraShots: 0, uniqueProjExtraShotChance: null };
    ascendancyNodeRules.onAttack(pStats, getCombatTime()); // 흐르는 칼끝 중첩, 이중 폭발 굴림(공격마다 한 번)
    if (pStats.sSkill.nativeCastId) return startSkillGemCombat(pStats, context);
    let tags = pStats.sSkill.tags || [], now = getCombatTime();
    let motionMs = getAttackMotionMs(tags);
    motionMs = Math.min(motionMs, Math.max(80, 800 / Math.max(0.01, pStats.aspd)));
    // Airborne mobility hits no earlier than landing (data/skills.js airMs, shared with the stage's jump/flip pose).
    motionMs = Math.max(motionMs, context.landingMs);
    let isChannel = tags.includes('channeling');
    let cycleMs = isChannel ? getCombatChannelCycleMs(pStats.aspd) : 0;
    let timing = isChannel ? beginCombatChannel(context.skillName, motionMs, cycleMs, context) : { id: 0, startAt: now + motionMs };
    let delayMs = timing.startAt - now, channelId = timing.id;
    let duration = Math.max(80, delayMs + cycleMs);
    let damageTextGroupId = nextPlayerDamageTextGroupId++;
    if (nextPlayerDamageTextGroupId > 1000000000) nextPlayerDamageTextGroupId = 1;
    noteCombatTacticAttack(duration);
    const delivery = getSkillCombatDelivery(pStats.sSkill);
    addBattleFx('playerSwing', {
        color: getElementColor(context.forcedElement), element: context.forcedElement,
        crit: context.forcedCrit, projectile: tags.includes('projectile'), kickoff: !!context.kickoff,
        combatTravel: delivery !== 'instantTarget',
        releaseDelayMs: delivery.startsWith('projectile') ? Math.floor(Math.max(0, delayMs) * PROJECTILE_RELEASE_SHARE) : undefined,
        skillName: context.skillName, sourceCell:copyCombatGridCell(game.gridPlayer), duration, impactDelayMs: Math.max(0, delayMs),
        // 옆으로만 치는 룬이 대상을 고를 때 정한 쪽(js/combat-grid.js band): 대상이 바로 위나 아래여도 무대의 주인공이 그 쪽을 본다
        bandSide: getSkillBandSide(context.skillName, pStats.sSkill)
    });
    queuePendingSkillStageHits(isChannel ? createContinuousChannelStages(stages, cycleMs) : stages, pStats, {
        ...context, channelId, channelCycleMs: cycleMs, baseDelayMs: delayMs, damageTextGroupId
    });
}

/** When a stage leaves and lands. A pierce is one shot: a victim past the first is hit when that shot reaches it, timed from the
 * caster's release. It used to be a new shot from the previous victim 30ms later, which paid the fixed launch time again, so the
 * later hits landed early and the image darted through them (2026-10-04, "맞고 더 빨라진다"). Collision still runs from the
 * previous victim (row.sourceCell).
 * @returns {{stageDelay:number, launchAt:number, at:number}} */
function getPendingStageTimes(stage, delivery, cells, timing) {
    const { now, baseDelay, skill } = timing;
    const through = delivery.startsWith('projectile') && stage.kind === 'pierceThrough';
    const stageDelay = (through ? 0 : Math.max(0, Math.floor(stage.delayMs))) + (Number(stage.shotDelayMs) || 0);
    if (delivery.startsWith('projectile')) {
        const launchAt = now + Math.floor(baseDelay * PROJECTILE_RELEASE_SHARE) + stageDelay;
        return { stageDelay, launchAt, at: launchAt + getCombatTravelMs(through ? game.gridPlayer : cells.source, cells.target, skill) + (Number(stage.holdMs) || 0) };
    }
    if (delivery === 'magicMoving') {
        const launchAt = now + baseDelay + stageDelay;
        return { stageDelay, launchAt, at: launchAt + Math.max(80, Number(skill.combatPattern.intervalMs) || 160) };
    }
    return { stageDelay, launchAt: now, at: now + baseDelay + stageDelay };
}

function queuePendingSkillStageHits(stages, pStats, attackContext) {
    let now = getCombatTime();
    let baseDelay = Number(attackContext.baseDelayMs) || 0;
    let delivery = getSkillCombatDelivery(pStats && pStats.sSkill);
    let patternKind = pStats && pStats.sSkill && pStats.sSkill.combatPattern
        ? pStats.sSkill.combatPattern.kind : null;
    let queuedRows = [];
    let finalStageDelayMs = (stages || []).reduce((max, stage) => Math.max(max, Number(stage && stage.delayMs) || 0), 0);
    let channelDurationMs = Math.max(finalStageDelayMs, Math.floor(Number(attackContext.channelCycleMs) || 0));
    (stages || []).forEach((stage, stageOffset) => {
        if (!stage || !Array.isArray(stage.targets) || stage.targets.length <= 0) return;
        let targetEntries = stage.targets.map(entry => ({ enemyId: entry.enemy.id, mult: Math.max(0, Number(entry.mult) || 1) }));
        let targetCells = Array.isArray(stage.impactCells) && stage.impactCells.length > 0
            ? stage.impactCells.map(cell => ({ gx: cell.gx, gy: cell.gy, mult: 1 }))
            : stage.targets.map(entry => ({ ...copyCombatGridCell(entry.enemy), mult: Math.max(0, Number(entry.mult) || 1) })).filter(cell => Number.isInteger(cell.gx));
        let chainSource = stage.chainFromEnemyId != null ? (game.enemies || []).find(enemy => enemy && enemy.id === stage.chainFromEnemyId) : null;
        let sourceCell = copyCombatGridCell(chainSource || game.gridPlayer);
        let stageDelivery = stage.delivery || (stage.kind.startsWith('moving') ? 'magicMoving' : delivery);
        let { stageDelay, launchAt, at } = getPendingStageTimes(stage, stageDelivery, { source: sourceCell, target: targetCells[0] },
            { now, baseDelay, skill: pStats.sSkill });
        let row = {
            at, launchAt, holdMs: stage.holdMs,
            zoneId: game.currentZoneId, pStats, delivery: stageDelivery, patternKind, sourceCell, targetCells, targetEntries, shot: stage.shot,
            contactState: {resolved: false}, whirl: stage.whirl, wave: stage.wave, advanceHero: !!stage.advanceHero,
            aimCell: copyCombatGridCell(stage.aimCell),
            waveDurationMs: Math.max(0, Number(stage.waveDurationMs) || 0),
            channelId: Math.max(0, Math.floor(Number(attackContext.channelId) || 0)),
            fieldDurationMs: patternKind === 'channel' ? baseDelay + channelDurationMs + 120
                : (['field', 'meteor'].includes(patternKind) ? baseDelay + finalStageDelayMs + 320 : 0),
            options: {
                sourceCell, stageReplay: true, skipSlamEcho: stageOffset > 0, skillName: attackContext.skillName, channelId: attackContext.channelId, // 강타 여진은 첫 타격에서만
                forcedCrit: !!attackContext.forcedCrit, forcedElement: stage.element || attackContext.forcedElement,
                talentAttackMultiplier: Number.isFinite(Number(attackContext.talentAttackMultiplier)) ? Math.max(0, Number(attackContext.talentAttackMultiplier)) : 1,
                stageKind: stage.kind, stageLabel: stage.label, stageIndex: getStageIndexInShot(stage, stageOffset), stageDelayMs: stageDelay, targetLimit: stage.targetLimit,
                stageCount: attackContext.stageCount, chainFromEnemyId: stage.chainFromEnemyId || null,
                stageRepeatOnce: !!stage.singleRepeat, skipGridControl: stage.skipGridControl,
                restrictRandomTargets: !!stage.singleRepeat,
                primaryAilmentChance: Number.isFinite(Number(stage.primaryAilmentChance))
                    ? Math.max(0, Math.min(1, Number(stage.primaryAilmentChance))) : undefined,
                talentMoonReturn: attackContext.talentMoonReturn || null,
                attackHitGuardCounts: attackContext.attackHitGuardCounts,
                damageTextGroupId: attackContext.damageTextGroupId ? `${attackContext.damageTextGroupId}:${stageOffset}` : '',
                hitDamageMultiplier: Math.max(0, Number(stage.damageMultiplier) || 0),
                attackDamageMultiplier: Number.isFinite(Number(attackContext.attackDamageMultiplier)) ? Math.max(0, Number(attackContext.attackDamageMultiplier)) : 1,
                passiveKarmaContext: attackContext.passiveKarmaContext || null
            }
        };
        row.options.attackFootprint = getSkillStageFootprint(attackContext.skillName, pStats.sSkill, stage, sourceCell);
        row.contactSchedule = [{offsetMs: row.at - row.launchAt, state: row.contactState}];
        pendingSkillStageHits.push(row);
        queuedRows.push(row);
    });
    addPendingSkillTravelFxRows(queuedRows, attackContext, now);
}

/** 집중 룬의 advanceCells(2026-10-17 인계의 전도성 난격이 썼다. 2026-10-19 v36부터 쓰는 룬 없음): 난격하는 동안 겨눈 쪽으로 한 칸 걸어
 * 나간다(진짜 걸음). 막혔거나 이미 붙어 있으면 그 자리에 선다. */
function advanceHeroForStage(row) {
    if (!row.advanceHero) return;
    const aim = row.aimCell || (row.targetCells && row.targetCells[0]);
    if (!aim || !hasGridCell(game.gridPlayer) || getGridUnitDistance(game.gridPlayer, aim) <= 1) return;
    if (actExplorationState.current(game)) beginExplorationGridStep(aim, COMBAT_GRID_CONFIG.playerMoveIntervalSec);
    else gridStepToward(game.gridPlayer, aim.gx, aim.gy, getGridBlockedCells(game.gridPlayer));
}

function processPendingSkillStageHits() {
    if (pendingSkillStageHits.length <= 0) return;
    let now = getCombatTime();
    let ready = [];
    let next = [];
    pendingSkillStageHits.forEach(row => {
        if (!row || row.at > now) next.push(row);
        else ready.push(row);
    });
    pendingSkillStageHits = next;
    ready.sort((a, b) => a.at - b.at).forEach(row => {
        if (row && row.contactState) row.contactState.resolved = true;
        if (!row || row.zoneId !== game.currentZoneId || !row.pStats) return;
        let targets = row.whirl ? pickWhirlSpinTargets(row) : (row.wave ? pickWaveFrontTargets(row) : getPendingSkillImpactTargets(row));
        actExplorationProgress.objects.stage(row);
        advanceHeroForStage(row);
        window.GameModules.combat.supports.repeatReleased(row); // 이중 발동, 이중 시전의 두 번째 발동 연출(맞을 적이 없어도)
        if (targets.length <= 0) return;
        performPlayerAttack(row.pStats, {
            ...(row.options || {}),
            targetEntries: targets.map(entry => ({ enemyId: entry.enemy.id, mult: entry.mult }))
        });
    });
}

// 8 심문궁: 누적된 표식 피해를 5초 후 폭발(누적의 12%, 쿨타임 6초).
function processTalentInquisitorMarks() {
    let store = game.talentInquisitorMarks;
    if (!store || typeof store !== 'object') return;
    let now = getCombatTime();
    let lv = (typeof isTalentCardActive === 'function') ? isTalentCardActive('hero1__inquisitor') : 0;
    Object.keys(store).forEach(id => {
        let mk = store[id];
        if (!mk) { delete store[id]; return; }
        let enemy = getAliveEnemyByRuntimeKey(id);
        if (!enemy) { delete store[id]; return; }
        if (mk.explodeAt && now >= mk.explodeAt) {
            let dmg = Math.max(1, Math.floor((mk.accumulated || 0) * 0.12 * Math.max(1, lv) / TALENT_CARD_MAX_LEVEL_REF));
            applyDamageToEnemyResource(enemy, dmg);
            addBattleFx('hit', { enemyId: enemy.id, color: getElementColor('phys'), damage: dmg, duration: 240, syncToSwing: false });
            if (game.settings && game.settings.showCombatLog !== false) addLog(_t('⚖️ 심판 표식 폭발로 {name}에게 {dmg} 피해', { name: i18n.enemyName(enemy.name), dmg: formatNumberKR(dmg) }), 'attack-player', { noToast: true });
            mk.accumulated = 0; mk.explodeAt = 0; mk.cooldownUntil = now + 6000;
            if (enemy.hp <= 0) handleEnemyDeath(enemy, getPlayerStats());
        }
    });
}

function convertSkillDamageToChaos(skill) {
    let next = { ...(skill || {}) };
    let tags = Array.isArray(next.tags) ? next.tags.slice() : [];
    let convertedTags = tags.filter(tag => !['physical', 'elemental', 'fire', 'cold', 'lightning'].includes(tag));
    if (!convertedTags.includes('chaos')) convertedTags.push('chaos');
    next.tags = convertedTags;
    next.ele = 'chaos';
    if (Array.isArray(next.randomElementPool)) next.randomElementPool = null;
    next.convertedToChaos = true;
    return next;
}

function getUniqueEffectImplementationReport() {
    let declared = [];
    if (typeof UNIQUE_DB !== 'undefined' && Array.isArray(UNIQUE_DB)) {
        declared = UNIQUE_DB.map(unique => unique && unique.uniqueEffectKey).filter(Boolean);
    }
    let uniqueKeys = Array.from(new Set(declared));
    let implemented = new Set([
        'xpGainPct','flatDmgPerLevel','esAmpAndRecoverOnCrit','invertShockTaken','alwaysShock',
        'projectileDoubleStrikePct','projectilePatternMode','hitApplyChaosResDown','corpseExplodeOnKill','instantLeechAndDoubleDamage',
        'riderCompass','maxRollBonusHit','ceilingSmashDouble','minRollEqualsMaxRoll','hpToPhysPct','immuneIgnite',
        'rollGapDamagePct','rollGapCritAndDs','crowdEvasionMore','fewEnemyEvasionMore','evasionDanceOnEvade','loneEvasionCounter','critAdvanceEnergyShieldRecharge','energyShieldBreakRecharge','esToLightPct','underdogNonMaxRollMorePct','instakillNormalOnHitPct','projectileExtraShotChance',
        'abyssSocketOnItem','abyssSocketAndJewelAmp','leechEfficiencyOnKill','overkillSplash','dragonVeinGuard','fateTwinRollSync','realmBleedingEnemyDamageMore','realmRiftWaveOnHit','realmChaosDamageInstantLeech','realmInvulnerableBarrierOnHit','realmPoisonDuration','realmArmorToPhysicalDamage','realmDeathWard','realmAllResDownOnHit','realmKillMoveStacks','realmCursedTakenAndRefresh','realmEnemyRegenCutAndMinRoll','realmPhysDrHalfTakenAsMore','realmArmorAppliesToDot','realmMeleeArmorAmp','realmRepelMelee','realmResonanceAndSuppCap','realmRegenRateAndRegen','realmMaxHpPct','realmAllMaxRes','frostSentinelBoots','shockTracerGreaves','venomStride','bleedBlockHelm','curseCrown','guardianArmor','warcryResonanceBelt','stackingElementalResDownOnHit','conditionManual','cooldownReductionCap','mobilityRuneAsAttack','queenBeeSummonOnHit','bleedWeightOnBleedingHit','grandBreachCrown','labyrinthShackles','meteorFootsteps'
        ,'cosmosFinalDmg','cosmosTakenLess','cosmosSpeedBurst','cosmosPenetration','cosmosSustain','cosmosBossSlayer','cosmosStatBundle','summonCapBonus','summonDeathDamageBuff','summonCritAspdStacks','summonNonCritNoDamage','summonEfficiencyBonus','rightRingSummonCap','genericTakenDamageReducePct','uniqueBlockChance','uniqueDeflectDamageReduce','blockRecoverEnergyShieldPct','blockedDamageTakenPct','uniqueTakenReduceWhen2Enemies','uniqueMaxResAll','deflectGrantShadowStealth','chaosTakenDamageReducePct','uniqueGemLevelBonus','lifeRecoupTakenDamage','immuneBleed','uniqueTakenReduceWhen1Enemy','lifePctAsEnergyShield','dsAndTargetAnyBonus','poisonDamageMorePct','immuneFreeze','uniqueMinDmgRoll','hitShockedEnemyDamageMorePct','pursuitMoveSpeed','projectileTargetBonus','igniteDamageMorePct','cosmosAlwaysFirstHit','cosmosEnergyShieldAmpBypass','cosmosOrbitCycle','cosmosDeepSeaLeechCaps','cosmosTideEsRegenToLife','cosmosEqualDamageSplit','cosmosBalanceMitigation','cosmosTwinStarResonance','cosmosJudgmentLightning','cosmosDeathResist','cosmosVerdictSupportDamage','cosmosGuardianConditionInstant','cosmosBossDamageMore','cosmosCometChillNoFreeze','fixedAllMaxRes','kaleidoscopeShield','stealEliteTrait','mirrorOppositeRing','astraUniqueConvergence','thousandBottles','implicitAmp','loopGrowth','familyBond','sightBeyond','chestLuck','emberHeart','amberTime','witheredEcho','nurseryBloom'
    ]);
    return {
        total: uniqueKeys.length,
        implemented: uniqueKeys.filter(k => implemented.has(k)),
        missing: uniqueKeys.filter(k => !implemented.has(k))
    };
}

function recordPlayerEvadeUniqueEffects(pStats, aliveEnemyCount, now) {
    let at = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    let dance = pStats && pStats.uniqueEvasionDance;
    if (dance) {
        let previous = game.uniqueEvasionDanceState || {};
        let stacks = (previous.expiresAt || 0) > at ? Math.floor(previous.stacks || 0) : 0;
        game.uniqueEvasionDanceState = {
            stacks: Math.min(Math.max(1, Math.floor(dance.maxStacks || 4)), stacks + 1),
            expiresAt: at + Math.max(0.1, Number(dance.duration || 4)) * 1000
        };
    }
    let counter = pStats && pStats.uniqueLoneEvasionCounter;
    if (!counter || aliveEnemyCount < 1 || aliveEnemyCount > Math.max(1, Math.floor(counter.maxEnemies || 2))) return;
    game.uniqueLoneEvasionCounterUntil = at + Math.max(0.1, Number(counter.duration || 3)) * 1000;
}

exposeFileGlobals({ applyTickConditions, stopTickBeforeCombat, isCombatProgressStopped, recoverPlayerTick, advanceTravelTick, pruneEnemyRuntimeOnSchedule, beehiveHoldsTick, tickZoneHazards, trackProgressStall, runFightTick, tickVoidRiftWave, copyCombatGridCell, getSkillCombatDelivery, getCombatTravelMs, pickWhirlSpinTargets, pickWaveFrontTargets, getPendingSkillImpactTargets, addChainHopTravelFx, queuePlayerAttackSequence, queuePendingSkillStageHits, advanceHeroForStage, processPendingSkillStageHits, processTalentInquisitorMarks, convertSkillDamageToChaos, getUniqueEffectImplementationReport, recordPlayerEvadeUniqueEffects });
})();

const isStrongerShock = (ail, current) => Boolean(ail && ail.type === 'shock' && (ail.time || 0) > 0 && (!current || (ail.power || 0) > (current.power || 0)));
const CONDITION_ELEMENT_BONUS = Object.freeze([['fireBonus', 'fire'], ['coldBonus', 'cold'], ['chaosBonus', 'chaos'], ['physBonus', 'phys']]);
const CONDITION_FLAG_KEYS = Object.freeze(['poisonToHeal', 'disableEnemyLeech']);
const CONDITION_IMMUNITIES = Object.freeze(['immuneIgnite', 'immuneChill', 'immuneFreeze', 'immuneShock', 'immuneBleed']);
const CONDITION_CLEANSES = Object.freeze({ cleanseIgnite: 'ignite', cleanseChill: 'chill', cleanseFreeze: 'freeze', cleanseShock: 'shock', cleanseBleed: 'bleed' });


const uniqueShieldWindowOpen = pStats => Boolean(pStats.uniqueEnergyShieldBreakRecharge && (game.uniqueEnergyShieldBreakRechargeUntil || 0) > getCombatTime());


const voidRiftWaveCleared = v => v.spawnedCount >= v.totalToSpawn && (v.defeatedCount || 0) >= v.totalToSpawn
    && (game.enemies || []).filter(e => e.hp > 0 && e.fromVoidRift).length === 0;


/** 연쇄로 건너가는 발(2026-11-09 스킬 전체 전달본 V3.14.1, 사용자 "연쇄될 때 발생하는 선형 번개도 고쳐주세요"): 투사체 룬의 연쇄 단계는
 * 앞서 맞은 적에서 이번 적으로 처음 쏜 것과 같은 투사체가 날아가 이번 타격 순간에 꽂힌다. 연쇄 단계는 120ms 간격이라
 * (js/combat-support-runes.js nativeChain) 그 사이를 난다. 앞 적을 못 찾으면 그림 없이 타격감만 남는다(주인공 자리에서 나가지 않게).
 * 겨냥한 칸(aimCell)을 적지 않아 주인공이 건너가는 쪽으로 돌아서지 않는다. 무엇을 그릴지는 무대가 고른다(js/canvas-stage-skill-casts.js castHop).
 * 연쇄 단계는 시전 시각에서 120ms씩 잡혀 첫 투사체가 날아가는 동안 다음 적을 먼저 쳤다(첫 화살이 꽂히기 전에 연쇄 화살이 떠났다):
 * 앞 적이 맞은 뒤 120ms에 닿도록 이 단계(피해 시각 포함)를 미룬다. 피해는 그대로다. */
const CHAIN_HOP_MS = 120;


/** How far into the swing's windup a projectile leaves the hand: the stage hero plays its release frame then (playerSwing releaseDelayMs,
 * js/canvas-battle-units.js getHanaSwingTiming). */
const PROJECTILE_RELEASE_SHARE = 0.55;


/** 발이 나뉜 공격(js/combat-projectile-shots.js)은 발마다 첫 단계부터 센다: 착탄 폭발 같은 첫 타격의 연출이 발마다 나온다. */
const getStageIndexInShot = (stage, offset) => (stage.shotStage === undefined ? offset : stage.shotStage);


const TALENT_CARD_MAX_LEVEL_REF = 10;


// Phase-3 extracted core combat runtime block.


safeExposeGlobals({ getUniqueEffectImplementationReport });
