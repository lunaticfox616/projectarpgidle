#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const combat = fs.readFileSync('js/combat.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const chanceKeys = ['igniteChance', 'chillChance', 'freezeChance', 'shockChance', 'poisonChance', 'bleedChance'];
const resistKeys = ['ailmentResistIgniteChance', 'ailmentResistChillChance', 'ailmentResistFreezeChance', 'ailmentResistShockChance', 'ailmentResistPoisonChance', 'ailmentResistBleedChance'];
for (const key of chanceKeys.concat(resistKeys)) {
    assert(index.includes(`showStatTooltip(event,'${key}')`), `character tab must expose the ${key} custom tooltip`);
    assert(combat.includes(`${key}: makeAilment`), `player breakdowns must define ${key}`);
}

assert(combat.includes('let makeDamageAilmentEffectLines'), 'damage ailment tooltip helper must exist');
assert(combat.includes('과잉 촉매 기준 피해'), 'damage ailment tooltips must disclose the Catalyst source-damage multiplier');
assert(combat.includes('키스톤·스킬 포함 지속 피해 배율'), 'damage ailment tooltips must disclose keystone and skill multipliers');
assert(combat.includes('해당 상태이상 피해 총 배율'), 'damage ailment tooltips must show the combined damage increase');
assert(combat.includes("makeDamageAilmentEffectLines('점화 피해 증가', finalIgniteDamageMultiplierPct)"), 'ignite tooltip must include ignite damage bonuses');
assert(combat.includes("makeDamageAilmentEffectLines('중독 피해 증가', finalPoisonDamageMultiplierPct)"), 'poison tooltip must include poison damage bonuses');
assert(combat.includes("makeDamageAilmentEffectLines('출혈 전용 피해 증가', 0)"), 'bleed tooltip must include shared damage-over-time bonuses');
assert(combat.includes('감전 효과 증가:'), 'shock tooltip must show shock effect increases');

assert(combat.includes('let makeDamageAilmentMitigationLines'), 'damage ailment mitigation tooltip helper must exist');
assert(combat.includes('받는 지속 피해 감소:'), 'damage ailment resistance tooltips must show generic damage-over-time reduction');
assert(combat.includes('복합 적용 피해 감소:'), 'damage ailment resistance tooltips must show combined mitigation');
assert(combat.includes('냉각 효과 감소:'), 'chill resistance tooltip must show chill effect reduction');
assert(combat.includes('동결 지속시간 감소:'), 'freeze resistance tooltip must show freeze duration reduction');
assert(combat.includes('감전 효과 감소:'), 'shock resistance tooltip must show shock effect reduction');

console.log('ailment tooltip smoke checks passed');
