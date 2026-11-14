export function getInventoryRarityFilterKeys() {
    return ['normal', 'magic', 'rare', 'unique'];
}

export function getInventoryRarityFilterLabels(runtime) {
    return runtime.deps.ITEM_RARITY_LABELS;
}

export function getInventoryRarityFilter(runtime) {

    runtime.deps.game.settings = runtime.deps.game.settings || {};
    let f = runtime.deps.game.settings.inventoryViewRarities;
    if (!f || typeof f !== 'object') f = runtime.deps.game.settings.inventoryViewRarities = {};
    getInventoryRarityFilterKeys().forEach(r => { if (typeof f[r] !== 'boolean') f[r] = true; });
    return f;

}

export function isItemRarityVisible(runtime, item) {

    let rarity = (item && item.rarity) || 'normal';
    if (!getInventoryRarityFilterKeys().includes(rarity)) return true;
    return !!getInventoryRarityFilter(runtime)[rarity];

}

export function isAllInventoryRarityFilterOn(runtime) {

    let f = getInventoryRarityFilter(runtime);
    return getInventoryRarityFilterKeys().every(k => !!f[k]);

}

export function renderRarityFilterChips(runtime, scope) {

    let f = getInventoryRarityFilter(runtime);
    let labels = getInventoryRarityFilterLabels(runtime);
    let stop = scope === 'picker' ? 'event.stopPropagation(); ' : '';
    let allOn = isAllInventoryRarityFilterOn(runtime);
    let allChip = `<button type="button" class="rarity-filter-chip rarity-all${allOn ? ' active' : ''}" aria-pressed="${allOn}" onclick="${stop}toggleAllInventoryRarityFilter()">${(0, runtime.deps._t)('전체')}</button>`;
    let chips = getInventoryRarityFilterKeys().map(key => {
        let active = !!f[key];
        return `<button type="button" class="rarity-filter-chip rarity-${key}${active ? ' active' : ''}" aria-pressed="${active}" onclick="${stop}toggleInventoryRarityFilter('${key}')">${(0, runtime.deps._t)(labels[key])}</button>`;
    }).join('');
    return allChip + chips;

}

export function getAutoSalvageRarities(runtime) {

    runtime.deps.game.settings = runtime.deps.game.settings || {};
    let f = runtime.deps.game.settings.autoSalvageRarities;
    if (!f || typeof f !== 'object') f = runtime.deps.game.settings.autoSalvageRarities = { normal: true, magic: true, rare: false, unique: false };
    getInventoryRarityFilterKeys().forEach(r => { if (typeof f[r] !== 'boolean') f[r] = false; });
    return f;

}

export function renderAutoSalvageRarityChips(runtime) {

    let f = getAutoSalvageRarities(runtime);
    let labels = getInventoryRarityFilterLabels(runtime);
    return getInventoryRarityFilterKeys().map(key => {
        let active = !!f[key];
        return `<button type="button" class="rarity-filter-chip rarity-${key}${active ? ' active' : ''}" aria-pressed="${active}" onclick="toggleAutoSalvageRarity('${key}')">${labels[key]}</button>`;
    }).join('');

}
