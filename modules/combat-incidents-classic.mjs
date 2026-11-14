import { incidentDressPacks } from './combat/incident-packs.mjs';
import { incidentGlazeOf } from './rendering/incident-colors.mjs';
import { incidentTick } from './combat/incident-room.mjs';
import { incidentOnKill } from './combat/incident-rewards.mjs';
import { incidentNoteDamage } from './combat/incident-lucky-damage.mjs';
import { incidentTestSpawn, incidentTestYawn, incidentTestSleep, incidentTestFeast, incidentTestStray, incidentTestStar, incidentTestChallenge, incidentTestBreath, incidentTestShower } from './combat/incident-preview.mjs';
import { incidentBreathKind, incidentBreathStats } from './combat/incident-breath.mjs';
import { createIncidentState } from './combat/incident-state.mjs';

// Remove this name bridge with the remaining consumers and application bootstrap.
const deps = {
    get ACT_EXPLORATION_INCIDENTS() { return ACT_EXPLORATION_INCIDENTS; },
    get hashSeed() { return hashSeed; },
    get combatLootReceipts() { return combatLootReceipts; },
    get recordIncident() { return recordIncident; },
    get _t() { return _t; },
    get colonyWards() { return colonyWards; },
    get combatEquipmentStats() { return combatEquipmentStats; },
    get getCombatTime() { return getCombatTime; },
    get actExplorationRooms() { return actExplorationRooms; },
    get actExplorationMap() { return actExplorationMap; },
    get gridCellKey() { return gridCellKey; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    get createEnemy() { return createEnemy; },
    get gridChebyshevDist() { return gridChebyshevDist; },
    get actExplorationState() { return actExplorationState; },
    get hasGridCell() { return hasGridCell; },
    get advanceGridUnitMovement() { return advanceGridUnitMovement; },
    get actExplorationProgress() { return actExplorationProgress; },
    get performance() { return performance; },
    get ACT_MONSTER_VISUAL_BY_ID() { return ACT_MONSTER_VISUAL_BY_ID; },
    get getActMonsterPool() { return getActMonsterPool; },
    get MAP_ZONES() { return MAP_ZONES; },
    get assignEnemyGridCombatProfile() { return assignEnemyGridCombatProfile; },
    get getZone() { return getZone; },
    get actExplorationDoors() { return actExplorationDoors; },
    get contentProgression() { return contentProgression; },
    get keepCurrencyDrop() { return keepCurrencyDrop; },
    get rndChoice() { return rndChoice; },
    get grantEquipmentPick() { return grantEquipmentPick; },
    get i18n() { return i18n; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get levelProgression() { return levelProgression; },
    get getRealmEquipmentHiddenTierCap() { return getRealmEquipmentHiddenTierCap; },
    get generateUniqueItem() { return generateUniqueItem; },
    get keepEquipmentDrop() { return keepEquipmentDrop; },
    get pickParticle() { return pickParticle; },
    get canPlaceGridFootprint() { return canPlaceGridFootprint; }
};
const env = { get owner() { return game; }, deps, runtime: createIncidentState() };
const effects = { get dispatchRuntimeEvent() { return dispatchRuntimeEvent; }, get addBattleFx() { return addBattleFx; } };
function runIncidentCommands(commands) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects[step.value.kind](...step.value.args));
    return step.value;
}
const combatIncidents = Object.freeze({
    dressPacks(zone, map, packs) { return incidentDressPacks(env, zone, map, packs); },
    glazeOf(enemy) { return incidentGlazeOf(env, enemy); },
    tick() { return runIncidentCommands(incidentTick(env)); },
    onKill(enemy, zone) { return runIncidentCommands(incidentOnKill(env, enemy, zone)); },
    noteDamage(enemy, dealt) { return runIncidentCommands(incidentNoteDamage(env, enemy, dealt)); },
    testSpawn(rainbow = false) { return incidentTestSpawn(env, rainbow); },
    testYawn() { return runIncidentCommands(incidentTestYawn(env)); },
    testSleep() { return incidentTestSleep(env); },
    testFeast() { return runIncidentCommands(incidentTestFeast(env)); },
    testStray() { return incidentTestStray(env); },
    testStar() { return runIncidentCommands(incidentTestStar(env)); },
    testChallenge() { return runIncidentCommands(incidentTestChallenge(env)); },
    testBreath() { return runIncidentCommands(incidentTestBreath(env)); },
    testShower() { return runIncidentCommands(incidentTestShower(env)); },
    breathKind(breath) { return incidentBreathKind(env, breath); },
    breathStats(breath) { return incidentBreathStats(env, breath); }
});
safeExposeGlobals({ combatIncidents });
