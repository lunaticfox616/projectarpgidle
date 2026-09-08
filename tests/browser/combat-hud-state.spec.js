const {test,expect}=require('@playwright/test');
test('painting combat HUD never changes player health or applies a stale recovery cap',async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    const result=await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        const stats=getPlayerStats();
        game.playerHp=stats.maxHp*2;const before=game.playerHp;
        for(let i=0;i<5;i++)updateCombatUI({...stats,lifeRecoveryCap:1});
        const afterPaint=game.playerHp;
        const prepared=prepareCombatTick(getCombatTime()+100);
        const cap=getPlayerRecoveryHpCap(prepared);
        const afterTick=game.playerHp;
        updateCombatUI({...stats,lifeRecoveryCap:1});
        return{before,afterPaint,afterTick,cap,afterStalePaint:game.playerHp};
    });
    expect(result.afterPaint).toBe(result.before);
    expect(result.afterTick).toBe(result.cap);
    expect(result.afterStalePaint).toBe(result.cap);
    expect(errors).toEqual([]);
});
