const roundForgeValue = value => Math.round(value * 100) / 100;

/** Read-only enhancement effects. The record's level is bounded before indexing the shared tables. */
export function forgeRuneEffects(rules, record) {
    const level = Math.min(rules.maxLevel, Math.max(0, Math.floor(Number(record?.enhanceLevel) || 0)));
    const reached = table => table.reduce((total, [at, value]) => (level >= at ? value : total), 0);
    return { damage: 1 + reached(rules.damageMoreAt) / 100, speed: 1 + reached(rules.speedMoreAt) / 100,
        damageInc: rules.damageIncPct[level], speedInc: reached(rules.speedIncAt),
        levels: rules.runeLevelAt.filter(at => level >= at).length };
}

export function forgeRuneTier(rules, level) { return rules.tiers.filter(at => level >= at).length; }

export function forgeRuneEffectText(rules, translate, level) {
    if (level <= 0) return '강화 효과 없음';
    const { damage, speed, damageInc, speedInc, levels } = forgeRuneEffects(rules, { enhanceLevel: level });
    const percent = mul => Math.round((mul - 1) * 100);
    return [translate('피해 {damageInc}% 증가', { damageInc }),
        speedInc ? translate('공격/시전 속도 {speedInc}% 증가', { speedInc }) : '',
        damage > 1 ? translate('피해 {damage}% 증폭', { damage: percent(damage) }) : '',
        speed > 1 ? translate('공격/시전 속도 {speed}% 증폭', { speed: percent(speed) }) : '',
        levels ? translate('룬 레벨 +{levels}', { levels }) : ''].filter(Boolean).join(', ');
}

function forgePity(rules, level, failures) {
    return Math.min(failures * rules.pityStepOfBase, rules.pityMaxOfBase) * rules.successPct[level];
}

/** Probability percentages, before the attempt consumes either currency or randomness. */
export function forgeRuneOdds(rules, { level, failures, coresUsed, timed }) {
    const pityBonus = roundForgeValue(forgePity(rules, level, failures)), coreBonus = coresUsed * rules.boosterPct;
    const before = Math.min(100, rules.successPct[level] + pityBonus + coreBonus);
    const chance = roundForgeValue(Math.min(100, before * (timed ? rules.timing.mul : 1)));
    return { pityBonus, coreBonus, timingBonus: roundForgeValue(chance - before), chance,
        destroy: roundForgeValue(Math.min(rules.destroyPct[level], 100 - chance)),
        nextPityGain: roundForgeValue(Math.min(100 - chance, forgePity(rules, level, failures + 1) - forgePity(rules, level, failures))) };
}

export const FINISHED_FORGE_ODDS = Object.freeze({ pityBonus: 0, coreBonus: 0, timingBonus: 0, chance: 100, destroy: 0, nextPityGain: 0 });
