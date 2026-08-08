#!/usr/bin/env node
// scripts/smoke-*.js를 전부 실행하는 단일 진입점. `npm test`가 이 파일을 부른다.
//
// 왜 러너가 필요한가: 검사 스크립트는 각각 독립 실행 파일이라 지금까지는 셸 반복문을
// 손으로 쳐야 했고, 그래서 "기억하는 사람이 기억할 때만" 돌았다. 진입점을 하나 두면
// 사람도 CI도 같은 명령을 쓴다.
//
// 계약:
//   - 종료 코드 0 = 전부 통과, 1 = 하나라도 실패(CI가 이 코드로 PR을 막는다)
//   - 실패한 스크립트의 출력만 보여준다(통과 100건의 로그에 실패가 묻히지 않게)
//   - 무한 대기하는 스크립트는 타임아웃으로 실패 처리한다(CI가 매달리지 않게)
//
// 사용:
//   npm test                 전부 실행
//   npm test -- merged-tab   이름에 'merged-tab'이 들어간 것만 (개발 중 빠른 반복용)
//   SMOKE_TIMEOUT_MS=60000 npm test
//   SMOKE_CONCURRENCY=1 npm test    순차 실행(출력 순서를 고정하고 싶을 때)
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_TIMEOUT_MS = 60000;
// 검사는 CPU 바운드(vm에 게임 전체를 올린다)라 코어 수에 맞춘다. 4개로 상한을 두는 것은
// CI 러너가 보통 2코어라 그 이상 늘려도 이득이 없고 메모리만 쓰기 때문이다.
const DEFAULT_CONCURRENCY = Math.max(1, Math.min(4, os.cpus().length));

function positiveIntFromEnv(name, fallback) {
    let raw = Number(process.env[name]);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

function listSmokeScripts(filters) {
    let files = fs.readdirSync(SCRIPT_DIR)
        .filter(name => /^smoke-.*\.js$/.test(name))
        .sort();
    if (!filters.length) return files;
    return files.filter(name => filters.some(filter => name.includes(filter)));
}

function runOne(file, timeoutMs) {
    return new Promise(resolve => {
        let startedAt = Date.now();
        // cwd를 저장소 루트로 고정한다. 검사들이 'js/ui.js' 같은 상대 경로를 읽으므로
        // 어디서 npm test를 부르든 같은 파일을 봐야 한다.
        execFile(process.execPath, [path.join(SCRIPT_DIR, file)], {
            cwd: REPO_ROOT,
            timeout: timeoutMs,
            maxBuffer: 16 * 1024 * 1024
        }, (error, stdout, stderr) => {
            let durationMs = Date.now() - startedAt;
            let timedOut = !!(error && error.killed);
            resolve({
                file,
                durationMs,
                ok: !error,
                timedOut,
                output: [stdout, stderr].filter(Boolean).join('\n').trimEnd()
            });
        });
    });
}

async function runAll(files, { timeoutMs, concurrency }) {
    let queue = files.slice();
    let results = [];
    async function worker() {
        while (queue.length) {
            let file = queue.shift();
            let result = await runOne(file, timeoutMs);
            results.push(result);
            process.stdout.write(result.ok ? '.' : 'F');
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));
    // 실행 순서가 아니라 파일명 순으로 보고해 실행마다 출력이 흔들리지 않게 한다.
    return results.sort((a, b) => a.file.localeCompare(b.file));
}

async function main() {
    let filters = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
    let files = listSmokeScripts(filters);
    if (!files.length) {
        console.error(filters.length ? `일치하는 검사가 없습니다: ${filters.join(', ')}` : 'scripts/smoke-*.js를 찾지 못했습니다.');
        process.exit(1);
    }
    let timeoutMs = positiveIntFromEnv('SMOKE_TIMEOUT_MS', DEFAULT_TIMEOUT_MS);
    let concurrency = positiveIntFromEnv('SMOKE_CONCURRENCY', DEFAULT_CONCURRENCY);

    console.log(`검사 ${files.length}개 실행 (동시 ${concurrency}, 타임아웃 ${Math.round(timeoutMs / 1000)}초)`);
    let startedAt = Date.now();
    let results = await runAll(files, { timeoutMs, concurrency });
    process.stdout.write('\n');

    let failed = results.filter(result => !result.ok);
    failed.forEach(result => {
        console.log(`\n${'─'.repeat(70)}`);
        console.log(`실패: ${result.file}${result.timedOut ? ` (타임아웃 ${Math.round(timeoutMs / 1000)}초 초과)` : ''}`);
        console.log('─'.repeat(70));
        console.log(result.output || '(출력 없음)');
    });

    let totalSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    let slowest = results.slice().sort((a, b) => b.durationMs - a.durationMs).slice(0, 3);
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`통과 ${results.length - failed.length}/${results.length} · ${totalSeconds}초`);
    console.log(`가장 느린 검사: ${slowest.map(r => `${r.file.replace(/^smoke-|\.js$/g, '')} ${(r.durationMs / 1000).toFixed(1)}s`).join(' · ')}`);
    if (failed.length) {
        console.log(`실패 ${failed.length}개: ${failed.map(r => r.file).join(', ')}`);
        process.exit(1);
    }
    console.log('전부 통과');
}

main().catch(error => {
    console.error('러너 자체가 실패했습니다:', error);
    process.exit(1);
});
