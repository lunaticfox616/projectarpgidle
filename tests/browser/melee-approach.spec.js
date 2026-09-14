const {test,expect}=require('@playwright/test');

test('melee reaches and kills enemies in the formerly oscillating formation',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/tests/fixtures/world-tree-journey/index.html?review=regions');
    const start=page.getByRole('button',{name:'근접 접근 재현',exact:true});
    await expect(start).toBeEnabled({timeout:45000});await start.click();
    const frame=page.frameLocator('#game');
    await expect(page.locator('#status')).toContainText('멈춤 좌표 재현');
    await expect.poll(async()=>{
        return frame.locator('#ui-move-time-text').innerText();
    },{timeout:20000}).toMatch(/^[1-9]\d*\/13 처치$/);
    await page.screenshot({path:info.outputPath('melee-resumes.png')});
    expect(errors).toEqual([]);
});
