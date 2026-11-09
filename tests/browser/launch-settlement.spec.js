const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');

// Closing the game and opening it again settles the time away (js/cloud-save-ui.js enterGameWorld). From v0.3.57 to v0.3.59 no launch settled:
// a save made while entering moved the save's stamp before the settlement read it, and no check looked at the real entry.
const AWAY_MS = 3 * 60 * 60 * 1000;
const CLOUD = 'https://launch-test.invalid';
const USER = 'launch-account';
const FIXTURE = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'world-tree-atlas', 'legal-build.json'), 'utf8');

test.beforeEach(async ({ page }) => {
    await page.routeWebSocket(/\/realtime\/v1\/websocket/, () => {});
});

/** Opens the start screen with a save stamped AWAY_MS ago in the guest slot or the account's slot. The page that writes the save
 * must not write its own empty game over it while leaving (__skipUnloadSaveOnce). prepare(state) runs in the page on the save. */
async function openWithAwaySave(page, { account = false, prepare = null } = {}) {
    await page.goto('/');
    await expect(page.locator('#btn-startup-guest')).toBeEnabled({ timeout: 30_000 });
    await page.evaluate(([text, awayMs, user, prepareSource]) => {
        const state = mergeDefaults(JSON.parse(text));
        state.heroSelectionInitialized = true;
        state.selectedClassId = 'warrior';
        if (!state.seenTutorials.includes('opening_done')) state.seenTutorials.push('opening_done');
        if (prepareSource) new Function('state', prepareSource)(state);
        const at = Date.now() - awayMs;
        // Two stamps since 2026-11-10: the account case keeps the one-stamp shape of an older save, the guest cases have a save
        // written a moment ago whose play stopped hours earlier.
        state.saveMeta = user ? { ...state.saveMeta, lastModifiedAt: at, playedUntil: 0, maxSeenAt: at }
            : { ...state.saveMeta, lastModifiedAt: Date.now(), playedUntil: at, maxSeenAt: Date.now() };
        if (user) Object.assign(state.saveMeta, { cloudUserId: user, cloudRevision: 5, cloudPending: false, lastCloudSyncAt: at });
        localStorage.setItem(user ? ACCOUNT_SAVE_KEY_PREFIX + user : LOCAL_SAVE_KEY, serializeSaveState(state));
        window.__skipUnloadSaveOnce = true;
    }, [FIXTURE, AWAY_MS, account ? USER : null, prepare]);
    await page.reload();
    await expect(page.locator('#btn-startup-guest')).toBeEnabled({ timeout: 30_000 });
}

async function expectAwayResult(page) {
    const result = page.locator('#background-combat-result-overlay');
    await expect(result).toBeVisible({ timeout: 45_000 });
    await expect(result).toContainText('자리 비움 3시간');
    return result;
}

test('a guest save opened after hours away settles the time away', async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await openWithAwaySave(page);
    await page.locator('#btn-startup-guest').click();
    await expectAwayResult(page);
});

test('an account save opened after hours away settles the time away', async ({ page }) => {
    await page.route('**/cloud-save-config.js*', route => route.fulfill({ contentType: 'text/javascript',
        body: `window.CLOUD_SAVE_CONFIG = { enabled: true, supabaseUrl: '${CLOUD}', supabaseAnonKey: 'test-only' };` }));
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await openWithAwaySave(page, { account: true });
    // The server holds this device's copy at the same revision: the entry continues from the copy.
    await page.route(`${CLOUD}/**`, route => {
        const url = route.request().url();
        if (url.includes('/cloud_saves')) return route.fulfill({ json: [{ user_id: USER, revision: 5, updated_at: new Date(Date.now() - AWAY_MS).toISOString(),
            season: 10, loopCount: 9, saveMeta: { cloudUserId: USER, cloudRevision: 5 } }] });
        return route.fulfill({ json: [] });
    });
    await page.evaluate(user => {
        cloudState.configured = true;
        applyCloudSession({ access_token: 'launch-test-token', refresh_token: 'launch-refresh', expires_at: 4102444800, user: { id: user, email: 'launch@example.invalid' } });
        return continueWithCloudSession();
    }, USER);
    await expectAwayResult(page);
    expect(await page.evaluate(() => getSaveSlot().kind)).toBe('account');
});

test('the launch settlement fights on from a save left in the middle of a hunt', async ({ page }) => {
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
    await openWithAwaySave(page, { prepare: 'state.currentZoneId = 3; state.maxZoneId = Math.max(state.maxZoneId || 0, 3); state.moveTimer = 600; state.moveTotalTime = 600;' });
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY)).loopKills || 0);
    await page.locator('#btn-startup-guest').click();
    await expectAwayResult(page);
    await expect.poll(() => page.evaluate(() => game.loopKills)).toBeGreaterThan(before);
});
