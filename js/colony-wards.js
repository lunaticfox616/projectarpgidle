/**
 * 액막이 규칙(data/colony-wards.js): 가방의 한 칸짜리 장비, 액막이 칸 수, 끼운 액막이의 줄, 드랍(군락지 웨이브, 모든 지도의 처치),
 * 편린으로 만들기, 해체 보상, 예전 저장(군락지 보관함과 칸)의 이관. 능력치는 js/combat.js colonyWardBonus가 equippedLines를 더한다
 * (일반 장비 합산에서는 빠진다, js/equipment-stat-resolution.js). 화면은 js/colony-wards-ui.js.
 */
const colonyWards = (() => {
    const R = COLONY_WARD_RULES;
    const POOL = new Map(COLONY_WARD_POOL.map(row => [row.id, row]));
    const isWard = item => !!item && item.slot === R.slot;
    /** 줍기 필터의 항상 줍기 '액막이'(기본 켬)가 켜져 있으면 줍기 필터와 등급 자동 해체를 건너뛴다(마법 등급은 이름뿐이라). */
    const keptOnPickup = item => isWard(item) && !!game.settings && (game.settings.itemFilterAlways || {}).ward !== false;
    const unlocked = (state = game) => typeof contentProgression === 'object' && contentProgression.isUnlocked(R.unlock, state);

    /** 액막이 칸 수: 기본 1, 허리띠 +2, 초월 공허 '액막이 매듭' 하나마다 +1, 가디언 '수호 재생' +1, 고유 '천 개의 유리병' +1. 5칸까지. */
    function slotCount(state = game) {
        const equipment = state.equipment || {};
        const extra = [equipment['허리띠'] ? R.beltSlots : 0,
            typeof getTranscendentVoidPassiveCount === 'function' ? getTranscendentVoidPassiveCount(R.voidPassive, state) : 0,
            typeof hasKeystone === 'function' && hasKeystone(R.ascendNode, state) ? 1 : 0,
            Object.values(equipment).some(item => item && item.uniqueEffectKey === R.uniqueEffectKey) ? 1 : 0];
        return Math.max(1, Math.min(R.maxSlots, R.baseSlots + extra.reduce((sum, value) => sum + value, 0)));
    }
    /** The open ward slots ('액막이1'..): a ward left beyond them (the belt came off) waits there, off. */
    const openSlots = (state = game) => R.slots.slice(0, slotCount(state));
    /** Where a ward goes: the first open empty slot, else the first one (a full set swaps it). */
    function pickSlot(state = game) {
        const open = openSlots(state);
        return open.find(slot => !(state.equipment || {})[slot]) || open[0];
    }
    /** Lines of the wards in the open slots, as js/combat.js colonyWardBonus adds them: [{ stat, val }]. */
    function equippedLines(state = game) {
        return openSlots(state).map(slot => (state.equipment || {})[slot]).filter(isWard)
            .flatMap(item => (item.baseStats || []).map(line => ({ stat: line.id, val: Number(line.val) || 0 })));
    }

    function makeItem(row, val, tier, locked) {
        itemIdCounter += 1;
        const item = { id: itemIdCounter, slot: R.slot, baseId: R.baseId, baseName: R.name, name: R.name, rarity: 'magic',
            itemTier: Math.max(1, Math.min(20, Math.floor(Number(tier) || 1))), locked: !!locked,
            baseStats: [{ id: row.id, val, statName: row.name, valMin: row.min, valMax: row.max }], stats: [] };
        if (typeof normalizeItem === 'function') normalizeItem(item);
        return item;
    }
    /** A new ward: one line from the pool, rolled in its range. */
    function create(random = Math.random, tier = 1) {
        const row = COLONY_WARD_POOL[Math.floor(random() * COLONY_WARD_POOL.length)];
        return makeItem(row, row.min + Math.floor(random() * (row.max - row.min + 1)), tier);
    }

    // ---------------------------------------------------------------- where wards come from
    /** A kill anywhere but the colony (once the colony is open): now and then a ward, through the normal floor and pickup. */
    function rollFieldDrop(enemy, zone, random = Math.random) {
        if (!enemy || !zone || zone.id === R.colonyZoneId || !unlocked()) return [];
        const chance = enemy.isBoss ? R.field.boss : enemy.isElite ? R.field.elite : R.field.normal;
        if (random() >= chance) return [];
        const item = create(random, zone.tier);
        return keepEquipmentDrop(enemy, item) === 'kept' ? [item] : [];
    }
    /** A cleared colony wave: every fifth wave, and the others now and then, a ward straight into the bag. */
    function rollColonyWave(wave, zone, random = Math.random) {
        if (wave % R.colonyWave.every !== 0 && random() >= R.colonyWave.chance) return null;
        const item = create(random, zone && zone.tier);
        return addItemToInventory(item, { ignoreFilter: true }) ? item : null;
    }
    /** 군락지 편린으로 만들기: craftCost개를 내고 새 액막이 하나를 가방에. '' when done, otherwise why not. */
    function craft(state = game, random = Math.random) {
        if (!unlocked(state)) return '군락지가 열리면 만들 수 있습니다.';
        if ((Number(state.currencies.colonyShard) || 0) < R.craftCost) return `군락지 편린이 부족합니다(${R.craftCost}개 필요).`;
        const item = create(random, 1);
        if (!addItemToInventory(item, { ignoreFilter: true, ignoreAutoSalvage: true })) return '가방에 자리가 없습니다.';
        state.currencies.colonyShard -= R.craftCost;
        return '';
    }
    const salvageShards = item => {
        const value = Math.abs(Number(((item && item.baseStats) || [])[0]?.val) || 0);
        return Math.max(R.shards.base, Math.min(R.shards.max, R.shards.base + Math.floor(value / R.shards.per)));
    };
    /** The salvage reward profile of a ward (js/passives.js getItemSalvageRewardProfile): colony shards only. */
    const salvageProfile = item => ({ guaranteed: { colonyShard: salvageShards(item) }, chances: [] });

    // ---------------------------------------------------------------- saves from before 2026-10-10
    /** An old colony ward ({ stat, val, locked }) as a bag item; unknown lines are dropped. */
    function fromLegacy(ward) {
        const row = ward && typeof ward === 'object' ? POOL.get(ward.stat) : null;
        if (!row) return null;
        return makeItem(row, Math.max(row.min, Math.min(row.max, Math.round(Number(ward.val) || row.min))), 1, ward.locked);
    }
    function refundSlots(state, bought) {
        for (let slot = 2; slot <= Math.min(4, Math.floor(Number(bought) || 1)); slot++) {
            Object.entries(R.legacySlotCosts[slot] || {}).forEach(([key, amount]) => {
                state.currencies[key] = (Number(state.currencies[key]) || 0) + amount;
            });
        }
    }
    /** The colony's ward store goes into the bag and its ward slots into the ward slots of the equipment, in order; slots bought
     * with colony shards come back as shards (and the trace). Twice is the same: the old store is emptied. */
    function migrate(state) {
        const colony = state && state.colony;
        if (!colony || typeof colony !== 'object' || !state.equipment) return;
        const equipped = (Array.isArray(colony.wardEquipped) ? colony.wardEquipped : []).map(fromLegacy);
        const stored = (Array.isArray(colony.wardInventory) ? colony.wardInventory : []).map(fromLegacy).filter(Boolean);
        equipped.forEach((item, index) => {
            if (!item) return;
            if (!state.equipment[R.slots[index]]) state.equipment[R.slots[index]] = item;
            else stored.push(item);
        });
        if (stored.length) state.inventory = [...(Array.isArray(state.inventory) ? state.inventory : []), ...stored];
        if (state.currencies) refundSlots(state, colony.wardSlots);
        Object.assign(colony, { wardInventory: [], wardEquipped: [null, null, null, null], wardSlots: 1 });
    }

    return Object.freeze({ isWard, keptOnPickup, unlocked, slotCount, openSlots, pickSlot, equippedLines, create, rollFieldDrop, rollColonyWave, craft,
        salvageShards, salvageProfile, migrate });
})();
safeExposeGlobals({ colonyWards });
