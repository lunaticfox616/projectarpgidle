// 그루터기 함(js/stump-box.js): 획득 판정, 칸 해금, 배치, 처치 성장, 억제·공명, 드랍, 루프 회귀, 저장 경계.
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
const seed = run('stumpBox.claimStarter(game, "seed", "fire", "flower").id');
const sap = run('stumpBox.claimStarter(game, "sap", "cold").id');
assert.strictEqual(run('stumpBox.claimStarter(game, "seed", "cold")'), null, 'each starter gift is given once');
assert.strictEqual(run(`stumpBox.itemById(game, ${seed}).path`), 'flower', 'a gift seed grows into the path it was given');
assert.ok(['flower', 'fruit'].includes(run('stumpBox.createItem(game, { family: "seed", color: "cold", roll: 1 }).path')), 'any other seed gets its path when it is made (2026-10-09)');
run('game.stumpBox.items.pop();');
assert.strictEqual(run(`stumpBox.place(game, ${seed}, 0)`), false, 'closed cells take nothing');
assert.strictEqual(run(`stumpBox.place(game, ${seed}, 12)`), true);
assert.strictEqual(run(`stumpBox.place(game, ${sap}, 12)`), false, 'an occupied cell takes nothing');
assert.strictEqual(run(`stumpBox.place(game, ${sap}, 11)`), true);
assert.strictEqual(run('stumpBox.storage(game).length'), 0, 'placed items leave storage without copies');
assert.strictEqual(run('typeof stumpBox.setPath'), 'undefined', 'the path is never picked by hand');

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
assert.strictEqual(run(`stumpBox.move(game, ${loose}, 7)`), true);
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

// ── 처치 성장: 판 위 미성숙품만, 보통 2 · 정예 12 · 보스 60 ────────────────────────────
run('stumpBox.onEnemyKilled(game, {}); stumpBox.onEnemyKilled(game, { isElite: true });');
assert.strictEqual(run(`stumpBox.itemById(game, ${seed}).xp`), 14);
const stored = run('stumpBox.createItem(game, { family: "seed", color: "fire", roll: 1 }).id');
run('stumpBox.onEnemyKilled(game, {});');
assert.strictEqual(run(`stumpBox.itemById(game, ${stored}).xp`), 0, 'storage items do not grow');
assert.strictEqual(run(`stumpBox.stageOf(stumpBox.itemById(game, ${seed}))`), 'seed');
run(`{ const item = stumpBox.itemById(game, ${seed}); item.xp = stumpBox.need(item) / 2 - 1; } stumpBox.onEnemyKilled(game, {});`);
assert.strictEqual(run(`stumpBox.stageOf(stumpBox.itemById(game, ${seed}))`), 'sprout', 'half grown shows a sprout');
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), {}, 'nothing counts before it ripens');
// 다 자랄 때의 굴림(16번)은 0.5로 고정해 추가 줄 없이 자라게 한다.
run(`Math.random = () => 0.5; { const item = stumpBox.itemById(game, ${seed}); item.xp = stumpBox.need(item) - 1; } stumpBox.onEnemyKilled(game, {}); Math.random = globalThis.realRandom;`);
assert.strictEqual(run(`stumpBox.stageOf(stumpBox.itemById(game, ${seed}))`), 'flower');
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 6 }, 'a grown fire flower gives fire damage');

// ── 공명: 다 자란 같은 색 3개 이상이면 그 색 능력치 +10% ─────────────────────────────
run(`game.season = 2; game.contentProgression.highestLoop = 2;
    for (const cell of [6, 8]) { const item = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1 }); stumpBox.place(game, item.id, cell); item.path = 'flower'; item.xp = stumpBox.need(item); item.ripe = true; }`);
assert.deepStrictEqual(json('stumpBox.evaluate(game).stats'), { firePctDmg: 19.8 }, 'three grown fire flowers: 6 × 3 × 1.1');
assert.deepStrictEqual(json('[...stumpBox.evaluate(game).resonant]'), ['fire']);
run(`{ const cold = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 }); stumpBox.place(game, cold.id, 16); cold.xp = stumpBox.need(cold); cold.ripe = true; }`);
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
    { item: null, compost: { family: 'sap', color: 'fire', growth: 96, fed: 1, ripened: [] } }, 'a full storage turns the drop into compost');
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

// ── 거름(2026-10-06): 보관함의 씨앗 · 수액 하나를 써서 판에서 자라는 것을 모두 키운다 ─────────────────
run(`globalThis.compostSap = stumpBox.createItem(game, { family: 'sap', color: 'lightning', roll: 1.2 });
    globalThis.growingBefore = stumpBox.growingItems(game).map(item => [item.id, item.xp]);`);
const fed = run('growingBefore.length');
assert.ok(fed > 0, 'something on the board is growing');
assert.strictEqual(run('stumpBox.compostGrowth(compostSap)'), 144, 'compost growth follows quality (120 × 120%)');
assert.strictEqual(run('stumpBox.compostReason(game, game.stumpBox.board[17])'), '보관함의 씨앗이나 수액만 거름으로 쓸 수 있습니다.', 'a placed item is not compost');
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
    [[3, 'seed', STUMP_GROWTH_NEED.seed, true, 1.3], [5, 'sap', 0, false, 1]], 'duplicate and unknown items drop, values clamp (stored quality tops out at 130%, the cube merge cap)');
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
run('while (stumpBox.createItem(game, { family: "sap", color: "chaos" })) {}');
assert.deepStrictEqual(json(`stumpBox.rollDrop(game, { isBoss: true }, ${sequence([0, 0.9, 0, 0])}).compost`),
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
run("{ const sap = stumpBox.createItem(game, { family: 'sap', color: 'lightning', roll: 1 }); stumpBox.place(game, sap.id, 12); sap.xp = stumpBox.need(sap) - 120; }");
assert.deepStrictEqual(json('stumpBox.bulkCompostPlan(game, "fire").map(item => item.roll)'), [0.8, 0.85], 'the plan stops once the growing sap would ripen (96 + 102 ≥ 120)');
assert.deepStrictEqual(json('(() => { const result = stumpBox.compostMany(game, "fire"); return [result.count, result.growth, result.ripened.length]; })()'), [2, 198, 1]);
run("globalThis.bulkGrown = stumpBox.createItem(game, { family: 'seed', color: 'fire', roll: 1, path: 'fruit' }).id; stumpBox.itemById(game, bulkGrown).xp = 10;");
assert.deepStrictEqual(json('stumpBox.discardMany(game, "fire").map(item => item.roll).sort()'), [0.9, 0.95, 1, 1.05],
    'bulk discard throws every spare away, not only those past the best three of a kind');
assert.ok(run('stumpBox.itemById(game, bulkGold) !== null && stumpBox.itemById(game, bulkGrown) !== null'), 'golden and grown seeds stay');
assert.strictEqual(run('stumpBox.discardMany(game, "fire")'), null, 'nothing left to throw away');

// ── 판 1 저장(2026-10-09 전 필요량): 자라던 비율은 그대로, 다 자란 것은 다 자란 채로, 고르지 않은 씨앗은 id로 길이 정해진다 ─────
run(`game = mergeDefaults({ ...JSON.parse(serializeSaveState(game)), stumpBox: { version: 1, acquired: true, nextId: 9,
    items: [{ id: 1, family: 'seed', color: 'fire', path: 'fruit', xp: 200, roll: 1 }, { id: 2, family: 'sap', color: 'cold', xp: 500, ripe: true, roll: 1 },
        { id: 3, family: 'seed', color: 'chaos', xp: 0, roll: 1 }, { id: 4, family: 'seed', color: 'chaos', xp: 0, roll: 1 }], board: [] } }); window.game = game;`);
assert.deepStrictEqual(json('game.stumpBox.items.map(item => [item.id, item.xp, item.ripe, item.path])'),
    [[1, STUMP_GROWTH_NEED.seed / 2, false, 'fruit'], [2, STUMP_GROWTH_NEED.sap, true, null], [3, 0, false, 'fruit'], [4, 0, false, 'flower']],
    'half grown stays half grown, grown stays grown, and a seed never planted gets a fixed path by id');
assert.strictEqual(run('game.stumpBox.version'), 2);
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.strictEqual(run('stumpBox.itemById(game, 1).xp'), STUMP_GROWTH_NEED.seed / 2, 'a version-2 box is not scaled again');

// ── 배치 미리보기: 판·아이템·성장·재화는 그대로 두고 실제 이동과 같은 효과를 보여 준다 ──────────
fresh({ season: 18 });
run(`globalThis.previewFlowers = [6, 8, 12].map(cell => {
        const item = stumpBox.createItem(game, { family: 'seed', color: 'fire', path: 'flower', roll: 1 });
        item.ripe = true; item.xp = stumpBox.need(item); stumpBox.place(game, item.id, cell); return item.id;
    });
    globalThis.previewCold = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 }).id;
    globalThis.previewTalisman = stumpBox.addTalisman(game, talismans.rollNormal('sealShard', () => 0.5));
    previewTalisman.ripe = true; previewTalisman.xp = stumpBox.need(previewTalisman);
    stumpBox.place(game, previewTalisman.id, 16);
    globalThis.previewRepulsion = stumpBox.addTalisman(game, talismans.fromCosmos(COSMOS_BOSS_REWARD_DB['planet-45'].talisman));
    previewRepulsion.ripe = true; previewRepulsion.xp = stumpBox.need(previewRepulsion);
    stumpBox.graftRaise(game, 7);
    globalThis.previewEffects = state => JSON.stringify([stumpBox.evaluate(state), talismanEffects.summarize(state)],
        (key, value) => value instanceof Set ? [...value].sort() : value);`);
assert.strictEqual(run('stumpBox.evaluate(game).stats.firePctDmg'), 19.8, 'the live board starts with three resonating flowers');
assert.ok(run('game.stumpBox.graft[7] > 0'), 'moving onto the graft also changes the calculated effect');
const previewState = run('JSON.stringify(game)'), liveEffects = run('previewEffects(game)');
for (const [id, cell] of json(`[
    [previewFlowers[0], 7], [previewFlowers[0], 12], [previewCold, 7], [previewCold, 6],
    [previewTalisman.id, 17], [previewRepulsion.id, 17], [previewRepulsion.id, 7]
]`)) {
    run(`globalThis.proposedBoard = stumpBox.previewMove(game, ${id}, ${cell});
        globalThis.actualBoard = JSON.parse(JSON.stringify(game));`);
    assert.ok(run('proposedBoard'), 'valid empty, occupied and storage moves can be previewed');
    const proposedEffects = run('previewEffects(proposedBoard)');
    assert.strictEqual(run('JSON.stringify(game)'), previewState, 'previewing and evaluating never spend, grow, place or save items');
    assert.strictEqual(run('previewEffects(game)'), liveEffects, 'preview caches cannot replace the live board effects');
    assert.strictEqual(run(`stumpBox.move(actualBoard, ${id}, ${cell})`), true);
    assert.strictEqual(run('JSON.stringify(proposedBoard)'), run('JSON.stringify(actualBoard)'), 'preview agrees with the entire actual move state');
    assert.strictEqual(proposedEffects, run('previewEffects(actualBoard)'), 'suppression, resonance, graft and talisman effects agree with the actual move');
}
assert.strictEqual(run('stumpBox.evaluate(stumpBox.previewMove(game, previewCold, 7)).suppressed.size'), 4,
    'an unripe stored sap suppresses all three flowers when placed between them');
assert.strictEqual(run('talismanEffects.summarize(stumpBox.previewMove(game, previewRepulsion.id, 17)).suppressed.has(previewTalisman.id)'), true,
    'the preview shows an adjacent talisman losing its effect');
assert.strictEqual(run('talismanEffects.summarize(stumpBox.previewMove(game, previewRepulsion.id, 7)).amplified.has(previewTalisman.id)'), true,
    'the preview also shows a distant talisman gaining its amplification');
fresh({ season: 2 });
run(`globalThis.refusedPreview = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 });
    stumpBox.place(game, refusedPreview.id, 12);`);
for (const cell of [12, 0, -1, 25, 7.5]) {
    const before = run('JSON.stringify(game)');
    assert.strictEqual(run(`stumpBox.previewMove(game, refusedPreview.id, ${cell})`), null, 'same, closed and invalid cells have no preview');
    assert.strictEqual(run('JSON.stringify(game)'), before, 'a refused preview changes nothing');
}
run('game.woodsmanBuildLock = true;');
const lockedPreviewState = run('JSON.stringify(game)');
assert.strictEqual(run('stumpBox.previewMove(game, refusedPreview.id, 7)'), null, 'the woodsman challenge refuses a prospective build change');
assert.strictEqual(run('JSON.stringify(game)'), lockedPreviewState);

// ── 한 단계 배치 되돌리기: 좌표만 되돌리고 그 사이 성장·획득·지출을 취소하지 않는다 ───────────
const preparePlacementUndo = () => {
    fresh({ season: 18 });
    run(`globalThis.undoFirst = stumpBox.createItem(game, { family: 'seed', color: 'fire', path: 'flower', roll: 1 });
        globalThis.undoSecond = stumpBox.createItem(game, { family: 'sap', color: 'lightning', roll: 1 });
        globalThis.undoStored = stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 });
        stumpBox.place(game, undoFirst.id, 12); stumpBox.place(game, undoSecond.id, 16);`);
};
for (const action of [
    'stumpBox.move(game, undoFirst.id, 7)', 'stumpBox.move(game, undoFirst.id, 16)',
    'stumpBox.move(game, undoStored.id, 7)', 'stumpBox.move(game, undoStored.id, 12)',
    'stumpBox.unplace(game, undoFirst.id)'
]) {
    preparePlacementUndo();
    const before = run('JSON.stringify(game.stumpBox.board)');
    assert.strictEqual(run(action), true);
    assert.strictEqual(run('stumpBox.canUndoPlacement(game)'), true);
    run(`stumpBox.previewMove(game, undoSecond.id, 8); stumpBox.move(game, undoSecond.id, 0.5);`);
    assert.strictEqual(run('stumpBox.undoPlacement(game)'), true, 'previews and refused moves cannot replace the last successful move');
    assert.strictEqual(run('JSON.stringify(game.stumpBox.board)'), before, 'empty, swap, storage and unplace moves restore exactly their positions');
    assert.strictEqual(run('stumpBox.undoPlacement(game)'), false, 'undo is one step, with no redo or earlier history');
}
preparePlacementUndo();
run(`stumpBox.move(game, undoFirst.id, 7); stumpBox.move(game, undoFirst.id, 8);
    undoFirst.xp = stumpBox.need(undoFirst) - 1; stumpBox.grow(game, {});
    stumpBox.toggleLock(game, undoFirst.id); game.currencies.formlessDew = 13;
    stumpBox.createItem(game, { family: 'sap', color: 'chaos', roll: 1 });`);
assert.strictEqual(run('undoFirst.ripe'), true);
const afterGrowth = run('JSON.stringify([game.stumpBox.items, game.stumpBox.harvest, game.currencies])');
assert.strictEqual(run('stumpBox.undoPlacement(game)'), true);
assert.strictEqual(run('game.stumpBox.board[7]'), run('undoFirst.id'), 'two moves undo only the second move');
assert.strictEqual(run('JSON.stringify([game.stumpBox.items, game.stumpBox.harvest, game.currencies])'), afterGrowth,
    'ripening rolls, XP, new drops, locks, harvest records and currency all remain current');

for (const invalidate of [
    'stumpBox.discard(game, undoStored.id)', 'stumpBox.compost(game, undoStored.id)',
    'stumpBox.place(game, undoSecond.id, 8)', 'stumpBox.regress(game)',
    'stumpBox.restore(game)', 'game.season += 1', 'game.woodsmanBuildLock = true',
    'game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game'
]) {
    preparePlacementUndo();
    run('stumpBox.move(game, undoFirst.id, 7);');
    run(invalidate);
    const before = run('JSON.stringify(game)');
    assert.strictEqual(run('stumpBox.undoPlacement(game)'), false, `undo expires after ${invalidate}`);
    assert.strictEqual(run('JSON.stringify(game)'), before, 'an expired undo never resurrects or removes items');
}
preparePlacementUndo();
run(`stumpBox.move(game, undoStored.id, 7);
    while (stumpBox.createItem(game, { family: 'sap', color: 'chaos', roll: 1 })) {}`);
const fullStorageState = run('JSON.stringify(game)');
assert.strictEqual(run('stumpBox.undoPlacement(game)'), false, 'a new drop may fill the freed storage slot and block returning another item');
assert.strictEqual(run('JSON.stringify(game)'), fullStorageState);
run('stumpBox.move(game, undoFirst.id, 16);');
assert.strictEqual(run('stumpBox.undoPlacement(game)'), true, 'a full storage still allows undoing a board swap');
run('stumpBox.move(game, undoStored.id, 12);');
assert.strictEqual(run('stumpBox.unplace(game, undoStored.id)'), false, 'a full storage refuses taking another item out');
assert.strictEqual(run('stumpBox.undoPlacement(game)'), true, 'the failed take-out preserves the prior successful move');

preparePlacementUndo();
run(`stumpBox.move(game, undoFirst.id, 7);
    globalThis.undoUnique = generateUniqueItem(1, '방패', null, {});
    game.inventory.push(undoUnique, generateUniqueItem(1, '방패', undoUnique.name, {}));
    game.inventory.slice(-2).forEach(item => stumpCube.put(game, 'equipment', item));`);
assert.strictEqual(run('stumpCube.match().recipe.id'), 'equip_unique_remake');
assert.strictEqual(run('stumpCube.transmute(game, () => 0.5).ok'), true);
assert.strictEqual(run('stumpBox.canUndoPlacement(game)'), false, 'crafting expires placement history even without consuming a stump item');

// ── 조합 잠금: 넣은 뒤 잠가도 다른 재료만으로 조합하지 않고, 불러오기와 화면 조회가 보호를 풀지 않는다 ──
fresh({ season: 6 });
run(`globalThis.cubeSeed = stumpBox.createItem(game, { family: 'seed', color: 'fire', path: 'flower', roll: 1 });
    stumpBox.toggleLock(game, cubeSeed.id);`);
assert.strictEqual(run('stumpCube.candidates("stump").some(item => item.id === cubeSeed.id)'), false, 'locked seeds are not candidates');
assert.notStrictEqual(run('stumpCube.put(game, "stump", cubeSeed)'), '', 'direct placement also refuses a locked seed');
run(`stumpBox.toggleLock(game, cubeSeed.id); stumpCube.put(game, 'stump', cubeSeed);
    for (let i = 0; i < 3; i++) stumpCube.put(game, 'stump', stumpBox.createItem(game, { family: 'sap', color: 'cold', roll: 1 }));
    stumpBox.toggleLock(game, cubeSeed.id);`);
for (const restore of [false, true]) {
    if (restore) run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
    const protectedState = run('JSON.stringify([game.stumpCube, game.stumpBox, game.currencies, game.inventory])');
    assert.strictEqual(run('stumpCube.entries().length'), 4, 'a locked cell remains available to take out');
    assert.strictEqual(run('stumpCube.match()'), null, 'three remaining saps must not become an alternative match');
    assert.deepStrictEqual(json('stumpCube.missingRecipes()'), [], 'a protected input cannot suggest spending the other inputs');
    assert.strictEqual(run('stumpCube.transmute().ok'), false, 'locking after placement blocks the whole transaction');
    assert.strictEqual(run('JSON.stringify([game.stumpCube, game.stumpBox, game.currencies, game.inventory])'), protectedState,
        'a refusal keeps references, all materials and the wallet, including after a save round trip');
}
assert.strictEqual(run('stumpCube.takeOut(game, 0)'), true, 'a locked cell can be explicitly taken out');
assert.strictEqual(run('stumpCube.transmute().ok'), true, 'the three unlocked saps still combine normally');
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
    globalThis.paidAmber=stumpBox.createItem(game,{family:'sap',color:'fire',roll:1});paidAmber.ripe=true;
    paidAmber.xp=stumpBox.need(paidAmber);stumpCube.put(game,'stump',paidAmber);game.currencies.sealShard=5;`);
assert.strictEqual(run('stumpCube.match().recipe.id'), 'talisman_reroll_line', 'the protected paid recipe was valid before locking');
run('stumpBox.toggleLock(game,cubeTalismans[0].id);');
const paidState = run('JSON.stringify([game.stumpBox,game.stumpCube,game.currencies])');
assert.strictEqual(run('stumpCube.transmute().ok'), false);
assert.strictEqual(run('JSON.stringify([game.stumpBox,game.stumpCube,game.currencies])'), paidState, 'a blocked paid reroll keeps currency, amber and talisman lines');

// ── 부족 재료 조회: 공개된 조합, 모든 현재 재료와 같은 조건만. 조회는 손상·빈 참조도 고쳐 쓰지 않는다 ──
fresh({ season: 2 });
assert.deepStrictEqual(json('stumpCube.missingRecipes()'), [], 'an empty cube reveals no hints');
run(`globalThis.hintSeed = stumpBox.createItem(game, { family: 'seed', color: 'fire', path: 'flower', roll: 1 });
    stumpCube.put(game, 'stump', hintSeed);`);
assert.deepStrictEqual(json('stumpCube.missingRecipes().map(row => [row.recipe.id, row.missingCount, row.missing[0].picked[0].item.id])'),
    [['stump_merge', 2, run('hintSeed.id')]], 'one seed needs two more of its existing family, path and colour');
run(`game.stumpCube.slots.push({kind:'stump',id:999999,x:3,y:3});`);
const hintState = run('JSON.stringify(game)');
run('stumpCube.missingRecipes();');
assert.strictEqual(run('JSON.stringify(game)'), hintState, 'the query never prunes references, learns recipes or changes state');
for (const spec of [
    { family: 'seed', color: 'cold', path: 'flower' },
    { family: 'seed', color: 'fire', path: 'fruit' },
    { family: 'sap', color: 'fire' }
]) {
    run(`stumpCube.clear();stumpCube.put(game,'stump',hintSeed);stumpCube.put(game,'stump',stumpBox.createItem(game,${JSON.stringify(spec)}));`);
    assert.deepStrictEqual(json('stumpCube.missingRecipes()'), [], 'different same-rule values cannot be fixed just by adding materials');
}
run(`stumpCube.clear();
    globalThis.hintSap = stumpBox.createItem(game, { family: 'sap', color: 'fire', roll: 1 });
    hintSap.ripe = true; hintSap.xp = stumpBox.need(hintSap);stumpCube.put(game,'stump',hintSap);
    game.stumpBox.harvest.grown=['amber-fire'];`);
assert.strictEqual(run('stumpCube.missingRecipes().some(row => row.recipe.id === "amber_catalyst")'), false, 'an unrevealed loop-32 recipe stays hidden');
run('game.season=32;');
assert.strictEqual(run('stumpCube.missingRecipes().find(row => row.recipe.id === "amber_catalyst").missingCount'), 1);
run(`globalThis.hintGear=createItemFromBase(BASE_ITEM_DB.find(row=>row.id==='buckler_scrap'),'rare',1,{});
    game.inventory.push(hintGear);stumpCube.put(game,'equipment',hintGear);`);
assert.deepStrictEqual(json('stumpCube.missingRecipes().map(row => [row.recipe.id,row.missing.map(part=>[part.rule.kind,part.rule.family,part.count])])'),
    [['equip_rare_tier', [['stump', 'sap', 1]]]], 'rare equipment and one amber need one amber, not an unrelated recipe');
run(`globalThis.secondAmber=stumpBox.createItem(game,{family:'sap',color:'cold',roll:1});
    secondAmber.ripe=true;secondAmber.xp=stumpBox.need(secondAmber);stumpCube.put(game,'stump',secondAmber);`);
assert.strictEqual(run('stumpCube.match().recipe.id'), 'equip_rare_tier', 'an input without same-colour restriction accepts both colours');
assert.deepStrictEqual(json('stumpCube.missingRecipes()'), [], 'a complete recipe does not pretend to lack materials');
run(`stumpCube.put(game,'stump',stumpBox.createItem(game,{family:'seed',color:'chaos',path:'fruit'}));`);
assert.deepStrictEqual(json('stumpCube.missingRecipes()'), [], 'an incompatible extra material does not produce a misleading hint');

// ── 이전 고유: 저장에 남은 이름이 현재 목록에 없어도 미리보기가 창을 막지 않고 기존 재조합을 보존한다 ──
fresh({ season: 2 });
run(`for (let i = 0; i < 2; i++) {
    const item = createItemFromBase(BASE_ITEM_DB.find(row => row.id === 'buckler_scrap'), 'rare', 1, {});
    item.rarity = 'unique'; item.name = '목록에서 사라진 옛 고유'; item.quality = 20;
    game.inventory.push(normalizeItem(item));
}
game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;
game.inventory.forEach(item => stumpCube.put(game, 'equipment', item));`);
assert.strictEqual(run('stumpCube.match().recipe.id'), 'equip_unique_remake');
const legacyPreviewState = run('JSON.stringify([game, itemIdCounter])');
run('globalThis.legacyPreviewRandom = Math.random; Math.random = () => { throw new Error("preview must not roll a replacement"); };');
let legacyPreview;
try {
    legacyPreview = json('stumpCube.preview()');
    assert.deepStrictEqual(json('stumpCube.preview()'), legacyPreview, 'an unknown old name still has a deterministic preview');
} finally { run('Math.random = legacyPreviewRandom;'); }
assert.strictEqual(legacyPreview.recipe.id, 'equip_unique_remake');
assert.strictEqual(legacyPreview.quality, 0);
assert.strictEqual(legacyPreview.tier, undefined, 'the replacement unique tier is not known before rolling');
assert.strictEqual(legacyPreview.keep, '', 'an unknown unique name cannot be promised to survive');
assert.strictEqual(run('JSON.stringify([game, itemIdCounter])'), legacyPreviewState, 'preview preserves the old items and save');
assert.doesNotThrow(() => run('stumpCubeUi.cubeHtml()'), 'the cube remains viewable with legacy equipment');
run('globalThis.legacyRemade = stumpCube.transmute(game, () => 0.5);');
assert.strictEqual(run('legacyRemade.ok'), true, 'the existing random unique fallback remains craftable');
assert.strictEqual(run('UNIQUE_DB.some(row => row.name === legacyRemade.outputs[0].item.name)'), true);
assert.strictEqual(run('game.inventory.some(item => item.name === "목록에서 사라진 옛 고유")'), false, 'old inputs are consumed exactly once');
assert.strictEqual(run('game.inventory.length'), 1, 'one actual unique replaces the pair');

console.log('stump box: grant, unlocks, placement, growth, suppression, resonance, drops, loop regression, bulk actions, cube protection/hints and saves: OK');
