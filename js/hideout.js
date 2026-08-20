function createDefaultHideoutState() {
    return { initialized: false, placements: [], selectedDecorId: null };
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

function normalizeHideoutState(value, ownerState) {
    let source = value && typeof value === 'object' ? value : {};
    let validIds = new Set(HIDEOUT_DECOR_DB.map(decor => decor.id));
    let usedIds = new Set();
    let usedCells = new Set();
    let placements = (Array.isArray(source.placements) ? source.placements : []).filter(row => {
        let cell = Math.floor(Number(row && row.cell));
        let id = row && row.decorId;
        if (!validIds.has(id) || cell < 0 || cell >= HIDEOUT_GRID_COLUMNS * HIDEOUT_GRID_ROWS) return false;
        if (usedIds.has(id) || usedCells.has(cell)) return false;
        usedIds.add(id);
        usedCells.add(cell);
        return true;
    }).map(row => ({ decorId:row.decorId, cell:Math.floor(Number(row.cell)) }));
    return {
        initialized: !!source.initialized,
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
            if (occupied.has(decor.defaultCell)) return;
            state.placements.push({ decorId:decor.id, cell:decor.defaultCell });
            occupied.add(decor.defaultCell);
        });
        state.initialized = true;
    }
    source.hideout = state;
    return state;
}

function getUnlockedHideoutDecor(ownerState) {
    return HIDEOUT_DECOR_DB.filter(decor => isHideoutRequirementMet(decor.unlock, ownerState || game));
}

function placeHideoutDecor(decorId, cell) {
    let state = ensureHideoutState(game);
    let targetCell = Math.floor(Number(cell));
    if (!getUnlockedHideoutDecor(game).some(decor => decor.id === decorId)) return false;
    if (targetCell < 0 || targetCell >= HIDEOUT_GRID_COLUMNS * HIDEOUT_GRID_ROWS) return false;
    let moving = state.placements.find(row => row.decorId === decorId);
    let occupied = state.placements.find(row => row.cell === targetCell && row.decorId !== decorId);
    if (moving && occupied) occupied.cell = moving.cell;
    else if (occupied) state.placements = state.placements.filter(row => row !== occupied);
    if (moving) moving.cell = targetCell;
    else state.placements.push({ decorId, cell:targetCell });
    state.selectedDecorId = null;
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
    ensureHideoutState, getUnlockedHideoutDecor, placeHideoutDecor, selectHideoutDecor,
    placeSelectedHideoutDecor, removeHideoutDecor, activateHideoutDecor
});
