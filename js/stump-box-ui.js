// 그루터기 함 화면: 5×5 판(유물 그림 위의 칸 단추), 머리줄(색 개수 · 열린 칸 · 규칙 ?), 고른 것의 설명, 시작 선물, 보관함.
// 옮기기는 두 가지(2026-10-04 사용자 요청, 장비 창과 같게): 누르기 — 아이템을 고르고 판의 칸(빈 칸이면 옮기고, 찬 칸이면 자리를
// 바꾼다)이나 보관함을 누른다. 끌기 — js/stump-box-drag-ui.js가 이 모듈의 dropOnCell · dropOnStorage를 부른다.
// 마우스를 올리면 게임 툴팁(tipFor)이 나온다. 규칙 · 계산은 js/stump-box.js.
// 부적(색 없는 세 번째 계열)의 설명 · 합계 · 봉인 풀기 조각은 js/stump-talisman-ui.js가, 3×3 조합창은 js/stump-cube-ui.js가 준다.
// 접붙이기(루프 18부터): 판의 칸(빈 칸도 누르면 고른다)을 골라 [접붙이기]로 단계를 올린다. 단계는 칸 왼쪽 위 숫자로 보인다.
const stumpBoxUi = (() => {
    const COLORS = Object.keys(STUMP_BOX_COLORS);
    const PATH_LABELS = { flower: '꽃', fruit: '열매' };
    const TALISMAN_CURRENCIES = ['sealShard', 'strongSealShard', 'radiantSealShard', 'beeswax'];
    /** The tab switches to two columns at this width (css/stump-box.css @container). */
    const WIDE_TAB = 761;
    let selectedId = null, selectedCell = null, pendingPath = 'flower', colorFilter = 'all', lastSignature = '', bound = false, ticker = null;

    function escStump(text) { return escapeHTML(String(text)); }
    function stumpTone(color) { return STUMP_BOX_COLORS[color].tone; }
    function itemTone(item) { return item.family === 'talisman' ? stumpTalismanUi.tone(item) : stumpTone(item.color); }
    function stumpPercent(item) { return Math.min(100, Math.round(item.xp / stumpBox.need(item) * 100)); }
    function stumpNumber(value) { return String(Math.round(value * 10) / 10); }
    function stumpBar(item, wide) {
        return `<span class="stump-bar${wide ? ' is-wide' : ''}"><i style="width:${stumpPercent(item)}%"></i></span>`;
    }
    function stumpIcon(item) { return `<img src="${stumpBox.iconPath(item)}" alt="" draggable="false">`; }
    function selectedItem() { return selectedId === null ? null : stumpBox.itemById(game, selectedId); }
    /** What a seed without a path grows into when it is planted: the picker's choice when it is the selected item. */
    function plantingPath(item) { return item.path || (item.id === selectedId ? pendingPath : 'flower'); }

    // ── 판 ─────────────────────────────────────────────────
    function stumpItemClasses(item, result) {
        const out = ['is-filled', `is-${item.family}`], suppressed = result.suppressed.has(item.id);
        if (item.id === selectedId) out.push('is-selected');
        if (suppressed) out.push('is-suppressed');
        if (stumpBox.isMature(item)) out.push('is-ripe');
        if (!suppressed && stumpBox.isMature(item) && result.resonant.has(item.color)) out.push('is-resonant');
        return out;
    }
    function stumpGraftLabel(cell) {
        const rank = stumpBox.graftRank(game.stumpBox, cell);
        return rank ? `, 접붙이기 ${rank}단계(+${rank * STUMP_BOX_GRAFT.pctPerRank}%)` : '';
    }
    function stumpCellLabel(cell, item, open) {
        if (!open) return `닫힌 칸, 루프 ${stumpBox.opensAt(game, cell)}에 열림`;
        return (item ? stumpBox.label(item) : '빈 칸') + stumpGraftLabel(cell);
    }
    /** While an item is picked, every open cell but its own is a target: empty ones take it, filled ones trade places. */
    function stumpTargetClass(item, open) {
        if (selectedId === null || !open || (item && item.id === selectedId)) return null;
        return item ? 'is-swap' : 'is-target';
    }
    function stumpCellClasses(item, open, result, cell) {
        const classes = ['stump-cell', open ? 'is-open' : 'is-locked'].concat(item ? stumpItemClasses(item, result) : []);
        const target = stumpTargetClass(item, open);
        if (target) classes.push(target);
        if (!item && cell === selectedCell) classes.push('is-selected');
        return classes;
    }
    function stumpGraftMark(cell) {
        const rank = stumpBox.graftRank(game.stumpBox, cell);
        return rank ? `<span class="stump-graft-mark" aria-hidden="true">${rank}</span>` : '';
    }
    function stumpCellBody(cell, item, open) {
        if (item) return stumpIcon(item) + (stumpBox.isMature(item) ? '' : stumpBar(item)) + stumpGraftMark(cell);
        return open ? stumpGraftMark(cell) : `<span class="stump-cell-lock">${stumpBox.opensAt(game, cell)}</span>`;
    }
    /** Hover and drag hooks: items drag, every cell takes drops, cells with something to say carry the tooltip. */
    function stumpCellHooks(cell, item, open) {
        const tip = item || !open || stumpBox.graftRank(game.stumpBox, cell) ? ' data-stump-tip="cell" data-info-tooltip-anchor="1"' : '';
        return `${item ? ` data-stump-drag="${item.id}"` : ''} data-stump-drop-cell="${cell}"${tip}`;
    }
    function stumpCellHtml(cell, result) {
        const id = game.stumpBox.board[cell], item = id === null ? null : stumpBox.itemById(game, id), open = stumpBox.isOpen(game, cell);
        const classes = stumpCellClasses(item, open, result, cell), body = stumpCellBody(cell, item, open);
        return `<button type="button" class="${classes.join(' ')}" data-stump-action="cell" data-cell="${cell}"${stumpCellHooks(cell, item, open)}`
            + ` aria-label="${escStump(stumpCellLabel(cell, item, open))}"${open ? '' : ' aria-disabled="true"'}`
            + ` style="--stump-tone:${item ? itemTone(item) : 'transparent'}">${body}</button>`;
    }
    function stumpBoardHtml(result) {
        const cells = Array.from({ length: STUMP_BOX_SIZE * STUMP_BOX_SIZE }, (_, cell) => stumpCellHtml(cell, result)).join('');
        return `<div class="stump-board" role="grid" aria-label="그루터기 함 판"><div class="stump-board-grid">${cells}</div></div>`;
    }

    // ── 머리줄 · 요약 ───────────────────────────────────────
    function stumpStatText(stat, value) {
        for (const table of Object.values(STUMP_BOX_YIELDS)) {
            for (const gain of Object.values(table)) if (gain.stat === stat) return gain.text.replace('{v}', stumpNumber(value));
        }
        return `${stat} +${stumpNumber(value)}`;
    }
    function stumpGraftNote() {
        if (!stumpBox.graftOpen(game)) return '';
        return `접붙이기 점수 ${stumpBox.graftPoints(game).free}`;
    }
    /** One line above the board: grown colours (resonance lit), open cells, suppression, graft points and the rules button. */
    function stumpHeadHtml(result) {
        const chips = COLORS.map(color => {
            const on = result.resonant.has(color);
            return `<span class="stump-chip${on ? ' is-on' : ''}" style="--stump-tone:${stumpTone(color)}">${STUMP_BOX_COLORS[color].label} ${result.counts[color]}${on ? ' 공명' : ''}</span>`;
        }).join('');
        const next = stumpBox.nextOpening(game);
        const notes = [`칸 ${stumpBox.openCount(game)}/25${next ? ` · 루프 ${next.loop}에 +1` : ''}`,
            result.suppressed.size ? `억제 ${result.suppressed.size}` : '', stumpGraftNote()].filter(Boolean);
        return `<div class="stump-chips">${chips}</div><span class="stump-line">${notes.join(' · ')}</span>`
            + '<button type="button" class="stump-rules-button" data-stump-action="rules" data-stump-tip="rules" data-info-tooltip-anchor="1" aria-label="그루터기 함 규칙">?</button>';
    }
    /** What the grown items add up to, under the board. */
    function stumpSummaryHtml(result) {
        const stats = Object.keys(result.stats).map(stat => `<li>${escStump(stumpStatText(stat, result.stats[stat]))}</li>`).join('');
        return `<ul class="stump-stats">${stats || '<li class="is-empty">다 자란 것 없음</li>'}</ul>` + stumpTalismanUi.summaryHtml();
    }
    function stumpRulesTipHtml() {
        const rules = ['판에 놓은 것만 처치로 자랍니다.', `다 자란 같은 색 ${STUMP_BOX_RESONANCE.count}개: 공명 +${STUMP_BOX_RESONANCE.bonusPct}%`,
            '화염↔냉기, 번개↔카오스가 맞닿으면 둘 다 멈춥니다.', '누르거나 끌어서 옮깁니다. 찬 칸에 놓으면 자리를 바꿉니다.'];
        if (contentProgression.isUnlocked('talisman')) rules.push('부적은 색이 없고 판에서 깨어납니다.');
        if (stumpBox.graftOpen(game)) rules.push(`접붙이기: 칸마다 최대 ${STUMP_BOX_GRAFT.maxRank}단계, 단계마다 +${STUMP_BOX_GRAFT.pctPerRank}% (칸 왼쪽 위 숫자)`);
        return '<div class="tooltip-title">그루터기 함</div>' + rules.map(rule => `<div class="tooltip-line">${escStump(rule)}</div>`).join('');
    }

    // ── 접붙이기 ───────────────────────────────────────────
    function stumpGraftButton(action, cell, label, reason) {
        return `<button type="button" data-stump-action="${action}" data-cell="${cell}"${reason ? ' disabled' : ''}>${label}</button>`;
    }
    /** The graft panel for a board cell (the selected item's cell or a selected empty cell); '' before grafting opens. */
    function stumpGraftHtml(cell) {
        if (cell < 0 || !stumpBox.graftOpen(game)) return '';
        const rank = stumpBox.graftRank(game.stumpBox, cell), max = STUMP_BOX_GRAFT.maxRank, free = stumpBox.graftPoints(game).free;
        const raiseReason = rank < max ? stumpBox.graftRaiseReason(game, cell) : '';
        const raise = rank < max ? stumpGraftButton('graft-raise', cell, `접붙이기 (${rank + 1}점)`, raiseReason) : '';
        const lower = rank > 0 ? stumpGraftButton('graft-lower', cell, `되돌리기 (마름병 포자 ${STUMP_BOX_GRAFT.refundSpores})`,
            stumpBox.graftLowerReason(game, cell)) : '';
        // 0단계면 효과(+0%)는 빼고, '남은 점수 9'는 한 줄에(숫자만 다음 줄로 떨어졌다 — 검토 4차)
        const effect = rank ? ` · 효과 +${rank * STUMP_BOX_GRAFT.pctPerRank}%` : '';
        return `<div class="stump-graft"><p class="stump-line"><strong>접붙이기 ${rank}/${max}단계</strong>${effect} · 남은 점수 ${free}</p>`
            + `${raiseReason ? `<p class="stump-hint">${escStump(raiseReason)}</p>` : ''}<div class="stump-actions">${raise}${lower}</div></div>`;
    }
    function stumpCellDetailHtml(cell) {
        return '<p class="stump-line"><strong>빈 칸</strong></p>' + stumpGraftHtml(cell)
            + '<div class="stump-actions"><button type="button" data-stump-action="deselect">선택 해제</button></div>';
    }

    // ── 고른 것의 설명 · 툴팁 ───────────────────────────────
    function stumpGrowthText(item) {
        if (item.family === 'talisman') return stumpBox.isMature(item) ? '' : `깨어남 ${item.xp} / ${stumpBox.need(item)}`;
        if (stumpBox.isMature(item)) return '다 자람 · 새 루프에 다시 씨앗 · 수액으로';
        return `성장 ${item.xp} / ${stumpBox.need(item)}`;
    }
    function stumpYieldText(item, result) {
        const gain = stumpBox.yieldOf(item) || (item.family === 'seed' ? STUMP_BOX_YIELDS[plantingPath(item)][item.color] : null);
        if (!gain) return '';
        const value = result.values[item.id] ?? gain.value * item.roll;
        return `${stumpBox.isMature(item) ? '' : '다 자라면 '}${gain.text.replace('{v}', stumpNumber(value))}`;
    }
    /** Only what is not the normal case: in storage, suppressed, or resonating. */
    function stumpStatus(item, result, cell) {
        if (cell < 0) return { text: '보관함 · 자라지 않음', tone: '' };
        if (result.suppressed.has(item.id)) return { text: `${STUMP_BOX_COLORS[STUMP_BOX_OPPOSITES[item.color]].label}에 막혀 멈춤`, tone: 'is-bad' };
        if (stumpBox.isMature(item) && result.resonant.has(item.color)) return { text: `공명 +${STUMP_BOX_RESONANCE.bonusPct}%`, tone: 'is-good' };
        return null;
    }
    function stumpPathPicker(item) {
        if (item.family !== 'seed' || item.xp > 0) return '';
        const current = item.path || pendingPath;
        return `<div class="stump-path">${Object.keys(PATH_LABELS).map(path => `<button type="button" class="${current === path ? 'is-on' : ''}"`
            + ` data-stump-action="path" data-path="${path}" aria-pressed="${current === path}">${PATH_LABELS[path]}</button>`).join('')}</div>`;
    }
    function stumpActionsHtml(cell) {
        const back = cell < 0 ? '' : '<button type="button" data-stump-action="unplace">보관함으로</button>';
        return `<div class="stump-actions">${back}<button type="button" data-stump-action="deselect">선택 해제</button></div>`;
    }
    function stumpDetailHead(item) {
        const note = item.family === 'talisman' ? '' : ` <small>품질 ${Math.round(item.roll * 100)}%</small>`;
        return `<div class="stump-detail-head" style="--stump-tone:${itemTone(item)}">${stumpIcon(item)}`
            + `<div><strong>${escStump(stumpBox.label(item))}</strong>${note}</div></div>`;
    }
    function stumpGrowthHtml(item) {
        const growth = stumpGrowthText(item), ripe = stumpBox.isMature(item);
        return growth ? `<p class="stump-growth${ripe ? ' is-ripe' : ''}">${escStump(growth)}</p>${ripe ? '' : stumpBar(item, true)}` : '';
    }
    function stumpSeedBody(item, result, cell) {
        const gain = stumpYieldText(item, result), status = stumpStatus(item, result, cell);
        return stumpGrowthHtml(item) + (gain ? `<p class="stump-yield">${escStump(gain)}</p>` : '')
            + (status ? `<p class="stump-status${status.tone ? ` ${status.tone}` : ''}">${escStump(status.text)}</p>` : '') + stumpPathPicker(item);
    }
    /** The selected item's (or cell's) panel; empty when nothing is selected — hovering shows the same facts. */
    function stumpDetailHtml(result) {
        const item = selectedItem();
        if (!item) return selectedCell === null ? '' : stumpCellDetailHtml(selectedCell);
        const cell = game.stumpBox.board.indexOf(item.id);
        const body = item.family === 'talisman' ? stumpGrowthHtml(item) + stumpTalismanUi.detailHtml(item, cell) : stumpSeedBody(item, result, cell);
        return stumpDetailHead(item) + body + stumpGraftHtml(cell) + stumpActionsHtml(cell);
    }
    function stumpGrowthTipLine(item) {
        const growth = stumpGrowthText(item), ripe = stumpBox.isMature(item);
        return growth ? `<div class="tooltip-line stump-tip-growth${ripe ? ' is-ripe' : ''}">${escStump(growth)}${ripe ? '' : ` (${stumpPercent(item)}%)`}</div>` : '';
    }
    /** Seed · sap lines: what it gives (yield colour) and, only when unusual, its state. */
    function stumpSeedTipLines(item, result, cell) {
        const gain = stumpYieldText(item, result), status = stumpStatus(item, result, cell);
        return (gain ? `<div class="tooltip-line stump-tip-yield">${escStump(gain)}</div>` : '')
            + (status ? `<div class="tooltip-line stump-tip-status${status.tone ? ` ${status.tone}` : ''}">${escStump(status.text)}</div>` : '');
    }
    function stumpGraftTipLine(cell) {
        const rank = cell < 0 ? 0 : stumpBox.graftRank(game.stumpBox, cell);
        return rank ? `<div class="tooltip-line stump-tip-graft">접붙이기 ${rank}단계 · 효과 +${rank * STUMP_BOX_GRAFT.pctPerRank}%</div>` : '';
    }
    function stumpItemTipHtml(item, result) {
        const cell = game.stumpBox.board.indexOf(item.id), talisman = item.family === 'talisman';
        const quality = talisman ? '' : `<div class="tooltip-line tooltip-meta-base">품질 ${Math.round(item.roll * 100)}%</div>`;
        const body = talisman ? stumpTalismanUi.tooltipHtml(item, cell) : stumpSeedTipLines(item, result, cell);
        return `<div class="tooltip-title" style="color:${itemTone(item)}">${escStump(stumpBox.label(item))}</div>`
            + quality + stumpGrowthTipLine(item) + body + stumpGraftTipLine(cell);
    }
    function stumpCellTipHtml(cell) {
        if (!stumpBox.isOpen(game, cell)) return `<div class="tooltip-title">닫힌 칸</div><div class="tooltip-line">루프 ${stumpBox.opensAt(game, cell)}에 열립니다.</div>`;
        const rank = stumpBox.graftRank(game.stumpBox, cell);
        return rank ? `<div class="tooltip-title">빈 칸</div><div class="tooltip-line stump-tip-graft">접붙이기 ${rank}단계 · 효과 +${rank * STUMP_BOX_GRAFT.pctPerRank}%</div>` : '';
    }
    /**
     * Tooltip for a hovered stump element ([data-stump-tip]): an item on the board or in storage, a closed or grafted
     * cell, or the rules button. Returns null when there is nothing to show.
     * @returns {{ html: string, tone: string } | null}
     */
    function tipFor(element) {
        const kind = element.dataset.stumpTip;
        if (kind === 'rules') return { html: stumpRulesTipHtml(), tone: '#c9a45c' };
        const id = element.dataset.stumpDrag !== undefined ? Number(element.dataset.stumpDrag) : null;
        const item = id === null ? null : stumpBox.itemById(game, id);
        if (item) return { html: stumpItemTipHtml(item, stumpBox.evaluate(game)), tone: itemTone(item) };
        if (kind !== 'cell') return null;
        const html = stumpCellTipHtml(Number(element.dataset.stumpDropCell));
        return html ? { html, tone: '#8a7a5c' } : null;
    }

    // ── 시작 선물·보관함 ────────────────────────────────────
    function stumpStarterRow(family, title) {
        if (game.stumpBox.starter[family]) return '';
        const buttons = COLORS.map(color => `<button type="button" data-stump-action="starter" data-family="${family}" data-color="${color}" style="--stump-tone:${stumpTone(color)}"`
            + ` aria-label="${STUMP_BOX_COLORS[color].label} ${title} 받기"><img src="assets/px/stump/${family}-${color}.png" alt="" draggable="false">${STUMP_BOX_COLORS[color].label}</button>`).join('');
        return `<div class="stump-starter-row"><span>${title}</span>${buttons}</div>`;
    }
    function stumpStarterHtml() {
        const rows = stumpStarterRow('seed', '씨앗') + stumpStarterRow('sap', '수액');
        return rows ? `<h3>시작 선물 <small>색마다 하나씩</small></h3>${rows}` : '';
    }
    function stumpStorageCard(item) {
        const growing = item.xp > 0 && !stumpBox.isMature(item) ? stumpBar(item) : '';
        return `<button type="button" class="stump-item${item.id === selectedId ? ' is-selected' : ''}" data-stump-action="item" data-item="${item.id}"`
            + ` data-stump-drag="${item.id}" data-stump-tip="item" data-info-tooltip-anchor="1"`
            + ` aria-label="${escStump(stumpBox.label(item))}" style="--stump-tone:${itemTone(item)}">${stumpIcon(item)}${growing}</button>`;
    }
    function stumpFilterLabel(key) {
        if (key === 'all') return '전체';
        return key === 'talisman' ? '부적' : STUMP_BOX_COLORS[key].label;
    }
    function stumpFilterMatch(item) {
        if (colorFilter === 'all') return true;
        return colorFilter === 'talisman' ? item.family === 'talisman' : item.color === colorFilter;
    }
    /** Storage columns for the tab's width: the grid is as wide as the column it sits in, one cell about 50px. */
    function stumpStorageColumns() {
        const width = document.getElementById('tab-stump')?.clientWidth || 0;
        const column = width >= WIDE_TAB ? width * 0.48 : width;
        return Math.max(5, Math.min(12, Math.floor(column / 50) || 6));
    }
    /** Owned items, then empty slots to the end of their row plus one free row (a drop zone), never past capacity. */
    function stumpStorageSlots(count, columns) {
        if (colorFilter !== 'all') return 0;
        const rows = Math.max(2, Math.ceil(count / columns) + 1);
        return Math.max(0, Math.min(STUMP_BOX_STORAGE, rows * columns) - count);
    }
    function stumpStorageHtml() {
        const all = stumpBox.storage(game), items = all.filter(stumpFilterMatch), columns = stumpStorageColumns();
        const keys = ['all'].concat(COLORS, all.some(item => item.family === 'talisman') || colorFilter === 'talisman' ? ['talisman'] : []);
        const filters = all.length ? keys.map(key => `<button type="button" class="stump-filter${colorFilter === key ? ' is-on' : ''}" data-stump-action="filter"`
            + ` data-filter="${key}" aria-pressed="${colorFilter === key}">${stumpFilterLabel(key)}</button>`).join('') : '';
        const slots = '<span class="stump-slot" aria-hidden="true"></span>'.repeat(stumpStorageSlots(all.length, columns));
        const target = selectedId !== null && game.stumpBox.board.includes(selectedId) ? ' is-target' : '';
        return `<div class="stump-storage-head"><h3>보관함 ${all.length}/${STUMP_BOX_STORAGE}</h3><div class="stump-filters">${filters}</div></div>`
            + `<div class="stump-storage-grid${target}" data-stump-action="storage" data-stump-drop-storage="1" style="--stump-columns:${columns}">`
            + `${items.map(stumpStorageCard).join('') || (all.length ? '<p class="stump-hint">이 분류는 비어 있습니다.</p>' : '')}${slots}</div>`;
    }

    // ── 그리기 ─────────────────────────────────────────────
    function paintStumpPart(id, html) {
        const node = document.getElementById(id);
        if (node && node.__stumpHtml !== html) { node.innerHTML = html; node.__stumpHtml = html; }
    }
    function stumpTabSignature() {
        const talismanInputs = [contentProgression.isUnlocked('talisman'), TALISMAN_CURRENCIES.map(key => Math.floor(game.currencies[key] || 0))];
        const graftInputs = [selectedCell, stumpBox.graftPoints(game).free, Math.floor(game.currencies.blightSpore || 0)];
        return JSON.stringify([game.stumpBox, selectedId, pendingPath, colorFilter, stumpBox.openCount(game), !!game.woodsmanBuildLock, talismanInputs,
            graftInputs, stumpCubeUi.cubeSignature(), stumpStorageColumns()]);
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
        paintStumpPart('stump-box-head', stumpHeadHtml(result));
        paintStumpPart('stump-box-board', stumpBoardHtml(result));
        paintStumpPart('stump-cube', stumpCubeUi.cubeHtml());
        paintStumpPart('stump-box-summary', stumpSummaryHtml(result));
        paintStumpPart('stump-box-detail', stumpDetailHtml(result));
        paintStumpPart('stump-box-starter', stumpStarterHtml());
        paintStumpPart('stump-box-storage', stumpStorageHtml());
        paintStumpPart('stump-box-unseal', stumpTalismanUi.unsealHtml());
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
    function selectStumpItem(id) {
        selectedId = selectedId === id ? null : id;
        selectedCell = null;
        const item = selectedItem();
        if (item && item.path) pendingPath = item.path;
        renderStumpBoxTab(true);
        if (item) revealStumpDetailOnPhone();
    }
    function stumpRefusal(item) {
        if (game.woodsmanBuildLock) return '나무꾼 전투 중에는 그루터기 함 배치를 바꿀 수 없습니다.';
        return `${stumpBox.label(item)}: 이 칸에는 놓을 수 없습니다.`;
    }
    /**
     * Puts an item on a board cell: an empty cell takes it, a filled one trades places (stumpBox.move). Shared by
     * pressing and dragging. Returns whether the box changed; a refusal is shown as a toast.
     */
    function dropOnCell(id, cell) {
        const item = stumpBox.itemById(game, id);
        if (!item || game.stumpBox.board[cell] === id) return false;
        if (!stumpBox.isOpen(game, cell)) {
            notifyStump(`이 칸은 루프 ${stumpBox.opensAt(game, cell)}에 열립니다.`);
            return false;
        }
        if (!stumpBox.move(game, id, cell, plantingPath(item))) {
            notifyStump(stumpRefusal(item));
            return false;
        }
        selectedId = null;
        selectedCell = null;
        commitStumpChange();
        return true;
    }
    /** Takes a board item back to storage (pressing the storage, dragging onto it, or [보관함으로]). */
    function dropOnStorage(id) {
        const item = stumpBox.itemById(game, id);
        if (!item || !game.stumpBox.board.includes(id)) return false;
        if (!stumpBox.unplace(game, id)) {
            notifyStump(game.woodsmanBuildLock ? stumpRefusal(item) : '보관함이 가득 찼습니다.');
            return false;
        }
        selectedId = null;
        commitStumpChange();
        return true;
    }
    function selectStumpCell(cell) {
        selectedCell = selectedCell === cell ? null : cell;
        renderStumpBoxTab(true);
        if (selectedCell !== null) revealStumpDetailOnPhone();
    }
    /** 휴대폰: 판에서 고르면 바로 아래 설명(접붙이기 단추)을 화면 안으로 — 화면 밖 한참 아래에 떠서 누른 반응이 없는 것처럼 보였다(검토 4차). */
    function revealStumpDetailOnPhone() {
        if (!uiDisplay.matches('(max-width: 1080px)')) return;
        document.getElementById('stump-box-detail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function clickStumpCell(cell) {
        const occupant = game.stumpBox.board[cell];
        if (!stumpBox.isOpen(game, cell)) return notifyStump(`이 칸은 루프 ${stumpBox.opensAt(game, cell)}에 열립니다.`);
        if (selectedId !== null && occupant === selectedId) return selectStumpItem(null);
        if (selectedId !== null) return dropOnCell(selectedId, cell);
        if (occupant !== null) return selectStumpItem(occupant);
        if (stumpBox.graftOpen(game)) selectStumpCell(cell);
    }
    function graftStumpCell(cell, raise) {
        const reason = raise ? stumpBox.graftRaiseReason(game, cell) : stumpBox.graftLowerReason(game, cell);
        if (reason) return notifyStump(reason);
        (raise ? stumpBox.graftRaise : stumpBox.graftLower)(game, cell);
        commitStumpChange();
    }
    function chooseStumpPath(path) {
        const item = selectedItem();
        pendingPath = path;
        if (item && item.path && stumpBox.setPath(game, item.id, path)) return commitStumpChange();
        renderStumpBoxTab(true);
    }
    function claimStumpStarter(family, color) {
        const item = stumpBox.claimStarter(game, family, color);
        if (!item) return notifyStump('보관함이 가득 찼거나 이미 받은 선물입니다.');
        selectedId = item.id;
        notifyStump(`시작 선물: ${stumpBox.label(item)}`);
        commitStumpChange();
    }
    function unsealTalisman(source) {
        const item = stumpTalismanUi.unseal(source);
        if (!item) return;
        selectedId = item.id;
        commitStumpChange();
    }
    async function discardTalisman() {
        if (selectedId === null || !await stumpTalismanUi.discard(selectedId)) return;
        selectedId = null;
        commitStumpChange();
    }
    /** Pressing ? (touch has no hover) opens the rules under the button; the next press elsewhere closes them. */
    function showStumpRules(button) {
        const rect = button.getBoundingClientRect();
        showInfoTooltipHtml(rect.left, rect.bottom, stumpRulesTipHtml(), '#c9a45c');
    }
    const ACTIONS = {
        rules: (data, button) => showStumpRules(button),
        cell: data => clickStumpCell(Number(data.cell)),
        item: data => selectStumpItem(Number(data.item)),
        storage: () => { if (selectedId !== null) dropOnStorage(selectedId); },
        path: data => chooseStumpPath(data.path),
        unplace: () => { if (selectedId !== null) dropOnStorage(selectedId); },
        deselect: () => selectStumpItem(null),
        starter: data => claimStumpStarter(data.family, data.color),
        filter: data => { colorFilter = data.filter; renderStumpBoxTab(true); },
        'talisman-unseal': data => unsealTalisman(data.source),
        'talisman-exchange': data => { if (stumpTalismanUi.exchange(Number(data.index))) commitStumpChange(); },
        'talisman-wax': () => { if (stumpTalismanUi.wax(selectedId)) commitStumpChange(); },
        'talisman-turn': () => { if (stumpTalismanUi.turn(selectedId)) commitStumpChange(); },
        'talisman-discard': () => discardTalisman(),
        'graft-raise': data => graftStumpCell(Number(data.cell), true),
        'graft-lower': data => graftStumpCell(Number(data.cell), false),
        'cube-cell': data => stumpCubeUi.takeOutCubeCell(Number(data.cell)),
        'cube-open': () => stumpCubeUi.openCubePicker(),
        'cube-transmute': () => stumpCubeUi.transmuteCube(),
        'cube-clear': () => stumpCubeUi.clearCube(),
        'cube-book': () => stumpCubeUi.toggleCubeBook()
    };
    function onStumpTabClick(event) {
        const target = event.target.closest('[data-stump-action]');
        if (target && ACTIONS[target.dataset.stumpAction]) ACTIONS[target.dataset.stumpAction](target.dataset, target);
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
        announceStumpGraft();
        queueTutorialNotice('unlock_stump_box', '그루터기 함',
            '액트 10을 넘어선 보상으로 그루터기 함을 얻었습니다.\n씨앗과 수액을 판에 놓으면 처치할 때마다 자랍니다. 보관함에서는 자라지 않습니다.\n'
            + '같은 색이 셋 다 자라면 공명(+10%)하고, 화염과 냉기, 번개와 카오스가 맞닿으면 둘 다 멈춥니다.\n먼저 ‘그루터기 함’에서 시작 선물로 씨앗과 수액의 색을 골라 받으세요.',
            'tab-stump');
    }
    /** Once, when the reached loop opens grafting (loop 18; saves already past it see it after this update). */
    function announceStumpGraft() {
        if (!stumpBox.graftOpen(game) || (game.seenTutorials || []).includes('unlock_stump_graft')) return;
        game.noti.stump = true;
        queueTutorialNotice('unlock_stump_graft', '접붙이기',
            `루프 ${STUMP_BOX_GRAFT.startLoop}부터 루프마다 접붙이기 점수 ${STUMP_BOX_GRAFT.pointsPerLoop}점을 받습니다.\n`
            + `‘그루터기 함’에서 칸을 누르고 [접붙이기]로 그 칸을 강화하세요. n단계에는 n점이 들고(최대 ${STUMP_BOX_GRAFT.maxRank}단계), `
            + `단계마다 그 칸에 놓인 씨앗 · 수액 · 부적의 효과가 +${STUMP_BOX_GRAFT.pctPerRank}%입니다.\n마름병 포자로 한 단계씩 되돌리면 점수가 돌아옵니다.`,
            'tab-stump');
    }
    function announceStumpChange(detail) {
        if (detail.drop) addLog(detail.drop.family === 'talisman' ? `🧿 그루터기 함: [${detail.drop.name}] 획득`
            : `🌱 그루터기 함: ${stumpBox.label(detail.drop)} 획득`, detail.drop.rarity === 'unique' ? 'loot-unique' : 'loot-magic');
        if (detail.overflow) addLog(`🧿 그루터기 함 보관함이 가득 차 부적 대신 ${ORB_DB[detail.overflow].name} 1개를 받았습니다.`, 'loot-magic');
        (detail.ripened || []).forEach(item => addLog(item.family === 'talisman' ? `🧿 그루터기 함: [${item.name}] 깨어남`
            : `🌸 그루터기 함: ${STUMP_BOX_COLORS[item.color].label} ${STUMP_BOX_STAGES[stumpBox.stageOf(item)].label} 다 자람`, 'loot-rare'));
        lastSignature = '';
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('project-idle:stump-box-changed', event => announceStumpChange(event.detail || {}));
    }

    /** Repaints now (the cube and its picker change outside the tab's own clicks). */
    function refreshStumpTabNow() {
        lastSignature = '';
        renderStumpBoxTab(true);
    }

    return { renderStumpBoxTab, refreshStumpTabNow, checkStumpBoxUnlock, tipFor, dropOnCell, dropOnStorage };
})();
safeExposeGlobals({ stumpBoxUi });
