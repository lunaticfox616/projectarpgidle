// 시든 정원(12번 루프 36, 2026-10-08, docs/loop-content-12-plan-20261008.md, data/garden-oils.js): 시든 무리의 정원 기름 셋을 목걸이에
// 바르면 그 조합이 이번 루프에 부르는 패시브 주요 노드 셋 가운데 하나가 새겨진다(효과는 제작으로 바뀌지 않는 줄로 장비 스탯에).
// 같은 색 열매 둘로도 기름을 만든다(조합창). 조합 표는 루프마다 바뀐다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game = mergeDefaults({ journalEntries: ['prologue', 'act_10'] }); window.game = game; game.season = 36;
    game.contentProgression.inherited = ['craft']; contentProgression.sync(game); game.inventory = [];
    window.logs = []; addLog = text => logs.push(String(text));
    window.amulet = () => { const item = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === '목걸이'), 'rare', 18);
        item.stats = []; item.chaosInfusion = null; return item; };
    Object.assign(game.currencies, { oilFire: 5, oilCold: 5, oilLight: 5, oilChaos: 5 });`);

// 1. 자료: 네 기름(그루터기 함 네 색), 색마다 바를 수 있는 주요 노드가 넉넉하고, 노드의 효과는 모두 장비 스탯 칸에 있다.
assert.deepEqual(json('GARDEN_OILS.oils.map(oil => oil.color)'), ['fire', 'cold', 'lightning', 'chaos']);
const sizes = json(`Object.fromEntries(['fire', 'cold', 'lightning', 'chaos'].map(color => [color, GARDEN_OILS.pools[color].length]))`);
assert.ok(Object.values(sizes).every(size => size >= 8), 'every colour names its archetypes');
assert.ok(run(`(() => { const bucket = createEmptyStatBucket(); return ['fire', 'cold', 'lightning', 'chaos'].every(color =>
    gardenOils.offers(game, [GARDEN_OILS.oils.find(oil => oil.color === color).key, 'oilFire', 'oilCold']).every(node => node.effects.every(effect => Object.hasOwn(bucket, effect.stat)))); })()`),
    'offered nodes carry only stats the equipment adds');

// 2. 조합: 셋이어야, 순서는 상관없이 같은 노드, 같은 색 셋이면 강한 노드만(힘 단계 2 이상), 루프가 바뀌면 다른 표.
assert.deepEqual(json(`gardenOils.offers(game, ['oilFire', 'oilCold'])`), [], 'three oils make a bowl');
const a = json(`gardenOils.offers(game, ['oilFire', 'oilCold', 'oilChaos']).map(node => node.id)`);
const b = json(`gardenOils.offers(game, ['oilChaos', 'oilFire', 'oilCold']).map(node => node.id)`);
assert.equal(a.length, 3);
assert.deepEqual(a, b, 'the order of the oils does not matter');
assert.equal(new Set(a).size, 3, 'three different nodes');
const pure = json(`gardenOils.offers(game, ['oilLight', 'oilLight', 'oilLight']).map(node => node.powerBand || 0)`);
assert.ok(pure.length === 3 && pure.every(band => band >= 2), 'three of one colour offer strong nodes only: ' + pure);
const nextLoop = json(`(() => { game.season = 37; const ids = gardenOils.offers(game, ['oilFire', 'oilCold', 'oilChaos']).map(node => node.id); game.season = 36; return ids; })()`);
assert.notDeepEqual(nextLoop, a, 'a new loop reshuffles the table');

// 3. 바르기: 목걸이만, 루프 36부터, 기름이 있어야, 그 조합의 노드만. 값을 치르고 새기며, 다시 바르면 바뀐다.
assert.match(run(`gardenOils.anointReason(game, { slot: '반지' }, ['oilFire', 'oilFire', 'oilFire'])`), /목걸이에만/);
assert.match(run(`(() => { game.season = 35; const reason = gardenOils.anointReason(game, amulet(), ['oilFire', 'oilFire', 'oilFire']); game.season = 36; return reason; })()`), /루프 36/);
assert.match(run(`(() => { const saved = game.currencies.oilChaos; game.currencies.oilChaos = 1; const reason = gardenOils.anointReason(game, amulet(), ['oilChaos', 'oilChaos', 'oilFire']); game.currencies.oilChaos = saved; return reason; })()`), /그늘 기름이\(가\) 부족/);
const done = json(`(() => {
    const item = amulet(), bowl = ['oilFire', 'oilCold', 'oilChaos'], target = gardenOils.offers(game, bowl)[1];
    const wrong = gardenOils.anoint(game, item, bowl, 'nope');
    const ok = gardenOils.anoint(game, item, bowl, target.id);
    return { wrong: wrong.reason, ok: ok.ok, anoint: item.anoint, target: target.id, left: [game.currencies.oilFire, game.currencies.oilCold, game.currencies.oilChaos],
        lines: gardenOils.lines(item), effects: target.effects };
})()`);
assert.match(done.wrong, /이 조합에 없습니다/);
assert.equal(done.ok, true);
assert.deepEqual(done.anoint, { nodeId: done.target });
assert.deepEqual(done.left, [4, 4, 4], 'one of each oil is spent');
assert.deepEqual(done.lines.map(line => [line.id, line.val]), done.effects.map(effect => [effect.stat, effect.val]), 'the node effects become item lines');

// 4. 스탯: 새긴 노드의 효과가 장비 스탯에 더해진다(제작 줄 자리는 그대로).
const stats = json(`(() => {
    const item = amulet(), bowl = ['oilLight', 'oilLight', 'oilLight'], node = gardenOils.offers(game, bowl)[0];
    gardenOils.anoint(game, item, bowl, node.id);
    const explicit = getResolvedEquipmentStatLists('목걸이', item, game).explicitStats;
    const effect = node.effects[0];
    return { stat: effect.stat, want: effect.val, got: explicit.filter(line => line.id === effect.stat).reduce((sum, line) => sum + line.val, 0), count: getItemExplicitOptionCount(item) };
})()`);
assert.equal(stats.got, stats.want, 'the engraved effect reaches the equipment stats: ' + JSON.stringify(stats));
assert.equal(stats.count, 0, 'and takes no affix place');

// 5. 저장 경계: 목걸이의 아는 주요 노드만 남는다.
const stored = json(`(() => {
    const item = amulet(); item.anoint = { nodeId: gardenOils.offers(game, ['oilFire', 'oilFire', 'oilFire'])[0].id };
    const keep = normalizeItem(JSON.parse(JSON.stringify(item)));
    const bogus = normalizeItem(JSON.parse(JSON.stringify({ ...item, anoint: { nodeId: 'nope' } })));
    const ring = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === '반지'), 'rare', 18); ring.anoint = item.anoint;
    return { keep: keep.anoint, bogus: bogus.anoint || null, ring: normalizeItem(JSON.parse(JSON.stringify(ring))).anoint || null };
})()`);
assert.ok(stored.keep && stored.keep.nodeId, 'a real anointment survives a load');
assert.equal(stored.bogus, null);
assert.equal(stored.ring, null, 'only amulets keep one');

// 6. 드롭과 방: 시든 무리만(일반 5%, 정예 30%), 루프 36부터, 깊은 뿌리에서 두 배, 방을 비우면 한 색의 기름 2 + 등급당 0.15.
assert.deepEqual(json(`gardenOils.killDrops({ atlasEncounter: 'witheredGarden' }, (() => { const r = [0.04, 0.6]; let i = 0; return () => r[i++]; })())`), [['oilLight', 1]]);
assert.deepEqual(json(`gardenOils.killDrops({ atlasEncounter: 'witheredGarden' }, () => 0.06)`), []);
assert.deepEqual(json(`gardenOils.killDrops({ atlasEncounter: 'sapWound' }, () => 0)`), []);
assert.equal(run(`atlasEncounters.isOpen('witheredGarden', 35)`), false);
assert.equal(run(`atlasEncounters.chance('witheredGarden', {}, 'roots')`), 16);
assert.equal(json(`atlasEncounters.tuneEnemy({ name: '거미', maxHp: 10, hp: 10 }, 'witheredGarden')`).ele, 'chaos');
const reward = json(`atlasEncounters.rewards({ atlasTier: 20 }, 'witheredGarden', {}, () => 0.1)`);
assert.equal(reward[0][1], 5, '2 + 0.15 × 20');
assert.ok(json('gardenOils.keys').includes(reward[0][0]));

// 7. 그루터기 함 열매 기름: 같은 색 열매(꽃은 안 된다) 둘 → 그 색 기름.
const cube = json(`(() => {
    const box = game.stumpBox; box.board = box.board.map(() => null); box.items = []; stumpCube.clear(game);
    const ripe = (color, path) => { const item = stumpBox.createItem(game, { family: 'seed', color, roll: 1 }); Object.assign(item, { xp: stumpBox.need(item), ripe: true, path }); return item; };
    const flowers = [ripe('cold', 'flower'), ripe('cold', 'flower')];
    flowers.forEach(item => stumpCube.put(game, 'stump', item));
    const flowerMatch = stumpCube.match(game);
    stumpCube.clear(game);
    const fruits = [ripe('cold', 'fruit'), ripe('cold', 'fruit')];
    fruits.forEach(item => stumpCube.put(game, 'stump', item));
    const before = game.currencies.oilCold, result = stumpCube.transmute(game);
    return { flower: flowerMatch && flowerMatch.recipe.id, ok: result.ok, recipe: result.ok && result.recipe.id, gained: game.currencies.oilCold - before };
})()`);
assert.notEqual(cube.flower, 'fruit_oil', 'flowers are not fruits');
assert.deepEqual([cube.ok, cube.recipe, cube.gained], [true, 'fruit_oil', 1]);

// 8. 화면: 장비 상세의 '기름' 단추는 목걸이에만, 툴팁에 새긴 노드.
assert.match(run(`gardenOilsUi.actionHtml(amulet(), null)`), />기름</);
assert.equal(run(`gardenOilsUi.actionHtml({ ...amulet(), slot: '반지' }, null)`), '');
assert.match(run(`(() => { const item = amulet(); item.anoint = { nodeId: gardenOils.offers(game, ['oilChaos', 'oilChaos', 'oilChaos'])[0].id }; return gardenOilsUi.tooltipHtml(item); })()`), /🌿 기름: /);
console.log('garden oils smoke passed');
