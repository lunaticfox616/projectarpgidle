const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const manager = fs.readFileSync('js/ui-window-manager.js', 'utf8');
const css = fs.readFileSync('css/ui-windows.css', 'utf8');

assert(html.includes('css/ui-windows.css'), 'window CSS must be loaded');
assert(html.includes('js/ui-window-manager.js'), 'window manager script must be loaded');
assert(html.indexOf('js/social.js') < html.indexOf('js/ui-window-manager.js'), 'window manager should load after social.js');
assert(html.indexOf('js/ui-window-manager.js') < html.indexOf('js/main.js'), 'window manager should load before main.js');

[
  'tab-character', 'tab-items', 'tab-skills', 'tab-char', 'tab-traits',
  'tab-expertise', 'tab-codex', 'tab-map', 'tab-cube', 'tab-settings'
].forEach(id => assert(manager.includes(`'${id}'`), `${id} must be registered as a window`));

[
  'openWindow', 'closeWindow', 'minimizeWindow', 'resetWindowLayout',
  'openCommunityDock', 'closeCommunityDock', 'toggleGoalDrawer', 'toggleMaximizeWindow'
].forEach(name => assert(manager.includes(name), `${name} must exist`));

assert(manager.includes('UI_LAYOUT_STORAGE_KEY'), 'UI layout must use separate local storage');
assert(manager.includes('originalSwitchTab'), 'switchTab compatibility adapter must be installed');
assert(manager.includes('setPointerCapture'), 'window dragging/resizing must use pointer capture');
assert(manager.includes('restoreWindowMarkupForMobile'), 'window manager should restore tab markup when leaving desktop mode');
assert(manager.includes('COMMUNITY_OVERLAY_THRESHOLD'), 'community mode should use workspace threshold');
assert(manager.includes('PRIMARY_TAB_IDS'), 'desktop menu should define primary pinned tabs');
assert(manager.includes('MORE_TAB_IDS'), 'desktop menu should define more-menu tabs');
assert(manager.includes("if (!desktop) {"), 'responsive mode should explicitly handle mobile fallback');
assert(css.includes('body.desktop-windowed-ui #right-pane'), 'right pane should become window layer');
assert(css.includes('#tab-social.ui-community-dock'), 'social tab should be a dock panel');
assert(css.includes('#tab-social.ui-community-overlay'), 'social tab should support overlay mode');
assert(css.includes('.ui-more-menu'), 'desktop more menu CSS should exist');
assert(css.includes('container-type: inline-size'), 'window body should enable container-based responsive layout');
assert(css.includes('#enemy-area'), 'enemy HUD overlay rules should exist');
assert(css.includes('.ui-goal-drawer'), 'goal drawer CSS should exist');
assert(css.includes('pointer-events: none'), 'transparent window layer should not block battlefield input');
console.log('smoke-windowed-ui-structure passed');
