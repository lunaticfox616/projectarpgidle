// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
/**
 * What one use of a crafting currency costs: one of that currency.
 * @param {string} action Currency action identifier.
 * @returns {{key: string, cost: number, have: number, affordable: boolean}}
 */
function getCraftPayment(action) {
    const have = game.currencies[action] || 0;
    return {key: action, cost: 1, have, affordable: have >= 1};
}

exposeFileGlobals({ getCraftPayment });
})();
safeExposeGlobals({getCraftPayment});
