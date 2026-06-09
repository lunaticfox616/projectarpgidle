#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const passives = fs.readFileSync('js/passives.js', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const items = fs.readFileSync('data/items.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert(items.includes("voidChisel: { name: '공허의 끌'"), 'void chisel currency must exist');
assert(passives.includes('function isVoidSocketAccessoryItem(item)'), 'void socket eligibility helper must exist');
assert(passives.includes('if (!isVoidSocketAccessoryItem(item)) return addLog'), 'void chisel creation must use normalized accessory eligibility');
assert(passives.includes('function removeJewelFromAbyssSocket(socketIdx)'), 'abyss socket jewel removal helper must exist');
assert(passives.includes('item.abyssSockets[idx].jewel = null;'), 'abyss socket removal must clear the socket');
assert(passives.includes('safeExposeGlobals({ isVoidSocketAccessoryItem, applyVoidChiselToSelectedItem, insertJewelIntoVoidSocket, removeJewelFromVoidSocket, insertJewelIntoAbyssSocket, removeJewelFromAbyssSocket, toggleJewelFusionSelection'), 'socket and jewel helpers must be explicitly exposed for inline UI handlers');
assert(!passives.includes('game.jewelInventory.splice(invIdx, 1);\n    game.jewelInventory.splice(invIdx, 1);'), 'abyss socket insertion must not remove two inventory jewels');
assert(passives.includes('function getVoidJewelCraftMaterialIndices()'), 'void jewel crafting should choose valid material jewels');
assert(passives.includes('!entry.jewel.locked && !entry.jewel.waxedByBeeswax'), 'void jewel crafting must ignore locked/waxed materials for fallback selection');
assert(passives.includes('jewelFusionSelection = [];'), 'void jewel crafting should clear stale selection after consuming materials');
assert(ui.includes('onclick="removeJewelFromAbyssSocket(${sidx})"'), 'socketed abyss jewels must render a remove button');
assert(ui.includes('onclick="applyVoidChiselToSelectedItem()">사용</button>'), 'void chisel currency card must expose a use button');
assert(ui.includes('key === \'voidChisel\' ? getMobileCraftCurrencyUseState'), 'void chisel tooltip reason must use the special currency validator');
assert(ui.includes('onclick="insertJewelIntoVoidSocket(${i})"'), 'empty void sockets must render insert buttons');
assert(ui.includes('getVoidJewelCraftMaterialIndices().length < 2'), 'void jewel craft button must use eligible material count, not raw inventory size');
assert(index.includes('js/passives.js?v=20260608-jewel-socket4'), 'passives cache buster must be updated for socket fixes');
assert(index.includes('js/ui.js?v=20260608-jewel-socket3'), 'ui cache buster must be updated for socket fixes');
assert(index.includes('data/skills.js?v=20260608-flame-socket2'), 'skill data cache buster must include latest flame decay data');
assert(index.includes('js/combat.js?v=20260608-flame-socket2'), 'combat cache buster must include latest flame decay formula');

function loadSocketRuntime() {
    const start = passives.indexOf('function isVoidSocketAccessoryItem(item)');
    const end = passives.indexOf('safeExposeGlobals({ isVoidSocketAccessoryItem', start);
    assert(start >= 0 && end > start, 'socket runtime block must be discoverable');
    const sandbox = {
        console,
        logs: [],
        updates: 0,
        selectedItem: null,
        game: { woodsmanBuildLock: false, currencies: { voidChisel: 2 }, jewelInventory: [] }
    };
    sandbox.getSelectedCraftItem = () => sandbox.selectedItem;
    sandbox.getJewelInventoryLimit = () => 10;
    sandbox.addLog = (message, type) => { sandbox.logs.push({ message, type }); return message; };
    sandbox.updateStaticUI = () => { sandbox.updates += 1; };
    sandbox.safeExposeGlobals = exports => Object.assign(sandbox, exports);
    sandbox.window = sandbox;
    vm.runInNewContext(passives.slice(start, end), sandbox);
    return sandbox;
}

const runtime = loadSocketRuntime();
assert.strictEqual(runtime.isVoidSocketAccessoryItem({ slot: '반지1' }), true, 'equipped left ring slot must be accepted as an accessory');
assert.strictEqual(runtime.isVoidSocketAccessoryItem({ slot: '반지2' }), true, 'equipped right ring slot must be accepted as an accessory');
assert.strictEqual(runtime.isVoidSocketAccessoryItem({ slots: ['목걸이'] }), true, 'legacy unique records with slots[] must be accepted as necklace accessories');
assert.strictEqual(runtime.isVoidSocketAccessoryItem({ slot: '갑옷', slots: ['갑옷'] }), false, 'non-accessory slots must remain ineligible');

const jewel = { id: 91, name: '회귀 주얼', stats: [{ id: 'pctDmg', val: 3 }] };
runtime.selectedItem = { id: 11, name: '목걸이 회귀품', slots: ['목걸이'], rarity: 'rare' };
runtime.game.jewelInventory = [jewel];
runtime.applyVoidChiselToSelectedItem();
assert.strictEqual(runtime.selectedItem.voidSocket.open, true, 'void chisel must open a socket on slots[] necklace records');
assert.strictEqual(runtime.game.currencies.voidChisel, 1, 'opening a void socket must consume exactly one chisel');
runtime.insertJewelIntoVoidSocket(0);
assert.strictEqual(runtime.selectedItem.voidSocket.jewel, jewel, 'jewel must move from inventory into the accessory socket');
assert.deepStrictEqual(runtime.game.jewelInventory, [], 'socket insertion must remove exactly one jewel from inventory');
assert(runtime.logs.some(entry => entry.message.includes('공허 소켓에 [회귀 주얼] 장착')), 'socket insertion must produce an observable equip log');

console.log('accessory jewel socket smoke checks passed');
