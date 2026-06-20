#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const passivesSource = fs.readFileSync('js/passives.js', 'utf8');
const componentsCss = fs.readFileSync('css/components.css', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `${name} must exist`);
  let depth = 0;
  let seenBody = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') {
      depth += 1;
      seenBody = true;
    } else if (ch === '}') {
      depth -= 1;
      if (seenBody && depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Unable to extract ${name}`);
}

const logs = [];
const context = {
  JSON,
  game: { uniqueCodex: {}, codexNewlyRegistered: {}, noti: { codex: false } },
  addLog(message) { logs.push(message); },
  tryGrantCodexCompletionReward() { context.rewardChecked = true; }
};
vm.createContext(context);
vm.runInContext([
  extractFunction(passivesSource, 'getUniqueCodexKeyByItem'),
  extractFunction(passivesSource, 'registerUniqueToCodexOnAcquire'),
  'this.registerUniqueToCodexOnAcquire = registerUniqueToCodexOnAcquire;'
].join('\n'), context);

const uniqueItem = { rarity: 'unique', slot: '무기', name: '새 고유', baseName: '검', stats: [] };
assert.strictEqual(context.registerUniqueToCodexOnAcquire(uniqueItem), true, 'first unique acquisition must register to codex');
assert.strictEqual(context.game.noti.codex, true, 'first registration must raise the codex notification');
assert.strictEqual(context.game.codexNewlyRegistered['무기|새 고유'], true, 'first registration must mark the new codex item');
assert.strictEqual(logs.length, 1, 'first registration must log exactly once');

context.game.noti.codex = false;
context.game.codexNewlyRegistered = {};
logs.length = 0;
context.game.uniqueCodex['무기|새 고유'] = { revealed: true, slot: '무기', name: '새 고유' };
assert.strictEqual(context.registerUniqueToCodexOnAcquire(uniqueItem), true, 'revealed legacy records may be filled with item details');
assert.strictEqual(context.game.noti.codex, false, 'already registered codex items must not raise another notification');
assert.deepStrictEqual(context.game.codexNewlyRegistered, {}, 'already registered codex items must not be marked as newly registered again');
assert.strictEqual(logs.length, 0, 'already registered codex items must not log another new-registration message');

assert(uiSource.includes('if (tabId === \'tab-codex\' && game.noti && game.noti.codex) game.codexFocusNewOnOpen = true;'), 'codex notification click must request focusing the new codex item');
assert(uiSource.includes('if (firstNewSlot && game.codexFocusNewOnOpen)'), 'codex renderer must move to the slot containing a new item when opened from a notification');
assert(uiSource.includes('function getCodexSlotOrder()'), 'codex slot order helper must exist');
assert(uiSource.includes('function setCodexSlotFilter(slot)'), 'codex slot filter handler must exist');
assert(uiSource.includes('codex-slot-tabs'), 'codex renderer must build left slot tabs');
assert(uiSource.includes('codex-card-grid'), 'codex renderer must build a filtered card grid for the selected slot');
assert(uiSource.includes('● NEW'), 'newly registered codex cards must keep their visible NEW badge');
assert(componentsCss.includes('.codex-layout{display:grid;grid-template-columns:150px minmax(0,1fr);'), 'codex layout must reserve a left slot tab rail');
assert(componentsCss.includes('.codex-slot-tab.active'), 'codex slot tabs must show the active slot');
const codexBaseIndex = componentsCss.indexOf('.codex-layout{display:grid;grid-template-columns:150px minmax(0,1fr);');
const codexMobileIndex = componentsCss.indexOf('@media (max-width:900px){.codex-layout{grid-template-columns:1fr}');
assert(codexBaseIndex >= 0 && codexMobileIndex > codexBaseIndex, 'mobile codex slot-tab overrides must appear after the base codex rules');

console.log('codex new registration summary smoke checks passed');
