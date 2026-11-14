function itemVisualAsset(deps, item, kind) {
    return itemVisualPickAsset(deps, item, kind);
}

function itemVisualPickAsset(deps, item, kind) {
    let visuals = typeof deps.ITEM_VISUAL_ASSET_DB !== 'undefined' ? deps.ITEM_VISUAL_ASSET_DB : null;
    if (!visuals) return '';
    if (kind === 'jewel') return deps.bagItems.jewelArt(item);
    if (kind === 'talisman') return item && item.family === 'talisman' ? deps.stumpBox.iconPath(item) : visuals.talisman;
    if (kind === 'core') return deps.coreItems.icon(item);
    return itemVisualEquipmentAsset(deps, item);
}

function itemVisualMarkup(deps, item, kind, className) {
    let asset = itemVisualAsset(deps, item, kind);
    if (!asset) return '';
    let label = (item && (item.name || item.baseName)) || '아이템';
    return `<img class="${className || 'inventory-item-visual'}" src="${asset}" alt="" aria-hidden="true" data-item-visual-label="${typeof deps.escapeHTML === 'function' ? deps.escapeHTML(label) : label}">`;
}

function itemVisualEquipmentAsset(deps, item) {
    return deps.bagItems.artOf(item) || itemVisualPickEquipmentAsset(deps, item);
}

function itemVisualPickEquipmentAsset(deps, item) {
    const visuals = deps.ITEM_VISUAL_ASSET_DB;
    if (!item) return visuals.equipment.default;
    const grid = visuals.equipmentGrid;
    if ((item.rarity || item.type) === 'unique' && Object.hasOwn(grid.uniqueAssets, item.name)) return grid.uniqueAssets[item.name];
    const exact = grid.baseAssets[item.baseId];
    if (exact) return exact;
    const slot = String(item.slot || '').replace(/[123]$/, '');
    if (slot === '무기') {
        const label = [item.baseId, item.baseName, item.name].filter(Boolean).join(' ').toLowerCase();
        const match = visuals.weaponKeywords.find(row => row.terms.some(term => label.includes(term)));
        if (match) return match.asset;
    }
    return visuals.equipment[slot] || visuals.equipment.default;
}

function itemVisualUniqueAsset(deps, entry) {
    const rule = deps.UNIQUE_EQUIPMENT_RULES[entry.name];
    return itemVisualEquipmentAsset(deps, { rarity: 'unique', name: entry.name, slot: entry.slots[0], baseId: rule ? rule.baseId : '' });
}

function itemVisualDualSlotLabel(targetSlot) {
    if (targetSlot === '반지1') return '왼쪽 반지';
    if (targetSlot === '반지2') return '오른쪽 반지';
    if (targetSlot === '장갑1') return '왼쪽 장갑';
    if (targetSlot === '장갑2') return '오른쪽 장갑';
    if (targetSlot === '무기') return '주 무기';
    if (targetSlot === '방패') return '완갑';
    return targetSlot;
}

function itemVisualBaseStepClass(info) {
    if (!info || !(info.total > 1)) return 'base-step-low';
    if (info.step >= info.total) return 'base-step-top';
    const ratio = (info.step - 1) / (info.total - 1);
    return ratio >= 2 / 3 ? 'base-step-high' : ratio >= 1 / 3 ? 'base-step-mid' : 'base-step-low';
}

function itemVisualShowBaseUpgrade(deps, currentBase, nextBase, cost) {
    let titleEl = deps.document.getElementById('base-upgrade-title');
    let bodyEl = deps.document.getElementById('base-upgrade-body');
    if (titleEl) titleEl.innerText = `${deps._t(currentBase.name)} → ${deps._t(nextBase.name)}`;
    if (bodyEl) {
        let curStats = (currentBase.baseStats || []).map(stat => `${deps.getStatName(stat.id)} ${deps.formatSignedValue(stat.id, stat.baseMin || stat.base)}~${deps.formatValue(stat.id, stat.baseMax || stat.base)}`).join(' / ');
        let nextStats = (nextBase.baseStats || []).map(stat => `${deps.getStatName(stat.id)} ${deps.formatSignedValue(stat.id, stat.baseMin || stat.base)}~${deps.formatValue(stat.id, stat.baseMax || stat.base)}`).join(' / ');
        bodyEl.innerHTML = `${deps._t('현재 베이스:')} <strong>${deps._t(currentBase.name)}</strong><br><span style="color:var(--copy-muted);">${curStats || deps._t('없음')}</span><br><br>${deps._t('업그레이드 베이스:')} <strong>${deps._t(nextBase.name)}</strong><br><span style="color:#ffd08a;">${nextStats || deps._t('없음')}</span><br><br>${deps._t('비용: 형체 없는 이슬 {formlessDew}', { formlessDew: cost.formlessDew })}${cost.goldenRule > 0 ? deps._t(' + 황금률 {goldenRule}', { goldenRule: cost.goldenRule }) : ''}<br><span style="color:var(--copy-muted);">${deps._t('총 이슬 가치 {totalDewValue}', { totalDewValue: cost.totalDewValue })}</span>`;
    }
    let overlay = deps.document.getElementById('base-upgrade-overlay');
    if (overlay) overlay.showModal();
}

function itemVisualCloseBaseUpgrade(deps) { const overlay = deps.document.getElementById('base-upgrade-overlay'); if (overlay) overlay.close(); }

export function createItemVisuals(deps) {
    return Object.freeze({
        getInventoryItemVisualAsset: (...args) => itemVisualAsset(deps, ...args),
        renderInventoryItemVisual: (...args) => itemVisualMarkup(deps, ...args),
        getEquipmentGridVisualAsset: (...args) => itemVisualEquipmentAsset(deps, ...args),
        pickEquipmentGridVisualAsset: (...args) => itemVisualPickEquipmentAsset(deps, ...args),
        getUniqueEntryVisualAsset: (...args) => itemVisualUniqueAsset(deps, ...args),
        getDualSlotDisplayLabel: itemVisualDualSlotLabel,
        getBaseStepClassName: itemVisualBaseStepClass,
        showBaseUpgrade: (...args) => itemVisualShowBaseUpgrade(deps, ...args),
        closeBaseUpgrade: (...args) => itemVisualCloseBaseUpgrade(deps, ...args)
    });
}
