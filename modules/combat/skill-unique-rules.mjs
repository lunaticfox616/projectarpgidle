

export function tickConvertSkillDamageToChaos(skill) {
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

export function tickGetUniqueEffectImplementationReport(env) {
    let declared = [];
    if (typeof env.deps.UNIQUE_DB !== 'undefined' && Array.isArray(env.deps.UNIQUE_DB)) {
        declared = env.deps.UNIQUE_DB.map(unique => unique && unique.uniqueEffectKey).filter(Boolean);
    }
    let uniqueKeys = Array.from(new Set(declared));
    let implemented = new Set(TICK_IMPLEMENTED_UNIQUE_EFFECTS);
    return {
        total: uniqueKeys.length,
        implemented: uniqueKeys.filter(k => implemented.has(k)),
        missing: uniqueKeys.filter(k => !implemented.has(k))
    };
}

export function tickRecordPlayerEvadeUniqueEffects(env, pStats, aliveEnemyCount, now) {
    let at = Number.isFinite(Number(now)) ? Number(now) : env.deps.getCombatTime();
    let dance = pStats && pStats.uniqueEvasionDance;
    if (dance) tickRecordEvasionDance(env.owner, dance, at);
    let counter = pStats && pStats.uniqueLoneEvasionCounter;
    if (!counter || aliveEnemyCount < 1 || aliveEnemyCount > Math.max(1, Math.floor(counter.maxEnemies || 2))) return;
    env.owner.uniqueLoneEvasionCounterUntil = at + Math.max(0.1, Number(counter.duration || 3)) * 1000;
}

function tickRecordEvasionDance(owner, dance, at) {
    let previous = owner.uniqueEvasionDanceState || {};
    let stacks = (previous.expiresAt || 0) > at ? Math.floor(previous.stacks || 0) : 0;
    owner.uniqueEvasionDanceState = {
        stacks: Math.min(Math.max(1, Math.floor(dance.maxStacks || 4)), stacks + 1),
        expiresAt: at + Math.max(0.1, Number(dance.duration || 4)) * 1000
    };
}

const TICK_IMPLEMENTED_UNIQUE_EFFECTS = [
        'xpGainPct','flatDmgPerLevel','esAmpAndRecoverOnCrit','invertShockTaken','alwaysShock',
        'projectileDoubleStrikePct','projectilePatternMode','hitApplyChaosResDown','corpseExplodeOnKill','instantLeechAndDoubleDamage',
        'riderCompass','maxRollBonusHit','ceilingSmashDouble','minRollEqualsMaxRoll','hpToPhysPct','immuneIgnite',
        'rollGapDamagePct','rollGapCritAndDs','crowdEvasionMore','fewEnemyEvasionMore','evasionDanceOnEvade','loneEvasionCounter','critAdvanceEnergyShieldRecharge','energyShieldBreakRecharge','esToLightPct','underdogNonMaxRollMorePct','instakillNormalOnHitPct','projectileExtraShotChance',
        'abyssSocketOnItem','abyssSocketAndJewelAmp','leechEfficiencyOnKill','overkillSplash','dragonVeinGuard','fateTwinRollSync','realmBleedingEnemyDamageMore','realmRiftWaveOnHit','realmChaosDamageInstantLeech','realmInvulnerableBarrierOnHit','realmPoisonDuration','realmArmorToPhysicalDamage','realmDeathWard','realmAllResDownOnHit','realmKillMoveStacks','realmCursedTakenAndRefresh','realmEnemyRegenCutAndMinRoll','realmPhysDrHalfTakenAsMore','realmArmorAppliesToDot','realmMeleeArmorAmp','realmRepelMelee','realmResonanceAndSuppCap','realmRegenRateAndRegen','realmMaxHpPct','realmAllMaxRes','frostSentinelBoots','shockTracerGreaves','venomStride','bleedBlockHelm','curseCrown','guardianArmor','warcryResonanceBelt','stackingElementalResDownOnHit','conditionManual','cooldownReductionCap','mobilityRuneAsAttack','queenBeeSummonOnHit','bleedWeightOnBleedingHit','grandBreachCrown','labyrinthShackles','meteorFootsteps'
        ,'cosmosFinalDmg','cosmosTakenLess','cosmosSpeedBurst','cosmosPenetration','cosmosSustain','cosmosBossSlayer','cosmosStatBundle','summonCapBonus','summonDeathDamageBuff','summonCritAspdStacks','summonNonCritNoDamage','summonEfficiencyBonus','rightRingSummonCap','genericTakenDamageReducePct','uniqueBlockChance','uniqueDeflectDamageReduce','blockRecoverEnergyShieldPct','blockedDamageTakenPct','uniqueTakenReduceWhen2Enemies','uniqueMaxResAll','deflectGrantShadowStealth','chaosTakenDamageReducePct','uniqueGemLevelBonus','lifeRecoupTakenDamage','immuneBleed','uniqueTakenReduceWhen1Enemy','lifePctAsEnergyShield','dsAndTargetAnyBonus','poisonDamageMorePct','immuneFreeze','uniqueMinDmgRoll','hitShockedEnemyDamageMorePct','pursuitMoveSpeed','projectileTargetBonus','igniteDamageMorePct','cosmosAlwaysFirstHit','cosmosEnergyShieldAmpBypass','cosmosOrbitCycle','cosmosDeepSeaLeechCaps','cosmosTideEsRegenToLife','cosmosEqualDamageSplit','cosmosBalanceMitigation','cosmosTwinStarResonance','cosmosJudgmentLightning','cosmosDeathResist','cosmosVerdictSupportDamage','cosmosGuardianConditionInstant','cosmosBossDamageMore','cosmosCometChillNoFreeze','fixedAllMaxRes','kaleidoscopeShield','stealEliteTrait','mirrorOppositeRing','astraUniqueConvergence','thousandBottles','implicitAmp','loopGrowth','familyBond','sightBeyond','chestLuck','emberHeart','amberTime','witheredEcho','nurseryBloom'
    ];
