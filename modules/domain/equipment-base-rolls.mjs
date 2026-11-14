

/** 뿌리촉수 드랍: 후보에 그 무기 대분류 바탕이 있으면 그것만 남긴다(그 지역 단계에 없으면 후보 그대로). */
export function equipmentAffixKeepWeaponCategoryBases(env, candidates, weaponCategory) {
    const own = weaponCategory ? candidates.filter(base => env.deps.getWeaponCategoryOfBase(base.id) === weaponCategory) : [];
    return own.length > 0 ? own : candidates;
}

/** 승급 체인 맨 위: 6단계 체인의 6단계(더 긴 체인은 그 맨 위), 또는 20단계 이상 베이스(듀얼 방어구의 4단계 등). */
export function equipmentAffixIsBaseChainTop(env, base) {
    return env.deps.getBaseChainRank(env.deps.getBaseChainInfo(base)) >= 6 || (base.reqTier || 0) >= 20;
}

/** 드랍 후보 베이스의 가중치(data/items.js BASE_DROP_WEIGHTS): 체인 맨 위는 드물게, 드랍 티어보다 한참 낮은 일반 베이스는 덜. */
export function equipmentAffixGetBaseDropWeight(env, base, dropTier) {
    const rules = env.deps.BASE_DROP_WEIGHTS;
    if (base.dropOnly || base.realmBase) return (base.reqTier || 0) >= 20 ? rules.contentTop : 1;
    const top = (equipmentAffixIsBaseChainTop(env, base) ? rules.chainTop : 1) * equipmentAffixGetHorizontalBaseDropShare(env, base);
    return (base.reqTier || 1) < dropTier - rules.windowTiers ? top * rules.belowWindow : top;
}

/** A horizontal base (js/state.js family) drops at BASE_DROP_WEIGHTS.horizontal of a plain one, amulets lower. */
export function equipmentAffixGetHorizontalBaseDropShare(env, base) {
    const share = env.deps.BASE_DROP_WEIGHTS.horizontal;
    if (!base.family || !share) return 1;
    return Object.hasOwn(share, base.slot) ? share[base.slot] : share.default;
}

export function equipmentAffixGetBaseStatRollRange(env, stat) {
    let minBase = Number.isFinite(stat.baseMin) ? stat.baseMin : ((stat.base || 0) * 0.8);
    let maxBase = Number.isFinite(stat.baseMax) ? stat.baseMax : ((stat.base || 0) * 1.2);
    let scale = (stat.id === 'energyShield') ? 1.5 : 1;
    let scaledMin = minBase * scale;
    let scaledMax = maxBase * scale;
    let usesDecimalRoll = env.deps.isTenthStat(stat.id);
    if (scaledMax > 0) {
        let positiveMinimum = usesDecimalRoll ? 0.1 : 1;
        scaledMin = Math.max(positiveMinimum, scaledMin);
        scaledMax = Math.max(scaledMin, scaledMax);
    }
    return { scaledMin, scaledMax, usesDecimalRoll };
}

/** The bounds a base line rolls between, on the line's grid (tenths for leech/regen lines, whole numbers at least 1 for the rest,
 * 기본 피해 at least 1): what rollBaseStat writes as valMin/valMax and baseRollMin/baseRollMax, and what the slim save remakes
 * (js/item-save-slim.js) and the hall base table lists (scripts/export-hall-affix-table.cjs). */
export function equipmentAffixBaseStatRollBounds(env, stat) {
    let { scaledMin, scaledMax, usesDecimalRoll } = equipmentAffixGetBaseStatRollRange(env, stat);
    if (usesDecimalRoll) {
        scaledMin = Math.round(scaledMin * 10) / 10;
        scaledMax = Math.round(scaledMax * 10) / 10;
    } else {
        scaledMin = Math.floor(scaledMin);
        scaledMax = Math.floor(scaledMax);
        if (scaledMax > 0) scaledMin = Math.max(1, scaledMin);
    }
    if (stat.id === 'flatDmg') {
        scaledMin = Math.max(1, scaledMin);
        scaledMax = Math.max(scaledMin, scaledMax);
    }
    return { min: scaledMin, max: scaledMax, usesDecimalRoll };
}

export function equipmentAffixRollBaseStat(env, stat, percentile = Math.random()) {
    const { min, max, usesDecimalRoll } = equipmentAffixBaseStatRollBounds(env, stat);
    let val;
    if (usesDecimalRoll) {
        const minStep = Math.round(min * 10), maxStep = Math.round(max * 10);
        val = Math.min(maxStep, minStep + Math.floor(percentile * (maxStep - minStep + 1))) / 10;
    } else {
        val = Math.min(max, min + Math.floor(percentile * (max - min + 1)));
    }
    if (stat.id === 'flatDmg') val = Math.max(1, val);
    return {
        id: stat.id,
        val: val,
        valMin: min,
        valMax: max,
        baseRollMin: min,
        baseRollMax: max,
        ...(stat.legacyDamageBase > 0 ? { baseDamageBalanceVersion: 1 } : {}),
        tier: 0,
        statName: env.deps.getStatName(stat.id)
    };
}

export function equipmentAffixRollBaseStats(env, base) {
    return base.baseStats.map(stat => equipmentAffixRollBaseStat(env, stat));
}
