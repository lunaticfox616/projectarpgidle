export function getDamageTextFillColor(text) {
    if (text.miss) return text.color || '#c4e2ff';
    if (text.dot) return dotTextColor(text.dotType);
    if (text.deflected) return '#b7c8c5';
    if (text.enemyHit) return '#ff9a9a';
    if (text.impactTier === 'annihilate') return '#fff1b0';
    if (text.crit || text.impactTier === 'heavy') return '#ffdc75';
    return '#ffffff';
}

function dotTextColor(type) {
    if (type === 'fire') return '#ff9f43';
    if (type === 'chaos') return '#c56cff';
    if (type === 'phys') return '#ff6b6b';
    return '#b57cff';
}

export function isStrongDamageText(text) {
    return !text.bodyCue && !text.miss && (text.crit || text.impactTier === 'heavy' || text.impactTier === 'annihilate');
}

export function getDamageTextPeakAlpha(text) {
    return text.enemyHit || text.miss || text.bodyCue || isStrongDamageText(text) ? 1 : 0.9;
}
