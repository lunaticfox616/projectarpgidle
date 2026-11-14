import { createColonyWards } from './domain/colony-wards.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createColonyWards({
    get contentProgression() { return typeof contentProgression === 'undefined' ? undefined : contentProgression; },
    get hashSeed() { return hashSeed; },
    get getTranscendentVoidPassiveCount() { return typeof getTranscendentVoidPassiveCount === 'undefined' ? undefined : getTranscendentVoidPassiveCount; },
    get hasKeystone() { return typeof hasKeystone === 'undefined' ? undefined : hasKeystone; },
    nextItemId: () => ++window.GameModules.state.session.itemIdCounter,
    get normalizeItem() { return typeof normalizeItem === 'undefined' ? undefined : normalizeItem; },
    get COLONY_WARD_POOL() { return COLONY_WARD_POOL; },
    get _t() { return _t; },
    get canStoreEquipmentItems() { return canStoreEquipmentItems; },
    get COLONY_WARD_RULES() { return COLONY_WARD_RULES; },
    get COLONY_WARD_UNIQUES() { return COLONY_WARD_UNIQUES; }
});
const effects = {
    keepWardDrop: (...args) => keepEquipmentDrop(...args),
    storeWard: (...args) => addItemToInventory(...args),
    equipWard: (...args) => equipIntoFirstEmptySlot(...args)
};

// Storage/auto-equip feedback stays at the application boundary. Charge only after acceptance.
function runWardCommands(commands) {
    return consumeDomainCommands(commands, effects);
}

const colonyWards = Object.freeze({ ...rules,
    keptOnPickup: (item, owner = game) => rules.keptOnPickup(item, owner),
    unlocked: (state = game) => rules.unlocked(state),
    beltRoll: (item, state = game) => rules.beltRoll(item, state),
    slotCount: (state = game) => rules.slotCount(state),
    slotChange: (item, slot, state = game) => rules.slotChange(item, slot, state),
    openSlots: (state = game) => rules.openSlots(state),
    pickSlot: (state = game) => rules.pickSlot(state),
    equippedLines: (state = game) => rules.equippedLines(state),
    incidentMul: (state = game) => rules.incidentMul(state),
    rollFieldDrop: (enemy, zone, random) => runWardCommands(rules.rollFieldDrop(game, enemy, zone, random)),
    rollColonyWave: (wave, zone, random, where) => runWardCommands(rules.rollColonyWave(game, wave, zone, { random, where })),
    craft: (state = game, random) => runWardCommands(rules.craft(state, random))
});
safeExposeGlobals({ colonyWards });
