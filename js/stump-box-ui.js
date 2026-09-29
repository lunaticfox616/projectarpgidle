// 그루터기 함 화면: 5×5 판(유물 그림 위의 칸 단추), 고른 아이템 설명, 공명·억제 요약, 시작 선물, 보관함.
// 누르기만으로 다룬다(휴대폰과 PC 같음): 아이템을 고르고 판의 빈 칸을 누르면 심거나 옮긴다. 규칙·계산은 js/stump-box.js.
const stumpBoxUi = (() => {
    const COLORS = Object.keys(STUMP_BOX_COLORS);
    const PATH_LABELS = { flower: '꽃으로 키우기', fruit: '열매로 키우기' };
    let selectedId = null, pendingPath = 'flower', colorFilter = 'all', lastSignature = '', bound = false, ticker = null;

    function escStump(text) { return escapeHTML(String(text)); }
    function stumpTone(color) { return STUMP_BOX_COLORS[color].tone; }
    function stumpPercent(item) { return Math.min(100, Math.round(item.xp / stumpBox.need(item) * 100)); }
    function stumpNumber(value) { return String(Math.round(value * 10) / 10); }
    function stumpBar(item, wide) {
        return `<span class="stump-bar${wide ? ' is-wide' : ''}"><i style="width:${stumpPercent(item)}%"></i></span>`;
    }
    function stumpIcon(item) { return `<img src="${stumpBox.iconPath(item)}" alt="" draggable="false">`; }

    // ── 판 ─────────────────────────────────────────────────
    function stumpItemClasses(item, result) {
        const out = ['is-filled'], suppressed = result.suppressed.has(item.id);
        if (item.id === selectedId) out.push('is-selected');
        if (suppressed) out.push('is-suppressed');
        if (stumpBox.isMature(item)) out.push('is-ripe');
        if (!suppressed && stumpBox.isMature(item) && result.resonant.has(item.color)) out.push('is-resonant');
        return out;
    }
    function stumpCellLabel(cell, item, open) {
        if (!open) return `닫힌 칸 · 루프 ${stumpBox.opensAt(game, cell)}에 열림`;
        return item ? stumpBox.label(item) : '빈 칸';
    }
    function stumpCellClasses(item, open, result) {
        const classes = ['stump-cell', open ? 'is-open' : 'is-locked'].concat(item ? stumpItemClasses(item, result) : []);
        if (!item && open && selectedId !== null) classes.push('is-target');
        return classes;
    }
    function stumpCellBody(cell, item, open) {
        if (item) return stumpIcon(item) + (stumpBox.isMature(item) ? '' : stumpBar(item));
        return open ? '' : `<span class="stump-cell-lock">${stumpBox.opensAt(game, cell)}</span>`;
    }
    function stumpCellHtml(cell, result) {
        const id = game.stumpBox.board[cell], item = id === null ? null : stumpBox.itemById(game, id), open = stumpBox.isOpen(game, cell);
        const classes = stumpCellClasses(item, open, result), body = stumpCellBody(cell, item, open);
        return `<button type="button" class="${classes.join(' ')}" data-stump-action="cell" data-cell="${cell}" aria-label="${escStump(stumpCellLabel(cell, item, open))}"`
            + `${open ? '' : ' aria-disabled="true"'} style="--stump-tone:${item ? stumpTone(item.color) : 'transparent'}">${body}</button>`;
    }
    function stumpBoardHtml(result) {
        const cells = Array.from({ length: STUMP_BOX_SIZE * STUMP_BOX_SIZE }, (_, cell) => stumpCellHtml(cell, result)).join('');
        return `<div class="stump-board" role="grid" aria-label="그루터기 함 판"><div class="stump-board-grid">${cells}</div></div>`;
    }

    // ── 요약 ───────────────────────────────────────────────
    function stumpStatText(stat, value) {
        for (const table of Object.values(STUMP_BOX_YIELDS)) {
            for (const gain of Object.values(table)) if (gain.stat === stat) return gain.text.replace('{v}', stumpNumber(value));
        }
        return `${stat} +${stumpNumber(value)}`;
    }
    function stumpSummaryHtml(result) {
        const chips = COLORS.map(color => {
            const on = result.resonant.has(color);
            return `<span class="stump-chip${on ? ' is-on' : ''}" style="--stump-tone:${stumpTone(color)}">${STUMP_BOX_COLORS[color].label} ${result.counts[color]}${on ? ' · 공명' : ''}</span>`;
        }).join('');
        const open = stumpBox.openCount(game), next = STUMP_BOX_UNLOCKS.find(step => step.cells > open);
        const notes = [`열린 칸 ${open}/25`, next ? `루프 ${next.loop}에 ${next.cells}칸(판의 숫자 = 열리는 루프)` : '', result.suppressed.size ? `억제 ${result.suppressed.size}개` : ''].filter(Boolean);
        const stats = Object.keys(result.stats).map(stat => `<li>${escStump(stumpStatText(stat, result.stats[stat]))}</li>`).join('');
        return `<div class="stump-chips" title="다 자라고 억제되지 않은 색별 개수. ${STUMP_BOX_RESONANCE.count}개부터 공명 +${STUMP_BOX_RESONANCE.bonusPct}%">${chips}</div>`
            + `<p class="stump-line">${notes.join(' · ')}</p>`
            + `<ul class="stump-stats">${stats || '<li class="is-empty">다 자란 아이템이 아직 없습니다.</li>'}</ul>`;
    }

    // ── 고른 아이템 ─────────────────────────────────────────
    function stumpGrowthLine(item) {
        if (stumpBox.isMature(item)) return '<p class="stump-growth is-ripe">다 자랐습니다. 새 루프에 씨앗·수액으로 돌아가 다시 자랍니다.</p>';
        const hint = stumpBox.targetStage(item) ? '' : ' · 꽃·열매 중 하나를 고르세요';
        return `<p class="stump-growth">성장 ${item.xp} / ${stumpBox.need(item)}${hint}</p>${stumpBar(item, true)}`;
    }
    function stumpYieldLine(item, result) {
        const gain = stumpBox.yieldOf(item) || (item.family === 'seed' ? STUMP_BOX_YIELDS[pendingPath][item.color] : null);
        if (!gain) return '';
        const value = result.values[item.id] ?? gain.value * item.roll;
        return `<p class="stump-yield">${stumpBox.isMature(item) ? '' : '다 자라면 '}${escStump(gain.text.replace('{v}', stumpNumber(value)))}</p>`;
    }
    function stumpStatusLine(item, result, cell) {
        if (cell < 0) return '<p class="stump-status">보관함에 있습니다 · 보관함에서는 자라지 않습니다.</p>';
        if (result.suppressed.has(item.id)) {
            const rival = STUMP_BOX_COLORS[STUMP_BOX_OPPOSITES[item.color]].label;
            return `<p class="stump-status is-bad">억제됨 — 상하좌우로 맞닿은 ${rival} 아이템 때문에 자라지 않고 능력치도 없습니다.</p>`;
        }
        if (stumpBox.isMature(item) && result.resonant.has(item.color)) {
            return `<p class="stump-status is-good">공명 — 다 자란 ${STUMP_BOX_COLORS[item.color].label} ${result.counts[item.color]}개 · 능력치 +${STUMP_BOX_RESONANCE.bonusPct}%</p>`;
        }
        return '<p class="stump-status">판 위에 있습니다 · 처치할 때마다 자랍니다.</p>';
    }
    function stumpPathPicker(item) {
        if (item.family !== 'seed' || item.xp > 0) return '';
        const current = item.path || pendingPath;
        return `<div class="stump-path">${Object.keys(PATH_LABELS).map(path => `<button type="button" class="${current === path ? 'is-on' : ''}"`
            + ` data-stump-action="path" data-path="${path}" aria-pressed="${current === path}">${PATH_LABELS[path]}</button>`).join('')}</div>`;
    }
    function stumpActionsHtml(item, cell) {
        const hint = cell < 0 ? '판의 빈 칸을 누르면 심습니다.' : '다른 빈 칸을 누르면 옮깁니다.';
        const back = cell < 0 ? '' : '<button type="button" data-stump-action="unplace">보관함으로</button>';
        return `<p class="stump-hint">${hint}</p><div class="stump-actions">${back}<button type="button" data-stump-action="deselect">선택 해제</button></div>`;
    }
    function stumpDetailHtml(result) {
        const item = selectedId === null ? null : stumpBox.itemById(game, selectedId);
        if (!item) return '<p class="stump-hint">보관함이나 판에서 아이템을 누르면 설명이 나옵니다.</p>';
        const cell = game.stumpBox.board.indexOf(item.id);
        return `<div class="stump-detail-head" style="--stump-tone:${stumpTone(item.color)}">${stumpIcon(item)}`
            + `<div><strong>${escStump(stumpBox.label(item))}</strong><small>품질 ${Math.round(item.roll * 100)}%</small></div></div>`
            + stumpGrowthLine(item) + stumpYieldLine(item, result) + stumpStatusLine(item, result, cell) + stumpPathPicker(item) + stumpActionsHtml(item, cell);
    }

    // ── 시작 선물·보관함 ────────────────────────────────────
    function stumpStarterRow(family, title) {
        if (game.stumpBox.starter[family]) return '';
        const buttons = COLORS.map(color => `<button type="button" data-stump-action="starter" data-family="${family}" data-color="${color}" style="--stump-tone:${stumpTone(color)}">`
            + `<img src="assets/px/stump/${family}-${color}.png" alt="" draggable="false">${STUMP_BOX_COLORS[color].label}</button>`).join('');
        return `<div class="stump-starter-row"><span>${title}</span>${buttons}</div>`;
    }
    function stumpStarterHtml() {
        const rows = stumpStarterRow('seed', '씨앗') + stumpStarterRow('sap', '수액');
        if (!rows) return '';
        return '<h3>시작 선물</h3><p class="stump-hint">색을 골라 씨앗과 수액을 하나씩 받으세요. 한 번만 받습니다.</p>' + rows;
    }
    function stumpStorageCard(item) {
        const growing = item.xp > 0 && !stumpBox.isMature(item) ? stumpBar(item) : '', label = escStump(stumpBox.label(item));
        return `<button type="button" class="stump-item${item.id === selectedId ? ' is-selected' : ''}" data-stump-action="item" data-item="${item.id}"`
            + ` title="${label}" aria-label="${label}" style="--stump-tone:${stumpTone(item.color)}">${stumpIcon(item)}${growing}</button>`;
    }
    function stumpStorageHtml() {
        const all = stumpBox.storage(game), items = colorFilter === 'all' ? all : all.filter(item => item.color === colorFilter);
        const filters = ['all'].concat(COLORS).map(key => `<button type="button" class="stump-filter${colorFilter === key ? ' is-on' : ''}" data-stump-action="filter"`
            + ` data-filter="${key}" aria-pressed="${colorFilter === key}">${key === 'all' ? '전체' : STUMP_BOX_COLORS[key].label}</button>`).join('');
        const empty = all.length ? '이 색의 아이템이 없습니다.' : '비어 있습니다. 스토리 액트 밖의 처치에서 가끔 씨앗·수액이 나옵니다.';
        return `<div class="stump-storage-head"><h3>보관함 ${all.length}/${STUMP_BOX_STORAGE}</h3><div class="stump-filters">${filters}</div></div>`
            + `<div class="stump-storage-grid">${items.map(stumpStorageCard).join('') || `<p class="stump-hint">${empty}</p>`}</div>`;
    }

    // ── 그리기 ─────────────────────────────────────────────
    function paintStumpPart(id, html) {
        const node = document.getElementById(id);
        if (node && node.__stumpHtml !== html) { node.innerHTML = html; node.__stumpHtml = html; }
    }
    function stumpTabSignature() {
        return JSON.stringify([game.stumpBox, selectedId, pendingPath, colorFilter, stumpBox.openCount(game), !!game.woodsmanBuildLock]);
    }
    /** Called for the visible tab (renderVisibleManagementPanels) and once a second while it stays open. */
    function renderStumpBoxTab(force) {
        const root = document.getElementById('tab-stump');
        if (!root || !game.stumpBox || !game.stumpBox.acquired) return;
        bindStumpBoxTab(root);
        const key = stumpTabSignature();
        if (!force && key === lastSignature) return;
        lastSignature = key;
        const result = stumpBox.evaluate(game);
        paintStumpPart('stump-box-board', stumpBoardHtml(result));
        paintStumpPart('stump-box-summary', stumpSummaryHtml(result));
        paintStumpPart('stump-box-detail', stumpDetailHtml(result));
        paintStumpPart('stump-box-starter', stumpStarterHtml());
        paintStumpPart('stump-box-storage', stumpStorageHtml());
    }
    function refreshStumpTabIfVisible() {
        if (typeof getRenderingUiTabIds === 'function' && getRenderingUiTabIds().has('tab-stump')) renderStumpBoxTab();
    }

    // ── 조작 ───────────────────────────────────────────────
    function notifyStump(message) { showGameToast(message, { tone: 'info' }); }
    function commitStumpChange() {
        lastSignature = '';
        queueImportantSave(300);
        renderStumpBoxTab(true);
        updateStaticUI();
    }
    function showStumpBoardOnPhone() {
        if (!uiDisplay.matches('(max-width: 1080px)')) return;
        const tab = document.getElementById('stump-board-section-tab');
        if (tab && tab.getAttribute('aria-selected') !== 'true') tab.click();
    }
    function selectStumpItem(id) {
        selectedId = selectedId === id ? null : id;
        const item = selectedId === null ? null : stumpBox.itemById(game, selectedId);
        if (item && item.path) pendingPath = item.path;
        renderStumpBoxTab(true);
        if (item && game.stumpBox.board.indexOf(item.id) < 0) showStumpBoardOnPhone();
    }
    function stumpRefusal(item) {
        if (game.woodsmanBuildLock) return '나무꾼 전투 중에는 그루터기 함 배치를 바꿀 수 없습니다.';
        return `${stumpBox.label(item)}: 이 칸에는 놓을 수 없습니다.`;
    }
    function plantStumpItem(cell) {
        const item = stumpBox.itemById(game, selectedId);
        if (!item) return selectStumpItem(null);
        if (!stumpBox.place(game, item.id, cell, pendingPath)) return notifyStump(stumpRefusal(item));
        commitStumpChange();
    }
    function clickStumpCell(cell) {
        const occupant = game.stumpBox.board[cell];
        if (!stumpBox.isOpen(game, cell)) return notifyStump(`이 칸은 루프 ${stumpBox.opensAt(game, cell)}에 열립니다.`);
        if (occupant !== null) return selectStumpItem(occupant);
        if (selectedId !== null) plantStumpItem(cell);
    }
    function chooseStumpPath(path) {
        const item = selectedId === null ? null : stumpBox.itemById(game, selectedId);
        pendingPath = path;
        if (item && item.path && stumpBox.setPath(game, item.id, path)) return commitStumpChange();
        renderStumpBoxTab(true);
    }
    function unplaceStumpSelection() {
        if (selectedId === null) return;
        if (!stumpBox.unplace(game, selectedId)) return notifyStump(game.woodsmanBuildLock ? stumpRefusal(stumpBox.itemById(game, selectedId)) : '보관함이 가득 찼습니다.');
        commitStumpChange();
    }
    function claimStumpStarter(family, color) {
        const item = stumpBox.claimStarter(game, family, color);
        if (!item) return notifyStump('보관함이 가득 찼거나 이미 받은 선물입니다.');
        selectedId = item.id;
        notifyStump(`시작 선물: ${stumpBox.label(item)}`);
        commitStumpChange();
    }
    const ACTIONS = {
        cell: data => clickStumpCell(Number(data.cell)),
        item: data => selectStumpItem(Number(data.item)),
        path: data => chooseStumpPath(data.path),
        unplace: () => unplaceStumpSelection(),
        deselect: () => selectStumpItem(null),
        starter: data => claimStumpStarter(data.family, data.color),
        filter: data => { colorFilter = data.filter; renderStumpBoxTab(true); }
    };
    function onStumpTabClick(event) {
        const target = event.target.closest('[data-stump-action]');
        if (target && ACTIONS[target.dataset.stumpAction]) ACTIONS[target.dataset.stumpAction](target.dataset);
    }
    function bindStumpBoxTab(root) {
        if (bound) return;
        bound = true;
        root.addEventListener('click', onStumpTabClick);
        ticker = ticker || setInterval(refreshStumpTabIfVisible, 1000);
    }

    // ── 획득 안내·처치 소식 ─────────────────────────────────
    /** From checkUnlocks (foreground): grants the box on the first act-10 clear and shows the one-time notice. */
    function checkStumpBoxUnlock() {
        if (stumpBox.sync(game, 'act10')) game.noti.stump = true;
        if (!game.stumpBox.acquired) return;
        queueTutorialNotice('unlock_stump_box', '그루터기 함',
            '액트 10을 넘어선 보상으로 그루터기 함을 얻었습니다.\n씨앗과 수액을 판에 놓으면 처치할 때마다 자랍니다. 보관함에서는 자라지 않습니다.\n'
            + '같은 색이 셋 다 자라면 공명(+10%)하고, 화염과 냉기 · 번개와 카오스가 맞닿으면 둘 다 멈춥니다.\n먼저 ‘그루터기 함’에서 시작 선물로 씨앗과 수액의 색을 골라 받으세요.',
            'tab-stump');
    }
    function announceStumpChange(detail) {
        if (detail.drop) addLog(`🌱 그루터기 함: ${stumpBox.label(detail.drop)} 획득`, 'loot-magic');
        (detail.ripened || []).forEach(item => addLog(`🌸 그루터기 함: ${STUMP_BOX_COLORS[item.color].label} ${STUMP_BOX_STAGES[stumpBox.stageOf(item)].label} 다 자람`, 'loot-rare'));
        lastSignature = '';
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('project-idle:stump-box-changed', event => announceStumpChange(event.detail || {}));
    }

    return { renderStumpBoxTab, checkStumpBoxUnlock };
})();
safeExposeGlobals({ stumpBoxUi });
