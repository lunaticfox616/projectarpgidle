const { test, expect } = require('@playwright/test');

test('mobile destination selector preserves available routes and returns from separate regions', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(require('../../scripts/lib/offline-endgame-fixture'));
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        game.combatHalted = true;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id);
        contentProgression.sync();
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        switchTab('tab-map'); updateStaticUI();
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return true;
    });
    const select = page.locator('#mobile-map-destination');
    await page.evaluate(()=>{
        switchMapSubtab('map-tab-zones');updateStaticUI();
    });
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        window.hiddenOceanMutations=0;
        for(const id of ['ui-underworld-panel','ui-underworld-list','ui-ocean-panel','ui-fishing-panel','ui-sea-gift-panel'])new MutationObserver(rows=>hiddenOceanMutations+=rows.length).observe(document.getElementById(id),{childList:true,subtree:true});
        game.ocean.fishingGauge=37;game.ocean.oxygenCur=75;updateStaticUI();
    });
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    expect(await page.evaluate(()=>hiddenOceanMutations)).toBe(0);
    await page.evaluate(()=>{
        game.underworldProgress.highestFloor=20;
        game.currencies.runeShard=777;
        reconcileMapPrimaryContentUnlocks(game);
        switchMapSubtab('map-tab-underworld');updateStaticUI();
    });
    await expect(page.locator('#ui-underworld-panel')).toContainText('777');
    const runeInventory=page.locator('[data-ui-disclosure="underworld-rune-inventory"]');
    await runeInventory.locator('summary').click();
    await page.evaluate(()=>{game.currencies.runeShard=778;updateStaticUI();});
    await expect(page.locator('#ui-underworld-panel')).toContainText('778');
    await expect(runeInventory).toHaveAttribute('open');
    await page.evaluate(()=>{switchMapSubtab('map-tab-ocean');updateStaticUI();});
    await expect(page.locator('#ui-ocean-panel')).toContainText('75');
    await page.evaluate(()=>{switchMapSubtab('map-tab-fishing');updateStaticUI();});
    await expect(page.locator('#ui-fishing-panel')).toContainText('37');
    await expect(page.locator('#ui-fishing-collection > *')).toHaveCount(0);
    if(info.project.use.isMobile){
        await expect(page.locator('#fishing-workshop')).toBeHidden();
        await page.getByRole('tab',{name:'도감',exact:true}).click();
        await expect(page.locator('#ui-fishing-collection')).toBeVisible();
        await expect(page.locator('#fishing-gather')).toBeHidden();
        await page.evaluate(()=>{game.ocean.fishingGauge=38;updateStaticUI();});
        await expect(page.locator('#ui-fishing-collection')).toBeVisible();
        await page.getByRole('tab',{name:'채집 · 전략',exact:true}).click();
        await page.evaluate(()=>{
            window.hiddenFishChanges=0;
            new MutationObserver(rows=>hiddenFishChanges+=rows.length).observe(document.getElementById('ui-fishing-collection'),{childList:true,subtree:true});
            const fish=Object.keys(OCEAN_FISH_DB)[0];game.ocean.fishStock[fish]=777;game.ocean.fishCaughtTotal[fish]=777;updateStaticUI();
        });
        await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
        expect(await page.evaluate(()=>hiddenFishChanges)).toBe(0);
        await page.getByRole('tab',{name:'도감',exact:true}).click();
        await expect(page.locator('#ui-fishing-collection')).toContainText('777');
        await page.setViewportSize({width:1440,height:900});
        await expect(page.locator('#fishing-collection')).not.toHaveAttribute('open');
        await page.evaluate(()=>{game.ocean.fishStock[Object.keys(OCEAN_FISH_DB)[0]]=888;updateStaticUI();});
        await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
        await page.setViewportSize({width:393,height:851});
        await expect(page.locator('#ui-fishing-collection')).toBeVisible();
        await expect(page.locator('#ui-fishing-collection')).toContainText('888');
        await page.getByRole('tab',{name:'채집 · 전략',exact:true}).click();
        await page.getByRole('button',{name:'바다의 선물 제작',exact:true}).click();
        await expect(page.locator('#ui-sea-gift-panel')).toBeVisible();
        await expect(page.locator('#fishing-gather')).toBeHidden();
        await page.getByRole('tab',{name:'채집 · 전략',exact:true}).click();
        await expect(page.locator('#ui-fishing-panel')).toContainText('38');
    }else{
        await page.locator('#fishing-collection > summary').click();
        await expect(page.locator('#ui-fishing-collection')).toBeVisible();
        await expect(page.locator('#ui-fishing-collection')).toContainText('심해 도감');
    }
    await page.evaluate(()=>{switchMapSubtab('map-tab-zones');updateStaticUI();});
    if (!info.project.use.isMobile) {
        await expect(page.locator('.map-primary-tabs')).toBeVisible();
        await expect(page.locator('#mobile-map-navigation')).toBeHidden();
        return;
    }
    await expect(select).toBeVisible();
    await expect(page.locator('.map-primary-tabs')).toBeHidden();
    const routes = await select.locator('option:not([disabled])').evaluateAll(nodes => nodes.map(node => node.value));
    expect(routes.length).toBeGreaterThan(8);
    const initialZone = await page.evaluate(() => game.zoneId);
    for (const id of routes) {
        await select.selectOption(id);
        await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
        await expect(page.locator('#' + id.replace('btn-', ''))).toBeVisible();
        await expect(select).toHaveValue(id);
    }
    await select.selectOption('btn-map-explore-hunting');
    await expect(page.locator('#map-explore-hunting')).toBeVisible();
    expect(await page.evaluate(() => game.zoneId)).toBe(initialZone);
    expect(errors).toEqual([]);
    await expect(page.locator('#mobile-toast-root > div')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('map-navigation.png'), scale: 'css' });
});
