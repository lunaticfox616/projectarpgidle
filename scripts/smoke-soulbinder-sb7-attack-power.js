#!/usr/bin/env node
// Verifies Soulbinder '상호 보완'(sb7) shares *attack power* (flat per-hit base damage) in both
// directions, while staying free of any player<->summon feedback loop.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync('js/combat.js', 'utf8');
const state = fs.readFileSync('js/state.js', 'utf8');

function fn(name) {
  const re = new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}', 'm');
  const m = src.match(re);
  assert(m, 'missing function ' + name);
  return m[0];
}

// The old %-stat proxy fields must be gone; the new attack-power field must be wired through.
assert(!src.includes('sbPlayerDamageFromSummonPct'), 'old %-based summon→player field must be removed');
assert(!src.includes('sbSummonDamageFromPlayerPct'), 'old %-based player→summon field must be removed');
assert(src.includes('sbPlayerAttackPower'), 'new attack-power field must exist');
assert(src.includes('getRepresentativeSummonAttackPower'), 'representative summon attack power helper must exist');
assert(state.includes("name: '상호 보완', desc: '플레이어 공격력"), 'keystone description must describe attack-power sharing');

// The shared values must be surfaced in the character-tab attack-power, DPS, and summon-DPS tooltips.
assert(src.includes('상호 보완: 소환수 공격력 ${Math.floor(sbSummonAttackPower)}의 50% → 기본 피해 +'),
  'attack power tooltip must show the summon→player share');
assert(src.includes('상호 보완: 내 공격력 ${Math.floor(sbPlayerAttackPower)}의 50%'),
  'attack power tooltip must show the player→summon transfer');
assert(src.includes('상호 보완: 소환수 공격력 공유로 기본 피해 +${Math.floor(sbSummonShareToPlayer)} 반영 (DPS 포함)'),
  'DPS tooltip must note the sb7 contribution');
assert(src.includes('상호 보완: 내 공격력 ${Math.floor(pStats.sbPlayerAttackPower)}의 50%'),
  'summon DPS breakdown must note the player attack power added per summon hit');

const names = ['getSummonProfile', 'getSummonScaledBaseDamage', 'getAttackSummonGrowthSteps', 'getSummonLevelGrowthSteps',
  'getRepresentativeSummonAttackPower', 'getSummonGemLevel', 'getTargetGemBonusSources',
  'getEquippedJewelGemLevelBonusSources', 'hasEmptyThroneSoloBonus', 'getLimitedSummonPenetrationStats',
  'getLimitedSummonFinalDamageMultiplier', 'getLimitedSummonBossDamageMultiplier',
  'getSummonSharedDamageIncreasePct', 'getSummonHitDamageInfo'];

const ctx = {
  Math, Date, Array, Object, Number, JSON, console,
  SKILL_DB: { '서리늑대 소환': { isGem: true, tags: ['summon', 'summon_attack', 'cold'] } },
  SUPPORT_GEM_DB: {},
  TAGGED_DAMAGE_STAT_BY_TAG: { cold: 'coldPctDmg' },
  game: {
    ascendClass: 'soulbinder', currentZoneId: 0, enemies: [],
    equippedSummonSkills: ['서리늑대 소환'],
    gemData: { '서리늑대 소환': { level: 10, exp: 0 } },
    supportGemData: {}, skyGemEnhancements: {}, equipment: {}, jewelSlots: [], jewelSlotAmplify: []
  },
  getZone: () => ({ id: 0, tier: 5 }),
  hasKeystone: (k) => ctx.__ks.includes(k),
  getGemBonusSources: () => ({ gear: 0, passive: 0, reward: 0, total: 0 }),
  getGemLevelTargetTags: () => ['summon_attack'],
  getJewelStats: () => [],
  getEquippedUniqueJewels: () => [],
  getEnemyConditionDebuffFactor: () => ({ mul: 1 }),
  getEffectiveEnemyMitigation: () => 0,
  getAbyssMonsterScales: () => ({ playerDamageMul: 1 }),
  getKeystoneEnemyTakenMultiplier: () => 1,
  addBattleFx: () => {}, addEvasionCombatLog: () => {}
};
ctx.__ks = ['sb7'];
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(names.map(fn).join('\n') +
  '\nthis.getSummonHitDamageInfo = getSummonHitDamageInfo; this.getRepresentativeSummonAttackPower = getRepresentativeSummonAttackPower;', ctx);

function stats(extra) {
  return Object.assign({
    summonCap: 8, summonPctDmg: 0, summonEfficiency: 0, summonCrit: 0, summonCritDmg: 0,
    summonFlatDmg: 0, summonAspd: 0, summonResPen: 0, resPen: 0, physIgnore: 0, finalDamageMultiplier: 1,
    bossDamageDealtMultiplier: 1, summonSharedPctDmg: 0, summonSharedTaggedPctDmg: {}, sbPlayerAttackPower: 0,
    gemBonusSources: { total: 0 }
  }, extra || {});
}
const summon = { gemName: '서리늑대 소환', ele: 'cold', baseDamage: 1000, attackSpeedMul: 1, resPenBonus: 0, physIgnoreBonus: 0, crit: 0, critDmg: 140 };

// Player → Summon: summon hit gains flat 50% of player attack power (added pre-crit, so it scales
// with the same crit expectation as the base hit). base 1000 + 0.5*2000 share => exactly 2x base.
const noShare = ctx.getSummonHitDamageInfo(summon, stats(), null, { expected: true }).damage;
const withShare = ctx.getSummonHitDamageInfo(summon, stats({ sbPlayerAttackPower: 2000 }), null, { expected: true }).damage;
assert.strictEqual(withShare, noShare * 2, 'summon must gain flat 0.5 * player attack power (pre-crit)');

// Without sb7 the field is ignored.
ctx.__ks = [];
assert.strictEqual(ctx.getSummonHitDamageInfo(summon, stats({ sbPlayerAttackPower: 2000 }), null, { expected: true }).damage, noShare,
  'no sb7 means no player→summon attack power share');
ctx.__ks = ['sb7'];

// Summon → Player: representative summon attack power is positive and scales with summon stats.
const repLow = ctx.getRepresentativeSummonAttackPower(stats({ summonPctDmg: 0 }));
const repHigh = ctx.getRepresentativeSummonAttackPower(stats({ summonPctDmg: 200 }));
assert(repLow > 0, 'representative summon attack power must be positive');
assert(repHigh > repLow, 'summon attack power must scale with summon %damage');

// Loop-free: summon attack power must not depend on the player complement field.
const repA = ctx.getRepresentativeSummonAttackPower(stats({ summonPctDmg: 100, sbPlayerAttackPower: 0 }));
const repB = ctx.getRepresentativeSummonAttackPower(stats({ summonPctDmg: 100, sbPlayerAttackPower: 999999 }));
assert.strictEqual(repA, repB, 'summon attack power must be independent of player complement (no feedback loop)');

console.log('soulbinder sb7 attack-power sharing smoke checks passed');
