const {test,expect}=require('@playwright/test');

test('melee walks to a frozen colony pack and kills',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/tests/fixtures/world-tree-atlas/index.html?review=regions');
    const start=page.getByRole('button',{name:'근접 접근 재현',exact:true});
    await expect(start).toBeEnabled({timeout:45000});await start.click();
    const frame=page.frameLocator('#game');
    await expect(page.locator('#status')).toContainText('멈춤 좌표 재현');
    await expect.poll(async()=>{
        return frame.locator('#ui-move-time-text').innerText();
    },{timeout:30000}).toMatch(/(^|, )[1-9]\d*\/\d+ 처치$/);   // the line reads "100%, 3/12 처치": life, then kills of the wave
    await page.screenshot({path:info.outputPath('melee-resumes.png')});
    expect(errors).toEqual([]);
});
