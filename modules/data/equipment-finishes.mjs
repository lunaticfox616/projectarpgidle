// The finished material, including its variant, is the only currency paid at the bench.
const elements = { physical: '물리', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스' };
export const finishBooks = {
    doubleCut: { rune: '이중 베기', stat: 'artDoubleCut', label: '이중 베기의 두 번째 타격 피해' },
    slam: { rune: '강타', stat: 'artAftershock', label: '강타의 여진 피해' }
};
export const finishRules = /* @__PURE__ */ (() => ({
    transferStone: { name: '분갈이', unlock: 'fossilRestore', variants: {plain: '전이석'} },
    artManual: { name: '비기 각인', unlock: 'gemForge', variants: {doubleCut:finishBooks.doubleCut.rune, slam:finishBooks.slam.rune} },
    balanceWeight: { name: '천칭 제련', unlock: 'underworld', variants: {...elements, life: '생명력', defense: '방어', speed: '속도', crit: '치명타', resistance: '저항'} },
    wardCord: { name: '금줄', unlock: 'stump', variants: elements }
}))();
export const finishKeys = /* @__PURE__ */ Object.keys(finishRules);
export function finishWalletKey(key, variant) {
    return key === 'transferStone' ? key : key + '_' + variant;
}
export function finishHeld(wallet, key, variant = '') {
    if (!Object.hasOwn(finishRules, key)) return wallet[key] || 0;
    const variants = variant ? [variant] : Object.keys(finishRules[key].variants);
    return variants.reduce((total, id) => total + (Number(wallet[finishWalletKey(key, id)]) || 0), 0);
}
export function finishIngredients(key, variant) {
    if (key === 'transferStone') return [['fossil', 10], ['sealShard', 1]];
    if (key === 'artManual') return [['bossCore', 1]];
    if (key === 'balanceWeight') return [['underSilver', 3]];
    return [[{physical:'catalystPhys',fire:'catalystFire',cold:'catalystCold',light:'catalystLight',chaos:'catalystChaos'}[variant], 1]];
}
export function cordTag(stat) {
    return stat?.craftSource === 'wardCord' && stat.id === 'wardCraftBlock' && Object.hasOwn(elements, stat.finishVariant) ? stat.finishVariant : '';
}

export function finishEffectText(stat, translate) {
    const tag = cordTag(stat);
    if (tag) return translate('기본 재화로 옵션 추가 시 {element} 옵션 제외',{element:translate(elements[tag])});
    if (stat.craftSource !== 'artManual') return '';
    const book = Object.values(finishBooks).find(def => def.stat === stat.id);
    return book ? translate('{effect} +{value}%', {effect:translate(book.label),value:stat.val}) : '';
}
