const {test,expect}=require('@playwright/test');

test('act journal preference suppresses queued scenes and remains editable in settings',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.seenTutorials.push('story_illustrations_v1','story_prologue','tutorial_battle_basics');
        game.currentZoneId=2;unlockJournalEntry('act_2');storyJournalUi.sync();
        showNextTutorial();
    });
    const toggle=page.locator('#chk-hide-act-journal');
    await expect(toggle).toBeVisible();
    await toggle.check();
    await expect(page.locator('#chk-act-journal')).not.toBeChecked();
    const before=await page.evaluate(()=>JSON.stringify([game.journalEntries,game.journalBonuses]));
    await page.screenshot({path:info.outputPath('journal-preference.png')});
    await page.locator('#tutorial-dismiss-btn').click();
    await page.evaluate(()=>showNextTutorial());
    await expect(page.locator('#tutorial-overlay')).not.toHaveClass(/active/);
    await page.evaluate(()=>{storyJournalUi.sync();switchTab('tab-settings');});
    if(info.project.use.isMobile)await page.locator('#settings-category').selectOption('notifications');
    await page.locator('#chk-act-journal').check();
    expect(await page.evaluate(()=>game.settings.showActJournal)).toBe(true);
    await page.evaluate(()=>{storyJournalUi.sync();showNextTutorial();});
    await expect(page.locator('#tutorial-overlay')).not.toHaveClass(/active/);
    expect(await page.evaluate(()=>JSON.stringify([game.journalEntries,game.journalBonuses]))).toBe(before);
    await page.evaluate(()=>storyJournalUi.openEntry('act_2'));
    await expect(page.locator('#journal-reader')).toBeVisible();
    await page.locator('[data-journal-close]').click();
    await page.evaluate(()=>{unlockJournalEntry('act_4');storyJournalUi.sync();showNextTutorial();});
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();
    expect(errors).toEqual([]);
});
