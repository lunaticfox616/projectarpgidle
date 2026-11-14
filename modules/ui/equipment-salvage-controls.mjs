

export function syncSalvageControlsFromSettings(deps) {
    deps.game.settings.autoSalvageRarities = deps.game.settings.autoSalvageRarities || { normal: true, magic: true, rare: false, unique: false };
    ['normal', 'magic', 'rare', 'unique'].forEach(rarity => {
        let el = deps.document.getElementById(`chk-salvage-${rarity}`);
        if (el) el.checked = !!deps.game.settings.autoSalvageRarities[rarity];
    });
    // 장비창 도구 줄의 해체 단추: 자동해체가 켜져 있으면 초록 점(css/equipment-window.css)
    let btn = deps.document.getElementById('eqw-rail-salvage');
    if (btn) {
        let enabled = !!deps.game.settings.autoSalvageEnabled;
        btn.dataset.enabled = String(enabled);
        btn.setAttribute('aria-label', (0, deps._t)('해체, 자동해체 {value}', { value: enabled ? (0, deps._t)('켜짐') : (0, deps._t)('꺼짐') }));
    }
}

export function toggleAutoSalvage(deps) {
    let f = deps.game.settings.autoSalvageRarities || {};
    if (!deps.game.settings.autoSalvageEnabled) {
        let active = ['normal', 'magic', 'rare', 'unique'].filter(r => f[r]);
        if (active.length === 0) return (0, deps.addLog)((0, deps._t)('자동해체할 등급을 먼저 선택하세요.'), 'attack-monster');
    }
    deps.game.settings.autoSalvageEnabled = !deps.game.settings.autoSalvageEnabled;
    syncSalvageControlsFromSettings(deps);
    (0, deps.queueImportantSave)(200);
    (0, deps.addLog)(`⚙️ ${(0, deps._t)('자동해체')} ${(0, deps._t)(deps.game.settings.autoSalvageEnabled ? '활성화' : '비활성화')}`, 'loot-normal');
}

export function getActiveRarityFilterSet(deps) {
    let f = (typeof deps.getInventoryRarityFilter === 'function')
        ? (0, deps.getInventoryRarityFilter)()
        : ((deps.game.settings && deps.game.settings.inventoryViewRarities) || { normal: true, magic: true, rare: true, unique: true });
    return ['normal', 'magic', 'rare', 'unique'].filter(rarity => !!f[rarity]);
}

export function getShownSlotFilter(deps) {
    let slot = String((deps.game.settings && deps.game.settings.equipmentSlotFilter) || 'all');
    return slot !== 'all' && (deps.game.inventory || []).some(item => item && item.slot === slot) ? slot : 'all';
}
