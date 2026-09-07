const { test, expect } = require('@playwright/test');

async function openLibrary(page) {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    const owned = await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.level = 100; game.season = 100;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id);
        contentProgression.sync();
        game.skills = Object.keys(SKILL_DB).filter(name => SKILL_DB[name].isGem);
        game.supports = Object.keys(SUPPORT_GEM_DB);
        game.sealedSkills = []; game.sealedSupports = [];
        game.gemFoldInactiveAttack = false; game.gemFoldInactiveSupport = false;
        updateTabUnlockButtons(); applyTabHeaderOrder(); switchTab('tab-skills'); updateStaticUI();
        return { skills: game.skills, supports: game.supports };
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return true;
    });
    return owned;
}

test('gem browsing pages on phones, searches the entire library, and keeps desktop cards', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const owned = await openLibrary(page);
    const root = page.locator('#ui-skills-list');
    const cards = root.locator('.gem-library-card');
    const mobile = !!info.project.use.isMobile;
    await expect(cards).toHaveCount(mobile ? 6 : owned.skills.length);
    if (mobile) {
        const first = await cards.first().getAttribute('aria-label');
        await root.getByRole('button', { name: '다음', exact: true }).click();
        await expect(cards.first()).not.toHaveAttribute('aria-label', first);
        await expect(root.locator('.gem-library-pager')).toContainText('2 /');
    }
    const search = root.locator('input[data-search-key="skill"]');
    const target = owned.skills[owned.skills.length - 1];
    await search.fill(target);
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(target);
    await search.fill('없는젬검색결과');
    await expect(cards).toHaveCount(0);
    await search.fill('');
    await expect(cards).toHaveCount(mobile ? 6 : owned.skills.length);
    if (mobile) await expect(root.locator('.gem-library-pager')).toContainText('1 /');
    await expect(page.locator('#ui-support-list .gem-library-card')).toHaveCount(mobile ? 6 : owned.supports.length);
    if (mobile) {
        await page.locator('[data-mobile-gem-library="support"]').click();
        await expect(page.locator('.attack-library')).toBeHidden();
        await expect(page.locator('.support-library')).toBeVisible();
        await page.locator('[data-mobile-gem-library="skill"]').click();
        await expect(page.locator('.attack-library')).toBeVisible();
    }
    expect(await page.evaluate(() => game.skills)).toEqual(owned.skills);
    expect(errors).toEqual([]);
    await page.mouse.move(0, 0);
    await page.evaluate(() => { hideInfoTooltip(); document.getElementById('tab-skills').scrollTop = 0; });
    await expect(page.locator('#game-toast-region .game-toast')).toHaveCount(0);
    await expect(page.locator('#mobile-toast-root > div')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('gem-library.png'), scale: 'css' });
    if (mobile) {
        await page.locator('[data-mobile-gem-library="support"]').click();
        await page.evaluate(() => {
            game.contentProgression.inherited = game.contentProgression.inherited.filter(id => id !== 'support');
            contentProgression.sync(); updateStaticUI();
        });
        await expect(page.locator('.skill-mobile-library-navigation')).toBeHidden();
        await expect(page.locator('.support-library')).toBeHidden();
        await expect(page.locator('.attack-library')).toBeVisible();
    }
});

test('a phone shortcut can move to the full menu without changing the PC preference', async ({ page }, info) => {
    test.skip(!info.project.use.isMobile, 'Phone shortcut editor');
    await openLibrary(page);
    await page.evaluate(() => switchTab('tab-settings'));
    const desktopBefore = await page.evaluate(() => JSON.stringify(game.settings.tabLayouts.desktop));
    await page.locator('#settings-category').selectOption('layout');
    await page.locator('.cfg-disclosure--tab-order > summary').click();
    await page.locator('[data-place="btn-tab-items"]').selectOption('bottom');
    await expect(page.locator('#tab-header-bottom #btn-tab-items')).toHaveCount(0);
    await page.locator('#btn-mobile-nav-more').click();
    await page.locator('#btn-tab-items').click();
    await expect(page.locator('#tab-items')).toBeVisible();
    expect(await page.evaluate(() => JSON.stringify(game.settings.tabLayouts.desktop))).toBe(desktopBefore);
    expect(await page.evaluate(() => normalizeTabLayoutSettings(game.settings).mobile.tabPlacement['btn-tab-items'])).toBe('bottom');
});
