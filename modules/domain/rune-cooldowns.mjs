

export function runeFlowSumCooldownPct(pStats, generalId, mobilityId, mobility) {
    const value = id => Math.max(0, Number(pStats && pStats[id]) || 0);
    return value(generalId) + (mobility ? value(mobilityId) : 0);
}

export function runeFlowGetSkillCooldownMs(env, baseMs, pStats, options = {}) {
    const rules = { ...env.SKILL_COOLDOWN_RULES, ...options };
    const cap = rules.reductionCapPct + Math.max(0, Number(pStats && pStats.cooldownReductionCapBonus) || 0);
    const reduction = Math.min(cap, runeFlowSumCooldownPct(pStats, 'cooldownReduction', 'mobilityCooldownReduction', !!rules.mobility) + (Number(rules.extraReductionPct) || 0));
    const recovery = runeFlowSumCooldownPct(pStats, 'cooldownRecovery', 'mobilityCooldownRecovery', !!rules.mobility);
    return Math.max(rules.floorMs, Math.round(baseMs * (1 - reduction / 100) / (1 + recovery / 100)));
}
