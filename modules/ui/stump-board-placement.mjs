import { escStump, itemTone } from './stump-board-summary.mjs';

/** Compare only changed board effects. Both evaluators receive a copied board, never a temporarily edited game. */
export function placementEffects(runtime, state) {
    const seeds = runtime.deps.stumpBox.evaluate(state), talismans = runtime.deps.talismanEffects.summarize(state);
    const stats = { ...seeds.stats }, conditions = {};
    Object.entries(talismans.stats).forEach(([key, value]) => { stats[key] = (stats[key] || 0) + value; });
    // The combat contract takes the strongest copy of each conditional effect, not their sum.
    talismans.conditions.forEach(line => { conditions[line.id] = Math.max(conditions[line.id] || 0, line.value); });
    return { stats, conditions, board: state.stumpBox.board, groups: seeds.groups, suppressed: new Set([...seeds.suppressed, ...talismans.suppressed]),
        boss: talismans.bossFinalDmgBonusPct };
}

export function placementItemNames(runtime, ids) {
    return ids.map(id => runtime.deps.stumpBox.itemById(runtime.deps.game, id)).filter(Boolean).map(runtime.deps.stumpBox.shortName).join(', ');
}

export function placementStatusRows(runtime, before, after) {
    const rows = [], disabled = [...after.suppressed].filter(id => !before.suppressed.has(id));
    const enabled = [...before.suppressed].filter(id => after.board.includes(id) && !after.suppressed.has(id));
    if (disabled.length) rows.push(`<li class="is-bad">비활성화: ${escStump(runtime, placementItemNames(runtime, disabled))}</li>`);
    if (enabled.length) rows.push(`<li class="is-good">비활성화 해제: ${escStump(runtime, placementItemNames(runtime, enabled))}</li>`);
    [['resonance', '줄'], ['discipline', '줄'], ['feed', '쌍']].forEach(([key, unit]) => {
        const from = before.groups[key].length, to = after.groups[key].length;
        if (from !== to) rows.push(`<li class="${to > from ? 'is-good' : 'is-bad'}">${runtime.deps.STUMP_BOX_SYNERGY[key].label}: ${from}${unit} → ${to}${unit}</li>`);
    });
    return rows;
}

export function placementValueRows(runtime, before, after, describe) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => {
        const from = Math.round((before[key] || 0) * 100) / 100, to = Math.round((after[key] || 0) * 100) / 100;
        if (from === to) return [];
        return [`<li><span class="stump-placement-before">${runtime.deps.statToneText.html(describe(key, from))}</span> → <strong>${runtime.deps.statToneText.html(describe(key, to))}</strong></li>`];
    });
}

export function placementRows(runtime, preview) {
    const before = placementEffects(runtime, runtime.deps.game), after = placementEffects(runtime, preview);
    const rows = placementStatusRows(runtime, before, after);
    rows.push(...placementValueRows(runtime, before.stats, after.stats, (id, value) => runtime.deps.stumpBox.lineText(id, value).replace(/\+-/g, '−')));
    rows.push(...placementValueRows(runtime, before.conditions, after.conditions,
            (id, value) => runtime.deps.talismans.describeLine({ kind: 'condition', id, value })));
    if (before.boss !== after.boss) rows.push(`<li>보스 최종 피해: ${before.boss}% → <strong>${after.boss}%</strong></li>`);
    return { rows, disabled: [...after.suppressed].filter(id => !before.suppressed.has(id)),
        enabled: [...before.suppressed].filter(id => after.board.includes(id) && !after.suppressed.has(id)) };
}

export function clearPlacementMarks(runtime) {
    runtime.deps.document.querySelectorAll('#stump-box-board .is-preview-target, #stump-box-board .is-preview-off, #stump-box-board .is-preview-on')
        .forEach(node => node.classList.remove('is-preview-target', 'is-preview-off', 'is-preview-on'));
}

export function markPlacement(runtime, result) {
    clearPlacementMarks(runtime);
    runtime.deps.document.querySelectorAll('#stump-box-board [data-stump-drop-cell]').forEach(node => {
        const cell = Number(node.dataset.stumpDropCell), id = result.board[cell];
        node.classList.toggle('is-preview-target', cell === runtime.state.placement.cell);
        node.classList.toggle('is-preview-off', result.disabled.includes(id));
        node.classList.toggle('is-preview-on', result.enabled.includes(id));
    });
}

/** @returns {boolean} whether a mouse-hover preview (a tooltip) was cleared. */
export function clearPlacementPreview(runtime, transientOnly = false) {
    if (transientOnly && runtime.state.placement?.pinned) return false;
    const hovered = !!runtime.state.placement?.hover;
    runtime.state.placement = null;
    runtime.state.placementKey = '';
    clearPlacementMarks(runtime);
    const node = runtime.deps.document.getElementById('stump-placement-preview');
    if (node) { node.hidden = true; node.replaceChildren(); }
    return hovered;
}

/** Pointer movement updates this small region only; replacing the board would interrupt an active drag. */
export function renderPlacementPreview(runtime) {
    const node = runtime.deps.document.getElementById('stump-placement-preview');
    if (!runtime.state.placement || !node) return;
    const key = JSON.stringify([runtime.deps.game.stumpBox, !!runtime.deps.game.woodsmanBuildLock, runtime.state.placement.id, runtime.state.placement.cell, runtime.state.placement.pinned]);
    if (key !== runtime.state.placementKey) {
        const preview = runtime.deps.stumpBox.previewMove(runtime.deps.game, runtime.state.placement.id, runtime.state.placement.cell);
        if (!preview) return clearPlacementPreview(runtime);
        const result = placementRows(runtime, preview);
        runtime.state.placement.result = { ...result, board: preview.stumpBox.board };
        runtime.state.placement.effectKey = JSON.stringify([runtime.deps.game.stumpBox.board, result.rows, preview.stumpBox.board]);
        runtime.state.placementKey = key;
    }
    markPlacement(runtime, runtime.state.placement.result);
    // A mouse hover and a drag show it as the tooltip at the pointer (2026-11-03 사용자: 탭 대신 호버 툴팁, 2026-11-04: 끌어 바꿀 때도);
    // a pinned touch or a keyboard focus keeps the box under the board.
    if (runtime.state.placement.hover) { node.hidden = true; return; }
    const { title, verb, rows } = placementParts(runtime);
    const buttons = runtime.state.placement.pinned ? `<div class="stump-actions"><button type="button" data-stump-action="placement-apply">${verb}</button>`
        + '<button type="button" data-stump-action="placement-cancel">취소</button></div>' : '';
    const html = `<strong>${escStump(runtime, title)}</strong><span class="stump-placement-label">${(0, runtime.deps._t)('{verb} 미리보기', { verb })}</span>` + rows + buttons;
    if (node.__previewHtml !== html || node.hidden) { node.innerHTML = html; node.__previewHtml = html; }
    node.hidden = false;
}

/** The preview's title (the item and the cell), its verb and its rows, shared by the box and the hover tooltip. */
export function placementParts(runtime) {
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.state.placement.id), occupant = runtime.deps.game.stumpBox.board[runtime.state.placement.cell];
    const title = (0, runtime.deps._t)('{shortName}, {value}행 {value2}열', { shortName: runtime.deps.stumpBox.shortName(item), value: Math.floor(runtime.state.placement.cell / runtime.deps.STUMP_BOX_SIZE) + 1, value2: runtime.state.placement.cell % runtime.deps.STUMP_BOX_SIZE + 1 });
    const rows = runtime.state.placement.result.rows.length ? `<ul>${runtime.state.placement.result.rows.join('')}</ul>` : '<p>효과 변화 없음</p>';
    return { title, verb: occupant === null ? '배치' : '자리 바꾸기', rows };
}

export function placementTipHtml(runtime) {
    const { title, verb, rows } = placementParts(runtime), item = runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.state.placement.id);
    return `<div class="tooltip-title" style="color:${itemTone(runtime, item)}">${escStump(runtime, title)}</div>`
        + `<div class="tooltip-line stump-placement-label">${(0, runtime.deps._t)('{verb} 미리보기', { verb })}</div><div class="stump-placement-tip">${rows}</div>`;
}

/** The hover or drag preview as a tooltip, or null when there is none (or it is pinned in the box). */
export function placementTip(runtime) {
    return runtime.state.placement?.hover && runtime.state.placement.result ? { html: placementTipHtml(runtime), tone: itemTone(runtime, runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.state.placement.id)) } : null;
}

export function previewBoardCell(runtime, id, cell, pinned, hover) {
    if (runtime.state.placement) {
        if (runtime.state.placement.pinned && !pinned) return;
        if (runtime.state.placement.id === id && runtime.state.placement.cell === cell && runtime.state.placement.pinned === pinned && runtime.state.placement.hover === hover) return;
    }
    runtime.state.placement = { id, cell, pinned, hover };
    runtime.state.placementKey = '';
    renderPlacementPreview(runtime);
    if (!pinned) return;
    (0, runtime.deps.hideInfoTooltip)();
    const node = runtime.deps.document.getElementById('stump-placement-preview');
    if (node) node.scrollIntoView({ block: 'nearest' });
    refreshStumpTutorial(runtime);
}

export function cancelPlacement(runtime) {
    clearPlacementPreview(runtime);
    refreshStumpTutorial(runtime);
}

/** The planting guide moves with the screen: stored seed, then an empty cell, then the pinned preview's [배치]. */
export function refreshStumpTutorial(runtime) {
    if (runtime.deps.tutorialActionUi.active) runtime.deps.tutorialActionUi.refresh();
}
