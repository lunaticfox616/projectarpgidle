import * as part0 from './domain/ghost-combat-snapshot.mjs';
import { GHOST_COMBAT_SNAPSHOT_VERSION, GHOST_COMBAT_RULESET_VERSION, GHOST_COMBAT_ELEMENTS, GHOST_COMBAT_TAGS } from './domain/ghost-combat-values.mjs';
// Removed with the legacy callers at bootstrap migration; this is the sole runtime owner.
const deps = {
    get normalizeCombatTacticsSettings() { return normalizeCombatTacticsSettings; },
    get getSkillGridProfile() { return getSkillGridProfile; },
    get mobilitySkill() { return mobilitySkill; },
    get SKILL_DB() { return typeof SKILL_DB === 'undefined' ? undefined : SKILL_DB; },
    get getHeroAppearanceId() { return typeof getHeroAppearanceId === 'undefined' ? undefined : getHeroAppearanceId; },
    get SKILL_RUNE_STANCE_BY_CATEGORY() { return SKILL_RUNE_STANCE_BY_CATEGORY; },
    get getWeaponCategoryId() { return getWeaponCategoryId; },
    get getPlayerStats() { return typeof getPlayerStats === 'undefined' ? undefined : getPlayerStats; },
    get calculatePlayerEhpProfile() { return typeof calculatePlayerEhpProfile === 'undefined' ? undefined : calculatePlayerEhpProfile; },
    get PLAYER_CLASS_DEFS() { return typeof PLAYER_CLASS_DEFS === 'undefined' ? undefined : PLAYER_CLASS_DEFS; }
};
const env = { get owner() { return game; }, deps };
const ghostBridge = {
    getGhostCombatVersion() { return part0.ghostGetGhostCombatVersion(); },
    getGhostCombatMotion(stats, skill) { return part0.ghostGetGhostCombatMotion(env, stats, skill); },
    getGhostCombatSnapshot(suppliedStats) { return part0.ghostGetGhostCombatSnapshot(env, suppliedStats); }
};
safeExposeGlobals(ghostBridge);
safeExposeGlobals({ GHOST_COMBAT_SNAPSHOT_VERSION, GHOST_COMBAT_RULESET_VERSION, GHOST_COMBAT_ELEMENTS, GHOST_COMBAT_TAGS });
