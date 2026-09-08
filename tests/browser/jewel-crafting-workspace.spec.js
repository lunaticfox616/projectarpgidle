const {test,expect}=require('@playwright/test');
test('jewel crafting explains currency and retains amplified choice during refresh',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=20;contentProgression.sync();
        game.contentProgression.inherited.push('jewel');contentProgression.sync();
        game.jewelInventory=[{id:901,name:'제작 검증',rarity:'normal',stats:[]}];game.jewelSlots=[null,null];
        game.currencies.magicBud=2;game.currencies.jewelShard=50;
        openTabPane('tab-jewel');updateStaticUI();
    });
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    const mode=page.locator('#jewel-craft-mode');
    if(info.project.use.isMobile){
        await page.getByRole('tab',{name:'제작 · 증폭',exact:true}).click();
        await page.getByRole('button',{name:'주얼 선택하기',exact:true}).click();
        await expect(page.locator('#ui-jewel-library')).toBeVisible();
    }
    await page.locator('.jewel-inventory-card').getByRole('button',{name:'제작대상',exact:true}).click();
    const currency=page.locator('.jewel-craft-currency').filter({hasText:'마법의 새싹'});
    await expect(currency).toContainText('일반을 매직으로 진화');
    await currency.getByRole('button').click();
    await expect.poll(()=>page.evaluate(()=>game.jewelInventory[0].rarity)).toBe('magic');
    expect(await page.evaluate(()=>game.currencies.magicBud)).toBe(1);
    expect(await page.evaluate(()=>game.currencies.jewelShard)).toBe(50);
    if(info.project.use.isMobile)await mode.selectOption('fusion');
    const checkbox=page.locator('#chk-jewel-amplified-fusion');await checkbox.check();
    await page.evaluate(()=>{game.currencies.jewelShard=51;updateStaticUI();});
    await expect(page.locator('.jewel-craft-balance')).toContainText('51');await expect(checkbox).toBeChecked();
    if(info.project.use.isMobile){
        await mode.selectOption('slots');await expect(checkbox).toHaveCount(0);
        await expect(page.locator('#ui-jewel-core-craft')).toContainText('성공');
        await expect(page.locator('#ui-jewel-core-craft')).toContainText('단계당 주얼 수치 +3%');
        await mode.selectOption('void');await expect(page.locator('#ui-jewel-core-craft')).toContainText('공허 주얼');
        await mode.selectOption('fusion');await expect(checkbox).toBeChecked();
        await mode.selectOption('orbs');
    }else{
        await expect(mode).toBeHidden();
        await expect(page.locator('#ui-jewel-core-craft')).toContainText('단계당 주얼 수치 +3%');
        const positions=await page.evaluate(()=>['ui-jewel-craft-disclosure','ui-jewel-library'].map(id=>document.getElementById(id).getBoundingClientRect().top));
        expect(positions[0]).toBeLessThan(positions[1]);
    }
    await page.evaluate(()=>{game.jewelInventory[0].locked=true;updateStaticUI();});
    await expect(currency).toContainText('잠금 주얼');await expect(currency.getByRole('button')).toBeDisabled();
    expect(errors).toEqual([]);
});
