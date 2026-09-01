const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const elements = Object.fromEntries([
  'ui-mystique', 'ui-mystique-effect', 'ui-cycle', 'ui-cycle-effect',
  'ui-revelation', 'ui-revelation-effect',
].map(id => [id, { innerText: '', textContent: '' }]));
context.document.getElementById = id => elements[id] || null;

vm.runInContext(`
  PASSIVE_TREE.nodes.ui_mystique_test = {
    id: 'ui_mystique_test', kind: 'path', effects: [{ stat: 'mystique', val: 9 }]
  };
  PASSIVE_TREE.nodes.ui_cycle_test = {
    id: 'ui_cycle_test', kind: 'path', effects: [{ stat: 'cycle', val: 4 }]
  };
  PASSIVE_TREE.nodes.ui_devotion_test = {
    id: 'ui_devotion_test', kind: 'path', effects: [{ stat: 'devotion', val: 10 }]
  };
  game.passives = ['ui_mystique_test', 'ui_cycle_test', 'ui_devotion_test'];
  ensurePassiveSpecializationState().revelation = 'guard';
  recordPassiveCycleAilmentEnd('shock', 4, Date.now());
`, context);

const stats = context.getPlayerStats();
assert.strictEqual(stats.mystique, 9, '캐릭터 스탯은 실제 할당된 신비 수치를 제공해야 한다.');
assert.strictEqual(stats.cycle, 4, '캐릭터 스탯은 실제 할당된 순환 수치를 제공해야 한다.');
assert.strictEqual(stats.devotion, 10, '캐릭터 스탯은 계시를 지탱하는 실제 헌신 수치를 제공해야 한다.');
assert.strictEqual(stats.passiveRevelationLabel, '수호의 계시');
assert.strictEqual(stats.passiveRevelationGuardTakenLessPct, 2,
  '수호의 계시 적용량은 헌신 5당 받는 피해 1% 감폭이어야 한다.');
assert.ok(stats.breakdowns.mystique.lines.some(line => line.includes('피해 +9%')),
  '신비 툴팁은 실제 상태이상 피해 증가량을 설명해야 한다.');
assert.ok(stats.breakdowns.cycle.lines.some(line => line.includes('감전 종료 효과')),
  '순환 툴팁은 현재 활성화된 종료 효과를 표시해야 한다.');
assert.strictEqual(stats.breakdowns.revelation.final, '수호의 계시');

context.__specialStats = stats;
vm.runInContext('renderCharacterPassiveSpecialStats(__specialStats);', context);
assert.strictEqual(elements['ui-mystique'].innerText, 9);
assert.ok(elements['ui-mystique-effect'].innerText.includes('피해·위력 +9%'));
assert.strictEqual(elements['ui-cycle'].innerText, 4);
assert.strictEqual(elements['ui-cycle-effect'].innerText, '상태이상 종료 시 6초 강화');
assert.strictEqual(elements['ui-revelation'].innerText, '수호의 계시');
assert.ok(elements['ui-revelation-effect'].innerText.includes('받는 피해 2% 감폭'));

vm.runInContext(`
  PASSIVE_TREE.nodes.ui_mystique_reserve_test = {
    id:'ui_mystique_reserve_test', kind:'path', effects:[{ stat:'mystique', val:1 }]
  };
  game.starWedge.nodeMutations = {};
  game.starWedge.disabledNodeEffects = {};
  game.passives = ['expansion_occult_grimoire_20'];
`, context);
assert.strictEqual(context.getGemBonusSources([]).passive, 0,
  '신비 지불 여력이 없는 봉인된 주문핵은 젬 레벨을 주면 안 된다.');
vm.runInContext("game.passives = ['ui_mystique_reserve_test', 'expansion_occult_grimoire_20'];", context);
assert.strictEqual(context.getGemBonusSources([]).passive, 1,
  '다른 패시브의 신비 1을 지불하면 봉인된 주문핵의 젬 레벨이 활성화되어야 한다.');
const tradeoffStats = context.getPlayerStats();
assert.strictEqual(tradeoffStats.mystique, 0,
  '활성화된 봉인된 주문핵은 확보한 신비 1을 지불해 최종 신비가 0이어야 한다.');

vm.runInContext('renderCharacterPassiveSpecialStats(normalizeUiPlayerStats({}));', context);
assert.strictEqual(elements['ui-mystique-effect'].innerText, '효과 없음');
assert.strictEqual(elements['ui-cycle-effect'].innerText, '효과 없음');
assert.strictEqual(elements['ui-revelation'].innerText, '미해금');
assert.strictEqual(elements['ui-revelation-effect'].innerText, '계시 수치 0');

const indexHtml = fs.readFileSync('index.html', 'utf8');
['ui-mystique', 'ui-cycle', 'ui-revelation'].forEach(id => {
  assert.ok(indexHtml.includes(`id="${id}"`), `캐릭터 탭에 ${id} 표시 영역이 연결되어야 한다.`);
});

console.log('smoke-character-passive-special-stats passed');
