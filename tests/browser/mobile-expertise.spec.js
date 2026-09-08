const { test, expect } = require('@playwright/test');

test('expertise branches expose effects and preserve investment and refund rules', async ({ page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null; game.season = 100; game.level = 100;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id); contentProgression.sync();
        const st = ensureExpertiseState(); st.unlockedExperts = [...EXPERT_IDS];
        st.levels = Object.fromEntries(EXPERT_IDS.map(id => [id, 30])); st.nodes = {}; st.selectedExpertTab = '__tree';
        game.currencies.blightSpore = 10; openTabPane('tab-expertise'); updateStaticUI();
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); return true;
    });
    if (!info.project.use.isMobile) {
        await expect(page.locator('.expertise-tree-hub')).toBeVisible();
        await expect(page.locator('.expertise-node')).toHaveCount(23);
        expect(errors).toEqual([]); return;
    }
    const selector = page.locator('[data-expert-screen]');
    await expect(selector).toBeVisible();
    const rect = await selector.boundingBox();
    expect(rect.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('.expert-mobile-node')).toHaveCount(3);
    const first = page.locator('[data-expert-node="common_reward_gain"]');
    await expect(first).toContainText('모든 전문가 재화 획득량 증가');
    const free = await page.evaluate(() => getExpertPointFree());
    await first.getByRole('button', { name: '투자 · 1P' }).tap();
    await expect.poll(() => page.evaluate(() => game.expertise.nodes.common_reward_gain)).toBe(1);
    expect(await page.evaluate(() => getExpertPointFree())).toBe(free - 1);
    await first.getByRole('button', { name: '반환 · 포자 1' }).tap();
    await page.locator('#game-dialog-confirm').tap();
    await expect.poll(() => page.evaluate(() => game.currencies.blightSpore)).toBe(9);
    expect(await page.evaluate(() => getExpertPointFree())).toBe(free);
    await page.locator('[data-expert-branch]').selectOption('mycologist');
    await expect(page.locator('[data-expert-node="myco_keystone_restore"]')).toContainText('할당 잠김');
    await expect(page.locator('[data-expert-node="myco_keystone_restore"] .expertise-node')).toBeDisabled();
    for (const branch of ['gemEngraver', 'astronomer', 'beekeeper', 'common']) {
        await page.locator('[data-expert-branch]').selectOption(branch);
        await expect(page.locator('.expert-mobile-node').first()).toBeVisible();
    }
    await selector.selectOption('mycologist');
    await expect(page.locator('.expertise-card')).toBeVisible();
    await expect(page.locator('#ui-expert-tree')).toBeHidden();
    const favor = await page.evaluate(() => getExpertFavorOptions('mycologist')[0].id);
    await page.locator('.expert-favor-option').first().tap();
    await expect.poll(() => page.evaluate(() => getSelectedExpertFavor('mycologist'))).toBe(favor);
    await expect(page.locator('.expert-favor-option').first()).toHaveClass(/active/);
    await selector.selectOption('__tree');
    await expect(first).toBeVisible();
    await page.evaluate(() => {
        game.expertise.levels = Object.fromEntries(EXPERT_IDS.map(id => [id, 1]));
        game.expertise.unlockedExperts = []; renderExpertiseUI();
    });
    await expect(page.locator('[data-expert-branch]')).toHaveCount(0);
    await expect(page.locator('#ui-expert-tree')).toContainText('Lv.16');
    await expect(selector.locator('option')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
});
