

export function refineGetCosmosBossRelicStatTotals(owner) {
    let atlas = (owner && owner.cosmosAtlas) || {};
    let equipped = (atlas.equippedStones && typeof atlas.equippedStones === 'object') ? atlas.equippedStones : {};
    let legacyEquippedGalaxy = Math.max(0, Math.min(6, Math.floor(atlas.equippedStoneGalaxy || 0)));
    let optionsByGalaxy = (atlas.bossStoneOptions && typeof atlas.bossStoneOptions === 'object') ? atlas.bossStoneOptions : {};
    let totals = {};
    Object.keys(optionsByGalaxy).forEach(galaxyKey => {
        let galaxy = Math.max(1, Math.min(6, Math.floor(Number(galaxyKey) || 0)));
        let isEquipped = !!equipped[galaxyKey] || (Object.keys(equipped).length === 0 && legacyEquippedGalaxy >= galaxy);
        if (!isEquipped) return;
        (Array.isArray(optionsByGalaxy[galaxyKey]) ? optionsByGalaxy[galaxyKey] : []).forEach(option => {
            if (!option || !option.stat) return;
            totals[option.stat] = (totals[option.stat] || 0) + Number(option.value || 0);
        });
    });
    return totals;
}
