import { createProjectileShots } from './combat/projectile-shots.mjs';
// Grid and active-cast selection load later. Replace these ports with their shared owner at the final application entry.
const deps = {
    random: () => Math.random(),
    get bonusShotDamagePct() { return PROJECTILE_BONUS_SHOT_DAMAGE_PCT; },
    get actExplorationState() { return actExplorationState; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitDistance() { return getGridUnitDistance; },
    get getSplashDormantEnemies() { return getSplashDormantEnemies; },
    get selectCombatGemTargets() { return selectCombatGemTargets; },
    get getSkillGridProfile() { return getSkillGridProfile; },
    get buildSkillHitSequence() { return buildSkillHitSequence; },
    supportStages: (...args) => window.GameModules.combat.supports.stages(...args)
};
const projectileShots = createProjectileShots({ get owner() { return game; }, deps });
safeExposeGlobals({ projectileShots });
