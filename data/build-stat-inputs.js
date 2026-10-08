// Shared persistent stat dependencies for equipment analysis and requirement evaluation.
const BUILD_STAT_FIELDS = [
    'inventory', 'equipment', 'level', 'season', 'loopCount', 'maxZoneId',
    'selectedHeroId', 'selectedClassId', 'ascendClass', 'ascendNodes', 'ascendKeystones', 'cosmosTwinKeystones',
    'passives', 'voidPassives', 'passiveAttributePreference', 'passiveAttributeChoices',
    'passiveStarEvolution', 'seasonNodes', 'seasonNodeLevels', 'loop10BonusStats', 'loopDeepStats',
    'actRewardBonuses', 'journalBonuses', 'journalEntries', 'activeSkill', 'mobilitySkill', 'skills', 'supports',
    'equippedSupports', 'equippedSummonSkills', 'summonSkillCounts', 'gemData', 'supportGemData',
    'skillAutoRules',
    'sealedSkills', 'sealedSupports', 'resonancePower', 'skyGemEnhancements',
    'underworldRunes', 'talentCards', 'talentCardLoadout', 'bloomedClasses',
    'bloomedClassThisLoop', 'bloomedTalentThisLoop', 'uniqueCodex', 'contentProgression', 'stumpBox'
];
const BUILD_STAT_PARTS = {
    passiveSpecialization: ['revelation', 'keystoneChoices'],
    meteorSite: ['constellationBuff'],
    cores: ['equipped'],
    beyondBoundary: ['seals'], colony: ['wardEquipped', 'wardSlots'],
    cosmosAtlas: ['mastery', 'equippedStones', 'equippedStoneGalaxy', 'bossStoneOptions'],
    chaosRealm: ['permanentBonuses'],
    skyTower: ['skyStone', 'gemBoosts'], ocean: ['permanentUpgrades']
};
// Other game fields the stat calculation reads, with the reason each is not a build field. They are part of a kept calculation's
// context (js/player-stat-cache.js), so a change is seen on the next call. Values that change during a fight go through
// playerStatTick instead. scripts/smoke-player-stat-cache.js fails when the calculation reads a field missing from these lists.
const PLAYER_STAT_CONTEXT_FIELDS = Object.freeze({
    currentZoneId: 'the zone the hero fights in', labyrinthFloor: 'zone floor', timeRift: 'zone tier', underworldProgress: 'zone floor',
    completedTrials: 'trials shape the ascendancy tree', weaponMastery: 'mastery levels add damage'
});
// game fields the stat calculation may write: shape normalization, or a value made from the build that is the same on every call
// for the same build. A kept calculation skips these writes; anything that must happen on every call belongs in finishPlayerStats.
const PLAYER_STAT_DERIVED_WRITES = Object.freeze(['activeSkill', 'chaosRealm', 'cosmosTwinKeystones', 'equippedSummonSkills', 'gemData',
    'ocean', 'oceanOxygenDrainReductionPct', 'oceanOxygenMaxBonus', 'passiveSpecialization', 'skyGemEnhancements', 'skyTower',
    'summonSkillCounts', 'supportGemData', 'timeRift', 'voidPassives']);
// Every this many kept answers, a calculation is compared with a fresh one; a difference is repaired at once and reported.
const PLAYER_STAT_SELF_CHECK_ANSWERS = 64;
