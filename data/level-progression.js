// Level is separate from content difficulty tier and equipment affix tier.
const LEVEL_PROGRESSION = Object.freeze({
    tierAnchors: Object.freeze([[1,1], [7,25], [20,77], [60,137]]),
    experiencePerKill: 0.06,
    loopExperienceBase: 1, loopExperiencePerLoop: 0.05, loopExperienceBonusCap: 2,
    experienceGap: 5, experienceDecay: 0.10,
    lootGap: 10, lootDecay: 0.085,
    equipmentLevelDiscount: 8,
    attributeStartTier: 3, attributeBase: 6, attributePerTier: 2.8,
    // Entry tickets and deterministic completion rewards do not enter this list.
    ordinaryCurrencies: Object.freeze(['magicBud','formlessDew','blightSpore','goldenRule','fairyRing','sapBud',
        'ouroboros','pruningShears','abyssCatalyst','skyEssence','emberBranch','jewelShard','sealShard',
        'strongSealShard','radiantSealShard','blessing','fossil','fossilBulwark','fossilWedge','fossilOld',
        'fossilRift','deepWhetstone','rootIron','jewelPolish','runeShard','blurred45','underCopper','underSilver','underGold','bossCore'])
});
