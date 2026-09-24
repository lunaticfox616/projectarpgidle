const {test, expect} = require('@playwright/test');

async function openRealms(page) {
    await page.route('https://**', route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    await expect(page.locator('#loading-overlay')).not.toHaveClass(/active/);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        game.level=100; game.season=50; game.combatHalted=true;
        game.seenTutorials=[...new Set([...game.seenTutorials,...MAP_PRIMARY_CONTENTS.map(row=>row.noticeKey).filter(Boolean)])];
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id); contentProgression.sync();
        Object.keys(game.unlocks).forEach(key=>game.unlocks[key]=true);
        game.journalEntries.push('woodsman'); game.abyssEndlessDepth=30; game.labyrinthUnlockedMaxFloor=100;
        game.chaosRealm.unlocked=true; game.loopProgressCurrent.chaos20Cleared=true;
        game.clearedRootBosses.push('s6_beast_cerberus');
        game.underworldProgress={currentFloor:12,highestFloor:30,floor10Cleared:true};
        game.underworldRunes.unlockedSlots=3; game.underworldRunes.unlockedRunesMaxNumber=9;
        game.underworldRunes.obtainedRunes=[1,2,2]; game.underworldRunes.equippedRunes=[1,null,2,null,null,null];
        reconcileMapPrimaryContentUnlocks(game); updateStaticUI(); switchTab('tab-map');
        switchCosmosInnerTab('route');
    });
    await page.waitForFunction(()=>{
        if(uiRefreshQueued||uiRefreshRunning)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
    await page.locator('#exploration-location').getByRole('button',{name:'전체 탐험',exact:true}).click();
}


test('finishing a pending settlement commits once and clears the replayable absence', async ({page})=>{
    await openRealms(page);
    await page.evaluate(()=>{
        game.combatHalted=false;
        backgroundCombatRuntime.hiddenAtMs=Date.now()-8*60*60*1000;
        backgroundCombatRuntime.snapshot=cloneBackgroundCombatState(game);
        backgroundCombatRuntime.signature=getBackgroundCombatSignature(game);
        window.settlementReviewTask=startBackgroundCombatReturn(Date.now());
        // Pause at the native lifecycle boundary so the test can reliably exercise the pending controls.
        backgroundCombatRuntime.appInactive=true;
    });
    await page.locator('#background-combat-fast-button').click();
    await page.locator('#background-combat-finish-button').click();
    await page.evaluate(()=>{backgroundCombatRuntime.appInactive=false});
    expect(await page.evaluate(()=>window.settlementReviewTask)).toBe(true);
    await expect(page.locator('#background-combat-result-overlay')).toContainText('해당 시간 보상 미지급');
    expect(await page.evaluate(()=>backgroundCombatRuntime.snapshot)).toBeNull();
    expect(await page.evaluate(()=>startBackgroundCombatReturn(Date.now()))).toBe(false);
    await expect(page.locator('#background-combat-progress-overlay')).toHaveCount(0);
});
