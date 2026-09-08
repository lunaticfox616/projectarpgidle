const { test, expect } = require('@playwright/test');

test('character categories stay directly reachable on mobile and preserve desktop disclosures', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        switchTab('tab-character');
    });
    const navigation = page.locator('#tab-character .mobile-section-navigation');
    const sections = page.locator('#tab-character .character-stat-section');
    if (info.project.use.isMobile) {
        await expect(navigation).toBeVisible();
        await expect(sections.filter({ visible: true })).toHaveCount(1);
        await navigation.getByRole('tab', { name: '방어 · 회복' }).click();
        await expect(page.locator('#ui-dr')).toBeVisible();
        await expect(page.locator('#ui-atk')).toBeHidden();
        await navigation.getByRole('tab', { name: '기본 · 특수' }).click();
        await expect(page.locator('#ui-strength')).toBeVisible();
        await page.keyboard.press('Home');
        await expect(navigation.getByRole('tab', { name: '공격', exact: true })).toHaveAttribute('aria-selected', 'true');
    } else {
        await expect(navigation).toBeHidden();
        const before = await sections.evaluateAll(nodes => nodes.map(node => node.open));
        await page.setViewportSize({ width: 412, height: 915 });
        await expect(navigation).toBeVisible();
        await page.setViewportSize({ width: 1440, height: 900 });
        await expect(navigation).toBeHidden();
        expect(await sections.evaluateAll(nodes => nodes.map(node => node.open))).toEqual(before);
    }
    expect(errors).toEqual([]);
    await page.mouse.move(0, 0);
    await page.evaluate(() => hideInfoTooltip());
    await expect(page.locator('#mobile-toast-root > div')).toHaveCount(0);
    await page.screenshot({ path: info.outputPath('character.png'), scale: 'css' });
});
