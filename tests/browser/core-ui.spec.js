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
        if (/Failed to load resource|ERR_NETWORK_ACCESS_DENIED/i.test(message.text())) return;
        failures.push(message.text());
    });
    page.on('response', response => {
        if (response.status() < 400 || !response.url().startsWith('http://127.0.0.1:4173/')) return;
        failures.push(`${response.status()} ${response.url()}`);
    });
    page.on('requestfailed', request => {
        if (!request.url().startsWith('http://127.0.0.1:4173/')) return;
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

test('debug performance panel reports live frame and FX metrics', async ({ page }) => {
    const failures = watchRuntimeFailures(page);
    await openLocalGame(page, '/?debug=perf');
    const panel = page.locator('#playtest-performance-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('p95');
    await expect(panel).toContainText('FX');
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
                seed: 'browser-duel', winner: 'left', durationMs: 120,
                leftFinalPct: 72, rightFinalPct: 0,
                left: { nickname: '테스터', snapshot: { heroId: 'hero1', activeSkill: '독니 사출', skillElement: 'chaos', style: 'projectile' } },
                right: { nickname: '상대', snapshot: { heroId: 'hero2', activeSkill: '연속 베기', skillElement: 'phys', style: 'melee' } },
                events: [{ t: 60, left: { outcome: 'hit', damage: 100, crit: false, strikes: 1 }, right: { outcome: 'deflect', damage: 28, crit: false, strikes: 1 }, leftPct: 72, rightPct: 0 }]
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
    await page.getByRole('button', { name: '고스트 갱신' }).click({ force: true });
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
    await expect(page.locator('.ghost-result')).toContainText('승리');
    await expect(page.locator('.ghost-result')).toContainText('+12');
    await expect(page.locator('.ghost-result')).not.toHaveClass(/ghost-duel-result-pending/, { timeout: 3000 });
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

test('mobile battle HUD stays within the viewport and exposes combat log', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('mobile'), 'mobile layout assertion');
    const failures = watchRuntimeFailures(page);
    for (const width of [320, 360, 390]) {
        await page.setViewportSize({ width, height: 800 });
        await openLocalGame(page);
        await page.evaluate(() => {
            document.getElementById('ui-combat-zone-inline').textContent = '시간의 균열: 무너져 내리는 영원의 회랑';
            syncMapCompleteActionQuickControl();
        });
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
    await page.locator('#btn-combat-log-toggle').click();
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
    const visibleCanvasSize = await page.locator('#cosmos-atlas-canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
    await page.evaluate(() => {
        switchMapSubtab('map-tab-zones');
        performUpdateStaticUI();
    });
    const hiddenCanvasSize = await page.locator('#cosmos-atlas-canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height }));
    expect(hiddenCanvasSize).toEqual(visibleCanvasSize);
    expect(failures).toEqual([]);
});

test('market exchange selector survives unrelated loot UI updates', async ({ page }) => {
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
        game.inventory.push({ id: 987654, slot: '무기', name: '회귀 검증 전리품', rarity: 'normal', stats: [] });
        performUpdateStaticUI();
    });
    await expect(selector).toBeFocused();
    await expect(selector).toHaveValue('magicBud');
    expect(failures).toEqual([]);
});
