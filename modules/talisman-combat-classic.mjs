import * as part0 from './combat/talisman-conditions.mjs';
// Removed with the legacy callers at bootstrap migration; this is the sole runtime owner.
const deps = {
    get TALISMAN_HEX_RULES() { return TALISMAN_HEX_RULES; },
    get talismanEffects() { return talismanEffects; },
    get talismans() { return talismans; },
    get isTalentInstantWarcryActive() { return typeof isTalentInstantWarcryActive === 'undefined' ? undefined : isTalentInstantWarcryActive; },
    get getPreciseTalentLevel() { return typeof getPreciseTalentLevel === 'undefined' ? undefined : getPreciseTalentLevel; },
    get getSkillCooldownMs() { return getSkillCooldownMs; }
};
const env = { get owner() { return game; }, deps };
const talismanCombat = part0.createTalismanCombatOwner(env);
safeExposeGlobals({ talismanCombat });
