// 방치 정산 가속(2026-10-07, js/combat-replay-projection.js): 앞부분 실제 전투로 지도 한 바퀴씩 속도를 잰 뒤 나머지를 투영한다.
// 사용자 조건: "처음 2분에 운 좋게 극도로 희귀한 재화/아이템을 먹었다고 나머지 부분에 모두 복제하는 건 금물".
// 같은 시드로 두 번 정산하고, 한 번은 실제 전투의 처치마다 황금률 5개를 난수 없이 더 준다. 투영한 부분이 1단계의 재화를 조금이라도
// 읽으면 두 결과가 달라진다. 같아야 하고, 황금률 차이는 정확히 실제 전투 처치 수 × 5여야 한다.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fixture = require('./lib/replay-fixture');

const build = fs.readFileSync('tests/fixtures/world-tree-atlas/crafted-t15-build.json', 'utf8');
const SETTLEMENT_MS = 10 * 60000;

async function settle(lucky) {
    const { runtime, run } = fixture(3);
    run(`game = mergeDefaults(${build}); window.game = game;
        game.combatHalted = false; game.pendingLoopHeroSelection = false; game.pendingLoopDecision = false; game.pendingLoopReady = false;
        game.heroSelectionInitialized = true; game.settings.pauseGameOnOverlay = false; game.settings.showDeathNotice = false;
        game.settings.mapCompleteAction = 'repeatZone'; game.currentZoneId = 29;
        game.seenTutorials = Array.from(new Set([...(game.seenTutorials || []), 'tutorial_battle_basics', 'tutorial_starter_gem_equip']));
        game.playerHp = getPlayerHpCap(getPlayerStats()); startEncounterRun();
        window.__kills = { real: 0, projected: 0 };
        const realDeath = handleEnemyDeath;
        handleEnemyDeath = function (enemy, pStats) {
            const before = game.loopKills;
            const out = realDeath(enemy, pStats);
            if (game.loopKills !== before && game.isBackgroundCalculation) {
                const phase = game.backgroundProjecting ? 'projected' : 'real';
                __kills[phase]++;
                if (${lucky} && phase === 'real') game.currencies.goldenRule = (game.currencies.goldenRule || 0) + 5;
            }
            return out;
        };`);
    const before = JSON.parse(run(`JSON.stringify({ gold: game.currencies.goldenRule || 0, time: game.combatTimeMs, active: game.records.currentLoop.activeMs || 0 })`));
    const result = await runtime.simulateBackgroundCombatChunked({ elapsedMs: SETTLEMENT_MS, snapshot: run('game'), startNowMs: 0, project: true });
    runtime.__result = result;
    const after = JSON.parse(run(`JSON.stringify({ gold: __result.game.currencies.goldenRule || 0, time: __result.game.combatTimeMs,
        active: __result.game.records.currentLoop.activeMs || 0, flags: Object.keys(__result.game).filter(key => /^background/.test(key)),
        level: __result.game.level, exp: __result.game.exp, kills: __kills })`));
    return { result, before, after };
}

(async () => {
    const plain = await settle(false), lucky = await settle(true);
    const { result } = plain;
    assert.equal(result.processedMs, SETTLEMENT_MS, 'the whole absence is settled');
    assert.equal(result.estimated, true, 'a long absence on a repeated map is projected');
    assert.ok(result.realMs >= 120000 && result.realMs < SETTLEMENT_MS, `real combat measures first: ${result.realMs} ms`);
    assert.equal(result.realMs + result.projectedMs, result.processedMs);
    assert.equal(plain.after.time - plain.before.time, SETTLEMENT_MS, 'the combat clock advances by the whole absence');
    assert.ok(Math.abs(plain.after.active - plain.before.active - SETTLEMENT_MS) <= 1000, 'the loop record counts the projected time');
    assert.deepEqual(plain.after.flags, [], 'no settlement flag is left in the save');
    const { real, projected } = plain.after.kills;
    assert.ok(real > 0 && projected > 0, `both parts kill: ${real} real, ${projected} projected`);
    const rate = (projected / result.projectedMs) / (real / result.realMs);
    assert.ok(rate > 0.5 && rate < 2, `the projection keeps the measured pace: ${rate.toFixed(2)}x`);

    assert.deepEqual([lucky.result.metrics.kills, lucky.result.projectedMs, lucky.after.level, lucky.after.exp],
        [result.metrics.kills, result.projectedMs, plain.after.level, plain.after.exp], 'luck in the real part changes nothing projected');
    assert.equal(lucky.after.gold - plain.after.gold, 5 * lucky.after.kills.real,
        'the extra golden rules are exactly the ones given in real combat: none were copied');
    console.log(`background projection: ${real} real kills in ${result.realMs / 1000} s, ${projected} projected in ${result.projectedMs / 1000} s, luck not copied`);
})().catch(error => { console.error(error); process.exit(1); });
