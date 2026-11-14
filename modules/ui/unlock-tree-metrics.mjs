import { view_cardName, cardGain, upgradeEffect } from './unlock-tree-labels.mjs';

export function boardFamilyOf(runtime, def) {
    let row = def;
    while (row.after && !runtime.state.UNLOCK_LOOSE_FAMILY[row.id]) row = runtime.state.boardById.get(row.after);
    return runtime.state.UNLOCK_LOOSE_FAMILY[row.id] || runtime.state.UNLOCK_FAMILIES.find(family => family.root === row.id).id;
}

export function boardCardWidth(runtime, def, height) {
    const texts = [view_cardName(runtime, def), ...(height >= runtime.state.boardSIZE.gainFrom ? [cardGain(runtime, def)] : [])];
    return height - 2 + 5 + Math.max(runtime.state.boardSIZE.minCardText, ...texts.map(runtime.handlers.boardTextWidth)) + 8;
}

export function boardTreeOrder(runtime) {
    const done = new Set(), order = [];
    while (order.length < runtime.state.boardRows.length) {
        const before = order.length;
        for (const def of runtime.state.boardRows) {
            if (done.has(def.id) || !runtime.deps.contentProgression.parents(def).every(id => done.has(id))) continue;
            done.add(def.id);
            order.push(def);
        }
        if (order.length === before) throw new Error('unlock board: a cycle in the prerequisites');
    }
    return order;
}

export function boardReadTree(runtime) {
    const sorted = boardTreeOrder(runtime), loopOf = new Map(), depthOf = new Map(), kids = new Map(), sizes = new Map();
    for (const def of sorted) {
        const earlier = runtime.deps.contentProgression.parents(def);
        const at = Math.max(def.minLoop, ...earlier.map(id => loopOf.get(id)));
        loopOf.set(def.id, at);
        depthOf.set(def.id, earlier.filter(id => loopOf.get(id) === at).reduce((best, id) => Math.max(best, depthOf.get(id) + 1), 0));
        if (def.after) kids.set(def.after, [...(kids.get(def.after) || []), def]);
    }
    for (const def of [...sorted].reverse()) sizes.set(def.id, 1 + (kids.get(def.id) || []).reduce((sum, kid) => sum + sizes.get(kid.id), 0));
    const familyRank = def => runtime.state.UNLOCK_FAMILIES.findIndex(row => row.id === boardFamilyOf(runtime, def));
    const order = runtime.state.boardRows.map((def, index) => ({ def, index, loop: loopOf.get(def.id), depth: depthOf.get(def.id), family: familyRank(def) }))
        .sort((p, q) => p.loop - q.loop || p.depth - q.depth || p.family - q.family || p.index - q.index).map(row => row.def);
    // 줄기: 부모의 줄을 그대로 잇는 자식. 강화 줄의 다음 단계가 먼저, 그다음 딸린 칸이 가장 많은 자식.
    const stems = new Map();
    kids.forEach((list, id) => stems.set(id, (list.find(runtime.handlers.boardIsStep) || list.reduce((best, kid) => (sizes.get(kid.id) > sizes.get(best.id) ? kid : best))).id));
    return { loopOf, order, stems };
}

export function boardIsStep(runtime, def) { return !!def.rail && runtime.state.boardById.get(def.after)?.rail === def.rail; }

export function boardSlotKey(runtime, loop, sub) { return loop + sub / 10; }

export function boardTextWidth(runtime, text) { return [...String(text)].reduce((sum, letter) => sum + (letter.charCodeAt(0) > 0x2000 ? 12 : 8), 0); }

export function boardPipWidth(runtime, def) { return Math.max(runtime.state.boardSIZE.pip, boardTextWidth(runtime, upgradeEffect(runtime, def.series, def.rank)) + 10); }

export function boardCellWidth(runtime, def, height) { return boardIsStep(runtime, def) ? boardPipWidth(runtime, def) : boardCardWidth(runtime, def, height); }
