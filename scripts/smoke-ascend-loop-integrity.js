const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');

function extract(source, startNeedle, endNeedle) {
    const start = source.indexOf(startNeedle);
    const end = source.indexOf(endNeedle, start);
    assert(start >= 0 && end > start, `source block not found: ${startNeedle}`);
    return source.slice(start, end);
}

const keystoneBlock = extract(
    combatSource,
    'function getAscendKeystoneOwnerClass',
    'function getMaxJewelSlotCount'
);
const context = {
    CLASS_KEYSTONE_DEFS: {
        warrior: [{ id: 'w2' }, { id: 'w5' }],
        assassin: [{ id: 'a3' }],
        hunter: [{ id: 'h2' }]
    },
    game: {
        ascendClass: 'warrior',
        ascendKeystones: ['w2'],
        cosmosTwinKeystones: [],
        enemies: []
    }
};
vm.createContext(context);
vm.runInContext(keystoneBlock, context, { filename: 'ascend-keystone-runtime.js' });

assert.strictEqual(context.hasKeystone('w2'), true, 'current-class owned keystone should be active');
context.game.ascendClass = 'assassin';
assert.strictEqual(context.hasKeystone('w2'), false, 'a stale keystone from another class must not be active');
context.game.cosmosTwinKeystones = ['w2'];
assert.strictEqual(context.hasKeystone('w2'), true, 'cosmos twin keystones should stay class-independent');

context.game.warriorRhythmStacks = 5;
context.game.warriorRhythmExpiresAt = 999;
context.clearAscendKeystoneRuntimeState(['w2']);
assert.strictEqual(context.game.warriorRhythmStacks, 5, 'runtime state must stay while the same cosmos keystone remains active');
context.game.cosmosTwinKeystones = [];
context.clearAscendKeystoneRuntimeState(['w2']);
assert.strictEqual(context.game.warriorRhythmStacks, 0, 'removed rhythm keystone must clear its stacks');
assert.strictEqual(context.game.warriorRhythmExpiresAt, 0);

context.game.enemies = [{
    ailments: [
        { type: 'hunterExpose', time: 3 },
        { type: 'assassinWeakness', time: 3 },
        { type: 'ignite', time: 3 }
    ]
}];
context.game.enemyKeystoneDebuffs = {
    1: [{ type: 'a3' }, { type: 'other' }],
    2: [{ type: 'a3' }]
};
context.clearAscendKeystoneRuntimeState(['a3', 'h2'], { force: true });
assert.deepStrictEqual(
    Array.from(context.game.enemies[0].ailments, row => row.type),
    ['ignite'],
    'removed debuff keystones must clear only their own ailments'
);
assert.deepStrictEqual(Array.from(context.game.enemyKeystoneDebuffs[1], row => row.type), ['other']);
assert.strictEqual(context.game.enemyKeystoneDebuffs[2], undefined);

const loopResetBlock = extract(combatSource, 'game.completedTrials = [];', 'game.inventory = [];');
assert(loopResetBlock.includes('game.ascendKeystones = [];'), 'loop reset must clear allocated keystones');
assert(loopResetBlock.includes('game.ascendKeystonePoints = 0;'), 'loop reset must clear unspent keystone points');
assert(loopResetBlock.includes('game.cosmosTwinKeystones = [];'), 'loop reset must clear jewel-granted keystones');
assert(loopResetBlock.includes('clearAscendKeystoneRuntimeState'), 'loop reset must clear keystone runtime state');

assert(uiSource.includes('!merged.ascendClass && (!Array.isArray(merged.completedTrials) || merged.completedTrials.length === 0)'), 'save normalization must repair stale loop keystone points');
assert(uiSource.includes('function askRefundAscendNode'), 'ascend node refunds should use an in-game confirmation');
assert(uiSource.includes('async function resetAscendKeystones'), 'bulk keystone reset should be confirmed');
assert(uiSource.includes('trait-progress-summary'), 'ascend and loop trees should expose progression summaries');
assert(!uiSource.includes('디버깅 포인트 트리') && !indexSource.includes('디버깅 포인트 트리'), 'player-facing loop passive terminology must be consistent');
assert(!indexSource.includes('id="ui-ascend-pts" style="color: #f1c40f; font-weight: bold;">0</span> / 6'), 'ascend header must not show an obsolete fixed six-point cap');

const resetKeystoneBlock = extract(uiSource, 'async function resetAscendKeystones', 'async function resetSeasonNodes');
assert(resetKeystoneBlock.indexOf('requestGameConfirmation') < resetKeystoneBlock.indexOf('enforceWarriorDualTrainingEquipment(false)'), 'dual-wield gear must not be moved before the player confirms a keystone reset');
assert(resetKeystoneBlock.includes("if (!assertBuildEditable()) return;"), 'keystone resets should respect the combat build lock');
assert(resetKeystoneBlock.includes('cost = game.ascendKeystones.length;'), 'keystone reset cost must be recalculated after the async confirmation');
const seasonResetBlock = extract(uiSource, 'async function resetSeasonNodes', 'async function resetAscendNodes');
assert(seasonResetBlock.match(/game\.seasonNodes = Array\.isArray\(game\.seasonNodes\)/g).length >= 2, 'loop passive reset should re-read selected nodes after confirmation');
const ascendResetBlock = extract(uiSource, 'async function resetAscendNodes', 'async function selectClass');
assert(ascendResetBlock.match(/game\.ascendNodes = Array\.isArray\(game\.ascendNodes\)/g).length >= 2, 'ascend passive reset should re-read selected nodes after confirmation');
assert(uiSource.includes('function buyAscendKeystone(id) { if (!assertBuildEditable()) return;'), 'buying a keystone should respect the combat build lock');
assert(uiSource.includes('async function buySeason(id) { if (!assertBuildEditable()) return;'), 'buying a loop passive should respect the combat build lock');

console.log('smoke-ascend-loop-integrity passed');
