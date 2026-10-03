#!/usr/bin/env node
/* Hana 스킬 이펙트 리메이크(인계 패키지)를 게임 데이터로 가져온다.
 *
 *   node scripts/import-hana-skill-fx.cjs <인계 폴더>
 *
 * <인계 폴더> = `리그닌_캐릭터_스킬_인계_*` 압축을 푼 폴더(변경분을 덮어쓴 상태 그대로).
 * - 리메이크 팔레트 82색과 OKLab 최근접 색표(32768칸, 인계 effect_remake_pass.js와 같은 식)
 * - 새로 그린 투사체 7종의 문자 도안(remake_proj.json)
 *   → data/hana-skill-fx.js
 * - 새로 그린 이펙트 원본(void_fx.js)과 시뮬레이터 연결 코드(ui_player.js)를 비교 기준으로 보관
 *   → docs/skill-assets-hana/reference/*.js.txt  (게임이 불러오는 스크립트가 아님)
 *   js/canvas-redrawn-skill-art.js는 이 기준과 도트 단위로 같게 그리는지 smoke-redrawn-skill-art.js가 확인한다.
 * 인계 빌드 스크립트(.bat/.py)는 실행하지 않는다.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
function fail(message) { console.error(message); process.exit(1); }
function find(base, relative) {
    const direct = path.join(base, relative);
    if (fs.existsSync(direct)) return direct;
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const nested = path.join(base, entry.name, relative);
        if (fs.existsSync(nested)) return nested;
    }
    return null;
}

// The same OKLab conversion and hue weighting as the handoff's effect_remake_pass.js.
function oklab(r, g, b) {
    const f = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
    r = f(r); g = f(g); b = f(b);
    const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
    const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
    const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
    return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
        .0259040371 * l + .7827717662 * m - .808675766 * s];
}
function buildLut(palette) {
    const lab = palette.map(hex => oklab(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)));
    const lut = new Uint8Array(32768);
    for (let i = 0; i < 32768; i++) {
        const q = oklab(((i >> 10) & 31) * 8.23, ((i >> 5) & 31) * 8.23, (i & 31) * 8.23);
        let best = 0, bestDistance = 1e9;
        for (let k = 0; k < lab.length; k++) {
            const p = lab[k], dl = q[0] - p[0], da = q[1] - p[1], db = q[2] - p[2];
            const distance = dl * dl + 1.6 * (da * da + db * db);
            if (distance < bestDistance) { bestDistance = distance; best = k; }
        }
        lut[i] = best;
    }
    return lut;
}

const input = process.argv[2];
if (!input) fail('사용법: node scripts/import-hana-skill-fx.cjs <인계 폴더>');
const base = path.resolve(input);
const paletteFile = find(base, '3_결과물/Hana_이펙트/이펙트_리메이크/remake_palette.json');
const projFile = find(base, '2_스킬_시뮬레이터/src/remake_proj.json');
const voidFile = find(base, '2_스킬_시뮬레이터/src/void_fx.js');
const playerFile = find(base, '2_스킬_시뮬레이터/src/ui_player.js');
if (!paletteFile || !projFile || !voidFile || !playerFile) fail(`인계 파일을 찾지 못했습니다: ${base}`);

const palette = JSON.parse(fs.readFileSync(paletteFile, 'utf8'));
if (!Array.isArray(palette) || palette.length < 16 || !palette.every(hex => /^#[0-9a-f]{6}$/i.test(hex))) fail('팔레트 형식이 다릅니다');
const lut = buildLut(palette);
const projectiles = {};
for (const [key, sprite] of Object.entries(JSON.parse(fs.readFileSync(projFile, 'utf8')))) {
    if (!sprite.rows.every(row => row.length === sprite.w) || sprite.rows.length !== sprite.h) fail(`${key}: 도안 크기가 규격과 다릅니다`);
    projectiles[key] = { name: sprite.name, element: sprite.ele, ids: sprite.ids, rows: sprite.rows, pal: sprite.pal };
}

const referenceDir = path.join(root, 'docs/skill-assets-hana/reference');
fs.mkdirSync(referenceDir, { recursive: true });
const hashes = {};
for (const [file, name] of [[voidFile, 'void_fx.js.txt'], [playerFile, 'ui_player.js.txt']]) {
    const bytes = fs.readFileSync(file);
    fs.writeFileSync(path.join(referenceDir, name), bytes);
    hashes[name] = crypto.createHash('sha256').update(bytes).digest('hex');
}
fs.writeFileSync(path.join(referenceDir, 'manifest.json'), JSON.stringify({ source: path.basename(base), sha256: hashes }, null, 2) + '\n');

const data = { source: path.basename(base), palette, lut: Buffer.from(lut).toString('base64'), projectiles };
const text = `// 자동 생성: node scripts/import-hana-skill-fx.cjs <인계 폴더>. 직접 고치지 말고 인계 소스를 고친 뒤 다시 가져온다.
// Hana 이펙트 리메이크: 팔레트 ${palette.length}색, OKLab 최근접 색표(5비트 RGB 32768칸, base64), 새로 그린 투사체 문자 도안.
const HANA_SKILL_FX = Object.freeze(${JSON.stringify(data, null, 1).replace(/\[\s+("[^"\n]*"(?:,\s+"[^"\n]*")*)\s+\]/g, (_, body) => `[${body.replace(/,\s+/g, ',')}]`)});
safeExposeData({ HANA_SKILL_FX });
`;
fs.writeFileSync(path.join(root, 'data/hana-skill-fx.js'), text);
console.log(`팔레트 ${palette.length}색 · 투사체 ${Object.keys(projectiles).length}종 → data/hana-skill-fx.js, 비교 기준 → docs/skill-assets-hana/reference`);
