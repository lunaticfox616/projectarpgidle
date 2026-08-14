// js/ui.js의 거대 렌더 함수를 화면별 모듈로 쪼개는 작업의 래칫.
//
// 왜 이 검사가 필요한가: performUpdateStaticUI 하나가 2,000줄을 넘고 그 안에 함수 수십 개가
// 중첩 선언되어 있다. 한 화면을 손대면 무관한 화면이 깨지는 회귀(#920, #921)의 구조적 원인이다.
// 쪼개는 작업은 여러 번에 나눠 진행하므로, 되돌아가지 않도록 상한을 고정한다.
//
// 규칙:
//   - 상한을 넘기면 실패한다. 화면을 새로 추가할 때는 ui.js에 끼워 넣지 말고 자기 파일로 만든다.
//   - 쪼개서 수치가 내려가면 이 파일의 상한도 함께 내린다(래칫은 한 방향으로만 움직인다).
const assert = require('assert');
const fs = require('fs');
const { buildGameRuntime } = require('./lib/game-runtime');

// 현재값(2026-08-08 기준). 내려갈 때만 갱신한다.
const MAX_RENDER_LINES = 2288;
const MAX_NESTED_DECLARATIONS = 63;

const runtime = buildGameRuntime();
assert.strictEqual(typeof runtime.performUpdateStaticUI, 'function', '렌더 함수를 찾을 수 있어야 한다');

// 소스 문자열이 아니라 실제 함수 본문을 본다. 중괄호를 세면 템플릿 문자열과 CSS에 속는다.
const renderSource = runtime.performUpdateStaticUI.toString();
const renderLines = renderSource.split('\n').length;
const nested = [...renderSource.matchAll(/^function (\w+)\(/gm)].map(match => match[1]);

assert.ok(renderLines <= MAX_RENDER_LINES,
    `performUpdateStaticUI가 ${renderLines}줄로 늘었다(상한 ${MAX_RENDER_LINES}). `
    + '새 화면은 ui.js에 끼워 넣지 말고 js/<화면>-ui.js로 만든다.');
assert.ok(nested.length <= MAX_NESTED_DECLARATIONS,
    `렌더 함수 안 중첩 선언이 ${nested.length}개로 늘었다(상한 ${MAX_NESTED_DECLARATIONS}).`);

// 상한이 실제보다 크게 벌어지면 래칫이 헐거워진다. 쪼갠 뒤에는 상한도 함께 내린다.
assert.ok(MAX_RENDER_LINES - renderLines < 150,
    `렌더 함수가 ${renderLines}줄로 줄었다. 이 파일의 MAX_RENDER_LINES를 ${renderLines}로 내려 래칫을 조인다.`);
assert.ok(MAX_NESTED_DECLARATIONS - nested.length < 8,
    `중첩 선언이 ${nested.length}개로 줄었다. MAX_NESTED_DECLARATIONS를 ${nested.length}로 내린다.`);

// ── 이미 분리한 화면은 다시 들어오지 않는다 ─────────────────────────
// 각 화면은 자기 파일에 살고, 렌더 함수는 호출만 한다.
const EXTRACTED_SCREENS = [
    { fn: 'renderSkillGemScreen', file: 'js/skills-ui.js', callSite: "isTabRendering('tab-skills')" },
    { fn: 'renderRecordsTab', file: 'js/records-ui.js', callSite: "isTabRendering('tab-records')" }
];
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
EXTRACTED_SCREENS.forEach(screen => {
    assert.strictEqual(typeof runtime[screen.fn], 'function', `${screen.fn}이 전역으로 노출되어야 한다`);
    const moduleSource = fs.readFileSync(screen.file, 'utf8');
    assert.ok(moduleSource.includes(`function ${screen.fn}(`), `${screen.fn}은 ${screen.file}에 있어야 한다`);
    assert.ok(!renderSource.includes(`function ${screen.fn}(`), `${screen.fn}이 렌더 함수 안으로 되돌아오면 안 된다`);
    assert.ok(uiSource.includes(screen.callSite), `${screen.file}의 화면은 ${screen.callSite} 판정으로 호출되어야 한다`);
});

// 분리한 화면 파일은 자기 화면 밖의 DOM을 만지지 않는다(다른 화면을 깨뜨리는 통로를 막는다).
const skillsSource = fs.readFileSync('js/skills-ui.js', 'utf8');
assert.ok(!/querySelectorAll\(['"]\.tab-content/.test(skillsSource),
    '화면 모듈이 최상위 탭 상태를 직접 건드리면 안 된다');

// ── 중첩 선언이 왜 문제인가를 검사로 남긴다 ─────────────────────────
// 중첩 선언은 전역이 아니라서, 화면을 파일로 분리하면 곧바로 ReferenceError가 난다.
// 그래서 지금은 exposeUiRenderHelpersOnce가 필요한 것만 열어 준다. 이 통로가 사라지면
// 분리된 화면들이 런타임에 깨지므로 존재를 고정한다.
assert.ok(/function exposeUiRenderHelpersOnce\(\)/.test(uiSource),
    '중첩 헬퍼를 화면 모듈에 열어 주는 통로가 있어야 한다');
['getGemSearchText', 'isGemLibraryMatchVisible', 'highlightSearchText', 'renderSearchSection'].forEach(name => {
    assert.ok(nested.includes(name), `${name}은 아직 렌더 함수 안에 중첩 선언되어 있다(정리 대상)`);
    assert.ok(new RegExp(`^\\s+${name},?\\s*$`, 'm').test(uiSource),
        `${name}은 분리된 스킬 젬 화면이 쓰므로 전역으로 열려 있어야 한다`);
});

console.log(`smoke-ui-render-decomposition passed (렌더 ${renderLines}줄 / 중첩 ${nested.length}개)`);
