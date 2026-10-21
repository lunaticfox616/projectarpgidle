#!/usr/bin/env node
/* HUD 메뉴 단추 그림을 게임용 파일로 옮긴다 (2026-10-13 사용자가 만들어 온 단추 여덟 개: 틀과 아이콘이 한 장에 있고 눌린 그림이 따로 있다).
 *   node scripts/build-hud-buttons.cjs <받은 묶음을 푼 폴더> [...폴더]
 * 폴더 안의 elements/<이름>_Icon_button/<이름>_Icon_button.png(보통)과 pressed.png(눌림)을 찾아 assets/ui/pixel/buttons/에
 * <메뉴>.png, <메뉴>-down.png으로 적는다. 보통 그림은 둘레의 빈 테를 잘라 내기만 하고(도트를 건드리지 않는다), 눌린 그림은 묶음마다
 * 크기가 조금씩 달라 보통 그림과 같은 크기로 맞춘다(누를 때 단추가 커지거나 밀리지 않게). 화면에서는 CSS가 틀 크기로 줄여 그린다
 * (css/themes/pixel-menu.css의 --px-button-art). 받은 파일은 자료로만 읽는다.
 * 2026-10-19 묶음부터 올린 그림(hover.png, 틀 밖으로 빛이 번진다)도 있다: <메뉴>-hover.png으로 적되 보통 그림의 틀에 맞춰(밝기가
 * 달라도 맞도록 밝기의 상관으로 자리를 찾는다) 사방에 STATE_BLEED만큼 여백을 둔 판에 옮긴다. CSS는 그리는 칸을 그만큼 넓혀 틀을
 * 제자리에 둔다(--px-button-art-bleed). 같은 묶음의 잠긴 그림(locked.png)은 쓰지 않는다: 잠긴 메뉴는 열릴 때까지 숨긴다(사용자 결정).
 */
const fs = require('node:fs'), path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');
/** 받은 그림의 이름(폴더 이름의 앞머리) → 게임의 메뉴. */
const MENUS = Object.freeze({ charater_status: 'character', Celtic_Tree_of_Life: 'passive', bagpack: 'bag', setting: 'settings',
    map: 'map', tree_growth_ring: 'stump', old_book: 'journal', Uroboros: 'loop' });
const OUT = path.join(__dirname, '..', 'assets', 'ui', 'pixel', 'buttons');
/** 올린 그림의 판: 보통 그림 한 변의 이 몫을 사방 여백으로 둔다. css/themes/pixel-menu.css의 --px-button-art-bleed와 같은 값. */
const STATE_BLEED = 0.055;
/** 받은 상태 그림의 파일 이름 → 게임 파일의 뒤붙임. */
const EXTRA_STATES = Object.freeze({ 'hover.png': 'hover' });

/** 투명하지 않은 픽셀의 상자. */
function contentBox(png) {
    let x0 = png.width, y0 = png.height, x1 = -1, y1 = -1;
    for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
        if (png.data[(y * png.width + x) * 4 + 3] <= 8) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}
function cropPng(png, box) {
    const data = new Uint8Array(box.width * box.height * 4);
    for (let y = 0; y < box.height; y++) {
        const from = ((box.y + y) * png.width + box.x) * 4;
        data.set(png.data.subarray(from, from + box.width * 4), y * box.width * 4);
    }
    return { width: box.width, height: box.height, data };
}
/** 한 점의 색(알파를 곱한 값): 가장 가까운 네 픽셀을 섞는다. */
function sampleAt(png, x, y) {
    const fx = Math.max(0, Math.min(png.width - 1, x)), fy = Math.max(0, Math.min(png.height - 1, y));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(png.width - 1, x0 + 1), y1 = Math.min(png.height - 1, y0 + 1), tx = fx - x0, ty = fy - y0, out = [0, 0, 0, 0];
    for (const [px, py, weight] of [[x0, y0, (1 - tx) * (1 - ty)], [x1, y0, tx * (1 - ty)], [x0, y1, (1 - tx) * ty], [x1, y1, tx * ty]]) {
        const i = (py * png.width + px) * 4, alpha = png.data[i + 3] / 255 * weight;
        out[0] += png.data[i] * alpha; out[1] += png.data[i + 1] * alpha; out[2] += png.data[i + 2] * alpha; out[3] += alpha;
    }
    return out;
}
/** 그림을 다른 크기로 옮긴다: 픽셀마다 그 자리가 덮는 원본을 네 군데씩(4×4) 재어 평균한다. 같은 크기면 그대로 돌려준다. */
function resizePng(png, width, height) {
    if (png.width === width && png.height === height) return png;
    const data = new Uint8Array(width * height * 4), TAPS = 4;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const sum = [0, 0, 0, 0];
        for (let ty = 0; ty < TAPS; ty++) for (let tx = 0; tx < TAPS; tx++) {
            const part = sampleAt(png, (x + (tx + 0.5) / TAPS) * png.width / width - 0.5, (y + (ty + 0.5) / TAPS) * png.height / height - 0.5);
            for (let c = 0; c < 4; c++) sum[c] += part[c];
        }
        const alpha = sum[3] / (TAPS * TAPS), i = (y * width + x) * 4;
        for (let c = 0; c < 3; c++) data[i + c] = alpha > 0 ? Math.round(sum[c] / sum[3]) : 0;
        data[i + 3] = Math.round(alpha * 255);
    }
    return { width, height, data };
}
const luminance = (png, i) => 0.299 * png.data[i] + 0.587 * png.data[i + 1] + 0.114 * png.data[i + 2];
/** 보통 그림의 불투명한 픽셀과 상태 그림의 (dx, dy) 자리의 밝기 상관(평균을 뺀 정규화 상관, 밝힌 그림도 1에 가깝다). 밖으로 나가면 -Infinity. */
function correlation(normal, state, dx, dy) {
    let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
    for (let y = 0; y < normal.height; y++) for (let x = 0; x < normal.width; x++) {
        const i = (y * normal.width + x) * 4, bx = x + dx, by = y + dy;
        if (normal.data[i + 3] < 250) continue;
        if (bx < 0 || by < 0 || bx >= state.width || by >= state.height) return -Infinity;
        const a = luminance(normal, i), b = luminance(state, (by * state.width + bx) * 4);
        n++; sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b;
    }
    return (sab - sa * sb / n) / Math.sqrt((saa - sa * sa / n) * (sbb - sb * sb / n) || 1);
}
/** 상태 그림 안에서 보통 그림의 틀이 놓인 자리(크기는 같고 둘레에 빛이 더 있다). */
function frameOffset(normal, state) {
    let best = { score: -Infinity, dx: 0, dy: 0 };
    for (let dy = -2; dy <= state.height - normal.height + 2; dy++) for (let dx = -2; dx <= state.width - normal.width + 2; dx++) {
        const score = correlation(normal, state, dx, dy);
        if (score > best.score) best = { score, dx, dy };
    }
    return best;
}
/** 상태 그림을 보통 그림의 틀에 맞춰 사방에 STATE_BLEED만큼 여백을 둔 판에 옮긴다. cut: 판 밖으로 잘린 보이는 픽셀 수. */
function placeOnBleed(normal, state) {
    const mx = Math.round(normal.width * STATE_BLEED), my = Math.round(normal.height * STATE_BLEED), at = frameOffset(normal, state);
    const width = normal.width + 2 * mx, height = normal.height + 2 * my, data = new Uint8Array(width * height * 4);
    let cut = 0;
    for (let y = 0; y < state.height; y++) for (let x = 0; x < state.width; x++) {
        const i = (y * state.width + x) * 4, tx = x - at.dx + mx, ty = y - at.dy + my;
        if (tx < 0 || ty < 0 || tx >= width || ty >= height) { cut += state.data[i + 3] > 8 ? 1 : 0; continue; }
        data.set(state.data.subarray(i, i + 4), (ty * width + tx) * 4);
    }
    return { png: { width, height, data }, cut, at };
}
/** 폴더의 올린 그림(있으면)을 <메뉴>-hover.png으로 적는다. */
function writeExtraStates(folder, menu, normal) {
    for (const [file, suffix] of Object.entries(EXTRA_STATES)) {
        const stateFile = path.join(folder, file);
        if (!fs.existsSync(stateFile)) continue;
        const source = decodePng(fs.readFileSync(stateFile)), placed = placeOnBleed(normal, cropPng(source, contentBox(source)));
        fs.writeFileSync(path.join(OUT, `${menu}-${suffix}.png`), encodePng(placed.png.width, placed.png.height, placed.png.data));
        console.log(''.padEnd(10), suffix.padEnd(6), `${placed.png.width}x${placed.png.height}`, `틀 자리 (${placed.at.dx},${placed.at.dy}) 상관 ${placed.at.score.toFixed(3)}`,
            placed.cut ? `판 밖으로 ${placed.cut}px 잘림` : '');
    }
}

function findButtonFolders(dir, found = []) {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (!fs.statSync(full).isDirectory()) continue;
        if (name.endsWith('_Icon_button') && fs.existsSync(path.join(full, name + '.png'))) found.push(full);
        else findButtonFolders(full, found);
    }
    return found;
}

const folders = process.argv.slice(2).flatMap(dir => findButtonFolders(dir));
if (!folders.length) { console.error('단추 그림 폴더(…_Icon_button)를 찾지 못했다. 받은 묶음을 푼 폴더를 준다.'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
let missing = 0;
for (const folder of folders) {
    const name = path.basename(folder), menu = MENUS[name.replace(/_Icon_button$/, '')];
    if (!menu) { console.log('모르는 단추(MENUS에 없다):', name); missing++; continue; }
    const normalSource = decodePng(fs.readFileSync(path.join(folder, name + '.png'))), normal = cropPng(normalSource, contentBox(normalSource));
    fs.writeFileSync(path.join(OUT, menu + '.png'), encodePng(normal.width, normal.height, normal.data));
    const pressedFile = path.join(folder, 'pressed.png');
    if (!fs.existsSync(pressedFile)) { console.log(menu.padEnd(10), normal.width + 'x' + normal.height, '눌린 그림이 없다'); missing++; continue; }
    const pressedSource = decodePng(fs.readFileSync(pressedFile)), pressedCrop = cropPng(pressedSource, contentBox(pressedSource));
    const pressed = resizePng(pressedCrop, normal.width, normal.height);
    fs.writeFileSync(path.join(OUT, menu + '-down.png'), encodePng(pressed.width, pressed.height, pressed.data));
    console.log(menu.padEnd(10), normal.width + 'x' + normal.height, '| 눌림', pressedCrop.width + 'x' + pressedCrop.height, pressedCrop.width === normal.width && pressedCrop.height === normal.height ? '(그대로)' : '→ 보통 크기로 맞춤');
    writeExtraStates(folder, menu, normal);
}
console.log(folders.length - missing, '개를 적었다 →', path.relative(path.join(__dirname, '..'), OUT).split(path.sep).join('/'));
process.exit(missing ? 1 : 0);
