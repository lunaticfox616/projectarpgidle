// 생장판·코어 큐브 모듈을 나눌 때를 대비한 로드 계약.
//
// AGENTS.md 3.2는 거대 파일을 나누기 전에 "로드 순서, 전역 공개 API, 상태 초기화
// 계약을 테스트로 고정"하라고 한다. js/growth-ui.js(738줄)·js/core-cube.js(1130줄)가
// 권장 500줄을 넘어 언젠가 나눠야 하므로 그 전제를 만들어 둔다.
//
// ⚠ 이 프로젝트에서 safeExposeGlobals는 "전역으로 만드는" 장치가 아니다.
//    번들러가 없어 최상위 function 선언은 어차피 전역이 된다(노출 목록에 없는
//    countUnlockedGrowthNeighbours도 전역에서 닿는다). safeExposeGlobals가 실제로 하는 일은
//    **중복 노출 차단**이다 — 같은 이름을 다른 값으로 두 번 노출하면 던진다.
//    그래서 "노출 목록에 없으면 안 닿는다"는 검사는 성립하지 않는다. 아래는
//    실제로 성립하는 것만 검사한다.
const assert = require('assert');
const fs = require('fs');
const { LOAD_ORDER, buildGameRuntime } = require('./lib/game-runtime');

const OWNED = [
    'data/growth-items.js', 'js/growth-board.js', 'js/growth-effects.js',
    'js/growth-generation.js', 'js/growth-ui.js', 'js/core-cube.js'
];

function readExposureBlocks(file) {
    const source = fs.readFileSync(file, 'utf8');
    return source.match(/safeExpose(?:Globals|Data)\(\{([\s\S]*?)\}\);/g) || [];
}

function readExports(file) {
    const blocks = readExposureBlocks(file);
    assert.strictEqual(blocks.length, 1,
        `${file}은 공개 지점이 정확히 하나여야 한다 (현재 ${blocks.length}곳). 나눌 때 무엇을 어디로 옮길지 모호해진다.`);
    const body = blocks[0].replace(/^safeExpose(?:Globals|Data)\(\{/, '').replace(/\}\);$/, '');
    return body.split(',')
        .map(part => part.trim().split(':')[0].trim())
        .filter(name => name && /^[A-Za-z_$][\w$]*$/.test(name));
}

const exportsByFile = {};
OWNED.forEach(file => { exportsByFile[file] = readExports(file); });

// ── 실제 로드가 통과해야 한다 (safeExposeGlobals의 중복 차단을 실행한다) ──
// 두 모듈이 같은 이름을 노출하면 여기서 "Duplicate global exposure"로 던진다.
// 파일을 나누다 원본에서 이름을 지우지 않으면 바로 걸린다.
const runtime = buildGameRuntime();
assert.strictEqual(typeof runtime.isGrowthBoardUnlocked, 'function', '생장판 도메인이 올라와야 한다');
assert.strictEqual(typeof runtime.renderGrowthTab, 'function', '생장판 UI가 올라와야 한다');
assert.strictEqual(typeof runtime.isCoreCubeUnlocked, 'function', '코어 큐브가 올라와야 한다');

// ── 같은 이름을 두 모듈이 내보내면 안 된다 (소스 수준 확인) ──────────────
// 위 로드가 런타임에서 잡아 주지만, 값이 같으면 통과하므로 소스에서도 본다.
{
    const owner = new Map();
    Object.entries(exportsByFile).forEach(([file, names]) => {
        names.forEach(name => {
            assert.ok(!owner.has(name),
                `${name}을 ${owner.get(name)}와 ${file}이 함께 내보낸다. 주인이 하나여야 한다.`);
            owner.set(name, file);
        });
    });
}

// ── 다른 파일이 부르는 이름은 노출 목록에 올라 있어야 한다 ───────────────
// 이것은 런타임 보증이 아니라 **큐레이션 규약**이다(AGENTS.md 2.1: 소유 모듈을
// 명확히 하고 safeExposeGlobals를 쓴다). 목록에서 빠져도 지금은 동작하지만,
// 나중에 그 함수를 IIFE 안으로 옮기거나 파일을 나눌 때 근거가 사라진다.
// 전체 export를 이름으로 박으면 내부 함수 추가마다 깨지므로, 실제 교차 호출만 본다.
{
    const otherFiles = fs.readdirSync('js')
        .filter(name => name.endsWith('.js'))
        .map(name => 'js/' + name)
        .filter(path => !OWNED.includes(path));
    const corpus = otherFiles.map(path => fs.readFileSync(path, 'utf8'));
    const exported = new Set(Object.values(exportsByFile).flat());

    // 모듈이 정의한 최상위 함수 중, 바깥에서 부르는데 노출 목록에 없는 것
    const unlisted = [];
    OWNED.forEach(file => {
        const source = fs.readFileSync(file, 'utf8');
        const defined = (source.match(/^(?:async\s+)?function\s+(\w+)/gm) || [])
            .map(line => line.replace(/^(?:async\s+)?function\s+/, ''));
        defined.forEach(name => {
            if (exported.has(name)) return;
            const pattern = new RegExp(`\\b${name}\\s*\\(`);
            if (corpus.some(text => pattern.test(text))) unlisted.push(`${file}:${name}`);
        });
    });
    assert.deepStrictEqual(unlisted, [],
        '바깥에서 부르는 함수가 공개 목록에 없다 — 소유 모듈이 불분명해져 파일을 나눌 때 근거가 사라진다');
}

// ── 로드 순서 계약 ───────────────────────────────────────────────────────
{
    const at = file => LOAD_ORDER.indexOf(file);
    assert.ok(at('js/utils.js') < at('js/state.js'), 'safeExposeGlobals가 가장 먼저 준비되어야 한다');
    assert.ok(at('data/growth-items.js') < at('js/growth-board.js'), '데이터가 도메인보다 먼저여야 한다');
    assert.ok(at('js/growth-board.js') < at('js/growth-effects.js'), '배치가 효과 계산보다 먼저여야 한다');
    assert.ok(at('js/growth-effects.js') < at('js/combat.js'), '효과 계산이 전투보다 먼저여야 한다');
    assert.ok(at('js/ui.js') < at('js/growth-ui.js'), '생장판 UI는 공용 UI 뒤여야 한다');

    // 로더가 올리는 파일은 전부 실제 페이지에도 있어야 한다.
    const html = fs.readFileSync('index.html', 'utf8');
    LOAD_ORDER.forEach(file => {
        assert.ok(html.includes(`src="${file}`), `${file}이 index.html의 로드 목록에 없다`);
    });

    // 순서도 index.html과 같아야 한다 (파일을 나누고 잘못된 위치에 끼워 넣는 것을 막는다).
    const htmlOrder = (html.match(/src="((?:js|data)\/[^"?]+\.js)/g) || [])
        .map(row => row.replace('src="', ''));
    const projected = htmlOrder.filter(file => LOAD_ORDER.includes(file));
    assert.deepStrictEqual(projected, LOAD_ORDER,
        '로더의 순서가 index.html과 어긋난다 — 로드 순서 계약이 깨졌다');
}

console.log('smoke-growth-module-surface passed');
