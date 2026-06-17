#!/usr/bin/env node
// Regression: base upgrades for weapons must stay within the same archetype
// (summon/projectile/spell/melee). A projectile weapon must never upgrade into a
// summoner weapon, and likewise for the other archetypes.
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
  extractFunction(itemsSource, 'getBaseUpgradeCandidates'),
  'this.BASE_ITEM_DB = BASE_ITEM_DB;',
  'this.getWeaponBaseArchetype = getWeaponBaseArchetype;',
  'this.getBaseUpgradeCandidates = getBaseUpgradeCandidates;',
].join('\n'), context);

const { BASE_ITEM_DB, getWeaponBaseArchetype, getBaseUpgradeCandidates } = context;

const weapons = BASE_ITEM_DB.filter(b => b.slot === '무기' && !b.dropOnly && !b.realmBase);
assert(weapons.length > 0, 'there should be weapon bases to test');

// Sanity: the classifier recognises every archetype we ship.
const archetypes = new Set(weapons.map(getWeaponBaseArchetype));
['summon', 'projectile', 'spell', 'melee'].forEach(a => assert(archetypes.has(a), `expected at least one ${a} weapon base`));

// Every weapon upgrade target keeps the source archetype, across the whole chain.
for (const base of weapons) {
  let current = base;
  let guard = 0;
  while (guard++ < 20) {
    let candidates = getBaseUpgradeCandidates(current);
    if (candidates.length === 0) break;
    let next = candidates[0];
    assert.strictEqual(
      getWeaponBaseArchetype(next),
      getWeaponBaseArchetype(base),
      `${base.name} (${getWeaponBaseArchetype(base)}) upgraded toward ${next.name} (${getWeaponBaseArchetype(next)}) — archetype changed`
    );
    assert(next.reqTier > current.reqTier, 'upgrade target must be a higher tier');
    current = next;
  }
}

// Specific case from the report: a projectile weapon whose exact signature has no
// higher-tier twin must still upgrade to a projectile weapon (not summon/melee).
const needle = BASE_ITEM_DB.find(b => b.id === 'needle_recurve');
assert(needle, 'needle_recurve base should exist');
const needleNext = getBaseUpgradeCandidates(needle)[0];
assert(needleNext, 'needle_recurve should have an upgrade target');
assert.strictEqual(getWeaponBaseArchetype(needleNext), 'projectile', `needle_recurve must upgrade to a projectile weapon, got ${needleNext.name}`);

// Non-weapon slots are unaffected: armour still matches by defense profile.
const leather = BASE_ITEM_DB.find(b => b.id === 'leather_vest');
if (leather) {
  const armourNext = getBaseUpgradeCandidates(leather)[0];
  if (armourNext) assert.strictEqual(armourNext.slot, '갑옷', 'armour upgrade stays in the same slot');
}

console.log('base upgrade archetype smoke checks passed');
