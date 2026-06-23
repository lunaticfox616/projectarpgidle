#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
assert(passivesSource.includes('enemy.isElite ? 0.000825 : 0.0001375'), 'normal/elite divine drop rates must be direct real values, not multipliers');
assert(!passivesSource.includes('0.00055 * 0.25') && !passivesSource.includes('0.0011 * 0.75'), 'divine drop rates must not be expressed as multiplier wrappers');

function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert(match, `${name} must exist`);
  return match[0];
}

function createSandbox(randomValues) {
  let index = 0;
  const math = Object.create(Math);
  math.random = () => (index < randomValues.length ? randomValues[index++] : 0.99);
  return {
    Math: math,
    ABYSS_START_ZONE_ID: 11,
    game: {
      currentZoneId: 0,
      maxZoneId: 0,
      season: 1,
      unlockedTrials: [],
      completedTrials: []
    },
    getZone() { return { id: 0, type: 'act', tier: 1, maxKills: 10, ele: 'phys' }; },
    getCodexBonusPct() { return 0; },
    getAbyssMonsterScales() { return { dropMul: 1, bossExtraCurrencyChance: 0 }; },
    rndChoice(list) { return list[0]; }
  };
}

function loadDropsRuntime(sandbox) {
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction(passivesSource, 'getMappingTicketDrops'),
    extractFunction(passivesSource, 'getCurrencyDrops'),
    'this.getCurrencyDrops = getCurrencyDrops;'
  ].join('\n'), sandbox);
}

function currencyDropsFor(enemy, randomValues) {
  const sandbox = createSandbox(randomValues);
  loadDropsRuntime(sandbox);
  return sandbox.getCurrencyDrops(enemy).map(drop => drop[0]);
}

const normalDropsAtNewChance = currencyDropsFor({ isBoss: false, isElite: false, dropMul: 1 }, [0.99, 0.00013, 0.99, 0.99]);
assert(normalDropsAtNewChance.includes('divine'), 'normal monsters must drop divine at the new 0.01375% threshold');
const normalDropsAboveNewChance = currencyDropsFor({ isBoss: false, isElite: false, dropMul: 1 }, [0.99, 0.00014, 0.99, 0.99]);
assert(!normalDropsAboveNewChance.includes('divine'), 'normal monsters must not keep the old 0.055% divine threshold');

const eliteDropsAtNewChance = currencyDropsFor({ isBoss: false, isElite: true, dropMul: 1 }, [0.99, 0.99, 0.99, 0.00082, 0.99, 0.99]);
assert(eliteDropsAtNewChance.includes('divine'), 'elite monsters must drop divine at the new 0.0825% threshold');
const eliteDropsAboveNewChance = currencyDropsFor({ isBoss: false, isElite: true, dropMul: 1 }, [0.99, 0.99, 0.99, 0.00083, 0.99, 0.99]);
assert(!eliteDropsAboveNewChance.includes('divine'), 'elite monsters must not keep the old 0.11% divine threshold');

console.log('divine drop rate smoke checks passed');
