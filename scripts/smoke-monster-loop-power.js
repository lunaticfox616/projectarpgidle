// 보조 콘텐츠 통합 9단계(2026-10-02): 빠진 힘의 나머지를 몬스터 쪽에서 맞추는 루프 배율(data/maps.js MONSTER_LOOP_POWER_SCALE).
// 곡선 보간, 실제 몬스터 생명력 · 피해와 권장 전투력 표시가 같은 배율을 쓰는지, 루프를 타지 않는 지역은 플레이어의 루프를,
// 아틀라스 지도는 등급이 정한 루프를 쓰는지, 범위를 올린 초월 공허 값이 불러올 때 새 범위로 맞춰지는지 본다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = source => vm.runInContext(source, runtime);
run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior'});window.game=game;Math.random=()=>0.99;`);
const close = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual} vs ${expected}`);

// 곡선: 점 위의 값, 점 사이 직선, 앞뒤는 끝 값. 피해와 루프를 타지 않는 지역의 생명력은 보정 곡선(MONSTER_LOOP_POWER_SCALE)을 쓴다.
close(run(`interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE.hp, 2)`), 0.975, 'between loops 1 and 3');
close(run(`interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE.damage, 100)`), 0.6, 'damage at loop 100');
close(run(`interpolateLoopCurve([], 10)`), 1, 'no curve, no change');

// 생명력 루프 배율(2026-10-06 재조율, MONSTER_LOOP_HP_CURVE): 루프 1은 그대로, 지역 단계와 무관한 한 곡선이라 같은 루프면 어느 지역이든
// 같은 비율로 세진다. 액트는 상한(루프 21) 뒤로 고정, 혼돈은 층마다 2루프씩 지금 루프까지 따라붙는다.
const life = JSON.parse(run(`(() => {
    const hp = (id, season) => { game.season = season; game.loopCount = season - 1; return createEnemy(getZone(id), { at: 0, count: 1 }, 0).maxHp; };
    const chaos1 = getAbyssZoneIdForDepth(1), chaos5 = getAbyssZoneIdForDepth(5);
    const lastAct = Object.keys(MAP_ZONES).map(Number).filter(id => MAP_ZONES[id] && MAP_ZONES[id].type === 'act').sort((a, b) => a - b).pop();
    const rows = {};
    for (const season of [1, 10, 21, 30, 41]) rows[season] = { act3: hp(2, season), act10: hp(lastAct, season), chaos1: hp(chaos1, season), chaos5: hp(chaos5, season) };
    game.season = 30; game.loopCount = 29;
    return JSON.stringify({ rows, curve10: interpolateLoopCurve(MONSTER_LOOP_HP_CURVE, 10), curve21: interpolateLoopCurve(MONSTER_LOOP_HP_CURVE, 21),
        curve23: interpolateLoopCurve(MONSTER_LOOP_HP_CURVE, 23), curve30: interpolateLoopCurve(MONSTER_LOOP_HP_CURVE, 30),
        chaos1Loops: getLoopDifficultyInputs(getZone(chaos1)).seasonLoops, chaos5Loops: getLoopDifficultyInputs(getZone(chaos5)).seasonLoops,
        chaosDepthHp: getChaosDepthScales(5).hpMul, chaosDepthTaken: getChaosDepthScales(5).playerTakenMul });
})()`));
const near = (actual, expected, tolerance, label) => assert.ok(Math.abs(actual / expected - 1) < tolerance, `${label}: ${actual} vs ${expected}`);
const { rows } = life;
near(rows[10].act3 / rows[1].act3, life.curve10, 0.02, 'loop 10 act life follows the curve');
near(rows[10].act3 / rows[1].act3, rows[10].act10 / rows[1].act10, 0.02, 'the loop share is the same at every zone level');
near(rows[41].act10 / rows[1].act10, life.curve21, 0.02, 'acts stop at their loop cap');
assert.ok(rows[30].chaos1 / rows[1].chaos1 < 7, `chaos 1 at loop 30 is at most a few times loop 1 (was 27x): ${(rows[30].chaos1 / rows[1].chaos1).toFixed(2)}`);
for (const season of [1, 10, 21, 30, 41]) {
    const step = rows[season].chaos1 / rows[season].act10;
    assert.ok(step > 1.6 && step < 2.1, `act 10 -> chaos 1 stays one step at loop ${season}: ${step.toFixed(2)}x`);
}
assert.equal(life.chaos1Loops, 22, 'chaos 1 counts the act cap + 2 loops');
assert.equal(life.chaos5Loops, 29, 'chaos 5 at loop 30 already takes the full loop');
near(rows[30].chaos1 / rows[1].chaos1, life.curve23, 0.02, 'chaos 1 at loop 30 uses loop 23 of the curve');
assert.equal(life.chaosDepthHp, 1, 'chaos depths 1-20 carry no extra loop-only life');
assert.equal(life.chaosDepthTaken, 1, 'nor extra loop-only damage taken');

// 권장 전투력도 같은 생명력 배율을 쓴다.
const readiness = JSON.parse(run(`(() => {
    const zone = getAbyssZoneIdForDepth(10), dps = season => { game.season = season; game.loopCount = season - 1; return estimateMapZonePowerRequirements(getZone(zone)).dps; };
    const hp = season => { game.season = season; game.loopCount = season - 1; return createEnemy(getZone(zone), { at: 0, count: 1 }, 0).maxHp; };
    return JSON.stringify({ dps: dps(30) / dps(1), hp: hp(30) / hp(1) });
})()`));
near(readiness.dps, readiness.hp, 0.05, 'the readiness estimate grows with the same life multiplier');

// 권장 EHP도 한 계단(2026-10-06): 2.5초 안의 이어지는 타격을 정수로 세면 루프 20부터 액트 10(초당 0.757)은 0대, 혼돈 1(0.804)은 1대라
// 타격은 1.2배인데 권장 EHP가 1.8배로 보였다. 연속값으로 세면 모든 루프에서 한 계단이다.
const ehpSteps = JSON.parse(run(`(() => {
    const lastAct = Object.keys(MAP_ZONES).map(Number).filter(id => MAP_ZONES[id] && MAP_ZONES[id].type === 'act').sort((a, b) => a - b).pop();
    const chaos1 = getAbyssZoneIdForDepth(1);
    const ehp = (id, season) => { game.season = season; game.loopCount = season - 1; return estimateMapZonePowerRequirements(getZone(id)).ehp; };
    return JSON.stringify([1, 10, 21, 30, 41].map(season => ({ season, step: ehp(chaos1, season) / ehp(lastAct, season) })));
})()`));
for (const { season, step } of ehpSteps) assert.ok(step > 1.1 && step < 1.45, `recommended EHP act 10 -> chaos 1 stays one step at loop ${season}: ${step.toFixed(2)}x`);

// 정예 생명력의 루프 몫은 +0.3까지(우주계 사다리는 예전 그대로). 아틀라스 무리 권장 전투력도 전투와 같은 함수를 쓴다.
const elite = JSON.parse(run(`JSON.stringify({ atlas: getEliteLoopHpMultiplier({ type: 'atlasMap' }, 29), act: getEliteLoopHpMultiplier(getZone(2), 3),
    cosmos: getEliteLoopHpMultiplier({ type: 'cosmos' }, 29) })`));
close(elite.atlas, 1.7, 'elite loop share capped at +0.3');
assert.ok(elite.act > 1.4 && elite.act < 1.7, `an early loop keeps its smaller share: ${elite.act}`);
assert.ok(elite.cosmos > 1.7, 'cosmos keeps its ladder');
assert.match(require('node:fs').readFileSync('js/combat.js', 'utf8'), /function getAtlasPackReadiness[\s\S]*?hp:getEliteLoopHpMultiplier\(zone, loops\.loopCount\)/,
    'the atlas pack estimate uses the elite share combat uses');

// 루프를 타지 않는 지역(시련)은 플레이어의 루프, 아틀라스 지도는 등급이 정한 루프.
const scales = JSON.parse(run(`(() => {
    game.season = 40;
    const trial = { ...TRIAL_ZONES[0] };
    const atlasMap = { type: 'atlasMap', tier: 10, fixedSeason: 25, id: 'qa_atlas' };
    return JSON.stringify({ trial: getMonsterLoopPowerScale(trial, 'hp'), atlas: getMonsterLoopPowerScale(atlasMap, 'hp'),
        expectTrial: interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE.hp, 40), expectAtlas: interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE.hp, 25) });
})()`));
close(scales.trial, scales.expectTrial, 'exempt zones use the player loop');
close(scales.atlas, scales.expectAtlas, 'atlas maps use their fixed loop');

// 초월 공허: 범위를 올린 옵션은 불러올 때 새 범위로 맞춘다(낮은 값은 최솟값으로, 범위 안은 그대로).
const transcendent = JSON.parse(run(`JSON.stringify([
    normalizeTranscendentVoidPassive({ id: 'asteroidBelt', value: 1.2 }),
    normalizeTranscendentVoidPassive({ id: 'zeroGravity', value: 24 }),
    normalizeTranscendentVoidPassive({ id: 'supernova', value: 30 }),
    normalizeTranscendentVoidPassive({ id: 'comet', value: 24 })
])`));
assert.deepEqual(transcendent.map(row => row.value), [2, 24, 50, 24]);
assert.equal(run('STUMP_BOX_GRAFT.pctPerRank'), 10, 'graft +10% per rank');

// 피해의 루프당 성장(2026-10-04 소폭 하향, MONSTER_LOOP_GROWTH): 혼돈 20 · 루프 10은 피해 약 4% 낮다. 나무꾼(루프를 타지 않음)과
// 우주계(예전 생명력 성장 그대로)는 바뀌지 않는다.
const growth = JSON.parse(run(`(() => {
    game.season = 10; game.loopCount = 9;
    const chaos = getZone(getAbyssZoneIdForDepth(20)), depth = getSoftenedLoopDepth(9);
    const dmg = getMonsterLoopGrowthScale(chaos, 'damage', depth, 1), oldDmg = 1 + depth * (MONSTER_LOOP_GROWTH.fixed.damage.base + MONSTER_LOOP_GROWTH.fixed.damage.tier);
    const woodsman = getZone(OUTSIDE_CHAOS_ZONE_ID);
    return JSON.stringify({ dmgRatio: dmg / oldDmg, woodsmanLoopInputs: getLoopDifficultyInputs(woodsman),
        cosmos: getMonsterLoopGrowthScale({ type: 'cosmos' }, 'hp', 29, 1) === 1 + 29 * (MONSTER_LOOP_GROWTH.fixed.hp.base + MONSTER_LOOP_GROWTH.fixed.hp.tier) });
})()`));
assert.ok(growth.dmgRatio > 0.94 && growth.dmgRatio < 0.97, `chaos 20 at loop 10: damage about 4% lower (${growth.dmgRatio.toFixed(3)})`);
assert.deepEqual([growth.woodsmanLoopInputs.seasonLoops, growth.woodsmanLoopInputs.loopCount], [0, 0], 'the woodsman takes no loop growth');
assert.equal(growth.cosmos, true, 'cosmos keeps the growth it was tuned on');

console.log('monster loop life curve (level-consistent, act cap, chaos ramp), damage curve, readiness and recommended EHP steps, elite share, exempt and atlas loops, transcendent ranges, damage growth: OK');
