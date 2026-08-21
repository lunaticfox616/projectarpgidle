function createDefaultHideoutState() {
    return { gridVersion:HIDEOUT_GRID_VERSION, initialized:false, active:false, placements:[], selectedDecorId:null };
}

function isHideoutRequirementMet(requirement, ownerState) {
    if (!requirement) return true;
    let source = ownerState || game;
    let loop = Math.max(1, Math.floor(Number(source.season) || 1), Math.floor(Number(source.loopCount) || 0));
    if (requirement.loop && loop < requirement.loop) return false;
    if (requirement.act) {
        let journal = Array.isArray(source.journalEntries) ? source.journalEntries : [];
        let claimed = Array.isArray(source.claimedActRewards) ? source.claimedActRewards : [];
        if (!journal.includes(`act_${requirement.act}`) && !claimed.includes(requirement.act - 1) && Math.floor(Number(source.maxZoneId) || 0) < requirement.act) return false;
    }
    if (requirement.journal) {
        let journal = Array.isArray(source.journalEntries) ? source.journalEntries : [];
        if (!journal.includes(requirement.journal)) return false;
    }
    return true;
}

function isHideoutUnlocked(ownerState) {
    return isHideoutRequirementMet({ act:HIDEOUT_UNLOCK_ACT }, ownerState || game);
}

function migrateHideoutCell(cell) {
    let legacyX = cell % 6;
    let legacyY = Math.floor(cell / 6);
    let gridX = Math.round(legacyX * (HIDEOUT_GRID_COLUMNS - 1) / 5);
    let gridY = Math.round(legacyY * (HIDEOUT_GRID_ROWS - 1) / 3);
    return gridY * HIDEOUT_GRID_COLUMNS + gridX;
}

function normalizeHideoutRotation(value) {
    let quarterTurns = Math.floor(Number(value) || 0) % 4;
    return quarterTurns < 0 ? quarterTurns + 4 : quarterTurns;
}

function getHideoutDecorSpriteCell(rotation) {
    return [
        { column:1, row:0 },
        { column:1, row:1 },
        { column:0, row:1 },
        { column:0, row:0 }
    ][normalizeHideoutRotation(rotation)];
}

function getHideoutDecorFootprint(decorId, rotation) {
    let decor = HIDEOUT_DECOR_DB.find(row => row.id === decorId);
    let footprint = decor && decor.footprint ? decor.footprint : { columns:1, rows:1 };
    let quarterTurns = normalizeHideoutRotation(rotation);
    return quarterTurns % 2 === 0
        ? { columns:footprint.columns, rows:footprint.rows }
        : { columns:footprint.rows, rows:footprint.columns };
}

function getHideoutPlacementCells(placement) {
    if (!placement || !Number.isInteger(placement.cell)) return [];
    let footprint = getHideoutDecorFootprint(placement.decorId, placement.rotation);
    let startX = placement.cell % HIDEOUT_GRID_COLUMNS;
    let startY = Math.floor(placement.cell / HIDEOUT_GRID_COLUMNS);
    let cells = [];
    for (let row = 0; row < footprint.rows; row++) {
        for (let column = 0; column < footprint.columns; column++) {
            let gridX = startX + column;
            let gridY = startY + row;
            if (gridX < 0 || gridY < 0 || gridX >= HIDEOUT_GRID_COLUMNS || gridY >= HIDEOUT_GRID_ROWS) return [];
            cells.push(gridY * HIDEOUT_GRID_COLUMNS + gridX);
        }
    }
    return cells;
}

function fitLoadedHideoutPlacementCell(decorId, cell, rotation) {
    if (!Number.isInteger(cell) || cell < 0) return cell;
    let footprint = getHideoutDecorFootprint(decorId, rotation);
    let gridX = Math.min(cell % HIDEOUT_GRID_COLUMNS, HIDEOUT_GRID_COLUMNS - footprint.columns);
    let gridY = Math.min(Math.floor(cell / HIDEOUT_GRID_COLUMNS), HIDEOUT_GRID_ROWS - footprint.rows);
    return gridY * HIDEOUT_GRID_COLUMNS + gridX;
}

function canAddHideoutPlacement(placement, occupiedCells) {
    let cells = getHideoutPlacementCells(placement);
    if (cells.length <= 0 || cells.includes(HIDEOUT_PLAYER_CELL)) return false;
    return !cells.some(cell => occupiedCells.has(cell));
}

function normalizeHideoutState(value, ownerState) {
    let source = value && typeof value === 'object' ? value : {};
    let sourceVersion = Math.floor(Number(source.gridVersion) || 1);
    let validIds = new Set(HIDEOUT_DECOR_DB.map(decor => decor.id));
    let usedIds = new Set();
    let usedCells = new Set();
    let placements = [];
    (Array.isArray(source.placements) ? source.placements : []).map(row => {
        let sourceCell = Math.floor(Number(row && row.cell));
        let rotation = normalizeHideoutRotation(row && row.rotation);
        let migratedCell = sourceVersion < HIDEOUT_GRID_VERSION ? migrateHideoutCell(sourceCell) : sourceCell;
        return {
            decorId: row && row.decorId,
            sourceCell,
            cell: fitLoadedHideoutPlacementCell(row && row.decorId, migratedCell, rotation),
            rotation
        };
    }).forEach(row => {
        let placement = { decorId:row.decorId, cell:row.cell, rotation:row.rotation };
        let sourceCellLimit = sourceVersion < HIDEOUT_GRID_VERSION
            ? 24 : HIDEOUT_GRID_COLUMNS * HIDEOUT_GRID_ROWS;
        if (!validIds.has(row.decorId) || !Number.isInteger(row.sourceCell)) return;
        if (row.sourceCell < 0 || row.sourceCell >= sourceCellLimit) return;
        if (row.cell < 0 || row.cell >= HIDEOUT_GRID_COLUMNS * HIDEOUT_GRID_ROWS) return;
        if (usedIds.has(row.decorId) || !canAddHideoutPlacement(placement, usedCells)) return;
        usedIds.add(row.decorId);
        getHideoutPlacementCells(placement).forEach(cell => usedCells.add(cell));
        placements.push(placement);
    });
    return {
        gridVersion: HIDEOUT_GRID_VERSION,
        initialized: !!source.initialized,
        active: !!source.active && isHideoutUnlocked(ownerState),
        placements,
        selectedDecorId: validIds.has(source.selectedDecorId) ? source.selectedDecorId : null
    };
}

function ensureHideoutState(ownerState) {
    let source = ownerState || game;
    let state = normalizeHideoutState(source.hideout, source);
    if (!state.initialized && isHideoutUnlocked(source)) {
        let occupied = new Set();
        HIDEOUT_DECOR_DB.filter(decor => decor.defaultCell !== undefined && isHideoutRequirementMet(decor.unlock, source)).forEach(decor => {
            let placement = { decorId:decor.id, cell:decor.defaultCell, rotation:0 };
            if (!canAddHideoutPlacement(placement, occupied)) return;
            state.placements.push(placement);
            getHideoutPlacementCells(placement).forEach(cell => occupied.add(cell));
        });
        state.initialized = true;
    }
    source.hideout = state;
    return state;
}

function getUnlockedHideoutDecor(ownerState) {
    return HIDEOUT_DECOR_DB.filter(decor => isHideoutRequirementMet(decor.unlock, ownerState || game));
}

function isHideoutActive(ownerState) {
    let source = ownerState || game;
    return !!(source.hideout && source.hideout.active && isHideoutUnlocked(source));
}

function setHideoutActive(active, ownerState) {
    let source = ownerState || game;
    if (active && !isHideoutUnlocked(source)) return false;
    ensureHideoutState(source).active = !!active;
    return true;
}

function getHideoutPlacementCollisions(placements, candidate, ignoredDecorIds) {
    let targetCells = new Set(getHideoutPlacementCells(candidate));
    let ignored = ignoredDecorIds || new Set();
    return placements.filter(row => !ignored.has(row.decorId)
        && getHideoutPlacementCells(row).some(cell => targetCells.has(cell)));
}

function canReplaceHideoutPlacements(placements, replacements, removedDecorIds) {
    let occupied = new Set();
    let kept = placements.filter(row => !removedDecorIds.has(row.decorId));
    return kept.concat(replacements).every(row => {
        if (!canAddHideoutPlacement(row, occupied)) return false;
        getHideoutPlacementCells(row).forEach(cell => occupied.add(cell));
        return true;
    });
}

function placeHideoutDecor(decorId, cell, rotation) {
    let state = ensureHideoutState(game);
    let targetCell = Math.floor(Number(cell));
    if (!getUnlockedHideoutDecor(game).some(decor => decor.id === decorId)) return false;
    let moving = state.placements.find(row => row.decorId === decorId);
    let candidate = { decorId, cell:targetCell, rotation:normalizeHideoutRotation(rotation === undefined && moving ? moving.rotation : rotation) };
    if (getHideoutPlacementCells(candidate).length <= 0) return false;
    let ignored = new Set(moving ? [decorId] : []);
    let collisions = getHideoutPlacementCollisions(state.placements, candidate, ignored);
    let replacements = [candidate];
    let removed = new Set([decorId]);
    if (collisions.length > 1 || (collisions.length === 1 && !moving)) return false;
    if (collisions.length === 1) {
        let swapped = { ...collisions[0], cell:moving.cell };
        replacements.push(swapped);
        removed.add(collisions[0].decorId);
    }
    if (!canReplaceHideoutPlacements(state.placements, replacements, removed)) return false;
    state.placements = state.placements.filter(row => !removed.has(row.decorId)).concat(replacements);
    state.selectedDecorId = null;
    if (typeof renderHideout === 'function') renderHideout();
    return true;
}

function rotateHideoutDecor(decorId) {
    let state = ensureHideoutState(game);
    let placement = state.placements.find(row => row.decorId === decorId);
    if (!placement) return false;
    let candidate = { ...placement, rotation:normalizeHideoutRotation(placement.rotation + 1) };
    let removed = new Set([decorId]);
    if (!canReplaceHideoutPlacements(state.placements, [candidate], removed)) return false;
    state.placements = state.placements.filter(row => row.decorId !== decorId).concat(candidate);
    if (typeof renderHideout === 'function') renderHideout();
    return true;
}

function selectHideoutDecor(decorId) {
    let state = ensureHideoutState(game);
    state.selectedDecorId = state.selectedDecorId === decorId ? null : decorId;
    if (typeof renderHideout === 'function') renderHideout();
}

function placeSelectedHideoutDecor(cell) {
    let state = ensureHideoutState(game);
    return state.selectedDecorId ? placeHideoutDecor(state.selectedDecorId, cell) : false;
}

function removeHideoutDecor(decorId) {
    let state = ensureHideoutState(game);
    let before = state.placements.length;
    state.placements = state.placements.filter(row => row.decorId !== decorId);
    if (state.selectedDecorId === decorId) state.selectedDecorId = null;
    if (typeof renderHideout === 'function') renderHideout();
    return state.placements.length < before;
}

function activateHideoutDecor(decorId) {
    let decor = HIDEOUT_DECOR_DB.find(row => row.id === decorId);
    if (!decor || !decor.action) return false;
    openTabPane(decor.action.tabId);
    if (decor.action.subtab && decor.action.tabId === 'tab-items') switchItemSubtab(decor.action.subtab);
    if (decor.action.subtab && decor.action.tabId === 'tab-skills') switchSkillSubtab(decor.action.subtab);
    return true;
}

safeExposeGlobals({
    createDefaultHideoutState, isHideoutRequirementMet, isHideoutUnlocked, normalizeHideoutState,
    ensureHideoutState, getUnlockedHideoutDecor, isHideoutActive, setHideoutActive,
    normalizeHideoutRotation, getHideoutDecorSpriteCell, getHideoutDecorFootprint, getHideoutPlacementCells,
    placeHideoutDecor, rotateHideoutDecor, selectHideoutDecor, placeSelectedHideoutDecor,
    removeHideoutDecor, activateHideoutDecor
});
