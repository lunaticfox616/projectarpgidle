const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const interactionSource = fs.readFileSync('js/equipment-inventory-grid-ui.js', 'utf8');

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

const context = buildGameRuntime();
const footprint = item => plain(context.getEquipmentInventoryFootprint(item));

assert.deepStrictEqual(footprint({ slot: '반지' }), { columns: 1, rows: 1 });
assert.deepStrictEqual(footprint({ slot: '허리띠' }), { columns: 2, rows: 1 });
assert.deepStrictEqual(footprint({ slot: '장갑' }), { columns: 2, rows: 2 });
assert.deepStrictEqual(footprint({ slot: '갑옷' }), { columns: 2, rows: 2 });
assert.deepStrictEqual(footprint({ slot: '무기', baseName: '잿불 완드' }), { columns: 1, rows: 2 });
assert.deepStrictEqual(footprint({ slot: '무기', baseName: '녹슨 검' }), { columns: 1, rows: 3 });
assert.deepStrictEqual(footprint({ slot: '무기', baseName: '돌풍 장궁' }), { columns: 1, rows: 4 });
assert.deepStrictEqual(footprint({ slot: '무기', baseName: '사냥꾼의 도끼' }), { columns: 1, rows: 3 });
assert.strictEqual(context.getEquipmentInventoryPageCount({ season: 1, loopCount: 0 }), 1, 'the first loop must start with one storage page');
assert.strictEqual(context.getEquipmentInventoryPageCount({ season: 5, loopCount: 4 }), 2, 'loop 5 must unlock the second storage page');
assert.strictEqual(context.getEquipmentInventoryPageCount({ season: 30, loopCount: 29 }), 7, 'five-loop page gains must continue through loop 30');
assert.strictEqual(context.getEquipmentInventoryPageCount({ season: 40, loopCount: 39 }), 8, 'after loop 30 pages must unlock every ten loops');
assert.strictEqual(context.getEquipmentInventoryPageCount({ season: 80, loopCount: 79 }), 12, 'loop storage must cap at twelve pages');
assert.strictEqual(context.getEquipmentInventoryPageCount({ season: 200, loopCount: 199 }), 12, 'the page cap must hold for very high loops');
assert.strictEqual(context.getInventoryLimit({ season: 5, loopCount: 4 }), 240, 'two pages must expose 240 actual grid cells');

const overflowRecoveryState = {
    season: 1,
    loopCount: 0,
    inventory: Array.from({ length: 121 }, (_, index) => ({
        id: 8000 + index,
        instanceId: `recovery-ring-${index}`,
        slot: '반지',
        name: `복구 반지 ${index}`,
        rarity: 'normal'
    })),
    equipmentInventoryPlacements: {},
    equipmentTemporaryStorage: []
};
const overflowRecoveryLayout = context.equipmentInventoryGridRuntime.ensureState(overflowRecoveryState);
assert.strictEqual(overflowRecoveryLayout.pageCount, 1, 'recovery must not create inventory pages beyond the unlocked page count');
assert.strictEqual(overflowRecoveryState.inventory.length, 120, 'items that fit must remain in the regular inventory');
assert.strictEqual(overflowRecoveryState.equipmentTemporaryStorage.length, 1,
    'an item with no recoverable cell must move to temporary storage instead of disappearing');
assert.strictEqual(context.equipmentInventoryGridRuntime.restoreTemporaryItem('recovery-ring-120', overflowRecoveryState).ok, false,
    'temporary storage recovery must remain blocked while the regular inventory is full');
const releasedRecoveryItem = overflowRecoveryState.inventory.shift();
delete overflowRecoveryState.equipmentInventoryPlacements[releasedRecoveryItem.instanceId];
assert.strictEqual(context.equipmentInventoryGridRuntime.restoreTemporaryItem('recovery-ring-120', overflowRecoveryState).ok, true,
    'temporary storage recovery must succeed after enough regular inventory space is released');
assert.strictEqual(overflowRecoveryState.inventory.length, 120, 'restoring must add the temporary item exactly once');
assert.strictEqual(overflowRecoveryState.equipmentTemporaryStorage.length, 0, 'restored temporary storage entries must be removed');

const exactAsset = context.getEquipmentGridVisualAsset({ slot: '무기', baseId: 'rusted_blade' });
assert.strictEqual(exactAsset, 'assets/items/illustrated/rusted_blade.webp');
const wandAsset = context.getEquipmentGridVisualAsset({ slot: '무기', baseId: 'unknown_wand', baseName: '검증 완드' });
const swordAsset = context.getEquipmentGridVisualAsset({ slot: '무기', baseId: 'unknown_sword', baseName: '검증 검' });
const bowAsset = context.getEquipmentGridVisualAsset({ slot: '무기', baseId: 'unknown_bow', baseName: '검증 장궁' });
assert.strictEqual(wandAsset, 'assets/items/illustrated/apprentice_familiar_wand.webp', 'unknown wands must remain recognizable wands');
assert.strictEqual(swordAsset, 'assets/items/illustrated/rusted_blade.webp', 'unknown swords must remain swords');
assert.strictEqual(bowAsset, 'assets/items/illustrated/windlash_bow.webp', 'unknown bows must remain bows');
const firstFallback = context.getEquipmentGridVisualAsset({ slot: '투구', baseId: 'unknown_helm' });
const repeatedFallback = context.getEquipmentGridVisualAsset({ slot: '투구', baseId: 'unknown_helm' });
assert.strictEqual(firstFallback, repeatedFallback, 'the same base must keep the same visual across renders');
assert(context.ITEM_VISUAL_ASSET_DB.equipment['투구'] === firstFallback,
    'an unmapped helmet must stay inside the helmet art pool');

const gridAssets = new Set();
const gridDb = context.ITEM_VISUAL_ASSET_DB.equipmentGrid;
Object.values(gridDb.baseAssets).forEach(asset => gridAssets.add(asset));
Object.entries(gridDb.uniqueAssets).forEach(([name, asset]) => {
    gridAssets.add(asset);
    assert.strictEqual(context.getEquipmentGridVisualAsset({ rarity: 'unique', name, baseId: 'rusted_blade' }), asset, 'dedicated unique art takes priority over an upgraded or shared base');
    assert.strictEqual(context.getEquipmentGridVisualAsset({ rarity: 'normal', name, baseId: 'rusted_blade' }), gridDb.baseAssets.rusted_blade, 'a normal item cannot acquire unique art through its display name');
});
assert.strictEqual(context.getEquipmentGridVisualAsset({ rarity: 'unique', name: 'constructor', baseId: 'rusted_blade' }), gridDb.baseAssets.rusted_blade, 'unknown unique names must use the valid base image');
Object.values(context.ITEM_VISUAL_ASSET_DB.equipment).forEach(asset => gridAssets.add(asset));
assert.strictEqual(new Set(Object.entries(context.ITEM_VISUAL_ASSET_DB.equipment).filter(([key]) => !['default', '무기'].includes(key)).map(([, asset]) => asset)).size, 8, 'each armor/accessory slot has its own recognizable silhouette');
gridAssets.forEach(asset => {
    assert(/\.webp$/.test(asset), `${asset} must be a generated raster asset`);
    assert(fs.existsSync(asset), `${asset} must exist`);
    assert(asset.startsWith('assets/items/illustrated/'), 'equipment must use the new generated art');
    assert(fs.statSync(asset).size < 300000, 'each independently loaded equipment image must stay below 300 kB');
});

vm.runInContext(`game.inventory = [
    { id: 7001, instanceId: 'grid-bow', slot: '무기', baseId: 'windlash_bow', baseName: '돌풍 장궁', name: '검증용 장궁', rarity: 'rare', baseStats: [], stats: [] },
    { id: 7002, instanceId: 'grid-armor', slot: '갑옷', baseId: 'plate', baseName: '판금', name: '검증용 판금', rarity: 'magic', baseStats: [], stats: [] },
    { id: 7003, instanceId: 'grid-ring', slot: '반지', baseId: 'ring', baseName: '반지', name: '검증용 반지', rarity: 'normal', baseStats: [], stats: [] }
]`, context);
const layout = plain(context.equipmentInventoryGridRuntime.ensureState());
assert.strictEqual(layout.columns, 10, 'the saved logical grid must always use ten columns');
assert.strictEqual(layout.rowsPerPage, 12, 'one inventory page must contain twelve rows');
assert.strictEqual(layout.pageCount, 1, 'the first loop test state must render one page');
assert.strictEqual(context.getInventoryUsedCellCount(vm.runInContext('game', context)), 9, 'capacity usage must count occupied cells rather than item entries');
assert.strictEqual(Object.keys(vm.runInContext('game.equipmentInventoryPlacements', context)).length, 3, 'every item must receive one persisted placement');
const occupied = new Set();
layout.entries.forEach(entry => {
    for (let row = entry.row; row < entry.row + entry.rows; row++) {
        for (let column = entry.column; column < entry.column + entry.columns; column++) {
            let key = `${column}:${row}`;
            assert(!occupied.has(key), `initial placement must not overlap at ${key}`);
            occupied.add(key);
        }
    }
});
const selfOverlapState = {
    season: 1,
    loopCount: 0,
    inventory: [
        { id: 7050, instanceId: 'self-armor', slot: '갑옷', name: '자기 영역 검증 갑옷', rarity: 'normal' },
        { id: 7051, instanceId: 'single-blocker', slot: '반지', name: '단일 충돌 반지', rarity: 'normal' }
    ],
    equipmentInventoryPlacements: {
        'self-armor': { column: 0, row: 0 },
        'single-blocker': { column: 2, row: 0 }
    }
};
const selfOverlapLayout = context.equipmentInventoryGridRuntime.ensureState(selfOverlapState);
const selfOverlapResult = context.equipmentInventoryGridRuntime.canPlaceInventoryItemInLayout('self-armor', 1, 0, selfOverlapLayout);
assert.strictEqual(selfOverlapResult.ok, false, 'overlapping another item must reject the whole move');
const protectedState = plain(selfOverlapState);
const protectedBefore = JSON.stringify(protectedState);
assert.strictEqual(context.equipmentInventoryGridRuntime.placeInventoryItem('self-armor', 1, 0, protectedState).ok, false);
assert.strictEqual(JSON.stringify(protectedState), protectedBefore, 'rejected placement preserves inventory, storage and positions');
const bowStart = layout.entries.find(entry => entry.key === 'grid-bow');
const ringStart = layout.entries.find(entry => entry.key === 'grid-ring');
const beforeOccupiedMove = vm.runInContext('JSON.stringify(game.equipmentInventoryPlacements)', context);
const blockedMove = context.equipmentInventoryGridRuntime.move('grid-ring', bowStart.column, bowStart.row);
assert.strictEqual(blockedMove.ok, false, 'a direct move must not silently exchange two inventory positions');
assert.strictEqual(vm.runInContext('JSON.stringify(game.equipmentInventoryPlacements)', context), beforeOccupiedMove,
    'an occupied direct move must leave both saved positions unchanged');
const occupiedDrop = context.equipmentInventoryGridRuntime.placeInventoryItem('grid-ring', bowStart.column, bowStart.row);
assert.strictEqual(occupiedDrop.ok, false);
assert.strictEqual(vm.runInContext('JSON.stringify(game.equipmentInventoryPlacements)', context), beforeOccupiedMove);
assert.strictEqual(vm.runInContext('game.equipmentTemporaryStorage.length', context), 0);
const moved = context.equipmentInventoryGridRuntime.move('grid-ring', 9, layout.rows - 1);
assert.strictEqual(moved.ok, true, 'an empty target cell must accept a click or drag move');
assert.deepStrictEqual(plain(vm.runInContext(`game.equipmentInventoryPlacements['grid-ring']`, context)), { column: 9, row: layout.rows - 1 });
const reclaimedOrigin = context.equipmentInventoryGridRuntime.move('grid-bow', bowStart.column, bowStart.row);
assert.strictEqual(reclaimedOrigin.ok, true, 'a moved item must release its complete previous footprint immediately');
assert.deepStrictEqual(plain(vm.runInContext(`game.equipmentInventoryPlacements['grid-bow']`, context)), { column: bowStart.column, row: bowStart.row });
const beforeRejectedSwap = vm.runInContext('JSON.stringify(game.equipmentInventoryPlacements)', context);
const rejectedSwap = context.equipmentInventoryGridRuntime.move('grid-armor', 9, layout.rows - 1);
assert.strictEqual(rejectedSwap.ok, false, 'a larger item must not swap into an out-of-bounds footprint');
assert.strictEqual(vm.runInContext('JSON.stringify(game.equipmentInventoryPlacements)', context), beforeRejectedSwap, 'a rejected swap must not mutate either position');
const isolatedMove = context.equipmentInventoryGridRuntime.move('grid-bow', 5, 0);
assert.strictEqual(isolatedMove.ok, true, 'a multi-cell item must move into an isolated empty footprint');
const overlappingSelfMove = context.equipmentInventoryGridRuntime.move('grid-bow', 6, 0);
assert.strictEqual(overlappingSelfMove.ok, true, 'a move may reuse part of the carried item own footprint');
assert.deepStrictEqual(plain(vm.runInContext(`game.equipmentInventoryPlacements['grid-bow']`, context)), { column: 6, row: 0 },
    'a self-overlapping move must persist the new top-left cell');

function makeClassList() {
    const values = new Set();
    return {
        add: (...names) => names.forEach(name => values.add(name)),
        remove: (...names) => names.forEach(name => values.delete(name)),
        toggle: (name, on) => on ? values.add(name) : values.delete(name),
        contains: name => values.has(name)
    };
}
const interactionLayout = context.equipmentInventoryGridRuntime.ensureState();
const interactionGrid = {
    dataset: { equipmentGridRows: '12' }, classList: makeClassList(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 480 }),
    querySelector(selector) {
        const column = Number((selector.match(/data-grid-column="(\d+)"/) || [])[1]);
        const row = Number((selector.match(/data-grid-row="(\d+)"/) || [])[1]);
        if (!Number.isFinite(column) || !Number.isFinite(row)) return null;
        return { classList: makeClassList(), getBoundingClientRect: () => ({ left: column * 40, top: row * 40, width: 40, height: 40 }) };
    },
    querySelectorAll: () => [], appendChild() {}
};
function makeInteractionCard(entry) {
    return {
        dataset: { equipmentGridKey: entry.key }, classList: makeClassList(), style: {}, setAttribute() {},
        closest(selector) {
            if (selector === '.search-result-list') return interactionGrid;
            if (selector === '.equipment-grid-item' || selector === 'button') return this;
            return null;
        },
        setPointerCapture() {},
        getBoundingClientRect: () => ({ left: entry.column * 40, top: (entry.row % 12) * 40, width: entry.columns * 40, height: entry.rows * 40 })
    };
}
const interactionCards = interactionLayout.entries.map(makeInteractionCard);
const originalQuerySelectorAll = context.document.querySelectorAll;
const originalUpdateStaticUI = context.updateStaticUI;
const originalSaveGame = context.saveGame;
const originalHideInfoTooltip = context.hideInfoTooltip;
const originalHideItemTooltip = context.hideItemTooltip;
const originalShowItemTooltip = context.showItemTooltip;
const originalShowGameToast = context.showGameToast;
context.document.querySelectorAll = selector => {
    if (selector === '[data-equipment-grid-key]') return interactionCards;
    if (selector.includes('.search-result-list')) return [interactionGrid];
    return [];
};
context.updateStaticUI = () => {};
let interactionSaveCount = 0;
context.saveGame = () => { interactionSaveCount++; return true; };
context.hideInfoTooltip = () => {};
context.hideItemTooltip = () => {};
const carriedTooltipItems = [];
context.showItemTooltip = (event, index, isEquip, itemOverride) => carriedTooltipItems.push(itemOverride);
const interactionToasts = [];
context.showGameToast = message => interactionToasts.push(message);
const ringCard = interactionCards.find(card => card.dataset.equipmentGridKey === 'grid-ring');
const bowCard = interactionCards.find(card => card.dataset.equipmentGridKey === 'grid-bow');
const interactionBowEntry = interactionLayout.entries.find(entry => entry.key === 'grid-bow');
const clickEvent = card => {
    const rect = card.getBoundingClientRect();
    return { currentTarget: card, target: card, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, stopPropagation() {} };
};
const placementsBeforeLift = vm.runInContext('JSON.stringify(game.equipmentInventoryPlacements)', context);
context.equipmentInventoryInteraction.handleItemClick(clickEvent(ringCard), 'grid-ring', 2);
context.equipmentInventoryInteraction.handleItemClick(clickEvent(bowCard), 'grid-bow', 0);
assert.strictEqual(context.equipmentInventoryInteraction.isCarrying(), false, 'single clicks only select');
assert.strictEqual(context.equipmentInventoryInteraction.getFocusedKey(), 'grid-bow');
assert.strictEqual(vm.runInContext('JSON.stringify(game.equipmentInventoryPlacements)', context), placementsBeforeLift);
assert.strictEqual(interactionSaveCount, 0, 'selection must not save an uncommitted move');
assert.strictEqual(vm.runInContext('game.equipmentTemporaryStorage.length', context), 0);
context.document.querySelectorAll = originalQuerySelectorAll;
context.updateStaticUI = originalUpdateStaticUI;
context.saveGame = originalSaveGame;
context.hideInfoTooltip = originalHideInfoTooltip;
context.hideItemTooltip = originalHideItemTooltip;
context.showItemTooltip = originalShowItemTooltip;
context.showGameToast = originalShowGameToast;

const beforeUnarmedCellClick = vm.runInContext('JSON.stringify(game.equipmentInventoryPlacements)', context);
context.equipmentInventoryInteraction.setFocusedKey('grid-ring');
assert.strictEqual(context.equipmentInventoryInteraction.moveFocusedTo(null, 0, 0), false,
    'an empty-cell click must not move a previously focused item unless it is currently carried');
assert.strictEqual(vm.runInContext('JSON.stringify(game.equipmentInventoryPlacements)', context), beforeUnarmedCellClick,
    'an unarmed empty-cell click must leave every saved placement unchanged');

const repaired = vm.runInContext(`mergeDefaults({ inventory: [{ id: 7100, instanceId: 'repair-ring', slot: '반지', rarity: 'normal', baseStats: [], stats: [] }], equipmentInventoryPlacements: { 'repair-ring': { column: 0, row: 199 }, stale: { column: 1, row: 1 } } })`, context);
assert.deepStrictEqual(Object.keys(plain(repaired.equipmentInventoryPlacements)), ['repair-ring'], 'load migration must remove stale and malformed placements');
assert.deepStrictEqual(plain(repaired.equipmentInventoryPlacements['repair-ring']), { column: 0, row: 0 }, 'a malformed saved position must be packed safely');

const item = vm.runInContext(`game.inventory.find(candidate => candidate && candidate.instanceId === 'grid-bow')`, context);
const bowPlacement = context.equipmentInventoryGridRuntime.ensureState().entries.find(entry => entry.key === 'grid-bow');
const html = context.renderEquipmentGridItem(item, 0, null, bowPlacement);
assert(html.includes('--item-grid-columns:1;--item-grid-rows:4;'), 'a bow must visibly occupy a 1x4 footprint');
assert(html.includes(`grid-column:${bowPlacement.column + 1}/span 1;grid-row:${bowPlacement.row + 1}/span 4;`), 'the renderer must use the saved top-left grid position');
assert(html.includes('illustrated/windlash_bow.webp'), 'the grid must render footprint-matched clean artwork');
assert(html.includes('equipmentInventoryInteraction.handleItemDoubleClick'),
    'an item resting in its own cell must retain guarded double-click equip');
assert(!html.includes('handleInventoryCardDoubleClick'),
    'double-click equip must be owned by the movement interaction guard instead of bypassing it');
assert(!html.includes('equipment-grid-inspector-actions'), 'grid cells must not squeeze full action controls into the footprint');
const mutedHtml = context.renderEquipmentGridItem(item, 0, null, bowPlacement, { filterActive: true, filterMatched: false });
const matchedHtml = context.renderEquipmentGridItem(item, 0, null, bowPlacement, { filterActive: true, filterMatched: true });
assert(mutedHtml.includes('is-filter-muted'), 'a non-matching filtered item must remain rendered in a muted state');
assert(mutedHtml.includes('equipmentInventoryInteraction.handleItemClick'), 'a muted filtered item must remain movable');
assert(matchedHtml.includes('is-filter-match'), 'a matching filtered item cell must receive a visible highlight state');
const gridHtml = context.renderEquipmentInventoryGrid(context.equipmentInventoryGridRuntime.ensureState(), vm.runInContext('game.inventory.map((item, idx) => ({ item, idx }))', context));
assert(gridHtml.includes('data-grid-column="9"'), 'the renderer must expose clickable destination cells');
assert(gridHtml.includes('equipmentInventoryInteraction.moveFocusedTo'), 'empty cells must support click-to-move');

// Selection, popover placement and actions run in equipment-selection-flow.spec.js
// against the real DOM (desktop and touch), including equipped gear and loot refresh.

const paperdoll = { innerHTML: '' };
context.document.getElementById = id => id === 'paperdoll-test' ? paperdoll : null;
vm.runInContext(`game.equipment = {
    장갑1: { id: 7201, instanceId: 'left-glove', slot: '장갑', baseId: 'left-hide-glove', name: '왼손 장갑', rarity: 'normal', baseStats: [{ id: 'aspd', val: 7, statName: 'TEST_OPTION_SHOULD_NOT_RENDER' }], stats: [] },
    장갑2: { id: 7202, instanceId: 'right-glove', slot: '장갑', baseId: 'right-steel-glove', name: '오른손 장갑', rarity: 'normal', baseStats: [], stats: [] }
}`, context);
context.renderPaperdoll('paperdoll-test', false);
assert(paperdoll.innerHTML.includes('equipment-slot-visual'), 'equipped slots must render image-backed item silhouettes');
assert(paperdoll.innerHTML.includes('assets/items/illustrated/hide_gloves.webp'), 'paperdoll hands use the recognizable glove silhouette');
assert(paperdoll.innerHTML.includes('slot-장갑1') && paperdoll.innerHTML.includes('slot-장갑2'),
    'the paperdoll must retain separate left and right glove slots for visual mirroring');
assert(!paperdoll.innerHTML.includes('TEST_OPTION_SHOULD_NOT_RENDER'),
    'equipment slots must show the item name and image without option text');
assert(paperdoll.innerHTML.includes('equipmentInventoryInteraction.handleEquippedItemClick'),
    'equipped items must enter the same click-carry interaction as inventory items');
assert(paperdoll.innerHTML.includes('equipment-slot-empty') && paperdoll.innerHTML.includes(`handleEquippedItemClick(event,'무기')`),
    'empty paperdoll slots must accept a compatible carried inventory item');
assert(paperdoll.innerHTML.includes('draggable="false"'), 'paperdoll artwork must not start the browser native image drag');
assert.strictEqual(context.canEquipItemToSlot(vm.runInContext(`game.equipment['장갑2']`, context), '장갑1'), true,
    'a glove must be accepted by either glove paperdoll slot');
assert.strictEqual(context.canEquipItemToSlot(vm.runInContext(`game.equipment['장갑2']`, context), '무기'), false,
    'an incompatible paperdoll slot must reject the carried item');
const leftGloveKey = context.equipmentLoadoutRuntime.getItemIdentity(vm.runInContext(`game.equipment['장갑1']`, context));
const inventoryBeforeUnequip = vm.runInContext('game.inventory.length', context);
assert.strictEqual(context.unequipItem('장갑1'), true, 'the unequip button path must move equipped gear into available grid cells');
assert.strictEqual(vm.runInContext(`game.equipment['장갑1']`, context), null, 'a successful unequip must clear its equipment slot');
assert.strictEqual(vm.runInContext('game.inventory.length', context), inventoryBeforeUnequip + 1, 'a successful unequip must add exactly one inventory item');
assert(vm.runInContext(`game.equipmentInventoryPlacements[${JSON.stringify(leftGloveKey)}]`, context),
    'an unequipped item must receive a persisted grid placement immediately');

const pointerHandlers = {};
const originalDocumentAddEventListener = context.document.addEventListener;
const pointerHideInfoTooltip = context.hideInfoTooltip;
const pointerHideItemTooltip = context.hideItemTooltip;
const pointerShowGameToast = context.showGameToast;
const originalSafeExposeGlobals = context.safeExposeGlobals;
context.document.addEventListener = (type, handler) => {
    const previous = pointerHandlers[type];
    pointerHandlers[type] = event => { if (previous) previous(event); handler(event); };
};
context.document.querySelectorAll = selector => selector === '[data-equipment-grid-key]' ? interactionCards : [];
context.hideInfoTooltip = () => {};
context.hideItemTooltip = () => {};
context.showGameToast = () => {};
context.showItemTooltip = () => {};
context.safeExposeGlobals = map => Object.assign(context, map);
vm.runInContext(interactionSource, context, { filename: 'inventory-pointer-regression.js' });
assert.strictEqual(typeof pointerHandlers.pointerdown, 'function', 'the inventory interaction must register its pointerdown boundary');
pointerHandlers.pointerdown({ target: ringCard, button: 0, pointerId: 31, clientX: 20, clientY: 20 });
assert.strictEqual(context.equipmentInventoryInteraction.isCarrying(), false, 'pointerdown alone must not pick up gear');
pointerHandlers.pointermove({ pointerId: 31, clientX: 23, clientY: 20, preventDefault() {} });
assert.strictEqual(context.equipmentInventoryInteraction.isCarrying(), false, 'small pointer jitter remains a click');
pointerHandlers.pointermove({ pointerId: 31, clientX: 32, clientY: 20, preventDefault() {} });
assert.strictEqual(context.equipmentInventoryInteraction.isCarryingKey('grid-ring'), true, 'drag begins after the movement threshold');
pointerHandlers.pointercancel({ pointerId: 31 });
assert.strictEqual(context.equipmentInventoryInteraction.isCarrying(), false, 'cancelled pointer releases the drag');

vm.runInContext('Date.now = () => 9999999999999', context);
context.equipmentInventoryInteraction.handleItemClick(clickEvent(ringCard), 'grid-ring', 2);
assert.strictEqual(context.equipmentInventoryInteraction.isCarrying(), false);
const stationaryDoubleClick = context.equipmentInventoryInteraction.handleItemDoubleClick(
    { preventDefault() {}, stopPropagation() {} }, 'grid-ring', 7003
);
assert.strictEqual(stationaryDoubleClick, true, 'double-click equips the selected item');
assert(vm.runInContext(`Object.values(game.equipment).some(item => item && item.instanceId === 'grid-ring')`, context));
assert(!vm.runInContext(`game.inventory.some(item => item && item.instanceId === 'grid-ring')`, context));
assert.strictEqual(context.equipmentInventoryInteraction.handleItemDoubleClick(
    { preventDefault() {}, stopPropagation() {} }, 'grid-ring', 7003), false, 'duplicate equip event does nothing');
context.document.addEventListener = originalDocumentAddEventListener;
context.hideInfoTooltip = pointerHideInfoTooltip;
context.hideItemTooltip = pointerHideItemTooltip;
context.showGameToast = pointerShowGameToast;
context.showItemTooltip = originalShowItemTooltip;
context.safeExposeGlobals = originalSafeExposeGlobals;

// Searching a multi-page stash must reveal where matches are without trapping the user on page 1.
const previousPageGame = vm.runInContext('game', context);
const previousPageGetElementById = context.document.getElementById;
const previousPageUpdateStaticUI = context.updateStaticUI;
const pageRoot = { innerHTML: '' };
const pageLabel = { textContent: '' };
const temporaryRoot = { hidden: true, innerHTML: '' };
context.__multiPageSearchGame = {
    season: 80, loopCount: 79,
    settings: { equipmentSlotFilter: 'all', inventoryViewRarities: { normal: true, magic: true, rare: true, unique: true } },
    inventory: [
        { id: 7301, instanceId: 'page-first', slot: '반지', name: '첫 페이지 반지', rarity: 'normal', baseStats: [], stats: [] },
        { id: 7302, instanceId: 'page-target-six', slot: '반지', name: '목표 반지', rarity: 'rare', baseStats: [], stats: [] },
        { id: 7303, instanceId: 'page-target-twelve', slot: '반지', name: '목표 목걸이', rarity: 'unique', baseStats: [], stats: [] }
    ],
    equipmentInventoryPlacements: {
        'page-first': { column: 0, row: 0 },
        'page-target-six': { column: 0, row: 60 },
        'page-target-twelve': { column: 0, row: 132 }
    },
    equipmentTemporaryStorage: []
};
vm.runInContext('game = __multiPageSearchGame', context);
const multiPageLayout = context.equipmentInventoryGridRuntime.ensureState();
context.document.getElementById = id => ({
    'ui-equipment-inventory-pages': pageRoot,
    'ui-inventory-page-label': pageLabel,
    'ui-equipment-temporary-storage': temporaryRoot
}[id] || null);
context.updateStaticUI = () => {};
const getSearchRows = query => context.__multiPageSearchGame.inventory.map((item, idx) => ({
    item,
    idx,
    filterActive: !!query,
    filterMatched: !query || item.name.includes(query)
}));
const targetRows = getSearchRows('목표');
assert.strictEqual(context.equipmentInventoryInteraction.renderPageControls(multiPageLayout, targetRows, '목표'), 5,
    'a new search must jump to the first page containing a match');
assert.strictEqual(pageLabel.textContent, '검색 결과 2개 · 2페이지',
    'the page label must summarize matches across the complete stash');
assert(pageRoot.innerHTML.includes('aria-label="6페이지 · 검색 결과 1개"'),
    'the first matching page must expose its result count');
assert(pageRoot.innerHTML.includes('aria-label="12페이지 · 검색 결과 1개"'),
    'a later matching page must expose its result count');
assert(pageRoot.innerHTML.includes('search-miss'), 'pages without matches must remain visible in a muted state');
context.equipmentInventoryInteraction.setPage(11);
context.equipmentInventoryInteraction.renderPageControls(multiPageLayout, targetRows, '목표');
assert.strictEqual(context.equipmentInventoryInteraction.getPageIndex(12), 11,
    'manual page changes during the same search must not snap back to the first result');
const firstRows = getSearchRows('첫 페이지');
assert.strictEqual(context.equipmentInventoryInteraction.renderPageControls(multiPageLayout, firstRows, '첫 페이지'), 0,
    'changing the search term must move to the new first matching page');
context.equipmentInventoryInteraction.setPage(4);
const missingRows = getSearchRows('없는 장비');
assert.strictEqual(context.equipmentInventoryInteraction.renderPageControls(multiPageLayout, missingRows, '없는 장비'), 4,
    'a search with no results must preserve the page instead of jumping unpredictably');
assert.strictEqual(pageLabel.textContent, '검색 결과 0개 · 0페이지', 'an empty search result must be explicit');
context.equipmentInventoryInteraction.renderPageControls(multiPageLayout, missingRows, '');
assert.strictEqual(context.equipmentInventoryInteraction.getPageIndex(12), 4, 'clearing search must preserve the chosen page');
assert.strictEqual(pageLabel.textContent, '12페이지 · 최대 확장', 'a maximum stash must not promise more loop expansion');
context.__previousPageGame = previousPageGame;
vm.runInContext('game = __previousPageGame', context);
context.document.getElementById = previousPageGetElementById;
context.updateStaticUI = previousPageUpdateStaticUI;

console.log('smoke-equipment-grid-inventory: ok');
