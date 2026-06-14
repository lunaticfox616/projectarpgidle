const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/components.css'), 'utf8');
const mobileStart = css.indexOf('@media (max-width: 720px)');
assert(mobileStart >= 0, 'mobile CSS media query must exist');
const mobileCss = css.slice(mobileStart, css.indexOf('@media (min-width: 1081px)', mobileStart));
const oneColumnRuleIndex = mobileCss.indexOf('#ui-jewel-inventory { grid-template-columns: 1fr !important; }');
const gemTwoColumnRuleIndex = mobileCss.indexOf('#ui-skills-list,\n            #ui-support-list { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }');
assert(oneColumnRuleIndex >= 0, 'mobile single-column override must still apply to non-gem grids');
assert(gemTwoColumnRuleIndex > oneColumnRuleIndex, 'attack and support gem grids must override mobile one-column layout with two columns');
assert(
  mobileCss.includes('#ui-skills-list .skill-gem,\n            #ui-support-list .skill-gem { min-width: 0; font-size: 0.86em; }'),
  'mobile skill gem cards must be compact enough for two-column display'
);

console.log('smoke-skill-gem-mobile-layout: ok');
