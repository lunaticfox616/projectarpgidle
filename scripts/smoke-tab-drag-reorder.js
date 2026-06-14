#!/usr/bin/env node
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const ui = fs.readFileSync('js/ui.js', 'utf8');
const css = fs.readFileSync('css/base.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function extractFunctionBlock(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert(start >= 0, `${name} must exist`);
  const bodyStart = source.indexOf('{', source.indexOf(')', start));
  assert(bodyStart >= 0, `${name} body must start`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = bodyStart; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${name} body not found`);
}

assert(ui.includes('const TAB_DRAG_LONG_PRESS_MS = 180;'), 'tab drag long-press threshold must be shortened to 180ms');
assert(ui.includes('document.addEventListener(\'click\', onTabHeaderClickCapture, true)'), 'tab drag must suppress the follow-up click after a drag');
assert(ui.includes('isUiPointerInteractionActive()'), 'static UI refresh must defer while a pointer interaction is active');
assert(ui.includes('refreshTabHeaderUiIfNeeded();'), 'static UI refresh must use tab header signature gating instead of reordering tabs every frame');
const performUpdateStart = ui.indexOf('function performUpdateStaticUI');
const performUpdateEnd = ui.indexOf('function getJewelStatToneColor', performUpdateStart);
assert(performUpdateStart >= 0 && performUpdateEnd > performUpdateStart, 'performUpdateStaticUI block must be discoverable');
assert(!ui.slice(performUpdateStart, performUpdateEnd).includes('applyTabHeaderOrder();'), 'full static UI refresh must not reorder tab headers every frame');
assert(ui.includes('activateTabButtonFromDrag(state.button)'), 'releasing a dragged tab must activate that tab after saving order');
assert(css.includes('.tab-btn.dragging'), 'dragging tab style must exist');
assert(css.includes('.tab-drag-ghost'), 'dragging tab ghost style must exist');
assert(css.includes('display: flex'), 'dragging tab ghost must render independently from hidden tab buttons');
assert(!css.includes('transform: translate(-50%, -50%)'), 'dragging tab ghost must not center-shift away from the pointer offset');
assert(ui.includes('function updateTabDragGhost'), 'tab drag must move a ghost element with the pointer');
assert(ui.includes("document.createElement('div')") && ui.includes("state.ghost.innerHTML = state.button.innerHTML"), 'tab drag ghost must not clone the hidden/flex tab button element itself');
assert(ui.includes('clientX - offsetX') && ui.includes('clientY - offsetY'), 'tab drag ghost must preserve the pointer grab offset');
assert(index.includes('css/base.css?v=20260611-tab-drag4'), 'base CSS cache buster must include tab ghost styles');
assert(/js\/ui\.js\?v=[^"']+/.test(index), 'UI script must use a versioned cache buster for tab drag handlers');

const activatedTabs = [];
const activateRuntime = { switchTab(tabId) { activatedTabs.push(tabId); } };
vm.createContext(activateRuntime);
vm.runInContext(extractFunctionBlock(ui, 'activateTabButtonFromDrag'), activateRuntime);
activateRuntime.activateTabButtonFromDrag({ id: 'btn-tab-map' });
assert.strictEqual(activatedTabs[0], 'tab-map', 'drag release activation must convert tab button ids to tab ids');
activateRuntime.activateTabButtonFromDrag({ id: 'not-a-tab' });
assert.strictEqual(activatedTabs.length, 1, 'drag release activation must ignore non-tab buttons');

const clickRuntime = {
  window: {},
  document: { addEventListener() {} },
  Date,
  setTimeout,
  requestAnimationFrame() {}
};
vm.createContext(clickRuntime);
const refreshStart = ui.indexOf('let uiRefreshQueued = false;');
const refreshEnd = ui.indexOf('function shouldRedrawPassiveTree', refreshStart);
assert(refreshStart >= 0 && refreshEnd > refreshStart, 'UI refresh guard block must be discoverable');
vm.runInContext(ui.slice(refreshStart, refreshEnd), clickRuntime);
const sensitiveTarget = { closest(selector) { return selector.includes('button') ? {} : null; } };
clickRuntime.beginUiPointerInteraction({ pointerId: 7, pointerType: 'touch', target: sensitiveTarget });
assert.strictEqual(clickRuntime.isUiPointerInteractionActive(), true, 'pointerdown on a click target must defer static UI refresh');
clickRuntime.finishUiPointerInteraction({ pointerId: 7 });
assert.strictEqual(clickRuntime.isUiPointerInteractionActive(), false, 'pointerup must release deferred static UI refresh');

function makeHeader(id, buttonIds) {
  return {
    id,
    buttons: buttonIds.map(buttonId => ({ id: buttonId })),
    querySelectorAll(selector) { return selector === '.tab-btn' ? this.buttons : []; }
  };
}
const top = makeHeader('', ['btn-tab-character', 'btn-tab-items']);
const bottom = makeHeader('tab-header-bottom', ['btn-tab-map']);
const orderRuntime = {
  game: { settings: {} },
  document: { querySelectorAll(selector) { return selector === '.tab-header' ? [top, bottom] : []; } }
};
vm.createContext(orderRuntime);
vm.runInContext([
  extractFunctionBlock(ui, 'getTabHeaders'),
  extractFunctionBlock(ui, 'getTabHeaderOrderSnapshot'),
  extractFunctionBlock(ui, 'commitTabHeaderDragOrder')
].join('\n'), orderRuntime);
orderRuntime.commitTabHeaderDragOrder();
assert.strictEqual(JSON.stringify(orderRuntime.game.settings.tabOrder), JSON.stringify(['btn-tab-character', 'btn-tab-items', 'btn-tab-map']), 'drag commit must persist DOM order');
assert.strictEqual(orderRuntime.game.settings.tabPlacement['btn-tab-character'], 'top', 'top header tabs must persist top placement');
assert.strictEqual(orderRuntime.game.settings.tabPlacement['btn-tab-map'], 'bottom', 'bottom header tabs must persist bottom placement');

console.log('tab drag reorder and click guard smoke checks passed');
