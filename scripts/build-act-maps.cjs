#!/usr/bin/env node
/* 액트 탐험 맵 배경을 도트로 그린다(칸 16도트, 게임에서는 정수 배율). 2026-10-02부터 그린 화풍:
 * 판석·바위·널을 한 장씩 턱지게 칠하고(빛은 왼쪽 위), 벽은 위층 땅이 끝나는 절벽(윗면 띠 + 북쪽 앞면),
 * 허공 액트는 떠 있는 판(가장자리, 밑면, 하늘). 액트별 모양은 act-maps/looks.cjs, 색은 act-maps/pal.cjs.
 * 걷는 칸은 게임의 맵 데이터를 그대로 따른다.
 *
 * 런마다 맵이 네 방향(관문이 북·동·남·서) 중 하나로 돌아가므로(2026-10-04) 액트마다 네 장을 따로 그린다: 빛은 늘 왼쪽 위,
 * 절벽 앞면은 늘 화면 쪽이라 그림을 돌리면 안 되고 돌린 지형을 새로 칠한다.
 *
 *   node scripts/build-act-maps.cjs              # 액트 1~10 × 방향 4 → 미리보기 폴더(기본: artifacts/act-maps/)
 *   node scripts/build-act-maps.cjs --act 2      # 한 액트만
 *   node scripts/build-act-maps.cjs --write      # assets/exploration/actN-rR-map.png·actN-rR-gate.png 교체(R = 방향 0~3)
 *   node scripts/build-act-maps.cjs --map trial-winter   # 콘텐츠 전용 지도 하나(data CONTENT_EXPLORATION_MAPS, <id>-rR-*.png)
 *   node scripts/build-act-maps.cjs --content --write    # 콘텐츠 전용 지도만 다시 그려 넣는다(액트 지도 그림은 건드리지 않음)
 *
 * 콘텐츠 전용 지도(2026-10-06, 전직 시련 다섯 곳)는 액트 번호 대신 look 이름으로 모양(looks.cjs)과 색(pal.cjs)을 고른다.
 *
 * 끝에 액트별 어둠 색(data/act-exploration-maps.js의 shade, 안개와 지도 바깥에 쓰는 색)과 벽에 걸친 소품 도트 수를 찍는다. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const { encodePng } = require('./act-maps/raster.cjs');
const { T, Palette, Canvas } = require('./act-maps/paint.cjs');
const { roomBox, terrain, wallRegions, measure } = require('./act-maps/terrain.cjs');
const { buildGate } = require('./act-maps/gate.cjs');
const { P, useAct, rampsOf } = require('./act-maps/pal.cjs');
const { LOOKS } = require('./act-maps/looks.cjs');
const F = require('./act-maps/ground.cjs');
const { bands } = require('./act-maps/bands.cjs');
const { trimFaces, faces } = require('./act-maps/cliffs.cjs');
const A = require('./act-maps/abyss.cjs');
const D = require('./act-maps/placing.cjs');
const O = require('./act-maps/objects.cjs');

const root = path.resolve(__dirname, '..');

function readLayouts() {
    return JSON.parse(vm.runInContext(`JSON.stringify(ACT_EXPLORATION_MAPS.flatMap(source => [0, 1, 2, 3].map(rotation => {
        const map = actExplorationMap.layout(source.act, rotation);
        return { ...map, look: source.act, links: source.links.map(link => [link[0], link[1]]), approach: source.approach };
    })).concat(CONTENT_EXPLORATION_MAPS.flatMap(source => [0, 1, 2, 3].map(rotation => {
        const map = actExplorationMap.generated({ style: 'map', id: source.id, seed: '' }, rotation);
        return { ...map, look: source.look, links: source.links.map(link => [link[0], link[1]]), approach: source.approach };
    }))))`, buildGameRuntime()));
}
/** A stable paint seed: the act number (as before) or the content map's name. */
function seedOf(look) {
    if (typeof look === 'number') return 1 + look * 101;
    let hash = 7;
    for (const ch of String(look)) hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
    return 1 + hash;
}

/** 방 가운데 포장 자리(방 상자보다 조금 작은 둥근 네모, 가장자리는 흔들어서). */
function plazaMask(cv, g, scale = 0.82) {
    const { w, h } = cv, wob = cv.noise(7, 961), mask = new Uint8Array(w * h);
    for (const room of Object.values(g.rooms)) {
        const [x0, y0, x1, y1] = roomBox(room), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = ((x1 - x0) / 2 - 6) * scale, ry = ((y1 - y0) / 2 - 6) * scale;
        for (let y = Math.max(0, y0); y < Math.min(h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
            const i = y * w + x;
            if (g.floor[i] && (Math.abs(x - cx) / rx) ** 2.2 + (Math.abs(y - cy) / ry) ** 2.2 < 1 + (wob[i] - 0.5) * 0.9) mask[i] = 1;
        }
    }
    return mask;
}
const jointOf = name => (name === 'earth1' ? P.earth[1] : undefined);
function paintFloor(cv, g, layout, look) {
    const fl = look.floor, rooms = new Uint8Array(g.floor.length), paths = new Uint8Array(g.floor.length);
    for (let i = 0; i < g.floor.length; i++) if (g.floor[i]) (fl.paths && !g.inRoom[i] ? paths : rooms)[i] = 1;
    const damp = cv.noise(10, 963), opt = o => ({ ...o, damp: o && o.damp ? damp : null, joint: jointOf(o && o.joint) });
    const paint = (kind, mask, o) => kind === 'earth' ? F.earth(cv, g, mask) : kind === 'flags' ? F.flags(cv, g, mask, opt(o))
        : kind === 'slabs' ? F.slabs(cv, g, mask, opt(o)) : F.planks(cv, g, mask, layout, { dir: fl.plankDir });
    paint(fl.base, rooms, fl.flag || fl.slab || {});
    if (fl.paths) paint(fl.paths, paths, fl.slab || {});
    let plaza = null;
    if (fl.plaza) { plaza = plazaMask(cv, g, fl.plaza.scale); paint(fl.plaza.kind, plaza, fl.plaza); }
    return plaza;
}
function paintWalls(cv, g, look) {
    if (look.abyss) { A.rims(cv, g); A.undersides(cv, g); if (look.wisteria) A.wisteriaCurtains(cv, g); return; }
    trimFaces(cv, g, 6);
    bands(cv, g, look.band);
    faces(cv, g, look.face);
    if (look.face.fungus) fungi(cv, g);
}
function fungi(cv, g) {
    const { w, h } = cv;
    for (let n = Math.floor(w * h / 1400); n > 0; n--) {
        const x = cv.rng.int(4, w - 4), y = cv.rng.int(4, h - 4), i = y * w + x;
        if (g.face[i] && g.faceTop[i] > 4 && g.below[i] > 6) O.shelfFungus(cv, x, y);
    }
}
/** 소품을 아래에서 위 순서로 그리고, 바닥도 절벽 앞면도 아닌 곳(벽 윗면·어둠)에 찍힌 소품 도트 수를 돌려준다. */
function drawProps(cv, g, queue) {
    cv.floorMask = g.floor;
    const before = Int32Array.from(cv.px);
    queue.sort((a, b) => a[0] - b[0] || a[1] - b[1]).forEach(([, , fn]) => fn());
    let stray = 0;
    for (let i = 0; i < cv.px.length; i++) if (cv.px[i] !== before[i] && !g.floor[i] && !g.face[i]) stray++;
    return stray;
}

function build(layout) {
    const key = layout.look, look = LOOKS[key];
    useAct(key);
    const palette = new Palette(rampsOf(key)), cv = new Canvas(layout.columns * T, layout.rows * T, seedOf(key), palette);
    const g = terrain(cv, layout, look.shape);
    wallRegions(cv, g, look.abyss ? 0 : look.faceH, look.shape === 'organic');
    measure(cv, g);
    cv.px.fill(P.dark[0]);
    const plaza = paintFloor(cv, g, layout, look);
    if (look.moss) F.moss(cv, g, look.moss);
    if (look.litter.length) F.litter(cv, g, plaza, look.litter, look.litterDensity);
    paintWalls(cv, g, look);
    A.sky(cv, g, look.sky);
    if (!look.abyss) F.occlusion(cv, g);
    const queue = [], lights = [], ctx = { cv, g, look, lights, taken: [], add: (y, fn) => queue.push([y, queue.length, fn]) };
    D.dress(ctx);
    D.scatter(ctx);
    const stray = drawProps(cv, g, queue), solid = new Uint8Array(cv.px.length);
    for (let i = 0; i < solid.length; i++) solid[i] = g.floor[i] || g.face[i] ? 1 : 0;
    D.lighting(cv, solid, lights);
    if (ctx.landing) D.landing(cv, g, ...ctx.landing);
    if (look.fireflies) D.fireflies(cv, g, P[look.fireflies]);
    return { cv, gate: buildGate(D.gateDirection(layout), palette), direction: D.gateDirection(layout), stray, shade: P.dark[0] };
}

/** --act N (one act map), --map id (one content map), --content (every content map), else all of them. */
function wanted(args) {
    const flag = name => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
    const act = flag('--act') === null ? null : Number(flag('--act')), id = flag('--map'), content = args.includes('--content');
    return row => (act === null || row.look === act) && (!id || row.id === id) && (!content || typeof row.look === 'string');
}
function main() {
    const args = process.argv.slice(2);
    const write = args.includes('--write'), out = write ? path.join(root, 'assets/exploration') : path.join(root, 'artifacts/act-maps');
    fs.mkdirSync(out, { recursive: true });
    const backdrops = JSON.parse(vm.runInContext('JSON.stringify(ACT_EXPLORATION_BACKDROPS)', buildGameRuntime()));
    for (const layout of readLayouts().filter(wanted(args))) {
        const started = Date.now(), { cv, gate, direction, stray, shade } = build(layout);
        const name = typeof layout.look === 'number' ? `act${layout.look}-r${layout.rotation}` : `${layout.id}-r${layout.rotation}`;
        fs.writeFileSync(path.join(out, `${name}-map.png`), encodePng(cv.px, cv.w, cv.h));
        fs.writeFileSync(path.join(out, `${name}-gate.png`), encodePng(gate.rgb, gate.w, gate.h, gate.alpha));
        const expected = backdrops[layout.id]?.views[layout.rotation]?.gateOffset || [], same = expected[0] === gate.offset[0] && expected[1] === gate.offset[1];
        const rgb = [(shade >> 16) & 255, (shade >> 8) & 255, shade & 255];
        console.log(`${name} ${LOOKS[layout.look].title}: ${cv.w}×${cv.h}, 관문 ${direction} ${JSON.stringify(gate.offset)}${same ? '' : ` (등록값 ${JSON.stringify(expected)}과 다름)`}, 어둠 [${rgb}], 벽에 걸친 소품 ${stray}, ${Date.now() - started}ms`);
    }
    console.log(write ? '→ assets/exploration/ 에 썼습니다.' : `→ 미리보기: ${path.relative(root, out)}/ (게임에 넣으려면 --write)`);
}

main();
