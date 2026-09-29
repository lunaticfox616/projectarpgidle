#!/usr/bin/env node
/* 액트 탐험 맵 배경을 도트로 찍는다(칸 16도트, 게임에서 정수 3배 = 칸 48px). 예전 전투 디오라마의 색·벽·바닥 무늬·소품을
 * 위에서 본 맵으로 옮긴 모양이다(scripts/act-maps/themes.cjs). 걷는 칸은 게임의 맵 데이터를 그대로 따른다.
 *
 *   node scripts/build-act-maps.cjs              # 액트 1~10 → 미리보기 폴더(기본: artifacts/act-maps/)
 *   node scripts/build-act-maps.cjs --act 2      # 한 액트만
 *   node scripts/build-act-maps.cjs --write      # assets/exploration/actN-map.png·actN-gate.png 교체
 *
 * rignin-ui/art-pipeline/tiles/build_map.py(파이썬)를 옮기고 모양 표를 바꾼 것. 그림 크기·관문 기준점은 예전과 같다. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const { encodePng, andNot } = require('./act-maps/raster.cjs');
const { T, Palette, Canvas } = require('./act-maps/paint.cjs');
const { PALETTES } = require('./act-maps/palettes.cjs');
const { THEMES } = require('./act-maps/themes.cjs');
const { roomBox, terrain, wallRegions } = require('./act-maps/terrain.cjs');
const { paintGround, paintPaving, floorRoots, puddles } = require('./act-maps/floor.cjs');
const { ornaments } = require('./act-maps/ornaments.cjs');
const faces = require('./act-maps/faces.cjs');
const faces2 = require('./act-maps/faces2.cjs');
const tops = require('./act-maps/tops.cjs');
const { dress, scatter, lighting, gateDirection } = require('./act-maps/dress.cjs');
const { buildGate } = require('./act-maps/gate.cjs');

const root = path.resolve(__dirname, '..');
const FACES = { earth: faces.earth, arches: faces.arches, balustrade: faces.balustrade, library: faces.library, ...faces2.FACES };
const TOPS = { roots: tops.roots, masonry: tops.masonry, bark: tops.bark, void: tops.voidTop, canopy: tops.canopy };

function readLayouts() {
    const runtime = buildGameRuntime();
    return JSON.parse(vm.runInContext(`JSON.stringify(ACT_EXPLORATION_MAPS.map(source => {
        const map = actExplorationMap.layout(source.act);
        return { ...map, links: source.links.map(link => [link[0], link[1]]), approach: source.approach };
    }))`, runtime));
}

function paintWalls(cv, g, th, lights) {
    const wl = th.wall;
    wallRegions(cv, g, wl.faceH, wl.jitter !== false);
    for (let i = 0; i < g.wall.length; i++) if (g.wall[i]) cv.px[i] = cv.col('dirt', 0);
    if (wl.top === 'void' && !wl.faceH) {
        tops.underside(cv, g);
        g.top = andNot(g.wall, g.under);
    }
    FACES[wl.face](cv, g, th, lights);
    TOPS[wl.top](cv, g, th);
    tops.outline(cv, g);
    if (faces2.AFTER[wl.face]) faces2.AFTER[wl.face](cv, g, th, lights);
}

function darkenBossRoom(cv, g) {
    const boss = g.rooms.boss;
    if (!boss) return;
    const [x0, y0, x1, y1] = roomBox(boss);
    for (let y = Math.max(0, y0); y < Math.min(cv.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(cv.w, x1); x++) {
        const i = y * cv.w + x;
        if (g.floor[i] && !(g.canopy && g.canopy[i])) cv.px[i] = cv.pal.shade(cv.px[i], -1);
    }
}

function build(layout, seed = 1) {
    const th = THEMES[layout.act], palette = new Palette(PALETTES[layout.act]);
    const cv = new Canvas(layout.columns * T, layout.rows * T, seed + layout.act * 101, palette);
    const g = terrain(cv, layout, th.shape), lights = [], queue = [], taken = [];
    paintGround(cv, g, th);
    for (const spec of th.paving || []) paintPaving(cv, g, spec);
    ornaments(cv, g, th.ornament);
    if (th.floorRoots) floorRoots(cv, g, th.floorRoots);
    if (th.puddles) puddles(cv, g, th.puddles);
    paintWalls(cv, g, th, lights);
    darkenBossRoom(cv, g);
    const ctx = { cv, g, th, lights, taken, draw: (y, fn) => queue.push([y, queue.length, fn]) };
    dress(ctx, layout);
    scatter(ctx);
    queue.sort((a, b) => a[0] - b[0] || a[1] - b[1]).forEach(([, , fn]) => fn());
    lighting(cv, g, lights, th);
    return { cv, gate: buildGate(gateDirection(layout), palette), direction: gateDirection(layout) };
}

function main() {
    const args = process.argv.slice(2), only = args.includes('--act') ? Number(args[args.indexOf('--act') + 1]) : null;
    const write = args.includes('--write'), out = write ? path.join(root, 'assets/exploration') : path.join(root, 'artifacts/act-maps');
    fs.mkdirSync(out, { recursive: true });
    const registry = vm.runInContext('JSON.stringify(ACT_EXPLORATION_BACKDROPS)', buildGameRuntime());
    const backdrops = JSON.parse(registry);
    for (const layout of readLayouts().filter(row => !only || row.act === only)) {
        const started = Date.now(), { cv, gate, direction } = build(layout);
        fs.writeFileSync(path.join(out, `act${layout.act}-map.png`), encodePng(cv.px, cv.w, cv.h));
        fs.writeFileSync(path.join(out, `act${layout.act}-gate.png`), encodePng(gate.rgb, gate.w, gate.h, gate.alpha));
        const expected = backdrops[layout.id]?.gateOffset || [];
        const same = expected[0] === gate.offset[0] && expected[1] === gate.offset[1];
        console.log(`액트 ${layout.act} ${THEMES[layout.act].title}: ${cv.w}×${cv.h}, 관문 ${direction} ${JSON.stringify(gate.offset)}${same ? '' : ` (등록값 ${JSON.stringify(expected)}과 다름)`}, ${Date.now() - started}ms`);
    }
    console.log(write ? '→ assets/exploration/ 에 썼습니다.' : `→ 미리보기: ${path.relative(root, out)}/ (게임에 넣으려면 --write)`);
}

main();
