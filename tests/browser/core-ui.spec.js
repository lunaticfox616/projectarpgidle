const { test, expect } = require('@playwright/test');

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
        if (/favicon|Failed to load resource/i.test(message.text())) return;
        failures.push(message.text());
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
        ['tab-map', 'switchMapSubtab', ['map-tab-zones', 'map-tab-abyss', 'map-tab-chaos-realm', 'map-tab-sky', 'map-tab-underworld', 'map-tab-ocean', 'map-tab-fishing']],
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

test('debug performance panel reports live frame and FX metrics', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page, '/?debug=perf');
    const panel = page.locator('#playtest-performance-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('p95');
    await expect(panel).toContainText('FX');
    expect(failures).toEqual([]);
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
    await page.route('https://**/rest/v1/rpc/get_ghost_arena', route => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({
            me: { rating: 1000 + fights * 12, wins: fights, losses: 0, draws: 0, matches: fights, active_skill: '독니 사출' },
            leaderboard: [{ rank: 1, nickname: '상대', ascend_class: 'gladiator', active_skill: '연속 베기', rating: 1040, wins: 4, losses: 2, draws: 1, provisional: true }],
            recent: []
        })
    }));
    await page.route('https://**/rest/v1/rpc/fight_ghost', route => {
        fights++;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
            opponent: '상대', opponentSkill: '연속 베기', result: 'win', ratingBefore: 1000, ratingAfter: 1012, ratingDelta: 12
        }) });
    });
    await page.evaluate(() => {
        cloudState.user = { id: 'browser-user' };
        cloudState.session = { access_token: 'test-token', expires_at: Math.floor(Date.now() / 1000) + 3600 };
        localStorage.setItem('arpg_social_nickname:browser-user', '테스터');
        socialState.nicknameUserId = null;
        switchTab('tab-social');
        renderSocialTab();
    });
    await expect(page.locator('.ghost-arena')).toContainText('내 레이팅 1000');
    await page.getByRole('button', { name: '상대 찾기' }).click();
    await expect(page.locator('.ghost-result')).toContainText('승리');
    await expect(page.locator('.ghost-result')).toContainText('+12');
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
    await expect(page.getByRole('button', { name: '고스트 친선 대결' })).toBeVisible();
    await page.getByRole('button', { name: '고스트 친선 대결' }).click();
    await expect(page.locator('#social-profile-pvp-result')).toContainText('친선전 무승부');
    await expect(page.locator('#social-profile-pvp-result')).toContainText('레이팅 변동 없음');
    expect(failures).toEqual([]);
});

test('mobile battle HUD stays within the viewport and exposes combat log', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'mobile layout assertion');
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page.locator('.player-health-frame')).toBeVisible();
    await expect(page.locator('#btn-combat-log-toggle')).toBeVisible();
    await page.locator('#btn-combat-log-toggle').click();
    await expect(page.locator('#log')).toBeVisible();
    expect(failures).toEqual([]);
});
