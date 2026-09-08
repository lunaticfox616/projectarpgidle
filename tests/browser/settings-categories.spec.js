const {test,expect}=require('@playwright/test');

test('mobile settings categories preserve controls while desktop keeps all groups',async({page},info)=>{
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        switchTab('tab-settings');
    });
    const category=page.locator('#settings-category');
    await expect(page.locator('#ui-tab-order-settings > *')).toHaveCount(0);
    await page.screenshot({path:info.outputPath('settings-initial.png'),scale:'css'});
    if(!info.project.use.isMobile){
        await expect(category).toBeHidden();
        await expect(page.locator('#chk-camera-shake')).toBeVisible();
        await expect(page.locator('#sel-theme-mode')).toBeVisible();
        return;
    }
    await expect(category).toBeVisible();
    await expect(page.locator('#sel-theme-mode')).toBeVisible();
    await expect(page.locator('#chk-camera-shake')).toBeHidden();
    await expect(page.locator('#sel-loop-map-complete-action')).toBeHidden();
    await category.selectOption('battle');
    await page.locator('#chk-camera-shake').uncheck();
    await category.selectOption('notifications');
    await page.locator('#sel-chat-message-size').selectOption('large');
    await expect(page.locator('body')).toHaveAttribute('data-chat-message-size','large');
    await category.selectOption('progress');
    await expect(page.locator('#chk-auto-equip-empty')).toBeVisible();
    await category.selectOption('layout');
    await expect(page.locator('.cfg-disclosure--tab-order')).toBeVisible();
    await page.locator('.cfg-disclosure--tab-order > summary').click();
    await expect(page.locator('#ui-tab-order-settings [data-place]').first()).toBeVisible();
    await category.selectOption('data');
    await page.evaluate(()=>{
        window.hiddenLayoutChanges=0;
        new MutationObserver(rows=>hiddenLayoutChanges+=rows.length).observe(document.getElementById('ui-tab-order-settings'),{childList:true,subtree:true});
        game.settings.tabLayouts.mobile.tabPlacement['btn-tab-items']='bottom';
        for(let i=0;i<10;i++)renderTabOrderSettings();
    });
    expect(await page.evaluate(()=>hiddenLayoutChanges)).toBe(0);
    await expect(page.locator('.settings-cloud-disclosure')).toBeVisible();
    await category.selectOption('layout');
    await expect(page.locator('[data-place="btn-tab-items"]')).toHaveValue('bottom');
    await category.selectOption('display');
    await expect(page.locator('#sel-chat-message-size')).toHaveValue('large');
    await category.selectOption('battle');
    await expect(page.locator('#chk-camera-shake')).not.toBeChecked();
    await page.setViewportSize({width:1440,height:900});
    await page.evaluate(()=>switchTab('tab-settings'));
    await expect(category).toBeHidden();
    await expect(page.locator('#sel-theme-mode')).toBeVisible();
    await page.setViewportSize({width:393,height:851});
    await expect(category).toHaveValue('battle');
    await expect(page.locator('#sel-theme-mode')).toBeHidden();
});
