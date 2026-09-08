const fs = require('fs');
const { test, expect } = require('@playwright/test');

test.use({ video: 'on' });

for (const skillName of ['기본 공격', '연속 베기']) test(`${skillName} draws its real hits on the battlefield`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await page.goto('/');
    await page.locator('#btn-startup-guest').click();
    await page.locator('#loop-hero-select-overlay [data-class-id="warrior"]').click();
    await page.waitForFunction(() => !uiRefreshRunning && !uiRefreshQueued && battleAssets.ready);
    // Equip the real starter gem early; enemy spawning, attack timing and damage stay real.
    await page.evaluate(skillName => {
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
        game.settings.pauseGameOnOverlay = false;
        if (skillName === '연속 베기') grantLoopStarterGemOnFirstKill();
        changeSkill(skillName);
        switchTab('tab-battle');
    }, skillName);
    const transparency = await page.evaluate(skillName => {
        const image = battleAssets.images[skillName === '기본 공격' ? 'skillFxBasicSlash' : 'skillFxDoubleSlash'];
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparent = 0;
        let visible = 0;
        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] === 0) transparent++;
            if (pixels[i] > 128) visible++;
        }
        return { transparent: transparent / (pixels.length / 4), visible };
    }, skillName);
    expect(transparency.transparent).toBeGreaterThan(0.75);
    expect(transparency.visible).toBeGreaterThan(10000);
    const frames = await page.evaluate(skillName => new Promise((resolve, reject) => {
        const captured = {};
        const deadline = performance.now() + 35000;
        function observe() {
            tutorialQueue.length = 0;
            if (activeTutorial) dismissTutorial(false);
            for (const effect of battleVisualState.skillEffects) {
                const age = battleVisualState.visualNow - effect.startAt;
                // Inspect a visible portion of the real effect, not a 39 ms frame window that CI can skip.
                const progress = age / effect.duration;
                if (effect.skillName !== skillName || progress < 0.12 || progress > 0.8) continue;
                const hit = battleFx.find(fx => fx.type === 'hit' && fx.skillName === skillName
                    && fx.damageTextGroupId === effect.vfxGroupId && fx.repeatIndex === effect.repeatIndex);
                if (!hit || captured[hit.repeatIndex]) continue;
                captured[hit.repeatIndex] = {
                    image: document.getElementById('battlefield-canvas').toDataURL('image/png'),
                    stage: hit.repeatIndex, damage: hit.damage, group: hit.damageTextGroupId,
                    sweep: effect.sweep, size: effect.size, age
                };
            }
            if (captured[0] && (skillName === '기본 공격' || captured[1])) return resolve(Object.values(captured));
            if (performance.now() > deadline) return reject(new Error(`${skillName}: real slash stages did not appear`));
            requestAnimationFrame(observe);
        }
        requestAnimationFrame(observe);
    }), skillName);
    expect(frames.map(frame => frame.stage)).toEqual(skillName === '기본 공격' ? [0] : [0, 1]);
    if (skillName === '연속 베기') expect(frames[0].sweep).toBe(-frames[1].sweep);
    expect(frames.every(frame => frame.damage > 0)).toBe(true);
    for (const frame of frames) {
        fs.writeFileSync(testInfo.outputPath(`slash-stage-${frame.stage + 1}.png`),
            Buffer.from(frame.image.split(',')[1], 'base64'));
    }
    await page.screenshot({ path: testInfo.outputPath('slash-gameplay.png') });
    await testInfo.attach('real-hit-observation', {
        body: JSON.stringify({ transparency, frames: frames.map(({ image, ...frame }) => frame) }, null, 2),
        contentType: 'application/json'
    });
    expect(errors).toEqual([]);
});
