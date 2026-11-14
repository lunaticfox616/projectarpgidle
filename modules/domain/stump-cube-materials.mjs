import { cubeCoveredCells } from './stump-cube-geometry.mjs';
import { cubeOf } from './stump-cube-state.mjs';

// ── 재료 찾기 ─────────────────────────────────────────
export function cubeIdentity(env, kind, item) {
    return kind === 'equipment' ? env.deps.equipmentLoadoutRuntime.ensureItemIdentity(item) : item.id;
}

export function cubeStumpItem(env, state, id) {
    const box = state.stumpBox;
    if (!box || !Array.isArray(box.items) || env.deps.stumpBox.isPlaced(state, id)) return null;
    return box.items.find(item => item.id === id) || null;
}

/** Items the cube may take: stored, not locked (equipment, stump items, jewels and cores alike), not kept by an equipment set. */
export function cubeUsable(env, kind, item, keepLocked = false) {
    if (!item || (!keepLocked && item.locked)) return false;
    return kind !== 'equipment' || !env.deps.equipmentLoadoutRuntime.isReferenced(item);
}

export function cubeFootprint(env, kind, item) {
    if (kind !== 'equipment') return { w: 1, h: 1 };
    const size = env.deps.getEquipmentInventoryFootprint(item);
    return { w: Math.min(env.SIZE, size.columns), h: Math.min(env.SIZE, size.rows) };
}

// ── 칸 배치 ───────────────────────────────────────────
/** Reads references without changing the save. Locked items keep their cells so they can be taken out explicitly. */
export function cubeReadContents(env, state) {
    const taken = new Set(), list = [];
    const slots = (state.stumpCube?.slots || []).filter(slot => {
        const item = env.FINDERS[slot.kind](state, slot.id);
        if (!cubeUsable(env, slot.kind, item, true)) return false;
        const { w, h } = cubeFootprint(env, slot.kind, item), cells = cubeCoveredCells(env, slot.x, slot.y, w, h);
        if (!cells || cells.some(cell => taken.has(cell))) return false;
        cells.forEach(cell => taken.add(cell));
        list.push({ kind: slot.kind, id: slot.id, item, x: slot.x, y: slot.y, w, h });
        return true;
    });
    return { slots, list };
}

/** Drops missing, moved or overlapping references; a newly locked material remains until the player removes it. */
export function cubeEntries(env, state) {
    const cube = cubeOf(state), contents = cubeReadContents(env, state);
    cube.slots = contents.slots;
    return contents.list;
}
