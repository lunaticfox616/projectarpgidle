function cloneGrowthMigrationValue(value) {
    return value === undefined ? null : JSON.parse(JSON.stringify(value));
}

function createGrowthMigrationBackup(state) {
    return {
        createdAt: Date.now(),
        saveVersion: state.saveVersion,
        equipment: cloneGrowthMigrationValue(state.equipment || {}),
        inventory: cloneGrowthMigrationValue(state.inventory || []),
        timeRift: cloneGrowthMigrationValue(state.timeRift || {}),
        blackMarket: cloneGrowthMigrationValue(state.blackMarket || {}),
        uniqueCodex: cloneGrowthMigrationValue(state.uniqueCodex || {})
    };
}

function placeMigratedEquippedItem(item, board) {
    let placement = findFirstGrowthPlacement(board, item);
    if (!placement) return false;
    board.placements.push({ itemId: item.id, ...placement });
    item.placement = { ...placement };
    return true;
}

function migrateTimeRiftGrowthItems(state) {
    let rift = state.timeRift;
    if (!rift || typeof rift !== 'object') return;
    ['altarUnique','altarRare'].forEach(key => {
        if (rift[key] && !rift[key].isGrowthItem) rift[key] = convertLegacyItemToGrowth(rift[key]);
    });
}

function migrateLegacyEquipmentToGrowth(state) {
    ensureGrowthBoardState(state);
    if (state.growthSystemVersion >= GROWTH_SYSTEM_VERSION) {
        syncGrowthBoardUnlocks(state);
        if (state === game) syncGrowthEquipmentBridge();
        return { migrated:false, converted:0, tokens:0 };
    }
    state.growthMigrationBackup = state.growthMigrationBackup || createGrowthMigrationBackup(state);
    syncGrowthBoardUnlocks(state);
    let board = state.growthBoard;
    let equipped = Object.values(state.equipment || {}).filter(Boolean);
    let inventory = Array.isArray(state.inventory) ? state.inventory.filter(Boolean) : [];
    let converted = 0, tokens = 0;
    equipped.concat(inventory).forEach((legacy, index) => {
        let item = convertLegacyItemToGrowth(legacy);
        if (!item) { tokens++; return; }
        if (state.growthInventory.some(row => row && String(row.id) === String(item.id))) item.id = `${item.id}-${index}`;
        state.growthInventory.push(item);
        converted++;
        if (index < equipped.length) placeMigratedEquippedItem(item, board);
    });
    if (converted === 0) {
        let starterFlower = createGrowthItemFromBase(GROWTH_BOARD_ITEMS.find(base => base.baseId === 'gb_flower_stormfork'), 'normal', 1);
        let starterBranch = createGrowthItemFromBase(GROWTH_BOARD_ITEMS.find(base => base.baseId === 'gb_branch_bastion'), 'normal', 1);
        state.growthInventory.push(starterFlower, starterBranch);
        placeMigratedEquippedItem(starterFlower, board);
        converted += 2;
    }
    state.inventory = [];
    state.equipment = {};
    state.growthMigrationTokens = Math.max(0, Math.floor(state.growthMigrationTokens || 0)) + tokens;
    migrateTimeRiftGrowthItems(state);
    state.growthSystemVersion = GROWTH_SYSTEM_VERSION;
    state.growthMigrationCompletedAt = Date.now();
    state.growthBoardDirty = true;
    if (state === game) ensureGrowthBoardEffectsCache();
    return { migrated:true, converted, tokens };
}

safeExposeGlobals({ createGrowthMigrationBackup, migrateLegacyEquipmentToGrowth });
