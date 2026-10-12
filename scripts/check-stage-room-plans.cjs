#!/usr/bin/env node
/* 방 단위 무대의 방 놓임새(data/stage-room-plans.js)를 미리 본다.
 *   node scripts/check-stage-room-plans.cjs                 프리셋을 모두 풀어 보고(방 수, 보스 방의 문 하나, 끊긴 방) 그림으로 찍는다
 *   node scripts/check-stage-room-plans.cjs --random 6      지도마다 준 랜덤 놓임새 여섯 장을 찍는다(프리셋을 고를 때 쓴다)
 *   node scripts/check-stage-room-plans.cjs --random 6 --act 3 --from 40   액트 3만, 씨앗 40번부터
 * 끝낼 때의 코드: 잘못된 프리셋이 있으면 1.
 */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : fallback);
const context = { console };
context.safeExposeData = context.safeExposeGlobals = values => Object.assign(context, values);
vm.createContext(context);
for (const file of ['js/utils.js', 'data/act-exploration-maps.js', 'data/stage-room-plans.js', 'js/act-exploration-room-plans.js']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    // 유틸은 필요한 두 함수만 꺼낸다(나머지는 게임 상태를 읽는다).
    const body = file === 'js/utils.js' ? source.slice(source.indexOf('function hashSeed'), source.indexOf('const SKILL_TAG_LABELS')) + '\nsafeExposeGlobals({ hashSeed, createSeededRng });' : source;
    vm.runInContext(body, context, { filename: file });
}
const { ACT_EXPLORATION_MAPS, CONTENT_EXPLORATION_MAPS, STAGE_ROOM_PLANS, actExplorationRoomPlans: plans } = context;

/** 놓임새가 온전한가: 모든 방이 입구에서 닿고, 보스 방의 문은 하나, 들르는 방의 문도 하나. */
function problems(plan) {
    const out = [], doors = plan.cells.map(() => 0), reached = new Set([plan.cells.findIndex(cell => cell.role === 'entry')]);
    for (const link of plan.links) { doors[link.from]++; doors[link.to]++; }
    for (let grew = true; grew;) {
        grew = false;
        for (const link of plan.links) for (const [a, b] of [[link.from, link.to], [link.to, link.from]]) if (reached.has(a) && !reached.has(b)) { reached.add(b); grew = true; }
    }
    if (reached.size !== plan.cells.length) out.push('끊긴 방이 있다');
    plan.cells.forEach((cell, index) => {
        if (cell.role === 'boss' && doors[index] !== 1) out.push('보스 방의 문이 ' + doors[index] + '개');
        if (cell.role === 'optional' && doors[index] !== 1) out.push('들르는 방(' + cell.id + ')의 문이 ' + doors[index] + '개');
    });
    const spots = new Set(plan.cells.map(cell => cell.col + ',' + cell.row));
    if (spots.size !== plan.cells.length) out.push('겹친 방이 있다');
    return out;
}
const show = (title, lines) => console.log(title + '\n' + lines.map(line => '    ' + line).join('\n') + '\n');

let bad = 0;
if (args.includes('--random')) {
    const count = option('--random', 6), only = option('--act', 0), from = option('--from', 0);
    for (const base of [...ACT_EXPLORATION_MAPS, ...CONTENT_EXPLORATION_MAPS]) {
        if (only && base.act !== only) continue;
        for (let seed = from; seed < from + count; seed++) {
            const plan = plans.random(base, seed), faults = problems(plan);
            bad += faults.length;
            show(`${base.act ? '액트 ' + base.act : base.id} 씨앗 ${seed}${faults.length ? '  !! ' + faults.join(', ') : ''}`, plans.text(plan));
        }
    }
} else {
    for (const base of ACT_EXPLORATION_MAPS) {
        const sheets = STAGE_ROOM_PLANS.acts[base.act] || [];
        if (sheets.length !== 4) { bad++; console.log(`액트 ${base.act}: 프리셋이 ${sheets.length}장 (넷이어야 한다)`); }
        sheets.forEach((lines, index) => {
            let faults;
            try { faults = problems(plans.build(base, 'p' + index, '')); } catch (error) { faults = [error.message]; }
            bad += faults.length;
            show(`액트 ${base.act} 프리셋 ${index + 1}${faults.length ? '  !! ' + faults.join(', ') : ''}`, lines);
        });
    }
    const counts = ACT_EXPLORATION_MAPS.map(base => `${base.act}:${Object.values(plans.countsOf(base)).join('/')}`).join('  ');
    console.log('액트의 방 수(전투/정예/들르는 방): ' + counts);
}
console.log(bad ? `잘못된 곳 ${bad}군데` : '모두 온전하다');
process.exit(bad ? 1 : 0);
