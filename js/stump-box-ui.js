// 그루터기 함 화면: 5×5 판(틀 그림 위의 칸 단추), 머리줄(색 개수, 열린 칸, 규칙 ?), 고른 것의 설명, 받을 선물, 보관함.
// 옮기기는 두 가지(2026-10-04 사용자 요청, 장비 창과 같게): 누르기 — 아이템을 고르고 판의 칸(빈 칸이면 옮기고, 찬 칸이면 자리를
// 바꾼다)이나 보관함을 누른다. 끌기 — js/stump-box-drag-ui.js가 이 모듈의 dropOnCell · dropOnStorage를 부른다.
// 마우스를 올리면 게임 툴팁(tipFor)이 나온다. 규칙 · 계산은 js/stump-box.js.
// 부적(색 없는 세 번째 계열)의 설명 · 합계 · 봉인 풀기 조각은 js/stump-talisman-ui.js가, 5×5 조합창은 js/stump-cube-ui.js가 준다.
// 틀(2026-10-25 사용자 그림, scripts/build-stump-frames.cjs): 어두운 틀은 판, 뼈빛 틀은 조합창이고 틀 위 보석을 누르면 서로 바뀐다
// (전에는 판 아래에 조합창이 따로 있었다). 옵션 합계와 아래 탭(수확 일지, 함 해금, 부적)은 접혀 있다가 누르면 펼친다: 기본 화면에
// 스크롤이 생기지 않게(사용자). 보관함은 100칸씩 쪽으로 나눈다.
// 접붙이기(루프 18부터): 판의 칸(빈 칸도 누르면 고른다)을 골라 [접붙이기]로 단계를 올린다. 단계는 칸 왼쪽 위 숫자로 보인다.
// 수확 일지, 줄 선물, 함 해금 목록과 그 알림은 js/stump-harvest-ui.js가 준다(2026-10-07 해금 1차).
// 다 자라는 순간의 굴림(추가 줄, 풍작, 황금), 불씨의 흉터, 봉인 칸, 씨앗 주머니, 일괄 거름 사용과 일괄 버리기 조각은 js/stump-ripening-ui.js가 준다(16번).
// 2026-10-09 사용자 "씨앗주머니, 부적풀기, 수확일지, 함해금, 목록이 줄지어 있어서 뭐가 뭔지 모르겠음": 왼쪽 열은 판, 조합창, 옵션 합계,
// 오른쪽 열은 고른 것, 받을 선물, 보관함, 그리고 수확 일지 · 함 해금 · 부적을 한 번에 하나씩 보는 탭이다. 툴팁과 도움말은 꼭 필요한 줄만
// 남기고, 아직 효과가 없는 옵션은 "다 자라면" 대신 회색 "(비활성)"으로 적는다.
const stumpBoxUi = (() => {
    const COLORS = Object.keys(STUMP_BOX_COLORS);
    const TALISMAN_CURRENCIES = ['sealShard', 'strongSealShard', 'radiantSealShard', 'beeswax'];
    let selectedId = null, selectedCell = null, moreTab = 'harvest', colorFilter = 'all', lastSignature = '', bound = false, ticker = null;
    let placement = null, placementKey = '';
    let storageSort = 'quality-desc', stateFilter = 'all', compareOpen = false, comparedId = null;
    // 틀이 보여 주는 것('box' 판, 'cube' 조합창), 접는 칸, 보관함 쪽: 화면만의 상태다(저장하지 않는다).
    let frameView = 'box', frameSwitching = false, summaryOpen = false, moreOpen = false, storagePage = 0;
    /** 보석을 누른 뒤 빛나는 보석 두 장이 번갈아 보이는 시간(css/stump-box.css stump-gem-flash와 같다). */
    const FRAME_FLASH_MS = 240;
    const STORAGE_PAGE_CELLS = 100;
    // Storage items do not grow ("성장 중" means placed on the board), so an unripe stored item is "성장 전".
    const STORAGE_STATES = { all: '모든 상태', ripe: '성장 완료', unripe: '성장 전', locked: '잠금' };
    const STORAGE_SORTS = { 'quality-desc': '품질 높은 순', 'quality-asc': '품질 낮은 순', name: '이름순', recent: '최근 획득순' };

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
        if (item.locked) out.push('is-item-locked');
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
    /** The lock (top right) of a locked item (stumpBox.toggleLock), drawn at the icon's own 11 dots. */
    function stumpLockMark(item) {
        return item.locked ? `<span class="stump-lock-mark">${renderPixelIcon('lock', 'stump-lock-icon')}</span>` : '';
    }
    function stumpCellBody(cell, item, open) {
        if (item) return stumpIcon(item) + (stumpBox.isMature(item) ? '' : stumpBar(item)) + stumpCellMarks(cell) + stumpLockMark(item);
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
    /** The frame: the dark one holds the board, the bone one the cube; its gem switches them (aria names the other side). */
    function stumpBoardHtml(result) {
        const cube = frameView === 'cube';
        const grid = cube ? stumpCubeUi.cubeGridHtml()
            : Array.from({ length: STUMP_BOX_SIZE * STUMP_BOX_SIZE }, (_, cell) => stumpCellHtml(cell, result)).join('');
        const other = cube ? '그루터기 함' : '조합창';
        return `<div class="stump-board is-${frameView}${frameSwitching ? ' is-switching' : ''}"${cube ? '' : ' role="grid" aria-label="그루터기 함 판"'}>`
            + `<button type="button" class="stump-frame-gem" data-stump-action="frame-gem" aria-label="${other}으로 바꾸기" title="${other}으로 바꾸기"></button>`
            + `<div class="stump-board-grid">${grid}</div></div>`
            + '<div id="stump-placement-preview" class="stump-placement-preview" role="status" aria-live="polite" hidden></div>';
    }
    /** The gem: the two glowing frames take turns for a moment, then the frame shows the other side. */
    function switchFrame(button) {
        if (frameSwitching) return;
        const finish = () => {
            frameSwitching = false;
            frameView = frameView === 'box' ? 'cube' : 'box';
            clearPlacementPreview();
            renderStumpBoxTab(true);
            document.querySelector('#tab-stump .stump-frame-gem')?.focus({ preventScroll: true });
        };
        if (uiDisplay.matches('(prefers-reduced-motion: reduce)')) return finish();
        frameSwitching = true;
        button.closest('.stump-board')?.classList.add('is-switching');
        setTimeout(finish, FRAME_FLASH_MS);
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
        const notes = [`칸 ${stumpBox.openCount(game)}/25`, result.suppressed.size ? `<span class="is-bad">비활성 ${result.suppressed.size}</span>` : '',
            stumpBox.graftOpen(game) ? `<span class="is-graft">접붙이기 ${stumpBox.graftPoints(game).free}</span>` : ''].filter(Boolean);
        return `<div class="stump-chips">${chips}</div><span class="stump-line">${notes.join(', ')}</span>`
            + stumpHarvestUi.rewardButtonHtml()
            + `<button type="button" data-stump-action="placement-undo"${stumpBox.canUndoPlacement(game) ? '' : ' disabled'}>배치 되돌리기</button>`
            + '<button type="button" class="stump-rules-button" data-stump-action="rules" data-stump-tip="rules" data-info-tooltip-anchor="1" aria-label="그루터기 함 규칙"><span class="px-center">?</span></button>';
    }
    /** 옵션 합계 under the board: what the working items add up to, each line in its stat's colour (the item affix colours, 2026-10-06).
     * Folded to one line until pressed (2026-10-25 사용자: 접을 수 있게, 기본 화면에 스크롤 없게). */
    function stumpSummaryHtml(result) {
        const keys = Object.keys(result.stats);
        const head = `<button type="button" class="stump-fold" data-stump-action="summary" aria-expanded="${summaryOpen}">`
            + `<span>옵션 합계</span><small>${keys.length ? `${keys.length}줄` : '아직 없음'}</small></button>`;
        if (!summaryOpen) return head;
        const stats = keys.map(stat => `<li style="color:${getItemStatToneColor(stat)}">${escStump(stumpStatText(stat, result.stats[stat]))}</li>`).join('');
        return head + `<ul class="stump-stats">${stats || '<li class="is-empty">아직 없음</li>'}</ul>` + stumpTalismanUi.summaryHtml();
    }
    /** 루프가 바뀔 때: 성장 완료된 그루터기 아이템의 경험치가 초기화된다(뿌리 기억은 그만큼 남긴다). */
    function stumpLoopRule() {
        const keep = stumpBox.rootMemoryPct(game);
        return `루프가 바뀌면 성장 완료된 그루터기 아이템의 경험치가 초기화됩니다${keep ? `(뿌리 기억 ${keep}% 유지)` : ''}.`;
    }
    /** The ? card: only the rules a player needs to play the board (2026-10-09 사용자: 꼭 필요한 정보만, 용어는 그루터기 아이템, 경험치,
     * 성장 완료, 비활성화로 통일하고 "것" 같은 지칭은 쓰지 않는다). */
    function stumpRulesTipHtml() {
        const rules = ['그루터기 함에 있는 그루터기 아이템만 처치 시 경험치를 얻습니다.', `공명: 성장 완료된 같은 색 ${STUMP_BOX_RESONANCE.count}개 이상이면 그 색 능력치 +${STUMP_BOX_RESONANCE.bonusPct}%`,
            '비활성화: 화염과 냉기, 번개와 카오스가 맞닿으면 둘 다 비활성화됩니다.', '거름: 보관함의 씨앗이나 수액을 소모해 그루터기 함에서 성장 중인 그루터기 아이템의 경험치를 올립니다.',
            stumpLoopRule()];
        if (stumpBox.graftOpen(game)) rules.push(`접붙이기: 단계마다 그 칸의 효과 +${STUMP_BOX_GRAFT.pctPerRank}%`);
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
    /** 경험치 120 / 3200; '' once grown. */
    function stumpGrowthText(item) {
        if (stumpBox.isMature(item)) return '';
        return `경험치 ${item.xp} / ${stumpBox.need(item)}`;
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
        if (result.suppressed.has(item.id)) return { text: `비활성화: ${STUMP_BOX_COLORS[STUMP_BOX_OPPOSITES[item.color]].label} 인접`, tone: 'is-bad' };
        if (stumpBox.isMature(item) && result.resonant.has(item.color)) return { text: `공명 +${STUMP_BOX_RESONANCE.bonusPct}%`, tone: 'is-good' };
        return null;
    }
    /** A stored seed or sap: compost (the button says the growth it gives) or throw it away. */
    function stumpStoredSeedButtons(item) {
        const reason = stumpBox.compostReason(game, item.id);
        return `<button type="button" data-stump-action="compost"${reason ? ' disabled' : ''}>거름 사용 (경험치 +${stumpBox.compostGrowth(item)})</button>`
            + `<button type="button" data-stump-action="discard"${item.locked ? ' disabled' : ''}>버리기</button>`;
    }
    /** In storage, a seed or sap goes as compost or away and a scar can be thrown away (talismans have their own buttons). */
    function stumpStoredButton(item, cell) {
        if (cell >= 0) return '';
        if (item.family === 'scar') return `<button type="button" data-stump-action="scar-discard"${item.locked ? ' disabled' : ''}>버리기</button>`;
        return item.color ? stumpStoredSeedButtons(item) : '';
    }
    function stumpActionsHtml(item, cell) {
        const back = cell < 0 ? '' : '<button type="button" data-stump-action="unplace">보관함으로</button>';
        const reason = cell < 0 && item.color ? stumpBox.compostReason(game, item.id) : '';
        return `${reason ? `<p class="stump-hint">${escStump(reason)}</p>` : ''}<div class="stump-actions">${back}${stumpStoredButton(item, cell)}`
            + `<button type="button" data-stump-action="lock">${item.locked ? '잠금 해제' : '잠금'}</button>`
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
        const peers = comparisonItems(item), comparison = compareOpen && peers.length;
        const toggle = peers.length ? `<button type="button" class="stump-compare-toggle" data-stump-action="compare" aria-expanded="${!!comparison}">${comparison ? '비교 닫기' : `같은 종류 비교 (${peers.length})`}</button>` : '';
        return toggle + (comparison ? stumpComparisonHtml(item, peers, result) : stumpDetailHead(item) + stumpBodyHtml(item, result, cell))
            + stumpGraftHtml(cell) + stumpRipeningUi.sealHtml(cell)
            + stumpActionsHtml(item, cell);
    }
    /** Compare the same growth target, not just the current seed/sprout/flower stage. */
    function comparisonKey(item) {
        if (item.family === 'talisman') return `talisman:${item.uniqueId || item.name}`;
        return [item.family, item.color, item.path, !!item.ancient].join(':');
    }
    function comparisonItems(item) {
        const key = comparisonKey(item);
        return game.stumpBox.items.filter(other => other.id !== item.id && comparisonKey(other) === key)
            .sort((a, b) => b.roll - a.roll || a.id - b.id);
    }
    function comparisonLabel(item) {
        const place = game.stumpBox.board.includes(item.id) ? '배치 중' : '보관함';
        const quality = item.color ? ` / ${Math.round(item.roll * 100)}%` : '';
        return `${stumpBox.label(item)}${quality} / ${place}`;
    }
    function comparisonCard(item, title, result, interactive = false) {
        const cell = game.stumpBox.board.indexOf(item.id), place = cell < 0 ? '보관함' : `${cell + 1}번 칸`;
        const body = interactive ? stumpBodyHtml(item, result, cell) : stumpGrowthHtml(item) + stumpTipBody(item, result, cell);
        return `<section class="stump-compare-card" style="--stump-tone:${itemTone(item)}"><h4>${title} <small>${place}</small></h4>`
            + stumpDetailHead(item) + statToneText.markup(body) + '</section>';
    }
    function stumpComparisonHtml(item, peers, result) {
        const other = peers.find(peer => peer.id === comparedId) || peers[0];
        const options = peers.map((peer, index) => `<option value="${peer.id}"${peer.id === other.id ? ' selected' : ''}>${index + 1}. ${escStump(comparisonLabel(peer))}</option>`).join('');
        return `<label class="stump-compare-choice">비교 대상<select data-stump-select="comparison" aria-label="비교 대상">${options}</select></label>`
            + `<div class="stump-comparison">${comparisonCard(item, '선택한 아이템', result, true)}${comparisonCard(other, '비교 아이템', result)}</div>`;
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
    function stumpItemTipHtml(item, result, cell = game.stumpBox.board.indexOf(item.id)) {
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

    // ── 보관함 ─────────────────────────────────────────────
    function stumpStorageCard(item) {
        const growing = item.xp > 0 && !stumpBox.isMature(item) ? stumpBar(item) : '';
        const classes = `stump-item${item.id === selectedId ? ' is-selected' : ''}${stumpRipeningUi.isGolden(item) ? ' is-golden' : ''}${item.locked ? ' is-item-locked' : ''}`;
        return `<button type="button" class="${classes}" data-stump-action="item" data-item="${item.id}"`
            + ` data-stump-drag="${item.id}" data-stump-tip="item" data-info-tooltip-anchor="1"`
            + ` aria-label="${escStump(comparisonLabel(item))}${item.locked ? ', 잠금' : ''}" style="--stump-tone:${itemTone(item)}">${stumpIcon(item)}${growing}${stumpLockMark(item)}</button>`;
    }
    function stumpFilterLabel(key) {
        if (key === 'all') return '전체';
        return key === 'talisman' ? '부적' : STUMP_BOX_COLORS[key].label;
    }
    function stumpFilterMatch(item) {
        if (colorFilter === 'all') return true;
        return colorFilter === 'talisman' ? item.family === 'talisman' : item.color === colorFilter;
    }
    function stumpStateMatch(item) {
        if (stateFilter === 'locked') return !!item.locked;
        if (stateFilter === 'ripe') return stumpBox.isMature(item);
        if (stateFilter === 'unripe') return !stumpBox.isMature(item);
        return true;
    }
    function compareStorageItems(a, b) {
        if (storageSort === 'recent') return b.id - a.id;
        if (storageSort === 'name') return stumpBox.label(a).localeCompare(stumpBox.label(b), 'ko') || a.id - b.id;
        // Talismans and scars have no displayed quality, so keep them after the quality-bearing items.
        if (!!a.color !== !!b.color) return a.color ? -1 : 1;
        return (a.color ? (a.roll - b.roll) * (storageSort === 'quality-asc' ? 1 : -1) : 0) || a.id - b.id;
    }
    function storageSelect(key, label, value, choices) {
        return `<select data-stump-select="${key}" aria-label="보관함 ${label}" title="${label}">`
            + Object.entries(choices).map(([id, name]) => `<option value="${id}"${id === value ? ' selected' : ''}>${name}</option>`).join('') + '</select>';
    }
    /** One row (2026-10-25 사용자 "압축할 수 있는 부분 압축"): 상태, 정렬, 일괄 거름 · 버리기, 거른 것이 있을 때만 몇 개 보이는지. */
    function storageToolsHtml(count, total) {
        const shown = count < total ? `<span class="stump-hint">${count}/${total}개</span>` : '';
        return '<div class="stump-storage-tools">' + storageSelect('state', '상태', stateFilter, STORAGE_STATES)
            + storageSelect('sort', '정렬', storageSort, STORAGE_SORTS) + (stateFilter === 'all' ? stumpRipeningUi.bulkHtml(colorFilter) : '') + shown + '</div>';
    }
    /** Cells to lay out on the shown page: the whole capacity like the equipment bag (2026-10-16 사용자 "창크기에따라 아이템크기 변경시키지
     * 말고, 장비 인벤토리처럼 칸을 놓고 하나씩 들어가게"; css/stump-box.css: 10 columns), 100 a page (2026-10-25 사용자). A filter shows only
     * its items. */
    function stumpStorageCells(count) {
        return colorFilter === 'all' && stateFilter === 'all' ? Math.max(count, stumpBox.storageLimit(game)) : count;
    }
    function storagePagesHtml(pages) {
        if (pages <= 1) return '';
        return '<div class="stump-pages" role="group" aria-label="보관함 쪽">' + Array.from({ length: pages }, (_, page) => `<button type="button"`
            + ` data-stump-action="storage-page" data-page="${page}" aria-pressed="${page === storagePage}">${page + 1}</button>`).join('') + '</div>';
    }
    function stumpStorageHtml() {
        const all = stumpBox.storage(game), items = all.filter(stumpFilterMatch).filter(stumpStateMatch).sort(compareStorageItems);
        const keys = ['all'].concat(COLORS, all.some(item => item.family === 'talisman') || colorFilter === 'talisman' ? ['talisman'] : []);
        const filters = all.length ? keys.map(key => `<button type="button" class="stump-filter${colorFilter === key ? ' is-on' : ''}" data-stump-action="filter"`
            + ` data-filter="${key}" aria-pressed="${colorFilter === key}">${stumpFilterLabel(key)}</button>`).join('') : '';
        const cells = stumpStorageCells(items.length), pages = Math.max(1, Math.ceil(cells / STORAGE_PAGE_CELLS));
        storagePage = Math.min(storagePage, pages - 1);
        const from = storagePage * STORAGE_PAGE_CELLS, shown = items.slice(from, from + STORAGE_PAGE_CELLS);
        const slots = '<span class="stump-slot" aria-hidden="true"></span>'.repeat(Math.max(0, Math.min(STORAGE_PAGE_CELLS, cells - from) - shown.length));
        const target = selectedId !== null && game.stumpBox.board.includes(selectedId) ? ' is-target' : '';
        return `<div class="stump-storage-head"><h3>보관함 ${all.length}/${stumpBox.storageLimit(game)}</h3><div class="stump-filters">${filters}</div>${storagePagesHtml(pages)}</div>`
            + (all.length ? storageToolsHtml(items.length, all.length) : '')
            + `<div class="stump-storage-grid${target}" data-stump-action="storage" data-stump-drop-storage="1">`
            + `${shown.map(stumpStorageCard).join('') || (all.length ? '<p class="stump-hint">이 분류는 비어 있습니다.</p>' : '')}${slots}</div>`;
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
    /** A records shortcut reveals its journal without toggling a previously open tab shut. */
    function revealMoreTab(id) {
        if (!stumpMoreTabs().some(([key]) => key === id)) return false;
        moreTab = id;
        moreOpen = true;
        renderStumpBoxTab(true);
        return true;
    }
    /** The tab row alone until one is pressed; pressing the open tab folds it again (2026-10-25: no scroll on the first view). */
    function stumpMoreHtml() {
        const tabs = stumpMoreTabs();
        if (!tabs.some(([id]) => id === moreTab)) moreTab = tabs[0][0];
        const buttons = tabs.map(([id, label]) => {
            const on = moreOpen && id === moreTab;
            return `<button type="button" role="tab" class="stump-more-tab${on ? ' is-on' : ''}" data-stump-action="more-tab" data-tab="${id}"`
                + ` aria-selected="${on}" aria-expanded="${on}">${label}</button>`;
        }).join('');
        return `<div class="stump-more-tabs" role="tablist">${buttons}</div>`
            + (moreOpen ? `<div class="stump-more-body" role="tabpanel">${STUMP_MORE_BODIES[moreTab]()}</div>` : '');
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
        return JSON.stringify([game.stumpBox, selectedId, moreTab, moreOpen, colorFilter, storageSort, stateFilter, compareOpen, comparedId,
            stumpBox.canUndoPlacement(game), stumpBox.openCount(game), !!game.woodsmanBuildLock, talismanInputs,
            graftInputs, unlockInputs, frameView, summaryOpen, storagePage, stumpCubeUi.cubeSignature()]);
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
        // 틀 아래: 판이면 옵션 합계, 조합창이면 조합 단추와 조합법(빈 칸은 CSS가 숨긴다)
        paintStumpPart('stump-cube', frameView === 'cube' ? stumpCubeUi.cubeHtml() : '');
        paintStumpPart('stump-box-summary', frameView === 'box' ? stumpSummaryHtml(result) : '');
        paintStumpPart('stump-box-detail', stumpDetailHtml(result));
        paintStumpPart('stump-box-storage', stumpStorageHtml());
        paintStumpPart('stump-box-more', stumpMoreHtml());
        renderPlacementPreview();
        // 따라 하기(시작 선물 놓기)는 고를 때마다 가리키는 칸을 옮긴다: 보관함의 씨앗 → 판의 빈 칸(룬 고르기 창과 같은 방식).
        refreshStumpTutorial();
    }
    function refreshStumpTabIfVisible() {
        if (typeof getRenderingUiTabIds === 'function' && getRenderingUiTabIds().has('tab-stump')) renderStumpBoxTab();
    }

    // ── 조작 ───────────────────────────────────────────────
    /** Compare only changed board effects. Both evaluators receive a copied board, never a temporarily edited game. */
    function placementEffects(state) {
        const seeds = stumpBox.evaluate(state), talismans = talismanEffects.summarize(state);
        const stats = { ...seeds.stats }, conditions = {};
        Object.entries(talismans.stats).forEach(([key, value]) => { stats[key] = (stats[key] || 0) + value; });
        // The combat contract takes the strongest copy of each conditional effect, not their sum.
        talismans.conditions.forEach(line => { conditions[line.id] = Math.max(conditions[line.id] || 0, line.value); });
        return { stats, conditions, board: state.stumpBox.board, resonant: seeds.resonant, suppressed: new Set([...seeds.suppressed, ...talismans.suppressed]),
            boss: talismans.bossFinalDmgBonusPct };
    }
    function placementItemNames(ids) {
        return ids.map(id => stumpBox.itemById(game, id)).filter(Boolean).map(stumpBox.shortName).join(', ');
    }
    function placementStatusRows(before, after) {
        const rows = [], disabled = [...after.suppressed].filter(id => !before.suppressed.has(id));
        const enabled = [...before.suppressed].filter(id => after.board.includes(id) && !after.suppressed.has(id));
        if (disabled.length) rows.push(`<li class="is-bad">비활성화: ${escStump(placementItemNames(disabled))}</li>`);
        if (enabled.length) rows.push(`<li class="is-good">비활성화 해제: ${escStump(placementItemNames(enabled))}</li>`);
        COLORS.forEach(color => {
            if (before.resonant.has(color) === after.resonant.has(color)) return;
            const on = after.resonant.has(color), bonus = `+${STUMP_BOX_RESONANCE.bonusPct}%`;
            rows.push(`<li class="${on ? 'is-good' : 'is-bad'}">${STUMP_BOX_COLORS[color].label} 공명: ${on ? `없음 → ${bonus}` : `${bonus} → 없음`}</li>`);
        });
        return rows;
    }
    function placementValueRows(before, after, describe) {
        return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => {
            const from = Math.round((before[key] || 0) * 100) / 100, to = Math.round((after[key] || 0) * 100) / 100;
            if (from === to) return [];
            return [`<li><span class="stump-placement-before">${statToneText.html(describe(key, from))}</span> → <strong>${statToneText.html(describe(key, to))}</strong></li>`];
        });
    }
    function placementRows(preview) {
        const before = placementEffects(game), after = placementEffects(preview);
        const rows = placementStatusRows(before, after);
        rows.push(...placementValueRows(before.stats, after.stats, (id, value) => stumpBox.lineText(id, value).replace(/\+-/g, '−')));
        rows.push(...placementValueRows(before.conditions, after.conditions,
            (id, value) => talismans.describeLine({ kind: 'condition', id, value })));
        if (before.boss !== after.boss) rows.push(`<li>보스 최종 피해: ${before.boss}% → <strong>${after.boss}%</strong></li>`);
        return { rows, disabled: [...after.suppressed].filter(id => !before.suppressed.has(id)),
            enabled: [...before.suppressed].filter(id => after.board.includes(id) && !after.suppressed.has(id)) };
    }
    function clearPlacementMarks() {
        document.querySelectorAll('#stump-box-board .is-preview-target, #stump-box-board .is-preview-off, #stump-box-board .is-preview-on')
            .forEach(node => node.classList.remove('is-preview-target', 'is-preview-off', 'is-preview-on'));
    }
    function markPlacement(result) {
        clearPlacementMarks();
        document.querySelectorAll('#stump-box-board [data-stump-drop-cell]').forEach(node => {
            const cell = Number(node.dataset.stumpDropCell), id = result.board[cell];
            node.classList.toggle('is-preview-target', cell === placement.cell);
            node.classList.toggle('is-preview-off', result.disabled.includes(id));
            node.classList.toggle('is-preview-on', result.enabled.includes(id));
        });
    }
    function clearPlacementPreview(transientOnly = false) {
        if (transientOnly && placement?.pinned) return;
        placement = null;
        placementKey = '';
        clearPlacementMarks();
        const node = document.getElementById('stump-placement-preview');
        if (node) { node.hidden = true; node.replaceChildren(); }
    }
    /** Pointer movement updates this small region only; replacing the board would interrupt an active drag. */
    function renderPlacementPreview() {
        const node = document.getElementById('stump-placement-preview');
        if (!placement || !node) return;
        const key = JSON.stringify([game.stumpBox, !!game.woodsmanBuildLock, placement.id, placement.cell, placement.pinned]);
        if (key !== placementKey) {
            const preview = stumpBox.previewMove(game, placement.id, placement.cell);
            if (!preview) return clearPlacementPreview();
            const result = placementRows(preview);
            placement.result = { ...result, board: preview.stumpBox.board };
            placement.effectKey = JSON.stringify([game.stumpBox.board, result.rows, preview.stumpBox.board]);
            placementKey = key;
        }
        const item = stumpBox.itemById(game, placement.id), occupant = game.stumpBox.board[placement.cell];
        const title = `${stumpBox.shortName(item)}, ${Math.floor(placement.cell / STUMP_BOX_SIZE) + 1}행 ${placement.cell % STUMP_BOX_SIZE + 1}열`;
        const verb = occupant === null ? '배치' : '자리 바꾸기';
        const buttons = placement.pinned ? `<div class="stump-actions"><button type="button" data-stump-action="placement-apply">${verb}</button>`
            + '<button type="button" data-stump-action="placement-cancel">취소</button></div>' : '';
        const html = `<strong>${escStump(title)}</strong><span class="stump-placement-label">${verb} 미리보기</span>`
            + (placement.result.rows.length ? `<ul>${placement.result.rows.join('')}</ul>` : '<p>효과 변화 없음</p>') + buttons;
        if (node.__previewHtml !== html || node.hidden) { node.innerHTML = html; node.__previewHtml = html; }
        node.hidden = false;
        markPlacement(placement.result);
    }
    function previewCell(id, cell, pinned = false) {
        if (placement) {
            if (placement.pinned && !pinned) return;
            if (placement.id === id && placement.cell === cell && placement.pinned === pinned) return;
        }
        placement = { id, cell, pinned };
        placementKey = '';
        renderPlacementPreview();
        if (!pinned) return;
        hideInfoTooltip();
        const node = document.getElementById('stump-placement-preview');
        if (node) node.scrollIntoView({ block: 'nearest' });
        refreshStumpTutorial();
    }
    /** Touch and keyboard: the first press on a cell pins its preview, a second press on the same cell applies it like [배치]. */
    function confirmCell(id, cell) {
        if (placement?.pinned && placement.id === id && placement.cell === cell) return applyPlacement();
        previewCell(id, cell, true);
    }
    function cancelPlacement() {
        clearPlacementPreview();
        refreshStumpTutorial();
    }
    /** The planting guide moves with the screen: stored seed, then an empty cell, then the pinned preview's [배치]. */
    function refreshStumpTutorial() {
        if (tutorialActionUi.active) tutorialActionUi.refresh();
    }
    function hoverCell(cell) {
        if (selectedId !== null) previewCell(selectedId, cell);
        return !!placement;
    }
    function applyPlacement() {
        if (!placement) return;
        // Re-evaluate on confirmation, including newly grown pieces or a challenge lock since the preview.
        const key = placement.effectKey;
        renderPlacementPreview();
        if (!placement) return;
        if (key !== placement.effectKey) return notifyStump('배치 효과가 바뀌었습니다. 확인 후 다시 눌러 주세요.');
        dropOnCell(placement.id, placement.cell);
    }
    function notifyStump(message) { showGameToast(message, { tone: 'info' }); }
    function commitStumpChange() {
        clearPlacementPreview();
        lastSignature = '';
        queueImportantSave(300);
        renderStumpBoxTab(true);
        updateStaticUI();
    }
    function selectStumpItem(id) {
        clearPlacementPreview();
        compareOpen = false;
        comparedId = null;
        selectedId = selectedId === id ? null : id;
        selectedCell = null;
        renderStumpBoxTab(true);
        // A board item's detail (graft, back to storage) comes into view on phones; a stored item keeps the board in view to pick a cell.
        if (selectedId !== null && game.stumpBox.board.includes(selectedId)) revealStumpDetailOnPhone();
    }
    function undoPlacement() {
        if (!stumpBox.undoPlacement(game)) {
            notifyStump('지금은 이전 배치로 되돌릴 수 없습니다.');
            renderStumpBoxTab(true);
            return;
        }
        selectedId = null;
        selectedCell = null;
        commitStumpChange();
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
    function clickStumpCell(cell, confirm) {
        const occupant = game.stumpBox.board[cell];
        if (!stumpBox.isOpen(game, cell)) return notifyStump(`이 칸은 루프 ${stumpBox.opensAt(game, cell)}에 열립니다.`);
        if (selectedId !== null && occupant === selectedId) return selectStumpItem(null);
        if (selectedId !== null) return confirm ? confirmCell(selectedId, cell) : dropOnCell(selectedId, cell);
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
        if (!item) return notifyStump('보관함이 가득 찼거나 이미 받은 보상입니다.');
        selectedId = item.id;
        notifyStump(`수확 일지 보상: ${stumpBox.label(item)}`);
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
        notifyStump(`거름 사용: ${name} 소모, 성장 중인 ${result.fed}개 경험치 +${result.growth}`);
        announceStumpRipened(result.ripened);
        commitStumpChange();
    }
    function toggleStumpLock() {
        const item = selectedItem();
        if (!item) return;
        if (!stumpBox.toggleLock(game, item.id)) return notifyStump('나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.');
        notifyStump(`${stumpItemName(item)} ${item.locked ? '잠금' : '잠금 해제'}`);
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
        notifyStump(`일괄 거름 사용: ${result.count}개 소모, 성장 중인 ${result.fed}개 경험치 +${result.growth}`);
        announceStumpRipened(result.ripened);
        return true;
    }
    function runBulkDiscard(filter) {
        const gone = stumpBox.discardMany(game, filter);
        if (gone) notifyStump(`일괄 버리기: ${gone.length}개`);
        return !!gone;
    }
    async function bulkStump(kind) {
        if (stateFilter !== 'all') return;
        const filter = colorFilter;
        const approval = await stumpRipeningUi.confirmBulk(kind, filter);
        if (!approval) return;
        if (stateFilter !== 'all' || colorFilter !== filter || !stumpRipeningUi.bulkConfirmationCurrent(kind, filter, approval)) {
            notifyStump('대상이 바뀌었습니다. 확인 후 다시 눌러 주세요.');
            renderStumpBoxTab(true);
            return;
        }
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
        cell: (data, button, event) => clickStumpCell(Number(data.cell), event.pointerType === 'touch' || event.detail === 0
            || uiDisplay.matches('(hover: none), (max-width: 680px)')),
        'placement-apply': () => applyPlacement(),
        'placement-cancel': () => cancelPlacement(),
        'placement-undo': () => undoPlacement(),
        compare: () => { compareOpen = !compareOpen; renderStumpBoxTab(true); },
        item: data => selectStumpItem(Number(data.item)),
        storage: () => { if (selectedId !== null) dropOnStorage(selectedId); },
        unplace: () => { if (selectedId !== null) dropOnStorage(selectedId); },
        compost: () => compostStumpItem(),
        discard: () => discardStumpSeed(),
        lock: () => toggleStumpLock(),
        bulk: data => bulkStump(data.kind),
        'more-tab': data => { moreOpen = !(moreOpen && moreTab === data.tab); moreTab = data.tab; renderStumpBoxTab(true); },
        'frame-gem': (data, button) => switchFrame(button),
        summary: () => { summaryOpen = !summaryOpen; renderStumpBoxTab(true); },
        'storage-page': data => { storagePage = Number(data.page) || 0; renderStumpBoxTab(true); },
        deselect: () => selectStumpItem(null),
        rewards: () => stumpHarvestUi.openRewards(),
        filter: data => { colorFilter = data.filter; storagePage = 0; renderStumpBoxTab(true); },
        'talisman-unseal': data => unsealTalisman(data.source),
        'talisman-exchange': data => { if (stumpTalismanUi.exchange(Number(data.index))) commitStumpChange(); },
        'talisman-wax': () => { if (stumpTalismanUi.wax(selectedId)) commitStumpChange(); },
        'talisman-turn': () => { if (stumpTalismanUi.turn(selectedId)) commitStumpChange(); },
        'talisman-discard': () => discardTalisman(),
        'graft-raise': data => graftStumpCell(Number(data.cell), true),
        'graft-lower': data => graftStumpCell(Number(data.cell), false),
        seal: data => sealStumpCell(Number(data.cell)),
        'scar-discard': () => discardScar(),
        'cube-cell': data => stumpCubeUi.takeOutCubeCell(Number(data.cell)),
        'cube-open': () => stumpCubeUi.openCubePicker(),
        'cube-transmute': () => stumpCubeUi.transmuteCube(),
        'cube-clear': () => stumpCubeUi.clearCube(),
        'cube-book': () => stumpCubeUi.toggleCubeBook()
    };
    function onStumpTabClick(event) {
        const target = event.target.closest('[data-stump-action]');
        if (target && ACTIONS[target.dataset.stumpAction]) ACTIONS[target.dataset.stumpAction](target.dataset, target, event);
    }
    function onStumpSelectionChange(event) {
        const key = event.target.dataset.stumpSelect, value = event.target.value;
        if (key === 'state' && Object.hasOwn(STORAGE_STATES, value)) stateFilter = value;
        else if (key === 'sort' && Object.hasOwn(STORAGE_SORTS, value)) storageSort = value;
        else if (key === 'comparison') comparedId = Number(value);
        else return;
        if (key !== 'comparison') storagePage = 0;
        clearPlacementPreview();
        renderStumpBoxTab(true);
        document.querySelector(`[data-stump-select="${key}"]`)?.focus({ preventScroll: true });
    }
    function bindStumpBoxTab(root) {
        if (bound) return;
        bound = true;
        root.addEventListener('click', onStumpTabClick);
        root.addEventListener('change', onStumpSelectionChange);
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
            '액트 10 돌파 보상으로 그루터기 함과 시작 보상(씨앗, 수액 1개씩)을 받았습니다.\n그루터기 함에 있는 그루터기 아이템만 처치 시 경험치를 얻습니다.\n'
            + '성장 완료된 같은 색 3개 이상은 공명(+10%), 화염과 냉기, 번개와 카오스가 맞닿으면 둘 다 비활성화됩니다.', 'tab-stump',
            { quote: STORY_LOOP_MILESTONES.stump });
    }
    /** 시작 선물은 함을 얻으면 바로 준다(2026-10-07 사용자 결정): 씨앗은 지금 룬의 원소 꽃(물리면 화염 열매), 수액은 약한 저항. */
    function grantStumpStarter() {
        // The stats (the weakest resistance picks the sap) only when a starter is still owed: this runs on every map completion.
        const given = stumpBox.starterOwed(game) ? stumpBox.grantStarter(game, getUiPlayerStats()) : [];
        if (!given.length) return given;
        game.noti.stump = true;
        lastSignature = '';
        addLog(`🌱 그루터기 함 시작 보상: ${given.map(stumpBox.label).join(', ')}`, 'loot-magic');
        return given;
    }
    /** The first 불씨의 흉터 comes with 포식 (loop 23, once): into storage, with a log line (the unlock notice explains it). */
    function grantStumpScar() {
        const scar = stumpBox.grantScar(game);
        if (!scar) return;
        game.noti.stump = true;
        lastSignature = '';
        addLog(`🔥 그루터기 함: ${withObjectParticle(STUMP_BOX_SCAR.name)} 받았습니다. 그루터기 함에 배치해 깨우세요.`, 'loot-unique');
    }
    /** 함 안내를 예전에 보고 선물은 이번에 받은 저장: 놓는 법만 따로 한 번 안내한다. */
    function announceStumpStarter() {
        queueTutorialNotice('tutorial_stump_starter', '그루터기 함 시작 보상', '씨앗, 수액 1개씩을 보관함에 넣었습니다.\n그루터기 함에 배치해야 처치 시 경험치를 얻습니다.', 'tab-stump');
    }
    /** Once, when the reached loop opens grafting (loop 18; saves already past it see it after this update). */
    function announceStumpGraft() {
        if (!stumpBox.graftOpen(game) || (game.seenTutorials || []).includes('unlock_stump_graft')) return;
        game.noti.stump = true;
        queueTutorialNotice('unlock_stump_graft', '접붙이기',
            `루프 ${STUMP_BOX_GRAFT.startLoop}부터 루프마다 접붙이기 점수 ${STUMP_BOX_GRAFT.pointsPerLoop}점을 받습니다.\n`
            + `그루터기 함에서 칸을 고르고 [접붙이기]로 강화합니다. n단계에 n점(최대 ${STUMP_BOX_GRAFT.maxRank}단계), `
            + `단계마다 그 칸의 효과 +${STUMP_BOX_GRAFT.pctPerRank}%.\n마름병 포자로 한 단계씩 되돌리면 점수가 돌아옵니다.`,
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
        return compost.fed ? `🌱 그루터기 함 보관함이 가득 차 ${withSubjectParticle(name)} 거름이 됐습니다(성장 중인 ${compost.fed}개 경험치 +${compost.growth}).`
            : `🌱 그루터기 함 보관함이 가득 찼고 그루터기 함에 성장 중인 그루터기 아이템도 없어 ${withObjectParticle(name)} 놓쳤습니다.`;
    }
    /** What a ripened item now gives (resonance and graft included), for the toast. */
    function stumpRipeGain(item) {
        const gain = stumpBox.yieldOf(item), value = stumpBox.evaluate(game).values[item.id];
        return gain && value ? gain.text.replace('{v}', stumpNumber(value)) : '';
    }
    function stumpRipeName(item) {
        if (item.family === 'talisman') return `[${item.name}] 깨어남`;
        return `${stumpItemName(item)} ${item.family === 'scar' ? '깨어남' : '성장 완료'}`;
    }
    /** Ripening is the box's payoff: a toast (what it gives now) and a chime instead of one scrolling log line. */
    function announceStumpRipened(ripened) {
        if (!ripened.length) return;
        const gain = ripened.length === 1 ? stumpRipeGain(ripened[0]) : '';
        const names = ripened.length <= 3 ? ripened.map(stumpRipeName).join(', ') : `${ripened.length}개 성장 완료`;
        const gift = stumpBox.pendingGifts(game).length ? ', 수확 일지 보상을 받으세요' : '', note = stumpRipeningUi.ripenNote(ripened);
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

    /** A reward picked in the rewards window (js/stump-harvest-ui.js): a journal row's gift or a seed pouch's offer. */
    function claimReward(kind, key, choice) {
        if (kind === 'gift') claimHarvestGift(key, choice);
        else chooseStumpPouch(key, choice);
    }

    /** Result snapshots use their own item fields, without today's board bonuses or a reused item ID. */
    function itemTipHtml(item, storedSnapshot = false) {
        if (!storedSnapshot) return stumpItemTipHtml(item, stumpBox.evaluate(game));
        const state = { ...game, stumpBox: { ...game.stumpBox, board: game.stumpBox.board.map(() => null) } };
        return stumpItemTipHtml(item, stumpBox.evaluate(state), -1);
    }

    return { renderStumpBoxTab, refreshStumpTabNow, revealMoreTab, checkStumpBoxUnlock, tipFor, dropOnCell, dropOnStorage, claimReward,
        itemTipHtml, previewCell, hoverCell, clearPlacementPreview };
})();
safeExposeGlobals({ stumpBoxUi });
