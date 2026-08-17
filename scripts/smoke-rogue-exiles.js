const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
const state = context.mergeDefaults({ season: 2, loopCount: 1, currentZoneId: 0 });
context.__rogueGame = state;
run('game = __rogueGame;');

const zone = context.getZone(0);
run('__rogueOriginalRandom = Math.random; Math.random = () => 0.999;');
context.__plainElite = context.createEnemy(zone, { elite: true, at: 40 }, 0);
run('Math.random = __rogueOriginalRandom;');
assert.strictEqual(context.__plainElite.isRogueExile, undefined, '실패 굴림의 정예는 기존 정예로 남아야 한다');

const beforeHp = context.__plainElite.maxHp;
const beforeDrop = context.__plainElite.dropMul;
let rolls = [0, 0.12, 0.32, 0.51, 0.71, 0.22, 0.42, 0.62, 0.82];
let rollIndex = 0;
context.__rogueRng = () => rolls[rollIndex++ % rolls.length];
const rogue = context.maybeApplyRogueExile(context.__plainElite, zone, true, false, context.__rogueRng);

assert.strictEqual(rogue.isRogueExile, true, '적격 정예가 탈주 유배자로 교체되어야 한다');
assert.ok(context.SKILL_DB[rogue.rogueLoadout.skillName], '실제 플레이어 스킬 젬 정의에서 스킬을 골라야 한다');
assert.strictEqual(rogue.rogueLoadout.equipment.length, 5, '무기와 방어구 네 부위를 장착해야 한다');
const baseIds = new Set(JSON.parse(run('JSON.stringify(BASE_ITEM_DB.map(base => base.id))')));
assert.ok(rogue.rogueLoadout.equipment.every(item => baseIds.has(item.id)),
    '장비는 실제 플레이어 베이스 정의에서 골라야 한다');
assert.ok(rogue.maxHp > beforeHp && rogue.dropMul > beforeDrop, '위험도에 맞는 체력과 보상 배율이 적용되어야 한다');
assert.ok(rogue.traitName.includes(rogue.rogueLoadout.skillName), '전투 UI에서 사용 스킬을 확인할 수 있어야 한다');
assert.ok(['instantTarget', 'projectileCell', 'magicCell'].includes(rogue.rogueDelivery), '실제 공격 전달 방식이 지정되어야 한다');

const lockedState = context.mergeDefaults({ season: 1, loopCount: 0 });
context.__lockedRogueGame = lockedState;
run('game = __lockedRogueGame;');
const lockedEnemy = { isElite: true };
assert.strictEqual(context.maybeApplyRogueExile(lockedEnemy, zone, true, false, () => 0), lockedEnemy,
    '루프 1에서는 탈주 유배자가 등장하면 안 된다');
assert.strictEqual(lockedEnemy.isRogueExile, undefined);

console.log('smoke-rogue-exiles passed');
