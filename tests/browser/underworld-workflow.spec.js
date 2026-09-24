const {test,expect}=require('@playwright/test');

async function openUnderworld(page,empty=false) {
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(empty=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.combatHalted=true;
        game.level=100;game.season=50;game.maxZoneId=29;
        game.seenTutorials.push(...Object.keys(TUTORIAL_GUIDES));
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.clearedRootBosses.push('s6_beast_cerberus');game.abyssEndlessDepth=30;
        game.journalEntries.push('woodsman');game.chaosRealm.unlocked=true;
        game.labyrinthUnlockedMaxFloor=100;game.loopProgressCurrent.chaos20Cleared=true;
        game.underworldProgress={currentFloor:1,highestFloor:30,floor10Cleared:!empty};
        if(!empty)Object.assign(game.underworldRunes,{unlockedSlots:2,unlockedRunesMaxNumber:6,
            obtainedRunes:[2,2,2,6],equippedRunes:[1,null,null,null,null,null],enhanceLvByNo:{},bonusLinesByNo:{}});
        Object.assign(game.currencies,{underCopper:10000,underSilver:10000,underGold:10000,runeShard:10000});
        reconcileMapPrimaryContentUnlocks(game);switchTab('tab-map');switchMapSubtab('map-tab-underworld');performUpdateStaticUI();
    },empty);
    await page.waitForFunction(()=>{
        if(uiRefreshQueued||uiRefreshRunning)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
}

test('first rune unlock explains the milestone instead of an inverted range',async({page},info)=>{
    await openUnderworld(page,true);
    const panel=page.locator('#ui-underworld-panel');
    await expect(panel).not.toContainText('1~0');
    await expect(panel).toContainText('10층');
    await expect(panel.getByRole('button',{name:'룬 가공 조각 10',exact:true})).toBeDisabled();
    await expect(page.locator('#game-toast-region .game-toast, .mobile-log-toast')).toHaveCount(0);
    await panel.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath('underworld-dark.png')});
    expect(await panel.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
});

test('equipped rune growth shows costs and protects cancellation and changed state',async({page})=>{
    await openUnderworld(page);
    const button=page.getByRole('button',{name:'룬 강화 수치 성장',exact:true});
    await button.click();
    await expect(page.locator('#game-dialog-control')).toContainText('초생');
    await expect(page.locator('#game-dialog-control')).toContainText('구리 260');
    await page.locator('#game-dialog-cancel').click();
    expect(await page.evaluate(()=>game.underworldRunes.enhanceLvByNo[1]||0)).toBe(0);
    await button.click();await page.locator('#game-dialog-control').getByRole('button',{name:/초생/}).click();
    const hp=await page.evaluate(()=>getPlayerStats().maxHp);
    await page.locator('#game-dialog-confirm').click();
    expect(await page.evaluate(()=>game.underworldRunes.enhanceLvByNo[1])).toBe(1);
    expect(await page.evaluate(()=>game.currencies.underCopper)).toBe(9740);
    expect(await page.evaluate(()=>getPlayerStats().maxHp)).toBeGreaterThanOrEqual(hp);
    await button.click();await page.evaluate(()=>{game.woodsmanBuildLock={};});
    await page.locator('#game-dialog-confirm').click();
    expect(await page.evaluate(()=>game.currencies.underCopper)).toBe(9740);
    await page.evaluate(()=>{game.woodsmanBuildLock=null;});
    await button.click();await page.evaluate(()=>{game.underworldRunes=JSON.parse(JSON.stringify(game.underworldRunes));});
    await page.locator('#game-dialog-confirm').click();
    expect(await page.evaluate(()=>game.currencies.underCopper)).toBe(9740);
});

test('rune growth changes actual equipped resistance and rerolls only earned bonuses',async({page})=>{
    await openUnderworld(page);
    const before=await page.evaluate(()=>{
        game.underworldRunes.equippedRunes=[6,null,null,null,null,null];
        game.underworldRunes.obtainedRunes=[];performUpdateStaticUI();return getPlayerStats().resF;
    });
    await page.getByRole('button',{name:'룬 강화 수치 성장',exact:true}).click();
    await expect(page.locator('#game-dialog-control')).toContainText('화관');
    await page.locator('#game-dialog-confirm').click();
    expect(await page.evaluate(()=>getPlayerStats().resF)).toBeCloseTo(before+0.03,6);
    await expect(page.locator('.underworld-rune-slot').first()).toContainText('+1');
    await page.evaluate(()=>{game.underworldRunes.enhanceLvByNo[6]=5;game.underworldRunes.bonusLinesByNo[6]=[{stat:'flatHp',val:5}];performUpdateStaticUI();});
    const currencies=await page.evaluate(()=>({...game.currencies}));
    await page.getByRole('button',{name:'옵션 리롤 추가 옵션 변경',exact:true}).click();
    await expect(page.locator('#game-dialog-control')).toContainText('구리 730');
    await page.locator('#game-dialog-confirm').click();
    const after=await page.evaluate(()=>({c:game.currencies,lines:game.underworldRunes.bonusLinesByNo[6],level:game.underworldRunes.enhanceLvByNo[6]}));
    expect(after.c.underCopper).toBe(currencies.underCopper-730);expect(after.c.runeShard).toBe(currencies.runeShard);
    expect(after.lines).toHaveLength(1);expect(after.level).toBe(5);
    expect(await page.evaluate(()=>{
        game.woodsmanBuildLock={};const before=JSON.stringify([game.underworldRunes,game.currencies]);
        craftUnderworldRune();equipUnderworldRuneToSlot(0,2);unequipUnderworldRuneSlot(0);upgradeUnderworldRune(2);
        return before===JSON.stringify([game.underworldRunes,game.currencies]);
    })).toBe(true);
});

test('rune pickers contain keyboard focus and return to their trigger',async({page},info)=>{
    await openUnderworld(page);
    const slot=page.locator('.underworld-rune-slot').first();await slot.click();
    const dialog=page.getByRole('dialog',{name:'룬 슬롯 1 선택',exact:true});
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button',{name:'닫기',exact:true})).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button',{name:'이 슬롯 해제',exact:true})).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button',{name:'닫기',exact:true})).toBeFocused();
    await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
    await expect(page.locator('#tab-map')).toBeVisible();await expect(slot).toBeFocused();
    await slot.click();await dialog.getByRole('button',{name:/화관/}).click();
    await expect(slot).toContainText('화관');await expect(slot).toBeFocused();
    const growth=page.getByRole('button',{name:'룬 승급 동일 룬 3개',exact:true});await growth.click();
    const picker=page.getByRole('dialog',{name:'룬 승급 대상 선택',exact:true});
    await expect(picker).toBeVisible();
    if(info.project.use.isMobile)await expect(page.locator('#info-tooltip')).toBeHidden();
    await page.waitForFunction(()=>mobileToastQueue.length===0&&mobileToastActiveCount===0);
    await page.screenshot({path:info.outputPath('rune-upgrade-picker.png')});
    await picker.getByRole('button',{name:/절단.*×3/}).click();
    await expect(picker).toHaveCount(0);await expect(growth).toBeFocused();
    expect(await page.evaluate(()=>game.currencies.runeShard)).toBe(9995);
    expect(await page.evaluate(()=>game.underworldRunes.equippedRunes.slice(0,2))).toEqual([6,3]);
    expect(await page.evaluate(()=>game.underworldRunes.obtainedRunes)).toEqual([1]);
});

test('invalid rune indices cannot silently change the first slot',async({page})=>{
    await openUnderworld(page);
    expect(await page.evaluate(()=>{
        game.underworldRunes.obtainedRunes=[1,1,1,2,2,2,6];
        const before=JSON.stringify(game.underworldRunes);
        for(const index of [-1,0.5,NaN,null,undefined,6]) {
            equipUnderworldRuneToSlot(index,2);unequipUnderworldRuneSlot(index);
        }
        for(const no of [-1,0,NaN,null,undefined,2.5])equipUnderworldRuneToSlot(0,no);
        for(const no of [-1,0,NaN,1.5])upgradeUnderworldRune(no);
        return before===JSON.stringify(game.underworldRunes);
    })).toBe(true);
});
