const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
vm.runInContext(fs.readFileSync('js/talent-cards.js', 'utf8'), context, { filename: 'js/talent-cards.js' });

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

function withRandomSequence(values, action) {
  const original = context.Math.random;
  let index = 0;
  context.Math.random = () => values[Math.min(index++, values.length - 1)];
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
assert.ok(mistralText.includes('중첩당 공격 속도 +0.4%') && mistralText.includes('[이면] 이동 속도 +0.2%'), '미스트랄 카드가 런타임 효과와 이면 효과를 구분해 표시해야 한다');
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

resetGame();
equipCard('hero8__guardian', 10);
context.game.equipment['방패'] = {
  id: 88001, slot: '방패', rarity: 'rare', baseStats: [{ id: 'baseBlockChance', val: 10 }], stats: []
};
const adamantStats = context.getPlayerStats();
assert.strictEqual(sumStat('blockChanceMax'), 15, '금강불괴 Lv.10은 막기 확률 최대치를 15%p 높여야 한다');
assert.strictEqual(sumStat('blockChancePct'), 100, '금강불괴 Lv.10은 방패 기본 막기 확률을 100% 증가시켜야 한다');
assert.strictEqual(adamantStats.blockChanceMax, 65, '금강불괴가 실제 전투 막기 상한 50%를 65%로 높여야 한다');
assert.strictEqual(adamantStats.blockChance, 22, '방패 기본 막기 10%가 2배가 되고 이면 막기 2%p가 더해져야 한다');
assert.strictEqual(adamantStats.uniqueBlockedDamageTakenPct, 60, '금강불괴는 막은 피해의 60%를 받는 대가를 실제 전투 스탯으로 전달해야 한다');
const adamantText = context.getTalentCardEffectLines('hero8', 'guardian', 10).join(' ');
assert.ok(adamantText.includes('막기 확률 최대치 +15%') && adamantText.includes('방패 기본 막기 확률 증가 +100%') && adamantText.includes('막기 시 피해의 60%'),
  '금강불괴 툴팁도 실제 상한과 배율을 표시해야 한다');

function measureAdamantEnemyHit(blockChance) {
  resetGame();
  equipCard('hero8__guardian', 10);
  context.game.equipment['방패'] = {
    id: 88002, slot: '방패', rarity: 'rare', baseStats: [{ id: 'baseBlockChance', val: 10 }], stats: []
  };
  context.game.enemies = [makeEnemy(2, { attackTimer: 1 })];
  context.game.gridPlayer = { gx: 1, gy: 6, gridMoveTimer: 0 };
  const stats = context.getPlayerStats();
  stats.evadeChance = 0;
  stats.blockChance = blockChance;
  stats.blockChanceMax = 75;
  stats.deflectChance = 0;
  context.game.playerHp = 100000;
  withRandom(0, () => context.performMonsterAttacks(stats));
  return 100000 - context.game.playerHp;
}

const adamantFullHit = measureAdamantEnemyHit(0);
const adamantBlockedHit = measureAdamantEnemyHit(75);
assert.ok(adamantFullHit > 0, '금강불괴 부분 막기 비교용 일반 피격은 실제 피해를 줘야 한다');
assert.strictEqual(adamantBlockedHit, Math.max(1, Math.floor(adamantFullHit * 0.6)),
  '금강불괴 막기는 일반 막기처럼 피해를 지우지 않고 정확히 60%를 받아야 한다');

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
assert.ok(context.getTalentCardEffectLines('hero10', 'catalyst', 10).join(' ').includes('적에게 점화·중독만 부여 가능'), '마그눔 오푸스 제한을 현재 적용 문구에 표시해야 한다');
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
equipCard('hero1__assassin', 10);
assert.strictEqual(sumStat('critDmg'), 8, '그늘살 표면 효과가 상시 치명타 피해로 중복 적용되면 안 된다');
assert.strictEqual(context.getTalentShadowCritDamageMultiplier(false), 1, '그늘살은 비치명타에 적용되면 안 된다');
assert.strictEqual(withRandom(0, () => context.getTalentShadowCritDamageMultiplier(true)), 1, '그늘살 치명타 배율의 최솟값은 1배여야 한다');
assert.ok(Math.abs(withRandom(1, () => context.getTalentShadowCritDamageMultiplier(true)) - 1.2) < 0.0001, '그늘살 Lv.10 치명타 배율의 최댓값은 1.2배여야 한다');
const shadowTarget = makeEnemy(1);
const shadowStats = prepareBasicAttack([shadowTarget]);
shadowStats.critDmg = 200;
withRandom(1, () => context.performPlayerAttack(shadowStats, {
  stageReplay: true, forcedCrit: true, targetEntries: [{ enemyId: 1, mult: 1 }], skillName: '기본 공격'
}));
const shadowDamage = shadowTarget.maxHp - shadowTarget.hp;
resetGame();
const plainCritTarget = makeEnemy(1);
const plainCritStats = prepareBasicAttack([plainCritTarget]);
plainCritStats.critDmg = 200;
withRandom(1, () => context.performPlayerAttack(plainCritStats, {
  stageReplay: true, forcedCrit: true, targetEntries: [{ enemyId: 1, mult: 1 }], skillName: '기본 공격'
}));
const plainCritDamage = plainCritTarget.maxHp - plainCritTarget.hp;
assert.ok(shadowDamage / plainCritDamage >= 1.19 && shadowDamage / plainCritDamage <= 1.21, '그늘살 최대 굴림은 실제 치명타 피해를 한 번만 1.2배 해야 한다');

resetGame();
equipCard('hero1__soulbinder', 10);
assert.strictEqual(sumStat('summonCrit'), 0, '영혼사수는 소환수 치명타 확률을 직접 더하면 안 된다');
assert.ok(Math.abs(context.getTalentSummonCritChance(0.5) - 0.75) < 0.0001, '행운 치명타의 기대 확률은 두 번 굴린 결과여야 한다');
assert.strictEqual(withRandomSequence([0.6, 0.4], () => context.rollTalentSummonCrit(0.5)), true, '첫 판정 실패 후 두 번째 판정 성공도 치명타여야 한다');

resetGame();
equipCard('hero2__warrior', 10);
const warcryName = vm.runInContext('CONDITION_GEM_DB.warcry[0].name', context);
context.game.conditionGemUnlocked = true;
context.game.season = 2;
context.game.loopCount = 1;
context.game.conditionGemPool = [warcryName];
context.game.skillAutoRules = [{ enabled: true, priority: 0, skillName: warcryName, triggerType: 'hp_below', hpThreshold: 100 }];
context.game.playerHp = 100;
context.runConditionGemAutoRules({ maxHp: 100 });
assert.ok(context.game.conditionGemCooldowns[warcryName] > Date.now(), '즉시 함성도 재사용 대기시간은 유지해야 한다');
assert.ok(context.game.playerCastDelayUntil <= Date.now(), '땅울림은 함성 시전 지연을 남기면 안 된다');
assert.strictEqual(context.getTalentCardUniqEffects('hero2', 'warrior', 10).length, 0, '땅울림이 무관한 함성 공명 효과를 주면 안 된다');

resetGame();
equipCard('hero2__ranger', 10);
const chargeFirst = makeEnemy(1, { evasion: 100000000, evasionChance: 100 });
const chargeSecond = makeEnemy(2, { gx: 2, gy: 5, evasion: 100000000, evasionChance: 100 });
context.game.enemies = [chargeFirst, chargeSecond];
context.tickTalentRangerCharge(1000);
withRandom(0.99, () => context.tickTalentRangerCharge(4000));
assert.strictEqual(context.game.talentCardRuntime.rangerChargeTargetId, 2, '돌격대는 주기마다 살아 있는 적 중 하나를 지정해야 한다');
assert.strictEqual(context.getTalentRangerChargeTarget([chargeFirst, chargeSecond]).id, 2, '돌격 대상 조회는 지정된 적을 반환해야 한다');
const chargeTargets = context.getSkillTargets(context.getPlayerStats());
assert.strictEqual(chargeTargets.length, 1, '돌격 대상 지정 중에는 다른 적을 공격 대상으로 섞으면 안 된다');
assert.strictEqual(chargeTargets[0].enemy.id, 2, '다음 실제 공격은 지정된 돌격 대상을 우선해야 한다');
assert.strictEqual(context.recordTalentRangerChargeHit(chargeSecond, 4000), true, '돌격 대상 첫 명중은 버프를 발동해야 한다');
assert.ok(Math.abs(context.getTalentRangerChargeSpeedMultiplier(4001) - 1.12) < 0.0001, '돌격대 Lv.10은 공격·이동 속도를 12% 증폭해야 한다');
assert.strictEqual(context.getTalentRangerChargeSpeedMultiplier(7000), 1, '돌격대 버프는 3초 뒤 만료되어야 한다');

resetGame();
equipCard('hero2__warlock', 10);
context.game.activeSkill = '기본 공격';
context.game.skills = ['기본 공격'];
context.game.gemData['기본 공격'] = { level: 7, exp: 0, quality: 5, skyEnhanceCap: 2 };
context.game.skyGemEnhancements['기본 공격'] = ['sky_fury', null, null, null, null];
assert.ok(context.getEquippedEnhanceableGemNames().includes('기본 공격'), '펜리르 장착 중에는 기본 공격을 각인 가능한 젬으로 취급해야 한다');
const fenrirTarget = makeEnemy(1);
const fenrirStats = prepareBasicAttack([fenrirTarget]);
fenrirStats.poisonChance = 0;
withRandom(0, () => {
  context.performPlayerAttack(fenrirStats);
  flushAttackStages();
});
assert.ok(fenrirTarget.ailments.some(row => row.type === 'fenrirVenomCurse' && row.time > 0), '펜리르의 이빨 적중은 맹독 저주를 남겨야 한다');
const fenrirPoison = fenrirTarget.ailments.find(row => row.type === 'poison');
assert.ok(fenrirPoison && fenrirPoison.talentDamageMorePct === 20, '펜리르 중독은 Lv.10에서 피해가 20% 증폭되어야 한다');
const spreadFenrirPoison = context.cloneEnemyAilmentForSpread(fenrirPoison, fenrirStats);
assert.strictEqual(spreadFenrirPoison.talentDamageMorePct, 20, '펜리르 중독이 확산될 때 전용 피해 증폭이 유실되면 안 된다');
context.game.talentCardLoadout = [null, null, null, null, null, null];
context.afterTalentLoadoutChange();
assert.ok(!context.getEquippedEnhanceableGemNames().includes('기본 공격'), '펜리르 해제 후 기본 공격은 각인 대상에서 빠져야 한다');
assert.strictEqual(context.game.skyGemEnhancements['기본 공격'][0], 'sky_fury', '펜리르 해제 시 기존 기본 공격 각인 데이터는 보존해야 한다');

resetGame();
equipCard('hero2__inquisitor', 10);
const executionBoss = makeEnemy(1, { isBoss: true });
assert.strictEqual(context.getTalentExecutionOrderMultiplier(executionBoss), 1, '집행 명령은 첫 타격 전에 적용되면 안 된다');
assert.strictEqual(context.markTalentExecutionOrder(executionBoss), true, '보스 첫 타격은 집행 명령을 새겨야 한다');
assert.ok(Math.abs(context.getTalentExecutionOrderMultiplier(executionBoss) - 1.05) < 0.0001, '집행 명령 이후 피해는 Lv.10에서 5% 증폭되어야 한다');
assert.strictEqual(context.markTalentExecutionOrder(executionBoss), false, '집행 명령은 같은 적에게 중첩되면 안 된다');
assert.strictEqual(context.markTalentExecutionOrder(makeEnemy(2)), false, '일반 적에게 집행 명령을 새기면 안 된다');
resetGame();
equipCard('hero2__inquisitor', 10);
const executionTarget = makeEnemy(1, { isBoss: true });
const executionStats = prepareBasicAttack([executionTarget]);
withRandom(0.5, () => {
  context.performPlayerAttack(executionStats);
  flushAttackStages();
});
const firstExecutionHit = executionTarget.maxHp - executionTarget.hp;
assert.strictEqual(context.game.talentCardRuntime.executionOrders[1], true, '실제 보스 첫 타격이 집행 명령을 남겨야 한다');
withRandom(0.5, () => {
  context.performPlayerAttack(executionStats);
  flushAttackStages();
});
const secondExecutionHit = executionTarget.maxHp - executionTarget.hp - firstExecutionHit;
assert.ok(secondExecutionHit > firstExecutionHit, '집행 명령은 첫 타격이 아닌 다음 실제 타격부터 피해를 증폭해야 한다');

resetGame();
const summonProfile = { ele: 'phys', baseDamage: 1000, crit: 5, critDmg: 140, dmgRollMinPct: 100 };
const summonStats = { summonPctDmg: 0, summonEfficiency: 0, summonCrit: 0, summonCritDmg: 0, summonSharedPctDmg: 0, summonSharedTaggedPctDmg: {}, damageScales: {} };
const summonBase = context.getSummonHitDamageInfo(summonProfile, summonStats, null, { expected: true, rollOverridePct: 100 }).damage;
equipCard('hero2__soulbinder', 10);
const summonVanguard = context.getSummonHitDamageInfo(summonProfile, summonStats, null, { expected: true, rollOverridePct: 100 }).damage;
assert.ok(summonVanguard >= Math.floor(summonBase * 1.11) && summonVanguard <= Math.ceil(summonBase * 1.13), '선봉장은 소환수 피해를 약 12% 증폭해야 한다');

resetGame();
const baseMove = context.getPlayerStats().moveSpeed;
equipCard('hero2__catalyst', 10);
const quicksilverStats = context.getPlayerStats();
assert.ok(Math.abs(quicksilverStats.moveSpeed / baseMove - 1.10) < 0.0001, '퀵실버는 이동 속도를 10% 증폭해야 한다');
const quicksilver = context.getTalentQuicksilverConfig();
assert.deepStrictEqual(JSON.parse(JSON.stringify(quicksilver)), { speedMultiplier: 1.1, regenMultiplier: 0.9, regenPointPenalty: 5 }, '퀵실버의 속도·재생 계약이 정의와 일치해야 한다');

resetGame();
equipCard('hero2__crusader', 10);
context.game.playerHp = 500;
assert.ok(Math.abs(context.getTalentConditionalDamageTakenMultiplier(1000) - 0.92) < 0.0001, '태양서약은 생명력 50% 이하에서 받는 피해를 8% 감폭해야 한다');
context.game.playerHp = 501;
assert.strictEqual(context.getTalentConditionalDamageTakenMultiplier(1000), 1, '태양서약은 생명력 50% 초과에서 적용되면 안 된다');
assert.strictEqual(sumStat('dr'), 2, '태양서약 표면 효과가 상시 피해 감소로 중복 적용되면 안 된다');

const sunOathStats = context.getPlayerStats();
sunOathStats.maxHp = 1000;
sunOathStats.resChaos = 0;
sunOathStats.dotTakenDamageReducePct = 0;
sunOathStats.poisonDamageReducePct = 0;
context.game.playerHp = 500;
context.game.playerAilments = [{ type: 'poison', time: 1, power: 1, sourceHitDamage: 1000 }];
context.tickAilments(sunOathStats, 0.1);
const reducedPoisonDamage = 500 - context.game.playerHp;
context.game.playerHp = 501;
context.game.playerAilments = [{ type: 'poison', time: 1, power: 1, sourceHitDamage: 1000 }];
context.tickAilments(sunOathStats, 0.1);
const normalPoisonDamage = 501 - context.game.playerHp;
assert.ok(reducedPoisonDamage > 0 && reducedPoisonDamage < normalPoisonDamage,
  '태양서약은 직접 피격뿐 아니라 지속 피해도 감소시켜야 한다');

console.log('smoke-talent-runtime passed');
