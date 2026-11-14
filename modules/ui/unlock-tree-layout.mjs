import { boardSlotKey, boardFamilyOf, boardIsStep, boardCellWidth, boardReadTree } from './unlock-tree-metrics.mjs';

export function boardNearRows(runtime, plan, start, side) {
    const list = [];
    for (let step = 1; step < plan.count; step++) list.push(start + side * step, start - side * step);
    return list;
}

export function boardPutCell(runtime, plan, def, spot, from) {
    const here = boardSlotKey(runtime, spot.loop, spot.sub), stem = plan.tree.stems.get(def.id);
    plan.rows[spot.row].push([from === null ? here - 0.01 : from, here + 0.01, '']);
    plan.spots.set(def.id, { def, ...spot });
    if (stem && plan.tree.loopOf.get(stem) > spot.loop) plan.rows[spot.row].push([here + 0.01, boardSlotKey(runtime, plan.tree.loopOf.get(stem), 0) + 0.01, stem]);
    return true;
}

export function boardPlaceRoot(runtime, plan, def) {
    const loop = plan.tree.loopOf.get(def.id), family = runtime.state.UNLOCK_FAMILIES.find(row => row.id === boardFamilyOf(runtime, def));
    const start = Math.round((plan.count - 1) * family.at), spot = boardSlotKey(runtime, loop, 0);
    const row = [start, ...boardNearRows(runtime, plan, start, family.side)].find(value => boardFree(runtime, plan, value, spot - 0.01, spot + 0.01));
    return row !== undefined && boardPutCell(runtime, plan, def, { loop, sub: 0, row }, null);
}

export function boardPlaceStep(runtime, plan, def, parent) {
    const loop = plan.tree.loopOf.get(def.id), from = boardSlotKey(runtime, parent.loop, parent.sub) + 0.01;
    let sub = parent.loop === loop ? parent.sub + 1 : 0;
    while (sub < 9 && !boardFree(runtime, plan, parent.row, boardSlotKey(runtime, loop, sub) - 0.01, boardSlotKey(runtime, loop, sub) + 0.01)) sub++;
    return boardFree(runtime, plan, parent.row, from, boardSlotKey(runtime, loop, sub) + 0.01) && boardPutCell(runtime, plan, def, { loop, sub, row: parent.row }, from);
}

export function createBoardPlaceAlong(runtime) {
    return function boardPlaceAlong(plan, def, parent, firstSub, withParentRow) {
        const loop = plan.tree.loopOf.get(def.id), side = runtime.state.UNLOCK_FAMILIES.find(row => row.id === boardFamilyOf(runtime, def)).side, parentKey = boardSlotKey(runtime, parent.loop, parent.sub);
        const candidates = [...(withParentRow ? [parent.row] : []), ...boardNearRows(runtime, plan, parent.row, side)];
        const fromOf = row => parentKey + (row === parent.row ? 0.01 : 0.05);
        for (let sub = firstSub; sub < 9; sub++) {
            const row = candidates.find(value => boardFree(runtime, plan, value, fromOf(value), boardSlotKey(runtime, loop, sub) + 0.01));
            if (row !== undefined) return boardPutCell(runtime, plan, def, { loop, sub, row }, fromOf(row));
        }
        return false;
    };
}

export function boardPlaceStacked(runtime, plan, def, parent) {
    const side = runtime.state.UNLOCK_FAMILIES.find(row => row.id === boardFamilyOf(runtime, def)).side, here = boardSlotKey(runtime, parent.loop, parent.sub);
    const row = [parent.row + side, parent.row - side].find(value => boardFree(runtime, plan, value, here - 0.01, here + 0.01));
    return row !== undefined ? boardPutCell(runtime, plan, def, { loop: parent.loop, sub: parent.sub, row }, null) : runtime.handlers.boardPlaceAlong(plan, def, parent, parent.sub + 1, true);
}

export function boardPlaceRow(runtime, plan, def) {
    const parent = def.after ? plan.spots.get(def.after) : null;
    if (!parent) return boardPlaceRoot(runtime, plan, def);
    if (boardIsStep(runtime, def)) return boardPlaceStep(runtime, plan, def, parent);
    if (plan.tree.loopOf.get(def.id) === parent.loop) return boardPlaceStacked(runtime, plan, def, parent);
    return runtime.handlers.boardPlaceAlong(plan, def, parent, 0, plan.tree.stems.get(parent.def.id) === def.id);
}

export function boardTryCount(runtime, count, tree) {
    const plan = { count, tree, rows: Array.from({ length: count }, () => []), spots: new Map(), me: '' };
    for (const def of tree.order) {
        plan.me = def.id;
        if (!boardPlaceRow(runtime, plan, def)) return null;
    }
    return plan.spots;
}

export function boardMeasureColumns(runtime, spots) {
    const slots = new Map();
    spots.forEach(spot => {
        const name = `${spot.loop}.${spot.sub}`, slot = slots.get(name) || { loop: spot.loop, sub: spot.sub, w: 0 };
        slot.w = Math.max(slot.w, boardCellWidth(runtime, spot.def, runtime.state.boardSIZE.maxCard) + runtime.state.boardSIZE.cardGap);
        slots.set(name, slot);
    });
    let x = runtime.state.boardSIZE.left;
    const columns = [...slots.values()].sort((a, b) => a.loop - b.loop || a.sub - b.sub), loops = [];
    columns.forEach(slot => {
        slot.x = x;
        x += slot.w;
        const last = loops[loops.length - 1];
        if (last && last.loop === slot.loop) last.w += slot.w;
        else loops.push({ loop: slot.loop, x: slot.x, w: slot.w });
    });
    spots.forEach(spot => { spot.col = slots.get(`${spot.loop}.${spot.sub}`); });
    return { loops, width: x + 40 };
}

export function boardBuildBase(runtime) {
    const tree = boardReadTree(runtime);
    for (let count = runtime.state.boardSIZE.minRows; count <= runtime.state.boardSIZE.maxRows; count++) {
        const spots = boardTryCount(runtime, count, tree);
        if (spots) return { spots, count, ...boardMeasureColumns(runtime, spots) };
    }
    throw new Error('unlock board: no row count fits the tree');
}

export function boardLayout(runtime, height) {
    const board = boardBuilt(runtime), pitch = Math.max(runtime.state.boardSIZE.minPitch, Math.min(runtime.state.boardSIZE.maxPitch, Math.floor((height - runtime.state.boardSIZE.ruler) / board.count)));
    const cardH = Math.min(pitch - 4, runtime.state.boardSIZE.maxCard), pos = new Map();
    board.spots.forEach((spot, id) => {
        const step = boardIsStep(runtime, spot.def), rowTop = runtime.state.boardSIZE.ruler + spot.row * pitch, y = rowTop + Math.floor(pitch / 2);
        const w = boardCellWidth(runtime, spot.def, cardH), h = step ? runtime.state.boardSIZE.pipH : cardH, left = spot.col.x + Math.floor((spot.col.w - w) / 2);
        pos.set(id, { def: spot.def, step, row: spot.row, loop: spot.loop, left, right: left + w, y, top: y - Math.floor(h / 2), w, h, cx: left + Math.floor(w / 2), rowTop, rowBottom: rowTop + pitch, col: spot.col });
    });
    return { board, pos, pitch, cardH, height, fullHeight: Math.max(height, runtime.state.boardSIZE.ruler + board.count * pitch) };
}

export function boardEdgePoints(runtime, L, from, to) {
    const p = L.pos.get(from), c = L.pos.get(to), skip = [from, to], out = p.col.x + p.col.w, inn = c.col.x;
    if (p.col === c.col) return c.y > p.y ? [[p.cx, p.top + p.h], [p.cx, c.top]] : [[p.cx, p.top], [p.cx, c.top + c.h]];
    const toward = (x, y) => [[p.right, p.y], [x, p.y], [x, y], [c.left, c.y]];
    if (runtime.state.boardById.get(to).after === from) return p.y === c.y ? [[p.right, p.y], [c.left, c.y]] : toward(out, c.y);
    if (runtime.handlers.boardClearRun(L, p.y, p.right, inn, skip)) return toward(inn, c.y);
    if (runtime.handlers.boardClearRun(L, c.y, out, c.left, skip)) return toward(out, c.y);
    const gap = c.y < p.y ? p.rowTop : p.rowBottom;
    return [[p.right, p.y], [out, p.y], [out, gap], [inn, gap], [inn, c.y], [c.left, c.y]];
}

export function boardFree(runtime, plan, row, from, to) { return row >= 0 && row < plan.count && !plan.rows[row].some(([a, b, owner]) => owner !== plan.me && a < to && b > from); }

export function boardBuilt(runtime) {
    if (!runtime.state.boardBase || runtime.state.boardBase.language !== runtime.deps.i18n.language) runtime.state.boardBase = { ...boardBuildBase(runtime), language: runtime.deps.i18n.language };
    return runtime.state.boardBase;
}

export function createBoardClearRun() {
    return function boardClearRun(L, y, from, to, skip) { return ![...L.pos.values()].some(row => !skip.includes(row.def.id) && row.y === y && row.left < to && row.right > from); };
}
