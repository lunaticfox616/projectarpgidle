const { test, expect } = require('@playwright/test');

test('combat feedback, content discovery and passive dragging remain clear', async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.season = 2;
        game.contentProgression.inherited = ['craft', 'flask', 'codex', 'support'];
        contentProgression.sync();
        game.unlocks.map = true; game.unlocks.codex = true; game.unlocks.flask = true;
        game.runProgress = 43; game.moveTimer = 0; game.currentZoneId = 1;
        game.enemies = Array.from({length:21}, (_,id)=>({...createEnemy(getZone(1), {boss:false}, id),id,hp:100,maxHp:100}));
        updateStaticUI();
    });
    await expect(page.locator('#ui-move-time-text')).toHaveText('진행불가');
    await expect(page.locator('#ui-progress-label')).toHaveText('진행도');
    await page.evaluate(() => {
        game.enemies = []; updateStaticUI();
        document.querySelectorAll('.game-toast').forEach(el=>el.remove());
        updateBuildFeedback({dps:100});
        game.activeSkill = '검증용 선택';
        updateBuildFeedback({dps:145});
    });
    const toast = page.locator('.game-toast-dps-up').last();
    await expect(toast).toHaveText('◆▲ 45 DPS');
    await expect(toast.locator('.game-toast-dps-value')).toHaveText('▲ 45');
    expect(await toast.locator('.game-toast-dps-value').evaluate(el => getComputedStyle(el).color))
        .not.toBe(await toast.locator(':scope > span:last-child').evaluate(el => getComputedStyle(el).color));
    await expect(toast.locator('.game-toast-dps-value')).toHaveCSS('color','rgb(46, 204, 113)');
    await page.evaluate(() => { game.activeSkill='기본 공격'; updateBuildFeedback({dps:80}); switchTab('tab-map'); });
    await expect(page.locator('#btn-map-tab-pvp')).toBeHidden();
    await page.evaluate(() => { game.season=3; checkUnlocks(); updateStaticUI(); });
    await page.waitForFunction(() => {
        if (uiRefreshQueued || uiRefreshRunning) return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        return true;
    });
    await expect(page.locator('#btn-map-tab-pvp')).toBeVisible();
    await page.evaluate(() => switchTab('tab-flask'));
    await expect(page.getByRole('button',{name:/생장판/})).toHaveCount(0);
    await page.evaluate(() => { game.uniqueCodex={}; game.codexSubtab='realm'; switchTab('tab-codex'); renderUniqueCodexUI(); });
    await expect(page.locator('#btn-codex-realm')).toBeHidden();
    expect(await page.evaluate(()=>game.codexSubtab)).toBe('main');
    await page.evaluate(() => {
        const item=UNIQUE_DB.find(entry=>entry.realmCodexOnly);
        registerUniqueToCodexOnAcquire({name:item.name,slot:item.slots[0],rarity:'unique',baseName:'발견 장비'});
        renderUniqueCodexUI();
    });
    await expect(page.locator('#btn-codex-realm')).toBeVisible();
    await page.locator('#btn-codex-realm').click();
    await expect(page.locator('#btn-codex-realm')).toHaveClass(/active/);
    await page.screenshot({path:testInfo.outputPath('codex.png')});
    if (!testInfo.project.name.startsWith('mobile')) {
        await page.evaluate(() => { game.unlocks.skills=true; switchTab('tab-skills'); });
        const attack=await page.locator('.attack-library').boundingBox();
        const support=await page.locator('.support-library').boundingBox();
        expect(attack.y).toBeCloseTo(support.y,0);
        expect(support.x).toBeGreaterThan(attack.x+attack.width);
        await page.screenshot({path:testInfo.outputPath('gems.png')});
        await page.evaluate(() => { game.level = 2; checkUnlocks(); tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); switchTab('tab-char'); });
        await page.locator('#passive-search-drawer > summary').click();
        await page.locator('.passive-investment-summary-toggle').click();
        const empty = await page.evaluate(() => {
            const search=document.querySelector('#passive-search-drawer').getBoundingClientRect();
            const summary=document.querySelector('#passive-investment-summary').getBoundingClientRect();
            const x=search.left+8, y=summary.top+20;
            return {x,y,target:document.elementFromPoint(x,y)?.id};
        });
        expect(empty.target).toBe('tree-canvas');
        const before=await page.evaluate(()=>({x:camX,y:camY}));
        await page.mouse.move(empty.x,empty.y); await page.mouse.down();
        await page.mouse.move(empty.x-60,empty.y+50,{steps:5});
        expect(await page.evaluate(()=>isDragging)).toBe(true);
        expect(await page.evaluate(()=>({x:camX,y:camY}))).not.toEqual(before);
        const summary=await page.locator('.passive-investment-summary-toggle').boundingBox();
        await page.mouse.move(summary.x+10,summary.y+10,{steps:6});
        expect(await page.evaluate(()=>isDragging)).toBe(true);
        await page.mouse.move(summary.x+45,summary.y+25,{steps:3});
        const crossed=await page.evaluate(()=>({x:camX,y:camY}));
        await page.mouse.up();
        expect(await page.evaluate(()=>isDragging)).toBe(false);
        await page.mouse.move(empty.x,empty.y);
        expect(await page.evaluate(()=>({x:camX,y:camY}))).toEqual(crossed);
        await page.screenshot({path:testInfo.outputPath('passive-drag.png')});
    }
    expect(errors).toEqual([]);
});
