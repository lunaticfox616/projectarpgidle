// Bounded presentation receipts for committed combat rewards. Never grants or replays rewards.
// Inside an atlas map a drop counts when it is produced: committed at once, or laid on the floor (js/exploration-ground-loot.js)
// and picked up later outside the capture, so leftovers swept up on departure never reach the next map's result.
const combatLootReceipts = (() => {
    const HELD_ITEMS = 4;
    const MOMENT_RANK = Object.freeze({good:1,great:2,jackpot:3});
    const RARITIES = Object.freeze(['normal','magic','rare','unique']);
    let capturedState = null;
    function reset(state) {
        state.explorationLoot = {currencies:{},items:[],equipmentCount:0,leaves:{}};
    }
    /** Capture only synchronous loot production, excluding crafting, trade and unrelated side trips. */
    function capture(state, produce) {
        if (!state.atlas.run || state.currentZoneId !== ATLAS.zoneId) return produce();
        if (!state.explorationLoot) reset(state);
        const previous = capturedState;
        capturedState = state;
        try { return produce(); }
        finally { capturedState = previous; }
    }
    function currency(state, key, amount) {
        if (capturedState !== state || !ORB_DB[key] || !(amount > 0)) return;
        const receipt = state.explorationLoot;
        receipt.currencies[key] = (receipt.currencies[key] || 0) + amount;
    }
    const findRank = row => (MOMENT_RANK[row.moment] || 0) * 2 + Number(row.rarity === 'unique');
    /** Equipment is counted; a find (a discovery tier from js/loot.js lootMoments, or a rare or unique piece) keeps a row, best first. */
    function item(state, found, kind = 'equipment') {
        if (capturedState !== state) return;
        const receipt = state.explorationLoot;
        if (kind === 'equipment') receipt.equipmentCount++;
        const moment = lootMoments.ofItem(found, kind);
        if (!moment && !['rare','unique'].includes(found.rarity)) return;
        receipt.items.push({name:String(found.name),rarity:found.rarity,slot:kind === 'jewel' ? '주얼' : String(found.slot),moment,
            fresh:lootMoments.isNewUnique(found)});
        receipt.items.sort((a,b) => findRank(b) - findRank(a));
        receipt.items.length = Math.min(HELD_ITEMS,receipt.items.length);
    }
    /** A memory leaf (js/atlas-finds.js). */
    function leaf(state, id) {
        if (capturedState !== state) return;
        const leaves = state.explorationLoot.leaves;
        leaves[id] = (leaves[id] || 0) + 1;
    }
    /** A row laid on the floor during the capture. Wild talismans and cores are not listed. */
    function floorRow(state, row) {
        if (row.kind === 'leaf') leaf(state, row.leaf);
        else if (!row.kind || row.kind === 'jewel') item(state, row.item, row.kind || 'equipment');
    }
    function normalize(state) {
        const raw = state.explorationLoot;
        if (!raw || typeof raw !== 'object') { state.explorationLoot = null; return; }
        reset(state);
        const receipt = state.explorationLoot;
        for (const key of Object.keys(ORB_DB)) {
            const value = raw.currencies?.[key];
            if (Number.isFinite(value) && value > 0) receipt.currencies[key] = value;
        }
        receipt.items = cleanItems(raw.items);
        receipt.leaves = cleanLeaves(raw.leaves);
        receipt.equipmentCount = Math.max(receipt.items.length,Math.floor(Number(raw.equipmentCount) || 0));
        if (!Number.isFinite(receipt.equipmentCount)) receipt.equipmentCount = receipt.items.length;
    }
    /** Saved find rows (also kept with the atlas map result, js/atlas.js): a known rarity and tier, bounded text. */
    function cleanItems(raw) {
        return (Array.isArray(raw) ? raw : []).filter(validItem).slice(0,HELD_ITEMS)
            .map(({name,rarity,slot,moment,fresh}) => ({name:name.slice(0,100),rarity,slot:slot.slice(0,30),moment:Object.hasOwn(MOMENT_RANK,moment) ? moment : null,
                fresh:fresh === true}));
    }
    function cleanLeaves(raw) {
        const leaves = {};
        for (const [id,value] of Object.entries(raw && typeof raw === 'object' ? raw : {})) {
            const count = Math.floor(Number(value));
            if (memoryLeaves.validId(id) && count > 0) leaves[id] = Math.min(MEMORY_LEAVES.countCap,count);
        }
        return leaves;
    }
    function validItem(row) {
        return row && typeof row.name === 'string' && typeof row.slot === 'string' && RARITIES.includes(row.rarity);
    }
    return {reset,capture,currency,item,leaf,floorRow,normalize,cleanItems,cleanLeaves};
})();
safeExposeGlobals({combatLootReceipts});
