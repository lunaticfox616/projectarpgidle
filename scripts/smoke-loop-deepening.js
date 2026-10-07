// 깊어지는 해금(12번 루프 44, 48, 50, 2026-10-08, docs/loop-content-12-plan-20261008.md): 기억 던전 4, 5단계는 루프 44부터, 목걸이 기름
// 둘째 자리는 48부터, 지도마다 콘텐츠 방 하나 더는 50부터.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game = mergeDefaults({}); window.game = game; game.inventory = [];
    window.atLoop = loop => { game.season = loop; };
    window.amulet = () => { const item = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === '목걸이'), 'rare', 18); item.stats = []; item.chaosInfusion = null; return item; };
    Object.assign(game.currencies, { oilFire: 9, oilCold: 9, oilLight: 9, oilChaos: 9 });`);

// 1. 루프 44: 기억 던전의 높은 단계. 그 전에는 3단계까지 떨어지고, 갖고 있던 4단계 기억은 루프 44에 쓴다.
run('atLoop(43);');
assert.equal(run('memoryDungeon.maxTier(game)'), 3);
assert.equal(json(`memoryDungeon.settle(game, atlas.node('roots_0'), { node: 'roots_0', tier: 5, memory: 3 }, () => 0).ticket`), null, 'no tier 4 before loop 44');
run(`memoryDungeon.give(game, 'roots_0', 4);`);
assert.match(run(`memoryDungeon.entryReason(game, 'roots_0', 4)`), /4단계는 루프 44부터/);
run('atLoop(44);');
assert.equal(run('memoryDungeon.maxTier(game)'), 5);
assert.equal(json(`memoryDungeon.settle(game, atlas.node('roots_0'), { node: 'roots_0', tier: 5, memory: 3 }, () => 0).ticket.tier`), 4, 'the ladder climbs to 4 from loop 44');
assert.doesNotMatch(run(`memoryDungeon.entryReason(game, 'roots_0', 4)`), /루프 44부터/, 'the held tier 4 memory opens');

// 2. 루프 48: 목걸이 기름 둘째 자리. 첫째부터, 같은 노드는 한 자리에만, 두 노드의 효과가 모두 더해진다.
run('atLoop(47);');
assert.equal(run('gardenOils.slotCount(game)'), 1);
const early = json(`(() => { const item = amulet(), bowl = ['oilFire', 'oilFire', 'oilCold'];
    const node = gardenOils.offers(game, bowl)[0];
    return gardenOils.anoint(game, item, bowl, node.id, 1).reason; })()`);
assert.match(early, /둘째 자리는 루프 48부터/);
run('atLoop(48);');
assert.equal(run('gardenOils.slotCount(game)'), 2);
const two = json(`(() => {
    const item = amulet(), bowl = ['oilLight', 'oilLight', 'oilChaos'], offers = gardenOils.offers(game, bowl);
    const firstMissing = gardenOils.anoint(game, item, bowl, offers[0].id, 1).reason;
    gardenOils.anoint(game, item, bowl, offers[0].id, 0);
    const same = gardenOils.anoint(game, item, bowl, offers[0].id, 1).reason;
    const ok = gardenOils.anoint(game, item, bowl, offers[1].id, 1).ok;
    const lines = gardenOils.lines(item).length, want = offers[0].effects.length + offers[1].effects.length;
    const replaced = gardenOils.anoint(game, item, bowl, offers[2].id, 0).ok;
    const stored = normalizeItem(JSON.parse(JSON.stringify(item))).anoint;
    return { firstMissing, same, ok, lines, want, replaced, anoint: item.anoint, stored, ids: offers.map(node => node.id),
        tip: gardenOilsUi.tooltipHtml(item).split('🌿').length - 1 };
})()`);
assert.match(two.firstMissing, /첫째 자리부터/);
assert.match(two.same, /같은 노드를 두 자리에/);
assert.equal(two.ok, true);
assert.equal(two.lines, two.want, 'both engraved nodes add their effects');
assert.equal(two.replaced, true);
assert.deepEqual(two.anoint, { nodeId: two.ids[2], second: two.ids[1] }, 'replacing the first slot keeps the second');
assert.deepEqual(two.stored, two.anoint, 'two slots survive a load');
assert.equal(two.tip, 2, 'the tooltip shows both');
assert.deepEqual(json(`(() => { const item = amulet(); item.anoint = { nodeId: 'nope', second: gardenOils.offers(game, ['oilFire','oilFire','oilFire'])[0].id };
    return normalizeItem(JSON.parse(JSON.stringify(item))).anoint || null; })()`), null, 'a second slot without a valid first is dropped');

// 3. 루프 50: 지도마다 콘텐츠 방 하나 더.
assert.equal(run(`atlasEncounters.roomLimit({ encounterExtra: 0 }, 49)`), 1);
assert.equal(run(`atlasEncounters.roomLimit({ encounterExtra: 0 }, 50)`), 2);
assert.equal(run(`atlasEncounters.roomLimit({ encounterExtra: 1 }, 50)`), 3, 'on top of the passives');
const rooms = json(`(() => { const bonus = { encounterExtra: 0 }; for (const type of atlasEncounters.types) bonus[type] = 100;
    return [atlasEncounters.roll(bonus, [], () => 0.5, Infinity, { loop: 49 }).length, atlasEncounters.roll(bonus, [], () => 0.5, Infinity, { loop: 50 }).length]; })()`);
assert.deepEqual(rooms, [1, 2], 'loop 50 maps hold one more content room');
console.log('loop deepening smoke passed');
