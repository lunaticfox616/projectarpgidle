import { boardIsStep, boardCellWidth, boardReadTree, boardTreeStems, boardBusKids } from './unlock-tree-metrics.mjs';
import { unknownUnlock } from './unlock-tree-markup.mjs';

/*
 * 해금 판의 배치(2026-11-26 사용자: 스킬트리가 맨 위, 나눌 까닭이 없는 갈래를 줄여 세로를 낮게, 반듯하게).
 * 가로는 열(루프, 같은 루프 안의 단계)이고 세로는 줄(lane)이다. 줄에는 칸과 가까운 줄기(곧게 잇는 자식)만 둔다. 부모의 나머지 자식과
 * 둘째 선행으로 이어진 칸은 부모의 버스 한 줄에 매달린다: 버스는 부모 옆의 줄 사이(gutter)나 빈 줄로 달리고, 자식은 제 열의 왼쪽 경계에서
 * 버스를 떠나 제 줄로 들어간다. 같은 부모의 선은 한 줄로 합쳐지고, 멀리 기다리는 선이 칸 줄을 차지하지 않는다. 뿌리 칸은 위에서부터
 * 빈 줄에 놓여 스킬트리(가장 먼저 여는 칸)가 맨 위 왼쪽에 온다.
 *
 * 선로(track) t: 짝수는 줄 사이 경계(t/2번째 줄의 윗선, 0은 눈금 밑이라 쓰지 않는다), 홀수는 줄 (t-1)/2의 가운데.
 * 선로 위의 자리(point): 열 c의 칸은 2c+1, 열 c의 왼쪽 경계는 2c. 서로 다른 주인의 선과 칸은 같은 선로에서 자리를 나누지 않는다.
 * 경계의 세로선은 세 자리(slot, 가운데와 좌우 3px) 가운데 다른 주인의 세로선과 겹치지 않는 곳에 선다.
 */
const SLOTS = Object.freeze([0, -1, 1]);
const MAX_LANES = 60;

function boardFree(plan, track, from, to, owners) {
    return track >= 1 && !(plan.occ.get(track) || []).some(([a, b, owner]) => !owners.includes(owner) && from <= b && a <= to);
}

function boardTake(plan, track, from, to, owner) {
    if (!plan.occ.has(track)) plan.occ.set(track, []);
    plan.occ.get(track).push([from, to, owner]);
    plan.tracks = Math.max(plan.tracks, track);
}

function boardSlot(plan, point, track1, track2, owner) {
    const low = Math.min(track1, track2), high = Math.max(track1, track2);
    return SLOTS.find(slot => !plan.verticals.some(row => row.point === point && row.slot === slot && row.owner !== owner && row.low <= high && low <= row.high));
}

function boardVertical(plan, { point, from, to, owner, slot }) {
    plan.verticals.push({ point, slot, low: Math.min(from, to), high: Math.max(from, to), owner });
}

/** Lanes by distance from a bus track; on a tie the lane on the far side of the bus from the parent (below, for a bus on the parent's lane). */
function boardLaneOrder(track, parentTrack) {
    const lanes = Array.from({ length: MAX_LANES }, (_, lane) => lane), side = Math.sign(track - parentTrack) || 1;
    const away = lane => ((2 * lane + 1 - track) * side >= 0 ? 0 : 1);
    return lanes.sort((p, q) => Math.abs(2 * p + 1 - track) - Math.abs(2 * q + 1 - track) || away(p) - away(q) || p - q);
}

/** A child hangs from its parent's bus: the nearest lane whose cell and entry are free, with a free slot for the drop. */
function boardHangChild(plan, def, parent, col) {
    const bus = parent.bus, home = 2 * parent.row + 1, owner = parent.def.id;
    for (const lane of boardLaneOrder(bus.track, home)) {
        const track = 2 * lane + 1;
        if (!boardFree(plan, track, 2 * col + 1, 2 * col + 1, [def.id]) || !boardFree(plan, track, 2 * col, 2 * col, [def.id, owner])) continue;
        const slot = track === bus.track ? 0 : boardSlot(plan, 2 * col, bus.track, track, owner);
        if (slot === undefined) continue;
        if (track !== bus.track) boardVertical(plan, { point: 2 * col, from: bus.track, to: track, owner, slot });
        boardTake(plan, track, 2 * col, 2 * col, def.id);
        return { lane, route: { kind: 'bus', track: bus.track, start: bus.slot, drop: slot } };
    }
    throw new Error(`unlock board: no lane for ${def.id}`);
}

/** A root takes the first lane from the top whose cell is free, so the skill tree (the first unlock) starts the board at the top left. */
function boardRootLane(plan, def, col) {
    let lane = 0;
    while (!boardFree(plan, 2 * lane + 1, 2 * col, 2 * col + 1, [def.id])) lane++;
    return { lane, route: null };
}

function boardPlaceCard(plan, def) {
    const tree = plan.tree, col = tree.colOf.get(def.id), parent = def.after ? plan.spots.get(def.after) : null;
    const stemmed = parent && tree.stems.get(parent.def.id) === def.id;
    const { lane, route } = stemmed ? { lane: parent.row, route: { kind: 'stem' } } : parent ? boardHangChild(plan, def, parent, col) : boardRootLane(plan, def, col);
    boardTake(plan, 2 * lane + 1, 2 * col + 1, 2 * col + 1, def.id);
    if (route) plan.routes.set(`${def.after}>${def.id}`, route);
    const spot = { def, loop: tree.loopOf.get(def.id), sub: tree.depthOf.get(def.id), row: lane, colIndex: col, bus: null };
    plan.spots.set(def.id, spot);
    // 줄기는 첫 칸을 놓을 때 끝까지(강화 줄이면 마지막 단계까지) 자리를 맡아 둔다: 그 사이에 다른 칸이나 버스가 들어오지 않는다.
    if (!stemmed) {
        for (let from = def.id, stem = tree.stems.get(from); stem; from = stem, stem = tree.stems.get(stem)) {
            boardTake(plan, 2 * lane + 1, 2 * tree.colOf.get(from) + 2, 2 * tree.colOf.get(stem) + 1, stem);
        }
    }
    return spot;
}

/** Tracks near a lane: the gutter below, the gutter above and its own lane (own lane first when ownFirst), then farther out. */
function boardTrackOrder(home, ownFirst) {
    const order = ownFirst ? [home, home + 1, home - 1] : [home + 1, home - 1, home];
    for (let step = 2; step < MAX_LANES * 2; step++) order.push(home + step, home - step);
    return order.filter(track => track >= 1);
}

/** How many of the bus children would find no free cell on a lane next to the track (they would need a long drop). */
function boardBusStrays(plan, track, kids) {
    const lanes = track % 2 ? [(track - 1) / 2] : [track / 2 - 1, track / 2];
    return kids.filter(kid => {
        const col = plan.tree.colOf.get(kid.id);
        return !lanes.some(lane => lane >= 0 && boardFree(plan, 2 * lane + 1, 2 * col, 2 * col + 1, [kid.id]));
    }).length;
}

/** A track near the parent, free from its right edge to the farthest bus child, with a free slot for the step out. Among the first few
* such tracks the one whose children can sit right next to it wins (each stray child costs as much as two tracks of distance). */
function boardBusTrack(plan, spot, kids, exit, far) {
    const id = spot.def.id, home = 2 * spot.row + 1, found = [];
    for (const [rank, track] of boardTrackOrder(home, plan.ownFirst).entries()) {
        if (found.length >= 4) break;
        if (!boardFree(plan, track, exit, far, [id])) continue;
        const slot = track === home ? 0 : boardSlot(plan, exit, home, track, id);
        if (slot !== undefined) found.push({ track, slot, cost: rank + 2 * boardBusStrays(plan, track, kids) });
    }
    if (!found.length) throw new Error(`unlock board: no track for ${id}`);
    return found.reduce((best, row) => (row.cost < best.cost ? row : best));
}

/** Opens the parent's bus once it is placed. Its right edge (exit) is its own: the stem line shares it, nobody else touches it. */
function boardOpenBus(plan, spot) {
    const id = spot.def.id, kids = plan.tree.busKids.get(id) || [];
    if (!kids.length) return;
    const home = 2 * spot.row + 1, exit = 2 * spot.colIndex + 2;
    if (!plan.tree.stems.get(id)) boardTake(plan, home, exit, exit, id);
    const far = 2 * Math.max(...kids.map(kid => plan.tree.colOf.get(kid.id)));
    // Every bus child in the next column: no run along a track, one vertical on the shared boundary.
    const hung = kids.filter(kid => kid.after === id);
    const found = far === exit ? { track: home, slot: 0 } : boardBusTrack(plan, spot, hung, exit, far), bus = { track: found.track, slot: found.slot };
    if (bus.track !== home) boardVertical(plan, { point: exit, from: home, to: bus.track, owner: id, slot: bus.slot });
    if (far !== exit) boardTake(plan, bus.track, exit, far, id);
    spot.bus = bus;
}

/** A second prerequisite (requires) drops from that parent's bus into the card's entry. */
function boardRouteSides(runtime, plan, def) {
    const spot = plan.spots.get(def.id), track = 2 * spot.row + 1, point = 2 * spot.colIndex;
    runtime.deps.contentProgression.parents(def).filter(id => id !== def.after).forEach(id => {
        const bus = plan.spots.get(id).bus;
        const slot = boardSlot(plan, point, bus.track, track, id) ?? 0;
        boardVertical(plan, { point, from: bus.track, to: track, owner: id, slot });
        plan.routes.set(`${id}>${def.id}`, { kind: 'bus', track: bus.track, start: bus.slot, drop: slot });
    });
}

/** A bus with one child that ended on the parent's own lane, with nothing between them, is drawn as a straight line instead of the detour. */
function boardStraighten(plan) {
    plan.spots.forEach(spot => {
        const kids = plan.tree.busKids.get(spot.def.id) || [], kid = kids.length === 1 ? plan.spots.get(kids[0].id) : null;
        if (!kid || kid.row !== spot.row) return;
        if (boardFree(plan, 2 * spot.row + 1, 2 * spot.colIndex + 2, 2 * kid.colIndex, [spot.def.id, kid.def.id])) plan.routes.set(`${spot.def.id}>${kid.def.id}`, { kind: 'stem' });
    });
}

/**
* @param {{reach: number, ownFirst: boolean}} options reach: columns within which a child may be the stem; ownFirst: a bus tries its own lane first
* @returns {{spots: Map, routes: Map, count: number, cost: number}} count: lanes; cost: lanes (laneCost each), how far the verticals reach past
* the next lane, and one for each line that is not straight
*/
export function boardPlanTracks(runtime, base, options) {
    const stems = boardTreeStems(runtime, base, options.reach), tree = { ...base, stems, busKids: boardBusKids(runtime, base, stems) };
    const plan = { tree, ownFirst: options.ownFirst, occ: new Map(), verticals: [], spots: new Map(), routes: new Map(), tracks: 0 };
    for (const def of tree.order) {
        boardOpenBus(plan, boardPlaceCard(plan, def));
        boardRouteSides(runtime, plan, def);
    }
    boardStraighten(plan);
    const lanes = Math.max(...[...plan.spots.values()].map(spot => spot.row + 1));
    const count = Math.max(lanes, Math.ceil(plan.tracks / 2)), long = plan.verticals.reduce((sum, row) => sum + Math.max(0, row.high - row.low - 2), 0);
    const bends = [...plan.routes.values()].filter(route => route.kind !== 'stem').length;
    return { spots: plan.spots, routes: plan.routes, count, cost: count * runtime.state.boardSIZE.laneCost + long + bends };
}

/** Plans the board a few ways and keeps the cheapest: a lane counts most, then long verticals and bent lines. */
function boardBestPlan(runtime) {
    const base = boardReadTree(runtime), size = runtime.state.boardSIZE;
    const plans = size.stemReaches.flatMap(reach => [false, true].map(ownFirst => boardPlanTracks(runtime, base, { reach, ownFirst })));
    return plans.reduce((best, plan) => (plan.cost < best.cost ? plan : best));
}

export function boardMeasureColumns(runtime, spots) {
    const slots = new Map();
    spots.forEach(spot => {
        const name = `${spot.loop}.${spot.sub}`, slot = slots.get(name) || { loop: spot.loop, sub: spot.sub, w: 0 };
        slot.w = Math.max(slot.w, Math.max(runtime.state.boardSIZE.unknownWidth, boardCellWidth(runtime, spot.def, runtime.state.boardSIZE.maxCard)) + runtime.state.boardSIZE.cardGap);
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
    const plan = boardBestPlan(runtime);
    return { spots: plan.spots, routes: plan.routes, count: plan.count, ...boardMeasureColumns(runtime, plan.spots) };
}

/** Even pitch, so lane centres and gutters fall on whole pixels; cards leave laneClear above and below for the gutter lines. */
export function boardLayout(runtime, height) {
    const board = boardBuilt(runtime), size = runtime.state.boardSIZE;
    let pitch = Math.max(size.minPitch, Math.min(size.maxPitch, Math.floor((height - size.ruler - size.boardPad) / board.count)));
    pitch -= pitch % 2;
    const cardH = Math.min(size.maxCard, pitch - 2 * size.laneClear), pos = new Map();
    board.spots.forEach((spot, id) => {
        const step = boardIsStep(runtime, spot.def), rowTop = size.ruler + spot.row * pitch, y = rowTop + pitch / 2;
        const w = unknownUnlock(runtime, spot.def) ? size.unknownWidth : boardCellWidth(runtime, spot.def, cardH);
        const h = step ? size.pipH : cardH, left = spot.col.x + Math.floor((spot.col.w - w) / 2);
        pos.set(id, { def: spot.def, step, row: spot.row, loop: spot.loop, left, right: left + w, y, top: y - Math.floor(h / 2), w, h, cx: left + Math.floor(w / 2), rowTop, rowBottom: rowTop + pitch, col: spot.col });
    });
    return { board, pos, pitch, cardH, height, fullHeight: Math.max(height, size.ruler + board.count * pitch + size.boardPad) };
}

/** The polyline of a prerequisite edge: straight along a stem, otherwise out to the bus, along it and down into the card. */
export function boardEdgePoints(runtime, L, from, to) {
    const p = L.pos.get(from), c = L.pos.get(to), route = L.board.routes.get(`${from}>${to}`);
    if (!route || route.kind === 'stem') return [[p.right, p.y], [c.left, c.y]];
    const slotPx = runtime.state.boardSIZE.slot, busY = runtime.state.boardSIZE.ruler + route.track * L.pitch / 2;
    const out = p.col.x + p.col.w + route.start * slotPx, drop = c.col.x + route.drop * slotPx, points = [[p.right, p.y]];
    if (busY !== p.y) points.push([out, p.y], [out, busY]);
    points.push([drop, busY]);
    if (busY !== c.y) points.push([drop, c.y]);
    points.push([c.left, c.y]);
    return points;
}

export function boardBuilt(runtime) {
    if (!runtime.state.boardBase || runtime.state.boardBase.language !== runtime.deps.i18n.language) runtime.state.boardBase = { ...boardBuildBase(runtime), language: runtime.deps.i18n.language };
    return runtime.state.boardBase;
}
