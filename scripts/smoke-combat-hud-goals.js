const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/ui.js', 'utf8');
const hudStart = source.indexOf('function getCombatHudIdentity');
const hudEnd = source.indexOf('function updateCombatUI', hudStart);
const goalStart = source.indexOf('function getAvailableGoalItem');
const goalEnd = source.indexOf('function refreshGoalDrawerFromGameState', goalStart);
assert(hudStart >= 0 && hudEnd > hudStart, 'HUD 표시 계산 블록을 찾을 수 있어야 합니다');
assert(goalStart >= 0 && goalEnd > goalStart, '추천 목표 계산 블록을 찾을 수 있어야 합니다');

const context = {
    game: {},
    CLASS_TEMPLATES: { ranger: { name: '레인저' } },
    getHeroSelectionDef: () => ({ label: '궁수' }),
    getExpReq: level => level * 100,
    formatSettingNumber: value => String(value),
    showInfoTooltipHtml() {},
    STORY_ACTS: [
        { order: 1, displayAct: '1', title: '첫 관문' },
        { order: 2, displayAct: '2', title: '중간 관문' },
        { order: 3, displayAct: '3', title: '합일의 차륜' }
    ],
    getStoryActByZoneId: () => ({ order: 2, displayAct: '2' })
};
vm.createContext(context);
vm.runInContext(source.slice(hudStart, hudEnd), context);
vm.runInContext(source.slice(goalStart, goalEnd), context);

context.game = { level: 2, exp: 50, selectedHeroId: 'hero1', ascendClass: 'ranger', runProgress: 42, passivePoints: 3, inventory: [] };
assert.strictEqual(vm.runInContext('getCombatHudIdentity()', context), 'Lv.2 · 레인저');
const expState = vm.runInContext('getExperienceHudState(game.level, game.exp)', context);
assert.strictEqual(expState.percent, 25);
assert.strictEqual(expState.remaining, 150);

context.getZone = () => ({ id: 1, name: '뿌리끝 성소' });
const goals = vm.runInContext('buildRecommendedGoalItems()', context);
assert.strictEqual(goals.length, 3, '추천 목표는 세 개를 제공해야 합니다');
assert.deepStrictEqual(Array.from(goals, goal => goal.category), ['현재 진행', '지금 할 수 있음', '장기 여정']);
assert.strictEqual(goals[0].current, 42);
assert.strictEqual(goals[1].id, 'spend-passives');
assert.strictEqual(goals[2].id, 'complete-story');
assert.strictEqual(goals[2].current, 2);
assert.strictEqual(goals[2].target, 3);
assert(!goals.some(goal => goal.id.startsWith('level-')), '레벨업 목표를 추천하지 않아야 합니다.');

context.game.passivePoints = 0;
context.game.inventory = [{ id: 1 }, { id: 2 }];
const equipmentGoal = vm.runInContext('getAvailableGoalItem()', context);
assert.strictEqual(equipmentGoal.id, 'review-equipment');
assert(equipmentGoal.title.includes('2개'));

console.log('smoke-combat-hud-goals passed');
