// 5차 재능 개화 시련 클리어 시의 지급/개방 규칙 검증.
//  - 5차 노드는 영구가 아니라 "이번 루프 개화한 직업"에만 열린다(bloomedClassThisLoop). 루프 정산 시 초기화.
//  - 재능 개화 카드(조합 기록)만 영구.
//  - 전직 포인트(+2)·키스톤 포인트(+1)는 (새 조합) 또는 (루프당 1회) 지급. 같은 루프·같은 조합 반복은 미지급.
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
      bloomedClassThisLoop: null,
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
    addLog() {},
    queueTutorialNotice() {},
    recordTalentBloomCard() { return { card: { level: 1 }, score: 0, leveledUp: false }; },
    dispatchRuntimeEvent() {},
    getAutoProgressZoneId() { return 0; },
    startMoving() {},
    updateStaticUI() {},
    queueImportantSave() {},
    getHeroSelectionDef() { return { label: 'hero' }; },
    CLASS_TEMPLATES: { warrior: { name: '전사' } }
  };
  vm.createContext(context);
  vm.runInContext(`${fnMatch[0]}; this.handleTalentBloomClear = handleTalentBloomClear;`, context);
  return context;
}

// 루프 정산: ascend 포인트/직업/이번 루프 개방·지급 플래그를 초기화한다. (키스톤 포인트는 유지)
function simulateLoopReset(game, opts) {
  game.ascendPoints = 0;
  game.ascendRank = 0;
  game.bloomLoopSpecGranted = null;
  game.bloomedClassThisLoop = null;
  game.ascendClass = (opts && opts.heroId !== undefined) ? game.ascendClass : 'warrior';
  if (opts && opts.heroId) game.selectedHeroId = opts.heroId;
}

const ctx = makeContext();
const game = ctx.game;
const bloomZone = { id: 'trial_5', bloomTrial: true };

// 1) 직업 최초 개화(hero×warrior 신규 조합): 이번 루프 노드 개방 + 포인트 지급, 카드 영구 기록.
ctx.handleTalentBloomClear(bloomZone);
assert.strictEqual(game.bloomedClassThisLoop, 'warrior', '5th node must open for the class bloomed THIS loop');
assert.deepStrictEqual(game.talentBloomCombos, ['hero1__warrior'], 'bloom card combo must be recorded (permanent)');
assert.strictEqual(game.ascendPoints, 2, 'new combo bloom must grant +2 transfer points');
assert.strictEqual(game.ascendKeystonePoints, 1, 'new combo bloom must grant +1 keystone point');

// 2) 같은 루프·같은 조합 반복 개화: 중복 지급 없음(파밍 방지).
ctx.handleTalentBloomClear(bloomZone);
assert.strictEqual(game.ascendPoints, 2, 'repeat same-combo bloom in same loop must NOT grant extra transfer points');
assert.strictEqual(game.ascendKeystonePoints, 1, 'repeat same-combo bloom in same loop must NOT grant extra keystone points');

// 3) 루프 정산: 5차 노드 개방 플래그가 초기화된다(영구 아님).
simulateLoopReset(game);
assert.strictEqual(game.bloomedClassThisLoop, null, '5th node access must reset on loop settle (not permanent)');

// 4) 새 루프에서 이미 개화했던 조합(hero1×warrior)을 다시 개화: 루프당 1회 규칙으로 포인트 재지급 + 노드 재개방.
ctx.handleTalentBloomClear(bloomZone);
assert.strictEqual(game.bloomedClassThisLoop, 'warrior', '5th node must re-open after re-blooming in the new loop');
assert.strictEqual(game.ascendPoints, 2, 'a known combo re-bloomed in a fresh loop must re-grant transfer points');
assert.strictEqual(game.ascendKeystonePoints, 2, 'keystone points persist across loops and accumulate (now 2)');
assert.strictEqual(game.ascendRank, 5, 'clearing the bloom trial restores the fifth ascend rank for this loop');

// 5) 같은 루프에서 새로운 조합(hero2×warrior)을 개화하면, 새 조합 보너스로 추가 지급된다(120세트 누적 지급).
game.selectedHeroId = 'hero2';
ctx.handleTalentBloomClear(bloomZone);
assert.deepStrictEqual(game.talentBloomCombos, ['hero1__warrior', 'hero2__warrior'], 'second combo recorded');
assert.strictEqual(game.ascendPoints, 4, 'a brand-new combo must grant points even within the same loop');
assert.strictEqual(game.ascendKeystonePoints, 3, 'a brand-new combo must grant a keystone point even within the same loop');

console.log('smoke-bloom-loop-spec-points: OK');
