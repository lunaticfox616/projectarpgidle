import { createCombatBuildStats } from './domain/combat-build-stats.mjs';

const build = createCombatBuildStats({
    seasonNode: id => getSeasonPassiveNodeDef(id), classTree: id => getClassTreeDef(id),
    keystoneActive: (id, owner) => hasKeystone(id, owner), keystoneClass: id => getAscendKeystoneOwnerClass(id),
    barkLayers: season => getWorldTreeBarkLayers(season), barkReach: owner => getWorldTreeBarkReach(owner),
    zone: id => getZone(id), jewelStats: item => getJewelStats(item),
    voidPassiveCount: (id, owner) => getTranscendentVoidPassiveCount(id, owner),
    get CLASS_KEYSTONE_DEFS() { return CLASS_KEYSTONE_DEFS; }, get WORLD_TREE_BARK() { return WORLD_TREE_BARK; },
    get LOOP_DEEP_STATS() { return LOOP_DEEP_STATS; }, get UNDERWORLD_RUNE_DB() { return UNDERWORLD_RUNE_DB; },
    get BASE_ITEM_DB() { return BASE_ITEM_DB; }, get colonyWards() { return typeof colonyWards === 'object' ? colonyWards : null; },
    get equipmentSockets() { return equipmentSockets; }, get stumpBox() { return stumpBox; }
});

// These two legacy sources still read the current game. Keep them at the adapter boundary until passive/talent ownership moves.
const pushBuildKeystoneUniqueEffects = (target, owner = game) => {
    const talent = typeof getActiveTalentKeystoneUniqueEffects === 'function' ? getActiveTalentKeystoneUniqueEffects() : [];
    return build.pushBuildKeystoneUniqueEffects(target, owner, talent);
};
const readRequirementAttributes = (buckets, owner) => {
    build.addConstellationBuffStat(buckets.reward, owner);
    if (typeof applyPassiveKeystoneBucketRules === 'function') applyPassiveKeystoneBucketRules(buckets);
    return build.readRequirementAttributes(buckets);
};

const accumulateCombatAscendStats = (bucket, ids, heroClass) => build.accumulateCombatAscendStats(bucket, ids, heroClass, game);
const accumulateCombatLoopStats = (bucket, loop, deep, season) => build.accumulateCombatLoopStats(bucket, loop, deep, season, game);
const accumulateWorldTreeBarkStats = (bucket, season) => build.accumulateWorldTreeBarkStats(bucket, season, game);
const isWorldTreeBarkZone = (zone, owner = game) => build.isWorldTreeBarkZone(zone, owner);
const getWorldTreeBarkEffect = (owner = game) => build.getWorldTreeBarkEffect(owner);
const getSocketJewelMultiplier = (owner = game) => build.getSocketJewelMultiplier(owner);
const getCombatEquipmentContributions = (sources, excluded, owner = game) => build.getCombatEquipmentContributions(sources, excluded, owner, getBackgroundBuildMemo(owner));

const { accumulateCombatSeasonStats, forEachActiveKeystoneDef, mergeBetterUniqueParams, getLoopDeepMorePct,
    accumulateCombatRuneStats, getBonusResonancePower, addConstellationBuffStat, addGlobalDefensePct, getAbyssJewelMultiplier } = build;

safeExposeGlobals({ accumulateCombatSeasonStats, accumulateCombatAscendStats, forEachActiveKeystoneDef, pushBuildKeystoneUniqueEffects,
    mergeBetterUniqueParams, accumulateCombatLoopStats, accumulateWorldTreeBarkStats, isWorldTreeBarkZone, getWorldTreeBarkEffect,
    getLoopDeepMorePct, accumulateCombatRuneStats, getBonusResonancePower, addConstellationBuffStat, readRequirementAttributes,
    getCombatEquipmentContributions, getSocketJewelMultiplier, addGlobalDefensePct, getAbyssJewelMultiplier });
