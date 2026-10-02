// 조합창 화면(2026-09-30): 그루터기 함 판 바로 아래 3×3 칸, 맞는 조합법과 비용, [조합] · [재료 넣기] · [비우기] · 조합법 목록.
// 재료 고르기는 선택 대화 상자(장비 · 그루터기 · 주얼 · 코어). 칸 · 조합법 목록 단추는 stump-box-ui.js의 클릭 위임(data-stump-action)이
// 이 모듈의 동작을 부르고, 대화 상자 단추는 직접 부른다. 규칙은 stump-cube.js.
const stumpCubeUi = (() => {
    const OVERLAY_ID = 'stump-cube-picker';
    const KIND_LABELS = { equipment: '장비', stump: '그루터기', jewel: '주얼', core: '코어' };
    let bookOpen = false, pickerKind = 'equipment';

    function esc(text) { return escapeHTML(String(text)); }

    const ICONS = Object.freeze({
        equipment: item => getEquipmentGridVisualAsset(item),
        stump: item => stumpBox.iconPath(item),
        jewel: item => getInventoryItemVisualAsset(item, 'jewel'),
        core: item => coreItems.icon(item)
    });

    function itemName(kind, item) {
        return kind === 'stump' ? stumpBox.label(item) : String(item.name || KIND_LABELS[kind]);
    }

    function itemTone(kind, item) {
        if (kind === 'stump' && item.family !== 'talisman') return STUMP_BOX_COLORS[item.color].tone;
        return getRarityColor(item.rarity || 'normal');
    }

    function costText(cost) {
        const rows = Object.entries(cost || {}).map(([key, need]) => `${ORB_DB[key].name} ${need} (보유 ${Math.floor(game.currencies[key] || 0)})`);
        return rows.length ? rows.join(', ') : '비용 없음';
    }

    // ── 칸 ─────────────────────────────────────────────────
    function entryHtml(entry) {
        const name = itemName(entry.kind, entry.item);
        return `<button type="button" class="stump-cube-item" data-stump-action="cube-cell" data-cell="${entry.y * stumpCube.SIZE + entry.x}"`
            + ` style="grid-column:${entry.x + 1} / span ${entry.w};grid-row:${entry.y + 1} / span ${entry.h};--cube-tone:${itemTone(entry.kind, entry.item)}"`
            + ` title="${esc(name)} · 누르면 꺼냅니다" aria-label="${esc(name)} 꺼내기"><img src="${ICONS[entry.kind](entry.item)}" alt="" draggable="false"></button>`;
    }

    function gridHtml(list) {
        const cells = Array.from({ length: stumpCube.SIZE * stumpCube.SIZE }, (_, cell) => `<button type="button" class="stump-cube-cell"`
            + ` data-stump-action="cube-open" style="grid-column:${cell % stumpCube.SIZE + 1};grid-row:${Math.floor(cell / stumpCube.SIZE) + 1}"`
            + ` aria-label="빈 칸 · 재료 넣기"></button>`).join('');
        return `<div class="stump-cube-grid" role="grid" aria-label="조합창 3×3">${cells}${list.map(entryHtml).join('')}</div>`;
    }

    function statusHtml(found, list) {
        if (!list.length) return '<p class="stump-hint">빈 칸을 눌러 재료를 넣으세요.</p>';
        if (!found) return '<p class="stump-status">맞는 조합법이 없습니다. 아래 조합법 목록을 보세요.</p>';
        const lacking = stumpCube.missingCost(found.recipe).length > 0;
        return `<p class="stump-status is-good">${esc(found.recipe.name)} → ${esc(found.recipe.result)}</p>`
            + `<p class="stump-line${lacking ? ' is-bad' : ''}">${esc(costText(found.recipe.cost))}</p>`;
    }

    function recipeBookHtml() {
        if (!bookOpen) return '';
        const rows = STUMP_CUBE_RECIPES.map(recipe => `<li><strong>${esc(recipe.group)} · ${esc(recipe.name)}</strong>`
            + `<span>${esc(recipe.need)} → ${esc(recipe.result)}</span><small>${esc(costText(recipe.cost))}</small></li>`).join('');
        return `<ul class="stump-cube-book">${rows}</ul>`;
    }

    /** The cube section under the stump box board. */
    function cubeHtml() {
        const list = stumpCube.entries(), found = stumpCube.match();
        const ready = !!found && !stumpCube.missingCost(found.recipe).length && !game.woodsmanBuildLock;
        return '<h3>조합창</h3>' + gridHtml(list) + statusHtml(found, list)
            + `<div class="stump-actions"><button type="button" data-stump-action="cube-transmute"${ready ? '' : ' disabled'}>조합</button>`
            + '<button type="button" data-stump-action="cube-open">재료 넣기</button>'
            + `<button type="button" data-stump-action="cube-clear"${list.length ? '' : ' disabled'}>비우기</button>`
            + `<button type="button" data-stump-action="cube-book" aria-pressed="${bookOpen}">조합법 ${STUMP_CUBE_RECIPES.length}</button></div>`
            + recipeBookHtml();
    }

    /** What the screen shows depends on these, so the stump tab repaints when they change. */
    function cubeSignature() {
        const found = stumpCube.match();
        return JSON.stringify([stumpCube.entries().map(entry => [entry.kind, entry.id, entry.x, entry.y]), found ? found.recipe.id : null,
            found ? stumpCube.missingCost(found.recipe) : null, bookOpen]);
    }

    // ── 재료 고르기 ─────────────────────────────────────────
    function candidateHtml(kind, item, index) {
        const name = itemName(kind, item);
        return `<button type="button" class="stump-cube-candidate" onclick="stumpCubeUi.pickCubeItem('${kind}', ${index})" style="--cube-tone:${itemTone(kind, item)}">`
            + `<img src="${ICONS[kind](item)}" alt="" draggable="false"><span>${esc(name)}</span></button>`;
    }

    function pickerBodyHtml() {
        const tabs = stumpCube.KINDS.map(kind => `<button type="button" class="${kind === pickerKind ? 'is-on' : ''}" aria-pressed="${kind === pickerKind}"`
            + ` onclick="stumpCubeUi.openCubePicker('${kind}')">${KIND_LABELS[kind]} ${stumpCube.candidates(kind).length}</button>`).join('');
        const list = stumpCube.candidates(pickerKind).map((item, index) => candidateHtml(pickerKind, item, index)).join('');
        return `<p class="selection-overlay-help">누르면 조합창의 빈 자리에 들어갑니다. 재료는 조합하기 전까지 원래 보관 자리에 그대로 있습니다.
                잠근 장비 · 장비 세팅에 든 장비 · 판에 놓인 그루터기 아이템은 넣을 수 없습니다.</p>
            <div class="stump-cube-picker-tabs">${tabs}</div>
            <div class="stump-cube-candidates">${list || '<p class="selection-overlay-help">넣을 수 있는 아이템이 없습니다.</p>'}</div>`;
    }

    /** Opens the picker, or redraws it in place (another kind, or after putting an item in). */
    function openCubePicker(kind) {
        if (stumpCube.KINDS.includes(kind)) pickerKind = kind;
        selectionDialog.show({ id: OVERLAY_ID, title: '조합창에 넣을 재료', panelClass: 'stump-cube-picker-panel', body: pickerBodyHtml() });
    }

    function closeCubePicker() {
        selectionDialog.close(OVERLAY_ID);
    }

    function refreshCube() {
        if (selectionDialog.isOpen(OVERLAY_ID)) openCubePicker(pickerKind);
        stumpBoxUi.refreshStumpTabNow();
    }

    function pickCubeItem(kind, index) {
        const item = stumpCube.candidates(kind)[index];
        const reason = item ? stumpCube.put(game, kind, item) : '넣을 수 없는 아이템입니다.';
        if (reason) showGameToast(reason, { tone: 'warning' });
        refreshCube();
    }

    // ── 칸 · 단추 동작(stump-box-ui.js의 클릭 위임에서) ───────────────────────
    function takeOutCubeCell(cell) {
        if (stumpCube.takeOut(game, cell)) refreshCube();
    }

    function transmuteCube() {
        const result = stumpCube.transmute();
        if (!result.ok) return showGameToast(result.reason, { tone: 'warning' });
        const names = result.outputs.map(row => itemName(row.kind, row.item)).join(', ');
        addLog(`🧩 조합창 · ${result.recipe.name}: ${names}`, 'loot-rare');
        queueImportantSave(300);
        updateStaticUI();
        refreshCube();
    }

    function clearCube() {
        stumpCube.clear();
        refreshCube();
    }

    function toggleCubeBook() {
        bookOpen = !bookOpen;
        refreshCube();
    }

    return Object.freeze({ cubeHtml, cubeSignature, openCubePicker, closeCubePicker, pickCubeItem, takeOutCubeCell, transmuteCube, clearCube, toggleCubeBook });
})();
safeExposeGlobals({ stumpCubeUi });
