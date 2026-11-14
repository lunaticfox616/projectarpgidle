const TAGGED_DAMAGE_STAT_BY_TAG = {
    attack: 'attackPctDmg',
    melee: 'meleePctDmg',
    projectile: 'projectilePctDmg',
    physical: 'physPctDmg',
    elemental: 'elementalPctDmg',
    fire: 'firePctDmg',
    cold: 'coldPctDmg',
    lightning: 'lightPctDmg',
    chaos: 'chaosPctDmg',
    aoe: 'aoePctDmg',
    slam: 'slamPctDmg',
    spell: 'spellPctDmg',
    shield: 'shieldPctDmg',
    mine: 'minePctDmg',
    potion: 'potionPctDmg',
    mobility: 'mobilityPctDmg',
    channeling: 'channelingPctDmg'
};

// Construct fresh fields directly: copying a shared template churned allocations in real stat evaluations.
// Never pool these buckets; results and source readers may still reference an earlier evaluation.
function createEmptyStatBucket() {
    return {
        flatDmg: 0, weaponFlatDmgPct: 0, pctDmg: 0, flatHp: 0, pctHp: 0, aspd: 0, crit: 0, move: 0, cooldownRecovery: 0, cooldownReduction: 0, mobilityCooldownRecovery: 0, mobilityCooldownReduction: 0, cooldownReductionCapBonus: 0, sight: 0, sightCap: 0, chestGrade: 0, gemLevel: 0, elementalGemLevel: 0, fireGemLevel: 0, coldGemLevel: 0, lightGemLevel: 0, chaosGemLevel: 0, physGemLevel: 0, projectileGemLevel: 0, meleeGemLevel: 0, slamGemLevel: 0, spellGemLevel: 0, dotGemLevel: 0, aoeGemLevel: 0, strGemLevel: 0, dexGemLevel: 0, intGemLevel: 0, suppCap: 0, runeResonancePower: 0, regenFlat: 0,
        dr: 0, physIgnore: 0, resPen: 0, resF: 0, resC: 0, resL: 0, maxResAll: 0, maxResF: 0, maxResC: 0, maxResL: 0, maxResChaos: 0, resChaos: 0, leech: 0, leechRateCap: 0, leechTotalCap: 0, leechInstanceCap: 0, leechKeepFullLife: 0, critDmg: 0, regen: 0, regenSuppress: 0, ds: 0, expGain: 0,
        minDmgRoll: 0, maxDmgRoll: 0, slamEchoChance: 0, slamEchoDamagePct: 0, doubleDamageChance: 0, blockChanceMax: 0,
        physFlatTakenReduce: 0, fireFlatTakenReduce: 0, coldFlatTakenReduce: 0, lightFlatTakenReduce: 0, chaosFlatTakenReduce: 0, allFlatTakenReduce: 0,
        physTakenAsFire: 0, physTakenAsCold: 0, physTakenAsLight: 0, physTakenAsChaos: 0,
        addedFireDamagePct: 0, addedColdDamagePct: 0, addedLightDamagePct: 0, addedChaosDamagePct: 0, addedPhysDamagePct: 0,
        fireFlatDmg: 0, coldFlatDmg: 0, lightFlatDmg: 0, chaosFlatDmg: 0, physFlatDmg: 0,
        meleePctDmg: 0, slamPctDmg: 0, projectilePctDmg: 0, physPctDmg: 0, elementalPctDmg: 0, firePctDmg: 0, coldPctDmg: 0, lightPctDmg: 0, chaosPctDmg: 0, aoePctDmg: 0, dotPctDmg: 0, spellPctDmg: 0, shieldPctDmg: 0, minePctDmg: 0, potionPctDmg: 0, mobilityPctDmg: 0, channelingPctDmg: 0, igniteChance: 0, chillChance: 0, freezeChance: 0, shockChance: 0, poisonChance: 0, bleedChance: 0, spellFlatDmg: 0, spellFlatPct: 0,
        targetAny: 0, targetProjectile: 0, targetSlam: 0, projectileExtraShots: 0, projectileExtraChance: 0, projectileChain: 0,
        igniteDurationPct: 0, chillDurationPct: 0, freezeDurationPct: 0, shockDurationPct: 0, poisonDurationPct: 0, bleedDurationPct: 0, skillDelayReduce: 0,
        attackPctDmg: 0, spellLeech: 0, spellCritDmg: 0, spellRepeatChance: 0,
        strength: 0, dexterity: 0, intelligence: 0, accuracy: 0,
        mystique: 0, devotion: 0, cycle: 0, ailmentDamagePct: 0, ailmentPotencyPct: 0,
        armor: 0, evasion: 0, energyShield: 0, armorPct: 0, evasionPct: 0, energyShieldPct: 0, energyShieldRegen: 0, energyShieldRechargeFaster: 0, deflectChance: 0, deflectDamageReduce: 0, blockChance: 0, blockChancePct: 0,
        ailResIgnite: 0, ailResShock: 0, ailResFreeze: 0, ailResPoison: 0, ailResBleed: 0,
        chillEffectReducePct: 0, freezeDurationReducePct: 0, shockEffectReducePct: 0, igniteDamageReducePct: 0, bleedDamageReducePct: 0, poisonDamageReducePct: 0, dotTakenDamageReducePct: 0,
        takenDamageReduceWhen2EnemiesPct: 0, takenDamageReduceWhen1EnemyPct: 0, genericTakenDamageReducePct: 0, critTakenDamageReducePct: 0,
        igniteTakenDurationReducePct: 0, shockTakenDurationReducePct: 0, coldTakenDurationReducePct: 0, poisonTakenDurationReducePct: 0, bleedTakenDurationReducePct: 0,
        shockedEnemyHitDamageMorePct: 0, shockedEnemyHitDamagePct: 0, igniteDamageMultiplierPct: 0,
        poisonDamageMultiplierPct: 0, accuracyBonusPct: 0, chillEffect: 0, shockEffect: 0,
        summonFlatDmg: 0, summonPctDmg: 0, summonAspd: 0, summonHpPct: 0, summonCrit: 0, summonCritDmg: 0, summonCap: 0, summonEfficiency: 0, summonGuardRedirectPct: 0, summonResPen: 0, summonGemLevel: 0,
        curseCap: 0, oxygenMax: 0, oxygenRegen: 0,
        oceanPressureResist: 0, oceanDepthGainPct: 0, oceanRareFishChancePct: 0,
        bossDamagePct: 0, eliteDamagePct: 0, firstStrikeDamagePct: 0, cullStrikePct: 0, echoPower: 0, chaosErosion: 0, chaosErosionCap: 0,
        // 우주계 보스 유물석과 보스 부적의 줄(js/combat.js가 reward에서 읽는다): 통에 없어 addStatToBucket이 버렸다(2026-10-20).
        firstHitDamageMorePct: 0, cosmosAlwaysFirstHitChancePct: 0, uniqueInstantLeechPct: 0, cosmosLightningVariance: 0, cosmosBossDamageMorePct: 0,
        regionPoisonSpread: 0, regionChaosShred: 0, regionPoisonedLeech: 0, regionChaosOvercap: 0, regionBlockEmpower: 0, regionArmorToPhys: 0,
        regionBleedingDamage: 0, regionLowLifeDR: 0, regionShockChain: 0, regionCritMove: 0, regionShockSpread: 0, regionShockedLightPen: 0,
        regionIgniteSpread: 0, regionFullLifeFire: 0, regionIgniteDuration: 0, regionIgnitedDamage: 0, regionFrozenCritDamage: 0, regionShatter: 0,
        regionChillOnHit: 0, regionChilledAttackerDR: 0
    };
}

// Bucket shape is the source for direct additions. Oxygen uses its separate resource rules.
const DIRECT_STAT_BUCKET_KEYS = new Set(Object.keys(createEmptyStatBucket())
    .filter(key => key !== 'oxygenMax' && key !== 'oxygenRegen'));

const COMPOSITE_STAT_BUCKET_LINES = Object.freeze({
    resAll: [['resF', 1, 0], ['resC', 1, 0], ['resL', 1, 0]],
    moveEvasion: [['move', 1, 0], ['evasionPct', 1, 0]],
    hpArmor: [['flatHp', 1, 0], ['armor', 2, 0]],
    aspdMove: [['aspd', 1, 0], ['move', 1, 0]],
    chaosResElemPenalty: [['resChaos', 1, 0], ['resF', -1, 0], ['resC', -1, 0], ['resL', -1, 0]],
    deflectMajor: [['deflectChance', 1, 0], ['deflectDamageReduce', 0, 3]],
    targetCount: [['targetAny', 1, 0]]
});

function addStatToBucket(bucket, statId, value) {
    value = Number(value);
    if (typeof statId !== 'string' || !Number.isFinite(value)) return;
    if (DIRECT_STAT_BUCKET_KEYS.has(statId)) { bucket[statId] += value; return; }
    if (!Object.hasOwn(COMPOSITE_STAT_BUCKET_LINES, statId)) return;
    for (const [key, multiplier, flat] of COMPOSITE_STAT_BUCKET_LINES[statId]) {
        bucket[key] += value * multiplier + flat;
    }
}

/** A passive line. A weapon line (WEAPON_CONDITION_STATS) counts as its base stat only while that stance is held. */
function addPassiveLineToBucket(bucket, statId, value, stance, weaponConditions) {
    const weaponLine = weaponConditions[statId];
    if (!weaponLine) addStatToBucket(bucket, statId, value);
    else if (weaponLine.stance === stance) addStatToBucket(bucket, weaponLine.stat, value);
}

function applyStatsToBucket(bucket, stats) {
    (stats || []).forEach(stat => {
        if (!stat) return;
        addStatToBucket(bucket, stat.id, stat.val);
        // 복합 옵션(한 줄에 두 스탯)은 추가 스탯도 함께 합산한다.
        if (Array.isArray(stat.extraStats)) stat.extraStats.forEach(extra => { if (extra) addStatToBucket(bucket, extra.id, extra.val); });
    });
}

function getTaggedDamageBreakdown(bucket, skill) {
    let tags = new Set(skill.tags || []);   // 장비로 붙는 태그는 호출부에서 계산한다.
    let randomElementPool = Array.isArray(skill.randomElementPool) ? skill.randomElementPool.map(ele => { let key = String(ele || '').toLowerCase(); return key === 'lightning' || key === 'thunder' ? 'light' : key; }).filter(Boolean) : [];
    let isRandomElementSkill = randomElementPool.length > 0;
    let parts = [];
    let total = 0;
    Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).forEach(tag => {
        if (isRandomElementSkill && ['fire', 'cold', 'lightning'].includes(tag)) return;
        let statId = TAGGED_DAMAGE_STAT_BY_TAG[tag];
        let value = bucket[statId] || 0;
        if (!value || !tags.has(tag)) return;
        total += value;
        parts.push({ tag: tag, statId: statId, value: value });
    });
    return { total: total, parts: parts };
}

// Seven player sources, with their original left-to-right addition and no early clamp.
function sumOrderedPlayerStatSources(input, stat) {
    return (input.gearBase[stat] || 0) + (input.gearExplicit[stat] || 0)
        + (input.passive[stat] || 0) + (input.season[stat] || 0) + (input.ascend[stat] || 0)
        + (input.support[stat] || 0) + (input.reward[stat] || 0);
}

export { TAGGED_DAMAGE_STAT_BY_TAG, createEmptyStatBucket, DIRECT_STAT_BUCKET_KEYS, COMPOSITE_STAT_BUCKET_LINES, addStatToBucket, addPassiveLineToBucket, applyStatsToBucket, getTaggedDamageBreakdown, sumOrderedPlayerStatSources };
