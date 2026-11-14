import * as rules from './combat/exploration-object-rules.mjs';
import * as setup from './combat/exploration-object-setup.mjs';
import * as events from './combat/exploration-object-events.mjs';
// The object owner remains an extension of the existing progress API until its classic consumers migrate.
const deps={
    random:()=>Math.random(),
    get actExplorationState(){return actExplorationState;},
    get actExplorationMap(){return actExplorationMap;},
    get getPlayerStats(){return getPlayerStats;},
    get ATLAS(){return ATLAS;},
    get getGridBlockedCells(){return getGridBlockedCells;},
    get MONSTER_COMBAT_ROLES(){return MONSTER_COMBAT_ROLES;},
    get hashSeed(){return hashSeed;},
    get createEnemy(){return createEnemy;},
    get getZone(){return getZone;},
    get getBattleSpawnStamp(){return getBattleSpawnStamp;},
    get explorationPackFormation(){return explorationPackFormation;},
    get combatLootReceipts(){return combatLootReceipts;},
    get lootOmens(){return lootOmens;},
    get contentProgression(){return contentProgression;},
    get equipmentDropVariants(){return equipmentDropVariants;},
    get generateEquipmentDrop(){return generateEquipmentDrop;},
    get EXPLORATION_PROP_LOOT(){return EXPLORATION_PROP_LOOT;},
    get keepEquipmentDrop(){return keepEquipmentDrop;},
    get keepCurrencyDrop(){return keepCurrencyDrop;},
    get atlasEncounters(){return atlasEncounters;},
    get getCombatTime(){return getCombatTime;},
    get getGridWaveDrawnDistance(){return getGridWaveDrawnDistance;},
    state:actExplorationState.objects
};
const effects={get queueImportantSave(){return queueImportantSave;},get dispatchRuntimeEvent(){return dispatchRuntimeEvent;},get reportObjectRestoreFailure(){return console.warn;}};
function present(iterator){
    let step=iterator.next();
    while(!step.done){const command=step.value;step=iterator.next(effects[command.kind](...command.args));}
    return step.value;
}
actExplorationProgress.objects={
    initialize(run,zone) {return present(setup.objectInitialize({owner:game,deps}, run,zone));},
    savedFacing(zone) {return setup.objectSavedFacing({owner:game,deps}, zone);},
    request(id) {return present(events.objectRequest({owner:game,deps}, id));},
    cancel(run) {return rules.objectCancel(run);},
    step(run,elapsedMs) {return present(events.objectStep({owner:game,deps}, run,elapsedMs));},
    afterDeath(run) {return present(events.objectAfterDeath({owner:game,deps}, run));},
    area(cells) {return present(events.objectArea({owner:game,deps}, cells));},
    stage(row) {return present(events.objectStage({owner:game,deps}, row));},
    settleProjected(run,row,kill) {return present(events.objectSettleProjected({owner:game,deps}, run,row,kill));}
};
