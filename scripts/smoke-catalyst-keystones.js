#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const stateSource = fs.readFileSync('js/state.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');

assert(stateSource.includes("name: '과잉 촉매', desc: '상태이상 지속 피해 유발 기준 피해가 실제 타격의 2배"), 'Over Catalyst description must show 2x ailment source damage');
assert(combatSource.includes("hasKeystone('ct1')) ? 2 : 1"), 'Over Catalyst must use a 2x ailment source multiplier');
assert(stateSource.includes("name: '연막 포션'"), 'Lingering Evasion must be renamed Smoke Potion');
assert(stateSource.includes("영구 은신: 이동 속도 +20%, 치명타 피해 배율 +25%, 회피 20% 증폭"), 'Smoke Potion description must use the Assassin stealth bonuses');
assert(!combatSource.includes('function hasSniperStealthEffect()'), 'Smoke Potion must no longer share the sniper luck effect helper');
assert(combatSource.includes("if (hasKeystone('ct4')) {\n            finalMove *= 1.2;\n            finalCritDmg += 25;\n            finalEvasion = Math.floor(finalEvasion * 1.2);"), 'Smoke Potion must permanently apply the Assassin stealth bonuses');
assert(combatSource.includes("game.ascendClass === 'hunter' && hasKeystone('h3')) evadeRoll"), 'lucky evasion must remain exclusive to the sniper keystone');
assert(combatSource.includes("game.ascendClass === 'hunter' && hasKeystone('h3')) ailRoll"), 'unlucky enemy ailment rolls must remain exclusive to the sniper keystone');
assert(stateSource.includes("name: '약품 내성'"), 'Resistance Blend must be renamed Medicine Resistance');
assert(combatSource.includes('highestUncappedElementalResistance'), 'Medicine Resistance must compare uncapped elemental resistances');
assert(combatSource.includes('medicineResistanceAilmentBonus.ignite = 100'), 'highest fire resistance must grant +100% ignite resistance');
assert(combatSource.includes('medicineResistanceAilmentBonus.freeze = 100'), 'highest cold resistance must grant +100% chill/freeze resistance');
assert(combatSource.includes('medicineResistanceAilmentBonus.shock = 100'), 'highest lightning resistance must grant +100% shock resistance');
assert(!combatSource.includes('.slice(0, 2);'), 'Catalyst ailment spread must no longer stop at two nearby enemies');
assert(combatSource.includes('totalDotDamageMultiplier *= 2;'), 'Stacked Toxicity must double ailment damage');
assert(combatSource.includes('dotDurationMultiplier *= 0.5;'), 'Stacked Toxicity must halve ailment duration');
assert(combatSource.includes('(a.stacks || 1) >= maxDamageAilmentStacks'), 'Rupture Dissolution must trigger at the dynamic maximum stack count');
assert(combatSource.includes('game.catalystBurstReadyAt = now + 1000;'), 'Rupture Dissolution cooldown must be one second');
assert(stateSource.includes("name: '완벽한 배합'"), 'Blend Threshold must be renamed Perfect Blend');
assert(combatSource.includes("skill.tags.includes('attack')) finalCrit = 100"), 'Perfect Blend must make attacks always critical');
assert(combatSource.includes("skill.cannotCrit && !(game.ascendClass === 'catalyst'"), 'Perfect Blend must override cannot-crit restrictions for attacks');
assert(combatSource.includes('convertedCritChance + convertedCritDamage'), 'Perfect Blend must convert critical stats into damage-over-time multiplier');
assert(combatSource.includes('finalCritDmg = 100 + Math.max(0, (totalDotDamageMultiplier - 1) * 100 * 0.2)'), 'Perfect Blend critical hits must use 20% of damage-over-time multiplier');

console.log('catalyst keystone smoke checks passed');
