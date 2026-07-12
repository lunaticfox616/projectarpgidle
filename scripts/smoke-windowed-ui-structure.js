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
assert(manager.includes('isWindowTabAvailable'), 'windowed switchTab should gate locked tabs before opening windows');
assert(manager.includes('setPointerCapture'), 'window dragging/resizing must use pointer capture');
assert(manager.includes('restoreWindowMarkupForMobile'), 'window manager should restore tab markup when leaving desktop mode');
assert(manager.includes('restoreDesktopMenuForMobile'), 'window manager should restore menu markup when leaving desktop mode');
assert(manager.includes('moreMenuOutsideListenerInstalled'), 'more menu outside listener should be installed once');
assert(manager.includes('COMMUNITY_OVERLAY_THRESHOLD'), 'community mode should use workspace threshold');
assert(manager.includes("document.body.style.removeProperty('--community-dock-width')"), 'closing community should clear dock width variable');
assert(manager.includes("el.style.width = ''"), 'closing community should clear inline panel width');
assert(!manager.includes("button.id = 'ui-community-toggle'"), 'desktop community should not create a duplicate floating button');
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
assert(!css.includes('nth-child'), 'desktop HUD ordering should use semantic wrapper classes instead of nth-child');
assert(css.includes('.player-hud-vitals'), 'player HUD should use semantic row classes');
assert(css.includes('.background-combat-progress-overlay'), 'background replay should have a non-inline progress overlay style');
assert(html.indexOf('<div class="combat-zone-row">') < html.indexOf('<div class="combat-dashboard">'), 'combat header should be before battlefield dashboard');
assert(html.indexOf('<div class="map-progress-row">') < html.indexOf('<div class="combat-zone-actions">'), 'progress should live in the single combat header row');
assert(html.includes('class="combat-top-status player-hud"'), 'player HUD should have a semantic player-hud wrapper');
assert(css.includes('width: clamp(420px, 48vw, 680px)'), 'normal enemy HUD should keep requested readable width');
assert(css.includes('width: clamp(560px, 65vw, 900px)'), 'boss HUD should keep requested readable width');
assert(css.includes('height: 26px'), 'normal enemy HP bar should not be too small');
assert(css.includes('height: 34px'), 'boss and player HP bars should remain readable');
assert(css.includes('width: clamp(460px, 45vw, 640px)'), 'player HUD should keep requested readable width');
assert(css.includes('height: 7px'), 'desktop EXP bar should be 6-8px tall');
assert(css.includes('min-width: 320px'), 'mobile enemy HUD should not shrink below 320px');
console.log('smoke-windowed-ui-structure passed');
