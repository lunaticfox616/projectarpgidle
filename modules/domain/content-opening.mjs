import { openingEquipped, openingSeen, openingVisitKey, openingApplies, openingEnroll, openingCombatOnly, openingHasLoot, openingCanOpen, openingSignature, openingSync, openingVisit, openingNextCue, openingInlineNotice } from './content-opening-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createOpeningProgression(deps) {
    const env = { deps };
    env.ENROLLED = 'opening_systems_v2';
    env.GEAR = 'opening_gear_ready';
    env.PROFILE = 'opening_profile_ready';
    env.TRADE = 'opening_trade_ready';
    env.cues = ['tab-items', 'tab-map', 'tab-character', 'tab-journal', 'tab-trade'];
    env.inlineKeys = new Set(['unlock_items', 'tutorial_first_gear',
        'tutorial_starter_gem_equip', 'unlock_map']);
    env.gates = {
        'tab-skills': owner => !!env.deps.SKILL_DB[owner.activeSkill]?.isGem || openingEquipped(owner) || owner.maxZoneId >= 1,
        'tab-items': owner => openingSeen(owner, env.GEAR),
        'tab-character': owner => openingSeen(owner, env.PROFILE),
        'tab-trade': owner => openingSeen(owner, env.TRADE),
        'tab-journal': owner => owner.maxZoneId >= 4 || openingSeen(owner, openingVisitKey('tab-journal')),
        'tab-social': () => false,
        'tab-records': () => false
    };
    return Object.freeze({ applies: (...args) => openingApplies(env, ...args), enroll: (...args) => openingEnroll(env, ...args), combatOnly: (...args) => openingCombatOnly(env, ...args), hasLoot: openingHasLoot, canOpen: (...args) => openingCanOpen(env, ...args), signature: (...args) => openingSignature(env, ...args), sync: (...args) => openingSync(env, ...args),
        visit: (...args) => openingVisit(env, ...args), nextCue: (...args) => openingNextCue(env, ...args), inlineNotice: (...args) => openingInlineNotice(env, ...args) });
}
