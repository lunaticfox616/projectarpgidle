import * as part0 from './combat/room-invader-bodies.mjs';
import * as part1 from './combat/room-invader-runs.mjs';
// Replace with direct owners when the remaining combat/view consumers and bootstrap are migrated.
const rules = { RULE: ROOM_INVADER, SURPRISE: BOSS_ROOM_SURPRISE };
const deps = {
    get RULE() { return rules.RULE; },
    get gridCellKey() { return gridCellKey; },
    get createEnemy() { return createEnemy; },
    get assignEnemyGridCombatProfile() { return assignEnemyGridCombatProfile; },
    get refreshBossPatternPreview() { return refreshBossPatternPreview; },
    get atlasEndgame() { return atlasEndgame; },
    get memoryDungeon() { return memoryDungeon; },
    get SURPRISE() { return rules.SURPRISE; },
    get MONSTER_STAGE_ROSTER() { return MONSTER_STAGE_ROSTER; },
    get getBossStageActor() { return getBossStageActor; },
    get rndChoice() { return rndChoice; },
    get getGridBlockedCells() { return getGridBlockedCells; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    get actExplorationRooms() { return actExplorationRooms; },
    get fitBossFootprint() { return fitBossFootprint; },
    get actExplorationState() { return actExplorationState; },
    get getZone() { return getZone; },
    get actExplorationDoors() { return actExplorationDoors; },
    get rollLootForEnemy() { return rollLootForEnemy; }
};

const env = { get owner() { return game; }, deps };
const presentation = {
    get addBattleFx() { return addBattleFx; },
    get dispatchRuntimeEvent() { return dispatchRuntimeEvent; },
    get clearDotFxThrottleForEnemy() { return clearDotFxThrottleForEnemy; }
};
function runCommands(commands) {
    let step = commands.next();
    while (!step.done) {
        const command = step.value;
        step = commands.next(presentation[command.kind](...command.args));
    }
    return step.value;
}
const roomInvaders = Object.freeze({
    patternState(attackNumber) { return part0.invaderPatternState(env, attackNumber); },
    rollRoom(run, map, room) { return runCommands(part1.invaderRollRoom(env, run, map, room)); },
    onBossEntrance(run, pack) { return runCommands(part1.invaderOnBossEntrance(env, run, pack)); },
    tick() { return runCommands(part1.invaderTick(env)); },
    grantExtraLoot(enemy) { return runCommands(part1.invaderGrantExtraLoot(env, enemy)); },
    force(kind) { return runCommands(part1.invaderForce(env, kind)); },
    surpriseChance(loop) { return part1.invaderSurpriseChance(env, loop); }
});
safeExposeGlobals({ roomInvaders });
