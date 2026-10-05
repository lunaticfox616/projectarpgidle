// 심화 패시브 = 나무꾼까지의 사다리(2026-10-04, data/maps.js LOOP_DEEP_STATS): 혼돈 21층 이상 · 미궁 · 특수 보스 · 나무꾼 부분 피해가 주는
// 심화 포인트로 루프를 넘어 남는 능력치를 산다. 예전 생명력 +10 · 피해 +2는 루프 10 캐릭터에게 보이지 않아, 생명력 %, 곱연산 피해,
// 카오스 저항으로 바꿨다. 실제 구매(allocateLoopDeepStat)와 능력치 계산(getPlayerStats), 저장 경계(mergeDefaults)로 확인한다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

run(`game = mergeDefaults({ level: 70, heroSelectionInitialized: true, selectedClassId: 'warrior' }); game.season = 10; game.loopCount = 9;
    game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(def => def.id); contentProgression.sync(game);
    game.skills = ['기본 공격', '유성 낙화']; game.gemData['유성 낙화'] = { level: 16, exp: 0 }; game.activeSkill = '유성 낙화';
    window.snap = () => { const s = getPlayerStats(); return { dps: s.dps, hp: s.maxHp, chaos: s.resChaos }; };`);
assert.deepEqual(json('Object.keys(mergeDefaults({}).loopDeepStats)'), json('LOOP_DEEP_STATS.map(def => def.key)'), 'a new save has every deep line at 0');

const before = json('snap()');
run(`game.loopDeepPoints = 6; ['flatDmg', 'flatDmg', 'flatDmg'].forEach(key => allocateLoopDeepStat(key));`);
const damage = json('snap()');
assert.equal(json('game.loopDeepPoints'), 2, 'three damage levels cost 1 + 1 + 2');
assert.ok(Math.abs(damage.dps / before.dps - 1.09) < 0.002, `three levels multiply damage by 1.09 (${(damage.dps / before.dps).toFixed(4)})`);

run(`allocateLoopDeepStat('resChaos');`);
assert.equal(json('snap()').chaos, before.chaos + 3, 'a chaos resistance level adds 3');
run(`allocateLoopDeepStat('flatHp');`);
assert.ok(json('snap()').hp > before.hp * 1.02, 'a life level is a share of life, not +10');

const spent = json('game.loopDeepPoints');
run(`allocateLoopDeepStat('nonsense'); allocateLoopDeepStat('flatHp');`);
assert.equal(json('game.loopDeepPoints'), spent, 'an unknown line or missing points buy nothing');
assert.equal(json("'nonsense' in game.loopDeepStats"), false);

const loaded = json(`mergeDefaults({ loopDeepStats: { flatHp: 'x', flatDmg: -2, aspd: 1.7, crit: 4 } }).loopDeepStats`);
assert.deepEqual(loaded, { flatHp: 0, flatDmg: 0, resChaos: 0, aspd: 1, move: 0, dr: 0, crit: 4 }, 'corrupt levels load as whole non-negative counts, the new line at 0');
assert.deepEqual(json(`mergeDefaults(JSON.parse(JSON.stringify(mergeDefaults({ loopDeepStats: { crit: 4 } })))).loopDeepStats.crit`), 4, 'loading twice keeps the levels');
console.log('loop deep ladder: life %, multiplicative damage, chaos resistance; validated purchase and saves: OK');
