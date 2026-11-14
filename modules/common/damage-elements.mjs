export function getAilmentDisplayLabel(type) {
    let labels = { ignite: '점화', chill: '냉각', freeze: '동결', shock: '감전', poison: '중독', bleed: '출혈', flameDecay: '화염 부패' };
    return labels[type] || type || '알 수 없음';
}

export function normalizeDamageElementKey(labels, ele) {
    let key = typeof ele === 'string' ? ele : '';
    if (labels[key]) return key;
    return key ? 'other' : 'phys';
}

export function getElementColor(labels, ele) {
    let key = normalizeDamageElementKey(labels, ele);
    if (key === 'fire') return '#ff8d4b';
    if (key === 'cold') return '#7fe0ff';
    if (key === 'light') return '#ffe16b';
    if (key === 'chaos') return '#b97dff';
    if (key === 'other') return '#8eaeca';
    return '#f2d29a';
}

export function getDamageElementLabel(labels, translate, ele) {
    return translate(labels[normalizeDamageElementKey(labels, ele)] || labels.phys);
}

export function getDamageElementIcon(labels, icons, ele) {
    return icons[normalizeDamageElementKey(labels, ele)] || icons.phys;
}
