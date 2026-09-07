const {test,expect}=require('@playwright/test');

test('rune selection keeps close and unequip available while browsing a full inventory',async({page},info)=>{
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        const st=ensureUnderworldRuneState();
        st.unlockedSlots=6;st.unlockedRunesMaxNumber=30;
        st.obtainedRunes=Array.from({length:30},(_,i)=>i+1);
        st.equippedRunes=[1,null,null,null,null,null];
        openUnderworldRuneOverlay(0);
    });
    const overlay=page.locator('#underworld-rune-overlay');
    const last=overlay.locator('.underworld-rune-option').last();
    await last.scrollIntoViewIfNeeded();
    await page.mouse.move(0,0);
    await page.screenshot({path:info.outputPath('rune-selection.png'),scale:'css'});
    await expect(overlay.getByRole('button',{name:'닫기',exact:true})).toBeInViewport();
    await expect(overlay.getByRole('button',{name:'이 슬롯 해제',exact:true})).toBeInViewport();
    await last.click();
    await expect(overlay).toHaveCount(0);
    expect(await page.evaluate(()=>game.underworldRunes.equippedRunes[0])).toBe(30);
    expect(await page.evaluate(()=>game.underworldRunes.obtainedRunes.filter(no=>no===1).length)).toBe(2);
    await page.evaluate(()=>openUnderworldRuneOverlay(0));
    await overlay.getByRole('button',{name:'이 슬롯 해제',exact:true}).click();
    expect(await page.evaluate(()=>game.underworldRunes.equippedRunes[0])).toBe(null);
    expect(await page.evaluate(()=>game.underworldRunes.obtainedRunes.includes(30))).toBe(true);
    await page.evaluate(()=>{
        game.underworldRunes.obtainedRunes=[];openUnderworldRuneOverlay(0);
    });
    await expect(overlay).toContainText('보유한 룬이 없습니다.');
    await expect(overlay.getByRole('button',{name:'이 슬롯 해제',exact:true})).toBeDisabled();
    await overlay.getByRole('button',{name:'닫기',exact:true}).click();
    await page.evaluate(()=>{
        document.body.classList.add('light-mode');
        game.underworldRunes.obtainedRunes=[1,1,1];game.currencies.runeShard=5;
        openUnderworldRuneUpgradeOverlay();
    });
    await expect(overlay).toContainText('룬조각 5');
    await page.screenshot({path:info.outputPath('rune-upgrade-light.png'),scale:'css'});
    await overlay.locator('.underworld-rune-option').click();
    expect(await page.evaluate(()=>game.currencies.runeShard)).toBe(0);
    expect(await page.evaluate(()=>game.underworldRunes.equippedRunes[0])).toBe(2);
    expect(errors).toEqual([]);
});
