// Equipment and currency lying on an exploration map's floor until the hero picks them up (2026-10-05 user request; currency
// since 2026-10-06): a kill or a chest drops them on the cell, the hero collects it by stepping onto it, and a click on the pile collects it at once. The run owns the rows
// (saved with it as run.groundLoot); nothing is lost: every way out of the map settles what is left into the inventory
// (js/combat.js collectExplorationFloorLoot grants them through the normal pickup).
actExplorationState.groundLoot = (() => {
    // The hero picks a pile up by stepping onto its cell: drops beside a melee fight stay until it walks over.
    const PICKUP_RANGE = 0;
    const distance = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy));
    /** @typedef {{gx:number, gy:number, item:object, highlight:boolean, guaranteed:boolean}} GroundLootItemRow equipment on a map
     * cell; highlight marks a protected or hunted drop (equipmentLootPolicy.highlight) so its pile keeps a beam; guaranteed keeps
     * the item even in a full inventory when picked up (addItemToInventory guaranteedKeep).
     * @typedef {{gx:number, gy:number, currency:string, count:number}} GroundLootCurrencyRow an already resolved currency gain
     * (canonical key, whole count) waiting on a cell; one row per currency and cell, later drops add to it.
     * @typedef {GroundLootItemRow|GroundLootCurrencyRow} GroundLootRow */
    const rows = run => (run && Array.isArray(run.groundLoot) ? run.groundLoot : []);

    /** Lays an already generated item on a walkable cell of the run's map. */
    function place(run, cell, item, { highlight = false, guaranteed = false } = {}) {
        if (!Array.isArray(run.groundLoot)) run.groundLoot = [];
        run.groundLoot.push({ gx: cell.gx, gy: cell.gy, item, highlight: !!highlight, guaranteed: !!guaranteed });
    }
    /** Lays an already resolved currency gain on a walkable cell, joining the same currency already lying there. */
    function placeCurrency(run, cell, currency, count) {
        if (!Array.isArray(run.groundLoot)) run.groundLoot = [];
        const row = run.groundLoot.find(other => other.currency === currency && other.gx === cell.gx && other.gy === cell.gy);
        if (row) row.count += count;
        else run.groundLoot.push({ gx: cell.gx, gy: cell.gy, currency, count });
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
        return rows(state.actExploration).filter(row => row.item).map(row => row.item);
    }

    /** A save boundary that drops the run (stale zone, retired layout) keeps its floor items: they join the inventory as is. */
    function settleOnLoad(state, run) {
        if (!rows(run).length) return;
        const items = rows(run).filter(row => row.item).map(row => row.item);
        state.inventory = (state.inventory || []).concat(items);
        if (items.length && state.noti) state.noti.items = true;
        for (const row of rows(run).filter(row => row.currency)) {
            if (row.currency === 'condensedSkyPower') state.skyTower.condensedPower = (state.skyTower.condensedPower || 0) + row.count;
            else state.currencies[row.currency] = (state.currencies[row.currency] || 0) + row.count;
        }
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
            const key = row.item ? `item:${row.item.id}` : `currency:${row.gx},${row.gy},${row.currency}`;
            if (ids.has(key)) throw Error('중복된 탐험 바닥 아이템 저장');
            ids.add(key);
        }
    }
    const isCurrency = key => Object.hasOwn(ORB_DB, key) || Object.hasOwn(defaultGame.currencies, key) || key === 'condensedSkyPower';
    function validRow(map, row) {
        if (!row || !Number.isInteger(row.gx) || !Number.isInteger(row.gy) || !actExplorationMap.walkable(map, row, true)) return false;
        return typeof row.currency === 'string' ? validCurrencyRow(row) : validItemRow(row);
    }
    const validCurrencyRow = row => isCurrency(row.currency) && Number.isSafeInteger(row.count) && row.count > 0 && !row.item;
    const validItemRow = row => typeof row.highlight === 'boolean' && typeof row.guaranteed === 'boolean' && validEquipment(row.item);

    return { PICKUP_RANGE, place, placeCurrency, takeNear, takeAt, takeAll, nearest, piles, reservedItems, settleOnLoad, validate };
})();
