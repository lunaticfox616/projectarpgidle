/**
 * 액막이 규칙(data/colony-wards.js): 가방의 한 칸짜리 장비, 액막이 칸 수, 끼운 액막이의 줄, 드랍(군락지 웨이브, 모든 지도의 처치),
 * 편린으로 만들기, 해체 보상, 예전 저장(군락지 보관함과 칸)의 이관. 능력치는 js/combat.js colonyWardBonus가 equippedLines를 더한다
 * (일반 장비 합산에서는 빠진다, js/equipment-stat-resolution.js). 화면은 js/colony-wards-ui.js.
 */
const colonyWards = (() => {
    const R = COLONY_WARD_RULES;
    const POOL = new Map(COLONY_WARD_POOL.map(row => [row.id, row]));
    const U = COLONY_WARD_UNIQUES;
    const isWard = item => !!item && item.slot === R.slot;
    /** 줍기 필터의 항상 줍기 '액막이'(기본 켬)가 켜져 있으면 줍기 필터와 등급 자동 해체를 건너뛴다(마법 등급은 이름뿐이라). */
    const keptOnPickup = item => isWard(item) && !!game.settings && (game.settings.itemFilterAlways || {}).ward !== false;
    const unlocked = (state = game) => typeof contentProgression === 'object' && contentProgression.isUnlocked(R.unlock, state);

    // ---------------------------------------------------------------- 허리띠의 액막이 칸
    const isBelt = item => !!item && item.slot === '허리띠';
    /** 허리띠 하나의 액막이 칸 수(1~3): 아이템에 wardSlotRoll로 적혀 있다. 아직 안 적힌 허리띠(2026-10-11 전의 저장, 막 만든 장비)는
     * 제 id에서 나온 값이라 몇 번을 불러와도, 어디서 읽어도 같다. 허리띠가 아니면 0. */
    function beltSlots(item) {
        if (!isBelt(item)) return 0;
        const { min, max } = R.beltSlots, stored = Math.floor(Number(item.wardSlotRoll));
        if (stored >= min && stored <= max) return stored;
        return min + hashSeed(`ward-belt:${item.id === undefined ? item.name : item.id}`) % (max - min + 1);
    }
    /** js/passives.js normalizeItem: 허리띠에 제 칸 수를 적어 둔다(거래와 복사에도 따라간다). */
    function stampBelt(item) {
        if (isBelt(item)) item.wardSlotRoll = beltSlots(item);
        return item;
    }
    /** 축복의 꽃잎(js/passives.js useCurrency): 허리띠의 칸 수를 1~3에서 고르게 다시 굴린다. 허리띠가 아니면 그대로 두고 0. */
    function rerollBelt(item, random = Math.random) {
        if (!isBelt(item)) return 0;
        const { min, max } = R.beltSlots;
        item.wardSlotRoll = min + Math.floor(random() * (max - min + 1));
        return item.wardSlotRoll;
    }
    /** 허리띠 카드에 적는 칸 수(게임 툴팁과 프로필 카드): 허리띠가 아니거나 군락지가 아직 안 열렸으면 undefined. */
    const beltRoll = (item, state = game) => isBelt(item) && unlocked(state) ? beltSlots(item) : undefined;

    /** 체이싱 고유 허리띠 '편린을 꿴 허리띠'(R.stringEffectKey): 더하는 칸 수와 끼운 액막이 줄의 배수. 안 꼈으면 { slots: 0, mul: 1 }. */
    function wardString(equipment) {
        const item = Object.values(equipment || {}).find(entry => entry && entry.rarity === 'unique' && entry.uniqueEffectKey === R.stringEffectKey);
        const p = item ? item.uniqueEffectParams || {} : {};
        return { slots: Math.max(0, Math.floor(Number(p.slots) || 0)), mul: Math.max(1, Number(p.mul) || 1) };
    }
    /** 액막이 칸 수: 기본 0, 낀 허리띠의 칸 수(1~3), 초월 공허 '액막이 매듭' 하나마다 +1, 가디언 '수호 재생' +1, 고유 '천 개의 유리병' +1,
     * '편린을 꿴 허리띠' +2. 5칸까지. */
    function slotCount(state = game) {
        const equipment = state.equipment || {};
        const extra = [beltSlots(equipment['허리띠']),
            typeof getTranscendentVoidPassiveCount === 'function' ? getTranscendentVoidPassiveCount(R.voidPassive, state) : 0,
            typeof hasKeystone === 'function' && hasKeystone(R.ascendNode, state) ? 1 : 0,
            Object.values(equipment).some(item => item && item.uniqueEffectKey === R.uniqueEffectKey) ? 1 : 0, wardString(equipment).slots];
        return Math.max(0, Math.min(R.maxSlots, R.baseSlots + extra.reduce((sum, value) => sum + value, 0)));
    }
    /** 장비창의 바꾸면 표(js/equipment-window-ui.js wardRows): `item`을 `slot`에 끼우면 달라지는 액막이 칸 수. 그대로면 null.
     * @returns {{ from: number, to: number } | null} */
    function slotChange(item, slot, state = game) {
        const from = slotCount(state), to = slotCount({ ...state, equipment: { ...(state.equipment || {}), [slot]: item } });
        return from === to ? null : { from, to };
    }
    /** The open ward slots ('액막이1'..): a ward left beyond them (the belt came off) waits there, off. */
    const openSlots = (state = game) => R.slots.slice(0, slotCount(state));
    /** Where a ward goes: the first open empty slot, else the first one (a full set swaps it). undefined with no open slot. */
    function pickSlot(state = game) {
        const open = openSlots(state);
        return open.find(slot => !(state.equipment || {})[slot]) || open[0];
    }
    const openWards = (state = game) => openSlots(state).map(slot => (state.equipment || {})[slot]).filter(isWard);
    /** A 고유 액막이's (U.rows) param `name` when `item` is that one, else 0. */
    const uniqueParam = (item, key, name) => (item.rarity === 'unique' && item.uniqueEffectKey === key ? Number((item.uniqueEffectParams || {})[name]) || 0 : 0);
    /** Lines of the wards in the open slots, as js/combat.js colonyWardBonus adds them: [{ stat, val }]. '편린을 꿴 허리띠' adds +100%
     * (its mul - 1) and each 메아리 매듭 its pct, all added up (2026-10-20 사용자: belt and one echo ×2.5, two ×3); the echo has no line of
     * its own, so only the other wards grow. */
    function equippedLines(state = game) {
        const wards = openWards(state);
        const mul = wardString(state.equipment).mul + wards.reduce((sum, item) => sum + uniqueParam(item, 'wardEcho', 'pct'), 0) / 100;
        return wards.flatMap(item => (item.baseStats || []).map(line => ({ stat: line.id, val: (Number(line.val) || 0) * mul })));
    }
    /** 잔잔한 사건의 확률 배수(js/combat-incidents.js often): 열린 칸에 '사건을 부르는 방울'이 있으면 그 mul(겹치지 않는다), 아니면 1. */
    const incidentMul = (state = game) => Math.max(1, ...openWards(state).map(item => uniqueParam(item, 'incidentBell', 'mul')));

    /** A ward item with one line (row) or none (a 고유 액막이 without a line); `unique` holds a 고유 액막이's name and effect. */
    function makeItem(row, val, tier, locked, unique = null) {
        itemIdCounter += 1;
        const item = { id: itemIdCounter, slot: R.slot, baseId: R.baseId, baseName: R.name, name: R.name, rarity: 'magic',
            itemTier: Math.max(1, Math.min(20, Math.floor(Number(tier) || 1))), locked: !!locked,
            baseStats: row ? [{ id: row.id, val, statName: row.name, valMin: row.min, valMax: row.max }] : [], stats: [], ...unique };
        if (typeof normalizeItem === 'function') normalizeItem(item);
        return item;
    }
    /** A new ward: one line from the pool, rolled in its range. */
    function create(random = Math.random, tier = 1, rollFloor = 0) {
        const row = COLONY_WARD_POOL[Math.floor(random() * COLONY_WARD_POOL.length)];
        const min = row.min + Math.ceil((row.max - row.min) * rollFloor);
        return makeItem(row, min + Math.floor(random() * (row.max - min + 1)), tier);
    }

    /** A 고유 액막이 (U.rows, `key` or one at random): a chase unique; 두 번 맨 매듭 rolls one pool line past the usual range. */
    function createUnique(random = Math.random, tier = 1, key = '') {
        const row = U.rows.find(entry => entry.key === key) || U.rows[Math.floor(random() * U.rows.length)];
        const unique = { name: row.name, rarity: 'unique', chaseUnique: true, uniqueEffect: row.text, uniqueEffectKey: row.key, uniqueEffectParams: { ...row.params } };
        if (row.key !== 'doubleKnot') return makeItem(null, 0, tier, false, unique);
        const line = COLONY_WARD_POOL[Math.floor(random() * COLONY_WARD_POOL.length)];
        const min = Math.round(line.max * row.params.min), max = Math.round(line.max * row.params.max);
        return makeItem({ ...line, min, max }, min + Math.floor(random() * (max - min + 1)), tier, false, unique);
    }
    /** A ward that drops (colony waves, kills): now and then (U.chance) a 고유 액막이 instead. Crafting makes plain ones only. */
    const createDrop = (random, tier, rollFloor = 0) => (random() < U.chance ? createUnique(random, tier) : create(random, tier, rollFloor));

    // ---------------------------------------------------------------- where wards come from
    /** A kill anywhere but the colony (once the colony is open): now and then a ward, through the normal floor and pickup. */
    function rollFieldDrop(enemy, zone, random = Math.random) {
        if (!enemy || !zone || zone.id === R.colonyZoneId || !unlocked()) return [];
        const chance = enemy.isBoss ? R.field.boss : enemy.isElite ? R.field.elite : R.field.normal;
        if (random() >= chance) return [];
        const item = createDrop(random, zone.tier);
        return keepEquipmentDrop(enemy, item) === 'kept' ? [item] : [];
    }
    /** A cleared colony wave reserves a ward for its boss payout; non-encounter callers use normal pickup. */
    function rollColonyWave(wave, zone, random = Math.random) {
        const bossWave = wave % R.colonyWave.every === 0;
        if (!bossWave && random() >= R.colonyWave.chance) return null;
        const floor = bossWave ? Math.min(R.colonyWave.maxRollFloor,
            R.colonyWave.bossRollFloor + (wave / R.colonyWave.every - 1) * R.colonyWave.bossRollStep) : 0;
        const item = createDrop(random, zone && zone.tier, floor);
        return keepEquipmentDrop(game.gridPlayer, item, { ignoreFilter: true, ignoreAutoSalvage: bossWave,
            guaranteedKeep: bossWave }) === 'kept' ? item : null;
    }
    /** 군락지 편린으로 만들기: craftCost개를 내고 새 액막이 하나를 가방에. '' when done, otherwise why not. */
    function craft(state = game, random = Math.random) {
        if (!unlocked(state)) return '군락지가 열리면 만들 수 있습니다.';
        if (state.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 만들 수 없습니다.';
        if ((Number(state.currencies.colonyShard) || 0) < R.craftCost) return `군락지 편린이 부족합니다(${R.craftCost}개 필요).`;
        // 가득 찬 가방에서도 지킨다(guaranteedKeep: 초과 보관, 빈 액막이 칸이 있으면 자동 장착이 먼저): 줍기의 넘침 해체가 편린을 주고
        // 값은 안 치러, 누를 때마다 편린이 늘었다(2026-10-20).
        const item = create(random, 1);
        if (!addItemToInventory(item, { ignoreFilter: true, ignoreAutoSalvage: true, guaranteedKeep: true })) return '가방에 자리가 없습니다.';
        state.currencies.colonyShard -= R.craftCost;
        return '';
    }
    const salvageShards = item => {
        if (item && item.rarity === 'unique') return R.shards.max; // 고유 액막이
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

    return Object.freeze({ isWard, keptOnPickup, unlocked, beltSlots, stampBelt, rerollBelt, beltRoll, slotCount, slotChange, openSlots, pickSlot, equippedLines, incidentMul, create, createUnique,
        rollFieldDrop, rollColonyWave, craft, salvageShards, salvageProfile, migrate });
})();
safeExposeGlobals({ colonyWards });
