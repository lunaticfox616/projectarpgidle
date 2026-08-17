const { test, expect } = require('@playwright/test');
const TEST_ORIGIN = `http://127.0.0.1:${Math.max(1, Number(process.env.PLAYWRIGHT_PORT) || 4173)}/`;

async function openLocalGame(page, path = '/') {
    await page.route('https://**', route => route.fulfill({ status: 204, contentType: 'text/javascript', body: '' }));
    await page.goto(path);
    await expect(page.locator('.startup-local-save-warning')).toContainText('복구되지 않습니다');
    await page.locator('#btn-startup-guest').click();
    await expect(page.locator('#startup-overlay')).not.toHaveClass(/active/, { timeout: 20_000 });
    await expect(page.locator('#loading-overlay')).not.toHaveClass(/active/, { timeout: 20_000 });
    const heroOverlay = page.locator('#loop-hero-select-overlay');
    if (await heroOverlay.isVisible()) {
        await heroOverlay.locator('[data-hero-id]').first().click();
        await expect(heroOverlay).not.toHaveClass(/active/);
    }
    await expect(page.locator('#tab-battle')).toHaveClass(/active/);
}

function watchRuntimeFailures(page) {
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('console', message => {
        if (message.type() !== 'error') return;
        if (/Failed to load resource|ERR_NETWORK_ACCESS_DENIED/i.test(message.text())) return;
        failures.push(message.text());
    });
    page.on('response', response => {
        if (response.status() < 400 || !response.url().startsWith(TEST_ORIGIN)) return;
        failures.push(`${response.status()} ${response.url()}`);
    });
    page.on('requestfailed', request => {
        if (!request.url().startsWith(TEST_ORIGIN)) return;
        failures.push(`${request.failure().errorText} ${request.url()}`);
    });
    return failures;
}

test('guest mode is local-only and survives reload', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.level = 37;
        saveGame({ touchModifiedAt: true, skipCloudSync: true });
    });
    await page.reload();
    await page.locator('#btn-startup-guest').click();
    await expect.poll(() => page.evaluate(() => game.level)).toBe(37);
    expect(failures).toEqual([]);
});

test('a shrine appears on the battlefield and grants its blessing when clicked', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    const outcome = await page.evaluate(() => {
        game.shrineState = { activeId: null, spawnCell: null, pity: 19, spawned: 0, claimed: 0 };
        const result = shrineRuntime.advanceAfterEncounter({ type: 'act' }, game, () => 0.5);
        renderBattlefield(true);
        return { spawned: result.spawned, activeId: game.shrineState.activeId, spawnCell: game.shrineState.spawnCell };
    });
    expect(outcome.spawned).toBe(true);
    expect(outcome.activeId).toBeTruthy();
    expect(outcome.spawnCell).toEqual(expect.objectContaining({ gx: expect.any(Number), gy: expect.any(Number) }));
    await expect.poll(() => page.evaluate(() => !!battleVisualState.shrineHitbox)).toBe(true);
    const clickPoint = await page.evaluate(() => {
        const canvas = document.getElementById('battlefield-canvas');
        const rect = canvas.getBoundingClientRect();
        const hitbox = battleVisualState.shrineHitbox;
        return {
            x: rect.left + (hitbox.x + hitbox.width / 2) * rect.width / canvas.clientWidth,
            y: rect.top + (hitbox.y + hitbox.height / 2) * rect.height / canvas.clientHeight
        };
    });
    await page.mouse.click(clickPoint.x, clickPoint.y);
    await expect.poll(() => page.evaluate(() => game.shrineState.claimed)).toBe(1);
    expect(await page.evaluate(() => ({ activeId: game.shrineState.activeId,
        spawnCell: game.shrineState.spawnCell, buff: game.shrineBuff && game.shrineBuff.id })))
        .toEqual({ activeId: null, spawnCell: null, buff: outcome.activeId });
    await expect(page.locator('#ui-shrine-box')).toHaveCount(0);
    expect(failures).toEqual([]);
});

test('unlocked secondary tabs render after cross-tab navigation', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.level = 100;
        game.season = 30;
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        updateStaticUI();
    });
    const tabIds = [
        'tab-character', 'tab-char', 'tab-season', 'tab-expertise', 'tab-traits', 'tab-talent',
        'tab-items', 'tab-jewel', 'tab-map', 'tab-skills', 'tab-codex', 'tab-records',
        'tab-talisman', 'tab-cube', 'tab-growthboard', 'tab-settings'
    ];
    for (const tabId of tabIds) {
        await page.evaluate(id => switchTab(id), tabId);
        const tab = page.locator(`#${tabId}`);
        await expect(tab).toHaveClass(/active/);
        await expect.poll(async () => (await tab.innerText()).trim().length).toBeGreaterThan(0);
        await page.evaluate(() => switchTab('tab-settings'));
    }
    expect(failures).toEqual([]);
});

test('equipment triage classifies the current build without destabilizing selectors', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.combatHalted = true;
        game.enemies = [];
        game.unlocks.items = true;
        game.inventory = [
            { id: 98101, slot: '투구', name: '생존 시험 투구', baseName: '시험 투구', rarity: 'rare', baseStats: [], stats: [{ id: 'flatHp', val: 500 }] },
            { id: 98102, slot: '목걸이', name: '공격 시험 목걸이', baseName: '시험 목걸이', rarity: 'rare', baseStats: [], stats: [{ id: 'flatDmg', val: 250 }] },
            { id: 98103, slot: '허리띠', name: '특수 시험 허리띠', baseName: '시험 허리띠', rarity: 'unique', baseStats: [], stats: [] }
        ];
        game.equipment['투구'] = null;
        game.equipment['목걸이'] = null;
        game.equipment['허리띠'] = null;
        switchTab('tab-items');
        switchItemSubtab('item-tab-equip');
        updateStaticUI();
        window.__equipmentSlotOptionMutations = 0;
        const slotSelect = document.getElementById('ui-equipment-slot-filter');
        new MutationObserver(records => {
            window.__equipmentSlotOptionMutations += records.filter(record => record.type === 'childList').length;
        }).observe(slotSelect, { childList: true });
    });
    const triage = page.locator('#ui-equipment-triage');
    await expect(triage).toContainText('호버 대신');
    await triage.getByRole('button', { name: '일괄 분석' }).click();
    await expect(triage).toContainText('3개 완료');
    const cards = page.locator('#ui-inventory-list .equipment-item-card');
    await expect(cards).toHaveCount(3);
    await expect(page.locator('#ui-inventory-list')).toContainText('공격 +');
    await expect(page.locator('#ui-inventory-list')).toContainText('생존 +');
    await expect(page.locator('#ui-inventory-list')).toContainText('특수');
    await triage.locator('select').selectOption('defense');
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText('생존 +');
    await page.evaluate(async () => {
        window.__equipmentSlotOptionMutations = 0;
        updateStaticUI();
        updateStaticUI();
        await new Promise(resolve => setTimeout(resolve, 120));
    });
    expect(await page.evaluate(() => window.__equipmentSlotOptionMutations)).toBe(0);
    expect(failures).toEqual([]);
});

test('equipment presets swap owned gear atomically and stay usable on narrow screens', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    const initial = await page.evaluate(() => {
        game.level = 100;
        game.season = 20;
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        const swordBase = BASE_ITEM_DB.find(base => base.slot === '무기' && !base.dropOnly && !base.realmBase);
        const helmetBase = BASE_ITEM_DB.find(base => base.slot === '투구' && !base.dropOnly && !base.realmBase);
        const sword = createItemFromBase(swordBase, 'rare', 10);
        const helmet = createItemFromBase(helmetBase, 'rare', 10);
        const bossSword = createItemFromBase(swordBase, 'rare', 12);
        sword.name = '사냥검';
        helmet.name = '사냥 투구';
        bossSword.name = '보스검';
        game.equipment = { ...defaultGame.equipment, '무기': sword, '투구': helmet };
        game.inventory = [bossSword];
        switchTab('tab-items');
        switchItemSubtab('item-tab-equip');
        updateStaticUI();
        return { swordId: sword.id, helmetId: helmet.id, bossSwordId: bossSword.id };
    });

    const panel = page.locator('.equipment-preset-panel');
    expect(failures).toEqual([]);
    const mobileLoadoutButton = page.locator('#btn-equipment-mobile-loadout');
    if (await mobileLoadoutButton.isVisible()) await mobileLoadoutButton.click();
    await expect(panel).toBeVisible();
    await expect(panel.locator('.equipment-preset-slot')).toHaveCount(3);
    await panel.getByRole('button', { name: '현재 장비 저장' }).click();
    await expect(panel.locator('.equipment-preset-slot').first()).toContainText('현재 적용');
    await expect(panel.locator('.equipment-preset-slot').first()).toContainText('2부위');

    await page.evaluate(ids => {
        const savedSword = game.equipment['무기'];
        const bossSword = game.inventory.find(item => item.id === ids.bossSwordId);
        game.equipment['무기'] = bossSword;
        game.inventory = [savedSword];
        selectForCrafting('무기', true);
        updateStaticUI();
    }, initial);
    await expect(panel.locator('.equipment-preset-slot').first()).not.toContainText('현재 적용');
    await expect(page.locator('#ui-inventory-list .equipment-preset-protected')).toHaveText('세팅 보호');
    await expect(page.locator('#ui-inventory-list .equipment-card-danger')).toBeDisabled();
    await panel.getByRole('button', { name: '세팅 불러오기' }).click();

    const applied = await page.evaluate(ids => ({
        weaponId: game.equipment['무기'] && game.equipment['무기'].id,
        helmetId: game.equipment['투구'] && game.equipment['투구'].id,
        inventoryIds: game.inventory.map(item => item.id),
        savedWeaponProtected: equipmentLoadoutRuntime.isReferenced(ids.swordId),
        craftSelection: getCraftSelectionRef()
    }), initial);
    expect(applied).toEqual({
        weaponId: initial.swordId,
        helmetId: initial.helmetId,
        inventoryIds: [initial.bossSwordId],
        savedWeaponProtected: true,
        craftSelection: null
    });
    await expect(panel.locator('.equipment-preset-slot').first()).toContainText('현재 적용');

    await page.setViewportSize({ width: 320, height: 800 });
    await page.evaluate(() => setEquipmentMobilePane('loadout'));
    await expect(panel).toBeVisible();
    const layout = await panel.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: document.documentElement.clientWidth };
    });
    expect(layout.left).toBeGreaterThanOrEqual(-1);
    expect(layout.right).toBeLessThanOrEqual(layout.width + 1);
    expect(failures).toEqual([]);
});

test('endgame support screens keep primary actions and interaction state visible', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.level = 200;
        game.season = 31;
        game.loopCount = 30;
        game.loopProgressCurrent = { ...(game.loopProgressCurrent || {}), chaos20Cleared: true };
        game.chaosRealm = { ...ensureChaosRealmState(), unlocked: true };
        game.clearedRootBosses = Array.from(new Set([...(game.clearedRootBosses || []), 's6_beast_cerberus']));
        game.abyssEndlessDepth = 30;
        game.labyrinthUnlockedMaxFloor = 100;
        game.underworldProgress = { currentFloor: 12, highestFloor: 18, floor10Cleared: true };
        game.underworldRunes = { unlockedSlots: 3, unlockedRunesMaxNumber: 9, obtainedRunes: [1, 2, 2], equippedRunes: [1, null, 2, null, null, null], enhanceLvByNo: {}, bonusLinesByNo: {} };
        game.selectedHeroId = 'hero1';
        game.ascendClass = 'warrior';
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        let cube = ensureCoreCubeState();
        Object.assign(cube, { unlocked: true, everUnlocked: true, relockUntilDrop: false, powers: { 7: 2, 12: 1 }, faces: [null, null, null, null, null, null], selectedFace: 0, completed: false });
        game.talentCards = { hero1__warrior: { level: 3, score: 20, count: 1 }, hero2__warrior: { level: 2, score: 12, count: 1 } };
        game.talentCardLoadout = ['hero1__warrior', null, null, null, null, null];
        let base = GROWTH_BASE_DB.find(row => row.category === 'flower');
        game.growthInventory = [createGrowthItemFromBase(base, 'rare', 12)];
        game.recentGrowthDrops = [];
        switchTab('tab-map');
        switchMapSubtab('map-tab-underworld');
        updateStaticUI();
    });
    await page.evaluate(() => toggleGoalDrawer(false));

    await expect(page.locator('.underworld-entry-card')).toBeVisible();
    await expect(page.getByRole('button', { name: '최고층 18 입장' })).toBeVisible();
    await expect(page.locator('.underworld-action-grid button')).toHaveCount(6);
    const runeInventory = page.locator('details[data-ui-disclosure="underworld-rune-inventory"]');
    await runeInventory.locator(':scope > summary').click();
    await expect(runeInventory).toHaveAttribute('open', '');
    await page.evaluate(() => updateStaticUI());
    await expect(runeInventory).toHaveAttribute('open', '');
    const entryBeforeManagement = await page.evaluate(() => Boolean(document.querySelector('.underworld-entry-card').compareDocumentPosition(document.querySelector('.underworld-panel')) & Node.DOCUMENT_POSITION_FOLLOWING));
    expect(entryBeforeManagement).toBe(true);

    await page.evaluate(() => { switchTab('tab-cube'); updateStaticUI(); });
    await expect(page.locator('.core-cube-assembly')).toBeVisible();
    await expect(page.locator('.core-cube-assembly .core-cube-face')).toHaveCount(6);
    await expect(page.locator('.core-cube-assembly .core-cube-power')).toHaveCount(2);
    await expect(page.locator('.core-cube-stage-options')).toBeVisible();
    await expect(page.locator('.core-cube-stage-options')).toContainText('발현 옵션');
    await expect(page.locator('.core-cube-side')).not.toContainText('발현 결과');
    await page.locator('.core-cube-power').first().click();
    await expect(page.locator('.core-cube-assembly-head')).toContainText('2번 면 선택');

    await page.evaluate(() => { switchTab('tab-talent'); updateStaticUI(); });
    await expect(page.locator('.talent-bloom-navigator')).toBeVisible();
    await expect(page.getByRole('button', { name: '재능별' })).toBeVisible();
    await expect(page.getByRole('button', { name: '직업별' })).toBeVisible();
    await expect(page.locator('.talent-current-combo')).toContainText('궁수');
    await expect(page.locator('.talent-current-combo')).toContainText('워리어');
    await expect(page.locator('.talent-combo-cell')).toHaveCount(12);
    await expect(page.locator('.talent-combo-cell.current')).toContainText('아방가르드');
    await expect(page.locator('.talent-slot.filled')).toContainText('아방가르드');
    await expect(page.locator('.talent-slot.filled')).toContainText('궁수 × 워리어');
    await page.locator('.talent-bloom-navigator > summary').click();
    await expect(page.locator('.talent-bloom-navigator')).not.toHaveAttribute('open', '');
    await page.evaluate(() => updateStaticUI());
    await expect(page.locator('.talent-bloom-navigator')).not.toHaveAttribute('open', '');

    await page.evaluate(() => { switchTab('tab-growthboard'); updateStaticUI(); });
    const craftBench = page.locator('details[data-growth-disclosure="craft-bench"]');
    await craftBench.locator(':scope > summary').click();
    await expect(craftBench).toHaveAttribute('open', '');
    await page.evaluate(() => {
        let base = GROWTH_BASE_DB.find(row => row.category === 'leaf');
        game.growthInventory.push(createGrowthItemFromBase(base, 'magic', 12));
        updateStaticUI();
    });
    await expect(craftBench).toHaveAttribute('open', '');
    expect(failures).toEqual([]);
});

test('craft, gem, map and accessory subtabs remain usable', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.level = 200;
        game.season = 60;
        game.maxZoneId = 20;
        game.chaosInfuserUnlocked = true;
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        game.conditionGemUnlocked = true;
        updateStaticUI();
    });
    const groups = [
        ['tab-items', 'switchItemSubtab', ['item-tab-equip', 'item-tab-craft', 'item-tab-fossil', 'item-tab-market', 'item-tab-infuser']],
        ['tab-skills', 'switchSkillSubtab', ['skill-tab-equip', 'skill-tab-enhance', 'skill-tab-research', 'skill-tab-condition']],
        ['tab-map', 'switchMapSubtab', ['map-tab-zones', 'map-tab-abyss', 'map-tab-chaos-realm', 'map-tab-sky', 'map-tab-underworld', 'map-tab-ocean', 'map-tab-fishing', 'map-tab-pvp']],
        ['tab-talisman', 'switchTalismanSubtab', ['talisman-sub-board', 'talisman-sub-colony-ward']]
    ];
    for (const [tabId, switcher, panels] of groups) {
        await page.evaluate(id => switchTab(id), tabId);
        for (const panelId of panels) {
            await page.evaluate(([name, id]) => window[name](id), [switcher, panelId]);
            await expect(page.locator(`#${panelId}`)).toHaveClass(/active/);
        }
    }
    await page.evaluate(() => {
        switchTab('tab-items');
        switchItemSubtab('item-tab-infuser');
    });
    await expect(page.locator('#ui-infuser-growth-list')).toHaveCount(0);
    await page.evaluate(() => {
        switchTab('tab-map');
        switchMapSubtab('map-tab-zones');
    });
    for (const panelId of ['map-explore-hunting', 'map-explore-chaos', 'map-explore-root-boss', 'map-explore-labyrinth', 'map-explore-deep-chaos', 'map-explore-meteor', 'map-explore-beehive', 'map-explore-colony', 'map-explore-voidrift', 'map-explore-timerift', 'map-explore-trials']) {
        await page.evaluate(id => switchMapExploreSubtab(id), panelId);
        await expect(page.locator(`#${panelId}`)).toHaveClass(/active/);
    }
    expect(failures).toEqual([]);
});

test('ocean fishing exposes strategy, collection growth and explicit crafting target', async ({ page }, testInfo) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.season = 30;
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        game.ocean = createDefaultOceanState();
        game.ocean.unlocked = true;
        game.ocean.depthM = 720;
        game.ocean.checkpointM = 700;
        game.ocean.pressureLevel = 7;
        game.ocean.fishingGauge = 62;
        game.ocean.rareFishPity = 72;
        game.ocean.reefInstalled = 4;
        Object.keys(OCEAN_FISH_DB).forEach((key, index) => {
            game.ocean.fishStock[key] = 99;
            game.ocean.fishCaughtTotal[key] = index < 5 ? index + 1 : 0;
        });
        game.ocean.lastCatch = { key: 'abyssAngler', at: Date.now(), guaranteed: true };
        game.equipment['무기'] = {
            id: 990100,
            slot: '무기',
            baseId: 'ocean_browser_weapon',
            baseName: '심해 검증 무기',
            name: '희귀한 심해 검증 무기',
            rarity: 'rare',
            baseStats: [{ id: 'flatDmg', statName: '피해', val: 20 }],
            stats: [{ id: 'crit', statName: '치명타 확률', val: 4, tier: 3 }]
        };
        clearCraftSelection();
        switchTab('tab-map');
        switchMapSubtab('map-tab-fishing');
        updateStaticUI();
    });

    await expect(page.locator('.ocean-strategy-card')).toHaveCount(3);
    await expect(page.locator('.ocean-fish-card')).toHaveCount(8);
    await expect(page.locator('.ocean-milestone')).toHaveCount(4);
    await expect(page.locator('.ocean-meter--pity')).toContainText('72%');
    await expect(page.locator('.ocean-last-catch')).toContainText('심연 등불고기');
    await expect(page.locator('.ocean-craft-target')).toContainText('선택된 장비 없음');
    await expect(page.locator('.ocean-recipe-card button', { hasText: '대상 선택 필요' }).first()).toBeDisabled();
    await page.evaluate(() => {
        const base = GROWTH_BASE_DB.find(row => row.category === 'flower');
        const growthItem = createGrowthItemFromBase(base, 'rare', 12);
        game.growthInventory = [growthItem];
        selectForCrafting(growthItem.id, false);
        updateStaticUI();
    });
    await expect(page.locator('.ocean-craft-target')).toContainText('일반 장비가 아님');
    await expect(page.locator('.ocean-recipe-card button', { hasText: '대상 선택 필요' }).first()).toBeDisabled();

    await page.locator('.ocean-strategy-card', { hasText: '심연 투망' }).click();
    await expect.poll(() => page.evaluate(() => game.ocean.fishingStrategy)).toBe('abyss');
    await expect(page.locator('.ocean-strategy-card.selected')).toContainText('심연 투망');
    await page.evaluate(() => {
        game.ocean.diving = true;
        updateStaticUI();
    });
    await expect(page.locator('.ocean-strategy-card:disabled')).toHaveCount(3);

    await page.evaluate(() => {
        game.ocean.diving = false;
        selectForCrafting('무기', true);
        updateStaticUI();
    });
    await expect(page.locator('.ocean-craft-target.selected')).toContainText('희귀한 심해 검증 무기');
    await expect(page.locator('.ocean-recipe-card.ready')).not.toHaveCount(0);
    const chaseRecipes = page.locator('[data-ui-disclosure="sea-gift-chase"]');
    await chaseRecipes.locator(':scope > summary').click();
    await expect(chaseRecipes).toHaveAttribute('open', '');
    await page.evaluate(() => renderSeaGiftPanel());
    await expect(chaseRecipes).toHaveAttribute('open', '');
    const layout = await page.locator('#map-tab-fishing').evaluate(element => ({
        overflow: element.scrollWidth - element.clientWidth,
        strategyColumns: getComputedStyle(element.querySelector('.ocean-strategy-grid')).gridTemplateColumns.split(' ').length
    }));
    expect(layout.overflow).toBeLessThanOrEqual(1);
    expect(layout.strategyColumns).toBe(testInfo.project.name === 'mobile-chromium' ? 1 : 3);
    expect(failures).toEqual([]);
});

test('equipment crafting shows the exact last change and repeats without losing the target', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.level = 200;
        game.season = 20;
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        const base = BASE_ITEM_DB.find(row => row.slot === '무기' && !row.dropOnly && !row.realmBase);
        const item = createItemFromBase(base, 'rare', 10);
        game.inventory = [item];
        game.currencies.deepWhetstone = 2;
        switchTab('tab-items');
        switchItemSubtab('item-tab-craft');
        selectForCrafting(item.id, false);
    });

    await expect(page.locator('.craft-result-ledger')).toHaveCount(0);
    await page.evaluate(() => useCurrency('deepWhetstone'));
    const result = page.locator('.craft-result-ledger');
    await expect(result).toHaveCount(1);
    await expect(result).toBeVisible();
    await expect(result).toContainText('품질 0% → 1%');
    await expect(result.locator('[data-repeat-craft="deepWhetstone"]')).toContainText('다시 사용 · 1');
    await result.locator('[data-repeat-craft="deepWhetstone"]').click();
    await expect(result).toContainText('품질 1% → 2%');
    await expect(result.locator('[data-repeat-craft="deepWhetstone"]')).toContainText('다시 사용 · 0');
    await expect.poll(() => page.evaluate(() => getSelectedCraftItem().quality)).toBe(2);
    expect(failures).toEqual([]);
});

test('salvaged equipment can be recovered for its exact reward on desktop and mobile', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.combatHalted = true;
        game.enemies = [];
        game.season = 2;
        game.unlocks.items = true;
        game.currencies.magicBud = 0;
        game.inventory = [{
            id: 990001, name: '복구 시험 장화', baseName: '가죽 장화', slot: '신발',
            rarity: 'normal', hiddenTier: 3, stats: []
        }];
        salvageItem(0);
        switchTab('tab-items');
        updateStaticUI();
    });

    const shortcut = page.locator('#btn-salvage-recovery');
    await expect(shortcut).toHaveAttribute('aria-label', /복구 가능 장비 1개/);
    await shortcut.click();
    const overlay = page.locator('#salvage-recovery-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('복구 시험 장화');
    await expect(overlay).toContainText('마법의 새싹 1개');
    const layout = await overlay.locator('.salvage-recovery-panel').evaluate(panel => {
        const rect = panel.getBoundingClientRect();
        return { width: rect.width, right: rect.right, bottom: rect.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight };
    });
    expect(layout.width).toBeGreaterThan(250);
    expect(layout.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.bottom).toBeLessThanOrEqual(layout.viewportHeight + 1);

    await overlay.getByRole('button', { name: '재화 반환 후 복구' }).click();
    await expect(overlay).toContainText('복구할 장비가 없습니다.');
    const restored = await page.evaluate(() => ({
        inventory: game.inventory.map(item => item.name),
        magicBud: game.currencies.magicBud,
        recoveryCount: game.salvageRecovery.entries.length
    }));
    expect(restored).toEqual({ inventory: ['복구 시험 장화'], magicBud: 0, recoveryCount: 0 });
    await expect(shortcut).toHaveAttribute('aria-label', /비어 있음/);
    expect(failures).toEqual([]);
});

test('codex hunt targets expose sources and survive loot automation', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.level = 200;
        game.season = 31;
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        game.uniqueCodex = {};
        game.uniqueHuntTargets = [];
        switchTab('tab-codex');
        updateStaticUI();
    });

    const card = page.locator('.codex-card').filter({ hasText: '핏빛 톱날' });
    await expect(card).toBeVisible();
    await expect(card).toContainText('미등록');
    await card.getByRole('button', { name: /파밍 추적/ }).click();
    const tracker = page.locator('.unique-hunt-panel');
    await expect(tracker).toContainText('핏빛 톱날');
    await expect(tracker).toContainText('1/3');
    const trackerLayout = await tracker.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, viewportWidth: innerWidth };
    });
    expect(trackerLayout.left).toBeGreaterThanOrEqual(-1);
    expect(trackerLayout.right).toBeLessThanOrEqual(trackerLayout.viewportWidth + 1);
    await tracker.getByRole('button', { name: '드랍처 보기' }).click();
    await expect(page.locator('#map-tab-zones')).toHaveClass(/active/);
    await expect(page.locator('#map-explore-hunting')).toHaveClass(/active/);
    await page.evaluate(() => switchTab('tab-codex'));

    const result = await page.evaluate(() => {
        Object.keys(game.equipment).forEach((slot, index) => {
            game.equipment[slot] = { id: 60000 + index, name: `시험 ${slot}`, slot, rarity: 'normal', baseStats: [], stats: [] };
        });
        game.settings.itemFilterEnabled = true;
        game.settings.itemFilterRarities.unique = false;
        game.settings.autoSalvageEnabled = true;
        game.settings.autoSalvageRarities.unique = true;
        const item = generateUniqueItem(20, null, '핏빛 톱날');
        const accepted = addItemToInventory(item);
        return {
            accepted,
            inventoryNames: game.inventory.map(entry => entry.name),
            targets: game.uniqueHuntTargets.slice(),
            registered: !!game.uniqueCodex['무기|핏빛 톱날']
        };
    });
    expect(result).toEqual({ accepted: true, inventoryNames: ['핏빛 톱날'], targets: [], registered: true });
    await expect(tracker).not.toContainText('핏빛 톱날');
    await expect(card.getByRole('button', { name: /파밍 추적/ })).toHaveAttribute('aria-pressed', 'false');
    expect(failures).toEqual([]);
});

test('debug performance panel reports live frame and FX metrics', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page, '/?debug=perf');
    const panel = page.locator('#playtest-performance-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('p95');
    await expect(panel).toContainText('FX');
    expect(failures).toEqual([]);
});

test('bounty HUD card reveals its reward and owns the cancel action', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.season = 2;
        game.loopCount = 1;
        game.currentZoneId = 0;
        game.unlocks.season = true;
        game.seenTutorials = Array.from(new Set([...(game.seenTutorials || []), 'unlock_season_tab']));
        game.bountyHunt = { pity: 9, offerIds: [], activeId: null, status: 'idle', offered: 0,
            accepted: 0, completed: 0, abandoned: 0 };
        bountyRuntime.advanceAfterBossKill(getZone(0), { isBoss: true });
        updateStaticUI();
    });

    const hud = page.locator('#ui-bounty-box');
    const offer = hud.getByRole('button', { name: /희귀 표적 발견/ });
    await expect(offer).toBeVisible();
    await offer.click();
    await expect(page.locator('.game-choice-option')).toHaveCount(3);
    await expect(page.locator('.game-choice-option').first()).toContainText('위험:');
    await expect(page.locator('.game-choice-option').first()).toContainText('보상:');
    await page.locator('.game-choice-option').first().click();
    await expect(page.locator('#game-dialog-overlay')).not.toHaveClass(/active/);

    const active = hud.getByRole('button', { name: /현상금 보상 확인 및 취소/ });
    await expect(active).toContainText('다음 사냥에 출현');
    await expect(hud.locator('.bounty-hud-dismiss')).toHaveCount(0);
    await active.click();
    const dialog = page.locator('#game-dialog-overlay');
    await expect(dialog).toHaveClass(/active/);
    await expect(dialog).toContainText('위험:');
    await expect(dialog).toContainText('보상:');
    await dialog.getByRole('button', { name: '계속 추적' }).click();
    await expect(dialog).not.toHaveClass(/active/);
    await expect(active).toBeVisible();

    await active.click();
    await dialog.getByRole('button', { name: '추적 취소' }).click();
    const state = await page.evaluate(() => ({ activeId: game.bountyHunt.activeId,
        abandoned: game.bountyHunt.abandoned }));
    expect(state).toEqual({ activeId: null, abandoned: 1 });
    await expect(hud).toContainText('현상금 흔적');
    expect(failures).toEqual([]);
});

test('blizzard sprites load and rapid recasts keep one field visual', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    const result = await page.evaluate(() => {
        battleFx = [];
        for (let cast = 0; cast < 12; cast++) {
            addBattleFx('combatTravel', {
                patternKind: 'field', skillName: '난타 눈보라', duration: 1400
            });
        }
        return {
            ambientReady: !!(battleAssets.images.skillFxBlizzardAmbient
                && battleAssets.images.skillFxBlizzardAmbient.naturalWidth),
            impactReady: !!(battleAssets.images.skillFxBlizzardImpact
                && battleAssets.images.skillFxBlizzardImpact.naturalWidth),
            activeFields: battleFx.filter(fx => fx.skillName === '난타 눈보라').length
        };
    });
    expect(result).toEqual({ ambientReady: true, impactReady: true, activeFields: 1 });
    expect(failures).toEqual([]);
});

test('global UI keeps native font smoothing and compact HUD text at full scale', async ({ page }, testInfo) => {
    const failures = watchRuntimeFailures(page);
    if (testInfo.project.name === 'desktop-chromium') {
        await page.setViewportSize({ width: 1280, height: 720 });
    }
    await openLocalGame(page);
    const rendering = await page.evaluate(() => {
        const scaleOf = selector => {
            const transform = getComputedStyle(document.querySelector(selector)).transform;
            if (transform === 'none') return 1;
            return Number(transform.match(/^matrix\(([^,]+)/)?.[1] || 1);
        };
        return {
            smoothing: getComputedStyle(document.body).getPropertyValue('-webkit-font-smoothing'),
            enemyScale: scaleOf('#enemy-area'),
            playerScale: scaleOf('.player-hud')
        };
    });
    expect(rendering.smoothing).toBe('auto');
    expect(rendering.enemyScale).toBe(1);
    expect(rendering.playerScale).toBe(1);
    expect(failures).toEqual([]);
});

test('gem tooltips reuse computed stats and avoid live-canvas blur', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    const result = await page.evaluate(() => {
        game.level = 200;
        game.season = 60;
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        game.skills = Object.keys(SKILL_DB).filter(name => SKILL_DB[name] && SKILL_DB[name].isGem);
        game.supports = Object.keys(SUPPORT_GEM_DB);
        switchTab('tab-skills');
        performUpdateStaticUI();

        const originalGetPlayerStats = window.getPlayerStats;
        let renderStatCalls = 0;
        window.getPlayerStats = (...args) => {
            renderStatCalls++;
            return originalGetPlayerStats(...args);
        };
        game.gemFoldInactiveAttack = !game.gemFoldInactiveAttack;
        performUpdateStaticUI();

        let tooltipStatCalls = 0;
        window.getPlayerStats = (...args) => {
            tooltipStatCalls++;
            return originalGetPlayerStats(...args);
        };
        const skillName = game.skills[0];
        for (let index = 0; index < 80; index++) {
            showGemTooltip({ clientX: 120 + index, clientY: 180 }, 'active', skillName);
        }
        window.getPlayerStats = originalGetPlayerStats;
        const tooltip = document.getElementById('info-tooltip');
        const backdrop = getComputedStyle(tooltip).backdropFilter;
        const card = document.querySelector('.skill-gem.gem-library-card');
        return {
            renderStatCalls,
            tooltipStatCalls,
            backdrop,
            hasMoveRenderer: !!(card && card.getAttribute('onmousemove'))
        };
    });
    expect(result.renderStatCalls).toBeLessThanOrEqual(5);
    expect(result.tooltipStatCalls).toBe(0);
    expect(['none', '']).toContain(result.backdrop);
    expect(result.hasMoveRenderer).toBe(false);
    await page.waitForTimeout(50);
    const rendering = await page.evaluate(() => {
        const info = document.getElementById('info-tooltip');
        const item = document.getElementById('item-tooltip-box');
        const infoStyle = getComputedStyle(info);
        const itemStyle = getComputedStyle(item);
        const rect = info.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        return {
            fontFamilyMatches: infoStyle.fontFamily === itemStyle.fontFamily,
            fontSizeMatches: infoStyle.fontSize === itemStyle.fontSize,
            willChange: infoStyle.willChange,
            physicalX: rect.left * dpr,
            physicalY: rect.top * dpr
        };
    });
    expect(rendering.fontFamilyMatches).toBe(true);
    expect(rendering.fontSizeMatches).toBe(true);
    expect(rendering.willChange).toBe('auto');
    expect(Math.abs(rendering.physicalX - Math.round(rendering.physicalX))).toBeLessThan(0.001);
    expect(Math.abs(rendering.physicalY - Math.round(rendering.physicalY))).toBeLessThan(0.001);
    expect(failures).toEqual([]);
});

test('closing a custom dialog restores focus before hiding it', async ({ page }) => {
    const ariaWarnings = [];
    page.on('console', message => {
        if (/Blocked aria-hidden/i.test(message.text())) ariaWarnings.push(message.text());
    });
    await openLocalGame(page);
    await page.evaluate(() => { requestGameConfirmation({ title: '확인', message: '포커스 검사' }); });
    await page.locator('#game-dialog-confirm').click();
    await expect(page.locator('#game-dialog-overlay')).toHaveAttribute('aria-hidden', 'true');
    expect(ariaWarnings).toEqual([]);
});

test('cloud history and admin operations render through authenticated RPCs', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page, '/?admin=1');
    await page.route('https://**/rest/v1/rpc/list_cloud_save_versions', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify([
            { revision: 8, saved_at: '2026-08-12T01:00:00Z', is_current: true, loop_number: 31 },
            { revision: 7, saved_at: '2026-08-11T01:00:00Z', is_current: false, loop_number: 30 }
        ])
    }));
    await page.route('https://**/rest/v1/rpc/admin_get_ops_dashboard', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({
            overview: { players: 4, runs: 22, errors: 1 },
            alerts: [{ severity: 'warning', zone_id: 'colony_run', message: '긴 클리어 시간', runs: 8 }],
            zones: [], builds: [], errors: []
        })
    }));
    await page.evaluate(() => {
        cloudState.user = { id: 'browser-admin' };
        cloudState.session = { access_token: 'test-token', expires_at: Math.floor(Date.now() / 1000) + 3600 };
    });
    await page.evaluate(() => switchTab('tab-settings'));
    await page.getByRole('button', { name: '저장 이력' }).click();
    await expect(page.locator('#cloud-tools-dialog')).toBeVisible();
    await expect(page.locator('#cloud-tools-body')).toContainText('리비전 8');
    await page.locator('#cloud-tools-dialog').getByRole('button', { name: '닫기', exact: true }).click();
    await page.locator('#btn-ops-dashboard').click();
    await expect(page.locator('#cloud-tools-body')).toContainText('플레이어 4');
    await expect(page.locator('#cloud-tools-body')).toContainText('긴 클리어 시간');
    expect(failures).toEqual([]);
});

test('ghost arena shows server-ranked asynchronous duel results', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    let fights = 0;
    let registrationBody = null;
    await page.route('https://**/rest/v1/rpc/get_ghost_arena', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({
            combatProtocolVersion: 4,
            me: { rating: 1000 + fights * 12, wins: fights, losses: 0, draws: 0, matches: fights, active_skill: '독니 사출' },
            leaderboard: [{ rank: 1, nickname: '상대', ascend_class: 'gladiator', active_skill: '연속 베기', rating: 1040, wins: 4, losses: 2, draws: 1, provisional: true }],
            recent: []
        })
    }));
    await page.route('https://**/rest/v1/rpc/fight_ghost', route => {
        fights++;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
            opponent: '상대', opponentSkill: '연속 베기', result: 'win', ratingBefore: 1000, ratingAfter: 1012, ratingDelta: 12,
            duel: {
                seed: 'browser-duel', winner: 'left', durationMs: 2400,
                leftFinalPct: 72, rightFinalPct: 0,
                left: { nickname: '테스터', snapshot: { heroId: 'hero1', activeSkill: '독니 사출', skillElement: 'chaos', style: 'projectile' } },
                right: { nickname: '상대', snapshot: { heroId: 'hero2', activeSkill: '연속 베기', skillElement: 'phys', style: 'melee' } },
                events: [{ t: 600, left: { outcome: 'hit', damage: 100, crit: false, strikes: 1 }, right: { outcome: 'deflect', damage: 28, crit: false, strikes: 1 }, leftPct: 72, rightPct: 0 }]
            }
        }) });
    });
    await page.route('https://**/rest/v1/rpc/register_my_ghost', route => {
        registrationBody = route.request().postDataJSON();
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.route('https://**/rest/v1/player_profiles**', route => {
        if (route.request().method() === 'GET') {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ nickname: '테스터' }]) });
        }
        return route.fulfill({ status: 204, body: '' });
    });
    await page.evaluate(() => {
        cloudState.user = { id: 'browser-user' };
        cloudState.session = { access_token: 'test-token', expires_at: Math.floor(Date.now() / 1000) + 3600 };
        localStorage.setItem('arpg_social_nickname:browser-user', '테스터');
        socialState.nicknameUserId = null;
        game.level = 100;
        game.season = 30;
        game.maxZoneId = 20;
        game.activeSkill = '독니 사출';
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        updateStaticUI();
        switchTab('tab-social');
        renderSocialTab();
    });
    await expect(page.locator('#tab-social .ghost-arena')).toHaveCount(0);
    await expect(page.locator('#tab-social')).not.toContainText('고스트 대결');
    await page.evaluate(() => {
        switchTab('tab-map');
        switchMapSubtab('map-tab-pvp');
    });
    await expect(page.locator('#map-tab-pvp.active .ghost-arena')).toBeVisible();
    await expect(page.locator('.ghost-arena')).toContainText('내 레이팅 1000');
    await expect(page.locator('.ghost-arena')).toContainText('대전 간 20초');
    await expect(page.locator('.ghost-arena')).toContainText('랭크 20회/24시간');
    await page.evaluate(() => registerMyGhost());
    await expect.poll(() => registrationBody).not.toBeNull();
    await expect.poll(() => page.evaluate(() => ghostArenaState.loading)).toBe(false);
    expect(registrationBody.p_snapshot.schemaVersion).toBe(1);
    expect(registrationBody.p_snapshot.activeSkill).toBe('독니 사출');
    expect(registrationBody.p_snapshot.dps).toBeGreaterThan(0);
    await page.evaluate(() => { ghostArenaState.data.combatProtocolVersion = 3; renderGhostArena(); });
    await expect(page.getByRole('button', { name: '상대 찾기' })).toBeDisabled();
    await expect(page.locator('.ghost-arena')).toContainText('DB가 아직 적용되지 않았습니다');
    await page.evaluate(() => { ghostArenaState.data.combatProtocolVersion = 4; ghostArenaState.message = ''; renderGhostArena(); });
    await page.evaluate(() => fightRandomGhost());
    await expect(page.locator('.ghost-duel-canvas')).toBeVisible();
    await expect.poll(() => page.evaluate(() => !!ghostDuelReplayRuntime.state)).toBe(true);
    const replayBeforeRefresh = await page.evaluate(() => {
        window.__ghostCanvasBeforeRefresh = document.querySelector('.ghost-duel-canvas');
        window.__ghostRootBeforeRefresh = ghostDuelReplayRuntime.state && ghostDuelReplayRuntime.state.root;
        return ghostDuelReplayRuntime.state && ghostDuelReplayRuntime.state.elapsed;
    });
    await page.evaluate(() => {
        game.inventory.push({ id: 987654321, name: '대전 갱신 검사 장비', slot: '무기', rarity: 'normal', stats: [], baseStats: [] });
        updateStaticUI();
        game.inventory = game.inventory.filter(item => item && item.id !== 987654321);
        updateStaticUI();
    });
    await page.waitForTimeout(180);
    const replayAfterRefresh = await page.evaluate(() => ({
        sameCanvas: document.querySelector('.ghost-duel-canvas') === window.__ghostCanvasBeforeRefresh,
        sameRoot: ghostDuelReplayRuntime.state && ghostDuelReplayRuntime.state.root === window.__ghostRootBeforeRefresh,
        elapsed: ghostDuelReplayRuntime.state && ghostDuelReplayRuntime.state.elapsed
    }));
    expect(replayAfterRefresh.sameCanvas).toBe(true);
    expect(replayAfterRefresh.sameRoot).toBe(true);
    expect(replayAfterRefresh.elapsed).toBeGreaterThan(replayBeforeRefresh);
    await expect(page.locator('.ghost-result')).toContainText('승리');
    await expect(page.locator('.ghost-result')).toContainText('+12');
    await expect(page.locator('.ghost-result')).not.toHaveClass(/ghost-duel-result-pending/, { timeout: 10_000 });
    await expect.poll(() => page.evaluate(() => ghostDuelReplayRuntime.frameId)).toBe(0);
    const targetId = '22222222-2222-4222-8222-222222222222';
    await page.route('https://**/rest/v1/player_profiles**', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify([{
            nickname: '상대', profile_data: { nickname: '상대', level: 80, className: '검투사', loop: 30, stats: [] }, updated_at: '2026-08-12T01:00:00Z'
        }])
    }));
    await page.route('https://**/rest/v1/rpc/fight_ghost_target', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({
            opponent: '상대', opponentSkill: '연속 베기', result: 'draw', ratingBefore: 1012, ratingAfter: 1012, ratingDelta: 0, ranked: false
        })
    }));
    await page.evaluate(id => openPlayerProfile(id), targetId);
    await expect(page.getByRole('button', { name: '대전 탭에서 친선전' })).toBeVisible();
    await page.getByRole('button', { name: '대전 탭에서 친선전' }).click();
    await expect(page.locator('#map-tab-pvp')).toHaveClass(/active/);
    await expect(page.locator('.ghost-friendly')).toContainText('상대');
    await page.evaluate(() => {
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
    });
    await page.getByRole('button', { name: '친선 대결 시작' }).click();
    await expect(page.locator('#map-tab-pvp .ghost-friendly + .ghost-result')).toContainText('친선전 무승부');
    await expect(page.locator('#map-tab-pvp .ghost-friendly + .ghost-result')).toContainText('레이팅 변동 없음');
    expect(failures).toEqual([]);
});

test('player exchange keeps trade inputs stable and rankings readable', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.route('https://**/rest/v1/rpc/get_player_exchange', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({
            listings: [{ id: 41, sellerName: '상대', price: 12, isMine: false,
                item: { id: 9000000000041, name: '서릿빛 검', slot: '무기', rarity: 'rare', stats: [{ id: 'flatDmg', val: 18 }] } }],
            mine: [],
            unclaimedProceeds: 19,
            loopRanking: [{ nickname: '순환자', loop_count: 17, dps: 88000, ascend_class: '검투사', active_skill: '연속 베기' }],
            dpsRanking: [{ nickname: '화력왕', loop_count: 12, dps: 123456, ascend_class: '원소술사', active_skill: '유성 낙화' }]
        })
    }));
    await page.evaluate(() => {
        cloudState.configured = true;
        cloudState.user = { id: 'exchange-user' };
        cloudState.session = { access_token: 'test-token', expires_at: Math.floor(Date.now() / 1000) + 3600 };
        cloudState.revisionSupported = true;
        game.saveMeta.cloudRevision = 4;
        game.inventory = [{ id: 771, name: '판매할 투구', slot: '투구', rarity: 'magic', stats: [{ id: 'flatHp', val: 22 }] }];
        game.level = 100;
        game.season = 20;
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        updateStaticUI();
        switchTab('tab-map');
        switchMapSubtab('map-tab-pvp');
        switchPlayerArenaSection('trade');
    });
    await expect(page.locator('#map-player-trade')).toContainText('서릿빛 검');
    await page.locator('#player-trade-price').fill('37');
    await page.getByRole('button', { name: '판매 선택' }).click();
    await expect(page.locator('#player-trade-price')).toHaveValue('37');
    await expect(page.locator('#map-player-trade')).toContainText('황금률 12');
    await expect(page.getByRole('button', { name: '판매금 19 수령' })).toBeVisible();

    await page.getByRole('button', { name: '루프·DPS 순위' }).click();
    await expect(page.locator('#map-player-ranking')).toContainText('17 루프');
    await expect(page.locator('#map-player-ranking')).toContainText('123,456');
    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const rightEdge = await page.locator('#map-tab-pvp').evaluate(element => element.getBoundingClientRect().right);
    expect(rightEdge).toBeLessThanOrEqual(viewportWidth + 1);
    expect(failures).toEqual([]);
});

test('mobile battle HUD stays within the viewport and exposes combat log', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'mobile layout assertion');
    const failures = watchRuntimeFailures(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await openLocalGame(page);
    await page.evaluate(() => {
        document.getElementById('ui-combat-zone-inline').textContent = '시간의 균열: 무너져 내리는 영원의 회랑';
        syncMapCompleteActionQuickControl();
    });
    for (const width of [320, 360, 390]) {
        await page.setViewportSize({ width, height: 800 });
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const compactHud = await page.evaluate(() => {
            const rect = selector => document.querySelector(selector).getBoundingClientRect();
            const overlaps = (left, right) => left.right > right.left + 1
                && left.left < right.right - 1 && left.bottom > right.top + 1 && left.top < right.bottom - 1;
            const zoneTitle = document.getElementById('ui-combat-zone-inline');
            const action = document.getElementById('btn-map-complete-action-picker');
            const settingsTab = document.getElementById('btn-tab-settings');
            const zoneRect = zoneTitle.getBoundingClientRect();
            const goalRect = rect('#ui-goal-toggle');
            const progressRect = rect('.map-progress-row');
            const actionsRect = rect('.combat-zone-actions');
            const playerRect = rect('.player-hud');
            const battlefieldRect = rect('.battlefield-wrap');
            action.scrollIntoView({ block: 'nearest', inline: 'end' });
            return {
                pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                zoneTitleClipped: zoneTitle.scrollWidth > zoneTitle.clientWidth + 1
                    || zoneTitle.scrollHeight > zoneTitle.clientHeight + 1,
                settingsTextClipped: settingsTab.scrollWidth > settingsTab.clientWidth + 1,
                actionTextClipped: action.scrollWidth > action.clientWidth + 1,
                actionRight: action.getBoundingClientRect().right,
                viewportWidth: document.documentElement.clientWidth,
                goalOverlapsZoneTitle: overlaps(goalRect, zoneRect),
                progressOverlapsActions: overlaps(progressRect, actionsRect),
                playerHudWidth: playerRect.width,
                battlefieldWidth: battlefieldRect.width
            };
        });
        expect(compactHud.pageOverflow).toBeLessThanOrEqual(1);
        expect(compactHud.zoneTitleClipped).toBe(false);
        expect(compactHud.settingsTextClipped).toBe(false);
        expect(compactHud.actionTextClipped).toBe(false);
        expect(compactHud.actionRight).toBeLessThanOrEqual(compactHud.viewportWidth + 1);
        expect(compactHud.goalOverlapsZoneTitle).toBe(false);
        expect(compactHud.progressOverlapsActions).toBe(false);
        expect(compactHud.playerHudWidth).toBeGreaterThanOrEqual(compactHud.battlefieldWidth - 1);
    }
    await expect(page.locator('.player-health-frame')).toBeVisible();
    await expect(page.locator('#btn-combat-log-toggle')).toBeVisible();
    await page.evaluate(() => {
        let feed = document.querySelector('.combat-feed');
        if (feed && feed.classList.contains('collapsed')) toggleCombatLogCollapse();
    });
    await expect(page.locator('#log')).toBeVisible();
    expect(failures).toEqual([]);
});

test('map cards show readiness grades and keep approximate numbers in the tooltip', async ({ page }, testInfo) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.level = 100;
        game.season = 10;
        game.loopCount = 9;
        game.maxZoneId = 9;
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        switchTab('tab-map');
        switchMapSubtab('map-tab-zones');
        switchMapExploreSubtab('map-explore-hunting');
        performUpdateStaticUI();
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
    });
    const power = page.locator('#map-explore-hunting .map-power-estimate').first();
    await expect(power).toBeVisible();
    await expect(power).toContainText('예상 DPS');
    await expect(power).toContainText('권장 EHP');
    await expect(power).toContainText(/낮음|적정|높음/);
    if (testInfo.project.name.startsWith('mobile')) await power.focus();
    else await power.hover();
    await expect(page.locator('#info-tooltip')).toContainText('내 DPS 약');
    await expect(page.locator('#info-tooltip')).toContainText('내 EHP 약');
    expect(failures).toEqual([]);
});

test('atlas pinnacle bosses expose realm milestones and allow ticketless challenges', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.season = 31;
        game.loopCount = 30;
        game.maxZoneId = 12;
        game.underworldProgress = { currentFloor: 30, highestFloor: 31, floor10Cleared: true };
        game.ocean = { ...game.ocean, unlocked: true, depthM: 1000, bossClearM: 1000 };
        game.skyTower = { ...game.skyTower, unlocked: true, currentFloor: 30, highestFloor: 31, clearedFloors: [30] };
        game.clearedRootBosses = ['pinnacle_underking', 'pinnacle_leviathan', 'pinnacle_sky'];
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        switchTab('tab-map');
        switchMapSubtab('map-tab-zones');
        switchMapExploreSubtab('map-explore-root-boss');
        performUpdateStaticUI();
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
    });
    const panel = page.locator('#map-explore-root-boss');
    await expect(panel).toContainText('아틀라스 최종 관문');
    await expect(panel).toContainText('지핵군주 모르그란');
    await expect(panel).toContainText('무광해의 포식자 탈라사');
    await expect(panel).toContainText('빈 왕좌의 집행자 카엘룸');
    await expect(panel).toContainText('경계의 관측자 베일라');
    const observer = panel.locator('.map-item').filter({ hasText: '경계의 관측자 베일라' });
    await expect(observer).toContainText('최종 관문 격파 3/4');
    await expect(observer).not.toHaveAttribute('onclick', /changeZone/);
    const underking = panel.locator('.map-item').filter({ hasText: '지핵군주 모르그란' });
    await expect(underking).toContainText('재도전 가능');
    await underking.getByRole('button', { name: '도전' }).click();
    await expect.poll(() => page.evaluate(() => game.currentZoneId)).toBe('pinnacle_underking');
    expect(failures).toEqual([]);
});

test('cosmos boss detail keeps readiness compact and reveals approximate values on hover', async ({ page }, testInfo) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.season = 31;
        game.loopCount = 30;
        game.journalEntries = Array.from(new Set([...(game.journalEntries || []), 'woodsman']));
        game.underworldProgress = { ...(game.underworldProgress || {}), highestFloor: 30, currentFloor: 30 };
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        switchTab('tab-map');
        switchMapSubtab('map-tab-cosmos');
        focusCosmosCapstoneBoss('planet-46');
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
    });
    const detail = page.locator('#ui-cosmos-detail');
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('하말리스');
    await expect(detail).toContainText('예상 DPS');
    await expect(detail).toContainText('권장 EHP');
    await expect(detail).not.toContainText('예상 적 특성');
    await expect(detail).not.toContainText('대응:');
    const readiness = detail.locator('.map-power-estimate');
    await expect(readiness).toContainText(/낮음|적정|높음/);
    if (testInfo.project.name.startsWith('mobile')) await readiness.focus();
    else await readiness.hover();
    await expect(page.locator('#info-tooltip')).toContainText('내 DPS 약');
    await expect(page.locator('#info-tooltip')).toContainText('권장 약');
    await expect(page.locator('#info-tooltip')).toContainText('내 EHP 약');
    await detail.getByRole('button', { name: '우주석 관리' }).evaluate(button => button.click());
    const stoneOverlay = page.locator('#cosmos-stone-overlay');
    await expect(stoneOverlay).toBeVisible();
    await expect(stoneOverlay).toContainText('우주석 장착');
    await stoneOverlay.locator('.cosmos-stone-overlay-close').evaluate(button => button.click());
    await expect(stoneOverlay).toBeHidden();
    const visibleCanvasSize = await page.locator('#cosmos-atlas-canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
    await page.evaluate(() => {
        switchMapSubtab('map-tab-zones');
        performUpdateStaticUI();
    });
    const hiddenCanvasSize = await page.locator('#cosmos-atlas-canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
    expect(hiddenCanvasSize).toEqual(visibleCanvasSize);
    expect(failures).toEqual([]);
});

test('cosmos expedition signals change risk and persist into the battle contract', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.season = 31;
        game.loopCount = 30;
        game.journalEntries = Array.from(new Set([...(game.journalEntries || []), 'woodsman']));
        game.underworldProgress = { ...(game.underworldProgress || {}), highestFloor: 30, currentFloor: 30 };
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        game.cosmosAtlas = {
            ...(game.cosmosAtlas || {}), unlocked: true, cleared: ['planet-0', 'planet-46'],
            bossClears: ['planet-46'], bossKills: { 'planet-46': 1 }, selectedId: 'planet-46',
            selectedDirectives: {}, directiveCycles: {}
        };
        game.combatHalted = true;
        switchTab('tab-map');
        switchMapSubtab('map-tab-cosmos');
        focusCosmosCapstoneBoss('planet-46');
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
    });
    const detail = page.locator('#ui-cosmos-detail');
    const cards = detail.locator('.cosmos-directive-card');
    await expect(cards).toHaveCount(3);
    await expect(detail.locator('.cosmos-directive-card.selected')).toHaveCount(1);
    const readiness = detail.locator('.map-power-estimate');
    const safeTarget = await readiness.evaluate(element => ({
        dps: Number(element.dataset.recommendedDps), ehp: Number(element.dataset.recommendedEhp)
    }));
    const riskyCard = detail.locator('.cosmos-directive-card:not(.selected)').first();
    const riskyId = await riskyCard.getAttribute('data-cosmos-directive-id');
    await riskyCard.evaluate(button => button.click());
    const selectedRisk = detail.locator(`[data-cosmos-directive-id="${riskyId}"]`);
    await expect(selectedRisk).toHaveClass(/selected/);
    await expect(selectedRisk).toHaveAttribute('aria-pressed', 'true');
    const riskyTarget = await readiness.evaluate(element => ({
        dps: Number(element.dataset.recommendedDps), ehp: Number(element.dataset.recommendedEhp)
    }));
    expect(riskyTarget.dps).toBeGreaterThan(safeTarget.dps);
    expect(riskyTarget.ehp).toBeGreaterThan(safeTarget.ehp);
    await detail.getByRole('button', { name: '은하 보스 재도전' }).evaluate(button => button.click());
    const battleContract = await page.evaluate(() => {
        const zone = getZone('cosmos_challenge');
        game.combatHalted = true;
        game.enemies = [];
        return { zoneId: game.currentZoneId, directiveId: zone.cosmosDirective.id, rewardMul: zone.cosmosDirective.rewardMul };
    });
    expect(battleContract).toEqual({ zoneId: 'cosmos_challenge', directiveId: riskyId, rewardMul: expect.any(Number) });
    expect(battleContract.rewardMul).toBeGreaterThan(1);
    const repeatNodeId = await page.evaluate(() => {
        game.cosmosAtlas.activeChallenge = null;
        game.currentZoneId = 0;
        if (!continueCosmosChallengeAfterClear('nextZone')) return null;
        const nodeId = game.cosmosAtlas.activeChallenge && game.cosmosAtlas.activeChallenge.nodeId;
        exploreSelectedCosmosNode(nodeId);
        game.cosmosAtlas.activeChallenge = null;
        game.currentZoneId = 0;
        renderCosmosAtlas();
        return nodeId;
    });
    expect(repeatNodeId).toBeTruthy();
    await expect(detail.getByRole('button', { name: '새 신호 재탐사' })).toBeEnabled();
    await expect(detail.locator('.cosmos-directive-card')).toHaveCount(3);
    await expect(detail.locator('.cosmos-directive-title')).toContainText('새 신호가 포착되었습니다');
    expect(failures).toEqual([]);
});

test('market exchange selector survives auto-salvage currency updates', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.season = 10;
        game.maxZoneId = 5;
        game.inventory = [];
        game.currencies.magicBud = 20;
        Object.keys(game.unlocks).forEach(key => { game.unlocks[key] = true; });
        switchTab('tab-items');
        switchItemSubtab('item-tab-market');
        performUpdateStaticUI();
    });
    const selector = page.locator('#ui-market-exchange-from');
    await selector.focus();
    await expect(selector).toBeFocused();
    await page.evaluate(() => {
        window.__marketExchangeSelectorBeforeSalvage = document.getElementById('ui-market-exchange-from');
        for (let index = 0; index < 4; index++) {
            awardCurrency('magicBud', 1);
            updateStaticUI();
        }
    });
    expect(await page.evaluate(() => document.getElementById('ui-market-exchange-from') === window.__marketExchangeSelectorBeforeSalvage)).toBe(true);
    await expect(selector).toBeFocused();
    await expect(selector).toHaveValue('magicBud');
    await selector.blur();
    await expect(page.locator('[data-market-exchange-balance]')).toContainText('보유 24개');
    expect(failures).toEqual([]);
});
