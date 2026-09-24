const { test, expect } = require('@playwright/test');
async function setup(page) {
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error'&&/crafting.*failed/i.test(message.text()))errors.push(message.text());});
    page.craftingErrors=errors;
    await page.route('https://**', route => route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle=null;
        game.season=30; game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
        const item=createItemFromBase(BASE_ITEM_DB.find(row=>row.slot==='무기'),'rare',12);
        item.stats=[{id:'flatDmg',statName:'기본 피해',val:10,valMin:8,valMax:12,tier:1}];
        game.inventory=[item];
        Object.assign(game.currencies,{formlessDew:50,sapBud:50,blightSpore:50,goldenRule:50,sporeFire:500,fossilJagged:10});
        openTabPane('tab-items');switchItemSubtab('item-tab-craft');selectForCrafting(item.id,false);updateStaticUI();
    });
    await settle(page);
}
async function settle(page) {
    await page.waitForFunction(() => {
        if(uiRefreshRunning||uiRefreshQueued)return false;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);return true;
    });
}
test.afterEach(async({page})=>{expect(page.craftingErrors||[]).toEqual([]);});

test('goal hit consumes once and requires acknowledgement before another craft',async({page})=>{
    await setup(page);
    await page.locator('#cl-mode').selectOption('fire');
    const stat=await page.evaluate(()=>{
        Math.random=()=>0;
        const row=equipmentCrafting.filterSporeMods(getAvailableMods({...getSelectedCraftItem(),stats:[]}),'fire')[0];return row.statId||row.id;
    });
    await page.locator('#cl-goal-stat').selectOption(stat);
    await page.getByRole('button',{name:/1회 사용$/}).click();
    await expect(page.locator('.cl-goal-dialog')).toBeVisible();
    expect(await page.evaluate(()=>game.currencies.formlessDew)).toBe(49);
    await page.keyboard.press('Escape');
    await expect(page.locator('.cl-goal-dialog')).toBeVisible();
    const confirm=page.locator('.cl-goal-dialog button');await expect(confirm).toBeEnabled();await confirm.click();
    await expect(page.locator('.cl-goal-dialog')).not.toBeVisible();
    expect(await page.evaluate(()=>game.currencies.formlessDew)).toBe(49);
    await expect(page.locator('.cl-affixes .cl-goal-match').first()).toBeVisible();
});

test('automatic crafting stops at goal and leaving the workspace prevents further consumption',async({page})=>{
    await setup(page);
    await page.locator('#cl-mode').selectOption('fire');
    const stat=await page.evaluate(()=>{Math.random=()=>0;const row=equipmentCrafting.filterSporeMods(getAvailableMods({...getSelectedCraftItem(),stats:[]}),'fire')[0];return row.statId||row.id;});
    await page.locator('#cl-goal-stat').selectOption(stat);
    await page.getByRole('button',{name:'목표까지 자동 사용',exact:true}).click();
    await expect(page.locator('.cl-goal-dialog')).toBeVisible();
    expect(await page.evaluate(()=>game.currencies.formlessDew)).toBe(49);
    const confirm=page.locator('.cl-goal-dialog button');await expect(confirm).toBeEnabled();await confirm.click();
    await expect(page.locator('.cl-goal-dialog')).not.toBeVisible();
    await page.evaluate(()=>{game.inventory[0].stats=[{id:'flatDmg',val:10,tier:1}];updateStaticUI();});await settle(page);
    await page.getByRole('button',{name:'목표까지 자동 사용',exact:true}).click();
    await page.evaluate(()=>switchItemSubtab('item-tab-equip'));
    await page.waitForTimeout(900);
    expect(await page.evaluate(()=>game.currencies.formlessDew)).toBe(49);
});

test('automatic use respects its count limit and the available materials',async({page})=>{
    await setup(page);
    await page.locator('#cl-mode').selectOption('fire');
    await page.evaluate(()=>{Math.random=()=>0;});
    await page.locator('#cl-goal-stat').selectOption('fireFlatDmg');
    await page.locator('#cl-goal-tier').selectOption('12');
    await page.locator('#cl-limit').fill('2');await page.locator('#cl-limit').press('Tab');
    await page.getByRole('button',{name:'목표까지 자동 사용',exact:true}).click();
    await expect(page.locator('.cl-result')).toContainText('설정한 2회를 모두 사용');
    expect(await page.evaluate(()=>game.currencies.formlessDew)).toBe(48);
    await page.waitForTimeout(600);expect(await page.evaluate(()=>game.currencies.formlessDew)).toBe(48);
    await page.evaluate(()=>{game.currencies.formlessDew=1;updateStaticUI();});await settle(page);
    await page.getByRole('button',{name:'목표까지 자동 사용',exact:true}).click();
    await expect(page.locator('[data-command="craft"]')).toBeDisabled();
    expect(await page.evaluate(()=>game.currencies.formlessDew)).toBe(0);
    await page.waitForTimeout(600);expect(await page.evaluate(()=>game.currencies.formlessDew)).toBe(0);
});
