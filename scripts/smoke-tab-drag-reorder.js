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

assert(ui.includes('TAB_DRAG_LONG_PRESS_MS'), 'tab drag must use a long-press threshold');
assert(ui.includes('document.addEventListener(\'click\', onTabHeaderClickCapture, true)'), 'tab drag must suppress the follow-up click after a drag');
assert(ui.includes('isUiPointerInteractionActive()'), 'static UI refresh must defer while a pointer interaction is active');
assert(css.includes('.tab-btn.dragging'), 'dragging tab style must exist');
assert(index.includes('css/base.css?v=20260611-tab-drag1'), 'base CSS cache buster must include tab drag styles');
assert(index.includes('js/ui.js?v=20260611-tab-drag1'), 'UI cache buster must include tab drag handlers');

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
