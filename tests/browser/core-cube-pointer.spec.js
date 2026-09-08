const { test, expect } = require('@playwright/test');

test('cube can rotate by touch or mouse without spending powers and settles when idle', async ({ page }, info) => {
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('https://**', r => r.fulfill({ status: 204, body: '' }));
    await page.goto('/'); await page.locator('#btn-startup-guest').click(); await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null; game.season = 30; contentProgression.sync();
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id); contentProgression.sync();
        game.underworldProgress = { currentFloor: 12, highestFloor: 18, floor10Cleared: true };
        Object.assign(ensureCoreCubeState(), { unlocked: true, everUnlocked: true, relockUntilDrop: false, powers: { 7: 2, 12: 1 }, faces: [null,null,null,null,null,null], selectedFace: 0, completed: false });
        openTabPane('tab-cube'); updateStaticUI();
    });
    await page.waitForFunction(() => { if(uiRefreshRunning || uiRefreshQueued) return false; tutorialQueue.length = 0; if(activeTutorial) dismissTutorial(false); return true; });
    if (!info.project.use.isMobile) {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.evaluate(() => renderCoreCubePanel({ force: true }));
    }
    if (info.project.use.isMobile) await page.getByRole('tab', {name: '발현 결과', exact: true}).click();
    const canvas = page.locator('#coreCubeCanvas'); await canvas.scrollIntoViewIfNeeded();
    const pixels = () => canvas.evaluate(el => el.toDataURL());
    const initial = await pixels(); await page.waitForTimeout(200); expect(await pixels()).toBe(initial);
    const box = await canvas.boundingBox(), x = box.x + 40, y = box.y + 95;
    if (info.project.use.isMobile) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 65, y: y + 25 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await cdp.detach();
    } else {
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 65, y + 25, { steps: 5 }); await page.mouse.up();
    }
    const rotated = await pixels(); expect(rotated).not.toBe(initial);
    const retainedCanvas = await canvas.elementHandle();
    await page.waitForTimeout(200); expect(await pixels()).toBe(rotated);
    expect(await page.evaluate(() => ({ powers: game.coreCube.powers, face: game.coreCube.selectedFace }))).toEqual({ powers: { 7: 2, 12: 1 }, face: 0 });
    if (info.project.use.isMobile) await page.getByRole('tab', {name: '동력원 장착', exact: true}).click();
    await page.locator('.core-cube-face').nth(1).click();
    await page.locator('.core-cube-power').first().click();
    expect(await page.evaluate(() => game.coreCube.faces[1])).toBe(7);
    expect(await page.evaluate(() => game.coreCube.powers[7])).toBe(1);
    expect(await retainedCanvas.evaluate(el => el.isConnected && el === document.getElementById('coreCubeCanvas'))).toBe(true);
    expect(errors).toEqual([]);
});

test('cube workspaces keep full power selection and result text accessible', async ({page}, info) => {
    await page.route('https://**', r => r.fulfill({status:204,body:''}));
    await page.goto('/'); await page.locator('#btn-startup-guest').click(); await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle=null; game.season=30; contentProgression.sync();
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id); contentProgression.sync();
        game.underworldProgress={currentFloor:12,highestFloor:18,floor10Cleared:true};
        Object.assign(ensureCoreCubeState(),{unlocked:true,everUnlocked:true,relockUntilDrop:false,powers:{},faces:[null,null,null,null,null,null],selectedFace:0,completed:false});
        openTabPane('tab-cube');updateStaticUI();
    });
    await page.waitForFunction(() => {if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    await expect(page.locator('.core-cube-inventory')).toContainText('보유 동력원이 없습니다.');
    await page.evaluate(() => {ensureCoreCubeState().powers=Object.fromEntries(Array.from({length:45},(_,i)=>[i+1,2]));renderCoreCubePanel();});
    await expect(page.locator('.core-cube-power')).toHaveCount(45);
    if(info.project.use.isMobile) expect(await page.locator('.core-cube-inventory').evaluate(el=>el.scrollHeight<=el.clientHeight+1)).toBe(true);
    await page.getByRole('button',{name:'45의 동력원 2개 각인',exact:true}).click();
    expect(await page.evaluate(()=>game.coreCube.faces[0])).toBe(45);
    if(info.project.use.isMobile) await page.getByRole('tab',{name:'재료 · 조합',exact:true}).click();
    await page.evaluate(()=>{ensureCoreCubeState().blurred45=3;renderCoreCubePanel();});
    await expect(page.locator('.core-cube-side')).toContainText('보유 3');
    if(info.project.use.isMobile) {
        await expect(page.getByRole('tab',{name:'재료 · 조합',exact:true})).toHaveAttribute('aria-selected','true');
        await page.getByRole('tab',{name:'발현 결과',exact:true}).click();
    }
    await page.evaluate(()=>{ensureCoreCubeState().faces=[1,2,3,4,5,6];completeCoreCube();});
    await expect(page.locator('.core-cube-option')).toHaveCount(4);
    if(info.project.use.isMobile) {
        const canvas=await page.locator('#coreCubeCanvas').boundingBox(), options=await page.locator('.core-cube-stage-options').boundingBox();
        expect(options.y).toBeGreaterThanOrEqual(canvas.y+canvas.height);
        await page.getByRole('tab',{name:'발현 결과',exact:true}).focus(); await page.keyboard.press('Home');
        await expect(page.locator('.core-cube-assembly')).toBeVisible();
        await page.setViewportSize({width:1440,height:900});
        await page.waitForFunction(()=>document.body.classList.contains('desktop-windowed-ui'));
        await page.evaluate(()=>openTabPane('tab-cube'));
    }
    await expect(page.locator('.core-cube-assembly')).toBeVisible();
    await expect(page.locator('.core-cube-stage')).toBeVisible();
    await expect(page.locator('.core-cube-side')).toBeVisible();
});
