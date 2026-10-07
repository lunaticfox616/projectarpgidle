// 세계수 연대기(2026-10-08, data/chronicle.js, js/chronicle.js): 장마다 저장 상태에서 수를 세고, 무게를 곱한 완성도가 10% 오를 때마다
// 나이테가 감긴다. 감긴 나이테는 저장되어 수집이 줄어도 풀리지 않고, 나이테마다 방치 효율 +1%p.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game = mergeDefaults({}); window.game = game;
    window.__events = []; dispatchRuntimeEvent = (name, detail) => { window.__events.push({ name, detail }); return false; };`);

// 1. 새 저장: 장 열한 개, 나이테 0, 방치 효율 출처 없음.
const empty = json('chronicle.completion(game)');
assert.equal(empty.rows.length, 11);
assert.deepEqual(empty.rows.map(row => row.id), ['codex', 'mastery', 'talismans', 'journal', 'depth', 'loops', 'harvest', 'fishing', 'variants', 'memory', 'epochs']);
assert.equal(empty.earned, 0);
assert.deepEqual(json('chronicle.check(game)'), []);
assert.equal(run(`getOfflineEfficiencySources(game).some(row => row.key === 'chronicle')`), false);
const goals = Object.fromEntries(empty.rows.map(row => [row.id, row.goal]));
assert.equal(goals.codex, run('UNIQUE_CODEX_KEYS.size'));
assert.equal(goals.mastery, 300);
assert.equal(goals.harvest, 12);
assert.equal(goals.fishing, run('Object.keys(OCEAN_FISH_DB).length'));
assert.equal(goals.journal, run('JOURNAL_ENTRY_ORDER.length'));
assert.deepEqual([goals.depth, goals.loops, goals.memory, goals.epochs], [80, 100, 5, 5]);

// 2. 수집을 채우면 장마다 센다: 도감 절반, 일지 전부, 혼돈 깊이 60(40/80), 완료 루프 50.
run(`[...UNIQUE_CODEX_KEYS].slice(0, Math.floor(UNIQUE_CODEX_KEYS.size / 2)).forEach(key => { game.uniqueCodex[key] = true; });
    game.journalEntries = JOURNAL_ENTRY_ORDER.slice();
    game.records.best.abyssDepth = 60;
    game.season = 51; game.loopCount = 50;`);
const half = json('chronicle.completion(game)');
const share = id => half.rows.find(row => row.id === id).share;
assert.ok(Math.abs(share('codex') - 0.5) < 0.01);
assert.equal(share('journal'), 1);
assert.equal(share('depth'), 0.5);
assert.equal(share('loops'), run('getOfflineCompletedLoopCount(game)') / 100);
const expected = Math.floor(half.share * 10 + 1e-9);
assert.ok(expected >= 2, `a mid-game account winds a few rings (${expected})`);

// 3. 확인하면 나이테가 감기고 이벤트가 한 번 나간다. 같은 상태로 다시 확인하면 아무 일도 없다.
assert.deepEqual(json('chronicle.check(game)'), Array.from({ length: expected }, (_, index) => index + 1));
assert.equal(run('game.chronicle.rings'), expected);
assert.deepEqual(json(`window.__events.map(row => row.name)`), ['chronicle-ring']);
assert.deepEqual(json('chronicle.check(game)'), []);
assert.equal(run('chronicle.offline(game)'), expected * 0.01);
assert.deepEqual(json(`getOfflineEfficiencySources(game).find(row => row.key === 'chronicle')`), { key: 'chronicle', label: '세계수 연대기', rate: expected * 0.01 });

// 4. 감긴 나이테는 풀리지 않는다(도감 정보가 지워져도), 망가진 값은 0~10으로 읽는다.
run('game.uniqueCodex = {}; game.journalEntries = [];');
assert.deepEqual(json('chronicle.check(game)'), []);
assert.equal(run('chronicle.rings(game)'), expected, 'rings never unwind');
run('game.chronicle = { rings: 99 };');
assert.equal(run('chronicle.rings(game)'), 10);
run(`game.chronicle = { rings: 'x' };`);
assert.equal(run('chronicle.rings(game)'), 0);
run('game.chronicle = null;');
assert.equal(run('chronicle.rings(game)'), 0);

// 5. 루프를 넘어 남는다.
run(`game.chronicle = { rings: 4 }; game.season = 3; triggerSeasonReset();`);
assert.equal(run('chronicle.rings(game)'), 4, 'the loop reset keeps the chronicle');

// 6. 화면: 기록 창 칸(나이테 그림, 장마다 진행).
const html = run('chronicleUi.sectionHtml()');
assert.match(html, /세계수 연대기/);
assert.match(html, /나이테 \d+\/10/);
assert.match(html, /chronicle-rings/);
assert.match(html, /고유 도감/);
console.log('chronicle smoke passed');
