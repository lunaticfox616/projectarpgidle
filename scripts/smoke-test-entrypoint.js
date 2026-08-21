// 검사 진입점(npm test)과 CI 배선이 살아 있는지 확인한다.
//
// 이 검사가 존재하는 이유: 검사가 많아도 실행되지 않으면 없는 것과 같다.
// 러너 파일명이 바뀌거나 workflow가 다른 명령을 부르게 되면 안전망 전체가 조용히
// 꺼지는데, 그건 아무 검사도 실패하지 않으므로 아무도 모른다. 배선 자체를 고정한다.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

// ── package.json: npm test가 러너를 부른다 ──────────────────────────
const pkg = JSON.parse(read('package.json'));
assert.ok(pkg.scripts && pkg.scripts.test, 'package.json에 test 스크립트가 있어야 한다');
assert.ok(pkg.scripts.test.includes('run-smoke'), 'npm test는 scripts/run-smoke.js를 불러야 한다');
assert.ok(fs.existsSync(path.join(ROOT, 'scripts/run-smoke.js')), '러너 파일이 있어야 한다');

// ── CI: 푸시·PR마다 같은 명령을 실행한다 ────────────────────────────
const workflow = read('.github/workflows/test.yml');
const hasDependencies = Object.keys(pkg.dependencies || {}).length > 0 || Object.keys(pkg.devDependencies || {}).length > 0;
if (hasDependencies) assert.ok(/run:\s*npm ci/.test(workflow), '의존성이 있으면 CI가 npm ci를 실행해야 한다');
assert.ok(/on:\s*[\s\S]*push:/.test(workflow), 'CI는 푸시에서 실행되어야 한다');
assert.ok(/pull_request:/.test(workflow), 'CI는 PR에서 실행되어야 한다');
assert.ok(/run:\s*npm test/.test(workflow), 'CI는 로컬과 같은 npm test를 실행해야 한다');
if (pkg.scripts['test:browser']) assert.ok(/run:\s*npm run test:browser/.test(workflow), 'CI는 실제 브라우저 검사도 실행해야 한다');
if (pkg.scripts['test:browser']) {
    assert.ok(/shard:\s*\[1, 2, 3, 4\]/.test(workflow), 'CI는 브라우저 검사를 4개 러너로 나눠야 한다');
    assert.ok(/npm run test:browser -- --shard=\$\{\{ matrix\.shard \}\}\/4/.test(workflow),
        '각 브라우저 러너는 자신의 Playwright 샤드만 실행해야 한다');
}
assert.ok(/timeout-minutes:/.test(workflow), '매달린 실행이 러너를 붙잡지 않도록 타임아웃이 있어야 한다');

const engines = (pkg.engines && pkg.engines.node) || '';
const ciNodeMatch = workflow.match(/node-version:\s*'(\d+)'/);
assert.ok(ciNodeMatch, 'CI가 Node 버전을 고정해야 한다');
const enginesMin = Number((engines.match(/(\d+)/) || [])[1]);
assert.ok(Number(ciNodeMatch[1]) >= enginesMin,
    `CI Node(${ciNodeMatch[1]})가 package.json engines(${engines})를 만족해야 한다`);

// ── 러너 계약: 실패하면 종료 코드 1, 실패 원인을 보여준다 ───────────
// 러너가 실패를 삼키면 CI가 초록불인 채로 회귀가 통과한다. 실제로 실행해 확인한다.
// 프로브 이름에 pid를 붙인다. npm test를 동시에 두 번 돌려도 서로의 임시 파일을
// 지우지 않아야 한다(scripts/를 읽는 검사는 이 파일뿐이라 다른 검사와는 간섭하지 않는다).
const probeName = `smoke-zzz-entrypoint-probe-${process.pid}`;
const probe = path.join(ROOT, 'scripts', `${probeName}.js`);
fs.writeFileSync(probe, "require('assert').fail('진입점 검사가 의도적으로 실패시킨 검사');\n");
let exitCode = 0;
let output = '';
try {
    output = execFileSync(process.execPath, ['scripts/run-smoke.js', probeName],
        { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (error) {
    exitCode = error.status;
    output = String(error.stdout || '') + String(error.stderr || '');
} finally {
    if (fs.existsSync(probe)) fs.unlinkSync(probe);
}
assert.strictEqual(exitCode, 1, '검사가 실패하면 러너는 종료 코드 1이어야 한다(CI가 이 코드로 막는다)');
assert.ok(output.includes(`${probeName}.js`), '어떤 검사가 실패했는지 보고해야 한다');
assert.ok(output.includes('진입점 검사가 의도적으로 실패시킨 검사'), '실패 원인 출력을 그대로 보여줘야 한다');

// AGENTS.md가 옛 셸 반복문을 계속 안내하면 사람은 진입점을 쓰지 않는다.
const agents = read('AGENTS.md');
assert.ok(agents.includes('npm test'), 'AGENTS.md가 npm test를 안내해야 한다');
assert.ok(!agents.includes('for test_file in scripts/smoke-*.js'),
    'AGENTS.md에서 옛 수동 반복문 안내를 제거해야 한다(진입점이 하나여야 한다)');

console.log('smoke-test-entrypoint passed');
