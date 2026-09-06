const {test,expect}=require('@playwright/test');

test('guaranteed equipment is kept without exposing the internal guarantee',async({page},testInfo)=> {
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(()=> {
        clearInterval(gameTickHandle);gameTickHandle=null;
        const raf=window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame=callback=>callback===gameLoop ? 0 : raf(callback);
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.settings.autoEquipEmptySlots=false;game.unlocks.items=true;
        game.equipmentDropProgress=EQUIPMENT_DROUGHT_RULES.threshold-1;
        switchTab('tab-items');updateStaticUI();
    });
    await expect(page.locator('#tab-items')).not.toContainText('희귀 장비 보장');
    await expect(page.locator('[title*="드랍 보장"]')).toHaveCount(0);
    const drop=await page.evaluate(()=> {
        const random=Math.random;
        const before=game.inventory.map(item=>item.id);
        try {
            Math.random=()=>0.99;
            rollLootForEnemy({id:99999,isBoss:false,isElite:false,ele:'phys',dropMul:1});
        } finally { Math.random=random; }
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        updateStaticUI();
        const item=game.inventory.find(item=>!before.includes(item.id));
        return {name:item.name,rarity:item.rarity,progress:game.equipmentDropProgress};
    });
    expect(drop.rarity).toBe('rare');expect(drop.progress).toBe(0);
    await expect(page.locator('body')).not.toContainText('희귀 장비 보장');
    await expect(page.locator('[title*="드랍 보장"]')).toHaveCount(0);
    await expect(page.locator('#ui-inventory-list')).toContainText(drop.name);
    await page.screenshot({path:testInfo.outputPath('guaranteed-loot-inventory.png')});
    expect(errors).toEqual([]);
});
