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
    talentSourceStats: { elementalPct: 30, firePct: 40, coldPct: 20, lightPct: 10, summonPct: 35 },
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

let stats = postStats('hero6__ranger', { rawCrit: 140, crit: 140, rawCritDmg: 150, critDmg: 150 });
assert.ok(stats.critDmg > 150, '샤프슈터는 치명타 확률 초과분의 50%를 치명타 피해로 전환해야 한다');
stats = postStats('hero4__assassin', { rawCrit: 100, crit: 100, rawCritDmg: 150, critDmg: 150 });
assert.ok(stats.critDmg > 150, '그림자날은 치명타 확률 100% 이상에서 치명타 피해 +25%를 적용해야 한다');
stats = postStats('hero4__assassin', { rawCrit: 50, crit: 50, rawCritDmg: 150, critDmg: 150, dps: 100 });
approximately(stats.dps, 110, '그림자날의 행운 치명타 기대값이 표시 DPS에도 반영되어야 한다');
stats = postStats('hero9__soulbinder');
approximately(stats.summonPctDmg, 3, '별혼술사는 원소 피해 증가량의 10%를 소환수 피해에 적용해야 한다');

resetGame();
equip('hero9__soulbinder');
let derived = context.getTalentPreciseDerivedBonuses({ skill: { ele: 'fire', tags: ['attack', 'elemental', 'fire'] },
  summonPct: 35, firePct: 40, coldPct: 20, lightPct: 10 });
approximately(derived.skillIncreasePct, 7, '별혼술사는 소환수 피해 증가량의 20%를 원소 스킬 피해 증가로 적용해야 한다');
derived = context.getTalentPreciseDerivedBonuses({ skill: { ele: 'phys', tags: ['attack'] }, summonPct: 35, firePct: 0, coldPct: 0, lightPct: 0 });
assert.strictEqual(derived.skillIncreasePct, 0, '원소가 아닌 스킬에는 별혼술사의 피해 증가가 없어야 한다');

resetGame();
equip('hero5__assassin');
assert.strictEqual(context.getTalentDamageConversion('light').element, 'chaos', '거역자는 번개 피해를 카오스 피해로 전환해야 한다');
resetGame();
equip('hero5__ranger');
let conversion = context.getTalentDamageConversion('phys');
assert.strictEqual(conversion.mainPct, 0.5, '순례자는 물리 피해 절반을 남겨야 한다');
assert.strictEqual(conversion.added.light, 50, '순례자는 나머지 절반을 번개 피해로 전환해야 한다');

resetGame();
equip('hero9__warlock');
assert.strictEqual(context.getTalentAilmentReplacement('ignite'), 'poison', '보이드는 원소 상태이상을 중독으로 바꿔야 한다');
assert.strictEqual(context.shouldTalentSkipColdFreeze(), true, '보이드는 냉기 동결 판정을 건너뛰어야 한다');
approximately(context.getTalentPrecisePlayerHitMultiplier('chaos'), 1.1, '보이드는 카오스 피해를 10% 증폭해야 한다');
assert.strictEqual(context.getTalentPrecisePlayerHitMultiplier('fire'), 1, '보이드의 피해 증폭은 카오스 피해에만 붙어야 한다');
approximately(context.getTalentDotDamageMultiplier(), 1.1, '보이드는 지속 피해를 10% 증폭해야 한다');
resetGame();
assert.strictEqual(context.getTalentAilmentReplacement('ignite'), 'ignite', '카드가 없으면 상태이상을 바꾸지 않아야 한다');
assert.strictEqual(context.getTalentPrecisePlayerHitMultiplier('chaos'), 1, '카드가 없으면 피해 배율은 1이어야 한다');
resetGame();
equip('hero10__catalyst');
assert.strictEqual(context.canTalentCardApplyEnemyAilment('scorch'), false, '마그눔 오푸스는 대체 원소 상태이상도 차단해야 한다');
assert.strictEqual(context.canTalentCardApplyEnemyAilment('poison'), true, '마그눔 오푸스는 중독을 허용해야 한다');

resetGame();
equip('hero1__hunter');
context.game.enemies = [enemy({ id: 1 })];
approximately(context.getTalentCritDamageMultiplier(true), 1.12, '더블헌터는 적이 하나일 때 치명타 피해를 12% 증폭해야 한다');
assert.strictEqual(context.getTalentCritDamageMultiplier(false), 1, '치명타가 아니면 배율이 없어야 한다');
context.game.enemies = [enemy({ id: 1 }), enemy({ id: 2 })];
assert.strictEqual(context.getTalentCritDamageMultiplier(true), 1, '적이 둘 이상이면 더블헌터 배율이 없어야 한다');

resetGame();
equip('hero3__catalyst');
let target = enemy({ talentAilmentSeed: { type: 'ignite', damage: 75 } });
context.afterTalentAilmentApplied(target, 'poison');
assert.strictEqual(target.hp, 925, '시드그로워는 다른 상태이상 부여 시 저장된 남은 피해를 즉시 줘야 한다');
assert.strictEqual(target.talentAilmentSeed, undefined, '시드그로워 씨앗은 개화 후 소모되어야 한다');

resetGame();
equip('hero1__catalyst');
target = enemy({ hp: 100, ailments: [{ type: 'ignite', time: 2, sourceHitDamage: 100, power: 1, stacks: 1 }] });
assert.ok(context.getTalentDotOccupancyDamage(target, preciseStats()) >= 100, '스팅어는 남은 지속 피해 총량을 계산해야 한다');

resetGame();
equip('hero5__assassin');
target = enemy({ talentHitByChaos: true });
approximately(context.getTalentEnemyRegenMultiplier(target), 0.5, '거역자는 카오스 피해를 준 적의 재생을 절반으로 줄여야 한다');
assert.strictEqual(context.getTalentEnemyRegenMultiplier(enemy()), 1, '카오스 피해를 받지 않은 적의 재생은 그대로여야 한다');

resetGame();
equip('hero3__soulbinder');
assert.strictEqual(context.isTalentPlayerAttackDisabled(), true, '뿌리결속자는 플레이어 직접 공격을 막아야 한다');
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

// 2026-10-02 재능 정리: 지운 옛 카드는 정의도, 장착돼 있어도 켜지는 효과도 없다.
resetGame();
equip('hero8__hunter');
assert.strictEqual(vm.runInContext("typeof TALENT_BLOOM_CARD_DEFS.hero8__hunter", context), 'undefined', '지운 옛 카드는 정의가 없어야 한다');
stats = postStats('hero8__hunter');
assert.strictEqual(stats.regen, 10, '지운 옛 카드는 장착 기록이 남아 있어도 능력치를 바꾸지 않아야 한다');
assert.strictEqual(vm.runInContext("typeof getTalentIncomingDamageMultiplier", context), 'undefined', '지운 옛 카드의 효과 함수는 남지 않아야 한다');

console.log('smoke-talent-precise-effects passed');
