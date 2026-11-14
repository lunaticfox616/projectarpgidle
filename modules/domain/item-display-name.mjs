

export function itemFlowGetItemDisplayName(env, item) {
    const name = String((item && item.name) || '');
    const base = item && item.baseName;
    if (base && name === `마법의 ${base}`) return env.deps._t('마법의 {base}', { base: env.deps._t(base) });
    if (base && name === `희귀한 ${base}`) return env.deps._t('희귀한 {base}', { base: env.deps._t(base) });
    return env.deps._t(name);
}
