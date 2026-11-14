const distance = (a, b) => Math.max(Math.abs(a.gx - b.gx), Math.abs(a.gy - b.gy));
const cellOf = row => `${row.gx},${row.gy}`;
const rows = run => run && Array.isArray(run.groundLoot) ? run.groundLoot : [];
const floor = run => Array.isArray(run.groundLoot) ? run.groundLoot : (run.groundLoot = []);
export const groundLootKind = row => row.kind || (typeof row.currency === 'string' ? 'currency' : 'equipment');
const ENCOUNTER_ZONES = ['colony_run', 'grand_breach_run'];
const encounterRecord = (state, zoneId) => zoneId === 'colony_run' ? state.colony : zoneId === 'grand_breach_run' ? state.voidRift?.grandRun : null;
const validEncounterCell = cell => Number.isSafeInteger(cell?.gx) && cell.gx >= 0 && Number.isSafeInteger(cell?.gy) && cell.gy >= 0;

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

/** One instance owns non-saved landing clocks. Domain dependencies and the combat clock are supplied at creation.
 * Mutating methods receive their state explicitly. UI pickup/FX remain with the caller. */
class ExplorationGroundLoot {
    constructor(deps) {
        this.deps = deps;
        this.laidAt = new WeakMap();
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
    landed(row, now) { return !this.laidAt.has(row) || now - this.laidAt.get(row) >= this.deps.timing.readyMs; }
    touchedDown(row, now) { return !this.laidAt.has(row) || now - this.laidAt.get(row) >= this.deps.timing.flightMs; }
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
        Object.assign(row, this.clearOfDoors(run, row));
        floor(run).push(row);
        this.laidAt.set(row, this.dropTurn(run));
        this.deps.receipts.floorRow(state, row);
    }
    place(state, run, cell, item, { highlight = false, guaranteed = false } = {}) {
        this.lay(state, run, { gx: cell.gx, gy: cell.gy, item, highlight: !!highlight, guaranteed: !!guaranteed });
    }
    placeItem(state, run, cell, kind, { item, overflow }) {
        this.lay(state, run, kind === 'talisman' ? { gx: cell.gx, gy: cell.gy, kind, item, overflow } : { gx: cell.gx, gy: cell.gy, kind, item });
    }
    placeLeaf(state, run, cell, leaf) { this.lay(state, run, { gx: cell.gx, gy: cell.gy, kind: 'leaf', leaf }); }
    placeYarn(state, run, cell, yarn) { this.lay(state, run, { gx: cell.gx, gy: cell.gy, kind: 'yarn', yarn }); }
    placeRune(state, run, cell, gem) { this.lay(state, run, { gx: cell.gx, gy: cell.gy, kind: 'rune', gem }); }
    placeCurrency(state, run, at, currency, count) {
        this.deps.receipts.currency(state, currency, count);
        const cell = this.clearOfDoors(run, at);
        const row = floor(run).find(other => other.currency === currency && other.gx === cell.gx && other.gy === cell.gy);
        if (row) { row.count += count; return; }
        const fresh = { gx: cell.gx, gy: cell.gy, currency, count };
        run.groundLoot.push(fresh);
        this.laidAt.set(fresh, this.dropTurn(run));
    }
    take(run, test) {
        const taken = rows(run).filter(test);
        if (taken.length) run.groundLoot = rows(run).filter(row => !taken.includes(row));
        return taken;
    }
    takeNear(run, cell, now, range) {
        const here = rows(run).filter(row => distance(row, cell) <= range);
        return here.length && here.every(row => this.landed(row, now)) ? this.take(run, row => here.includes(row)) : [];
    }
    takeAt(run, cell) { return this.take(run, row => row.gx === cell.gx && row.gy === cell.gy); }
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
    inAir(run, now) { return rows(run).filter(row => this.laidAt.get(row) <= now && !this.touchedDown(row, now)); }
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
        return owner?.inRun ? owner : null;
    }
    reserve(state, row) {
        const owner = this.encounterOwner(state);
        if (!owner) return false;
        const held = row && groundLootKind(row) === 'equipment' ? { highlight: false, guaranteed: false, ...row } : row;
        if (!this.validPendingRow(held)) throw Error('잘못된 원정 보류 전리품');
        if (!Array.isArray(owner.pendingLoot)) owner.pendingLoot = [];
        owner.pendingLoot.push({ ...held });
        return true;
    }
    encounterDropCells(state, run, cell) {
        if (!Number.isInteger(cell?.gx) || !Number.isInteger(cell?.gy)) return [];
        const { maps, rooms } = this.deps, map = maps.forRun(run);
        if (!map) return [];
        const room = map.rooms ? rooms.roomAt(map, cell) : null;
        const reachable = next => maps.walkable(map, next, true) && (!room || rooms.roomAt(map, next) === room)
            && (!state.gridPlayer || distance(next, state.gridPlayer) > 0) && (!map.doors || !underDoorSeal(map, next))
            && (!state.gridPlayer || maps.route(map, state.gridPlayer, next).length > 0);
        return [1, 2, 3, 4].flatMap(reach => ringCells(cell, reach).filter(reachable));
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
        const won = rows(run);
        run.groundLoot = [];
        if (live) return won;
        won.forEach(row => this.settleRow[groundLootKind(row)](state, row));
        return [];
    }
    /** Consume fully. A stale live encounter's earned floor must settle before the next owner's validation. */
    *normalizeEncounter(state, live) {
        const activeFloor = state.actExploration?.zoneId === state.currentZoneId ? rows(state.actExploration) : [];
        const ids = new Set(activeFloor.map(row => row?.item?.id).filter(Number.isSafeInteger));
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
            const id = row.item?.id;
            if (Number.isSafeInteger(id) && ids.has(id)) throw Error('중복된 원정 보류 아이템');
            if (Number.isSafeInteger(id)) ids.add(id);
        }
        owner.lootPending = !!owner.lootPending;
        owner.bossLootCell = validEncounterCell(owner.bossLootCell) ? owner.bossLootCell : null;
    }
    reservedItems(state) {
        const held = ENCOUNTER_ZONES.flatMap(id => encounterRecord(state, id)?.pendingLoot || []);
        return [...rows(state.actExploration), ...held].filter(row => row.item && row.kind !== 'talisman' && row.kind !== 'stump').map(row => row.item);
    }
    settleOnLoad(state, run) {
        if (ENCOUNTER_ZONES.includes(run.zoneId)) this.dropEncounterBuffer(state, run.zoneId);
        for (const row of rows(run)) this.settleRow[groundLootKind(row)](state, row);
        run.groundLoot = [];
    }
    validate(run) {
        if (run.groundLoot === undefined) run.groundLoot = [];
        if (!Array.isArray(run.groundLoot)) throw Error('잘못된 탐험 바닥 아이템 저장');
        run.groundLoot = run.groundLoot.map(retireStarterGemRow);
        const map = this.deps.maps.forRun(run), ids = new Set();
        for (const row of run.groundLoot) {
            if (!this.validRow(map, row)) throw Error('잘못된 탐험 바닥 아이템 저장');
            if (['talisman', 'stump', 'leaf', 'yarn', 'rune'].includes(groundLootKind(row))) continue;
            const key = row.item ? `item:${row.item.id}` : `currency:${row.gx},${row.gy},${row.currency}`;
            if (ids.has(key)) throw Error('중복된 탐험 바닥 아이템 저장');
            ids.add(key);
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
