#!/usr/bin/env node
/* 그루터기 함 틀(2026-10-28 디렉터 전달본 RIGNIN_Director_Handoff_2026-10-28: 다크 목재와 루비 v7은 그루터기 함 판, 상아색 목재와 자수정
 * v8은 조합창)을 게임용 파일로 옮긴다. 압축을 푼 전달본 폴더를 받는다:
 *   node scripts/build-stump-frames.cjs <전달본 폴더>
 * 받은 512px 그림(256px 원본의 정확한 2배)을 바이트 그대로 assets/ui/grove/stump-gems/<테마>/에 옮긴다: 기본 틀 normal.png, 그리고
 * 버튼 넷(top 생명의 나무, left · right 세로 보석, bottom 가로 보석)의 올렸을 때(hover)와 눌렀을 때(pressed) 조각. 전달본 안내대로 틀을
 * 통째로 바꾸지 않고, 그 버튼 자리에만 조각을 겹친다(통째로 바꾸면 네 버튼이 모두 바뀐다). 버튼 자리는 technical-spec.json의 256px 좌표다.
 * 빛의 고리를 그루터기 함 모양 안으로 자르는 가림판(mask.png: 두 틀의 보이는 화소와 칸 자리 전체, 판 자리만 잘라 2배)도 적는다.
 * 마지막에 css/stump-box.css가 쓰는 판 자리, 칸과 사이의 화소, 버튼 자리(판에 대한 몫)를 찍는다. 받은 폴더는 자료로만 읽는다.
 */
const fs = require('node:fs'), path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');
const ROOT = path.join(__dirname, '..');
const SOURCE = process.argv[2];
const OUT = path.join(ROOT, 'assets/ui/grove/stump-gems');
const THEMES = Object.freeze(['dark', 'ivory']);
const BUTTONS = Object.freeze({ top: [88, 0, 80, 48], left: [0, 104, 48, 48], right: [209, 104, 47, 48], bottom: [88, 210, 80, 46] });
const STATES = Object.freeze(['hover', 'pressed']);
if (!SOURCE || !fs.existsSync(path.join(SOURCE, 'docs/technical-spec.json'))) {
    console.error('사용법: node scripts/build-stump-frames.cjs <압축을 푼 RIGNIN_Director_Handoff 폴더>');
    process.exit(1);
}

const spec = JSON.parse(fs.readFileSync(path.join(SOURCE, 'docs/technical-spec.json'), 'utf8'));
for (const theme of THEMES) for (const [name, rect] of Object.entries(BUTTONS)) {
    const given = spec.themes[theme].components['256'][name].rect;
    if (given.join() !== rect.join()) throw new Error(`${theme} ${name}: 전달본 좌표 ${given} 와 다르다`);
}
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(SOURCE, from), to); };
for (const theme of THEMES) {
    copy(`assets/${theme}/512/normal.png`, path.join(OUT, theme, 'normal.png'));
    for (const name of Object.keys(BUTTONS)) for (const state of STATES) copy(`components/${theme}/512/${name}/${state}.png`, path.join(OUT, theme, `${name}-${state}.png`));
}

// 256px 원본에서 잰다: 칸 25개(틀 안에 갇힌 투명한 덩어리)와 틀의 보이는 상자.
const frames = THEMES.map(theme => decodePng(fs.readFileSync(path.join(SOURCE, `assets/${theme}/256/normal.png`))));
const { width: W, height: H } = frames[0];
const seen = (png, i) => png.data[i * 4 + 3] > 8;
function holes(png) {
    const visited = new Uint8Array(W * H), out = [];
    for (let start = 0; start < W * H; start++) {
        if (visited[start] || seen(png, start)) continue;
        const stack = [start]; visited[start] = 1;
        let x0 = W, y0 = H, x1 = 0, y1 = 0, count = 0, edge = false;
        while (stack.length) {
            const at = stack.pop(), x = at % W, y = (at - x) / W; count++;
            edge ||= x === 0 || y === 0 || x === W - 1 || y === H - 1;
            x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
                const next = ny * W + nx;
                if (nx >= 0 && ny >= 0 && nx < W && ny < H && !visited[next] && !seen(png, next)) { visited[next] = 1; stack.push(next); }
            }
        }
        if (!edge && count > 50) out.push({ x0, y0, x1, y1 });
    }
    return out;
}
const cells = holes(frames[0]);
if (cells.length !== 25) throw new Error(`칸이 25개가 아니다 (${cells.length})`);
if (JSON.stringify(holes(frames[1])) !== JSON.stringify(cells)) throw new Error('두 틀의 칸 자리가 다르다');
let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
frames.forEach(png => { for (let i = 0; i < W * H; i++) if (seen(png, i)) { const x = i % W, y = (i - x) / W; bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); } });
const board = { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 };
const grid = { x0: Math.min(...cells.map(c => c.x0)), y0: Math.min(...cells.map(c => c.y0)), x1: Math.max(...cells.map(c => c.x1)), y1: Math.max(...cells.map(c => c.y1)) };

// 가림판: 판 자리만, 2배.
const mask = new Uint8Array(board.w * 2 * board.h * 2 * 4);
for (let y = 0; y < board.h * 2; y++) for (let x = 0; x < board.w * 2; x++) {
    const sx = board.x + (x >> 1), sy = board.y + (y >> 1), i = sy * W + sx;
    const inGrid = sx >= grid.x0 && sx <= grid.x1 && sy >= grid.y0 && sy <= grid.y1;
    if (inGrid || frames.some(png => seen(png, i))) mask.set([255, 255, 255, 255], (y * board.w * 2 + x) * 4);
}
fs.writeFileSync(path.join(OUT, 'mask.png'), encodePng(board.w * 2, board.h * 2, mask));

/** 칸과 사이(틀의 살)의 화소, 차례로: css의 fr 줄. */
function tracks(from, to) {
    const spans = [...new Set(cells.map(c => `${c[from]},${c[to]}`))].map(s => s.split(',').map(Number)).sort((a, b) => a[0] - b[0]);
    return spans.flatMap(([a, b], i) => (i ? [a - spans[i - 1][1] - 1] : []).concat(b - a + 1)).join(' ');
}
const pct = (value, whole) => `${Math.round(value / whole * 100000) / 1000}%`;
console.log(`판: 256px 그림의 (${board.x}, ${board.y})부터 ${board.w}×${board.h} (2배 ${board.w * 2}×${board.h * 2})`);
console.log(`그림 층: left ${pct(-board.x, board.w)} top ${pct(-board.y, board.h)} width ${pct(W, board.w)} height ${pct(H, board.h)}`);
console.log(`칸 격자: left ${pct(grid.x0 - board.x, board.w)} top ${pct(grid.y0 - board.y, board.h)} width ${pct(grid.x1 - grid.x0 + 1, board.w)} height ${pct(grid.y1 - grid.y0 + 1, board.h)}`);
console.log(`  columns ${tracks('x0', 'x1')}`);
console.log(`  rows    ${tracks('y0', 'y1')}`);
for (const [name, [x, y, w, h]] of Object.entries(BUTTONS)) console.log(`버튼 ${name}: left ${pct(x, W)} top ${pct(y, H)} width ${pct(w, W)} height ${pct(h, H)} (그림 층에 대해)`);
console.log(`빛의 고리 중심(생명의 나무): ${pct(128 - board.x, board.w)} ${pct(24 - board.y, board.h)}`);
