export function esc(runtime, text) { return (0, runtime.deps.escapeHTML)(String(text)); }

export function tone(runtime, color) { return runtime.deps.STUMP_BOX_COLORS[color].tone; }

export function journalCell(runtime, row, color, grown) {
    const key = `${row}-${color}`, on = grown.has(key), name = `${runtime.deps.STUMP_BOX_COLORS[color].label} ${rowLabel(runtime, row)}`;
    return `<span class="stump-harvest-cell${on ? ' is-on' : ''}" style="--stump-tone:${tone(runtime, color)}" data-tip="${esc(runtime, on ? name : (0, runtime.deps._t)('{name} (미수확)', { name }))}">`
        + `<img src="assets/items/stump-pixel-v1/${key}.png" alt="${esc(runtime, name)}" draggable="false"></span>`;
}

export function journalRow(runtime, row, grown) {
    return `<div class="stump-harvest-row"><span>${rowLabel(runtime, row)}</span>${runtime.state.COLORS.map(color => journalCell(runtime, row, color, grown)).join('')}</div>`;
}

/** Where an unlock comes from. A hidden journal page keeps its name until it is found. */
export function unlockWhen(runtime, row, open) {
    const when = row.when;
    if (when.harvestRows) return (0, runtime.deps._t)('수확 일지 {harvestRows}줄', { harvestRows: when.harvestRows });
    if (when.harvestCells) return (0, runtime.deps._t)('수확 일지 {harvestCells}칸', { harvestCells: when.harvestCells });
    if (when.harvestRow) return (0, runtime.deps._t)('수확 일지 {harvestRow} 줄', { harvestRow: rowLabel(runtime, when.harvestRow) });
    if (when.content) return '해금 탭';
    if (when.loop) return (0, runtime.deps._t)('루프 {loop}', { loop: when.loop });
    const page = runtime.deps.JOURNAL_DB[when.journal];
    return open || !page.hidden ? (0, runtime.deps._t)("저널 '{title}'", { title: page.title }) : '숨은 저널';
}

/** One 함 해금 row: condition on the left, reward on the right (2026-10-09 사용자), open rows lit with a check mark. */
export function unlockRow(runtime, row, open) {
    return `<li class="${open ? 'is-on' : ''}"><span class="stump-unlock-mark" aria-label="${open ? (0, runtime.deps._t)('열림') : (0, runtime.deps._t)('잠김')}"></span>`
        + `<span class="stump-unlock-when">${esc(runtime, unlockWhen(runtime, row, open))}</span><span class="stump-unlock-arrow" aria-hidden="true">→</span>`
        + `<strong class="stump-unlock-reward">${esc(runtime, (0, runtime.deps._t)(row.label))}</strong></li>`;
}

export function unlocksHtml(runtime) {
    const open = new Set(runtime.deps.stumpBox.openUnlocks(runtime.deps.game).map(row => row.id));
    return '<div class="stump-unlocks-head" aria-hidden="true"><span>조건</span><span>보상</span></div>'
        + `<ul class="stump-unlocks">${runtime.deps.STUMP_BOX_UNLOCKS.map(row => unlockRow(runtime, row, open.has(row.id))).join('')}</ul>`;
}

/** The 수확 일지 tab: 4 rows × 5 colours (grown ones lit; the count is on the tab) and what a full row gives. */
export function journalHtml(runtime) {
    const grown = new Set(runtime.deps.game.stumpBox.harvest.grown);
    return `<div class="stump-harvest-grid">${runtime.state.ROWS.map(row => journalRow(runtime, row, grown)).join('')}</div>`
        + '<p class="stump-hint">한 줄을 채우면 보상을 받습니다.</p>';
}

/** One cell; with the frame on the cube, a stack with currency is a button that puts one unit in. */
export function walletCell(runtime, row, color, canPut) {
    const key = `${row}-${color}`, name = `${runtime.deps.STUMP_BOX_COLORS[color].label} ${rowLabel(runtime, row)}`, { real, wallet } = runtime.deps.stumpBox.harvestHoldings(runtime.deps.game, key);
    const button = canPut && wallet > 0, tag = button ? 'button' : 'span', attrs = button ? ` type="button" data-stump-action="wallet-put" data-key="${key}"` : '';
    return `<${tag} class="stump-harvest-cell stump-wallet-cell${real + wallet ? ' is-on' : ''}"${attrs} style="--stump-tone:${tone(runtime, color)}" data-tip="${esc(runtime, (0, runtime.deps._t)('{name} {real}+{wallet} (실제 아이템+화폐화)', { name, real, wallet }))}">`
        + `<img src="assets/items/stump-pixel-v1/${key}.png" alt="${esc(runtime, name)}" draggable="false"><b>${real + wallet}</b></${tag}>`;
}

export function walletHtml(runtime, canPut) {
    return `<div class="stump-harvest-grid stump-wallet-grid">${runtime.state.ROWS.map(row => `<div class="stump-harvest-row"><span>${rowLabel(runtime, row)}</span>`
            + `${runtime.state.COLORS.map(color => walletCell(runtime, row, color, canPut)).join('')}</div>`).join('')}</div>`;
}

export function pendingRewardCount(runtime) { return runtime.deps.stumpBox.pendingGifts(runtime.deps.game).length + runtime.deps.stumpBox.pendingPouches(runtime.deps.game).length; }

/** The head's one button (gold while something waits); '' when nothing does. */
export function rewardButtonHtml(runtime) {
    const count = pendingRewardCount(runtime);
    return count ? `<button type="button" class="stump-reward-button" data-stump-action="rewards">${(0, runtime.deps._t)('받을 보상 {count}', { count })}</button>` : '';
}

/** A choice of one seed ('화염 씨앗'): what it grows into is rolled when it ripens. */
export function rewardChoice(runtime, attrs, color, note) {
    return `<button type="button" class="stump-reward-choice" ${attrs} style="--stump-tone:${tone(runtime, color)}">`
        + `<img src="assets/items/stump-pixel-v1/seed-${color}.png" alt="" draggable="false"><span>${esc(runtime, (0, runtime.deps._t)('{label} 씨앗', { label: runtime.deps.STUMP_BOX_COLORS[color].label }))}</span><small>${note}</small></button>`;
}

export function giftSection(runtime, row) {
    const quality = (0, runtime.deps._t)('품질 {round}%', { round: Math.round(runtime.deps.STUMP_BOX_HARVEST.giftRoll * 100) });
    const choices = runtime.state.COLORS.map(color => rewardChoice(runtime, `data-reward-gift="${row}" data-color="${color}"`, color, quality)).join('');
    return `<section class="stump-reward"><h4>${(0, runtime.deps._t)('{row} 줄 완성 보상', { row: rowLabel(runtime, row) })}</h4>`
        + `<p>${(0, runtime.deps._t)('수확 일지의 {row} {length}색을 모두 성장 완료한 보상입니다. 색을 하나 고르세요.', { row: rowLabel(runtime, row), length: runtime.state.COLORS.length })}</p>`
        + `<div class="stump-reward-choices">${choices}</div></section>`;
}

/** Why a seed pouch came: the journal page of its unlock row. */
export function pouchReason(runtime, id) {
    const row = runtime.deps.STUMP_BOX_UNLOCKS.find(entry => entry.id === id), page = row && runtime.deps.JOURNAL_DB[row.when.journal];
    return page ? (0, runtime.deps._t)("저널 '{title}' 획득 보상입니다.", { title: page.title }) : '저널 획득 보상입니다.';
}

export function pouchSection(runtime, id) {
    const choices = runtime.deps.stumpBox.pouchOffers(runtime.deps.game, id).map((offer, index) => rewardChoice(runtime, `data-reward-pouch="${esc(runtime, id)}" data-index="${index}"`,
            offer.color, (0, runtime.deps._t)('품질 {round}%', { round: Math.round(offer.roll * 100) }))).join('');
    return `<section class="stump-reward"><h4>${(0, runtime.deps._t)('씨앗 주머니')}</h4><p>${(0, runtime.deps._t)('{id} 3개 중 1개를 고르세요.', { id: esc(runtime, pouchReason(runtime, id)) })}</p>`
        + `<div class="stump-reward-choices is-three">${choices}</div></section>`;
}

export function rewardsBody(runtime) {
    const sections = runtime.deps.stumpBox.pendingGifts(runtime.deps.game).map(runtime.handlers.giftSection).concat(runtime.deps.stumpBox.pendingPouches(runtime.deps.game).map(runtime.handlers.pouchSection));
    return sections.join('') || '<p class="selection-overlay-help">받을 보상이 없습니다.</p>';
}

export function rowLabel(runtime, row) { return runtime.deps.STUMP_BOX_STAGES[row].label; }
