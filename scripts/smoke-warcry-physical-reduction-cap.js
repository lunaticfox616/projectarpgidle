const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();

function getDelta(name, type = 'warcry') {
    runtime.__conditionName = name;
    runtime.__conditionType = type;
    return vm.runInContext('getConditionGemStatDelta(__conditionName, __conditionType)', runtime);
}

function applyEffects(stats, effects) {
    runtime.__stats = stats;
    runtime.__effects = effects;
    return vm.runInContext('applyConditionPhysicalReductionEffects(__stats, __effects)', runtime);
}

vm.runInContext("game.conditionGemLevels = {'전장의 함성':5, '빙하의 포효':5, '결전 신호':5, '철의 맹세':5};", runtime);

const battleCry = getDelta('전장의 함성');
const glacierCry = getDelta('빙하의 포효');
assert.strictEqual(battleCry.dr, 9, '전장의 함성 Lv.5의 물리 피해 감소는 기존 강화량을 유지해야 한다');
assert.strictEqual(glacierCry.dr, 12, '빙하의 포효 Lv.5의 물리 피해 감소는 기존 강화량을 유지해야 한다');
assert.strictEqual(battleCry.drCapBonus, 3, '함성의 물리 피해 감소 최대치 증가는 Lv.5에서도 +3%여야 한다');
assert.strictEqual(glacierCry.drCapBonus, 3, '서로 다른 방어 함성도 동일한 +3% 최대치 계약을 써야 한다');

const stackedWarcryStats = { dr: 75, rawDr: 100 };
const stackedWarcryCap = applyEffects(stackedWarcryStats, [
    { buff: { type: 'warcry' }, delta: battleCry },
    { buff: { type: 'warcry' }, delta: glacierCry }
]);
assert.strictEqual(stackedWarcryCap, 78, '서로 다른 함성을 겹쳐도 최대치 증가가 합산되면 안 된다');
assert.strictEqual(stackedWarcryStats.dr, 78, '함성으로 적용되는 물리 피해 감소는 78%를 넘지 않아야 한다');
assert.strictEqual(stackedWarcryStats.rawDr, 121, '상한 전 합계는 캐릭터 정보 표기용으로 보존해야 한다');

const penaltyStats = { dr: 75, rawDr: 75 };
applyEffects(penaltyStats, [{ buff: { type: 'warcry' }, delta: getDelta('결전 신호') }]);
assert.strictEqual(penaltyStats.dr, 69, '물리 피해 감소 페널티 함성은 최대치를 올리지 않고 실제 합계를 낮춰야 한다');

const guardStats = { dr: 75, rawDr: 100 };
const guardCap = applyEffects(guardStats, [
    { buff: { type: 'warcry' }, delta: battleCry },
    { buff: { type: 'guard' }, delta: getDelta('철의 맹세', 'guard') }
]);
assert.strictEqual(guardCap, 90, '가드 젬의 기존 90% 임시 상한은 유지해야 한다');
assert.strictEqual(guardStats.dr, 90, '가드의 현재 물피감 추가 효과도 90% 임시 상한을 넘지 않아야 한다');

const tooltip = vm.runInContext("getConditionGemDetail({name:'전장의 함성', type:'warcry', desc:''})", runtime);
assert(tooltip.includes('물피감 최대치 +3%'), '함성 툴팁에 고정 최대치 증가를 알려야 한다');

console.log('smoke-warcry-physical-reduction-cap passed');
