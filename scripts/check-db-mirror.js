#!/usr/bin/env node
// db/*.sql에서 같은 이름의 함수와 정책이 두 파일 이상에 있으면 본문이 같아야 한다.
//
// 왜: 한 번 실행하는 묶음 파일(db/save-limits-20261003.sql, db/multiplayer-hardening-20261027.sql 등)은 원본 파일의 문장을
// 그대로 담아, 기존 프로젝트에 묶음을 돌린 결과와 새로 설치한 결과가 같아야 한다. 2026-10-27 검토에서 사람이 스크립트로
// 비교해 확인했는데, 그 확인을 여기 둬서 다음 변경이 한쪽만 고치면 바로 드러나게 한다.
//
// 비교 단위: `create or replace function public.이름(...)`부터 그 함수를 닫는 `$$;`까지, `create policy "이름"`부터 `;`까지.
// 주석(--)과 공백 차이는 무시한다. 종료 코드 0 = 같음, 1 = 다른 곳이 있음.
'use strict';

const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '..', 'db');
const files = fs.readdirSync(dbDir).filter(name => name.endsWith('.sql')).sort();
// 설치 순서상 뒤 파일이 덮어쓰는 첫 판: 비교에서 뺀다(cloud-and-playtest.sql의 commit_cloud_save는 operations-and-ghost.sql이 기록 보관판으로 덮는다).
const OVERRIDDEN = { 'function:commit_cloud_save': ['cloud-and-playtest.sql'] };

function stripComments(text) {
    return text.replace(/--[^\n]*/g, '');
}
function normalize(text) {
    return stripComments(text).replace(/\s+/g, ' ').trim();
}
/** 함수 머리부터 그 본문을 닫는 `$$;`까지. 본문 안의 `$$`는 짝으로 세어 안쪽 블록을 건너뛴다. */
function functionBlocks(text) {
    const blocks = [];
    const head = /create or replace function public\.([a-z_0-9]+)\s*\(/g;
    let match;
    while ((match = head.exec(text)) !== null) {
        let open = text.indexOf('$$', match.index);
        if (open < 0) break;
        let close = text.indexOf('$$;', open + 2);
        if (close < 0) break;
        blocks.push({ kind: 'function', name: match[1], body: normalize(text.slice(match.index, close + 3)) });
        head.lastIndex = close + 3;
    }
    return blocks;
}
function policyBlocks(text) {
    const blocks = [];
    const head = /create policy "([^"]+)"/g;
    let match;
    while ((match = head.exec(text)) !== null) {
        let end = text.indexOf(';', match.index);
        if (end < 0) break;
        blocks.push({ kind: 'policy', name: match[1], body: normalize(text.slice(match.index, end + 1)) });
        head.lastIndex = end + 1;
    }
    return blocks;
}

const seen = new Map();   // kind:name -> [{ file, body }]
for (const file of files) {
    const text = fs.readFileSync(path.join(dbDir, file), 'utf8').replace(/\r\n/g, '\n');
    for (const block of [...functionBlocks(text), ...policyBlocks(text)]) {
        const key = `${block.kind}:${block.name}`;
        if ((OVERRIDDEN[key] || []).includes(file)) continue;
        if (!seen.has(key)) seen.set(key, []);
        seen.get(key).push({ file, body: block.body });
    }
}

let problems = [];
let compared = 0;
for (const [key, copies] of seen) {
    if (copies.length < 2) continue;
    compared++;
    const first = copies[0];
    for (const copy of copies.slice(1)) {
        if (copy.body !== first.body) problems.push(`${key}: ${first.file} 와 ${copy.file} 의 본문이 다르다`);
    }
}
if (problems.length) {
    console.error(`db 거울 검사 실패 ${problems.length}곳:\n` + problems.map(line => `  ${line}`).join('\n'));
    process.exit(1);
}
console.log(`db 거울 검사 통과: 두 파일 이상에 있는 함수·정책 ${compared}개가 모두 같다`);
