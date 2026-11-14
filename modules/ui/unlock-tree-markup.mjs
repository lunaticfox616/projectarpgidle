import { gainOf, upgradeEffect, cardGain, view_cardName } from './unlock-tree-labels.mjs';

export function stateOf(runtime, def) {
    const status = runtime.deps.contentProgression.status(def.id);
    if (status.unlocked) return 'owned';
    if (status.available) return 'ready';
    if (!view_parentsOpen(runtime, def)) return 'far';
    return runtime.deps.contentProgression.requirements(def.id).every(row => row.met) ? 'short' : 'soon';
}

export function readyRows(runtime) {
    return runtime.state.unlockBoard.rows.filter(def => runtime.deps.contentProgression.kind(def) === 'paid' && runtime.deps.contentProgression.status(def.id).available);
}

export function tipOf(runtime, def, step) {
    const lines = step ? [`${(0, runtime.deps._t)(def.name)}, ${def.cost}P`, gainOf(runtime, def), (0, runtime.deps._t)(def.description)] : [gainOf(runtime, def), (0, runtime.deps._t)(def.description)];
    return (0, runtime.deps.escapeHTML)(lines.filter(Boolean).join('\n'));
}

export function nodeClass(runtime, def, state, marks) {
    const lit = marks.lit.has(def.id) ? ' is-lit' : '', fresh = marks.fresh.has(def.id) ? ' is-fresh' : '', chosen = runtime.state.view_selectedId === def.id ? ' is-chosen' : '';
    const plan = runtime.state.view_plannedPath.has(def.id) ? ' is-planned' : '', goal = runtime.deps.game.contentProgression.plannedUnlockId === def.id ? ' is-goal' : '';
    return `fam-${runtime.state.unlockBoard.familyOf(def)} kind-${runtime.deps.contentProgression.kind(def)} is-${state}${lit}${fresh}${chosen}${plan}${goal}${marks.unseen.has(def.id) ? ' is-unseen' : ''}`;
}

export function unseenIds(runtime) {
    const seen = new Set(runtime.deps.game.seenUnlocks || []);
    return new Set(runtime.state.unlockBoard.rows.filter(def => !seen.has(def.id) && runtime.state.UNLOCK_UNSEEN_STATES.has(stateOf(runtime, def))).map(def => def.id));
}

export function nodeHtml(runtime, def, L, marks) {
    const at = L.pos.get(def.id), state = stateOf(runtime, def), style = `left:${at.left}px;top:${at.top}px;width:${at.w}px;height:${at.h}px`, name = (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(def.name));
    if (at.step) return `<button type="button" class="unlock-pip ${nodeClass(runtime, def, state, marks)}" data-unlock-select="${def.id}" data-tip="${tipOf(runtime, def, true)}" aria-label="${name}" style="${style}">${(0, runtime.deps.escapeHTML)(upgradeEffect(runtime, def.series, def.rank))}${view_unseenHtml(runtime, def, marks)}</button>`;
    const chip = state !== 'owned' && def.cost ? `<small class="unlock-chip">${def.cost}P</small>` : '';
    const second = L.cardH >= runtime.state.UNLOCK_BOARD_SIZE.gainFrom ? `<small class="unlock-card-gain">${(0, runtime.deps.escapeHTML)(cardGain(runtime, def))}</small>` : '';
    return `<button type="button" class="unlock-card ${nodeClass(runtime, def, state, marks)}" data-unlock-select="${def.id}" data-tip="${tipOf(runtime, def, false)}" aria-label="${name}" style="${style};--icon:${at.h - 2}px">
            <span class="unlock-ic"><img src="${runtime.deps.contentUnlockUi.art(def)}" alt="" draggable="false" loading="lazy">${chip}</span><span class="unlock-card-text"><b>${(0, runtime.deps.escapeHTML)(view_cardName(runtime, def))}</b>${second}</span>${view_unseenHtml(runtime, def, marks)}</button>`;
}

export function edgesHtml(runtime, L, marks) {
    const rank = { 'is-dim': 0, 'is-next': 1, 'is-lit': 2 }, edges = [];
    runtime.state.unlockBoard.rows.forEach(def => runtime.deps.contentProgression.parents(def).forEach(from => {
        const points = runtime.state.unlockBoard.edgePoints(L, from, def.id), long = Math.abs(points[points.length - 1][0] - points[0][0]) > 300;
        const state = runtime.deps.contentProgression.isUnlocked(def.id) ? 'is-lit' : runtime.deps.contentProgression.isUnlocked(from) ? 'is-next' : 'is-dim';
        edges.push({ from, to: def.id, points, long, state, side: def.after !== from, fresh: marks.lit.has(from) && marks.fresh.has(def.id) });
    }));
    return edges.sort((a, b) => rank[a.state] - rank[b.state]).map(edge => {
        const planned = runtime.state.view_plannedPath.has(edge.from) && runtime.state.view_plannedPath.has(edge.to) ? ' is-planned' : '';
        const name = `fam-${runtime.state.unlockBoard.familyOf(runtime.deps.CONTENT_UNLOCK_CATALOG.find(row => row.id === edge.from))} ${edge.state}${planned}${edge.fresh ? ' is-new' : ''}${edge.long ? ' is-long' : ''}${edge.side ? ' is-side' : ''}`;
        return `<polyline class="${name}"${edge.fresh ? ' pathLength="1"' : ''} data-from="${edge.from}" data-to="${edge.to}" points="${edge.points.map(point => point.join(',')).join(' ')}"/>`;
    }).join('');
}

export function nowEntry(runtime, board) {
    return board.loops.filter(row => row.loop <= runtime.deps.game.season).pop() || board.loops[0];
}

export function nowLeft(runtime, scroller) {
    const now = nowEntry(runtime, runtime.state.view_layoutNow.board);
    return Math.max(0, now.x + now.w - scroller.clientWidth * 0.72);
}

export function railLabelsHtml(runtime, L) {
    const rails = new Map();
    runtime.state.unlockBoard.rows.filter(def => def.rail).forEach(def => {
        const at = L.pos.get(def.id), span = rails.get(def.rail) || { left: at.left, right: at.right, first: at.right, y: at.y, def };
        span.right = Math.max(span.right, at.right);
        rails.set(def.rail, span);
    });
    return [...rails.values()].map(span => `<div class="unlock-rail fam-${runtime.state.unlockBoard.familyOf(span.def)}" data-card-end="${span.first}" style="left:${span.left}px;width:${span.right - span.left}px;top:${span.y - 24}px"><span>${(0, runtime.deps.escapeHTML)(view_cardName(runtime, span.def))}</span></div>`).join('');
}

export function canvasHtml(runtime, L, marks, height) {
    const board = L.board, now = nowEntry(runtime, board);
    const ticks = board.loops.map(row => `<span class="unlock-tick${row === now ? ' is-now' : ''}${row.loop < now.loop ? ' is-past' : ''}${row.loop % 5 === 0 ? ' is-major' : ''}" style="left:${row.x}px;width:${row.w}px">${row.loop}</span>`).join('');
    const bands = board.loops.map(row => `<span class="unlock-col${Math.floor(row.loop / 5) % 2 ? ' is-alt' : ''}" style="left:${row.x}px;width:${row.w}px"></span>`).join('');
    return `${bands}<div class="unlock-past" style="width:${now.x}px"></div><div class="unlock-now" style="left:${now.x}px;width:${now.w}px"></div><div class="unlock-ruler">${ticks}</div>
            <svg class="unlock-lines" width="${board.width}" height="${height}" aria-hidden="true">${edgesHtml(runtime, L, marks)}</svg>${railLabelsHtml(runtime, L)}${runtime.state.unlockBoard.rows.map(def => nodeHtml(runtime, def, L, marks)).join('')}`;
}

export function overviewHtml(runtime, L) {
    const total = L.board.width, step = 38 / L.board.count;
    const ticks = runtime.state.unlockBoard.rows.map(def => {
        const at = L.pos.get(def.id);
        return `<i class="fam-${runtime.state.unlockBoard.familyOf(def)} is-${stateOf(runtime, def)}" style="left:${(at.cx / total * 100).toFixed(2)}%;top:${Math.round(at.row * step) + 1}px"></i>`;
    }).join('');
    const now = nowEntry(runtime, L.board);
    return `<div class="unlock-over" data-unlock-over="1">${ticks}<span class="unlock-over-now" style="left:${((now.x + now.w / 2) / total * 100).toFixed(2)}%"></span><span class="unlock-over-win"></span></div>`;
}

export function pointsHtml(runtime) {
    const points = runtime.deps.contentProgression.points();
    if (points.complete) return `<div class="unlock-stat is-points" data-tip="${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)('넘치는 해금 포인트는 그루터기 함 접붙이기 점수가 됩니다.'))}"><strong class="is-done">${(0, runtime.deps._t)('전체 해금 완료')}</strong></div>`;
    const tip = points.balance === points.remaining ? (0, runtime.deps._t)('남은 해금에 필요한 포인트를 모두 모았습니다. 넘치는 몫은 그루터기 함 접붙이기 점수가 됩니다.')
        : (0, runtime.deps._t)('루프마다 {perLoop}P. 남은 해금 비용을 넘는 몫은 그루터기 함 접붙이기 점수가 됩니다.', { perLoop: runtime.deps.CONTENT_UNLOCK_POINT_AWARDS.perLoop });
    return `<div class="unlock-stat is-points" data-tip="${(0, runtime.deps.escapeHTML)(tip)}"><span>${(0, runtime.deps._t)('해금 포인트')}</span><strong>${points.balance}<small>P</small></strong></div>`;
}

export function headHtml(runtime) {
    const ready = readyRows(runtime).length;
    return `<header class="unlocks-head">${pointsHtml(runtime)}<button type="button" class="unlock-stat is-ready" data-unlock-next="1"${ready ? '' : ' disabled'}><span>${(0, runtime.deps._t)('해금 가능')}</span><strong>${ready}</strong></button>
            <div class="unlock-over-slot"></div><div class="unlock-stat is-total"><span>${(0, runtime.deps._t)('전체')}</span><strong>${view_openCount(runtime)}<small>/${runtime.state.unlockBoard.rows.length}</small></strong></div></header>`;
}

export function view_parentsOpen(runtime, def) { return runtime.deps.contentProgression.parents(def).every(id => runtime.deps.contentProgression.isUnlocked(id)); }

export function view_openCount(runtime) { return runtime.state.unlockBoard.rows.filter(def => runtime.deps.contentProgression.isUnlocked(def.id)).length; }

export function view_unseenHtml(runtime, def, marks) { return marks.unseen.has(def.id) ? '<i class="unlock-unseen" aria-hidden="true">!</i>' : ''; }
