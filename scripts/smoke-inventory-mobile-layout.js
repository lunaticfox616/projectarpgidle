const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/components.css'), 'utf8');
const mobileStart = css.indexOf('@media (max-width: 720px)');
assert(mobileStart >= 0, 'mobile CSS media query must exist');
const mobileEnd = css.indexOf('@media (min-width: 1081px)', mobileStart);
const mobileCss = css.slice(mobileStart, mobileEnd);
const baseOneColumnIndex = mobileCss.indexOf('.inventory-grid, .map-grid { grid-template-columns: 1fr; }');
const inventoryTwoColumnIndex = mobileCss.indexOf('#ui-inventory-list,\n            #ui-craft-inventory-list,\n            #ui-fossil-inventory-list,\n            #ui-infuser-inventory-list { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }');
assert(baseOneColumnIndex >= 0, 'mobile base inventory grid override must exist');
assert(inventoryTwoColumnIndex > baseOneColumnIndex, 'equipment inventory grids must override mobile one-column layout with two columns');
assert(
  mobileCss.includes('#ui-inventory-list .item-card,\n            #ui-craft-inventory-list .item-card,\n            #ui-fossil-inventory-list .item-card,\n            #ui-infuser-inventory-list .item-card { min-width: 0; font-size: 0.86em; }'),
  'mobile equipment inventory cards must be compact enough for two-column display'
);

console.log('smoke-inventory-mobile-layout: ok');
