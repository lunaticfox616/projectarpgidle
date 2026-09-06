const {test,expect}=require('@playwright/test');

test('game introduction loads real footage on demand and closes without changing progress',async({page},info)=>{
    const requests=[];const errors=[];
    page.on('request',request=>{if(request.url().includes('gameplay-intro.webm'))requests.push(request.url());});
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    const before=await page.evaluate(()=>JSON.stringify(game));
    expect(requests).toHaveLength(0);
    const opener=page.getByRole('button',{name:'잠깐, RIGNIN은 어떤 게임인가요?'});
    await opener.click();
    const dialog=page.getByRole('dialog',{name:'RIGNIN은 어떤 게임인가요?'});
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('액션 롤플레잉 게임(ARPG)의 요소에 자동사냥 방치형 게임의 요소를 결합한 게임입니다. 루프하며 새로운 컨텐츠를 해금하고 강력한 캐릭터를 육성해보세요!');
    await page.waitForFunction(()=>document.getElementById('startup-about-video').currentTime>0.2);
    const duration=await page.locator('#startup-about-video').evaluate(video=>video.duration);
    expect(await page.locator('#startup-about-video').evaluate(video=>video.controls)).toBe(false);
    expect(duration).toBeGreaterThanOrEqual(1.8);
    expect(duration).toBeLessThanOrEqual(2.1);
    expect(requests.length).toBeGreaterThan(0);
    await expect(dialog.getByRole('button',{name:'알겠어요!'})).toBeInViewport();
    await page.screenshot({path:info.outputPath('game-introduction.png')});
    await dialog.getByRole('button',{name:'알겠어요!'}).click();
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
    expect(await page.locator('#startup-about-video').evaluate(video=>video.paused)).toBe(true);
    await opener.click();await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(()=>JSON.stringify(game))).toBe(before);
    expect(errors).toEqual([]);
});

test('reduced motion shows the introduction poster without autoplay or player controls',async({page})=>{
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.locator('#startup-about-open').click();
    expect(await page.locator('#startup-about-video').evaluate(video=>video.paused)).toBe(true);
    await page.getByRole('button',{name:'알겠어요!'}).click();
    await expect(page.locator('#startup-about-open')).toBeFocused();
});

test('login background and equal provider buttons remain readable in either game theme',async({page},info)=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await expect(page.getByLabel('이메일',{exact:true})).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    for(const theme of ['dark','light']){
        await page.evaluate(value=>applyThemeMode(value),theme);
        const sizes=await page.locator('#startup-social-actions button').evaluateAll(buttons=>buttons.map(button=>{
            const rect=button.getBoundingClientRect();return {width:rect.width,height:rect.height};
        }));
        expect(sizes[0]).toEqual(sizes[1]);
        expect(sizes[0].height).toBe(44);
        expect(await page.locator('#startup-social-actions img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
        expect(await page.locator('#startup-overlay').evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
        await expect(page.locator('#btn-startup-google')).toHaveCSS('background-color','rgb(255, 255, 255)');
        await expect(page.locator('#btn-startup-kakao')).toHaveCSS('background-color','rgb(254, 229, 0)');
        await page.locator('#startup-email').focus();
        await page.screenshot({path:info.outputPath('login-'+theme+'.png')});
    }
    await page.locator('#btn-startup-signup').click();
    await expect(page.locator('#startup-signup-consent')).toBeVisible();
    await page.locator('#startup-terms-consent').check();
    await page.locator('#startup-privacy-consent').check();
    await page.locator('#btn-startup-login').click();
    await expect(page.locator('#startup-signup-consent')).toBeHidden();
    await page.locator('#btn-startup-guest').click();
    await expect(page.locator('#loop-hero-select-overlay')).toBeVisible();
    expect(errors).toEqual([]);
});

test('restyled social buttons still request the correct OAuth provider and recover from failure',async({page})=>{
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.evaluate(()=>{
        window.loginProviderCalls=[];
        // Stub the external identity service, retaining the actual click handlers and busy/error state.
        window.supabaseClient={auth:{signInWithOAuth:async request=>{
            window.loginProviderCalls.push(request);
            return {data:null,error:{message:'테스트 연결 실패'}};
        }}};
    });
    for(const provider of ['google','kakao']){
        await page.locator('#btn-startup-'+provider).click();
        await expect(page.locator('#startup-status')).toContainText('테스트 연결 실패');
        await expect(page.locator('#btn-startup-'+provider)).toBeEnabled();
    }
    const requests=await page.evaluate(()=>window.loginProviderCalls);
    expect(requests.map(row=>row.provider)).toEqual(['google','kakao']);
    expect(requests[1].options.scopes).toBe('profile_nickname');
    expect(requests[1].options.skipBrowserRedirect).toBe(true);
});
