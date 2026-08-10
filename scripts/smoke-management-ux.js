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

const ownedPanel = { innerHTML: '' };
runtime.document.getElementById = id => id === 'ui-skill-rules-panel' ? ownedPanel : null;
vm.runInContext('game.skillAutoRules=[]; game.conditionGemPool=[getAllConditionGemEntries()[0].name]; renderSkillAutoRulePanel();', runtime);
assert(ownedPanel.innerHTML.includes('<details class="progression-workbench" open>'), 'owned condition gems must stay expanded after a rerender');
const elementalTooltip = vm.runInContext("getConditionGemTooltipHtml({name:'시험 젬',tags:['physical','fire','cold','lightning','chaos'],desc:'',detail:{}})", runtime);
['physical', 'fire', 'cold', 'lightning', 'chaos'].forEach(element => {
    assert(elementalTooltip.includes(`gem-tag--${element}`), `${element} tooltip tag must use its element color`);
});
const favorHtml = vm.runInContext("game.expertise.levels.mycologist=10; game.expertise.favors.mycologist=getExpertFavorOptions('mycologist')[0].id; getExpertiseCardHtml('mycologist')", runtime);
assert(favorHtml.includes('현재 선택') && favorHtml.includes('✓ 선택됨'), 'expert favor must name and badge the active choice');

const html = fs.readFileSync('index.html', 'utf8');
const equipStart = html.indexOf('id="skill-tab-equip"');
const researchStart = html.indexOf('id="skill-tab-research"');
const enhanceStart = html.indexOf('id="skill-tab-enhance"');
assert(equipStart >= 0 && researchStart > equipStart && enhanceStart > researchStart, 'gem research must be a separate skill subtab after the loadout');
assert(html.indexOf('id="ui-gem-research-panel"', equipStart) > researchStart, 'research panel must not precede the owned gem library');
assert(html.indexOf('id="ui-talisman-unseal"') < html.indexOf('id="ui-talisman-board"'), 'talisman exchange must appear before the board');
assert(html.indexOf('부적 일괄 해체 관리') < html.indexOf('id="ui-talisman-board"'), 'talisman management must appear before the board');
assert(html.indexOf('id="ui-jewel-craft-disclosure"') < html.indexOf('id="ui-jewel-slots"'), 'jewel crafting must appear before the socket list');
assert(html.includes('id="ui-jewel-craft-disclosure" class="progression-workbench" open'), 'jewel crafting must be expanded by default');
assert(html.indexOf('일괄 해체 · 자동해체 관리') < html.indexOf('id="ui-inventory-list"'), 'equipment bulk management must appear before inventory cards');
assert(!html.includes('<h2 class="loop-roadmap-heading">📦 루프 이정표'), 'loop milestones must not repeat their disclosure title');
const treeStart = html.indexOf('id="tree-container"');
const treeEnd = html.indexOf('</div>', html.indexOf('id="passive-investment-summary"'));
assert(html.indexOf('id="passive-investment-summary"', treeStart) < treeEnd, 'passive investment summary must overlay the tree instead of shrinking it');

const overhaulCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
const premiumCss = fs.readFileSync('css/ui-premium.css', 'utf8');
assert(overhaulCss.includes('#tab-skills .skill-subtab-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));'), 'desktop skill navigation must keep four tabs on one row');
assert(overhaulCss.includes('#tab-skills .skill-subtab-row { grid-template-columns: repeat(2, minmax(0, 1fr));'), 'narrow skill navigation must use a balanced two-by-two grid');
assert(premiumCss.includes('button[onclick*="equip"]:not(.subtab-btn)'), 'equipment action emphasis must not make inactive skill navigation look selected');

console.log('smoke-management-ux passed');
