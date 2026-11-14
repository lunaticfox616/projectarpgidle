import { equipmentAffixGetRealmItemDropTierRange } from './equipment-affix-tiers.mjs';

export function equipmentAffixGetListedAffixTierRange(env, mod, tier) {
    const effectiveTier = Math.max(1, Math.min(mod.tierValues.length, Math.floor(Number(tier) || 1)));
    const range = mod.tierValues[effectiveTier - 1];
    let min = Array.isArray(range) ? Number(range[0]) : Number(range);
    let max = Array.isArray(range) ? Number(range[1]) : min;
    if (!Number.isFinite(min)) min = Number(mod.base) || 0;
    if (!Number.isFinite(max)) max = min;
    [min, max] = [Math.min(min, max), Math.max(min, max)];
    const step = mod.valueStep >= 1 ? mod.valueStep : equipmentAffixGetAffixRollStep(env, mod.statId || mod.id, [min, max]);
    [min, max] = equipmentAffixSnapAffixRange(min, max, step);
    return { min, max, step, tier: effectiveTier };
}

/** The step a listed option range rolls on (2026-10-27 사용자: 회피 같은 옵션은 정수로만, 저항 관통, 흡혈 캡, 공격 속도 같은 강한 옵션은
 * 소수 한 자리까지, "애초에 그 단위로만"): whole numbers for a WHOLE_ROLL_STAT_IDS stat or ranges of whole numbers, else 0.1. */
export function equipmentAffixGetAffixRollStep(env, statId, values) {
    return env.deps.WHOLE_ROLL_STAT_IDS.includes(statId) || values.every(Number.isInteger) ? 1 : 0.1;
}

/** [min, max] with each end on the nearest step (8.51 to 9.7 rolls 9 to 10 on whole steps): a narrow tier keeps some spread,
 * where cutting inward left one value per tier. */
export function equipmentAffixSnapAffixRange(min, max, step) {
    const onStep = value => Number((Math.round(value / step + 1e-9) * step).toFixed(1));
    const low = onStep(min);
    return [low, Math.max(low, onStep(max))];
}

/** One roll inside a base/step range from getAffixTierRange (0.1 or whole-number steps). */
export function equipmentAffixRollSteppedAffixValue(range) {
    if (range.step === 0.1) {
        const minStep = Math.round(range.min * 10);
        return (minStep + Math.floor(Math.random() * (Math.round(range.max * 10) - minStep + 1))) / 10;
    }
    return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
}

export function equipmentAffixRollTierValueAffix(env, mod, statId, tier) {
    const { min, max, step: valueStep, tier: effectiveTier } = equipmentAffixGetAffixTierRange(env, mod, statId, tier);
    const val = Number((min + Math.floor(Math.random() * (Math.round((max - min) / valueStep) + 1)) * valueStep).toFixed(2));
    return { id: statId, val, valMin: min, valMax: max, tier: effectiveTier, statName: mod.statName,
        valueStep, fixedValue: !!mod.fixedValue, sourceModId: mod.id, affixBalanceVersion: mod.affixBalanceVersion };
}

export function equipmentAffixRerollStoredAffixValue(env, stat) {
    let min = Number(stat && stat.valMin);
    let max = Number(stat && stat.valMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    if (max < min) { let tmp = min; min = max; max = tmp; }
    if (stat.valueStep) {
        // A line rolled before 2026-10-27 may carry 0.01 steps: it rerolls on the option's own step, inside its old range.
        const step = stat.valueStep >= 1 ? stat.valueStep : equipmentAffixGetAffixRollStep(env, stat.id, [min, max]);
        [min, max] = equipmentAffixSnapAffixRange(min, max, step);
        Object.assign(stat, { valMin: min, valMax: max, valueStep: step });
        stat.val = Number((min + Math.floor(Math.random() * (Math.round((max - min) / step) + 1)) * step).toFixed(2));
        return;
    }
    if (env.deps.isTenthStat(stat.id)) {
        let minStep = Math.round(min * 10);
        let maxStep = Math.round(max * 10);
        stat.val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
        return;
    }
    let minInt = Math.round(min);
    let maxInt = Math.round(max);
    stat.val = minInt + Math.floor(Math.random() * (maxInt - minInt + 1));
}

// 복합 옵션(한 줄에 두 스탯)을 위해, 주 스탯과 동일한 티어로 추가 스탯들을 굴린다.
export function equipmentAffixRollCompoundExtraStats(env, mod, tier, roundInteger) {
    if (!mod || !Array.isArray(mod.compound) || mod.compound.length === 0) return null;
    return mod.compound.map(sub => {
        let subId = sub.statId || sub.id;
        if (Array.isArray(sub.tierValues)) return equipmentAffixRollTierValueAffix(env, sub, subId, tier);
        const range = equipmentAffixGetAffixTierRange(env, sub, subId, tier, roundInteger);
        return { id: subId, val: equipmentAffixRollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier: tier, statName: sub.statName || env.deps.getStatName(subId) };
    });
}

export function equipmentAffixRollAffixValue(env, mod, maxTier, opts) {
    let roundInteger = !!(opts && opts.roundInteger);
    let statId = mod.statId || mod.id;
    let tier = 1;
    maxTier = env.deps.clampNumber(Math.floor(Number(maxTier) || 1), 1, 20);
    if (Array.isArray(mod.tierValues)) maxTier = Math.min(maxTier, mod.tierValues.length);
    while (tier < maxTier && Math.random() < 0.58) tier++;
    let result;
    if (Array.isArray(mod.tierValues)) {
        result = equipmentAffixRollTierValueAffix(env, mod, statId, tier);
    } else {
        const range = equipmentAffixGetAffixTierRange(env, mod, statId, tier, roundInteger);
        result = { id: statId, val: equipmentAffixRollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier: tier, statName: mod.statName, fixedValue: !!mod.fixedValue };
    }
    let extras = equipmentAffixRollCompoundExtraStats(env, mod, result.tier, roundInteger);
    if (extras) result.extraStats = extras;
    return result;
}

export function equipmentAffixPickTierInRangeWeighted(minTier, maxTier, tierWeightFalloff) {
    minTier = Math.max(1, Math.floor(minTier || 1));
    maxTier = Math.max(minTier, Math.floor(maxTier || minTier));
    let requestedFalloff = Number(tierWeightFalloff);
    let falloff = Number.isFinite(requestedFalloff) ? Math.max(0, requestedFalloff) : 0.85;
    let pool = [];
    for (let tier = minTier; tier <= maxTier; tier++) {
        let dist = tier - minTier;
        let weight = 1 / (1 + dist * falloff);
        pool.push({ tier: tier, weight: weight });
    }
    let total = pool.reduce((sum, row) => sum + row.weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
        if (roll < pool[i].weight) return pool[i].tier;
        roll -= pool[i].weight;
    }
    return pool[pool.length - 1].tier;
}

export function equipmentAffixRollRealmItemDropTier(env, zone, enemy) {
    const range = equipmentAffixGetRealmItemDropTierRange(env, zone, enemy);
    return equipmentAffixPickTierInRangeWeighted(range.min, range.max);
}

export function equipmentAffixRollAffixValueInTierRange(env, mod, minTier, maxTier, tierWeightFalloff) {
    let statId = mod.statId || mod.id;
    minTier = env.deps.clampNumber(Math.floor(Number(minTier) || 1), 1, 20);
    maxTier = env.deps.clampNumber(Math.floor(Number(maxTier) || minTier), minTier, 20);
    if (Array.isArray(mod.tierValues)) {
        maxTier = Math.min(maxTier, mod.tierValues.length);
        minTier = Math.min(minTier, maxTier);
    }
    let tier = equipmentAffixPickTierInRangeWeighted(minTier, maxTier, tierWeightFalloff);
    let result;
    if (Array.isArray(mod.tierValues)) {
        result = equipmentAffixRollTierValueAffix(env, mod, statId, tier);
    } else {
        const range = equipmentAffixGetAffixTierRange(env, mod, statId, tier);
        result = { id: statId, val: equipmentAffixRollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier: tier, statName: mod.statName, fixedValue: !!mod.fixedValue };
    }
    let extras = equipmentAffixRollCompoundExtraStats(env, mod, result.tier, false);
    if (extras) result.extraStats = extras;
    return result;
}

/**
 * The value range of one tier of an affix (or a compound line's sub-stat): tierValues rows as listed, otherwise
 * base + tier × step widened by 1.6 steps, on 0.1 steps for leech/regen lines and whole numbers for the rest.
 * @param {object} mod MOD_DB row or a compound sub-stat
 * @param {string} statId
 * @param {number} tier clamped to the tierValues length
 * @param {boolean} [roundInteger] round instead of floor whole-number ranges (crafting sources that ask for it)
 * @returns {{min: number, max: number, step: number, tier: number}}
 */
export function equipmentAffixGetAffixTierRange(env, mod, statId, tier, roundInteger = false) {
    if (Array.isArray(mod.tierValues)) return equipmentAffixGetListedAffixTierRange(env, mod, tier);
    const min = mod.base + (tier * mod.step);
    const max = min + mod.step * 1.6;
    if (env.deps.isTenthStat(statId)) {
        return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10, step: 0.1, tier };
    }
    const toInt = roundInteger ? Math.round : Math.floor;
    const high = toInt(max);
    return { min: high > 0 ? Math.max(1, toInt(min)) : toInt(min), max: high, step: 1, tier };
}
