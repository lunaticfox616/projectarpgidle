// Loot lying on an exploration map's floor until the hero picks it up (2026-10-05 user request: equipment; 2026-10-06: currency,
// jewels, cores and wild talismans too): a kill or a chest drops it on the cell, the hero collects it by stepping onto it, and a
// click on the pile collects it at once. The run owns the rows (saved with it as run.groundLoot); nothing is lost: every way out
// of the map settles what is left (js/combat.js collectExplorationFloorLoot grants them through each normal receive path).
actExplorationState.groundLoot = (() => {
    // The hero picks a pile up by stepping onto its cell: drops beside a melee fight stay until it walks over.
    const PICKUP_RANGE = 0;
    const distance = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy));
    /**
     * @typedef {{gx:number, gy:number, item:object, highlight:boolean, guaranteed:boolean}} GroundLootEquipmentRow equipment;
     *   highlight marks a protected or hunted drop (equipmentLootPolicy.highlight) so its pile keeps a beam; guaranteed keeps the
     *   item even in a full inventory when picked up (addItemToInventory guaranteedKeep). Saved without a kind (since 2026-10-05).
     * @typedef {{gx:number, gy:number, currency:string, count:number}} GroundLootCurrencyRow an already resolved currency gain
     *   (canonical key, whole count); one row per currency and cell, later drops add to it.
     * @typedef {{gx:number, gy:number, kind:'jewel'|'core', item:object}} GroundLootStoreRow a rolled jewel or core.
     * @typedef {{gx:number, gy:number, kind:'talisman', item:object, overflow:string}} GroundLootTalismanRow a rolled wild
     *   talisman (its fields, no stump box id yet) and the shard currency given instead when the stump box storage is full.
     * @typedef {GroundLootEquipmentRow|GroundLootCurrencyRow|GroundLootStoreRow|GroundLootTalismanRow} GroundLootRow
     */
    const rows = run => (run && Array.isArray(run.groundLoot) ? run.groundLoot : []);
    const floor = run => (Array.isArray(run.groundLoot) ? run.groundLoot : (run.groundLoot = []));
    /** The kind of a row: 'equipment', 'currency', 'jewel', 'core' or 'talisman'. */
    const kindOf = row => row.kind || (typeof row.currency === 'string' ? 'currency' : 'equipment');

    /** Lays an already generated equipment item on a walkable cell of the run's map. */
    function place(run, cell, item, { highlight = false, guaranteed = false } = {}) {
        floor(run).push({ gx: cell.gx, gy: cell.gy, item, highlight: !!highlight, guaranteed: !!guaranteed });
    }
    /** Lays an already rolled jewel, core or wild talisman (with its overflow shard) on a walkable cell. */
    function placeItem(run, cell, kind, item, overflow) {
        floor(run).push(kind === 'talisman' ? { gx: cell.gx, gy: cell.gy, kind, item, overflow } : { gx: cell.gx, gy: cell.gy, kind, item });
    }
    /** Lays an already resolved currency gain on a walkable cell, joining the same currency already lying there. */
    function placeCurrency(run, cell, currency, count) {
        const row = floor(run).find(other => other.currency === currency && other.gx === cell.gx && other.gy === cell.gy);
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
    /** Floor items holding an id from the shared item counter (wild talismans get their stump box id only when stored). */
    function reservedItems(state) {
        return rows(state.actExploration).filter(row => row.item && row.kind !== 'talisman').map(row => row.item);
    }

    // A save boundary that drops the run (stale zone, retired layout) keeps its floor loot: each row goes where a pickup puts it.
    const settleRow = {
        equipment: (state, row) => { state.inventory = (state.inventory || []).concat(row.item); if (state.noti) state.noti.items = true; },
        currency: (state, row) => {
            if (row.currency === 'condensedSkyPower') state.skyTower.condensedPower = (state.skyTower.condensedPower || 0) + row.count;
            else state.currencies[row.currency] = (state.currencies[row.currency] || 0) + row.count;
        },
        jewel: (state, row) => { state.jewelInventory = (state.jewelInventory || []).concat(row.item); },
        core: (state, row) => { coreItems.keep(row.item, state); },
        talisman: (state, row) => { talismans.receiveWild(state, { talisman: row.item, overflow: row.overflow }); }
    };
    function settleOnLoad(state, run) {
        for (const row of rows(run)) settleRow[kindOf(row)](state, row);
        run.groundLoot = [];
    }

    /** Load boundary: a save without the field (before 2026-10-05) has an empty floor; malformed rows reject the run. */
    function validate(run) {
        if (run.groundLoot === undefined) run.groundLoot = [];
        if (!Array.isArray(run.groundLoot)) throw Error('잘못된 탐험 바닥 아이템 저장');
        const map = actExplorationMap.forRun(run), ids = new Set();
        for (const row of run.groundLoot) {
            if (!validRow(map, row)) throw Error('잘못된 탐험 바닥 아이템 저장');
            if (kindOf(row) === 'talisman') continue; // a rolled talisman has no id until the stump box stores it
            const key = row.item ? `item:${row.item.id}` : `currency:${row.gx},${row.gy},${row.currency}`;
            if (ids.has(key)) throw Error('중복된 탐험 바닥 아이템 저장');
            ids.add(key);
        }
    }
    const loot = actExplorationLoot;
    const validKind = {
        equipment: row => typeof row.highlight === 'boolean' && typeof row.guaranteed === 'boolean' && loot.validEquipment(row.item),
        currency: row => (loot.isCurrency(row.currency) || row.currency === 'condensedSkyPower')
            && Number.isSafeInteger(row.count) && row.count > 0 && !row.item,
        jewel: row => loot.validJewel(row.item),
        core: row => loot.validCore(row.item),
        talisman: row => !!talismans.normalizeTalisman(row.item) && loot.isCurrency(row.overflow)
    };
    function validRow(map, row) {
        if (!row || !Number.isInteger(row.gx) || !Number.isInteger(row.gy) || !actExplorationMap.walkable(map, row, true)) return false;
        const check = validKind[kindOf(row)];
        return !!check && check(row);
    }

    return { PICKUP_RANGE, kindOf, place, placeItem, placeCurrency, takeNear, takeAt, takeAll, nearest, piles, reservedItems, settleOnLoad, validate };
})();
