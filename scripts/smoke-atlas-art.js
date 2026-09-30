// 세계수 아틀라스 도트 그림 (js/canvas-atlas-chart.js · js/atlas-passives-ui.js · data/atlas-passives.js, 2026-09-30 미감 개선):
// the chart and the passive wheels paint every node kind and state without a gap outside their discs; the 76 passives sit on
// distinct places of their wheel; the added passives only hang on older ones, so old saves keep every allocation.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
const run = source => vm.runInContext(source, runtime);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior'});window.game=game;
    globalThis.ImageData = class { constructor(w, h) { this.width = w; this.height = h; this.data = new Uint8ClampedArray(w * h * 4); } };
    var shot = null, canvas = { getContext: () => ({ putImageData: image => { shot = image; } }) };
    var opaque = () => { let n = 0; for (let i = 3; i < shot.data.length; i += 4) n += shot.data[i] === 255; return n / (shot.width * shot.height); };
    var alpha = (x, y) => shot.data[(y * shot.width + x) * 4 + 3];`);

// ---------------------------------------------------------------- the chart
const chart = copy(`(() => {
    const states = ['locked', 'open', 'complete', 'bonus'], started = Date.now();
    const nodes = atlas.nodes.map((node, i) => ({ ...atlas.position(node), kind: node.kind, region: node.regionIndex,
        status: states[i % 4], selected: i === 3, running: i === 5 }));
    const links = atlas.links.map(([a, b], i) => ({ from: atlas.position(atlas.node(a)), to: atlas.position(atlas.node(b)),
        arc: i % 5 ? null : { radius: 42, from: -Math.PI / 2, to: -Math.PI / 3 }, state: ['dim', 'lit', 'done'][i % 3] }));
    const painted = atlasChartArt.paint(canvas, 320, { regions: ATLAS.regions, nodes, links, tickets: [true, false, true, false] });
    return { painted, ms: Date.now() - started, size: shot.width, disc: opaque(), corner: alpha(0, 0), centre: alpha(160, 160) };
})()`);
assert.equal(chart.painted, true);
assert.equal(chart.size, 320, 'one dot per canvas pixel');
assert.ok(Math.abs(chart.disc - Math.PI * 0.47 * 0.47) < 0.02, 'the disc (radius 47 of 100) is painted whole and nothing outside it: ' + chart.disc);
assert.deepEqual([chart.corner, chart.centre], [0, 255]);
assert.ok(chart.ms < 1500, 'a full chart paints quickly: ' + chart.ms + 'ms');
assert.equal(run(`atlasChartArt.paint({}, 100, {})`), false, 'no canvas, no drawing (and no error)');

// ---------------------------------------------------------------- the passive wheels
const buttons = copy(`(() => {
    const html = atlasPassivesUi.html(), wheels = html.split('data-wheel=').slice(1);
    return wheels.map(part => [...part.matchAll(/--x:([\\d.]+)%;--y:([\\d.]+)%/g)].map(m => [Number(m[1]), Number(m[2])]));
})()`);
assert.deepEqual(buttons.map(list => list.length), [19, 19, 19, 19], 'four wheels of nineteen passives');
for (const list of buttons) {
    const keys = new Set(list.map(([x, y]) => `${Math.round(x * 10)}:${Math.round(y * 10)}`));
    assert.equal(keys.size, list.length, 'each passive has its own place');
    assert.ok(list.every(([x, y]) => Math.hypot(x - 50, y - 50) <= 46.5), 'inside the wheel');
    const nearest = Math.min(...list.flatMap(([x, y], i) => list.slice(i + 1).map(([u, v]) => Math.hypot(x - u, y - v))));
    assert.ok(nearest > 10, 'passives never crowd one another: ' + nearest.toFixed(1));
}
const wheel = copy(`(() => {
    const ranks = ['root', 'small', 'notable', 'keystone'], states = ['taken', 'open', 'locked'];
    const nodes = Array.from({ length: 12 }, (_, i) => ({ x: 50 + 30 * Math.cos(i), y: 50 + 30 * Math.sin(i), rank: ranks[i % 4], state: states[i % 3] }));
    const links = [{ from: nodes[0], to: nodes[1], arc: null, state: 'done' }, { from: nodes[1], to: nodes[2], arc: { radius: 30, from: 1, to: 2 }, state: 'lit' },
        { from: nodes[2], to: nodes[3], arc: null, state: 'dim' }];
    const painted = atlasChartArt.paintWheel(canvas, 180, { tint: '#6f5a86', rings: [0, 12, 24, 35, 46], nodes, links });
    return { painted, disc: opaque(), corner: alpha(0, 0) };
})()`);
assert.equal(wheel.painted, true);
assert.ok(Math.abs(wheel.disc - Math.PI * 0.49 * 0.49) < 0.03 && wheel.corner === 0, 'a wheel paints its disc: ' + wheel.disc);

// ---------------------------------------------------------------- old saves keep their passives
const data = copy(`(() => {
    const nodes = ATLAS_PASSIVES.wheels.flatMap(wheel => wheel.nodes), added = /_([abc]T|ab|bc|ca|k3)$/;
    return { count: nodes.length, older: nodes.filter(node => !added.test(node.id)).length,
        leaning: nodes.filter(node => !added.test(node.id) && node.requires.some(id => added.test(id))).map(node => node.id),
        keystones: ATLAS_PASSIVES.wheels.map(wheel => new Set(wheel.nodes.filter(node => node.rank === 'keystone').map(node => [...node.requires].sort().join())).size) };
})()`);
assert.deepEqual([data.count, data.older], [76, 48], '28 passives added to the 48');
assert.deepEqual(data.leaning, [], 'no older passive depends on an added one: saved allocations all stay valid');
assert.deepEqual(data.keystones, [3, 3, 3, 3], 'every pair of notables has its keystone');
const saved = copy(`atlasPassives.normalize(['s_r','s_a1','s_a2','s_aN','s_k1','l_r','l_c1','l_c2','l_cN','l_k1'], 10)`);
assert.equal(saved.length, 10, 'a 48-passive save loads unchanged');
console.log('atlas art: chart paints every node state inside its disc, wheels of 19 distinct passives, added passives keep old saves: OK');
