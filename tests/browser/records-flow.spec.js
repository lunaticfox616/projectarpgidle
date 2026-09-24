const {test,expect}=require('@playwright/test');

async function openRecords(page) {
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="occultist"]').click();
    await page.waitForFunction(()=>battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        trackRecordBests();recordActClear(0);game.maxZoneId=1;trackRecordBests();updateStaticUI();
    });
    await page.waitForFunction(()=>!uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(()=>{tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);});
    if(!await page.locator('#btn-tab-journal').isVisible())await page.locator('#btn-mobile-nav-more').click();
    await page.locator('#btn-tab-journal').click();
    await page.locator('#tab-journal').getByRole('button',{name:'기록',exact:true}).click();
    return page.locator('#ui-records-body');
}

test('early records show actual progress before optional growth and preserve controls during refresh',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const root=await openRecords(page);
    await expect(root).toContainText('액트 2: 가지치기의 중정');
    for(const name of ['혼돈 심화','고대 미궁','창공의 탑','지하계','나무꾼의 잔상'])await expect(root).not.toContainText(name);
    const offline=root.locator('.records-offline');
    await expect(offline.locator('.offline-progress-panel')).not.toBeVisible();
    const act=root.locator('.records-section').filter({hasText:'액트 돌파 기록'});
    expect((await act.boundingBox()).y).toBeLessThan((await offline.boundingBox()).y);
    await page.screenshot({path:info.outputPath('records-first-loop.png')});
    await offline.locator('summary').click();
    await page.evaluate(()=>{game.currencies[OFFLINE_PROGRESS_CURRENCY_KEY]=3;renderRecordsTab();});
    const upgrade=offline.getByRole('button',{name:'1 잔재로 강화',exact:true});
    await upgrade.focus();
    await page.evaluate(()=>{game.records.currentLoop.activeMs+=1000;renderRecordsTab();});
    await expect(upgrade).toBeFocused();
    await expect(offline).toHaveAttribute('open','');
    await upgrade.click();
    await expect(offline).toContainText('시간 인식 Lv.1');
    expect(await page.evaluate(()=>game.currencies[OFFLINE_PROGRESS_CURRENCY_KEY])).toBe(2);
    await page.evaluate(()=>renderRecordsTab());
    expect(await page.evaluate(()=>game.offlineProgress.recognitionLevel)).toBe(1);
    await expect(offline).toHaveAttribute('open','');
    expect(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.screenshot({path:info.outputPath('records-offline-open.png')});
    await offline.locator('summary').click();
    expect(errors).toEqual([]);
});
