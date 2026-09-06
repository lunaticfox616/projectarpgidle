const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'allow'});

test('real worker update preserves saves and exact cached script versions offline',async({page,context})=>{
    await page.route('https://**',route=>route.fulfill({status:204,body:''}));
    await page.goto('/');
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await page.waitForFunction(()=>typeof mergeDefaults==='function');
    const originalDocument = await page.evaluate(() => performance.timeOrigin);
    await page.evaluate(async()=>{
        game=mergeDefaults({level:12,heroSelectionInitialized:true,playerHp:100,saveMeta:{lastModifiedAt:Date.now()}});
        persistLocalSave();
        const old=await caches.open('project-arpg-runtime-v0');
        await old.put('/obsolete',new Response('old'));
        await navigator.serviceWorker.register('/service-worker.js?verification=2',{updateViaCache:'none'});
    });
    // Updating the worker reloads the app itself; an extra reload races controllerchange.
    await page.waitForFunction(previous => performance.timeOrigin !== previous
        && typeof game !== 'undefined' && game.level === 12, originalDocument);
    await page.waitForFunction(async()=>!(await caches.keys()).includes('project-arpg-runtime-v0'));
    await page.waitForFunction(async()=>{
        const registration=await navigator.serviceWorker.getRegistration();
        const expected=new URL('/service-worker.js',location.href).href;
        return registration && !registration.installing && !registration.waiting
            && registration.active?.scriptURL===expected && navigator.serviceWorker.controller?.scriptURL===expected;
    });
    await page.waitForLoadState('networkidle');
    await page.evaluate(async()=>{
        const cache=await caches.open('project-arpg-runtime-v1');
        await cache.put('/js/combat-clock.js?v=obsolete',new Response('throw Error("obsolete version executed")',{headers:{'Content-Type':'text/javascript'}}));
    });
    await context.setOffline(true);
    const previousDocument=await page.evaluate(()=>performance.timeOrigin);
    const navigation=page.waitForEvent('framenavigated',{predicate:frame=>frame===page.mainFrame()});
    await page.evaluate(()=>location.reload());
    await navigation;
    await page.waitForFunction(previous=>performance.timeOrigin!==previous && typeof mergeDefaults==='function' && game.level===12,previousDocument);
    expect(await page.evaluate(()=>Number.isFinite(game.combatTimeMs))).toBe(true);
    expect(await page.evaluate(()=>typeof getCombatTime)).toBe('function');
    await context.setOffline(false);
});
