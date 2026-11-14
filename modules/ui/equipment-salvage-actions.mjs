import { getActiveRarityFilterSet, getShownSlotFilter } from './equipment-salvage-controls.mjs';
import { formatSalvageRewardSummary } from './equipment-salvage-text.mjs';

export async function salvageJewel(deps, jewelId) {
    let jewel = deps.bagItems.jewels().find(row => row.id === jewelId);
    if (!jewel) return false;
    if (jewel.rarity === 'unique' && !await (0, deps.requestGameConfirmation)(`[${jewel.name || (0, deps._t)('고유 주얼')}]${(0, deps.pickParticle)(jewel.name || '고유 주얼', '을', '를')} 해체합니다.\n주얼 결정 ${(0, deps.getJewelSalvageShardGain)(jewel)}개를 획득하며 되돌릴 수 없습니다.`, {
        title: (0, deps._t)('고유 주얼 해체'),
        tone: 'danger',
        confirmLabel: (0, deps._t)('해체')
    })) return false;
    if (!deps.bagItems.take(jewel)) return false;
    (0, deps.salvageJewelObject)(jewel, false);
    (0, deps.dispatchRuntimeEvent)('items-salvaged', { count: 1 });
    (0, deps.updateStaticUI)();
    return true;
}

export function salvageItem(deps, idx) {
    let item = deps.game.inventory[idx];
    if (!item) return;
    if (item.locked) return (0, deps.addLog)((0, deps._t)('🔒 잠금된 아이템은 해체할 수 없습니다. [{name}]', { name: (0, deps._t)(item.name) }), 'attack-monster');
    if (typeof deps.equipmentLoadoutRuntime !== 'undefined' && deps.equipmentLoadoutRuntime.isReferenced(item)) {
        return (0, deps.addLog)((0, deps._t)('🧰 장비 세팅에 저장된 아이템은 해체할 수 없습니다. [{name}]', { name: (0, deps._t)(item.name) }), 'attack-monster');
    }
    if (!(0, deps.isCraftSelectionEquip)() && (0, deps.getCraftSelectionRef)() === item.id) (0, deps.clearCraftSelection)();
    (0, deps.salvageItemObject)(item, false);
    deps.game.inventory.splice(idx, 1);
    (0, deps.dispatchRuntimeEvent)('items-salvaged', { count: 1 });
    (0, deps.updateStaticUI)();
}

export async function bulkSalvageSelected(deps) {
    let selectedRarities = getActiveRarityFilterSet(deps);
    if (selectedRarities.length === 0) return (0, deps.addLog)((0, deps._t)('해체할 등급을 먼저 선택하세요. (등급 필터에서 선택)'), 'attack-monster');
    let rarityLabels = deps.ITEM_RARITY_LABELS;
    let shownSlot = getShownSlotFilter(deps);
    let isShown = item => selectedRarities.includes(item.rarity) && (shownSlot === 'all' || item.slot === shownSlot);
    let targetItems = (deps.game.inventory || []).filter(item => item && !(0, deps.isBulkSalvageProtectedItem)(item) && isShown(item));
    let targetCount = targetItems.length;
    if (targetCount <= 0) return (0, deps.addLog)((0, deps._t)('선택한 등급의 해체 가능한 장비가 없습니다.'), 'attack-monster');
    let labelText = selectedRarities.map(r => rarityLabels[r] || r).join('/');
    const note = deps.bagItems.countNote(targetItems);
    if (!await (0, deps.requestGameConfirmation)(`[${labelText}] 등급 ${shownSlot === 'all' ? (0, deps._t)('장비') : shownSlot} ${targetCount}개를 해체합니다.${note ? `\n${note} 포함` : ''}\n잠금, 세팅, 우선 보관 장비는 빼고 해체합니다.`, {
        title: (0, deps._t)('등급 일괄 해체'),
        tone: 'danger',
        confirmLabel: (0, deps._t)('{targetCount}개 해체', { targetCount })
    })) return;
    const targets = (0, deps.confirmedSalvageTargets)(targetItems);
    const lockedSkipped = deps.game.inventory.filter(item => isShown(item) && (0, deps.isBulkSalvageProtectedItem)(item)).length;
    if (targets.length === 0) {
        if (lockedSkipped > 0) return (0, deps.addLog)((0, deps._t)('🔒 고른 장비가 모두 보호 중입니다(잠금, 세팅, 우선 보관 {lockedSkipped}개).', { lockedSkipped }), 'attack-monster');
        return (0, deps.addLog)((0, deps._t)('선택한 등급의 장비가 없습니다.'), 'attack-monster');
    }
    const rewards = (0, deps.salvageBagItems)(targets);
    (0, deps.ensureCraftSelectionValid)();
    (0, deps.addLog)((0, deps._t)('🧪 선택한 등급 장비 {count}개 해체, {rewards}{kept}', { count: targets.length, rewards: formatSalvageRewardSummary(deps, rewards), kept: lockedSkipped > 0 ? ` ${(0, deps._t)('(잠금, 세팅, 우선 보관 {n}개는 남김)', { n: lockedSkipped })}` : '' }), 'loot-normal');
    (0, deps.updateStaticUI)();
}

export async function bulkSalvageAllInventory(deps) {
    if (!Array.isArray(deps.game.inventory) || deps.game.inventory.length <= 0) return (0, deps.addLog)((0, deps._t)('해체할 장비가 없습니다.'), 'attack-monster');
    let lockedCount = deps.game.inventory.filter(item => (0, deps.isBulkSalvageProtectedItem)(item)).length;
    let targetItems = deps.game.inventory.filter(item => !(0, deps.isBulkSalvageProtectedItem)(item));
    if (targetItems.length <= 0) return (0, deps.addLog)((0, deps._t)('🔒 잠금, 세팅, 우선 보관 장비뿐이라 전체 해체할 장비가 없습니다.'), 'attack-monster');
    if (!await confirmBulkSalvageAll(deps, targetItems, lockedCount)) return;
    const targets = (0, deps.confirmedSalvageTargets)(targetItems), rewards = (0, deps.salvageBagItems)(targets);
    if (!(0, deps.isCraftSelectionEquip)()) (0, deps.clearCraftSelection)();
    (0, deps.addLog)((0, deps._t)('🧪 인벤토리 전체해체 완료 ({count}개), {rewards}{kept}', { count: targets.length, rewards: formatSalvageRewardSummary(deps, rewards), kept: lockedCount > 0 ? `, ${(0, deps._t)('잠금, 세팅, 우선 보관 {n}개는 남김', { n: lockedCount })}` : '' }), 'loot-normal');
    (0, deps.updateStaticUI)();
}

export function confirmBulkSalvageAll(deps, targetItems, lockedCount) {
    const count = targetItems.length;
    // 주얼, 코어, 액막이도 요약의 종류 칸에 나온다(예전에는 "주얼 N개 포함" 줄).
    return (0, deps.requestGameConfirmation)(`인벤토리 장비 ${count}개를 모두 해체합니다.${lockedCount > 0 ? `\n잠금, 세팅, 우선 보관 장비 ${lockedCount}개는 빼고 해체합니다.` : ''}`, {
        title: (0, deps._t)('인벤토리 전체 해체'),
        tone: 'danger',
        confirmLabel: (0, deps._t)('{count}개 해체', { count }),
        summaryHtml: deps.equipmentWindowUi.salvageSummaryHtml(targetItems)
    });
}
