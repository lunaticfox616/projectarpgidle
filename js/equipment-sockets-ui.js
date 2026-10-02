// 장비 소켓 화면(2026-09-30, 주얼 창을 대신함): 장비 상세의 [소켓] 대화 상자에서 주얼을 끼우고 빼며, 같은 대화 상자가
// 주얼 보관함(해체 · 뽑기)도 겸한다. 장비 칸의 소켓 표시와 장비 툴팁의 소켓 줄도 여기서 만든다. 규칙은 equipment-sockets.js.
const equipmentSocketsUi = (() => {
    const OVERLAY_ID = 'equipment-socket-overlay';
    const REFINE_COST = 12;
    let mode = 'item';

    function jewelLines(jewel) {
        return getJewelStats(jewel).map(stat => `${isJewelPetiteStat(stat) ? '쁘띠 ' : ''}${getStatName(stat.id)} +${formatJewelStatValue(stat.id, stat.val)}`);
    }

    function jewelHtml(jewel) {
        const lines = jewelLines(jewel).map(line => `<li>${escapeHTML(line)}</li>`).join('');
        const effect = jewel.uniqueEffect ? `<p class="socket-jewel-effect">${escapeHTML(jewel.uniqueEffect)}</p>` : '';
        return `<strong class="${getJewelRarityClass(jewel.rarity)}">${escapeHTML(jewel.name || '주얼')}</strong>${effect}<ul class="socket-jewel-lines">${lines || '<li>옵션 없음</li>'}</ul>`;
    }

    function socketLabel(row) {
        return row.kind === 'void' ? '공허 소켓' : `심연 소켓 ${row.index + 1}`;
    }

    /** Equipment detail button: once jewels are unlocked, for items with a socket, or without one while a chisel is at hand. */
    function actionHtml(item, slot) {
        if (!item || !contentProgression.isUnlocked('jewel')) return '';
        const sockets = equipmentSockets.list(item);
        const canOpen = (game.currencies.voidChisel || 0) > 0 && equipmentSockets.canChisel(item);
        if (!sockets.length && !canOpen) return '';
        const label = sockets.length ? `소켓 ${sockets.filter(row => row.jewel).length}/${sockets.length}` : '소켓 뚫기';
        const ref = slot ? `'${slot}',true` : `${item.id},false`;
        return `<button type="button" data-content-action="sockets" onclick="equipmentInventoryInteraction.focus(null);equipmentSocketsUi.open(${ref})">${label}</button>`;
    }

    /** Small filled/empty marks on a worn equipment card. */
    function pipsHtml(item) {
        if (!item || !contentProgression.isUnlocked('jewel')) return '';
        const sockets = equipmentSockets.list(item);
        if (!sockets.length) return '';
        return `<span class="equipment-socket-pips" aria-label="소켓 ${sockets.filter(row => row.jewel).length}/${sockets.length}">${sockets.map(row => `<i class="${row.jewel ? 'is-filled' : ''}"></i>`).join('')}</span>`;
    }

    /** Item tooltip section: what sits in each socket. */
    function tooltipHtml(item) {
        const sockets = contentProgression.isUnlocked('jewel') ? equipmentSockets.list(item) : [];
        return sockets.map(row => row.jewel
            ? `<div class="tooltip-line tooltip-socket-line">◆ ${socketLabel(row)}: <span class="${getJewelRarityClass(row.jewel.rarity)}">${escapeHTML(row.jewel.name || '주얼')}</span> · ${escapeHTML(jewelLines(row.jewel).join(' · '))}</div>`
            : `<div class="tooltip-line tooltip-socket-line is-empty">◇ 빈 ${socketLabel(row)}</div>`).join('');
    }

    function socketsHtml(item) {
        const rows = equipmentSockets.list(item).map(row => `<div class="socket-row${row.jewel ? '' : ' is-empty'}"><span class="socket-row-label">${socketLabel(row)}</span>
            <div class="socket-row-jewel">${row.jewel ? jewelHtml(row.jewel) : '<span>빈 소켓</span>'}</div>
            ${row.jewel ? `<button type="button" onclick="equipmentSocketsUi.remove('${row.kind}',${row.index})">빼기</button>` : ''}</div>`).join('');
        const chisels = game.currencies.voidChisel || 0;
        const chisel = equipmentSockets.canChisel(item)
            ? `<button type="button" class="socket-chisel" onclick="equipmentSocketsUi.chisel()" ${chisels > 0 ? '' : 'disabled'}>공허의 끌로 소켓 뚫기 (보유 ${chisels})</button>` : '';
        const bonus = Math.round((getSocketJewelMultiplier() - 1) * 100);
        const bonusNote = bonus > 0 ? `<p class="selection-overlay-help">소켓 주얼 옵션 +${bonus}% (심연 군주, 재물욕)</p>` : '';
        return `${rows || '<p class="selection-overlay-help">이 장비에는 아직 소켓이 없습니다.</p>'}${chisel}${bonusNote}`;
    }

    /** 보관함 +5칸(황금률, 거래소가 열린 뒤): 예전 주얼 창의 확장 단추. 확인 · 지불은 marketExpandJewelInventoryByDivine. */
    function expandHtml() {
        const cost = getJewelMarketExpandCost(), owned = Math.floor(game.currencies.goldenRule || 0);
        return `<button type="button" onclick="equipmentSocketsUi.expand()" ${owned >= cost ? '' : 'disabled'}>+5칸 (황금률 ${cost}, 보유 ${owned})</button>`;
    }

    function storeHtml(item) {
        const store = game.jewelInventory || [];
        const canInsert = !!item && equipmentSockets.list(item).some(row => !row.jewel);
        const cards = store.map(jewel => `<article class="socket-jewel-card">${jewelHtml(jewel)}<div class="socket-jewel-actions">
            ${canInsert ? `<button type="button" onclick="equipmentSocketsUi.insert(${jewel.id})">끼우기</button>` : ''}
            <button type="button" onclick="equipmentSocketsUi.salvage(${jewel.id})">해체 +${getJewelSalvageShardGain(jewel)}</button></div></article>`).join('');
        const shards = game.currencies.jewelShard || 0;
        const expand = isMarketUnlocked() ? expandHtml() : '';
        return `<div class="selection-overlay-section-title">주얼 보관함 ${store.length}/${getJewelInventoryLimit()}</div>
            <div class="socket-jewel-list">${cards || '<p class="selection-overlay-help">보관 중인 주얼이 없습니다. 정예와 보스가 가끔 떨어뜨립니다.</p>'}</div>
            <div class="socket-store-footer"><span>주얼 결정 ${shards}</span><button type="button" onclick="equipmentSocketsUi.refine()" ${shards >= REFINE_COST ? '' : 'disabled'}>주얼 뽑기 (결정 ${REFINE_COST})</button>${expand}</div>`;
    }

    /** Opens the dialog, or redraws it in place after a change. */
    function render() {
        const item = mode === 'item' ? getSelectedCraftItem() : null;
        if (mode === 'item' && !item) return close();
        const title = item ? `소켓: [${escapeHTML(getItemSlotDisplayLabel(item))}] ${escapeHTML(item.name)}` : '주얼 보관함';
        selectionDialog.show({ id: OVERLAY_ID, title, panelClass: 'equipment-socket-panel', body: `${item ? socketsHtml(item) : '<p class="selection-overlay-help">주얼은 장비의 소켓에 끼웁니다. 장비를 선택해 [소켓]을 누르세요. 반지, 목걸이, 허리띠에는 소켓이 처음부터 있습니다.</p>'}
            ${storeHtml(item)}` });
    }

    function open(ref, isEquip) {
        mode = 'item';
        if (selectForCrafting(ref, isEquip)) render();
    }

    function openStore() {
        mode = 'store';
        render();
    }

    function close() {
        selectionDialog.close(OVERLAY_ID);
    }

    function report(result, message) {
        if (!result.ok) return addLog(result.reason, 'attack-monster');
        addLog(message, 'loot-magic');
        updateStaticUI();
        render();
    }

    function insert(jewelId) {
        const item = getSelectedCraftItem();
        if (!item) return;
        const result = equipmentSockets.insert(item, jewelId);
        report(result, result.ok ? `💠 [${item.name}]에 [${result.jewel.name}] 장착` : '');
    }

    function remove(kind, index) {
        const item = getSelectedCraftItem();
        if (!item) return;
        const result = equipmentSockets.remove(item, kind, index);
        report(result, result.ok ? `💠 [${item.name}]에서 [${result.jewel.name}]을(를) 뺐습니다.` : '');
    }

    function chisel() {
        const item = getSelectedCraftItem();
        if (!item) return;
        report(equipmentSockets.chisel(item), `🕳️ [${item.name}]에 공허 소켓을 뚫었습니다.`);
    }

    async function salvage(jewelId) {
        if (await salvageJewel(jewelId)) render();
    }

    async function expand() {
        await marketExpandJewelInventoryByDivine();
        render();
    }

    function refine() {
        drawJewelRefine();
        render();
    }

    return Object.freeze({ actionHtml, pipsHtml, tooltipHtml, open, openStore, close, insert, remove, chisel, salvage, refine, expand });
})();
safeExposeGlobals({ equipmentSocketsUi });
