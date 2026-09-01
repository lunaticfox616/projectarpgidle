const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const mobileCss = fs.readFileSync('css/mobile.css', 'utf8');
const gameCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
const assetCss = fs.readFileSync('css/ui-asset-skins.css', 'utf8');
const responsiveCss = fs.readFileSync('css/ui-responsive-refine.css', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');
const responsiveLayoutCss = mobileCss.slice(mobileCss.indexOf('@media (max-width: 1080px)'), mobileCss.indexOf('@media (max-width: 720px)'));

assert.ok(html.includes('id="ui-combat-flasks"'), 'combat HUD should expose the flask charge strip');
assert.ok(/body\.mobile-battle-tab #tab-battle \.battlefield-wrap\s*\{[^}]*width:\s*min\(100%,\s*816px\);[^}]*height:\s*clamp\(320px,\s*48svh,\s*520px\)\s*!important;[^}]*aspect-ratio:\s*auto;/.test(mobileCss),
  'phone battlefields need extra vertical room for a contained full-map view');
assert.ok(/orientation:\s*landscape[^}]*max-height:\s*600px[\s\S]*?\.battlefield-wrap\s*\{[^}]*width:\s*min\(100%,\s*81\.08svh\);[^}]*height:\s*min\(76svh,\s*360px\)\s*!important;/.test(mobileCss),
  'short landscape phones need a bounded but still vertical battlefield');
assert.ok(/\.battlefield-wrap\.compressed\s*\{[^}]*height:\s*0\s*!important;[^}]*aspect-ratio:\s*auto;/.test(mobileCss),
  'collapsed battlefields must stay collapsed after the mobile ratio rule');
assert.ok(/body\.mobile-battle-tab #tab-battle \.enemy-empty\s*\{\s*display:\s*none\s*!important;\s*}/.test(responsiveCss),
  'the empty enemy HUD must not push the mobile battlefield below the fold');
assert.ok(/#enemy-area\s*\{[^}]*position:\s*absolute;[^}]*z-index:\s*30;/.test(responsiveCss),
  'mobile enemy identity and health must overlay the battlefield instead of consuming a layout row');
assert.ok(/#ui-progress-label\s*\{\s*display:\s*none\s*!important;\s*}/.test(responsiveCss),
  'the percent text makes the separate mobile progress label redundant');
assert.ok(mobileCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr)) !important'), 'dense mobile map layouts should collapse to two columns');
assert.ok(mobileCss.includes('@media (max-width: 480px)'), 'small phones need a dedicated one-column breakpoint');
assert.ok(mobileCss.includes('min-height: 48px'), 'mobile tab rails need enough height for touch controls');
assert.ok(mobileCss.includes('min-height: 44px !important'), 'mobile tabs need a 44px touch target');
assert.ok(mobileCss.includes('scroll-snap-type: x proximity'), 'wide mobile tab rails should settle on readable tab boundaries');
assert.ok(/#tab-skills \.search-filter-panel\s*\{[^}]*box-sizing:\s*border-box/.test(mobileCss), 'skill search controls must stay inside the phone viewport');
assert.ok(gameCss.includes('.gem-engrave-slot-dialog'), 'engraving slot selection needs a responsive in-game dialog');
assert.ok(gameCss.includes('.combat-flask-mini'), 'combat flask charges need dedicated readable controls');
assert.ok(ui.indexOf('function renderCombatFlaskHud()') < ui.indexOf('function updateCombatUI('), 'the dynamic combat HUD renderer must live in updateCombatUI scope');
assert.ok(/#mobile-battle-pip\.mobile-battle-dock\s*{[^}]*position:\s*relative/.test(mobileCss), 'mobile battle preview must stay in layout flow instead of covering cards and actions');
assert.ok(!ui.includes('host.style.cssText = \'position:fixed'), 'mobile battle preview must not restore the floating overlay layout');
assert.ok(responsiveLayoutCss.includes('.equipment-mobile-switch {'), 'tablet-width one-column equipment layouts need the inventory/loadout switch');
assert.ok(ui.includes("host.setAttribute('aria-label', '전투 화면으로 이동')"), 'mobile battle PiP needs an accessible action name');
assert.ok(mobileCss.includes('.combat-dashboard { display: contents !important; }'), 'mobile combat HUD sections should share one explicit vertical order');
assert.ok(responsiveCss.includes("grid-template-areas: 'zone progress actions' !important"),
  'mobile zone, progress, and combat actions should share one compact row');
assert.ok(mobileCss.includes('.player-hud { order: 2; }'), 'the player gauge and flasks should render below the battlefield on mobile');
assert.ok(/\.player-hud-shell\s*\{[^}]*grid-template-rows:\s*36px 24px\s*!important;[^}]*height:\s*66px\s*!important;[^}]*overflow:\s*hidden/.test(responsiveCss),
  'the mobile player HUD must reserve a fixed effect row inside one stable box');
assert.ok(/\.player-hud-shell > \.player-combat-effect-strip\s*\{[^}]*position:\s*relative\s*!important;[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*2;/.test(responsiveCss),
  'mobile effects must participate in the integrated HUD layout instead of floating above health');
assert.ok(/\.player-hud-shell > \.player-combat-effect-strip:empty\s*\{\s*display:\s*flex\s*!important;/.test(responsiveCss),
  'the reserved mobile effect row must not collapse when no effect is active');
assert.ok(/#enemy-area \.enemy-card\.targeted > \.enemy-combat-effect-strip \.combat-effect-icon\s*\{[^}]*width:\s*18px\s*!important;[^}]*height:\s*18px\s*!important;/.test(responsiveCss),
  'mobile monster effects must remain compact above the enlarged battlefield');
assert.ok(/\.combat-feed-title\s*\{[^}]*display:\s*none\s*!important;/.test(responsiveCss),
  'the mobile combat log must not spend a row on a redundant title');
assert.ok(/\.combat-feed\s*\{[^}]*height:\s*168px\s*!important;[^}]*overflow:\s*hidden\s*!important;/.test(responsiveCss),
  'the mobile combat log must use the requested doubled compact height');
assert.ok(/\.combat-feed #log,[\s\S]*?\.combat-feed\.collapsed #log\s*\{[^}]*overflow-y:\s*auto\s*!important;/.test(responsiveCss),
  'the mobile combat log must retain access to its full history by scrolling');
assert.ok(!responsiveCss.includes('#log > .log-msg:nth-last-child(n+4)'),
  'mobile combat history must not hide older entries');
assert.ok(/id="ui-bounty-box"[^>]*><\/div>\s*<button id="btn-combat-goal-toggle"[\s\S]*?<\/button>\s*<\/div>/.test(html),
  'the mobile goal button must live inside the battlefield so it can occupy the top-right corner');
assert.ok(/#battlefield-wrap > #btn-combat-goal-toggle:not\(\[hidden\]\)\s*\{[^}]*position:\s*absolute;[^}]*top:\s*6px;[^}]*right:\s*6px;/.test(responsiveCss),
  'the visible mobile goal button must anchor to the battlefield top-right corner');
assert.ok(/\.battlefield-wrap\s*\{[^}]*border:\s*0\s*!important;[^}]*box-shadow:\s*none\s*!important;/.test(responsiveCss),
  'the mobile battlefield must not leak a bright border or outer shadow along its right and bottom edges');
assert.ok(/\.battlefield-wrap\s*\{[^}]*background:\s*#070b12\s*!important;/.test(responsiveCss),
  'the mobile battlefield wrapper must match the canvas underlay so subpixel seams stay dark');
assert.ok(!/player-health-frame:has\([^}]*margin-top:\s*32px/.test(responsiveCss),
  'effect changes must never push the mobile health frame vertically');
assert.ok(mobileCss.includes('.combat-feed.collapsed #log { display: block;'), 'a collapsed mobile combat log must keep recent entries visible');
assert.ok(/player-hud-identity-row\s*\{[\s\S]*?position:\s*static;[\s\S]*?width:\s*100%;/.test(assetCss), 'mobile player identity text should use the full HUD width instead of clipping inside the desktop frame slot');
assert.ok(/\.startup-panel\.hero,[\s\S]*?\.startup-hero-copy\s*\{\s*display:\s*contents;/.test(gameCss), 'mobile startup content should be reorderable without duplicating the login form');
assert.ok(gameCss.includes('.startup-panel.auth { order: 1;'), 'the login form should appear before local-save details on mobile');
assert.ok(gameCss.includes('box-sizing: border-box;'), 'the mobile login panel must include padding within the viewport width');
assert.ok(gameCss.includes('.startup-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr));'), 'mobile local-save details should remain compact');

// 부적 보드는 8열 고정이다. 칸 크기를 42px로 박아 두면 보드 폭이 364px이 되어
// 360px 기기에서 오른쪽 열이 화면 밖으로 29px 밀려 나가고, 가로 스크롤도 없어
// 8열째를 영영 누를 수 없었다. 칸 크기는 화면 폭을 따라야 한다.
{
  const components = fs.readFileSync('css/components.css', 'utf8');
  assert.ok(/#ui-talisman-board\s*{[^}]*--talisman-cell:\s*clamp\(/.test(components),
    '부적 보드 칸 크기는 화면 폭에 맞춰 줄어들어야 한다');
  assert.ok(!/grid-template-columns:\s*repeat\(8,\s*42px\)/.test(html),
    '부적 보드 열 폭을 42px로 고정하면 좁은 화면에서 열이 잘린다');
  assert.ok(html.includes('repeat(8, var(--talisman-cell))'),
    '부적 보드 격자는 칸 크기 변수를 써야 한다');
  assert.ok(!/width:42px;\s*height:42px/.test(ui),
    '부적 보드 칸을 인라인 42px로 그리면 CSS가 줄일 수 없다');
  assert.ok((ui.match(/width:var\(--talisman-cell\); height:var\(--talisman-cell\)/g) || []).length >= 2,
    '빈 칸과 실제 칸 모두 같은 변수를 써야 격자가 어긋나지 않는다');
}

// @container 규칙은 container-type을 선언한 조상이 있어야 켜진다. 이 프로젝트에서
// 그 선언은 데스크톱 창 UI(.ui-window-body) 한 곳뿐이라, 휴대폰에서는 @container로만
// 쓴 좁은 화면 레이아웃이 통째로 죽는다. 360px에서 스킬 요약 4칸 중 2칸(공명력·
// 소환 한도)이 잘려 보이지 않았던 원인이다. 화면 폭 기준 대체 규칙이 있어야 한다.
{
  const overhaul = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
  const windows = fs.readFileSync('css/ui-windows.css', 'utf8');
  const containerHosts = (overhaul + windows).match(/container-type:\s*inline-size/g) || [];
  assert.ok(containerHosts.length >= 1, 'container-type 선언이 사라지면 창 UI의 @container가 죽는다');
  assert.ok(/body:not\(\.desktop-windowed-ui\)\s*\.skill-loadout-summary/.test(overhaul),
    '창 UI가 아닌 화면에도 스킬 요약 좁은 레이아웃이 걸려야 한다');
  // 좁은 화면에서 4열을 유지하면 최소 폭 76px×4 때문에 뒤쪽 칸이 잘린다.
  const narrow = overhaul.slice(overhaul.indexOf('@media (max-width: 480px)'));
  assert.ok(/body:not\(\.desktop-windowed-ui\)[^{]*\.skill-loadout-summary[^{]*{[^}]*grid-template-columns:\s*1fr 1fr/.test(narrow),
    '480px 이하에서는 스킬 요약이 2열로 접혀야 한다');
  assert.ok(!/^\s*\.skill-loadout-summary\s*{[^}]*min-width:\s*min\(430px[^}]*}\s*$/m.test(narrow),
    '좁은 화면 블록이 min-width를 다시 강제하면 안 된다');
  // 같은 원인으로 눌려 있던 나머지도 화면 폭 기준 규칙이 있어야 한다.
  // (360px 측정: 장비 요약 4열×71px, 젬 연구 요약 3열 중 최소 58px, 연구 격자 2열×65px)
  [
    ['.equipment-loadout-summary', '장비 요약 4열'],
    ['.gem-research-summary', '젬 연구 요약 3열'],
    ['.gem-research-grid', '젬 연구 격자 2열'],
    ['.gem-research-columns', '젬 연구 2단 배치']
  ].forEach(([selector, why]) => {
    const pattern = new RegExp(`body:not\\(\\.desktop-windowed-ui\\)\\s*${selector.replace('.', '\\.')}`);
    assert.ok(pattern.test(overhaul), `${why}이 좁은 화면에서 접히지 않으면 글자가 읽히지 않는다`);
  });
  // mobile.css가 이미 !important로 덮은 것을 여기에 또 적으면 규칙이 갈라진다.
  const mobileCovered = ['.gem-target-list', '.gem-support-process-list', '.skill-gem-library'];
  mobileCovered.forEach(selector => {
    assert.ok(mobileCss.includes(selector), `${selector}는 mobile.css가 담당한다`);
    assert.ok(!overhaul.includes(`body:not(.desktop-windowed-ui) ${selector}`),
      `${selector}는 mobile.css가 이미 덮으므로 여기서 중복 선언하면 안 된다`);
  });
}

console.log('smoke-mobile-playability passed');
