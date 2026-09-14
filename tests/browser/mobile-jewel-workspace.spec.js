const {test,expect}=require('@playwright/test');
test('jewel workspaces keep equipment and crafting targets connected',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=20;contentProgression.sync();
        game.contentProgression.inherited.push('jewel');contentProgression.sync();
        game.jewelInventory=[{id:9001,name:'검증 주얼',rarity:'normal',stats:[]}];game.jewelSlots=[null,null];
        announceMapPrimaryContentUnlocks();openTabPane('tab-jewel');updateStaticUI();
    });
    // This returning-player fixture has already read map notices unlocked by its forced loop.
    await page.evaluate(()=>game.seenTutorials.push(...MAP_PRIMARY_CONTENTS.map(row=>row.noticeKey).filter(Boolean)));
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    const navigation=page.getByRole('tablist',{name:'주얼 작업'});
    const library=page.locator('#ui-jewel-library');
    if(info.project.use.isMobile){
        await expect(navigation).toBeVisible();await expect(page.locator('#ui-jewel-core-craft')).toBeHidden();
        await navigation.getByRole('tab',{name:'해체 관리'}).click();await expect(library).toBeHidden();
        await expect(page.locator('#btn-jewel-auto-salvage')).toBeVisible();
        await page.keyboard.press('Home');await expect(library).toBeVisible();
        expect(await library.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
    }else await expect(navigation).toBeHidden();
    await page.locator('.jewel-inventory-card').getByRole('button',{name:'슬롯1',exact:true}).click();
    await expect.poll(()=>page.evaluate(()=>game.jewelSlots[0]?.id)).toBe(9001);
    await expect(page.locator('.jewel-inventory-card')).toHaveCount(0);
    await page.locator('#jewel-slot-card-0').getByRole('button',{name:'제작대상'}).click();
    await expect(page.locator('#ui-jewel-core-craft')).toContainText('검증 주얼');
    if(info.project.use.isMobile){
        await expect(library).toBeHidden();
        await navigation.getByRole('tab',{name:'장착 · 보관'}).click();
    }
    await page.locator('#jewel-slot-card-0').getByRole('button',{name:'해제',exact:true}).click();
    await expect(page.locator('.jewel-inventory-card')).toHaveCount(1);
    await page.locator('.jewel-inventory-card').getByRole('button',{name:'제작대상',exact:true}).click();
    await expect(page.locator('#ui-jewel-core-craft')).toContainText('검증 주얼');
    expect(await page.evaluate(()=>game.jewelInventory.map(j=>j.id))).toEqual([9001]);
    if(info.project.use.isMobile){
        await expect(library).toBeHidden();
    }else{
        await page.setViewportSize({width:412,height:915});
        await navigation.getByRole('tab',{name:'제작 · 증폭'}).click();
        await expect(library).toBeHidden();
        await page.setViewportSize({width:1440,height:900});await expect(library).toBeVisible();
        await expect(navigation).toBeHidden();
    }
    expect(errors).toEqual([]);
});
