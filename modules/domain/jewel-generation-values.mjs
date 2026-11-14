import { gearNormalizeJewelStat } from './jewel-stat-record.mjs';

export function gearRollJewelStat(env, option, tierRange) {
    if (!option) return null;
    const requested = requestedJewelTiers(env, tierRange);
    let ailResIds = new Set(['ailResIgnite','ailResShock','ailResFreeze','ailResPoison','ailResBleed']);
    if (ailResIds.has(option.id)) return rollJewelAilmentResistance(env, option, tierRange, requested);
    return rollJewelRangeValue(env, option, tierRange, requested);
}

function requestedJewelTiers(env, tierRange) {
    let requestedMinTier = tierRange ? Math.max(1, Math.min(env.deps.JEWEL_HIDDEN_TIER_COUNT, Math.floor(Number(tierRange.min) || 1))) : 1;
    let requestedMaxTier = tierRange ? Math.max(requestedMinTier, Math.min(env.deps.JEWEL_HIDDEN_TIER_COUNT, Math.floor(Number(tierRange.max) || requestedMinTier))) : env.deps.JEWEL_HIDDEN_TIER_COUNT;
    return { min: requestedMinTier, max: requestedMaxTier };
}

function rollJewelAilmentResistance(env, option, tierRange, requested) {
    let tier = tierRange
        ? env.deps.pickTierInRangeWeighted(requested.min, requested.max)
        : 1 + Math.floor(Math.random() * env.deps.JEWEL_HIDDEN_TIER_COUNT);
    let tierRanges = { 1:[12.5,25], 2:[17,30], 3:[22,36], 4:[26,43], 5:[30,50] };
    let rng = tierRanges[tier] || [12.5,50];
    let step = 0.5;
    let slots = Math.max(0, Math.floor(((rng[1]-rng[0])/step)+0.000001));
    let val = rng[0] + Math.floor(Math.random() * (slots + 1)) * step;
    val = Number(val.toFixed(2));
    return gearNormalizeJewelStat(env, { id: option.id, val: val, valMin: rng[0], valMax: rng[1], tier: tier });
}

function jewelRollStep(option, min, max, decimalStep) {
    let hasDecimalRange = !Number.isInteger(Number(min)) || !Number.isInteger(Number(max));
    return Number.isFinite(option.step) && option.step > 0 ? option.step : (hasDecimalRange ? decimalStep : 1);
}

function rollJewelRangeValue(env, option, tierRange, requested) {
    let step = jewelRollStep(option, option.min, option.max, 0.1);
    let slots = Math.max(0, Math.floor(((option.max - option.min) / step) + 0.000001));
    let selectedTier = slots > 0 && tierRange ? env.deps.pickTierInRangeWeighted(requested.min, requested.max) : 1;
    let slotStart = tierRange ? Math.ceil(((selectedTier - 1) * (slots + 1)) / env.deps.JEWEL_HIDDEN_TIER_COUNT) : 0;
    let slotEnd = tierRange ? Math.max(slotStart + 1, Math.ceil((selectedTier * (slots + 1)) / env.deps.JEWEL_HIDDEN_TIER_COUNT)) : slots + 1;
    let slotIndex = slotStart + Math.floor(Math.random() * Math.max(1, slotEnd - slotStart));
    let val = option.min + Math.min(slots, slotIndex) * step;
    val = (step < 1 || !Number.isInteger(Number(val))) ? Number(val.toFixed(2)) : Math.floor(val);
    let rolled = { id: option.id, val: val, valMin: option.min, valMax: option.max };
    if (tierRange && slots > 0) rolled.tier = selectedTier;
    return gearNormalizeJewelStat(env, rolled);
}

export function gearGetJewelDropTierRange(env, zoneTier) {
    let boundedZoneTier = Math.max(1, Math.min(20, Math.floor(Number(zoneTier) || 1)));
    let maxTier = Math.max(1, Math.min(env.deps.JEWEL_HIDDEN_TIER_COUNT, Math.ceil(boundedZoneTier / 4)));
    return { min: Math.max(1, maxTier - 1), max: maxTier };
}

export function gearMakeFixedJewelStat(env, statId, val) {
    let stat = gearNormalizeJewelStat(env, { id: statId, val: val, valMin: val, valMax: val, tier: 1 });
    return stat || { id: statId, val: val, valMin: val, valMax: val, tier: 1 };
}

export function gearRollJewelPetiteStat(env, rarity, excludeIds) {
    if (rarity !== 'magic' && rarity !== 'rare') return null;
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let pool = env.deps.JEWEL_PETITE_OPTION_POOL.filter(option => !excluded.has(option.id));
    if (pool.length <= 0) pool = env.deps.JEWEL_PETITE_OPTION_POOL;
    let option = env.deps.rndChoice(pool);
    let range = rarity === 'rare' ? option.rare : option.magic;
    let min = range[0];
    let max = range[1];
    let step = jewelRollStep(option, min, max, 0.5);
    let slots = Math.max(0, Math.floor(((max - min) / step) + 0.000001));
    let val = min + Math.floor(Math.random() * (slots + 1)) * step;
    val = (step < 1 || !Number.isInteger(Number(val))) ? Number(val.toFixed(2)) : Math.floor(val);
    let stat = gearNormalizeJewelStat(env, { id: option.id, val: val, valMin: min, valMax: max, tier: 1, petite: true });
    return stat;
}
