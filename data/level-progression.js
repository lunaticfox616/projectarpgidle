// Level is separate from content difficulty tier and equipment affix tier.
const LEVEL_PROGRESSION = Object.freeze({
    tierAnchors: Object.freeze([[1,1], [7,25], [20,77], [60,137]]),
    experiencePerKill: 0.06,
    loopExperienceBase: 1, loopExperiencePerLoop: 0.05, loopExperienceBonusCap: 2,
    experienceGap: 5, experienceDecay: 0.10,
    lootGap: 10, lootDecay: 0.085,
    equipmentLevelDiscount: 8,
    // Base reqTier 1..22, not rolled affix tier. Early bases stay accessible; late bases need investment.
    attributeRequirements: Object.freeze([0, 0, 6, 10, 15, 21, 28, 36, 44, 52, 61, 70, 78, 86, 94, 102, 110, 117, 124, 130, 135, 140]),
    // Entry tickets and deterministic completion rewards do not enter this list.
    ordinaryCurrencies: Object.freeze(['magicBud','formlessDew','blightSpore','goldenRule','fairyRing','sapBud',
        'ouroboros','pruningShears','abyssCatalyst','skyEssence','emberBranch','jewelShard','sealShard',
        'strongSealShard','radiantSealShard','blessing','fossil','fossilBulwark','fossilWedge','fossilOld',
        'fossilRift','deepWhetstone','rootIron','jewelPolish','runeShard','blurred45','underCopper','underSilver','underGold','bossCore'])
});
