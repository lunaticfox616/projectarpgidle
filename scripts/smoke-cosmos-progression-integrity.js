const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
    console,
    window: null,
    globalThis: null,
    document: { readyState: 'loading', addEventListener() {} },
    addEventListener() {},
    requestAnimationFrame(callback) { context.requestedFrames.push(callback); },
    requestedFrames: [],
    logs: [],
    addLog(message, type) { context.logs.push({ message, type }); },
    safeExposeGlobals(fns) { Object.assign(context, fns); },
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
            mastery: { resonanceDrive: 3 },
            selectedDirectives: ['rift'],
            directiveCycles: [7]
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
assert.strictEqual(Array.isArray(context.game.cosmosAtlas.selectedDirectives), false,
    '손상된 탐사 신호 선택 배열은 빈 키-값 상태로 복구해야 한다');
assert.strictEqual(Array.isArray(context.game.cosmosAtlas.directiveCycles), false,
    '손상된 탐사 신호 주기 배열은 빈 키-값 상태로 복구해야 한다');
assert.deepStrictEqual(
    JSON.parse(JSON.stringify(context.getCosmosBossPityProgress({ id: 'planet-46', tag: 'boss' }))),
    { misses: 39, guaranteeAt: 40, remaining: 1 },
    'exclusive boss rewards need a visible 40-kill guarantee'
);

const framesBeforeDuplicateEquip = context.requestedFrames.length;
const logsBeforeDuplicateEquip = context.logs.length;
context.equipBossStoneByGalaxy(1);
assert.strictEqual(context.requestedFrames.length, framesBeforeDuplicateEquip,
    'equipping an already equipped cosmos stone must not restart its animation');
assert.strictEqual(context.logs.length, logsBeforeDuplicateEquip,
    'equipping an already equipped cosmos stone must not duplicate its log');

context.game.cosmosAtlas.unlocked = true;
context.game.cosmosAtlas.bossClears = [];
context.game.journalEntries = ['woodsman'];
context.game.underworldProgress = { highestFloor: 30 };
assert.strictEqual(context.continueCosmosChallengeAfterClear('stop'), false,
    'stop completion mode must not start another cosmos challenge');
assert.strictEqual(context.continueCosmosChallengeAfterClear('nextZone'), true,
    'next-region completion mode must start the next available cosmos node');
assert.strictEqual(context.game.currentZoneId, 'cosmos_challenge');
assert(context.game.cosmosAtlas.activeChallenge && context.game.cosmosAtlas.activeChallenge.nodeId !== 'planet-0',
    'automatic continuation must advance beyond the cleared gateway');

const cosmosSource = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
assert(cosmosSource.includes("state.bossExclusiveMisses[node.id] = granted ? 0"), 'successful exclusive drops must reset pity');
assert(cosmosSource.includes("node.orbit === galaxy && state.cleared.includes(node.id)).length"), 'galaxy summary must count clears, not total nodes twice');
assert(combatSource.includes("window.getCosmosMasteryValue('resonanceDrive')"), 'resonance mastery must affect combat damage');
assert(combatSource.includes('cosmosMasteryTakenLessPct'), 'rift guard mastery must reduce incoming cosmos damage');
assert(combatSource.includes("window.getCosmosMasteryValue('gravityHarness')"), 'gravity mastery must reduce gravity pressure');

console.log('smoke-cosmos-progression-integrity passed');
