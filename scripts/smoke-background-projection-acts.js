// 루프 초반 액트의 빠른 계산(방치 효율 2, 2026-10-08): 모든 이야기 액트가 specialType 'normal'인데 투영은 이를 각본 보스로 읽어, 액트
// 열 개의 정산이 끝까지 실제 전투였다(시작 전사 180분 정산 97초). 이제 액트도 투영하고, 레벨이 오를 때마다 다시 재서 빨리 크는 영웅의
// 속도를 따라간다(예전 예산 10분에 멈추면 54분 정산 처치가 실제의 66%였다).
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');

const SETTLEMENT_MS = 30 * 60000;

(async () => {
    const { runtime, run } = fixture(5);
    run(`game.settings.mapCompleteAction = 'repeatZone'; game.settings.showDeathNotice = false; startEncounterRun();`);
    const zone = JSON.parse(run(`JSON.stringify({ type: getZone(game.currentZoneId).type, act: getStoryActByZoneId(game.currentZoneId).specialType, level: game.level })`));
    assert.deepEqual(zone, { type: 'act', act: 'normal', level: 1 }, 'a fresh hero in act 1');
    const result = await runtime.simulateBackgroundCombatChunked({ elapsedMs: SETTLEMENT_MS, snapshot: run('game'), startNowMs: 0, project: true });
    assert.equal(result.processedMs, SETTLEMENT_MS);
    assert.ok(result.projectedMs > 0, 'the act is projected');
    assert.ok(result.realMs > run('OFFLINE_PROJECTION.realBudgetMs'), `a growing hero is measured at its level-ups past the old 10-minute budget (${result.realMs} ms)`);
    assert.ok(result.realMs < run('OFFLINE_PROJECTION.realHoldMs'), 'and stops by realHoldMs');
    assert.equal(result.heldZone, false);
    assert.equal(result.cutMs, 0);
    assert.ok(result.game.level > 10, `the hero grew (level ${result.game.level})`);
    console.log(`background projection acts: ${result.metrics.kills} kills, real ${Math.round(result.realMs / 60000)} min, projected ${Math.round(result.projectedMs / 60000)} min`);
})().catch(error => { console.error(error); process.exit(1); });
