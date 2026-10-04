// 탐험 맵 방향 (2026-10-04, 디아블로 2처럼): 런마다 맵이 북 · 동 · 남 · 서 중 한 방향으로 돌아가 관문이 입구 반대편 그 방향에 온다.
// 실제 시작 흐름에서 네 방향이 다 나오고, 런의 방향이 저장 왕복을 버티며, 방향이 없던 예전 저장은 그려진 방향 그대로 이어 걷고
// (발견 지도 유지), 잘못된 방향은 손상 저장으로 거부한다. 무작위는 실제 Math.random을 쓰고 저장 경계만 JSON으로 흉내 낸다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

// ---------------------------------------------------------------- each act map in its four facings
const facings = copy(`ACT_EXPLORATION_MAPS.map(source => [0, 1, 2, 3].map(rotation => {
    const map = actExplorationMap.layout(source.act, rotation);
    return { act: source.act, rotation: map.rotation, dx: map.gate.gx - map.entry.gx, dy: map.gate.gy - map.entry.gy,
        floor: map.tiles.filter(Boolean).length, size: map.columns * map.rows, art: !!ACT_EXPLORATION_BACKDROPS[map.id].views[rotation],
        same: map === actExplorationMap.layout(source.act, rotation) };
}))`);
const lead = ({ dx, dy }) => Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'N' : 'S') : (dx > 0 ? 'E' : 'W');
for (const turns of facings) {
    assert.deepEqual(turns.map(lead), ['N', 'E', 'S', 'W'], `act ${turns[0].act}: the gate lies north, east, south, west of the entry`);
    assert.ok(turns.every(row => row.floor === turns[0].floor && row.size === turns[0].size), 'a turned map keeps every floor tile');
    assert.ok(turns.every(row => row.art && row.same), 'each facing has its painting and is compiled once');
}
assert.throws(() => run('actExplorationMap.layout(1, 4)'), /맵 방향/, 'a fifth facing does not exist');
const arena = copy(`(() => { const map = actExplorationMap.generated({ style: 'act', act: 6, seed: 'a', arena: true }, 1);
    return { rotation: map.rotation, id: map.id, startsEast: map.entry.gx < map.gate.gx }; })()`);
assert.deepEqual(arena, { rotation: 1, id: 'broken-courtyard', startsEast: true }, 'content and arena maps turn the same way');

// ---------------------------------------------------------------- real starts draw every facing
run(`game = mergeDefaults({}); game.season = 30; game.loopCount = 29; game.maxZoneId = 9; game.currentZoneId = 2;`);
const drawn = new Map();
for (let n = 0; n < 40; n++) {
    const row = copy(`(() => { startEncounterRun(true); const runState = game.actExploration, map = actExplorationMap.forRun(runState);
        return { rotation: runState.rotation, mapRotation: map.rotation, layoutId: runState.layoutId, cell: game.gridPlayer, entry: map.entry }; })()`);
    assert.equal(row.rotation, row.mapRotation, 'the run walks the map of its own facing');
    assert.equal(row.layoutId, 'suspended-spans');
    assert.deepEqual([row.cell.gx, row.cell.gy], [row.entry.gx, row.entry.gy], 'the hero starts at that facing\'s entry');
    drawn.set(row.rotation, (drawn.get(row.rotation) || 0) + 1);
}
assert.deepEqual([...drawn.keys()].sort(), [0, 1, 2, 3], `forty starts show all four facings (${JSON.stringify([...drawn])})`);

// ---------------------------------------------------------------- save boundary
run(`window.facingSave = () => JSON.parse(serializeSaveState(game));`);
const pinned = copy(`(() => { rollExplorationFacing = () => 2; startEncounterRun(true);
    actExplorationState.discover(game.actExploration, game.gridPlayer); return game.actExploration; })()`);
assert.equal(pinned.rotation, 2);
const restored = copy('mergeDefaults(facingSave()).actExploration');
assert.equal(restored.rotation, 2, 'the facing survives a save round trip');
assert.deepEqual(restored.discovered, pinned.discovered, 'and so does the fog it uncovered');

const legacy = copy(`(() => { rollExplorationFacing = () => undefined; startEncounterRun(true);
    const save = facingSave(); delete save.actExploration.rotation; window.legacySave = save; return save.actExploration; })()`);
assert.equal(legacy.rotation, undefined);
const upgraded = copy('mergeDefaults(legacySave).actExploration');
assert.equal(upgraded.rotation, 1, 'a save from before facings keeps act 3\'s drawn facing (east)');
assert.deepEqual(upgraded.discovered, legacy.discovered, 'its discovered tiles still mean the same cells');
assert.deepEqual(copy('mergeDefaults(JSON.parse(JSON.stringify(mergeDefaults(legacySave)))).actExploration.rotation'), 1, 'upgrading twice changes nothing');

for (const bad of ['5', '-1', '1.5', '"2"', 'null']) {
    assert.throws(() => run(`(() => { const save = facingSave(); save.actExploration.rotation = ${bad}; return mergeDefaults(save); })()`),
        /맵 방향/, `facing ${bad} is a corrupt save`);
}
console.log('exploration facings: 10 maps × N/E/S/W, all four drawn by real starts, save round trip, pre-facing saves kept, corrupt facing refused: OK');
