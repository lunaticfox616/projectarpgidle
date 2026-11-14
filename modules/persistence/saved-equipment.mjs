export function savedItemsOf(merged) {
    const offline = merged.offlineProgress || {}, rift = merged.timeRift || {};
    const presets = ((merged.equipmentLoadouts || {}).presets || []).filter(Boolean).flatMap(preset => Object.values(preset.slots || {}));
    const listings = ((merged.playerStall || {}).listings || []).map(row => row && row.item);
    return [merged.inventory, Object.values(merged.equipment || {}), merged.equipmentTemporaryStorage, offline.stash, offline.protectedOverflow,
        rift.altarUnique, rift.altarRare, presets, listings].flat().filter(item => item && typeof item === 'object');
}

// Only already-equipped pre-level-system items receive grace, until their next removal.
export function markLegacyEquipmentGrace(equipment) {
    Object.values(equipment).forEach(item => {
        if (item && !item.requirementsVersion) item.legacyRequirementGrace = true;
    });
}

export function normalizeCarriedEquipmentSave(deps, state) {
    state.inventory = (state.inventory || []).map(deps.normalizeItem);
    state.equipmentTemporaryStorage = Array.isArray(state.equipmentTemporaryStorage)
        ? state.equipmentTemporaryStorage.map(deps.normalizeItem) : [];
    Object.keys(state.equipment).forEach(slot => state.equipment[slot] = (0, deps.normalizeItem)(state.equipment[slot]));
}

/** Run after exploration restoration: retained floor loot and settled rewards now have their final owners. Preset references
 * are not equipment; only actual gear is normalized. The woodsman snapshot must agree before its next locked-build tick. */
export function normalizeStoredEquipmentSave(deps, state) {
    const snapshots = [state, state.woodsmanBuildSnapshot].filter(row => row && typeof row === 'object');
    const items = snapshots.flatMap(savedItemsOf).concat(deps.actExplorationLoot.reservedItems(state), deps.actExplorationState.groundLoot.reservedItems(state));
    for (const item of new Set(items)) {
        if (item && typeof item.slot === 'string' && Array.isArray(item.baseStats)) (0, deps.normalizeItem)(item);
    }
}

/** 성화 choices contain craft fields, not complete gear. Rename them with their owning base without rolling or replacing any
 * result, so the first-choice identity check still recognizes the item after a shield base was renamed. */
export function normalizeEquipmentCraftChoiceSave(deps, state) {
    state.craftChoice = (0, deps.normalizeCraftChoice)(state.craftChoice);
    if (!state.craftChoice) return;
    const item = savedItemsOf(state).find(row => row.id === state.craftChoice.itemId && ['방패', '무기'].includes(row.slot));
    if (!item) return;
    state.craftChoice.options.forEach(fields => {
        const named = { ...fields, slot: item.slot, baseId: item.baseId, baseName: item.baseName };
        (0, deps.normalizeArmGuardIdentity)(named);
        fields.name = named.name;
    });
}

/** Save 19 (2026-10-07): rings, amulets and belts lost the void socket every one of them used to have (js/equipment-sockets.js).
 * An older save keeps that socket on every accessory it already owns, as an open record, so nothing loses a socket it had. The
 * stores are those js/save.js refreshItemIdCounter reads, less the drops still lying on a map floor: their readers expect a
 * restored run, and at worst such a drop arrives without the old socket (a socket holding a jewel always keeps its record). */
export function keepLegacyAccessorySockets(deps, merged, save) {
    if ((save.saveVersion || 0) >= 19 || typeof deps.equipmentSockets !== 'object') return;
    legacySocketStores(merged).flat().forEach(deps.equipmentSockets.keepLegacySocket);
}

export function legacySocketStores(merged) {
    const rift = merged.timeRift || {}, offline = merged.offlineProgress || {};
    const presets = ((merged.equipmentLoadouts || {}).presets || []).filter(Boolean).flatMap(preset => Object.values(preset.slots || {}));
    const stall = ((merged.playerStall || {}).listings || []).map(row => row && row.item);
    return [merged.inventory, Object.values(merged.equipment || {}), rift.altarUnique, rift.altarRare, offline.stash,
        offline.protectedOverflow, merged.equipmentTemporaryStorage, presets, stall];
}

/** Slot corrections preserve ownership, even when the inventory is already full. */
/** Uniques renamed since the save was written (data/items.js RENAMED_UNIQUES): worn, carried, stashed, on the altar, in loadouts. */
export function renameRetiredUniques(deps, state) {
    const rename = item => {
        if (item && item.rarity === 'unique' && deps.RENAMED_UNIQUES[item.name]) item.name = deps.RENAMED_UNIQUES[item.name];
    };
    savedItemsOf(state).forEach(rename);
    state.seasonChaseUniqueDrops = state.seasonChaseUniqueDrops.map(name => deps.RENAMED_UNIQUES[name] || name);
    // A preset ref has no rarity: '용비늘 방패' was both a base and a unique name, so a ref to owned gear takes that gear's name.
    const owned = new Map(savedItemsOf(state).filter(item => item && Array.isArray(item.baseStats)).map(item => [item.id, item]));
    (state.equipmentLoadouts?.presets || []).forEach(preset => Object.entries(preset?.slots || {}).forEach(([slot, ref]) => {
        if (!ref) return;
        if (owned.has(ref.id)) { ref.name = owned.get(ref.id).name; return; }
        const named = { slot, name: deps.RENAMED_UNIQUES[ref.name] || ref.name };
        (0, deps.normalizeArmGuardIdentity)(named);
        ref.name = named.name;
    }));
}

export function reconcileUniqueEquipmentSave(deps, state) {
    renameRetiredUniques(deps, state);
    savedItemsOf(state).forEach(deps.equipmentSockets.migrateHarvest);
    Object.values(state.npcShops || {}).forEach(shop => (Array.isArray(shop?.offers) ? shop.offers : []).forEach(ware => {
        if (ware?.item) ware.item = (0, deps.normalizeItem)(ware.item);
    }));
    for (const [slot, item] of Object.entries(state.equipment)) {
        if (!item?.uniqueBaseLegacy || (0, deps.getEquipCandidateSlots)(item, state).includes(slot)) continue;
        delete item.legacyRequirementGrace;
        state.inventory.push(item);
        state.equipment[slot] = null;
    }
    // Jewels and cores have no baseStats, so normalizeStoredEquipmentSave skips them: the altar keeps its own pass.
    state.timeRift.altarUnique = (0, deps.normalizeItem)(state.timeRift.altarUnique);
    migrateUniqueCodexKeys(deps, state.uniqueCodex);
    migrateUniqueCodexKeys(deps, state.codexNewlyRegistered);
    deps.equipmentInventoryGridRuntime.ensureState(state);
}

export function migrateUniqueCodexKeys(deps, records) {
    for (const [key, found] of Object.entries(records)) {
        const next = migrateUniqueCodexKey(deps, key);
        if (found && typeof found === 'object' && found.rarity === 'unique') {
            found.name = deps.RENAMED_UNIQUES[found.name] || found.name;
            (0, deps.normalizeItem)(found);
        }
        if (next === key) continue;
        if (found && typeof found === 'object') found.slot = next.split('|')[0];
        records[next] ||= found;
        delete records[key];
    }
}

export function migrateUniqueCodexKey(deps, key) {
    const text = String(key), cut = text.indexOf('|');
    const written = text.slice(cut + 1), name = deps.RENAMED_UNIQUES[written] || written;
    // A renamed unique keeps the slot its key already names unless its rule moved it.
    const keptSlot = name !== written && cut > 0 ? text.slice(0, cut) : '';
    const slot = deps.UNIQUE_EQUIPMENT_RULES[name]?.slot || keptSlot;
    return slot ? `${slot}|${name}` : key;
}

export function normalizeUniqueHuntSave(deps, state) {
    state.uniqueHuntTargets = Array.isArray(state.uniqueHuntTargets)
        ? state.uniqueHuntTargets.map(((...args) => migrateUniqueCodexKey(deps, ...args))) : [];
    if (typeof deps.uniqueHuntRuntime !== 'undefined') deps.uniqueHuntRuntime.ensureState(state);
}
