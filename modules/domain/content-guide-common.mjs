

export function unlockGuideCount(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
}

export function unlockGuideRequirement(label, met, current, target) {
    let row = { label, met: !!met };
    if (Number.isFinite(current) && Number.isFinite(target)) {
        row.current = Math.max(0, Math.floor(current));
        row.target = Math.max(1, Math.floor(target));
    }
    return row;
}

export function unlockGuideGuide(definition) {
    let requirements = Array.isArray(definition.requirements) ? definition.requirements : [];
    let completed = requirements.filter(row => row.met).length;
    return { ...definition, requirements, completed, total: requirements.length };
}

export function unlockGuideTabUnlocked(env, state, id) {
    if (typeof env.deps.isMapPrimaryContentUnlocked === 'function') return env.deps.isMapPrimaryContentUnlocked(state, id);
    return Array.isArray(state.unlockedMapContents) && state.unlockedMapContents.includes(id);
}

export function unlockGuideHighestChaosDepth(env, state) {
    if (typeof env.deps.getHighestUnlockedEndlessChaosDepth === 'function') return unlockGuideCount(env.deps.getHighestUnlockedEndlessChaosDepth(state));
    let depths = Array.isArray(state.abyssUnlockedDepths) ? state.abyssUnlockedDepths.map(unlockGuideCount) : [];
    return Math.max(unlockGuideCount(state.abyssEndlessDepth), ...depths, 0);
}
