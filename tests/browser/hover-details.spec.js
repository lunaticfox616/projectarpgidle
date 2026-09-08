const {test,expect}=require('@playwright/test');

test('progress keeps speed details and equipped talents show effect tooltips without unequipping',async({page},testInfo)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
    });
    await page.locator('.map-progress-gauge').hover();
    const tooltip=page.locator('#info-tooltip');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('이동 속도와 진행도');
    await expect(tooltip).toContainText('같은 이동 구간의 소요 시간');
    await expect(tooltip).not.toContainText('일반 진행도 기준');
    await expect(tooltip).not.toContainText('특수 이벤트의 고정 시간');
    const card=await page.evaluate(()=>{
        hideInfoTooltip();game.season=30;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        const key=makeTalentComboKey('hero1','warrior');
        game.talentCards={[key]:{level:3,score:300,count:1}};game.talentCardLoadout=[key];
        openTabPane('tab-talent');updateStaticUI();
        const detail=document.createElement('div');
        detail.innerHTML=getTalentCardEffectLines('hero1','warrior',3).join('<br>');
        return {key,name:getTalentCardName('hero1','warrior').bloomName,effects:detail.textContent};
    });
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    await page.locator('.talent-slot.filled').hover();
    await expect(tooltip).toBeVisible();await expect(tooltip).toContainText(card.name);
    await expect(tooltip).toContainText('Lv.3');await expect(tooltip).toContainText(card.effects);
    expect(await page.evaluate(()=>game.talentCardLoadout.filter(Boolean))).toEqual([card.key]);
    await page.screenshot({path:testInfo.outputPath('equipped-talent-tooltip.png')});
    await page.mouse.move(0,0);await expect(tooltip).toBeHidden();
    expect(errors).toEqual([]);
});
