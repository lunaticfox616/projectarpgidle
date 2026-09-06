const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
const zone = context.getZone(0);
const state = context.mergeDefaults({ season: 31, loopCount: 30, currentZoneId: 0 });
context.__wandererGame = state;
run('game = __wandererGame; __originalRandom = Math.random; Math.random = () => 0.999;');
context.__plainElite = context.createEnemy(zone, { elite: true, at: 40 }, 0);
run('Math.random = __originalRandom;');
assert.strictEqual(context.__plainElite.isSeveredWanderer, undefined,
    '실패 굴림의 적은 기존 정예로 남아야 한다');

let randomState = 17;
const seededRng = () => {
    randomState = (randomState * 48271) % 2147483647;
    return randomState / 2147483647;
};

for (let sample = 0; sample < 64; sample++) {
    const baseline = JSON.parse(JSON.stringify(context.__plainElite));
    const before = {
        hp: baseline.maxHp, damage: baseline.damageMul,
        speed: baseline.attackSpeedVar, drop: baseline.dropMul
    };
    const wanderer = context.applySeveredWandererLoadout(baseline,
        context.buildSeveredWandererLoadout(zone, seededRng));
    assert.strictEqual(wanderer.isSeveredWanderer, true);
    assert.ok(wanderer.maxHp >= before.hp * 1.7 && wanderer.maxHp <= before.hp * 1.9,
        '방랑자는 정예보다 단단하되 체력 상한을 넘으면 안 된다');
    assert.ok(wanderer.damageMul >= before.damage * 1.15 && wanderer.damageMul <= before.damage * 1.42,
        '방랑자는 정예보다 강하되 순간 피해 상한을 넘으면 안 된다');
    assert.ok(wanderer.attackSpeedVar <= before.speed * 1.3,
        '장비와 스킬 조합이 공격 속도 상한을 넘으면 안 된다');
    assert.ok(wanderer.damageMul * wanderer.attackSpeedVar > before.damage * before.speed,
        '단절된 방랑자의 기본 공격 위협도는 같은 정예보다 높아야 한다');
    assert.ok(wanderer.maxEnergyShield <= wanderer.maxHp * 0.28,
        '에너지 보호막이 제한된 체력 예산을 넘어가면 안 된다');
    assert.ok(['resF', 'resC', 'resL', 'resChaos'].every(key => wanderer[key] <= 78),
        '저항은 대응 불가능한 수준까지 오르면 안 된다');
    assert.ok(wanderer.dropMul > before.drop, '추가 위험에는 추가 드랍 보상이 있어야 한다');
    assert.ok(context.SKILL_DB[wanderer.wandererLoadout.skillName],
        '실제 플레이어 스킬 젬 정의에서 공격을 골라야 한다');
    assert.strictEqual(wanderer.wandererLoadout.equipment.length, 5,
        '무기와 방어구 네 부위를 장착해야 한다');
}

const lockedState = context.mergeDefaults({ season: 30, loopCount: 29 });
context.__lockedWandererGame = lockedState;
run('game = __lockedWandererGame;');
const lockedEnemy = { isElite: true };
assert.strictEqual(context.maybeApplySeveredWanderer(lockedEnemy, zone, true, false, () => 0), lockedEnemy,
    '30루프까지 단절된 방랑자가 등장하면 안 된다');
assert.strictEqual(lockedEnemy.isSeveredWanderer, undefined);

state.season = 31;
run('game = __wandererGame;');
const rolled = JSON.parse(JSON.stringify(context.__plainElite));
assert.strictEqual(context.maybeApplySeveredWanderer(rolled, zone, true, false, () => 0).isSeveredWanderer, true,
    '31루프부터 적격 정예가 낮은 확률로 방랑자로 교체되어야 한다');
assert.strictEqual(context.getEnemyCombatDelivery(rolled), rolled.wandererDelivery,
    '방랑자 스킬의 실제 공격 전달 방식을 전투가 사용해야 한다');

console.log('smoke-severed-wanderers passed');
