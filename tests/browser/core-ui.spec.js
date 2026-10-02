const { test, expect } = require('@playwright/test');
const { pickClass } = require('./helpers');
const TEST_ORIGIN = `http://127.0.0.1:${Math.max(1, Number(process.env.PLAYWRIGHT_PORT) || 4173)}/`;

async function openLocalGame(page, path = '/') {
    await page.route('https://**', route => route.fulfill({ status: 204, contentType: 'text/javascript', body: '' }));
    await page.goto(path);
    await expect(page.locator('.startup-local-save-warning')).toContainText('복구되지 않습니다');
    await page.locator('#btn-startup-guest').click();
    await expect(page.locator('#startup-overlay')).not.toHaveClass(/active/, { timeout: 20_000 });
    await expect(page.locator('#loading-overlay')).not.toHaveClass(/active/, { timeout: 20_000 });
    const heroOverlay = page.locator('#loop-hero-select-overlay');
    const needsHeroSelection = await page.evaluate(() => !game.heroSelectionInitialized);
    if (needsHeroSelection) {
        await expect(heroOverlay).toBeVisible();
        await expect(heroOverlay.locator('[data-class-id]')).toHaveCount(6);
        await pickClass(page);
        await expect(heroOverlay).not.toHaveClass(/active/);
    }
    await dismissVisibleTutorials(page);
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
        const errorText = request.failure().errorText;
        // 새로고침·화면 이동 때 브라우저가 취소한 요청은 실패가 아니다(없는 자산은 위 404 검사가 잡는다).
        if (/ERR_ABORTED/.test(errorText)) return;
        failures.push(`${errorText} ${request.url()}`);
    });
    return failures;
}

async function dismissVisibleTutorials(page) {
    await page.waitForFunction(() => {
        // Fixture updates can enqueue unlock notices in the next UI frame.
        if (uiRefreshQueued || uiRefreshRunning) return false;
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
        return true;
    });
    await expect(page.locator('#tutorial-overlay.active')).not.toBeVisible();
}

test('login preloads bounded battle assets without frame polling and resumes after entry', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    const battleRequests = [];
    page.on('request', request => {
        if (/\/assets\/effects\//.test(request.url())) battleRequests.push(request.url());
    });
    await page.addInitScript(() => {
        window.observedFrames = 0;
        const requestFrame = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = callback => requestFrame(time => {
            window.observedFrames++;
            callback(time);
        });
    });
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await expect(page.locator('#startup-overlay')).toBeVisible();
    await page.waitForFunction(()=>battleAssets.ready);
    expect(battleRequests.length).toBeGreaterThan(0);
    const preparedRequests=battleRequests.length;
    expect(battleRequests.some(url=>url.includes('skill-lava-sheet'))).toBe(false);
    expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
    const frames = await page.evaluate(() => observedFrames);
    await page.waitForTimeout(700);
    expect(await page.evaluate(() => observedFrames)).toBe(frames);
    expect(battleRequests.length).toBe(preparedRequests);
    // Social sign-in stays folded until asked for; the brand buttons are inside it.
    await expect(page.locator('#startup-social-login')).not.toHaveAttribute('open', /.*/);
    await expect(page.locator('#btn-startup-google')).toBeHidden();
    await page.locator('#btn-startup-guest').click();
    await expect(page.locator('#loading-overlay')).not.toHaveClass(/active/);
    await pickClass(page);
    await dismissVisibleTutorials(page);
    expect(battleRequests.length).toBe(preparedRequests);
    const playingFrames = await page.evaluate(() => observedFrames);
    await expect.poll(() => page.evaluate(() => observedFrames)).toBeGreaterThan(playingFrames + 3);
    for (let repeat = 0; repeat < 2; repeat++) {
        await page.evaluate(() => openStartupGate());
        await expect(page.locator('#startup-overlay')).toBeVisible();
        await page.waitForTimeout(200);
        const pausedFrames = await page.evaluate(() => observedFrames);
        await page.waitForTimeout(700);
        expect(await page.evaluate(() => observedFrames)).toBe(pausedFrames);
        await page.locator('#btn-startup-back').click();
        await expect(page.locator('#startup-overlay')).not.toBeVisible();
        await expect.poll(() => page.evaluate(() => observedFrames)).toBeGreaterThan(pausedFrames + 3);
        await expect(page.locator('#battlefield-canvas')).toBeVisible();
    }
    expect(failures).toEqual([]);
});

async function prepareResetCase(page, cloud = false) {
    if (cloud) await page.route('**/cloud-save-config.js*', route => route.fulfill({
        contentType: 'text/javascript',
        body: "window.CLOUD_SAVE_CONFIG = { enabled: true, supabaseUrl: 'https://reset-test.invalid', supabaseAnonKey: 'test-only' };"
    }));
    await openLocalGame(page);
    await page.evaluate(cloud => {
        game.season = 17;
        game.loopCount = 16;
        if (cloud) {
            window.CLOUD_SAVE_CONFIG = { enabled: true, supabaseUrl: 'https://reset-test.invalid', supabaseAnonKey: 'test-only' };
            cloudState.configured = true;
            applyCloudSession({ access_token: 'reset-test-token', refresh_token: 'reset-refresh', expires_at: 4102444800,
                user: { id: 'reset-account', email: 'reset@example.invalid' } });
            game.saveMeta.cloudUserId = 'reset-account';
            game.saveMeta.cloudRevision = 2;
        }
        applySeasonContentProgression({ silent: true });
        checkUnlocks();
        detectNewMapUnlockAlarms();
        saveGame({ skipCloudSync: true });
        localStorage.setItem(LEGACY_SAVE_KEYS[0], localStorage.getItem(LOCAL_SAVE_KEY));
        localStorage.setItem('unrelated-preference', 'keep');
        switchTab('tab-settings');
    }, cloud);
    await dismissVisibleTutorials(page);
    const category = page.locator('#settings-category');
    if (await category.isVisible()) await category.selectOption('data');
}

test('save reset clears only local progress for a guest after one confirmation', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await prepareResetCase(page);
    await page.locator('[onclick="resetGame()"]').click();
    await expect(page.locator('#game-dialog-message')).toContainText('이 기기');
    await page.locator('#game-dialog-cancel').click();
    expect(await page.evaluate(() => game.season)).toBe(17);
    await page.locator('[onclick="resetGame()"]').click();
    // The startup overlay exists before deferred scripts run; await the next document instead.
    await Promise.all([
        page.waitForEvent('domcontentloaded'),
        page.locator('#game-dialog-confirm').click()
    ]);
    await expect(page.locator('#startup-overlay')).toHaveClass(/active/);
    expect(await page.evaluate(() => ({
        loop: game.season, user: cloudState.user,
        legacy: localStorage.getItem(LEGACY_SAVE_KEYS[0]), other: localStorage.getItem('unrelated-preference')
    }))).toEqual({ loop: 1, user: null, legacy: null, other: 'keep' });
    expect(failures).toEqual([]);
});

test('save reset replaces the signed-in account and does not restore old high-loop progress', async ({ page }, testInfo) => {
    const failures = watchRuntimeFailures(page);
    await prepareResetCase(page, true);
    const oldSave = await page.evaluate(() => JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY)));
    let remote = { user_id: 'reset-account', save_data: oldSave, revision: 7, updated_at: new Date().toISOString() };
    const writes = [];
    await page.route('https://reset-test.invalid/**', async route => {
        const request = route.request();
        if (request.url().includes('/auth/v1/token')) return route.fulfill({ json: {
            access_token: 'reset-test-token', refresh_token: 'reset-refresh', expires_at: 4102444800,
            user: { id: 'reset-account', email: 'reset@example.invalid' }
        } });
        if (!/\/cloud_saves\?|\/rpc\/commit_cloud_save$/.test(request.url())) return route.fulfill({ json: [] });
        expect(request.headers().authorization).toBe('Bearer reset-test-token');
        if (request.method() === 'GET') {
            expect(request.url()).toContain('user_id=eq.reset-account');
            return route.fulfill({ json: [remote] });
        }
        expect(request.url()).toContain('/rpc/commit_cloud_save');
        const body = request.postDataJSON();
        expect(await page.evaluate(() => ({
            loop: game.season, save: saveGame({ skipCloudSync: true }), exit: pushCloudSaveOnPageExit('visibilitychange')
        }))).toEqual({ loop: 17, save: false, exit: false });
        writes.push(body);
        expect(body.expected_revision).toBe(7);
        remote = { ...remote, save_data: body.next_save_data, revision: 8 };
        await route.fulfill({ json: [{ committed: true, current_revision: 8, saved_at: remote.updated_at }] });
    });
    await page.locator('[onclick="resetGame()"]').click();
    await expect(page.locator('#game-dialog-message')).toContainText('reset@example.invalid');
    expect(await page.evaluate(() => Number(getComputedStyle(document.getElementById('game-dialog-overlay')).zIndex)
        > Number(getComputedStyle(document.getElementById('game-toast-region')).zIndex))).toBe(true);
    await page.locator('#game-dialog-card').screenshot({ path: testInfo.outputPath('account-reset-confirm.png') });
    await Promise.all([
        page.waitForEvent('domcontentloaded'),
        page.locator('#game-dialog-confirm').click()
    ]);
    await expect.poll(() => writes.length).toBe(1);
    await expect(page.locator('#startup-overlay')).toHaveClass(/active/);
    await expect(page.locator('#btn-startup-continue')).toBeVisible();
    expect(await page.evaluate(() => cloudState.user.id)).toBe('reset-account');
    expect(remote.save_data.season).toBe(1);
    expect(remote.save_data.saveMeta.cloudUserId).toBe('reset-account');
    expect(remote.save_data.saveMeta.cloudResetRevision).toBe(8);
    // Simulate another device still holding the pre-reset save. Use real reconciliation and transport.
    await page.evaluate(oldSave => {
        window.CLOUD_SAVE_CONFIG = { enabled: true, supabaseUrl: 'https://reset-test.invalid', supabaseAnonKey: 'test-only' };
        cloudState.configured = true;
        applyCloudSession({ access_token: 'reset-test-token', user: { id: 'reset-account' } });
        game = mergeDefaults(oldSave);
        game.saveMeta.lastModifiedAt = Date.now() + 60000;
    }, oldSave);
    await page.evaluate(() => reconcileCloudSaveState({ preferRemoteOnResume: true }));
    expect(await page.evaluate(() => game.season)).toBe(1);
    expect(writes).toHaveLength(1);
    expect(await page.evaluate(() => cloudState.user.id)).toBe('reset-account');
    expect(failures).toEqual([]);
});

for (const failure of ['network', 'revision-conflict', 'account-change']) {
    test(`save reset preserves local progress on ${failure}`, async ({ page }) => {
        await prepareResetCase(page, true);
        const before = await page.evaluate(() => localStorage.getItem(LOCAL_SAVE_KEY));
        let writes = 0;
        await page.route('https://reset-test.invalid/**', async route => {
            if (!/\/cloud_saves\?|\/rpc\/commit_cloud_save$/.test(route.request().url())) return route.fulfill({ json: [] });
            if (failure === 'network') return route.fulfill({ status: 503, json: { message: 'test network unavailable' } });
            if (route.request().method() === 'GET') {
                return route.fulfill({ json: [{ user_id: 'reset-account', revision: 7, save_data: JSON.parse(before) }] });
            }
            writes += 1;
            await route.fulfill({ json: [{ committed: false, current_revision: 8 }] });
        });
        await page.locator('[onclick="resetGame()"]').click();
        if (failure === 'account-change') await page.evaluate(() => applyCloudSession({ access_token: 'different-token', user: { id: 'different-account' } }));
        await page.locator('#game-dialog-confirm').click();
        await expect(page.locator('#game-toast-region')).toContainText('초기화하지 못했습니다');
        expect(await page.evaluate(() => game.season)).toBe(17);
        expect(await page.evaluate(() => localStorage.getItem(LOCAL_SAVE_KEY))).toBe(before);
        expect(await page.evaluate(() => ({ busy: cloudState.busy, writable: canPersistLocalSave(), skip: !!window.__skipUnloadSaveOnce })))
            .toEqual({ busy: false, writable: true, skip: false });
        expect(writes).toBe(failure === 'revision-conflict' ? 1 : 0);
        await expect(page.locator('#startup-overlay')).not.toHaveClass(/active/);
    });
}

for (const cloud of [false, true]) {
    test(`save reset handles local storage failure with cloud=${cloud}`, async ({ page }) => {
        await prepareResetCase(page, cloud);
        const before = await page.evaluate(() => localStorage.getItem(LOCAL_SAVE_KEY));
        let remote = { user_id: 'reset-account', revision: 7, save_data: JSON.parse(before) };
        let writes = 0;
        await page.route('https://reset-test.invalid/**', async route => {
            if (!/\/cloud_saves\?|\/rpc\/commit_cloud_save$/.test(route.request().url())) return route.fulfill({ json: [] });
            if (route.request().method() === 'GET') return route.fulfill({ json: [remote] });
            writes += 1;
            remote = { ...remote, revision: 8, updated_at: new Date().toISOString(), save_data: route.request().postDataJSON().next_save_data };
            await route.fulfill({ json: [{ committed: true, current_revision: 8, saved_at: remote.updated_at }] });
        });
        await page.evaluate(() => {
            const setItem = Storage.prototype.setItem;
            window.restoreTestStorage = () => { Storage.prototype.setItem = setItem; };
            Storage.prototype.setItem = function (key, value) {
                if (key === LOCAL_SAVE_KEY) throw new DOMException('test quota exceeded', 'QuotaExceededError');
                return setItem.call(this, key, value);
            };
        });
        await page.locator('[onclick="resetGame()"]').click();
        await page.locator('#game-dialog-confirm').click();
        await expect(page.locator('#game-toast-region')).toContainText('초기화하지 못했습니다');
        expect(await page.evaluate(() => localStorage.getItem(LOCAL_SAVE_KEY))).toBe(before);
        expect(await page.evaluate(() => ({ loop: game.season, writable: canPersistLocalSave(), skip: !!window.__skipUnloadSaveOnce })))
            .toEqual({ loop: cloud ? 1 : 17, writable: !cloud, skip: false });
        expect(writes).toBe(cloud ? 1 : 0);
        await page.evaluate(() => window.restoreTestStorage());
        if (cloud) {
            await page.evaluate(() => reconcileCloudSaveState({ preferRemoteOnResume: true }));
            expect(await page.evaluate(() => JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY)).season)).toBe(1);
            expect(writes).toBe(1);
        }
    });
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

test('manual loop advance asks once and cancel preserves the ready state', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.pendingLoopReady = true;
        game.pendingLoopDecision = false;
        game.combatHalted = true;
        updateStaticUI();
    });
    await page.locator('#loop-ready-overlay').getByRole('button', { name: '장비 정리', exact: true }).click();
    const equipmentClose=page.locator('#tab-items [data-window-action="close"]');
    if (await equipmentClose.isVisible()) await equipmentClose.click();
    else await page.evaluate(() => switchTab('tab-battle'));
    await page.locator('#btn-combat-loop-advance').click();
    await expect(page.locator('#game-dialog-overlay')).toHaveClass(/active/);
    await expect(page.locator('#game-dialog-message')).toContainText('정말 지금 루프하시겠습니까?');
    expect(await page.evaluate(() => game.pendingLoopReady)).toBe(true);
    await page.locator('#game-dialog-cancel').click();
    await expect(page.locator('#game-dialog-overlay')).not.toHaveClass(/active/);
    expect(await page.evaluate(() => ({ ready: game.pendingLoopReady, decision: game.pendingLoopDecision })))
        .toEqual({ ready: true, decision: false });
    expect(failures).toEqual([]);
});

test('equipment presets swap owned gear atomically and stay usable on narrow screens', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    const initial = await page.evaluate(() => {
        clearInterval(gameTickHandle);
        gameTickHandle = null;
        game.combatHalted = true;
        game.level = 100;
        game.season = 20;
        game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(row=>row.id);
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
    await dismissVisibleTutorials(page);

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
        const copiedSword = JSON.parse(JSON.stringify(savedSword));
        copiedSword.id = Math.max(ids.swordId, ids.helmetId, ids.bossSwordId) + 1000;
        game.equipment['무기'] = bossSword;
        game.inventory = [savedSword, copiedSword];
        selectForCrafting('무기', true);
        updateStaticUI();
    }, initial);
    await expect(panel.locator('.equipment-preset-slot').first()).not.toContainText('현재 적용');
    const mobileInventoryButton = page.locator('#btn-equipment-mobile-inventory');
    if (await mobileInventoryButton.isVisible()) await mobileInventoryButton.click();
    const inventoryItems = page.locator('#ui-inventory-list .equipment-grid-item');
    const protectedItem = inventoryItems.filter({ hasText:'세팅' });
    await expect(protectedItem).toHaveCount(1);
    await protectedItem.click();
    await expect(page.locator('#ui-equipment-inventory-inspector')).toContainText('세팅 보호');
    await expect(page.locator('#ui-equipment-inventory-inspector .equipment-card-danger:disabled')).toHaveCount(1);
    await page.keyboard.press('Escape');
    const sameNameSalvage = inventoryItems.filter({ hasNotText:'세팅' });
    await expect(sameNameSalvage).toHaveCount(1);
    await sameNameSalvage.click();
    await expect(page.locator('#ui-equipment-inventory-inspector')).not.toContainText('세팅 보호');
    await page.locator('#ui-equipment-inventory-inspector .equipment-card-danger:not(:disabled)').click();
    await expect(page.locator('#ui-inventory-list .equipment-grid-item')).toHaveCount(1);
    await dismissVisibleTutorials(page);
    if (await mobileLoadoutButton.isVisible()) await mobileLoadoutButton.click();
    await panel.getByRole('button', { name: '세팅 불러오기' }).click();

    const applied = await page.evaluate(ids => ({
        weaponId: game.equipment['무기'] && game.equipment['무기'].id,
        helmetId: game.equipment['투구'] && game.equipment['투구'].id,
        inventoryIds: game.inventory.map(item => item.id),
        savedWeaponProtected: equipmentLoadoutRuntime.isReferenced(game.equipment['무기']),
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


// PR #1030 리뷰: 선택 창(코어 · 주얼 보관함 · 혼돈 주입 · 큐브 고르기)이 떠 있으면 단축키는 기다리고, Esc는 그 창만 닫는다.
// 전에는 C가 캐릭터 창을 밑에 열었고, Esc가 뒤의 장비 창을 닫아 선택 창만 떠 있었다.
test('selection overlays hold the keyboard: hotkeys wait and Esc closes only the overlay', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => { switchTab('tab-items'); coreItemsUi.open(); });
    await expect(page.locator('.selection-overlay')).toHaveCount(1);
    await page.keyboard.press('c');
    await expect(page.locator('#tab-character')).not.toHaveClass(/active/);
    await page.keyboard.press('Escape');
    await expect(page.locator('.selection-overlay')).toHaveCount(0);
    await expect(page.locator('#tab-items')).toHaveClass(/active/);
    expect(failures).toEqual([]);
});

// 선택 창 공통 틀(js/selection-dialog-ui.js, 2026-10-03): 다섯 창이 같은 틀과 키보드 동작을 쓴다. 전에는 창을 열어도 포커스가
// 뒤 화면에 남아 Tab이 뒤의 단추로 갔고, 홀씨 창에는 대화 상자 표시가 없었다.
const SELECTION_DIALOG_OPENERS = [
    ['코어', 'coreItemsUi.open()'],
    ['주얼 보관함', 'equipmentSocketsUi.openStore()'],
    ['소켓', `(() => { const ring = createItemFromBase(BASE_ITEM_DB.find(base => base.slot === '반지'), 'rare', 20, {});
        game.inventory.push(ring); equipmentSocketsUi.open(ring.id, false); })()`],
    ['혼돈 주입', `(() => { const armor = createItemFromBase(BASE_ITEM_DB.find(base => base.slot === '갑옷'), 'rare', 20, {});
        game.inventory.push(armor); chaosInfusionUi.open(armor.id, false); })()`],
    ['조합창에 넣을 재료', "stumpCubeUi.openCubePicker('equipment')"],
    ['홀씨 모드 선택', "(() => { selectForCrafting(null, false); openSporeModeOverlay('magicBud'); })()"]
];

// "창을 열면 게임 진행 일시 정지"를 켜 두면 다섯 창 모두 게임을 멈춘다. 전에는 홀씨 모드 창만 멈췄다.
const isGamePaused = page => page.evaluate(() => isForegroundGameplayPausedForBackground());

test('selection dialogs share one frame: focus moves in, Tab stays inside, Esc closes only the dialog', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => { game.settings.pauseGameOnOverlay = true; switchTab('tab-items'); });
    for (const [title, opener] of SELECTION_DIALOG_OPENERS) {
        expect(await isGamePaused(page), `${title}: the game runs before the dialog opens`).toBe(false);
        await page.evaluate(opener);
        const panel = page.locator('.selection-overlay .selection-overlay-panel');
        await expect(panel).toHaveCount(1);
        expect(await isGamePaused(page), `${title}: the overlay-pause setting pauses the game`).toBe(true);
        await expect(panel).toHaveAttribute('role', 'dialog');
        await expect(panel).toHaveAttribute('aria-modal', 'true');
        await expect(page.locator(`#${await panel.getAttribute('aria-labelledby')}`)).toContainText(title);
        await expect(panel, `${title}: opening moves focus into the dialog`).toBeFocused();
        await page.keyboard.press('Shift+Tab');
        const wrappedToLast = await page.evaluate(() => {
            const items = [...document.querySelectorAll('.selection-overlay-panel :is(button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]))')];
            return document.activeElement === items[items.length - 1];
        });
        expect(wrappedToLast, `${title}: Shift+Tab wraps to the last control`).toBe(true);
        await page.keyboard.press('Tab');
        await expect(panel.locator('[data-selection-close]'), `${title}: Tab wraps back to the close button`).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.locator('.selection-overlay')).toHaveCount(0);
        await expect(page.locator('#tab-items')).toHaveClass(/active/);
    }
    await page.evaluate(() => { game.settings.pauseGameOnOverlay = false; coreItemsUi.open(); });
    expect(await isGamePaused(page), 'with the setting off the game keeps running under a dialog').toBe(false);
    expect(failures).toEqual([]);
});

// 장착처럼 창 안에서 바꾸면 같은 창을 그 자리에서 다시 그린다. 전에는 창을 지우고 새로 만들어 목록이 맨 위로 올라가고
// 포커스가 사라졌다.
test('a selection dialog redraws in place: scroll and keyboard focus stay put', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    const before = await page.evaluate(() => {
        switchTab('tab-items');
        game.cores = coreItems.normalize({ equipped: null, owned: [] });
        for (let i = 0; i < CORE_ITEM_RULES.capacity; i++) game.cores.owned.push(coreItems.roll());
        coreItemsUi.open();
        const overlay = document.querySelector('.selection-overlay');
        const panel = overlay.querySelector('.selection-overlay-panel');
        overlay.dataset.redrawProbe = 'kept';
        panel.scrollTop = panel.scrollHeight;
        [...panel.querySelectorAll('.core-item-equip')].pop().focus();
        return { scroll: panel.scrollTop, max: panel.scrollHeight - panel.clientHeight };
    });
    expect(before.max).toBeGreaterThan(100);
    await page.keyboard.press('Enter');
    await expect(page.locator('.core-item-card.is-equipped')).toHaveCount(1);
    const after = await page.evaluate(() => {
        const overlay = document.querySelector('.selection-overlay');
        const panel = overlay.querySelector('.selection-overlay-panel');
        return { probe: overlay.dataset.redrawProbe, scroll: panel.scrollTop, max: panel.scrollHeight - panel.clientHeight,
            focusInside: panel.contains(document.activeElement) && document.activeElement !== panel };
    });
    expect(after.probe).toBe('kept');
    expect(after.scroll).toBeGreaterThan(0);
    expect(Math.abs(after.scroll - Math.min(before.scroll, after.max))).toBeLessThanOrEqual(1);
    expect(after.focusInside).toBe(true);
    expect(failures).toEqual([]);
});

// 선택 창 위의 확인 창(코어 버리기)이 Esc를 먼저 받고, 선택 창을 닫으면 포커스가 연 단추로 돌아간다.
test('a confirmation over a selection dialog takes Esc first, and closing returns focus to the opener', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'Esc and keyboard focus belong to the desktop (phones tap the core card itself)');
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => {
        game.contentProgression.inherited.push('cube');
        contentProgression.sync(game);
        game.cores = coreItems.normalize({ equipped: null, owned: [] });
        game.cores.owned.push(coreItems.roll());
        switchTab('tab-items');
        updateStaticUI();
    });
    const opener = page.locator('.core-item-slot .equipment-slot-action');
    await opener.click();
    await expect(page.locator('.selection-overlay')).toHaveCount(1);
    await page.locator('.core-item-discard').click();
    await expect(page.locator('#game-dialog-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#game-dialog-overlay')).toBeHidden();
    await expect(page.locator('.selection-overlay')).toHaveCount(1);
    await expect(page.locator('.core-item-list .core-item-card')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('.selection-overlay')).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(failures).toEqual([]);
});

// 휴대폰: 선택 창이 아래 메뉴 띠 위에 뜬다. 전에는 띠가 창 위에 남아(mobile.css의 규칙이 나중 파일에 덮였다) 누르면
// 창이 뜬 채 탭만 바뀌었다.
test('on phones a selection dialog covers the bottom menu', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chromium', 'the bottom menu belongs to the phone layout');
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    await page.evaluate(() => { switchTab('tab-items'); coreItemsUi.open(); });
    const point = await page.evaluate(() => {
        const box = document.getElementById('tab-header-bottom').getBoundingClientRect();
        const x = box.left + box.width / 2, y = box.top + box.height / 2;
        return { x, y, onTop: !!document.elementFromPoint(x, y)?.closest('.selection-overlay') };
    });
    expect(point.onTop).toBe(true);
    // 알림은 전처럼 선택 창 위에 보인다(창을 메뉴 띠 위로 올리며 알림까지 덮지 않게).
    await page.evaluate(() => showGameToast('선택 창 위 알림', { tone: 'warning', duration: 8000 }));
    const toast = page.locator('#game-toast-region .game-toast', { hasText: '선택 창 위 알림' });
    await expect(toast).toBeVisible();
    expect(await toast.evaluate(element => {
        const box = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
    })).toBe(true);
    await page.mouse.click(point.x, point.y);
    await expect(page.locator('#tab-items')).toHaveClass(/active/);
    expect(failures).toEqual([]);
});

// 클라우드 부담 줄이기(2026-10-03, Supabase 무료 플랜의 전송량): 업로드 전 확인은 세이브 요약만 받는다. 전에는 자동 업로드
// 한 번마다 세이브 전체를 두 번 내려받았다. 64KiB를 넘는 세이브도 화면이 숨겨지는 순간 올라간다(전에는 keepalive라 브라우저가 막았다).
test('cloud sync reads only a save summary before uploading, and a big save still uploads when the page hides', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await page.route('**/cloud-save-config.js*', route => route.fulfill({
        contentType: 'text/javascript',
        body: "window.CLOUD_SAVE_CONFIG = { enabled: true, supabaseUrl: 'https://traffic-test.invalid', supabaseAnonKey: 'test-only' };"
    }));
    const reads = [];
    const commits = [];
    let revision = 2;
    await page.route('https://traffic-test.invalid/**', async route => {
        const request = route.request();
        const url = decodeURIComponent(request.url());
        if (request.method() === 'GET' && url.includes('/cloud_saves?')) {
            reads.push(url);
            const row = { user_id: 'traffic-account', updated_at: '2026-10-01T00:00:00Z', revision };
            const save = { season: 1, loopCount: 0, saveMeta: { cloudRevision: revision } };
            return route.fulfill({ json: [url.includes('save_data->') ? { ...row, ...save } : { ...row, save_data: save }] });
        }
        if (url.endsWith('/rpc/commit_cloud_save')) {
            commits.push(Buffer.byteLength(request.postData() || ''));
            revision += 1;
            return route.fulfill({ json: [{ committed: true, current_revision: revision, saved_at: new Date().toISOString() }] });
        }
        return route.fulfill({ json: [] });
    });
    await openLocalGame(page);
    await page.evaluate(() => {
        cloudState.configured = true;
        applyCloudSession({ access_token: 'traffic-token', refresh_token: 'traffic-refresh', expires_at: 4102444800,
            user: { id: 'traffic-account', email: 'traffic@example.invalid' } });
        game.saveMeta.cloudUserId = 'traffic-account';
        game.saveMeta.cloudRevision = 2;
        game.level = Math.max(game.level, 5);
        saveGame({ skipCloudSync: true });
    });
    await page.evaluate(() => syncCloudSave({ automatic: true }));
    await expect.poll(() => commits.length).toBe(1);
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.filter(url => /[=,]save_data(?=[,&]|$)/.test(url)), 'no read before an upload selects the whole save').toEqual([]);

    await page.evaluate(() => {
        game.records = { ...(game.records || {}), trafficPad: 'x'.repeat(90000) };
        cloudState.lastCloudCommitAt = 0;
        return pushCloudSaveOnPageExit('visibilitychange');
    });
    await expect.poll(() => commits.length).toBe(2);
    expect(commits[1]).toBeGreaterThan(64 * 1024);
    expect(failures).toEqual([]);
});
