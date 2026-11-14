import { isSealedCell, stumpGraftHtml, stumpNumber, escStump, itemTone, stumpIcon, stumpBar, selectedItem, stumpPercent, onNursery } from './stump-board-summary.mjs';
import { frameTipHtml } from './stump-board-markup.mjs';

export function stumpCellDetailHtml(runtime, cell) {
    return `<p class="stump-line"><strong>${(0, runtime.deps._t)('빈 칸')}</strong>${isSealedCell(runtime, cell) ? (0, runtime.deps._t)(' <small>봉인 칸</small>') : ''}</p>` + stumpGraftHtml(runtime, cell) + runtime.deps.stumpRipeningUi.sealHtml(cell)
        + '<div class="stump-actions"><button type="button" data-stump-action="deselect">선택 해제</button></div>';
}

/** 경험치 120 / 3200; '' once grown. */
export function stumpGrowthText(runtime, item) {
    if (runtime.deps.stumpBox.isMature(item)) return '';
    return (0, runtime.deps._t)('경험치 {floor} / {need}', { floor: Math.floor(item.xp), need: runtime.deps.stumpBox.need(item) });
}

/** What a grown seed gives (nothing while it grows: its kind is not known yet): in its stat's colour while it works on the board,
* otherwise grey with (비활성). */
export function stumpYieldLine(runtime, item, result) {
    const gain = runtime.deps.stumpBox.yieldOf(item);
    if (!gain) return null;
    const active = Object.hasOwn(result.values, item.id);
    const value = active ? result.values[item.id] : gain.value * runtime.deps.stumpBox.qualityOf(item) * runtime.deps.stumpBox.goldenMul(item);
    return { text: gain.text.replace('{v}', stumpNumber(runtime, value)) + (active ? '' : ' (비활성)'), tone: active ? (0, runtime.deps.getItemStatToneColor)(gain.stat) : '', active };
}

/** Only what changes the item's effect on the board: suppressed (red) or its synergies (공명, 상생, 규율). */
export function stumpStatus(runtime, item, result, cell) {
    const note = cell < 0 ? null : runtime.deps.stumpBox.boardNote(item, result);
    return note && { text: note.text, tone: note.bad ? 'is-bad' : 'is-good' };
}

/** A stored seed: compost (the button says the growth it gives) or throw it away; a grown one goes into currency instead. */
export function stumpStoredSeedButtons(runtime, item) {
    const reason = runtime.deps.stumpBox.compostReason(runtime.deps.game, item.id), grown = runtime.deps.stumpBox.isMature(item);
    return `<button type="button" data-stump-action="compost"${reason ? ' disabled' : ''}>${(0, runtime.deps._t)('거름 사용 (경험치 +{compostGrowth})', { compostGrowth: runtime.deps.stumpBox.compostGrowth(item) })}</button>`
        + `<button type="button" data-stump-action="${grown ? 'monetize' : 'discard'}"${item.locked ? ' disabled' : ''}>${grown ? (0, runtime.deps._t)('화폐화') : (0, runtime.deps._t)('버리기')}</button>`;
}

/** In storage, a seed goes as compost or away and a scar can be thrown away (talismans have their own buttons). */
export function stumpStoredButton(runtime, item, cell) {
    if (cell >= 0) return '';
    if (item.family === 'scar') return `<button type="button" data-stump-action="scar-discard"${item.locked ? ' disabled' : ''}>${(0, runtime.deps._t)('버리기')}</button>`;
    return item.color ? stumpStoredSeedButtons(runtime, item) : '';
}

export function stumpActionsHtml(runtime, item, cell) {
    const placed = runtime.deps.stumpBox.isPlaced(runtime.deps.game, item.id), back = placed ? '<button type="button" data-stump-action="unplace">보관함으로</button>' : '';
    const reason = !placed && item.color ? runtime.deps.stumpBox.compostReason(runtime.deps.game, item.id) : '';
    return `${reason ? `<p class="stump-hint">${escStump(runtime, reason)}</p>` : ''}<div class="stump-actions">${back}${placed ? '' : stumpStoredButton(runtime, item, cell)}`
        + `<button type="button" data-stump-action="lock">${item.locked ? (0, runtime.deps._t)('잠금 해제') : (0, runtime.deps._t)('잠금')}</button>`
        + '<button type="button" data-stump-action="deselect">선택 해제</button></div>';
}

export function stumpDetailHead(runtime, item) {
    const note = item.color ? ` <small>${(0, runtime.deps._t)('품질 {round}%', { round: Math.round(item.roll * 100) })}</small>` : '';
    return `<div class="stump-detail-head" style="--stump-tone:${itemTone(runtime, item)}">${stumpIcon(runtime, item)}`
        + `<div><strong>${escStump(runtime, runtime.deps.stumpBox.label(item))}</strong>${note}${runtime.deps.stumpRipeningUi.badgesHtml(item)}</div></div>`;
}

export function stumpGrowthHtml(runtime, item) {
    const growth = stumpGrowthText(runtime, item);
    return growth ? `<p class="stump-growth">${escStump(runtime, growth)}</p>${stumpBar(runtime, item, true)}` : '';
}

/** A seed's yield, extra lines and status: p rows in the panel, div rows in the tooltip. */
export function stumpSeedRows(runtime, item, result, cell, tooltip) {
    const gain = stumpYieldLine(runtime, item, result), status = stumpStatus(runtime, item, result, cell), tag = tooltip ? 'div' : 'p';
    const yieldClass = tooltip ? 'tooltip-line stump-tip-yield' : 'stump-yield', statusClass = tooltip ? 'tooltip-line stump-tip-status' : 'stump-status';
    return (gain ? `<${tag} class="${yieldClass}${gain.active ? '' : ' is-off'}"${gain.tone ? ` style="color:${gain.tone}"` : ''}>${escStump(runtime, gain.text)}</${tag}>` : '')
        + runtime.deps.stumpRipeningUi.extraLinesHtml(item, result, tooltip)
        + (status ? `<${tag} class="${statusClass} ${status.tone}">${escStump(runtime, status.text)}</${tag}>` : '');
}

export function stumpBodyHtml(runtime, item, result, cell) {
    if (item.family === 'talisman') return stumpGrowthHtml(runtime, item) + runtime.deps.stumpTalismanUi.detailHtml(item, cell);
    if (item.family === 'scar') return stumpGrowthHtml(runtime, item) + runtime.deps.stumpRipeningUi.scarBodyHtml(item, result, false);
    return stumpGrowthHtml(runtime, item) + stumpSeedRows(runtime, item, result, cell, false);
}

/** The selected item's (or cell's) panel; empty when nothing is selected — hovering shows the same facts. */
export function stumpDetailHtml(runtime, result) {
    const item = selectedItem(runtime);
    if (!item) return runtime.state.selectedCell === null ? '' : stumpCellDetailHtml(runtime, runtime.state.selectedCell);
    const cell = runtime.deps.game.stumpBox.board.indexOf(item.id);
    const peers = comparisonItems(runtime, item), comparison = runtime.state.compareOpen && peers.length;
    const toggle = peers.length ? `<button type="button" class="stump-compare-toggle" data-stump-action="compare" aria-expanded="${!!comparison}">${comparison ? (0, runtime.deps._t)('비교 닫기') : (0, runtime.deps._t)('같은 종류 비교 ({length})', { length: peers.length })}</button>` : '';
    return toggle + (comparison ? stumpComparisonHtml(runtime, item, peers, result) : stumpDetailHead(runtime, item) + stumpBodyHtml(runtime, item, result, cell))
        + stumpGraftHtml(runtime, cell) + runtime.deps.stumpRipeningUi.sealHtml(cell)
        + stumpActionsHtml(runtime, item, cell);
}

/** Compare like with like: growing seeds of a colour, or grown items of one colour and kind. */
export function comparisonKey(runtime, item) {
    if (item.family === 'talisman') return `talisman:${item.uniqueId || item.name}`;
    return [item.family, item.color, item.path, !!item.ancient].join(':');
}

export function comparisonItems(runtime, item) {
    const key = comparisonKey(runtime, item);
    return runtime.deps.game.stumpBox.items.filter(other => other.id !== item.id && comparisonKey(runtime, other) === key)
        .sort((a, b) => b.roll - a.roll || a.id - b.id);
}

export function comparisonLabel(runtime, item) {
    const place = runtime.deps.stumpBox.isPlaced(runtime.deps.game, item.id) ? '배치 중' : '보관함';
    const quality = item.color ? ` / ${Math.round(item.roll * 100)}%` : '';
    return `${runtime.deps.stumpBox.label(item)}${quality} / ${place}`;
}

export function comparisonCard(runtime, item, title, result, interactive = false) {
    const cell = runtime.deps.game.stumpBox.board.indexOf(item.id), place = runtime.deps.stumpBox.inNursery(runtime.deps.game, item.id) ? '생육함' : cell < 0 ? '보관함' : (0, runtime.deps._t)('{value}번 칸', { value: cell + 1 });
    const body = interactive ? stumpBodyHtml(runtime, item, result, cell) : stumpGrowthHtml(runtime, item) + stumpTipBody(runtime, item, result, cell);
    return `<section class="stump-compare-card" style="--stump-tone:${itemTone(runtime, item)}"><h4>${title} <small>${place}</small></h4>`
        + stumpDetailHead(runtime, item) + runtime.deps.statToneText.markup(body) + '</section>';
}

export function stumpComparisonHtml(runtime, item, peers, result) {
    const other = peers.find(peer => peer.id === runtime.state.comparedId) || peers[0];
    const options = peers.map((peer, index) => `<option value="${peer.id}"${peer.id === other.id ? ' selected' : ''}>${index + 1}. ${escStump(runtime, comparisonLabel(runtime, peer))}</option>`).join('');
    return `<label class="stump-compare-choice">${(0, runtime.deps._t)('비교 대상')}<select data-stump-select="comparison" aria-label="${(0, runtime.deps._t)('비교 대상')}">${options}</select></label>`
        + `<div class="stump-comparison">${comparisonCard(runtime, item, '선택한 아이템', result, true)}${comparisonCard(runtime, other, '비교 아이템', result)}</div>`;
}

export function stumpGrowthTipLine(runtime, item) {
    const growth = stumpGrowthText(runtime, item);
    return growth ? `<div class="tooltip-line stump-tip-growth">${escStump(runtime, growth)} (${stumpPercent(runtime, item)}%)</div>` : '';
}

/** The cell's own lines under an item or an empty cell: its graft rank and its seal. */
export function stumpCellTipLines(runtime, cell) {
    // 고대 씨앗 곁의 칸은 그 몫만큼 높은 단계로 보인다(효과도 그렇다, stumpBox.ancientRanks).
    const rank = cell < 0 || onNursery(runtime) ? 0 : runtime.deps.stumpBox.graftRank(runtime.deps.game.stumpBox, cell) + runtime.deps.stumpBox.ancientRanks(runtime.deps.game.stumpBox, cell);
    return (rank ? `<div class="tooltip-line stump-tip-graft">${(0, runtime.deps._t)('접붙이기 {rank}단계, +{value}%', { rank, value: rank * runtime.deps.STUMP_BOX_GRAFT.pctPerRank })}</div>` : '')
        + (isSealedCell(runtime, cell) ? '<div class="tooltip-line stump-tip-seal">봉인 칸</div>' : '');
}

export function stumpTipBody(runtime, item, result, cell) {
    if (item.family === 'talisman') return runtime.deps.stumpTalismanUi.tooltipHtml(item, cell);
    return item.family === 'scar' ? runtime.deps.stumpRipeningUi.scarBodyHtml(item, result, true) : stumpSeedRows(runtime, item, result, cell, true);
}

export function stumpItemTipHtml(runtime, item, result, cell = runtime.deps.game.stumpBox.board.indexOf(item.id)) {
    const quality = item.color ? `<div class="tooltip-line tooltip-meta-base">${(0, runtime.deps._t)('품질 {round}%{badges}', { round: Math.round(item.roll * 100), badges: runtime.deps.stumpRipeningUi.badgesHtml(item) })}</div>` : '';
    return `<div class="tooltip-title" style="color:${itemTone(runtime, item)}">${escStump(runtime, runtime.deps.stumpBox.label(item))}</div>`
        + quality + stumpGrowthTipLine(runtime, item) + stumpTipBody(runtime, item, result, cell) + stumpCellTipLines(runtime, cell);
}

export function stumpCellTipHtml(runtime, cell) {
    if (!runtime.deps.stumpBox.isOpen(runtime.deps.game, cell)) return `<div class="tooltip-title">${(0, runtime.deps._t)('닫힌 칸')}</div><div class="tooltip-line">${(0, runtime.deps._t)('루프 {opensAt}에 열립니다.', { opensAt: runtime.deps.stumpBox.opensAt(runtime.deps.game, cell) })}</div>`;
    const lines = stumpCellTipLines(runtime, cell);
    return lines ? `<div class="tooltip-title">${(0, runtime.deps._t)('빈 칸')}</div>${lines}` : '';
}

/**
* Tooltip for a hovered stump element ([data-stump-tip]): an item on the board or in storage, a closed or grafted
* cell, or a frame button. Returns null when there is nothing to show.
* @returns {{ html: string, tone: string } | null}
*/
export function tipFor(runtime, element) {
    const kind = element.dataset.stumpTip;
    if (kind === 'frame') return { html: frameTipHtml(runtime, element.dataset.side), tone: '#a98546' };
    const id = element.dataset.stumpDrag !== undefined ? Number(element.dataset.stumpDrag) : null;
    const item = id === null ? null : runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (item) return { html: stumpItemTipHtml(runtime, item, runtime.deps.stumpBox.evaluate(runtime.deps.game)), tone: itemTone(runtime, item) };
    if (kind !== 'cell') return null;
    const html = stumpCellTipHtml(runtime, Number(element.dataset.stumpDropCell));
    return html ? { html, tone: '#8a7a5c' } : null;
}

/** Result snapshots use their own item fields, without today's board bonuses or a reused item ID. */
export function itemTipHtml(runtime, item, storedSnapshot = false) {
    if (!storedSnapshot) return stumpItemTipHtml(runtime, item, runtime.deps.stumpBox.evaluate(runtime.deps.game));
    const state = { ...runtime.deps.game, stumpBox: { ...runtime.deps.game.stumpBox, board: runtime.deps.game.stumpBox.board.map(() => null) } };
    return stumpItemTipHtml(runtime, item, runtime.deps.stumpBox.evaluate(state), -1);
}
