const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const mobileCss = fs.readFileSync('css/mobile.css', 'utf8');
const gameCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
const ui = fs.readFileSync('js/ui.js', 'utf8');

assert.ok(html.includes('id="ui-combat-flasks"'), 'combat HUD should expose the flask charge strip');
assert.ok(mobileCss.includes('height: clamp(210px, 42svh, 360px) !important'), 'phone battlefields need a playable viewport height');
assert.ok(mobileCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr)) !important'), 'dense mobile map layouts should collapse to two columns');
assert.ok(mobileCss.includes('@media (max-width: 480px)'), 'small phones need a dedicated one-column breakpoint');
assert.ok(gameCss.includes('.gem-engrave-slot-dialog'), 'engraving slot selection needs a responsive in-game dialog');
assert.ok(gameCss.includes('.combat-flask-mini'), 'combat flask charges need dedicated readable controls');
assert.ok(ui.indexOf('function renderCombatFlaskHud()') < ui.indexOf('function updateCombatUI('), 'the dynamic combat HUD renderer must live in updateCombatUI scope');

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
