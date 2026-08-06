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
        cosmosAtlas: { unlocked: true, cleared: [], activeChallenge: null }
    }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
const source = fs.readFileSync('js/cosmos-atlas.js', 'utf8');
const instrumentedSource = source.replace(
    '\n})();',
    '\nwindow.__cosmosNodeReadability = { ATLAS, getNodeStatus, getCosmosNodeStatusMeta, getCosmosNodeActionState, canRecordCosmosExploration, worldToScreen, screenToWorld };\n})();'
);
vm.runInContext(instrumentedSource, context, { filename: 'js/cosmos-atlas.js' });
const api = context.__cosmosNodeReadability;

const startNode = { id: 'planet-0', tag: 'gateway' };
const lockedNode = { id: 'planet-missing', tag: 'cold' };

assert.strictEqual(api.getNodeStatus(startNode), 'available', 'the first uncleared region must be visibly challengeable');
assert.strictEqual(api.getNodeStatus(lockedNode), 'locked', 'an unconnected region must remain visibly locked');

context.game.cosmosAtlas.activeChallenge = { nodeId: 'planet-0' };
assert.strictEqual(api.getNodeStatus(startNode), 'active', 'the region currently being fought must have its own state');

context.game.cosmosAtlas.activeChallenge = null;
context.game.cosmosAtlas.cleared = ['planet-0'];
assert.strictEqual(api.getNodeStatus(startNode), 'cleared', 'a completed region must remain distinguishable from a challengeable region');

const expectedMeta = {
    active: ['전투 진행 중', '⚔'],
    available: ['미클리어 · 도전 가능', '!'],
    cleared: ['클리어 완료', '✓'],
    locked: ['미클리어 · 경로 잠김', '◇']
};
Object.entries(expectedMeta).forEach(([status, expected]) => {
    const meta = api.getCosmosNodeStatusMeta(status);
    assert.strictEqual(meta.label, expected[0], `${status} must have an explicit Korean status label`);
    assert.strictEqual(meta.glyph, expected[1], `${status} must have a non-color status glyph`);
    assert.ok(meta.description.length >= 10, `${status} must explain what the player can do next`);
});

assert.deepStrictEqual(
    JSON.parse(JSON.stringify(api.getCosmosNodeActionState({ tag: 'cold' }, 'available'))),
    { enabled: true, label: '이 지역 도전' }
);
assert.deepStrictEqual(
    JSON.parse(JSON.stringify(api.getCosmosNodeActionState({ tag: 'cold' }, 'cleared'))),
    { enabled: false, label: '클리어 완료' }
);
assert.deepStrictEqual(
    JSON.parse(JSON.stringify(api.getCosmosNodeActionState({ tag: 'boss' }, 'cleared'))),
    { enabled: true, label: '보스 다시 도전' }
);
assert.deepStrictEqual(
    JSON.parse(JSON.stringify(api.getCosmosNodeActionState({ tag: 'cold' }, 'active'))),
    { enabled: false, label: '전투 진행 중' }
);
assert.strictEqual(
    api.canRecordCosmosExploration('active', { tag: 'cold' }, true),
    true,
    'finishing an active fight must still record the region clear'
);
assert.strictEqual(
    api.canRecordCosmosExploration('active', { tag: 'cold' }, false),
    false,
    'an active fight must not record a clear before combat completion'
);

api.ATLAS.canvas = {
    width: 1200,
    height: 800,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 400 })
};
api.ATLAS.dpr = 2;
api.ATLAS.camera = { x: 0, y: 0, scale: 0.5 };
assert.deepStrictEqual(
    JSON.parse(JSON.stringify(api.worldToScreen({ x: 100, y: 50 }))),
    { x: 700, y: 450 },
    'world coordinates must include the device-pixel ratio when rendered'
);
assert.deepStrictEqual(
    JSON.parse(JSON.stringify(api.screenToWorld({ clientX: 350, clientY: 225 }))),
    { x: 100, y: 50 },
    'pointer hit testing must invert the high-DPI render transform'
);

console.log('smoke-cosmos-node-readability passed');
