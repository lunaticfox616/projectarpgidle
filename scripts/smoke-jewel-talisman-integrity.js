const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const cosmosSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
const growthUiSource = fs.readFileSync('js/growth-ui.js', 'utf8');
const { buildGameRuntime } = require('./lib/game-runtime');

function extract(source, startNeedle, endNeedle) {
    const start = source.indexOf(startNeedle);
    const end = source.indexOf(endNeedle, start);
    assert(start >= 0 && end > start, `source block not found: ${startNeedle}`);
    return source.slice(start, end);
}

const talismanBlock = extract(
    passiveSource,
    'function getTalismanEffectAnchorCell',
    'const UNIQUE_JEWEL_DB'
);
const talismanContext = {
    Math,
    Number,
    Object,
    Array,
    Set,
    getTalismanMomentRoll: talisman => talisman.bossFinalDmgRoll,
    safeExposeGlobals(values) {
        Object.assign(talismanContext, values);
    }
};
vm.createContext(talismanContext);
vm.runInContext(talismanBlock, talismanContext, { filename: 'talisman-effects.js' });

const normal = { id: 'normal', cells: [{ x: 0, y: 0 }], stat: 'pctDmg', value: 10 };
const suppressedPride = { id: 'pride', cells: [{ x: 0, y: 0 }], special: 'pride' };
const repulsion = { id: 'repulsion', cells: [{ x: 0, y: 0 }], special: 'cosmosRepulsion' };
const moment = { id: 'moment', cells: [{ x: 0, y: 0 }], special: 'moment', bossFinalDmgRoll: 12 };
const board = Array(64).fill(null);
board[0] = 'normal';
board[1] = 'pride';
board[2] = 'repulsion';
board[3] = 'moment';
const effects = talismanContext.calculateTalismanBoardEffects({
    normal: { x: 0, y: 0, talisman: normal },
    pride: { x: 1, y: 0, talisman: suppressedPride },
    repulsion: { x: 2, y: 0, talisman: repulsion },
    moment: { x: 3, y: 0, talisman: moment }
}, board);
assert.strictEqual(effects.stats.pctDmg, 12.5, 'non-adjacent base stats should receive repulsion amplification');
assert(!effects.stats.gemLevel && !effects.stats.suppCap, 'a pride talisman adjacent to repulsion must be fully suppressed');
assert.strictEqual(effects.bossFinalDmgBonusPct, 0, 'a moment talisman adjacent to repulsion must not grant boss damage');
assert.deepStrictEqual(Array.from(effects.suppressedIds).sort(), ['moment', 'pride']);

const suppressedCopyBoard = Array(64).fill(null);
suppressedCopyBoard[0] = 'repulsion-copy';
suppressedCopyBoard[1] = 'suppressed-source';
suppressedCopyBoard[2] = 'gravity-copy';
const suppressedCopyEffects = talismanContext.calculateTalismanBoardEffects({
    repulsion: { x: 0, y: 0, talisman: { id: 'repulsion-copy', cells: [{ x: 0, y: 0 }], special: 'cosmosRepulsion' } },
    source: { x: 1, y: 0, talisman: { id: 'suppressed-source', cells: [{ x: 0, y: 0 }], stat: 'pctDmg', value: 10 } },
    gravity: { x: 2, y: 0, talisman: { id: 'gravity-copy', cells: [{ x: 0, y: 0 }], special: 'gravity' } }
}, suppressedCopyBoard);
assert.strictEqual(suppressedCopyEffects.stats.pctDmg || 0, 0, 'repulsion-suppressed stats must not leak through gravity copying');

const suppressedSimpleBoard = Array(64).fill(null);
suppressedSimpleBoard[8] = 'repulsion-simple';
suppressedSimpleBoard[9] = 'suppressed-simple-source';
suppressedSimpleBoard[10] = 'simple-copy';
const suppressedSimpleEffects = talismanContext.calculateTalismanBoardEffects({
    repulsion: { x: 0, y: 1, talisman: { id: 'repulsion-simple', cells: [{ x: 0, y: 0 }], special: 'cosmosRepulsion' } },
    source: { x: 1, y: 1, talisman: { id: 'suppressed-simple-source', cells: [{ x: 0, y: 0 }], stat: 'pctDmg', value: 10 } },
    simple: { x: 2, y: 1, talisman: { id: 'simple-copy', cells: [{ x: 0, y: 0 }], special: 'simpleCopy', markDir: 'left' } }
}, suppressedSimpleBoard);
assert.strictEqual(suppressedSimpleEffects.stats.pctDmg || 0, 0, 'repulsion-suppressed stats must not leak through directional copying');

const choiceBoard = Array(64).fill(null);
choiceBoard[8] = 'choice';
choiceBoard[9] = 'choice';
const choice = { id: 'choice', cells: [{ x: 0, y: 0 }, { x: 1, y: 0 }], special: 'cosmosChoice' };
const choiceEffects = talismanContext.calculateTalismanBoardEffects({
    choice: { x: 0, y: 1, talisman: choice }
}, choiceBoard);
assert.strictEqual(choiceEffects.stats.gemLevel, 2, 'horizontal cosmos choice should grant two gem levels');

const salvageBlock = extract(
    passiveSource,
    'function getJewelSalvageShardGain',
    'function destroySelectedCraftItem'
);
let awardedJewelShards = 0;
const salvageContext = {
    awardCurrency(key, amount) { if (key === 'jewelShard') awardedJewelShards += amount; },
    addLog() {}
};
vm.createContext(salvageContext);
vm.runInContext(salvageBlock, salvageContext, { filename: 'jewel-salvage.js' });
assert.strictEqual(salvageContext.salvageJewelObject({ name: '미가공 주얼', rarity: 'normal', stats: [] }, true), 2, 'a normal zero-option jewel must still salvage into shards');
assert.strictEqual(awardedJewelShards, 2);

assert(uiSource.includes('function showTalismanPlacementTooltip'), 'talisman placement preview must be available');
assert(uiSource.includes('옵션 평균 티어: T${tierSummary.toFixed(1)}'), 'jewel tooltip should show average option tier');
assert(uiSource.includes('getTalismanRollQuality'), 'talisman roll quality should be visible');
// Jewels go into equipment sockets through one dialog (2026-09-30): every socket kind, the store and its actions in one place.
const socketUiSource = fs.readFileSync('js/equipment-sockets-ui.js', 'utf8');
assert(socketUiSource.includes('equipmentSocketsUi.insert(') && socketUiSource.includes('equipmentSocketsUi.remove('), 'the socket dialog inserts and removes jewels');
assert(socketUiSource.includes("row.kind === 'void' ? '공허 소켓' : "), 'void and abyss sockets share the dialog');
assert(!uiSource.includes('onclick="bulkTalismanUnseal('), 'removed talisman bulk-unseal handler must not remain in the UI');
// Actual normal/rare/unique pickup, capacity and auto-salvage behavior is covered by
// smoke-act-exploration-items.js for both immediate and held delivery.
assert(cosmosSource.includes("addItemToInventory(item, { guaranteedKeep: true })"), 'cosmos boss exclusive equipment must survive full inventory');
assert(cosmosSource.includes("game.noti.items = true"), 'cosmos boss exclusive jewels light the equipment menu');
assert(cosmosSource.includes("game.noti.talisman = true"), 'cosmos boss exclusive talismans need discovery notification');

const growthCardBlock = extract(growthUiSource, 'function renderGrowthItemCard', '// 보관함이 40칸이라');
assert(!growthCardBlock.includes('<summary>관리</summary>'), 'growth item actions must not require an extra management disclosure click');
assert(growthCardBlock.includes('toggleGrowthItemLock') && growthCardBlock.includes('salvageGrowthInventoryItem'), 'growth item lock and salvage actions must remain directly available');

const talismanUiRuntime = buildGameRuntime();
vm.runInContext(`
    game.currencies.sealShard = 17;
    game.currencies.strongSealShard = 4;
    __talismanUnlockTooltip = '';
    showInfoTooltipHtml = function (x, y, html) { __talismanUnlockTooltip = html; };
    showTalismanUnlockTooltip({ clientX: 0, clientY: 0 }, 0, 0);
`, talismanUiRuntime);
const talismanUnlockTooltip = vm.runInContext('__talismanUnlockTooltip', talismanUiRuntime);
assert(talismanUnlockTooltip.includes('보유: 봉인편린 17 · 강력 봉인편린 4'),
    '부적 칸 해금 안내는 실제 해금 재화의 현재 보유량을 표시해야 한다');

console.log('smoke-jewel-talisman-integrity passed');
