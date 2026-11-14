import { createSupportRunes } from './domain/support-runes.mjs';
// One existing singleton; retire after combat and rune-board consumers import it.
const rules = createSupportRunes({
    skills: SKILL_DB, supports: SUPPORT_GEM_DB, keystones: CLASS_KEYSTONE_DEFS,
    requirements: { skills: SKILL_RUNE_LEVEL_REQ, supports: SUPPORT_RUNE_LEVEL_REQ }
}, (...args) => _t(...args));
window.GameModules.skills.supports = Object.freeze({
    ...rules,
    prepare: (skill, state = game) => rules.prepare(skill, state),
    targets: (name, state = game) => rules.targets(name, state),
    conflictReason: (name, state = game, replacedName = '') => rules.conflictReason(name, state, replacedName),
    tierOf: (name, state = game) => rules.tierOf(name, state),
    value: (name, tier, state = game) => rules.value(name, tier, state),
    describe: (name, tier, state = game) => rules.describe(name, tier, state)
});
