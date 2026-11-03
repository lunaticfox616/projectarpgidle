#!/usr/bin/env node
/* 생육함 틀(2026-11-03 사용자: 녹색 함, 보석은 마젠타): 다크 틀(assets/ui/grove/stump-gems/dark)의 기본 그림과 버튼 조각을 그대로 색만 바꿔
 * assets/ui/grove/stump-gems/green에 쓴다. 칸 자리와 버튼 자리가 같아 css/stump-box.css의 좌표를 그대로 쓴다.
 *   node scripts/build-stump-frame-nursery.cjs
 * 붉은 보석은 마젠타로, 나머지(나무와 금속, 위의 생명의 나무)는 초록으로 옮긴다. 밝기는 그대로 두어 도트의 명암이 남는다.
 */
const fs = require('node:fs'), path = require('node:path');
const { decodePng, encodePng } = require('./lib/png.cjs');
const ROOT = path.join(__dirname, '..');
const FROM = path.join(ROOT, 'assets/ui/grove/stump-gems/dark');
const TO = path.join(ROOT, 'assets/ui/grove/stump-gems/green');
const GEM_HUE = 318, BODY_HUE = 112;

function toHsv(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (!d) return [0, 0, max / 255];
    const hue = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [hue * 60, d / max, max / 255];
}
function toRgb(h, s, v) {
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
    return [r + m, g + m, b + m].map(value => Math.round(value * 255));
}
/** The ruby: a strong red, not the frame's browns. */
const isGem = (h, s) => (h < 14 || h > 335) && s > 0.42;
function recolor(r, g, b) {
    const [h, s, v] = toHsv(r, g, b);
    if (isGem(h, s)) return toRgb(GEM_HUE, Math.min(1, s * 0.95), Math.min(1, v * 1.08));
    return toRgb(BODY_HUE, Math.min(0.85, s * 0.8 + 0.18), Math.min(1, v * 1.04));
}

fs.mkdirSync(TO, { recursive: true });
for (const file of fs.readdirSync(FROM).filter(name => name.endsWith('.png'))) {
    const png = decodePng(fs.readFileSync(path.join(FROM, file)));
    for (let at = 0; at < png.data.length; at += 4) {
        if (!png.data[at + 3]) continue;
        const [r, g, b] = recolor(png.data[at], png.data[at + 1], png.data[at + 2]);
        png.data[at] = r; png.data[at + 1] = g; png.data[at + 2] = b;
    }
    fs.writeFileSync(path.join(TO, file), encodePng(png.width, png.height, png.data));
}
console.log('green frame written');
