#!/usr/bin/env node
// Regression for three base-upgrade bugs reported in-game:
//   1) 반지 체인이 하나로 뭉쳐 소환사 반지가 일반 반지 체인에 섞이는 문제.
//   2) 일부 방어구(월광 두건 등)가 어떤 체인에도 속하지 않던(고립) 문제.
//   3) 베이스 업그레이드가 부가 옵션 정체성을 바꾸던 문제(물리 피해 감소 -> 카오스 저항).
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const stateSource = fs.readFileSync('js/state.js', 'utf8');
const itemsSource = fs.readFileSync('js/items.js', 'utf8');

function extractBlock(source, startToken, endToken) {
  const start = source.indexOf(startToken);
  assert(start >= 0, `${startToken} must exist`);
  const end = source.indexOf(endToken, start);
  assert(end >= 0, `${endToken} must follow ${startToken}`);
  return source.slice(start, end + endToken.length);
}
function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert(match, `${name} must exist`);
  return match[0];
}

const context = {};
vm.createContext(context);
vm.runInContext([
  extractBlock(stateSource, 'const BASE_ITEM_DB = [', '];'),
  extractFunction(itemsSource, 'getBaseDefenseProfile'),
  extractFunction(itemsSource, 'getBaseSecondaryStatSignature'),
  extractFunction(itemsSource, 'getWeaponBaseArchetype'),
  extractFunction(itemsSource, 'getBaseBuildArchetype'),
  extractFunction(itemsSource, 'getBaseUpgradeCandidates'),
  'let _baseChainInfoCache = null;',
  extractFunction(itemsSource, 'buildBaseChainInfoCache'),
  extractFunction(itemsSource, 'getBaseChainInfo'),
  'this.BASE_ITEM_DB = BASE_ITEM_DB;',
  'this.getBaseDefenseProfile = getBaseDefenseProfile;',
  'this.getBaseBuildArchetype = getBaseBuildArchetype;',
  'this.getBaseUpgradeCandidates = getBaseUpgradeCandidates;',
  'this.getBaseChainInfo = getBaseChainInfo;',
].join('\n'), context);

const { BASE_ITEM_DB, getBaseDefenseProfile, getBaseBuildArchetype, getBaseUpgradeCandidates, getBaseChainInfo } = context;
const ARMOR_SLOTS = ['투구','갑옷','장갑','신발','방패'];
const pool = BASE_ITEM_DB.filter(b => b && b.id && !b.dropOnly && !b.realmBase);
const secondaryOf = base => new Set(
  (base.baseStats || []).map(s => s.id).filter(id => {
    const core = { 무기: ['flatDmg'], 허리띠: ['flatHp'] }[base.slot] || [];
    const armorCore = ['투구','갑옷','장갑','신발','방패'].includes(base.slot)
      ? ['flatHp','armor','evasion','energyShield','aspd','move','baseBlockChance'] : [];
    return !core.includes(id) && !armorCore.includes(id);
  })
);

// Bug 1: every upgrade keeps the same build archetype across the whole chain,
//        so a summon ring can never become a non-summon ring (and vice versa).
for (const base of pool) {
  let current = base;
  let guard = 0;
  while (guard++ < 30) {
    const next = getBaseUpgradeCandidates(current)[0];
    if (!next) break;
    assert.strictEqual(
      getBaseBuildArchetype(next), getBaseBuildArchetype(base),
      `${base.name}(${getBaseBuildArchetype(base)}) -> ${next.name}(${getBaseBuildArchetype(next)}) changed build archetype`
    );
    current = next;
  }
}

// Bug 1 (specific): the summoner ring line must stay summon-only.
const summonerLoop = BASE_ITEM_DB.find(b => b.id === 'summoner_loop');
assert(summonerLoop, 'summoner_loop base should exist');
const summonerNext = getBaseUpgradeCandidates(summonerLoop)[0];
assert(summonerNext, 'summoner_loop should have an upgrade');
assert.strictEqual(getBaseBuildArchetype(summonerNext), 'summon', `소환사의 고리 must upgrade into a summon ring, got ${summonerNext.name}`);

// Bug 1 (specific): a plain ring must not upgrade into a summoner ring.
const copper = BASE_ITEM_DB.find(b => b.id === 'copper_ring');
const copperNext = getBaseUpgradeCandidates(copper)[0];
assert(copperNext, 'copper_ring should have an upgrade');
assert.strictEqual(getBaseBuildArchetype(copperNext), 'generic', `구리 반지 must not upgrade into a summon ring, got ${copperNext.name}`);

// Bug 3: an upgrade preserves every secondary (identity) stat of the source base.
const warBelt = BASE_ITEM_DB.find(b => b.id === 'war_belt'); // 전사의 허리띠: 물리 피해 감소(dr)
const warBeltNext = getBaseUpgradeCandidates(warBelt)[0];
assert(warBeltNext, '전사의 허리띠 should have an upgrade');
assert(secondaryOf(warBeltNext).has('dr'), `전사의 허리띠(dr) upgrade must keep dr, got ${warBeltNext.name} [${[...secondaryOf(warBeltNext)]}]`);

// General invariant for bug 3: whenever a same-identity higher base exists, the upgrade keeps it.
// Armour is excluded — its identity is the defense profile, so it ladders by tier regardless
// of which resistance a base happens to carry.
for (const base of pool) {
  if (ARMOR_SLOTS.includes(base.slot)) continue;
  const sec = secondaryOf(base);
  if (sec.size === 0) continue;
  const next = getBaseUpgradeCandidates(base)[0];
  if (!next) continue;
  // Mirror getBaseUpgradeCandidates' filters: slot, higher tier, same archetype,
  // and (for armour/shield slots) the same defense profile.
  const preservingExists = pool.some(b => b.slot === base.slot && b.reqTier > base.reqTier
    && getBaseBuildArchetype(b) === getBaseBuildArchetype(base)
    && (!ARMOR_SLOTS.includes(base.slot) || getBaseDefenseProfile(b) === getBaseDefenseProfile(base))
    && [...sec].every(id => secondaryOf(b).has(id)));
  if (preservingExists) {
    const ns = secondaryOf(next);
    assert([...sec].every(id => ns.has(id)),
      `${base.name} [${[...sec]}] -> ${next.name} [${[...ns]}] dropped an identity stat though a preserving upgrade exists`);
  }
}

// 완전히 다른 부옵션을 가진 베이스끼리는 한 체인으로 묶지 않는다.
// (방어구는 방어 프로파일이 정체성이므로 저항만 다른 경우는 예외로 둔다.)
for (const base of pool) {
  if (ARMOR_SLOTS.includes(base.slot)) continue;
  const sec = secondaryOf(base);
  if (sec.size === 0) continue;
  const next = getBaseUpgradeCandidates(base)[0];
  if (!next) continue;
  const ns = secondaryOf(next);
  assert([...sec].some(id => ns.has(id)),
    `${base.name} [${[...sec]}] -> ${next.name} [${[...ns]}] share no sub-option (completely different bases must not chain)`);
}

// Bug 2: no upgradeable base is isolated — every base belongs to a chain of length >= 2.
const isolated = pool.filter(b => getBaseChainInfo(b).total === 1);
assert.strictEqual(isolated.length, 0, `isolated bases (no chain): ${isolated.map(b => b.name).join(', ')}`);

// Bug 2 (specific): previously-stranded bases now sit inside a real chain.
for (const id of ['moonveil_hood', 'astral_robe', 'iron_tread', 'nightmare_bind']) {
  const base = BASE_ITEM_DB.find(b => b.id === id);
  assert(base, `${id} should exist`);
  assert(getBaseChainInfo(base).total >= 2, `${base.name} must belong to a multi-step chain`);
}

// Every armour base type (slot × defense profile) forms a clean 6-step upgrade chain.
const PROFILES = ['armor', 'evasion', 'energyShield', 'armor+evasion', 'armor+energyShield', 'evasion+energyShield'];
for (const slot of ARMOR_SLOTS) {
  const bySlot = pool.filter(b => b.slot === slot);
  for (const prof of PROFILES) {
    const group = bySlot.filter(b => getBaseDefenseProfile(b) === prof);
    assert(group.length > 0, `${slot} [${prof}] should have bases`);
    const maxTotal = Math.max(...group.map(b => getBaseChainInfo(b).total));
    assert.strictEqual(maxTotal, 6, `${slot} [${prof}] chain must be exactly 6 deep, got ${maxTotal}`);
    // The chain must span the canonical tier ladder.
    const tiers = new Set(group.map(b => b.reqTier));
    for (const t of [1, 4, 8, 12, 16, 20]) {
      assert(tiers.has(t), `${slot} [${prof}] missing a base at tier ${t}`);
    }
  }
}

console.log('base upgrade identity smoke checks passed');
