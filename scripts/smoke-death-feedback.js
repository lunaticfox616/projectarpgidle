const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
vm.runInContext(`
    game = mergeDefaults({});
    game.level = 7; game.exp = 100;
    game.settings.showDeathNotice = false;
    game.playerHp = 0; game.playerES = 0;
    recordIncomingDamage('light', 90, '번개 정령', { sourceType: 'monster', sourceId: 1 });
    recordIncomingDamage('phys', 10, '측근의 기사', { sourceType: 'monster', sourceId: 2 });
    handlePlayerDefeat(getZone(0), getPlayerStats(), null,
        { fatalElement: 'phys', sourceName: '측근의 기사', noToast: true });
`, ctx);
const log = ctx.game.lastDeathLog;
assert.strictEqual(log.primaryElement, 'light', '주요 피해는 최근 누적량을 기준으로 유지한다.');
assert.strictEqual(log.fatalElement, 'phys', '마지막 피해가 더 작더라도 별도로 기록한다.');
assert.strictEqual(log.sourceName, '측근의 기사');
assert.strictEqual(log.expLost, 100 - ctx.game.exp);
assert.strictEqual(ctx.game.loopDeaths, 1);

const restored = ctx.mergeDefaults(JSON.parse(JSON.stringify(ctx.game)));
assert.strictEqual(restored.lastDeathLog.fatalElement, 'phys');
assert.strictEqual(restored.lastDeathLog.primaryElement, 'light');
assert.strictEqual(restored.lastDeathLog.sourceName, '측근의 기사');
assert.strictEqual(restored.exp, ctx.game.exp, '기록 복원 시 경험치 손실을 중복 적용하지 않는다.');

for (const missing of [undefined, null, '', 'unknown', 'constructor', {}, 1]) {
    const oldLog = { ...log, fatalElement: missing };
    const migrated = ctx.mergeDefaults({ lastDeathLog: oldLog }).lastDeathLog;
    assert.strictEqual(migrated.fatalElement, null, '기록이 없거나 손상된 마지막 피해는 추정하지 않는다.');
    assert.strictEqual(migrated.primaryElement, 'light');
    assert.strictEqual(oldLog.fatalElement, missing, '입력 저장 객체를 변경하지 않는다.');
}
console.log('smoke-death-feedback passed');
