#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const skillDataSource = fs.readFileSync('data/skills.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert(match, `${name} must exist`);
  return match[0];
}

const context = { Math };
vm.createContext(context);
vm.runInContext([
  extractFunction(combatSource, 'getFlameDecayIgniteTakenMultiplier'),
  'this.getFlameDecayIgniteTakenMultiplier = getFlameDecayIgniteTakenMultiplier;',
].join('\n'), context);

const flameDecaySkill = {
  igniteTakenHpScalePer100: 0.08,
  igniteTakenMaxMultiplier: 5,
};

assert.strictEqual(
  context.getFlameDecayIgniteTakenMultiplier({ maxHp: 1000, sSkill: flameDecaySkill }),
  1.8,
  'flame decay ignite amplification should still scale with health below the cap',
);
assert.strictEqual(
  context.getFlameDecayIgniteTakenMultiplier({ maxHp: 20000, sSkill: flameDecaySkill }),
  5,
  'flame decay ignite amplification must be capped to prevent runaway HP stacking',
);

assert(skillDataSource.includes('fireResOvercapCap: 75'), 'Flame Decay must cap effective fire resistance overcap');
assert(skillDataSource.includes('igniteTakenMaxMultiplier: 5'), 'Flame Decay must cap ignite taken amplification');
assert(combatSource.includes('let effectiveFireResOvercap = Math.min(fireResOvercap, fireResOvercapCap);'), 'combat formula must use capped fire overcap');
assert(combatSource.includes('1 + (effectiveFireResOvercap * fireResOvercapAdditiveMultiplier)'), 'fire overcap multiplier must use the effective overcap');
assert(combatSource.includes('생명력/초과 화염 저항/지속 피해 배율 적용'), 'Flame Decay tooltip must not claim regeneration scaling when the skill has no regen coefficient');
assert(uiSource.includes('중 적용 ${effectiveOvercap.toFixed(1)}%'), 'skill tooltip must disclose effective fire overcap');
assert(uiSource.includes('점화 피해가 생명력 100당 8% 증폭(최대'), 'skill tooltip must disclose the ignite amplification cap');

console.log('flame decay balance smoke checks passed');
