#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');

assert(
  combatSource.includes("formatResistanceSourceLine('보조 젬', support[statId] || 0)"),
  'resistance breakdowns must include support gem resistance',
);
assert(
  combatSource.includes("formatResistanceSourceLine('약품 내성', resistanceBlendBonus)"),
  'resistance breakdowns must include the Alchemist resistance blend bonus',
);
assert(
  combatSource.includes("formatResistanceSourceLine('최대 저항 · 약품 내성', resistanceBlendMaxBonus)"),
  'resistance breakdowns must include the Alchemist maximum resistance blend bonus',
);
assert(
  combatSource.includes("formatResistanceSourceLine('군락 수호구', colonyWardBonus.resAll || 0)"),
  'elemental resistance breakdowns must include colony ward resistance',
);
assert(
  combatSource.includes("formatResistanceSourceLine('암흑 치환', warlockElementalOvercapToChaos)"),
  'chaos resistance breakdown must include Warlock overcap conversion',
);
assert(
  combatSource.includes('`최대 저항: ${Math.floor(maxValue)}% (기본 75%)`'),
  'resistance breakdowns must show the effective maximum resistance',
);

console.log('resistance tooltip smoke checks passed');
