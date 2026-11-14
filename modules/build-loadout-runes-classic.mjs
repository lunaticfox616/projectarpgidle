import { createRuneLoadouts } from './domain/build-loadout-runes.mjs';

// Preserve the existing skills namespace until bootstrap composes the module services directly.
const rules = createRuneLoadouts({
    get normalizeGemRecord() { return normalizeGemRecord; },
    get getSupportTierCap() { return getSupportTierCap; },
    get SKILL_DB() { return SKILL_DB; },
    get SUPPORT_GEM_DB() { return SUPPORT_GEM_DB; },
    get _t() { return _t; },
    get isMobilityRuneAttackWorn() { return isMobilityRuneAttackWorn; },
    get MOBILITY_RUNE_ATTACK_UNIQUE() { return MOBILITY_RUNE_ATTACK_UNIQUE; },
    get supportRules() { return window.GameModules.skills.supports; },
    get getSupportResonanceCostAtTier() { return getSupportResonanceCostAtTier; },
    get gemDropRewards() { return gemDropRewards; }
});
window.GameModules.skills.loadouts = Object.freeze({
    normalize: rules.normalize,
    capture: (state = game) => rules.capture(state),
    apply: (config, state = game) => rules.apply(config, state),
    equals: (config, state = game) => rules.equals(config, state),
    inspect: (config, state = game, stats) => rules.inspect(config, state, stats)
});
