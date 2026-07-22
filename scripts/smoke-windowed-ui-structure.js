const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const manager = fs.readFileSync('js/ui-window-manager.js', 'utf8');
const css = fs.readFileSync('css/ui-windows.css', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const passives = fs.readFileSync('js/passives.js', 'utf8');

assert(html.includes('css/ui-windows.css'), 'window CSS must be loaded');
assert(html.includes('js/ui-window-manager.js'), 'window manager script must be loaded');
assert(/id="btn-tab-battle"[^>]*class="[^"]*active|class="[^"]*active[^"]*"[^>]*id="btn-tab-battle"/.test(html), 'battle should be the initially selected main-page tab');
assert(/id="tab-battle"[^>]*class="[^"]*active|class="[^"]*active[^"]*"[^>]*id="tab-battle"/.test(html), 'battle content should be the initial main page');
assert(!/id="tab-settings"[^>]*class="[^"]*active|class="[^"]*active[^"]*"[^>]*id="tab-settings"/.test(html), 'settings must not replace the main page at startup');
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
assert(manager.includes('restoreDesktopMenuForMobile'), 'window manager should restore menu markup when leaving desktop mode');
assert(manager.includes("art.className = 'ui-rail-art'"), 'rail artwork must be one real image element');
assert(manager.includes('COMMUNITY_OVERLAY_THRESHOLD'), 'community mode should use workspace threshold');
assert(manager.includes("document.body.style.removeProperty('--community-dock-width')"), 'closing community should clear dock width variable');
assert(manager.includes("el.style.width = ''"), 'closing community should clear inline panel width');
// 채팅 토글은 레일 커뮤니티 탭이 아니라 전용 말풍선 버튼이 담당한다(사용자 요구 변경).
assert(manager.includes("button.id = 'ui-community-toggle'"), 'desktop chat should have a dedicated floating toggle button');
assert(css.includes('#btn-tab-social { display: none !important; }'), 'rail community tab should be hidden while the floating toggle owns chat');
assert(manager.includes('closeAllWindows'), 'close-all-windows action must exist');
assert(manager.includes('closePersistedSurfacesForBoot'), 'startup should close previously open windows without discarding their geometry');
assert(ui.includes("switchTab('tab-battle')"), 'entering the game should focus the main battlefield');
assert(!passives.includes("if (document.getElementById('tab-battle').classList.contains('active')) switchTab('tab-character')"), 'desktop layout sync must not open the character window over the main battlefield');
assert(manager.includes("if (!desktop) {"), 'responsive mode should explicitly handle mobile fallback');
assert(css.includes('body.desktop-windowed-ui #right-pane'), 'right pane should become window layer');
assert(css.includes('#tab-social.ui-community-dock'), 'social tab should be a dock panel');
assert(css.includes('#tab-social.ui-community-overlay'), 'social tab should support overlay mode');
assert(css.includes('container-type: inline-size'), 'window body should enable container-based responsive layout');
assert(css.includes('#enemy-area'), 'enemy HUD overlay rules should exist');
assert(css.includes('.ui-goal-drawer'), 'goal drawer CSS should exist');
assert(css.includes('pointer-events: none'), 'transparent window layer should not block battlefield input');
assert(!css.includes('nth-child'), 'desktop HUD ordering should use semantic wrapper classes instead of nth-child');
assert(css.includes('.player-hud-vitals'), 'player HUD should use semantic row classes');
assert(css.includes('.background-combat-progress-overlay'), 'background replay should have a non-inline progress overlay style');
assert(html.indexOf('<div class="combat-zone-row">') < html.indexOf('<div class="combat-dashboard">'), 'combat header should be before battlefield dashboard');
assert(html.indexOf('<div class="map-progress-row">') < html.indexOf('<div class="combat-zone-actions">'), 'progress should live in the single combat header row');
assert(/class="combat-zone-row-title">\s*<span id="ui-combat-zone-inline"/.test(html), 'contract status must stay inside the zone-title cell');
assert(css.includes('#ui-combat-zone-inline { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }'), 'zone title should shrink before action buttons wrap');
assert(html.includes('class="combat-top-status player-hud"'), 'player HUD should have a semantic player-hud wrapper');
assert(css.includes('width: clamp(420px, 48vw, 680px)'), 'normal enemy HUD should keep requested readable width');
assert(css.includes('width: clamp(560px, 65vw, 900px)'), 'boss HUD should keep requested readable width');
assert(css.includes('height: 26px'), 'normal enemy HP bar should not be too small');
assert(css.includes('height: 34px'), 'boss and player HP bars should remain readable');
assert(css.includes('width: clamp(460px, 45vw, 640px)'), 'player HUD should keep requested readable width');
assert(css.includes('height: 7px'), 'desktop EXP bar should be 6-8px tall');
assert(css.includes('min-width: 320px'), 'mobile enemy HUD should not shrink below 320px');

// 코어 큐브 창: .core-cube-shell(css/core-cube.css)이 2열 그리드
// minmax(420px,..) + minmax(310px,..) + gap 14px를 쓴다. 창 본문 좌우 패딩(26px*2)을 더한
// 최소 필요 폭보다 창 기본/최소 폭이 좁으면 오른쪽 카드(동력원 보관함 등)가 창 밖으로 밀려
// 잘려 보인다(회귀: 720/480이었을 때 실측으로 재현됨).
const coreCubeCss = fs.readFileSync('css/core-cube.css', 'utf8');
const shellMatch = coreCubeCss.match(/\.core-cube-shell\s*{[^}]*grid-template-columns:\s*minmax\((\d+)px[^)]*\)\s*minmax\((\d+)px[^)]*\)[^}]*gap:\s*(\d+)px/);
assert(shellMatch, 'core-cube-shell grid definition must be parseable for the width regression check');
const [colAMin, colBMin, gridGap] = [Number(shellMatch[1]), Number(shellMatch[2]), Number(shellMatch[3])];
const windowBodyPadding = 26 * 2; // css/ui-windows.css .ui-window-body: padding: 20px 26px 26px
const requiredCubeWidth = colAMin + colBMin + gridGap + windowBodyPadding;
const cubeDefMatch = manager.match(/'tab-cube':\s*{[^}]*width:\s*(\d+)[^}]*minWidth:\s*(\d+)/);
assert(cubeDefMatch, 'tab-cube window definition must be parseable for the width regression check');
const [cubeWidth, cubeMinWidth] = [Number(cubeDefMatch[1]), Number(cubeDefMatch[2])];
assert(cubeWidth >= requiredCubeWidth, `tab-cube default width (${cubeWidth}) must fit the core-cube-shell grid minimum (${requiredCubeWidth}) or the right column overflows the window`);
assert(cubeMinWidth >= requiredCubeWidth, `tab-cube minWidth (${cubeMinWidth}) must not let users resize below the core-cube-shell grid minimum (${requiredCubeWidth})`);

console.log('smoke-windowed-ui-structure passed');
