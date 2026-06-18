#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');

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

const calls = { confirm: 0, prompt: 0, changeZone: 0, update: 0 };
const skyState = { unlocked: true, highestFloor: 9, currentFloor: 5 };
const context = {
  Math,
  Number,
  SKY_TOWER_ZONE_ID: 'sky_tower',
  game: { settings: { mapCompleteAction: 'repeatZone' } },
  ensureSkyTowerState: () => skyState,
  canEnterSkyTower: () => true,
  getSkyTowerRemainingClears: () => 3,
  getSkyTowerLoopClearLimit: () => 25,
  isBeehiveRunLockedForMapTravel: () => false,
  addLog() {},
  confirm(message) {
    calls.confirm++;
    assert.strictEqual(message, "현재 설정이 맵 완료 시 '같은 지역 반복' 입니다. 정말 입장하시겠습니까?");
    return false;
  },
  prompt() { calls.prompt++; return '7'; },
  changeZone() { calls.changeZone++; },
  updateStaticUI() { calls.update++; },
};
vm.createContext(context);
vm.runInContext(`${extractFunction(uiSource, 'enterSkyTowerPrompt')}; this.enterSkyTowerPrompt = enterSkyTowerPrompt;`, context);

context.enterSkyTowerPrompt();
assert.strictEqual(calls.confirm, 1, 'repeat-zone sky tower entry must ask for confirmation');
assert.strictEqual(calls.prompt, 0, 'canceling the repeat-zone warning must skip the floor prompt');
assert.strictEqual(calls.changeZone, 0, 'canceling the repeat-zone warning must not enter the tower');

context.confirm = () => { calls.confirm++; return true; };
context.enterSkyTowerPrompt();
assert.strictEqual(calls.prompt, 1, 'accepting the warning must continue to the floor prompt');
assert.strictEqual(skyState.currentFloor, 7, 'accepted entry must still apply the selected floor');
assert.strictEqual(calls.changeZone, 1, 'accepted entry must enter the sky tower');
assert.strictEqual(calls.update, 1, 'accepted entry must refresh the UI');

calls.confirm = 0;
context.game.settings.mapCompleteAction = 'nextZone';
context.enterSkyTowerPrompt();
assert.strictEqual(calls.confirm, 0, 'non-repeat sky tower entry must not show the repeat warning');

console.log('sky tower repeat confirmation smoke checks passed');
