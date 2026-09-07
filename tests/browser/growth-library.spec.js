const {test,expect}=require('@playwright/test');
test('growth search covers all items and pages preserve target identities and boundaries',async({page},info)=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://**',r=>r.fulfill({status:204,body:''}));await page.goto('/');
    await page.locator('#btn-startup-guest').click();await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    const ids=await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;game.season=30;contentProgression.sync();
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();syncGrowthBoardUnlocks({silent:true});
        const base=GROWTH_BASE_DB.find(row=>row.category==='flower');
        game.growthInventory=Array.from({length:13},(_,i)=>({...createGrowthItemFromBase(base,'normal',12),name:i===12?'끝 조각':'생장 꽃 '+i}));
        game.growthInventory[12].baseStats=[{id:'flatHp',statName:'최대 생명력',val:777}];
        openTabPane('tab-growthboard');updateStaticUI();return game.growthInventory.map(item=>item.id);
    });
    await page.waitForFunction(()=>{if(uiRefreshRunning||uiRefreshQueued)return false;tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;});
    if(info.project.use.isMobile)await page.getByRole('tab',{name:'보관함',exact:true}).click();
    const cards=page.locator('#ui-growth-inventory .growth-item-card'), nav=page.getByRole('navigation',{name:'생장 보관함 페이지',exact:true});
    await expect(cards).toHaveCount(info.project.use.isMobile?6:13);
    if(info.project.use.isMobile){await nav.getByRole('button',{name:'다음',exact:true}).click();await expect(nav).toContainText('2 / 3');}
    const lockTarget=info.project.use.isMobile?cards.first():cards.nth(6);
    await lockTarget.getByRole('button',{name:'잠금',exact:true}).click();
    expect(await page.evaluate(id=>findGrowthItemById(id).locked,ids[6])).toBe(true);
    const filters=page.locator('.growth-library-controls');
    if(info.project.use.isMobile)await filters.locator('summary').click();
    await filters.getByRole('button',{name:/꽃 13/}).click();await expect(cards).toHaveCount(0);
    await expect(filters).toHaveAttribute('open','');
    await filters.getByRole('button',{name:/꽃 13/}).click();await expect(cards).toHaveCount(info.project.use.isMobile?6:13);
    const search=page.locator('input[data-search-key="growth"]');
    await search.fill('끝 조각');await expect(cards).toHaveCount(1);await expect(cards.first()).toContainText('끝 조각');
    const input=await search.elementHandle();await page.evaluate(()=>updateStaticUI());
    expect(await input.evaluate(el=>el.isConnected)).toBe(true);
    await search.fill('777');await expect(cards).toHaveCount(1);
    await cards.first().getByRole('button',{name:'배치',exact:true}).click();
    const target=await page.evaluate(id=>{
        for(let y=0;y<GROWTH_BOARD_H;y++)for(let x=0;x<GROWTH_BOARD_W;x++)if(planGrowthPlacement(id,x,y,0).ok)return{x,y};
        throw new Error('No legal target');
    },ids[12]);
    await page.locator(`#ui-growth-board [data-x="${target.x}"][data-y="${target.y}"]`).click();
    expect(await page.evaluate(id=>!!getActiveGrowthLoadout().placements[id],ids[12])).toBe(true);
    if(info.project.use.isMobile)await page.getByRole('tab',{name:'보관함',exact:true}).click();
    await cards.first().getByRole('button',{name:'내리기',exact:true}).click();
    await search.fill('없는결과');await expect(cards).toHaveCount(0);await expect(nav).toBeHidden();
    await search.fill('');await expect(cards).toHaveCount(info.project.use.isMobile?6:13);
    if(info.project.use.isMobile){await nav.getByRole('button',{name:'다음',exact:true}).click();await nav.getByRole('button',{name:'다음',exact:true}).click();await expect(cards).toHaveCount(1);}
    await cards.last().getByRole('button',{name:'해체',exact:true}).click();
    await expect(cards).toHaveCount(info.project.use.isMobile?6:12);
    expect(await page.evaluate(id=>findGrowthItemById(id),ids[12])).toBe(null);
    if(info.project.use.isMobile){await expect(nav).toContainText('2 / 2');await expect(nav.getByRole('button',{name:'다음',exact:true})).toBeDisabled();}
    expect(await page.evaluate(id=>findGrowthItemById(id).locked,ids[6])).toBe(true);
    await page.evaluate(()=>{game.growthInventory=[];updateStaticUI();});await expect(cards).toHaveCount(0);await expect(nav).toBeHidden();
    await expect(page.locator('#ui-growth-inventory')).toContainText('보관 중인 생장 아이템이 없습니다.');
    expect(errors).toEqual([]);
});
