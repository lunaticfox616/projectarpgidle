#!/usr/bin/env node
// Regression: base upgrade chains get a per-base step number (step/total).
// step is the 1-based position from the bottom of the chain, total is the length
// of the longest chain passing through the base. Branch merges use the longest path.
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
  'this.getBaseUpgradeCandidates = getBaseUpgradeCandidates;',
  'this.getBaseChainInfo = getBaseChainInfo;',
].join('\n'), context);

const { BASE_ITEM_DB, getBaseUpgradeCandidates, getBaseChainInfo } = context;
const pool = BASE_ITEM_DB.filter(b => b && b.id && !b.dropOnly && !b.realmBase);
assert(pool.length > 0, 'there should be upgradeable bases');

// Invariant 1: every base has a valid step within its chain.
let chainsExist = false;
for (const base of pool) {
  const info = getBaseChainInfo(base);
  assert(info, `${base.name} should have chain info`);
  assert(info.step >= 1, `${base.name} step must be >= 1`);
  assert(info.total >= info.step, `${base.name} total (${info.total}) must be >= step (${info.step})`);
  if (info.total > 1) chainsExist = true;
}
assert(chainsExist, 'at least one multi-step upgrade chain must exist');

// Invariant 2: the bottom of a chain (no predecessor) is step 1; the top (no successor) is step === total.
for (const base of pool) {
  const info = getBaseChainInfo(base);
  const next = getBaseUpgradeCandidates(base)[0];
  if (!next) assert.strictEqual(info.step, info.total, `${base.name} is a chain top, so step must equal total`);
}

// Invariant 3: each primary upgrade strictly increases the step number.
for (const base of pool) {
  const next = getBaseUpgradeCandidates(base)[0];
  if (!next) continue;
  const info = getBaseChainInfo(base);
  const nextInfo = getBaseChainInfo(next);
  assert(nextInfo.step >= info.step + 1, `${base.name}(${info.step}) -> ${next.name}(${nextInfo.step}) must advance the step`);
  assert(getBaseChainInfo(base).total >= 2, `${base.name} has an upgrade, so its chain total must be >= 2`);
}

// Specific case: the basic melee sword line should number the entry sword as step 1.
const rusted = BASE_ITEM_DB.find(b => b.id === 'rusted_blade');
if (rusted) {
  const info = getBaseChainInfo(rusted);
  assert.strictEqual(info.step, 1, 'rusted_blade is the bottom of its melee chain (step 1)');
  assert(info.total > 1, 'rusted_blade should belong to a multi-step chain');
}

console.log('base chain tier smoke checks passed');
