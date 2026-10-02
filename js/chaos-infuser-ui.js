// 장비 상세의 "주입": 희귀 장비에 혼돈 주입 한 줄을 고르는 대화 상자(예전 혼돈 주입기 하위 탭).
// 대상은 제작 선택을 그대로 쓰고, 규칙 · 비용 · 저장은 passives.js의 혼돈 주입 함수가 확정 시점에 검사한다.
const chaosInfusionUi = (() => {
    const OVERLAY_ID = 'chaos-infusion-overlay';

    /** 장비 상세 동작 줄의 단추(상세 팝오버는 최상위 층이라 먼저 닫는다). 나무꾼을 만나기 전이거나 주입할 수 없는 등급이면 없다. */
    function actionHtml(item, slot) {
        if (!item || !isChaosInfuserUnlocked() || (item.rarity !== 'rare' && !item.chaosInfusion)) return '';
        const ref = slot ? `'${slot}',true` : `${item.id},false`;
        return `<button type="button" data-content-action="infuse" onclick="equipmentInventoryInteraction.focus(null);chaosInfusionUi.open(${ref})">주입</button>`;
    }

    function open(ref, isEquip) {
        if (selectForCrafting(ref, isEquip)) render();
    }

    function close() {
        selectionDialog.close(OVERLAY_ID);
    }

    function infusionText(infusion) {
        return `${infusion.statName || getStatName(infusion.id)} +${formatValue(infusion.id, infusion.val)}`;
    }

    function currentHtml(item) {
        const infusion = item.chaosInfusion;
        if (!infusion) return '<p class="chaos-infusion-current">현재 주입 없음</p>';
        const range = `${formatValue(infusion.id, infusion.valMin)}~${formatValue(infusion.id, infusion.valMax)}`;
        return `<p class="chaos-infusion-current">현재 주입: <strong>${infusionText(infusion)}</strong> <small>(${range})</small>
            <button type="button" onclick="chaosInfusionUi.remove()" ${(game.currencies.blightSpore || 0) > 0 ? '' : 'disabled'}>제거 · 마름병 포자 1</button></p>`;
    }

    function optionHtml(item, option) {
        const key = option.optionId || option.id;
        const costs = getChaosInfusionCost(option, item);
        const same = item.chaosInfusion && (item.chaosInfusion.sourceOptionId === key || item.chaosInfusion.id === option.id);
        const range = `${formatValue(option.id, option.min)}~${formatValue(option.id, option.max)}`;
        return `<button type="button" class="selection-overlay-option" onclick="chaosInfusionUi.choose('${key}')" ${canPayCurrencyCosts(costs) && !same ? '' : 'disabled'}>
            ${option.label || getStatName(option.id)} +${range}<br><span>${same ? '적용 중' : formatCurrencyCosts(costs)}</span></button>`;
    }

    function optionsHtml(item) {
        const eligibility = isChaosInfusionEligibleItem(item);
        if (!eligibility.ok) return `<p class="chaos-infusion-blocked">${eligibility.reason}</p>`;
        const buttons = getChaosInfuserOptionsForItem(item).map(option => optionHtml(item, option)).join('');
        return buttons ? `<div class="selection-overlay-grid">${buttons}</div>`
            : '<p class="chaos-infusion-blocked">이 부위에 더할 수 있는 주입 옵션이 없습니다.</p>';
    }

    /** Opens the dialog, or redraws it in place after a change. */
    function render() {
        const item = getSelectedCraftItem();
        if (!item) return close();
        selectionDialog.show({ id: OVERLAY_ID, title: '혼돈 주입', panelClass: 'chaos-infusion-panel', body: `<div class="selection-overlay-help"><strong>[${escapeHTML(getItemSlotDisplayLabel(item))}] ${escapeHTML(item.name)}</strong><br>
                희귀 장비에 T5급 범위 옵션 한 줄을 더합니다. 추가 옵션 ${getItemExplicitOptionCount(item)}/6 · 교체와 제거에는 마름병 포자 1개가 더 듭니다.</div>
            ${currentHtml(item)}${optionsHtml(item)}` });
    }

    // 확인 창은 화면 스냅숏만 갖는다. 확정 전에 대상이나 주입 줄이 바뀌었으면 다시 비교하게 한다.
    async function choose(optionId) {
        const item = getSelectedCraftItem();
        const option = item && getChaosInfuserOptionsForItem(item).find(row => (row.optionId || row.id) === optionId);
        if (!option) return;
        const previous = JSON.stringify(item.chaosInfusion);
        const next = `${getStatName(option.id)} +${formatValue(option.id, option.min)}~${formatValue(option.id, option.max)}`;
        const message = `[${item.name}]\n현재: ${item.chaosInfusion ? infusionText(item.chaosInfusion) : '주입 없음'}\n변경: ${next}\n\n비용: ${formatCurrencyCosts(getChaosInfusionCost(option, item))}`;
        if (!await requestGameConfirmation(message, { title: '혼돈 주입 비교', confirmLabel: '주입 확정' })) return;
        if (getSelectedCraftItem() !== item || JSON.stringify(item.chaosInfusion) !== previous) {
            addLog('대상 또는 주입 옵션이 변경되었습니다. 다시 비교하세요.', 'attack-monster');
        } else applyChaosInfusionToSelectedItem(optionId);
        if (selectionDialog.isOpen(OVERLAY_ID)) render();
    }

    function remove() {
        removeChaosInfusionFromSelectedItem();
        render();
    }

    return Object.freeze({ actionHtml, open, close, choose, remove });
})();
safeExposeGlobals({ chaosInfusionUi });
