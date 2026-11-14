import { buildEnemyBonus, buildBoundaryMul, buildFromLoopOn, buildByEnemyRank, buildEnemyRewardMul, buildGetTierDropMulWithCaps } from '../domain/enemy-spawn-bonuses.mjs';

/** The new monster's record, its fields in their fixed order. */
export function buildBuildEnemyRecord(env, zone, marker, spawn) {
    const { look, mods, defence, rolled } = spawn;
    const pressure = buildGetEnemyPressureRecord(env, zone, mods.cosmosMods, spawn);
    const guards = buildGetEnemyGuardRecord(env, look.trait, mods.cosmosMods, spawn.isBoss);
    return {
        ...buildGetEnemyIdentityRecord(env, marker, spawn),
        ele: spawn.enemyEle,
        ...buildGetEnemyResistRecord(defence, look.trait, spawn.abyssScale, look.wispDefense),
        armor: defence.baseArmor,
        evasion: defence.baseEvasion,
        ...buildGetEnemyOffenceRecord(env, zone, mods, spawn),
        regenRate: pressure.regenRate,
        regenSuppressPct: 0,
        penetration: pressure.penetration,
        resistanceReduction: pressure.resistanceReduction,
        hybridElement: rolled.hybridElement,
        ailmentChance: pressure.ailmentChance,
        firstHitGuard: guards.firstHitGuard,
        hitRateGuard: guards.hitRateGuard,
        recentHitsTaken: 0,
        recentHitsTimer: 0,
        patternMode: rolled.patternMode,
        patternAttackCount: 0,
        nextPatternState: null,
        patternTelegraphKey: null,
        patternTelegraphStartedAt: 0,
        ...buildGetEnemyCapRecord(zone),
        ...buildGetEnemyTraitRecord(look.trait, spawn.isElite),
        ...buildGetEnemyRewardRecord(env, zone, mods),
        isSky: spawn.isSky
    };
}

/** The record's head: the next id, level, life, name, rank, boss art, spawn place, swing rhythm and look. */
export function buildGetEnemyIdentityRecord(env, marker, spawn) {
    const { look } = spawn;
    return {
        id: env.owner.nextEnemyId++,
        level: spawn.level,
        hp: spawn.hp,
        maxHp: spawn.hp,
        name: spawn.name,
        isElite: spawn.isElite,
        isBoss: spawn.isBoss,
        bossAssetKey: look.bossAssetKey,
        bossVisualTint: look.chaosBossVisual ? look.chaosBossVisual.tint : null,
        attackTimer: (((spawn.zoneSeed + 1) * 13 + (marker.at || 0) * 3 + spawn.groupIndex * 7) % 10) / 20,
        spawnAt: marker.at,
        groupIndex: spawn.groupIndex,
        variantSeed: spawn.variantSeed,
        spriteVariantId: look.monsterVariant ? look.monsterVariant.id : null,
        monsterArchetype: look.wispVisual ? 'wisp' : null,
        monsterVisualSetId: look.realmVisualSet ? look.realmVisualSet.id : null,
        monsterVisualId: look.bossVisualId || (look.realmVisual ? look.realmVisual.id : null),
        baseMonsterName: look.realmVisual ? look.realmVisual.name : (look.monsterVariant ? look.monsterVariant.name : null)
    };
}

/** Damage reduction and the four resistances: the defence bases, the trait's, the abyss bonus (resistances) and wisp defenses,
 * capped at 90 and 95. */
export function buildGetEnemyResistRecord(defence, trait, abyssScale, wispDefense) {
    const res = (base, key) => Math.min(95, base + buildEnemyBonus(trait, key) + (abyssScale.resistBonus || 0) + wispDefense[key]);
    return {
        dr: Math.min(90, Math.max(0, defence.drBase + buildEnemyBonus(trait, 'dr') + wispDefense.dr)),
        resF: res(defence.resistBases.resF, 'resF'),
        resC: res(defence.resistBases.resC, 'resC'),
        resL: res(defence.resistBases.resL, 'resL'),
        resChaos: res(defence.chaosResBase, 'resChaos')
    };
}

/** Attack and damage scales, swing rhythm and crit chance (from loop 2 a base by rank) from the trait, the cosmos modifiers,
 * the exclusive trait, the woodsman, the map and the boundary. */
export function buildGetEnemyOffenceRecord(env, zone, mods, spawn) {
    const { trait, cosmosMods, cosmosExclusiveTrait } = mods;
    const woodsman = zone.type === 'outsideChaos';
    const guardEscort = zone.type === 'cosmos' && zone.cosmosHabitat === 'guard' && spawn.isElite && spawn.look.realmVisual?.id === 'cosmos-ooze';
    // Replaces the former ranged windup with slower charge, without changing movement or damage per hit.
    const escortAttackSpeed = guardEscort ? env.deps.COSMOS_ROUTE_G1.habitats.guard.escortAttackSpeed : 1;
    return {
        atkMul: buildEnemyBonus(trait, 'atkMul', 1) * buildEnemyBonus(cosmosMods, 'atkMul', 1) * buildEnemyBonus(cosmosExclusiveTrait, 'atkMul', 1),
        damageMul: (zone.mapDamageMul || 1) * (woodsman ? 2 : 1) * buildEnemyBonus(cosmosMods, 'damageMul', 1) * buildEnemyBonus(cosmosExclusiveTrait, 'damageMul', 1) * buildBoundaryMul(zone, 'boundaryDamageMul'),
        attackSpeedVar: (0.85 + (((spawn.variantSeed % 11) / 10) * 0.5)) * buildEnemyBonus(trait, 'attackSpeedVarMul', 1) * (woodsman ? 1.5 : 1) * buildEnemyBonus(cosmosMods, 'attackSpeedMul', 1) * buildEnemyBonus(cosmosExclusiveTrait, 'attackSpeedVarMul', 1) * buildBoundaryMul(zone, 'boundaryAttackSpeedMul') * escortAttackSpeed,
        critChance: buildFromLoopOn(env, 2, buildByEnemyRank(spawn, [16, 10, 4])) + buildEnemyBonus(trait, 'critChanceBonus') + buildEnemyBonus(cosmosMods, 'critChanceBonus') + buildEnemyBonus(cosmosExclusiveTrait, 'critChanceBonus')
    };
}

/** Regeneration (from loop 3; the woodsman's a tenth), resistance pressure (from loop 4; deep chaos lowers resistance instead of
 * piercing it) and the ailment chance (from loop 4). */
export function buildGetEnemyPressureRecord(env, zone, cosmosMods, rank) {
    const regenMul = ((zone.type === 'outsideChaos' && rank.isBoss) ? 0.1 : 1) * buildEnemyBonus(cosmosMods, 'regenMul', 1);
    const baselineResistancePressure = buildFromLoopOn(env, 4, buildByEnemyRank(rank, [14, 8, 3]));
    const isDeepChaos = zone.type === 'abyss';
    return {
        regenRate: Math.max(buildFromLoopOn(env, 3, buildByEnemyRank(rank, [0.004, 0.0022, 0.0012])) * 0.12 * regenMul, Number(zone.boundaryRegenRate) || 0),
        penetration: (isDeepChaos ? 0 : baselineResistancePressure) + buildEnemyBonus(cosmosMods, 'penetration'),
        resistanceReduction: isDeepChaos ? baselineResistancePressure : 0,
        ailmentChance: buildFromLoopOn(env, 4, buildByEnemyRank(rank, [0.14, 0.08, 0.03])) + buildEnemyBonus(cosmosMods, 'ailmentChanceBonus')
    };
}

/** From loop 5 the first-hit guard (a boss's 0.75, else the trait's) and the hit rate guard. */
export function buildGetEnemyGuardRecord(env, trait, cosmosMods, isBoss) {
    return {
        firstHitGuard: Math.max(buildFromLoopOn(env, 5, isBoss ? 0.75 : ((trait && trait.firstHitGuard) || 0)), buildEnemyBonus(cosmosMods, 'firstHitGuard')),
        hitRateGuard: buildFromLoopOn(env, 5, (trait && trait.hitRateGuard) || (isBoss ? 0.06 : 0))
    };
}

/** The woodsman, 아스트라 and milestone pinnacles take no execute and no life-scaled damage. */
export function buildGetEnemyCapRecord(zone) {
    const capped = zone.type === 'outsideChaos' || zone.id === 'cosmos_astra' || !!zone.milestonePinnacle;
    return { disableExecute: capped, disableHpScaleDamage: capped };
}

export function buildGetEnemyTraitRecord(trait, isElite) {
    return {
        trait: trait ? { ...trait } : null,
        traitName: trait ? trait.name : null,
        traitOutlineColor: isElite && trait ? trait.outlineColor || '#e2b94f' : null,
        leechEffMul: trait && Number.isFinite(trait.leechEffMul) ? Math.max(0, trait.leechEffMul) : 1
    };
}

export function buildGetEnemyRewardRecord(env, zone, mods) {
    const reward = buildBoundaryMul(zone, 'boundaryRewardMul') * env.deps.loopMutation.rewardMul(zone);
    return {
        expMul: buildEnemyRewardMul(mods.trait, 'expMul') * buildEnemyRewardMul(mods.cosmosExclusiveTrait, 'expMul') * reward,
        dropMul: buildEnemyRewardMul(mods.trait, 'dropMul') * buildEnemyRewardMul(mods.cosmosExclusiveTrait, 'dropMul') * buildGetTierDropMulWithCaps(zone.tier, zone) * reward
    };
}
