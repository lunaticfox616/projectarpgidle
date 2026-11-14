import { createMobilityController } from './combat/mobility-controller.mjs';

// Late-bound services keep the classic/replay shared slots until the final application entry.
const controller = createMobilityController({
    get owner() { return game; },
    get mainCasts() { return window.GameModules.state.combat.skillGemCombatRuntime; },
    set mainCasts(value) { window.GameModules.state.combat.skillGemCombatRuntime = value; },
    get SKILL_DB() { return SKILL_DB; },
    get getSkillCooldownMs() { return getSkillCooldownMs; },
    get selectCombatGemTargets() { return selectCombatGemTargets; },
    get updateSkillGemCombat() { return updateSkillGemCombat; },
    get getCombatTime() { return getCombatTime; },
    get _t() { return _t; },
    get canUseSkillWithCurrentEquipment() { return canUseSkillWithCurrentEquipment; },
    get getRuneLevelNote() { return getRuneLevelNote; },
    get isPlayerThreatenedByBoss() { return isPlayerThreatenedByBoss; },
    get hasPlayerChannelBreakingAilment() { return hasPlayerChannelBreakingAilment; },
    get findNearestSafeGridRoute() { return findNearestSafeGridRoute; },
    get getBossWarningCells() { return getBossWarningCells; },
    get pendingEnemyCombatAttacks() { return window.GameModules.state.combat.pendingEnemyCombatAttacks; },
    get actExplorationMotion() { return actExplorationMotion; },
    get combatTacticsRuntime() { return window.GameModules.state.combat.combatTacticsRuntime; },
    get getPlayerStats() { return getPlayerStats; },
    get getSkillTargets() { return getSkillTargets; },
    get performPlayerAttack() { return performPlayerAttack; }
});
const presentation = { get addBattleFx() { return addBattleFx; } };
function runMobilityCommands(commands) {
    let step = commands.next();
    while (!step.done) {
        presentation[step.value.kind](...step.value.args);
        step = commands.next();
    }
    return step.value;
}
const mobilitySkill = Object.freeze({ ...controller, cast: gate => runMobilityCommands(controller.cast(gate)) });
safeExposeGlobals({ mobilitySkill });
