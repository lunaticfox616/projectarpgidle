const {test, expect} = require('@playwright/test');

test('equipping the first gem exposes a build change', async ({page},testInfo) => {
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    await page.waitForFunction(()=>!uiRefreshQueued && !uiRefreshRunning);
    await page.evaluate(()=>{
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.unlocks.skills=true;grantLoopStarterGemOnFirstKill();
        updateBuildFeedback(getPlayerStats());
        changeSkill(game.starterGemTutorialPending);
    });
    await expect(page.locator('#game-toast-region .game-toast-dps-up')).toContainText(/▲ [\d,.]+ DPS/);
    await expect(page.locator('#game-toast-region')).not.toContainText('빌드 변경');
    await page.screenshot({path:testInfo.outputPath('first-build-feedback.png')});
    expect(await page.evaluate(()=>game.starterGemTutorialPending)).toBeFalsy();
});

