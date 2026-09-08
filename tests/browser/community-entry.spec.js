const {test,expect}=require('@playwright/test');

test('guest community opens the account screen without changing the current character',async({page},info)=>{
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        cloudState.initialized=true;cloudState.busy=false;
        switchTab('tab-social');renderSocialTab();
    });
    const before=await page.evaluate(()=>({level:game.level,season:game.season,currentZoneId:game.currentZoneId}));
    await page.screenshot({path:info.outputPath('community-guest.png'),scale:'css'});
    await page.locator('#tab-social .social-empty-state button').click();
    await expect(page.locator('#startup-overlay')).toHaveClass(/active/);
    await expect(page.locator('#startup-email')).toBeVisible();
    expect(await page.evaluate(()=>({level:game.level,season:game.season,currentZoneId:game.currentZoneId}))).toEqual(before);
});

test('chat Enter respects browser composition and repeat flags',async({page})=>{
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.waitForFunction(()=>typeof onSocialChatKeydown==='function');
    const results=await page.evaluate(()=>[
        {key:'Enter',isComposing:true},{key:'Enter',keyCode:229},
        {key:'Enter',repeat:true},{key:'Enter',shiftKey:true},{key:'Enter'}
    ].map(properties=>{
        const event=new KeyboardEvent('keydown',{...properties,cancelable:true});
        onSocialChatKeydown(event);
        return event.defaultPrevented;
    }));
    expect(results).toEqual([false,false,false,false,true]);
});

test('a delayed chat response preserves a new draft and sends only once',async({page},info)=>{
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(()=>battleAssets.ready&&!uiRefreshRunning&&!uiRefreshQueued);
    await page.evaluate(()=>{
        clearInterval(gameTickHandle);gameTickHandle=null;
        tutorialQueue.length=0;if(activeTutorial)dismissTutorial(false);
        cloudState.user={id:'draft-fixture'};setMyNicknameLocal('입력검사');
        window.chatDraftPosts=[];
        const gate=new Promise(resolve=>{window.releaseChatDraft=resolve;});
        window.cloudJsonRequest=async(path,options={})=>{
            if(path.includes('player_profiles')&&options.method!=='POST')return [{nickname:'입력검사'}];
            if(path==='/rest/v1/chat_messages'&&options.method==='POST'){
                chatDraftPosts.push(options.body);await gate;
            }
            return [];
        };
        switchTab('tab-social');renderSocialTab();
    });
    const input=page.locator('#social-chat-input');
    await input.fill('첫 문장');await page.locator('.social-send-btn').click();
    await expect.poll(()=>page.evaluate(()=>chatDraftPosts.length)).toBe(1);
    await page.screenshot({path:info.outputPath('chat-pending.png'),scale:'css'});
    if(info.project.name==='mobile-chromium') {
        const sheet=await page.locator('#tab-social').boundingBox();
        const composer=await page.locator('.social-chat-inputbar').boundingBox();
        expect(sheet.y+sheet.height-composer.y-composer.height).toBeLessThan(24);
        expect(composer.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.locator('.social-send-btn')).toBeDisabled();
    await expect(page.locator('.social-send-btn')).toHaveText('전송 중');
    await input.fill('응답 대기 중 새 문장');await input.press('Enter');
    await page.evaluate(()=>releaseChatDraft());
    await page.waitForFunction(()=>!socialState.chatSending);
    expect(await page.evaluate(()=>chatDraftPosts.map(row=>row.body))).toEqual(['첫 문장']);
    await expect(input).toHaveValue('응답 대기 중 새 문장');
    await expect(page.locator('.social-send-btn')).toBeEnabled();
    await expect(page.locator('.social-send-btn')).toHaveText('전송');
});
