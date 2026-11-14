// Saved spore mode names and harvest prices are unchanged. The caller owns the save.
export function availableCraftHarvestModes(deps, owner) {
    const modes = ['none', 'fire', 'cold', 'light'];
    if (deps.contentProgression.isUnlocked('advancedSpores', owner)) modes.push('chaos', 'damage');
    return modes;
}

export function craftHarvestBlockReason(deps, owner, item, action, { mode, omen = null }) {
    if (['chaos', 'damage'].includes(mode) && !availableCraftHarvestModes(deps, owner).includes(mode)) {
        return '카오스, 피해 계열 수확 제작은 고급 수확 제작을 해금해야 쓸 수 있습니다.';
    }
    const reason = deps.equipmentCrafting.getSporeBlockReason(item, action, mode);
    if (reason || mode === 'none' || !deps.equipmentCrafting.basicActions.includes(action)) return reason;
    return deps.equipmentCrafting.sporePool(item, action, mode, omen).length
        ? '' : '선택한 수확 계열에서 새로 부여할 수 있는 옵션이 없습니다.';
}

export function isCraftHarvestEquipment(deps, item) {
    if (!item) return false;
    const slot = String(item.slot || '').replace(/[123]$/, '');
    return deps.EQUIPMENT_DROP_SLOTS.includes(slot);
}

export function craftHarvestPriceKey(deps, mode) {
    return deps.stumpBox.harvestPriceKey('any', deps.STUMP_BOX_HARVEST_CRAFT.colors[mode]);
}

export function hasCraftHarvestCost(deps, owner, mode) {
    if (!mode || mode === 'none' || !Object.hasOwn(deps.STUMP_BOX_HARVEST_CRAFT.colors, mode)) return true;
    return deps.stumpBox.harvestPriceHeld(owner, craftHarvestPriceKey(deps, mode)) >= 1;
}
