/** NPC shops (2026-10-16 사용자: "NPC의 상점도 구현해줘. 스킬룬, 무기, 방어구, 악세사리, 고유아이템 각 담당", prices in currencies, no
 * shop at Haken's first meeting, "조우 시 진행도에 맞는 아이템 랜덤 판매"). Each story NPC sells one kind. Meeting the NPC on a map
 * (js/canvas-act-title-card.js) counts in game.npcMet and rolls its stock for the zone of the meeting into game.npcShops, laid on a
 * grid like the bag's so the shop screen (js/npc-shop-ui.js) draws it as it is. A loop takes the currencies, and the stock with them.
 * firstMeetingClosed: no stock at the first meeting (Haken is met struck by a monster, the rescue). */
const NPC_SHOPS = Object.freeze({
    haken: Object.freeze({ kind: 'gem', label: '스킬룬', count: 10, firstMeetingClosed: true }),
    orga: Object.freeze({ kind: 'gear', label: '무기', slots: Object.freeze(['무기']), count: 8 }),
    bern: Object.freeze({ kind: 'gear', label: '방어구', slots: Object.freeze(['투구', '갑옷', '장갑', '신발', '방패']), count: 8 }),
    ivel: Object.freeze({ kind: 'gear', label: '장신구', slots: Object.freeze(['반지', '목걸이', '허리띠']), count: 10 }),
    veila: Object.freeze({ kind: 'unique', label: '고유 장비', count: 4 })
});

const npcShop = (() => {
    const GRID = Object.freeze({ columns: 10, rows: 7 });
    // Shares of rare and magic gear on the shelf; the rest comes as a drop would (mostly normal).
    const RARITY = Object.freeze({ rare: 0.25, magic: 0.5 });
    // Prices: normal and magic gear in 마법의 새싹 (what their salvage gives), rare gear and gems in 형체 없는 이슬, uniques in
    // 황금률 as at the black market (js/items.js createBlackMarketUniqueOffer). tierStep: one more per this many item tiers.
    const PRICE = Object.freeze({ normal: 1, magic: 2, rare: 1, tierStep: 4, rareTierStep: 6, attackGem: 3, supportGem: 1 });
    // 상점 장비에는 저항 옵션이 다른 옵션보다 조금 더 자주 붙는다(2026-10-26 사용자): 'resistance' 태그 옵션의 무게를 곱한다.
    const RESISTANCE_WEIGHT = 1.5;
    const weighShopMods = pool => pool.map(mod => getAffixTags(mod).includes('resistance')
        ? { ...mod, weight: (Number(mod.weight) || 1) * RESISTANCE_WEIGHT } : mod);

    /** One meeting with npc ({ id, tone }) in zoneId: counted (kept across loops), and the stock rolled anew ('npc-shop-stocked'
     * tells an open shop window). */
    function meetShopNpc(npc, zoneId) {
        const shop = NPC_SHOPS[npc.id];
        if (!shop) return null;
        const before = game.npcMet[npc.id] || { count: 0 };
        game.npcMet[npc.id] = { count: before.count + 1, loop: game.season || 1, zoneId, tone: npc.tone || 'gold' };
        game.unlocks.npcs = true;
        // Saves from before the count met Haken in loop 1 already: only loop 1 has a first meeting.
        const first = before.count === 0 && (game.season || 1) === 1;
        if (!(shop.firstMeetingClosed && first)) {
            game.npcShops[npc.id] = rollShopStock(npc.id, zoneId);
            dispatchRuntimeEvent('npc-shop-stocked', { id: npc.id });
        }
        return game.npcMet[npc.id];
    }

    function rollShopStock(id, zoneId) {
        const shop = NPC_SHOPS[id], zone = getZone(zoneId) || getZone(0), tier = Math.max(1, Math.floor(Number(zone.tier) || 1));
        const wares = shop.kind === 'gem' ? rollGemWares(shop.count) : shop.kind === 'unique' ? rollUniqueWares(shop.count, tier) : rollGearWares(shop, zone);
        return { loop: game.season || 1, zoneId, offers: packShopWares(wares) };
    }

    function pickShopSome(list, count) {
        const pool = list.slice(), picked = [];
        while (pool.length && picked.length < count) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
        return picked;
    }
    /** count개를 겹치지 않게 무게대로 고른다(무게가 클수록 먼저 뽑힌다). */
    function pickShopWeighted(list, count, weightOf) {
        return list.map(entry => ({ entry, key: Math.pow(Math.random(), 1 / Math.max(0.001, weightOf(entry))) }))
            .sort((a, b) => b.key - a.key).slice(0, count).map(row => row.entry);
    }

    function rollGearWares(shop, zone) {
        return Array.from({ length: shop.count }, () => rollGearPiece(rndChoice(shop.slots), zone)).filter(Boolean)
            .map(item => ({ item, ...gearWarePrice(item) }));
    }

    /** A drop of slot in zone, as a common monster's (generateEquipmentDrop), raised to the shelf's rarity; never a unique. */
    function rollGearPiece(slot, zone) {
        const dice = Math.random(), minimumRarity = dice < RARITY.rare ? 'rare' : dice < RARITY.rare + RARITY.magic ? 'magic' : null;
        for (let tries = 0; tries < 6; tries++) {
            const item = generateEquipmentDrop({}, { zone, slot, minimumRarity, weigh: weighShopMods });
            if (item && item.rarity !== 'unique') return item;
        }
        return null;
    }

    function gearWarePrice(item) {
        const tier = Math.max(1, getItemCraftTier(item));
        if (item.rarity === 'rare') return { priceKey: 'formlessDew', price: PRICE.rare + Math.floor(tier / PRICE.rareTierStep) };
        return { priceKey: 'magicBud', price: PRICE[item.rarity === 'magic' ? 'magic' : 'normal'] + Math.floor(tier / PRICE.tierStep) };
    }

    /** Uniques the black market could sell up to two tiers over the zone, chase uniques left out. */
    function rollUniqueWares(count, tier) {
        const pool = UNIQUE_DB.filter(unique => isUniqueEligibleForBlackMarket(unique) && !unique.ultraRare && (unique.reqTier || 1) <= tier + 2);
        return pickShopSome(pool, count).map(unique => {
            const offer = createBlackMarketUniqueOffer(unique, tier);
            const item = generateUniqueItem(offer.reqTier, offer.slot, offer.name);
            return item && { item, priceKey: 'goldenRule', price: offer.price };
        }).filter(Boolean);
    }

    /** Attack gems the hero lacks and, once support gems are open, the next tier of support gems (as a gem drop gives them). Runes the
     * worn weapon can use come up three times as often (getSkillRuneRewardWeights); a support weighs as much as an average rune. */
    function rollGemWares(count) {
        const missing = gemDropRewards.missingAttacks(game), weights = getSkillRuneRewardWeights(missing);
        const attacks = missing.map(name => ({ kind: 'attack', name, awakened: false }));
        const supports = contentProgression.isUnlocked('support')
            ? Object.keys(SUPPORT_GEM_DB).map(name => gemDropRewards.nextSupport(game, name)).filter(Boolean) : [];
        const average = missing.length ? [...weights.values()].reduce((sum, weight) => sum + weight, 0) / missing.length : 1;
        const weightOf = gem => (gem.kind === 'attack' ? weights.get(gem.name) : average);
        return pickShopWeighted([...attacks, ...supports], count, weightOf).map(gem => ({ gem, priceKey: 'formlessDew',
            price: gem.kind === 'support' ? PRICE.supportGem + gem.tier : PRICE.attackGem }));
    }

    /** The wares on the shelf grid, biggest first, each at the first free place; what does not fit stays off the shelf. */
    function packShopWares(wares) {
        const taken = new Set(), offers = [];
        const sized = wares.map(ware => ({ ware, size: ware.item ? getEquipmentInventoryFootprint(ware.item) : { columns: 1, rows: 1 } }))
            .sort((a, b) => b.size.rows - a.size.rows || b.size.columns - a.size.columns);
        for (const { ware, size } of sized) {
            const at = firstFreeShopPlace(taken, size);
            if (!at) continue;
            shopWareCells(at, size).forEach(cell => taken.add(cell));
            offers.push({ ...ware, column: at.column, row: at.row, columns: size.columns, rows: size.rows });
        }
        return offers;
    }

    function shopWareCells(at, size) {
        const cells = [];
        for (let row = at.row; row < at.row + size.rows; row++) for (let column = at.column; column < at.column + size.columns; column++) cells.push(`${column}:${row}`);
        return cells;
    }

    function firstFreeShopPlace(taken, size) {
        for (let row = 0; row + size.rows <= GRID.rows; row++) {
            for (let column = 0; column + size.columns <= GRID.columns; column++) {
                if (!shopWareCells({ column, row }, size).some(cell => taken.has(cell))) return { column, row };
            }
        }
        return null;
    }

    /** The NPC's stock of this loop, or null (never met yet here, or Haken at his first meeting). */
    function shopStock(id) {
        const shop = game.npcShops[id];
        return shop && shop.loop === (game.season || 1) && Array.isArray(shop.offers) ? shop : null;
    }

    const currencyName = key => (ORB_DB[key] ? ORB_DB[key].name : key);
    const SHELF_CHANGED = '진열이 바뀌었습니다. 새 물건을 다시 확인하세요.';

    /** Whether offer index of the NPC's stock can be bought now: { ok, reason }. place: a bag cell { column, row } (row over all pages). */
    function checkShopWare(id, index, place) {
        if (game.woodsmanBuildLock) return { ok: false, reason: '☠️ 나무꾼 전투 중에는 살 수 없습니다.' };
        const offer = shopStock(id)?.offers[index];
        if (!offer) return { ok: false, reason: '이미 팔린 물건입니다.' };
        const have = Math.floor(Number(game.currencies[offer.priceKey]) || 0);
        if (have < offer.price) return { ok: false, reason: `${currencyName(offer.priceKey)} 부족, ${have}/${offer.price}` };
        if (offer.gem) return checkGemWare(offer.gem);
        if (place) {
            const fit = equipmentInventoryGridRuntime.canAdd(offer.item, place.column, place.row, game);
            return fit.ok ? { ok: true } : { ok: false, reason: fit.reason };
        }
        return canStoreEquipmentItems([offer.item], game) ? { ok: true } : { ok: false, reason: '가방에 빈칸이 없습니다.' };
    }

    function checkGemWare(gem) {
        if (gem.kind === 'attack') return hasSkillGemOwned(gem.name) ? { ok: false, reason: '이미 가진 룬입니다.' } : { ok: true };
        const next = gemDropRewards.nextSupport(game, gem.name);
        return next && next.tier === gem.tier ? { ok: true } : { ok: false, reason: '이미 가진 룬입니다.' };
    }

    /** Why seen (the ware the window showed at index) cannot be bought there now, or ''. */
    function shelfChangedReason(id, index, seen) {
        return seen && shopStock(id)?.offers[index] !== seen ? SHELF_CHANGED : '';
    }

    /** Buys offer index: pays, puts the gem in the collection or the item in the bag (at place when given) and takes it off the
     * shelf. resonanceCap: the support gems' resonance cap (js/ui.js getEffectiveResonanceCap), as a gem drop uses it. seen: the
     * ware the player saw; when a new meeting laid out a new shelf meanwhile, nothing is bought. */
    function sellShopWare(id, index, { place = null, resonanceCap = 0, seen } = {}) {
        const moved = shelfChangedReason(id, index, seen);
        if (moved) return { ok: false, reason: moved };
        const result = checkShopWare(id, index, place);
        if (!result.ok) return result;
        const shop = shopStock(id), offer = shop.offers[index];
        if (offer.gem) gemDropRewards.grant(game, offer.gem, offer.gem.kind === 'support' ? resonanceCap : 0);
        else if (!stowShopItem(offer.item, place)) return { ok: false, reason: '가방에 넣지 못했습니다.' };
        game.currencies[offer.priceKey] -= offer.price;
        shop.offers.splice(index, 1);
        return { ok: true, offer };
    }

    /** The bought item into the bag: a fresh id (the shelf's may be taken by drops since a reload), then the chosen place. */
    function stowShopItem(item, place) {
        item.id = ++itemIdCounter;
        delete item.instanceId;
        return stowBoughtItem(item, place);
    }

    /** How many of the NPC's wares the purse buys now, cheapest first in each currency, each one buyable on its own (checkShopWare:
     * the price, a rune not owned yet, bag room). Salvage fills the purse in loop 1, so this tells when a shelf became worth a visit. */
    function readyShopWares(id) {
        const spent = {}, stock = shopStock(id);
        const fits = ware => {
            const left = (game.currencies[ware.priceKey] || 0) - (spent[ware.priceKey] || 0);
            if (left < ware.price) return false;
            spent[ware.priceKey] = (spent[ware.priceKey] || 0) + ware.price;
            return true;
        };
        return stock ? stock.offers.filter((ware, index) => checkShopWare(id, index, null).ok).sort((a, b) => a.price - b.price).filter(fits).length : 0;
    }

    return Object.freeze({ grid: GRID, meet: meetShopNpc, stock: shopStock, check: checkShopWare, buy: sellShopWare, ready: readyShopWares, currencyName,
        shelfChanged: SHELF_CHANGED });
})();
safeExposeGlobals({ NPC_SHOPS, npcShop });
