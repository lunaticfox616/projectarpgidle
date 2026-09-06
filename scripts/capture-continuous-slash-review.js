// Same controlled battlefield, real combat hits and renderer; no composited game art.
const fs = require('fs');
const { chromium, devices } = require('@playwright/test');
process.env.PLAYWRIGHT_PORT = process.env.PLAYWRIGHT_PORT || '4210';
const startServer = require('./serve-test');

async function capture(browser, variant, mobile) {
    const context = await browser.newContext({
        ...(mobile ? devices['Pixel 5'] : { viewport: { width: 1440, height: 900 } }),
        serviceWorkers: 'block'
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    if (variant === 'before') {
        for (const name of ['canvas-slash-vfx', 'canvas-battlefield']) {
            await page.route(`**/js/${name}.js?**`, route => route.fulfill({
                contentType: 'text/javascript',
                body: fs.readFileSync(`artifacts/backups/${name}-before-concept-match.js`, 'utf8')
            }));
        }
    }
    await page.goto(`http://127.0.0.1:${process.env.PLAYWRIGHT_PORT}/`);
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const result = await page.evaluate(() => {
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
        game.settings.pauseGameOnOverlay = false;
        grantLoopStarterGemOnFirstKill();
        changeSkill('연속 베기');
        switchTab('tab-battle');
        // Pause automatic progression only for this disposable screenshot fixture.
        game.combatHalted = true;
        game.gridPlayer = { gx: 3, gy: 4, gridMoveTimer: 0 };
        const cells = [[4, 4], [6, 2], [7, 4], [5, 6]];
        Math.random = () => 0.5;
        game.enemies = cells.map(([gx, gy], index) => {
            const enemy = createEnemy(getZone(1), { at: 20, count: 4 }, index);
            return Object.assign(enemy, { gx, gy, hp: 1000, maxHp: 1000,
                spriteVariantId: 'woodPuppet-0', spawnStamp: 0, gridMoveTimer: 0 });
        });
        clearBattleVisualBacklog();
        battleVisualState.enemySmoothPos = {};
        battleVisualState.playerGridMotion = null;
        battleVisualState.playerFacingDirection = 'east';
        battleVisualState.visualNow = 1000;
        battleVisualState.lastWallNow = performance.now();
        renderBattlefield(true);
        const stats = getPlayerStats();
        performPlayerAttack(stats, { stageReplay: true, skillName: '연속 베기', forcedCrit: false,
            forcedElement: 'phys', targetEntries: [{ enemyId: game.enemies[0].id, mult: 1 }],
            damageTextGroupId: 'comparison:0' });
        renderBattlefield(true);
        const effectStart = battleVisualState.skillEffects[0].startAt;
        battleVisualState.visualNow = effectStart + 112;
        battleVisualState.lastWallNow = performance.now();
        renderBattlefield(true);
        return { image: document.getElementById('battlefield-canvas').toDataURL('image/png'),
            effects: battleVisualState.skillEffects.map(({ x, y, size, repeatIndex }) => ({ x, y, size, repeatIndex })) };
    });
    const name = `artifacts/slash-concept-${variant}-${mobile ? 'mobile' : 'desktop'}`;
    fs.writeFileSync(`${name}.png`, Buffer.from(result.image.split(',')[1], 'base64'));
    fs.writeFileSync(`${name}.json`, JSON.stringify({ effects: result.effects, errors }, null, 2));
    await context.close();
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(name);
}

(async () => {
    const stopServer = await startServer();
    const browser = await chromium.launch();
    try {
        for (const mobile of [false, true]) {
            for (const variant of ['before', 'after']) await capture(browser, variant, mobile);
        }
    } finally {
        await browser.close();
        await stopServer();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
