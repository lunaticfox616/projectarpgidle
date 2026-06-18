#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const itemsSource = fs.readFileSync('data/items.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index++) {
    if (source[index] === '{') depth++;
    if (source[index] !== '}') continue;
    depth--;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} must have a complete body`);
}

assert(itemsSource.includes('name: "심연 군주갑", slots: ["갑옷"], reqTier: 6, ultraRare: true, chaseWeight: 5'), 'Abyss Lord armor must have boosted chase weight');
assert(itemsSource.includes('name: "황제의 심연띠", slots: ["허리띠"], reqTier: 10, ultraRare: true, chaseWeight: 5'), 'Emperor abyss belt must have boosted chase weight');
assert(passivesSource.includes('chooseUniqueDropOption(options, canRollChase)'), 'unique generation must use weighted chase selection');

const context = {
  Math: Object.create(Math),
  rndChoice(list) { return list[0]; },
};
context.Math.random = () => 0.6;
vm.createContext(context);
vm.runInContext(`${extractFunction(passivesSource, 'chooseUniqueDropOption')}; this.chooseUniqueDropOption = chooseUniqueDropOption;`, context);

const weightedPick = context.chooseUniqueDropOption([
  { name: 'other-a' },
  { name: '심연 군주갑', chaseWeight: 5 },
  { name: 'other-b' },
], true);
assert.strictEqual(weightedPick.name, '심연 군주갑', 'chase weights must expand the selected range for boosted abyss uniques');

const unweightedPick = context.chooseUniqueDropOption([
  { name: 'other-a' },
  { name: '심연 군주갑', chaseWeight: 5 },
], false);
assert.strictEqual(unweightedPick.name, 'other-a', 'normal unique selection must keep using rndChoice without chase weights');

console.log('abyss chase unique weight smoke checks passed');
