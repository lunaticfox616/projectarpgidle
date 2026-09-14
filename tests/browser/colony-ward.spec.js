const {test,expect}=require('@playwright/test');

async function openWards(page) {
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.combatHalted=true;
        game.season=15;game.loopCount=14;game.maxZoneId=29;game.level=100;game.currentZoneId=8;
        game.seenTutorials.push(...Object.keys(TUTORIAL_GUIDES));
        game.seenTutorials.push(...STORY_JOURNAL_SCENES.map(scene=>'story_'+scene.id));
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        game.colony.wardSlots=1;game.colony.wardSlotVersion=1;
        game.colony.wardEquipped=[{id:'equipped',stat:'poisonDamageReducePct',val:3,name:'중독 감소'},null,null,null];
        game.colony.wardInventory=[{id:'fire',stat:'fireTakenDamageReducePct',val:8,name:'화염 감소'},
            {id:'regen',stat:'regenFlat',val:8,name:'생명력 재생'},
            {id:'shield',stat:'energyShieldRegen',val:10,name:'보호막 회복',locked:true}];
        game.currencies.colonyShard=25;game.currencies.colonyTrace=1;
        switchTab('tab-talisman');switchTalismanSubtab('talisman-sub-colony-ward');
        performUpdateStaticUI();
    });
    await page.waitForFunction(()=>{
        if(uiRefreshQueued||uiRefreshRunning)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
    await expect(page.locator('#ui-colony-ward-talisman-panel')).toBeVisible();
    return page.locator('#ui-colony-ward-talisman-panel');
}

test('ward search retains focus and units through refresh; both themes stay readable',async({page},info)=>{
    const panel=await openWards(page);
    await expect(panel.locator('.colony-ward-total')).toHaveText('받는 중독 피해 감소 +3%');
    const input=panel.getByPlaceholder('액막이 옵션 검색 (이름/옵션/수치)');
    await input.pressSequentially('화염');
    await expect(input).toBeFocused();
    await expect(panel.locator('.colony-ward-chip')).toHaveCount(1);
    await expect(panel.locator('.colony-ward-chip>strong')).toHaveText('받는 화염 피해 감소 +8%');
    expect(await input.evaluate(el=>{
        const before=el;game.currencies.colonyShard++;performUpdateStaticUI();
        return before===document.querySelector('input[data-search-key="colonyWard"]');
    })).toBe(true);
    await expect(input).toBeFocused();
    await panel.getByRole('button',{name:'검색어 리셋'}).click();
    await expect(input).toHaveValue('');
    await expect(panel.locator('.colony-ward-chip')).toHaveCount(3);
    await expect(panel.locator('[data-ward-id="shield"] strong')).toHaveText('에너지 보호막 회복속도 +10%');
    await expect(panel.locator('[data-ward-id="regen"] strong')).toHaveText('초당 생명력 재생 +8');
    const reset=panel.getByRole('button',{name:'검색어 리셋'});
    await reset.focus();await page.evaluate(()=>performUpdateStaticUI());await expect(reset).toBeFocused();
    for(const light of [false,true]) {
        await page.evaluate(light=>applyThemeMode(light?'light':'dark'),light);
        await expect(page.locator('#game-toast-region .game-toast, .mobile-log-toast')).toHaveCount(0);
        await panel.getByRole('heading',{name:'군락지 액막이',exact:true}).scrollIntoViewIfNeeded();
        await page.screenshot({path:info.outputPath(`wards-top-${light?'light':'dark'}.png`)});
        await panel.locator('[data-ward-id="shield"]').scrollIntoViewIfNeeded();
        await page.screenshot({path:info.outputPath(`wards-bottom-${light?'light':'dark'}.png`)});
        expect(await panel.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(2);
    }
    await input.fill('없는 옵션');
    await expect(panel.getByRole('button',{name:'검색 항목 해체',exact:true})).toBeDisabled();
    await expect(panel).toContainText('검색 조건에 맞는 액막이가 없습니다.');
});

test('full wards replace chosen slot, preserve old item and apply actual stats',async({page})=>{
    const panel=await openWards(page);
    const before=await page.evaluate(()=>({poison:getPlayerStats().poisonDamageReducePct,fire:getPlayerStats().fireTakenDamageReducePct}));
    const replace=panel.locator('[data-ward-id="fire"]').getByRole('button',{name:'교체',exact:true});
    await replace.click();await expect(page.locator('#game-dialog-title')).toHaveText('액막이 교체');
    await page.locator('#game-dialog-cancel').click();
    expect(await page.evaluate(()=>game.colony.wardEquipped[0].id)).toBe('equipped');
    await replace.click();await page.locator('#game-dialog-control').getByRole('button',{name:/슬롯 1/}).click();
    await expect(panel.locator('[data-ward-slot="0"]')).toContainText('받는 화염 피해 감소 +8%');
    const after=await page.evaluate(()=>({poison:getPlayerStats().poisonDamageReducePct,fire:getPlayerStats().fireTakenDamageReducePct,
        ids:game.colony.wardInventory.map(w=>w.id).sort(),locked:game.colony.wardInventory.find(w=>w.id==='shield').locked}));
    expect(after).toEqual({poison:before.poison-3,fire:before.fire+8,ids:['equipped','regen','shield'],locked:true});
    await panel.getByRole('button',{name:'슬롯 확장',exact:true}).click();
    expect(await page.evaluate(()=>[game.colony.wardSlots,game.currencies.colonyShard])).toEqual([2,0]);
    await panel.locator('[data-ward-id="regen"]').getByRole('button',{name:'장착',exact:true}).click();
    await expect(panel.locator('[data-ward-slot="1"]')).toContainText('초당 생명력 재생 +8');
    await panel.locator('[data-ward-slot="0"]').getByRole('button',{name:'해제',exact:true}).click();
    expect(await page.evaluate(()=>game.colony.wardInventory.map(w=>w.id).sort())).toEqual(['equipped','fire','shield']);
    expect(await page.evaluate(()=>{
        const state=s=>[s.colony.wardEquipped,s.colony.wardInventory.map(w=>({...w,locked:!!w.locked})),s.colony.wardSlots,s.currencies.colonyShard];
        const before=JSON.stringify(state(game));
        const restored=mergeDefaults(JSON.parse(serializeSaveState(game)));
        return before===JSON.stringify(state(restored));
    })).toBe(true);
});

test('ward dialogs revalidate locks and destination; build lock blocks ward changes',async({page})=>{
    const panel=await openWards(page);
    await panel.locator('[data-ward-id="fire"]').getByRole('button',{name:'교체',exact:true}).click();
    await page.evaluate(()=>{game.colony.wardEquipped[0]={id:'changed',stat:'flatHp',val:100};});
    await page.locator('#game-dialog-control').getByRole('button',{name:/슬롯 1/}).click();
    expect(await page.evaluate(()=>game.colony.wardEquipped[0].id)).toBe('changed');
    await panel.getByRole('button',{name:'검색 항목 해체',exact:true}).click();
    await page.evaluate(()=>{game.colony.wardInventory.find(w=>w.id==='fire').locked=true;});
    await page.locator('#game-dialog-confirm').click();
    await expect(panel.locator('[data-ward-id="regen"]')).toHaveCount(0);
    expect(await page.evaluate(()=>[game.colony.wardInventory.map(w=>w.id),game.currencies.colonyShard])).toEqual([['fire','shield'],26]);
    expect(await page.evaluate(()=>{
        game.woodsmanBuildLock={};const before=JSON.stringify([game.colony,game.currencies]);
        equipColonyWardById('fire',0);unequipColonyWard(0);unlockColonyWardSlot();dismantleColonyWardById('fire');
        const same=before===JSON.stringify([game.colony,game.currencies]);game.woodsmanBuildLock=null;return same;
    })).toBe(true);
    await expect(panel.getByRole('button',{name:'검색 항목 해체',exact:true})).toBeDisabled();
});

test('colony battle gauge counts kills and resets on return to a normal region',async({page})=>{
    await openWards(page);
    const counts=await page.evaluate(()=>{
        startColonyRun();game.colony.kills=3;updateCombatUI(getPlayerStats());
        return [document.getElementById('ui-progress-label').textContent,document.getElementById('ui-move-time-text').textContent,game.colony.requiredKills,
            document.getElementById('ui-move-bar').style.width];
    });
    expect(counts[0]).toBe('1웨이브');expect(counts[1]).toBe(`3/${counts[2]} 처치`);
    expect(parseFloat(counts[3])).toBeCloseTo(3/counts[2]*100,3);
    const normal=await page.evaluate(()=>{forfeitColonyRun();updateCombatUI(getPlayerStats());return document.getElementById('ui-progress-label').textContent;});
    expect(normal).not.toContain('웨이브');
});

test('pending salvage cannot cross a build lock or a restored character',async({page})=>{
    const panel=await openWards(page);
    const before=await page.evaluate(()=>JSON.stringify([game.colony.wardInventory,game.currencies.colonyShard]));
    await panel.getByRole('button',{name:'검색 항목 해체',exact:true}).click();
    await page.evaluate(()=>{game.woodsmanBuildLock={};});
    await page.locator('#game-dialog-confirm').click();
    expect(await page.evaluate(()=>JSON.stringify([game.colony.wardInventory,game.currencies.colonyShard]))).toBe(before);
    await page.evaluate(()=>{game.woodsmanBuildLock=null;performUpdateStaticUI();});
    await panel.getByRole('button',{name:'검색 항목 해체',exact:true}).click();
    await page.evaluate(()=>{game.colony=JSON.parse(JSON.stringify(game.colony));});
    await page.locator('#game-dialog-confirm').click();
    expect(await page.evaluate(()=>JSON.stringify([game.colony.wardInventory,game.currencies.colonyShard]))).toBe(before);
    expect(await page.evaluate(()=>{
        const before=JSON.stringify(game.colony);
        for(const slot of [-1,4,0.5,'0'])equipColonyWardById('fire',slot);
        equipColonyWardById('missing',0);return before===JSON.stringify(game.colony);
    })).toBe(true);
});
