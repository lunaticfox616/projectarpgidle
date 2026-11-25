import { view_cardName, cardGain, upgradeEffect } from './unlock-tree-labels.mjs';

export function boardFamilyOf(runtime, def) {
    let row = def;
    while (row.after && !runtime.state.boardFamilyRoots.has(row.id)) row = runtime.state.boardById.get(row.after);
    return runtime.state.boardFamilyRoots.get(row.id);
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
    // 열: 루프와 같은 루프 안의 단계(depth)마다 한 칸. order가 그 차례라 처음 나온 순서가 곧 열 번호다.
    const colOf = new Map(), keys = [];
    order.forEach(def => {
        const slot = boardSlotKey(runtime, loopOf.get(def.id), depthOf.get(def.id));
        if (keys[keys.length - 1] !== slot) keys.push(slot);
        colOf.set(def.id, keys.length - 1);
    });
    return { loopOf, depthOf, colOf, order, kids, sizes, sorted };
}

/** 줄기: 부모의 줄을 곧게 잇는 자식. 강화 줄의 다음 단계, 아니면 reach 열 안에 오는 자식 가운데 딸린 칸이 가장 많은 자식.
* 멀리 떨어진 자식은 줄기가 되지 않는다: 그 사이의 줄을 비워 두면 판이 세로로 길어진다(2026-11-26 사용자). */
export function boardTreeStems(runtime, tree, reach) {
    const stems = new Map();
    tree.kids.forEach((list, id) => {
        const step = list.find(runtime.handlers.boardIsStep);
        const near = step ? [step] : list.filter(kid => tree.colOf.get(kid.id) - tree.colOf.get(id) <= reach);
        if (near.length) stems.set(id, near.reduce((best, kid) => (tree.sizes.get(kid.id) > tree.sizes.get(best.id) ? kid : best)).id);
    });
    return stems;
}

/** 버스에 매달리는 자식: 줄기가 아닌 after 자식과 둘째 선행(requires)으로 이어진 칸. */
export function boardBusKids(runtime, tree, stems) {
    const bus = new Map();
    const add = (id, def) => bus.set(id, [...(bus.get(id) || []), def]);
    tree.kids.forEach((list, id) => list.filter(kid => stems.get(id) !== kid.id).forEach(kid => add(id, kid)));
    tree.sorted.forEach(def => runtime.deps.contentProgression.parents(def).filter(id => id !== def.after).forEach(id => add(id, def)));
    return bus;
}

export function boardIsStep(runtime, def) { return !!def.rail && runtime.state.boardById.get(def.after)?.rail === def.rail; }

export function boardSlotKey(runtime, loop, sub) { return loop + sub / 10; }

export function boardTextWidth(runtime, text) { return [...String(text)].reduce((sum, letter) => sum + (letter.charCodeAt(0) > 0x2000 ? 12 : 8), 0); }

export function boardPipWidth(runtime, def) { return Math.max(runtime.state.boardSIZE.pip, boardTextWidth(runtime, upgradeEffect(runtime, def.series, def.rank)) + 10); }

export function boardCellWidth(runtime, def, height) { return boardIsStep(runtime, def) ? boardPipWidth(runtime, def) : boardCardWidth(runtime, def, height); }
