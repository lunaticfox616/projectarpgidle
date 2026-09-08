const { test, expect } = require('@playwright/test');

async function start(page) {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        const raf = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = callback => callback === gameLoop ? 0 : raf(callback);
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
        game.settings.autoEquipEmptySlots = false; game.unlocks.items = true;
        switchTab('tab-items'); updateStaticUI();
    });
    return errors;
}

test('equipment dialog owns pickup, target protection and automatic salvage', async ({ page }, testInfo) => {
    const errors = await start(page);
    await expect(page.locator('#chk-item-filter-enabled')).toHaveCount(0);
    await page.locator('#btn-auto-salvage').click();
    const dialog = page.getByRole('dialog', { name: '장비 드랍 필터 및 해체 설정' });
    await expect(dialog).toBeVisible();
    await dialog.locator('#loot-target-add').click();
    await dialog.getByLabel('목표 옵션 1', { exact: true }).selectOption('flatHp');
    await dialog.getByLabel('최소 수치 1', { exact: true }).fill('50');
    await dialog.getByLabel('최소 티어 1', { exact: true }).fill('6');
    await dialog.locator('#loot-target-enabled').check();
    await dialog.locator('summary').filter({ hasText: '습득 조건' }).click();
    await dialog.locator('#chk-item-filter-enabled').check();
    await dialog.locator('#chk-item-filter-rare').uncheck();
    await dialog.locator('#auto-salvage-rarity-chips .rarity-rare').click();
    await dialog.locator('#auto-salvage-toggle-btn').click();
    await expect(page.locator('#btn-auto-salvage')).toHaveAttribute('aria-label', '드랍 필터 · 자동해체 ON');
    const result = await page.evaluate(() => {
        const item = (id, value, rarity = 'rare') => ({ id, name: '생명력 시험 반지', slot: '반지', rarity,
            tier: 8, hiddenTier: 8, baseStats: [], stats: [{ id: 'flatHp', val: value, tier: 8 }] });
        const currency = game.currencies.magicBud;
        const desired = addItemToInventory(item(98101, 80));
        const weak = addItemToInventory(item(98102, 49));
        const unwanted = addItemToInventory(item(98103, 1, 'magic'));
        const loaded = mergeDefaults(JSON.parse(serializeSaveState(game)));
        equipmentLootUi.saveAndPreview();
        return { desired, weak, unwanted, kept: game.inventory.some(item => item.id === 98101),
            salvage: game.currencies.magicBud - currency, restored: loaded.settings.equipmentTargets };
    });
    expect(result).toMatchObject({ desired: true, weak: false, unwanted: false, kept: true, salvage: 1 });
    expect(result.restored).toMatchObject({ enabled: true, rules: [{ statId: 'flatHp', minValue: 50, minTier: 6 }] });
    await expect(dialog.locator('#loot-target-preview')).toContainText('개 보호');
    await dialog.locator('summary').filter({ hasText: '습득 조건' }).click();
    await dialog.locator('#loot-target-enabled').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('equipment-filter.png') });
    await dialog.getByRole('button', { name: '닫기', exact: true }).click();
    await expect(page.locator('#chk-item-filter-enabled')).toHaveCount(0);
    expect(errors).toEqual([]);
});

test('a real target drop presents its name and reason on the battlefield', async ({ page }, testInfo) => {
    const errors = await start(page);
    const effect = await page.evaluate(() => {
        closeAllWindows(); switchTab('tab-battle');
        const random = Math.random;
        try {
            Math.random = () => 0.5;
            const probe = generateEquipmentDrop({ isBoss: true });
            game.settings.equipmentTargets = equipmentLootPolicy.normalizeTargets({ enabled: true, minMatches: 1,
                rules: [{ statId: probe.stats[0].id, minValue: 0, minTier: 0 }] });
            battleFx.length = 0;
            rollEquipmentLoot({ id: 98700, isBoss: true }, getZone(1), 1);
            renderBattlefield(true);
            const fx = battleFx.find(row => row.type === 'lootCelebration');
            return { reason: fx.reason, name: fx.itemName };
        } finally { Math.random = random; }
    });
    expect(effect.reason).toBe('목표 옵션 일치');
    expect(effect.name).toBeTruthy();
    await page.locator('#battlefield-canvas').screenshot({ path: testInfo.outputPath('target-drop.png') });
    expect(errors).toEqual([]);
});

test('offline return shows compact highlights with snapshot tooltips and themed results', async ({ page, isMobile }, testInfo) => {
    const errors = await start(page);
    await page.evaluate(() => {
        game.settings.equipmentTargets = equipmentLootPolicy.normalizeTargets({ enabled: true, slot: 'any', scope: 'explicit',
            minMatches: 1, rules: [{ statId: 'flatHp', minValue: 50, minTier: 6 }] });
        const before = JSON.parse(serializeSaveState(game));
        const item = (id, name, rarity) => ({ ...createItemFromBase(chooseItemBase('반지',8),rarity,8), id, name, slot: '반지', rarity, tier: 8, hiddenTier: 8,
            baseStats: [], stats: [{ id: 'flatHp', val: 80, tier: 8 }] });
        game.inventory.push(item(98201, '여명의 생명 반지', 'rare'));
        const unique = generateUniqueItem(8,'반지'); unique.id=98202;unique.name='<빛의 약속>';
        game.offlineProgress.stash.push(unique);
        const after = JSON.parse(serializeSaveState(game));
        const summary = getBackgroundRewardSummary(before, after, { kills: 132, exp: 2560, expLost: 0, deaths: 0 }, 0);
        showBackgroundCombatResult({ summary, actualElapsedMs: 3600000, effectiveProgressMs: 2880000, stopped: false, capped: false });
    });
    const overlay = page.locator('#background-combat-result-overlay');
    await expect(overlay.locator('.loot-highlight-card')).toHaveCount(2);
    await expect(overlay).toContainText('목표 옵션 일치');
    await expect(overlay).toContainText('여명의 생명 반지');
    await expect(overlay).toContainText('<빛의 약속>');
    await expect(overlay.locator('.loot-highlight-card').last()).toContainText('방치 보관함');
    const itemButton=overlay.locator('.loot-highlight-card button').first();
    const tooltip=page.locator('#item-tooltip-box');
    if(isMobile) await itemButton.tap(); else await itemButton.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('여명의 생명 반지');
    await expect(tooltip).toContainText('80');
    expect(await tooltip.evaluate(element=>Number(getComputedStyle(element).zIndex))).toBeGreaterThan(
        await overlay.evaluate(element=>Number(getComputedStyle(element).zIndex)));
    await page.evaluate(()=>{
        game.inventory.find(item=>item.id===98201).stats[0].val=999;
        for(let i=0;i<100;i++) decorateCombatLogItemMessage('[새 전리품]',{id:99000+i,name:'새 전리품'});
        validateItemTooltipAnchor();
    });
    await expect(tooltip).toContainText('80');
    await expect(tooltip).not.toContainText('999');
    if(isMobile) {
        await overlay.locator('h2').tap();
        await expect(tooltip).not.toBeVisible();
        await overlay.locator('.loot-highlight-card button').last().tap();
    }
    else await overlay.locator('.loot-highlight-card button').last().focus();
    await expect(tooltip).toContainText('빛의 약속');
    await expect(tooltip).toBeVisible();
    await page.waitForTimeout(250);
    await expect(tooltip).toBeVisible();
    if(isMobile) expect(await tooltip.evaluate(element=>element.getBoundingClientRect().bottom<=window.innerHeight)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('offline-item-options.png') });
    await page.evaluate(()=>hideItemTooltip());
    await expect(overlay.getByRole('button',{name:'계속하기',exact:true})).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('offline-highlights.png') });
    await overlay.getByRole('button', { name: '장비 확인', exact: true }).click();
    await expect(overlay).toHaveCount(0);
    await expect(page.locator('#tab-items')).toBeVisible();
    await expect(tooltip).not.toBeVisible();
    await page.evaluate(()=>{
        document.body.classList.add('light-mode');
        showBackgroundCombatResult({summary:{},actualElapsedMs:3600000,effectiveProgressMs:0});
    });
    await expect(overlay.locator('.loot-highlight-card')).toHaveCount(0);
    expect(await overlay.locator('.background-combat-result-card').evaluate(element=>{
        const css=getComputedStyle(element);
        const probe=document.createElement('span');probe.style.background='var(--ui-surface-2)';element.appendChild(probe);
        const matches=css.backgroundColor===getComputedStyle(probe).backgroundColor;probe.remove();return matches;
    })).toBe(true);
    await overlay.getByRole('button',{name:'계속하기',exact:true}).click();
    await expect(overlay).toHaveCount(0);
    expect(errors).toEqual([]);
});
