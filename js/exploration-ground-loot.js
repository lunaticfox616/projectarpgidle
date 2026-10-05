// Equipment lying on an exploration map's floor until the hero picks it up (2026-10-05 user request): a kill or a chest drops
// it on the cell, the hero collects it by stepping onto it, and a click on the pile collects it at once. The run owns the rows
// (saved with it as run.groundLoot); nothing is lost: every way out of the map settles what is left into the inventory
// (js/combat.js collectExplorationFloorLoot grants them through the normal pickup).
actExplorationState.groundLoot = (() => {
    // The hero picks a pile up by stepping onto its cell: drops beside a melee fight stay until it walks over.
    const PICKUP_RANGE = 0;
    const distance = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy));
    /** @typedef {{gx:number, gy:number, item:object, highlight:boolean, guaranteed:boolean}} GroundLootRow equipment on a map
     * cell; highlight marks a protected or hunted drop (equipmentLootPolicy.highlight) so its pile keeps a beam; guaranteed keeps
     * the item even in a full inventory when picked up (addItemToInventory guaranteedKeep). */
    const rows = run => (run && Array.isArray(run.groundLoot) ? run.groundLoot : []);

    /** Lays an already generated item on a walkable cell of the run's map. */
    function place(run, cell, item, { highlight = false, guaranteed = false } = {}) {
        if (!Array.isArray(run.groundLoot)) run.groundLoot = [];
        run.groundLoot.push({ gx: cell.gx, gy: cell.gy, item, highlight: !!highlight, guaranteed: !!guaranteed });
    }
    function take(run, test) {
        const taken = rows(run).filter(test);
        if (taken.length) run.groundLoot = rows(run).filter(row => !taken.includes(row));
        return taken;
    }
    /** Rows on the hero's cell. */
    const takeNear = (run, cell) => take(run, row => distance(row, cell) <= PICKUP_RANGE);
    /** Every row of one pile (a clicked cell), wherever the hero stands. */
    const takeAt = (run, cell) => take(run, row => row.gx === cell.gx && row.gy === cell.gy);
    const takeAll = run => take(run, () => true);
    /** The pile closest to `from` (ties: the first dropped), or null. */
    function nearest(run, from) {
        let best = null;
        for (const row of rows(run)) if (!best || distance(row, from) < distance(best, from)) best = row;
        return best;
    }
    /** One pile per cell, in drop order: the read model the battlefield draws and makes clickable. */
    function piles(run) {
        const byCell = new Map();
        for (const row of rows(run)) {
            const key = `${row.gx},${row.gy}`;
            if (!byCell.has(key)) byCell.set(key, { gx: row.gx, gy: row.gy, rows: [] });
            byCell.get(key).rows.push(row);
        }
        return [...byCell.values()];
    }
    function reservedItems(state) {
        return rows(state.actExploration).map(row => row.item);
    }

    /** A save boundary that drops the run (stale zone, retired layout) keeps its floor items: they join the inventory as is. */
    function settleOnLoad(state, run) {
        const items = rows(run).map(row => row.item);
        if (!items.length) return;
        state.inventory = (state.inventory || []).concat(items);
        if (state.noti) state.noti.items = true;
        run.groundLoot = [];
    }

    function validEquipment(item) {
        return !!item && Number.isSafeInteger(item.id) && typeof item.name === 'string'
            && typeof item.slot === 'string' && Array.isArray(item.stats) && Array.isArray(item.baseStats);
    }
    /** Load boundary: a save without the field (before 2026-10-05) has an empty floor; malformed rows reject the run. */
    function validate(run) {
        if (run.groundLoot === undefined) run.groundLoot = [];
        if (!Array.isArray(run.groundLoot)) throw Error('잘못된 탐험 바닥 아이템 저장');
        const map = actExplorationMap.forRun(run), ids = new Set();
        for (const row of run.groundLoot) {
            if (!validRow(map, row)) throw Error('잘못된 탐험 바닥 아이템 저장');
            if (ids.has(row.item.id)) throw Error('중복된 탐험 바닥 아이템 저장');
            ids.add(row.item.id);
        }
    }
    function validRow(map, row) {
        return !!row && Number.isInteger(row.gx) && Number.isInteger(row.gy) && typeof row.highlight === 'boolean'
            && typeof row.guaranteed === 'boolean' && validEquipment(row.item) && actExplorationMap.walkable(map, row, true);
    }

    return { PICKUP_RANGE, place, takeNear, takeAt, takeAll, nearest, piles, reservedItems, settleOnLoad, validate };
})();
