#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const htmlSource = fs.readFileSync('index.html', 'utf8');

const resistanceFormatter = uiSource.match(/function formatCappedResistanceValue\(appliedValue, uncappedValue\) \{[\s\S]*?\n\}/);
assert(resistanceFormatter, 'capped resistance formatter must exist');
const formatterContext = {};
vm.createContext(formatterContext);
vm.runInContext(`${resistanceFormatter[0]}; this.formatCappedResistanceValue = formatCappedResistanceValue;`, formatterContext);
assert.strictEqual(formatterContext.formatCappedResistanceValue(76, 107), '76 (107)', 'overcapped resistance must show applied and uncapped values');
assert.strictEqual(formatterContext.formatCappedResistanceValue(54, 54), '54', 'equal resistance values should not be duplicated');
assert(combatSource.includes('rawResC: uncappedResC'), 'cold uncapped resistance must be returned');
assert(combatSource.includes('rawResL: uncappedResL'), 'lightning uncapped resistance must be returned');
assert(combatSource.includes('rawResChaos: uncappedResChaos'), 'chaos uncapped resistance must be returned');

assert(!combatSource.includes('let finalDs = ((gearBase.ds'), 'double strike must not apply the hidden 0.75 multiplier');
assert(combatSource.includes('let finalDs = baseDsFromSources + skillDsBonus;'), 'double strike sources must add as percentage points');
assert(combatSource.includes('각 수치는 연속 타격 확률에 합산되는 %p입니다.'), 'double strike tooltip must explain percentage-point addition');

assert(combatSource.includes('uniqueRiderCompass && finalMove >= 200 ? 20 : 0'), 'Rider Compass must amplify evasion at 200 movement speed');
assert(!combatSource.includes('movedRecently'), 'Rider Compass first hit must not expire after a short time window');
assert(combatSource.includes('(game.lastMoveEndedAt || 0) > 0 && !game.uniqueRiderCompassConsumed'), 'Rider Compass first hit must remain ready until consumed');
assert.strictEqual((combatSource.match(/markPlayerMovementCompleted\(\);/g) || []).length, 2, 'all movement completion paths must ready Rider Compass');

assert(htmlSource.includes('id="talisman-dismantle-overlay"'), 'talisman dismantle warning overlay must exist');
assert(uiSource.includes('openTalismanDismantleOverlay([talismanId]'), 'single talisman dismantle must open the warning overlay');
assert(uiSource.includes('openTalismanDismantleOverlay(targets.map(t => t.id)'), 'search-based talisman dismantle must open the warning overlay');
assert(uiSource.includes('function confirmTalismanDismantle()'), 'talisman dismantle must require explicit confirmation');

const dismantleBlock = uiSource.match(/let pendingTalismanDismantle = null;[\s\S]*?(?=\nfunction getTalismanUnlockedCellsSet)/);
assert(dismantleBlock, 'talisman dismantle workflow must be extractable');
const overlay = { active: false, classList: { add() { overlay.active = true; }, remove() { overlay.active = false; } } };
const elements = {
  'talisman-dismantle-overlay': overlay,
  'talisman-dismantle-title': { textContent: '' },
  'talisman-dismantle-body': { innerHTML: '' },
};
const dismantleContext = {
  game: { talismanInventory: [{ id: 1, name: '테스트 부적', locked: false }], talismanSelectedId: 1 },
  document: { getElementById(id) { return elements[id] || null; } },
  isLockedInventoryObject(obj) { return !!(obj && obj.locked); },
  getTalismanDisplayName(t) { return t.name; },
  escapeHTML(value) { return String(value); },
  addLog() {},
  updateStaticUI() {},
};
vm.createContext(dismantleContext);
vm.runInContext(`${dismantleBlock[0]}; this.destroyTalismanFromInventory = destroyTalismanFromInventory; this.confirmTalismanDismantle = confirmTalismanDismantle;`, dismantleContext);
dismantleContext.destroyTalismanFromInventory(1);
assert.strictEqual(dismantleContext.game.talismanInventory.length, 1, 'requesting dismantle must not immediately remove the talisman');
assert.strictEqual(overlay.active, true, 'requesting dismantle must open the warning overlay');
dismantleContext.confirmTalismanDismantle();
assert.strictEqual(dismantleContext.game.talismanInventory.length, 0, 'confirming dismantle must remove the talisman');
assert.strictEqual(overlay.active, false, 'confirming dismantle must close the warning overlay');

console.log('character stat and talisman warning smoke checks passed');
