#!/usr/bin/env node
/* 이미지 생성으로 받아 온 무대 그림(몬스터, 물체, 소품)을 깨끗한 도트로 정리한다(docs/stage-view-20261011.md).
 * 받아 온 그림은 큰 그림을 줄인 것이라 도트마다 색이 다르고 가장자리가 반투명하다. 캐릭터 그림처럼 만들려고:
 *   - 반투명을 없앤다(절반 넘게 찬 도트만 남긴다).
 *   - 색을 몇 단계로 줄인다. 색은 색의 폭으로 나눠 고르므로(도트 수로 고르지 않는다) 버섯의 흰 줄기 같은 드문 색이 남는다.
 *   - 이웃에 같은 색이 없는 외톨이 도트는 가장 가까운 이웃 색을 입는다(--accents: 이웃과 뚜렷이 다른 도트는 눈이나 반짝임이라 둔다).
 *   - 바깥과 맞닿은 도트를 어두운 테로 바꾼다(--no-rim 으로 끈다).
 *
 *   node scripts/tidy-stage-art.cjs <그림.png 또는 폴더> <내보낼 폴더> [--colours 24] [--no-rim] [--accents]
 *
 * 원본은 건드리지 않는다. 색 수를 주지 않으면 그림 크기에 따라 16~32색을 쓴다. RGBA 8비트 PNG만 읽는다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');

const WEIGHT = [0.9, 1.2, 0.7];   // 눈이 초록에 민감한 만큼 색 거리를 달리 잰다
const distance = (a, b) => WEIGHT[0] * (a[0] - b[0]) ** 2 + WEIGHT[1] * (a[1] - b[1]) ** 2 + WEIGHT[2] * (a[2] - b[2]) ** 2;
function nearest(palette, colour) {
    let best = 0, least = Infinity;
    for (let i = 0; i < palette.length; i++) { const d = distance(palette[i], colour); if (d < least) { least = d; best = i; } }
    return best;
}
/** Boxes of colours split at the middle of their widest channel until there are `count`; each box gives its mean. */
function spanCut(colours, count) {
    const boxes = [colours];
    while (boxes.length < count) {
        let pick = -1, widest = 0, axis = 0;
        boxes.forEach((box, i) => {
            if (box.length < 2) return;
            for (let c = 0; c < 3; c++) {
                let lo = 255, hi = 0;
                for (const colour of box) { lo = Math.min(lo, colour[c]); hi = Math.max(hi, colour[c]); }
                if ((hi - lo) * WEIGHT[c] > widest) { widest = (hi - lo) * WEIGHT[c]; pick = i; axis = c; }
            }
        });
        if (pick < 0) break;
        const box = boxes[pick].sort((a, b) => a[axis] - b[axis]), middle = (box[0][axis] + box[box.length - 1][axis]) / 2;
        let cut = box.findIndex(colour => colour[axis] > middle);
        if (cut <= 0) cut = box.length >> 1;
        boxes.splice(pick, 1, box.slice(0, cut), box.slice(cut));
    }
    return boxes.map(box => [0, 1, 2].map(c => box.reduce((sum, colour) => sum + colour[c], 0) / box.length));
}
/** A few rounds of moving each palette colour to the mean of the dots that chose it. */
function settle(palette, colours, rounds) {
    for (let round = 0; round < rounds; round++) {
        const sums = palette.map(() => [0, 0, 0, 0]);
        for (const colour of colours) { const s = sums[nearest(palette, colour)]; s[0] += colour[0]; s[1] += colour[1]; s[2] += colour[2]; s[3]++; }
        palette = palette.map((entry, i) => (sums[i][3] ? [sums[i][0] / sums[i][3], sums[i][1] / sums[i][3], sums[i][2] / sums[i][3]] : entry));
    }
    return palette.map(entry => entry.map(Math.round));
}
/** @returns {{width:number, height:number, data:Uint8Array, colours:number}} the tidied picture */
function tidy(png, options = {}) {
    const { width: w, height: h } = png, on = new Uint8Array(w * h), index = new Int16Array(w * h).fill(-1), list = [];
    const at = i => [png.data[i * 4], png.data[i * 4 + 1], png.data[i * 4 + 2]];
    for (let i = 0; i < w * h; i++) if (png.data[i * 4 + 3] >= 128) { on[i] = 1; list.push(at(i)); }
    const count = options.colours || Math.max(16, Math.min(32, Math.round(12 + Math.sqrt(w * h) / 10)));
    const palette = settle(spanCut(list, count), list, 3);
    for (let i = 0; i < w * h; i++) if (on[i]) index[i] = nearest(palette, at(i));
    const next = index.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const here = y * w + x, around = [];
        if (!on[here]) continue;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h && on[ny * w + nx]) around.push(index[ny * w + nx]);
        }
        if (around.includes(index[here]) || around.length < 5) continue;
        const pick = around.reduce((best, value) => (distance(palette[value], palette[index[here]]) < distance(palette[best], palette[index[here]]) ? value : best), around[0]);
        // accents: 이웃과 뚜렷이 다른 외톨이 도트(눈, 반짝임)는 그대로 둔다
        if (options.accents && palette[pick].some((value, channel) => Math.abs(value - palette[index[here]][channel]) > 28)) continue;
        next[here] = pick;
    }
    const out = new Uint8Array(w * h * 4), darkest = palette.reduce((a, b) => (a[0] + a[1] + a[2] < b[0] + b[1] + b[2] ? a : b)), rim = darkest.map(value => Math.round(value * 0.55));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const here = y * w + x;
        if (!on[here]) continue;
        const edge = options.rim !== false && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx < 0 || ny < 0 || nx >= w || ny >= h || !on[ny * w + nx]; });
        out.set([...(edge ? rim : palette[next[here]]), 255], here * 4);
    }
    return { width: w, height: h, data: out, colours: new Set(next.filter(value => value >= 0)).size };
}

function main() {
    const args = process.argv.slice(2), flag = name => args.includes(name), value = name => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : 0);
    const [input, outDir] = args.filter((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--colours');
    if (!input || !outDir) { console.error('쓰는 법: node scripts/tidy-stage-art.cjs <그림.png 또는 폴더> <내보낼 폴더> [--colours 24] [--no-rim]'); process.exit(1); }
    const files = fs.statSync(input).isDirectory() ? fs.readdirSync(input).filter(name => name.toLowerCase().endsWith('.png')).map(name => path.join(input, name)) : [input];
    fs.mkdirSync(outDir, { recursive: true });
    for (const file of files) {
        const tidied = tidy(decodePng(fs.readFileSync(file)), { colours: value('--colours'), rim: !flag('--no-rim'), accents: flag('--accents') });
        fs.writeFileSync(path.join(outDir, path.basename(file)), encodePng(tidied.width, tidied.height, tidied.data));
        console.log(`${path.basename(file)}: ${tidied.width}x${tidied.height}, ${tidied.colours}색`);
    }
}
if (require.main === module) main();
module.exports = { tidy };
