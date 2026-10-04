// Act exploration backdrops (scripts/build-act-maps.cjs): each map is painted in all four facings a run can draw (gate north, east,
// south, west); each picture must cover that facing's grid at 16 dots a cell, or the game falls back to a flat stand-in, and each
// gate sheet must face the boss room and match its registered anchor.
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const { rampsOf } = require('./act-maps/pal.cjs');

const runtime = buildGameRuntime();
const run = code => JSON.parse(vm.runInContext(`JSON.stringify(${code})`, runtime));
const rgbOf = hex => [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16));
const pngSize = file => { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

const backdrops = run('ACT_EXPLORATION_BACKDROPS');
const maps = run('ACT_EXPLORATION_MAPS.flatMap(source => [0, 1, 2, 3].map(rotation => { const m = actExplorationMap.layout(source.act, rotation); return { id: m.id, act: m.act, rotation: m.rotation, columns: m.columns, rows: m.rows, gate: m.gate, boss: m.rooms.find(r => r.role === "boss") }; }))');
assert.strictEqual(Object.keys(backdrops).length * 4, maps.length, 'every act map has a backdrop');
const facings = [];

for (const map of maps) {
    const view = backdrops[map.id]?.views[map.rotation], entry = { ...view, shade: backdrops[map.id]?.shade };
    assert(view, `${map.id} has a backdrop for facing ${map.rotation}`);
    assert.deepStrictEqual(pngSize(entry.map), [map.columns * 16, map.rows * 16], `${entry.map} covers ${map.columns}×${map.rows} cells at 16 dots`);
    const dx = map.boss.gx - map.gate.gx, dy = map.boss.gy - map.gate.gy;
    const direction = Math.abs(dy) >= Math.abs(dx) ? (dy < 0 ? 'N' : 'S') : (dx > 0 ? 'E' : 'W');
    facings.push(direction);
    const [w, h] = direction === 'N' || direction === 'S' ? [44, 52] : [20, 50];
    assert.deepStrictEqual(pngSize(entry.gate), [w * 2, h], `${entry.gate}: closed|open frames for a ${direction} gate`);
    assert.deepStrictEqual(entry.gateOffset, direction === 'N' ? [-w / 2, 8 + 16 - h] : [-w / 2, 8 - h], `${map.id} gate anchor`);
    // The fog and the canvas around the map use this colour: it must be the darkness the act's art was painted with.
    assert.deepStrictEqual(entry.shade, rgbOf(rampsOf(map.act).dark[0]), `${map.id} shade matches the art's darkness`);
}
for (let i = 0; i < facings.length; i += 4) assert.deepStrictEqual(facings.slice(i, i + 4), ['N', 'E', 'S', 'W'], `${maps[i].id}: facings 0..3 lead north, east, south and west`);
console.log(`act map backdrops: ${maps.length} paintings (10 maps × 4 facings) and gates match their grids`);
