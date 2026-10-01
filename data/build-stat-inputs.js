// Shared persistent stat dependencies for equipment analysis and requirement evaluation.
const BUILD_STAT_FIELDS = [
    'inventory', 'equipment', 'level', 'season', 'loopCount', 'maxZoneId',
    'selectedHeroId', 'selectedClassId', 'ascendClass', 'ascendNodes', 'ascendKeystones',
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
