const { test, expect } = require('@playwright/test');

test('passive selection requires an explicit mobile action and preserves refund rules', async ({ page }, info) => {
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=100;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(r=>r.id);contentProgression.sync();
        game.passivePoints=12;game.currencies.blightSpore=10;game.passives=[getPassiveTreeRootNodeId()];
        calculateReachableNodes();openTabPane('tab-char');updateStaticUI();
    });
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    const target=await page.evaluate(()=>{
        const node=Array.from(reachableNodes).map(id=>PASSIVE_TREE.nodes[id]).find(n=>n.kind!=='start'&&n.kind!=='attribute');
        camZoom=1;camX=-node.x;camY=-node.y;drawPassiveTree();
        const rect=document.getElementById('tree-canvas').getBoundingClientRect();return{id:node.id,x:rect.x+rect.width/2,y:rect.y+rect.height/2};
    });
    if(!info.project.use.isMobile){
        await page.mouse.move(target.x,target.y);await expect(page.locator('#canvas-tooltip')).toBeVisible();
        await page.mouse.click(target.x,target.y);await expect.poll(()=>page.evaluate(()=>game.passivePoints)).toBe(11);
        expect(errors).toEqual([]);return;
    }
    await page.touchscreen.tap(target.x,target.y);
    await expect(page.locator('#passive-mobile-detail')).toBeVisible();
    await page.touchscreen.tap(target.x,target.y);
    expect(await page.evaluate(()=>game.passivePoints)).toBe(12);
    await page.locator('[data-passive-confirm]').tap();
    await expect.poll(()=>page.evaluate(()=>game.passivePoints)).toBe(11);
    await expect(page.locator('#passive-mobile-detail')).toBeHidden();
    await page.touchscreen.tap(target.x,target.y);
    await page.getByRole('button',{name:'노드 반환',exact:true}).tap();
    await page.locator('#game-dialog-confirm').tap();
    await expect.poll(()=>page.evaluate(()=>game.passivePoints)).toBe(12);
    expect(await page.evaluate(()=>game.currencies.blightSpore)).toBe(9);
    await page.evaluate(()=>{game.passivePoints=0;});await page.touchscreen.tap(target.x,target.y);
    await expect(page.locator('[data-passive-confirm]')).toBeDisabled();
    await page.locator('[data-passive-close]').tap();await expect(page.locator('#passive-mobile-detail')).toBeHidden();
    expect(errors).toEqual([]);
});
