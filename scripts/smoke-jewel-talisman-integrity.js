const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const cosmosSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');

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

const rerollBlock = extract(
    passiveSource,
    'function rerollJewelStatValues',
    'function isJewelPetiteStat'
);
const jewelContext = {
    getJewelOptionDef: () => ({ id: 'pctDmg' }),
    rollJewelStat: () => ({ val: 9, valMin: 4, valMax: 10, tier: 5 }),
    getJewelStats: jewel => (jewel.stats || []).map(stat => ({ ...stat })),
    isJewelPetiteStat: stat => !!stat.petite
};
vm.createContext(jewelContext);
vm.runInContext(rerollBlock, jewelContext, { filename: 'jewel-reroll.js' });
const jewel = { stats: [{ id: 'pctDmg', val: 4, valMin: 4, valMax: 10, tier: 1 }] };
jewelContext.rerollJewelStatValues(jewel);
assert.strictEqual(jewel.stats[0].val, 9, 'divine reroll must mutate the owned jewel');
assert.strictEqual(jewel.hiddenTier, 5);

const salvageBlock = extract(
    passiveSource,
    'function getJewelSalvageShardGain',
    'function showWaxedJewelCraftRestriction'
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

const qualityBlock = extract(
    passiveSource,
    'function getJewelQualityProfile',
    'function formatJewelStatValue'
);
const qualityContext = {
    JEWEL_HIDDEN_TIER_COUNT: 5,
    getJewelCoreStats: owned => owned.stats || []
};
vm.createContext(qualityContext);
vm.runInContext(qualityBlock, qualityContext, { filename: 'jewel-quality.js' });
const quality = qualityContext.getJewelQualityProfile({ rarity: 'rare', stats: [{ tier: 3 }, { tier: 5 }] });
assert.strictEqual(quality.averageTier, 4);
assert.strictEqual(quality.qualityPct, 75);
assert.strictEqual(qualityContext.getJewelQualityProfile({ rarity: 'unique', stats: [{ tier: 1 }] }).averageTier, null, 'fixed unique stats must be excluded from tier grading');

assert(uiSource.includes('강화 단계당 주얼 수치 +3%'), 'jewel amplification UI must match the combat multiplier');
assert(uiSource.includes('let ampBonus = ampLv * 3;'), 'slot amplification summary must display three percent per level');
assert(uiSource.includes("createJewelRangeTooltipHtml(jewel, { showSlotComparison: socketType === 'inventory' })"), 'inventory jewels should show slot comparison');
const tooltipBlock = extract(uiSource, 'function showSocketedJewelTooltip', 'function getCraftActionValidators');
assert(!tooltipBlock.includes("if (!item) return hideInfoTooltip();\n    let jewel"), 'normal jewel tooltips must not depend on a selected craft item');
assert(uiSource.includes('function showTalismanPlacementTooltip'), 'talisman placement preview must be available');
assert(uiSource.includes('옵션 평균 티어: T${tierSummary.toFixed(1)}'), 'jewel tooltip should show average option tier');
assert(uiSource.includes('getTalismanRollQuality'), 'talisman roll quality should be visible');
assert(passiveSource.includes('function openAbyssSocketJewelOverlay'), 'equipment abyss sockets need a dedicated jewel picker overlay');
assert(uiSource.includes('openAbyssSocketJewelOverlay(${sidx})'), 'empty abyss sockets should open the picker instead of listing every jewel inline');
assert(!uiSource.includes("insertJewelIntoAbyssSocket(${i}, ${sidx})"), 'owned abyss jewels must not be rendered as a long inline button list');
assert(!uiSource.includes('onclick="bulkTalismanUnseal('), 'removed talisman bulk-unseal handler must not remain in the UI');
assert(combatSource.includes('let protectOverflow = inventoryFull && !autoSalvage'), 'rare and unique jewel overflow must be protected unless explicitly auto-salvaged');
assert(cosmosSource.includes("addItemToInventory(item, { guaranteedKeep: true })"), 'cosmos boss exclusive equipment must survive full inventory');
assert(cosmosSource.includes("game.noti.jewel = true"), 'cosmos boss exclusive jewels need discovery notification');
assert(cosmosSource.includes("game.noti.talisman = true"), 'cosmos boss exclusive talismans need discovery notification');
assert(passiveSource.includes("return addLog('유효하지 않은 주얼 슬롯입니다.'"), 'jewel slot mutations must validate their target slot');
assert(indexSource.includes('id="noti-jewel"'), 'jewel discoveries need a visible tab notification dot');

console.log('smoke-jewel-talisman-integrity passed');
