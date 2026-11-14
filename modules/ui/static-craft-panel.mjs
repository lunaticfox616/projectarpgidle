import { getCraftPickerBodyHtml } from './static-picker-cards.mjs';
import { getCraftActionValidators } from './static-craft-admission.mjs';

export function buildSporeSummaryHtml(runtime) {

    const item = (0, runtime.deps.getSelectedCraftItem)();
    const targetDisabled = !item || !(0, runtime.deps.isSporeCraftEquipment)(item);
    const advanced = runtime.deps.contentProgression.isUnlocked('advancedSpores');
    const riftBlock = item ? runtime.deps.equipmentCrafting.getRiftHarvestBlockReason(item) : '';
    const rule = runtime.deps.STUMP_BOX_HARVEST_CRAFT;
    const costs = [...rule.rot.map(color => [runtime.deps.stumpBox.harvestPriceKey('any', color), color]), [runtime.deps.stumpBox.harvestPriceKey(rule.riftKind), 'physical']];
    const held = costs.map(([key, color]) => `<div class="orb-tone" style="padding:5px; border-width:1px; border-style:solid; --orb-tone:${runtime.deps.STUMP_BOX_COLORS[color].tone}; font-size:12px;">${runtime.deps.stumpBox.harvestPriceName(key)}<br><strong>x ${runtime.deps.stumpBox.harvestPriceHeld(runtime.deps.game, key)}</strong></div>`).join('');
    return `<div class="craft-spores">
            <div class="craft-spores-title">${(0, runtime.deps._t)('수확 재료')}</div>
            <div style="display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:6px;">${held}</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                <button data-info-tooltip-anchor="1" onmouseenter="showSporeCraftTooltip(event,'corrupt')" onmousemove="showSporeCraftTooltip(event,'corrupt')" onmouseleave="hideInfoTooltip()" onclick="applyCorruptSporeToSelectedItem()" ${targetDisabled || !advanced ? 'disabled' : ''}>${(0, runtime.deps._t)('부패 수확 (화염, 냉기, 번개 식물 1씩)')}</button>
                <button data-info-tooltip-anchor="1" onmouseenter="showSporeCraftTooltip(event,'rift')" onmousemove="showSporeCraftTooltip(event,'rift')" onmouseleave="hideInfoTooltip()" onclick="applyRiftSporeToSelectedItem()" ${targetDisabled || !advanced || riftBlock ? 'disabled' : ''}>${(0, runtime.deps._t)('균열 수확 (화석 1, 뿌리 1)')}</button>
            </div>
        </div>`;

}

export function getCraftEmptyStateHtml(runtime) {

    return `<div class="cl-empty-head"><strong>${(0, runtime.deps._t)('제작할 장비를 고르세요')}</strong><button type="button" id="craft-target-inventory-open" onclick="openCraftItemPickerOverlay('inventory')">${(0, runtime.deps._t)('인벤토리에서 고르기')}</button></div>${getCraftPickerBodyHtml(runtime, 'equip')}`;

}

export function getCraftTargetControlsHtml(runtime) {

    return `<div class="craft-target-actions"><button type="button" id="craft-target-equip-open" onclick="event.stopPropagation(); openCraftItemPickerOverlay('equip')">${(0, runtime.deps._t)('장비')}</button><button type="button" id="craft-target-inventory-open" onclick="event.stopPropagation(); openCraftItemPickerOverlay('inventory')">${(0, runtime.deps._t)('인벤토리')}</button></div>`;

}

export function buildCraftActionButtons(runtime, item) {

    let v = getCraftActionValidators(runtime, item);
    let defs = [
        { key:'baseUpgrade', label:(0, runtime.deps._t)('베이스 업그레이드'), onclick:'upgradeSelectedItemBase()' }
    ];
    return defs.map(d => `<button onclick="${d.onclick}" ${v[d.key] ? '' : 'disabled'}>${(0, runtime.deps._t)(d.label)}</button>`).join('');

}

export function renderStaticCrafting(runtime, itemsTabActive) {
    if (itemsTabActive) {
        let selectedItem=(0, runtime.deps.getSelectedCraftItem)(), details='';
        if(selectedItem){
            let equipSelectedButtonHtml = (0, runtime.deps.isCraftSelectionEquip)() ? '' : `<button onclick="equipSelectedCraftInventoryItem()">${(0, runtime.deps._t)('착용')}</button>`;
            let selectedUniqueEffectHtml = getSelectedUniqueEffectHtml(runtime, selectedItem);
            details=selectedUniqueEffectHtml+'<div class="craft-actions">'+equipSelectedButtonHtml+buildCraftActionButtons(runtime, selectedItem)+'</div>';
        }
        runtime.deps.craftingWorkspaceUi.render(false,{details,useState:runtime.handlers.getMobileCraftCurrencyUseState,targetControls:runtime.handlers.getCraftTargetControlsHtml,emptyState:runtime.handlers.getCraftEmptyStateHtml});
        (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById('ui-craft-spore-actions'), buildSporeSummaryHtml(runtime));
    }
}

function getSelectedUniqueEffectHtml(runtime, selectedItem) {
    let selectedUniqueEffectHint = selectedItem.rarity === 'unique' && selectedItem.uniqueEffect
        ? (0, runtime.deps.getUniqueEffectApplicationHint)(selectedItem, typeof runtime.deps.isCraftSelectionEquip === 'function' && (0, runtime.deps.isCraftSelectionEquip)(), typeof runtime.deps.getCraftSelectionRef === 'function' ? (0, runtime.deps.getCraftSelectionRef)() : null)
        : '';
    let selectedUniqueEffectHtml = selectedItem.rarity === 'unique' && selectedItem.uniqueEffect
        ? `<div class="craft-unique-effect"><strong>${(0, runtime.deps._t)('고유 효과')}</strong><span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(selectedItem.uniqueEffect))}</span>${selectedUniqueEffectHint ? `<small>${(0, runtime.deps.escapeHTML)(selectedUniqueEffectHint)}</small>` : ''}</div>`
        : '';
    return selectedUniqueEffectHtml;
}
