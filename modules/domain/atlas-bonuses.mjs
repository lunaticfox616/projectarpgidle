
/** Every effect key at zero, so zone and drop math never needs fallbacks. */
export function atlasCoreZERO(env) { return Object.fromEntries(env.EFFECT_KEYS.map(key => [key, 0])); }

export function atlasCoreFragmentEffects(env, ids) { return ids.map(id => env.FRAGMENTS.get(id).effect).filter(Boolean); }

// The map's fragments and the epoch perks share one effect sum (keys: ATLAS.effectLabels; a map omen adds its own at entry).
// The passive stars are not in it: they reach only the chart maps of their side (atlasCoreStarTerms).
export function atlasCoreBonusOf(env, state, fragmentIds = []) {
    const total = atlasCoreZERO(env);
    for (const effect of [...atlasCoreFragmentEffects(env, fragmentIds), ...env.deps.atlasEpoch.effects(state)]) {
        for (const [key, value] of Object.entries(effect)) total[key] += value;
    }
    return total;
}

// ---------------------------------------------------------------- the map device
export function atlasCoreSlots(env, state) { return env.deps.ATLAS.fragmentRules.slots + atlasCoreBonusOf(env, state).slots; }

/** 지도 하나의 포털 수(적어도 1): 보통 ATLAS.portals, 형체 없는 이슬 입장은 dewEntry.portals에, 그 지도 쪽 별의 portals와 입장에 맞는
 * 별 효과(이슬 입장은 dewPortals, 보통 입장은 ordinaryPortals)를 더한다. stars: 런에 고정한 별 효과(atlasCoreStarTerms). */
export function atlasCorePortalCap(env, dew, stars) {
    const rules = env.deps.ATLAS, base = dew ? rules.dewEntry.portals : rules.portals;
    return Math.max(1, base + stars.portals + (dew ? stars.dewPortals : stars.ordinaryPortals));
}

/** 런에 고정할 별 효과: 지도석으로 연 천문도 일반 지도만 그 지도 쪽(side)의 별을 받는다. 다른 싸움은 모두 0. */
export function atlasCoreStarTerms(env, state, map, chartRun) {
    return env.deps.atlasPassives.terms(state, chartRun ? env.BY_ID.get(map.node).side : null);
}

export function atlasCoreNormalizeBonus(env, raw) {
    const bonus = atlasCoreZERO(env);
    for (const key of Object.keys(bonus)) {
        const value = Number(raw && raw[key]);
        bonus[key] = Number.isFinite(value) ? Math.max(0, Math.min(1000, value)) : 0;
    }
    return bonus;
}
