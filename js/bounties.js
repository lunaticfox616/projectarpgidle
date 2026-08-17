const BOUNTY_ACTIVE_STATUSES = Object.freeze(['queued', 'hunting']);

function hasPendingBountyEncounter(targetGame) {
    let enemies = Array.isArray(targetGame.enemies) ? targetGame.enemies : [];
    if (enemies.some(enemy => enemy && enemy.isBountyTarget && enemy.hp > 0)) return true;
    let plan = Array.isArray(targetGame.encounterPlan) ? targetGame.encounterPlan : [];
    let cursor = Math.max(0, Math.floor(Number(targetGame.encounterIndex) || 0));
    return plan.slice(cursor).some(marker => marker && BOUNTY_TARGET_DB[marker.bountyId]);
}

function getBountyProgressLoop(targetGame) {
    return Math.max(1, Math.floor(Math.max(Number(targetGame.season) || 1, Number(targetGame.loopCount) || 0)));
}

function isBountyTargetAvailable(target, targetGame) {
    return !!target && getBountyProgressLoop(targetGame) >= Math.max(1, Math.floor(Number(target.unlockLoop) || BOUNTY_HUNT_CONFIG.unlockLoop));
}

function ensureBountyHuntState(targetGame = game) {
    let raw = targetGame.bountyHunt && typeof targetGame.bountyHunt === 'object' ? targetGame.bountyHunt : {};
    let validOffers = Array.isArray(raw.offerIds) ? raw.offerIds.filter(id => isBountyTargetAvailable(BOUNTY_TARGET_DB[id], targetGame)) : [];
    raw.offerIds = Array.from(new Set(validOffers)).slice(0, BOUNTY_HUNT_CONFIG.offerCount);
    raw.activeId = isBountyTargetAvailable(BOUNTY_TARGET_DB[raw.activeId], targetGame) ? raw.activeId : null;
    raw.status = raw.activeId && BOUNTY_ACTIVE_STATUSES.includes(raw.status) ? raw.status : (raw.activeId ? 'queued' : 'idle');
    if (raw.activeId) raw.offerIds = [];
    if (raw.status === 'hunting' && !hasPendingBountyEncounter(targetGame)) raw.status = 'queued';
    raw.pity = Math.max(0, Math.min(BOUNTY_HUNT_CONFIG.guaranteedAt - 1, Math.floor(Number(raw.pity) || 0)));
    ['offered', 'accepted', 'completed', 'abandoned'].forEach(key => {
        raw[key] = Math.max(0, Math.floor(Number(raw[key]) || 0));
    });
    targetGame.bountyHunt = raw;
    return raw;
}

function isBountyHuntUnlocked(targetGame = game) {
    return getBountyProgressLoop(targetGame) >= BOUNTY_HUNT_CONFIG.unlockLoop;
}

function isBountyEligibleZone(zone) {
    return !!zone && BOUNTY_HUNT_CONFIG.eligibleZoneTypes.includes(zone.type) && !zone.loopScaleExempt;
}

function rollBountyOfferIds(targetGame) {
    let ids = Object.values(BOUNTY_TARGET_DB).filter(target => isBountyTargetAvailable(target, targetGame)).map(target => target.id);
    for (let index = ids.length - 1; index > 0; index--) {
        let swapIndex = Math.floor(Math.random() * (index + 1));
        [ids[index], ids[swapIndex]] = [ids[swapIndex], ids[index]];
    }
    return ids.slice(0, BOUNTY_HUNT_CONFIG.offerCount);
}

function advanceBountyAfterBossKill(zone, enemy, targetGame = game) {
    let state = ensureBountyHuntState(targetGame);
    if (!isBountyHuntUnlocked(targetGame) || !isBountyEligibleZone(zone) || !enemy || !enemy.isBoss) return { offered: false, reason: 'ineligible' };
    if (state.activeId || state.offerIds.length > 0) return { offered: false, reason: 'pending' };
    let config = BOUNTY_HUNT_CONFIG;
    let guaranteed = state.pity >= config.guaranteedAt - 1;
    let chance = Math.min(1, config.baseChance + state.pity * config.pityChancePerBoss);
    if (!guaranteed && Math.random() >= chance) {
        state.pity = Math.min(config.guaranteedAt - 1, state.pity + 1);
        return { offered: false, reason: 'miss', chance };
    }
    state.offerIds = rollBountyOfferIds(targetGame);
    state.pity = 0;
    state.offered++;
    return { offered: true, offerIds: state.offerIds.slice() };
}

function acceptBountyOffer(targetId, targetGame = game) {
    let state = ensureBountyHuntState(targetGame);
    if (state.activeId || !state.offerIds.includes(targetId)) return { accepted: false, reason: 'invalid' };
    state.activeId = targetId;
    state.offerIds = [];
    state.status = 'queued';
    state.accepted++;
    return { accepted: true, target: BOUNTY_TARGET_DB[targetId] };
}

function injectBountyEncounterMarker(plan, zone, targetGame = game) {
    let state = ensureBountyHuntState(targetGame);
    if (!state.activeId || state.status !== 'queued' || !isBountyEligibleZone(zone) || !Array.isArray(plan)) return false;
    if (plan.some(marker => marker && marker.bountyId)) return false;
    plan.push({ at: BOUNTY_HUNT_CONFIG.markerProgress, count: 1, elite: true, bountyId: state.activeId });
    plan.sort((left, right) => Number(left.at || 0) - Number(right.at || 0));
    return true;
}

function applyBountyTargetToEnemy(enemy, targetId, targetGame = game) {
    let target = BOUNTY_TARGET_DB[targetId];
    if (!enemy || !target) return false;
    let mod = target.modifiers;
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * mod.hpMul));
    enemy.hp = enemy.maxHp;
    enemy.armor = Math.max(0, Math.floor(enemy.armor * (mod.armorMul || 1)));
    enemy.evasion = Math.max(0, Math.floor(enemy.evasion * (mod.evasionMul || 1)));
    enemy.dr = Math.min(90, Math.max(0, enemy.dr + (mod.drAdd || 0)));
    ['resF', 'resC', 'resL'].forEach(key => { enemy[key] = Math.min(95, (enemy[key] || 0) + (mod.resAllAdd || 0)); });
    enemy.resChaos = Math.min(95, (enemy.resChaos || 0) + (mod.resAllAdd || 0) + (mod.resChaosAdd || 0));
    enemy.damageMul = (enemy.damageMul || 1) * (mod.damageMul || 1);
    enemy.attackSpeedVar = (enemy.attackSpeedVar || 1) * (mod.attackSpeedMul || 1);
    enemy.penetration = (enemy.penetration || 0) + (mod.penetrationAdd || 0);
    enemy.critChance = (enemy.critChance || 0) + (mod.critChanceAdd || 0);
    enemy.regenRate = (enemy.regenRate || 0) * (mod.regenMul || 1) + (mod.regenRateAdd || 0);
    enemy.firstHitGuard = Math.max(enemy.firstHitGuard || 0, mod.firstHitGuard || 0);
    enemy.ele = mod.element || enemy.ele;
    enemy.name = `${target.icon} 현상금 · ${target.name}`;
    let bountyTrait = `현상금 표적 · ${target.danger}`;
    enemy.traitName = enemy.traitName ? `${enemy.traitName} · ${bountyTrait}` : bountyTrait;
    enemy.isElite = true;
    enemy.isBountyTarget = true;
    enemy.bountyId = targetId;
    enemy.expMul = Math.max(1, Number(enemy.expMul) || 1) * 2;
    let state = ensureBountyHuntState(targetGame);
    state.activeId = targetId;
    state.status = 'hunting';
    return true;
}

function completeBountyTarget(enemy, targetGame = game) {
    let state = ensureBountyHuntState(targetGame);
    if (!enemy || !enemy.isBountyTarget || !BOUNTY_TARGET_DB[enemy.bountyId] || state.activeId !== enemy.bountyId) return { completed: false };
    let target = BOUNTY_TARGET_DB[enemy.bountyId];
    state.activeId = null;
    state.status = 'idle';
    state.completed++;
    return { completed: true, target, reward: target.reward };
}

function requeueInterruptedBounty(targetGame = game) {
    let state = ensureBountyHuntState(targetGame);
    if (state.activeId && state.status === 'hunting') state.status = 'queued';
    return state.status;
}

function abandonBountyHunt(targetGame = game) {
    let state = ensureBountyHuntState(targetGame);
    let hadBounty = !!state.activeId || state.offerIds.length > 0;
    if (!hadBounty) return false;
    targetGame.encounterPlan = (targetGame.encounterPlan || []).filter(marker => !marker || !marker.bountyId);
    targetGame.enemies = (targetGame.enemies || []).filter(enemy => !enemy || !enemy.isBountyTarget);
    state.offerIds = [];
    state.activeId = null;
    state.status = 'idle';
    state.pity = 0;
    state.abandoned++;
    return true;
}

const bountyRuntime = Object.freeze({
    ensureState: ensureBountyHuntState,
    isUnlocked: isBountyHuntUnlocked,
    isEligibleZone: isBountyEligibleZone,
    advanceAfterBossKill: advanceBountyAfterBossKill,
    acceptOffer: acceptBountyOffer,
    injectEncounterMarker: injectBountyEncounterMarker,
    applyTargetToEnemy: applyBountyTargetToEnemy,
    completeTarget: completeBountyTarget,
    requeueInterrupted: requeueInterruptedBounty,
    abandon: abandonBountyHunt
});

safeExposeGlobals({ bountyRuntime });
