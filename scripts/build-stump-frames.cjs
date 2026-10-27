#!/usr/bin/env node
/* 그루터기 함 틀 그림을 게임용 파일로 옮긴다. 지금 그림은 2026-10-27 Codex가 만든 한 장(assets/ui/grove/source/stump-frames-codex-20261027.png,
 * 화면 크기 그대로라 배율 1)이고, 그 전 그림(stump-frames-v1.png, 2026-10-25 사용자, 도트 하나 2×2 화소라 배율 2)도 같은 순서다:
 *   node scripts/build-stump-frames.cjs [받은 그림] [배율, 기본 1]
 * 윗줄 왼쪽부터 어두운 틀(붉은 보석), 빛나는 보석 둘, 아랫줄 왼쪽부터 밝아진 붉은 보석, 뼈빛 틀(보랏빛 보석)이다. 어두운 틀은
 * 그루터기 함 판, 뼈빛 틀은 조합창이고 보석을 누르면 서로 바뀐다(js/stump-box-ui.js switchFrame). 밝아진 보석은 올렸을 때 쓴다. 빛나는 보석
 * 둘은 보석에서 빛의 고리가 번지는 전환(2026-10-27)으로 바뀌어 쓰지 않아 적지 않는다. 칸은 받은 그림에서 이미 투명하다(게임의 칸 단추가
 * 그 자리를 그린다). 틀을 칸 격자 자리에 맞춰 같은 크기 판에 옮겨 assets/ui/grove/stump-frame-<이름>.png로 적고, 빛의 고리를 그루터기 함
 * 모양 안으로 자르는 가림판(stump-frame-mask.png: 판과 조합창 틀의 모양에 칸 자리를 채운 것)도 적는다. 마지막에 css/stump-box.css가 쓰는
 * 칸 격자와 보석 자리(판에 대한 몫), 칸과 사이의 화소(구멍에 맞춘 줄 크기)를 찍는다. 받은 파일은 자료로만 읽는다.
 */
const fs = require('node:fs'), path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');
const ROOT = path.join(__dirname, '..');
const SOURCE = process.argv[2] || path.join(ROOT, 'assets/ui/grove/source/stump-frames-codex-20261027.png');
const OUT = path.join(ROOT, 'assets/ui/grove');
const SCALE = Number(process.argv[3]) || 1;
/** 받은 한 장에서의 줄과 차례(위에서, 왼쪽에서) → 게임 파일 이름. */
const LAYOUT = Object.freeze([['box', 'box-glow', 'box-glow2'], ['box-hover', 'cube']]);
/** 게임이 쓰는 틀. */
const USED = Object.freeze(['box', 'box-hover', 'cube']);

const alphaAt = (png, x, y) => png.data[(y * png.width + x) * 4 + 3];
/** 투명하지 않은 픽셀끼리(상하좌우) 이어진 덩어리의 상자들. 작은 부스러기는 버린다. */
function blobs(png, keep = 2000) {
    const seen = new Uint8Array(png.width * png.height), out = [];
    for (let start = 0; start < seen.length; start++) {
        if (seen[start] || png.data[start * 4 + 3] <= 8) continue;
        let x0 = png.width, y0 = png.height, x1 = 0, y1 = 0, count = 0;
        const stack = [start]; seen[start] = 1;
        while (stack.length) {
            const at = stack.pop(), x = at % png.width, y = (at - x) / png.width;
            count++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                if (nx < 0 || ny < 0 || nx >= png.width || ny >= png.height) continue;
                const next = ny * png.width + nx;
                if (!seen[next] && png.data[next * 4 + 3] > 8) { seen[next] = 1; stack.push(next); }
            }
        }
        if (count >= keep) out.push({ x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
    }
    return out;
}
function crop(png, box) {
    const data = new Uint8Array(box.width * box.height * 4);
    for (let y = 0; y < box.height; y++) data.set(png.data.subarray(((box.y + y) * png.width + box.x) * 4, ((box.y + y) * png.width + box.x + box.width) * 4), y * box.width * 4);
    return { width: box.width, height: box.height, data };
}
/** 칸 자리: 투명한 픽셀. */
const isPaper = (png, x, y) => alphaAt(png, x, y) <= 8;
/** 칸 25개: 틀 안에 갇힌(판 가장자리에 닿지 않는) 투명한 덩어리 가운데 큰 것. 각 칸의 상자와 픽셀 목록. */
function paperCells(png) {
    const seen = new Uint8Array(png.width * png.height), cells = [];
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
        const start = y * png.width + x;
        if (seen[start] || !isPaper(png, x, y)) continue;
        const pixels = [], stack = [start]; seen[start] = 1;
        while (stack.length) {
            const at = stack.pop(), px = at % png.width, py = (at - px) / png.width;
            pixels.push(at);
            for (const [nx, ny] of [[px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]]) {
                if (nx < 0 || ny < 0 || nx >= png.width || ny >= png.height) continue;
                const next = ny * png.width + nx;
                if (!seen[next] && isPaper(png, nx, ny)) { seen[next] = 1; stack.push(next); }
            }
        }
        const xs = pixels.map(p => p % png.width), ys = pixels.map(p => Math.floor(p / png.width));
        if (pixels.length < 150 || Math.min(...xs) === 0 || Math.min(...ys) === 0 || Math.max(...xs) === png.width - 1 || Math.max(...ys) === png.height - 1) continue;
        cells.push({ pixels, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) });
    }
    return cells;
}
function place(frame, width, height, dx, dy) {
    const data = new Uint8Array(width * height * 4);
    for (let y = 0; y < frame.height; y++) data.set(frame.data.subarray(y * frame.width * 4, (y + 1) * frame.width * 4), ((y + dy) * width + dx) * 4);
    return { width, height, data };
}
function enlarge(png, scale) {
    const width = png.width * scale, height = png.height * scale, data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const from = (Math.floor(y / scale) * png.width + Math.floor(x / scale)) * 4;
        data.set(png.data.subarray(from, from + 4), (y * width + x) * 4);
    }
    return { width, height, data };
}
/** 보석: 칸 격자 위쪽 가운데의 채도 높은 픽셀(붉은 · 보랏빛 · 빛나는) 상자. */
function gemBox(png, grid) {
    let x0 = png.width, y0 = png.height, x1 = -1, y1 = -1;
    for (let y = 0; y < grid.y0; y++) for (let x = Math.floor(png.width * 0.3); x < png.width * 0.7; x++) {
        const i = (y * png.width + x) * 4, [r, g, b, a] = png.data.subarray(i, i + 4);
        if (a < 200 || Math.max(r, g, b) - Math.min(r, g, b) < 70) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { x0, y0, x1, y1 };
}

const sheet = decodePng(fs.readFileSync(SOURCE));
const found = blobs(sheet);
if (found.length !== 5) throw new Error(`틀이 다섯 개가 아니다: ${found.length}`);
const rows = [found.filter(box => box.y < sheet.height / 2), found.filter(box => box.y >= sheet.height / 2)].map(row => row.sort((a, b) => a.x - b.x));
const frames = LAYOUT.flatMap((names, row) => names.map((name, index) => {
    const png = crop(sheet, rows[row][index]), cells = paperCells(png);
    if (cells.length !== 25) throw new Error(`${name}: 칸이 25개가 아니다 (${cells.length})`);
    const grid = { x0: Math.min(...cells.map(c => c.x0)), y0: Math.min(...cells.map(c => c.y0)), x1: Math.max(...cells.map(c => c.x1)), y1: Math.max(...cells.map(c => c.y1)) };
    return { name, png, grid, gem: gemBox(png, grid), cells };
}));
// 판: 모든 틀을 칸 격자의 왼쪽 위에 맞춘다.
const left = Math.max(...frames.map(f => f.grid.x0)), top = Math.max(...frames.map(f => f.grid.y0));
const width = left + Math.max(...frames.map(f => f.png.width - f.grid.x0)), height = top + Math.max(...frames.map(f => f.png.height - f.grid.y0));
const boards = new Map(frames.map(frame => [frame.name, enlarge(place(frame.png, width, height, left - frame.grid.x0, top - frame.grid.y0), SCALE)]));
for (const name of USED) { const board = boards.get(name); fs.writeFileSync(path.join(OUT, `stump-frame-${name}.png`), encodePng(board.width, board.height, board.data)); }
const box = frames[0], shift = f => ({ dx: left - f.grid.x0, dy: top - f.grid.y0 });
const pct = (value, whole) => `${Math.round(value / whole * 100000) / 1000}%`;
const grid = { x0: box.grid.x0 + shift(box).dx, y0: box.grid.y0 + shift(box).dy, x1: box.grid.x1 + shift(box).dx, y1: box.grid.y1 + shift(box).dy };
const gems = frames.filter(f => f.gem.x1 >= 0).map(f => ({ x0: f.gem.x0 + shift(f).dx, y0: f.gem.y0 + shift(f).dy, x1: f.gem.x1 + shift(f).dx, y1: f.gem.y1 + shift(f).dy }));
const gem = { x0: Math.min(...gems.map(g => g.x0)), y0: Math.min(...gems.map(g => g.y0)), x1: Math.max(...gems.map(g => g.x1)), y1: Math.max(...gems.map(g => g.y1)) };
const gridW = grid.x1 - grid.x0 + 1, gridH = grid.y1 - grid.y0 + 1;
writeMask(grid);
/** 가림판: 판과 조합창 틀의 보이는 픽셀, 그리고 칸 격자 자리 전체를 흰색으로. */
function writeMask(at) {
    const { width: w, height: h } = boards.get('box'), data = new Uint8Array(w * h * 4);
    const inGrid = (x, y) => x >= at.x0 * SCALE && x < (at.x1 + 1) * SCALE && y >= at.y0 * SCALE && y < (at.y1 + 1) * SCALE;
    for (let i = 0; i < w * h; i++) {
        const x = i % w, y = (i - x) / w, seen = ['box', 'cube'].some(name => boards.get(name).data[i * 4 + 3] > 24);
        if (seen || inGrid(x, y)) data.set([255, 255, 255, 255], i * 4);
    }
    fs.writeFileSync(path.join(OUT, 'stump-frame-mask.png'), encodePng(w, h, data));
}
/** 판 칸의 줄 크기: 구멍(칸)과 그 사이(틀의 살)를 차례로, 화소. 손으로 그린 구멍은 한 줄 안에서도 한두 화소 어긋나 줄마다 가장 넓게 잡는다.
 * css의 fr 줄로 쓴다. */
function tracks(cells, from, to, offset) {
    const spans = [];
    for (const cell of [...cells].sort((a, b) => a[from] - b[from])) {
        const last = spans[spans.length - 1];
        if (last && cell[from] - last[0] < 10) last[1] = Math.max(last[1], cell[to]);
        else spans.push([cell[from], cell[to]]);
    }
    return spans.flatMap(([a, b], i) => (i ? [(a - spans[i - 1][1] - 1) * SCALE] : []).concat((b - a + 1) * SCALE)).join(' ') + ' (from ' + (spans[0][0] + offset) * SCALE + ')';
}
const cellW = Math.round(box.cells.reduce((sum, c) => sum + c.x1 - c.x0 + 1, 0) / 25 * 10) / 10;
console.log(JSON.stringify({
    size: [width * SCALE, height * SCALE],
    grid: { left: pct(grid.x0, width), top: pct(grid.y0, height), width: pct(gridW, width), height: pct(gridH, height) },
    gem: { left: pct(gem.x0, width), top: pct(gem.y0, height), width: pct(gem.x1 - gem.x0 + 1, width), height: pct(gem.y1 - gem.y0 + 1, height) },
    columns: tracks(box.cells, 'x0', 'x1', shift(box).dx), rows: tracks(box.cells, 'y0', 'y1', shift(box).dy),
    gap: pct((gridW - 5 * cellW) / 4, gridW), cellDots: frames.map(f => f.name + ' ' + (f.grid.x1 - f.grid.x0 + 1) + 'x' + (f.grid.y1 - f.grid.y0 + 1)), cellW
}, null, 1));
