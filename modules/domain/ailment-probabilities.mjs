

export function effectGetAilmentTypeFromElement(ele) {
    if (ele === 'fire') return 'ignite';
    if (ele === 'cold') return 'chill';
    if (ele === 'light') return 'shock';
    if (ele === 'chaos') return 'poison';
    return 'bleed';
}

const ailmentChanceTypes = /* @__PURE__ */ Object.freeze(['ignite', 'chill', 'freeze', 'shock', 'poison', 'bleed']);

export function effectGetPlayerAilmentChance(pStats, type) {
    const base = ailmentChanceTypes.includes(type) ? (pStats[type + 'Chance'] || 0) : 0;
    return Math.max(0, Math.min(1, base / 100));
}

export function effectGetPassiveBleedMultiplier(pStats) {
    return pStats?.passiveKeystoneFlags?.bloodCradle ? 0.7 : 1;
}

export function effectGetPlayerAilmentProcChance(pStats, type, isCrit, forcedChance) {
    const multiplier = type === 'bleed' ? effectGetPassiveBleedMultiplier(pStats) : 1;
    const base = Number.isFinite(forcedChance) ? forcedChance * multiplier : effectGetPlayerAilmentChance(pStats, type);
    const supportChance = type === 'ignite' ? (pStats.sSkill?.supportEffects?.ignite?.chancePct || 0) / 100 : 0;
    return Math.max(0, Math.min(1, base + supportChance + (isCrit ? 0.25 * multiplier : 0)));
}

export function effectGetFreezeApplyChanceFromHitRatio(hitRatio, enemyMaxHp) {
    let ratio = Math.max(0, Number(hitRatio) || 0);
    let hp = Math.max(1, Number(enemyMaxHp) || 1);
    let hpFactor = Math.max(0.18, 1 / Math.log10(hp + 10));
    return Math.max(0.01, Math.min(0.7, ratio * 1.8 * hpFactor));
}
