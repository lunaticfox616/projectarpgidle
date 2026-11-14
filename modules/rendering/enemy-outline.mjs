export function getEnemyOutlineStyle(enemy, palette) {
    // 보스 변이체(js/boss-variants.js)는 그 변이의 색 테.
    if (enemy.isBoss) return enemy.variantOutline ? { ...palette.boss, color: enemy.variantOutline } : palette.boss;
    // 잿불 터 무리(data/atlas.js encounters outline): 일반 몬스터의 테를 잿불 색으로. 정예는 특성 색을 지킨다.
    if (!enemy.isElite) return enemy.encounterOutline ? { ...palette.enemy, color: enemy.encounterOutline } : palette.enemy;
    const color = enemy.traitOutlineColor || (enemy.trait && enemy.trait.outlineColor) || palette.elite.color;
    return { ...palette.elite, color };
}
