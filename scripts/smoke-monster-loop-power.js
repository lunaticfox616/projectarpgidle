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

// 곡선: 점 위의 값, 점 사이 직선, 앞뒤는 끝 값.
close(run(`interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE.hp, 1)`), 1, 'loop 1 keeps monsters as they were');
close(run(`interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE.hp, 2)`), 0.975, 'between loops 1 and 3');
close(run(`interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE.hp, 7)`), 0.8, 'star wedges opened at loop 7');
close(run(`interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE.hp, 80)`), 0.62, 'after the last point');
close(run(`interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE.damage, 100)`), 0.6, 'damage at loop 100');
close(run(`interpolateLoopCurve([], 10)`), 1, 'no curve, no change');

// 액트 지역은 액트 루프 상한을 따르고, 생명력 · 피해 · 권장 전투력이 같은 배율을 쓴다.
const actual = JSON.parse(run(`(() => {
    game.season = 26; game.loopCount = 25;
    const zone = getZone(9);
    const scale = { hp: getMonsterLoopPowerScale(zone, 'hp'), damage: getMonsterLoopPowerScale(zone, 'damage') };
    const real = { hp: createEnemy(zone, { at: 25 }, 0).maxHp, hit: getMonsterBaseHitDamage(zone, 1, 0.5, null), estimate: estimateMapZonePowerRequirements(zone) };
    const keep = getMonsterLoopPowerScale;
    getMonsterLoopPowerScale = () => 1;
    const raw = { hp: createEnemy(zone, { at: 25 }, 0).maxHp, hit: getMonsterBaseHitDamage(zone, 1, 0.5, null), estimate: estimateMapZonePowerRequirements(zone) };
    getMonsterLoopPowerScale = keep;
    return JSON.stringify({ scale, inputs: getLoopDifficultyInputs(zone), cap: ACT_LOOP_SCALE_CAP, real, raw });
})()`));
assert.equal(actual.inputs.seasonLoops, Math.min(actual.cap, 25), 'acts use the act loop cap');
close(actual.scale.hp, run(`interpolateLoopCurve(MONSTER_LOOP_POWER_SCALE.hp, ${actual.inputs.seasonLoops + 1})`), 'act zone life scale');
assert.ok(actual.scale.hp < 1 && actual.scale.damage < 1, 'a loop 26 act is softened');
assert.ok(Math.abs(actual.real.hp / actual.raw.hp - actual.scale.hp) < 0.01, 'monster life follows the curve');
assert.ok(Math.abs(actual.real.hit / actual.raw.hit - actual.scale.damage) < 0.05, 'monster damage follows the curve');
assert.ok(actual.raw.estimate && actual.real.estimate, 'the act zone has a readiness estimate');
assert.ok(JSON.stringify(actual.real.estimate) !== JSON.stringify(actual.raw.estimate), 'the readiness estimate uses the same curve');

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

// 루프당 성장(2026-10-04 소폭 하향, MONSTER_LOOP_GROWTH): 혼돈 20 · 루프 10은 생명력 약 7%, 피해 약 4% 낮다. 나무꾼(루프를 타지 않음)과
// 우주계(예전 성장 그대로)는 바뀌지 않는다.
const growth = JSON.parse(run(`(() => {
    game.season = 10; game.loopCount = 9;
    const chaos = getZone(getAbyssZoneIdForDepth(20)), depth = getSoftenedLoopDepth(9);
    const lowered = getMonsterLoopGrowthScale(chaos, 'hp', depth, 1), oldHp = 1 + depth * (MONSTER_LOOP_GROWTH.fixed.hp.base + MONSTER_LOOP_GROWTH.fixed.hp.tier);
    const dmg = getMonsterLoopGrowthScale(chaos, 'damage', depth, 1), oldDmg = 1 + depth * (MONSTER_LOOP_GROWTH.fixed.damage.base + MONSTER_LOOP_GROWTH.fixed.damage.tier);
    const woodsman = getZone(OUTSIDE_CHAOS_ZONE_ID);
    return JSON.stringify({ hpRatio: lowered / oldHp, dmgRatio: dmg / oldDmg, woodsmanLoopInputs: getLoopDifficultyInputs(woodsman),
        cosmos: getMonsterLoopGrowthScale({ type: 'cosmos' }, 'hp', 29, 1) === 1 + 29 * (MONSTER_LOOP_GROWTH.fixed.hp.base + MONSTER_LOOP_GROWTH.fixed.hp.tier) });
})()`));
assert.ok(growth.hpRatio > 0.9 && growth.hpRatio < 0.95, `chaos 20 at loop 10: life about 7% lower (${growth.hpRatio.toFixed(3)})`);
assert.ok(growth.dmgRatio > 0.94 && growth.dmgRatio < 0.97, `chaos 20 at loop 10: damage about 4% lower (${growth.dmgRatio.toFixed(3)})`);
assert.deepEqual([growth.woodsmanLoopInputs.seasonLoops, growth.woodsmanLoopInputs.loopCount], [0, 0], 'the woodsman takes no loop growth');
assert.equal(growth.cosmos, true, 'cosmos keeps the growth it was tuned on');

console.log('monster loop power curve, life, damage, readiness, exempt and atlas loops, transcendent ranges, lowered loop growth: OK');
