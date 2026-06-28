#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/combat.js', 'utf8');
assert(source.includes('const CRIT_DAMAGE_BASE_MULTIPLIER = 125'), 'base critical damage multiplier must be 125%');
assert(source.includes('소프트캡(200/400/800/1200)'), 'critical damage tooltip must describe the softcap breakpoints');

const start = source.indexOf('function applyCritDamageSoftcap');
const end = source.indexOf('\nfunction getArmorPhysicalReductionPct', start);
assert(start >= 0 && end > start, 'critical damage softcap helpers must exist before armor helpers');
const context = { Number, Math };
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

assert.strictEqual(context.applyCritDamageSoftcap(150), 150, 'critical damage below 200% should not be reduced');
assert.strictEqual(context.applyCritDamageSoftcap(300), 295, 'critical damage from 200% to 400% should keep 95% of overflow');
assert.strictEqual(context.applyCritDamageSoftcap(500), 480, 'critical damage from 400% to 800% should keep 90% of overflow');
assert.strictEqual(context.applyCritDamageSoftcap(1300), 1137, 'critical damage above 1200% should keep 67% of overflow');
assert.strictEqual(context.getCritDamageSoftcapReduction(1300), 163, 'softcap reduction should report the removed critical damage');

console.log('critical damage softcap smoke checks passed');
