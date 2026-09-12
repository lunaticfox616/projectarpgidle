const {test,expect}=require('@playwright/test');

async function openInventory(page) {
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        game.settings.autoEquipEmptySlots=false;game.inventory=[];
        const random=Math.random;
        try{
            Math.random=createSeededRng(17);
            for(let i=0;i<18;i++){
                const item=generateEquipmentDrop({isBoss:true},{minimumRarity:'rare'});
                item.id=99500+i;game.inventory.push(item);
            }
        }finally{Math.random=random;}
        // Selection tests need a usable body item, independent of the random drop pool order.
        game.inventory[0]=createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='갑옷'&&base.reqTier===1),'rare',1);
        game.inventory[0].id=99500;
        switchTab('tab-items');
        if(matchMedia('(max-width:1080px)').matches)setEquipmentMobilePane('inventory');
        updateStaticUI();
    });
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);});
}

test('equipment analysis supports cancellation, restart and build invalidation', async ({page}, info) => {
    await openInventory(page);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const toolbar = page.locator('#ui-equipment-triage');
    await toolbar.scrollIntoViewIfNeeded();
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    await toolbar.getByRole('button', {name:'일괄 분석', exact:true}).click();
    const cancel = toolbar.getByRole('button', {name:'분석 중단', exact:true});
    await expect(cancel).toBeVisible();
    const box = await cancel.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x+box.width).toBeLessThanOrEqual(page.viewportSize().width);
    await cancel.click();
    await expect(toolbar).toContainText('분석을 중단했습니다.');
    await toolbar.getByRole('button', {name:'다시 분석', exact:true}).click();
    await page.clock.runFor(1500);
    await expect(toolbar).toContainText('18개 완료');
    await expect(toolbar.getByRole('combobox')).toBeEnabled();
    await page.screenshot({path:info.outputPath('equipment-analysis.png')});
    await page.evaluate(() => {game.level += 1; equipmentTriage.sync(true);});
    await expect(toolbar).toContainText('세팅이 변경되어');
    await expect(toolbar.getByRole('button', {name:'추천 교체', exact:true})).toBeDisabled();
    expect(errors).toEqual([]);
});

test('equipment hover shows details first, replaces comparison safely, and yields to selection', async ({page}, info) => {
    await openInventory(page);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const card = page.locator('.equipment-grid-item').first();
    await card.scrollIntoViewIfNeeded();
    const tooltip = page.locator('#item-tooltip-box');
    if (info.project.use.isMobile) {
        await card.tap();
        await expect(page.locator('#ui-equipment-inventory-inspector')).toBeVisible();
        await expect(tooltip).toBeHidden();
        return;
    }
    const initial = await card.evaluate(el => {
        const rect = el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent('pointerover', {bubbles:true,pointerType:'mouse',clientX:rect.x+4,clientY:rect.y+4}));
        const box = document.getElementById('item-tooltip-box');
        return {visible:box.style.display === 'block', text:box.textContent, comparing:box.querySelectorAll('.item-compare-panel').length};
    });
    expect(initial.visible).toBe(true);
    expect(initial.text.length).toBeGreaterThan(0);
    expect(initial.comparing).toBe(0);
    await expect(tooltip).toContainText('착용 시 변화');
    await page.screenshot({path:info.outputPath('equipment-hover-compare.png')});
    await card.hover();
    const other = page.locator('.equipment-grid-item').nth(1);
    await other.hover();
    const name = await other.evaluate(el => game.inventory.find(item => equipmentInventoryGridRuntime.getItemKey(item) === el.dataset.equipmentGridKey).name);
    await expect(tooltip.locator('.tooltip-title').first()).toContainText(name);
    await other.click();
    await expect(tooltip).toBeHidden();
    await expect(page.locator('#ui-equipment-inventory-inspector')).toBeVisible();
    await expect(page.locator('#ui-equipment-inventory-inspector')).not.toContainText('계산 중');
    expect(errors).toEqual([]);
});

test('selected equipment actions stay reachable through loot refresh and dismissal',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await openInventory(page);
    const target=await page.locator('.equipment-grid-item').evaluateAll(cards=>cards
        .map(card=>({key:card.dataset.equipmentGridKey,y:card.getBoundingClientRect().y,x:card.getBoundingClientRect().x}))
        .sort((a,b)=>a.y-b.y||a.x-b.x)[0].key);
    const card=page.locator(`[data-equipment-grid-key="${target}"]`);
    await card.scrollIntoViewIfNeeded();
    const before=await card.boundingBox();
    if(info.project.use.isMobile)await card.tap();else await card.click();
    const inspector=page.locator('#ui-equipment-inventory-inspector');
    const equip=inspector.getByRole('button',{name:'장착',exact:true});
    await expect(inspector).toBeVisible();
    const assertReachable=async()=>{
        const box=await equip.boundingBox();
        const limit=await page.evaluate(()=>{
            const nav=document.querySelector('#tab-header-bottom');
            return nav?.getClientRects().length?nav.getBoundingClientRect().top:innerHeight;
        });
        expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(limit);
        await equip.click({trial:true});
    };
    await assertReachable();
    expect((await card.boundingBox()).y).toBeCloseTo(before.y,0);
    await page.screenshot({path:info.outputPath('equipment-selected.png')});
    await inspector.getByRole('button',{name:'잠금',exact:true}).click();
    await expect(inspector.getByRole('button',{name:'해체',exact:true})).toBeDisabled();
    await assertReachable();
    await page.evaluate(()=>{
        game.inventory.push(generateEquipmentDrop({isBoss:true},{minimumRarity:'rare'}));updateStaticUI();
    });
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    await expect(card).toHaveAttribute('aria-pressed','true');
    await expect(inspector.getByRole('button',{name:'해체',exact:true})).toBeDisabled();
    await assertReachable();
    const close=inspector.getByRole('button',{name:'선택 닫기',exact:true});
    if(info.project.use.isMobile)await close.tap();else await close.click();
    await expect(inspector).toBeHidden();
    await expect(card).toHaveAttribute('aria-pressed','false');
    if(!info.project.use.isMobile)await page.mouse.move(0,0);
    await expect(page.locator('#item-tooltip-box')).toBeHidden();
    await expect(page.locator('#tab-items')).toBeVisible();
    await card.click();await assertReachable();await equip.click();
    await expect(card).toHaveCount(0);
    await expect(inspector).toBeHidden();
    const equipped=await page.evaluate(key=>Object.values(game.equipment).some(item=>item&&equipmentInventoryGridRuntime.getItemKey(item)===key),target);
    expect(equipped).toBe(true);expect(errors).toEqual([]);
});

test('equipped gear opens adjacent actions and supports crafting and unequip',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await openInventory(page);
    const item=await page.evaluate(()=>{
        game.season=5;contentProgression.sync();game.contentProgression.inherited=['craft'];contentProgression.sync();
        const item=game.inventory.find(item=>item.slot==='갑옷');
        equipItemById(item.id);setEquipmentMobilePane('loadout');updateStaticUI();
        delete item.instanceId;
        return {id:item.id,key:equipmentInventoryGridRuntime.getItemKey(item)};
    });
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    const slot=page.locator('#ui-equip-list .equipment-slot[data-slot="갑옷"]');
    const visual=slot.locator('.equipment-slot-visual');
    const menu=page.locator('#ui-equipment-inventory-inspector');
    const select=async()=>{if(info.project.use.isMobile)await visual.tap();else await visual.click();};
    await select();await expect(menu).toBeVisible();
    const anchor=await slot.boundingBox(),box=await menu.boundingBox(),view=page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(view.width);
    expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(view.height);
    expect(box.x>=anchor.x+anchor.width||box.x+box.width<=anchor.x||box.y>=anchor.y+anchor.height||box.y+box.height<=anchor.y).toBe(true);
    await expect(menu.getByRole('button',{name:'해체',exact:true})).toHaveCount(0);
    await page.evaluate(()=>updateStaticUI());
    await expect(slot).toHaveClass(/is-menu-selected/);
    await page.screenshot({path:info.outputPath('equipped-menu.png')});
    await menu.getByRole('button',{name:'제작',exact:true}).click();
    await expect(page.locator('#item-tab-craft')).toBeVisible();await expect(menu).toBeHidden();
    expect(await page.evaluate(()=>({ref:getCraftSelectionRefLocal(),equipped:isCraftSelectionEquipAvailableLocal()}))).toEqual({ref:'갑옷',equipped:true});
    await page.evaluate(()=>{switchItemSubtab('item-tab-equip');setEquipmentMobilePane('loadout');});
    await select();await menu.getByRole('button',{name:'장착 해제',exact:true}).click();
    await expect(menu).toBeHidden();await expect(slot).toHaveClass(/equipment-slot-empty/);
    expect(await page.evaluate(id=>game.inventory.filter(item=>item.id===id).length,item.id)).toBe(1);
    expect(errors).toEqual([]);
});

test('edge placement stays on screen at adjusted scale and dismissal preserves double click',async({page},info)=>{
    await openInventory(page);
    if(!info.project.use.isMobile)await page.evaluate(()=>uiDisplay.apply(125));
    const key=await page.locator('.equipment-grid-item').evaluateAll(cards=>cards
        .map(card=>({key:card.dataset.equipmentGridKey,x:card.getBoundingClientRect().right}))
        .sort((a,b)=>b.x-a.x)[0].key);
    const card=page.locator(`[data-equipment-grid-key="${key}"]`);
    await card.scrollIntoViewIfNeeded();
    if(info.project.use.isMobile)await card.tap();else await card.click();
    const menu=page.locator('#ui-equipment-inventory-inspector');
    await expect(menu).toBeVisible();
    const box=await menu.boundingBox(),view=page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(view.width);
    expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(view.height);
    await menu.getByRole('button',{name:'장착',exact:true}).click({trial:true});
    await page.mouse.click(2,2);
    await expect(menu).toBeHidden();await expect(page.locator('#tab-items')).toBeVisible();
    await card.dblclick();await expect(card).toHaveCount(0);await expect(menu).toBeHidden();
    expect(await page.evaluate(key=>Object.values(game.equipment).some(item=>item&&equipmentInventoryGridRuntime.getItemKey(item)===key),key)).toBe(true);
});

test('comparison stays inside the selection window and preserves equipment until equip',async({page},info)=>{
    await openInventory(page);
    const target=await page.evaluate(()=>{
        const item=game.inventory.find(item=>item.slot==='갑옷');
        const old=structuredClone(item);old.id=99650;delete old.instanceId;
        old.name='비교용 현재 갑옷';old.stats=[];game.inventory.push(old);equipItemById(old.id);
        updateStaticUI();
        return {key:equipmentInventoryGridRuntime.getItemKey(item),equipment:JSON.stringify(game.equipment)};
    });
    await page.waitForFunction(()=>!uiRefreshRunning&&!uiRefreshQueued);
    const card=page.locator(`[data-equipment-grid-key="${target.key}"]`);
    if(info.project.use.isMobile)await card.tap();else await card.click();
    const menu=page.locator('#ui-equipment-inventory-inspector');
    const details=menu.locator('.equipment-inspection-details');
    await expect(menu.locator('.equipment-inspection-column')).toHaveCount(2);
    await expect(menu).toContainText('비교용 현재 갑옷');
    await expect(menu.locator('.equipment-inspection-changes')).not.toContainText('계산 중');
    await expect(page.locator('#item-tooltip-box')).toBeHidden();
    expect(await page.evaluate(()=>JSON.stringify(game.equipment))).toBe(target.equipment);
    const equip=menu.getByRole('button',{name:'장착',exact:true});
    const before=await equip.boundingBox();
    const region=await details.boundingBox();
    expect(region.y).toBeGreaterThanOrEqual(before.y+before.height);
    await details.evaluate(el=>{el.scrollTop=el.scrollHeight;});
    expect((await equip.boundingBox()).y).toBeCloseTo(before.y,0);
    await page.screenshot({path:info.outputPath('comparison-scroll.png')});
    await equip.click();
    await expect(page.locator('#ui-equip-list [data-slot="갑옷"]')).toHaveClass(/equipment-just-equipped/);
    await expect(menu).toBeHidden();
});
