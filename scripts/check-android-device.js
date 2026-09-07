#!/usr/bin/env node
'use strict';
// Local emulator only: never writes test progression into a connected player's phone.
const { chromium } = require('playwright');
const cp = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const adb = path.join(process.env.ANDROID_HOME, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const serial = process.env.ANDROID_TEST_SERIAL || 'emulator-5554';
if (!/^emulator-\d+$/.test(serial)) throw new Error('Use a disposable emulator; this audit alters its guest save.');
const out = path.join(root, 'artifacts/android-device-review');
fs.mkdirSync(out, { recursive: true });

function device(...args) { return cp.execFileSync(adb, ['-s', serial, ...args], { encoding: 'utf8', timeout: 20000 }).trim(); }
function capture(name) {
    // CDP screenshots omit Android WebView's accelerated canvas surface. Capture the actual display.
    fs.writeFileSync(path.join(out, name), cp.execFileSync(adb, ['-s', serial, 'exec-out', 'screencap', '-p'], {
        maxBuffer: 15 * 1024 * 1024, timeout: 20000
    }));
}
async function tap(page, selector) {
    const element = page.locator(selector);
    await element.scrollIntoViewIfNeeded();
    const rect = await element.boundingBox();
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }] });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
}

async function review(page) {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    assert.equal(await page.evaluate(() => appPlatform.active), true);
    if (await page.locator('#btn-startup-guest').isVisible()) await tap(page, '#btn-startup-guest');
    if (await page.locator('[data-class-id="warrior"]').isVisible()) await tap(page, '[data-class-id="warrior"]');
    await page.waitForFunction(() => battleAssets.ready && !isStartupOverlayOpen() && !isLoadingOverlayOpen());
    if (await page.locator('#background-combat-result-overlay').isVisible()) {
        await tap(page, '#background-combat-result-overlay button:last-child');
    }
    await page.evaluate(() => { tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); hideInfoTooltip(); });
    await page.waitForFunction(() => game.exp > 0 || game.level > 1, null, { timeout: 45000 });
    capture('battle.png');
    await page.evaluate(() => { tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); switchTab('tab-items'); });
    await tap(page, '#btn-auto-salvage');
    device('shell', 'input', 'keyevent', '4');
    await page.waitForFunction(() => !document.getElementById('auto-salvage-config-overlay')?.getClientRects().length);
    capture('equipment.png');
    device('shell', 'input', 'keyevent', '4');
    await page.waitForFunction(() => document.getElementById('tab-battle').classList.contains('active'));
    const before = await page.evaluate(() => ({ level: game.level, exp: game.exp, save: game.saveMeta.lastModifiedAt }));
    device('shell', 'input', 'keyevent', '3');
    await new Promise(resolve => setTimeout(resolve, 35000));
    console.log('Android background interval: 35 seconds; continuing past the 60-second settlement threshold.');
    await new Promise(resolve => setTimeout(resolve, 30000));
    device('shell', 'am', 'start', '-n', 'com.rignin.game/.MainActivity');
    await page.waitForFunction(() => !document.hidden && !backgroundCombatRuntime.processing);
    await page.waitForFunction(() => document.getElementById('background-combat-result-overlay')?.innerText.includes('전투 진행'));
    capture('settlement.png');
    const after = await page.evaluate(() => ({ exp: game.exp, save: game.saveMeta.lastModifiedAt,
        level: game.level, viewport: [innerWidth, innerHeight], failedSettlement: backgroundCombatRuntime.failed,
        settlement: document.getElementById('background-combat-result-overlay').innerText }));
    assert(after.level >= before.level);
    assert(after.save >= before.save);
    assert(!after.failedSettlement);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({ before, after, errors, platform: 'Android 16 emulator' }, null, 2));
    console.log(JSON.stringify({ before, after, errors }));
}

(async () => {
    const pid = device('shell', 'pidof', 'com.rignin.game');
    device('forward', 'tcp:9224', `localabstract:webview_devtools_remote_${pid}`);
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9224', { noDefaults: true, timeout: 10000 });
    try { await review(browser.contexts()[0].pages()[0]); }
    finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
