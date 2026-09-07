// Real return orchestration, including FX suppression, progress UI and persistence.
// Run separately from correctness tests: wall time depends on the machine and browser.
const fs = require('node:fs');
const { chromium } = require('playwright');
process.env.PLAYWRIGHT_PORT ||= '4201';
const maximum = process.argv.includes('--max');
const endgame = process.argv.includes('--endgame');
const baseline = process.argv.includes('--baseline');
const output = `artifacts/offline-settlement-browser-${maximum ? 'max' : 'base'}${endgame ? '-endgame' : ''}${baseline ? '-before' : ''}.json`;

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
        if (baseline) {
            for (const file of ['js/combat.js', 'js/combat-replay.js', 'js/growth-effects.js', 'js/equipment-stat-resolution.js', 'js/skills.js']) {
                const body = require('node:child_process').execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
                await page.route(`**/${file}?*`, route => route.fulfill({ status: 200, contentType: 'text/javascript', body }));
            }
        }
        await page.goto(`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT}/`);
        await page.evaluate(() => { let seed = 17; Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 0x100000000); });
        await page.locator('#btn-startup-guest').click();
        await page.locator('[data-class-id="warrior"]').click();
        await page.evaluate(() => { clearInterval(gameTickHandle); gameTickHandle = null; });
        const scenario = endgame ? await page.evaluate(require('./lib/offline-endgame-fixture')) : { name: 'starter' };
        console.log({ scenario, baseline, maximum });
        const profiler = process.argv.includes('--profile') ? await page.context().newCDPSession(page) : null;
        if (profiler) { await profiler.send('Profiler.enable'); await profiler.send('Profiler.start'); }
        const result = await Promise.race([settle(page, maximum), new Promise((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Settlement exceeded 15 minutes')), 900000);
        })]);
        if (!result.ok || !result.summary) throw new Error('Settlement failed or omitted its result');
        if (profiler) {
            const { profile } = await profiler.send('Profiler.stop');
            fs.writeFileSync(output + '.cpuprofile', JSON.stringify(profile));
        }
        fs.writeFileSync(output, JSON.stringify({ scenario, ...result }, null, 2) + '\n');
        console.log(result);
    } finally {
        clearTimeout(timeout);
        if (browser) await browser.close();
        await stop();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
