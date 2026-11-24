

/** Every effect key at zero, so zone and drop math never needs fallbacks. */
export function atlasCoreZERO(env) { return Object.fromEntries([...env.deps.atlasPassives.effectKeys].map(key => [key, 0])); }

export function atlasCoreFragmentEffects(env, ids) { return ids.map(id => env.FRAGMENTS.get(id).effect).filter(Boolean); }

// Passives, the map's fragments and the epoch perks share one effect sum (keys: ATLAS_PASSIVES.labels).
export function atlasCoreBonusOf(env, state, fragmentIds = []) { return { ...atlasCoreZERO(env), ...env.deps.atlasPassives.sum(state.atlas.passives, [...atlasCoreFragmentEffects(env, fragmentIds), ...env.deps.atlasEpoch.effects(state)]) }; }

// ---------------------------------------------------------------- the map device
export function atlasCoreSlots(env, state) { return env.deps.ATLAS.fragmentRules.slots + atlasCoreBonusOf(env, state).slots; }

/** 지도 하나의 포털 수: 보통 ATLAS.portals, 형체 없는 이슬 입장은 dewEntry.portals(적어도 1), 둘 다 런의 portals 효과를 더한다. */
export function atlasCorePortalCap(env, dew, bonus) {
    const rules = env.deps.ATLAS;
    return dew ? Math.max(1, rules.dewEntry.portals + bonus.portals) : rules.portals + bonus.portals;
}

export function atlasCoreNormalizeBonus(env, raw) {
    const bonus = atlasCoreZERO(env);
    for (const key of Object.keys(bonus)) {
        const value = Number(raw && raw[key]);
        bonus[key] = Number.isFinite(value) ? Math.max(0, Math.min(1000, value)) : 0;
    }
    return bonus;
}
