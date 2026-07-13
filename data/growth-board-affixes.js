const GROWTH_CATEGORY_LEGACY_SLOTS = {
    flower: ['무기'],
    branch: ['갑옷','투구','장갑','신발','방패','허리띠'],
    leaf: ['목걸이','반지']
};

const GROWTH_RARITY_AFFIX_LIMITS = {
    normal: { min: 0, max: 0 },
    magic: { min: 1, max: 2 },
    rare: { min: 2, max: 4 },
    unique: { min: 0, max: 0 }
};

function getGrowthAffixLimit(size, rarity) {
    if (rarity !== 'rare') return (GROWTH_RARITY_AFFIX_LIMITS[rarity] || { max: 0 }).max;
    if (size >= 7) return 4;
    if (size >= 5) return 3;
    if (size >= 3) return 2;
    return 1;
}

safeExposeData({ GROWTH_CATEGORY_LEGACY_SLOTS, GROWTH_RARITY_AFFIX_LIMITS, getGrowthAffixLimit });
