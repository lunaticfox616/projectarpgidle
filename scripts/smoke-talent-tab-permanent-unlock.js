#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const stateSource = fs.readFileSync('js/state.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  let depth = 0;
  let seenBody = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') {
      depth += 1;
      seenBody = true;
    } else if (ch === '}') {
      depth -= 1;
      if (seenBody && depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unable to extract ${name}`);
}

const context = { Object, Array, Math, Number };
vm.createContext(context);
vm.runInContext([
  extractFunction(stateSource, 'hasPermanentTalentTabUnlock'),
  extractFunction(stateSource, 'syncPermanentTalentTabUnlock'),
  'this.hasPermanentTalentTabUnlock = hasPermanentTalentTabUnlock;',
  'this.syncPermanentTalentTabUnlock = syncPermanentTalentTabUnlock;'
].join('\n'), context);

assert.strictEqual(context.hasPermanentTalentTabUnlock({}), false, 'empty state must not unlock the talent tab');
assert.strictEqual(context.hasPermanentTalentTabUnlock({ talentBloomClears: 1 }), true, 'a prior bloom clear must permanently unlock the talent tab');
assert.strictEqual(context.hasPermanentTalentTabUnlock({ talentBloomCombos: ['hero1__warrior'] }), true, 'legacy combo records must permanently unlock the talent tab');
assert.strictEqual(context.hasPermanentTalentTabUnlock({ bloomedClasses: ['warrior'] }), true, '5th-class bloom records must permanently unlock the talent tab');
assert.strictEqual(context.hasPermanentTalentTabUnlock({ talentCards: { hero1__warrior: { level: 1 } } }), true, 'owned talent cards must permanently unlock the talent tab');

const loadedSave = { unlocks: { talent: false }, talentCards: { hero1__warrior: { level: 1 } } };
assert.strictEqual(context.syncPermanentTalentTabUnlock(loadedSave), loadedSave, 'unlock sync must mutate and return the same game state object');
assert.strictEqual(loadedSave.unlocks.talent, true, 'unlock sync must restore the talent tab when cards persisted but unlock flags reset');

const lockedState = { unlocks: { talent: false } };
context.syncPermanentTalentTabUnlock(lockedState);
assert.strictEqual(lockedState.unlocks.talent, false, 'unlock sync must not open the talent tab before any bloom evidence exists');

assert(uiSource.includes("if (typeof syncPermanentTalentTabUnlock === 'function') syncPermanentTalentTabUnlock(merged);"), 'save normalization must restore permanent talent tab unlocks on load');
assert(combatSource.includes("if (typeof syncPermanentTalentTabUnlock === 'function') syncPermanentTalentTabUnlock(game);"), 'loop reset must restore permanent talent tab unlocks after resetting unlock flags');

console.log('talent tab permanent unlock smoke checks passed');
