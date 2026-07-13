const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const context = {
    console,
    Date,
    Math,
    setTimeout,
    clearTimeout,
    getStatName: id => id,
    formatValue: (id, value) => String(value),
    rndChoice: list => list[0],
    rollBaseStats: base => (base.baseStats || []).map(stat => ({ id: stat.id, val: stat.base, valMin: stat.base, valMax: stat.base, statName: stat.id, tier: 0 })),
    rerollExplicitMods: item => { item.stats = [{ id: 'pctDmg', val: 5, statName: 'pctDmg', tier: 1 }]; },
    salvageItemObject: () => { context.salvaged = (context.salvaged || 0) + 1; },
    safeExposeData: values => Object.assign(context, values),
    safeExposeGlobals: values => Object.assign(context, values),
    window: { prompt: () => null },
    addLog: () => {},
    game: null
};
context.window.window = context.window;
vm.createContext(context);

function load(relativePath) {
    let source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    vm.runInContext(source, context, { filename: relativePath });
}

[
    'data/growth-board-items.js',
    'data/growth-board-affixes.js',
    'data/growth-board-synergies.js',
    'js/growth-board-placement.js',
    'js/growth-board-state.js',
    'js/growth-board-crafting.js',
    'js/growth-board-effects.js',
    'js/growth-board-migration.js'
].forEach(load);

function freshGame() {
    return {
        maxZoneId: 0, loopCount: 0, settings: { autoSalvageEnabled: false, autoSalvageRarities: {} },
        equipment: {}, inventory: [], growthBoard: null, growthInventory: [], recentGrowthDrops: [],
        growthInventoryExpandLevel: 0, growthSystemVersion: 1, enemies: [], combatHalted: true
    };
}

context.game = freshGame();
context.ensureGrowthBoardState(context.game);
context.game.growthBoard.unlockedCells = Array.from({ length: 60 }, (_, index) => index);

const split = context.createGrowthItemFromBase(context.GROWTH_BOARD_ITEMS.find(base => base.baseId === 'gb_flower_splitshot'), 'normal', 13);
const seed = context.createGrowthItemFromBase(context.GROWTH_BOARD_ITEMS.find(base => base.baseId === 'gb_leaf_linkseed'), 'normal', 15);
context.game.growthInventory.push(split, seed);
assert(context.placeGrowthItem(split.id, { x: 0, y: 0, rotation: 0 }), 'split item should place');
assert(context.canPlaceGrowthItem(context.game.growthBoard, seed, { x: 1, y: 0, rotation: 0 }, seed.id), 'split gap must remain usable');

const hollow = context.createUniqueGrowthItem(context.GROWTH_BOARD_UNIQUES.find(row => row.id === 'gbu_hollow_nest'), 10);
const hollowSeed = context.createGrowthItemFromBase(context.GROWTH_BOARD_ITEMS.find(base => base.baseId === 'gb_leaf_linkseed'), 'normal', 15);
context.game.growthInventory.push(hollow, hollowSeed);
assert(context.placeGrowthItem(hollow.id, { x: 4, y: 1, rotation: 0 }), 'hollow item should place');
assert(context.canPlaceGrowthItem(context.game.growthBoard, hollowSeed, { x: 5, y: 2, rotation: 0 }, hollowSeed.id), 'hollow center must remain usable');

const corner = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }];
assert.deepStrictEqual(context.rotateGrowthShape(corner, 4), context.normalizeGrowthShape(corner), 'four rotations must normalize to original');
context.game.growthBoard.unlockedCells = [0];
assert.strictEqual(context.getGrowthPlacementFailure(context.game.growthBoard, seed, { x: 1, y: 0, rotation: 0 }, seed.id), 'locked', 'sealed cells must reject placement');

context.game = freshGame();
context.game.growthBoard = context.ensureGrowthBoardState(context.game);
context.game.growthBoard.unlockedCells = Array.from({ length: 60 }, (_, index) => index);
const flower = context.createGrowthItemFromBase(context.GROWTH_BOARD_ITEMS.find(base => base.baseId === 'gb_flower_embercrown'), 'normal', 3);
const leaf = context.createGrowthItemFromBase(context.GROWTH_BOARD_ITEMS.find(base => base.baseId === 'gb_leaf_linkseed'), 'normal', 15);
context.game.growthInventory.push(flower, leaf);
assert(context.placeGrowthItem(flower.id, { x: 0, y: 0, rotation: 0 }));
assert(context.placeGrowthItem(leaf.id, { x: 1, y: 1, rotation: 0 }));
let cache = context.computeGrowthBoardEffects();
assert(cache.conditionsByItem[String(flower.id)].active, 'orthogonal leaf adjacency must activate flower effect');
assert(cache.stats.some(stat => stat.id === 'firePctDmg'), 'active spatial effect must emit a combat stat');

context.game = freshGame();
context.game.growthSystemVersion = 0;
context.game.equipment = { '무기': { id: 7, slot: '무기', baseId: 'rusted_blade', baseName: '녹슨 검', name: '보존 검', rarity: 'rare', hiddenTier: 5, baseStats: [{ id: 'flatDmg', val: 9 }], stats: [{ id: 'crit', val: 3 }] } };
context.game.inventory = [{ id: 8, slot: '반지', baseId: 'ring', baseName: '반지', name: '보존 반지', rarity: 'magic', hiddenTier: 5, baseStats: [], stats: [] }];
let migration = context.migrateLegacyEquipmentToGrowth(context.game);
assert.strictEqual(migration.converted, 2, 'all legacy items must convert');
assert.strictEqual(context.game.growthMigrationBackup.inventory.length, 1, 'migration must preserve an original backup');
assert.strictEqual(context.game.inventory.length, 0, 'legacy runtime inventory should be retired after backup');
assert.strictEqual(context.migrateLegacyEquipmentToGrowth(context.game).migrated, false, 'migration must run once');

context.game = freshGame();
for (let index = 0; index < 24; index++) {
    let item = context.createGrowthItemFromBase(context.GROWTH_BOARD_ITEMS[0], 'normal', 1);
    context.addGrowthRecentDrop(item);
}
context.addGrowthRecentDrop(context.createGrowthItemFromBase(context.GROWTH_BOARD_ITEMS[1], 'normal', 1));
assert.strictEqual(context.game.recentGrowthDrops.length, 24, 'recent drops must stay capped');
assert.strictEqual(context.salvaged, 1, 'overflow must auto-salvage an unprotected item');

console.log('smoke-growth-board passed');
