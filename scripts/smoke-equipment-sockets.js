// 장비 소켓(2026-09-30, 주얼 창을 대신함): 공허의 끌(장신구만), 타락 소켓, 소켓 달린 장신구 드랍, 주얼 해금 조건, 예전 장신구의 소켓,
// 끼우기 · 빼기, 능력치 · 배율, 거울 심장, 예전 주얼 슬롯 이관, 드롭 등급, 장비 상세 · 툴팁 · 대화 상자.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const nodes = [];
const context = buildGameRuntime({}, null, {
    getElementById: id => nodes.find(node => node.id === id && !node.removed) || null,
    body: { append(node) { node.remove = () => { node.removed = true; }; nodes.push(node); } }
});
const run = source => vm.runInContext(source, context);
const plain = source => JSON.parse(run(`JSON.stringify(${source})`));
const dialog = () => nodes.find(node => node.id === 'equipment-socket-overlay' && !node.removed);

run(`game = mergeDefaults({ season: 12 }); updateStaticUI = function () {}; addLog = function () {};
    game.contentProgression.inherited.push('jewel', 'craft'); contentProgression.sync(game);
    window.make = (slot, rarity = 'rare') => { const item = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === slot), rarity, 10);
        item.stats = []; item.baseStats = []; return item; };
    window.jewel = (id, stats, extra = {}) => ({ id, name: 'J' + id, rarity: 'magic', stats, ...extra });`);

// Void sockets (2026-10-07 user request; rings, amulets and belts used to start with one): no item starts with a socket. Only an
// accessory takes a void chisel, once; every other slot gets a socket from a 잿불가지 corruption alone.
const slots = ['반지', '목걸이', '허리띠', '무기', '투구', '갑옷', '장갑', '신발', '방패'];
assert.deepStrictEqual(slots.map(slot => run(`equipmentSockets.list(make('${slot}')).length`)), slots.map(() => 0), 'no item starts with a socket');
run(`window.amulet = make('목걸이'); game.currencies.voidChisel = 1;`);
assert.strictEqual(run('equipmentSockets.chisel(amulet).ok'), true);
assert.strictEqual(run('game.currencies.voidChisel'), 0, 'one chisel is spent');
assert.strictEqual(run('equipmentSockets.list(amulet).length'), 1);
run('game.currencies.voidChisel = 5;');
assert.strictEqual(run('equipmentSockets.chisel(amulet).ok'), false, 'a second socket cannot be chiseled');
assert.deepStrictEqual(slots.slice(3).map(slot => run(`equipmentSockets.chisel(make('${slot}')).ok`)), [false, false, false, false, false, false],
    'only an accessory takes a chisel');
assert.strictEqual(run("(() => { const relic = make('반지'); relic.fusedRelic = true; return equipmentSockets.chisel(relic).ok; })()"), false);
assert.strictEqual(run('game.currencies.voidChisel'), 5, 'refused chisels cost nothing');
run(`window.socketed = slot => { const item = make(slot); equipmentSockets.openVoidSocket(item); return item; };`);

// The corruption socket: any slot, once, beside an accessory's void socket; the outcome exists only once jewels are unlocked.
assert.deepStrictEqual(plain(`['투구', '반지'].map(slot => { const item = slot === '반지' ? socketed(slot) : make(slot);
    const can = canApplyTaintedOutcome(item, 'socket'); equipmentSockets.addCorruptionSocket(item);
    return [can, equipmentSockets.list(item).map(row => row.kind).join(), canApplyTaintedOutcome(item, 'socket')]; })`),
    [[true, 'corrupt', false], [true, 'void,corrupt', false]]);
// Socketed accessory drops: SOCKETED_ACCESSORY_DROP_CHANCE of accessory drops, never another slot.
const dropSockets = plain(`(() => { const keep = Math.random; let state = 11, rows = { accessory: 0, accessorySocketed: 0, other: 0 };
    Math.random = () => { state = (state * 16807) % 2147483647; return (state - 1) / 2147483646; };
    try { for (let i = 0; i < 6000; i++) { const item = generateEquipmentDrop({}, { zone: getZone(9) });
        if (item.rarity === 'unique') continue;
        if (equipmentSockets.isAccessory(item)) { rows.accessory++; if (equipmentSockets.count(item)) rows.accessorySocketed++; }
        else if (equipmentSockets.count(item)) rows.other++; } } finally { Math.random = keep; }
    return rows; })()`);
assert.strictEqual(dropSockets.other, 0, 'only accessories drop socketed');
assert(Math.abs(dropSockets.accessorySocketed / dropSockets.accessory - run('SOCKETED_ACCESSORY_DROP_CHANCE')) < 0.015,
    `accessories drop socketed now and then (${dropSockets.accessorySocketed}/${dropSockets.accessory})`);
// Before jewels unlock neither a socketed drop nor the corruption socket happens.
run(`game.contentProgression.inherited = game.contentProgression.inherited.filter(key => key !== 'jewel'); contentProgression.sync(game);`);
assert.strictEqual(run(`contentProgression.isUnlocked('jewel')`), false);
assert.strictEqual(run(`(() => { const keep = Math.random; Math.random = () => 0; try { return equipmentSockets.rollDropSocket(make('반지')); } finally { Math.random = keep; } })()`), false);
assert.strictEqual(run(`canApplyTaintedOutcome(make('투구'), 'socket')`), false);
run(`game.contentProgression.inherited.push('jewel'); contentProgression.sync(game);`);
// An older save keeps the socket every accessory used to have (once, jewels kept); a newer save is left as it is.
const legacy = plain(`(() => { const ring = make('반지'), boots = make('신발'), worn = make('목걸이'), kept = jewel(77, []);
    worn.voidSocket = { open: false, jewel: kept };
    const older = mergeDefaults({ saveVersion: 18, inventory: [ring, boots], equipment: { '목걸이': worn } });
    const newer = mergeDefaults({ saveVersion: 19, inventory: [make('허리띠')] });
    const again = mergeDefaults(JSON.parse(JSON.stringify(older)));
    return { ring: equipmentSockets.count(older.inventory[0]), boots: equipmentSockets.count(older.inventory[1]),
        worn: older.equipment['목걸이'].voidSocket, newer: equipmentSockets.count(newer.inventory[0]),
        again: equipmentSockets.count(again.inventory[0]), version: older.saveVersion }; })()`);
assert.deepStrictEqual(legacy, { ring: 1, boots: 0, worn: { open: true, jewel: { id: 77, name: 'J77', rarity: 'magic', stats: [] } }, newer: 0, again: 1,
    version: run('defaultGame.saveVersion') });

// Insert and remove move the exact objects; the store limit guards removal.
run(`game.equipment['반지1'] = socketed('반지'); game.equipment['반지2'] = socketed('반지');
    game.jewelInventory = [jewel(501, [{ id: 'flatHp', val: 40 }]), jewel(502, [{ id: 'flatHp', val: 10 }])];`);
const hpBefore = run('getPlayerStats().maxHp');
assert.strictEqual(run("equipmentSockets.insert(game.equipment['반지1'], 501).ok"), true);
assert.strictEqual(run('game.jewelInventory.length'), 1);
assert.strictEqual(run('getPlayerStats().maxHp') - hpBefore, 40, 'a socketed jewel counts in full');

// Socket multiplier: 심연 군주 (wlk8) +25%, 재물욕 (transcendent greed) +10%.
run("game.ascendClass = 'warlock'; game.ascendKeystones = ['wlk8'];");
assert.strictEqual(run('getSocketJewelMultiplier()'), 1.25);
assert.strictEqual(run('getPlayerStats().maxHp') - hpBefore, 50, 'the warlock lord keystone raises socketed jewel lines by a quarter');
run("game.ascendClass = null; game.ascendKeystones = [];");

// Mirror heart copies the jewel in the other ring's socket.
run(`game.jewelInventory.push(jewel(503, [{ id: 'pctDmg', val: 8 }], { rarity: 'unique', uniqueId: 'uj_mirror_heart' }));
    equipmentSockets.insert(game.equipment['반지2'], 503);`);
assert.deepStrictEqual(plain('getMirroredRingJewels().map(j => j.id)'), [501], 'the heart mirrors the partner ring socket');
assert.strictEqual(run('getPlayerStats().maxHp') - hpBefore, 80, 'the mirrored jewel applies once more');

run(`game.jewelInventory = []; for (let i = 0; i < getJewelInventoryLimit(); i++) game.jewelInventory.push(jewel(9000 + i, []));`);
assert.strictEqual(run("equipmentSockets.remove(game.equipment['반지1'], 'void', 0).ok"), false, 'a full store blocks removal');
run('game.jewelInventory = [];');
assert.strictEqual(run("equipmentSockets.remove(game.equipment['반지1'], 'void', 0).jewel.id"), 501);
assert.deepStrictEqual(plain('game.jewelInventory.map(j => j.id)'), [501]);

// Saved jewel slots move to the store once; amplify and the tab flags are dropped without compensation.
const migrated = plain(`(() => { const once = mergeDefaults({ jewelInventory: [jewel(1, [{ id: 'crit', val: 1 }])], jewelSlots: [jewel(2, [{ id: 'crit', val: 1 }]), null, jewel(3, [{ id: 'crit', val: 1 }])],
    jewelSlotAmplify: [5, 0, 2], unlocks: { jewel: true }, noti: { jewel: true },
    settings: { jewelAutoSalvageEnabled: true, jewelAutoSalvageRarities: { normal: true } } });
    const twice = mergeDefaults(JSON.parse(JSON.stringify(once)));
    return { ids: once.jewelInventory.map(j => j.id), again: twice.jewelInventory.map(j => j.id),
        gone: ['jewelSlots', 'jewelSlotAmplify'].every(key => !(key in once)) && !('jewel' in once.unlocks) && !('jewel' in once.noti)
            && !('jewelAutoSalvageEnabled' in once.settings) && !('jewelAutoSalvageRarities' in once.settings) }; })()`);
assert.deepStrictEqual(migrated, { ids: [1, 2, 3], again: [1, 2, 3], gone: true });

// Drops: without jewel crafting there are no zero-line (normal) jewels.
const rarities = plain('Array.from({ length: 400 }, () => generateJewelDrop(20)).map(j => j.rarity === "unique" ? "unique" : j.rarity + ":" + j.stats.length)');
assert(rarities.every(entry => entry === 'unique' || /^(magic:[12]|rare:[234])$/.test(entry)), 'dropped jewels always carry lines');

// Equipment detail, tooltip, pips and the dialog.
run(`game.jewelInventory = [jewel(601, [{ id: 'crit', val: 2 }])]; window.belt = socketed('허리띠'); game.inventory = [belt];`);
assert(run("equipmentSocketsUi.actionHtml(belt, null)").includes('>소켓 0/1<'), 'the detail offers the socket dialog');
run('game.currencies.voidChisel = 0;');
assert.strictEqual(run("equipmentSocketsUi.actionHtml(make('반지'), null)"), '', 'no socket and no chisel at hand means no button');
run('game.currencies.voidChisel = 1;');
assert(run("equipmentSocketsUi.actionHtml(make('반지'), null)").includes('>소켓 뚫기<'), 'with a chisel at hand a socketless accessory offers the dialog');
assert.strictEqual(run("equipmentSocketsUi.actionHtml(make('무기'), null)"), '', 'a weapon takes no chisel, so no button');
assert(run("equipmentSocketsUi.tooltipHtml(belt)").includes('빈 공허 소켓'));
run(`equipmentSocketsUi.open(belt.id, false);`);
assert(dialog() && dialog().innerHTML.includes('equipmentSocketsUi.insert(601)'), 'the dialog offers the stored jewel for the empty socket');
run('equipmentSocketsUi.insert(601);');
assert(dialog().innerHTML.includes("equipmentSocketsUi.remove('void',0)"), 'the dialog re-renders with the filled socket');
assert(run("equipmentSocketsUi.tooltipHtml(belt)").includes('◆ 공허 소켓') && run("equipmentSocketsUi.pipsHtml(belt)").includes('is-filled'));
run('equipmentSocketsUi.openStore();');
assert(!dialog().innerHTML.includes('equipmentSocketsUi.insert('), 'the store alone offers no insertion');
console.log('equipment sockets: accessory chisel, corruption socket, socketed drops, jewel unlock gate, legacy accessories, insert/remove, multiplier, mirror, migration, drops and dialog: OK');
