// 5차 재능 개화 시련 클리어 시 재능특화/전직특화 노드용 포인트(전직 +2 · 키스톤 +1)가
// 루프마다 다시 지급되는지 검증한다.
// 회귀 방지 대상 버그: 포인트 지급이 영구 기록(bloomedClasses)에 묶여 있어 직업 최초 개화 1회만 지급되고,
// 루프 정산으로 ascendPoints가 0으로 초기화된 이후에는 특화 노드를 찍을 포인트가 없던 문제.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const fnMatch = combatSource.match(/function handleTalentBloomClear\(zone\) \{[\s\S]*?\n\}/);
assert(fnMatch, 'handleTalentBloomClear must exist');

function makeContext() {
  const context = {
    game: {
      ascendClass: 'warrior',
      bloomedClasses: [],
      bloomLoopSpecGranted: null,
      ascendPoints: 0,
      ascendKeystonePoints: 0,
      ascendRank: 4,
      currencies: { chaosKey: 5, coreKey: 5 },
      talentBloomClears: 0,
      talentBloomCombos: [],
      selectedHeroId: 'hero1',
      maxZoneId: 0,
      unlocks: {},
      noti: {}
    },
    // 의존성 스텁: 포인트 지급 외 부수 효과는 검증 대상이 아니므로 무해하게 처리한다.
    addLog() {},
    queueTutorialNotice() {},
    recordTalentBloomCard() { return { card: { level: 1 }, score: 0, leveledUp: false }; },
    dispatchRuntimeEvent() {},
    getAutoProgressZoneId() { return 0; },
    startMoving() {},
    updateStaticUI() {},
    queueImportantSave() {},
    getHeroSelectionDef() { return { label: 'hero1' }; },
    CLASS_TEMPLATES: { warrior: { name: '전사' } }
  };
  vm.createContext(context);
  vm.runInContext(`${fnMatch[0]}; this.handleTalentBloomClear = handleTalentBloomClear;`, context);
  return context;
}

// 루프 정산이 ascend 포인트/직업/특화 지급 플래그를 초기화하는 동작을 재현한다.
function simulateLoopReset(game) {
  game.ascendPoints = 0;
  game.ascendKeystonePoints = 0;
  game.ascendRank = 0;
  game.bloomLoopSpecGranted = null;
  // 직업/시련은 루프마다 다시 선택·재클리어한다.
  game.ascendClass = 'warrior';
}

const ctx = makeContext();
const game = ctx.game;
const bloomZone = { id: 'trial_5', bloomTrial: true };

// 1) 직업 최초 개화: 노드 영구 해금 + 특화 포인트 지급
ctx.handleTalentBloomClear(bloomZone);
assert.deepStrictEqual(game.bloomedClasses, ['warrior'], 'first bloom must permanently unlock the class fifth nodes');
assert.strictEqual(game.ascendPoints, 2, 'first bloom must grant +2 ascend points for talent/job specialization');
assert.strictEqual(game.ascendKeystonePoints, 1, 'first bloom must grant +1 keystone point');
assert.strictEqual(game.bloomLoopSpecGranted, 'warrior', 'first bloom must mark spec points granted this loop');

// 2) 같은 루프에서 다시 개화 시련을 클리어해도 포인트는 중복 지급되지 않는다(파밍 방지).
ctx.handleTalentBloomClear(bloomZone);
assert.strictEqual(game.ascendPoints, 2, 'repeat bloom within the same loop must NOT grant extra ascend points');
assert.strictEqual(game.ascendKeystonePoints, 1, 'repeat bloom within the same loop must NOT grant extra keystone points');

// 3) 루프 정산 후 다시 개화 시련을 클리어하면 포인트가 재지급된다(핵심 회귀 케이스).
simulateLoopReset(game);
ctx.handleTalentBloomClear(bloomZone);
assert.strictEqual(game.ascendPoints, 2, 'after a loop reset, clearing the bloom trial must re-grant +2 ascend points');
assert.strictEqual(game.ascendKeystonePoints, 1, 'after a loop reset, clearing the bloom trial must re-grant +1 keystone point');
assert.strictEqual(game.ascendRank, 5, 'clearing the bloom trial must restore the fifth ascend rank');
assert.deepStrictEqual(game.bloomedClasses, ['warrior'], 'the permanent bloom record must not be duplicated on later loops');

console.log('smoke-bloom-loop-spec-points: OK');
