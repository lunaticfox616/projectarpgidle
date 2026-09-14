const { test, expect } = require('@playwright/test');

test('passive selection requires an explicit mobile action and preserves refund rules', async ({ page }, info) => {
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(r=>r.id);contentProgression.sync();
        game.passivePoints=12;game.currencies.blightSpore=10;game.passives=[getPassiveTreeRootNodeId()];
        calculateReachableNodes();openTabPane('tab-char');updateStaticUI();
    });
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    await page.evaluate(()=>{game.settings.passiveInvestmentSummaryCollapsed=false;renderPassiveInvestmentSummary();});
    await expect(page.locator('#passive-investment-summary-body')).not.toContainText('성좌 각성');
    await expect(page.locator('#passive-investment-summary-body select')).toHaveCount(0);
    const target=await page.evaluate(()=>{
        const node=Array.from(reachableNodes).map(id=>PASSIVE_TREE.nodes[id]).find(n=>n.kind!=='start'&&n.kind!=='attribute');
        camZoom=1;camX=-node.x;camY=-node.y;drawPassiveTree();
        const rect=document.getElementById('tree-canvas').getBoundingClientRect();return{id:node.id,x:rect.x+rect.width/2,y:rect.y+rect.height/2};
    });
    if(!info.project.use.isMobile){
        await page.mouse.move(target.x,target.y);await expect(page.locator('#canvas-tooltip')).toBeVisible();
        await page.mouse.click(target.x,target.y);await expect.poll(()=>page.evaluate(()=>game.passivePoints)).toBe(11);
        await expect(page.locator('#canvas-tooltip')).toContainText('활성화됨');
        await expect(page.locator('#canvas-tooltip')).not.toContainText('포인트 필요');
        await page.screenshot({path:info.outputPath('passive-invested.png')});
        await page.mouse.click(target.x,target.y);
        await page.locator('#game-dialog-cancel').click();
        expect(await page.evaluate(()=>game.passivePoints)).toBe(11);
        expect(await page.evaluate(()=>game.currencies.blightSpore)).toBe(10);
        await page.mouse.click(target.x,target.y);
        await page.locator('#game-dialog-confirm').click();
        await expect.poll(()=>page.evaluate(()=>game.passivePoints)).toBe(12);
        expect(await page.evaluate(()=>game.currencies.blightSpore)).toBe(9);
        await page.mouse.move(target.x,target.y);
        await expect(page.locator('#canvas-tooltip')).toContainText('1포인트 필요');
        expect(errors).toEqual([]);return;
    }
    await page.touchscreen.tap(target.x,target.y);
    await expect(page.locator('#passive-mobile-detail')).toBeVisible();
    await page.evaluate(()=>enqueueMobileToast('패시브 투자 전 효과를 확인하는 중입니다.','season-up'));
    expect(await page.evaluate(()=>{
        const toast=getMobileToastRoot().getBoundingClientRect();
        const action=document.querySelector('[data-passive-confirm]').getBoundingClientRect();
        return toast.bottom<=action.top || toast.top>=action.bottom;
    })).toBe(true);
    await page.screenshot({path:info.outputPath('passive-preview.png')});
    await page.touchscreen.tap(target.x,target.y);
    expect(await page.evaluate(()=>game.passivePoints)).toBe(12);
    await page.locator('[data-passive-confirm]').tap();
    await expect.poll(()=>page.evaluate(()=>game.passivePoints)).toBe(11);
    await expect(page.locator('#passive-mobile-detail')).toBeHidden();
    await page.evaluate(()=>{game.currencies.blightSpore=0;});
    await page.touchscreen.tap(target.x,target.y);
    await expect(page.getByRole('button',{name:'노드 반환',exact:true})).toBeDisabled();
    await expect(page.locator('#passive-mobile-detail')).not.toContainText('포인트 필요');
    await page.locator('[data-passive-close]').tap();
    await page.evaluate(()=>{game.currencies.blightSpore=10;});
    await page.touchscreen.tap(target.x,target.y);
    await page.getByRole('button',{name:'노드 반환',exact:true}).tap();
    await page.locator('#game-dialog-cancel').tap();
    expect(await page.evaluate(()=>game.passivePoints)).toBe(11);
    expect(await page.evaluate(()=>game.currencies.blightSpore)).toBe(10);
    await page.touchscreen.tap(target.x,target.y);
    await page.getByRole('button',{name:'노드 반환',exact:true}).tap();
    await page.locator('#game-dialog-confirm').tap();
    await expect.poll(()=>page.evaluate(()=>game.passivePoints)).toBe(12);
    expect(await page.evaluate(()=>game.currencies.blightSpore)).toBe(9);
    await page.evaluate(()=>{game.passivePoints=0;});await page.touchscreen.tap(target.x,target.y);
    await expect(page.locator('[data-passive-confirm]')).toBeDisabled();
    await page.locator('[data-passive-close]').tap();await expect(page.locator('#passive-mobile-detail')).toBeHidden();
    const search=page.locator('#passive-search-drawer');
    const preset=page.locator('#passive-preset-drawer');
    await search.locator('summary').tap();
    await page.locator('#passive-search-input').fill('힘');
    await expect(page.locator('#passive-search-input')).toHaveValue('힘');
    await preset.locator('summary').tap();
    await expect(search).not.toHaveAttribute('open','');
    await expect(page.locator('#passive-tree-planner')).toBeVisible();
    await page.locator('.passive-investment-summary-toggle').tap();
    await expect(preset).not.toHaveAttribute('open','');
    await expect(page.locator('#passive-investment-summary-body')).toBeVisible();
    await search.locator('summary').tap();
    await expect(page.locator('#passive-investment-summary-body')).toBeHidden();
    const bounds=await page.evaluate(()=>{
        const canvas=document.getElementById('tree-canvas').getBoundingClientRect();
        return Array.from(document.querySelectorAll('.passive-tree-toolbar summary,.passive-investment-summary-toggle'))
            .filter(el=>el.getClientRects().length).map(el=>{const r=el.getBoundingClientRect();return r.height>=44&&r.bottom<=canvas.top;});
    });
    expect(bounds.every(Boolean)).toBe(true);
    await page.screenshot({path:info.outputPath('passive-tools.png')});
    expect(errors).toEqual([]);
});
