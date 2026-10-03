// 그루터기 함 접붙이기(2026-10-01, 보조 콘텐츠 통합 7단계 — 가지치기 자리, 사용자 결정 "칸 강화 5단계"):
// 루프 18부터 루프마다 3점, 칸마다 5단계(n단계에 n점), 단계마다 그 칸에 놓인 씨앗 · 수액 · 부적 효과 +10%(9단계에서 6 → 10),
// 마름병 포자로 한 단계 되돌리기(점수 반환), 나무꾼 잠금, 저장 경계(손상 · 예산 초과), 영구 빌드 서명, 화면 조각.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const fresh = extra => run(`game = mergeDefaults(${JSON.stringify(extra)}); window.game = game; contentProgression.sync(game);`);
const points = () => json('stumpBox.graftPoints(game)');
const ranks = () => json('game.stumpBox.graft');

// ── 열리는 시점과 점수: 루프 18부터 루프마다 3점(저장하지 않고 최고 도달 루프에서 계산) ─────────
fresh({ season: 17, loopCount: 16, level: 90 });
assert.equal(run('game.stumpBox.acquired'), true, 'loop 17 saves already have the box');
assert.equal(run('stumpBox.graftOpen(game)'), false);
assert.deepEqual(points(), { earned: 0, spent: 0, free: 0 });
assert.match(run('stumpBox.graftRaiseReason(game, 12)'), /루프 18/);
assert.equal(run('stumpBox.graftRaise(game, 12)'), false);
fresh({ season: 18, loopCount: 17, level: 90 });
assert.equal(run('stumpBox.graftOpen(game)'), true);
assert.deepEqual(points(), { earned: 3, spent: 0, free: 3 });
run('game.season = 20;');
assert.equal(points().earned, 9, 'three more points every loop');
run('game.season = 18;');

// ── 올리기: n단계에 n점, 최대 5단계 ─────────────────────────────────────────
assert.equal(run('stumpBox.graftRaise(game, 12)'), true);
assert.equal(run('stumpBox.graftRaise(game, 12)'), true);
assert.deepEqual(points(), { earned: 3, spent: 3, free: 0 }, 'ranks 1 and 2 cost 1 + 2');
assert.match(run('stumpBox.graftRaiseReason(game, 12)'), /3단계에는 3점/);
assert.equal(run('stumpBox.graftRaise(game, 12)'), false, 'not enough points: nothing changes');
assert.equal(ranks()[12], 2);
run('game.season = 40;');
for (let i = 0; i < 3; i++) run('stumpBox.graftRaise(game, 12)');
assert.equal(ranks()[12], 5);
assert.match(run('stumpBox.graftRaiseReason(game, 12)'), /마지막 단계/);
assert.equal(points().spent, 15, '1 + 2 + 3 + 4 + 5');

// ── 효과: 다 자란 씨앗 · 수액 값과 부적 자신의 줄이 단계마다 +10% ─────────────────────────
run(`game.stumpBox.board = game.stumpBox.board.map(() => null); game.stumpBox.items = [];
    window.grown = (spec, cell) => { const item = stumpBox.createItem(game, spec); item.xp = stumpBox.need(item); item.ripe = true;
        if (!stumpBox.place(game, item.id, cell, spec.path)) throw new Error('place ' + cell); return item.id; };
    window.sap = grown({ family: 'sap', color: 'fire', roll: 1 }, 12);
    window.plain = grown({ family: 'sap', color: 'cold', roll: 1 }, 6);`);
const stats = json('stumpBox.evaluate(game).stats');
const graftPct = run('STUMP_BOX_GRAFT.pctPerRank');
assert.equal(graftPct, 10, 'graft +10% per rank (consolidation phase 9)');
assert.equal(stats.resF, 5 * (1 + 5 * graftPct / 100), 'amber 5 × (1 + 5 × 10%) on the rank 5 cell');
assert.equal(stats.resC, 5, 'an ungrafted cell gives the plain value');
run(`game.stumpBox.board[12] = null; game.stumpBox.board[18] = window.sap;`);
assert.equal(json('stumpBox.evaluate(game).stats').resF, 5, 'the graft stays on the cell, not the item');
run(`game.stumpBox.board[18] = null; game.contentProgression.inherited.push('talisman'); contentProgression.sync(game);
    window.charm = (() => { const item = stumpBox.addTalisman(game, { name: '시험 부적', rarity: 'magic', lines: [{ kind: 'stat', id: 'pctDmg', value: 10 }] }, true);
        item.xp = STUMP_BOX_GROWTH.need.talisman; item.ripe = true; if (!stumpBox.place(game, item.id, 8)) throw new Error('place 8'); return item.id; })();`);
assert.equal(json('talismanEffects.summarize(game).stats').pctDmg, 10);
run('game.stumpBox.board[8] = null; game.stumpBox.board[12] = window.charm;');
assert.ok(Math.abs(json('talismanEffects.summarize(game).stats').pctDmg - 10 * (1 + 5 * graftPct / 100)) < 1e-9, 'a talisman line × 1.5 on the rank 5 cell');
const before = run('getPlayerStats(false).dps');
run('game.currencies.blightSpore = 1; stumpBox.graftLower(game, 12);');
assert.ok(Math.abs(json('talismanEffects.summarize(game).stats').pctDmg - 10 * (1 + 4 * graftPct / 100)) < 1e-9);
assert.ok(run('getPlayerStats(false).dps') < before, 'the real damage follows the graft');

// ── 되돌리기: 마름병 포자 1개로 한 단계, 점수는 돌아온다 ─────────────────────────────────
assert.equal(ranks()[12], 4);
assert.equal(run('game.currencies.blightSpore'), 0);
assert.equal(points().spent, 10, 'the fifth rank returned its 5 points');
assert.match(run('stumpBox.graftLowerReason(game, 12)'), /마름병 포자가 1개/);
assert.equal(run('stumpBox.graftLower(game, 12)'), false);
assert.match(run('stumpBox.graftLowerReason(game, 0)'), /접붙이지 않은 칸/);

// ── 나무꾼 전투 중에는 바꾸지 않는다 ────────────────────────────────────────────
run('game.woodsmanBuildLock = true; game.currencies.blightSpore = 3;');
assert.match(run('stumpBox.graftRaiseReason(game, 0)'), /나무꾼/);
assert.equal(run('stumpBox.graftRaise(game, 0) || stumpBox.graftLower(game, 12)'), false);
assert.equal(ranks()[12], 4);
run('game.woodsmanBuildLock = false;');

// ── 영구 빌드 서명(장비 분석 캐시)과 판 계산 캐시는 단계를 본다 ──────────────────────────
const signature = run('getPersistentBuildSignature(game)');
run('stumpBox.graftRaise(game, 13);');
assert.notEqual(run('getPersistentBuildSignature(game)'), signature);

// ── 저장 경계: 왕복 그대로, 손상 값은 0~5 정수로, 쓴 점수가 번 점수를 넘으면 높은 단계부터 내린다 ─────────
const saved = run('JSON.stringify(game.stumpBox.graft)');
run('game = mergeDefaults(JSON.parse(serializeSaveState(game))); window.game = game;');
assert.equal(run('JSON.stringify(game.stumpBox.graft)'), saved, 'a save round trip keeps the ranks');
fresh({ season: 40, stumpBox: { acquired: true, items: [], board: [], graft: [9, -1, 'x', 2.7, null, 3] } });
assert.deepEqual(ranks().slice(0, 7), [5, 0, 0, 2, 0, 3, 0]);
assert.equal(ranks().length, 25);
fresh({ season: 19, stumpBox: { acquired: true, items: [], board: [], graft: [5, 5, 0, 0, 2] } });
assert.ok(points().spent <= points().earned, 'never more spent than earned');
assert.deepEqual(ranks().slice(0, 5), [2, 1, 0, 0, 1], 'loop 19 earns 6: the highest ranks give way first (later cells first among equals)');
fresh({ season: 12, stumpBox: { acquired: true, items: [], board: [] } });
assert.deepEqual(ranks(), Array(25).fill(0), 'older saves start with no graft');

// ── 화면: 칸 숫자, 빈 칸 고르기 → [접붙이기], 요약 점수, 한 번만 뜨는 안내 ─────────────────────
// The test document has no elements: hand the tab's parts (and its click listener) to the real renderer and read what it paints.
fresh({ season: 18, loopCount: 17, level: 90, stumpBox: { acquired: true, items: [], board: [], graft: [0, 0, 0, 0, 0, 0, 1] } });
run(`window.stumpNodes = {};
    window.stumpNode = id => stumpNodes[id] || (stumpNodes[id] = { id, innerHTML: '', addEventListener(type, fn) { this.onclick = fn; } });
    window.realGetById = document.getElementById;
    document.getElementById = id => id === 'tab-stump' || id.startsWith('stump-') ? stumpNode(id) : realGetById.call(document, id);
    window.stumpClick = data => stumpNode('tab-stump').onclick({ target: { closest: () => ({ dataset: data }) } });
    stumpBoxUi.refreshStumpTabNow();`);
const part = id => run(`stumpNode('${id}').innerHTML`);
assert.match(part('stump-box-board'), /접붙이기 1단계\(\+10%\)/, 'a grafted cell names its rank');
assert.match(part('stump-box-board'), /class="stump-graft-mark"[^>]*>1</);
assert.match(part('stump-box-summary'), /접붙이기 점수 2/);
assert.match(part('stump-box-detail'), /빈 칸을 누르면 그 칸을 접붙입니다/);
run("stumpClick({ stumpAction: 'cell', cell: '7' });");
assert.match(part('stump-box-detail'), /접붙이기 0\/5단계/, 'an empty cell can be picked for grafting');
assert.match(part('stump-box-board'), /class="stump-cell is-open is-selected"[^>]*data-cell="7"/);
run("stumpClick({ stumpAction: 'graft-raise', cell: '7' });");
assert.equal(ranks()[7], 1, 'the panel button grafts the picked cell');
assert.match(part('stump-box-detail'), /접붙이기 1\/5단계/);
assert.match(part('stump-box-detail'), /2단계에는 2점이 필요합니다/, 'a blocked raise says why');
run('document.getElementById = realGetById;');
run('checkUnlocks();');
assert.equal(run("tutorialQueue.filter(card => card.key === 'unlock_stump_graft').length"), 1, 'the graft notice is queued once');
run('checkUnlocks();');
assert.equal(run("tutorialQueue.filter(card => card.key === 'unlock_stump_graft').length"), 1);
console.log('smoke-stump-graft passed');
