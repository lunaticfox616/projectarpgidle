const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const elements = {
    'ui-skill-rules-panel': { innerHTML: '' },
    'btn-condition-rule-add': { disabled: false },
    'btn-condition-rule-sort': { disabled: false }
};
runtime.document.getElementById = id => elements[id] || null;

vm.runInContext('game.season=1; game.combatTacticsUnlocked=false; game.skillAutoRules=[]; addSkillAutoRule(); renderSkillAutoRulePanel();', runtime);
assert.strictEqual(vm.runInContext('game.skillAutoRules.length', runtime), 0, 'locked tactics rules must not create rules');
assert.strictEqual(elements['btn-condition-rule-add'].disabled, true, 'locked add action must be disabled');
assert.strictEqual(elements['btn-condition-rule-sort'].disabled, true, 'locked sort action must be disabled');

runtime.document.getElementById = () => null;
vm.runInContext("game.season=2; game.combatTacticsUnlocked=true; game.skillAutoRules=[{id:'a',priority:1},{id:'b',priority:2}]; moveSkillAutoRule(1,-1);", runtime);
assert.strictEqual(vm.runInContext("game.skillAutoRules.map(rule=>rule.id).join(',')", runtime), 'b,a', 'tactics rules must move without manual priority editing');
assert.strictEqual(vm.runInContext("game.skillAutoRules.map(rule=>rule.priority).join(',')", runtime), '1,2', 'moved rules must receive contiguous priorities');

const rulesPanel = { innerHTML: '' };
runtime.document.getElementById = id => id === 'ui-skill-rules-panel' ? rulesPanel : null;
vm.runInContext('game.skillAutoRules=[]; renderSkillAutoRulePanel();', runtime);
assert(rulesPanel.innerHTML.includes('[규칙 추가]') && rulesPanel.innerHTML.includes('부적의 조건부 줄'), 'an empty panel explains how to start and where guards, warcries and curses went');
assert(!rulesPanel.innerHTML.includes('컨디션 젬'), 'no condition gem wording is left');
vm.runInContext('game.journalEntries = ["act_3"]; addSkillAutoRule();', runtime);
assert.deepStrictEqual(JSON.parse(vm.runInContext('JSON.stringify(game.skillAutoRules.map(rule => [rule.actionType, rule.enabled]))', runtime)),
    [['target_nearest', true]], 'a new rule starts on the first tactic, enabled');
assert(rulesPanel.innerHTML.includes('value="return_town"'), 'the return-to-town action (예전 귀환 젬) is offered');
assert.strictEqual(vm.runInContext("translateSkillTag('curse')", runtime), '저주', 'curse tags must be localized');
assert.strictEqual(vm.runInContext("translateSkillTag('warcry')", runtime), '함성', 'warcry tags must be localized');
assert.strictEqual(vm.runInContext("translateSkillTag('guard')", runtime), '수호', 'guard tags must be localized');
assert.strictEqual(vm.runInContext("translateSkillTag('utility')", runtime), '기능', 'utility tags must be localized');
vm.runInContext("game.activeSkill='연속 베기'; game.equippedSummonSkills=[];", runtime);
assert.strictEqual(vm.runInContext("gemSelectionUi.application('근접 물리 피해', getPlayerStats())", runtime), '적용: 주 공격');
assert.strictEqual(vm.runInContext("gemSelectionUi.application('투사체 강화', getPlayerStats())", runtime), '현재 주 공격·소환 젬에 적용되지 않음');
vm.runInContext("game.activeSkill='기본 공격'; game.skills.push('냉기 위습 소환'); game.equippedSummonSkills=['냉기 위습 소환'];", runtime);
assert(vm.runInContext("gemSelectionUi.application('원소 집중', getPlayerStats()).includes('냉기 위습 소환')", runtime), 'support must include an eligible equipped summon even when the main attack is physical');
const favorHtml = vm.runInContext("game.expertise.levels.mycologist=10; game.expertise.favors.mycologist=getExpertFavorOptions('mycologist')[0].id; getExpertiseCardHtml('mycologist')", runtime);
assert(favorHtml.includes('현재 선택') && favorHtml.includes('✓ 선택됨'), 'expert favor must name and badge the active choice');

const equipmentCardHtml = runtime.renderInventoryCard({ id: 9910, slot: 'weapon', name: 'Test Sword', baseName: 'Test Sword', rarity: 'normal', baseStats: [], stats: [] }, 0, 'equip');
assert(!equipmentCardHtml.includes('<details'), 'equipment card actions must not be split behind a management disclosure');
// Equipment action behavior is checked in the real browser when that screen changes.

const starWedgeDrawer = { hidden: false, open: true };
const starWedgePanel = { innerHTML: '' };
runtime.document.getElementById = id => id === 'passive-star-wedge-drawer' ? starWedgeDrawer
    : (id === 'ui-star-wedge-panel' ? starWedgePanel : null);
vm.runInContext('game.season=6; game.maxZoneId=10; renderStarWedgePanel();', runtime);
assert.strictEqual(starWedgeDrawer.hidden, true, 'star-wedge management must stay hidden before loop 7');
assert.strictEqual(starWedgeDrawer.open, false, 'a loop reset below 7 must close an already open star-wedge drawer');
vm.runInContext('game.season=7; game.maxZoneId=0; renderStarWedgePanel();', runtime);
assert.strictEqual(starWedgeDrawer.hidden, false, 'star-wedge management must appear as soon as loop 7 begins');
assert(starWedgePanel.innerHTML.includes('잠금 상태'), 'loop 7 may show the button before the separate act requirement is met');
runtime.document.getElementById = () => null;
vm.runInContext('game.season=25; game.unlockedSeasonContents=[]; game.seenSeasonContentNotices=[]; applySeasonContentProgression({silent:true});', runtime);
assert.strictEqual(vm.runInContext("game.unlockedSeasonContents.includes('season_25')", runtime), true, 'loop milestones must extend through the growth-board unlock');
assert.strictEqual(vm.runInContext('game.unlockedSeasonContents.length', runtime), 25, 'milestone reconciliation must register every loop through 25 exactly once');
[
    [2, '홀씨 제작'], [11, '심해 / 낚시'], [15, '군락지 / 군락지 액막이'],
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
