// Loot lying on an exploration map's floor until the hero picks it up (2026-10-05 user request: equipment; 2026-10-06: currency,
// jewels, cores and wild talismans too): a kill or a chest drops it on the cell, the hero collects it by stepping onto it, and a
// click on the pile collects it at once. The run owns the rows (saved with it as run.groundLoot). Ordinary maps settle what is left
// on departure; colony and grand breach floor loot belongs to that attempt and is lost when the encounter is abandoned.
actExplorationState.groundLoot = (() => {
    // The hero picks a pile up by stepping onto its cell: drops beside a melee fight stay until it walks over.
    const PICKUP_RANGE = 0;
    const distance = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy));
    /**
     * @typedef {{gx:number, gy:number, item:object, highlight:boolean, guaranteed:boolean,
     *   filterOnPickup?:boolean, ignoreAutoSalvage?:boolean}} GroundLootEquipmentRow equipment;
     *   highlight marks a protected or hunted drop (equipmentLootPolicy.highlight) so its pile keeps a beam; guaranteed keeps the
     *   item even in a full inventory when picked up (addItemToInventory guaranteedKeep). Saved without a kind (since 2026-10-05).
     * @typedef {{gx:number, gy:number, currency:string, count:number}} GroundLootCurrencyRow an already resolved currency gain
     *   (canonical key, whole count); one row per currency and cell, later drops add to it.
     * @typedef {{gx:number, gy:number, kind:'jewel'|'core', item:object}} GroundLootStoreRow a rolled jewel or core.
     * @typedef {{gx:number, gy:number, kind:'talisman', item:object, overflow:string}} GroundLootTalismanRow a rolled wild
     *   talisman (its fields, no stump box id yet) and the shard currency given instead when the stump box storage is full.
     * @typedef {{gx:number, gy:number, kind:'leaf', leaf:string}} GroundLootLeafRow a memory leaf id (data/memory-leaves.js, 2026-10-09).
     * @typedef {{gx:number, gy:number, kind:'gem', gem:string, choices?:string[]}} GroundLootGemRow the loop's starter gem by name
     *   (SKILL_DB), dropped by the loop's first kill (js/combat.js grantLoopStarterGemOnFirstKill, 2026-10-15). In a mutation loop
     *   choices are the three runes offered (js/loop-mutation.js starterChoices) and gem is the first, taken when the row is settled.
     * @typedef {{gx:number, gy:number, kind:'rune', gem:{kind:'attack'|'support',name:string,awakened?:boolean,tier?:number},
     *   shards:number}} GroundLootRuneRow an exact gem reward (gemDropRewards.validateGem).
     * @typedef {GroundLootEquipmentRow|GroundLootCurrencyRow|GroundLootStoreRow|GroundLootTalismanRow|GroundLootLeafRow|GroundLootGemRow|GroundLootRuneRow} GroundLootRow
     */
    // 놓인 줄마다의 전투 시각: 그림이 바닥에 닿아 이름이 뜬 뒤(GROUND_LOOT_DROP.readyMs)에야 주인공이 줍거나 주우러 간다
    // (2026-10-13 사용자: "아이템이 완전히 떨어지고 나서 캐릭터가 아이템을 줍거나 주우러 가도록"). 저장하지 않는다: 불러온 줄은 이미 바닥에 있다.
    const laidAt = new WeakMap();
    const landed = (row, now) => !laidAt.has(row) || now - laidAt.get(row) >= GROUND_LOOT_DROP.readyMs;
    const rows = run => (run && Array.isArray(run.groundLoot) ? run.groundLoot : []);
    const floor = run => (Array.isArray(run.groundLoot) ? run.groundLoot : (run.groundLoot = []));
    /** The kind of a row: 'equipment', 'currency', 'jewel', 'core', 'talisman', 'leaf', 'gem' or 'rune'. */
    const kindOf = row => row.kind || (typeof row.currency === 'string' ? 'currency' : 'equipment');

    // 방 단위 무대의 문 봉인은 캐릭터와 함께 바닥 전리품 위에 그려진다(js/battle-ground-loot-ui.js actorContext): 봉인이 서는 자리에 떨어진 것은
    // 가려진다(2026-10-16 사용자 "출입구(문)이 아이템을 가리는 것도 수정"). 2026-10-21의 봉인(data/stage-view.js rootSeal)은 앞뒤 문의 정면 그림이
    // 세 칸 반 너비에 일곱 줄 높이, 좌우 문의 옆 그림이 두 칸 너비에 일곱 줄 높이다: 뒷문에서 뒷줄, 앞문에서 앞의 일곱 줄을 문 칸 좌우 두 칸
    // 안에서, 옆문에서 방의 첫 칸을 위로 일곱 줄과 아래로 한 줄까지 덮는다(조각 묶음 방과 지역 그림 방의 발 자리에서 잰 칸 가운데). 거기 떨어질
    // 것은 같은 방의 가장 가까운 빈 칸(SEAL_REACH 안)으로 옮긴다.
    const SEAL_REACH = 4;
    function underDoorSeal(map, cell) {
        return map.doors.some(door => {
            const dx = Math.abs(cell.gx - door.cell.gx), dy = cell.gy - door.cell.gy;
            if (door.side === 'north') return dx <= 2 && dy <= 1;
            if (door.side === 'south') return dx <= 2 && dy >= -7;
            return dx <= 1 && dy >= -7 && dy <= 1;
        });
    }
    /** The cell a drop lies on: the given one, or on a room stage the nearest walkable cell of its room that no door seal covers. */
    function clearOfDoors(run, cell) {
        const map = actExplorationDoors.stageMap(run), room = map ? actExplorationRooms.roomAt(map, cell) : null;
        if (!room || !underDoorSeal(map, cell)) return cell;
        const free = next => actExplorationRooms.roomAt(map, next) === room && actExplorationMap.walkable(map, next) && !underDoorSeal(map, next);
        for (let reach = 1; reach <= SEAL_REACH; reach++) {
            const found = ringCells(cell, reach).find(free);
            if (found) return found;
        }
        return cell;
    }
    /** The cells exactly reach steps away (a square ring), row by row. */
    function ringCells(cell, reach) {
        const out = [];
        for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === reach) out.push({ gx: cell.gx + dx, gy: cell.gy + dy });
        return out;
    }
    /** A row laid while an atlas map's kill or chest is settled also counts toward that map's result (js/combat-loot-receipts.js). */
    function lay(run, row) {
        Object.assign(row, clearOfDoors(run, row));
        floor(run).push(row);
        laidAt.set(row, getCombatTime());
        combatLootReceipts.floorRow(game, row);
    }
    /** Lays an already generated equipment item on a walkable cell of the run's map. */
    function place(run, cell, item, { highlight = false, guaranteed = false } = {}) {
        lay(run, { gx: cell.gx, gy: cell.gy, item, highlight: !!highlight, guaranteed: !!guaranteed });
    }
    /** Lays an already rolled jewel, core or wild talisman (with its overflow shard) on a walkable cell. */
    function placeItem(run, cell, kind, item, overflow) {
        lay(run, kind === 'talisman' ? { gx: cell.gx, gy: cell.gy, kind, item, overflow } : { gx: cell.gx, gy: cell.gy, kind, item });
    }
    /** Lays a memory leaf (js/memory-leaves.js) on a walkable cell; each leaf is its own row. */
    function placeLeaf(run, cell, leaf) {
        lay(run, { gx: cell.gx, gy: cell.gy, kind: 'leaf', leaf });
    }
    /** Lays a yarn (js/knitting.js) on a walkable cell. */
    function placeYarn(run, cell, yarn) {
        lay(run, { gx: cell.gx, gy: cell.gy, kind: 'yarn', yarn });
    }
    /** Lays the loop's starter gem (its name; in a mutation loop also the runes offered) on a walkable cell. */
    function placeGem(run, cell, gem, choices) {
        lay(run, { gx: cell.gx, gy: cell.gy, kind: 'gem', gem, ...(choices ? { choices } : {}) });
    }
    /** Lays an already resolved currency gain on a walkable cell, joining the same currency already lying there. */
    function placeCurrency(run, at, currency, count) {
        combatLootReceipts.currency(game, currency, count);
        const cell = clearOfDoors(run, at);
        const row = floor(run).find(other => other.currency === currency && other.gx === cell.gx && other.gy === cell.gy);
        if (row) { row.count += count; return; }
        const fresh = { gx: cell.gx, gy: cell.gy, currency, count };
        run.groundLoot.push(fresh);
        laidAt.set(fresh, getCombatTime());
    }
    function take(run, test) {
        const taken = rows(run).filter(test);
        if (taken.length) run.groundLoot = rows(run).filter(row => !taken.includes(row));
        return taken;
    }
    /** Rows on the hero's cell that have landed by `now` (combat time). */
    const takeNear = (run, cell, now) => take(run, row => distance(row, cell) <= PICKUP_RANGE && landed(row, now));
    /** Every row of one pile (a clicked cell), wherever the hero stands. */
    const takeAt = (run, cell) => take(run, row => row.gx === cell.gx && row.gy === cell.gy);
    const takeAll = run => take(run, () => true);
    /** The pile closest to `from` (ties: the first dropped), or null. With `now` (combat time) only rows that have landed count. */
    function nearest(run, from, now) {
        let best = null;
        for (const row of rows(run)) {
            if (now !== undefined && !landed(row, now)) continue;
            if (!best || distance(row, from) < distance(best, from)) best = row;
        }
        return best;
    }
    /** Whether something is still on its way down at `now` (combat time). */
    const falling = (run, now) => rows(run).some(row => !landed(row, now));
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
    const ENCOUNTER_ZONES = ['colony_run', 'grand_breach_run'];
    const encounterRecord = (state, zoneId) => zoneId === 'colony_run' ? state.colony
        : zoneId === 'grand_breach_run' ? state.voidRift?.grandRun : null;
    /** The live colony or grand breach run in the state's current zone, or null. */
    function encounterOwner(state = game, zoneId = state.currentZoneId) {
        const owner = encounterRecord(state, zoneId);
        return owner?.inRun ? owner : null;
    }
    /** Keep a rolled floor row invisible until its encounter reward is released. */
    function reserve(row, state = game) {
        const owner = encounterOwner(state);
        if (!owner) return false;
        const held = row && kindOf(row) === 'equipment' ? { highlight: false, guaranteed: false, ...row } : row;
        if (!validPendingRow(held)) throw Error('잘못된 원정 보류 전리품');
        if (!Array.isArray(owner.pendingLoot)) owner.pendingLoot = [];
        owner.pendingLoot.push({ ...held });
        return true;
    }
    /** Walkable cells near a boss, excluding the hero, sealed door art and unreachable ground. */
    function encounterDropCells(run, cell) {
        if (!Number.isInteger(cell?.gx) || !Number.isInteger(cell?.gy)) return [];
        const map = actExplorationMap.forRun(run);
        if (!map) return [];
        const room = map.rooms ? actExplorationRooms.roomAt(map, cell) : null;
        const reachable = next => actExplorationMap.walkable(map, next, true)
            && (!room || actExplorationRooms.roomAt(map, next) === room)
            && (!game.gridPlayer || distance(next, game.gridPlayer) > 0)
            && (!map.doors || !underDoorSeal(map, next))
            && (!game.gridPlayer || actExplorationMap.route(map, game.gridPlayer, next).length > 0);
        return [1, 2, 3, 4].flatMap(reach => ringCells(cell, reach).filter(reachable));
    }
    /** Empty the buffer before placing each reward, so repeated boss callbacks cannot pay it twice. */
    function releaseEncounter(owner, cell) {
        const pending = Array.isArray(owner?.pendingLoot) ? owner.pendingLoot : [];
        if (!owner) return 0;
        owner.pendingLoot = [];
        if (!pending.length) return 0;
        const zoneId = ENCOUNTER_ZONES.find(id => encounterRecord(game, id) === owner);
        if (zoneId !== game.currentZoneId) return 0;
        const run = actExplorationState.current(game);
        const cells = releaseCells(zoneId, run, cell);
        if (!cells.length) collectExplorationFloorLoot(pending);
        else {
            layEncounterRows(run, pending, cells);
            addBattleFx('lootBurst', {duration:400});
        }
        return pending.length;
    }
    function releaseCells(zoneId, run, cell) {
        if (game.isBackgroundCalculation || run?.zoneId !== zoneId) return [];
        const origin = validEncounterCell(cell) ? cell : game.gridPlayer;
        return encounterDropCells(run, origin);
    }
    function layEncounterRows(run, pending, cells) {
        pending.forEach((row, index) => {
            const at = cells[index % cells.length];
            if (kindOf(row) === 'currency') placeCurrency(run, at, row.currency, row.count);
            else lay(run, { ...row, ...at });
        });
    }
    /** Abandon an encounter's unreleased buffer. What its boss already laid on the floor was won: the live game collects it, a
     * loaded state settles it (leaving after the lord fell used to lose the whole payout). */
    function dropEncounterBuffer(state, zoneId) {
        const owner = encounterRecord(state, zoneId);
        if (owner) { owner.pendingLoot = []; owner.lootPending = false; owner.bossLootCell = null; }
    }
    function discardEncounter(state, zoneId) {
        dropEncounterBuffer(state, zoneId);
        const run = state.actExploration;
        if (run?.zoneId !== zoneId) return;
        const won = rows(run);
        run.groundLoot = [];
        if (state === game) { if (won.length) collectExplorationFloorLoot(won); }
        else won.forEach(row => settleRow[kindOf(row)](state, row));
    }
    /** Validate pending rows before a restored encounter can resume; stale owners lose their floor too. */
    function normalizeEncounter(state) {
        const activeFloor = state.actExploration?.zoneId === state.currentZoneId ? rows(state.actExploration) : [];
        const ids = new Set(activeFloor.map(row => row?.item?.id).filter(Number.isSafeInteger));
        for (const zoneId of ENCOUNTER_ZONES) {
            const owner = encounterRecord(state, zoneId);
            if (!owner) continue;
            if (!owner.inRun || state.currentZoneId !== zoneId) { discardEncounter(state, zoneId); continue; }
            normalizePendingLoot(owner, ids);
        }
    }
    function normalizePendingLoot(owner, ids) {
        if (owner.pendingLoot === undefined) owner.pendingLoot = [];
        if (!Array.isArray(owner.pendingLoot)) throw Error('잘못된 원정 보류 전리품');
        // An older save spread defaultGame.colony: its own copy, or a reserve would write into the default (and the next loop)
        owner.pendingLoot = [...owner.pendingLoot];
        for (const row of owner.pendingLoot) {
            if (!validPendingRow(row)) throw Error('잘못된 원정 보류 전리품');
            const id = row.item?.id;
            if (Number.isSafeInteger(id) && ids.has(id)) throw Error('중복된 원정 보류 아이템');
            if (Number.isSafeInteger(id)) ids.add(id);
        }
        owner.lootPending = !!owner.lootPending;
        owner.bossLootCell = validEncounterCell(owner.bossLootCell) ? owner.bossLootCell : null;
    }
    const validEncounterCell = cell => Number.isSafeInteger(cell?.gx) && cell.gx >= 0
        && Number.isSafeInteger(cell?.gy) && cell.gy >= 0;
    /** Floor items holding an id from the shared item counter (wild talismans get their stump box id only when stored). */
    function reservedItems(state) {
        const held = ENCOUNTER_ZONES.flatMap(id => encounterRecord(state, id)?.pendingLoot || []);
        return [...rows(state.actExploration), ...held].filter(row => row.item && row.kind !== 'talisman').map(row => row.item);
    }

    // An ordinary retired or stale map settles its floor; a retired special encounter discards its attempt-owned floor and buffer.
    const settleRow = {
        equipment: (state, row) => { state.inventory = (state.inventory || []).concat(row.item); if (state.noti) state.noti.items = true; },
        currency: (state, row) => {
            if (row.currency === 'condensedSkyPower') state.skyTower.condensedPower = (state.skyTower.condensedPower || 0) + row.count;
            else state.currencies[row.currency] = (state.currencies[row.currency] || 0) + row.count;
        },
        jewel: (state, row) => { bagItems.put(bagItems.asJewel(row.item), state, true); },
        core: (state, row) => { coreItems.keep(row.item, state); },
        talisman: (state, row) => { talismans.receiveWild(state, { talisman: row.item, overflow: row.overflow }); },
        leaf: (state, row) => { memoryLeaves.receive(state, row.leaf); },
        yarn: (state, row) => { knitting.receive(state, row.yarn); },
        gem: (state, row) => { receiveStarterGem(state, row.gem); },
        rune: (state, row) => {
            gemDropRewards.grant(state, row.gem, 0);
            state.currencies.gemShard = (state.currencies.gemShard || 0) + row.shards;
        }
    };
    function settleOnLoad(state, run) {
        if (ENCOUNTER_ZONES.includes(run.zoneId)) dropEncounterBuffer(state, run.zoneId);
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
            if (['talisman', 'leaf', 'yarn', 'gem', 'rune'].includes(kindOf(row))) continue; // these rows do not own item ids
            const key = row.item ? `item:${row.item.id}` : `currency:${row.gx},${row.gy},${row.currency}`;
            if (ids.has(key)) throw Error('중복된 탐험 바닥 아이템 저장');
            ids.add(key);
        }
    }
    const loot = actExplorationLoot;
    const validKind = {
        equipment: row => typeof row.highlight === 'boolean' && typeof row.guaranteed === 'boolean'
            && (row.filterOnPickup === undefined || typeof row.filterOnPickup === 'boolean')
            && (row.ignoreAutoSalvage === undefined || typeof row.ignoreAutoSalvage === 'boolean') && loot.validEquipment(row.item),
        currency: row => (loot.isCurrency(row.currency) || row.currency === 'condensedSkyPower')
            && Number.isSafeInteger(row.count) && row.count > 0 && !row.item,
        jewel: row => loot.validJewel(row.item),
        core: row => loot.validCore(row.item),
        talisman: row => !!talismans.normalizeTalisman(row.item) && loot.isCurrency(row.overflow),
        leaf: row => memoryLeaves.validId(row.leaf) && !row.item,
        yarn: row => knitting.validId(row.yarn) && !row.item,
        gem: row => typeof row.gem === 'string' && !!SKILL_DB[row.gem] && !row.item,
        rune: row => validRune(row)
    };
    /** gemDropRewards.validateGem throws on malformed records; turn that into the floor validator's boolean contract. */
    function validRune(row) {
        if (!Number.isSafeInteger(row.shards) || row.shards < 0 || row.item) return false;
        try { gemDropRewards.validateGem(row.gem); return true; }
        catch { return false; }
    }
    function validPendingRow(row) {
        const check = row && validKind[kindOf(row)];
        return !!check && check(row);
    }
    function validRow(map, row) {
        if (!row || !Number.isInteger(row.gx) || !Number.isInteger(row.gy) || !actExplorationMap.walkable(map, row, true)) return false;
        const check = validKind[kindOf(row)];
        return !!check && check(row);
    }

    return { PICKUP_RANGE, kindOf, place, placeItem, placeLeaf, placeYarn, placeGem, placeCurrency, takeNear, takeAt, takeAll, nearest, falling, piles,
        encounterOwner, reserve, releaseEncounter, discardEncounter, normalizeEncounter, reservedItems, settleOnLoad, validate };
})();
