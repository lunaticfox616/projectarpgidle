const { test, expect } = require('@playwright/test');

test('Arcana searches all copies and places locally without violating deck uniqueness', async ({ page }, info) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/'); await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null; game.season = 100;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.map(row => row.id); contentProgression.sync();
        game.arcana = createDefaultArcanaState(); game.arcana.unlocked = true;
        game.arcana.cards = Array.from({ length: 220 }, (_, i) => ({ uid: i + 1, cardId: ARCANA_CARD_DB[i % 22].id, obtainedLoop: 100 }));
        game.arcana.nextCardUid = 221; openTabPane('tab-arcana'); updateStaticUI();
    });
    await page.waitForFunction(() => {
        if (uiRefreshRunning || uiRefreshQueued) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); return true;
    });
    if (!info.project.use.isMobile) {
        await expect(page.locator('.arcana-collection .arcana-card')).toHaveCount(220);
        await page.locator('[data-card-uid="1"] button').click();
        await page.locator('.arcana-deck > button').first().click();
        expect(await page.evaluate(() => game.arcana.deckSlots[0])).toBe(1);
        expect(errors).toEqual([]); return;
    }
    const search = page.getByRole('textbox', { name: '아르카나 이름 또는 효과 검색' });
    await expect(page.locator('.arcana-collection .arcana-card')).toHaveCount(6);
    await search.fill('세계'); await page.getByRole('button', { name: '검색', exact: true }).tap();
    await expect(page.locator('.arcana-mobile-pages')).toContainText('10장');
    await page.getByRole('button', { name: '다음', exact: true }).tap();
    await expect(page.locator('.arcana-collection .arcana-card')).toHaveCount(4);
    await page.locator('.arcana-collection .arcana-card button').first().tap();
    const uid = await page.evaluate(() => selectedArcanaCardUid);
    const destination = page.getByRole('combobox', { name: '카드 배치 위치' });
    await destination.selectOption('deck:0'); await page.getByRole('button', { name: '여기에 배치' }).tap();
    expect(await page.evaluate(() => game.arcana.deckSlots[0])).toBe(uid);
    await page.locator('.arcana-collection .arcana-card button').first().tap();
    await expect(destination.locator('option[value="deck:1"]')).toHaveJSProperty('disabled', true);
    await destination.selectOption('equipment:무기');
    await expect(page.locator('.arcana-mobile-preview')).toContainText('현재 장비 없음');
    const secondUid = await page.evaluate(() => selectedArcanaCardUid);
    await page.getByRole('button', { name: '여기에 배치' }).tap();
    expect(await page.evaluate(() => game.arcana.equipmentSlots['무기'])).toBe(secondUid);
    await page.locator(`.arcana-mobile-loadout [data-card-uid="${uid}"] button`).tap();
    expect(await page.evaluate(() => game.arcana.deckSlots[0])).toBe(null);
    expect(await page.evaluate(() => game.arcana.cards.length)).toBe(220);
    await expect(page.locator(`.arcana-collection [data-card-uid="${uid}"]`)).toBeVisible();
    await page.evaluate(() => { game.arcana.sealedCards = 1; renderArcanaPanel(); });
    await page.getByRole('button', { name: '봉인 해제', exact: true }).tap();
    await expect(page.locator('.arcana-collection [data-card-uid="221"]')).toBeVisible();
    expect(await page.evaluate(() => game.arcana.sealedCards)).toBe(0);
    await search.fill('없는 카드'); await page.getByRole('button', { name: '검색', exact: true }).tap();
    await expect(page.locator('.arcana-collection')).toContainText('조건에 맞는');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
});
