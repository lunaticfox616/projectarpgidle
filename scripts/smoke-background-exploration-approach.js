// 방치 정산 재생은 화면 프레임 없이 100 ms 틱만 돈다. 걸음이 틱 중간에 끝나도 그 순간 접근을 이어 가야 한다.
// 예전(2026-10-07 전)에는 막힌 칸을 사이에 둔 적과 거울처럼 한 칸씩 오가며, 제작 T15 혼돈 20에서 3분 동안 11~68마리만 잡고
// 100~170초씩 처치가 없었다. 고친 뒤 같은 상태로 144~154마리, 처치 없는 구간 10초 이하(시드 1~5).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fixture = require('./lib/replay-fixture');

const { runtime, run } = fixture(1);
const build = fs.readFileSync('tests/fixtures/world-tree-atlas/crafted-t15-build.json', 'utf8');
run(`game = mergeDefaults(${build}); window.game = game;
    game.combatHalted = false; game.pendingLoopHeroSelection = false; game.pendingLoopDecision = false; game.pendingLoopReady = false;
    game.heroSelectionInitialized = true; game.settings.pauseGameOnOverlay = false; game.settings.showDeathNotice = false;
    game.settings.mapCompleteAction = 'repeatZone'; game.currentZoneId = 29;
    game.seenTutorials = Array.from(new Set([...(game.seenTutorials || []), 'tutorial_battle_basics', 'tutorial_starter_gem_equip']));
    game.playerHp = getPlayerHpCap(getPlayerStats()); startEncounterRun();`);
assert.ok(run('!!actExplorationState.current(game)'), 'fixture: chaos 20 runs on an exploration map');

const total = 180000, replay = runtime.createCombatReplay(total, run('game'), 0);
let lastKills = 0, idleMs = 0, longestIdleMs = 0;
for (let at = 10000; at <= total; at += 10000) {
    const final = replay.elapsedMs;
    replay.elapsedMs = at;
    runtime.advanceCombatReplay(replay, 1e12);
    replay.elapsedMs = final;
    idleMs = replay.metrics.kills === lastKills ? idleMs + 10000 : 0;
    longestIdleMs = Math.max(longestIdleMs, idleMs);
    lastKills = replay.metrics.kills;
}
assert.equal(replay.processedMs, total, 'the replay runs the whole three minutes');
assert.ok(replay.metrics.kills >= 120, `kills keep coming: ${replay.metrics.kills} in 3 min`);
assert.ok(longestIdleMs < 40000, `no long stall: ${longestIdleMs / 1000} s without a kill`);
console.log(`background exploration approach: ${replay.metrics.kills} kills in 3 min, longest gap ${longestIdleMs / 1000} s`);
