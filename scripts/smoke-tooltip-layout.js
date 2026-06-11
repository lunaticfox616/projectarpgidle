#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const layoutCss = fs.readFileSync('css/layout.css', 'utf8');
const polishCss = fs.readFileSync('css/ui-polish.css', 'utf8');
const indexHtml = fs.readFileSync('index.html', 'utf8');

assert(
    layoutCss.includes('background: rgba(10,10,15,0.88)'),
    'base custom tooltip background should be translucent.'
);
assert(
    layoutCss.includes('backdrop-filter: blur(2px);'),
    'base custom tooltip should blur content behind the translucent layer.'
);
assert(
    polishCss.includes('rgba(16,24,39,.90)') && polishCss.includes('rgba(10,16,25,.90)'),
    'dark-mode custom tooltip override should preserve translucency.'
);
assert(
    polishCss.includes('backdrop-filter: blur(2px);'),
    'dark-mode custom tooltip override should keep the blur effect.'
);
assert(
    layoutCss.includes('#item-tooltip-box.dual-compare-tooltip { width: fit-content;'),
    'dual comparison tooltip must size to content instead of forcing a wide fixed box.'
);
assert(
    layoutCss.includes('.dual-compare-tooltip .item-tooltip-main'),
    'dual comparison tooltip must isolate the item details column to remove unused horizontal space.'
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
