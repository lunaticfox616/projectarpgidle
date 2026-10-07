'use strict';
// 미리 정리한 전투 그림(assets/battle-clean)을 원본에서 다시 만든다. 게임이 예전에 실행 중에 하던 것과 같은 함수
// (js/passives.js sanitizeBattleSheet, sanitizeWhiteBackdropSheet, sanitizeLocalMonsterBackdropSheet)를 브라우저에서 돌려
// 무손실 PNG로 저장한다. 적 아틀라스는 예전처럼 두 번(불러올 때와 buildEnemyTransparentImage) 정리한 것이 그려졌다.
// 원본 보스 그림은 data/bosses.js BOSS_ASSET_SOURCES. 2026-10-07 메모리 검토(정리 사본이 따로 메모리에 남았다).
// 사용: 게임을 띄운 서버 주소를 준다. node scripts/export-clean-battle-sheets.cjs http://127.0.0.1:4214/
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const url = process.argv[2] || 'http://127.0.0.1:4214/';
const OUT = path.join(__dirname, '..', 'assets', 'battle-clean');

(async () => {
    const browser = await chromium.launch();
    try {
        const page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage();
        await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
        await page.goto(url);
        await page.waitForFunction(() => typeof sanitizeBattleSheet === 'function' && typeof BOSS_ASSET_SOURCES === 'object');
        const files = await page.evaluate(async () => {
            const load = src => new Promise((resolve, reject) => {
                const image = new Image();
                image.crossOrigin = 'anonymous';
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error(src));
                image.src = src;
            });
            const enemyPass = image => sanitizeLocalMonsterBackdropSheet(sanitizeWhiteBackdropSheet(sanitizeBattleSheet(image)));
            const jobs = [
                ...Object.entries(BOSS_ASSET_SOURCES).map(([key, src]) => ({ src, out: BOSS_ASSET_MANIFEST[key], clean: sanitizeBattleSheet })),
                { src: 'assets/summon/summon1.png', out: 'assets/battle-clean/summon1.png', clean: sanitizeBattleSheet },
                { src: 'assets/battle-enemies-v1.png', out: 'assets/battle-clean/battle-enemies-v1.png', clean: image => enemyPass(enemyPass(image)) }
            ];
            const rows = [];
            for (const job of jobs) rows.push({ out: job.out, data: job.clean(await load(job.src)).toDataURL('image/png') });
            return rows;
        });
        fs.mkdirSync(OUT, { recursive: true });
        for (const file of files) {
            const target = path.join(__dirname, '..', file.out);
            fs.writeFileSync(target, Buffer.from(file.data.split(',')[1], 'base64'));
            console.log(file.out, `${Math.round(fs.statSync(target).size / 1024)}KB`);
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
