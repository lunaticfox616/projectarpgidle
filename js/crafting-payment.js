/**
 * Read the actual payment source; growth recipes cannot be used on equipment or slabs.
 * @param {string} action Currency action identifier.
 * @param {{growthBaseId?: string, growthCategory?: string, rarity?: string, corrupted?: boolean}} item Selected crafting target.
 * @param {'growthEssence'|undefined} source Omitted for ordinary currency crafting.
 * @returns {{key: string, cost: number, have: number, affordable: boolean}|null}
 */
function getCraftPayment(action, item, source) {
    let key = action, cost = 1;
    if (source !== undefined) {
        if (source !== 'growthEssence' || !isGrowthItem(item) || isGrowthSlab(item)) return null;
        if (item.corrupted || item.rarity === 'unique') return null;
        const recipe = GROWTH_CRAFT_ACTIONS.find(row => row.key === action);
        if (!recipe) return null;
        key = source; cost = recipe.cost;
    }
    const have = game.currencies[key] || 0;
    return {key, cost, have, affordable: have >= cost};
}
safeExposeGlobals({getCraftPayment});
