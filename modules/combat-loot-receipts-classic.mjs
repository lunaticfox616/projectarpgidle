import { createCombatLootReceipts } from './domain/combat-loot-receipts.mjs';
// Shared capture owner for every current consumer. Retire with the final import-based bootstrap.
const combatLootReceipts = createCombatLootReceipts({
    get atlasZoneId() { return ATLAS.zoneId; }, get currencies() { return ORB_DB; },
    get moments() { return lootMoments; }, get memoryLeaves() { return memoryLeaves; },
    get knitting() { return knitting; }, get leafCap() { return MEMORY_LEAVES.countCap; }, get yarnCap() { return KNITTING.countCap; }
});
safeExposeGlobals({ combatLootReceipts });
