// 혼돈 깊이 보스의 피해 속성(2026-10-04): 무작위였던 보스 속성이 혼돈 20 클리어를 빌드보다 더 크게 갈랐다(카오스 저항이 낮은 빌드는
// 카오스 보스를 만나면 죽었다). 이제 깊이마다 주 속성과 보조 속성이 정해져 있고(혼돈 20 = 화염 + 냉기), 지도 권장 전투력도 그 두
// 저항으로 판단한다. 일반 몬스터와 다른 지역의 보스는 그대로 무작위다. 난수는 실제 Math.random(경계)로 여러 번 굴린다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

run('game = mergeDefaults({}); game.season = 10; game.loopCount = 9;');
const draws = (zoneCode, marker) => json(`(() => { const zone = ${zoneCode}, seen = new Set();
    for (let i = 0; i < 60; i++) { const e = createEnemy(zone, ${marker}, 0); seen.add(e.ele + '+' + e.hybridElement); }
    return [...seen]; })()`);

const boss = depth => draws(`getZone(getAbyssZoneIdForDepth(${depth}))`, '{ at: 20, count: 1, boss: true }');
assert.deepEqual(boss(20), ['fire+cold'], 'the chaos 20 boss always strikes with fire and adds cold');
assert.deepEqual(boss(19), ['chaos+fire']);
assert.deepEqual(boss(10), ['light+chaos']);
const estimate = json('estimateMapZonePowerRequirements(getZone(getAbyssZoneIdForDepth(20))).elements');
assert.deepEqual(estimate, ['fire', 'cold'], 'the map estimate judges the two resistances that boss uses');

const followers = draws('getZone(getAbyssZoneIdForDepth(20))', '{ at: 20, count: 1 }').map(row => row.split('+')[0]);
assert.ok(new Set(followers).size > 1, 'ordinary chaos monsters still vary');
const actBoss = draws('getZone(9)', '{ at: 20, count: 1, boss: true }');
assert.ok(actBoss.length > 1, 'bosses outside chaos depths keep their random element');
console.log('chaos boss element: fixed per depth (chaos 20 fire + cold), named by the map estimate, others random: OK');
