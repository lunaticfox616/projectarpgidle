/** 옆에서 보는 무대의 지형 (2026-10-11 사용자: "시뮬레이션처럼 한번 해봐"). 캐릭터 시뮬레이터의 무대처럼 벽돌 뒷벽, 기둥, 판석 바닥을
 * 지도 모양 그대로 그린다. 지도 한 장을 캔버스 하나에 한 번 그려 두고(칸 = 가로 64 × 깊이 32 도트, 캐릭터와 같은 밀도) 매 프레임에는
 * 그 그림을 옮기기만 한다. 큰 그림 파일을 받지 않으려고 게임 안에서 그린다. 색은 data/stage-view.js STAGE_TERRAIN의 지형별 두 색.
 *
 * 뒷벽: 바닥의 북쪽이 벽이면 그 벽의 앞면을 벽 칸 자리에 그린다. 높이는 벽이 북쪽으로 이어진 칸 수만큼이다(최대 wallMax). 벽 칸 위에만
 * 그리므로 뒤쪽 바닥을 가리지 않는다(도트 게임의 벽이 두세 칸 높이로 서는 것과 같은 눈속임이다). 그리기만 하고 지도나 전투 상태는 건드리지 않는다.
 */
const stageTerrain = (() => {
    const WIDE = 64, DEEP = 32;                 // 한 칸의 도트 크기
    const SLAB = Object.freeze({ h: 16, min: 36, step: 8, steps: 5 });   // 판석: 높이, 가장 좁은 너비, 너비가 늘어나는 단위와 가짓수
    const BRICK = Object.freeze({ w: 32, h: 16 });

    /** 0..1, the same for the same cell every time (no Math.random: a map always looks the same). */
    function noise(x, y, salt) {
        let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(salt, 2246822519) | 0;
        h = Math.imul(h ^ (h >>> 13), 1274126177);
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
    function rgbOf(hex) {
        const n = parseInt(hex.slice(1), 16);
        return [n >> 16 & 255, n >> 8 & 255, n & 255];
    }
    /** A colour scaled by k and nudged by add, as a CSS string. */
    function tone(rgb, k, add = 0) {
        return `rgb(${rgb.map(value => Math.max(0, Math.min(255, Math.round(value * k + add)))).join(',')})`;
    }
    function coloursOf(map) {
        const look = STAGE_TERRAIN.biomes[map.biome] || STAGE_TERRAIN.biomes.root;
        return { floor: rgbOf(look.floor), wall: rgbOf(look.wall) };
    }
    /** 그릴 칸 범위의 칸마다 한 번씩. */
    function eachCell(box, visit) {
        for (let y = box.y; y < box.y + box.rows; y++) for (let x = box.x; x < box.x + box.columns; x++) visit(x, y);
    }
    /** 칸 범위가 그림에서 차지하는 도트 영역. */
    const dotsOf = box => ({ x: box.x * WIDE, y: box.y * DEEP, w: box.columns * WIDE, h: box.rows * DEEP });

    const isFloor = (map, x, y) => x >= 0 && y >= 0 && x < map.columns && y < map.rows && map.tiles[y * map.columns + x] === 1;
    /** Dots the wall north of floor cell (x, y) stands: as many cells as the wall runs north, at most wallMax. */
    function wallHeight(map, x, y) {
        let run = 0;
        while (y - 1 - run >= 0 && !isFloor(map, x, y - 1 - run)) run++;
        return Math.min(STAGE_TERRAIN.wallMax, run * DEEP);
    }

    // ---------------------------------------------------------------- floor
    function clipToFloor(ctx, scene) {
        ctx.beginPath();
        eachCell(scene.box, (x, y) => { if (scene.floor(x, y)) ctx.rect(x * WIDE, y * DEEP, WIDE, DEEP); });
        ctx.clip();
    }
    /** Flagstones in rows, each 36 to 68 dots wide (set by its row and place, so a map always looks the same): nearly one colour,
     * now and then a darker stone, a thin darker joint on the top and left of each. */
    function paintSlabs(ctx, area, floor) {
        ctx.fillStyle = tone(floor, 0.8);
        ctx.fillRect(area.x, area.y, area.w, area.h);
        for (let row = Math.floor(area.y / SLAB.h); row * SLAB.h < area.y + area.h; row++) {
            let x = -Math.floor(noise(row, 3, 21) * SLAB.min);
            for (let column = 0; x < area.x + area.w; column++) {
                const width = SLAB.min + Math.floor(noise(column, row, 22) * SLAB.steps) * SLAB.step;
                if (x + width > area.x) paintSlab(ctx, { x, y: row * SLAB.h, width, column, row }, floor);
                x += width;
            }
        }
    }
    function paintSlab(ctx, slab, floor) {
        const worn = noise(slab.column, slab.row, 23) > 0.88 ? 0.86 : 1;
        ctx.fillStyle = tone(floor, worn, (noise(slab.column, slab.row, 1) - 0.5) * 9);
        ctx.fillRect(slab.x + 1, slab.y + 1, slab.width - 1, SLAB.h - 1);
        ctx.fillStyle = tone(floor, worn * 1.1, 2);          // 윗변의 밝은 모서리: 돌 하나하나가 도드라진다
        ctx.fillRect(slab.x + 2, slab.y + 1, slab.width - 3, 1);
    }
    /** Broad darker and lighter patches (worn and damp stone), so a large room is not one flat tone. */
    function paintStains(ctx, area) {
        const count = Math.round(area.w * area.h / 26000);
        for (let i = 0; i < count; i++) {
            const x = area.x + noise(i, 23 + area.x, 8) * area.w, y = area.y + noise(i, 29, 9) * area.h, r = 40 + noise(i, 31, 10) * 90;
            const patch = ctx.createRadialGradient(x, y, 0, x, y, r), dark = noise(i, 37, 11) > 0.35;
            patch.addColorStop(0, dark ? 'rgba(10,8,14,0.22)' : 'rgba(255,240,220,0.07)');
            patch.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = patch;
            ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.5); ctx.translate(-x, -y);
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
            ctx.restore();
        }
    }
    /** Chips and grit: a few darker and lighter flecks so the slabs do not read as flat tiles. */
    function paintFlecks(ctx, area, floor) {
        const count = Math.round(area.w * area.h / 900);
        for (let i = 0; i < count; i++) {
            const x = area.x + Math.floor(noise(i, 7 + area.x, 2) * area.w), y = area.y + Math.floor(noise(i, 11, 3) * area.h), light = noise(i, 13, 4) > 0.6;
            ctx.fillStyle = tone(floor, light ? 1.22 : 0.7);
            ctx.fillRect(x, y, 1 + Math.floor(noise(i, 17, 5) * 3), 1);
        }
    }
    function paintFloor(ctx, scene) {
        const area = dotsOf(scene.box);
        ctx.save();
        clipToFloor(ctx, scene);
        paintSlabs(ctx, area, scene.colours.floor);
        paintStains(ctx, area);
        paintFlecks(ctx, area, scene.colours.floor);
        ctx.restore();
    }

    // ---------------------------------------------------------------- walls
    /** Bricks of the back wall inside one face (the clip is the face), drawn on the map's own brick grid so faces line up. */
    function paintBricks(ctx, face, wall) {
        ctx.fillStyle = tone(wall, 0.5);
        ctx.fillRect(face.x, face.y, WIDE, face.h);
        for (let row = Math.floor(face.y / BRICK.h); row * BRICK.h < face.y + face.h; row++) {
            const offset = row % 2 ? BRICK.w / 2 : 0, first = Math.floor((face.x + offset) / BRICK.w) - 1;
            for (let column = first; column * BRICK.w - offset < face.x + WIDE; column++) {
                ctx.fillStyle = tone(wall, 0.84, (noise(column, row, 6) - 0.5) * 12);
                ctx.fillRect(column * BRICK.w - offset + 1, row * BRICK.h + 1, BRICK.w - 2, BRICK.h - 2);
            }
        }
    }
    function paintPillar(ctx, face, wall) {
        const x = face.x + (WIDE - 28) / 2;
        ctx.fillStyle = tone(wall, 1.18);
        ctx.fillRect(x, face.y, 28, face.h);
        ctx.fillStyle = tone(wall, 1.5);
        ctx.fillRect(x, face.y, 4, face.h);
        ctx.fillStyle = tone(wall, 0.6);
        ctx.fillRect(x + 24, face.y, 4, face.h);
    }
    /** The wall darkens toward its foot, and its foot throws a short shadow on the floor in front. */
    function paintWallShade(ctx, face) {
        const reach = Math.min(40, face.h), foot = face.y + face.h;
        const down = ctx.createLinearGradient(0, foot - reach, 0, foot);
        down.addColorStop(0, 'rgba(8,6,12,0)');
        down.addColorStop(1, 'rgba(8,6,12,0.7)');
        ctx.fillStyle = down;
        ctx.fillRect(face.x, foot - reach, WIDE, reach);
    }
    function paintFootShadow(ctx, face) {
        const foot = face.y + face.h, cast = ctx.createLinearGradient(0, foot, 0, foot + 20);
        cast.addColorStop(0, 'rgba(8,6,12,0.5)');
        cast.addColorStop(1, 'rgba(8,6,12,0)');
        ctx.fillStyle = cast;
        ctx.fillRect(face.x, foot, WIDE, 20);
    }
    function paintFace(ctx, face, wall) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(face.x, face.y, WIDE, face.h);
        ctx.clip();
        paintBricks(ctx, face, wall);
        if (face.pillar) paintPillar(ctx, face, wall);
        paintWallShade(ctx, face);
        ctx.restore();
        // 벽 윗면의 앞 모서리(밝은 줄)와 바닥이 벽과 만나는 줄
        ctx.fillStyle = tone(wall, 1.3);
        ctx.fillRect(face.x, face.y, WIDE, 2);
        paintFootShadow(ctx, face);
        ctx.fillStyle = tone(wall, 1.55);
        ctx.fillRect(face.x, face.y + face.h, WIDE, 2);
    }
    function paintBackWalls(ctx, scene) {
        const map = scene.map;
        eachCell(scene.box, (x, y) => {
            if (y < 1 || !isFloor(map, x, y) || isFloor(map, x, y - 1)) return;
            const h = wallHeight(map, x, y);
            paintFace(ctx, { x: x * WIDE, y: y * DEEP - h, h, pillar: h >= 64 && x % STAGE_TERRAIN.pillarEvery === 2 }, scene.colours.wall);
        });
    }
    /** Side walls are seen edge on (a dark band), and the near edge of a floor ends in a lip over the dark. */
    function paintEdges(ctx, scene) {
        const { colours, floor } = scene;
        eachCell(scene.box, (x, y) => {
            if (!floor(x, y)) return;
            ctx.fillStyle = tone(colours.wall, 0.55);
            if (!floor(x - 1, y)) ctx.fillRect(x * WIDE - 5, y * DEEP, 5, DEEP);
            if (!floor(x + 1, y)) ctx.fillRect((x + 1) * WIDE, y * DEEP, 5, DEEP);
            if (floor(x, y + 1)) return;
            ctx.fillStyle = tone(colours.floor, 0.62);
            ctx.fillRect(x * WIDE, (y + 1) * DEEP, WIDE, 4);
            ctx.fillStyle = tone(colours.floor, 0.36);
            ctx.fillRect(x * WIDE, (y + 1) * DEEP + 4, WIDE, 3);
        });
    }
    /** 벽의 윗면과 그 너머: 빛이 닿지 않는 어둠. */
    const DARK = 0.34;

    /** @param {object} map a compiled layout (js/act-exploration-map.js)
     * @param {{x:number,y:number,columns:number,rows:number}} [box] the cells to paint (a room of a room-by-room map,
     *   js/canvas-stage-rooms.js); the whole map if omitted
     * @returns {HTMLCanvasElement} the box at 64 by 32 dots a cell */
    function paint(map, box = { x: 0, y: 0, columns: map.columns, rows: map.rows }) {
        const canvas = document.createElement('canvas'), scene = { map, box, colours: coloursOf(map), floor: (x, y) => isFloor(map, x, y) };
        canvas.width = box.columns * WIDE;
        canvas.height = box.rows * DEEP;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = tone(scene.colours.wall, DARK);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.translate(-box.x * WIDE, -box.y * DEEP);
        paintFloor(ctx, scene);
        paintEdges(ctx, scene);
        paintBackWalls(ctx, scene);
        return canvas;
    }
    // ---------------------------------------------------------------- open stage: a backdrop picture stands where the walls were
    /** Path cells beyond the room, each with its distance from the door: a side or front door's path runs on to the picture's edge. */
    function pathCells(map, room, box) {
        const cells = new Map();
        for (const door of map.doors.filter(row => row.room === room.index)) {
            const { gx, gy } = door.cell;
            if (door.side === 'west') for (let x = box.x; x < gx; x++) cells.set(x + ',' + gy, gx - x);
            if (door.side === 'east') for (let x = gx + 1; x < box.x + box.columns; x++) cells.set(x + ',' + gy, x - gx);
            if (door.side === 'south') for (let y = gy + 1; y < box.y + box.rows; y++) cells.set(gx + ',' + y, y - gy);
        }
        return cells;
    }
    /** The dark ground in front of the backdrop: everything from the room's back edge down. Nearly flat, like the pictures' own
     * empty band, with a little grit so it is ground and not a hole. */
    function paintEarth(ctx, scene, room) {
        const area = dotsOf(scene.box), top = room.y0 * DEEP, height = area.y + area.h - top;
        // 방 밖의 땅도 같은 판석이되 빛이 닿지 않아 어둡다: 바닥이 허공에 뜬 판처럼 보이지 않게 한다.
        paintSlabs(ctx, { x: area.x, y: top, w: area.w, h: height }, scene.colours.earth.map(value => value * 1.32));
        const count = Math.round(area.w * height / 1500);
        for (let i = 0; i < count; i++) {
            const x = area.x + Math.floor(noise(i, 41 + area.x, 12) * area.w), y = top + Math.floor(noise(i, 43, 13) * height);
            ctx.fillStyle = tone(scene.colours.earth, noise(i, 47, 14) > 0.5 ? 1.3 : 0.7);
            ctx.fillRect(x, y, 2 + Math.floor(noise(i, 53, 15) * 5), 1);
        }
    }
    /** Fills the upper half of an ellipse standing on the line y = foot, one dot row at a time (no smoothed edge). lumps: how far
     * its sides swell and pinch on the way up (roots, not masonry), each side on its own; the foot flares like a trunk's. */
    function fillArch(ctx, arch) {
        for (let row = 1; row <= arch.ry; row++) {
            const half = arch.rx * Math.sqrt(Math.max(0, 1 - (row * row) / (arch.ry * arch.ry))) + Math.max(0, 14 - row) * arch.flare;
            const swell = side => arch.lumps * (0.5 + 0.5 * Math.sin(row * 0.19 + side * 2.3 + arch.cx));
            const left = Math.round(half + swell(0)), right = Math.round(half + swell(1));
            ctx.fillRect(arch.cx - left, arch.foot - row, left + right, 1);
        }
    }
    /** A back door: a dark hollow standing on the ground line behind the door cell, rimmed by roots like the hollows of the trunks. */
    function paintHollow(ctx, door, room, colours) {
        const cx = Math.round((door.cell.gx + 0.5) * WIDE), foot = room.y0 * DEEP, rx = Math.round(WIDE * 0.58), ry = Math.round(DEEP * 3.2);
        const layers = [[12, 6, 0.9, tone(colours.rim, 0.42)], [8, 5, 0.7, tone(colours.rim, 0.78)], [5, 3, 0.4, tone(colours.rim, 1.12)],
            [2, 1, 0.2, tone(colours.rim, 0.5)], [0, 0, 0, tone(colours.hollow, 1)]];
        for (const [grow, lumps, flare, colour] of layers) {
            ctx.fillStyle = colour;
            fillArch(ctx, { cx, foot, rx: rx + grow, ry: ry + grow, lumps, flare });
        }
    }
    /** Moss creeps onto the back of the floor from the backdrop's foot: short tufts in the backdrop's gold-green, thinning forward. */
    function paintMoss(ctx, scene, room) {
        const left = room.x0 * WIDE, width = (room.x1 - room.x0 + 1) * WIDE, top = room.y0 * DEEP, count = Math.round(width / 5);
        for (let i = 0; i < count; i++) {
            const x = left + Math.floor(noise(i, 61 + left, 16) * width), depth = Math.floor(noise(i, 67, 17) ** 2.2 * 26);
            ctx.fillStyle = tone(scene.colours.moss, 0.55 + noise(i, 71, 18) * 0.6);
            ctx.fillRect(x, top + depth, 2 + Math.floor(noise(i, 73, 19) * 4), 1 + (noise(i, 79, 20) > 0.7 ? 1 : 0));
        }
    }
    /** The floor's back edge sinks into the backdrop's shadow, and a path beyond the room darkens as it leaves. */
    function paintOpenShade(ctx, scene, room, paths) {
        paintMoss(ctx, scene, room);
        for (let i = 0; i < 12; i++) {
            ctx.fillStyle = `rgba(8,6,5,${(0.55 * (1 - i / 12)).toFixed(3)})`;
            ctx.fillRect(room.x0 * WIDE, room.y0 * DEEP + i, (room.x1 - room.x0 + 1) * WIDE, 1);
        }
        for (const [key, distance] of paths) {
            const [x, y] = key.split(',').map(Number);
            ctx.fillStyle = `rgba(8,6,5,${Math.min(0.72, 0.18 + distance * 0.11).toFixed(3)})`;
            ctx.fillRect(x * WIDE, y * DEEP, WIDE, DEEP);
        }
        // 뒷문 자리의 바닥은 굴 속이라 안쪽으로 갈수록 어둡다
        for (const door of scene.map.doors.filter(row => row.room === room.index && row.side === 'north')) {
            for (let i = 0; i < DEEP; i++) {
                ctx.fillStyle = `rgba(8,6,5,${(0.8 - 0.55 * i / DEEP).toFixed(3)})`;
                ctx.fillRect(door.cell.gx * WIDE - 5, door.cell.gy * DEEP + i, WIDE + 10, 1);
            }
        }
    }
    /**
     * A room of a room-by-room map without walls (js/canvas-stage-rooms.js draws a backdrop picture behind it,
     * js/canvas-stage-backdrop.js): the paved floor, the paths its doors lead off on, the dark ground round them and a hollow
     * for each back door. Above the room's back edge the picture stays clear.
     * @param {object} look colours of the biome's backdrop (data/stage-view.js STAGE_BACKDROPS)
     */
    function paintOpen(map, room, box, look) {
        const canvas = document.createElement('canvas'), paths = pathCells(map, room, box);
        const scene = { map, box, floor: (x, y) => isFloor(map, x, y) || paths.has(x + ',' + y),
            colours: { floor: rgbOf(look.floor), wall: rgbOf(look.kerb), earth: rgbOf(look.earth), rim: rgbOf(look.rim), hollow: rgbOf(look.hollow), moss: rgbOf(look.moss) } };
        canvas.width = box.columns * WIDE;
        canvas.height = box.rows * DEEP;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.translate(-box.x * WIDE, -box.y * DEEP);
        paintEarth(ctx, scene, room);
        for (const door of map.doors.filter(row => row.room === room.index && row.side === 'north')) paintHollow(ctx, door, room, scene.colours);
        paintFloor(ctx, scene);
        paintEdges(ctx, scene);
        paintOpenShade(ctx, scene, room, paths);
        return canvas;
    }
    /** The colours a map is painted with, as CSS strings: the floor, the wall, and the dark beyond the walls. */
    function colours(map) {
        const look = coloursOf(map);
        return { floor: tone(look.floor, 1), wall: tone(look.wall, 1), dark: tone(look.wall, DARK) };
    }

    return { paint, paintOpen, colours };
})();
safeExposeGlobals({ stageTerrain });
