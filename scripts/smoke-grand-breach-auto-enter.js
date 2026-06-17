#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');

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

assert(indexSource.includes('id="btn-grand-breach-auto-enter"'), 'void rift header must include an auto-entry toggle button');
assert(stateSource.includes('autoEnterGrandBreach: false'), 'new saves must default grand breach auto-entry to OFF');
assert(combatSource.includes('autoEnterGrandBreachIfReady'), 'combat grand-breach unlocks must use the automatic entry path');

const logs = [];
const context = {
  Date,
  game: {
    currentZoneId: 12,
    settings: { autoEnterGrandBreach: false },
    voidRift: { grandBreachUnlock: true },
    beehive: { inRun: false },
    enemies: [{ hp: 1 }],
    encounterPlan: [1],
    encounterIndex: 1,
    runProgress: 55,
    moveTimer: 99,
    combatHalted: true,
  },
  addLog(message) { logs.push(message); },
  updateStaticUI() {},
  isBeehiveRunLockedForMapTravel: () => false,
  warnBeehiveMapTravelBlocked() { throw new Error('beehive warning should not be called'); },
};
vm.createContext(context);
vm.runInContext([
  extractFunction(uiSource, 'canAutoEnterGrandBreach'),
  extractFunction(uiSource, 'autoEnterGrandBreachIfReady'),
  extractFunction(uiSource, 'enterGrandBreach'),
  extractFunction(uiSource, 'toggleGrandBreachAutoEnter'),
].join('\n'), context);

assert.strictEqual(context.autoEnterGrandBreachIfReady(), false, 'auto-entry must not run while the setting is OFF');
assert.strictEqual(context.game.currentZoneId, 12, 'OFF state must leave the current map unchanged');

context.toggleGrandBreachAutoEnter();
assert.strictEqual(context.game.settings.autoEnterGrandBreach, true, 'toggle must enable grand breach auto-entry');
assert.strictEqual(context.game.currentZoneId, 'grand_breach_run', 'turning ON with a ready breach must enter immediately');
assert.strictEqual(context.game.voidRift.grandBreachUnlock, false, 'automatic entry must consume the ready grand breach');
assert.strictEqual(context.game.enemies.length, 0, 'automatic entry must reset active enemies');
assert.strictEqual(context.game.encounterPlan.length, 0, 'automatic entry must reset the encounter plan');
assert.strictEqual(context.game.encounterIndex, 0, 'automatic entry must reset the encounter index');
assert.strictEqual(context.game.runProgress, 0, 'automatic entry must reset map progress');
assert.strictEqual(context.game.moveTimer, 0, 'automatic entry must reset movement timer');
assert.strictEqual(context.game.combatHalted, false, 'automatic entry must resume combat');
assert.strictEqual(context.game.voidRift.grandRun.returnZoneId, 12, 'automatic entry must preserve the interrupted return zone');
assert(logs.some(message => message.includes('대균열 자동입장 ON')), 'toggle must log the new auto-entry state');
assert(logs.some(message => message.includes('자동입장')), 'automatic entry must remain observable in the log');
