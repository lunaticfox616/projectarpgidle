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

console.log('smoke-mobile-playability passed');
