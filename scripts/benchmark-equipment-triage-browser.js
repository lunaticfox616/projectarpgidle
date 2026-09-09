'use strict';
// Isolated synthetic save in desktop Chromium; includes real timers and toolbar updates.
const fs = require('node:fs');
const {chromium} = require('@playwright/test');
const configureEndgame = require('./lib/offline-endgame-fixture');
async function main() {
    const stop = await require('./serve-test')();
    let browser;
    try {
        browser = await chromium.launch();
        const page = await browser.newPage({viewport:{width:1440,height:900},serviceWorkers:'block'});
        await page.route('https://**', route => route.fulfill({status:204,body:''}));
        await page.goto('http://127.0.0.1:4173/');
        await page.locator('#btn-startup-guest').click();
        await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
        await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
        await page.evaluate(() => {
            clearInterval(gameTickHandle); gameTickHandle = null;
            tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
            Math.random = createSeededRng(17);
        });
        await page.evaluate(configureEndgame);
        await page.evaluate(() => {
            game.settings.autoEquipEmptySlots = false;
            const gear = Object.values(game.equipment).filter(Boolean);
            game.inventory = Array.from({length:120}, (_, i) => {
                const item = JSON.parse(JSON.stringify(gear[i % gear.length]));
                item.id = 90000+i; return item;
            });
            switchTab('tab-items'); updateStaticUI();
        });
        await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
        const samples = [];
        for (let round = 0; round < 5; round++) samples.push(await page.evaluate(() => new Promise((resolve, reject) => {
            const host = document.getElementById('ui-equipment-triage');
            const start = performance.now();
            const timeout = setTimeout(() => { observer.disconnect(); reject(new Error(host.textContent)); }, 15000);
            const observer = new MutationObserver(() => {
                if (!host.textContent.includes('120개 완료')) return;
                observer.disconnect(); clearTimeout(timeout); resolve(performance.now()-start);
            });
            observer.observe(host, {childList:true,subtree:true});
            equipmentTriage.start();
        })));
        const report = {scenario:'Synthetic full build, 120 items; desktop Chromium, not a phone measurement',
            samplesMs:samples, medianMs:[...samples].sort((a,b) => a-b)[2]};
        fs.mkdirSync('artifacts/player-stats', {recursive:true});
        fs.writeFileSync('artifacts/player-stats/equipment-triage-browser.json', JSON.stringify(report,null,2)+'\n');
        console.log(JSON.stringify(report,null,2));
    } finally {
        if (browser) await browser.close();
        await stop();
    }
}
main().catch(error => {console.error(error); process.exitCode = 1;});
