const {test,expect}=require('@playwright/test');

test('treasure shows the minimum boss tier and preserves it when the player postpones',async({page},testInfo)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.season=2;contentProgression.sync();game.currentZoneId=8;
        game.bountyHunt=bountyRuntime.restore(null);
        for(let kill=0;kill<9;kill++) bountyRuntime.advanceAfterBossKill(getZone(kill===3?0:8),{isBoss:true});
        switchTab('tab-battle');updateStaticUI();bountyUi.renderHud();
    });
    await expect(page.locator('#ui-bounty-box')).toContainText('1 · 기준 T1');
    await page.evaluate(()=>{
        bountyRuntime.advanceAfterBossKill(getZone(8),{isBoss:true});
        bountyUi.renderHud();
    });
    const offer=page.locator('#ui-bounty-box button');
    await expect(offer).toContainText('보물사냥 · 기준 T1');
    await offer.click();
    await expect(page.locator('.game-dialog-message')).toContainText('10마리 중 최저 보스 T1 기준 · 일반 재료 ×1');
    await page.screenshot({path:testInfo.outputPath('bounty-minimum-tier.png')});
    await page.getByRole('button',{name:'나중에',exact:true}).click();
    await expect(page.locator('.game-dialog-card')).toBeHidden();
    await page.evaluate(()=>{
        game.currentZoneId=4;game=mergeDefaults(JSON.parse(JSON.stringify(game)));
        bountyUi.renderHud();
    });
    await offer.click();
    await expect(page.locator('.game-dialog-message')).toContainText('최저 보스 T1 기준');
    expect(errors).toEqual([]);
});
