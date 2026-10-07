// 기름 바르기 창(12번 루프 36, js/garden-oils.js): 장비 상세의 '기름' 단추로 연다. 기름 셋을 그릇에 담으면 그 조합이 이번 루프에 부르는
// 패시브 노드 셋이 보이고, 하나를 골라 확인하면 목걸이에 새겨진다. 툴팁과 프로필의 기름 줄도 여기서 만든다.
const gardenOilsUi = (() => {
    const OVERLAY_ID = 'garden-oil-overlay';
    const TONE = '#cfe0a0';
    const esc = value => escapeHTML(String(value));
    let bowl = [];

    /** The detail popover's button: amulets from loop 36 (or one already anointed). */
    function actionHtml(item, slot) {
        if (!item || item.slot !== '목걸이' || !(gardenOils.open(game) || item.anoint)) return '';
        const ref = slot ? `'${slot}',true` : `${item.id},false`;
        return `<button type="button" data-content-action="anoint" onclick="equipmentInventoryInteraction.focus(null);gardenOilsUi.open(${ref})">기름</button>`;
    }
    function open(ref, isEquip) {
        if (!selectForCrafting(ref, isEquip)) return;
        bowl = [];
        render();
    }
    const effectText = node => node.effects.map(effect => `${getStatName(effect.stat)} ${effect.val >= 0 ? '+' : ''}${formatValue(effect.stat, effect.val)}`).join(', ');
    function chipsHtml() {
        return gardenOils.keys.map(key => {
            const left = (game.currencies[key] || 0) - bowl.filter(entry => entry === key).length;
            return `<button type="button" onclick="gardenOilsUi.add('${key}')" ${left > 0 && bowl.length < GARDEN_OILS.perAnoint ? '' : 'disabled'}>${esc(gardenOils.oil(key).name)} ${left}</button>`;
        }).join('');
    }
    function bowlHtml() {
        return Array.from({ length: GARDEN_OILS.perAnoint }, (_, index) => bowl[index]
            ? `<button type="button" class="is-on" onclick="gardenOilsUi.remove(${index})" aria-label="${esc(gardenOils.oil(bowl[index]).name)} 빼기">${esc(gardenOils.oil(bowl[index]).name)}</button>`
            : '<span class="garden-oil-empty">빈 자리</span>').join('');
    }
    function offersHtml(item) {
        if (bowl.length < GARDEN_OILS.perAnoint) return '<p class="selection-overlay-help">기름 셋을 담으면 이 조합이 이번 루프에 부르는 노드 셋이 보입니다.</p>';
        const reason = gardenOils.anointReason(game, item, bowl);
        return `<div class="selection-overlay-grid">${gardenOils.offers(game, bowl).map(node => `<button type="button" class="selection-overlay-option"
            onclick="gardenOilsUi.choose('${node.id}')" ${reason ? `disabled title="${esc(reason)}"` : ''}>${esc(node.title)}<br><span>${esc(effectText(node))}</span></button>`).join('')}</div>`;
    }
    function render() {
        const item = getSelectedCraftItem();
        if (!item) return selectionDialog.close(OVERLAY_ID);
        const node = gardenOils.nodeOf(item);
        const current = node ? `<p class="garden-oil-current">지금 새겨진 노드: <strong>${esc(node.title)}</strong> (${esc(effectText(node))})</p>` : '<p class="garden-oil-current">새겨진 노드 없음</p>';
        selectionDialog.show({ id: OVERLAY_ID, title: '기름 바르기', panelClass: 'garden-oil-panel', body: `<div class="selection-overlay-help"><strong>[${esc(item.name)}]</strong>
            기름 셋을 바르면 고른 패시브 노드 하나가 목걸이에 새겨집니다(다시 바르면 바뀝니다). 조합 표는 루프마다 바뀝니다.</div>${current}
            <div class="garden-oil-row" aria-label="기름">${chipsHtml()}</div><div class="garden-oil-row garden-oil-bowl" aria-label="그릇">${bowlHtml()}</div>${offersHtml(item)}` });
    }
    function add(key) {
        if (bowl.length < GARDEN_OILS.perAnoint && (game.currencies[key] || 0) > bowl.filter(entry => entry === key).length) bowl.push(key);
        render();
    }
    function remove(index) {
        bowl.splice(index, 1);
        render();
    }
    async function choose(nodeId) {
        const item = getSelectedCraftItem(), node = gardenOils.offers(game, bowl).find(row => row.id === nodeId);
        if (!item || !node) return;
        if (game.woodsmanBuildLock) return addLog('나무꾼 전투 중에는 바를 수 없습니다.', 'attack-monster');
        const was = gardenOils.nodeOf(item), message = `[${item.name}]에 ${node.title}을(를) 새깁니다(기름 ${GARDEN_OILS.perAnoint}개).${was ? `\n지금 새겨진 ${was.title}은(는) 사라집니다.` : ''}`;
        if (!await requestGameConfirmation(message, { title: '기름 바르기', confirmLabel: '바르기' })) return;
        if (getSelectedCraftItem() !== item) return addLog('확인 중 대상 장비가 바뀌어 바르지 않았습니다.', 'attack-monster');
        const result = gardenOils.anoint(game, item, bowl, nodeId);
        if (!result.ok) return addLog(result.reason, 'attack-monster');
        addLog(`🌿 [${esc(item.name)}]에 기름을 발라 ${esc(node.title)}이(가) 새겨졌습니다: ${esc(effectText(node))}`, 'loot-unique', { toast: true });
        bowl = [];
        updateStaticUI();
        queueImportantSave(200);
        render();
    }
    /** The item tooltip's anointment line. '' when nothing is engraved. */
    function tooltipHtml(item) {
        const node = gardenOils.nodeOf(item);
        return node ? `<div class="tooltip-line" style="margin-top:6px; color:${TONE};">🌿 기름: ${esc(node.title)} (${esc(effectText(node))})</div>` : '';
    }
    return Object.freeze({ actionHtml, open, add, remove, choose, tooltipHtml, close: () => selectionDialog.close(OVERLAY_ID) });
})();
safeExposeGlobals({ gardenOilsUi });
