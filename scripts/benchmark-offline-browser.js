// Real return orchestration, including FX suppression, progress UI and persistence.
// Run separately from correctness tests: wall time depends on the machine and browser.
const fs = require('node:fs');
const { chromium } = require('playwright');
process.env.PLAYWRIGHT_PORT ||= '4201';
const maximum = process.argv.includes('--max');
const output = `artifacts/offline-settlement-browser-${maximum ? 'max' : 'base'}.json`;

async function settle(page, max) {
    return page.evaluate(async useMax => {
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
        game.settings.pauseGameOnOverlay = false;
        game.settings.mapCompleteAction = 'repeatZone';
        if (useMax) {
            game.offlineProgress.recognitionLevel = 7;
            game.offlineProgress.efficiencyLevel = 6;
        }
        const config = getOfflineProgressConfig(game);
        const absenceMs = config.recognitionHours * 3600000;
        const now = Date.now();
        recordBackgroundCombatEntry(now - absenceMs);
        const started = performance.now();
        const ok = await startBackgroundCombatReturn(now);
        return { path: 'actual startBackgroundCombatReturn', absenceMs,
            effectiveMs: config.effectiveLimitMs, wallMs: performance.now() - started, ok,
            summary: document.getElementById('background-combat-result-overlay')?.innerText };
    }, max);
}

(async () => {
    const stop = await require('./serve-test')();
    let browser, timeout;
    try {
        browser = await chromium.launch();
        const page = await browser.newPage({ serviceWorkers: 'block' });
        await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
        await page.goto(`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT}/`);
        await page.locator('#btn-startup-guest').click();
        await page.locator('[data-class-id="warrior"]').click();
        const result = await Promise.race([settle(page, maximum), new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Settlement exceeded 240 seconds')), 240000);
        })]);
        if (!result.ok || !result.summary) throw new Error('Settlement failed or omitted its result');
        fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
        console.log(result);
    } finally {
        clearTimeout(timeout);
        if (browser) await browser.close();
        await stop();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
