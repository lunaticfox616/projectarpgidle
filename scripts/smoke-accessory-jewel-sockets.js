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
assert(ui.includes('function exposeUiRenderHelpersOnce()'), 'UI render helper globals must be exposed through a one-time render boundary');
assert(ui.includes('window.__uiRenderHelperGlobalsExposed'), 'UI render helper exposure must be guarded against repeat refreshes');
assert(!ui.includes('safeExposeGlobals({ switchTab'), 'UI switchTab handler must not be explicitly re-exposed over automatic classic-script globals');
assert(!ui.includes('safeExposeGlobals({ updateStaticUI'), 'UI updateStaticUI handler must not be explicitly re-exposed over automatic classic-script globals');
assert(!ui.includes('safeExposeGlobals({ checkUnlocks'), 'UI unlock/action handler group must not be explicitly re-exposed over automatic classic-script globals');
assert(!ui.includes('safeExposeGlobals({ showJewelRangeTooltip'), 'jewel tooltip hover must not add a new explicit global that can collide at runtime');
assert(!ui.includes('safeExposeGlobals({ buildJewelRangeTooltipHtml'), 'legacy jewel tooltip builder must not be globally re-exposed');
assert(ui.includes('getVoidJewelCraftMaterialIndices().length < 2'), 'void jewel craft button must use eligible material count, not raw inventory size');
assert(index.includes('js/passives.js?v=20260608-jewel-socket4'), 'passives cache buster must be updated for socket fixes');
assert(index.includes('js/ui.js?v=20260609-jewel-socket10'), 'ui cache buster must be updated for socket fixes');
assert(index.includes('data/skills.js?v=20260608-flame-socket2'), 'skill data cache buster must include latest flame decay data');
assert(index.includes('js/combat.js?v=20260609-core-cube-added-dps1'), 'combat cache buster must include latest flame decay formula');

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


function loadUiCraftSummaryRuntime() {
    const slotStart = ui.indexOf('function getItemSlotDisplayLabel(item, fallbackLabel)');
    const slotEnd = ui.indexOf('function showItemTooltip', slotStart);
    const summaryStart = ui.indexOf('function renderCraftSelectedSummary(item)');
    const summaryEnd = ui.indexOf('function renderChaosInfuserPanel', summaryStart);
    assert(slotStart >= 0 && slotEnd > slotStart, 'item slot display helper must be discoverable');
    assert(summaryStart >= 0 && summaryEnd > summaryStart, 'craft selected summary renderer must be discoverable');
    const host = { innerHTML: '' };
    const sandbox = {
        document: { getElementById(id) { return id === 'ui-craft-selected-summary' ? host : null; } },
        getItemExplicitOptionCount(item) { return Array.isArray(item && item.stats) ? item.stats.length : 0; },
        host
    };
    vm.runInNewContext(`${ui.slice(slotStart, slotEnd)}\n${ui.slice(summaryStart, summaryEnd)}\nthis.getItemSlotDisplayLabel = getItemSlotDisplayLabel;\nthis.renderCraftSelectedSummary = renderCraftSelectedSummary;`, sandbox);
    return sandbox;
}


function loadItemTooltipRuntime() {
    const toneStart = ui.indexOf('function getItemStatToneColor(statId)');
    const toneEnd = ui.indexOf('function getItemSlotDisplayLabel', toneStart);
    const slotStart = toneEnd;
    const slotEnd = ui.indexOf('function showItemTooltip', slotStart);
    const tooltipStart = slotEnd;
    const tooltipEnd = ui.indexOf('function hideItemTooltip', tooltipStart);
    assert(toneStart >= 0 && toneEnd > toneStart, 'item stat tone helper must be discoverable');
    assert(slotStart >= 0 && slotEnd > slotStart, 'item slot display helper must be discoverable');
    assert(tooltipStart >= 0 && tooltipEnd > tooltipStart, 'item tooltip renderer must be discoverable');
    const tooltipHost = { innerHTML: '', style: {}, classList: { toggle() {} } };
    const sandbox = {
        activeItemTooltipToken: null,
        game: { inventory: [], equipment: {} },
        document: { getElementById(id) { return id === 'item-tooltip-box' ? tooltipHost : null; } },
        getRarityColor() { return '#fff'; },
        getTierBadgeHtml(value) { return `[T${value}]`; },
        escapeHTML(value) { return String(value == null ? '' : value); },
        getStatName(id) { return id; },
        formatValue(id, value) { return String(value); },
        getItemExplicitOptionCount(item) { return (item.stats || []).length; },
        getImmutableItemSpecialStats() { return []; },
        getEquipCandidateSlots(item) { return item.slot === '반지' ? ['반지1', '반지2'] : [item.slot || '목걸이']; },
        getUiPlayerStats() { return {}; },
        getDualSlotDisplayLabel(slot) { return slot; },
        isDualSlotItem(slot) { return slot === '반지'; },
        COMPARE_STAT_META: {},
        positionTooltipElement() {},
        setActiveTooltip() {}
    };
    vm.runInNewContext(`${ui.slice(toneStart, toneEnd)}
${ui.slice(slotStart, slotEnd)}
${ui.slice(tooltipStart, tooltipEnd)}
this.showItemTooltip = showItemTooltip;`, sandbox);
    sandbox.tooltipHost = tooltipHost;
    return sandbox;
}

const itemTooltipRuntime = loadItemTooltipRuntime();
itemTooltipRuntime.game.inventory = [{
    id: 123,
    slots: ['목걸이'],
    name: '툴팁 목걸이',
    rarity: 'rare',
    baseName: '레거시 베이스',
    hiddenTier: 3,
    baseStats: [{ id: 'firePctDmg', val: 12, valMin: 10, valMax: 15, statName: '화염 피해' }],
    stats: []
}];
assert.doesNotThrow(() => itemTooltipRuntime.showItemTooltip({ clientX: 1, clientY: 2 }, 0, false), 'item tooltip must resolve stat tone helper without relying on render-time globals');
assert(itemTooltipRuntime.tooltipHost.innerHTML.includes('[목걸이] 툴팁 목걸이'), 'item tooltip must render a slotless slots[] accessory label');
assert(itemTooltipRuntime.tooltipHost.innerHTML.includes('화염 피해'), 'item tooltip must render base stat rows that use stat tone colors');

const uiCraftRuntime = loadUiCraftSummaryRuntime();
assert.strictEqual(uiCraftRuntime.getItemSlotDisplayLabel({ slots: ['목걸이'] }), '목걸이', 'slotless slots[] necklaces must render with a concrete display slot');
assert.strictEqual(uiCraftRuntime.getItemSlotDisplayLabel({ slot: '반지2' }), '반지', 'equipped ring display slots must hide numeric suffixes');
assert.strictEqual(uiCraftRuntime.getItemSlotDisplayLabel({}, '장비'), '장비', 'slotless non-records must fall back to a safe display label');
uiCraftRuntime.renderCraftSelectedSummary({ slots: ['목걸이'], name: '슬롯 배열 목걸이', rarity: 'rare', baseName: '레거시 베이스', stats: [] });
assert(uiCraftRuntime.host.innerHTML.includes('[목걸이] 슬롯 배열 목걸이'), 'slotless slots[] selected craft item must render a concrete accessory header');
assert(!uiCraftRuntime.host.innerHTML.includes('[undefined]'), 'slotless slots[] selected craft item header must not leak undefined');

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
