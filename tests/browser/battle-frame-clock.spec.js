const { test, expect } = require('@playwright/test');

test('battle rendering follows display timestamps despite delayed callbacks', async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/'); await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const results = await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.settings.pauseGameOnOverlay = false; switchTab('tab-battle');
        const originalRaf = window.requestAnimationFrame;
        const nowDescriptor = Object.getOwnPropertyDescriptor(performance, 'now');
        const ctx = document.getElementById('battlefield-canvas').getContext('2d');
        const originalClear = ctx.clearRect;
        let clock = 1000, frame = 0, paints = [];
        window.requestAnimationFrame = () => 0;
        Object.defineProperty(performance, 'now', { configurable: true, value: () => clock });
        ctx.clearRect = function (...args) { paints.push(frame); return originalClear.apply(this, args); };
        const state = () => JSON.stringify([game.playerHp, game.exp, game.currentZoneId, game.runProgress, game.killsInZone]);
        const before = state();
        try {
            return [60, 120].map(hz => {
                lastBattlefieldRenderAt = 0; paints = [];
                for (frame = 0; frame < 120; frame++) {
                    const displayTime = 1000 + frame * 1000 / hz;
                    clock = displayTime + (frame % 3 === 0 ? 9 : 0);
                    gameLoop(displayTime);
                }
                return { hz, paints: [...paints], unchanged: state() === before, interval: uiDisplay.battleFrameMs };
            });
        } finally {
            ctx.clearRect = originalClear; window.requestAnimationFrame = originalRaf;
            if (nowDescriptor) Object.defineProperty(performance, 'now', nowDescriptor); else delete performance.now;
        }
    });
    for (const result of results) {
        const stride = Math.ceil((result.interval - 0.5) / (1000 / result.hz));
        expect(result.paints).toEqual(Array.from({ length: Math.ceil(120 / stride) }, (_, i) => i * stride));
        expect(result.unchanged).toBe(true);
    }
});
