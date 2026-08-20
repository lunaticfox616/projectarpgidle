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
vm.runInContext(`game.skillAutoRules=[]; game.conditionGemPool=[
    CONDITION_GEM_DB.curse[0].name,
    CONDITION_GEM_DB.warcry[0].name,
    CONDITION_GEM_DB.guard[0].name,
    CONDITION_GEM_DB.utility[0].name
]; renderSkillAutoRulePanel();`, runtime);
assert(ownedPanel.innerHTML.includes('<details class="progression-workbench" open>'), 'owned condition gems must stay expanded after a rerender');
assert.strictEqual((ownedPanel.innerHTML.match(/class="condition-gem-card /g) || []).length, 4,
    'each condition gem type must render as a visual card');
assert.strictEqual((ownedPanel.innerHTML.match(/class="combat-effect-icon /g) || []).length, 4,
    'condition gem cards must reuse the status icon atlas');
['curse', 'warcry', 'guard', 'utility'].forEach(type => {
    assert(ownedPanel.innerHTML.includes(`condition-gem-${type}`), `${type} gems must expose a distinct visual type`);
    assert(ownedPanel.innerHTML.includes(`gem-tag--${type}`), `${type} tags must use their semantic chip style`);
});
const elementalTooltip = vm.runInContext("getConditionGemTooltipHtml({name:'시험 젬',tags:['physical','fire','cold','lightning','chaos'],desc:'',detail:{}})", runtime);
['physical', 'fire', 'cold', 'lightning', 'chaos'].forEach(element => {
    assert(elementalTooltip.includes(`gem-tag--${element}`), `${element} tooltip tag must use its element color`);
});
assert.strictEqual(vm.runInContext("translateSkillTag('curse')", runtime), '저주', 'condition gem type tags must be localized');
assert.strictEqual(vm.runInContext("translateSkillTag('warcry')", runtime), '함성', 'warcry tags must be localized');
assert.strictEqual(vm.runInContext("translateSkillTag('guard')", runtime), '수호', 'guard tags must be localized');
assert.strictEqual(vm.runInContext("translateSkillTag('utility')", runtime), '기능', 'utility tags must be localized');
const favorHtml = vm.runInContext("game.expertise.levels.mycologist=10; game.expertise.favors.mycologist=getExpertFavorOptions('mycologist')[0].id; getExpertiseCardHtml('mycologist')", runtime);
assert(favorHtml.includes('현재 선택') && favorHtml.includes('✓ 선택됨'), 'expert favor must name and badge the active choice');

const equipmentCardHtml = runtime.renderInventoryCard({ id: 9910, slot: 'weapon', name: 'Test Sword', baseName: 'Test Sword', rarity: 'normal', baseStats: [], stats: [] }, 0, 'equip');
assert(!equipmentCardHtml.includes('<details'), 'equipment card actions must not be split behind a management disclosure');
['equipItemById(9910)', 'craftSelectInventoryItemById(9910)', 'toggleItemLockById(9910)', 'salvageItemById(9910)'].forEach(action => {
    assert(equipmentCardHtml.includes(action), `equipment card must expose ${action} directly`);
});

const html = fs.readFileSync('index.html', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
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
const jewelCardSource = uiSource.slice(uiSource.indexOf('let manageActions ='), uiSource.indexOf("renderSearchSection('ui-jewel-inventory'"));
const talismanCardSource = uiSource.slice(uiSource.indexOf('let manage = `<button'), uiSource.indexOf("renderSearchSection('ui-talisman-inventory'"));
assert(!jewelCardSource.includes('<details'), 'jewel card actions must be direct buttons');
assert(!talismanCardSource.includes('<details'), 'talisman card actions must be direct buttons');
const treeStart = html.indexOf('id="tree-container"');
const treeEnd = html.indexOf('</div>', html.indexOf('id="passive-investment-summary"'));
const searchStart = html.indexOf('id="passive-search-panel"');
const plannerStart = html.indexOf('id="passive-tree-planner"');
assert(treeStart < searchStart && searchStart < treeEnd, 'passive search controls must live inside the tree viewport');
assert(plannerStart > treeEnd, 'passive presets must render below the tree viewport');
assert(!html.includes('제작 · 장착 · 변성'), 'the compact star-wedge control must not repeat its actions');
assert(html.indexOf('id="passive-investment-summary"', treeStart) < treeEnd, 'passive investment summary must overlay the tree instead of shrinking it');
const starWedgeStart = html.indexOf('id="passive-star-wedge-drawer"');
const investmentStart = html.indexOf('id="passive-investment-summary"');
assert(searchStart < starWedgeStart && searchStart < investmentStart, 'passive search must precede star wedges and the investment summary');
assert(starWedgeStart > treeStart && starWedgeStart < investmentStart, 'star wedge management must overlay the tree instead of shrinking it');
assert(html.slice(starWedgeStart - 9, starWedgeStart).includes('<details'), 'star wedge management should use the native disclosure instead of custom toggle code');
assert(uiSource.includes("this.closest('details').open=false"), 'choosing a star wedge socket must reveal the passive tree immediately');
const exchangeSection = html.indexOf('id="market-exchange-title"');
const blackMarketSection = html.indexOf('id="market-black-title"');
const serviceSection = html.indexOf('id="market-service-title"');
assert(exchangeSection >= 0 && blackMarketSection > exchangeSection && serviceSection > blackMarketSection,
    'market actions must be grouped as fixed exchange, limited offers, and permanent services');

const overhaulCss = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');
const premiumCss = fs.readFileSync('css/ui-premium.css', 'utf8');
assert(overhaulCss.includes('#tab-skills .skill-subtab-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));'), 'desktop skill navigation must keep four tabs on one row');
assert(overhaulCss.includes('#tab-skills .skill-subtab-row { grid-template-columns: repeat(2, minmax(0, 1fr));'), 'narrow skill navigation must use a balanced two-by-two grid');
assert(premiumCss.includes('button[onclick*="equip"]:not(.subtab-btn)'), 'equipment action emphasis must not make inactive skill navigation look selected');

vm.runInContext('game.season=25; game.unlockedSeasonContents=[]; game.seenSeasonContentNotices=[]; applySeasonContentProgression({silent:true});', runtime);
assert.strictEqual(vm.runInContext("game.unlockedSeasonContents.includes('season_25')", runtime), true, 'loop milestones must extend through the growth-board unlock');
assert.strictEqual(vm.runInContext('game.unlockedSeasonContents.length', runtime), 25, 'milestone reconciliation must register every loop through 25 exactly once');
[
    [2, '현상금 사냥'], [11, '심해 / 낚시'], [15, '군락지 / 군락지 액막이'],
    [18, '가지치기'], [20, '코어 큐브'], [25, '생장판 / 생장 아이템 드랍']
].forEach(([loop, label]) => {
    assert.strictEqual(vm.runInContext(`SEASON_CONTENT_ROADMAP[${loop}].features.some(line => line.includes('${label}'))`, runtime), true,
        `loop ${loop} milestone must list ${label}`);
});
vm.runInContext('game.season=50; applySeasonContentProgression({silent:true});', runtime);
assert.strictEqual(vm.runInContext("game.unlockedSeasonContents.includes('season_50')", runtime), true, 'late growth-board milestones must reconcile through loop 50');
assert.strictEqual(vm.runInContext('game.unlockedSeasonContents.length', runtime), 50, 'milestone reconciliation must register every loop through 50 exactly once');
[
    [28, '생장판 확장: 11칸'], [31, '버려진 날붙이 / 단절된 방랑자'],
    [32, '생장판 시너지 해금: 행과 열'], [38, '생장판 시너지 해금: 태그 공명'],
    [40, '생장판 확장: 23칸'], [45, '생장판 시너지 해금: 복합 시너지'],
    [50, '생장판 확장: 32칸']
].forEach(([loop, label]) => {
    assert.strictEqual(vm.runInContext(`SEASON_CONTENT_ROADMAP[${loop}].features.some(line => line.includes('${label}'))`, runtime), true,
        `loop ${loop} milestone must list ${label}`);
});

console.log('smoke-management-ux passed');
