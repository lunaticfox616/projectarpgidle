import { createAtlasRun } from './domain/atlas-run.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createAtlasRun({
    get ATLAS() { return ATLAS; },
    get actExplorationState() { return actExplorationState; },
    get getZone() { return getZone; },
    get getDefeatRecoveryZoneId() { return getDefeatRecoveryZoneId; },
    get isBeehiveRunLockedForMapTravel() { return isBeehiveRunLockedForMapTravel; },
    get atlas() { return atlas; },
    get atlasEndgame() { return atlasEndgame; },
    get memoryDungeon() { return memoryDungeon; },
    get combatLootReceipts() { return combatLootReceipts; },
    get actExplorationProgress() { return actExplorationProgress; },
    get itemInfluences() { return itemInfluences; },
    get atlasBoard() { return atlasBoard; },
    get atlasEncounters() { return atlasEncounters; },
    get stumpNursery() { return typeof stumpNursery === 'undefined' ? undefined : stumpNursery; }
});
const effects = {
    atlasSessionEffectChangeZone: (...args) => changeZone(...args),
    atlasSessionEffectStartMoving: (...args) => startMoving(...args),
    atlasSessionEffectPrepareActExplorationArrival: (...args) => prepareActExplorationArrival(...args),
    atlasSessionEffectQueueImportantSave: (...args) => queueImportantSave(...args),
    atlasSessionEffectCaptureAtlasCompletion(state, commands) {
        return combatLootReceipts.capture(state, () => consumeDomainCommands(commands, effects));
    },
    atlasSessionEffectMarkAtlasRefresh() { pendingHeavyUiRefresh = true; },
    atlasSessionEffectAwardCurrency: (...args) => awardCurrency(...args),
    atlasSessionEffectAddItemToInventory: (...args) => addItemToInventory(...args),
    atlasSessionEffectGenerateEquipmentDrop: (...args) => generateEquipmentDrop(...args),
    atlasSessionEffectGenerateUniqueItem: (...args) => generateUniqueItem(...args),
    atlasSessionEffectGrantAtlasFinds: (...args) => atlasFinds.onAtlasKill(...args),
    atlasSessionEffectGrantNurseryGift: (...args) => stumpNursery.clearGift(...args),
    atlasSessionEffectAwardEnemyLootCurrency: (...args) => awardEnemyLootCurrency(...args),
    atlasSessionEffectDispatchRuntimeEvent: (...args) => dispatchRuntimeEvent(...args)
};
const atlasRun = Object.freeze({
    open: (...args) => consumeDomainCommands(rules.open(game, ...args), effects),
    openPinnacle: (...args) => consumeDomainCommands(rules.openPinnacle(game, ...args), effects),
    openEndgame: (...args) => consumeDomainCommands(rules.openEndgame(game, ...args), effects),
    openMemory: (...args) => consumeDomainCommands(rules.openMemory(game, ...args), effects),
    openBoard: (...args) => consumeDomainCommands(rules.openBoard(game, ...args), effects),
    reenter: (...args) => consumeDomainCommands(rules.reenter(game, ...args), effects),
    abandon: (...args) => consumeDomainCommands(rules.abandon(game, ...args), effects),
    finish: (...args) => consumeDomainCommands(rules.finish(game, ...args), effects),
    defeat: (...args) => consumeDomainCommands(rules.defeat(game, ...args), effects),
    leave: (...args) => consumeDomainCommands(rules.leave(game, ...args), effects),
    travel: (...args) => consumeDomainCommands(rules.travel(game, ...args), effects),
    onKill: (...args) => consumeDomainCommands(rules.onKill(game, ...args), effects),
    onChaos20: (...args) => consumeDomainCommands(rules.onChaos20(game, ...args), effects),
    recoverClosedMap: (...args) => consumeDomainCommands(rules.recoverClosedMap(game, ...args), effects),
    lastPortal: (...args) => rules.lastPortal(game, ...args),
    blockReason: (...args) => rules.blockReason(game, ...args)
});
safeExposeGlobals({ atlasRun });
