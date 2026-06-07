#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const itemSource = fs.readFileSync('data/items.js', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const utilsSource = fs.readFileSync('js/utils.js', 'utf8');

const context = { window: {}, console, Math };
vm.createContext(context);
vm.runInContext(itemSource, context);
const uniqueDb = context.window.UNIQUE_DB;
const firstContract = uniqueDb.find(unique => unique.name === '첫 계약');
const firstContractFlat = firstContract.stats.find(stat => stat.id === 'summonFlatDmg');
assert.strictEqual(firstContractFlat.min, 6, 'unique minimum stats must use the 1.5x multiplier');
assert.strictEqual(firstContractFlat.max, 12, 'unique maximum stats must use the 1.5x multiplier');
assert(!uniqueDb.some(unique => unique.stats.length === 3 || unique.stats.length === 4), 'all formerly 3-4 line uniques must have directly defined fifth/sixth options');
assert(!itemSource.includes('buildUniqueExtraStat'), 'runtime unique extra-option generation must be removed');
assert(!itemSource.includes('generatedExtra'), 'generated extra-option markers must be removed');
assert(!itemSource.includes('targetStatCount'), 'random unique option line-count selection must be removed');
assert(itemSource.includes('const UNIQUE_STAT_MULTIPLIER = 1.5;'), 'the global unique stat multiplier must remain 1.5x');

const baseStart = stateSource.indexOf('const BASE_ITEM_DB = [');
const baseEnd = stateSource.indexOf('\n];', baseStart);
assert(baseStart >= 0 && baseEnd > baseStart, 'base item database must be extractable');
const baseContext = {};
vm.createContext(baseContext);
vm.runInContext(`${stateSource.slice(baseStart, baseEnd + 3)}; this.BASE_ITEM_DB = BASE_ITEM_DB;`, baseContext);
const defenseSlots = new Set(['장갑', '갑옷', '투구', '신발', '방패']);
const defenseStats = new Set(['armor', 'evasion', 'energyShield']);
const missingDefense = baseContext.BASE_ITEM_DB.filter(base => defenseSlots.has(base.slot)
    && !(base.baseStats || []).some(stat => defenseStats.has(stat.id)));
assert.deepStrictEqual(Array.from(missingDefense, base => base.id), [], 'every armor and shield base must provide armor, evasion, or energy shield');

['armor', 'armorReduction', 'evasion', 'evadeChance', 'energyShield', 'deflectChance', 'deflectDamageReduce', 'blockChance', 'blockChanceMax'].forEach(statId => {
    assert(utilsSource.includes(`${statId}: { label:`), `item comparison metadata must include ${statId}`);
});

console.log('unique rebalance, defense base, and item comparison smoke checks passed');
