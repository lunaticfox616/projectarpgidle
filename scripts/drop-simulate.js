#!/usr/bin/env node
// 드랍 시뮬레이터 명령줄 요약: 아틀라스 지도를 실제 처치 경로로 N판 돌리고(scripts/lib/drop-simulation.js) 판마다 종류 수, 판 사이 겹침,
// 발견의 순간, 재화와 장비 평균을 적는다. 화면은 `npm run drop:sim`(scripts/drop-simulator-server.js).
//   node scripts/drop-simulate.js --tier 16 --loop 60 --maps 300 --seed 1 [--json out.json]
'use strict';

const fs = require('fs');
const { simulateMaps } = require('./lib/drop-simulation');
const { summarize } = require('./lib/drop-simulation-report');

const args = process.argv.slice(2);
const value = (flag, fallback) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback);
const result = simulateMaps({ tier: value('--tier', 16), loop: value('--loop', 60), maps: value('--maps', 200),
    rarity: value('--rarity', 'mixed'), seed: value('--seed', 1) });
const report = summarize(result);
const fixed = number => Number(number).toFixed(2);

console.log(`등급 ${result.options.tier}, 루프 ${result.options.loop}, 지도 ${report.maps}판 (${(result.elapsedMs / 1000).toFixed(1)}초)`);
console.log(`판마다 종류 ${fixed(report.kindsPerMap)} (전체 ${report.distinctKinds}), 다음 판과 겹침 ${(report.overlapNext * 100).toFixed(0)}%`);
console.log(`판마다 드랍 ${fixed(report.dropsPerMap)}, 재화 종류 ${fixed(report.currencyKindsPerMap)}, 좋은 발견 ${fixed(report.momentsPerMap.good)}, 큰 발견 ${fixed(report.momentsPerMap.great)}, 체이싱 티어 ${fixed(report.momentsPerMap.jackpot)}, 보물 무리 ${fixed(report.treasurePerMap)}, 잎 ${fixed(report.leavesPerMap)} (본 잎 ${report.leafSeen})`);
console.log(`판마다 처치: 일반 ${fixed(report.kills.regular)}, 정예 ${fixed(report.kills.elite)}, 상자와 사건 ${fixed(report.kills.objects)}`);
console.log('판마다 드랍 종류별:', Object.entries(report.totals).map(([key, count]) => `${key} ${fixed(count)}`).join(', '));
console.log('판마다 재화:', Object.entries(report.currencies).map(([key, count]) => `${key} ${fixed(count)}`).join(', '));
const output = value('--json', null);
if (output) {
    fs.writeFileSync(output, `${JSON.stringify({ options: result.options, report }, null, 2)}\n`);
    console.log(`저장: ${output}`);
}
