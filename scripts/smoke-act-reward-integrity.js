const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

// 액트 클리어 보상(ACT_REWARD_DB)의 데이터 무결성과, 액트 2 보상이 더 이상
// 공격 스킬 젬을 주지 않는다는 것을 검증한다. 루프 첫 처치 확정 지급
// (LOOP_STARTER_GEM_BY_HERO, js/combat.js:grantLoopStarterGemOnFirstKill)으로
// 이미 공격 스킬 하나를 들고 있는 시점이라, 액트 2에서 또 공격 젬을 고르게 하면
// 선택이 겹치거나 무의미해지기 때문에 보조 젬 선택으로 바꿨다.
const context = { console };
context.window = context;
vm.createContext(context);
// 여러 파일을 하나로 이어붙여 한 번에 실행한다 — vm.runInContext를 파일별로 나눠 부르면
// 최상위 const 선언이 다음 호출로 넘어가지 않는다(실제 브라우저의 non-module <script> 태그는
// 최상위 렉시컬 스코프를 공유하지만, vm은 그렇지 않다). SUPPORT_GEM_DB처럼 safeExposeData/
// safeExposeGlobals 없이 순수 const로만 존재하는 값은 이렇게 해야 읽을 수 있다.
const combinedSource = [
    'data/constants.js', 'data/maps.js', 'data/skills.js', 'data/items.js', 'data/passives.js', 'data/passive-tree-v22.js', 'data/bosses.js', 'data/rewards.js', 'data/talent-cards.js', 'data/endgame-progression.js',
    'js/utils.js', 'data/ascendancies.js', 'js/state.js', // js/state.js -> SUPPORT_GEM_DB
].map(file => fs.readFileSync(file, 'utf8')).join('\n;\n')
    // SUPPORT_GEM_DB는 safeExposeData/safeExposeGlobals를 거치지 않는 순수 최상위 const라
    // vm 컨텍스트 프로퍼티로 드러나지 않는다. 같은 스크립트 안에서 직접 옮겨 심는다.
    + '\n;\nwindow.SUPPORT_GEM_DB = SUPPORT_GEM_DB;';
vm.runInContext(combinedSource, context, { filename: 'combined.js' });

const { ACT_REWARD_DB, SKILL_DB, SUPPORT_GEM_DB, LOOP_STARTER_GEM_BY_HERO, ORB_DB } = context;

// 모든 액트 보상의 skill/support 선택지는 실존하는 젬을 가리켜야 한다.
Object.entries(ACT_REWARD_DB).forEach(([zoneId, entry]) => {
    (entry.choices || []).forEach(choice => {
        if (choice.kind === 'skill') assert(SKILL_DB[choice.skill] && SKILL_DB[choice.skill].isGem, `ACT_REWARD_DB[${zoneId}]의 skill 선택지가 존재하지 않는 젬 [${choice.skill}]을 가리킨다`);
        if (choice.kind === 'support') {
            assert(SUPPORT_GEM_DB[choice.gem], `ACT_REWARD_DB[${zoneId}]의 support 선택지가 존재하지 않는 보조 젬 [${choice.gem}]을 가리킨다`);
            assert(['points', 'currency'].includes(choice.fallbackKind), `ACT_REWARD_DB[${zoneId}]의 support 대체 보상 종류가 잘못되었다`);
            if (choice.fallbackKind === 'currency') assert(ORB_DB[choice.currency || 'magicBud'],
                `ACT_REWARD_DB[${zoneId}]의 support 대체 재화 [${choice.currency}]가 존재하지 않는다`);
        }
    });
});

// 액트 2(zoneId 1) 보상은 더 이상 공격 스킬 젬을 주지 않는다 — 루프 첫 처치 확정
// 지급과 겹치므로 보조 젬 선택으로 바뀌었다.
const act2 = ACT_REWARD_DB[1];
assert(act2, 'ACT_REWARD_DB[1](액트 2 보상)이 존재해야 한다');
assert(act2.choices.every(c => c.kind === 'support'), '액트 2 보상은 공격 스킬 젬이 아니라 보조 젬 선택이어야 한다');
assert(act2.choices.length >= 3, '액트 2 보상은 최소 3개 이상의 선택지를 제공해야 한다');

// 액트 2와 액트 6(zoneId 5, 기존 보조 젬 선택) 보상이 서로 다른 보조 젬 목록을 제공해야
// 같은 루프 안에서 두 번 다른 보조 젬을 고르는 재미가 유지된다.
const act6 = ACT_REWARD_DB[5];
assert(act6 && act6.choices.every(c => c.kind === 'support'), 'ACT_REWARD_DB[5](액트 6 보상)는 기존처럼 보조 젬 선택이어야 한다');
const act2Gems = new Set(act2.choices.map(c => c.gem));
const act6Gems = new Set(act6.choices.map(c => c.gem));
const overlap = [...act2Gems].filter(gem => act6Gems.has(gem));
assert.strictEqual(overlap.length, 0, `액트 2와 액트 6 보상이 같은 보조 젬을 중복 제공한다: ${overlap.join(', ')}`);

// 재능별 루프 시작 젬 매핑도 실존 스킬을 가리켜야 하고, 서로 구분되어야 할 재능은
// 실제로 다른 젬을 받아야 한다(전사/성기사/수호자가 모두 같은 젬을 받으면 차별화가 무의미하다).
Object.entries(LOOP_STARTER_GEM_BY_HERO).forEach(([heroId, gemName]) => {
    assert(SKILL_DB[gemName] && SKILL_DB[gemName].isGem, `LOOP_STARTER_GEM_BY_HERO.${heroId}가 존재하지 않는 젬 [${gemName}]을 가리킨다`);
});
const meleePhysicalHeroes = ['hero2', 'hero5', 'hero8']; // 전사·성기사·수호자
const meleePhysicalGems = new Set(meleePhysicalHeroes.map(id => LOOP_STARTER_GEM_BY_HERO[id]));
assert.strictEqual(meleePhysicalGems.size, meleePhysicalHeroes.length, '전사·성기사·수호자는 서로 다른 시작 젬을 받아야 한다');
assert.notStrictEqual(LOOP_STARTER_GEM_BY_HERO.hero1, undefined);
assert.notStrictEqual(LOOP_STARTER_GEM_BY_HERO.hero1, LOOP_STARTER_GEM_BY_HERO.hero6, '궁수·저격수는 서로 다른 시작 투사체 젬을 받아야 한다');
assert(SKILL_DB[LOOP_STARTER_GEM_BY_HERO.hero7].tags.includes('summon_attack') && (SKILL_DB[LOOP_STARTER_GEM_BY_HERO.hero7].ele === 'phys'), '소환사의 시작 소환수는 물리 속성이어야 한다');

// 중복 보조 젬의 표시와 지급은 fallbackKind를 실제로 따라야 한다.
// 액트 2는 포인트, 액트 6은 재화이며 두 경로 모두 실제 프로덕션 함수를 실행한다.
const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
run(`game=mergeDefaults({});game.claimableActRewards=[1,5,9];game.claimedActRewards=[]`);
const lockedSnapshot=run('JSON.stringify(game)');
run('claimActRewardChoice(1,0);claimActRewardChoice(9,2)');
assert.equal(run('JSON.stringify(game)'),lockedSnapshot,'locked reward clicks cannot consume readiness or grant rewards');
assert(run('!getActRewardChoices(1).some(choice=>isActRewardChoiceAvailable(choice))'));
assert(run('getActRewardChoices(0).every(choice=>isActRewardChoiceAvailable(choice))'));
assert.equal(run('JSON.stringify(getAvailableActRewardZoneIds())'),'[9]');
assert(run('!isActRewardChoiceAvailable({kind:"currency",currency:"magicBud"})'));
run(`game.season=2;game.contentProgression.inherited.push('support','craft');contentProgression.sync()`);
assert(run('getActRewardChoices(1).every(choice=>isActRewardChoiceAvailable(choice))'));
run(`
    game.supports = ['가벼운 발걸음', '가속'];
    game.supportGemData = {
        '가벼운 발걸음': { level: 1, exp: 0 },
        '가속': { level: 1, exp: 0 }
    };
    game.passivePoints = 0;
    game.currencies.magicBud = 0;
    game.currencies.gemShard = 0;
`);

// 미보유 보조 젬은 실제 보유 목록과 성장 데이터에 추가되고, 장착 젬만 보기 상태도
// 해제되어 플레이어가 획득 결과를 즉시 확인할 수 있어야 한다.
run('game.gemFoldInactiveSupport = true');
run('grantActRewardEntry(1, getActRewardChoices(1)[1])');
assert.strictEqual(run("game.supports.includes('날카로움')"), true,
    '액트 보상으로 선택한 미보유 보조 젬은 보유 목록에 추가되어야 한다');
assert.strictEqual(run("game.supportGemData['날카로움'].level"), 1,
    '새 보조 젬의 성장 데이터가 초기화되어야 한다');
assert.strictEqual(run('game.gemFoldInactiveSupport'), false,
    '새 보조 젬 획득 후에는 장착 젬만 보기 상태가 해제되어야 한다');

const ownedAct2Choices = JSON.parse(run('JSON.stringify(getActRewardChoices(1))'));
assert(ownedAct2Choices[0].desc.includes('스킬트리 포인트 +1'),
    '액트 2 중복 보조 젬 설명은 존재하지 않는 오브가 아니라 스킬트리 포인트를 표시해야 한다');
run('grantActRewardEntry(1, getActRewardChoices(1)[0])');
assert.strictEqual(run('game.passivePoints'), 1, '액트 2 중복 보조 젬은 패시브 포인트를 지급해야 한다');
assert.strictEqual(run('game.currencies.magicBud'), 0, '액트 2 포인트 대체 보상은 제작 재화를 잘못 지급하면 안 된다');
assert.strictEqual(run('game.currencies.gemShard'), 3, '중복 보조 젬의 젬 잔향 보상은 유지되어야 한다');

const ownedAct6Choices = JSON.parse(run('JSON.stringify(getActRewardChoices(5))'));
assert(ownedAct6Choices[0].desc.includes('마법의 새싹 2개'),
    '액트 6 중복 보조 젬 설명은 기존 제작 재화를 표시해야 한다');
run('grantActRewardEntry(5, getActRewardChoices(5)[0])');
assert.strictEqual(run('game.currencies.magicBud'), 2, '액트 6 중복 보조 젬은 기존 제작 재화를 지급해야 한다');
assert.strictEqual(run('game.passivePoints'), 1, '액트 6 재화 대체 보상은 패시브 포인트를 잘못 지급하면 안 된다');
assert.strictEqual(run('game.currencies.gemShard'), 6, '두 번째 중복 보조 젬도 젬 잔향을 지급해야 한다');

// 액트 1 보상의 무기는 직업 대표 무기(직업 카드의 '대표 무기')의 대분류로 나와 빈 무기 칸에 바로 낀다. 아무 무기나 나와 궁수가
// 대검을 받기도 했다(플레이 리뷰 2026-10-07). 선택지의 DPS 미리보기는 보상을 잠시 적용해 재고 상태를 그대로 되돌린다.
const classWeapons = JSON.parse(run('JSON.stringify(HANA_WEAPON_COMBOS.classWeapons)'));
assert.strictEqual(Object.keys(classWeapons).length, 6, '여섯 직업 모두 대표 무기가 있어야 한다');
for (const [classId, category] of Object.entries(classWeapons)) {
    run(`game = mergeDefaults({}); game.selectedClassId = '${classId}'; game.level = 6; game.claimableActRewards = [0]; game.claimedActRewards = [];`);
    const weapon = JSON.parse(run(`JSON.stringify(getActRewardChoices(0).find(choice => choice.slot === '무기'))`));
    assert.strictEqual(weapon.weaponCategory, category, `${classId}의 액트 1 무기 보상은 대표 무기 대분류여야 한다`);
    assert.strictEqual(weapon.label, `미확인 ${run(`WEAPON_CATEGORIES['${category}'].name`)}`, `${classId}: 선택지 이름에 무기 대분류를 적는다`);
    const preview = JSON.parse(run(`(() => {
        const before = getPlayerStats(false).dps;
        const change = measureActRewardDps(0, getActRewardChoices(0).find(choice => choice.slot === '무기'), before);
        return JSON.stringify({ change, empty: !game.equipment['무기'] });
    })()`));
    assert(preview.change && preview.change.after > preview.change.before, `${classId}: 무기 미리보기는 빈 칸에 끼운 DPS 상승을 잰다`);
    assert(preview.empty, `${classId}: 미리보기는 잠시 끼운 무기를 빼고 되돌린다`);
    run(`grantActRewardEntry(0, getActRewardChoices(0).find(choice => choice.slot === '무기'))`);
    assert.strictEqual(run(`getWeaponCategoryId(game.equipment['무기'])`), category, `${classId}: 받은 무기는 대표 무기 대분류로 빈 칸에 장착된다`);
}

// 능력치 보상도 고르면 바뀌는 DPS를 보인다: 투사체 스킬에는 투사체 피해만 오른다. 미리보기는 보상 능력치를 남기지 않는다.
run(`game = mergeDefaults({}); game.level = 40; game.skills.push('연발 사격'); game.gemData['연발 사격'] = { level: 10, exp: 0 }; game.activeSkill = '연발 사격';`);
const act8 = JSON.parse(run(`(() => {
    const before = getPlayerStats(false).dps;
    return JSON.stringify(getActRewardChoices(7).map(choice => ({ stat: choice.stat, change: measureActRewardDps(7, choice, before) })));
})()`));
const projectile = act8.find(row => row.stat === 'projectilePctDmg').change, melee = act8.find(row => row.stat === 'meleePctDmg').change;
assert(projectile.after > projectile.before * 1.1, '투사체 스킬에는 투사체 피해 보상이 DPS를 올린다');
assert.strictEqual(Math.floor(melee.after), Math.floor(melee.before), '근접 피해 보상은 투사체 스킬의 DPS를 바꾸지 않는다');
assert.strictEqual(run('game.actRewardBonuses.length'), 0, '미리보기는 보상 능력치를 남기지 않는다');
assert.strictEqual(run('formatActRewardDps({ before: 10.2, after: 10.7, direct: true }, { kind: "stat" })'), '', '보이는 DPS가 같으면 줄을 뺀다');

// 무기 칸에 다른 무기가 있으면 보상은 가방으로 가고, DPS는 바꿔 끼웠을 때의 값을 "바꿔 끼우면"으로 보인다. 낀 무기는 그대로다.
run(`game = mergeDefaults({}); game.selectedClassId = 'archer'; game.level = 6;
    game.equipment['무기'] = createItemFromBase(BASE_ITEM_DB.find(base => base.id === 'apprentice_familiar_wand'), 'normal', 1);`);
const swap = JSON.parse(run(`(() => {
    const before = getPlayerStats(false).dps;
    const change = measureActRewardDps(0, getActRewardChoices(0).find(choice => choice.slot === '무기'), before);
    return JSON.stringify({ change, kept: game.equipment['무기'].baseId });
})()`));
assert(swap.change && swap.change.swap && !swap.change.direct, '무기 칸이 차 있으면 바꿔 낀 DPS를 잰다');
assert.strictEqual(swap.kept, 'apprentice_familiar_wand', '미리보기 뒤에도 낀 무기는 그대로다');
// 두 무기의 기본 수치는 무작위로 굴러 DPS가 같을 수도 있어 글은 정해진 값으로 본다.
assert.strictEqual(run(`formatActRewardDps({ before: 10, after: 20, direct: false, swap: true }, { kind: 'item' })`),
    '<b class="reward-choice-dps is-up">바꿔 끼우면 DPS 10 → 20 (옵션 제외)</b>', '가방으로 가는 장비의 DPS는 바꿔 끼운 값이라고 적는다');
assert.strictEqual(run('formatActRewardDps(null, { kind: "item" })'), '', '가방으로 가는 장비는 DPS를 보이지 않는다');

// 액트 보스를 쓰러뜨리면(markActRewardReady) 다음 지역으로 떠나기 전에 보상 창이 열린다(열린 동안 게임과 출발이 멈춘다).
// 방치 정산 중이나 자리를 비운 방치(입력 3분 넘게 없음) 중에는 열지 않고, 안내 카드가 떠 있으면 비킬 때까지 기다린다.
const elements = new Map();
const fakeElement = id => {
    if (!elements.has(id)) {
        const classes = new Set();
        elements.set(id, { id, innerHTML: '', innerText: '', textContent: '', style: {}, dataset: {}, children: [], hidden: false,
            classList: { add: name => classes.add(name), remove: name => classes.delete(name), contains: name => classes.has(name), toggle() {} },
            appendChild() {}, insertBefore() {}, removeChild() {}, remove() {}, addEventListener() {}, removeEventListener() {},
            setAttribute() {}, getAttribute: () => null, removeAttribute() {}, toggleAttribute() {}, closest: () => null,
            querySelector: () => null, querySelectorAll: () => [],
            getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }) });
    }
    return elements.get(id);
};
const promptRuntime = buildGameRuntime({}, null, { getElementById: fakeElement });
const prompt = code => vm.runInContext(code, promptRuntime);
prompt(`game = mergeDefaults({}); game.selectedClassId = 'archer'; game.level = 6;`);
prompt('markActRewardReady(0)');
assert.strictEqual(prompt('isRewardOpen() && activeRewardZoneId === 0'), true, '액트 보스를 쓰러뜨리면 보상 창이 바로 열린다');
const rewardGrid = fakeElement('reward-grid').innerHTML;
assert(rewardGrid.includes('미확인 단궁'), '궁수의 무기 보상은 단궁이다');
assert(/DPS \d+ → \d+ \(옵션 제외\)/.test(rewardGrid), '무기 보상은 옵션 없는 기본 성능의 DPS 전후를 보인다');
assert(rewardGrid.includes('마법 등급, 빈 칸에 바로 장착됩니다') && !rewardGrid.includes('·'), '미리보기는 쉼표로 잇는다');
prompt('closeRewardOverlay()');
prompt('game.isBackgroundCalculation = true; markActRewardReady(2); game.isBackgroundCalculation = false;');
assert.strictEqual(prompt('isRewardOpen()'), false, '방치 정산 중에는 보상 창을 열지 않는다');
prompt('activeTutorial = { key: "test" }; markActRewardReady(3)');
assert.strictEqual(prompt('isRewardOpen()'), false, '안내 카드가 떠 있으면 보상 창은 기다린다');
prompt('activeTutorial = null; tryOpenPromptedActReward(3)');
assert.strictEqual(prompt('isRewardOpen() && activeRewardZoneId === 3'), true, '안내 카드가 비키면 기다리던 보상 창이 열린다');
prompt('closeRewardOverlay()');
promptRuntime.performance.now = () => Date.now() + 10 * 60 * 1000;
prompt('markActRewardReady(4)');
assert.strictEqual(prompt('isRewardOpen()'), false, '입력이 3분 넘게 없으면(자리 비움) 보상 창을 열지 않는다');
assert.strictEqual(prompt('JSON.stringify(game.claimableActRewards)'), '[0,2,3,4]', '열지 않은 보상도 받을 수 있게 남는다');

console.log('smoke-act-reward-integrity passed');
