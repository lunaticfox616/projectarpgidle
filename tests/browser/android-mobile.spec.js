const { test, expect } = require('@playwright/test');

async function openMobile(page, native = false) {
    await page.setViewportSize({ width: 412, height: 915 });
    if (native) await page.addInitScript(() => {
        // Only the OS/plugin boundary is faked. Gameplay, DOM and storage remain real.
        window.androidEvents = {};
        window.androidCalls = [];
        window.Capacitor = {
            isNativePlatform: () => true,
            registerPlugin: name => ({
                addListener: async (event, listener) => { window.androidEvents[event] = listener; },
                getLaunchUrl: async () => undefined,
                minimizeApp: async () => window.androidCalls.push('minimize'),
                open: async options => window.androidCalls.push({ name, ...options })
            })
        };
    });
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').tap();
    await page.locator('[data-class-id="warrior"]').tap();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        hideInfoTooltip();
    });
}

test('touch browsing scrolls inventory without moving gear, and explicit equip remains reachable', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Android touch interactions');
    await openMobile(page);
    await page.evaluate(() => {
        game.settings.autoEquipEmptySlots = false;
        game.inventory = Array.from({ length: 16 }, () => createItemFromBase(BASE_ITEM_DB.find(b => b.id === 'war_helm'), 'rare', 1));
        switchTab('tab-items'); updateStaticUI();
    });
    const management = page.locator('.equipment-mobile-management');
    await expect(management).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#ui-equipment-triage')).toBeHidden();
    await management.tap();
    await expect(page.locator('#ui-equipment-triage')).toBeVisible();
    await management.tap();
    const first = page.locator('.equipment-grid-item').first();
    await first.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => JSON.stringify(game.equipmentInventoryPlacements));
    const scrollBefore = await first.evaluate(el => {
        let offset = 0;
        for (let node = el; node; node = node.parentElement) offset += node.scrollTop;
        return offset;
    });
    const box = await first.boundingBox();
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 20, y: box.y + 40 }] });
    for (let i = 1; i <= 8; i++) {
        await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove', touchPoints: [{ x: box.x + 20, y: box.y + 40 - i * 12 }]
        });
        await page.waitForTimeout(35); // A finger gesture, not eight instant moves with extreme fling velocity.
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(500); // Let native inertial scrolling end before the next deliberate tap.
    expect(await first.evaluate(el => {
        let offset = 0;
        for (let node = el; node; node = node.parentElement) offset += node.scrollTop;
        return offset;
    })).toBeGreaterThan(scrollBefore);
    expect(await page.evaluate(() => equipmentInventoryInteraction.isCarrying())).toBe(false);
    expect(await page.evaluate(() => JSON.stringify(game.equipmentInventoryPlacements))).toBe(before);
    await first.tap();
    const inspector = page.locator('#ui-equipment-inventory-inspector');
    await expect(inspector).toBeVisible();
    await inspector.getByRole('button', { name: '장착', exact: true }).tap();
    expect(await page.evaluate(() => !!game.equipment['투구'])).toBe(true);
    const arrange = page.locator('#equipment-touch-arrange');
    await arrange.tap();
    await expect(arrange).toHaveAttribute('aria-pressed', 'true');
    await arrange.tap();
    await expect(arrange).toHaveAttribute('aria-pressed', 'false');
    await page.screenshot({ path: info.outputPath('s24-equipment.png'), scale: 'css' });
});

test('Android back closes dialogs, returns from management, then minimizes with a save', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Android plugin boundary');
    await openMobile(page, true);
    await page.evaluate(() => switchTab('tab-items'));
    await page.locator('#btn-auto-salvage').tap();
    await expect(page.locator('#auto-salvage-config-overlay')).toBeVisible();
    await page.evaluate(() => window.androidEvents.backButton());
    await expect(page.locator('#auto-salvage-config-overlay')).toBeHidden();
    await expect(page.locator('#tab-items')).toHaveClass(/active/);
    await page.evaluate(() => window.androidEvents.backButton());
    await expect(page.locator('#tab-battle')).toHaveClass(/active/);
    await page.evaluate(() => window.androidEvents.backButton());
    expect(await page.evaluate(() => window.androidCalls)).toContain('minimize');
    expect(await page.evaluate(() => game.saveMeta.lastModifiedAt)).toBeGreaterThan(0);
    await page.evaluate(() => { window.androidCalls.length = 0; setStartupOverlayActive(true); });
    await page.locator('#startup-about-open').tap();
    await page.evaluate(() => window.androidEvents.backButton());
    await expect(page.locator('#startup-about-dialog')).toBeHidden();
    expect(await page.evaluate(() => window.androidCalls)).toEqual([]);
    await page.evaluate(() => window.androidEvents.backButton());
    expect(await page.evaluate(() => window.androidCalls)).toEqual(['minimize']);
});

test('Android inactive state stops combat and canvas work even before WebView visibility changes', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Android lifecycle and rendering');
    await openMobile(page, true);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => {
        window.battlePaints = 0;
        const clear = CanvasRenderingContext2D.prototype.clearRect;
        CanvasRenderingContext2D.prototype.clearRect = function (...args) {
            if (this.canvas.id === 'battlefield-canvas') window.battlePaints++;
            return clear.apply(this, args);
        };
        runForegroundCombat(0); runForegroundCombat(100);
    });
    await expect.poll(() => page.evaluate(() => window.battlePaints)).toBeGreaterThan(1);
    const sample = await page.evaluate(() => ({ paints: window.battlePaints, at: performance.now() }));
    await page.waitForTimeout(600);
    const rate = await page.evaluate(sample => (window.battlePaints - sample.paints) * 1000 / (performance.now() - sample.at), sample);
    expect(rate).toBeGreaterThan(5);
    expect(rate).toBeLessThanOrEqual(32);
    const scale = await page.locator('#battlefield-canvas').getAttribute('data-render-scale');
    expect(Number(scale)).toBe(1.5);
    const paused = await page.evaluate(() => {
        window.androidEvents.appStateChange({ isActive: false });
        return { clock: game.combatTimeMs, paints: window.battlePaints, hidden: document.hidden };
    });
    expect(paused.hidden).toBe(false); // Reproduce Android's event arriving before visibilitychange.
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => {
        runForegroundCombat(1000);
        return { clock: game.combatTimeMs, paints: window.battlePaints };
    })).toEqual({ clock: paused.clock, paints: paused.paints });
    await page.evaluate(() => window.androidEvents.appStateChange({ isActive: true }));
    await expect.poll(() => page.evaluate(() => window.battlePaints)).toBeGreaterThan(paused.paints);
    expect(await page.evaluate(() => { runForegroundCombat(1100); return game.combatTimeMs; })).toBe(paused.clock + 100);
    await page.evaluate(() => switchTab('tab-items'));
    await expect(page.locator('#mobile-battle-pip')).toBeVisible();
    const pipPause = await page.evaluate(() => {
        window.androidEvents.appStateChange({ isActive: false }); return window.battlePaints;
    });
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => window.battlePaints)).toBe(pipPause);
    expect(errors).toEqual([]);
});

test('Android auth uses external PKCE and ignores unrelated deep links', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Android plugin boundary');
    await openMobile(page, true);
    const original = page.url();
    await page.evaluate(async () => {
        window.supabaseClient = { auth: { signInWithOAuth: async request => {
            window.androidAuthRequest = request;
            return { data: { url: 'https://accounts.google.com/o/oauth2/v2/auth' }, error: null };
        } } };
        await loginWithOAuthProvider('google');
    });
    expect(await page.evaluate(() => window.androidAuthRequest.options)).toMatchObject({
        redirectTo: 'rignin://auth/callback', skipBrowserRedirect: true
    });
    expect(page.url()).toBe(original);
    expect(await page.evaluate(() => window.androidCalls)).toContainEqual({
        name: 'Browser', url: 'https://accounts.google.com/o/oauth2/v2/auth'
    });
    const userBefore = await page.evaluate(() => cloudState.user);
    await page.evaluate(() => window.androidEvents.appUrlOpen({ url: 'rignin://other/callback?code=untrusted' }));
    expect(await page.evaluate(() => cloudState.user)).toEqual(userBefore);
    await page.evaluate(() => window.androidEvents.browserFinished());
    expect(await page.evaluate(() => cloudState.busy)).toBe(false);
});

test('touch tree navigation pans and pinches without spending passive points', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Touch canvas gestures');
    await openMobile(page);
    await page.evaluate(() => { switchTab('tab-char'); camZoom = 1; drawPassiveTree(); });
    const canvas = page.locator('#tree-canvas');
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    const before = await page.evaluate(() => ({ points: game.passivePoints, x: camX, zoom: camZoom }));
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 50, y: y + 30 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(await page.evaluate(() => camX)).not.toBe(before.x);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 35, y, id: 0 }, { x: x + 35, y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 65, y, id: 0 }, { x: x + 65, y, id: 1 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(await page.evaluate(() => camZoom)).toBeGreaterThan(before.zoom);
    expect(await page.evaluate(() => game.passivePoints)).toBe(before.points);
});

test('all unlocked mobile navigation entries open without page overflow or runtime errors', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Full mobile menu reachability');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await openMobile(page);
    await page.evaluate(() => {
        game.level = 100; game.season = 100;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id);
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        updateTabUnlockButtons(); applyTabHeaderOrder(); updateTabNotificationDots();
    });
    await expect(page.locator('#tab-header-bottom > .tab-btn:visible')).toHaveCount(4);
    const ids = await page.locator('.tab-header > .tab-btn').evaluateAll(elements => elements
        .filter(el => el.id.startsWith('btn-tab-') && el.style.display !== 'none' && !el.hidden && el.dataset.mergedTabMember !== '1')
        .map(el => el.id));
    expect(ids.length).toBeGreaterThan(10);
    const overflows = [];
    for (const id of ids) {
        if (!await page.locator('#' + id).isVisible()) await page.locator('#btn-mobile-nav-more').tap();
        await page.locator('#' + id).tap();
        await page.waitForFunction(() => {
            if (uiRefreshRunning || uiRefreshQueued) return false;
            tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
            return true;
        });
        const target = page.locator('#' + id.replace(/^btn-/, ''));
        await expect(target).toBeVisible();
        const geometry = await target.evaluate(el => ({ overflow: el.scrollWidth - el.clientWidth,
            nodes: [...el.querySelectorAll('*')].filter(child => child.getClientRects().length
                && child.getBoundingClientRect().right > el.getBoundingClientRect().right + 1)
                .slice(0, 5).map(child => ({ id: child.id, className: child.className, width: child.getBoundingClientRect().width })) }));
        if (geometry.overflow > 1) overflows.push({ id, ...geometry });
    }
    expect(overflows).toEqual([]);
    expect(errors).toEqual([]);
    await info.attach('visited-mobile-tabs', { body: JSON.stringify(ids), contentType: 'application/json' });
});
