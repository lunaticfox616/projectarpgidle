const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();

function resetGame() {
  vm.runInContext('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;', context);
  context.game.currentZoneId = 0;
  context.game.settings.showCombatLog = false;
  context.game.enemies = [];
}

function equip(cardId, level = 10) {
  context.game.talentCards = { [cardId]: { level, score: 600, count: 1 } };
  context.game.talentCardLoadout = [cardId, null, null, null, null, null];
}

function enemy(extra = {}) {
  return Object.assign({
    id: 1,
    hp: 1000,
    maxHp: 1000,
    ailments: [],
    isBoss: false,
    isElite: false,
  }, extra);
}

function preciseStats(overrides = {}) {
  return Object.assign({
    talentSourceStats: {
      armorPct: 40, aspdPct: 20, movePct: 30, hpPct: 25, dotPct: 50,
      generalPct: 20, elementalPct: 30, firePct: 40, coldPct: 20, lightPct: 10,
      summonPct: 35, summonHp: 50, summonAspd: 40, regen: 8,
    },
    sSkill: { ele: 'fire', tags: ['attack', 'elemental'] },
    baseDmg: 100,
    dps: 100,
    maxHp: 1000,
    lifeRecoveryCap: 1000,
    aspd: 2,
    moveSpeed: 120,
    ds: 0,
    crit: 20,
    rawCrit: 20,
    critDmg: 150,
    rawCritDmg: 150,
    blockChance: 20,
    blockChanceMax: 50,
    deflectChance: 20,
    evasion: 1000,
    enemyAccuracy: 1000,
    evadeChance: 50,
    armor: 1000,
    energyShield: 500,
    energyShieldRegenRate: 10,
    energyShieldRechargeDelay: 3,
    regen: 10,
    summonHpPct: 0,
    summonAspd: 0,
    summonPctDmg: 0,
    summonCrit: 0,
    summonCritDmg: 150,
    summonEfficiency: 0,
    igniteChance: 0,
    chillChance: 0,
    freezeChance: 0,
    shockChance: 0,
    poisonChance: 0,
    uniquePoisonExtraStacks: 0,
    dotDamageScale: 1,
    dotDurationMultiplier: 1,
    rawResF: 80,
    rawResC: 60,
    rawResL: 40,
    runeResonancePower: 0,
    uniqueOverhealCapPct: 0,
  }, overrides);
}

function postStats(cardId, overrides) {
  resetGame();
  equip(cardId);
  const stats = preciseStats(overrides);
  context.applyTalentPrecisePostStats(stats);
  return stats;
}

function approximately(actual, expected, message, epsilon = 0.0001) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${message}: ${actual} !== ${expected}`);
}

resetGame();
equip('hero6__guardian');
let derived = context.getTalentPreciseDerivedBonuses({
  skill: { ele: 'phys', tags: ['attack', 'projectile'] }, armorPct: 40, aspdPct: 0,
  hpPct: 0, summonPct: 0, elementalPct: 0, firePct: 0, coldPct: 0, lightPct: 0, summonAspd: 0,
});
assert.strictEqual(derived.skillIncreasePct, 8, '철벽사수는 방어도 증가량의 20%를 투사체 피해 증가로 적용해야 한다');

resetGame();
equip('hero8__warrior');
derived = context.getTalentPreciseDerivedBonuses({
  skill: { ele: 'phys', tags: ['attack', 'melee'] }, armorPct: 40, aspdPct: 0,
  hpPct: 0, summonPct: 0, elementalPct: 0, firePct: 0, coldPct: 0, lightPct: 0, summonAspd: 0,
});
assert.strictEqual(derived.skillIncreasePct, 10, '가드 워리어는 방어도 증가량의 25%를 근접 피해 증가로 적용해야 한다');
assert.strictEqual(postStats('hero8__warrior').evasion, 0, '가드 워리어는 실제 회피 수치를 0으로 고정해야 한다');

resetGame();
equip('hero10__warrior');
derived = context.getTalentPreciseDerivedBonuses({
  skill: { ele: 'phys', tags: ['attack', 'physical'] }, armorPct: 40, aspdPct: 0,
  hpPct: 0, summonPct: 0, elementalPct: 0, firePct: 0, coldPct: 0, lightPct: 0, summonAspd: 0,
});
assert.strictEqual(derived.skillIncreasePct, 10, '강철술사는 방어도 증가량의 25%를 물리 피해 증가로 적용해야 한다');

resetGame();
equip('hero9__gladiator');
derived = context.getTalentPreciseDerivedBonuses({
  skill: { ele: 'fire', tags: ['attack', 'elemental', 'fire'] }, armorPct: 0, aspdPct: 20,
  hpPct: 0, summonPct: 0, elementalPct: 40, firePct: 0, coldPct: 0, lightPct: 0, summonAspd: 0,
});
assert.strictEqual(derived.skillIncreasePct, 5, '원소투사는 공격 속도 증가량의 25%를 원소 피해 증가로 적용해야 한다');
assert.strictEqual(derived.aspdIncreasePct, 6, '원소투사는 원소 피해 증가량의 15%를 공격 속도 증가로 적용해야 한다');

resetGame();
equip('hero7__ranger');
derived = context.getTalentPreciseDerivedBonuses({
  skill: { ele: 'phys', tags: ['attack'] }, armorPct: 0, aspdPct: 0,
  hpPct: 0, summonPct: 0, elementalPct: 0, firePct: 0, coldPct: 0, lightPct: 0, summonAspd: 40,
});
assert.strictEqual(derived.aspdIncreasePct, 6, '길동무 레인저는 소환수 공격 속도 증가량의 15%를 소프트캡 전 공격 속도에 적용해야 한다');
assert.strictEqual(postStats('hero7__ranger').summonAspd, 9, '길동무 레인저는 이동 속도 증가량의 30%를 소환수 공격 속도에 적용해야 한다');

assert.strictEqual(postStats('hero3__hunter').maxHp, 1080, '베어헌터는 최대 생명력을 8% 증폭해야 한다');
assert.strictEqual(postStats('hero3__hunter').baseDmg, 108, '베어헌터는 피해를 8% 증폭해야 한다');
assert.ok(postStats('hero3__warrior').baseDmg > 100, '버팔로혼은 방어도를 원소 피해 증가로 전환해야 한다');
approximately(postStats('hero4__ranger').ds, 9.6, '제피르러너는 이동 속도의 8%를 연속타격 확률로 적용해야 한다');

let stats = postStats('hero10__ranger');
assert.strictEqual(stats.evasion, 1100, '스모커는 지속 피해 배율의 20%를 회피 증가로 적용해야 한다');
assert.ok(stats.evadeChance < 50, '스모커의 최종 회피 확률은 변경된 회피 수치로 다시 계산해야 한다');
stats = postStats('hero8__assassin');
assert.strictEqual(stats.crit, 30, '문지기 살수는 막기와 비껴내기 합계의 25%를 치명타 확률로 적용해야 한다');
stats = postStats('hero6__ranger', { rawCrit: 140, crit: 140, rawCritDmg: 150, critDmg: 150 });
assert.ok(stats.critDmg > 150, '샤프슈터는 치명타 확률 초과분의 50%를 치명타 피해로 전환해야 한다');
stats = postStats('hero4__assassin', { rawCrit: 100, crit: 100, rawCritDmg: 150, critDmg: 150 });
assert.ok(stats.critDmg > 150, '그림자날은 치명타 확률 100% 이상에서 치명타 피해 +25%를 적용해야 한다');
stats = postStats('hero4__assassin', { rawCrit: 50, crit: 50, rawCritDmg: 150, critDmg: 150, dps: 100 });
approximately(stats.dps, 110, '그림자날의 행운 치명타 기대값이 표시 DPS에도 반영되어야 한다');

stats = postStats('hero4__crusader');
approximately(stats.energyShieldRegenRate, 12, '서약검사는 에너지 보호막 재생 속도를 20% 증가시켜야 한다');
approximately(stats.energyShieldRechargeDelay, 2.75, '서약검사는 에너지 보호막 재충전 시간을 0.25초 줄여야 한다');
approximately(stats.regen, 8, '서약검사는 생명력 회복 속도를 20% 줄여야 한다');
stats = postStats('hero8__soulbinder');
approximately(stats.regen, 8.5, '영혼닻은 생명력 재생을 15% 줄여야 한다');
assert.strictEqual(stats.talentSummonRegenPct, 2, '영혼닻은 소환수 생명력 재생 +2%를 적용해야 한다');
stats = postStats('hero10__crusader');
approximately(stats.energyShieldRegenRate, 12, '홀리 그레일은 에너지 보호막 재생 속도를 20% 증가시켜야 한다');
approximately(stats.energyShieldRechargeDelay, 2.8, '홀리 그레일은 에너지 보호막 재충전 시간을 0.2초 줄여야 한다');

stats = postStats('hero5__soulbinder');
approximately(stats.summonHpPct, 2.5, '소울플레저는 생명력 증가량의 10%를 소환수 생명력에 적용해야 한다');
approximately(stats.summonAspd, 2, '소울플레저는 공격 속도 증가량의 10%를 소환수 공격 속도에 적용해야 한다');
stats = postStats('hero7__warrior');
assert.strictEqual(stats.summonPctDmg, 4, '군단선봉장은 플레이어 피해 증가량의 20%를 소환수 피해에 적용해야 한다');
stats = postStats('hero7__guardian');
assert.strictEqual(stats.energyShield, 550, '성채소환사는 소환수 생명력 증가량의 20%를 에너지 보호막 증가로 적용해야 한다');
stats = postStats('hero10__soulbinder');
assert.strictEqual(stats.talentSummonRegenPct, 2, '포션 서플라이어는 플레이어 재생의 25%를 소환수 재생 보너스로 적용해야 한다');

stats = postStats('hero10__elementalist');
assert.strictEqual(stats.igniteChance, 14, '아조트 엘리멘탈리스트는 가장 높은 원소 피해 보너스의 20%를 상태이상 확률에 적용해야 한다');
assert.strictEqual(stats.shockChance, 14, '아조트 엘리멘탈리스트는 모든 원소 상태이상 확률을 같은 값만큼 올려야 한다');
stats = postStats('hero6__elementalist', { sSkill: { ele: 'fire', tags: ['attack', 'projectile', 'elemental', 'fire'] } });
assert.strictEqual(stats.igniteChance, 20, '오로라 스나이퍼는 원소 투사체 상태이상 확률을 20% 올려야 한다');
stats = postStats('hero4__catalyst', { dotDurationMultiplier: 1.4 });
approximately(stats.dotDamageScale, 1.4, '머큐리엣지는 지속시간 변화분을 상태이상 피해로 전환해야 한다');
assert.strictEqual(stats.dotDurationMultiplier, 1, '머큐리엣지는 상태이상 지속시간을 기준값으로 고정해야 한다');
assert.strictEqual(postStats('hero10__assassin').uniquePoisonExtraStacks, 1, '포이즌 어쌔신은 중독 최대 중첩을 1 늘려야 한다');

resetGame();
equip('hero5__assassin');
assert.strictEqual(context.getTalentDamageConversion('light', preciseStats()).element, 'chaos', '거역자는 번개 피해를 카오스 피해로 전환해야 한다');
resetGame();
equip('hero5__ranger');
let conversion = context.getTalentDamageConversion('phys', preciseStats({ sSkill: { ele: 'phys', tags: ['attack', 'physical'] } }));
assert.strictEqual(conversion.mainPct, 0.5, '순례자는 물리 피해 절반을 남겨야 한다');
assert.strictEqual(conversion.added.light, 50, '순례자는 나머지 절반을 번개 피해로 전환해야 한다');
resetGame();
equip('hero2__elementalist');
conversion = context.getTalentDamageConversion('phys', preciseStats({ sSkill: { ele: 'phys', tags: ['attack', 'physical'] } }));
assert.deepStrictEqual(JSON.parse(JSON.stringify(conversion.added)), { fire: 33, cold: 33, light: 33 }, '루나블레이즈는 물리 공격에 세 원소 피해를 각각 33% 추가해야 한다');
resetGame();
equip('hero9__warrior');
conversion = context.getTalentDamageConversion('phys', preciseStats({ sSkill: { ele: 'phys', tags: ['attack', 'physical'] } }));
assert.strictEqual(conversion.mainPct, 0, '웨폰인챈터는 비원소 본 피해를 제거해야 한다');
assert.deepStrictEqual(JSON.parse(JSON.stringify(conversion.added)), { fire: 15, cold: 15, light: 15 }, '웨폰인챈터는 세 원소 피해를 각각 15% 추가해야 한다');

resetGame();
equip('hero1__elementalist');
assert.strictEqual(context.getTalentAilmentReplacement('ignite'), 'scorch', '프리즈믹 아처는 점화를 그을림으로 바꿔야 한다');
assert.strictEqual(context.getTalentAilmentReplacement('freeze'), 'brittle', '프리즈믹 아처는 동결을 허약으로 바꿔야 한다');
assert.ok(Math.abs(context.getTalentBrittleCritRetryChance(50) - 0.30) < 1e-9,
    '기본 치명타가 실패한 뒤 허약의 +15%p를 정확히 만들려면 남은 확률에서 30%로 재판정해야 한다');
assert.strictEqual(context.getTalentAilmentReplacement('shock'), 'sap', '프리즈믹 아처는 감전을 활력감소로 바꿔야 한다');
resetGame();
equip('hero9__warlock');
assert.strictEqual(context.getTalentAilmentReplacement('ignite'), 'poison', '보이드는 원소 상태이상을 중독으로 바꿔야 한다');
resetGame();
equip('hero10__catalyst');
assert.strictEqual(context.canTalentCardApplyEnemyAilment('scorch'), false, '마그눔 오푸스는 대체 원소 상태이상도 차단해야 한다');
assert.strictEqual(context.canTalentCardApplyEnemyAilment('poison'), true, '마그눔 오푸스는 중독을 허용해야 한다');

resetGame();
equip('hero3__elementalist');
let target = enemy({ ailments: [] });
context.afterTalentAilmentApplied(target, 'ignite', preciseStats());
context.afterTalentAilmentApplied(target, 'freeze', preciseStats());
context.afterTalentAilmentApplied(target, 'shock', preciseStats());
assert.deepStrictEqual(target.ailments.map(row => row.type), ['warmSeed', 'frostSeed', 'stormSeed'], '브리지트는 세 원소 꽃씨를 각각 부여해야 한다');
approximately(context.getTalentEnemyTakenMul(target, 'fire', false), 1.2, '브리지트 세 꽃씨는 원소 피해를 20% 증폭해야 한다');

resetGame();
equip('hero4__elementalist');
target = enemy({ ailments: [{ type: 'shock', time: 2, power: 1 }] });
assert.strictEqual(context.enhanceTalentAilmentReapplication(target, target.ailments[0], 'shock', preciseStats()), true,
  '엘리멘탈엣지는 기존 원소 상태이상을 교체하지 않고 강화해야 한다');
approximately(target.ailments[0].power, 1.2, '엘리멘탈엣지는 기존 상태이상 효과를 20% 강화해야 한다');

resetGame();
equip('hero5__catalyst');
context.game.playerAilments = [{ type: 'shock', time: 2 }, { type: 'poison', time: 2 }];
context.afterTalentAilmentApplied(enemy(), 'shock', preciseStats());
assert.deepStrictEqual(context.game.playerAilments.map(row => row.type), ['poison'], '홀리알케미스트는 적에게 건 것과 같은 플레이어 상태이상을 제거해야 한다');

resetGame();
equip('hero3__catalyst');
target = enemy({ talentAilmentSeed: { type: 'ignite', damage: 75 } });
context.afterTalentAilmentApplied(target, 'poison', preciseStats());
assert.strictEqual(target.hp, 925, '시드그로워는 다른 상태이상 부여 시 저장된 남은 피해를 즉시 줘야 한다');
assert.strictEqual(target.talentAilmentSeed, undefined, '시드그로워 씨앗은 개화 후 소모되어야 한다');

resetGame();
equip('hero1__catalyst');
target = enemy({ hp: 100, ailments: [{ type: 'ignite', time: 2, sourceHitDamage: 100, power: 1, stacks: 1 }] });
assert.ok(context.getTalentDotOccupancyDamage(target, preciseStats()) >= 100, '스팅어는 남은 지속 피해 총량을 계산해야 한다');

resetGame();
equip('hero6__warlock');
target = enemy();
context.game.enemyConditionDebuffs = { 1: [{ expiresAt: Date.now() + 1000 }] };
assert.strictEqual(context.getTalentTargetPenetrationBonus(target), 6, '징표사수는 저주 대상 저항 관통 +6%를 적용해야 한다');
approximately(context.getTalentPrecisePlayerHitMultiplier(target, 'phys', preciseStats()), 1.18, '징표사수는 저주 대상 피해를 18% 증가시켜야 한다');
approximately(context.getTalentPrecisePlayerHitMultiplier(target, 'phys', preciseStats({ damageIncreasePct: 100 })), 1.09,
  '징표사수의 피해 증가는 기존 피해 증가 100%에 합산되어 총 218%가 되어야 한다');

resetGame();
equip('hero7__warlock');
context.game.enemyConditionDebuffs = { 1: [{ expiresAt: Date.now() + 1000 }] };
target = enemy();
approximately(context.getTalentDotDamageMultiplier(target), 1.25, '네더 호스트는 저주 대상 지속 피해를 25% 증폭해야 한다');
approximately(context.getTalentPrecisePlayerHitMultiplier(target, 'chaos', preciseStats()), 1.18, '네더 호스트는 저주 대상 카오스 피해를 18% 증가시켜야 한다');

resetGame();
equip('hero8__gladiator');
context.game.enemies = [enemy({ id: 1 }), enemy({ id: 2 })];
approximately(context.getTalentIncomingDamageMultiplier(context.game.enemies[0], preciseStats()), 0.9, '투기장의 제왕은 적 2명 이상에서 받는 피해를 10% 줄여야 한다');
approximately(context.getTalentPrecisePlayerHitMultiplier(context.game.enemies[0], 'fire', preciseStats({ sSkill: { ele: 'fire', tags: ['aoe', 'elemental', 'fire'] } })), 1.18,
  '투기장의 제왕은 적 2명 이상에서 범위 피해를 18% 증가시켜야 한다');

resetGame();
equip('hero9__inquisitor');
target = enemy({ ailments: [{ type: 'shock', time: 2 }] });
approximately(context.getTalentPrecisePlayerHitMultiplier(target, 'light', preciseStats({ damageIncreasePct: 100 })), 1.06,
  '정화의 번개는 감전 대상 피해 +12%를 기존 피해 증가 합계에 더해야 한다');

resetGame();
equip('hero8__hunter');
context.game.enemies = [enemy({ id: 1 }), enemy({ id: 2 }), enemy({ id: 3 })];
approximately(context.getTalentPrecisePlayerHitMultiplier(context.game.enemies[0], 'phys', preciseStats()), 1.16, '영역수호자는 적 3명 이상에서 피해를 16% 증폭해야 한다');
context.getTalentIncomingDamageMultiplier(context.game.enemies[0], preciseStats());
approximately(context.getTalentIncomingDamageMultiplier(context.game.enemies[1], preciseStats()), 0.84, '영역수호자는 직전과 다른 적의 공격 피해를 16% 줄여야 한다');

resetGame();
equip('hero5__assassin');
target = enemy({ talentHitByChaos: true });
approximately(context.getTalentEnemyRegenMultiplier(target), 0.5, '거역자는 카오스 피해를 준 적의 재생을 절반으로 줄여야 한다');
resetGame();
equip('hero10__inquisitor');
target = enemy({ isBoss: true, ailments: [{ type: 'brittle', time: 2 }] });
approximately(context.getTalentEnemyRegenMultiplier(target), 0.5, '시약심문관은 상태이상 보스의 재생을 절반으로 줄여야 한다');

resetGame();
equip('hero3__soulbinder');
assert.strictEqual(context.isTalentPlayerAttackDisabled(), true, '뿌리결속자는 플레이어 직접 공격을 막아야 한다');
resetGame();
equip('hero6__crusader');
stats = preciseStats({ energyShield: 1000 });
context.game.playerHp = 500;
context.game.playerEnergyShield = 0;
assert.strictEqual(context.getTalentPlayerLeechTarget('life'), 'energyShield', '신성사수는 흡혈 대상을 에너지 보호막으로 전환해야 한다');
context.applyInstantPlayerLeech(100, stats, context.getTalentPlayerLeechTarget('life'));
assert.strictEqual(context.game.playerHp, 500, '신성사수의 흡혈은 생명력을 회복하면 안 된다');
assert.ok(context.game.playerEnergyShield > 0, '신성사수의 흡혈은 에너지 보호막을 실제로 회복해야 한다');
resetGame();
equip('hero3__gladiator');
assert.strictEqual(context.isTalentMonsterAlwaysHit(), true, '숲마당 투사는 몬스터 공격도 반드시 명중하게 해야 한다');
resetGame();
equip('hero9__crusader');
context.game.playerHp = 500;
stats = preciseStats();
context.applyTalentPrecisePostStats(stats);
context.enforceTalentCombatState(stats);
assert.strictEqual(stats.maxHp, 1, '엘리멘탈 크루세이더는 최대 생명력을 1로 고정해야 한다');
assert.strictEqual(context.game.playerHp, 1, '엘리멘탈 크루세이더는 현재 생명력도 1을 넘지 못하게 해야 한다');

resetGame();
equip('hero3__guardian');
context.game.playerHp = 500;
context.addTalentMossBarkRecovery(100, 1000);
stats = preciseStats();
assert.strictEqual(context.getPlayerRecoveryHpCap(stats), 980, '이끼방패는 지연 회복량만큼 생명력 회복 상한을 점유해야 한다');
assert.strictEqual(context.processTalentMossBarkRecovery(stats, 3000), 20, '이끼방패는 2초 뒤 받은 피해의 20%를 회복해야 한다');

resetGame();
equip('hero3__crusader');
context.game.summons = [{ alive: true, hp: 50, maxHp: 100 }];
context.shareTalentPlayerRecoveryWithSummons(100);
assert.strictEqual(context.game.summons[0].hp, 70, '성목순례자는 플레이어 회복량의 20%를 소환수에게 적용해야 한다');

resetGame();
equip('hero4__inquisitor');
target = enemy({ atkMul: 1.4 });
assert.strictEqual(context.disableTalentFalseEnemyBuff(target), true, '트루스커터는 적 강화 효과 하나를 무효화해야 한다');
assert.strictEqual(target.atkMul, 1, '트루스커터는 선택한 공격 강화 효과를 중립값으로 되돌려야 한다');

resetGame();
equip('hero4__guardian');
context.recordTalentBlock();
approximately(context.getTalentCritDamageMultiplier(enemy(), true, preciseStats()), 1.12, '양날수호자는 막기 후 다음 치명타 피해를 12% 증폭해야 한다');
assert.strictEqual(context.getTalentCritDamageMultiplier(enemy(), true, preciseStats()), 1, '양날수호자의 납도 보너스는 한 번만 소비되어야 한다');

resetGame();
equip('hero1__crusader');
const originalRandom = context.Math.random;
context.Math.random = () => 0.9;
try {
  assert.strictEqual(context.getTalentLuckyDamageRoll(20, 10, 30, 'light'), 28, '십자궁병은 번개 피해 굴림 두 번 중 높은 값을 사용해야 한다');
} finally {
  context.Math.random = originalRandom;
}

resetGame();
equip('hero7__inquisitor');
stats = context.getPlayerStats();
assert.ok(stats.suppCap >= 3, '파문심문관의 보조 젬 한도 +1이 최종 전투 스탯에 반영되어야 한다');
assert.ok(stats.runeResonancePower >= 20, '파문심문관의 공명력 +20이 최종 전투 스탯에 반영되어야 한다');
resetGame();
equip('hero7__catalyst');
stats = context.getPlayerStats();
assert.ok(stats.summonEfficiency >= 25 && stats.summonCrit >= 5 && stats.summonCritDmg >= 25,
  '호문쿨루스의 소환수 효율·치명타·치명타 피해가 최종 전투 스탯에 반영되어야 한다');
resetGame();
equip('hero8__ranger');
stats = context.getPlayerStats();
assert.ok(stats.blockChance >= 8 && stats.deflectChance >= 8 && stats.deflectDamageReduce >= 3,
  '자경단의 막기·비껴내기 수치가 최종 방어 스탯에 반영되어야 한다');
resetGame();
equip('hero10__gladiator');
stats = context.getPlayerStats();
assert.ok(stats.sSkill.targets >= 2, '헤비플라스크의 스킬 타겟 수 +1이 최종 스킬에 반영되어야 한다');
assert.ok(stats.ds < 8, '헤비플라스크가 기본값 처리 오류로 연속타격 +8을 얻으면 안 된다');

console.log('smoke-talent-precise-effects passed');
