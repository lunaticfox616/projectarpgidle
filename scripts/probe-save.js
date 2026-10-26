#!/usr/bin/env node
'use strict';
/**
 * Look at the game in a given state: load a save at a screen size, run a script in the page, take shots (2026-10-27 retro: every
 * session rebuilt this, and twice a reload wrote the title screen's empty game over the save it had just put in).
 *
 *   npm run probe -- --save <game.json|none> [--size 1280x720] [--script <file.js>] [--out <path prefix>]
 *
 * --save    a save as JSON (a saved game object, e.g. tests/fixtures/world-tree-atlas/*.json), or none for a brand new game.
 * --script  the body of an async function run in the page once the game is up; what it returns is printed as JSON. It may call
 *           `await window.__shot(name)` for a screenshot at <out>-NN-<name>.png (out defaults to probe-output/shot).
 * The save goes in before the page's own scripts run (addInitScript, once per tab), the title screen's 이어하기 is pressed, and the
 * cards a load opens with (away result, guide cards, death log) are closed. Page errors are printed at the end; exit code 1 on any.
 *
 * A real browser (the app's browser pane) has no addInitScript: back up the save key first, write the new save under a spare key
 * from the game page, open a page of the same origin that does not run the game (a JSON file), move it to LOCAL_SAVE_KEY there, then
 * open the game. A reload of the game page itself saves its own state over the key.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'http://127.0.0.1:4391';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

function option(name, fallback) {
    const at = process.argv.indexOf(`--${name}`);
    return at > 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

async function serveRepo(context) {
    await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== ORIGIN) return route.fulfill({ status: 204, body: '' });
        let file = path.join(ROOT, decodeURIComponent(url.pathname));
        if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
        if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return route.fulfill({ status: 404, body: '' });
        return route.fulfill({ status: 200, contentType: TYPES[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
}

/** The save as the game stores it (serializeSaveState of mergeDefaults), made by the game in a throwaway tab. */
async function storedSave(context, savePath) {
    const page = await context.newPage();
    await page.goto(ORIGIN + '/');
    await page.waitForSelector('#btn-startup-guest:not([disabled])', { timeout: 90000 });
    const entry = await page.evaluate(text => {
        const state = mergeDefaults(JSON.parse(text));
        state.saveMeta = { ...(state.saveMeta || {}), lastModifiedAt: Date.now() };
        return [LOCAL_SAVE_KEY, serializeSaveState(state)];
    }, fs.readFileSync(savePath, 'utf8'));
    await page.close();
    return entry;
}

async function closeLoadCards(page) {
    for (let i = 0; i < 6; i++) {
        await page.evaluate(() => {
            document.querySelector('.background-result-continue')?.click();
            if (typeof tutorialQueue !== 'undefined') { tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false); }
            document.querySelector('#death-overlay[open] button, #death-overlay.active button')?.click();
        });
        await page.waitForTimeout(500);
    }
}

async function main() {
    try { os.setPriority(0, os.constants.priority.PRIORITY_BELOW_NORMAL); } catch (error) { console.warn('priority unchanged:', error.message); }
    const savePath = option('save', 'none'), scriptPath = option('script', null), out = option('out', path.join(ROOT, 'probe-output', 'shot'));
    const [width, height] = option('size', '1280x720').split('x').map(Number);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: 'block' });
    await serveRepo(context);
    const entry = savePath === 'none' ? null : await storedSave(context, savePath);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error && error.message || error)));
    if (entry) {
        await page.addInitScript(([key, value]) => {
            if (sessionStorage.getItem('__probeSeeded')) return;
            localStorage.setItem(key, value);
            sessionStorage.setItem('__probeSeeded', '1');
        }, entry);
    }
    let shots = 0;
    await page.exposeFunction('__shot', async name => {
        await page.screenshot({ path: `${out}-${String(++shots).padStart(2, '0')}-${name}.png` });
        return true;
    });
    await page.goto(ORIGIN + '/');
    await page.waitForSelector('#btn-startup-guest:not([disabled])', { timeout: 90000 });
    if (entry) {
        await page.click('#btn-startup-guest');
        await page.waitForFunction(() => typeof game === 'object' && game && game.heroSelectionInitialized !== undefined, null, { timeout: 90000 });
        await page.waitForTimeout(2500);
        await closeLoadCards(page);
    }
    const result = scriptPath ? await page.evaluate(`(async () => { ${fs.readFileSync(scriptPath, 'utf8')} })()`) : null;
    console.log(JSON.stringify(result, null, 1));
    console.log(`page errors: ${errors.length}`, errors.slice(0, 5));
    await browser.close();
    if (errors.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exit(1); });
