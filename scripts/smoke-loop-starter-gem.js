const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

// 루프 첫 처치 시 재능(시작 캐릭터)에 맞는 하위권 화력 스킬 젬을 확정 지급하는 로직 검증.
// "기본 공격"만 들고 루프를 시작하는 공백을 메우는 기능이며, 이미 실제 스킬을 보유한
// (마이그레이션된 기존 저장 데이터의) 진행 중인 루프에는 소급 지급하지 않아야 한다.
const constantsSource = fs.readFileSync('data/constants.js', 'utf8');
const skillsSource = fs.readFileSync('data/skills.js', 'utf8');
const passivesDataSource = fs.readFileSync('data/passives.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

const start = combatSource.indexOf('function grantLoopStarterGemOnFirstKill');
const end = combatSource.indexOf('\n}', start) + 2;
assert(start >= 0 && end > start, 'grantLoopStarterGemOnFirstKill must be extractable for the smoke check');

const context = {
    console,
    logged: [],
    addLog(msg) { context.logged.push(msg); },
    hasSkillGemOwned(name) { return (context.game.skills || []).includes(name); },
};
context.window = context;
vm.createContext(context);
// data/*.js는 safeExposeData(js/utils.js 아님, data/constants.js가 정의)로 window에 값을 옮겨
// 심는다. vm 최상위 const 선언은 context 프로퍼티로 드러나지 않으므로 실제 노출 경로를 따른다.
vm.runInContext(constantsSource, context, { filename: 'data/constants.js' });
vm.runInContext(skillsSource, context, { filename: 'data/skills.js' });
vm.runInContext(passivesDataSource, context, { filename: 'data/passives.js' });
vm.runInContext(combatSource.slice(start, end), context, { filename: 'grantLoopStarterGemOnFirstKill.js' });

// 모든 재능이 매핑을 갖고, 그 매핑이 실존하는 스킬 젬을 가리켜야 한다.
Object.keys(context.HERO_SELECTION_DEFS).forEach(heroId => {
    let gemName = context.LOOP_STARTER_GEM_BY_HERO[heroId];
    assert(gemName, `${heroId}(${context.HERO_SELECTION_DEFS[heroId].label})에 시작 젬 매핑이 없다`);
    assert(context.SKILL_DB[gemName] && context.SKILL_DB[gemName].isGem, `${heroId}의 시작 젬 [${gemName}]이 SKILL_DB에 없거나 젬이 아니다`);
});

// 신규 루프(스킬이 기본 공격 하나뿐): 첫 처치 때 재능에 맞는 젬을 지급해야 한다.
Object.entries(context.LOOP_STARTER_GEM_BY_HERO).forEach(([heroId, expectedGem]) => {
    context.game = { selectedHeroId: heroId, skills: ['기본 공격'], gemData: {}, noti: {}, loopStarterGemGranted: false };
    context.logged = [];
    context.grantLoopStarterGemOnFirstKill();
    assert.deepStrictEqual(context.game.skills, ['기본 공격', expectedGem], `${heroId}는 첫 처치 시 [${expectedGem}]을 받아야 한다`);
    assert.strictEqual(context.game.loopStarterGemGranted, true, '지급 플래그가 켜져야 한다');
    assert(context.game.gemData[expectedGem], '지급된 젬의 gemData 항목이 생성되어야 한다');
    assert.strictEqual(context.game.starterGemTutorialPending, expectedGem, '첫 젬은 장착 안내 대상으로 기록되어야 한다');
});

// 같은 루프에서 두 번째 처치가 일어나도 중복 지급되지 않는다.
context.game = { selectedHeroId: 'hero1', skills: ['기본 공격'], gemData: {}, noti: {}, loopStarterGemGranted: false };
context.grantLoopStarterGemOnFirstKill();
context.grantLoopStarterGemOnFirstKill();
assert.strictEqual(context.game.skills.length, 2, '두 번째 처치에서 다시 지급되면 안 된다');

// 마이그레이션 가드: 기존 저장 데이터라 플래그가 없어(false) 이번에 처음 이 코드를 만나더라도,
// 이미 기본 공격 외의 스킬을 들고 진행 중인 루프에는 소급 지급하지 않는다.
context.game = { selectedHeroId: 'hero1', skills: ['기본 공격', '연속 베기'], gemData: {}, noti: {}, loopStarterGemGranted: false };
context.grantLoopStarterGemOnFirstKill();
assert.deepStrictEqual(context.game.skills, ['기본 공격', '연속 베기'], '이미 실제 스킬을 보유했다면 소급 지급하지 않아야 한다');
assert.strictEqual(context.game.loopStarterGemGranted, true, '가드로 건너뛰어도 플래그는 켜져 재평가를 막아야 한다');

// 루프 리셋 시 지급 플래그가 초기화되어야 다음 루프에서 다시 받을 수 있다.
assert(combatSource.includes("game.loopStarterGemGranted = false;"), '루프 리셋(triggerSeasonReset)이 지급 플래그를 초기화해야 한다');
assert(combatSource.includes('grantLoopStarterGemOnFirstKill();'), 'handleEnemyDeath가 처치 시 지급 함수를 호출해야 한다');

const targetStart = uiSource.indexOf('function getStarterGemTutorialTarget');
const targetEnd = uiSource.indexOf('function isSummonAttackSkillGem', targetStart);
assert(targetStart >= 0 && targetEnd > targetStart, 'starter gem tutorial target behavior should be executable in isolation');
vm.runInContext(uiSource.slice(targetStart, targetEnd), context, { filename: 'starter-gem-tutorial-target.js' });
context.game = {
    skills: ['기본 공격', '연속 베기'],
    activeSkill: '기본 공격',
    equippedSummonSkills: [],
    starterGemTutorialPending: '연속 베기'
};
assert.strictEqual(context.getStarterGemTutorialTarget(), '연속 베기', 'the newly granted gem should remain highlighted before equipping');
context.game.activeSkill = '연속 베기';
assert.strictEqual(context.getStarterGemTutorialTarget(), null, 'the highlight should stop once the gem is equipped');
context.game.activeSkill = '기본 공격';
context.completeStarterGemTutorial('연속 베기');
assert.strictEqual(context.game.starterGemTutorialPending, null, 'equipping should complete the inline tutorial state');

console.log('smoke-loop-starter-gem passed');
