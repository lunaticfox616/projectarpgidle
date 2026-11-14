// 부팅 스크립트 계약 회귀 검사.
// index.html의 classic <script>들은 하나의 전역 스코프를 공유하므로,
// (1) 각 파일이 단독으로 파싱 가능해야 하고
// (2) 파일 간 최상위 let/const 충돌(예: 두 브랜치 병합으로 생긴 중복 `let now`)이 없어야
// 게임이 첫 화면에서 진행될 수 있다. 이 검사는 그 계약을 브라우저 없이 고정한다.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const espree = require('espree');
const { LOAD_ORDER } = require('./lib/game-runtime');
// A hand-edited or outdated generated adapter must not pass while the ESM source differs.
require('node:child_process').execFileSync(process.execPath, [require.resolve('./build-modules'), '--check'], { stdio: 'pipe' });

const html = fs.readFileSync('index.html', 'utf8');
const sources = [];
const scriptTag = /<script[^>]*src="([^"?]+)(?:\?[^"]*)?"[^>]*>/g;
let match;
while ((match = scriptTag.exec(html)) !== null) {
    const src = match[1];
    if (/^https?:\/\//.test(src)) continue;
    if(LOAD_ORDER.includes(src))assert(/\bdefer\b/.test(match[0])&&!/\basync\b/.test(match[0]),
        `${src}: shared runtime scripts must defer in document order; an immediate script can run before utils`);
    sources.push(src);
}
assert(sources.length >= 10, `index.html에서 로컬 스크립트를 찾지 못했습니다 (${sources.length}개)`);
assert(sources.includes('js/ui-runtime-ui.js'), '화면 갱신 진입점이 index.html에 연결되어 있어야 합니다');
assert(sources.includes('js/ui-window-manager.js'), '창 관리자가 index.html에 연결되어 있어야 합니다');

// 공용 테스트 런타임도 실제 페이지의 파일 순서를 따라야 한다.
assert.deepStrictEqual(sources.filter(src => LOAD_ORDER.includes(src)), LOAD_ORDER,
    '테스트 런타임의 파일/순서가 index.html과 어긋났습니다');
assert(sources.indexOf('js/social.js') < sources.indexOf('js/ui-window-manager.js')
    && sources.indexOf('js/ui-window-manager.js') < sources.indexOf('js/main.js'),
    '창 관리자는 소셜 UI 이후, 부트스트랩 이전에 로드돼야 합니다');

// (1) 파일 단독 파싱: SyntaxError면 해당 파일 전체(모든 전역 함수)가 사라져 부팅이 죽는다.
for (const src of sources) {
    const code = fs.readFileSync(src, 'utf8');
    try {
        new vm.Script(code, { filename: src });
    } catch (error) {
        assert.fail(`${src} 파싱 실패: ${error.message}`);
    }
}

// (2) 전역 어휘 스코프 충돌: classic script의 최상위 let/const/class는 전역 어휘 환경을
// 공유하므로, 파일들을 이어 붙여 한 번에 컴파일하면 브라우저와 동일하게
// "Identifier 'x' has already been declared"가 재현된다.
const combined = sources.map(src => fs.readFileSync(src, 'utf8')).join('\n;\n');
try {
    new vm.Script(combined, { filename: 'combined-boot-scripts' });
} catch (error) {
    assert.fail(`전역 스코프 선언 충돌: ${error.message}`);
}

const productionUiSource = [
    html,
    ...fs.readdirSync('js')
        .filter(name => name.endsWith('.js'))
        .map(name => fs.readFileSync(`js/${name}`, 'utf8'))
].join('\n');
assert.ok(!/\b(?:alert|confirm|prompt)\s*\(/.test(productionUiSource),
    'production UI must use the in-game dialog system instead of browser-native dialogs');

// (3) function 선언도 같은 window 프로퍼티를 공유한다. let/const와 달리 문법 오류 없이
// 뒤 파일이 앞 구현을 덮어쓰므로, 모듈 소유권이 깨진 채 계산식만 조용히 바뀌는 회귀를 막는다.
const functionOwners = new Map();
for (const src of sources) {
    const code = fs.readFileSync(src, 'utf8');
    const topLevelFunctions = espree.parse(code,{ecmaVersion:'latest'}).body.filter(node=>node.type==='FunctionDeclaration');
    for (const declaration of topLevelFunctions) {
        const name = declaration.id.name;
        const previousOwner = functionOwners.get(name);
        assert(!previousOwner, `전역 함수 '${name}' 중복 선언: ${previousOwner}, ${src}`);
        functionOwners.set(name, src);
    }
}

// Release packaging must preserve initialization and save semantics, not merely parse.
(async () => {
    const { describeScript, packClassicScripts } = require('./lib/classic-bundles');
    const { stripDevOnly } = require('./lib/release-bundle');
    const { buildGameRuntime } = require('./lib/game-runtime');
    const rows = LOAD_ORDER.map(file => describeScript(file, stripDevOnly(fs.readFileSync(file, 'utf8'), file)));
    const packed = await packClassicScripts(rows);
    const oldRuntime = buildGameRuntime(Object.fromEntries(rows.map(row => [row.file, row.code])));
    const newRuntime = buildGameRuntime({}, null, {}, packed);
    const snapshots = [oldRuntime, newRuntime].map(runtime => {
        let seed = 7;
        runtime.Math = Object.create(Math);
        runtime.Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000);
        runtime.Date = class extends Date { static now() { return 1800000000000; } };
        return vm.runInContext(`
            game = mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
                level:37,exp:1234,season:2,currentZoneId:3,maxZoneId:5,currencies:{dew:117,sap:7}});
            game = mergeDefaults(JSON.parse(serializeSaveState(game)));
            JSON.stringify([serializeSaveState(game),getPlayerStats(),typeof saveGame,typeof loadGame]);
        `, runtime);
    });
    assert.strictEqual(snapshots[1], snapshots[0], 'packaging changed restored state or player stats');
    const boundary = [
        "var observed=[]; observed.push(typeof later);",
        "function later(){return 7;} observed.push(later()); const privateValue=11;",
        "'use strict'; (function(){observed.push(this===undefined);})();",
        "observed.push(privateValue, typeof window.privateValue);"
    ].map((code, index) => describeScript(`boundary-${index}.js`, code));
    const context = vm.createContext({}); context.window = context;
    for (const row of await packClassicScripts(boundary)) vm.runInContext(row.code, context);
    assert.strictEqual(vm.runInContext('JSON.stringify(observed)', context), '["undefined",7,true,11,"undefined"]',
        'packaging changed function hoisting, strict mode or lexical visibility');
    console.log(`smoke-boot-script-contract passed (${sources.length} scripts; bundled boot/save parity)`);
})().catch(error => { console.error(error); process.exitCode = 1; });
