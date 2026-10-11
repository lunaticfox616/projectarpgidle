/** 옆에서 보는 무대의 지형 (2026-10-11 사용자: "시뮬레이션처럼 한번 해봐"). 캐릭터 시뮬레이터의 무대처럼 벽돌 뒷벽, 기둥, 판석 바닥을
 * 지도 모양 그대로 그린다. 지도 한 장을 캔버스 하나에 한 번 그려 두고(칸 = 가로 64 × 깊이 32 도트, 캐릭터와 같은 밀도) 매 프레임에는
 * 그 그림을 옮기기만 한다. 큰 그림 파일을 받지 않으려고 게임 안에서 그린다. 색은 data/stage-view.js STAGE_TERRAIN의 지형별 두 색.
 *
 * 뒷벽: 바닥의 북쪽이 벽이면 그 벽의 앞면을 벽 칸 자리에 그린다. 높이는 벽이 북쪽으로 이어진 칸 수만큼이다(최대 wallMax). 벽 칸 위에만
 * 그리므로 뒤쪽 바닥을 가리지 않는다(도트 게임의 벽이 두세 칸 높이로 서는 것과 같은 눈속임이다). 그리기만 하고 지도나 전투 상태는 건드리지 않는다.
 */
const stageTerrain = (() => {
    const WIDE = 64, DEEP = 32;                 // 한 칸의 도트 크기
    const SLAB = Object.freeze({ w: 48, h: 16 });
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
        eachCell(scene.box, (x, y) => { if (isFloor(scene.map, x, y)) ctx.rect(x * WIDE, y * DEEP, WIDE, DEEP); });
        ctx.clip();
    }
    /** Flagstones in staggered rows: nearly one colour, a thin darker joint on the top and left of each, as on the simulator's stage. */
    function paintSlabs(ctx, area, floor) {
        ctx.fillStyle = tone(floor, 0.82);
        ctx.fillRect(area.x, area.y, area.w, area.h);
        for (let row = Math.floor(area.y / SLAB.h); row * SLAB.h < area.y + area.h; row++) {
            const offset = row % 2 ? SLAB.w / 2 : 0;
            for (let column = Math.floor((area.x + offset) / SLAB.w); column * SLAB.w - offset < area.x + area.w; column++) {
                ctx.fillStyle = tone(floor, 1, (noise(column, row, 1) - 0.5) * 7);
                ctx.fillRect(column * SLAB.w - offset + 1, row * SLAB.h + 1, SLAB.w - 1, SLAB.h - 1);
            }
        }
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
        const { map, colours } = scene;
        eachCell(scene.box, (x, y) => {
            if (!isFloor(map, x, y)) return;
            ctx.fillStyle = tone(colours.wall, 0.55);
            if (!isFloor(map, x - 1, y)) ctx.fillRect(x * WIDE - 5, y * DEEP, 5, DEEP);
            if (!isFloor(map, x + 1, y)) ctx.fillRect((x + 1) * WIDE, y * DEEP, 5, DEEP);
            if (isFloor(map, x, y + 1)) return;
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
        const canvas = document.createElement('canvas'), scene = { map, box, colours: coloursOf(map) };
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
    /** The colours a map is painted with, as CSS strings: the floor, the wall, and the dark beyond the walls. */
    function colours(map) {
        const look = coloursOf(map);
        return { floor: tone(look.floor, 1), wall: tone(look.wall, 1), dark: tone(look.wall, DARK) };
    }

    return { paint, colours };
})();
safeExposeGlobals({ stageTerrain });
