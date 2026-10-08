// 그루터기 함 화면: 5×5 판(유물 그림 위의 칸 단추), 머리줄(색 개수, 열린 칸, 규칙 ?), 고른 것의 설명, 받을 선물, 보관함.
// 옮기기는 두 가지(2026-10-04 사용자 요청, 장비 창과 같게): 누르기 — 아이템을 고르고 판의 칸(빈 칸이면 옮기고, 찬 칸이면 자리를
// 바꾼다)이나 보관함을 누른다. 끌기 — js/stump-box-drag-ui.js가 이 모듈의 dropOnCell · dropOnStorage를 부른다.
// 마우스를 올리면 게임 툴팁(tipFor)이 나온다. 규칙 · 계산은 js/stump-box.js.
// 부적(색 없는 세 번째 계열)의 설명 · 합계 · 봉인 풀기 조각은 js/stump-talisman-ui.js가, 3×3 조합창은 js/stump-cube-ui.js가 준다.
// 접붙이기(루프 18부터): 판의 칸(빈 칸도 누르면 고른다)을 골라 [접붙이기]로 단계를 올린다. 단계는 칸 왼쪽 위 숫자로 보인다.
// 수확 일지, 줄 선물, 함 해금 목록과 그 알림은 js/stump-harvest-ui.js가 준다(2026-10-07 해금 1차).
// 다 자라는 순간의 굴림(추가 줄, 풍작, 황금), 불씨의 흉터, 봉인 칸, 씨앗 주머니, 일괄 거름 사용과 일괄 버리기 조각은 js/stump-ripening-ui.js가 준다(16번).
// 2026-10-09 사용자 "씨앗주머니, 부적풀기, 수확일지, 함해금, 목록이 줄지어 있어서 뭐가 뭔지 모르겠음": 왼쪽 열은 판, 조합창, 옵션 합계,
// 오른쪽 열은 고른 것, 받을 선물, 보관함, 그리고 수확 일지 · 함 해금 · 부적을 한 번에 하나씩 보는 탭이다. 툴팁과 도움말은 꼭 필요한 줄만
// 남기고, 아직 효과가 없는 옵션은 "다 자라면" 대신 회색 "(비활성)"으로 적는다.
const stumpBoxUi = (() => {
    const COLORS = Object.keys(STUMP_BOX_COLORS);
    const TALISMAN_CURRENCIES = ['sealShard', 'strongSealShard', 'radiantSealShard', 'beeswax'];
    /** The tab switches to two columns at this width (css/stump-box.css @container). */
    const WIDE_TAB = 761;
    let selectedId = null, selectedCell = null, moreTab = 'harvest', colorFilter = 'all', lastSignature = '', bound = false, ticker = null;

    function escStump(text) { return escapeHTML(String(text)); }
    function stumpTone(color) { return STUMP_BOX_COLORS[color].tone; }
    function itemTone(item) {
        if (item.family === 'talisman') return stumpTalismanUi.tone(item);
        return item.family === 'scar' ? STUMP_BOX_SCAR.tone : stumpTone(item.color);
    }
    function isSealedCell(cell) { return cell >= 0 && stumpBox.isSealed(game.stumpBox, cell); }
    function stumpPercent(item) { return Math.min(100, Math.round(item.xp / stumpBox.need(item) * 100)); }
    function stumpNumber(value) { return String(Math.round(value * 10) / 10); }
    function stumpBar(item, wide) {
        return `<span class="stump-bar${wide ? ' is-wide' : ''}"><i style="width:${stumpPercent(item)}%"></i></span>`;
    }
    function stumpIcon(item) { return `<img src="${stumpBox.iconPath(item)}" alt="" draggable="false">`; }
    function selectedItem() { return selectedId === null ? null : stumpBox.itemById(game, selectedId); }

    // ── 판 ─────────────────────────────────────────────────
    function stumpItemClasses(item, result) {
        const out = ['is-filled', `is-${item.family}`], suppressed = result.suppressed.has(item.id);
        if (item.id === selectedId) out.push('is-selected');
        if (suppressed) out.push('is-suppressed');
        if (stumpBox.isMature(item)) out.push('is-ripe');
        if (stumpRipeningUi.isGolden(item)) out.push('is-golden');
        if (!suppressed && stumpBox.isMature(item) && result.resonant.has(item.color)) out.push('is-resonant');
        return out;
    }
    function stumpGraftLabel(cell) {
        const rank = stumpBox.graftRank(game.stumpBox, cell);
        return rank ? `, 접붙이기 ${rank}단계(+${rank * STUMP_BOX_GRAFT.pctPerRank}%)` : '';
    }
    function stumpCellLabel(cell, item, open) {
        if (!open) return `닫힌 칸, 루프 ${stumpBox.opensAt(game, cell)}에 열림`;
        return (item ? stumpBox.label(item) : '빈 칸') + stumpGraftLabel(cell) + (isSealedCell(cell) ? ', 봉인 칸' : '');
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
        if (isSealedCell(cell)) classes.push('is-sealed');
        return classes;
    }
    /** The graft rank (top left) and the seal (bottom right). */
    function stumpCellMarks(cell) {
        const rank = stumpBox.graftRank(game.stumpBox, cell);
        return (rank ? `<span class="stump-graft-mark" aria-hidden="true">${rank}</span>` : '')
            + (isSealedCell(cell) ? '<span class="stump-seal-mark" aria-hidden="true"></span>' : '');
    }
    function stumpCellBody(cell, item, open) {
        if (item) return stumpIcon(item) + (stumpBox.isMature(item) ? '' : stumpBar(item)) + stumpCellMarks(cell);
        return open ? stumpCellMarks(cell) : `<span class="stump-cell-lock">${stumpBox.opensAt(game, cell)}</span>`;
    }
    /** Hover and drag hooks: items drag, every cell takes drops, cells with something to say carry the tooltip. */
    function stumpCellHooks(cell, item, open) {
        const tip = item || !open || stumpBox.graftRank(game.stumpBox, cell) || isSealedCell(cell) ? ' data-stump-tip="cell" data-info-tooltip-anchor="1"' : '';
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
    /** A summed stat in the box's own words (main lines, extra lines and a scar's lines share them). */
    function stumpStatText(stat, value) { return stumpBox.lineText(stat, value); }
    /** One line above the board: grown colours (resonance lit), open cells, suppression (red), graft points and the rules button. */
    function stumpHeadHtml(result) {
        const chips = COLORS.map(color => {
            const on = result.resonant.has(color);
            return `<span class="stump-chip${on ? ' is-on' : ''}" style="--stump-tone:${stumpTone(color)}">${STUMP_BOX_COLORS[color].label} ${result.counts[color]}${on ? ' 공명' : ''}</span>`;
        }).join('');
        const notes = [`칸 ${stumpBox.openCount(game)}/25`, result.suppressed.size ? `<span class="is-bad">억제 ${result.suppressed.size}</span>` : '',
            stumpBox.graftOpen(game) ? `<span class="is-graft">접붙이기 ${stumpBox.graftPoints(game).free}</span>` : ''].filter(Boolean);
        return `<div class="stump-chips">${chips}</div><span class="stump-line">${notes.join(', ')}</span>`
            + '<button type="button" class="stump-rules-button" data-stump-action="rules" data-stump-tip="rules" data-info-tooltip-anchor="1" aria-label="그루터기 함 규칙">?</button>';
    }
    /** 옵션 합계 under the cube: what the working items add up to, each line in its stat's colour (the item affix colours, 2026-10-06). */
    function stumpSummaryHtml(result) {
        const stats = Object.keys(result.stats).map(stat => `<li style="color:${getItemStatToneColor(stat)}">${escStump(stumpStatText(stat, result.stats[stat]))}</li>`).join('');
        return `<h3>옵션 합계</h3><ul class="stump-stats">${stats || '<li class="is-empty">아직 없음</li>'}</ul>` + stumpTalismanUi.summaryHtml();
    }
    /** The ? card: only the rules a player needs to play the board (2026-10-09 사용자: 꼭 필요한 정보만). */
    function stumpRulesTipHtml() {
        const rules = ['판에 놓은 것만 처치로 자랍니다.', `다 자란 같은 색 ${STUMP_BOX_RESONANCE.count}개: 공명 +${STUMP_BOX_RESONANCE.bonusPct}%`,
            '화염↔냉기, 번개↔카오스가 맞닿으면 둘 다 멈춥니다.', '거름: 보관함의 씨앗이나 수액을 써서 판에서 자라는 것을 모두 키웁니다.',
            '새 루프에 다 자란 것은 다시 자랍니다.'];
        if (stumpBox.graftOpen(game)) rules.push(`접붙이기: 단계마다 +${STUMP_BOX_GRAFT.pctPerRank}% (칸 왼쪽 위 숫자)`);
        rules.push(...stumpRipeningUi.rulesLines());
        return '<div class="tooltip-title">그루터기 함</div>' + rules.map(rule => `<div class="tooltip-line">${escStump(rule)}</div>`).join('');
    }

    // ── 접붙이기 ───────────────────────────────────────────
    function stumpGraftButton(action, cell, label, reason) {
        return `<button type="button" data-stump-action="${action}" data-cell="${cell}"${reason ? ' disabled' : ''}>${label}</button>`;
    }
    /** The graft panel for a board cell (the selected item's cell or a selected empty cell); '' before grafting opens. */
    function stumpGraftHtml(cell) {
        if (cell < 0 || !stumpBox.graftOpen(game)) return '';
        const rank = stumpBox.graftRank(game.stumpBox, cell), max = stumpBox.graftMaxRank(game), free = stumpBox.graftPoints(game).free;
        const raiseReason = rank < max ? stumpBox.graftRaiseReason(game, cell) : '';
        const raise = rank < max ? stumpGraftButton('graft-raise', cell, `접붙이기 (${rank + 1}점)`, raiseReason) : '';
        const lower = rank > 0 ? stumpGraftButton('graft-lower', cell, `되돌리기 (마름병 포자 ${STUMP_BOX_GRAFT.refundSpores})`,
            stumpBox.graftLowerReason(game, cell)) : '';
        // 0단계면 효과(+0%)는 빼고, '남은 점수 9'는 한 줄에(숫자만 다음 줄로 떨어졌다 — 검토 4차)
        const effect = rank ? `, 효과 +${rank * STUMP_BOX_GRAFT.pctPerRank}%` : '';
        return `<div class="stump-graft"><p class="stump-line"><strong>접붙이기 ${rank}/${max}단계</strong>${effect}, 남은 점수 ${free}</p>`
            + `${raiseReason ? `<p class="stump-hint">${escStump(raiseReason)}</p>` : ''}<div class="stump-actions">${raise}${lower}</div></div>`;
    }
    function stumpCellDetailHtml(cell) {
        return `<p class="stump-line"><strong>빈 칸</strong>${isSealedCell(cell) ? ' <small>봉인 칸</small>' : ''}</p>` + stumpGraftHtml(cell) + stumpRipeningUi.sealHtml(cell)
            + '<div class="stump-actions"><button type="button" data-stump-action="deselect">선택 해제</button></div>';
    }

    // ── 고른 것의 설명 · 툴팁 ───────────────────────────────
    // 2026-10-09 사용자 "꼭 필요한 정보만": 보관함, 자라지 않음, 다 자람, 새 루프에 몇 % 같은 줄은 없앴다. 자라는 중이면 성장 줄,
    // 효과는 지금 붙으면 그 능력치 색, 아직 붙지 않으면(자라는 중, 보관함, 막힘) 회색 "(비활성)"이다.
    /** 성장 120 / 3200 (부적과 흉터는 '깨어남'); '' once grown. */
    function stumpGrowthText(item) {
        if (stumpBox.isMature(item)) return '';
        return `${item.color ? '성장' : '깨어남'} ${item.xp} / ${stumpBox.need(item)}`;
    }
    /** What a seed or sap gives: in its stat's colour while it works on the board, otherwise grey with (비활성). */
    function stumpYieldLine(item, result) {
        const gain = stumpBox.yieldOf(item);
        if (!gain) return null;
        const active = Object.hasOwn(result.values, item.id);
        const value = active ? result.values[item.id] : gain.value * stumpBox.qualityOf(item) * stumpBox.goldenMul(item);
        return { text: gain.text.replace('{v}', stumpNumber(value)) + (active ? '' : ' (비활성)'), tone: active ? getItemStatToneColor(gain.stat) : '', active };
    }
    /** Only what changes the item's effect on the board: suppressed (red) or resonating. */
    function stumpStatus(item, result, cell) {
        if (cell < 0) return null;
        if (result.suppressed.has(item.id)) return { text: `${STUMP_BOX_COLORS[STUMP_BOX_OPPOSITES[item.color]].label}에 막혀 멈춤`, tone: 'is-bad' };
        if (stumpBox.isMature(item) && result.resonant.has(item.color)) return { text: `공명 +${STUMP_BOX_RESONANCE.bonusPct}%`, tone: 'is-good' };
        return null;
    }
    /** A stored seed or sap: compost (the button says the growth it gives) or throw it away. */
    function stumpStoredSeedButtons(item) {
        const reason = stumpBox.compostReason(game, item.id);
        return `<button type="button" data-stump-action="compost"${reason ? ' disabled' : ''}>거름으로 쓰기 +${stumpBox.compostGrowth(item)}</button>`
            + '<button type="button" data-stump-action="discard">버리기</button>';
    }
    /** In storage, a seed or sap goes as compost or away and a scar can be thrown away (talismans have their own buttons). */
    function stumpStoredButton(item, cell) {
        if (cell >= 0) return '';
        if (item.family === 'scar') return '<button type="button" data-stump-action="scar-discard">버리기</button>';
        return item.color ? stumpStoredSeedButtons(item) : '';
    }
    function stumpActionsHtml(item, cell) {
        const back = cell < 0 ? '' : '<button type="button" data-stump-action="unplace">보관함으로</button>';
        const reason = cell < 0 && item.color ? stumpBox.compostReason(game, item.id) : '';
        return `${reason ? `<p class="stump-hint">${escStump(reason)}</p>` : ''}<div class="stump-actions">${back}${stumpStoredButton(item, cell)}`
            + '<button type="button" data-stump-action="deselect">선택 해제</button></div>';
    }
    function stumpDetailHead(item) {
        const note = item.color ? ` <small>품질 ${Math.round(item.roll * 100)}%</small>` : '';
        return `<div class="stump-detail-head" style="--stump-tone:${itemTone(item)}">${stumpIcon(item)}`
            + `<div><strong>${escStump(stumpBox.label(item))}</strong>${note}${stumpRipeningUi.badgesHtml(item)}</div></div>`;
    }
    function stumpGrowthHtml(item) {
        const growth = stumpGrowthText(item);
        return growth ? `<p class="stump-growth">${escStump(growth)}</p>${stumpBar(item, true)}` : '';
    }
    /** A seed's or sap's yield, extra lines and status: p rows in the panel, div rows in the tooltip. */
    function stumpSeedRows(item, result, cell, tooltip) {
        const gain = stumpYieldLine(item, result), status = stumpStatus(item, result, cell), tag = tooltip ? 'div' : 'p';
        const yieldClass = tooltip ? 'tooltip-line stump-tip-yield' : 'stump-yield', statusClass = tooltip ? 'tooltip-line stump-tip-status' : 'stump-status';
        return (gain ? `<${tag} class="${yieldClass}${gain.active ? '' : ' is-off'}"${gain.tone ? ` style="color:${gain.tone}"` : ''}>${escStump(gain.text)}</${tag}>` : '')
            + stumpRipeningUi.extraLinesHtml(item, result, tooltip)
            + (status ? `<${tag} class="${statusClass} ${status.tone}">${escStump(status.text)}</${tag}>` : '');
    }
    function stumpBodyHtml(item, result, cell) {
        if (item.family === 'talisman') return stumpGrowthHtml(item) + stumpTalismanUi.detailHtml(item, cell);
        if (item.family === 'scar') return stumpGrowthHtml(item) + stumpRipeningUi.scarBodyHtml(item, result, false);
        return stumpGrowthHtml(item) + stumpSeedRows(item, result, cell, false);
    }
    /** The selected item's (or cell's) panel; empty when nothing is selected — hovering shows the same facts. */
    function stumpDetailHtml(result) {
        const item = selectedItem();
        if (!item) return selectedCell === null ? '' : stumpCellDetailHtml(selectedCell);
        const cell = game.stumpBox.board.indexOf(item.id);
        return stumpDetailHead(item) + stumpBodyHtml(item, result, cell) + stumpGraftHtml(cell) + stumpRipeningUi.sealHtml(cell)
            + stumpActionsHtml(item, cell);
    }
    function stumpGrowthTipLine(item) {
        const growth = stumpGrowthText(item);
        return growth ? `<div class="tooltip-line stump-tip-growth">${escStump(growth)} (${stumpPercent(item)}%)</div>` : '';
    }
    /** The cell's own lines under an item or an empty cell: its graft rank and its seal. */
    function stumpCellTipLines(cell) {
        // 고대 씨앗 곁의 칸은 그 몫만큼 높은 단계로 보인다(효과도 그렇다, stumpBox.ancientRanks).
        const rank = cell < 0 ? 0 : stumpBox.graftRank(game.stumpBox, cell) + stumpBox.ancientRanks(game.stumpBox, cell);
        return (rank ? `<div class="tooltip-line stump-tip-graft">접붙이기 ${rank}단계, +${rank * STUMP_BOX_GRAFT.pctPerRank}%</div>` : '')
            + (isSealedCell(cell) ? '<div class="tooltip-line stump-tip-seal">봉인 칸</div>' : '');
    }
    function stumpTipBody(item, result, cell) {
        if (item.family === 'talisman') return stumpTalismanUi.tooltipHtml(item, cell);
        return item.family === 'scar' ? stumpRipeningUi.scarBodyHtml(item, result, true) : stumpSeedRows(item, result, cell, true);
    }
    function stumpItemTipHtml(item, result) {
        const cell = game.stumpBox.board.indexOf(item.id);
        const quality = item.color ? `<div class="tooltip-line tooltip-meta-base">품질 ${Math.round(item.roll * 100)}%${stumpRipeningUi.badgesHtml(item)}</div>` : '';
        return `<div class="tooltip-title" style="color:${itemTone(item)}">${escStump(stumpBox.label(item))}</div>`
            + quality + stumpGrowthTipLine(item) + stumpTipBody(item, result, cell) + stumpCellTipLines(cell);
    }
    function stumpCellTipHtml(cell) {
        if (!stumpBox.isOpen(game, cell)) return `<div class="tooltip-title">닫힌 칸</div><div class="tooltip-line">루프 ${stumpBox.opensAt(game, cell)}에 열립니다.</div>`;
        const lines = stumpCellTipLines(cell);
        return lines ? `<div class="tooltip-title">빈 칸</div>${lines}` : '';
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

    // ── 선물·보관함 ─────────────────────────────────────────
    /** 받을 선물: 수확 일지의 줄 선물(색을 골라 받는다)과 씨앗 주머니(셋 가운데 하나). 시작 선물은 함을 얻으면 바로 준다(grantStumpStarter). */
    function stumpStarterHtml() {
        const rows = stumpHarvestUi.giftsHtml() + stumpRipeningUi.pouchHtml();
        return rows ? `<h3>받을 선물</h3>${rows}` : '';
    }
    function stumpStorageCard(item) {
        const growing = item.xp > 0 && !stumpBox.isMature(item) ? stumpBar(item) : '';
        const classes = `stump-item${item.id === selectedId ? ' is-selected' : ''}${stumpRipeningUi.isGolden(item) ? ' is-golden' : ''}`;
        return `<button type="button" class="${classes}" data-stump-action="item" data-item="${item.id}"`
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
        return Math.max(0, Math.min(stumpBox.storageLimit(game), rows * columns) - count);
    }
    function stumpStorageHtml() {
        const all = stumpBox.storage(game), items = all.filter(stumpFilterMatch), columns = stumpStorageColumns();
        const keys = ['all'].concat(COLORS, all.some(item => item.family === 'talisman') || colorFilter === 'talisman' ? ['talisman'] : []);
        const filters = all.length ? keys.map(key => `<button type="button" class="stump-filter${colorFilter === key ? ' is-on' : ''}" data-stump-action="filter"`
            + ` data-filter="${key}" aria-pressed="${colorFilter === key}">${stumpFilterLabel(key)}</button>`).join('') : '';
        const slots = '<span class="stump-slot" aria-hidden="true"></span>'.repeat(stumpStorageSlots(all.length, columns));
        const target = selectedId !== null && game.stumpBox.board.includes(selectedId) ? ' is-target' : '';
        return `<div class="stump-storage-head"><h3>보관함 ${all.length}/${stumpBox.storageLimit(game)}</h3><div class="stump-filters">${filters}</div></div>`
            + `${stumpRipeningUi.bulkHtml(colorFilter)}<div class="stump-storage-grid${target}" data-stump-action="storage" data-stump-drop-storage="1" style="--stump-columns:${columns}">`
            + `${items.map(stumpStorageCard).join('') || (all.length ? '<p class="stump-hint">이 분류는 비어 있습니다.</p>' : '')}${slots}</div>`;
    }

    // ── 수확 일지 · 함 해금 · 부적: 한 번에 하나씩 보는 탭(2026-10-09, 전에는 줄지어 쌓여 무엇이 무엇인지 몰랐다) ──────────
    function stumpMoreTabs() {
        const total = Object.keys(STUMP_BOX_HARVEST.rows).length * COLORS.length;
        const tabs = [['harvest', `수확 일지 ${game.stumpBox.harvest.grown.length}/${total}`],
            ['unlocks', `함 해금 ${stumpBox.openUnlocks(game).length}/${STUMP_BOX_UNLOCKS.length}`]];
        return contentProgression.isUnlocked('talisman') ? tabs.concat([['talisman', '부적']]) : tabs;
    }
    const STUMP_MORE_BODIES = Object.freeze({
        harvest: () => stumpHarvestUi.journalHtml(),
        unlocks: () => stumpHarvestUi.unlocksHtml(),
        talisman: () => stumpTalismanUi.unsealHtml() + stumpRipeningUi.codexHtml()
    });
    function stumpMoreHtml() {
        const tabs = stumpMoreTabs();
        if (!tabs.some(([id]) => id === moreTab)) moreTab = tabs[0][0];
        const buttons = tabs.map(([id, label]) => `<button type="button" role="tab" class="stump-more-tab${id === moreTab ? ' is-on' : ''}"`
            + ` data-stump-action="more-tab" data-tab="${id}" aria-selected="${id === moreTab}">${label}</button>`).join('');
        return `<div class="stump-more-tabs" role="tablist">${buttons}</div><div class="stump-more-body" role="tabpanel">${STUMP_MORE_BODIES[moreTab]()}</div>`;
    }

    // ── 그리기 ─────────────────────────────────────────────
    function paintStumpPart(id, html) {
        const node = document.getElementById(id);
        if (node && node.__stumpHtml !== html) { node.innerHTML = html; node.__stumpHtml = html; }
    }
    function stumpTabSignature() {
        const talismanInputs = [contentProgression.isUnlocked('talisman'), TALISMAN_CURRENCIES.map(key => Math.floor(game.currencies[key] || 0))];
        const graftInputs = [selectedCell, stumpBox.graftPoints(game).free, Math.floor(game.currencies.blightSpore || 0)];
        // 함 해금(보관함 한도, 뿌리 기억, 봉인 칸, 품질 상한, 씨앗 주머니 …)은 저널과 루프에서 계산된다(함이 그대로여도 바뀐다).
        const unlockInputs = [stumpBox.storageLimit(game), stumpBox.openUnlocks(game).map(row => row.id)];
        return JSON.stringify([game.stumpBox, selectedId, moreTab, colorFilter, stumpBox.openCount(game), !!game.woodsmanBuildLock, talismanInputs,
            graftInputs, unlockInputs, stumpCubeUi.cubeSignature(), stumpStorageColumns()]);
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
        paintStumpPart('stump-box-more', stumpMoreHtml());
        // 따라 하기(시작 선물 놓기)는 고를 때마다 가리키는 칸을 옮긴다: 보관함의 씨앗 → 판의 빈 칸(젬 고르기 창과 같은 방식).
        if (tutorialActionUi.active) tutorialActionUi.refresh();
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
        renderStumpBoxTab(true);
        if (selectedItem()) revealStumpDetailOnPhone();
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
        if (!stumpBox.move(game, id, cell)) {
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
        if (stumpBox.graftOpen(game) || stumpBox.sealLimit(game)) selectStumpCell(cell);
    }
    function graftStumpCell(cell, raise) {
        const reason = raise ? stumpBox.graftRaiseReason(game, cell) : stumpBox.graftLowerReason(game, cell);
        if (reason) return notifyStump(reason);
        (raise ? stumpBox.graftRaise : stumpBox.graftLower)(game, cell);
        commitStumpChange();
    }
    function claimHarvestGift(row, color) {
        const item = stumpBox.claimHarvestGift(game, row, color);
        if (!item) return notifyStump('보관함이 가득 찼거나 이미 받은 선물입니다.');
        selectedId = item.id;
        notifyStump(`수확 일지 선물: ${stumpBox.label(item)}`);
        commitStumpChange();
    }
    function unsealTalisman(source) {
        const item = stumpTalismanUi.unseal(source);
        if (!item) return;
        selectedId = item.id;
        commitStumpChange();
    }
    function stumpItemName(item) { return stumpBox.shortName(item); }
    function compostStumpItem() {
        const item = selectedItem(), reason = item ? stumpBox.compostReason(game, item.id) : '';
        if (!item || reason) return reason && notifyStump(reason);
        const name = stumpItemName(item), result = stumpBox.compost(game, item.id);
        selectedId = null;
        notifyStump(`거름: ${name}, 판에서 자라는 ${result.fed}개 +${result.growth}`);
        announceStumpRipened(result.ripened);
        commitStumpChange();
    }
    async function discardTalisman() {
        if (selectedId === null || !await stumpTalismanUi.discard(selectedId)) return;
        selectedId = null;
        commitStumpChange();
    }
    async function discardScar() {
        if (selectedId === null || !await stumpRipeningUi.discardScar(selectedId)) return;
        selectedId = null;
        commitStumpChange();
    }
    /** A stored seed or sap thrown away (golden and ancient ones ask first). */
    async function discardStumpSeed() {
        const item = selectedItem();
        if (!item || !item.color || !await stumpRipeningUi.confirmDiscard(item) || !stumpBox.discard(game, item.id)) return;
        selectedId = null;
        commitStumpChange();
    }
    function sealStumpCell(cell) {
        const reason = stumpBox.sealReason(game, cell);
        if (reason) return notifyStump(reason);
        stumpBox.toggleSeal(game, cell);
        commitStumpChange();
    }
    function chooseStumpPouch(id, index) {
        const item = stumpBox.choosePouch(game, id, index);
        if (!item) return notifyStump('보관함이 가득 찼습니다.');
        selectedId = item.id;
        notifyStump(`씨앗 주머니: ${stumpBox.label(item)}`);
        commitStumpChange();
    }
    // 일괄 거름 사용과 일괄 버리기(보관함 분류 전체나 한 색): 누르면 무엇을 쓰는지 먼저 보여 준다(2026-10-09 사용자).
    function runBulkCompost(filter) {
        const result = stumpBox.compostMany(game, filter);
        if (!result) return false;
        notifyStump(`일괄 거름 사용: ${result.count}개, 판에서 자라는 ${result.fed}개 +${result.growth}`);
        announceStumpRipened(result.ripened);
        return true;
    }
    function runBulkDiscard(filter) {
        const gone = stumpBox.discardMany(game, filter);
        if (gone) notifyStump(`일괄 버리기: ${gone.length}개`);
        return !!gone;
    }
    async function bulkStump(kind) {
        const filter = colorFilter;
        if (!await stumpRipeningUi.confirmBulk(kind, filter)) return;
        if (!(kind === 'compost' ? runBulkCompost(filter) : runBulkDiscard(filter))) return;
        if (selectedId !== null && !stumpBox.itemById(game, selectedId)) selectedId = null;
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
        unplace: () => { if (selectedId !== null) dropOnStorage(selectedId); },
        compost: () => compostStumpItem(),
        discard: () => discardStumpSeed(),
        bulk: data => bulkStump(data.kind),
        'more-tab': data => { moreTab = data.tab; renderStumpBoxTab(true); },
        deselect: () => selectStumpItem(null),
        'harvest-gift': data => claimHarvestGift(data.row, data.color),
        filter: data => { colorFilter = data.filter; renderStumpBoxTab(true); },
        'talisman-unseal': data => unsealTalisman(data.source),
        'talisman-exchange': data => { if (stumpTalismanUi.exchange(Number(data.index))) commitStumpChange(); },
        'talisman-wax': () => { if (stumpTalismanUi.wax(selectedId)) commitStumpChange(); },
        'talisman-turn': () => { if (stumpTalismanUi.turn(selectedId)) commitStumpChange(); },
        'talisman-discard': () => discardTalisman(),
        'graft-raise': data => graftStumpCell(Number(data.cell), true),
        'graft-lower': data => graftStumpCell(Number(data.cell), false),
        seal: data => sealStumpCell(Number(data.cell)),
        pouch: data => chooseStumpPouch(data.pouch, Number(data.index)),
        'scar-discard': () => discardScar(),
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
    /** From checkUnlocks (foreground): grants the box on the first act-10 clear, gives the starter gift and shows the one-time
     * notice. Its 따라 해보기 (tutorial-ui.js guide 'unlock_stump_box') puts the gift on the board; closing it plants them. */
    function checkStumpBoxUnlock() {
        if (stumpBox.sync(game, 'act10')) game.noti.stump = true;
        if (!game.stumpBox.acquired) return;
        const sawIntro = (game.seenTutorials || []).includes('unlock_stump_box'), given = grantStumpStarter();
        grantStumpScar();
        announceStumpGraft();
        stumpHarvestUi.announceUnlocks();
        stumpHarvestUi.announceRecipes();
        stumpHarvestUi.announceGraftJournal();
        if (sawIntro) return given.length && announceStumpStarter();
        queueTutorialNotice('unlock_stump_box', '그루터기 함',
            '액트 10을 넘어선 보상으로 그루터기 함과 시작 선물(씨앗과 수액 하나씩)을 받았습니다.\n씨앗과 수액은 판에 놓아야 처치할 때마다 자랍니다.\n'
            + '같은 색이 셋 다 자라면 공명(+10%)하고, 화염과 냉기, 번개와 카오스가 맞닿으면 둘 다 멈춥니다.', 'tab-stump');
    }
    /** 시작 선물은 함을 얻으면 바로 준다(2026-10-07 사용자 결정): 씨앗은 지금 젬의 원소 꽃(물리면 화염 열매), 수액은 약한 저항. */
    function grantStumpStarter() {
        const given = stumpBox.grantStarter(game, getUiPlayerStats());
        if (!given.length) return given;
        game.noti.stump = true;
        lastSignature = '';
        addLog(`🌱 그루터기 함 시작 선물: ${given.map(stumpBox.label).join(', ')}`, 'loot-magic');
        return given;
    }
    /** The first 불씨의 흉터 comes with 포식 (loop 23, once): into storage, with a log line (the unlock notice explains it). */
    function grantStumpScar() {
        const scar = stumpBox.grantScar(game);
        if (!scar) return;
        game.noti.stump = true;
        lastSignature = '';
        addLog(`🔥 그루터기 함: ${withObjectParticle(STUMP_BOX_SCAR.name)} 받았습니다. 판에 놓아 깨우세요.`, 'loot-unique');
    }
    /** 함 안내를 예전에 보고 선물은 이번에 받은 저장: 놓는 법만 따로 한 번 안내한다. */
    function announceStumpStarter() {
        queueTutorialNotice('tutorial_stump_starter', '그루터기 함 시작 선물', '씨앗과 수액을 하나씩 받아 보관함에 넣어 두었습니다.\n판에 놓아야 처치할 때마다 자랍니다.', 'tab-stump');
    }
    /** Once, when the reached loop opens grafting (loop 18; saves already past it see it after this update). */
    function announceStumpGraft() {
        if (!stumpBox.graftOpen(game) || (game.seenTutorials || []).includes('unlock_stump_graft')) return;
        game.noti.stump = true;
        queueTutorialNotice('unlock_stump_graft', '접붙이기',
            `루프 ${STUMP_BOX_GRAFT.startLoop}부터 루프마다 접붙이기 점수 ${STUMP_BOX_GRAFT.pointsPerLoop}점을 받습니다.\n`
            + `‘그루터기 함’에서 칸을 누르고 [접붙이기]로 그 칸을 강화하세요. n단계에는 n점이 들고(최대 ${STUMP_BOX_GRAFT.maxRank}단계), `
            + `단계마다 그 칸에 놓인 씨앗, 수액, 부적의 효과가 +${STUMP_BOX_GRAFT.pctPerRank}%입니다.\n마름병 포자로 한 단계씩 되돌리면 점수가 돌아옵니다.`,
            'tab-stump');
    }
    const STUMP_LOG_ICONS = Object.freeze({ talisman: '🧿', scar: '🔥' });
    /** A drop's log line and tone: talismans by rarity; scars and golden seeds and saps stand out. */
    function stumpDropLog(drop) {
        const name = drop.family === 'talisman' ? `[${drop.name}]` : stumpBox.label(drop);
        const rare = drop.rarity === 'unique' || drop.family === 'scar' || stumpRipeningUi.isGolden(drop);
        return [`${STUMP_LOG_ICONS[drop.family] || (drop.golden ? '✨' : '🌱')} 그루터기 함: ${name} 획득`, rare ? 'loot-unique' : 'loot-magic'];
    }
    function announceStumpChange(detail) {
        if (detail.drop) addLog(...stumpDropLog(detail.drop));
        if (detail.overflow) addLog(`🧿 그루터기 함 보관함이 가득 차 부적 대신 ${ORB_DB[detail.overflow].name} 1개를 받았습니다.`, 'loot-magic');
        if (detail.compost) addLog(stumpCompostDropText(detail.compost), 'loot-magic');
        (detail.ripened || []).forEach(item => addLog(`${STUMP_LOG_ICONS[item.family] || '🌸'} 그루터기 함: ${stumpRipeName(item)}`, 'loot-rare'));
        announceStumpRipened(detail.ripened || []);
        lastSignature = '';
    }
    function stumpCompostDropText(compost) {
        const name = `${STUMP_BOX_COLORS[compost.color].label} ${STUMP_BOX_STAGES[compost.family].label}`;
        return compost.fed ? `🌱 그루터기 함 보관함이 가득 차 ${name}이 거름이 됐습니다(자라는 ${compost.fed}개 +${compost.growth}).`
            : `🌱 그루터기 함 보관함이 가득 차고 판에서 자라는 것도 없어 ${name}을 놓쳤습니다.`;
    }
    /** What a ripened item now gives (resonance and graft included), for the toast. */
    function stumpRipeGain(item) {
        const gain = stumpBox.yieldOf(item), value = stumpBox.evaluate(game).values[item.id];
        return gain && value ? gain.text.replace('{v}', stumpNumber(value)) : '';
    }
    function stumpRipeName(item) {
        if (item.family === 'talisman') return `[${item.name}] 깨어남`;
        return `${stumpItemName(item)} ${item.family === 'scar' ? '깨어남' : '다 자람'}`;
    }
    /** Ripening is the box's payoff: a toast (what it gives now) and a chime instead of one scrolling log line. */
    function announceStumpRipened(ripened) {
        if (!ripened.length) return;
        const gain = ripened.length === 1 ? stumpRipeGain(ripened[0]) : '';
        const names = ripened.length <= 3 ? ripened.map(stumpRipeName).join(', ') : `${ripened.length}개 다 자람`;
        const gift = stumpBox.pendingGifts(game).length ? ', 수확 일지 선물을 받으세요' : '', note = stumpRipeningUi.ripenNote(ripened);
        if (gift) game.noti.stump = true;
        showGameToast(`그루터기 함: ${names}${gain ? `, ${gain}` : ''}${note ? ` (${note})` : ''}${gift}`, { tone: 'success' });
        playUiFeedbackSound('success');
        stumpHarvestUi.announceRecipes();
        stumpHarvestUi.announceUnlocks();
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
