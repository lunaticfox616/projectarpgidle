/**
 * 가방의 장비 아닌 것(2026-10-10 사용자: "코어, 주얼, 기타 등 그루터기함에 들어가는 그루터기 아이템 제외하고는 가방에 같이 들어가있게"):
 * 주얼과 코어는 장비처럼 가방 칸(한 칸)에 들어간다. 주얼은 장비의 소켓에(js/equipment-sockets.js), 코어는 장비 칸 '코어'에 끼운다
 * (js/core-items.js). 가방에서는 slot('주얼', '코어')으로 가른다. 액막이(js/colony-wards.js)도 같은 가방의 한 칸짜리다.
 * 그루터기 함의 것(씨앗, 수액, 부적, 흉터)과 지도석은 그대로 제 보관함에 둔다. 예전 주얼 보관함과 코어 보관함은 불러올 때 옮긴다.
 */
const bagItems = (() => {
    const JEWEL = '주얼', CORE = '코어';
    const RARITIES = ['normal', 'magic', 'rare', 'unique'];
    const isJewel = item => !!item && item.slot === JEWEL;
    const isCore = item => !!item && item.slot === CORE;
    /** Jewels and cores keep their own shape: js/passives.js normalizeItem hands them to normalize below instead of treating
     * them as gear, and bulk salvage leaves them alone. */
    const ownShape = item => isJewel(item) || isCore(item);
    /** Not plain gear: crafting, the stall, the hall and the gear analysis leave these alone. */
    const isSpecial = item => ownShape(item) || (typeof colonyWards === 'object' && colonyWards.isWard(item));
    const asJewel = jewel => Object.assign(jewel, { slot: JEWEL, baseStats: jewel.baseStats || [], locked: !!jewel.locked });
    const asCore = core => Object.assign(core, { slot: CORE, rarity: core.rarity || 'rare', stats: core.stats || [], baseStats: core.baseStats || [],
        locked: !!core.locked });
    const jewels = (state = game) => (state.inventory || []).filter(isJewel);
    const cores = (state = game) => (state.inventory || []).filter(isCore);
    /** Picture in the bag grid (js/items.js getEquipmentGridVisualAsset); '' for gear. */
    const artOf = item => (isJewel(item) ? ITEM_VISUAL_ASSET_DB.jewel : isCore(item) ? coreItems.icon(item) : '');
    /** Picked up whatever the pickup filter and the rarity auto-salvage say: jewels and cores always (they never had a filter),
     * wards while their always-pick chip is on. */
    const keptOnPickup = item => ownShape(item) || colonyWards.keptOnPickup(item);

    /** Load boundary of a jewel or a core in the bag or a slot (the old jewel store's rule: lines from getJewelStats, at most four,
     * five when waxed). A broken one keeps its place with no lines rather than vanishing. Neither has requirements, so the load's
     * requirement grace (js/save-migrations.js markLegacyEquipmentGrace) never sticks to a worn core. */
    function normalize(item) {
        if (isCore(item)) Object.assign(item, coreItems.normalizeCore(item) || { lines: [] });
        else {
            const stats = getJewelStats(item), waxed = !!item.waxedByBeeswax || stats.some(stat => stat && stat.waxBonus);
            Object.assign(item, { rarity: RARITIES.includes(item.rarity) ? item.rarity : 'normal', waxedByBeeswax: waxed, stats: stats.slice(0, waxed ? 5 : 4),
                hiddenTier: Math.max(1, ...stats.map(stat => Math.floor(stat.tier || 1))) });
        }
        delete item.legacyRequirementGrace;
        if (!item.id) item.id = ++itemIdCounter;
        return isCore(item) ? asCore(item) : asJewel(item);
    }

    /** Puts the item into the bag at its first free place (the same way unequipping does). force: a full bag sends it to the
     * temporary storage instead, so it is never lost. @returns {boolean} */
    function put(item, state = game, force = false) {
        const result = equipmentInventoryGridRuntime.findAddPlacement(item, state);
        if (!result || !result.ok) {
            if (!force) return false;
            state.equipmentTemporaryStorage = [...(Array.isArray(state.equipmentTemporaryStorage) ? state.equipmentTemporaryStorage : []), item];
            return true;
        }
        const key = equipmentLoadoutRuntime.ensureItemIdentity(item);
        state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
        state.inventory.push(item);
        state.equipmentInventoryPlacements = { ...(state.equipmentInventoryPlacements || {}), [key]: result.placement };
        return true;
    }
    /** Takes this item out of the bag. @returns {boolean} false when it is no longer there */
    function take(item, state = game) {
        const index = (state.inventory || []).indexOf(item);
        if (index >= 0) state.inventory.splice(index, 1);
        return index >= 0;
    }

    /** A new jewel into the bag. With the bag full a rare or unique jewel waits in the temporary storage and the rest turn into
     * jewel shards (the old jewel store's rule). @returns {{ stored, protectOverflow, shardGain }} */
    function addJewel(jewel, state = game) {
        asJewel(jewel);
        if (put(jewel, state)) return noted(state, { stored: true, protectOverflow: false, shardGain: 0 });
        if (['rare', 'unique'].includes(jewel.rarity)) return noted(state, { stored: put(jewel, state, true), protectOverflow: true, shardGain: 0 });
        return { stored: false, protectOverflow: false, shardGain: salvageJewelObject(jewel, true) };
    }
    /** A new core into the bag; a full bag sends it to the temporary storage (cores are always kept). */
    const addCore = (core, state = game) => noted(state, put(asCore(core), state, true));
    /** Something new came in: the bag tab's notice dot. */
    function noted(state, result) {
        if (state.noti) state.noti.items = true;
        return result;
    }

    /** The equipped slots a jewel can go into: items with an empty socket, in paperdoll order. */
    function jewelSlots(state = game) {
        return Object.entries(state.equipment || {})
            .filter(([, item]) => item && !isSpecial(item) && equipmentSockets.list(item).some(row => !row.jewel)).map(([slot]) => slot);
    }
    /** js/items.js getEquipCandidateSlots for the special kinds: a jewel goes to worn items with an empty socket, a core to the
     * core slot (once cores are open), a ward to the open ward slots. null for plain gear. */
    function candidateSlots(item, state = game) {
        if (isJewel(item)) return jewelSlots(state);
        if (isCore(item)) return contentProgression.isUnlocked('cube', state) ? [CORE] : [];
        return colonyWards.isWard(item) ? colonyWards.openSlots(state) : null;
    }
    /** Sockets a bag jewel into the item in `slot` (or the first worn item with an empty socket). '' when done, otherwise why not. */
    function socketFromBag(jewel, slot, state = game) {
        const target = slot || jewelSlots(state)[0];
        const item = target ? (state.equipment || {})[target] : null;
        if (!item || isSpecial(item)) return '빈 소켓이 있는 장비가 없습니다.';
        const result = equipmentSockets.insert(item, jewel.id, state);
        return result.ok ? '' : result.reason;
    }

    /** Salvage rewards of the special kinds (js/passives.js getItemSalvageRewardProfile): jewels give jewel shards as before,
     * wards colony shards, cores nothing (a core was only ever thrown away). */
    function salvageProfile(item) {
        if (isJewel(item)) return { guaranteed: { jewelShard: getJewelSalvageShardGain(item) }, chances: [] };
        return isCore(item) ? { guaranteed: {}, chances: [] } : colonyWards.salvageProfile(item);
    }

    // ---------------------------------------------------------------- saves from before 2026-10-10
    /** The jewel store goes into the bag (past a full bag into the temporary storage); store expansions come back as the golden
     * rules they cost (1, 2, 3, ...). */
    function migrateJewels(state) {
        (Array.isArray(state.jewelInventory) ? state.jewelInventory : []).filter(jewel => jewel && typeof jewel === 'object')
            .forEach(jewel => put(asJewel(jewel), state, true));
        state.jewelInventory = [];
        const bought = Math.max(0, Math.floor(Number(state.jewelInventoryExpandLevel) || 0));
        if (bought && state.currencies) state.currencies.goldenRule = (Number(state.currencies.goldenRule) || 0) + bought * (bought + 1) / 2;
        state.jewelInventoryExpandLevel = 0;
    }
    /** The worn core goes into the equipment slot '코어' (into the bag when that slot is taken), the stored ones into the bag. */
    function migrateCores(state) {
        const store = state.cores && typeof state.cores === 'object' ? state.cores : {};
        const worn = coreItems.normalizeCore(store.equipped);
        if (worn && state.equipment[CORE]) put(asCore(worn), state, true);
        else if (worn) state.equipment[CORE] = asCore(worn);
        (Array.isArray(store.owned) ? store.owned : []).map(coreItems.normalizeCore).filter(Boolean).forEach(core => put(asCore(core), state, true));
        state.cores = coreItems.defaultState();
    }
    /** Both old stores into the bag and the slot. Twice is the same: the stores empty. */
    function migrate(state) {
        if (!state || !state.equipment) return;
        migrateJewels(state);
        migrateCores(state);
    }

    return Object.freeze({ JEWEL, CORE, isJewel, isCore, ownShape, isSpecial, asJewel, asCore, jewels, cores, artOf, keptOnPickup, normalize, put,
        take, addJewel, addCore, jewelSlots, candidateSlots, socketFromBag, salvageProfile, migrate });
})();
safeExposeGlobals({ bagItems });
