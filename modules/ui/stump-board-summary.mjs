export function escStump(runtime, text) { return (0, runtime.deps.escapeHTML)(String(text)); }

export function stumpTone(runtime, color) { return runtime.deps.STUMP_BOX_COLORS[color].tone; }

export function itemTone(runtime, item) {
    if (item.albino) return runtime.deps.STUMP_BOX_RIPENING.albino.tone;
    if (item.family === 'talisman') return runtime.deps.stumpTalismanUi.tone(item);
    return item.family === 'scar' ? runtime.deps.STUMP_BOX_SCAR.tone : stumpTone(runtime, item.color);
}

export function isSealedCell(runtime, cell) { return cell >= 0 && !onNursery(runtime) && runtime.deps.stumpBox.isSealed(runtime.deps.game.stumpBox, cell); }

export function stumpPercent(runtime, item) { return Math.min(100, Math.round(item.xp / runtime.deps.stumpBox.need(item) * 100)); }

export function stumpNumber(runtime, value) { return String(Math.round(value * 10) / 10); }

export function stumpBar(runtime, item, wide) {
    return `<span class="stump-bar${wide ? ' is-wide' : ''}"><i style="width:${stumpPercent(runtime, item)}%"></i></span>`;
}

export function stumpIcon(runtime, item) { return `<img src="${runtime.deps.stumpBox.iconPath(item)}" alt="" draggable="false">`; }

export function selectedItem(runtime) { return runtime.state.selectedId === null ? null : runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.state.selectedId); }

export function stumpItemClasses(runtime, item, result) {
    const out = ['is-filled', `is-${item.family}`], suppressed = result.suppressed.has(item.id);
    if (item.id === runtime.state.selectedId) out.push('is-selected');
    if (suppressed) out.push('is-suppressed');
    if (runtime.deps.stumpBox.isMature(item)) out.push('is-ripe');
    if (runtime.deps.stumpRipeningUi.isGolden(item)) out.push('is-golden');
    if (item.albino) out.push('is-albino');
    if (item.locked) out.push('is-item-locked');
    if (!suppressed && runtime.deps.stumpBox.isMature(item) && result.synergy[item.id]) out.push('is-boosted');
    return out;
}

export function stumpGraftLabel(runtime, cell) {
    const rank = cellGraftRank(runtime, cell);
    return rank ? (0, runtime.deps._t)(', 접붙이기 {rank}단계(+{value}%)', { rank, value: rank * runtime.deps.STUMP_BOX_GRAFT.pctPerRank }) : '';
}

export function stumpCellLabel(runtime, cell, item, open) {
    if (!open) return (0, runtime.deps._t)('닫힌 칸, 루프 {opensAt}에 열림', { opensAt: runtime.deps.stumpBox.opensAt(runtime.deps.game, cell) });
    return (item ? runtime.deps.stumpBox.label(item) : '빈 칸') + stumpGraftLabel(runtime, cell) + (isSealedCell(runtime, cell) ? ', 봉인 칸' : '');
}

/** While an item is picked, every open cell but its own is a target: empty ones take it, filled ones trade places. */
export function stumpTargetClass(runtime, item, open) {
    if (runtime.state.selectedId === null || !open || (item && item.id === runtime.state.selectedId)) return null;
    return item ? 'is-swap' : 'is-target';
}

export function stumpCellClasses(runtime, item, open, result, cell) {
    const classes = ['stump-cell', open ? 'is-open' : 'is-locked'].concat(item ? stumpItemClasses(runtime, item, result) : []);
    const target = stumpTargetClass(runtime, item, open);
    if (target) classes.push(target);
    if (!item && cell === runtime.state.selectedCell) classes.push('is-selected');
    if (isSealedCell(runtime, cell)) classes.push('is-sealed');
    return classes;
}

/** The graft rank (top left) and the seal (bottom right). */
export function stumpCellMarks(runtime, cell) {
    const rank = cellGraftRank(runtime, cell);
    return (rank ? `<span class="stump-graft-mark" aria-hidden="true">${rank}</span>` : '')
        + (isSealedCell(runtime, cell) ? '<span class="stump-seal-mark" aria-hidden="true"></span>' : '');
}

/** A summed stat in the box's own words (main lines, extra lines and a scar's lines share them). */
export function stumpStatText(runtime, stat, value) { return runtime.deps.stumpBox.lineText(stat, value); }

/** The nursery's line above the frame: what it gives instead of the colours. */
export function nurseryHeadHtml(runtime) {
    return `<span class="stump-nursery-rate">${(0, runtime.deps._t)('생육함 경험치 효율 {round}%', { round: Math.round(runtime.deps.stumpBox.nurseryRate(runtime.deps.game) * 100) })}</span><span class="stump-line">${(0, runtime.deps._t)('칸 {openCount}/25', { openCount: runtime.deps.stumpBox.openCount(runtime.deps.game) })}</span>`
        + `<button type="button" data-stump-action="unplace-all"${runtime.deps.game.stumpBox.nursery.some(id => id !== null) ? '' : ' disabled'}>${(0, runtime.deps._t)('전체 해제')}</button>${runtime.state.RULES_BUTTON}`;
}

export function stumpHeadHtml(runtime, result) {
    if (onNursery(runtime)) return nurseryHeadHtml(runtime);
    const chips = runtime.state.COLORS.map(color => {
        const on = result.resonant.has(color);
        return `<span class="stump-chip${on ? ' is-on' : ''}" style="--stump-tone:${stumpTone(runtime, color)}">${(0, runtime.deps._t)(runtime.deps.STUMP_BOX_COLORS[color].label)} ${result.counts[color]}${on ? (0, runtime.deps._t)(' 공명') : ''}</span>`;
    }).join('');
    const notes = [(0, runtime.deps._t)('칸 {openCount}/25', { openCount: runtime.deps.stumpBox.openCount(runtime.deps.game) }), result.suppressed.size ? `<span class="is-bad">${(0, runtime.deps._t)('비활성 {size}', { size: result.suppressed.size })}</span>` : '',
        runtime.deps.stumpBox.graftOpen(runtime.deps.game) ? `<span class="is-graft">${(0, runtime.deps._t)('접붙이기 {free}', { free: runtime.deps.stumpBox.graftPoints(runtime.deps.game).free })}</span>` : ''].filter(Boolean);
    return `<div class="stump-chips">${chips}</div><span class="stump-line">${notes.join(', ')}</span>`
        + runtime.deps.stumpHarvestUi.rewardButtonHtml()
        + (runtime.state.frameView === 'box' ? `<button type="button" data-stump-action="unplace-all"${runtime.deps.game.stumpBox.board.some(id => id !== null) ? '' : ' disabled'}>${(0, runtime.deps._t)('전체 해제')}</button>` : '')
        + `<button type="button" data-stump-action="placement-undo"${runtime.deps.stumpBox.canUndoPlacement(runtime.deps.game) ? '' : ' disabled'}>${(0, runtime.deps._t)('배치 되돌리기')}</button>${runtime.state.RULES_BUTTON}`;
}

/** 옵션 합계 under the board: what the working items add up to, each line in its stat's colour (the item affix colours, 2026-10-06).
* Folded to one line until pressed (2026-10-25 사용자: 접을 수 있게, 기본 화면에 스크롤 없게). */
export function stumpSummaryHtml(runtime, result) {
    const keys = Object.keys(result.stats);
    const head = `<button type="button" class="stump-fold" data-stump-action="summary" aria-expanded="${runtime.state.summaryOpen}">`
        + `<span>${(0, runtime.deps._t)('옵션 합계')}</span><small>${keys.length ? (0, runtime.deps._t)('{length}줄', { length: keys.length }) : (0, runtime.deps._t)('아직 없음')}</small></button>`;
    if (!runtime.state.summaryOpen) return head;
    const stats = keys.map(stat => `<li style="color:${(0, runtime.deps.getItemStatToneColor)(stat)}">${escStump(runtime, stumpStatText(runtime, stat, result.stats[stat]))}</li>`).join('');
    return head + `<ul class="stump-stats">${stats || (0, runtime.deps._t)('<li class="is-empty">아직 없음</li>')}</ul>` + runtime.deps.stumpTalismanUi.summaryHtml();
}

/** 루프가 바뀔 때(2026-11-04 사용자): 봉인 칸 밖의 아이템은 판, 보관함, 생육함 모두 사라진다. */
export function stumpLoopRule() {
    return '루프가 바뀌면 봉인 칸에 있는 아이템을 빼고 그루터기 함, 보관함, 생육함의 아이템이 모두 사라집니다.';
}

/** The ? window's rules: only what a player needs to play the board (2026-10-09 사용자: 꼭 필요한 정보만, 용어는 그루터기 아이템, 경험치,
* 성장 완료, 비활성화로 통일하고 "것" 같은 지칭은 쓰지 않는다). */
export function stumpRulesHtml(runtime) {
    const { resonance, feed, discipline } = runtime.deps.STUMP_BOX_SYNERGY;
    const rules = ['그루터기 함에 있는 그루터기 아이템만 처치 시 경험치를 얻습니다.',
        (0, runtime.deps._t)('공명: 성장 완료된 같은 색 {length}개가 가로나 세로로 한 줄이면 그 {length2}개 +{bonusPct}%. 옆에 같은 색이 하나라도 더 있으면 사라집니다.', { length: resonance.length, length2: resonance.length, bonusPct: resonance.bonusPct }),
        '반극: 공명 중인 아이템은 비활성화되지 않고, 옆에서 그 색을 비활성화하는 아이템이 대신 비활성화됩니다.',
        '비활성화: 물리는 카오스를, 카오스는 냉기를, 냉기는 화염을, 화염은 번개를, 번개는 물리를 비활성화합니다.',
        (0, runtime.deps._t)('상생: 화염은 물리, 카오스는 화염, 번개는 카오스, 냉기는 번개, 물리는 냉기가 옆에 있으면 비활성화되지 않고, 둘 다 +{bonusPct}%', { bonusPct: feed.bonusPct }),
        (0, runtime.deps._t)('규율: 다섯 색이 가로나 세로 한 줄을 채우면 그 5개 +{bonusPct}%. 가로줄은 위아래, 세로줄은 양옆에 같은 색이 있으면 사라집니다.', { bonusPct: discipline.bonusPct }),
        '거름: 보관함의 씨앗을 소모해 그루터기 함에서 성장 중인 그루터기 아이템의 경험치를 올립니다.',
        stumpLoopRule(runtime)];
    if (runtime.deps.stumpBox.graftOpen(runtime.deps.game)) rules.push(`접붙이기: 단계마다 그 칸의 효과 +${runtime.deps.STUMP_BOX_GRAFT.pctPerRank}%`);
    rules.push(...runtime.deps.stumpRipeningUi.rulesLines());
    return '<div class="stump-rules-tip">' + rules.map(runtime.handlers.stumpRuleLineHtml).join('') + '</div>';
}

/** One rule in colour (2026-10-29 사용자: ? 도움말에 색감): the name before ':' in gold, stump words (화염, 씨앗, 덩굴, 뿌리...) in their
* own colours as in the recipe book, then the game's stat words and numbers (경험치, +25%) as everywhere else. */
export function stumpRuleLineHtml(runtime, rule) {
    const at = rule.indexOf(': '), head = at > 0 ? rule.slice(0, at) : '', body = at > 0 ? rule.slice(at + 2) : rule;
    const lead = head ? `<span class="stump-rules-head">${escStump(runtime, head)}</span>: ` : '';
    return `<div class="tooltip-line">${lead}${runtime.deps.statToneText.markup(runtime.deps.stumpCubeUi.recipeToneHtml(body))}</div>`;
}

export function stumpGraftButton(runtime, action, cell, label, reason) {
    return `<button type="button" data-stump-action="${action}" data-cell="${cell}"${reason ? ' disabled' : ''}>${label}</button>`;
}

/** The graft panel for a board cell (the selected item's cell or a selected empty cell); '' before grafting opens. */
export function stumpGraftHtml(runtime, cell) {
    if (cell < 0 || !runtime.deps.stumpBox.graftOpen(runtime.deps.game)) return '';
    const rank = runtime.deps.stumpBox.graftRank(runtime.deps.game.stumpBox, cell), max = runtime.deps.stumpBox.graftMaxRank(runtime.deps.game), free = runtime.deps.stumpBox.graftPoints(runtime.deps.game).free;
    const raiseReason = rank < max ? runtime.deps.stumpBox.graftRaiseReason(runtime.deps.game, cell) : '';
    const raise = rank < max ? stumpGraftButton(runtime, 'graft-raise', cell, (0, runtime.deps._t)('접붙이기 ({value}점)', { value: rank + 1 }), raiseReason) : '';
    const lower = rank > 0 ? stumpGraftButton(runtime, 'graft-lower', cell, (0, runtime.deps._t)('되돌리기 (마름병 포자 {refundSpores})', { refundSpores: runtime.deps.STUMP_BOX_GRAFT.refundSpores }),
        runtime.deps.stumpBox.graftLowerReason(runtime.deps.game, cell)) : '';
    // 0단계면 효과(+0%)는 빼고, '남은 점수 9'는 한 줄에(숫자만 다음 줄로 떨어졌다 — 검토 4차)
    const effect = rank ? (0, runtime.deps._t)(', 효과 +{value}%', { value: rank * runtime.deps.STUMP_BOX_GRAFT.pctPerRank }) : '';
    return `<div class="stump-graft"><p class="stump-line"><strong>${(0, runtime.deps._t)('접붙이기 {rank}/{max}단계', { rank, max })}</strong>${(0, runtime.deps._t)('{effect}, 남은 점수 {free}', { effect, free })}</p>`
        + `${raiseReason ? `<p class="stump-hint">${escStump(runtime, raiseReason)}</p>` : ''}<div class="stump-actions">${raise}${lower}</div></div>`;
}

export function stumpMoreTabs(runtime) {
    const total = runtime.deps.STUMP_BOX_HARVEST.rows.length * runtime.state.COLORS.length;
    const tabs = [['harvest', (0, runtime.deps._t)('수확 일지 {length}/{total}', { length: runtime.deps.game.stumpBox.harvest.grown.length, total })],
        ['unlocks', (0, runtime.deps._t)('함 해금 {length}/{length2}', { length: runtime.deps.stumpBox.openUnlocks(runtime.deps.game).length, length2: runtime.deps.STUMP_BOX_UNLOCKS.length })], ['wallet', (0, runtime.deps._t)('재화')]];
    return runtime.deps.contentProgression.isUnlocked('talisman') ? tabs.concat([['talisman', (0, runtime.deps._t)('부적')]]) : tabs;
}

/** The tab row alone until one is pressed; pressing the open tab folds it again (2026-10-25: no scroll on the first view). */
export function stumpMoreHtml(runtime) {
    const tabs = stumpMoreTabs(runtime);
    if (!tabs.some(([id]) => id === runtime.state.moreTab)) runtime.state.moreTab = tabs[0][0];
    const buttons = tabs.map(([id, label]) => {
        const on = runtime.state.moreOpen && id === runtime.state.moreTab;
        return `<button type="button" role="tab" class="stump-more-tab${on ? ' is-on' : ''}" data-stump-action="more-tab" data-tab="${id}"`
            + ` aria-selected="${on}" aria-expanded="${on}">${label}</button>`;
    }).join('');
    return `<div class="stump-more-tabs" role="tablist">${buttons}</div>`
        + (runtime.state.moreOpen ? `<div class="stump-more-body" role="tabpanel">${runtime.state.STUMP_MORE_BODIES[runtime.state.moreTab]()}</div>` : '');
}

export function onNursery(runtime) { return runtime.state.frameView === 'nursery'; }

export function shownCells(runtime) { return onNursery(runtime) ? runtime.deps.game.stumpBox.nursery : runtime.deps.game.stumpBox.board; }

export function cellGraftRank(runtime, cell) { return onNursery(runtime) ? 0 : runtime.deps.stumpBox.graftRank(runtime.deps.game.stumpBox, cell); }

export function stumpItemName(runtime, item) { return runtime.deps.stumpBox.shortName(item); }
