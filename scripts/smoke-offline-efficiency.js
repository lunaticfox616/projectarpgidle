// 방치 효율 2(2026-10-08, data/offline-progress.js, docs/offline-performance.md): 잔재 강화 30%에서 50%, 잔재 밖 출처(고요한 시대,
// 무기 숙련 합계, 세계수 연대기)를 더하고 합은 75%까지. 빠른 계산은 이야기 액트도 맡고(각본 보스만 실제 전투), 투영을 못 탄 실제 전투는
// 30분에 밀어붙이기를 멈추고 1시간에 남은 시간을 계산하지 않는다(결과 창 한 줄).
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game = mergeDefaults({}); window.game = game;`);

// 1. 잔재 강화 표: 30%에서 50%, 비용은 그대로.
assert.deepEqual(json('OFFLINE_PROGRESS_EFFICIENCY_LEVELS.map(row => row.rate)'), [0.3, 0.33, 0.36, 0.4, 0.43, 0.46, 0.5]);
assert.deepEqual(json('OFFLINE_PROGRESS_EFFICIENCY_LEVELS.map(row => row.cost)'), [0, 2, 4, 7, 12, 20, 32]);
const base = json('getOfflineProgressConfig(game)');
assert.equal(base.efficiencyRate, 0.3);
assert.equal(base.baseEfficiencyRate, 0.3);
assert.deepEqual(base.efficiencySources, []);
assert.equal(base.effectiveLimitMs, 3 * 3600000 * 0.3, '3 hours count as 54 minutes');

// 2. 고요한 시대: 시대 특전 셋째 줄, 단계마다 +2%p, 정수 1 + 2 + 3.
assert.equal(run(`atlasEpoch.perks.get('calm').name`), '고요한 시대');
run('game.atlas.epoch.essence = 6;');
for (let step = 0; step < 3; step++) assert.equal(run(`atlasEpoch.buy(game, 'calm')`), '');
assert.match(run(`atlasEpoch.buy(game, 'calm')`), /가장 높은 단계/);
assert.equal(run('game.atlas.epoch.essence'), 0);
assert.ok(Math.abs(run('atlasEpoch.offline(game)') - 0.06) < 1e-9);
assert.deepEqual(json('atlasEpoch.normalize({ perks: { calm: 9 } }).perks'), { calm: 3 }, 'saved ranks cap at the perk max');
assert.match(run('atlasEpochUi.html()'), /고요한 시대 <span>3\/3<\/span>[\s\S]*?방치 효율 \+2%p \/ 단계/);

// 3. 출처를 더하고 상한 75%에서 멈춘다.
run(`game.offlineProgress.efficiencyLevel = 6; game.chronicle = { rings: 10 };
    game.weaponMastery = { xp: Object.fromEntries(weaponMastery.ids.map(id => [id, weaponMastery.reach(50)])) };`);
const full = json('getOfflineProgressConfig(game)');
assert.deepEqual(full.efficiencySources.map(row => [row.key, Math.round(row.rate * 100)]), [['epoch', 6], ['mastery', 6], ['chronicle', 10]]);
assert.equal(full.baseEfficiencyRate, 0.5);
assert.ok(Math.abs(full.efficiencyRate - 0.72) < 1e-9, 'everything maxed: 50 + 6 + 6 + 10 = 72%');
assert.ok(full.efficiencyRate <= run('OFFLINE_PROGRESS_EFFICIENCY_CAP'), 'under the 75% cap (the guard for sources added later)');
assert.equal(full.effectiveLimitMs, 3 * 3600000 * full.efficiencyRate);

// 4. 패널: 효율 내역, 한국어 사냥과 전리품 이름(영문 id가 보이지 않는다), 가운뎃점 없는 안내.
run(`game.offlineProgress.huntDirectiveUnlocked = true; game.offlineProgress.lootDirectiveUnlocked = true;`);
const panel = run('buildOfflineProgressHtml(getOfflineProgressView(game))');
assert.match(panel, /효율 <strong>\d+%<\/strong> = 잔재 강화 50% \+ 고요한 시대 6% \+ 무기 숙련 6% \+ 세계수 연대기 10%/);
assert.match(panel, />밀어붙이기</);
assert.match(panel, />보스 앞에서 멈춤</);
assert.match(panel, />희귀도</);
assert.doesNotMatch(panel, />(push|current|highestCleared|stopBeforeBoss|rarity|itemLevel|baseTier)</, 'no raw mode ids');
assert.match(panel, /누르면 회수, 우클릭하면 해체/);

// 5. 이야기 액트는 모두 specialType 'normal'이다. 빠른 계산은 각본 보스(forced_defeat, loop_gate)만 실제 전투로 남긴다
// (액트 정산이 실제로 투영되는지는 scripts/smoke-background-projection-acts.js).
assert.ok(run(`STORY_ACTS.every(act => act.specialType === 'normal')`), 'no scripted acts in the data today');

// 6. 투영을 못 탄 실제 전투: 30분에 밀어붙이기를 멈추고(반복), 1시간에 남은 시간을 자른다. 플레이어 설정은 정산 뒤 되돌린다.
const limits = json(`(() => {
    const snapshot = JSON.parse(JSON.stringify(game)); snapshot.settings.mapCompleteAction = 'nextZone';
    const replay = createCombatReplay(4 * 3600000, snapshot, 0);
    replayProjection.attachReplayProjection(replay);
    replay.processedMs = OFFLINE_PROJECTION.realHoldMs;
    replayProjection.advanceProjectedReplay(replay, 0);
    const held = { action: replay.game.settings.mapCompleteAction, held: replay.projection.held };
    replay.processedMs = OFFLINE_PROJECTION.realCapMs;
    const pending = replayProjection.advanceProjectedReplay(replay, 0);
    const result = finishCombatReplay(replay);
    return { held, pending, cutMs: result.cutMs, skippedMs: result.skippedMs, heldZone: result.heldZone, elapsed: replay.elapsedMs };
})()`);
assert.deepEqual(limits.held, { action: 'repeatZone', held: true }, 'a push repeats the zone it is in after 30 minutes of real combat');
assert.equal(limits.pending, false);
assert.equal(limits.cutMs, 3 * 3600000, 'the rest after one hour is cut');
assert.equal(limits.skippedMs, limits.cutMs);
assert.equal(limits.heldZone, true);
assert.equal(limits.elapsed, 3600000);
const lines = json(`formatBackgroundRealLimits({ heldZone: true, cutMs: 3 * 3600000 })`);
assert.equal(lines[0], '실제 전투가 30분을 넘어 그 뒤로는 지금 지역을 반복했습니다.');
assert.equal(lines[1], '빠른 계산을 못 하는 곳이라 실제 전투 60분까지만 계산했습니다(남은 3시간 0분은 보상 없음).');
console.log('offline efficiency smoke passed');
