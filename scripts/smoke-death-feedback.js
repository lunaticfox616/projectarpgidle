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
assert.strictEqual(ctx.isDeathAttrition(log), false, '마지막 3초에 몰린 피해는 소모전이 아니다');

// 소모전: 30초 동안 조금씩 깎이다 죽으면 사망 기록이 그 전투 전체의 피해를 담는다(피해가 8초 넘게 끊기기 전의 지난 전투는 뺀다).
// 마지막 3초 피해가 최대 생명의 절반에 못 미치면 피해 요약은 전투 전체를 보이고 한 줄로 알린다(플레이 리뷰 2026-10-07).
vm.runInContext(`
    game = mergeDefaults({});
    game.level = 7; game.exp = 100;
    game.settings.showDeathNotice = false;
    game.playerHp = 0; game.playerES = 0;
    game.combatTimeMs = 1000000;
    recordIncomingDamage('cold', 999, '지난 전투의 서리', { sourceType: 'monster', sourceId: 9 });
    game.combatTimeMs += 9000;
    for (let i = 0; i < 30; i++) {
        recordIncomingDamage('phys', 6, '썩은갈기의 잔뿌리', { sourceType: 'monster', sourceId: 3 });
        game.combatTimeMs += 1000;
    }
    recordIncomingDamage('fire', 4, '썩은갈기의 잔뿌리', { sourceType: 'monster', sourceId: 3 });
    handlePlayerDefeat(getZone(0), getPlayerStats(), null, { fatalElement: 'fire', sourceName: '썩은갈기의 잔뿌리', noToast: true });
`, ctx);
const attrition = ctx.game.lastDeathLog;
assert.strictEqual(attrition.fight.seconds, 30, '전투 전체 시간은 끊기지 않은 피해 구간이다');
assert.deepStrictEqual(JSON.parse(JSON.stringify(attrition.fight.damageSummary)), [{ ele: 'phys', value: 180 }, { ele: 'fire', value: 4 }],
    '전투 전체 피해는 지난 전투(8초 넘게 끊긴 뒤)를 빼고 센다');
assert.strictEqual(attrition.fight.monsterSummary[0].value, 184, '몬스터별 전투 전체 피해');
assert(attrition.maxLife > 44, '최대 생명을 함께 기록한다');
assert.strictEqual(ctx.isDeathAttrition(attrition), true, '마지막 3초 피해가 생명의 절반 미만이면 소모전이다');
assert.match(ctx.describeDeathAttrition(attrition), /^30초 동안 조금씩 깎였습니다\(마지막 3초 피해는 생명의 \d+%\)\.$/);
assert.strictEqual(ctx.getDeathLogScope(attrition).damageSummary, attrition.fight.damageSummary, '소모전이면 피해 요약은 전투 전체');
assert.strictEqual(vm.runInContext('deathFightLedger', ctx), null, '사망하면 전투 장부를 비워 다음 전투를 새로 센다');
const restoredFight = ctx.mergeDefaults(JSON.parse(JSON.stringify(ctx.game))).lastDeathLog;
assert.deepStrictEqual(JSON.parse(JSON.stringify(restoredFight.fight)), JSON.parse(JSON.stringify(attrition.fight)), '전투 전체 피해는 저장 뒤에도 남는다');
assert.strictEqual(restoredFight.maxLife, attrition.maxLife);

// 할 수 있는 일: 받지 않은 액트 보상, 남은 스킬트리 포인트, 빈 무기 칸.
vm.runInContext(`game.claimableActRewards = [0]; game.claimedActRewards = []; game.passivePoints = 3; game.equipment['무기'] = null;`, ctx);
assert.deepStrictEqual(JSON.parse(vm.runInContext('JSON.stringify(getDeathHints())', ctx)), [{ text: '받지 않은 액트 보상 1개', reward: 0 },
    { text: '쓰지 않은 스킬트리 포인트 3점' }, { text: '무기 칸이 비어 있습니다' }], '받지 않은 액트 보상 줄에는 바로 여는 단추가 붙는다');
console.log('smoke-death-feedback passed');
