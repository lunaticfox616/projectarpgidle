const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function getRuleZIndex(css, selector) {
    const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = [...css.matchAll(new RegExp(`${escapedSelector}\\s*\\{[^}]*z-index:\\s*(\\d+)`, 'gm'))];
    assert(matches.length > 0, `Missing z-index rule for ${selector}`);
    return Number(matches[matches.length - 1][1]);
}

const layoutCss = read('css/layout.css');
const themeCss = read('css/theme.css');
const passivesJs = read('js/passives.js');
const indexHtml = read('index.html');

const infoTooltipZIndex = getRuleZIndex(layoutCss, '#info-tooltip');
const tutorialOverlayZIndex = getRuleZIndex(layoutCss, '.tutorial-overlay');
const startupOverlayZIndex = getRuleZIndex(themeCss, '.startup-overlay');

assert(
    infoTooltipZIndex > tutorialOverlayZIndex,
    'Hero choice tooltip must render above tutorial overlays such as loop hero selection.'
);
assert(
    infoTooltipZIndex < startupOverlayZIndex,
    'Hero choice tooltip should not render above the startup account-selection overlay.'
);
assert(
    passivesJs.includes('function showHeroChoiceTooltip(event, heroId, experienced)'),
    'Hero choice tooltip entry point should exist.'
);
assert(
    passivesJs.includes('showInfoTooltipHtml(event.clientX, event.clientY, buildHeroChoiceTooltipHtml(heroId, !!experienced),'),
    'Hero choice tooltip should use the shared info tooltip layer.'
);
assert(
    /css\/layout\.css\?v=\d{8}-[a-z0-9-]+/.test(indexHtml),
    'index.html should reference layout.css with a versioned cache-buster.'
);

console.log('Hero choice tooltip layer smoke checks passed.');
