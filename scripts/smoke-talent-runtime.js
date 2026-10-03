const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();

function resetGame() {
  vm.runInContext('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;', context);
  context.game.currentZoneId = 0;
  context.game.settings.showCombatLog = false;
}

function equipCard(cardId, level) {
  context.game.talentCards = { [cardId]: { level, score: 600, count: 1 } };
  context.game.talentCardLoadout = [cardId, null, null, null, null, null];
}

function makeEnemy(id, extra = {}) {
  return Object.assign({
    id, hp: 1000000, maxHp: 1000000, gx: 2, gy: 6,
    evasion: 0, evasionChance: 0, ailments: [], attackKind: 'melee',
    attackRange: 1, attackTimer: 0, atkMul: 1, attackSpeedVar: 1, damageMul: 1,
  }, extra);
}

function prepareBasicAttack(enemies) {
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  context.game.activeSkill = '기본 공격';
  context.game.enemies = enemies;
  const stats = context.getPlayerStats();
  stats.baseDmg = 1000;
  stats.minDmgRoll = 100;
  stats.maxDmgRoll = 100;
  stats.accuracy = 1000000;
  stats.crit = 0;
  return stats;
}

function flushAttackStages() {
  vm.runInContext('pendingSkillStageHits.forEach(row => { row.at = 0; }); processPendingSkillStageHits();', context);
}

function withRandom(value, action) {
  const original = context.Math.random;
  context.Math.random = () => value;
  try { return action(); } finally { context.Math.random = original; }
}

function sumStat(id) {
  return context.getActiveTalentCardStatBonuses()
    .filter(row => row.id === id)
    .reduce((sum, row) => sum + row.val, 0);
}

resetGame();
equipCard('hero1__ranger', 1);
const mistralText = context.getTalentCardEffectLines('hero1', 'ranger', 1).join(' ');
assert.ok(mistralText.includes('중첩마다 공격 속도 +0.4%') && mistralText.includes('[이면] 이동 속도 +0.2%'), '미스트랄 카드가 런타임 효과와 이면 효과를 구분해 표시해야 한다');
assert.strictEqual(sumStat('aspd'), 0, '미스트랄은 공격 전 상시 공격 속도를 주지 않아야 한다');
assert.strictEqual(sumStat('move'), 0.2, '미스트랄의 이면 이동 속도는 런타임 효과와 별도로 유지되어야 한다');
vm.runInContext('recordTalentMistralAttack()', context);
assert.strictEqual(sumStat('aspd'), 0.4, '미스트랄 Lv.1 한 중첩은 공격 속도 0.4%를 줘야 한다');
assert.ok(Math.abs(sumStat('move') - 0.6) < 0.0001, '미스트랄 Lv.1 한 중첩과 이면 이동 속도를 함께 합산해야 한다');
for (let index = 1; index < 12; index++) vm.runInContext('recordTalentMistralAttack()', context);
assert.strictEqual(sumStat('aspd'), 4, '미스트랄은 10중첩을 넘지 않아야 한다');
context.game.talentCardRuntime.mistralExpiresAt = Date.now() - 1;
assert.strictEqual(sumStat('aspd'), 0, '미스트랄은 2초가 지나면 만료되어야 한다');

resetGame();
equipCard('hero1__gladiator', 10);
const fletcherTarget = makeEnemy(1, { hp: 100000, maxHp: 100000 });
const fletcherStats = prepareBasicAttack([fletcherTarget]);
const fletcherDamage = [];
for (let attack = 0; attack < 3; attack++) {
  const before = fletcherTarget.hp;
  withRandom(0.5, () => { context.performPlayerAttack(fletcherStats); flushAttackStages(); });
  fletcherDamage.push(before - fletcherTarget.hp);
}
assert.strictEqual(fletcherDamage[0], fletcherDamage[1], '플레쳐의 첫 두 공격은 같은 피해를 줘야 한다');
assert.ok(fletcherDamage[2] / fletcherDamage[0] >= 1.30 && fletcherDamage[2] / fletcherDamage[0] <= 1.35,
  '플레쳐의 세 번째 공격 피해 +33%는 한 번만 적용되어야 한다');

resetGame();
equipCard('hero2__guardian', 10);
const stoneText = context.getTalentCardEffectLines('hero2', 'guardian', 10).join(' ');
assert.ok(stoneText.includes('최대 생명력의 10% 돌 보호막') && !stoneText.includes('막기 확률 +'), '스톤쉴드는 가짜 막기 보정 대신 실제 보호막 수치를 표시해야 한다');
const stone = context.grantTalentStoneShield(1000);
assert.strictEqual(stone.amount, 100, '스톤쉴드 Lv.10은 최대 생명력의 10%여야 한다');
assert.strictEqual(context.absorbDamageWithTalentStoneShield(60), 0, '돌 보호막이 남은 피해를 먼저 흡수해야 한다');
assert.strictEqual(context.game.talentCardRuntime.stoneShieldAmount, 40, '흡수한 만큼 돌 보호막이 감소해야 한다');
context.game.talentCardRuntime.stoneShieldExpiresAt = Date.now() - 1;
assert.strictEqual(context.absorbDamageWithTalentStoneShield(10), 10, '만료된 돌 보호막은 피해를 흡수하면 안 된다');

resetGame();
equipCard('hero2__guardian', 10);
const blockingEnemy = makeEnemy(1, { attackTimer: 1, damageMul: 1000 });
context.game.enemies = [blockingEnemy];
context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
const guardianStats = context.getPlayerStats();
guardianStats.evadeChance = 0;
guardianStats.blockChance = 75;
guardianStats.blockChanceMax = 75;
withRandom(0, () => context.performMonsterAttacks(guardianStats));
assert.ok(context.game.talentCardRuntime && context.game.talentCardRuntime.stoneShieldAmount > 0, '실제 막기 성공이 돌 보호막을 생성해야 한다');

function runMoonAttack(enemies, randomValue = 0.5) {
  resetGame();
  equipCard('hero4__hunter', 10);
  const stats = prepareBasicAttack(enemies);
  withRandom(randomValue, () => {
    context.performPlayerAttack(stats);
    flushAttackStages();
  });
  return enemies;
}

const singleTarget = runMoonAttack([makeEnemy(1)]);
assert.strictEqual(singleTarget[0].recentHitsTaken, 2, '달을쫓는칼날은 단일 적 첫 실제 타격 뒤 한 번만 되돌아와야 한다');
assert.ok(context.getTalentCardEffectLines('hero4', 'hunter', 10).join(' ').includes('원 피해의 20% 추가 타격'), '달을쫓는칼날은 조건부 피해 증가가 아닌 별도 타격으로 표시해야 한다');
const multipleTargets = runMoonAttack([makeEnemy(1), makeEnemy(2, { gx: 2, gy: 5 })]);
assert.strictEqual(multipleTargets.reduce((sum, enemy) => sum + (enemy.recentHitsTaken || 0), 0), 1, '적이 여럿이면 달빛 귀환이 발동하면 안 된다');
const missedTarget = runMoonAttack([makeEnemy(1, { evasion: 100000000, evasionChance: 90 })], 0);
assert.strictEqual(missedTarget[0].recentHitsTaken || 0, 0, '첫 타격이 빗나가면 달빛 귀환도 발동하면 안 된다');

resetGame();
equipCard('hero10__catalyst', 10);
assert.ok(context.getTalentCardEffectLines('hero10', 'catalyst', 10).join(' ').includes('적에게 점화와 중독만 걸 수 있음'), '마그눔 오푸스 제한을 현재 적용 문구에 표시해야 한다');
assert.strictEqual(context.canTalentCardApplyEnemyAilment('ignite'), true, '마그눔 오푸스는 점화를 허용해야 한다');
assert.strictEqual(context.canTalentCardApplyEnemyAilment('poison'), true, '마그눔 오푸스는 중독을 허용해야 한다');
assert.strictEqual(context.canTalentCardApplyEnemyAilment('freeze'), false, '마그눔 오푸스는 동결 부여를 막아야 한다');
assert.strictEqual(context.canTalentCardApplyEnemyAilment('hunterExpose'), true, '직업 표식은 일반 상태이상 제한 대상이 아니어야 한다');
const markedEnemy = makeEnemy(1, { ailments: [{ type: 'bleed', time: 2, power: 1 }] });
assert.strictEqual(context.mergeEnemyAilment(markedEnemy, { type: 'bleed', time: 5, power: 1 }, {}), false, '금지 상태이상은 갱신할 수 없어야 한다');
assert.strictEqual(markedEnemy.ailments[0].time, 2, '이미 존재하던 금지 상태이상은 제거하거나 갱신하지 않아야 한다');
assert.strictEqual(context.mergeEnemyAilment(markedEnemy, { type: 'hunterExpose', time: 3, power: 1 }, {}), true, '직업 표식은 정상 적용되어야 한다');

const snapshot = context.createSaveSnapshot({ talentCardRuntime: { mistralStacks: 10 }, inventory: [{ id: 7 }] });
assert.ok(!Object.prototype.hasOwnProperty.call(snapshot, 'talentCardRuntime'), '재능 전투 런타임은 저장 스냅샷에서 제외되어야 한다');
assert.strictEqual(snapshot.inventory[0].id, 7, '런타임 제거가 관련 없는 저장 데이터를 바꾸면 안 된다');
const serialized = JSON.parse(context.serializeSaveState({ talentCardRuntime: { stoneShieldAmount: 100 }, level: 7 }));
assert.ok(!Object.prototype.hasOwnProperty.call(serialized, 'talentCardRuntime'), '재능 전투 런타임은 로컬 저장에서도 제외되어야 한다');
assert.strictEqual(serialized.level, 7, '로컬 런타임 제거가 영구 진행 데이터를 바꾸면 안 된다');
const cloudPayload = JSON.parse(context.createCloudSaveRequestBody('smoke-user', { talentCardRuntime: { mistralStacks: 3 }, level: 9 })).save_data;
assert.ok(!Object.prototype.hasOwnProperty.call(cloudPayload, 'talentCardRuntime'), '재능 전투 런타임은 클라우드 저장에서도 제외되어야 한다');
assert.strictEqual(cloudPayload.level, 9, '클라우드 런타임 제거가 영구 진행 데이터를 바꾸면 안 된다');

resetGame();
equipCard('hero2__warrior', 10);
// 땅울림: 부적의 함성 줄이 조건 없이 늘 켜지지만 가장 센 함성 하나만 적용되고, 함성 수(함성 공명 허리띠)는 모두 센다.
vm.runInContext(`game.stumpBox = stumpBox.empty(); game.stumpBox.acquired = true; game.enemies = []; game.playerHp = 50;
    for (const [cell, line] of [[12, { kind: 'condition', id: 'cry_boss', value: 12 }], [13, { kind: 'condition', id: 'cry_crowd', value: 13 }]]) {
        const item = stumpBox.addTalisman(game, { name: '함성 부적', rarity: 'magic', lines: [line] }, true);
        item.xp = STUMP_BOX_GROWTH.need.talisman; item.ripe = true; stumpBox.place(game, item.id, cell);
    }`, context);
const quake = JSON.parse(vm.runInContext("JSON.stringify(talismanCombat.effects({ maxHp: 100, uniqueWarcryResonancePct: 10 }).map(row => [row.buff.name, row.delta]))", context));
assert.deepStrictEqual(quake, [['talisman:cry_crowd', { aspd: 13 }], ['talisman:resonance', { pctDmg: 20 }]],
    '땅울림은 조건 없이 가장 센 함성 하나(굴림 범위 대비)만 적용하고 공명은 두 함성을 모두 센다');
assert.strictEqual(context.getTalentCardUniqEffects('hero2', 'warrior', 10).length, 0, '땅울림이 무관한 함성 공명 효과를 주면 안 된다');

resetGame();
equipCard('hero2__assassin', 10);
const butcherTarget = makeEnemy(1, { hp: 300, maxHp: 1000 });
const butcherStats = prepareBasicAttack([butcherTarget]);
butcherStats.baseDmg = 1;
for (let hit = 0; hit < 4; hit++) {
  withRandom(0.5, () => { context.performPlayerAttack(butcherStats); flushAttackStages(); });
}
assert.ok(butcherTarget.hp > 0, '도살자는 표식을 완성하는 4번째 공격에서 즉시 마무리하면 안 된다');
withRandom(0.5, () => { context.performPlayerAttack(butcherStats); flushAttackStages(); });
assert.strictEqual(butcherTarget.hp, 0, '도살자는 4회 표식 이후 다음 공격에서 생명력 30% 이하 일반 적을 마무리해야 한다');
assert.strictEqual(context.canApplyTalentExecuteThreshold(makeEnemy(2), 0.2), true,
  '도살자 장착이 다른 스킬의 처형 조건까지 4회 표식으로 제한하면 안 된다');

resetGame();
equipCard('hero3__assassin', 10);
const moonShadowTarget = makeEnemy(1, {
  hp: 100000, maxHp: 100000, energyShield: 100000, maxEnergyShield: 100000, dr: 50
});
const moonShadowStats = prepareBasicAttack([moonShadowTarget]);
moonShadowStats.crit = 100;
moonShadowStats.critDmg = 200;
const moonShadowBefore = moonShadowTarget.hp + moonShadowTarget.energyShield;
withRandom(0.5, () => {
  context.performPlayerAttack(moonShadowStats, {
    stageReplay: true, forcedCrit: true, targetEntries: [{ enemyId: 1, mult: 1 }], skillName: '기본 공격'
  });
});
assert.strictEqual(moonShadowBefore - moonShadowTarget.hp - moonShadowTarget.energyShield, 1200,
  '달그림자는 보호막 대상에서도 피해의 20%만 고정 피해로 전환하고 일반 피해를 중복 적용하면 안 된다');

// 푸른 심판(옛 카드 hero3__inquisitor, 고유 주얼로 옮김): 원소 공격의 15%가 적의 원소 저항을 반대로 센다.
function blueJudgmentHit(randomValue) {
  resetGame();
  equipCard('hero3__inquisitor', 10);
  const target = makeEnemy(1, { hp: 100000, maxHp: 100000, resL: 45 });
  const stats = prepareBasicAttack([target]);
  stats.sSkill.ele = 'light';
  withRandom(randomValue, () => context.performPlayerAttack(stats, {
    stageReplay: true, targetEntries: [{ enemyId: 1, mult: 1 }], skillName: '기본 공격'
  }));
  return target.maxHp - target.hp;
}
assert.strictEqual(blueJudgmentHit(0), 1450, '푸른 심판이 발동하면 번개 저항 45%를 반대로 세어야 한다');
assert.strictEqual(blueJudgmentHit(0.99), 550, '푸른 심판이 발동하지 않으면 번개 저항을 그대로 적용해야 한다');


console.log('smoke-talent-runtime passed');
