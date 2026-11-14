export function gearGetJewelOptionDef(env, statId) {
    return env.deps.JEWEL_OPTION_POOL.find(option => option.id === statId) || null;
}

export function gearIsJewelPetiteStat(stat) {
    return !!(stat && stat.petite && !stat.waxBonus);
}

export function gearGetJewelStatHiddenTier(env, statId, value, valMin, valMax) {
    let min = Number.isFinite(Number(valMin)) ? Number(valMin) : Number(value);
    let max = Number.isFinite(Number(valMax)) ? Number(valMax) : Number(value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 1;
    let ratio = (Number(value) - min) / (max - min);
    ratio = Math.max(0, Math.min(0.999999, ratio));
    return Math.max(1, Math.min(env.deps.JEWEL_HIDDEN_TIER_COUNT, Math.floor(ratio * env.deps.JEWEL_HIDDEN_TIER_COUNT) + 1));
}

export function gearNormalizeJewelStat(env, stat) {
    if (!stat || !stat.id) return null;
    let option = gearGetJewelOptionDef(env, stat.id);
    let val = Number(stat.val);
    if (!Number.isFinite(val)) val = option ? option.min : 0;
    let valMin = Number.isFinite(Number(stat.valMin)) ? Number(stat.valMin) : (option ? option.min : val);
    let valMax = Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : (option ? option.max : val);
    let tier = Number.isFinite(Number(stat.tier)) ? Math.floor(Number(stat.tier)) : gearGetJewelStatHiddenTier(env, stat.id, val, valMin, valMax);
    tier = Math.max(1, Math.min(env.deps.JEWEL_HIDDEN_TIER_COUNT, tier));
    return { id: stat.id, val: val, valMin: valMin, valMax: valMax, tier: tier, petite: !!stat.petite, waxBonus: !!stat.waxBonus };
}

export function gearCloneJewelStat(env, stat) {
    let normalized = gearNormalizeJewelStat(env, stat);
    return normalized ? { ...normalized } : null;
}

export function gearGetJewelStats(env, jewel) {
    if (!jewel) return [];
    if (Array.isArray(jewel.stats) && jewel.stats.length > 0) return jewel.stats.map((...args) => gearCloneJewelStat(env, ...args)).filter(Boolean);
    if (jewel.stat && jewel.stat.id) return [gearCloneJewelStat(env, jewel.stat)].filter(Boolean);
    return [];
}
