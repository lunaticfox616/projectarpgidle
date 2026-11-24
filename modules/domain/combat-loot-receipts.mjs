// A bounded record of produced rewards. Recording never grants or replays a reward.
const HELD_ITEMS = 4;
const MOMENT_RANK = Object.freeze({ good: 1, great: 2, jackpot: 3 });
const RARITIES = Object.freeze(['normal', 'magic', 'rare', 'unique']);
const findRank = row => (MOMENT_RANK[row.moment] || 0) * 2 + Number(row.rarity === 'unique');
const validItem = row => row && typeof row.name === 'string' && typeof row.slot === 'string' && RARITIES.includes(row.rarity);

class CombatLootReceipts {
    constructor(deps) { this.deps = deps; this.capturedState = null; }
    reset(state) { state.explorationLoot = { currencies: {}, items: [], equipmentCount: 0, leaves: {}, yarns: {} }; }
    /** Synchronous captures may nest; restore the outer owner even if production throws. */
    capture(state, produce) {
        if (!state.atlas.run || state.currentZoneId !== this.deps.atlasZoneId) return produce();
        if (!state.explorationLoot) this.reset(state);
        const previous = this.capturedState;
        this.capturedState = state;
        try { return produce(); }
        finally { this.capturedState = previous; }
    }
    /** Inside an open capture: records produce() in a receipt of its own (a map's 장비 상자 on the result card), then adds that receipt
     * to the open one, so the map's receipt still holds everything. @returns {object|null} the separate receipt, null outside a capture */
    captureApart(state, produce) {
        if (this.capturedState !== state) { produce(); return null; }
        const outer = state.explorationLoot;
        this.reset(state);
        const part = state.explorationLoot;
        try { produce(); }
        finally {
            state.explorationLoot = outer;
            this.fold(outer, part);
        }
        return part;
    }
    fold(outer, part) {
        const add = (into, from) => { for (const [key, n] of Object.entries(from)) into[key] = (into[key] || 0) + n; };
        add(outer.currencies, part.currencies);
        add(outer.leaves, part.leaves);
        add(outer.yarns, part.yarns);
        outer.equipmentCount += part.equipmentCount;
        outer.items.push(...part.items);
        outer.items.sort((a, b) => findRank(b) - findRank(a));
        outer.items.length = Math.min(HELD_ITEMS, outer.items.length);
    }
    currency(state, key, amount) {
        if (this.capturedState !== state || !this.deps.currencies[key] || !(amount > 0)) return;
        const receipt = state.explorationLoot;
        receipt.currencies[key] = (receipt.currencies[key] || 0) + amount;
    }
    item(state, found, kind = 'equipment') {
        if (this.capturedState !== state) return;
        const receipt = state.explorationLoot;
        if (kind === 'equipment') receipt.equipmentCount++;
        const moment = this.deps.moments.ofItem(found, kind);
        if (!moment && !['rare', 'unique'].includes(found.rarity)) return;
        receipt.items.push({ name: String(found.name), rarity: found.rarity, slot: kind === 'jewel' ? '주얼' : String(found.slot), moment,
            fresh: this.deps.moments.isNewUnique(found) });
        receipt.items.sort((a, b) => findRank(b) - findRank(a));
        receipt.items.length = Math.min(HELD_ITEMS, receipt.items.length);
    }
    leaf(state, id) {
        if (this.capturedState !== state) return;
        const leaves = state.explorationLoot.leaves;
        leaves[id] = (leaves[id] || 0) + 1;
    }
    yarn(state, id) {
        if (this.capturedState !== state) return;
        const yarns = state.explorationLoot.yarns;
        yarns[id] = (yarns[id] || 0) + 1;
    }
    floorRow(state, row) {
        if (row.kind === 'yarn') this.yarn(state, row.yarn);
        else if (row.kind === 'leaf') this.leaf(state, row.leaf);
        else if (!row.kind || row.kind === 'jewel') this.item(state, row.item, row.kind || 'equipment');
    }
    normalize(state) {
        const raw = state.explorationLoot;
        if (!raw || typeof raw !== 'object') { state.explorationLoot = null; return; }
        this.reset(state);
        const receipt = state.explorationLoot;
        for (const key of Object.keys(this.deps.currencies)) {
            const value = raw.currencies?.[key];
            if (Number.isFinite(value) && value > 0) receipt.currencies[key] = value;
        }
        receipt.items = this.cleanItems(raw.items);
        receipt.leaves = this.cleanLeaves(raw.leaves);
        receipt.yarns = this.cleanYarns(raw.yarns);
        receipt.equipmentCount = Math.max(receipt.items.length, Math.floor(Number(raw.equipmentCount) || 0));
        if (!Number.isFinite(receipt.equipmentCount)) receipt.equipmentCount = receipt.items.length;
    }
    cleanItems(raw) {
        return (Array.isArray(raw) ? raw : []).filter(validItem).slice(0, HELD_ITEMS)
            .map(({ name, rarity, slot, moment, fresh }) => ({ name: name.slice(0, 100), rarity, slot: slot.slice(0, 30),
                moment: Object.hasOwn(MOMENT_RANK, moment) ? moment : null, fresh: fresh === true }));
    }
    cleanLeaves(raw) {
        const leaves = {};
        for (const [id, value] of Object.entries(raw && typeof raw === 'object' ? raw : {})) {
            const count = Math.floor(Number(value));
            if (this.deps.memoryLeaves.validId(id) && count > 0) leaves[id] = Math.min(this.deps.leafCap, count);
        }
        return leaves;
    }
    cleanYarns(raw) {
        return Object.fromEntries(Object.entries(raw && typeof raw === 'object' ? raw : {})
            .filter(([id, n]) => this.deps.knitting.validId(id) && Number.isFinite(n) && n > 0)
            .map(([id, n]) => [id, Math.min(this.deps.yarnCap, Math.floor(n))]));
    }
}

export function createCombatLootReceipts(deps) {
    const receipts = new CombatLootReceipts(deps);
    return Object.fromEntries(['reset', 'capture', 'captureApart', 'currency', 'item', 'leaf', 'yarn', 'floorRow', 'normalize', 'cleanItems', 'cleanLeaves', 'cleanYarns']
        .map(name => [name, receipts[name].bind(receipts)]));
}
