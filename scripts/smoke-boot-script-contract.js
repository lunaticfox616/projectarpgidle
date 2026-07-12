// 부팅 스크립트 계약 회귀 검사.
// index.html의 classic <script>들은 하나의 전역 스코프를 공유하므로,
// (1) 각 파일이 단독으로 파싱 가능해야 하고
// (2) 파일 간 최상위 let/const 충돌(예: 두 브랜치 병합으로 생긴 중복 `let now`)이 없어야
// 게임이 첫 화면에서 진행될 수 있다. 이 검사는 그 계약을 브라우저 없이 고정한다.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const sources = [];
const scriptTag = /<script[^>]*src="([^"?]+)(?:\?[^"]*)?"[^>]*>/g;
let match;
while ((match = scriptTag.exec(html)) !== null) {
    const src = match[1];
    if (/^https?:\/\//.test(src)) continue;
    sources.push(src);
}
assert(sources.length >= 10, `index.html에서 로컬 스크립트를 찾지 못했습니다 (${sources.length}개)`);
assert(sources.includes('js/ui.js'), 'js/ui.js가 index.html에 연결되어 있어야 합니다');
assert(sources.includes('js/ui-window-manager.js'), '창 관리자가 index.html에 연결되어 있어야 합니다');

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

console.log(`smoke-boot-script-contract passed (${sources.length} scripts)`);
