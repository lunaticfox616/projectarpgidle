const { test, expect } = require('@playwright/test');

test('login coin keeps the original brand artwork and leaves the game logo unchanged', async ({ page }, info) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    const logo = page.locator('.startup-logo');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveCSS('border-radius', '50%');
    const box = await logo.boundingBox();
    expect(Math.abs(box.width - box.height)).toBeLessThan(1);
    expect(await logo.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: info.outputPath('login-coin.png'), scale: 'css' });
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    if (!info.project.use.isMobile) {
        const rail = page.locator('#ui-rail-logo img');
        await expect(rail).toBeVisible();
        await expect(rail).toHaveCSS('border-radius', '0px');
        expect(await rail.getAttribute('src')).toBe(await logo.getAttribute('src'));
    }
});
