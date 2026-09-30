const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

// 부적의 함성 · 수호 줄(예전 컨디션 젬)이 받는 물리 피해 감소와 그 한도를 올리는 규칙.
const runtime = buildGameRuntime();

function getDelta(id, value = 100) {
    runtime.__line = { kind: 'condition', id, value };
    return vm.runInContext('talismans.conditionDelta(__line)', runtime);
}

function applyEffects(stats, effects) {
    runtime.__stats = stats;
    runtime.__effects = effects;
    return vm.runInContext('applyConditionPhysicalReductionEffects(__stats, __effects)', runtime);
}

const battleCry = getDelta('cry_battlefield');
const glacierCry = getDelta('cry_glacier');
assert.strictEqual(battleCry.dr, 6, '전장의 함성(위력 100%)의 물리 피해 감소는 줄 정의값 그대로다');
assert.strictEqual(glacierCry.dr, 8, '빙하의 포효(위력 100%)의 물리 피해 감소는 줄 정의값 그대로다');
assert.strictEqual(battleCry.drCapBonus, 3, '함성의 물리 피해 감소 한도 증가는 +3%다');
assert.strictEqual(glacierCry.drCapBonus, 3, '서로 다른 방어 함성도 같은 +3% 한도 계약을 쓴다');
const weakCry = getDelta('cry_battlefield', 60);
assert.strictEqual(weakCry.dr, 3.6, '위력이 낮으면 물리 피해 감소도 비례해 줄어든다');
assert.strictEqual(weakCry.drCapBonus, 3, '한도 증가는 위력과 상관없는 고정값이다');

const stackedWarcryStats = { dr: 75, rawDr: 100 };
const stackedWarcryCap = applyEffects(stackedWarcryStats, [
    { buff: { type: 'warcry' }, delta: battleCry },
    { buff: { type: 'warcry' }, delta: glacierCry }
]);
assert.strictEqual(stackedWarcryCap, 81, '서로 다른 방어 함성의 한도 +3%는 각각 합산된다');
assert.strictEqual(stackedWarcryStats.dr, 81, '방어 함성 두 개가 겹치면 물리 피해 감소 한도는 81%다');
assert.strictEqual(stackedWarcryStats.rawDr, 114, '한도 전 합계는 캐릭터 정보 표기용으로 보존한다');

const singleWarcryStats = { dr: 75, rawDr: 100 };
assert.strictEqual(applyEffects(singleWarcryStats, [{ buff: { type: 'warcry' }, delta: battleCry }]), 78,
    '방어 함성 하나면 한도는 78%다');
assert.strictEqual(singleWarcryStats.dr, 78, '방어 함성 하나의 적용 물리 피해 감소는 78%를 넘지 않는다');

const penaltyStats = { dr: 75, rawDr: 75 };
applyEffects(penaltyStats, [{ buff: { type: 'warcry' }, delta: getDelta('cry_last_stand') }]);
assert.strictEqual(penaltyStats.dr, 71, '물리 피해 감소를 깎는 함성(결전 신호)은 한도를 올리지 않고 실제 합계를 낮춘다');

const guardStats = { dr: 75, rawDr: 100 };
const guardCap = applyEffects(guardStats, [
    { buff: { type: 'warcry' }, delta: battleCry },
    { buff: { type: 'guard' }, delta: getDelta('guard_iron_oath') }
]);
assert.strictEqual(guardCap, 90, '수호 줄이 켜지면 임시 한도 90%를 쓴다');
assert.strictEqual(guardStats.dr, 90, '수호 줄의 방어도 배율 추가분도 90% 임시 한도를 넘지 않는다');

// 실제 경로: 그루터기 함에서 깨어난 부적의 함성 줄이 보스전에서 켜져 같은 효과 행을 만든다.
vm.runInContext(`game.stumpBox = stumpBox.empty(); game.stumpBox.acquired = true; game.playerHp = 100;
    game.enemies = [{ hp: 10, isBoss: true }];
    { const item = stumpBox.addTalisman(game, { name: '함성 부적', rarity: 'magic', lines: [{ kind: 'condition', id: 'cry_battlefield', value: 100 }] }, true);
      item.xp = STUMP_BOX_GROWTH.need.talisman; item.ripe = true; stumpBox.place(game, item.id, 12); }`, runtime);
const liveEffects = vm.runInContext('talismanCombat.effects({ maxHp: 100 })', runtime);
const liveStats = { dr: 75, rawDr: 100 };
assert.strictEqual(applyEffects(liveStats, liveEffects), 78, '깨어난 부적의 함성 줄도 같은 한도 규칙을 탄다');

const tooltip = vm.runInContext("talismans.describeLine({ kind: 'condition', id: 'cry_battlefield', value: 100 })", runtime);
assert(tooltip.includes('물리 피해 감소 한도 +3%'), '함성 줄 설명에 고정 한도 증가를 알린다');

console.log('smoke-warcry-physical-reduction-cap passed');
