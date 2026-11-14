export function renderEquipmentBagPanel(runtime, sf, isItemRarityVisible, renderRarityFilterChips) {

    (0, runtime.deps.syncSalvageControlsFromSettings)();
    if (typeof runtime.deps.salvageRecoveryUi !== 'undefined') runtime.deps.salvageRecoveryUi.refreshShortcut();
    runtime.deps.equipmentWindowUi.renderBag();
    let invRarityFilterHost = runtime.deps.document.getElementById('ui-inventory-rarity-filter');
    if (invRarityFilterHost) (0, runtime.deps.writeHtmlIfChanged)(invRarityFilterHost, renderRarityFilterChips('inventory'));
    if (runtime.deps.equipmentTriage) {
        runtime.deps.equipmentTriage.autoStart();
        runtime.deps.equipmentTriage.render();
    }
    const equipInvRows = (0, runtime.deps.getSortedEquipmentInventoryRows)(sf.equip, isItemRarityVisible);
    const equipmentGridLayout = runtime.deps.equipmentInventoryGridRuntime.ensureState(runtime.deps.game);
    const equipmentPage = runtime.deps.equipmentInventoryInteraction.renderPageControls(equipmentGridLayout, equipInvRows, sf.equip);
    const equipmentPageLayout = runtime.deps.equipmentInventoryGridRuntime.getPageLayout(equipmentGridLayout, equipmentPage);
    const equipmentPageKeys = new Set(equipmentPageLayout.entries.map(entry => entry.key));
    const equipmentPageRows = equipInvRows.filter(row => equipmentPageKeys.has(runtime.deps.equipmentInventoryGridRuntime.getItemKey(row.item)));
    (0, runtime.deps.renderEquipmentInventoryInspector)(equipmentPageRows);
    // 드래그 중에는 포인터 캡처 중인 DOM을 유지하고, 놓을 때 배치를 갱신한다.
    if (!runtime.deps.equipmentInventoryInteraction.isCarrying()) {
        (0, runtime.deps.renderSearchSection)('ui-inventory-list', 'equip', '장비 검색 (이름/슬롯/옵션)', (0, runtime.deps.renderEquipmentInventoryGrid)(equipmentPageLayout, equipmentPageRows), '', '');
        let equipmentGridElement = runtime.deps.document.querySelector('#ui-inventory-list > .search-result-list');
        if (equipmentGridElement) equipmentGridElement.dataset.equipmentGridRows = String(equipmentPageLayout.rows);
    }

}

export function renderStaticEquipment(runtime, context) {
    const { itemsTabActive, pStats, sf } = context;
    if (itemsTabActive) {
        (0, runtime.deps.syncEquipmentMobilePane)();
        (0, runtime.deps.renderEquipmentLoadoutSummary)(pStats);
        if (runtime.deps.equipmentLoadoutUi) runtime.deps.equipmentLoadoutUi.render();
        (0, runtime.deps.renderPaperdoll)('ui-equip-list', false);
    } else if (runtime.deps.craftPickerHostUi.shows('equip')) (0, runtime.deps.renderPaperdoll)('ui-equip-list', false);
    // 가방은 장비 창, 그루터기 함 탭의 왼쪽 보석이 띄운 자리(그 자리로 옮기는 것은 syncEquipmentBag), 또는 제작실의 인벤토리 고르기 창에 그린다.
    if (runtime.deps.stumpBoxUi.syncEquipmentBag(itemsTabActive) || itemsTabActive || runtime.deps.craftPickerHostUi.shows('inventory')) renderEquipmentBagPanel(runtime, sf, runtime.handlers.isItemRarityVisible, runtime.handlers.renderRarityFilterChips);
}
