const {test, expect} = require('@playwright/test');

test('offline settlement commits once and leads to equipment review', async ({page}) => {
    await page.route('https://**', route => route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await expect(page.locator('#loop-hero-select-overlay')).toBeVisible();
    await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    const paused=await page.evaluate(() => {
        tutorialQueue.length=0;
        if(activeTutorial)dismissTutorial(false);
        game.settings.pauseGameOnOverlay=false;
        game.settings.showDeathNotice=false;
        game.unlocks.items=true;
        const now=Date.now();
        recordBackgroundCombatEntry(now-60000);
        window.settlementOriginal=game;
        window.settlementWriteCount=0;
        const originalSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(key,value){
            if(key===LOCAL_SAVE_KEY)window.settlementWriteCount++;
            return originalSet.call(this,key,value);
        };
        window.settlementPromise=startBackgroundCombatReturn(now);
        // Observe the pending async boundary in the same browser task. A fast replay may
        // finish before a later locator command reaches the page.
        const before=localStorage.getItem(LOCAL_SAVE_KEY);
        window.dispatchEvent(new Event('pagehide'));
        return {unchanged:localStorage.getItem(LOCAL_SAVE_KEY)===before,original:game===window.settlementOriginal};
    });
    expect(paused).toEqual({unchanged:true,original:true});
    expect(await page.evaluate(() => window.settlementPromise)).toBe(true);
    await expect(page.locator('#background-combat-result-overlay')).toContainText('전투 진행');
    expect(await page.evaluate(() => window.settlementWriteCount)).toBe(1);
    await page.getByRole('button',{name:'장비 확인',exact:true}).click();
    await expect(page.locator('#tab-items')).toBeVisible();
    const saved=await page.evaluate(() => JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY)));
    expect(saved.isBackgroundCalculation).toBeUndefined();
    expect(saved.saveMeta.lastModifiedAt).toBeGreaterThan(Date.now()-15000);
});

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

test('failed settlement freezes progress and retries after storage recovers',async({page})=>{
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    await page.waitForFunction(()=>!uiRefreshQueued && !uiRefreshRunning);
    await page.evaluate(()=>{
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.settings.pauseGameOnOverlay=false;
        recordBackgroundCombatEntry(Date.now()-60000);
        window.beforeFailedSave=localStorage.getItem(LOCAL_SAVE_KEY);
        window.originalStorageSet=Storage.prototype.setItem;
        Storage.prototype.setItem=function(){throw new DOMException('disk full','QuotaExceededError');};
        window.settlementPromise=startBackgroundCombatReturn(Date.now());
    });
    expect(await page.evaluate(()=>window.settlementPromise)).toBe(false);
    await expect(page.getByRole('button',{name:'다시 계산',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>{
        const before=game.combatTimeMs;
        runForegroundCombat(performance.now()+1000);
        window.dispatchEvent(new Event('pagehide'));
        return backgroundCombatRuntime.failed && game.combatTimeMs===before
            && localStorage.getItem(LOCAL_SAVE_KEY)===window.beforeFailedSave;
    })).toBe(true);
    await page.evaluate(()=>{Storage.prototype.setItem=window.originalStorageSet;});
    await page.getByRole('button',{name:'다시 계산',exact:true}).click();
    await expect(page.locator('#background-combat-result-overlay')).toBeVisible();
    expect(await page.evaluate(()=>getLocalSaveStatus().writable && !backgroundCombatRuntime.failed)).toBe(true);
});
