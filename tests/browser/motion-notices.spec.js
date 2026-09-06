const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => { clearInterval(gameTickHandle); gameTickHandle = null; });
});

test('returning and reloading preserve the four core menus at level one', async ({ page }) => {
    await page.evaluate(() => { tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); });
    expect(await page.evaluate(() => game.unlocks.char)).toBe(true);
    await page.locator('#btn-combat-return').click();
    expect(await page.evaluate(() => [game.level, game.unlocks.char])).toEqual([1, true]);
    await expect(page.locator('#btn-tab-char')).toBeVisible();
    await page.evaluate(() => saveGame({ skipCloudSync: true }));
    await page.reload();
    await page.locator('#btn-startup-guest').click();
    await page.waitForFunction(() => battleAssets.ready && game.heroSelectionInitialized);
    await page.evaluate(() => { clearInterval(gameTickHandle); tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); });
    expect(await page.evaluate(() => game.unlocks.char)).toBe(true);
    await page.evaluate(() => { game.level = 2; checkUnlocks(); updateStaticUI(); });
    expect(await page.evaluate(() => game.unlocks.char)).toBe(true);
    await expect(page.locator('#btn-tab-char')).toBeVisible();
});

test('notice and death report share theme materials and remain operable', async ({ page }, testInfo) => {
    for (const theme of ['dark', 'light']) {
        await page.evaluate(theme => {
            applyThemeMode(theme);
            tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
            queueTutorialNotice('review-' + theme, '새 콘텐츠', '새로운 콘텐츠를 확인하세요.');
            checkUnlocks();
        }, theme);
        const notice = page.locator('#tutorial-overlay');
        await expect(notice).toBeVisible();
        const material = await notice.locator('.tutorial-card').evaluate(el => getComputedStyle(el).backgroundImage);
        await page.screenshot({ path: testInfo.outputPath('notice-' + theme + '.png') });
        await page.locator('#tutorial-dismiss-btn').click();
        await page.evaluate(() => openDeathOverlay({ primaryElement: 'fire', reasonText: '화염 공격', expLost: 12, activeAilments: [],
            damageSummary: [{ ele: 'fire', value: 100 }], monsterSummary: [{ name: '화염 정령', value: 100, primaryElement: 'fire' }] }));
        const death = page.locator('#death-overlay');
        await expect(death).toBeVisible();
        await expect(death.locator('.tutorial-card')).toHaveCSS('background-image', material);
        await death.getByRole('tab', { name: '몬스터별' }).click();
        await expect(death.getByRole('tab', { name: '몬스터별' })).toHaveAttribute('aria-selected', 'true');
        await page.screenshot({ path: testInfo.outputPath('death-' + theme + '.png') });
        await death.getByRole('button', { name: '확인', exact: true }).click();
        await expect(death).toBeHidden();
    }
});

test('warrior strips keep their ground contact across directions', async ({ page }, testInfo) => {
    const anchors = await page.evaluate(() => {
        const clips = battleAssets.atlas.hero.frames.characterAnimations;
        return Object.fromEntries(['east', 'north', 'south', 'west'].map(direction => [direction, {
            walk: clips.walkDirections[direction][0].anchorY,
            attack: clips.attackDirections[direction]?.[0][0].anchorY
        }]));
    });
    expect(anchors.east.walk).toBe(80);
    expect(anchors.west.walk).toBe(80);
    expect(anchors.north.walk).toBe(80);
    expect(anchors.north.attack).toBe(84);
    expect(anchors.south.attack).toBe(90);
    await page.evaluate(() => {
        const clips = battleAssets.atlas.hero.frames.characterAnimations;
        const rows = Object.entries(clips.idleDirections).map(([d, frames]) => [d + ' idle', frames]);
        rows.push(...Object.entries(clips.walkDirections).map(([d, frames]) => [d + ' walk', frames]));
        Object.entries(clips.attackDirections).forEach(([d, variants]) => variants.forEach((frames, i) => rows.push([d + ' attack ' + (i + 1), frames])));
        const canvas = document.createElement('canvas'); canvas.id = 'motion-review';
        canvas.width = 800; canvas.height = rows.length * 120;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#171812'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        rows.forEach(([name, frames], row) => {
            ctx.fillStyle = '#eee'; ctx.font = '12px sans-serif'; ctx.fillText(name, 5, row * 120 + 16);
            frames.forEach((frame, i) => {
                const x = 40 + i * 82, y = row * 120 + 104;
                ctx.strokeStyle = '#668866'; ctx.beginPath(); ctx.moveTo(x - 25, y); ctx.lineTo(x + 25, y); ctx.stroke();
                drawBattleSprite(ctx, frame.image, frame, x, y, 64, { smoothing: 'pixel' });
            });
        });
        document.body.appendChild(canvas);
    });
    const png = await page.locator('#motion-review').evaluate(el => el.toDataURL().split(',')[1]);
    require('node:fs').writeFileSync(testInfo.outputPath('warrior-ground-contact.png'), Buffer.from(png, 'base64'));
});

test('basic attack artwork extends past the board without changing its footprint', async ({ page }, testInfo) => {
    const result = await page.evaluate(() => {
        const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 240;
        const ctx = canvas.getContext('2d');
        const footprint = projectSkillFootprint({ cells: [{ gx: 0, gy: 0 }], shape: 'single', center: { gx: 0, gy: 0 } },
            { tileW: 40, tileH: 40, cellToScreen: (gx, gy) => ({ x: 100 + gx * 40, y: 100 + gy * 40 }) }, { gx: 1, gy: 0 });
        const before = JSON.stringify(footprint);
        const image = battleAssets.images.skillFxContinuousSlash;
        drawFootprintSkillImpact(ctx, { family: 'slash', skillName: '기본 공격', x: 100, y: 100,
            fromX: 140, fromY: 100, toX: 100, toY: 100, footprint, seed: 0, alpha: .9 }, image, .25);
        const data = ctx.getImageData(0, 0, 240, 240).data;
        let outside = 0;
        for (let y = 0; y < 240; y++) for (let x = 0; x < 240; x++) {
            if ((x < 80 || y < 80) && data[(y * 240 + x) * 4 + 3] > 0) outside++;
        }
        return { outside, unchanged: JSON.stringify(footprint) === before, png: canvas.toDataURL().split(',')[1] };
    });
    expect(result.outside).toBeGreaterThan(20);
    expect(result.unchanged).toBe(true);
    require('node:fs').writeFileSync(testInfo.outputPath('basic-attack-edge.png'), Buffer.from(result.png, 'base64'));
});
