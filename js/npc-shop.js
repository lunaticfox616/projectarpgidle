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
    // 룬 연구를 대신한다(2026-11-02 사용자: 매 루프 조건을 달성하면 룬을 파는 NPC가 모든 룬을 판매). 이번 루프에 액트 5를 깨면 하켄의 진열대가 아직 없는
    // 공격 룬 전부와 보조스킬룬의 다음 등급 전부로 바뀐다. 루프가 끝나면 maxZoneId와 함께 닫힌다. 값(2026-11-02 사용자)은 그루터기 함에서 다 자란 것 하나다:
    // 공격 룬은 그 속성의 꽃, 보조스킬룬은 룬마다 번갈아 뿌리와 덩굴, 이동 룬과 소환 룬은 열매(2026-11-04 사용자: 물리 룬은 물리 꽃, 호박석 대신 뿌리 반 덩굴 반).
    // 랜덤 진열대는 그대로 이슬이다(함은 루프 1 액트 10에야 생긴다).
    const ALL_RUNES = Object.freeze({ npc: 'haken', act: 5 });
    const ELEMENT_FLOWER = Object.freeze({ phys: 'physical', fire: 'fire', cold: 'cold', light: 'lightning', chaos: 'chaos' });
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
        if (!allRunesOpen() && !(shop.firstMeetingClosed && first)) {
            game.npcShops[npc.id] = rollShopStock(npc.id, zoneId);
            dispatchRuntimeEvent('npc-shop-stocked', { id: npc.id });
        }
        return game.npcMet[npc.id];
    }

    const allRunesOpen = () => !!game.npcMet[ALL_RUNES.npc] && (game.maxZoneId || 0) >= ALL_RUNES.act;
    /** What the whole shelf holds: supports join once their unlock opens, so the mark tells when to lay it again. */
    // 이름이 달라지면 진열대를 다시 편다(2026-11-02: 가진 룬도 팔게 되어 옛 진열대에는 빠진 룬이 있다. 2026-11-04: 호박석 값이 뿌리와 덩굴이 됐다).
    const allRunesMark = () => (contentProgression.isUnlocked('support') ? 'full-roots' : 'attacks-roots');

    function rollAllRunes() {
        const runes = gemDropRewards.attackRunes(), weights = getSkillRuneRewardWeights(runes);
        const attacks = runes.sort((a, b) => weights.get(b) - weights.get(a)).map(name => ({ kind: 'attack', name, awakened: false }));
        const supports = contentProgression.isUnlocked('support') ? Object.keys(SUPPORT_GEM_DB).map(name => gemDropRewards.nextSupport(game, name)).filter(Boolean) : [];
        // 칸 자리는 저장하지 않는다: 검색과 쪽에 맞춰 화면이 채운다(js/npc-shop-ui.js runeShelfHtml).
        const offers = [...attacks, ...supports].map(gem => ({ gem, priceKey: allRunePriceKey(gem), price: 1, columns: 1, rows: 1 }));
        return { loop: game.season || 1, zoneId: game.currentZoneId, offers, allRunes: allRunesMark() };
    }

    function allRunePriceKey(gem) {
        if (gem.kind === 'support') return stumpBox.harvestPriceKey(Object.keys(SUPPORT_GEM_DB).indexOf(gem.name) % 2 ? 'vine' : 'root');
        const def = SKILL_DB[gem.name];
        if (isMobilityRuneName(gem.name) || (def.tags || []).includes('summon')) return stumpBox.harvestPriceKey('fruit');
        return stumpBox.harvestPriceKey('flower', ELEMENT_FLOWER[def.ele]);
    }

    /** Lays the whole shelf when the condition has just been met ('npc-shop-all-runes' tells the hero once a loop). */
    function syncAllRunes() {
        if (!allRunesOpen()) return;
        const shop = game.npcShops[ALL_RUNES.npc], current = shop && shop.loop === (game.season || 1);
        if (current && shop.allRunes === allRunesMark()) return;
        const first = !(current && shop.allRunes);
        game.npcShops[ALL_RUNES.npc] = rollAllRunes();
        dispatchRuntimeEvent('npc-shop-stocked', { id: ALL_RUNES.npc });
        if (first) dispatchRuntimeEvent('npc-shop-all-runes', { id: ALL_RUNES.npc });
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

    /** Attack gems and, once support gems are open, the next tier of support gems (as a gem drop gives them). Runes the
     * worn weapon can use come up three times as often (getSkillRuneRewardWeights); a support weighs as much as an average rune. */
    function rollGemWares(count) {
        const runes = gemDropRewards.attackRunes(), weights = getSkillRuneRewardWeights(runes);
        const attacks = runes.map(name => ({ kind: 'attack', name, awakened: false }));
        const supports = contentProgression.isUnlocked('support')
            ? Object.keys(SUPPORT_GEM_DB).map(name => gemDropRewards.nextSupport(game, name)).filter(Boolean) : [];
        const average = [...weights.values()].reduce((sum, weight) => sum + weight, 0) / runes.length;
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
        if (id === ALL_RUNES.npc) syncAllRunes();
        const shop = game.npcShops[id];
        return shop && shop.loop === (game.season || 1) && Array.isArray(shop.offers) ? shop : null;
    }

    const priceIsHarvest = key => stumpBox.isHarvestPrice(key);
    const currencyName = key => (priceIsHarvest(key) ? stumpBox.harvestPriceName(key) : ORB_DB[key] ? _t(ORB_DB[key].name) : key);
    const priceHeld = key => (priceIsHarvest(key) ? stumpBox.harvestPriceHeld(game, key) : Math.floor(Number(game.currencies[key]) || 0));
    function payShopPrice({ priceKey, price }) {
        if (priceIsHarvest(priceKey)) stumpBox.payHarvestPrice(game, priceKey);
        else game.currencies[priceKey] -= price;
    }
    const SHELF_CHANGED = '진열이 바뀌었습니다. 새 물건을 다시 확인하세요.';

    /** Whether offer index of the NPC's stock can be bought now: { ok, reason }. place: a bag cell { column, row } (row over all pages). */
    function checkShopWare(id, index, place) {
        if (game.woodsmanBuildLock) return { ok: false, reason: '☠️ 나무꾼 전투 중에는 살 수 없습니다.' };
        const offer = shopStock(id)?.offers[index];
        if (!offer) return { ok: false, reason: '이미 팔린 물건입니다.' };
        const have = priceHeld(offer.priceKey);
        if (have < offer.price) return { ok: false, reason: `${currencyName(offer.priceKey)} 부족, ${have}/${offer.price}` };
        if (offer.gem) return checkGemWare(offer.gem);
        if (place) {
            const fit = equipmentInventoryGridRuntime.canAdd(offer.item, place.column, place.row, game);
            return fit.ok ? { ok: true } : { ok: false, reason: fit.reason };
        }
        return canStoreEquipmentItems([offer.item], game) ? { ok: true } : { ok: false, reason: '가방에 빈칸이 없습니다.' };
    }

    function checkGemWare(gem) {
        if (gem.kind === 'attack') return { ok: true };
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
        payShopPrice(offer);
        refillSoldShelfCell(shop, index, offer);
        return { ok: true, offer };
    }

    /** The sold ware leaves its cell; on the every-rune shelf a support's next tier takes the cell instead. An attack rune stays: it sells as long as the price is there. */
    function refillSoldShelfCell(shop, index, offer) {
        if (offer.gem?.kind === 'attack') return;
        const next = shop.allRunes && offer.gem?.kind === 'support' ? gemDropRewards.nextSupport(game, offer.gem.name) : null;
        if (next) shop.offers[index] = { ...offer, gem: next };
        else shop.offers.splice(index, 1);
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
            const left = priceHeld(ware.priceKey) - (spent[ware.priceKey] || 0);
            if (left < ware.price) return false;
            spent[ware.priceKey] = (spent[ware.priceKey] || 0) + ware.price;
            return true;
        };
        return stock ? stock.offers.filter((ware, index) => checkShopWare(id, index, null).ok).sort((a, b) => a.price - b.price).filter(fits).length : 0;
    }

    return Object.freeze({ grid: GRID, allRunesAct: ALL_RUNES.act, syncAllRunes, meet: meetShopNpc, stock: shopStock, check: checkShopWare, buy: sellShopWare, ready: readyShopWares, currencyName,
        shelfChanged: SHELF_CHANGED });
})();
safeExposeGlobals({ NPC_SHOPS, npcShop });
