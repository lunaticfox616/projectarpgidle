const fs = require('fs');
const assert = require('assert');

const index = fs.readFileSync('index.html', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const state = fs.readFileSync('js/state.js', 'utf8');
const polish = fs.readFileSync('css/ui-polish.css', 'utf8');
const premium = fs.readFileSync('css/ui-premium.css', 'utf8');

const exploreTabs = [
  'map-explore-hunting',
  'map-explore-root-boss',
  'map-explore-labyrinth',
  'map-explore-deep-chaos',
  'map-explore-meteor',
  'map-explore-beehive',
  'map-explore-colony',
  'map-explore-voidrift',
  'map-explore-trials',
];

assert(index.includes('class="vertical-tab-layout codex-vertical-layout"'), 'codex must use the shared vertical-tab layout');
assert(index.includes('id="btn-codex-main"') && index.includes('id="btn-codex-realm"'), 'codex vertical tabs must keep both codex buttons');
assert(ui.includes('function syncCodexSubtabButtons()'), 'codex render must synchronize the active vertical tab button');

assert(index.includes('class="vertical-tab-layout map-explore-layout"'), 'map exploration must use the shared vertical-tab layout');
for (const id of exploreTabs) {
  assert(index.includes(`id="${id}"`), `map exploration panel ${id} must exist`);
  assert(index.includes(`id="btn-${id}"`), `map exploration vertical tab button for ${id} must exist`);
}
assert(ui.includes('function switchMapExploreSubtab(subtabId)'), 'map exploration must have a dedicated vertical subtab switcher');
assert(state.includes("mapExploreSubtab: 'map-explore-hunting'"), 'default state must remember the selected map exploration vertical tab');
assert(ui.includes('merged.mapExploreSubtab ='), 'save normalization must validate the selected map exploration vertical tab');

assert(polish.includes('.vertical-tab-layout') && polish.includes('.vertical-tab-btn.active'), 'vertical tabs must have dedicated polished styles');
assert(premium.includes(':not(.vertical-tab-btn)'), 'premium generic button skin must not override vertical tab buttons');

console.log('vertical tabs smoke checks passed');
