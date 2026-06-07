#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const skillsSource = fs.readFileSync('js/skills.js', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const dataSkillsSource = fs.readFileSync('data/skills.js', 'utf8');

const growthFn = combatSource.match(/function getAttackSummonGrowthSteps\(gemLv\) \{[\s\S]*?\n\}/);
assert(growthFn, 'attack summon growth helper must exist');
const context = {};
vm.createContext(context);
vm.runInContext(`${growthFn[0]}; this.getAttackSummonGrowthSteps = getAttackSummonGrowthSteps;`, context);
const lv1 = context.getAttackSummonGrowthSteps(1);
const lv19 = context.getAttackSummonGrowthSteps(19);
const lv20 = context.getAttackSummonGrowthSteps(20);
const lv21 = context.getAttackSummonGrowthSteps(21);
const lv30 = context.getAttackSummonGrowthSteps(30);
assert(lv1 > 0, 'attack summons should receive a small level-1 baseline increase');
assert(lv20 > 19, 'levels 1-20 should grow above the previous one-step-per-level curve');
assert((lv21 - lv20) > (lv20 - lv19), 'growth after level 20 should be steeper than growth before level 20');
assert(lv30 > 29 * 1.15, 'high-level attack summons should materially outgrow the old linear curve');
assert(combatSource.includes("profile && profile.role === 'attack'"), 'the boosted curve must be limited to attack summons');
assert(dataSkillsSource.includes("tags: ['summon', 'summon_attack'"), 'attack summon skill gems must carry the summon_attack tag');
assert(!dataSkillsSource.includes('수액 골렘 소환'), 'Sap Golem must remain outside the attack skill gem database');

assert(skillsSource.includes("{ stat: 'summonGemLevel', tag: 'summon_attack' }"), 'summon gem level must target attack summon gems only');
assert(stateSource.includes("id: 'summonWeaponGemLevel', statId: 'summonGemLevel'"), 'weapon summon gem level affix must exist');
assert(stateSource.includes("slots: ['무기'], tierValues: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], weight: 0.15"), 'weapon summon gem level must scale by tier up to +5 at low weight');
assert(stateSource.includes("id: 'summonRingGemLevel', statId: 'summonGemLevel'"), 'ring summon gem level affix must remain separate');
assert(stateSource.includes("slots: ['반지'], tierValues: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], weight: 0.15"), 'ring summon gem level must remain capped at +1');
assert(passivesSource.includes("'summonResPen', 'summonGemLevel'"), 'summon gem level must be restricted to summon base items');

console.log('summon growth smoke checks passed');
