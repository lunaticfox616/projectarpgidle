import { matchSearchQuery } from '../common/text.mjs';
import { equipmentInventorySlot, setEquipmentSlotFilter, equipmentMobilePane } from '../state/search-filters.mjs';

function equipmentSearchStatText(deps, stat, resolveName) {
    const value = stat || {};
    const name = value.statName || (resolveName ? deps.getStatName(value.id || '') : '');
    return `${value.id || ''} ${name || ''}`;
}

export function getEquipmentSearchText(runtime, item) {
    const deps = runtime.deps;
    const base = (item.baseStats || []).map(stat => equipmentSearchStatText(deps, stat, false)).join(' ');
    const stats = (item.stats || []).map(stat => equipmentSearchStatText(deps, stat, true)).join(' ');
    const under = item.underEnchant ? `${equipmentSearchStatText(deps, item.underEnchant, true)} ${item.underEnchant.val || ''}` : '';
    return `${item.name || ''} ${item.baseName || ''} ${deps.getItemSlotDisplayLabel(item)} ${deps.getWeaponCategoryName(item)} ${item.rarity || ''} ${deps.ITEM_RARITY_LABELS[item.rarity] || ''} ${base} ${stats} ${under}`;
}

function syncSlotFilterOptions(runtime, select, slots) {
    if (!select) return;
    const signature = JSON.stringify(slots);
    if (select.dataset.optionSignature === signature) return;
    const deps = runtime.deps;
    select.innerHTML = `<option value="all">${deps._t('모든 칸')}</option>${slots.map(slot => `<option value="${deps.escapeHTML(slot)}">${deps.escapeHTML(deps.getItemSlotDisplayLabel(null, slot))}</option>`).join('')}`;
    select.dataset.optionSignature = signature;
}

export function getSortedEquipmentInventoryRows(runtime, query, isItemRarityVisible) {
    const { deps } = runtime;
    const owner = deps.game;
    let slotValue = equipmentInventorySlot(owner);
    const slots = Array.from(new Set(owner.inventory.map(item => item && item.slot).filter(Boolean))).sort((a, b) => a.localeCompare(b, deps.i18n.locale));
    if (!slots.includes(slotValue)) slotValue = 'all';
    const slotSelect = deps.document.getElementById('ui-equipment-slot-filter');
    syncSlotFilterOptions(runtime, slotSelect, slots);
    if (slotSelect) slotSelect.value = slotValue;
    const visualFilterActive = [slotValue !== 'all', String(query || '').trim().length > 0,
        owner.inventory.some(item => item && !isItemRarityVisible(item))].some(Boolean);
    const rows = owner.inventory.map((item, idx) => ({ item, idx })).map(row => {
        const item = row.item || {};
        const searchMatched = matchSearchQuery(getEquipmentSearchText(runtime, item), query);
        return { ...row, filterActive: visualFilterActive,
            filterMatched: ['all', item.slot].includes(slotValue) && isItemRarityVisible(item) && searchMatched };
    }).sort((a, b) => b.idx - a.idx);
    return deps.equipmentTriage ? deps.equipmentTriage.filterRows(rows) : rows;
}

export function setEquipmentInventoryView(runtime, key, value) {
    setEquipmentSlotFilter(runtime.deps.game, key, value);
    runtime.deps.updateStaticUI();
}

export function syncEquipmentMobilePane(runtime) {
    const pane = equipmentMobilePane(runtime.deps.game);
    const workspace = runtime.deps.document.querySelector('#item-tab-equip .equipment-workspace');
    if (workspace) workspace.dataset.mobilePane = pane;
}

export function setEquipmentMobilePane(runtime, pane) {
    if (!['inventory', 'loadout'].includes(pane)) return;
    equipmentMobilePane(runtime.deps.game, pane);
    syncEquipmentMobilePane(runtime);
    if (typeof runtime.deps.saveGame === 'function') runtime.deps.saveGame({ skipCloudSync: true });
}
