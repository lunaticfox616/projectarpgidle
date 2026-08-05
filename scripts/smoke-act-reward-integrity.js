const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

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
    'data/constants.js', 'data/maps.js', 'data/skills.js', 'data/items.js',
    'data/passives.js', 'data/bosses.js', 'data/rewards.js', 'data/talent-cards.js',
    'js/utils.js', 'js/state.js', // js/state.js -> SUPPORT_GEM_DB
].map(file => fs.readFileSync(file, 'utf8')).join('\n;\n')
    // SUPPORT_GEM_DB는 safeExposeData/safeExposeGlobals를 거치지 않는 순수 최상위 const라
    // vm 컨텍스트 프로퍼티로 드러나지 않는다. 같은 스크립트 안에서 직접 옮겨 심는다.
    + '\n;\nwindow.SUPPORT_GEM_DB = SUPPORT_GEM_DB;';
vm.runInContext(combinedSource, context, { filename: 'combined.js' });

const { ACT_REWARD_DB, SKILL_DB, SUPPORT_GEM_DB, LOOP_STARTER_GEM_BY_HERO } = context;

// 모든 액트 보상의 skill/support 선택지는 실존하는 젬을 가리켜야 한다.
Object.entries(ACT_REWARD_DB).forEach(([zoneId, entry]) => {
    (entry.choices || []).forEach(choice => {
        if (choice.kind === 'skill') assert(SKILL_DB[choice.skill] && SKILL_DB[choice.skill].isGem, `ACT_REWARD_DB[${zoneId}]의 skill 선택지가 존재하지 않는 젬 [${choice.skill}]을 가리킨다`);
        if (choice.kind === 'support') assert(SUPPORT_GEM_DB[choice.gem], `ACT_REWARD_DB[${zoneId}]의 support 선택지가 존재하지 않는 보조 젬 [${choice.gem}]을 가리킨다`);
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

console.log('smoke-act-reward-integrity passed');
