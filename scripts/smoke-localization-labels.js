#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const checkedFiles = ['index.html', 'data/items.js', 'js/combat.js', 'js/core-cube.js', 'js/state.js', 'js/canvas-passive-tree.js', 'js/passives.js', 'js/utils.js'];
for (const file of checkedFiles) {
  assert(!fs.readFileSync(file, 'utf8').includes('빗겨'), `${file} must use 비껴내기 spelling instead of 빗겨내기`);
}

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/utils.js', 'utf8'), context);

assert.strictEqual(context.translateSkillTag('summon'), '소환수', 'summon tag must display in Korean');
assert.strictEqual(context.translateSkillTag('summon_attack'), '공격형 소환수', 'attack summon tag must display in Korean');
assert.strictEqual(context.translateSkillTag('summon_guard'), '방어형 소환수', 'guard summon tag must display in Korean');
assert.strictEqual(context.getStatName('corpseExplodeChance'), '시체폭발 확률(%)', 'corpse-explosion chance rune stat must display in Korean');
assert.strictEqual(context.getStatName('corpseExplodeLifePct'), '시체폭발 피해(처치한 적 최대 생명력 %)', 'corpse-explosion damage rune stat must display in Korean');
assert.strictEqual(context.getStatName('resonancePower'), '공명력', 'resonance rune stat must display in Korean');

console.log('localization label smoke checks passed');
