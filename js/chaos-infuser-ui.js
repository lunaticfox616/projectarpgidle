// Confirmation owns only the UI snapshot; the crafting domain validates and pays at commit.
async function previewChaosInfusion(optionId) {
    const item = getSelectedCraftItem();
    const eligibility = isChaosInfusionEligibleItem(item);
    if (!eligibility.ok) return addLog(eligibility.reason, 'attack-monster');
    const option = getChaosInfuserOptionsForItem(item).find(row => (row.optionId || row.id) === optionId);
    if (!option) return;
    const previous = JSON.stringify(item.chaosInfusion);
    const current = item.chaosInfusion
        ? `${getStatName(item.chaosInfusion.id)} +${formatValue(item.chaosInfusion.id, item.chaosInfusion.val)}` : '주입 없음';
    const costs = getChaosInfusionCost(option, item);
    const next = `${getStatName(option.id)} +${formatValue(option.id, option.min)}~${formatValue(option.id, option.max)}`;
    const message = `[${item.name}]\n현재: ${current}\n변경: ${next}\n\n비용: ${formatCurrencyCosts(costs)}`;
    if (!await requestGameConfirmation(message, { title: '혼돈 주입 비교', confirmLabel: '주입 확정' })) return;
    if (getSelectedCraftItem() !== item || JSON.stringify(item.chaosInfusion) !== previous) {
        return addLog('대상 또는 주입 옵션이 변경되었습니다. 다시 비교하세요.', 'attack-monster');
    }
    applyChaosInfusionToSelectedItem(optionId);
}

safeExposeGlobals({ previewChaosInfusion });
