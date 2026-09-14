const {test,expect}=require('@playwright/test');

test('first-loop earned journals stay accessible beside records without spending points',async({page},info)=>{
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="occultist"]').click();
    await page.waitForFunction(()=>battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const before=await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        unlockJournalEntry('act_1');contentProgression.sync();updateStaticUI();
        return JSON.stringify([game.journalBonuses,game.journalBonusClaims,contentProgression.balance()]);
    });
    if(!await page.locator('#btn-tab-journal').isVisible())await page.locator('#btn-mobile-nav-more').click();
    await page.locator('#btn-tab-journal').click();
    const root=page.locator('#tab-journal');
    await root.getByRole('button',{name:'저널',exact:true}).click();
    await root.locator('[data-journal-entry="act_1"]').click();
    await expect(page.locator('#journal-reader')).toContainText('뿌리가 없다는 건');
    await page.locator('#journal-reader').getByRole('button',{name:'닫기',exact:true}).click();
    await root.getByRole('button',{name:'기록',exact:true}).click();
    await expect(page.locator('#ui-records-body')).toBeVisible();
    await root.getByRole('button',{name:'저널',exact:true}).click();
    await expect(root.locator('[data-journal-entry="act_1"]')).toBeVisible();
    await page.screenshot({path:info.outputPath('first-journal.png')});
    expect(await page.evaluate(()=>JSON.stringify([game.journalBonuses,game.journalBonusClaims,contentProgression.balance()]))).toBe(before);
    expect(await page.evaluate(()=>game.season)).toBe(1);
});

test('woodsman journal directs players to the actual chaos milestone',async({page})=>{
    await page.goto('/tests/fixtures/world-tree-journey/index.html?review=regions');
    await expect(page.locator('#status')).toContainText('실제 전투');
    const frame=page.frameLocator('#game');
    const child=page.frames().find(entry=>entry.parentFrame());
    await child.evaluate(()=>{
        game.combatHalted=true;game.journalEntries=['prologue',...Array.from({length:10},(_,i)=>'act_'+(i+1))];
        game.woodsmanSimulatorSeenLoop=false;switchTab('tab-journal');updateStaticUI();
    });
    const archive=frame.locator('#ui-journal-list');
    await archive.locator('[data-journal-conditions]').check();
    const card=archive.locator('.journal-card').filter({has:frame.getByText('나무꾼',{exact:true})});
    await expect(card).toContainText('혼돈 5층 클리어');
    await card.getByRole('button',{name:'혼돈 등반 보기',exact:true}).click();
    await expect(frame.locator('#map-explore-chaos')).toBeVisible();
    await expect(frame.locator('#map-explore-root-boss')).not.toBeVisible();
    expect(await child.evaluate(()=>game.journalEntries.includes('woodsman'))).toBe(false);
});

test('journal archive filters discovered records and closes illustrated reading inside sandbox',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/tests/fixtures/world-tree-journey/index.html?review=regions');
    await expect(page.locator('#status')).toContainText('실제 전투');
    const frame=page.frameLocator('#game');
    const child=page.frames().find(entry=>entry.parentFrame());
    const before=await child.evaluate(()=>{
        game.journalEntries=['prologue','act_9','woodsman'];updateStaticUI();
        return JSON.stringify(game.journalBonuses);
    });
    if(!await frame.locator('#btn-tab-journal').isVisible())await frame.locator('#btn-mobile-nav-more').click();
    await frame.locator('#btn-tab-journal').click();
    const archive=frame.locator('#ui-journal-list');
    await expect(archive.locator('.journal-card:visible')).toHaveCount(3);
    await expect(archive.locator('.journal-card.is-locked:visible')).toHaveCount(0);
    await archive.locator('[data-journal-filter="세계의 흔적"]').click();
    await expect(archive.locator('.journal-card:visible')).toHaveCount(1);
    await expect(archive.locator('.journal-card:visible')).toContainText('나무꾼');
    expect(await archive.locator('.journal-card:visible').evaluate(el=>el.getBoundingClientRect().width/el.parentElement.getBoundingClientRect().width)).toBeGreaterThan(0.95);
    await archive.locator('[data-journal-filter="전체"]').click();
    await archive.locator('[data-journal-entry="act_9"]').click();
    const reader=frame.locator('#journal-reader');
    await expect(reader.locator('img')).toHaveCount(2);
    await expect.poll(()=>reader.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
    expect(await reader.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    await page.screenshot({path:info.outputPath('illustrated-reader.png')});
    await reader.getByRole('button',{name:'닫기',exact:true}).click();
    await expect(reader).toHaveCount(0);
    await expect(archive.locator('[data-journal-entry="act_9"]')).toBeFocused();
    await archive.locator('[data-journal-conditions]').check();
    await expect(archive.locator('.journal-card.is-available:visible').first()).toBeVisible();
    await expect(archive.locator('.journal-card.is-prerequisite-locked:visible')).toHaveCount(0);
    await expect(archive.locator('.journal-card.is-hidden.is-locked:visible')).toHaveCount(0);
    await child.evaluate(()=>{game.journalEntries.push('act_1');updateStaticUI();});
    await expect(archive.locator('[data-journal-conditions]')).toBeChecked();
    await archive.locator('[data-journal-conditions]').uncheck();
    await expect(archive.locator('.journal-card:visible')).toHaveCount(4);
    await archive.locator('[data-journal-entry="act_1"]').click();
    await expect(reader.locator('.story-scene-copy')).toContainText('뿌리가 없다는 건');
    await reader.press('Escape');
    await expect(reader).toHaveCount(0);
    expect(await child.evaluate(()=>JSON.stringify(game.journalBonuses))).toBe(before);
    await page.screenshot({path:info.outputPath('journal-archive.png')});
    expect(errors).toEqual([]);
});

for (const batch of [0,1,2,3]) test(`collected journal batch ${batch+1} reads and closes without changing rewards`,async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/tests/fixtures/world-tree-journey/index.html?review=regions');
    await expect(page.locator('#status')).toContainText('실제 전투');
    const frame=page.frameLocator('#game');
    const child=page.frames().find(entry=>entry.parentFrame());
    const records=await child.evaluate(()=>{
        game.combatHalted=true;
        // Use actual acquisition so the background fixture cannot repair unpaid bonuses mid-read.
        JOURNAL_ENTRY_ORDER.forEach(id=>unlockJournalEntry(id));
        switchTab('tab-journal');updateStaticUI();
        return JOURNAL_ENTRY_ORDER.map(id=>({id,title:JOURNAL_DB[id].title,lastLine:JOURNAL_DB[id].lines.at(-1)}));
    });
    const before=await child.evaluate(()=>JSON.stringify([game.journalBonuses,game.journalBonusClaims,game.passivePoints,game.journalEntries]));
    const reader=frame.locator('#journal-reader');
    for(const record of records.filter((record,index)=>index%4===batch)) {
        const button=frame.locator(`[data-journal-entry="${record.id}"]`);
        await button.click();
        await expect(reader.locator('h2')).toHaveText(record.title);
        const lastParagraph=reader.locator('.story-scene-copy p').last();
        await lastParagraph.scrollIntoViewIfNeeded();
        await expect(lastParagraph).toHaveText(record.lastLine);
        await expect.poll(()=>reader.locator('img').evaluateAll(images=>images.every(image=>image.complete&&image.naturalWidth>0))).toBe(true);
        expect(await reader.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
        expect(await reader.locator('[data-journal-close]').evaluate(el=>{
            const rect=el.getBoundingClientRect();return rect.top>=0&&rect.bottom<=innerHeight&&rect.right<=innerWidth;
        })).toBe(true);
        if(['act_9','cosmos_astra'].includes(record.id))await page.screenshot({path:info.outputPath(`journal-${record.id}.png`)});
        await reader.getByRole('button',{name:'닫기',exact:true}).click();
        await expect(reader).toHaveCount(0);
        await expect(button).toBeFocused();
    }
    expect(await child.evaluate(()=>JSON.stringify([game.journalBonuses,game.journalBonusClaims,game.passivePoints,game.journalEntries]))).toBe(before);
    expect(errors).toEqual([]);
});
