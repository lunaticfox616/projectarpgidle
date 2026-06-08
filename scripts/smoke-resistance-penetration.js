#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const combat = fs.readFileSync('js/combat.js', 'utf8');

const enemyMitigationStart = combat.indexOf('function getEffectiveEnemyMitigation');
const enemyMitigationEnd = combat.indexOf('\nfunction ', enemyMitigationStart + 1);
assert(enemyMitigationStart >= 0 && enemyMitigationEnd > enemyMitigationStart, 'enemy mitigation helper must exist');
const enemyMitigationBlock = combat.slice(enemyMitigationStart, enemyMitigationEnd);
const physicalBranchStart = enemyMitigationBlock.indexOf("if (skillEle === 'phys')");
const resistanceBranchStart = enemyMitigationBlock.indexOf("if (skillEle === 'fire'", physicalBranchStart);
assert(physicalBranchStart >= 0 && resistanceBranchStart > physicalBranchStart, 'physical and resistance mitigation branches must exist');
const physicalBranch = enemyMitigationBlock.slice(physicalBranchStart, resistanceBranchStart);
const resistanceBranch = enemyMitigationBlock.slice(resistanceBranchStart);
assert(physicalBranch.includes('pStats.physIgnore'), 'player physical mitigation bypass must use physical ignore');
assert(!physicalBranch.includes('pStats.resPen'), 'player resistance penetration must not bypass enemy physical mitigation');
assert(resistanceBranch.includes('pStats.resPen'), 'player resistance penetration must still apply to elemental and chaos resistance');

const incomingPhysicalLine = combat.match(/let physRes = [^\n]+/);
assert(incomingPhysicalLine, 'incoming physical mitigation calculation must exist');
assert(incomingPhysicalLine[0].includes('pStats.dr'), 'incoming physical damage must still use player physical damage reduction');
assert(incomingPhysicalLine[0].includes('getArmorPhysicalReductionPct'), 'incoming physical damage must still use player armor');
assert(!incomingPhysicalLine[0].includes('enemy.penetration'), 'monster resistance penetration must not bypass player physical mitigation or armor');
assert(combat.includes('elementalRes = Math.max(-60, elementalRes - (enemy.penetration || 0));'), 'monster resistance penetration must still apply to elemental and chaos resistance');
assert(combat.includes('res = Math.max(-60, res - (enemy.penetration || 0));'), 'monster resistance penetration must still apply after physical damage is taken as elemental or chaos damage');

console.log('resistance penetration smoke checks passed');
