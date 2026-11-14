

export function refineGetItemQualityAttributeMode(env, item) {
    let mode = item && typeof item.qualityAttribute === 'string' ? item.qualityAttribute : 'base';
    return env.deps.QUALITY_ATTRIBUTE_MODES.includes(mode) || env.deps.QUALITY_CATALYST_MODES.includes(mode) ? mode : 'base';
}

export function refineGetItemQualityAttributeLabel(env, mode) {
    return env.deps.QUALITY_ATTRIBUTE_LABELS[mode] || env.deps.QUALITY_ATTRIBUTE_LABELS.base;
}

export function refineGetNextItemQualityAttributeMode(env, mode) {
    let current = env.deps.QUALITY_ATTRIBUTE_MODES.indexOf(env.deps.QUALITY_ATTRIBUTE_MODES.includes(mode) ? mode : 'base');
    return env.deps.QUALITY_ATTRIBUTE_MODES[(current + 1) % env.deps.QUALITY_ATTRIBUTE_MODES.length];
}

export function refineIsQualityAttributeStat(env, mode, statId) {
    let group = env.deps.QUALITY_ATTRIBUTE_STAT_GROUPS[mode] || [];
    return group.includes(statId);
}

export function refineApplyAbyssCatalystToItemQuality(env, item) {
    let nextMode = refineGetNextItemQualityAttributeMode(env, refineGetItemQualityAttributeMode(env, item));
    item.qualityAttribute = nextMode;
    return refineGetItemQualityAttributeLabel(env, nextMode);
}
