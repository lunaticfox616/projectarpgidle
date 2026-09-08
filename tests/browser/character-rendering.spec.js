const { test, expect } = require('@playwright/test');

test('combat leaves closed character stats untouched and refreshes them when opened', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => { clearInterval(gameTickHandle); gameTickHandle = null; closeAllWindows(); switchTab('tab-battle'); });
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    const hidden = await page.evaluate(() => {
        const el = document.getElementById('ui-atk'), observer = new MutationObserver(() => {});
        observer.observe(el, { childList: true, characterData: true, subtree: true });
        const before = el.textContent, stats = getUiPlayerStats(); stats.baseDmg = 987654;
        for (let i = 0; i < 20; i++) updateCombatUI(stats);
        const mutations = observer.takeRecords().length; observer.disconnect();
        return { before, after: el.textContent, mutations };
    });
    expect(hidden.after).toBe(hidden.before);
    expect(hidden.mutations).toBe(0);
    await page.evaluate(() => switchTab('tab-character'));
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued);
    const opened = await page.evaluate(() => {
        const stats = getUiPlayerStats(); stats.baseDmg = 987654;
        updateCombatUI(stats);
        const el = document.getElementById('ui-atk'), observer = new MutationObserver(() => {});
        observer.observe(el, { childList: true, characterData: true, subtree: true });
        for (let i = 0; i < 20; i++) updateCombatUI(stats);
        const mutations = observer.takeRecords().length; observer.disconnect();
        return { text: el.textContent, expected: formatSettingNumber(987654, 'showCharacterComma'), mutations };
    });
    expect(opened.text).toBe(opened.expected);
    expect(opened.mutations).toBe(0);
    expect(errors).toEqual([]);
});
