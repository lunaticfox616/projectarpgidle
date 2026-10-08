// 그루터기 함(js/stump-box.js): 획득 판정, 칸 해금, 배치, 처치 성장, 억제·공명, 드랍, 루프 회귀, 저장 경계.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
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
const sap = run('stumpBox.claimStarter(game, "sap", "cold").id');
assert.strictEqual(run('stumpBox.claimStarter(game, "seed", "cold")'), null, 'each starter gift is given once');
assert.strictEqual(run(`stumpBox.place(game, ${seed}, 12)`), false, 'a seed needs a path before it is planted');
assert.strictEqual(run(`stumpBox.place(game, ${seed}, 0, "flower")`), false, 'closed cells take nothing');
assert.strictEqual(run(`stumpBox.place(game, ${seed}, 12, "flower")`), true);
assert.strictEqual(run(`stumpBox.place(game, ${sap}, 12)`), false, 'an occupied cell takes nothing');
assert.strictEqual(run(`stumpBox.place(game, ${sap}, 11)`), true);
assert.strictEqual(run('stumpBox.storage(game).length'), 0, 'placed items leave storage without copies');
assert.strictEqual(run(`stumpBox.setPath(game, ${seed}, "fruit")`), true, 'an ungrown seed may change its path');

// ── 억제: 상극색이 상하좌우로 맞닿으면 둘 다 멈춘다 ──────────────────────────────────
assert.deepStrictEqual(json(`[...stumpBox.evaluate(game).suppressed].sort()`), [seed, sap].sort(), 'fire beside cold suppresses both');
// No kill drop until the move checks below count storage exactly (a boss kill rolls one at random, so the run flaked).
run('globalThis.realRandom = Math.random; Math.random = () => 0.999;');
run('stumpBox.onEnemyKilled(game, { isBoss: true });');
assert.deepStrictEqual(json(`[stumpBox.itemById(game, ${seed}).xp, stumpBox.itemById(game, ${sap}).xp]`), [0, 0], 'suppressed items do not grow');
assert.strictEqual(run(`stumpBox.place(game, ${seed}, 7) && stumpBox.place(game, ${sap}, 17)`), true, 'moving apart (top and bottom of the cross) ends it at once');
assert.strictEqual(run('stumpBox.evaluate(game).suppressed.size'), 0);

// ── 옮기기(누르기·끌기 공통): 빈 칸이면 옮기고, 찬 칸이면 자리를 바꾸고, 보관함에서 찬 칸으로 오면 원래 것은 보관함으로 ─────
assert.strictEqual(run(`stumpBox.move(game, ${seed}, 17)`), true, 'moving onto an occupied cell trades places');
assert.deepStrictEqual(json('[game.stumpBox.board[17], game.stumpBox.board[7]]'), [seed, sap]);
assert.strictEqual(run(`stumpBox.move(game, ${seed}, 17)`), false, 'a move onto its own cell changes nothing');
assert.strictEqual(run(`stumpBox.move(game, ${seed}, 0)`), false, 'closed cells take nothing');
const loose = run('stumpBox.createItem(game, { family: "seed", color: "chaos", roll: 1 }).id');
assert.strictEqual(run(`stumpBox.move(game, ${loose}, 7)`), false, 'a seed without a path still needs one');
assert.deepStrictEqual(json('game.stumpBox.board.slice(7, 8)'), [sap], 'a refused move leaves the board as it was');
assert.strictEqual(run(`stumpBox.move(game, ${loose}, 7, "fruit")`), true);
assert.deepStrictEqual(json('[game.stumpBox.board[7], stumpBox.storage(game).map(item => item.id)]'), [loose, [sap]],
    'from storage onto an occupied cell sends the occupant to storage');
assert.strictEqual(json('game.stumpBox.board.filter(id => id !== null).length'), 2, 'no item is ever on two cells');
run('game.woodsmanBuildLock = true;');
assert.strictEqual(run(`stumpBox.move(game, ${sap}, 7)`), false, 'the woodsman fight locks moves too');
run('game.woodsmanBuildLock = false;');
// 뒤 검사들이 쓰는 배치(씨앗 7, 수액 17)로 되돌린다.
assert.strictEqual(run(`stumpBox.unplace(game, ${loose}) && stumpBox.discard(game, ${loose}) && stumpBox.move(game, ${seed}, 7) && stumpBox.move(game, ${sap}, 17)`), true);
assert.deepStrictEqual(json('[game.stumpBox.board[7], game.stumpBox.board[17], stumpBox.storage(game).length]'), [seed, sap, 0]);
run('Math.random = globalThis.realRandom;');

// ── 처치 성장: 판 위 미성숙품만, 보통 1 · 정예 6 · 보스 30 ────────────────────────────
run(`stumpBox.setPath(game, ${seed}, "flower"); stumpBox.onEnemyKilled(game, {}); stumpBox.onEnemyKilled(game, { isElite: true });`);
assert.strictEqual(run(`stumpBox.itemById(game, ${seed}).xp`), 7);
assert.strictEqual(run(`stumpBox.setPath(game, ${seed}, "fruit")`), false, 'a growing seed keeps its path');
const stored = run('stumpBox.createItem(game, { family: "seed", color: "fire", roll: 1 }).id');
run('stumpBox.onEnemyKilled(game, {});');
assert.strictEqual(run(`stumpBox.itemById(game, ${stored}).xp`), 0, 'storage items do not grow');
assert.strictEqual(run(`stumpBox.stageOf(stumpBox.itemById(game, ${seed}))`), 'seed');
run(`stumpBox.itemById(game, ${seed}).xp = 199; stumpBox.onEnemyKilled(game, {});`);
assert.strictEqual(run(`stumpBox.stageOf(stumpBox.itemById(game, ${seed}))`), 'sprout', 'half grown shows a sprout');
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), {}, 'nothing counts before it ripens');
// 다 자랄 때의 굴림(16번)은 0.5로 고정해 추가 줄 없이 자라게 한다.
run(`Math.random = () => 0.5; stumpBox.itemById(game, ${seed}).xp = 399; stumpBox.onEnemyKilled(game, {}); Math.random = globalThis.realRandom;`);
assert.strictEqual(run(`stumpBox.stageOf(stumpBox.itemById(game, ${seed}))`), 'flower');
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 6 }, 'a grown fire flower gives fire damage');

// ── 공명: 다 자란 같은 색 3개 이상이면 그 색 능력치 +10% ─────────────────────────────
run(`game.season = 2; game.contentProgression.highestLoop = 2;
    for (const cell of [6, 8]) { const item = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); stumpBox.place(game, item.id, cell, 'flower'); item.xp = 400; item.ripe = true; }`);
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 19.8 }, 'three grown fire flowers: 6 × 3 × 1.1');
assert.deepStrictEqual(json('[...stumpBox.evaluate(game).resonant]'), ['fire']);
run(`{ const cold = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 }); stumpBox.place(game, cold.id, 16); cold.xp = 500; cold.ripe = true; }`);
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 19.8, resC: 5 }, 'a grown cold amber away from the fire adds cold resistance');
run(`{ const cold = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 }); stumpBox.place(game, cold.id, 12); }`);
assert.deepStrictEqual(json('[stumpBox.evaluate(game).resonant.size, stumpBox.evaluate(game).stats.firePctDmg]'), [0, 12],
    'even an unripe cold sap beside a flower suppresses it and breaks the resonance');

// ── 능력치 파이프라인: 보상 버킷에 한 번 합산 ───────────────────────────────────────
assert.strictEqual(run('(() => { const bucket = createEmptyStatBucket(); stumpBox.applyStats(bucket, game); return bucket.firePctDmg; })()'), 12);
assert.strictEqual(run('(() => { const bucket = createEmptyStatBucket(); stumpBox.applyStats(bucket, game); return bucket.resC; })()'), 5, 'a grown cold amber gives cold resistance');
assert.doesNotThrow(() => run('getPlayerStats(false, false, true)'), 'the stat pipeline reads the box');

// ── 드랍: 함 전용 굴림, 색의 절반은 판의 색, 보관함이 차면 거름, 스토리 액트 탐험 중에는 굴리지 않음 ───────────────
const sequence = values => `(() => { const values = ${JSON.stringify(values)}; return () => values.shift(); })()`;
assert.strictEqual(run(`stumpBox.rollDrop(game, {}, ${sequence([0.5])})`), null, 'most kills drop nothing');
// 굴림 순서: 확률 · 계열 · 색 몫(판에 놓인 것이 있을 때만) · 색 · 품질. 색 몫 0.9는 절반을 넘어 네 색에서 고른다.
assert.deepStrictEqual(json(`(() => { const item = stumpBox.rollDrop(game, { isBoss: true }, ${sequence([0.1, 0.9, 0.9, 0.3, 0.5])}).item; return [item.family, item.color, item.roll]; })()`),
    ['seed', 'cold', 1], 'a boss drop picks family, colour and quality');
// 판에는 화염 셋(6 · 7 · 8)과 냉기 셋(12 · 16 · 17)이 있다: 절반은 이 둘에서, 나머지는 네 색에서 고르게.
const colours = json(`(() => {
    const count = { fire: 0, cold: 0, lightning: 0, chaos: 0 };
    let value = 11; const random = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
    for (let i = 0; i < 6000; i++) {
        const rolled = stumpBox.rollDrop(game, { isBoss: true }, random);
        if (rolled && rolled.item) { count[rolled.item.color]++; stumpBox.discard(game, rolled.item.id); }
    }
    return count; })()`);
const dropped = Object.values(colours).reduce((sum, value) => sum + value, 0);
assert.ok(Math.abs((colours.fire + colours.cold) / dropped - 0.75) < 0.03, `board colours take half the drops plus their even share: ${JSON.stringify(colours)}`);
assert.ok(Math.abs(colours.lightning / dropped - 0.125) < 0.02 && Math.abs(colours.chaos / dropped - 0.125) < 0.02, 'other colours still drop');
run('while (stumpBox.createItem(game, { family: "sap", color: "chaos" })) {}');
assert.strictEqual(run('stumpBox.storage(game).length'), 50, 'storage holds 50');
// 꽉 찬 보관함: 떨어진 것은 거름이 되어 판에서 자라는 것(17번 칸 냉기 수액, 12번은 화염 꽃 옆이라 멈춤)을 키운다.
const growingSap = run('game.stumpBox.board[17]'), sapBefore = run(`stumpBox.itemById(game, ${growingSap}).xp`);
assert.deepStrictEqual(json(`stumpBox.growingItems(game).map(item => item.id)`), [growingSap], 'only the unsuppressed unripe sap is growing');
assert.deepStrictEqual(json(`stumpBox.rollDrop(game, { isBoss: true }, ${sequence([0, 0, 0, 0, 0])})`),
    { item: null, compost: { family: 'sap', color: 'fire', growth: 80, fed: 1, ripened: [] } }, 'a full storage turns the drop into compost');
assert.strictEqual(run(`stumpBox.itemById(game, ${growingSap}).xp`), sapBefore + 80, 'the compost grows what is growing (80% quality → 80)');
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

// ── 거름(2026-10-06): 보관함의 씨앗 · 수액 하나를 써서 판에서 자라는 것을 모두 키운다 ─────────────────
run(`globalThis.compostSap = stumpBox.createItem(game, { family: 'sap', color: 'lightning', roll: 1.2 });
    globalThis.growingBefore = stumpBox.growingItems(game).map(item => [item.id, item.xp]);`);
const fed = run('growingBefore.length');
assert.ok(fed > 0, 'something on the board is growing');
assert.strictEqual(run('stumpBox.compostGrowth(compostSap)'), 120, 'compost growth follows quality');
assert.strictEqual(run('stumpBox.compostReason(game, game.stumpBox.board[17])'), '보관함의 씨앗이나 수액만 거름으로 쓸 수 있습니다.', 'a placed item is not compost');
run('game.woodsmanBuildLock = true;');
assert.strictEqual(run('stumpBox.compost(game, compostSap.id)'), null, 'the woodsman fight locks compost too');
run('game.woodsmanBuildLock = false;');
assert.deepStrictEqual(json('(() => { const result = stumpBox.compost(game, compostSap.id); return [result.growth, result.fed]; })()'), [120, fed]);
assert.strictEqual(run('stumpBox.itemById(game, compostSap.id)'), null, 'the compost is used up');
assert.strictEqual(run('growingBefore.every(([id, xp]) => { const item = stumpBox.itemById(game, id); return item.xp === Math.min(stumpBox.need(item), xp + 120); })'),
    true, 'every growing item gained the growth');

// ── 나무꾼 전투 중에는 세팅을 바꾸지 않는다 ─────────────────────────────────────────
run('game.woodsmanBuildLock = true;');
assert.strictEqual(run(`stumpBox.unplace(game, game.stumpBox.board[12])`), false);
run('game.woodsmanBuildLock = false;');

// ── 루프 전환: 배치·미성숙 진행 유지, 다 자란 것만 씨앗·수액으로 ───────────────────────────
// 앞 단계의 처치에서 무작위로 떨어진 번개 씨앗이 있을 수 있으므로 색이 아니라 id로 짚는다.
const unripe = run(`(() => { const item = stumpBox.createItem(game, { family: 'seed', color: 'lightning' }); stumpBox.place(game, item.id, 18, 'fruit'); item.xp = 120; return item.id; })()`);
const board = run('JSON.stringify(game.stumpBox.board)');
run('stumpBox.regress(game);');
assert.strictEqual(run('JSON.stringify(game.stumpBox.board)'), board, 'placements stay');
assert.strictEqual(run('game.stumpBox.items.filter(item => item.ripe).length'), 0, 'grown items return to seed/sap');
assert.strictEqual(run(`stumpBox.itemById(game, ${unripe}).xp`), 120, 'unripe progress stays');
assert.strictEqual(run(`stumpBox.itemById(game, ${seed}).path`), 'flower', 'a regressed seed keeps its path');

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
    [[3, 'seed', 400, true, 1.3], [5, 'sap', 0, false, 1]], 'duplicate and unknown items drop, values clamp (stored quality tops out at 130%, the cube merge cap)');
assert.deepStrictEqual(json('game.stumpBox.board.slice(0, 5)'), [3, null, null, 5, null], 'each item sits on at most one cell');
assert.strictEqual(run('game.stumpBox.nextId'), 6, 'new ids never reuse saved ones');
run('game = mergeDefaults({ ...JSON.parse(serializeSaveState(game)), stumpBox: "broken" }); window.game = game;');
assert.strictEqual(run('Array.isArray(game.stumpBox.items) && game.stumpBox.board.length'), 25, 'a broken box is rebuilt');

// ── 거름은 자라는 것이 없으면 쓰지 않는다, 꽉 찬 보관함의 드랍도 그때는 놓친다 ─────────────────────
fresh({ journalEntries: ['prologue', 'act_10'] });
const idle = run('stumpBox.createItem(game, { family: "seed", color: "fire", roll: 1 }).id');
assert.strictEqual(run(`stumpBox.compostReason(game, ${idle})`), '판에서 자라는 것이 없습니다.', 'compost needs something growing');
assert.strictEqual(run(`stumpBox.compost(game, ${idle})`), null);
assert.ok(run(`stumpBox.itemById(game, ${idle}) !== null`), 'a refused compost keeps the item');
run('while (stumpBox.createItem(game, { family: "sap", color: "chaos" })) {}');
assert.deepStrictEqual(json(`stumpBox.rollDrop(game, { isBoss: true }, ${sequence([0, 0.9, 0, 0])}).compost`),
    { family: 'seed', color: 'fire', growth: 80, fed: 0, ripened: [] }, 'with nothing growing the full-storage drop is lost (and said so)');

console.log('stump box: grant, unlocks, placement, growth, suppression, resonance, drops, loop regression and saves: OK');
