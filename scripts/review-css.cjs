/* Local visual review. Captures the real game; never writes a player save. */
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('@playwright/test');
const phase = process.argv[2] || 'before';
if (!/^[a-z0-9-]+$/.test(phase)) throw new Error('Use a simple capture phase name');
const port = Math.max(1, Number(process.env.PLAYWRIGHT_PORT) || 4173);
const url = process.env.CSS_REVIEW_URL || `http://127.0.0.1:${port}/`;
const output = path.resolve(__dirname, '../artifacts/css-architecture', phase);
fs.mkdirSync(output, { recursive: true });

async function capture(page, name) {
    await page.evaluate(() => {
        if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
        if (typeof toggleGoalDrawer === 'function') toggleGoalDrawer(false);
        document.querySelectorAll('#mobile-toast-root > *').forEach(node => node.remove());
    });
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(output, `${name}.png`), animations: 'disabled' });
    const styles = await page.evaluate(() => [...document.querySelectorAll('body, body *')]
        .filter(el => el.getBoundingClientRect().width && el.getBoundingClientRect().height)
        .map(el => {
            const css = getComputedStyle(el);
            const properties = ['display', 'position', 'fontFamily', 'fontSize', 'color',
                'backgroundColor', 'borderRadius', 'padding', 'gap', 'opacity', 'zIndex',
                'width', 'height', 'minHeight', 'maxHeight', 'gridTemplateColumns', 'gridTemplateRows'];
            return { selector: el.id ? `#${el.id}` : `${el.tagName}.${el.className}`,
                values: Object.fromEntries(properties.map(key => [key, css[key]])) };
        }));
    fs.writeFileSync(path.join(output, `${name}.json`), JSON.stringify(styles, null, 2));
    const inlineOverrides = await page.evaluate(() => {
        const found = [];
        const family = prop => /^(border|background|padding|margin|font|flex|grid|overflow|animation|transition)(-|$)/.exec(prop)?.[1] || prop;
        function visit(rules, file) {
            for (const rule of rules) {
                if (rule.styleSheet) visit(rule.styleSheet.cssRules, rule.styleSheet.href);
                if (rule.cssRules) visit(rule.cssRules, file);
                if (!rule.selectorText || !rule.style) continue;
                const props = [...rule.style].filter(prop => rule.style.getPropertyPriority(prop));
                if (!props.length) continue;
                const selector = rule.selectorText.replace(/::[\w-]+(?:\([^)]*\))?/g, '');
                const elements = [...document.querySelectorAll(selector)].filter(el => el.style.length);
                for (const prop of props) {
                    if (elements.some(el => [...el.style].some(inline => family(inline) === family(prop)))) {
                        found.push({ file, selector: rule.selectorText, property: prop });
                    }
                }
            }
        }
        for (const sheet of document.styleSheets) visit(sheet.cssRules, sheet.href?.split('/').pop().split('?')[0] || 'inline');
        return found;
    });
    fs.writeFileSync(path.join(output, `${name}-inline.json`), JSON.stringify(inlineOverrides, null, 2));
}

async function preparePage(page) {
    await page.addInitScript(() => {
        let seed = 73517;
        Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    });
    await page.route('https://**', route => route.fulfill({ status: 204, body: '' }));
}

async function captureEarlyGame(page) {
    await page.goto(url);
    await page.locator('#btn-startup-guest').waitFor();
    await capture(page, 'login');
    await page.locator('#btn-startup-guest').click();
    await page.locator('[data-class-id="warrior"]').click();
    await page.waitForFunction(() => battleAssets.ready && !uiRefreshRunning && !uiRefreshQueued);
    await page.evaluate(() => {
        clearInterval(gameTickHandle); gameTickHandle = null;
        tutorialQueue.length = 0;
        if (activeTutorial) dismissTutorial(false);
        game.combatHalted = true;
        switchTab('tab-battle');
    });
    await capture(page, 'battle');
    for (const [name, tab] of [['character', 'tab-character'], ['tree', 'tab-char']]) {
        await page.evaluate(id => { closeAllWindows(); switchTab(id); }, tab);
        await capture(page, name);
    }
    await page.evaluate(() => { closeAllWindows(); switchTab('tab-character'); document.body.classList.add('light-mode'); });
    await capture(page, 'light-character');
    await page.evaluate(() => { document.body.classList.remove('light-mode'); closeAllWindows(); switchTab('tab-battle'); });
    await page.setViewportSize({ width: 412, height: 915 });
    await page.waitForTimeout(800);
    await page.evaluate(() => { toggleGoalDrawer(false); applyPanelLayoutSettings(); });
    await capture(page, 'mobile-battle');
}

async function captureUnlockedGame(page) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
        game.season = 50;
        game.contentProgression.inherited = CONTENT_UNLOCK_CATALOG.filter(def => def.cost > 0).map(def => def.id);
        contentProgression.sync();
        for (let i = 0; i < 8; i++) addItemToInventory(createItemFromBase(BASE_ITEM_DB[i], 'rare', 8), { guaranteedKeep: true });
        updateStaticUI();
        tutorialQueue.length = 0; if (activeTutorial) dismissTutorial(false);
    });
    for (const [name, tab] of [['equipment', 'tab-items'], ['gems', 'tab-skills'], ['map', 'tab-map'], ['settings', 'tab-settings']]) {
        await page.evaluate(id => { closeAllWindows(); switchTab(id); }, tab);
        await capture(page, name);
    }
}

async function run() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
        await preparePage(page);
        await captureEarlyGame(page);
        await captureUnlockedGame(page);
        fs.writeFileSync(path.join(output, 'errors.json'), JSON.stringify(errors, null, 2));
    } finally {
        await browser.close();
    }
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`CSS review: ${output}`);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
