#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const passivesSource = fs.readFileSync('js/passives.js', 'utf8');

assert(passivesSource.includes('let trialKeyChance = enemy.isBoss ? 0.015 : (enemy.isElite ? 0.001 : 0);'), 'trial retry ticket drop rates must stay at boss 1.5% and elite 0.1%');

function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert(match, `${name} must exist`);
  return match[0];
}

function createSandbox(zone, unlockedTrials = ['trial_3']) {
  const math = Object.create(Math);
  math.random = () => 0;
  return {
    Math: math,
    ABYSS_START_ZONE_ID: 11,
    game: {
      currentZoneId: zone.id,
      maxZoneId: 20,
      season: 2,
      unlockedTrials,
      completedTrials: []
    },
    getZone() { return zone; },
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

let abyssSandbox = createSandbox({ id: 15, type: 'abyss' });
loadDropsRuntime(abyssSandbox);
let bossDrops = abyssSandbox.getCurrencyDrops({ isBoss: true, isElite: false, dropMul: 1 });
assert(bossDrops.some(drop => drop[0] === 'trialKey3' && drop[1] === 1), 'bosses after high-tier trial unlock should be able to drop a trial retry ticket');

let eliteSandbox = createSandbox({ id: 15, type: 'abyss' });
loadDropsRuntime(eliteSandbox);
let eliteDrops = eliteSandbox.getCurrencyDrops({ isBoss: false, isElite: true, dropMul: 1 });
assert(eliteDrops.some(drop => drop[0] === 'trialKey3' && drop[1] === 1), 'elites after high-tier trial unlock should be able to drop a trial retry ticket');

let lockedSandbox = createSandbox({ id: 15, type: 'abyss' }, []);
loadDropsRuntime(lockedSandbox);
let lockedDrops = lockedSandbox.getCurrencyDrops({ isBoss: true, isElite: false, dropMul: 1 });
assert(!lockedDrops.some(drop => drop[0] === 'trialKey3'), 'trial retry tickets should not drop before 3rd/4th trial access exists');

let trialSandbox = createSandbox({ id: 'trial_3', type: 'trial' });
loadDropsRuntime(trialSandbox);
let trialDrops = trialSandbox.getCurrencyDrops({ isBoss: true, isElite: false, dropMul: 1 });
assert(!trialDrops.some(drop => drop[0] === 'trialKey3'), 'trial retry tickets should not refund themselves inside trial zones');

console.log('trial retry ticket drop smoke checks passed');
