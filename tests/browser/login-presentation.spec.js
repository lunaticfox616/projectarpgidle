const {test,expect}=require('@playwright/test');

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
