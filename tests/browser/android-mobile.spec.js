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

test('the phone dock keeps its cells when the map unlocks', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Phone bottom dock');
    await openMobile(page);
    // Review 2026-10-01 #24: the dock grew from 4 to 5 cells after act 1 and 스킬 젬 moved under the thumb.
    const cells = () => page.locator('#tab-header-bottom > :is(.tab-btn, .mobile-nav-more):visible').evaluateAll(elements =>
        elements.map(el => el.id + '@' + Math.round(el.getBoundingClientRect().left)));
    const before = await cells();
    expect(before.map(cell => cell.split('@')[0]).sort()).toEqual(['btn-mobile-nav-more', 'btn-tab-battle', 'btn-tab-items', 'btn-tab-map', 'btn-tab-skills']);
    const map = page.locator('#btn-tab-map');
    await expect(map).toHaveClass(/nav-locked/);
    await expect(map).toHaveAttribute('aria-disabled', 'true');
    // The locked cell is aria-disabled for assistive tech, yet a tap still explains when it opens.
    await map.tap({ force: true });
    await expect(page.locator('#tab-map')).toBeHidden();
    await expect(page.locator('#game-toast-region .game-toast', { hasText: '액트 1을 마치면 지도가 열립니다.' })).toBeVisible();
    await page.evaluate(() => { game.maxZoneId = 1; checkUnlocks(); updateStaticUI(); });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return !document.getElementById('btn-tab-map').classList.contains('nav-locked');
    });
    expect(await cells()).toEqual(before);
    await map.tap();
    await expect(page.locator('#tab-map')).toBeVisible();
});

test('picking a class by touch leaves no class tooltip over the battle HUD', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Touch fires the hover tooltip before the click');
    // Review 2026-10-01: the tapped class card tooltip stayed over the HUD after the battle started.
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').tap();
    await page.locator('[data-class-id="warrior"]').tap();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await expect(page.locator('#info-tooltip')).toBeHidden();
});

test('HUD gem hover details follow the mouse and never stay behind after a tap', async ({ page }, info) => {
    // Review 2026-10-01: tapping the mobility gem (the dash) left its gem tooltip over the battlefield on phones.
    const mobile = !!info.project.use.isMobile;
    if (mobile) await openMobile(page);
    else {
        await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
        await page.goto('/');
        await page.locator('#btn-startup-guest').click();
        await page.locator('[data-class-id="warrior"]').click();
        await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
        await page.evaluate(() => { clearInterval(gameTickHandle); gameTickHandle = null; tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); });
    }
    await page.evaluate(() => {
        game.mobilitySkill = Object.keys(SKILL_DB).find(name => SKILL_DB[name].tags?.includes('mobility'));
        hideInfoTooltip(); renderCombatSkillHud();
    });
    const slot = page.locator('#ui-combat-skill-gems .player-hud-skill-slot.mobility');
    if (mobile) {
        await slot.tap();
        await expect(page.locator('#info-tooltip')).toBeHidden();
    } else {
        await slot.hover();
        await expect(page.locator('#info-tooltip')).toBeVisible();
        await page.mouse.move(5, 5);
        await expect(page.locator('#info-tooltip')).toBeHidden();
    }
});
