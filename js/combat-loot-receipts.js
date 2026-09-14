// Bounded presentation receipts for committed combat rewards. Never grants or replays rewards.
const combatLootReceipts = (() => {
    let capturedState = null;
    function reset(state) {
        state.explorationLoot = {currencies:{},items:[],equipmentCount:0};
    }
    /** Capture only synchronous loot production, excluding crafting, trade and unrelated side trips. */
    function capture(state, produce) {
        if (!state.worldTreeJourney.active) return produce();
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
    function item(state, equipment) {
        if (capturedState !== state) return;
        const receipt = state.explorationLoot;
        receipt.equipmentCount++;
        if (!['rare','unique'].includes(equipment.rarity)) return;
        const row = {id:equipment.id,name:equipment.name,rarity:equipment.rarity,slot:equipment.slot};
        receipt.items.push(row);
        receipt.items.sort((a,b) => Number(b.rarity === 'unique') - Number(a.rarity === 'unique'));
        receipt.items.length = Math.min(3,receipt.items.length);
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
        receipt.items = (Array.isArray(raw.items) ? raw.items : []).filter(validItem).slice(0,3)
            .map(({id,name,rarity,slot}) => ({id,name:name.slice(0,100),rarity,slot:slot.slice(0,30)}));
        receipt.equipmentCount = Math.max(receipt.items.length,Math.floor(Number(raw.equipmentCount) || 0));
        if (!Number.isFinite(receipt.equipmentCount)) receipt.equipmentCount = receipt.items.length;
    }
    function validItem(row) {
        return row && Number.isSafeInteger(row.id) && typeof row.name === 'string'
            && typeof row.slot === 'string' && ['rare','unique'].includes(row.rarity);
    }
    return {reset,capture,currency,item,normalize};
})();
safeExposeGlobals({combatLootReceipts});
