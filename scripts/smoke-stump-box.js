// 그루터기 함(js/stump-box.js): 획득 판정, 칸 해금, 배치, 처치 성장, 오행 비활성화·공명, 드랍, 루프 회귀, 저장 경계.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const STUMP_GROWTH_NEED = json('STUMP_BOX_GROWTH.need');
const fresh = extra => run(`game = mergeDefaults(${JSON.stringify(extra || {})}); window.game = game; contentProgression.sync(game);`);

// ── 획득: 새 게임은 잠김, 액트 10 기록이나 루프 2 이상이면 저장 경계에서 한 번 지급 ─────────────
fresh();
assert.deepStrictEqual(json('({ acquired: game.stumpBox.acquired, open: stumpBox.openCount(game), tab: contentProgression.canOpen("tab-stump") })'),
    { acquired: false, open: 0, tab: false }, 'a new game has no box');
assert.strictEqual(run('stumpBox.claimStarter(game, "seed", "fire")'), null, 'no starter gift before the box');
fresh({ journalEntries: ['prologue', 'act_10'] });
assert.deepStrictEqual(json('({ acquired: game.stumpBox.acquired, via: game.stumpBox.via, tab: contentProgression.canOpen("tab-stump"), unlock: game.unlocks.stump })'),
    { acquired: true, via: 'migration', tab: true, unlock: true }, 'an act-10 journal grants the box on load');
fresh({ season: 2, loopCount: 1 });
assert.strictEqual(run('game.stumpBox.acquired'), true, 'a loop-2 save has cleared act 10 before');
fresh();
run('game.maxZoneId = ABYSS_START_ZONE_ID;');
assert.strictEqual(run('stumpBox.sync(game, "act10")'), true, 'clearing act 10 (the chaos floors open) grants it live');
assert.strictEqual(run('stumpBox.sync(game, "act10")'), false, 'and only once');

// ── 칸 해금(2026-09-30 사용자 결정): 가운데 3×3 9칸에서 시작해 최고 도달 루프마다 한 칸씩, 루프 17에 25칸 ─────
const opens = {};
for (const loop of [1, 2, 5, 6, 10, 16, 17, 25, 50]) {
    run(`game.season = ${loop}; game.contentProgression.highestLoop = ${loop};`);
    opens[loop] = run('stumpBox.openCount(game)');
}
assert.deepStrictEqual(opens, { 1: 9, 2: 10, 5: 13, 6: 14, 10: 18, 16: 24, 17: 25, 25: 25, 50: 25 });
assert.strictEqual(run('stumpBox.nextOpening(game)'), null, 'nothing left to open on a full board');
run('game.season = 1; game.contentProgression.highestLoop = 1;');
assert.deepStrictEqual(json('[12, 7, 11, 13, 17, 6, 8, 16, 18].map(cell => stumpBox.isOpen(game, cell))'), Array(9).fill(true), 'the centre 3×3 is open from the start');
assert.deepStrictEqual(json('[2, 22, 1, 0, 20].map(cell => stumpBox.opensAt(game, cell))'), [2, 5, 6, 14, 17], 'closed cells say which loop opens them');
assert.deepStrictEqual(json('stumpBox.nextOpening(game)'), { loop: 2, cells: 10 }, 'the next cell opens on the next loop');

// ── 시작 선물과 배치 ─────────────────────────────────────────────────────────
const seed = run('stumpBox.claimStarter(game, "seed", "fire").id');
const sap = run('stumpBox.claimStarter(game, "second", "cold").id');
assert.strictEqual(run('stumpBox.claimStarter(game, "seed", "cold")'), null, 'each starter gift is given once');
assert.strictEqual(run(`stumpBox.itemById(game, ${seed}).path`), null, 'a seed does not know what it grows into (2026-11-04)');
assert.strictEqual(run('stumpBox.createItem(game, { family: "seed", color: "cold", roll: 1, path: "fruit" }).path'), null, 'not even when asked for a kind');
run('game.stumpBox.items.pop();');
assert.strictEqual(run(`stumpBox.place(game, ${seed}, 0)`), false, 'closed cells take nothing');
assert.strictEqual(run(`stumpBox.place(game, ${seed}, 12)`), true);
assert.strictEqual(run(`stumpBox.place(game, ${sap}, 12)`), false, 'an occupied cell takes nothing');
assert.strictEqual(run(`stumpBox.place(game, ${sap}, 11)`), true);
assert.strictEqual(run('stumpBox.storage(game).length'), 0, 'placed items leave storage without copies');
assert.strictEqual(run('typeof stumpBox.setPath'), 'undefined', 'the path is never picked by hand');

// ── 오행(2026-11-04): 이기는 색이 상하좌우로 맞닿으면 진 쪽만 멈추고, 진 쪽을 낳는 색이 곁에 있으면 멈추지 않는다 ─────────
assert.deepStrictEqual(json('[...stumpBox.evaluate(game).suppressed]'), [seed], 'cold beside fire stops only the fire (냉기가 화염을 이긴다)');
const feeder = run('stumpBox.createItem(game, { family: "seed", color: "physical", roll: 1 }).id');
run(`stumpBox.place(game, ${feeder}, 13)`);
assert.strictEqual(run('stumpBox.evaluate(game).suppressed.size'), 0, 'a physical neighbour feeds the fire (물리가 화염을 낳는다) and keeps it working');
run(`stumpBox.unplace(game, ${feeder}); stumpBox.discard(game, ${feeder});`);
// No kill drop until the move checks below count storage exactly (a boss kill rolls one at random, so the run flaked).
run('globalThis.realRandom = Math.random; Math.random = () => 0.999;');
run('stumpBox.onEnemyKilled(game, { isBoss: true });');
assert.deepStrictEqual(json(`[stumpBox.itemById(game, ${seed}).xp, stumpBox.itemById(game, ${sap}).xp]`), [0, 60], 'the stopped item does not grow, the winner does');
assert.strictEqual(run(`stumpBox.place(game, ${seed}, 7) && stumpBox.place(game, ${sap}, 17)`), true, 'moving apart (top and bottom of the cross) ends it at once');
assert.strictEqual(run('stumpBox.evaluate(game).suppressed.size'), 0);

// ── 옮기기(누르기·끌기 공통): 빈 칸이면 옮기고, 찬 칸이면 자리를 바꾸고, 보관함에서 찬 칸으로 오면 원래 것은 보관함으로 ─────
assert.strictEqual(run(`stumpBox.move(game, ${seed}, 17)`), true, 'moving onto an occupied cell trades places');
assert.deepStrictEqual(json('[game.stumpBox.board[17], game.stumpBox.board[7]]'), [seed, sap]);
assert.strictEqual(run(`stumpBox.move(game, ${seed}, 17)`), false, 'a move onto its own cell changes nothing');
assert.strictEqual(run(`stumpBox.move(game, ${seed}, 0)`), false, 'closed cells take nothing');
const loose = run('stumpBox.createItem(game, { family: "seed", color: "chaos", roll: 1 }).id');
assert.strictEqual(run(`stumpBox.move(game, ${loose}, 7)`), true);
assert.deepStrictEqual(json('[game.stumpBox.board[7], stumpBox.storage(game).map(item => item.id)]'), [loose, [sap]],
    'from storage onto an occupied cell sends the occupant to storage');
assert.strictEqual(json('game.stumpBox.board.filter(id => id !== null).length'), 2, 'no item is ever on two cells');
run('game.woodsmanBuildLock = true;');
assert.strictEqual(run(`stumpBox.move(game, ${sap}, 7)`), false, 'the woodsman fight locks moves too');
run('game.woodsmanBuildLock = false;');
// 뒤 검사들이 쓰는 배치(화염 씨앗 7, 냉기 씨앗 17)로 되돌린다.
assert.strictEqual(run(`stumpBox.unplace(game, ${loose}) && stumpBox.discard(game, ${loose}) && stumpBox.move(game, ${seed}, 7) && stumpBox.move(game, ${sap}, 17)`), true);
assert.deepStrictEqual(json('[game.stumpBox.board[7], game.stumpBox.board[17], stumpBox.storage(game).length]'), [seed, sap, 0]);
run('Math.random = globalThis.realRandom;');

// ── 처치 성장: 판 위 미성숙품만, 보통 2 · 정예 12 · 보스 60 ────────────────────────────
run('stumpBox.onEnemyKilled(game, {}); stumpBox.onEnemyKilled(game, { isElite: true });');
assert.strictEqual(run(`stumpBox.itemById(game, ${seed}).xp`), 14);
const stored = run('stumpBox.createItem(game, { family: "seed", color: "fire", roll: 1 }).id');
run('stumpBox.onEnemyKilled(game, {});');
assert.strictEqual(run(`stumpBox.itemById(game, ${stored}).xp`), 0, 'storage items do not grow');
assert.strictEqual(run(`stumpBox.stageOf(stumpBox.itemById(game, ${seed}))`), 'seed');
run(`{ const item = stumpBox.itemById(game, ${seed}); item.xp = stumpBox.need(item) / 2 - 1; } stumpBox.onEnemyKilled(game, {});`);
assert.strictEqual(run(`stumpBox.stageOf(stumpBox.itemById(game, ${seed}))`), 'seed', 'half grown is still a seed (no sprout since 2026-11-04)');
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), {}, 'nothing counts before it ripens');
// 다 자랄 때의 굴림은 0.1로 고정한다: 종류는 꽃, 추가 줄, 풍작, 황금은 없다.
run(`Math.random = () => 0.1; { const item = stumpBox.itemById(game, ${seed}); item.xp = stumpBox.need(item) - 1; } stumpBox.onEnemyKilled(game, {}); Math.random = globalThis.realRandom;`);
assert.strictEqual(run(`stumpBox.stageOf(stumpBox.itemById(game, ${seed}))`), 'flower', 'the kind is rolled as it ripens');
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 6 }, 'a grown fire flower gives fire damage');

// ── 공명(2026-11-04): 다 자란 같은 색 셋이 가로나 세로 한 줄이면 그 셋 +10%, 곁에 같은 색이 더 붙으면 없다 ─────────────
run(`game.season = 2; game.contentProgression.highestLoop = 2;
    for (const cell of [6, 8]) { const item = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); stumpBox.place(game, item.id, cell); item.path = 'flower'; item.xp = stumpBox.need(item); item.ripe = true; }`);
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 19.8 }, 'three grown fire flowers in a row: 6 × 3 × 1.1');
assert.deepStrictEqual(json('stumpBox.evaluate(game).groups.resonance'), [{ color: 'fire', cells: [6, 7, 8] }]);
run(`{ const cold = stumpBox.createItem(game, { family: 'seed', color: 'cold', roll: 1 }); stumpBox.place(game, cold.id, 16); cold.xp = stumpBox.need(cold); cold.ripe = true; cold.path = 'root'; }`);
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 19.8, resC: 5 }, 'a grown cold root away from the fire adds cold resistance');
run(`{ const cold = stumpBox.createItem(game, { family: 'seed', color: 'cold', roll: 1 }); stumpBox.place(game, cold.id, 12); }`);
assert.deepStrictEqual(json('[stumpBox.evaluate(game).stats.firePctDmg, stumpBox.evaluate(game).suppressed.has(game.stumpBox.board[12])]'), [19.8, true],
    '반극: a cold seed beside the resonating fire stops instead of the fire');
run(`{ const fire = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); stumpBox.place(game, fire.id, 11); }`);
assert.deepStrictEqual(json('[stumpBox.evaluate(game).groups.resonance.length, stumpBox.evaluate(game).stats.firePctDmg]'), [0, 12],
    'a fourth fire, even unripe, breaks the resonance, so the cold seed stops the middle fire again');

// ── 능력치 파이프라인: 보상 버킷에 한 번 합산 ───────────────────────────────────────
assert.strictEqual(run('(() => { const bucket = createEmptyStatBucket(); stumpBox.applyStats(bucket, game); return bucket.firePctDmg; })()'), 12);
assert.strictEqual(run('(() => { const bucket = createEmptyStatBucket(); stumpBox.applyStats(bucket, game); return bucket.resC; })()'), 5, 'a grown cold root gives cold resistance');
assert.doesNotThrow(() => run('getPlayerStats(false, false, true)'), 'the stat pipeline reads the box');

// ── 드랍: 함 전용 굴림, 색의 절반은 판의 색, 보관함이 차면 거름, 스토리 액트 탐험 중에는 굴리지 않음 ───────────────
const sequence = values => `(() => { const values = ${JSON.stringify(values)}; return () => values.shift(); })()`;
assert.strictEqual(run(`stumpBox.rollDrop(game, {}, ${sequence([0.5])})`), null, 'most kills drop nothing');
// 굴림 순서: 확률 · 색 몫(판에 놓인 것이 있을 때만) · 색 · 품질 · 황금. 색 몫 0.9는 절반을 넘어 다섯 색(물리, 냉기, 번개, 화염, 카오스)에서 고른다.
assert.deepStrictEqual(json(`(() => { const item = stumpBox.rollDrop(game, { isBoss: true }, ${sequence([0.1, 0.9, 0.3, 0.5, 0.9])}).item; return [item.family, item.color, item.roll]; })()`),
    ['seed', 'cold', 1], 'a boss drop is a seed of a rolled colour and quality');
// 판에는 화염 셋(6 · 7 · 8)과 냉기 셋(12 · 16 · 17)이 있다: 절반은 이 둘에서, 나머지는 다섯 색에서 고르게.
const colours = json(`(() => {
    const count = { physical: 0, fire: 0, cold: 0, lightning: 0, chaos: 0 };
    let value = 11; const random = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
    for (let i = 0; i < 30000; i++) {
        const rolled = stumpBox.rollDrop(game, { isBoss: true }, random);
        if (rolled && rolled.item) { count[rolled.item.color]++; stumpBox.discard(game, rolled.item.id); }
    }
    return count; })()`);
const dropped = Object.values(colours).reduce((sum, value) => sum + value, 0);
assert.ok(Math.abs((colours.fire + colours.cold) / dropped - 0.7) < 0.03, `board colours take half the drops plus their even share: ${JSON.stringify(colours)}`);
assert.ok(['physical', 'lightning', 'chaos'].every(color => Math.abs(colours[color] / dropped - 0.1) < 0.02), 'other colours still drop');
run('while (stumpBox.createItem(game, { family: "seed", color: "chaos" })) {}');
assert.strictEqual(run('stumpBox.storage(game).length'), 50, 'storage holds 50');
// 꽉 찬 보관함: 떨어진 것은 거름이 되어 판에서 자라는 것(12번과 17번 칸 냉기 씨앗: 냉기는 화염에 지지 않는다)을 키운다.
const growingSap = run('game.stumpBox.board[17]'), sapBefore = run(`stumpBox.itemById(game, ${growingSap}).xp`);
assert.deepStrictEqual(json(`stumpBox.growingItems(game).map(item => item.id).sort()`), json('[game.stumpBox.board[12], game.stumpBox.board[17]].sort()'),
    'the two unripe cold seeds are growing');
assert.deepStrictEqual(json(`stumpBox.rollDrop(game, { isBoss: true }, ${sequence([0, 0, 0, 0, 0])})`),
    { item: null, compost: { family: 'seed', color: 'fire', growth: 96, fed: 2, ripened: [] } }, 'a full storage turns the drop into compost');
assert.strictEqual(run(`stumpBox.itemById(game, ${growingSap}).xp`), sapBefore + 96, 'the compost grows what is growing (80% quality → 96)');
assert.strictEqual(run('stumpBox.storage(game).length'), 50, 'and storage stays full');
assert.strictEqual(run(`(() => { const id = game.stumpBox.board[12]; return stumpBox.unplace(game, id); })()`), false, 'nor items taken off the board');
run('game.stumpBox.items = game.stumpBox.items.filter(item => item.color !== "chaos");');
run('game.actExploration = { zoneId: game.currentZoneId, act: 1 }; Math.random = () => 0;');
const before = run('game.stumpBox.items.length');
run('stumpBox.onEnemyKilled(game, { isBoss: true });');
assert.strictEqual(run('game.stumpBox.items.length'), before, 'story-act expeditions escrow loot, so the box does not drop there');
run('game.actExploration = { zoneId: game.currentZoneId, act: null }; stumpBox.onEnemyKilled(game, { isBoss: true });');
assert.strictEqual(run('game.stumpBox.items.length'), before + 1, 'a generated map (chaos, realm, the atlas …) drops like the board');
run('game.actExploration = null; stumpBox.onEnemyKilled(game, { isBoss: true });');
assert.strictEqual(run('game.stumpBox.items.length'), before + 2, 'outside expeditions a kill can drop');

// ── 거름(2026-10-06): 보관함의 씨앗 하나를 써서 판에서 자라는 것을 모두 키운다 ─────────────────
run(`globalThis.compostSap = stumpBox.createItem(game, { family: 'seed', color: 'lightning', roll: 1.2 });
    globalThis.growingBefore = stumpBox.growingItems(game).map(item => [item.id, item.xp]);`);
const fed = run('growingBefore.length');
assert.ok(fed > 0, 'something on the board is growing');
assert.strictEqual(run('stumpBox.compostGrowth(compostSap)'), 144, 'compost growth follows quality (120 × 120%)');
assert.strictEqual(run('stumpBox.compostReason(game, game.stumpBox.board[17])'), '보관함의 씨앗만 거름으로 쓸 수 있습니다.', 'a placed item is not compost');
run('game.woodsmanBuildLock = true;');
assert.strictEqual(run('stumpBox.compost(game, compostSap.id)'), null, 'the woodsman fight locks compost too');
run('game.woodsmanBuildLock = false;');
assert.deepStrictEqual(json('(() => { const result = stumpBox.compost(game, compostSap.id); return [result.growth, result.fed]; })()'), [144, fed]);
assert.strictEqual(run('stumpBox.itemById(game, compostSap.id)'), null, 'the compost is used up');
assert.strictEqual(run('growingBefore.every(([id, xp]) => { const item = stumpBox.itemById(game, id); return item.xp === Math.min(stumpBox.need(item), xp + 144); })'),
    true, 'every growing item gained the growth');

// ── 나무꾼 전투 중에는 세팅을 바꾸지 않는다 ─────────────────────────────────────────
run('game.woodsmanBuildLock = true;');
assert.strictEqual(run(`stumpBox.unplace(game, game.stumpBox.board[12])`), false);
run('game.woodsmanBuildLock = false;');

// ── 루프 전환(2026-11-04 사용자): 봉인 칸의 것만 그대로 남고, 판, 보관함, 생육함의 나머지는 모두 사라진다 ─────────────
// 앞 단계의 처치에서 무작위로 떨어진 번개 씨앗이 있을 수 있으므로 색이 아니라 id로 짚는다.
const unripe = run(`(() => { const item = stumpBox.createItem(game, { family: 'seed', color: 'lightning' }); stumpBox.place(game, item.id, 18, 'fruit'); item.xp = 120; return item.id; })()`);
run('stumpBox.createItem(game, { family: "seed", color: "fire" }); game.stumpBox.sealed = [18];');
assert.ok(run('stumpBox.regress(game)') > 0, 'items outside the seal cell go');
assert.deepStrictEqual(json('game.stumpBox.items.map(item => item.id)'), [unripe], 'only the sealed item is left, storage included');
assert.deepStrictEqual(json('game.stumpBox.board.flatMap((id, cell) => (id === null ? [] : [cell]))'), [18], 'and only its cell is filled');
assert.strictEqual(run(`stumpBox.itemById(game, ${unripe}).xp`), 120, 'the sealed item keeps its growth');
run('game.stumpBox.sealed = [];');

// ── 저장 경계: 왕복 그대로, 손상 저장은 고친다 ─────────────────────────────────────
const saved = run('JSON.stringify(game.stumpBox)');
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.strictEqual(run('JSON.stringify(game.stumpBox)'), saved, 'a save round trip keeps the box');
run(`game = mergeDefaults({ ...JSON.parse(serializeSaveState(game)), stumpBox: {
    acquired: true, nextId: 2, starter: { seed: true },
    items: [{ id: 3, family: 'seed', color: 'fire', path: 'flower', xp: 9999, roll: 9 }, { id: 3, family: 'sap', color: 'cold' },
        { id: 4, family: 'rock', color: 'fire' }, { id: 5, family: 'sap', color: 'cold', xp: -5 }],
    board: [3, 3, 99, 5] } }); window.game = game;`);
assert.deepStrictEqual(json('game.stumpBox.items.map(item => [item.id, item.family, item.xp, item.ripe, item.roll])'),
    [[3, 'seed', STUMP_GROWTH_NEED.seed, true, 1.41], [5, 'seed', 0, false, 1]], 'duplicate and unknown items drop, values clamp (stored quality tops out at 141%: the 130% cap and the rare merge past it), an old sap is a seed');
assert.deepStrictEqual(json('game.stumpBox.board.slice(0, 5)'), [3, null, null, 5, null], 'each item sits on at most one cell');
assert.strictEqual(run('game.stumpBox.nextId'), 6, 'new ids never reuse saved ones');
run('game = mergeDefaults({ ...JSON.parse(serializeSaveState(game)), stumpBox: "broken" }); window.game = game;');
assert.strictEqual(run('Array.isArray(game.stumpBox.items) && game.stumpBox.board.length'), 25, 'a broken box is rebuilt');

// ── 거름은 자라는 것이 없으면 쓰지 않는다, 꽉 찬 보관함의 드랍도 그때는 놓친다 ─────────────────────
fresh({ journalEntries: ['prologue', 'act_10'] });
const idle = run('stumpBox.createItem(game, { family: "seed", color: "fire", roll: 1 }).id');
assert.strictEqual(run(`stumpBox.compostReason(game, ${idle})`), '그루터기 함에서 성장 중인 그루터기 아이템이 없습니다.', 'compost needs something growing');
assert.strictEqual(run(`stumpBox.compost(game, ${idle})`), null);
assert.ok(run(`stumpBox.itemById(game, ${idle}) !== null`), 'a refused compost keeps the item');
run('while (stumpBox.createItem(game, { family: "seed", color: "chaos" })) {}');
assert.deepStrictEqual(json(`stumpBox.rollDrop(game, { isBoss: true }, ${sequence([0, 0.7, 0])}).compost`),
    { family: 'seed', color: 'fire', growth: 96, fed: 0, ripened: [] }, 'with nothing growing the full-storage drop is lost (and said so)');

// ── 일괄 거름 사용 · 일괄 버리기(2026-10-09): 거름은 색과 종류마다 좋은 것 셋, 황금, 고대를 남기고 다 자랄 만큼만.
// 버리기는 황금, 고대, 자란 것만 남긴다(2026-10-17) ─────────
fresh({ journalEntries: ['prologue', 'act_10'] });
run(`game.stumpBox.harvest.grown = ['flower-fire', 'flower-cold', 'flower-lightning', 'flower-chaos'];
    [0.8, 0.85, 0.9, 0.95, 1, 1.05].forEach(roll => stumpBox.createItem(game, { family: 'seed', color: 'fire', roll, path: 'flower' }));
    globalThis.bulkGold = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 0.8, path: 'flower', golden: true }).id;`);
assert.deepStrictEqual(json('stumpBox.bulkItems(game, "fire").map(item => item.roll).sort()'), [0.8, 0.85, 0.9], 'the best three of a kind and golden ones stay');
assert.deepStrictEqual(json('stumpBox.bulkItems(game, "cold")'), [], 'another colour takes nothing');
assert.strictEqual(run('stumpBox.bulkItems(game, "all").length'), 3, 'the all filter takes every colour');
assert.strictEqual(run('stumpBox.bulkCompostReason(game, "fire")'), '그루터기 함에서 성장 중인 그루터기 아이템이 없습니다.', 'bulk compost needs something growing');
run("{ const grower = stumpBox.createItem(game, { family: 'seed', color: 'lightning', roll: 1 }); stumpBox.place(game, grower.id, 12); grower.xp = stumpBox.need(grower) - 120; }");
assert.deepStrictEqual(json('stumpBox.bulkCompostPlan(game, "fire").map(item => item.roll)'), [0.8, 0.85], 'the plan stops once the growing seed would ripen (96 + 102 ≥ 120)');
assert.deepStrictEqual(json('(() => { const result = stumpBox.compostMany(game, "fire"); return [result.count, result.growth, result.ripened.length]; })()'), [2, 198, 1]);
run("globalThis.bulkGrown = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1, path: 'fruit' }).id; stumpBox.itemById(game, bulkGrown).xp = 10;");
assert.deepStrictEqual(json('stumpBox.discardMany(game, "fire").map(item => item.roll).sort()'), [0.9, 0.95, 1, 1.05],
    'bulk discard throws every spare away, not only those past the best three of a kind');
assert.ok(run('stumpBox.itemById(game, bulkGold) !== null && stumpBox.itemById(game, bulkGrown) !== null'), 'golden and grown seeds stay');
assert.strictEqual(run('stumpBox.discardMany(game, "fire")'), null, 'nothing left to throw away');

// ── 판 1 저장(2026-10-09 전 필요량): 자라던 비율은 그대로, 다 자란 호박석은 뿌리로, 자라는 씨앗은 종류를 모른다(2026-11-04) ─────
run(`game = mergeDefaults({ ...JSON.parse(serializeSaveState(game)), stumpBox: { version: 1, acquired: true, nextId: 9,
    items: [{ id: 1, family: 'seed', color: 'fire', path: 'fruit', xp: 200, roll: 1 }, { id: 2, family: 'sap', color: 'cold', xp: 500, ripe: true, roll: 1 },
        { id: 3, family: 'seed', color: 'chaos', xp: 0, roll: 1 }, { id: 4, family: 'seed', color: 'chaos', xp: 0, roll: 1 }], board: [] } }); window.game = game;`);
assert.deepStrictEqual(json('game.stumpBox.items.map(item => [item.id, item.xp, item.ripe, item.path])'),
    [[1, STUMP_GROWTH_NEED.seed / 2, false, null], [2, STUMP_GROWTH_NEED.seed, true, 'root'], [3, 0, false, null], [4, 0, false, null]],
    'half grown stays half grown, a grown amber is a grown root, and a growing seed forgets the kind it was given');
assert.strictEqual(run('game.stumpBox.version'), 3);
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.strictEqual(run('stumpBox.itemById(game, 1).xp'), STUMP_GROWTH_NEED.seed / 2, 'a later box is not scaled again');
// 판 2 저장의 네 색 줄: 물리가 더해져 다섯 색이 필요해도 채운 줄로 남는다(그 해금과 받은 보상이 닫히지 않는다).
run(`game = mergeDefaults({ ...JSON.parse(serializeSaveState(game)), stumpBox: { version: 2, acquired: true, nextId: 1, items: [], board: [],
    harvest: { grown: ['fruit-fire', 'fruit-cold', 'fruit-lightning', 'fruit-chaos', 'amber-fire'], gifts: { fruit: true } } } }); window.game = game;`);
assert.deepStrictEqual(json('[stumpBox.harvestRows(game), game.stumpBox.harvest.grown.includes("root-fire"), stumpBox.breedingOpen(game)]'), [['fruit'], true, true],
    'a row filled with the four old colours stays filled (its unlock too), and an old amber page is a root page');
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.deepStrictEqual(json('stumpBox.harvestRows(game)'), ['fruit'], 'and stays filled after another round trip');

// ── 조합 잠금: 넣은 뒤 잠가도 다른 재료만으로 조합하지 않고, 불러오기와 화면 조회가 보호를 풀지 않는다 ──
fresh({ season: 6 });
run(`globalThis.cubeSeed = stumpBox.createItem(game, { family: 'seed', color: 'fire', path: 'flower', roll: 1 });
    stumpBox.toggleLock(game, cubeSeed.id);`);
assert.strictEqual(run('stumpCube.candidates("stump").some(item => item.id === cubeSeed.id)'), false, 'locked seeds are not candidates');
assert.notStrictEqual(run('stumpCube.put(game, "stump", cubeSeed)'), '', 'direct placement also refuses a locked seed');
run(`stumpBox.toggleLock(game, cubeSeed.id); stumpCube.put(game, 'stump', cubeSeed);
    for (let i = 0; i < 3; i++) stumpCube.put(game, 'stump', stumpBox.createItem(game, { family: 'seed', color: 'cold', roll: 1 }));
    stumpBox.toggleLock(game, cubeSeed.id);`);
for (const restore of [false, true]) {
    if (restore) run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
    const protectedState = run('JSON.stringify([game.stumpCube, game.stumpBox, game.currencies, game.inventory])');
    assert.strictEqual(run('stumpCube.entries().length'), 4, 'a locked cell remains available to take out');
    assert.strictEqual(run('stumpCube.match()'), null, 'three remaining seeds must not become an alternative match');
    assert.deepStrictEqual(json('stumpCube.missingRecipes()'), [], 'a protected input cannot suggest spending the other inputs');
    assert.strictEqual(run('stumpCube.transmute().ok'), false, 'locking after placement blocks the whole transaction');
    assert.strictEqual(run('JSON.stringify([game.stumpCube, game.stumpBox, game.currencies, game.inventory])'), protectedState,
        'a refusal keeps references, all materials and the wallet, including after a save round trip');
}
assert.strictEqual(run('stumpCube.takeOut(game, 0)'), true, 'a locked cell can be explicitly taken out');
assert.strictEqual(run('stumpCube.transmute().ok'), true, 'the three unlocked seeds still combine normally');
assert.strictEqual(run('stumpBox.itemById(game, cubeSeed.id).locked'), true, 'the protected seed remains owned and locked');

fresh({ season: 6 });
run(`globalThis.cubeTalismans = Array.from({ length: 3 }, () => stumpBox.addTalisman(game, talismans.roll('sealShard', () => 0.5)));
    cubeTalismans.forEach(item => stumpCube.put(game, 'stump', item));
    stumpBox.toggleLock(game, cubeTalismans[0].id);`);
const talismanState = run('JSON.stringify([game.stumpBox, game.currencies, game.stumpCube])');
assert.strictEqual(run('stumpCube.transmute().ok'), false, 'locked talismans cannot be consumed either');
assert.strictEqual(run('JSON.stringify([game.stumpBox, game.currencies, game.stumpCube])'), talismanState);
run('stumpCube.clear();');
assert.strictEqual(run('stumpCube.candidates("stump").some(item => item.id === cubeTalismans[0].id)'), false);
assert.notStrictEqual(run('stumpCube.put(game, "stump", cubeTalismans[0])'), '');
run(`stumpBox.toggleLock(game,cubeTalismans[0].id);stumpCube.put(game,'stump',cubeTalismans[0]);
    globalThis.paidVine=stumpBox.createItem(game,{family:'seed',color:'fire',roll:1});paidVine.ripe=true;paidVine.path='vine';
    paidVine.xp=stumpBox.need(paidVine);stumpCube.put(game,'stump',paidVine);game.currencies.sealShard=5;`);
assert.strictEqual(run('stumpCube.match().recipe.id'), 'talisman_reroll_line', 'the protected paid recipe was valid before locking');
run('stumpBox.toggleLock(game,cubeTalismans[0].id);');
const paidState = run('JSON.stringify([game.stumpBox,game.stumpCube,game.currencies])');
assert.strictEqual(run('stumpCube.transmute().ok'), false);
assert.strictEqual(run('JSON.stringify([game.stumpBox,game.stumpCube,game.currencies])'), paidState, 'a blocked paid reroll keeps currency, vine and talisman lines');

// 잠근 주얼과 코어도 재료로 쓰지 않는다(2026-10-24 검토: 잠금 확인이 장비와 그루터기 아이템에만 있었다).
for (const kind of ['jewel', 'core']) {
    fresh({ season: 6 });
    run(`globalThis.lockedParts = [0, 1, 2].map(index => {
            if ('${kind}' === 'core') { const core = coreItems.roll(); core.perfect = false; core.rarity = 'rare'; bagItems.addCore(core, game); return core; }
            const jewel = bagItems.asJewel({ id: 990000 + index, name: '시험 주얼', tier: 1, hiddenTier: 3, rarity: 'rare', stats: [{ id: 'pctDmg', val: 5, tier: 3 }] });
            bagItems.put(jewel, game, true); return jewel;
        });
        game.currencies.jewelShard = 50; lockedParts[0].locked = true;`);
    assert.strictEqual(run(`stumpCube.candidates('${kind}').includes(lockedParts[0])`), false, `a locked ${kind} is not a candidate`);
    run(`lockedParts[0].locked = false; lockedParts.forEach(item => stumpCube.put(game, '${kind}', item));`);
    assert.ok(run('stumpCube.match()'), `three unlocked ${kind}s make a recipe`);
    run('lockedParts[0].locked = true;');
    const lockedState = run('JSON.stringify([game.inventory, game.currencies, game.stumpCube])');
    assert.strictEqual(run('stumpCube.transmute(game, () => 0.5).ok'), false, `a ${kind} locked after placement blocks the craft`);
    assert.strictEqual(run('JSON.stringify([game.inventory, game.currencies, game.stumpCube])'), lockedState, `the locked ${kind} and the other materials stay`);
}

// 화폐화(2026-11-03): 칸을 비우고 실물로 돌아오지 않는다. 값은 재화부터 나가고, 잠긴 것과 판 위의 것은 나가지 않는다. 저장과 루프를 넘기고, 조합창은 쓸 때만 줄인다.
run(`game.woodsmanBuildLock = false; game.stumpBox.board = game.stumpBox.board.map(() => null); game.stumpBox.items = []; game.stumpBox.wallet = {}; game.stumpCube.slots = [];
    var grownFlower = spec => { const item = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1, ...spec }); item.ripe = true; item.path = 'flower'; return item; };
    var walletA = grownFlower(), walletB = grownFlower(), walletLocked = grownFlower(), walletPlaced = grownFlower();
    walletLocked.locked = true; stumpBox.place(game, walletPlaced.id, 12);`);
assert.strictEqual(run('stumpBox.monetize(game, walletA.id)'), true, 'a stored grown item becomes currency');
assert.strictEqual(run('stumpBox.itemById(game, walletA.id)'), null, 'and leaves storage for good');
assert.strictEqual(run('stumpBox.monetize(game, walletLocked.id) || stumpBox.monetize(game, walletPlaced.id)'), false, 'locked and placed items stay items');
assert.strictEqual(run('stumpBox.harvestPriceHeld(game, "harvest:flower:fire")'), 2, 'the price counts currency and stored unlocked items only');
assert.strictEqual(run('stumpBox.payHarvestPrice(game, "harvest:flower:fire").walletKey'), 'flower-fire', 'currency pays first');
assert.strictEqual(run('stumpBox.payHarvestPrice(game, "harvest:flower:fire").id === walletB.id'), true, 'then the stored item');
assert.strictEqual(run('stumpBox.payHarvestPrice(game, "harvest:flower:fire")'), null, 'locked and placed items never pay');
run(`game.stumpBox.wallet = { 'flower-fire': 3 };`);
for (let i = 0; i < 3; i++) run(`stumpCube.put(game, 'wallet', stumpCube.candidates('wallet')[0])`);
assert.strictEqual(run('stumpCube.entries().length'), 3, 'currency goes into the cube');
assert.strictEqual(run('stumpCube.match()'), null, 'a merge does not take currency: it cannot come back as an item');
assert.strictEqual(run('stumpBox.walletCount(game, "flower-fire")'), 3, 'the cube only points at it');
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.deepStrictEqual(json('game.stumpBox.wallet'), { 'flower-fire': 3 }, 'currency survives a save round trip');
assert.strictEqual(run('stumpCube.entries().length'), 3, 'and so do its cube cells');
assert.strictEqual(run('stumpCube.takeOut(game, 0)'), true, 'taking it out');
assert.strictEqual(run('stumpBox.walletCount(game, "flower-fire")'), 3, 'leaves the currency whole');
run('stumpBox.regress(game);');
assert.strictEqual(run('stumpBox.walletCount(game, "flower-fire")'), 0, 'a new loop clears currency');
run(`game.stumpBox.wallet = { 'flower-fire': 1 };`);
assert.deepStrictEqual(json(`stumpBox.restore({ ...game, stumpBox: { ...game.stumpBox, wallet: { 'flower-fire': -3, 'amber-cold': 2.9, nope: 5, 'fruit-chaos': 'x' } } }).wallet`), { 'root-cold': 2 }, 'a broken wallet is cleaned on load, an old amber stack is a root stack');

// 생육함(2026-11-03): 보관함 칸을 비우고, 효과 없이 경험치만 일부 받고, 저장을 넘기며, 판과 한 아이템을 나누지 않는다.
run(`game.woodsmanBuildLock = false; game.stumpBox.board = game.stumpBox.board.map(() => null); game.stumpBox.items = []; game.stumpBox.wallet = {}; game.stumpBox.nursery = game.stumpBox.nursery.map(() => null);
    var nest = stumpBox.createItem(game, { family: 'seed', path: 'flower', color: 'fire', roll: 1 }), placedSeed = stumpBox.createItem(game, { family: 'seed', path: 'flower', color: 'fire', roll: 1 });
    stumpBox.place(game, placedSeed.id, 12);`);
assert.strictEqual(run('stumpBox.nurseryMove(game, nest.id, 12)'), true, 'an item goes on a nursery cell, even where the board holds another');
assert.strictEqual(run('stumpBox.storage(game).length'), 0, 'and leaves storage');
assert.strictEqual(run('stumpBox.move(game, nest.id, 13)'), false, 'a nursery item cannot also sit on the board');
assert.strictEqual(run('stumpBox.evaluate(game).counts.fire'), 0, 'nursery items count for nothing (unripe board seed either)');
run('stumpBox.growBy ? 0 : 0; stumpBox.grow(game, { isBoss: true });');
assert.strictEqual(run('placedSeed.xp'), 60, 'the board grows at full rate');
assert.strictEqual(run('nest.xp'), 6, 'the nursery at 10%');
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.strictEqual(run('game.stumpBox.nursery[12] === nest.id'), true, 'the nursery survives a save round trip');
assert.strictEqual(run('stumpBox.nurseryUnplace(game, nest.id) && stumpBox.storage(game).length'), 1, 'and gives the item back to storage');

console.log('stump box: grant, unlocks, placement, growth, 오행 suppression, resonance, drops, loop regression, bulk actions, cube lock protection, currency, nursery and saves: OK');
