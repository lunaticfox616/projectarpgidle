const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const elements = {
    'ui-skill-rules-panel': { innerHTML: '' },
    'btn-condition-rule-add': { disabled: false },
    'btn-condition-rule-sort': { disabled: false }
};
runtime.document.getElementById = id => elements[id] || null;

vm.runInContext('game.conditionGemUnlocked=false; game.skillAutoRules=[]; addSkillAutoRule(); renderSkillAutoRulePanel();', runtime);
assert.strictEqual(vm.runInContext('game.skillAutoRules.length', runtime), 0, 'locked condition gems must not create rules');
assert.strictEqual(elements['btn-condition-rule-add'].disabled, true, 'locked add action must be disabled');
assert.strictEqual(elements['btn-condition-rule-sort'].disabled, true, 'locked sort action must be disabled');

runtime.document.getElementById = () => null;
vm.runInContext("game.conditionGemUnlocked=true; game.skillAutoRules=[{id:'a',priority:1},{id:'b',priority:2}]; moveSkillAutoRule(1,-1);", runtime);
assert.strictEqual(vm.runInContext("game.skillAutoRules.map(rule=>rule.id).join(',')", runtime), 'b,a', 'condition rules must move without manual priority editing');
assert.strictEqual(vm.runInContext("game.skillAutoRules.map(rule=>rule.priority).join(',')", runtime), '1,2', 'moved rules must receive contiguous priorities');

const html = fs.readFileSync('index.html', 'utf8');
const equipStart = html.indexOf('id="skill-tab-equip"');
const researchStart = html.indexOf('id="skill-tab-research"');
const enhanceStart = html.indexOf('id="skill-tab-enhance"');
assert(equipStart >= 0 && researchStart > equipStart && enhanceStart > researchStart, 'gem research must be a separate skill subtab after the loadout');
assert(html.indexOf('id="ui-gem-research-panel"', equipStart) > researchStart, 'research panel must not precede the owned gem library');
assert(html.indexOf('id="ui-talisman-board"') < html.indexOf('id="ui-talisman-inventory"'), 'talisman board must appear before inventory management');
assert(html.includes('id="ui-jewel-craft-disclosure"'), 'jewel crafting must be a secondary disclosure');

const overhaulCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
const premiumCss = fs.readFileSync('css/ui-premium.css', 'utf8');
assert(overhaulCss.includes('#tab-skills .skill-subtab-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));'), 'desktop skill navigation must keep four tabs on one row');
assert(overhaulCss.includes('#tab-skills .skill-subtab-row { grid-template-columns: repeat(2, minmax(0, 1fr));'), 'narrow skill navigation must use a balanced two-by-two grid');
assert(premiumCss.includes('button[onclick*="equip"]:not(.subtab-btn)'), 'equipment action emphasis must not make inactive skill navigation look selected');

console.log('smoke-management-ux passed');
