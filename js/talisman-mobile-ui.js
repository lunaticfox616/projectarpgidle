// Touch inspection is transient UI state. Existing placement/unlock functions own all mutations.
const talismanMobileUi = (() => {
    let point = null;
    let shown = null;

    function readAction() {
        const {x,y} = point;
        if (!isTalismanCellUnlocked(x,y)) {
            const cost = getTalismanExpandCost(Math.max(0, getTalismanUnlockedCellsSet().size - 16));
            const enabled = (game.currencies.sealShard || 0) >= cost.sealShard && (game.currencies.strongSealShard || 0) >= (cost.strongSealShard || 0);
            return {kind:'unlock', title:'잠긴 부적 칸', detail:`해금 비용: ${formatTalismanUnlockCostLabel(cost)}`, enabled, cost:JSON.stringify(cost), label:'이 칸 해금'};
        }
        const occupant = game.talismanBoard[talismanCellIndex(x,y)];
        if (occupant) {
            const talisman = game.talismanPlacements[occupant].talisman;
            return {kind:'remove', talisman, title:getTalismanDisplayName(talisman), detail:'배치 중 · 회수하면 보관함으로 돌아갑니다.', enabled:true, label:'부적 회수'};
        }
        const preview = getTalismanPlacementPreviewAt(x,y);
        if (!preview) return {kind:'none', title:'빈 부적 칸', detail:'보관함에서 배치할 부적을 선택하세요.', enabled:false, label:'배치할 부적 없음'};
        return {kind:'place', talisman:preview.talisman, preview, shape:JSON.stringify(preview.talisman.cells), title:getTalismanDisplayName(preview.talisman), detail:preview.valid ? '표시한 범위에 배치할 수 있습니다.' : preview.invalidReason, enabled:preview.valid, label:'이 위치에 배치'};
    }

    function highlight(action) {
        const footprint = action.preview ? action.talisman.cells.map(cell => `${action.preview.baseX + cell.x},${action.preview.baseY + cell.y}`) : [];
        document.querySelectorAll('#ui-talisman-board button').forEach(button => {
            const key = `${button.dataset.talismanX},${button.dataset.talismanY}`;
            button.classList.toggle('talisman-mobile-anchor', !!point && key === `${point.x},${point.y}`);
            button.classList.toggle('talisman-mobile-footprint', footprint.includes(key));
            button.classList.toggle('talisman-mobile-invalid', footprint.includes(key) && !action.enabled);
        });
    }

    function refresh() {
        renderSelection();
        const root = document.getElementById('talisman-mobile-inspector');
        root.hidden = !point || !uiDisplay.matches('(max-width: 1080px)');
        if (root.hidden) return;
        shown = readAction();
        const shape = shown.talisman ? renderTalismanMiniShapeFromCells(shown.talisman.cells, shown.talisman.shape, {markDir:shown.talisman.markDir}) : '';
        const html = `<div class="talisman-mobile-heading">${shape}<strong>${escapeHTML(shown.title)}</strong><span>${point.x + 1}, ${point.y + 1}</span></div><p>${escapeHTML(shown.detail)}</p><div class="talisman-mobile-actions">${shown.kind === 'place' ? '<button type="button" data-talisman-action="rotate">회전</button>' : ''}<button type="button" data-talisman-action="confirm" ${shown.enabled ? '' : 'disabled'}>${shown.label}</button><button type="button" data-talisman-action="cancel">취소</button></div>`;
        if (root.__inspectorHtml !== html) { root.innerHTML = html; root.__inspectorHtml = html; }
        highlight(shown);
    }

    function inspect(x,y) {
        point = {x,y};
        hideInfoTooltip();
        refresh();
        document.getElementById('talisman-mobile-inspector').scrollIntoView({block:'start'});
    }

    function renderSelection() {
        const root = document.getElementById('talisman-mobile-selected');
        root.hidden = !uiDisplay.matches('(max-width: 1080px)');
        if (root.hidden) return;
        const selected = game.talismanInventory.find(talisman => talisman.id === game.talismanSelectedId);
        const html = `<span>${selected ? `배치할 부적: <strong>${escapeHTML(getTalismanDisplayName(selected))}</strong>` : '보관함에서 부적을 골라 배치하세요.'}</span><button type="button" onclick="document.getElementById('talisman-library-tab').click()">${selected ? '다른 부적 선택' : '부적 선택'}</button>`;
        if (root.__selectionHtml !== html) { root.innerHTML = html; root.__selectionHtml = html; }
    }

    function showBoard() {
        cancel();
        document.getElementById('talisman-layout-tab').click();
        document.getElementById('talisman-layout').scrollIntoView({block:'start'});
    }

    function cancel() {
        point = null; shown = null;
        document.getElementById('talisman-mobile-inspector').hidden = true;
        highlight({});
    }

    function applyAction() {
        if (!point || !shown) return;
        const current = readAction();
        const unchanged = ['kind', 'talisman', 'cost', 'shape'].every(key => current[key] === shown[key]);
        if (!current.enabled || !unchanged) return refresh();
        const {x,y} = point;
        cancel();
        if (current.kind === 'unlock') { unlockTalismanCell(x,y); updateStaticUI(); }
        else if (current.kind === 'remove') removePlacedTalisman(current.talisman.id);
        else if (current.kind === 'place') placeSelectedTalismanAt(x,y);
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('talisman-mobile-inspector').addEventListener('click', event => {
            const action = event.target.closest('[data-talisman-action]')?.dataset.talismanAction;
            if (action === 'cancel') cancel();
            if (action === 'confirm') applyAction();
            if (action === 'rotate' && shown?.kind === 'place') rotateTalismanInInventory(shown.talisman.id);
        });
        window.addEventListener('resize', () => { if (!uiDisplay.matches('(max-width: 1080px)')) cancel(); });
    }, {once:true});
    return {inspect, refresh, showBoard};
})();
safeExposeGlobals({talismanMobileUi});
