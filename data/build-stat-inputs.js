// Shared persistent stat dependencies for equipment analysis and requirement evaluation.
const BUILD_STAT_FIELDS = [
    'inventory', 'equipment', 'level', 'season', 'loopCount', 'maxZoneId',
    'selectedHeroId', 'selectedClassId', 'ascendClass', 'ascendNodes', 'ascendKeystones',
    'passives', 'voidPassives', 'passiveAttributePreference', 'passiveAttributeChoices',
    'passiveStarEvolution', 'seasonNodes', 'seasonNodeLevels', 'loop10BonusStats', 'loopDeepStats',
    'actRewardBonuses', 'journalBonuses', 'journalEntries', 'activeSkill', 'mobilitySkill', 'skills', 'supports',
    'equippedSupports', 'equippedSummonSkills', 'summonSkillCounts', 'gemData', 'supportGemData',
    'skillAutoRules', 'conditionGemLevels', 'conditionGemPool',
    'sealedSkills', 'sealedSupports', 'resonancePower', 'skyGemEnhancements',
    'jewelSlots', 'jewelSlotAmplify', 'growthBoard', 'growthInventory',
    'talismanBoard', 'talismanPlacements', 'talismanBoardUnlock', 'talismanUnlockedCells',
    'underworldRunes', 'talentCards', 'talentCardLoadout', 'bloomedClasses',
    'bloomedClassThisLoop', 'bloomedTalentThisLoop', 'uniqueCodex', 'contentProgression', 'stumpBox'
];
const BUILD_STAT_PARTS = {
    passiveSpecialization: ['revelation', 'keystoneChoices'],
    starWedge: ['wedges', 'sockets', 'nodeMutations', 'disabledNodeEffects', 'constellationBuff'],
    cores: ['equipped'],
    arcana: ['unlocked', 'cards', 'deckSlots', 'equipmentSlots'],
    pruningTree: ['unlocked', 'nodeRanks', 'prunedPenaltyRanks'],
    beyondBoundary: ['seals'], colony: ['wardEquipped', 'wardSlots'],
    cosmosAtlas: ['mastery', 'equippedStones', 'equippedStoneGalaxy', 'bossStoneOptions'],
    chaosRealm: ['permanentBonuses'],
    skyTower: ['skyStone', 'gemBoosts'], ocean: ['permanentUpgrades'],
    expertise: ['levels', 'nodes', 'favors'], flasks: ['healTier', 'qualityByKey']
};
