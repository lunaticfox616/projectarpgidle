#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const layoutCss = fs.readFileSync('css/layout.css', 'utf8');
const polishCss = fs.readFileSync('css/ui-polish.css', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

assert(
    layoutCss.includes('background: rgba(10,10,15,0.70)'),
    'base custom tooltip background should be translucent.'
);
assert(
    layoutCss.includes('backdrop-filter: blur(2px);'),
    'base custom tooltip should blur content behind the translucent layer.'
);
assert(
    polishCss.includes('rgba(16,24,39,.76)') && polishCss.includes('rgba(10,16,25,.76)'),
    'dark-mode custom tooltip override should preserve translucency.'
);
assert(
    polishCss.includes('backdrop-filter: blur(2px);'),
    'dark-mode custom tooltip override should keep the blur effect.'
);
assert(
    polishCss.includes('body:not(.light-mode) #item-tooltip-box.item-compare-tooltip')
        && polishCss.includes('background: transparent;'),
    'dark-mode item comparison host should stay transparent so only sibling panels are drawn.'
);
assert(
    layoutCss.includes('#item-tooltip-box.item-compare-tooltip { width: fit-content;')
        && layoutCss.includes('background: transparent; box-shadow: none;'),
    'item comparison tooltip host must size to content and stop drawing a containing panel.'
);
assert(
    layoutCss.includes('.item-compare-tooltip .item-tooltip-main')
        && layoutCss.includes('margin: 5px auto 0; padding: 8px; border: 1px solid #4d6584;'),
    'item comparison tooltip must render item details and comparison as sibling panels.'
);
assert(
    layoutCss.includes('grid-template-columns: repeat(2, minmax(180px, max-content))'),
    'two-panel comparison tooltip must use compact side-by-side comparison panels.'
);
assert(
    /css\/layout\.css\?v=\d{8}-[a-z0-9-]+/.test(indexHtml),
    'layout.css should be cache-busted for tooltip layout changes.'
);
assert(
    /css\/ui-polish\.css\?v=\d{8}-[a-z0-9-]+/.test(indexHtml),
    'ui-polish.css should be cache-busted for tooltip translucency changes.'
);

console.log('tooltip layout smoke checks passed');
