#!/usr/bin/env node
/* 스킬 전체 디렉터 전달본 V3.9.1(2026-11-02)의 pixelfx 그림을 옮긴다: 전달본이 pixelfx(MIT)로 구운 다섯째 아틀라스 vfx5.png, 그 칸 표, 클립, 룬 연결(시뮬레이터/pixelfx-runes.js).
 * 대지의 함성과 불씨의 함성은 전달본의 결정대로 그대로 둔다.
 *
 *   node scripts/build-stage-skill-vfx-v39.cjs <전달본 폴더>
 *
 * 그림: assets/stage-vfx/vfx5.png. 구매 그림이 아니라 저장소에 넣는다. MIT 고지는 assets/stage-vfx/pixelfx-LICENSE.txt에 둔다.
 * 표: data/stage-skill-vfx.js에 덧붙인다(같은 일을 다시 해도 결과가 같다). scripts/build-stage-skill-vfx-v36.cjs로 표를 다시 뽑으면 이 스크립트도 뒤이어 돌린다.
 * 전달본의 코드는 실행하지 않는다: pixelfx-atlas.js는 JSON으로만 읽는다.
 */
'use strict';
const { readDataSource, writeDataSource } = require('./lib/data-authoring.cjs');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..');
const from = process.argv[2];
if (!from) { console.error('쓰는 법: node scripts/build-stage-skill-vfx-v39.cjs <전달본 폴더>'); process.exit(1); }
const sim = path.join(from, '시뮬레이터');
const atlasText = fs.readFileSync(path.join(sim, 'pixelfx-atlas.js'), 'utf8');
const ATLAS = JSON.parse(atlasText.slice(atlasText.indexOf('=') + 1).trim().replace(/;\s*$/, ''));

/** 클립: 시뮬레이터/pixelfx-runes.js의 표. dy는 기준점을 옮기는 도트, f0은 쓰는 첫 칸. */
const CLIPS = {
    pfx_lance: { loop: true },
    pfx_lance_big: { loop: true },
    pfx_fireball: { loop: true },
    pfx_hitspark: { dy: -20 },
    pfx_zaphit: {},
    pfx_snowburst: { an: 'bottom' },
    pfx_icespikes: { an: 'bottom' },
    pfx_smite: { an: 'bottom', f0: 7 },
    pfx_groundslam: { an: 'bottom' }
};
/** 룬 번호 → 연결에 덧붙이는 것. */
const GEMS = {
    7: { proj: 'pfx_lance@=' },
    11: { proj: 'pfx_lance@light', pfxImpact: 'pfx_zaphit@=' },
    9: { proj: 'pfx_lance@chaos' },
    26: { proj: 'pfx_fireball@=' },
    30: { proj: 'pfx_lance_big@=', pfxBurst: 'pfx_snowburst@=' },
    21: { wave: 'none', iceTrail: '', pfxWave: 'pfx_icespikes@=' },
    69: { bolt: '', pfxSmite: 'pfx_smite@=' },
    63: { impact: ['pfx_groundslam@='] }
};
const clipOf = (name, o) => {
    const row = ATLAS[name], f0 = o.f0 || 0;
    return { a: name, f: [f0, row.n - 1], ...(o.an ? { an: o.an } : {}), sc: 1, ms: Math.round(1000 / row.pfx.fps), pivot: [row.pfx.ax, row.pfx.ay + (o.dy || 0)], ...(row.pfx.loop ? { loop: true } : {}) };
};

const pictures = path.join(root, 'assets/stage-vfx');
fs.copyFileSync(path.join(sim, 'vfx5.png'), path.join(pictures, 'vfx5.png'));
fs.copyFileSync(path.join(sim, 'license-notices/pixelfx-MIT-LICENSE.txt'), path.join(pictures, 'pixelfx-LICENSE.txt'));

const tableFile = path.join(root, 'data/stage-skill-vfx.js');
const raw = readDataSource(tableFile), crlf = raw.includes('\r\n');
let text = raw.replace(/\r\n/g, '\n');
const box = { safeExposeData: () => {} };
vm.runInNewContext(`${text}\nthis.out = STAGE_SKILL_VFX;`, box);
const table = box.out, files = [...new Set([...table.files, 'vfx5.png'])], im = files.indexOf('vfx5.png');
const q = value => JSON.stringify(value).replace(/"([A-Za-z_$][\w$]*)":/g, '$1:').replace(/"/g, '\'');
/** 한 묶음의 끝에 줄을 더한다(전에 더한 pfx_ 줄은 뺀다). */
function appendRows(section, nextKey, rows) {
    const start = text.indexOf(`    ${section}: Object.freeze({\n`), end = text.indexOf(nextKey, start);
    if (start < 0 || end < 0) throw new Error(`표의 ${section} 묶음을 찾지 못했다`);
    const head = text.slice(0, start) + `    ${section}: Object.freeze({\n`, tail = text.slice(end);
    const keep = text.slice(start + section.length + 21, end).split('\n').filter(line => line && !line.startsWith('        pfx_') && !line.startsWith('    })'))
        .map(line => line.replace(/,$/, ''));
    text = `${head}${keep.concat(rows).join(',\n')}\n    })${nextKey === '\n});' ? '' : ','}\n${tail.replace(/^\n/, '')}`;
}
appendRows('clips', '    gems: Object.freeze({', Object.entries(CLIPS).map(([name, o]) => `        ${name}: ${q(clipOf(name, o))}`));
for (const [id, patch] of Object.entries(GEMS)) {
    const line = new RegExp(`^        '${id}': \\{.*$`, 'm');
    const merged = { ...table.gems[id], ...patch };
    if (!line.test(text)) throw new Error(`룬 ${id}의 연결을 찾지 못했다`);
    text = text.replace(line, () => `        '${id}': ${q(merged)}${line.exec(text)[0].endsWith(',') ? ',' : ''}`);
}
const atlasRows = Object.entries(ATLAS).map(([name, row]) => `        ${name}: ${q({ w: row.w, h: row.h, n: row.n, p: row.p, fx: row.fx, fb: row.fb, im })}`);
const atlasStart = text.indexOf('    atlas: Object.freeze({\n'), atlasEnd = text.lastIndexOf('\n    })\n});');
const kept = text.slice(atlasStart + 27, atlasEnd).split('\n').filter(line => !line.startsWith('        pfx_')).map(line => line.replace(/,$/, ''));
text = `${text.slice(0, atlasStart + 27)}${kept.concat(atlasRows).join(',\n')}${text.slice(atlasEnd)}`;
const hash = crypto.createHash('sha1');
for (const file of files) hash.update(fs.readFileSync(path.join(pictures, file)));
text = text.replace(/^    files: Object\.freeze\(.*$/m, `    files: Object.freeze(${q(files)}),`).replace(/^    version: '.*$/m, `    version: '${hash.digest('hex').slice(0, 10)}',`);
const NOTE = '//   pivot   클립의 기준점을 칸 안의 자리 [x, y]로 정할 때(pixelfx로 구운 클립, scripts/build-stage-skill-vfx-v39.cjs가 덧붙인다). proj 날아가는 몸, pfxImpact 맞은 자리의 섬광, pfxBurst 꿰뚫은 자리, pfxWave 바닥을 달리는 파동, pfxSmite 내리꽂힘.\n';
if (!text.includes('//   pivot ')) text = text.replace('const STAGE_SKILL_VFX = Object.freeze({', `${NOTE}const STAGE_SKILL_VFX = Object.freeze({`);
writeDataSource(tableFile, crlf ? text.replace(/\n/g, '\r\n') : text);
console.log(`그림 vfx5.png ${(fs.statSync(path.join(pictures, 'vfx5.png')).size / 1048576).toFixed(2)}MB, 칸 묶음 ${Object.keys(ATLAS).length}, 클립 ${Object.keys(CLIPS).length}, 룬 ${Object.keys(GEMS).length}`);
