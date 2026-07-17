const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
    console,
    window: null,
    globalThis: null,
    document: { readyState: 'loading', addEventListener() {} },
    addEventListener() {},
    game: {
        season: 31,
        currencies: { starDust: 0 },
        jewelSlots: [],
        cosmosAtlas: {
            layoutVersion: 20260601,
            cleared: ['planet-0', 'planet-0'],
            bossStones: { 1: '백성핵석' },
            equippedStones: { 1: true, 2: true, 9: true },
            bossExclusiveMisses: { 'planet-46': 39 },
            mastery: { resonanceDrive: 3 }
        }
    }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/cosmos-atlas.js', 'utf8'), context, { filename: 'js/cosmos-atlas.js' });

assert.strictEqual(context.getCosmosMasteryValue('resonanceDrive'), 3, 'mastery lookup must be available to combat');
assert.deepStrictEqual(Object.keys(context.game.cosmosAtlas.equippedStones), ['1'], 'unowned and invalid equipped stones must be repaired');
assert.strictEqual(context.game.cosmosAtlas.cleared.length, 1, 'duplicate atlas clears must not inflate progress');
assert.deepStrictEqual(
    JSON.parse(JSON.stringify(context.getCosmosBossPityProgress({ id: 'planet-46', tag: 'boss' }))),
    { misses: 39, guaranteeAt: 40, remaining: 1 },
    'exclusive boss rewards need a visible 40-kill guarantee'
);

const cosmosSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert(cosmosSource.includes("state.bossExclusiveMisses[node.id] = granted ? 0"), 'successful exclusive drops must reset pity');
assert(cosmosSource.includes("state.cleared.includes(n.id)).length}/${ATLAS.nodes.filter(n => n.orbit === g).length}"), 'galaxy summary must count clears, not total nodes twice');
assert(combatSource.includes("window.getCosmosMasteryValue('resonanceDrive')"), 'resonance mastery must affect combat damage');
assert(combatSource.includes('cosmosMasteryTakenLessPct'), 'rift guard mastery must reduce incoming cosmos damage');
assert(combatSource.includes("window.getCosmosMasteryValue('gravityHarness')"), 'gravity mastery must reduce gravity pressure');

console.log('smoke-cosmos-progression-integrity passed');
