/**
 * What one use of a crafting currency costs: one of that currency.
 * @param {string} action Currency action identifier.
 * @returns {{key: string, cost: number, have: number, affordable: boolean}}
 */
function getCraftPayment(action) {
    const have = game.currencies[action] || 0;
    return {key: action, cost: 1, have, affordable: have >= 1};
}
safeExposeGlobals({getCraftPayment});
