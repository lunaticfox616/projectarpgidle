const { test, expect } = require('@playwright/test');

async function openEquipment(page) {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('console', message => {
        if (/Blocked aria-hidden/i.test(message.text())) failures.push(message.text());
    });
    await page.route('https://**', route => route.fulfill({ status: 204, contentType: 'text/javascript', body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await expect(page.locator('#startup-overlay')).not.toHaveClass(/active/, { timeout: 30000 });
    if (await page.evaluate(() => !game.heroSelectionInitialized)) {
        await page.locator('#loop-hero-select-overlay [data-class-id]').first().click();
    }
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null; game.combatHalted = true;
        game.settings.uiSounds = false;
        game.level = 100;
        const base = BASE_ITEM_DB.find(row => row.slot === '반지');
        const rings = [0, 1, 2].map(() => createItemFromBase(base, 'rare', 1));
        game.equipment['반지1'] = rings[0]; game.equipment['반지2'] = rings[1];
        game.inventory = [rings[2]];
        switchTab('tab-items'); switchItemSubtab('item-tab-equip'); updateStaticUI();
    });
    await page.waitForFunction(() => {
        if (uiRefreshQueued || uiRefreshRunning) return false;
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        return true;
    });
    const inventory = page.locator('#btn-equipment-mobile-inventory');
    if (await inventory.isVisible()) await inventory.click();
    await page.locator('#ui-inventory-list .equipment-grid-item').first().click();
    await expect(page.locator('#ui-equipment-inventory-inspector')).toBeVisible();
    return failures;
}

async function expectInFront(page, selector) {
    const result = await page.locator(selector).first().evaluate(element => {
        const rect = element.getBoundingClientRect();
        const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return { inside: rect.x >= 0 && rect.y >= 0 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1,
            top: element === target || element.contains(target) };
    });
    expect(result).toEqual({ inside: true, top: true });
}

test('new slot dialog stays above inspector, cancels without losing selection and equips the chosen ring', async ({ page }, info) => {
    if (info.project.name.startsWith('desktop')) await page.setViewportSize({ width: 908, height: 480 });
    const failures = await openEquipment(page);
    const before = await page.evaluate(() => ({ left: game.equipment['반지1'].id, right: game.equipment['반지2'].id,
        item: game.inventory[0].id, focus: equipmentInventoryInteraction.getFocusedKey() }));
    const inspector = page.locator('#ui-equipment-inventory-inspector');
    await inspector.getByRole('button', { name: '장착', exact: true }).click();
    const dialog = page.locator('#ring-slot-overlay');
    await expect(dialog).toBeVisible();
    await page.evaluate(() => { equipmentInventoryInteraction.positionInspector(); window.dispatchEvent(new Event('resize')); });
    await expectInFront(page, '#ring-slot-overlay button');
    await page.screenshot({ path: info.outputPath('slot-dialog.png') });
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(inspector).toBeVisible();
    expect(await page.evaluate(() => ({ left: game.equipment['반지1'].id, right: game.equipment['반지2'].id,
        item: game.inventory[0].id, focus: equipmentInventoryInteraction.getFocusedKey() }))).toEqual(before);
    await inspector.getByRole('button', { name: '장착', exact: true }).click();
    await dialog.getByRole('button', { name: '오른쪽 슬롯', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => ({ left: game.equipment['반지1'].id, right: game.equipment['반지2'].id })))
        .toEqual({ left: before.left, right: before.item });
    expect(failures).toEqual([]);
});

test('scaled short screen keeps actions reachable and dialog validation and queue stay usable', async ({ page }, info) => {
    const failures = await openEquipment(page);
    await page.setViewportSize({ width: 908, height: 480 });
    await page.evaluate(() => {
        uiDisplay.apply(200);
        requestGameText({ title: '이름 입력', validate: value => value ? true : '이름을 입력하세요.' });
        requestGameConfirmation('다음 확인창');
    });
    await page.locator('#game-dialog-confirm').click();
    await expect(page.locator('#game-dialog-error')).toHaveText('이름을 입력하세요.');
    await expectInFront(page, '#game-dialog-error');
    await expectInFront(page, '#game-dialog-confirm');
    await page.screenshot({ path: info.outputPath('short-screen-200.png') });
    await page.locator('#game-dialog-text').fill('테스트');
    await page.locator('#game-dialog-text').press('Enter');
    await expect(page.locator('#game-dialog-message')).toHaveText('다음 확인창');
    await expect(page.locator('#game-dialog-error')).toBeHidden();
    await page.locator('#game-dialog-cancel').press('Enter');
    await expect(page.locator('#game-dialog-overlay')).toBeHidden();
    await page.evaluate(() => {
        requestGameConfirmation('닫기 검사');
        requestGameConfirmation('대기열 유지');
        document.getElementById('game-dialog-overlay').close();
    });
    await expect(page.locator('#game-dialog-message')).toHaveText('대기열 유지');
    await page.locator('#game-dialog-confirm').click();
    expect(failures).toEqual([]);
});

test('newest modal takes input above older modal and inspector in both themes', async ({ page }, info) => {
    const failures = await openEquipment(page);
    for (const light of [false, true]) {
        await page.evaluate(light => {
            document.body.classList.toggle('light-mode', light);
            openGloveSlotOverlayByItemId(game.inventory[0].id);
            requestGameConfirmation('선택한 장비를 확인하세요.', { title: '장비 확인' });
        }, light);
        await expect(page.locator('#game-dialog-overlay')).toBeVisible();
        await expectInFront(page, '#game-dialog-confirm');
        await page.screenshot({ path: info.outputPath(light ? 'confirm-light.png' : 'confirm-dark.png') });
        await page.keyboard.press('Escape');
        await expect(page.locator('#game-dialog-overlay')).toBeHidden();
        await expect(page.locator('#glove-slot-overlay')).toBeVisible();
        await expectInFront(page, '#glove-slot-overlay button');
        await page.keyboard.press('Escape');
        await expect(page.locator('#glove-slot-overlay')).toBeHidden();
        await expect(page.locator('#ui-equipment-inventory-inspector')).toBeVisible();
    }
    await page.evaluate(() => {
        requestGameConfirmation('먼저 열린 확인창');
        openWeaponSlotOverlayByItemId(game.inventory[0].id);
    });
    await expectInFront(page, '#weapon-slot-overlay button');
    await page.keyboard.press('Escape');
    await expect(page.locator('#game-dialog-overlay')).toBeVisible();
    await page.locator('#game-dialog-cancel').click();
    expect(failures).toEqual([]);
});
