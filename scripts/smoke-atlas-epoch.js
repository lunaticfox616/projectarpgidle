// 시대 재생 (js/atlas-epoch.js, docs/atlas-endgame-20260930.md 1 · 5절): four seeds let the atlas be reborn for world-tree essence;
// the rebirth resets exactly the atlas progress, perks cost rising essence and feed the same bonus sum as passives, the supply perk
// fills the empty wallet of a new loop, and saves clamp everything.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(83);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`
    game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',level:100,combatTimeMs:1800000000000,
        settings:{pauseGameOnOverlay:false}});
    game.season=40;game.maxZoneId=29;game.currentZoneId=29;game.loopProgressCurrent.chaos20Cleared=true;atlas.sync(game);
    game.atlas.completed=atlas.nodes.filter(node=>node.kind==='map').slice(0,23).map(node=>node.id).concat(['roots_g','pinnacle']);
    game.atlas.bonus=game.atlas.completed.slice(0,11);game.atlas.seeds=3;game.atlas.autoMap=true;
    game.atlas.fragments={maps:2};atlas.setLoadout(game,['maps']);
    for (const id of ['s_r','s_a1','l_r']) atlasPassives.allocate(game,id);
`);
assert.match(run('atlasEpoch.reason(game)'), /씨앗 4개/, 'the epoch waits for four seeds');
run('game.atlas.seeds=4;');
assert.equal(run('atlasEpoch.reason(game)'), '');
assert.equal(run('atlasEpoch.essenceFor(game)'), 2 + Math.floor(23 / 5) + Math.floor(11 / 5) + 4, 'essence = base + maps/5 + bonus/5 + seeds');

assert.equal(run('atlasEpoch.rebirth(game)'), '');
const reborn = copy(`{ atlas: game.atlas, points: atlas.points(game) }`);
assert.deepEqual([reborn.atlas.completed, reborn.atlas.bonus, reborn.atlas.passives, reborn.atlas.seeds, reborn.atlas.stash, reborn.atlas.fragments],
    [[], [], [], 0, [], {}], 'progress, passives, seeds, maps and fragments go');
assert.equal(reborn.atlas.unlocked, true);
assert.equal(reborn.atlas.autoMap, true);
assert.deepEqual(reborn.atlas.loadout, ['maps'], 'the device setting stays');
assert.deepEqual([reborn.atlas.epoch.count, reborn.atlas.epoch.essence], [1, 12]);
assert.equal(reborn.atlas.starterSeason, 0, 'the reborn atlas hands out its starter maps again');
assert.ok(run('atlas.sync(game).length') >= 3);

assert.equal(run(`atlasEpoch.buy(game,'points')`), '');
assert.equal(run(`atlasEpoch.buy(game,'points')`), '', 'second rank costs 2');
assert.equal(run('game.atlas.epoch.essence'), 12 - 1 - 2);
assert.equal(run('atlas.points(game)'), 4, 'two ranks of old sap add four passive points');
assert.equal(run(`atlasPassives.allocate(game,'s_r')`), '', 'points from perks buy passives on a fresh atlas');
run(`atlasEpoch.buy(game,'quantity');atlasEpoch.buy(game,'supply');`);
const zone = copy(`atlas.preview(game, Object.assign(atlasMaps.create('roots_0', 1), { uid: 1 })).atlasLootQuantity`);
assert.equal(zone, 5, 'the harvest perk reaches map item quantity');
assert.equal(run('game.atlas.epoch.essence'), 12 - 1 - 2 - 1 - 1);
run('game.atlas.epoch.essence=0;');
assert.match(run(`atlasEpoch.buy(game,'slots')`), /정수가 부족/, 'perks cost essence');
run(`game.atlas.epoch.essence=50;atlasEpoch.buy(game,'slots');`);
assert.match(run(`atlasEpoch.buy(game,'slots')`), /가장 높은 단계/, 'perks stop at their max');
assert.equal(run('atlas.slots(game)'), 3, 'the wide-device perk adds a fragment slot');

run('game.currencies={...defaultGame.currencies};atlas.onLoopReset(game);');
assert.deepEqual(copy('[game.currencies.magicBud,game.currencies.formlessDew,game.currencies.sapBud]'), [20, 5, 1], 'the supply perk fills the new loop wallet');
const saved = copy(`(() => { const raw = JSON.parse(serializeSaveState(game)); raw.atlas.epoch = { count: -3, essence: 'lots', perks: { points: 99, supply: 2, nope: 4 } };
    const state = mergeDefaults(raw); return { epoch: state.atlas.epoch, twice: mergeDefaults(JSON.parse(serializeSaveState(state))).atlas.epoch }; })()`);
assert.deepEqual(saved.epoch, { count: 0, essence: 0, perks: { points: 5, supply: 2 } }, 'corrupt epoch values are clamped');
assert.deepEqual(saved.twice, saved.epoch, 'normalization is idempotent');
console.log('atlas epoch: four-seed gate, essence formula, exact reset, perk costs and caps, bonus sum, loop supply, save clamps: OK');
