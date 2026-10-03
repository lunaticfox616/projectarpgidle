const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime(), start = 1700000000000, hour = 3600000;
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
let now = start, writes = 0, markup = '', inputs = {}, toasts = [], disclosures = [];
ctx.Date = class extends Date { static now() { return now; } };
ctx.Math = Object.create(Math); ctx.Math.random = () => 0.73;
const storage = new Map();
ctx.localStorage.getItem = key => storage.get(key) || null;
ctx.localStorage.setItem = (key, value) => storage.set(key, value);
function input(value, checked = false) {
    return { value, checked, tagName: 'INPUT', attributes: {},
        setAttribute(key, text) { this.attributes[key] = text; } };
}
const hint = { textContent: '', classList: { toggle() {} } };
const host = { id: 'market-panel-stall', contains: element => Object.values(inputs).includes(element),
    classList: { add() {}, remove() {} },
    querySelectorAll: selector => selector === 'details[open]' ? disclosures.filter(node => node.open) : selector === 'details' ? disclosures : [],
    get innerHTML() { return markup; },
    set innerHTML(value) {
        markup = value; writes++; inputs = {};
        disclosures = [...value.matchAll(/<details([^>]*)>/g)].map(match => ({
            dataset: { saleId: match[1].match(/data-sale-id="([^"]+)"/)?.[1],
                uiDisclosure: match[1].match(/data-ui-disclosure="([^"]+)"/)?.[1] },
            className: match[1].match(/class="([^"]+)"/)?.[1] || '',
            open: /\sopen(?:\s|=|$)/.test(match[1]), closest: () => host
        }));
        for (const match of value.matchAll(/<input id="([^"]+)"[^>]*>/g)) {
            inputs[match[1]] = input(match[0].match(/value="([^"]*)"/)?.[1] || '', /\schecked/.test(match[0]));
        }
        for (const match of value.matchAll(/<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
            const selected = match[2].match(/<option value="([^"]+)" selected/);
            inputs[match[1]] = { ...input(selected?.[1] || ''), tagName: 'SELECT' };
        }
    }
};
const region = { children: [], appendChild: toast => toasts.push(toast.innerHTML) };
ctx.document.getElementById = id => ({ 'market-panel-stall': host, 'stall-price-hint': hint,
    'game-feedback-root': {}, 'game-toast-region': region })[id] || inputs[id] || null;
function fresh() {
    now = start; writes = 0; toasts = []; inputs = {}; disclosures = []; storage.clear(); delete host.stallMarkup;
    ctx.document.activeElement = null;
    run(`game=mergeDefaults({season:2,contentProgression:JSON.parse(JSON.stringify(defaultGame.contentProgression))});
        contentProgression.sync(game); contentProgression.purchase('craft',game);
        playerStall.advance(game,${start});
        game.inventory=[createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='갑옷'),'rare',15),
            createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='무기'),'rare',10)];
        { const gear=game.inventory[0]; gear.affixTierCap=20; gear.hiddenTier=20;
        gear.stats=['flatHp','pctHp','armorPct','resAll','armor'].map(id=>rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id&&mod.slots.includes(gear.slot)),20,20)); }
        playerStallUi.selectedId=null; playerStallUi.selectedListingId=null;playerStallUi.pendingSlot=null;playerStallUi.dragSource=null;
        playerStallUi.draftAsk='';playerStallUi.draftCurrency='';playerStallUi.draftNegotiate=true;playerStallUi.message='';
        playerStallUi.render();`);
}
function listFromUi() {
    inputs['stall-ask'].value = '1000000';
    assert.equal(inputs['stall-negotiate'].checked, true, 'new listings allow offers by default');
    run('playerStallUi.list()');
    assert.equal(run('game.playerStall.listings[0].negotiate'), true);
}
fresh();
const first = run('game.inventory[0].id'), second = run('game.inventory[1].id');
assert(markup.includes(`data-stall-item="${first}"`));
assert(markup.includes('stall-item-art'), 'actual equipment art is exposed in the selection grid');
assert.equal(inputs['stall-ask'].value,'','the asking price must be chosen by the player, not filled with the hidden fair value');
assert(!/참고가|손님 지불 상한|적정 가격/.test(markup),'the screen does not reveal exact valuation or certify the asking price');
const beforeEmptyAsk=json('[game.inventory,game.playerStall,game.currencies]');
run('playerStallUi.list()');
assert.deepEqual(json('[game.inventory,game.playerStall,game.currencies]'),beforeEmptyAsk,'confirming an empty price cannot sell or transfer an item');
inputs['stall-ask'].value = '999999'; run('playerStallUi.preview()');
const highPriceHint=hint.textContent;
inputs['stall-ask'].value='1';run('playerStallUi.preview()');
assert.equal(hint.textContent,highPriceHint,'probing asking prices cannot reveal the exact purchase ceiling through immediate feedback');
inputs['stall-ask'].value='999999';run('playerStallUi.preview()');
ctx.document.activeElement = inputs['stall-ask'];
const sameInput = inputs['stall-ask'], beforeWrites = writes;
run('game.playerStall.proceeds=2;playerStallUi.render()');
assert.equal(inputs['stall-ask'], sameInput, 'incoming state must not detach a price being edited');
assert.equal(writes, beforeWrites);
ctx.document.activeElement = null;
run(`playerStallUi.select(${second})`);
assert.equal(run('playerStallUi.selectedId'), second);
assert.equal(inputs['stall-ask'].value, '', 'a different item starts without a suggested numeric price');
inputs['stall-ask'].value='17';run('playerStallUi.changeCurrency("magicBud")');
assert.equal(inputs['stall-ask'].value,'17','currency changes keep the player\'s amount instead of substituting an internal valuation');
run(`game.inventory[0].locked=true;playerStallUi.render(true)`);
assert(!markup.includes(`data-stall-item="${first}"`), 'locked equipment cannot be selected for sale');

// Actual UI transaction, save boundary, incoming offer, and deferred input refresh.
fresh(); listFromUi();
assert.equal(run('game.inventory.length'), 1);
assert(storage.size > 0, 'listing is persisted through the real save path');
now = start + 4 * hour;
assert.equal(run('playerStallUi.settleSales(Date.now())'), 0, 'a proposal is not a paid sale');
const offered = json('game'), row = offered.playerStall.listings[0];
assert(row.offer, 'real seeded NPC visits create the offer');
assert(markup.includes(`data-stall-accept="${row.offer.id}"`), 'offer-only updates become actionable without a sale');
assert.equal(run('game.noti.items'), true);
assert.equal(toasts.length, 1, 'new proposal announces itself once');
run('playerStallUi.settleSales(Date.now())');
assert.equal(toasts.length, 1);
run(`playerStallUi.respond(${row.id},${row.offer.id + 50},true)`);
assert.equal(run('game.playerStall.proceeds'), 0, 'stale click cannot accept a different proposal');
assert.equal(toasts.length, 1, 'failed acceptance does not announce a sale');
run(`playerStallUi.respond(${row.id},${row.offer.id},true)`);
assert.equal(run('game.playerStall.proceeds'), row.offer.amount);
assert.equal(run('game.playerStall.listings.length'), 0);
assert.equal(toasts.length, 2);
assert(!markup.includes('data-stall-accept='));
const currency = run('game.currencies.formlessDew');
run('playerStallUi.collect();playerStallUi.collect()');
assert.equal(run('game.currencies.formlessDew'), currency + row.offer.amount, 'UI collection is exactly once');

// Main orchestration must refresh heavy UI even if a proposal or expiry pays zero.
fresh(); listFromUi(); now = start + 4 * hour;
run('pendingHeavyUiRefresh=false;settlePlayerStall()');
assert.equal(run('pendingHeavyUiRefresh'), true, 'main notices incoming proposal');
const pending = json('game');
now = start + 72 * hour;
run('pendingHeavyUiRefresh=false;settlePlayerStall()');
assert.equal(run('game.playerStall.listings[0].offer'), null);
assert.equal(run('pendingHeavyUiRefresh'), true, 'main notices expiry without a payout');
assert(!markup.includes('data-stall-accept='), 'expired offer actions disappear');
run(`game=mergeDefaults(${JSON.stringify(pending)});playerStallUi.render(true)`);
now = pending.playerStall.lastAt;
const held = json('game.playerStall');
run(`backgroundCombatRuntime.snapshot={};playerStallUi.respond(${row.id},${row.offer.id},true)`);
assert.deepEqual(json('game.playerStall'), held, 'background settlement blocks manual acceptance');
run('backgroundCombatRuntime.snapshot=null');
run(`playerStallUi.respond(${held.listings[0].id},${held.listings[0].offer.id},false)`);
assert.equal(run('game.playerStall.listings[0].offer'), null);
assert.equal(run('game.playerStall.proceeds'), 0, 'rejecting keeps the item without a payment');
assert.equal(run('game.playerStall.listings.length'), 1);

// Dropping prepares the chosen physical slot; only confirming the price transfers ownership.
fresh();
const placementOwner = json('game');
run('playerStallUi.tapSlot(3)');
assert.equal(run('playerStallUi.pendingSlot'), 3);
assert.deepEqual(json('[game.inventory,game.playerStall]'), [placementOwner.inventory,placementOwner.playerStall]);
assert(markup.includes('4번 칸에 진열 확정'));
run('playerStallUi.cancelPlacement()');
assert.equal(run('playerStallUi.pendingSlot'), null);
assert.deepEqual(json('game.inventory'), placementOwner.inventory, 'cancelling preview cannot remove the original equipment');
const sourceId = run('game.inventory[1].id');
ctx.dragEvent = { preventDefault() {}, stopPropagation() {}, dataTransfer: { setData() {} } };
run(`playerStallUi.beginDrag(dragEvent,'inventory',${sourceId})`);
const beforeDragWrites = writes;
run('game.playerStall.proceeds=1;playerStallUi.render(true)');
assert.equal(writes, beforeDragWrites, 'game refresh cannot detach the native drag source');
run('playerStallUi.dropOn(dragEvent,2)');
assert.equal(run('playerStallUi.selectedId'), sourceId);
assert.equal(run('playerStallUi.pendingSlot'), 2);
assert.equal(run('game.inventory.length'), 2, 'drop alone never sells the item at a default price');
inputs['stall-ask'].value = '999999';
run('playerStallUi.list()');
assert.equal(run('game.playerStall.listings[0].slot'), 2);
assert.equal(run('game.playerStall.listings[0].item.id'), sourceId);
const listingBeforeMove = json('game.playerStall.listings[0]');
run('playerStallUi.tapSlot(0)');
assert.deepEqual(json('game.playerStall.listings[0]'), {...listingBeforeMove,slot:0});
assert(storage.size > 0, 'placement is saved by the UI transaction boundary');
run(`playerStallUi.select(game.inventory[0].id);playerStallUi.beginDrag(dragEvent,'inventory',game.inventory[0].id)`);
const beforeInvalidDrop = json('[game.inventory,game.playerStall]');
run('playerStallUi.dropOn(dragEvent,0)');
assert.deepEqual(json('[game.inventory,game.playerStall]'), beforeInvalidDrop, 'occupied drop cannot overwrite listed equipment');
run('playerStallUi.dropOn(dragEvent,1)');
assert.equal(run('playerStallUi.pendingSlot'), null, 'external drag payload without a local source is ignored');
run('playerStallUi.tapSlot(1);game.inventory[0].locked=true');
assert.equal(run('playerStallUi.pendingSlot'), 1);
const stillOwned = json('[game.inventory,game.playerStall]');
run('playerStallUi.list()');
assert.deepEqual(json('[game.inventory,game.playerStall]'), stillOwned, 'eligibility is checked again when confirming a preview');

// A drag cancelled outside the board still flushes offer updates deferred during the gesture.
fresh(); listFromUi();
run("playerStallUi.beginDrag(dragEvent,'inventory',game.inventory[0].id)");
now = start + 4 * hour;
run('playerStallUi.settleSales(Date.now())');
assert.equal(run('game.playerStall.listings.filter(entry=>entry.offer).length'), 1);
assert(!markup.includes('data-stall-accept='), 'native drag preserves its source until the gesture ends');
run('playerStallUi.endDrag()');
assert(markup.includes('data-stall-accept='), 'cancelled drag makes the newly arrived proposal actionable immediately');
const endedDragWrites = writes;
run('playerStallUi.endDrag()');
assert.equal(writes, endedDragWrites, 'repeated native drag end does not replace unchanged controls');

// Moving listed gear into an inventory preview must leave one truthful selection, not a stale confirm target.
fresh(); listFromUi();
run('playerStallUi.select(game.inventory[0].id);playerStallUi.tapSlot(3)');
assert.equal(run('playerStallUi.pendingSlot'), 3);
const ownerBeforeOverlap = json('[game.inventory,game.playerStall]');
run("playerStallUi.beginDrag(dragEvent,'listing',game.playerStall.listings[0].id);playerStallUi.dropOn(dragEvent,3)");
assert.equal(run('playerStallUi.pendingSlot'), null, 'moving real stock clears the displaced inventory preview');
assert.equal(run('playerStallUi.selectedListingId'), ownerBeforeOverlap[1].listings[0].id);
assert.equal(run('playerStallUi.inspectedListing().slot'), 3);
assert.equal(inputs['stall-ask'], undefined, 'details now manage the moved listing rather than confirming an occupied target');
ownerBeforeOverlap[1].listings[0].slot = 3;
assert.deepEqual(json('[game.inventory,game.playerStall]'), ownerBeforeOverlap, 'replacing a preview preserves unlisted equipment and all sale terms');

// The currency selector is a draft: the same low-value gear may be listed in buds or, rarely, one dew.
fresh(); run('playerStallUi.select(game.inventory[1].id)');
assert.equal(inputs['stall-currency'].value, 'magicBud', 'ordinary equipment suggests the existing lower denomination');
const unlistedOwner = json('[game.inventory,game.playerStall]');
run("playerStallUi.changeCurrency('formlessDew')");
assert.equal(inputs['stall-currency'].value, 'formlessDew');
assert.equal(inputs['stall-ask'].value,'');
assert.deepEqual(json('[game.inventory,game.playerStall]'), unlistedOwner, 'currency selection alone never moves equipment or money');
run("playerStallUi.changeCurrency('magicBud');playerStallUi.tapSlot(2)");
inputs['stall-ask'].value = '1'; run('playerStallUi.list()');
assert.equal(run('game.playerStall.listings[0].currency'), 'magicBud');
assert.equal(run('game.playerStall.listings[0].slot'), 2);
assert(markup.includes('마법의 새싹 1개'), 'the board identifies the actual settlement currency');
assert(!/감정 근거|가중치|조합 적합도|수치 품질/.test(markup), 'internal valuation evidence is not exposed to the player');
const beforeCurrencyEdit = json('game.playerStall.listings[0]');
run("playerStallUi.changeCurrency('formlessDew')");
assert.deepEqual(json('game.playerStall.listings[0]'), beforeCurrencyEdit, 'an existing price stays in its original currency until confirmed');
run('playerStallUi.reprice(game.playerStall.listings[0].id)');
assert.equal(run('game.playerStall.listings[0].currency'), 'formlessDew');

// A bid in buds is shown, accepted and collected in buds, including a zero-dew payout.
fresh(); run("playerStallUi.changeCurrency('magicBud')"); listFromUi();
now = start + 12 * hour; run('playerStallUi.settleSales(Date.now())');
const budRow = json('game.playerStall.listings[0]');
assert(budRow.offer, 'actual visits create a bud-denominated bid for valuable equipment');
assert(markup.includes(`마법의 새싹 ${budRow.offer.amount}개`));
run(`playerStallUi.respond(${budRow.id},${budRow.offer.id},true)`);
assert.equal(run('game.playerStall.budProceeds'), budRow.offer.amount);
assert.equal(run('game.playerStall.proceeds'), 0);
assert(!/<button[^>]*onclick="playerStallUi.collect\(\)"[^>]*disabled/.test(markup), 'bud-only proceeds enable collection');
assert(toasts.some(text => text.includes(`마법의 새싹 ${budRow.offer.amount}개`)), 'sale notices name the paid currency');
const budsBeforeCollect = run('game.currencies.magicBud');
run('playerStallUi.collect();playerStallUi.collect()');
assert.equal(run('game.currencies.magicBud'), budsBeforeCollect + budRow.offer.amount);
assert.equal(run('game.playerStall.budProceeds'), 0);

// A low-value item cannot earn a premium currency through the one-unit floor.
fresh(); run("playerStallUi.select(game.inventory[1].id);playerStallUi.changeCurrency('goldenRule')");
assert.equal(inputs['stall-currency'].value, 'goldenRule');
assert(!/구매하지 않음|구매하지 않습니다|지불 상한/.test(hint.textContent),'selecting a denomination cannot expose an exact eligibility boundary');
assert(!/가중치|시너지 점수|조합 적합도|수치 품질/.test(markup));

// A real perfect aligned item receives and collects a gold bid, including gold-only UI notifications.
fresh();
run(`{ const base=BASE_ITEM_DB.find(row=>row.id==='apocalypse_greatblade');
    const item=createItemFromBase(base,'rare',20,{affixTierCap:20});
    item.stats=['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg'].map(id=>{
        const stat=rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id),20,20);stat.val=stat.valMax;return stat;
    });
    item.baseStats.forEach(stat=>{stat.val=stat.valMax;});
    game.inventory=[normalizeItem(item)];playerStallUi.select(item.id);
}`);
assert.equal(inputs['stall-currency'].value, 'goldenRule', 'a premium combination defaults to gold');
listFromUi();
now = start + hour; run('playerStallUi.settleSales(Date.now())');
const goldRow = json('game.playerStall.listings[0]');
assert(goldRow.offer && goldRow.offer.amount >= 15, 'an independent premium visitor bids without accumulated credit');
assert(markup.includes(`황금률 ${goldRow.offer.amount}개`));
run(`playerStallUi.respond(${goldRow.id},${goldRow.offer.id},true)`);
assert.deepEqual(json('[game.playerStall.goldProceeds,game.playerStall.proceeds,game.playerStall.budProceeds]'), [goldRow.offer.amount,0,0]);
assert(!/<button[^>]*onclick="playerStallUi.collect\(\)"[^>]*disabled/.test(markup));
assert(toasts.some(text => text.includes(`황금률 ${goldRow.offer.amount}개`)), 'sale notices retain the gold denomination');
const walletBefore = json('game.currencies');
run('playerStallUi.collect();playerStallUi.collect()');
assert.deepEqual(json('game.currencies'), {...walletBefore,goldenRule:walletBefore.goldenRule + goldRow.offer.amount});
assert.equal(run('game.playerStall.goldProceeds'), 0);

// A discounted asking price can receive a lower bid without blocking a later buy-now sale.
fresh();
run(`game.inventory=[${JSON.stringify(goldRow.item)}];game.playerStall.rng=1662112984;
    playerStallUi.select(game.inventory[0].id);`);
inputs['stall-ask'].value = '13'; run('playerStallUi.list()');
now = start + 16 * 60000; run('playerStallUi.settleSales(Date.now())');
const bargainOwner = json('game'), bargainRow = bargainOwner.playerStall.listings[0];
assert(bargainRow.offer && bargainRow.offer.amount < 13, 'a real visitor bargains below an already discounted price');
assert(markup.includes('진열가 구매도 계속 가능'));

// Actions on an old displayed bid must persist an intervening sale, even when the requested action fails.
for (const action of [
    `playerStallUi.respond(${bargainRow.id},${bargainRow.offer.id},true)`,
    `playerStallUi.respond(${bargainRow.id},${bargainRow.offer.id},false)`,
    `playerStallUi.counter(${bargainRow.id},${bargainRow.offer.id})`,
    `playerStallUi.reprice(${bargainRow.id})`,
    `playerStallUi.negotiate(${bargainRow.id},false)`,
    `playerStallUi.withdraw(${bargainRow.id})`
]) {
    now = bargainOwner.playerStall.lastAt;
    run(`game=mergeDefaults(${JSON.stringify(bargainOwner)});playerStallUi.inspect(${bargainRow.id});saveGame();`);
    assert.equal(JSON.parse(storage.get(run('LOCAL_SAVE_KEY'))).playerStall.goldProceeds, 0);
    now += 2 * hour; toasts = [];
    run(action);
    assert.equal(run('game.playerStall.listings.length'), 0, action);
    assert.equal(run('game.playerStall.goldProceeds'), 13, 'the asking price wins over the lower pending bid');
    const saved = JSON.parse(storage.get(run('LOCAL_SAVE_KEY')));
    assert.equal(saved.playerStall.goldProceeds, 13, 'a sale persists even though its stale management action failed');
    assert.equal(saved.playerStall.listings.length, 0);
    assert.equal(toasts.length, 1, 'buy-now settlement announces once, without a second accepted-bid notice');
    const before = run('game.currencies.goldenRule');
    run('playerStallUi.collect();playerStallUi.collect()');
    assert.equal(run('game.currencies.goldenRule'), before + 13);
    assert.equal(toasts.length, 1);
}

// If collection cannot fit the wallet, the completed sale remains durable and can be collected later.
now = bargainOwner.playerStall.lastAt;
run(`game=mergeDefaults(${JSON.stringify(bargainOwner)});game.currencies.goldenRule=Number.MAX_SAFE_INTEGER;saveGame();`);
now += 2 * hour; toasts = [];
run('playerStallUi.collect()');
assert.equal(run('game.playerStall.goldProceeds'), 13);
assert.equal(JSON.parse(storage.get(run('LOCAL_SAVE_KEY'))).playerStall.goldProceeds, 13);
assert.equal(run('game.currencies.goldenRule'), Number.MAX_SAFE_INTEGER);
run('game.currencies.goldenRule=0;playerStallUi.collect();playerStallUi.collect()');
assert.equal(run('game.currencies.goldenRule'), 13);
assert.equal(toasts.length, 1);
// A disappearing receipt must not transfer its open state to the neighboring rules/help panel.
ctx.__stallDisclosureRoot = host;
run('playerStallUi.render(true)');
assert(disclosures.some(node => node.className === 'stall-sale'));
disclosures.find(node => node.className === 'stall-ledger').open = true;
disclosures.find(node => node.className === 'stall-sale').open = true;
disclosures.find(node => node.className === 'stall-terms').open = false;
run('captureUiDisclosureState(__stallDisclosureRoot); game.playerStall.sales=[]; playerStallUi.render(true); restoreUiDisclosureState(__stallDisclosureRoot)');
assert.equal(disclosures.find(node => node.className === 'stall-ledger').open, true, 'the ledger stays open across a receipt-count change');
assert.equal(disclosures.find(node => node.className === 'stall-terms').open, false, 'global UI fold restoration never opens help in place of a removed receipt');
console.log('player stall UI: saved placement, bids, nonexclusive buy-now, stale action persistence, wallet limits and exactly-once collection passed');
