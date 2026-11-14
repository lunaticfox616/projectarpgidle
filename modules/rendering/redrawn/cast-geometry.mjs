/** Shared board-dot geometry, derived only from cast/projection snapshots. */
export const cellDot = g => ({ x: g.gx * 16 + 8, y: g.gy * 16 + 8 });
export const hitCell = e => e.targetCells && e.targetCells[0];
export const eventsOf = (cast, kind) => cast.events.filter(e => e.kind === kind);
export const firstOf = (cast, kind) => cast.events.find(e => e.kind === kind);

/** Board dots below a cell centre where the characters' feet stand (8px in exploration, 22% of a tile on the fixed board). */
export function feetDots(view) {
    const p = view.projection;
    return p && p.tileW ? (Number(p.actorGroundOffsetY) || 0) * 48 / p.tileW : 8;
}

export function feetY(cell, view) { return Math.round((cell.gy * 48 + 24 + feetDots(view)) / 3); }


export function unitToward(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    return { x: dx / L, y: dy / L };
}

export function whirlSpan(hits) {
    const times = hits.map(e => e.at);
    return { t0: Math.min(...times), t1: Math.max(...times) + 140 };
}

/** An event's footprint radius (grown by effect expansion), else the gem's own. */
export function footprintRadius(cast, st, fallback, skillGrid) {
    const r = Number(st && st.footprint && st.footprint.radius);
    return r > 0 ? r : (skillGrid[cast.skillName]?.radius || fallback);
}

/** Cells an event's footprint grew by (effect expansion) over the gem's own radius; fixed-size art grows 16 dots a cell. */
export function grownBy(cast, st, skillGrid) {
    const r = Number(st && st.footprint && st.footprint.radius), base = Number(skillGrid[cast.skillName]?.radius) || 0;
    return Number.isFinite(r) ? Math.max(0, r - base) : 0;
}
