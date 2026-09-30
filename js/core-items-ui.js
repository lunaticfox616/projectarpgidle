// 장비창 왼쪽 위 코어 칸과 코어 보관함 대화 상자. 저장 · 규칙은 core-items.js.
const coreItemsUi = (() => {
    const OVERLAY_ID = 'core-item-overlay';
    const LOCK_MESSAGE = '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.';

    function linesHtml(core) {
        return `<ul class="core-item-lines">${core.lines.map(line => `<li>${escapeHTML(coreItems.describe(line))}</li>`).join('')}</ul>`;
    }

    /** Paperdoll card for the top-left cell; absent until the core unlock. */
    function slotHtml() {
        if (!contentProgression.isUnlocked('cube')) return '';
        const store = coreItems.ensure();
        const core = store.equipped;
        const hover = core ? ` data-info-tooltip-anchor="1" onmouseenter="coreItemsUi.hover(event)" onmouseleave="hideInfoTooltip()"` : '';
        return `<div class="slot-box equipment-slot slot-코어 core-item-slot${core ? '' : ' equipment-slot-empty'}" data-slot="코어" onclick="coreItemsUi.open()"${hover}>
            <div class="equipment-slot-head"><span>코어</span></div>
            <div class="equipment-slot-visual${core ? '' : ' empty'}"><img src="${coreItems.icon(core)}" alt="" aria-hidden="true"></div>
            <div class="item-title equipment-slot-name">${core ? escapeHTML(core.name) : '비어 있음'}</div>
            <button type="button" class="equipment-slot-action" onclick="event.stopPropagation(); coreItemsUi.open()">보관 ${store.owned.length}/${CORE_ITEM_RULES.capacity}</button>
        </div>`;
    }

    function hover(event) {
        const core = coreItems.ensure().equipped;
        if (!core || !window.matchMedia('(hover: hover)').matches) return;
        showInfoTooltipHtml(event.clientX, event.clientY, `<strong>${escapeHTML(core.name)}</strong>${linesHtml(core)}`, '#6d8fa8');
    }

    function cardHtml(core, equipped) {
        const actions = equipped
            ? '<button type="button" onclick="coreItemsUi.unequip()">해제</button>'
            : `<button type="button" class="core-item-equip" onclick="coreItemsUi.equip(${core.id})">장착</button>
               <button type="button" class="core-item-discard" onclick="coreItemsUi.discard(${core.id})">버리기</button>`;
        return `<article class="core-item-card${equipped ? ' is-equipped' : ''}">
            <img src="${coreItems.icon(core)}" alt="" aria-hidden="true">
            <div><strong>${escapeHTML(core.name)}${equipped ? ' · 장착 중' : ''}</strong>${linesHtml(core)}</div>
            <div class="core-item-actions">${actions}</div>
        </article>`;
    }

    function openStore() {
        close();
        const store = coreItems.ensure();
        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.className = 'selection-overlay';
        overlay.onclick = event => { if (event.target === overlay) close(); };
        const owned = store.owned.map(core => cardHtml(core, false)).join('')
            || '<p class="selection-overlay-help">보관 중인 코어가 없습니다. 지하계 10층을 넘긴 뒤 지하계 적에게서 떨어집니다.</p>';
        overlay.innerHTML = `<div class="selection-overlay-panel core-item-panel" role="dialog" aria-modal="true" aria-labelledby="core-item-title">
            <div class="selection-overlay-header"><div class="selection-overlay-title" id="core-item-title">코어</div>
                <button type="button" onclick="coreItemsUi.close()">닫기</button></div>
            <div class="selection-overlay-help">코어 칸에는 코어 하나를 낍니다. 코어는 옵션 네 줄을 가지며 루프를 넘기면 장비처럼 사라집니다.</div>
            ${store.equipped ? cardHtml(store.equipped, true) : '<p class="core-item-empty">코어 칸이 비어 있습니다.</p>'}
            <div class="selection-overlay-section-title">보관함 ${store.owned.length}/${CORE_ITEM_RULES.capacity}</div>
            <div class="core-item-list">${owned}</div></div>`;
        document.body.append(overlay);
    }

    function close() {
        document.getElementById(OVERLAY_ID)?.remove();
    }

    function reopenStoreAfter(changed) {
        if (!changed) return;
        updateStaticUI();
        openStore();
    }

    function equip(id) {
        if (game.woodsmanBuildLock) return addLog(LOCK_MESSAGE, 'attack-monster');
        reopenStoreAfter(coreItems.equip(id));
    }

    function unequip() {
        if (game.woodsmanBuildLock) return addLog(LOCK_MESSAGE, 'attack-monster');
        reopenStoreAfter(coreItems.unequip());
    }

    async function discard(id) {
        if (!await requestGameConfirmation('이 코어를 버립니다. 되돌릴 수 없습니다.', { title: '코어 버리기', tone: 'danger', confirmLabel: '버리기' })) return;
        reopenStoreAfter(coreItems.discard(id));
    }

    return Object.freeze({ slotHtml, hover, open: openStore, close, equip, unequip, discard });
})();
safeExposeGlobals({ coreItemsUi });
