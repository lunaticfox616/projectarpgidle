import { createExplorationGroundLoot, groundLootKind } from './domain/exploration-ground-loot.mjs';

// Keep one landing-clock owner. Later-loaded domains are resolved only when used.
// Remove this adapter when exploration, save and pickup consumers import the owner directly.
const floor = createExplorationGroundLoot({
    timing: GROUND_LOOT_DROP, now: () => getCombatTime(),
    get maps() { return actExplorationMap; }, get rooms() { return actExplorationRooms; },
    get doors() { return actExplorationDoors; }, get exploration() { return actExplorationState; },
    get receipts() { return combatLootReceipts; }, get loot() { return actExplorationLoot; },
    get bagItems() { return bagItems; }, get coreItems() { return coreItems; },
    get talismans() { return talismans; }, get stumpBox() { return stumpBox; },
    get memoryLeaves() { return memoryLeaves; }, get knitting() { return knitting; },
    get gems() { return gemDropRewards; }
});
const collect = rows => { if (rows.length) collectExplorationFloorLoot(rows); };
actExplorationState.groundLoot = {
    kindOf: groundLootKind,
    place: (run, cell, item, options) => floor.place(game, run, cell, item, options),
    placeItem: (run, cell, kind, item, overflow) => floor.placeItem(game, run, cell, kind, { item, overflow }),
    placeLeaf: (run, cell, leaf) => floor.placeLeaf(game, run, cell, leaf),
    placeYarn: (run, cell, yarn) => floor.placeYarn(game, run, cell, yarn),
    placeRune: (run, cell, gem) => floor.placeRune(game, run, cell, gem),
    placeCurrency: (run, cell, currency, count) => floor.placeCurrency(game, run, cell, currency, count),
    ...Object.fromEntries(['takeNear', 'takeAt', 'takeAll', 'nearest', 'falling', 'inAir', 'piles', 'reservedItems', 'settleOnLoad', 'validate']
        .map(name => [name, floor[name].bind(floor)])),
    encounterOwner: (state = game, zoneId = state.currentZoneId) => floor.encounterOwner(state, zoneId),
    reserve: (row, state = game) => floor.reserve(state, row),
    releaseEncounter: (owner, cell) => {
        const result = floor.releaseEncounter(game, owner, cell);
        collect(result.collect);
        if (result.burst) addBattleFx('lootBurst', { duration: 400 });
        return result.count;
    },
    discardEncounter: (state, zoneId) => { collect(floor.discardEncounter(state, zoneId, state === game)); },
    normalizeEncounter: state => { for (const won of floor.normalizeEncounter(state, state === game)) collect(won); }
};
