#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
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
assert(!incomingPhysicalLine[0].includes('enemy.resistanceReduction'), 'monster resistance reduction must not bypass player physical mitigation or armor');

const resistanceHelper = combat.match(/function getPlayerResistanceAfterEnemyModifiers\(pStats, element, enemy, effectMultiplier\) \{[\s\S]*?\n\}/);
assert(resistanceHelper, 'incoming resistance modifier helper must exist');
const context = { MIN_PENETRATED_RESISTANCE: -200 };
vm.createContext(context);
vm.runInContext(`${resistanceHelper[0]}; this.getPlayerResistanceAfterEnemyModifiers = getPlayerResistanceAfterEnemyModifiers;`, context);
const overcappedFire = { resF: 75, rawResF: 130, maxResF: 75 };
assert.strictEqual(context.getPlayerResistanceAfterEnemyModifiers(overcappedFire, 'fire', { penetration: 30 }), 45, 'penetration must apply after the resistance cap');
assert.strictEqual(context.getPlayerResistanceAfterEnemyModifiers(overcappedFire, 'fire', { resistanceReduction: 30 }), 75, 'resistance reduction must subtract from uncapped resistance before applying the cap');
assert.strictEqual(context.getPlayerResistanceAfterEnemyModifiers({ resF: 75, rawResF: 75, maxResF: 75 }, 'fire', { resistanceReduction: 30 }), 45, 'resistance reduction must lower non-overcapped resistance normally');
assert.strictEqual(context.getPlayerResistanceAfterEnemyModifiers(overcappedFire, 'fire', { resistanceReduction: 40, penetration: 20 }), 55, 'resistance reduction must apply before the cap and penetration must apply afterward');
assert.strictEqual(context.getPlayerResistanceAfterEnemyModifiers(overcappedFire, 'fire', { penetration: 400 }), -200, 'monster penetration must stop at -200% effective resistance');
assert(combat.includes('const MIN_PENETRATED_RESISTANCE = -200;'), 'player and monster penetration must share the -200% resistance floor');
assert(resistanceBranch.includes('Math.max(MIN_PENETRATED_RESISTANCE, effective)'), 'player penetration must stop at -200% effective enemy resistance');

const playerMitigationContext = {
    MIN_PENETRATED_RESISTANCE: -200,
    game: { ascendClass: null, enemyUniqueElementalResDown: {}, enemyUniqueChaosResDown: {} },
    hasKeystone: () => false,
    getEnemyElementResistance: () => 50
};
vm.createContext(playerMitigationContext);
vm.runInContext(`${enemyMitigationBlock}; this.getEffectiveEnemyMitigation = getEffectiveEnemyMitigation;`, playerMitigationContext);
assert.strictEqual(playerMitigationContext.getEffectiveEnemyMitigation('fire', 1, {}, { resPen: 400 }), -200, 'player penetration must stop at -200% effective enemy resistance at runtime');
assert.strictEqual(playerMitigationContext.getEffectiveEnemyMitigation('fire', 1, {}, { resPen: 30 }), 20, 'player penetration below the floor must retain its normal calculation');

assert(combat.includes("let isDeepChaos = zone.type === 'abyss';"), 'deep chaos enemy generation must be identified explicitly');
assert(combat.includes('penetration: (isDeepChaos ? 0 : baselineResistancePressure)'), 'deep chaos enemies must not receive the old baseline resistance penetration');
assert(combat.includes('resistanceReduction: isDeepChaos ? baselineResistancePressure : 0'), 'deep chaos enemies must receive resistance reduction instead');
assert(combat.includes('getPlayerResistanceAfterEnemyModifiers(pStats, ele, enemy)'), 'converted elemental and chaos damage must use resistance reduction and penetration handling');
assert(combat.includes('getPlayerResistanceAfterEnemyModifiers(pStats, enemy.ele, enemy)'), 'direct elemental and chaos damage must use resistance reduction and penetration handling');

console.log('resistance penetration smoke checks passed');
