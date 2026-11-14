/** Existing save preference repair; callers always pass the current game after a restore. */
export function getSearchFilters(game) {
    game.settings = game.settings || {};
    game.settings.searchFilters = (game.settings.searchFilters && typeof game.settings.searchFilters === 'object') ? game.settings.searchFilters : {};
    const filters = game.settings.searchFilters;
    for (const key of ['equip', 'colonyWard', 'skill', 'support']) filters[key] = String(filters[key] || '');
    return filters;
}

export function equipmentInventorySlot(owner) {
    owner.settings = owner.settings || {};
    return owner.settings.equipmentSlotFilter || 'all';
}

export function setEquipmentSlotFilter(owner, key, value) {
    owner.settings = owner.settings || {};
    if (key === 'slot') owner.settings.equipmentSlotFilter = String(value || 'all');
}

export function equipmentMobilePane(owner, requestedPane) {
    owner.settings = owner.settings || {};
    if (requestedPane !== undefined) owner.settings.equipmentMobilePane = requestedPane;
    const pane = owner.settings.equipmentMobilePane === 'loadout' ? 'loadout' : 'inventory';
    owner.settings.equipmentMobilePane = pane;
    return pane;
}
