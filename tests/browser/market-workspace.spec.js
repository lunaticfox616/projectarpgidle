const { test, expect } = require('@playwright/test');

for (const theme of ['dark','light']) test('market purchase workspace in ' + theme, async ({page},testInfo) => {
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(theme=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        game.season=2;game.level=30;game.maxZoneId=5;
        game.settings.autoEquipEmptySlots=false;
        contentProgression.sync();applyThemeMode(theme);
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
    },theme);
    expect(await page.evaluate(()=>[contentProgression.canOpen('item-tab-market'),contentProgression.canOpen('item-tab-hall')])).toEqual([false,false]);
    await page.evaluate(()=>{
        contentProgression.purchase('craft');
        game.currencies.magicBud=80;game.currencies.formlessDew=200;game.currencies.goldenRule=10;game.currencies.sapBud=30;
        switchTab('tab-items');switchItemSubtab('item-tab-market');updateStaticUI();
    });
    await page.waitForFunction(()=>{
        if(uiRefreshRunning || uiRefreshQueued)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
    await expect(page.locator('#btn-item-tab-hall')).toBeVisible();
    expect(await page.evaluate(()=>contentProgression.balance())).toBe(1);
    if(testInfo.project.use.isMobile){
        await page.getByRole('combobox',{name:'받을 재화',exact:true}).selectOption('goldenRule');
        await expect(page.locator('.market-selected-currency')).toContainText('황금률');
        await expect(page.locator('[data-market-owned="goldenRule"]')).toHaveText('10');
    }else{
        await page.locator('[data-market-to="goldenRule"]').click();
        expect(await page.locator('[data-market-to="goldenRule"]').evaluate(el=>getComputedStyle(el).borderColor))
            .not.toBe(await page.locator('[data-market-to="sapBud"]').evaluate(el=>getComputedStyle(el).borderColor));
    }
    await expect(page.locator('#ui-market-exchange-from option')).toHaveCount(2);
    await page.locator('#ui-market-exchange-from').selectOption('m5');
    const quantity=page.locator('#ui-market-quantity');
    await quantity.fill('2');
    await page.evaluate(()=>renderMarketUI());
    await expect(quantity).toBeFocused();
    await expect(quantity).toHaveValue('2');
    await expect(page.locator('#ui-market-quote')).toContainText('수액 봉오리 20개');
    await page.locator('[data-market-exchange-once]').click();
    await expect(page.locator('#game-dialog-message')).toContainText('수액 봉오리 10개');
    await page.locator('#game-dialog-cancel').click();
    expect(await page.evaluate(()=>game.currencies.sapBud)).toBe(30);
    await page.locator('[data-market-exchange-once]').click();
    await page.locator('#game-dialog-confirm').click();
    await expect.poll(()=>page.evaluate(()=>game.currencies.goldenRule)).toBe(12);
    expect(await page.evaluate(()=>game.currencies.sapBud)).toBe(20);
    await page.locator('[data-market-max]').click();
    await expect(quantity).toHaveValue('4');
    await quantity.fill('5');
    await expect(page.locator('[data-market-exchange-once]')).toBeDisabled();
    await quantity.fill('1');
    await screenshot(page,testInfo,'exchange');

    await page.locator('[data-market-section="services"]').click();
    await expect(page.locator('#ui-market-service-jewel-inv')).toBeHidden();
    await expect(page.locator('#ui-market-service-growth-inv')).toBeHidden();
    await page.evaluate(()=>{
        game.inventory=[createItemFromBase(BASE_ITEM_DB.find(row=>row.id==='war_helm'),'rare',10)];
        game.inventory[0].stats=[{id:'flatHp',val:10},{id:'armor',val:5,lockedByHoney:true}];
        marketUi.renderServices();
    });
    await page.locator('[data-market-target]').selectOption(await page.evaluate(()=>'inventory:'+game.inventory[0].id));
    await expect(page.locator('#sel-market-annul-stat option')).toHaveCount(1);
    await page.locator('#ui-market-service-annul button').click();
    await page.locator('#game-dialog-confirm').click();
    await expect.poll(()=>page.evaluate(()=>game.inventory[0].stats.length)).toBe(1);
    expect(await page.evaluate(()=>game.inventory[0].stats[0].lockedByHoney)).toBe(true);
    await page.evaluate(()=>{
        game.season=100;renderMarketUI();
    });
    await expect(page.locator('#ui-market-service-jewel-inv')).toBeHidden();
    await page.evaluate(()=>{
        game.contentProgression.inherited.push('jewel','growth');contentProgression.sync();renderMarketUI();
    });
    await expect(page.locator('#ui-market-service-jewel-inv')).toContainText('영구 유지');
    await screenshot(page,testInfo,'services');
    await page.locator('[data-market-section="black"]').click();
    await expect(page.locator('.market-black-offer')).toHaveCount(6);
    await page.locator('.market-black-actions button[aria-pressed]').first().click();
    await expect(page.locator('.market-black-actions button[aria-pressed]').first()).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#market-black-status')).toContainText('잠금 1/3');
    await expect(page.locator('#market-black-insight')).not.toBeEmpty();
    await page.locator('[data-market-section="black"]').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#market-panel-services')).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#market-panel-black')).toBeVisible();
    await screenshot(page,testInfo,'black-market');
    const broken=await page.locator('#item-tab-market img').evaluateAll(images=>images.filter(image=>!image.complete || image.naturalWidth===0).map(image=>image.src));
    expect(broken).toEqual([]);
    expect(errors).toEqual([]);
});

async function screenshot(page,testInfo,name) {
    await page.waitForFunction(()=>{
        if(uiRefreshRunning || uiRefreshQueued)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
    await expect(page.locator('#game-toast-region .game-toast')).toHaveCount(0);
    await expect(page.locator('#mobile-toast-root > div')).toHaveCount(0);
    const panel=page.locator('#item-tab-market');
    expect(await panel.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:testInfo.outputPath(name+'.png'),animations:'disabled'});
}
