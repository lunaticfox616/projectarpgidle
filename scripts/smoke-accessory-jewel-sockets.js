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
assert(passives.includes('safeExposeGlobals({ isVoidSocketAccessoryItem, applyVoidChiselToSelectedItem, insertJewelIntoVoidSocket, openVoidSocketJewelOverlay, closeVoidSocketJewelOverlay, removeJewelFromVoidSocket, insertJewelIntoAbyssSocket, removeJewelFromAbyssSocket, toggleJewelFusionSelection'), 'socket and jewel helpers must be explicitly exposed for inline UI handlers');
assert(passives.includes('openVoidJewelCraftOverlay') && passives.includes('confirmVoidJewelFusion'), 'void jewel overlay craft/fusion handlers must be exposed');
assert(!passives.includes('game.jewelInventory.splice(invIdx, 1);\n    game.jewelInventory.splice(invIdx, 1);'), 'abyss socket insertion must not remove two inventory jewels');
assert(passives.includes('function getVoidJewelCraftMaterialIndices()'), 'void jewel crafting should choose valid material jewels');
assert(passives.includes('!entry.jewel.locked && !entry.jewel.waxedByBeeswax'), 'void jewel crafting must ignore locked/waxed materials for fallback selection');
assert(passives.includes('jewelFusionSelection = [];'), 'void jewel crafting should clear stale selection after consuming materials');
assert(ui.includes('onclick="removeJewelFromAbyssSocket(${sidx})"'), 'socketed abyss jewels must render a remove button');
assert(ui.includes('onclick="applyVoidChiselToSelectedItem()">사용</button>'), 'void chisel currency card must expose a use button');
assert(ui.includes('key === \'voidChisel\' ? getMobileCraftCurrencyUseState'), 'void chisel tooltip reason must use the special currency validator');
assert(ui.includes('function getItemSlotDisplayLabel(item, fallbackLabel)'), 'craft UI must derive display slots from slot or slots[] records');
assert(ui.includes('[${getItemSlotDisplayLabel(selectedItem)}] ${selectedItem.name}'), 'selected craft item header must not call selectedItem.slot.replace directly');
assert(ui.includes('onclick="openVoidSocketJewelOverlay()"'), 'empty void sockets must open a jewel picker overlay');
assert(!ui.includes('onclick="insertJewelIntoVoidSocket(${i})"'), 'empty void sockets must not inline every jewel insert button in the craft panel');
assert(ui.includes("'#void-socket-jewel-overlay'"), 'void socket jewel picker must pause gameplay when overlay pause is enabled');
assert(ui.includes('onclick="openVoidJewelCraftOverlay()"'), 'void jewel craft button must open the selection overlay');
assert(ui.includes('onclick="openVoidJewelFusionOverlay()"'), 'void fusion button must open the confirmation overlay');
assert(ui.includes("'#void-jewel-overlay'"), 'void jewel overlay must pause gameplay when overlay pause is enabled');
assert(ui.includes('function exposeUiRenderHelpersOnce()'), 'UI render helper globals must be exposed through a one-time render boundary');
assert(ui.includes('window.__uiRenderHelperGlobalsExposed'), 'UI render helper exposure must be guarded against repeat refreshes');
assert(!ui.includes('safeExposeGlobals({ switchTab'), 'UI switchTab handler must not be explicitly re-exposed over automatic classic-script globals');
assert(!ui.includes('safeExposeGlobals({ updateStaticUI'), 'UI updateStaticUI handler must not be explicitly re-exposed over automatic classic-script globals');
assert(!ui.includes('safeExposeGlobals({ checkUnlocks'), 'UI unlock/action handler group must not be explicitly re-exposed over automatic classic-script globals');
assert(!ui.includes('safeExposeGlobals({ showJewelRangeTooltip'), 'jewel tooltip hover must not add a new explicit global that can collide at runtime');
assert(!ui.includes('safeExposeGlobals({ buildJewelRangeTooltipHtml'), 'legacy jewel tooltip builder must not be globally re-exposed');
assert(ui.includes('getVoidJewelCraftMaterialIndices().length < 2'), 'void jewel craft button must use eligible material count, not raw inventory size');
assert(/js\/passives\.js\?v=[^"']+/.test(index), 'passives cache buster must be versioned for passive/runtime fixes');
assert(/js\/ui\.js\?v=[^"']+/.test(index), 'ui cache buster must be versioned for UI fixes');
assert(index.includes('data/skills.js?v=20260621-vertical-tabs1'), 'skill data cache buster must include latest skill data');
assert(/js\/combat\.js\?v=[^"']+/.test(index), 'combat script must use a versioned cache buster');

function loadSocketRuntime() {
    const start = passives.indexOf('function isVoidSocketAccessoryItem(item)');
    const end = passives.indexOf('safeExposeGlobals({ isVoidSocketAccessoryItem', start);
    assert(start >= 0 && end > start, 'socket runtime block must be discoverable');
    const sandbox = {
        console,
        logs: [],
        updates: 0,
        selectedItem: null,
        overlayHost: { innerHTML: '', removed: false, remove() { this.removed = true; } },
        game: { woodsmanBuildLock: false, currencies: { voidChisel: 2 }, jewelInventory: [] }
    };
    sandbox.document = {
        body: { insertAdjacentHTML() {} },
        getElementById(id) { return id === 'void-socket-jewel-overlay' ? sandbox.overlayHost : null; }
    };
    sandbox.getSelectedCraftItem = () => sandbox.selectedItem;
    sandbox.getJewelInventoryLimit = () => 10;
    sandbox.escapeHTML = value => String(value == null ? '' : value);
    sandbox.getJewelStats = jewel => Array.isArray(jewel && jewel.stats) ? jewel.stats : [];
    sandbox.getJewelStatToneColor = id => id === 'pctDmg' ? '#ffb86b' : '#d7e9ff';
    sandbox.getStatName = id => id;
    sandbox.formatJewelStatValue = (id, value) => String(value);
    sandbox.addLog = (message, type) => { sandbox.logs.push({ message, type }); return message; };
    sandbox.updateStaticUI = () => { sandbox.updates += 1; };
    sandbox.safeExposeGlobals = exports => Object.assign(sandbox, exports);
    sandbox.window = sandbox;
    vm.runInNewContext(passives.slice(start, end), sandbox);
    return sandbox;
}



function loadVoidJewelRuntime() {
    const start = passives.indexOf('const JEWEL_OPTION_POOL = [');
    const end = passives.indexOf('function getJewelAmplifyCost', start);
    assert(start >= 0 && end > start, 'void jewel runtime block must be discoverable');
    const overlayHost = { innerHTML: '', remove() { this.removed = true; } };
    const sandbox = {
        console,
        Math,
        jewelFusionSelection: [],
        voidJewelOverlayState: { mode: null, selected: [] },
        game: { woodsmanBuildLock: false, currencies: { voidChisel: 2 }, jewelInventory: [] },
        logs: [],
        updates: 0,
        document: {
            body: { insertAdjacentHTML() { sandbox.overlayHost = overlayHost; } },
            getElementById(id) {
                return id === 'void-jewel-overlay' || id === 'jewel-fusion-overlay' ? sandbox.overlayHost : null;
            }
        },
        overlayHost,
        addLog(message, type) { sandbox.logs.push({ message, type }); return message; },
        updateStaticUI() { sandbox.updates += 1; },
        escapeHTML(value) { return String(value == null ? '' : value); },
        getStatName(id) { return id; },
        formatValue(id, value) { return String(value); },
        getJewelStatToneColor(id) { return id === 'pctDmg' ? '#ffb86b' : '#d7e9ff'; },
        rndChoice(list) { return list[0]; }
    };
    vm.runInNewContext(`${passives.slice(start, end)}
this.openVoidJewelOverlay = openVoidJewelOverlay;
this.confirmVoidJewelCraft = confirmVoidJewelCraft;
this.craftJewelFusion = craftJewelFusion;
this.confirmJewelFusion = confirmJewelFusion;
this.fuseVoidJewel = fuseVoidJewel;`, sandbox);
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
    const tooltipClassSet = new Set();
    const tooltipHost = {
        innerHTML: '',
        style: {},
        classList: {
            toggle(name, enabled) { enabled ? tooltipClassSet.add(name) : tooltipClassSet.delete(name); },
            contains(name) { return tooltipClassSet.has(name); }
        }
    };
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

function loadJewelTooltipRuntime() {
    const tooltipStart = ui.indexOf('const createJewelRangeTooltipHtml = function createJewelRangeTooltipHtml(jewel)');
    const tooltipEnd = ui.indexOf('function showSocketedJewelTooltip', tooltipStart);
    assert(tooltipStart >= 0 && tooltipEnd > tooltipStart, 'jewel tooltip renderer must be discoverable');
    const sandbox = {
        Number,
        escapeHTML(value) { return String(value == null ? '' : value); },
        getJewelStats(jewel) { return Array.isArray(jewel && jewel.stats) ? jewel.stats : []; },
        isJewelPetiteStat(stat) { return !!(stat && stat.petite); },
        formatJewelStatValue(id, value) { return String(value); },
        getJewelStatToneColor(id) { return id === 'pctDmg' ? '#9fd6ff' : '#d7e9ff'; },
        getStatName(id) { return id; }
    };
    vm.runInNewContext(`${ui.slice(tooltipStart, tooltipEnd)}
this.createJewelRangeTooltipHtml = createJewelRangeTooltipHtml;`, sandbox);
    return sandbox;
}


const voidRuntime = loadVoidJewelRuntime();
voidRuntime.game.jewelInventory = [
    { name: '재료 A', stats: [{ id: 'pctDmg', val: 5 }, { id: 'flatHp', val: 30 }] },
    { name: '재료 B', stats: [{ id: 'crit', val: 2 }, { id: 'resAll', val: 6 }] }
];
voidRuntime.openVoidJewelOverlay('craft', [0, 1]);
assert(voidRuntime.overlayHost.innerHTML.includes('보유 공허의 끌'), 'void jewel craft overlay must show owned chisels');
assert(voidRuntime.overlayHost.innerHTML.includes('예상 결과'), 'void jewel craft overlay must show expected stats');
assert(voidRuntime.overlayHost.innerHTML.includes('pctDmg +5'), 'void jewel craft overlay must preview inherited stats');
assert(voidRuntime.overlayHost.innerHTML.includes('max-height:52vh;overflow:auto'), 'jewel overlay card grids must scroll inside the viewport');
assert(voidRuntime.overlayHost.innerHTML.includes('jewel-overlay-stat-line') && voidRuntime.overlayHost.innerHTML.includes('color:#9fd6ff'), 'jewel overlay stat options must use explicit stat tone colors');
voidRuntime.confirmVoidJewelCraft();
assert.strictEqual(voidRuntime.game.currencies.voidChisel, 1, 'void jewel crafting must consume one chisel after confirmation');
assert.strictEqual(voidRuntime.game.jewelInventory.length, 1, 'void jewel crafting must consume two selected material jewels and add one result');
assert.strictEqual(voidRuntime.game.jewelInventory[0].isVoid, true, 'void jewel crafting result must be marked as void');

voidRuntime.game.currencies.voidChisel = 1;
voidRuntime.game.jewelInventory = [
    { name: '공허 재료', isVoid: true, stats: [{ id: 'pctDmg', val: 5 }, { id: 'flatHp', val: 30 }, { id: 'crit', val: 2 }, { id: 'resAll', val: 6 }] },
    { name: '보조 재료', stats: [{ id: 'aspd', val: 4 }, { id: 'move', val: 7 }] }
];
voidRuntime.openVoidJewelOverlay('fusion', [0, 1]);
assert(voidRuntime.overlayHost.innerHTML.includes('최대 3줄만 계승'), 'void fusion overlay must explain the three inherited line limit');
assert(voidRuntime.overlayHost.innerHTML.includes('무작위 옵션 1줄'), 'void fusion overlay must explain the random fourth line');
voidRuntime.fuseVoidJewel(0, 1);
const fusedVoid = voidRuntime.game.jewelInventory[0];
assert.strictEqual(voidRuntime.game.currencies.voidChisel, 0, 'void fusion must consume one chisel');
assert.strictEqual(fusedVoid.stats.length, 4, 'void fusion must create three inherited lines plus one random line');
assert.strictEqual(fusedVoid.stats.slice(0, 3).map(stat => stat.id).join(','), 'pctDmg,flatHp,crit', 'void fusion must inherit only the first three unique core stats');
assert.notStrictEqual(fusedVoid.stats[3].id, 'resAll', 'void fusion fourth line must be random rather than the fourth source line');

voidRuntime.game.currencies.voidChisel = 0;
voidRuntime.game.jewelInventory = [
    { name: '공허', uniqueId: 'uj_void', rarity: 'unique', uniqueEffect: '융합 가능 수 6', voidFusionCharges: 2, stats: [{ id: 'pctDmg', val: -10 }] },
    { name: '공허 합성 대상', stats: [{ id: 'flatHp', val: 30 }] }
];
voidRuntime.openVoidJewelOverlay('fusion', [0, 1]);
assert(voidRuntime.overlayHost.innerHTML.includes('공허 합성 가능 수'), 'unique void jewel fusion overlay must show remaining fusion charges');
assert(voidRuntime.overlayHost.innerHTML.includes('재료를 소비하지 않고'), 'unique void jewel fusion must explain its distinct non-consuming mechanic');
assert.strictEqual(voidRuntime.fuseVoidJewel(0, 1), true, 'unique void jewel fusion must succeed without a void chisel');
assert.strictEqual(voidRuntime.game.jewelInventory.length, 2, 'unique void jewel fusion must not consume either selected jewel');
assert.strictEqual(voidRuntime.game.jewelInventory[0].voidFusionCharges, 1, 'unique void jewel fusion must consume one fusion charge');
assert.strictEqual(voidRuntime.game.jewelInventory[1].stats.length, 2, 'unique void jewel fusion must add one random option line to the target');
assert.strictEqual(voidRuntime.game.currencies.voidChisel, 0, 'unique void jewel fusion must not consume void chisels');
voidRuntime.game.jewelInventory[0].voidFusionCharges = 0;
assert.strictEqual(voidRuntime.fuseVoidJewel(0, 1), false, 'unique void jewel with zero charges must not fuse with another jewel');
voidRuntime.openVoidJewelOverlay('fusion', [0, 1]);
assert(voidRuntime.overlayHost.innerHTML.includes('합성/공허융합 불가'), 'unique void jewel overlay must mark zero-charge jewels as unavailable');

voidRuntime.game.currencies.jewelShard = 6;
voidRuntime.game.currencies.voidChisel = 1;
voidRuntime.game.jewelInventory = [
    { name: '일반 합성 A', stats: [{ id: 'pctDmg', val: 5 }] },
    { name: '일반 합성 B', stats: [{ id: 'crit', val: 2 }] }
];
voidRuntime.jewelFusionSelection = [0, 1];
voidRuntime.craftJewelFusion();
assert(voidRuntime.overlayHost.innerHTML.includes('보유 주얼 결정'), 'selected jewel fusion must open the shard-based normal fusion overlay');
assert(!voidRuntime.overlayHost.innerHTML.includes('보유 공허의 끌'), 'normal jewel fusion overlay must be functionally distinct from void fusion');
assert(voidRuntime.overlayHost.innerHTML.includes('일반 주얼 융합은 1줄 옵션 주얼 2개'), 'normal jewel fusion overlay must explain normal one-line material rules');
voidRuntime.confirmJewelFusion();
assert.strictEqual(voidRuntime.game.currencies.jewelShard, 0, 'normal jewel fusion must consume jewel shards, not void chisels');
assert.strictEqual(voidRuntime.game.currencies.voidChisel, 1, 'normal jewel fusion must not consume void chisels');

const jewelTooltipRuntime = loadJewelTooltipRuntime();
let voidTooltip = jewelTooltipRuntime.createJewelRangeTooltipHtml({ name: '공허', uniqueId: 'uj_void', rarity: 'unique', uniqueEffect: '융합 가능 수 6', voidFusionCharges: 2, stats: [{ id: 'pctDmg', val: -10, tier: 1 }] });
assert(voidTooltip.includes('공허 합성 가능 수: 2회 남음'), 'unique void jewel tooltip must show remaining fusion charges');
let emptyVoidTooltip = jewelTooltipRuntime.createJewelRangeTooltipHtml({ name: '공허', uniqueId: 'uj_void', rarity: 'unique', uniqueEffect: '융합 가능 수 6', voidFusionCharges: 0, stats: [] });
assert(emptyVoidTooltip.includes('합성/공허융합 불가'), 'zero-charge unique void jewel tooltip must explain fusion is unavailable');

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

itemTooltipRuntime.game.inventory = [{
    id: 124,
    slot: '반지',
    name: '비교 반지',
    rarity: 'rare',
    baseName: '테스트 베이스',
    hiddenTier: 4,
    baseStats: [],
    stats: [{ id: 'flatHp', val: 18, statName: '생명력' }]
}];
itemTooltipRuntime.game.equipment = {
    반지1: { id: 201, slot: '반지1', stats: [{ id: 'flatHp', val: 4 }] },
    반지2: { id: 202, slot: '반지2', stats: [{ id: 'flatHp', val: 27 }] }
};
itemTooltipRuntime.COMPARE_STAT_META = { flatHp: { label: '생명력', format(value) { return String(value); } } };
itemTooltipRuntime.getUiPlayerStats = () => {
    let flatHp = 0;
    Object.values(itemTooltipRuntime.game.equipment).forEach(item => {
        (item.stats || []).forEach(stat => { if (stat.id === 'flatHp') flatHp += Number(stat.val || 0); });
    });
    return { flatHp };
};
itemTooltipRuntime.showItemTooltip({ clientX: 1, clientY: 2 }, 0, false);
assert(itemTooltipRuntime.tooltipHost.classList.contains('item-compare-tooltip'), 'dual-slot item comparison must use split compare tooltip host class');
assert(itemTooltipRuntime.tooltipHost.classList.contains('dual-compare-tooltip'), 'dual-slot item comparison must keep compact dual tooltip class');
assert(itemTooltipRuntime.tooltipHost.innerHTML.includes('class="item-tooltip-main"'), 'dual comparison tooltip must wrap item details separately from comparison panels');
assert(itemTooltipRuntime.tooltipHost.innerHTML.includes('class="item-compare-grid"'), 'two-slot comparison must render as a compact compare grid');
assert.strictEqual((itemTooltipRuntime.tooltipHost.innerHTML.match(/item-compare-panel/g) || []).length, 2, 'ring comparison must render both equipped-slot comparison panels');

itemTooltipRuntime.game.inventory = [{
    id: 125,
    slot: '장갑',
    name: '비교 장갑',
    rarity: 'rare',
    baseName: '테스트 장갑',
    hiddenTier: 4,
    baseStats: [],
    stats: [{ id: 'flatHp', val: 33, statName: '생명력' }]
}];
itemTooltipRuntime.game.equipment = { 장갑: { id: 203, slot: '장갑', stats: [{ id: 'flatHp', val: 7 }] } };
itemTooltipRuntime.showItemTooltip({ clientX: 1, clientY: 2 }, 0, false);
assert(itemTooltipRuntime.tooltipHost.classList.contains('item-compare-tooltip'), 'single-slot item comparison must also use split compare tooltip host class');
assert(!itemTooltipRuntime.tooltipHost.classList.contains('dual-compare-tooltip'), 'single-slot item comparison must not use dual-only tooltip class');
assert(itemTooltipRuntime.tooltipHost.innerHTML.includes('class="item-compare-single"'), 'single-slot comparison must render a separate comparison panel below item details');
assert(itemTooltipRuntime.tooltipHost.innerHTML.includes('class="item-tooltip-main"'), 'single-slot comparison tooltip must keep item details in a separate sibling panel');

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
runtime.openVoidSocketJewelOverlay();
assert(runtime.overlayHost.innerHTML.includes('공허 소켓 주얼 장착'), 'empty void socket equip button must open a socket jewel picker overlay');
assert(runtime.overlayHost.innerHTML.includes('회귀 주얼'), 'void socket jewel picker must list inventory jewels inside the overlay');
assert(runtime.overlayHost.innerHTML.includes('color:#ffb86b'), 'void socket jewel picker options must use stat tone colors');
runtime.insertJewelIntoVoidSocket(0);
assert.strictEqual(runtime.selectedItem.voidSocket.jewel, jewel, 'jewel must move from inventory into the accessory socket');
assert.deepStrictEqual(runtime.game.jewelInventory, [], 'socket insertion must remove exactly one jewel from inventory');
assert(runtime.logs.some(entry => entry.message.includes('공허 소켓에 [회귀 주얼] 장착')), 'socket insertion must produce an observable equip log');

console.log('accessory jewel socket smoke checks passed');
