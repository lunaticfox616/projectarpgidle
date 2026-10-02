// 2026-10-02 전장 보기 손질(사용자: 보호막이 보라색, 시야가 답답, 보스 체력바가 보스를 가림, 글자가 흐림).
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const { decodePng } = require('./lib/png.cjs');

const context = buildGameRuntime();
const run = code => vm.runInContext(code, context);

// 시야는 6칸, 몬스터가 알아채는 거리는 예전 5칸: 다음 무리가 한 칸 먼저 보이고, 길에서 붙는 싸움은 그대로다.
assert.deepStrictEqual(JSON.parse(run('JSON.stringify(ACT_EXPLORATION_VISION)')), { radius: 6, engageRadius: 5 });
const sight = JSON.parse(run(`JSON.stringify((() => {
    const map = actExplorationMap.forRun({ version: 1, act: 1, zoneId: 0 });
    const run = { layoutId: map.id, act: 1, version: 1, zoneId: 0 };
    const seen = actExplorationMap.visibleCells(map, map.entry), near = actExplorationState.notice(run, map.entry);
    return { seen: seen.length, near: near.length, old: actExplorationMap.visibleCells(map, map.entry, 5).length,
        nearInSeen: near.every(id => seen.includes(id)) };
})())`));
assert.ok(sight.seen > sight.old, 'the default sight reaches a tile farther than the old 5');
assert.strictEqual(sight.near, sight.old, 'monsters notice the hero at the old distance');
assert.ok(sight.nearInSeen, 'every noticing cell is also seen');

// 보스 체력바: 고정 높이(106px)는 칸이 커지면 보스 그림 위에 걸쳤다 → 그린 높이 위로, 작은 그림은 예전 높이 그대로.
const lifts = JSON.parse(run(`JSON.stringify((() => {
    const boss = { id: 9001, isBoss: true }, small = { id: 9002, isBoss: true };
    const before = getEnemyFieldBarLift(boss);
    noteEnemyDrawnHeight(boss, 180); noteEnemyDrawnHeight(small, 60);
    return { before, tall: getEnemyFieldBarLift(boss), small: getEnemyFieldBarLift(small) };
})())`));
assert.deepStrictEqual(lifts, { before: 106, tall: 190, small: 106 }, 'the boss bar clears the drawn sprite and never drops below the old lift');
const battlefield = fs.readFileSync('js/canvas-battlefield.js', 'utf8');
assert.ok(battlefield.includes('entry.y-getEnemyFieldBarLift(enemy)-13'), 'the cast bar sits above the same bar');

// 보호막: 생명 위 반투명 파란 막은 붉은색과 섞여 보라색이었다 → 유리 안쪽 가장자리의 파란 막(가운데는 생명이 보인다).
const hud = fs.readFileSync('css/themes/pixel-hud.css', 'utf8');
const esRule = hud.slice(hud.indexOf('.player-health-frame #ui-es-bar {'), hud.indexOf('}', hud.indexOf('.player-health-frame #ui-es-bar {')));
assert.ok(esRule.includes('var(--px-orb-life-shield)') && !/opacity/.test(esRule), 'the shield is an opaque rim picture, not a wash');
const shield = decodePng(fs.readFileSync('assets/ui/pixel/hud-orb-life-shield.png'));
const px = (x, y) => [...shield.data.subarray((y * shield.width + x) * 4, (y * shield.width + x) * 4 + 4)];
assert.strictEqual(px(63, 73)[3], 0, 'the centre of the glass stays clear so the red life shows');
const rim = px(63, 73 + 47);
assert.ok(rim[3] === 255 && rim[2] > rim[0] + 80, `the inside of the glass edge is blue: ${rim}`);
assert.strictEqual(px(63, 73 + 44)[3], 0, 'the film is a rim, not a fill');

// 글자: 도트 글꼴은 굵기 한 벌뿐이라 가짜 굵기를 끄고, PC는 회색 다듬기(서브픽셀 색 번짐 없음)로.
const pixel = fs.readFileSync('css/themes/pixel.css', 'utf8');
assert.ok(/body\[data-ui-skin\] \{[^}]*font-synthesis: none;/.test(pixel), 'pixel fonts are never synthesised bold');
assert.ok(pixel.includes(':root body[data-ui-skin].desktop-windowed-ui { will-change: transform; }'), 'desktop text renders with grayscale antialiasing');

console.log('smoke-battle-view-polish passed');
