const distance = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy));
const cellOf = row => `${row.gx},${row.gy}`;
const rows = run => run && Array.isArray(run.groundLoot) ? run.groundLoot : [];
const floor = run => Array.isArray(run.groundLoot) ? run.groundLoot : (run.groundLoot = []);
export const groundLootKind = row => row.kind || (typeof row.currency === 'string' ? 'currency' : 'equipment');
const ENCOUNTER_ZONES = ['colony_run', 'grand_breach_run'];
const encounterRecord = (state, zoneId) => zoneId === 'colony_run' ? state.colony : zoneId === 'grand_breach_run' ? state.voidRift?.grandRun : null;
const validEncounterCell = cell => Number.isSafeInteger(cell?.gx) && cell.gx >= 0 && Number.isSafeInteger(cell?.gy) && cell.gy >= 0;
const inventoryItem = row => row?.item && !['talisman','stump'].includes(row.kind);

// Old starter gems remain exact attack-rune rewards when a save is restored.
const retireStarterGemRow = row => !row || row.kind !== 'gem' ? row
    : { gx: row.gx, gy: row.gy, kind: 'rune', gem: { kind: 'attack', name: row.gem, awakened: false } };

/** Cells exactly reach steps away, in the original row-first order. */
function ringCells(cell, reach) {
    const out = [];
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === reach) out.push({ gx: cell.gx + dx, gy: cell.gy + dy });
    }
    return out;
}

function* nearbyCells(cell) {
    for (let reach=1;reach<=4;reach++) yield* ringCells(cell,reach);
}

function roomForDrop(map,cell,rooms) {
    if (map.owner) return rooms.roomAt(map,cell);
    return map.rooms?.find(room=>Math.abs(cell.gx-room.gx)<=room.radiusX && Math.abs(cell.gy-room.gy)<=room.radiusY);
}

function partOfBossFight(pack,cache) {
    return pack.roomId===cache.roomId && (pack.key===cache.packKey || pack.stage!==null || pack.invader);
}

function underDoorSeal(map, cell) {
    return map.doors.some(door => {
        const dx = Math.abs(cell.gx - door.cell.gx), dy = cell.gy - door.cell.gy;
        if (door.side === 'north') return dx <= 2 && dy <= 1;
        if (door.side === 'south') return dx <= 2 && dy >= -7;
        return dx <= 1 && dy >= -7 && dy <= 1;
    });
}

/** Save validation maps the rune validator's exception into the floor validator's boolean contract. */
function validRune(row, rewards) {
    if (row.item) return false;
    try { rewards.validateGem(row.gem); return true; }
    catch { return false; }
}

function validators(deps) {
    return {
        equipment: row => typeof row.highlight === 'boolean' && typeof row.guaranteed === 'boolean'
            && (row.filterOnPickup === undefined || typeof row.filterOnPickup === 'boolean')
            && (row.ignoreAutoSalvage === undefined || typeof row.ignoreAutoSalvage === 'boolean') && deps.loot.validEquipment(row.item),
        currency: row => (deps.loot.isCurrency(row.currency) || row.currency === 'condensedSkyPower')
            && Number.isSafeInteger(row.count) && row.count > 0 && !row.item,
        jewel: row => deps.loot.validJewel(row.item),
        core: row => deps.loot.validCore(row.item),
        talisman: row => !!deps.talismans.normalizeTalisman(row.item) && deps.loot.isCurrency(row.overflow),
        stump: row => deps.stumpBox.validDrop(row.item),
        leaf: row => deps.memoryLeaves.validId(row.leaf) && !row.item,
        yarn: row => deps.knitting.validId(row.yarn) && !row.item,
        rune: row => validRune(row, deps.gems)
    };
}

/** Restore-only settlement uses the supplied state, never the live wallet or its UI. */
function restoredRewards(deps) {
    return {
        equipment: (state, row) => { state.inventory = (state.inventory || []).concat(row.item); if (state.noti) state.noti.items = true; },
        currency: (state, row) => {
            if (row.currency === 'condensedSkyPower') state.skyTower.condensedPower = (state.skyTower.condensedPower || 0) + row.count;
            else state.currencies[row.currency] = (state.currencies[row.currency] || 0) + row.count;
        },
        jewel: (state, row) => { deps.bagItems.put(deps.bagItems.asJewel(row.item), state, true); },
        core: (state, row) => { deps.coreItems.keep(row.item, state); },
        talisman: (state, row) => { deps.talismans.receiveWild(state, { talisman: row.item, overflow: row.overflow }); },
        stump: (state, row) => { deps.stumpBox.receiveDrop(state, row.item); },
        leaf: (state, row) => { deps.memoryLeaves.receive(state, row.leaf); },
        yarn: (state, row) => { deps.knitting.receive(state, row.yarn); },
        rune: (state, row) => { deps.gems.grant(state, row.gem, 0); }
    };
}

/** Each floor row carries its launch time on the saved combat clock. Pre-clock saves are already landed.
 * Mutating methods receive their state explicitly. UI pickup/FX remain with the caller. */
class ExplorationGroundLoot {
    constructor(deps) {
        this.deps = deps;
        this.queueEnds = new WeakMap();
        this.validKind = validators(deps);
        this.settleRow = restoredRewards(deps);
    }
    dropTurn(run) {
        const now = this.deps.now(), timing = this.deps.timing;
        const turn = Math.max(now, Math.min(this.queueEnds.get(run) || 0, now + timing.queueCapMs));
        this.queueEnds.set(run, turn + timing.gapMs);
        return turn;
    }
    landed(row, now) { return row.dropAt===undefined || now-row.dropAt>=this.deps.timing.readyMs; }
    touchedDown(row, now) { return row.dropAt===undefined || now-row.dropAt>=this.deps.timing.flightMs+this.deps.timing.flightSpreadMs; }
    clearOfDoors(run, cell) {
        const { maps, rooms, doors } = this.deps;
        const map = doors.stageMap(run), room = map ? rooms.roomAt(map, cell) : null;
        if (!room || !underDoorSeal(map, cell)) return cell;
        const free = next => rooms.roomAt(map, next) === room && maps.walkable(map, next) && !underDoorSeal(map, next);
        for (let reach = 1; reach <= 4; reach++) {
            const found = ringCells(cell, reach).find(free);
            if (found) return found;
        }
        return cell;
    }
    lay(state, run, row) {
        this.deps.receipts.floorRow(state, row);
        this.storeRow(run,row);
    }
    storeRow(run,row) {
        if (run.bossLoot) { run.bossLoot.pendingLoot.push(row); return; }
        Object.assign(row,this.clearOfDoors(run,row));
        row.dropAt=this.dropTurn(run);
        if (row.currency) this.addCurrencyLot(run,row);
        else floor(run).push(row);
    }
    addCurrencyLot(run,row) {
        const target=floor(run),now=this.deps.now();
        const same=target.filter(other=>other.currency===row.currency && other.gx===row.gx && other.gy===row.gy);
        const batch=same.find(other=>other.dropAt===row.dropAt);
        if (batch) {batch.count+=row.count;return;}
        // Keep a landed pile collectible while a later delivery to its tile is still in flight.
        const [settled,...rest]=same.filter(other=>this.landed(other,now));
        for (const earlier of rest) {settled.count+=earlier.count;target.splice(target.indexOf(earlier),1);}
        target.push(row);
    }
    place(state, run, cell, item, { highlight = false, guaranteed = false, filterOnPickup=false, ignoreAutoSalvage=false } = {}) {
        this.lay(state, run, { gx: cell.gx, gy: cell.gy, item, highlight: !!highlight, guaranteed: !!guaranteed,filterOnPickup,ignoreAutoSalvage });
    }
    placeItem(state, run, cell, kind, { item, overflow }) {
        this.lay(state, run, kind === 'talisman' ? { gx: cell.gx, gy: cell.gy, kind, item, overflow } : { gx: cell.gx, gy: cell.gy, kind, item });
    }
    placeLeaf(state, run, cell, leaf) { this.lay(state, run, { gx: cell.gx, gy: cell.gy, kind: 'leaf', leaf }); }
    placeYarn(state, run, cell, yarn) { this.lay(state, run, { gx: cell.gx, gy: cell.gy, kind: 'yarn', yarn }); }
    placeRune(state, run, cell, gem) { this.lay(state, run, { gx: cell.gx, gy: cell.gy, kind: 'rune', gem }); }
    placeCurrency(state, run, at, currency, count) {
        this.deps.receipts.currency(state, currency, count);
        this.storeRow(run,{gx:at.gx,gy:at.gy,currency,count});
    }
    take(run, test) {
        const taken = rows(run).filter(test);
        if (taken.length) run.groundLoot = rows(run).filter(row => !taken.includes(row));
        return taken;
    }
    takeNear(run, cell, now, range) {
        return this.take(run, row => distance(row, cell) <= range && this.landed(row, now));
    }
    takeAt(run, cell) {
        const now=this.deps.now();
        return this.take(run, row => row.gx === cell.gx && row.gy === cell.gy && this.touchedDown(row,now));
    }
    takeAll(run) { return this.take(run, () => true); }
    nearest(run, from, now) {
        const busy = new Set(now === undefined ? [] : rows(run).filter(row => !this.landed(row, now)).map(cellOf));
        let best = null;
        for (const row of rows(run)) {
            if (busy.has(cellOf(row))) continue;
            if (!best || distance(row, from) < distance(best, from)) best = row;
        }
        return best;
    }
    falling(run, now) { return rows(run).some(row => !this.landed(row, now)); }
    inAir(run, now) { return rows(run).filter(row => row.dropAt <= now && !this.touchedDown(row, now)); }
    piles(run, now) {
        const byCell = new Map();
        for (const row of rows(run)) {
            if (now !== undefined && !this.touchedDown(row, now)) continue;
            const key = cellOf(row);
            if (!byCell.has(key)) byCell.set(key, { gx: row.gx, gy: row.gy, rows: [] });
            byCell.get(key).rows.push(row);
        }
        return [...byCell.values()];
    }
    encounterOwner(state, zoneId = state.currentZoneId) {
        const owner = encounterRecord(state, zoneId);
        if (owner?.inRun) return owner;
        const run=state.actExploration;
        return run?.zoneId===zoneId ? run.bossLoot || null : null;
    }
    reserve(state, row) {
        const owner = this.encounterOwner(state);
        if (!owner) return false;
        const held = row && groundLootKind(row) === 'equipment' ? { highlight: false, guaranteed: false, ...row } : row;
        if (!this.validPendingRow(held)) throw Error('잘못된 원정 보류 전리품');
        if (owner===state.actExploration?.bossLoot) {
            if (held.currency) this.deps.receipts.currency(state,held.currency,held.count);
            else this.deps.receipts.floorRow(state,held);
        }
        if (!Array.isArray(owner.pendingLoot)) owner.pendingLoot = [];
        owner.pendingLoot.push({ ...held });
        return true;
    }
    encounterDropCells(state, run, cell, limit=Infinity) {
        if (!Number.isInteger(cell?.gx) || !Number.isInteger(cell?.gy)) return [];
        const { maps, rooms } = this.deps, map = maps.forRun(run);
        if (!map) return [];
        const room = roomForDrop(map,cell,rooms);
        const reachable = next => maps.walkable(map, next, true) && (!room || roomForDrop(map,next,rooms) === room)
            && (!state.gridPlayer || distance(next, state.gridPlayer) > 0) && (!map.doors || !underDoorSeal(map, next))
            && (!state.gridPlayer || maps.route(map, state.gridPlayer, next).length > 0);
        const cells=[];
        for (const next of nearbyCells(cell)) {
            if (!reachable(next)) continue;
            cells.push(next);
            if (cells.length>=limit) break;
        }
        return cells;
    }
    beginBoss(run,pack,joining) {
        if (run.bossLoot || !pack) return;
        if (joining && !joining.some(enemy=>enemy.isBoss)) return;
        const map=this.deps.maps.forRun(run);
        const nearby=this.take(run,row=>roomForDrop(map,row,this.deps.rooms)?.id===pack.roomId);
        run.bossLoot={roomId:pack.roomId,packKey:pack.key,pendingLoot:nearby};
    }
    finishBoss(state,run,cell) {
        const cache=run.bossLoot;
        if (!cache || run.packs.some(pack=>pack.aliveIds.length && partOfBossFight(pack,cache))) return;
        delete run.bossLoot;
        if (!cache.pendingLoot.length) return;
        const cells=state.isBackgroundCalculation ? [] : this.encounterDropCells(state,run,cell,Math.min(cache.pendingLoot.length,8));
        if (!cells.length) cells.push(this.clearOfDoors(run,state.gridPlayer));
        cache.pendingLoot.forEach((row,i)=>this.storeRow(run,{...row,...cells[i%cells.length]}));
    }
    /** Empty the buffer first. The returned rows need immediate live pickup, or burst requests only a visual.
     * The caller must finish that work before the next settlement; the domain never calls UI or replays rewards. */
    releaseEncounter(state, owner, cell) {
        const pending = Array.isArray(owner?.pendingLoot) ? owner.pendingLoot : [];
        const result = { count: 0, collect: [], burst: false };
        if (!owner) return result;
        owner.pendingLoot = [];
        if (!pending.length) return result;
        const zoneId = ENCOUNTER_ZONES.find(id => encounterRecord(state, id) === owner);
        if (zoneId !== state.currentZoneId) return result;
        const run = this.deps.exploration.current(state), cells = this.releaseCells(state, zoneId, run, cell);
        if (!cells.length) result.collect = pending;
        else { this.layEncounterRows(state, run, pending, cells); result.burst = true; }
        result.count = pending.length;
        return result;
    }
    releaseCells(state, zoneId, run, cell) {
        if (state.isBackgroundCalculation || run?.zoneId !== zoneId) return [];
        return this.encounterDropCells(state, run, validEncounterCell(cell) ? cell : state.gridPlayer);
    }
    layEncounterRows(state, run, pending, cells) {
        pending.forEach((row, index) => {
            const at = cells[index % cells.length];
            if (groundLootKind(row) === 'currency') this.placeCurrency(state, run, at, row.currency, row.count);
            else this.lay(state, run, { ...row, ...at });
        });
    }
    dropEncounterBuffer(state, zoneId) {
        const owner = encounterRecord(state, zoneId);
        if (owner) { owner.pendingLoot = []; owner.lootPending = false; owner.bossLootCell = null; }
    }
    /** Live rewards return to the normal pickup boundary; restored states use restore-only storage rules. */
    discardEncounter(state, zoneId, live) {
        this.dropEncounterBuffer(state, zoneId);
        const run = state.actExploration;
        if (run?.zoneId !== zoneId) return [];
        const won = this.takeOnExit(run);
        if (live) return won;
        won.forEach(row => this.settleRow[groundLootKind(row)](state, row));
        return [];
    }
    /** Consume fully. A stale live encounter's earned floor must settle before the next owner's validation. */
    *normalizeEncounter(state, live) {
        const activeFloor = state.actExploration?.zoneId === state.currentZoneId ? rows(state.actExploration) : [];
        const protectedRows=state.actExploration?.bossLoot?.pendingLoot || [];
        const ids = new Set([...activeFloor,...protectedRows].filter(inventoryItem).map(row=>row.item.id).filter(Number.isSafeInteger));
        for (const zoneId of ENCOUNTER_ZONES) {
            const owner = encounterRecord(state, zoneId);
            if (!owner) continue;
            if (!owner.inRun || state.currentZoneId !== zoneId) { yield this.discardEncounter(state, zoneId, live); continue; }
            this.normalizePendingLoot(owner, ids);
        }
    }
    normalizePendingLoot(owner, ids) {
        if (owner.pendingLoot === undefined) owner.pendingLoot = [];
        if (!Array.isArray(owner.pendingLoot)) throw Error('잘못된 원정 보류 전리품');
        owner.pendingLoot = owner.pendingLoot.map(retireStarterGemRow);
        for (const row of owner.pendingLoot) {
            if (!this.validPendingRow(row)) throw Error('잘못된 원정 보류 전리품');
            const id = inventoryItem(row) ? row.item.id : null;
            if (Number.isSafeInteger(id) && ids.has(id)) throw Error('중복된 원정 보류 아이템');
            if (Number.isSafeInteger(id)) ids.add(id);
        }
        owner.lootPending = !!owner.lootPending;
        owner.bossLootCell = validEncounterCell(owner.bossLootCell) ? owner.bossLootCell : null;
    }
    reservedItems(state) {
        const held = ENCOUNTER_ZONES.flatMap(id => encounterRecord(state, id)?.pendingLoot || []);
        const boss=state.actExploration?.bossLoot?.pendingLoot || [];
        return [...rows(state.actExploration), ...boss, ...held].filter(inventoryItem).map(row => row.item);
    }
    settleOnLoad(state, run) {
        if (ENCOUNTER_ZONES.includes(run.zoneId)) this.dropEncounterBuffer(state, run.zoneId);
        for (const row of this.takeOnExit(run)) this.settleRow[groundLootKind(row)](state, row);
    }
    takeOnExit(run) {
        const all=rows(run).concat(run.bossLoot?.pendingLoot || []);
        delete run.bossLoot;
        run.groundLoot = [];
        return all;
    }
    validate(run,clock) {
        if (run.groundLoot === undefined) run.groundLoot = [];
        if (!Array.isArray(run.groundLoot)) throw Error('잘못된 탐험 바닥 아이템 저장');
        run.groundLoot = run.groundLoot.map(retireStarterGemRow);
        const map = this.deps.maps.forRun(run), ids = new Set();
        for (const row of run.groundLoot) {
            if (!this.validRow(map, row)) throw Error('잘못된 탐험 바닥 아이템 저장');
            if (['talisman', 'stump', 'leaf', 'yarn', 'rune'].includes(groundLootKind(row))) continue;
            const key = row.item ? `item:${row.item.id}` : `currency:${row.gx},${row.gy},${row.currency},${row.dropAt??''}`;
            if (ids.has(key)) throw Error('중복된 탐험 바닥 아이템 저장');
            ids.add(key);
        }
        this.restoreClock(run,clock);
        if (run.bossLoot) this.validateBoss(run,ids);
    }
    restoreClock(run,clock) {
        if (!Number.isFinite(clock)) return;
        let next=clock;
        for (const row of run.groundLoot) {
            if (row.dropAt===undefined) continue;
            if (!Number.isFinite(row.dropAt) || row.dropAt>clock+this.deps.timing.queueCapMs) delete row.dropAt;
            else next=Math.max(next,row.dropAt+this.deps.timing.gapMs);
        }
        this.queueEnds.set(run,next);
    }
    validateBoss(run,ids) {
        const cache=run.bossLoot;
        if (!run.packs.some(p=>partOfBossFight(p,cache)) || !Array.isArray(cache.pendingLoot))
            throw Error('잘못된 보스 전리품 저장');
        for (const row of cache.pendingLoot) {
            if (!this.validPendingRow(row)) throw Error('잘못된 보스 전리품');
            const key=inventoryItem(row) ? 'item:'+row.item.id : null;
            if (key && ids.has(key)) throw Error('중복된 보스 전리품');
            if (key) ids.add(key);
        }
    }
    validPendingRow(row) {
        const check = row && this.validKind[groundLootKind(row)];
        return !!check && check(row);
    }
    validRow(map, row) {
        if (!row || !Number.isInteger(row.gx) || !Number.isInteger(row.gy) || !this.deps.maps.walkable(map, row, true)) return false;
        const check = this.validKind[groundLootKind(row)];
        return !!check && check(row);
    }
}

export const createExplorationGroundLoot = deps => new ExplorationGroundLoot(deps);
