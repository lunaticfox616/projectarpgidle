#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/combat.js', 'utf8');
const constantsStart = source.indexOf('const WOODSMAN_PHASE_OLD_FINAL_PROGRESS');
const functionStart = source.indexOf('function getWoodsmanPhaseProgress');
const functionEnd = source.indexOf('\n}\n\nfunction startEncounterRun', functionStart) + 3;
assert(constantsStart >= 0 && functionStart > constantsStart && functionEnd > functionStart, 'woodsman phase helper must be defined before encounter runtime');

const code = `${source.slice(constantsStart, functionEnd)}\nthis.getWoodsmanPhaseProgress = getWoodsmanPhaseProgress;`;
const context = vm.createContext({ clampNumber: (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0)) });
vm.runInContext(code, context, { filename: 'woodsman-phase-helper.js' });

function progressAtDamagePct(pct) {
  return context.getWoodsmanPhaseProgress({ hp: 100 - pct, maxHp: 100 });
}

assert(Math.abs(progressAtDamagePct(95) - 0.75) < 1e-9, 'new 95% damage point should match the old 75% phase strength');
assert(progressAtDamagePct(75) < 0.60, '75% damage point should be substantially below the old final-form ramp');
assert.strictEqual(progressAtDamagePct(0), 0, 'full-health woodsman must have no phase ramp');
assert.strictEqual(progressAtDamagePct(100), 1, 'last sliver can still reach the full phase cap');

console.log('woodsman phase nerf smoke checks passed');
