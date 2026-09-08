const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { readTree } = require('./audit-passive-tree-source');
const { PASSIVE_KEYSTONE_CONTRACTS } = require('./lib/passive-tree-keystone-contracts');

const files = [
  'js/bootstrap.js', 'cloud-save-config.js', 'data/constants.js', 'data/maps.js',
  'data/skills.js', 'data/items.js', 'data/growth-items.js', 'data/passives.js',
  'data/passive-tree-v22.js', 'data/bosses.js', 'data/rewards.js', 'data/talent-cards.js',
  'data/endgame-progression.js', 'js/utils.js', 'js/state.js', 'js/passives.js',
];

function createElement() {
  return {
    style: {}, dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {}, setAttribute() {}, addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; }, getContext() { return null; },
  };
}

const context = {
  console, window: null, globalThis: null,
  document: {
    readyState: 'loading', addEventListener() {}, getElementById() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, createElement,
    head: { appendChild() {} }, body: { appendChild() {} },
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  location: { search: '', hash: '', href: '' }, navigator: {},
  addEventListener() {}, removeEventListener() {}, setTimeout() {}, clearTimeout() {},
  setInterval() {}, clearInterval() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
  addLog() {}, queueTutorialNotice() {},
  getExpertLevel() { return 15; },
  performance: { now() { return 0; } }, Image: function Image() {}, Date, Math, JSON,
  Number, String, Boolean, Array, Object, Map, Set, WeakSet, RegExp, Error, URLSearchParams, structuredClone,
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
files.forEach(file => vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file }));
vm.runInContext('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;', context);

assert.strictEqual(PASSIVE_KEYSTONE_CONTRACTS.length, 30, '패시브 트리 키스톤 계약은 30개여야 합니다.');
PASSIVE_KEYSTONE_CONTRACTS.forEach(contract => {
  const node = context.PASSIVE_TREE.nodes[contract.id];
  assert.ok(node && node.kind === 'keystone', `키스톤 노드가 런타임 트리에 없습니다: ${contract.id}`);
  assert.strictEqual(node.title, contract.name, `키스톤 이름 계약이 다릅니다: ${contract.id}`);
  assert.strictEqual(node.desc, contract.desc, `키스톤 효과 설명 계약이 다릅니다: ${contract.id}`);
  assert.strictEqual(node.keystoneEffectId, contract.keystoneEffectId,
    `키스톤 구현 식별자가 다릅니다: ${contract.id}`);
});
const renamedContract = PASSIVE_KEYSTONE_CONTRACTS.find(contract => contract.name === '한 번의 중량');
context.__renamedKeystone = context.PASSIVE_TREE.nodes[renamedContract.id];
vm.runInContext(`
  game.passives = [__renamedKeystone.id];
  __renamedKeystone.title = '표시 이름 변경 시험';
`, context);
assert.strictEqual(context.findAllocatedPassiveKeystone('한 번의 중량').id, renamedContract.id,
  '표시 이름을 바꿔도 고유 ID로 키스톤 구현이 유지되어야 합니다.');
vm.runInContext(`__renamedKeystone.title = ${JSON.stringify(renamedContract.name)}; game.passives = [];`, context);

const authoredArcherMajors = {
  expansion_archer_longbow_17: { sourceType: 'major', effects: [['projectilePctDmg', 24], ['aspd', 5]] },
  expansion_archer_crossbow_15: { sourceType: 'normal', effects: [['projectilePctDmg', 16], ['aspd', 4]] },
  v13_balance_archer_quiver_04: { sourceType: 'major', effects: [['projectilePctDmg', 15], ['aspd', 4]] },
};
const sourceMajorById = new Map(readTree('artifacts/passive-tree/260828_3passive-tree-corrected.json').nodes
  .filter(node => node.type === 'major').map(node => [String(node.id), node]));
const preservedMajorIds = new Set(readTree('artifacts/passive-tree/260828_3passive-tree-feature-effects.json').nodes
  .filter(node => {
    const sourceNode = sourceMajorById.get(String(node.id));
    return sourceNode && node.optionProfile === sourceNode.optionProfile;
  }).map(node => String(node.id)));
Object.entries(authoredArcherMajors).forEach(([id, expected]) => {
  const passive = context.PASSIVE_TREE.nodes[id];
  assert.strictEqual(passive.sourceType, expected.sourceType, `사용자가 정한 궁수 패시브 등급이 바뀌었습니다: ${id}`);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(passive.effects.map(effect => [effect.stat, effect.val]))), expected.effects,
    `작성된 궁수 주요 패시브 효과가 바뀌었습니다: ${id}`);
});
const rareEffectStats = new Set(['suppCap', 'chaosGemLevel', 'projectileExtraShots', 'gemLevel', 'summonGemLevel']);
const statSoupMajors = Object.values(context.PASSIVE_TREE.nodes).filter(node => node.sourceType === 'major'
  && node.effects.length > 2 && !node.specialVariation
  && !preservedMajorIds.has(String(node.id))
  && !node.effects.some(effect => rareEffectStats.has(effect.stat)));
assert.deepStrictEqual(statSoupMajors.map(node => node.id), [],
  '일반 주요 패시브에 뭉치 목적과 무관한 제3 스탯을 붙이면 안 됩니다.');

const specializedAttackStats = ['slamPctDmg', 'mobilityPctDmg'];
specializedAttackStats.forEach(statId => {
  const node = Object.values(context.PASSIVE_TREE.nodes).find(candidate =>
    candidate.effects.some(effect => effect.stat === statId));
  assert.ok(node, `지원되는 공격 특화 패시브가 없습니다: ${statId}`);
  vm.runInContext(`game.passives = [${JSON.stringify(node.id)}];`, context);
  const expected = node.effects.find(effect => effect.stat === statId).val;
  assert.strictEqual(context.getAllocatedPassiveStatValue(statId), expected,
    `공격 특화 패시브가 실제 능력치에 적용되지 않습니다: ${statId}`);
});
const summonFeatureNodes = Object.values(context.PASSIVE_TREE.nodes)
  .filter(node => node.sourceType === 'major' && node.effects.length > 0
    && node.effects.every(effect => effect.stat.startsWith('summon')));
assert.ok(summonFeatureNodes.length >= 2, '소환수 전용 주요 패시브가 사라졌습니다.');
assert.ok(new Set(summonFeatureNodes.map(node => JSON.stringify(node.effects))).size >= 5,
  '소환수 전용 주요 패시브의 선택 축이 지나치게 단조로워졌습니다.');
summonFeatureNodes.forEach(node => {
  assert.strictEqual(node.sourceType, 'major');
  assert.ok(node.effects.every(effect => effect.stat.startsWith('summon')),
    `소환수 전용 패시브에 무관한 효과가 섞였습니다: ${node.id}`);
  vm.runInContext(`game.passives = [${JSON.stringify(node.id)}];`, context);
  node.effects.forEach(effect => assert.strictEqual(context.getAllocatedPassiveStatValue(effect.stat), effect.val,
    `소환수 전용 패시브 효과가 실제 능력치에 적용되지 않습니다: ${node.id}/${effect.stat}`));
});
vm.runInContext('game.passives = [];', context);

const covenant = Object.values(context.PASSIVE_TREE.nodes).find(node => node.title === '헌신의 서약');
const covenantBridgeEdges = context.PASSIVE_TREE.edges.filter(edge => edge.requiresAllocatedNodeId === covenant.id);
const covenantBridgeNodeIds = covenantBridgeEdges.map(edge => edge.from === covenant.id ? edge.to : edge.from);
assert.strictEqual(covenantBridgeEdges.length, 14, '헌신의 서약 전용 능력치 다리는 14개여야 합니다.');
assert.ok(covenantBridgeNodeIds.every(id => !context.PASSIVE_TREE.nodes[id].hiddenByKeystoneId),
  '서약 전용 연결선 때문에 기존 능력치 노드 자체가 숨겨지면 안 됩니다.');
vm.runInContext('game.passives = [];', context);
assert.ok(covenantBridgeEdges.every(edge => !context.isPassiveTreeEdgeAvailable(edge)),
  '헌신의 서약을 찍기 전에는 전용 능력치 다리가 열리면 안 됩니다.');
const lockedCovenantNeighbors = context.getPassiveTreeAdjacency().get(covenant.id);
assert.ok(covenantBridgeNodeIds.every(id => !lockedCovenantNeighbors.includes(id)),
  '잠긴 서약 다리를 경로 탐색에 사용하면 안 됩니다.');
vm.runInContext(`game.passives = [${JSON.stringify(covenant.id)}];`, context);
assert.ok(covenantBridgeEdges.every(edge => context.isPassiveTreeEdgeAvailable(edge)),
  '헌신의 서약을 찍으면 전용 능력치 다리가 열려야 합니다.');
const unlockedCovenantNeighbors = context.getPassiveTreeAdjacency().get(covenant.id);
assert.ok(covenantBridgeNodeIds.every(id => !unlockedCovenantNeighbors.includes(id)),
  '서약을 찍어도 효과 연결선을 할당 경로로 사용할 수 없습니다.');
context.calculateReachableNodes();
assert.ok(covenantBridgeNodeIds.every(id => !vm.runInContext(`reachableNodes.has('${id}')`, context)),
  '서약만 찍어서는 전용 연결선 끝의 능력치를 바로 할당할 수 없습니다.');
vm.runInContext(`game.passives.push('${covenantBridgeNodeIds[0]}')`, context);
assert.strictEqual(context.countCovenantAttributeConnections(covenant), 1,
  '별도 경로로 찍은 연결 능력치는 여전히 서약 효과를 제공합니다.');
vm.runInContext('game.passives = [];', context);

const noEffectPassive = { id: 'no_effect_test', kind: 'path', sourceType: 'minor', intentionalNoEffect: true,
  title: null, desc: null, stat: null, val: 0, effects: [] };
context.noEffectPassive = noEffectPassive;
assert.strictEqual(vm.runInContext('getPassiveNodeDisplayName(noEffectPassive)', context), '무효');
assert.strictEqual(vm.runInContext('getPassiveEffectLabel(noEffectPassive)', context), '효과 없음');
vm.runInContext(`
  PASSIVE_TREE.nodes.no_effect_test = noEffectPassive;
  game.passives = ['no_effect_test'];
  game.starWedge.nodeMutations.no_effect_test = { currentStat:'devotion', currentVal:99 };
`, context);
assert.strictEqual(context.isStarWedgeNodeMutable(noEffectPassive), false,
  '의도적인 무효 패시브는 별쐐기로 변성되면 안 된다');
assert.strictEqual(context.getAllocatedPassiveStatValue('devotion'), 0,
  '이전 저장 데이터에 변성값이 남아도 무효 패시브는 능력치를 주면 안 된다');
vm.runInContext("game.passives = []; delete game.starWedge.nodeMutations.no_effect_test;", context);

vm.runInContext(`
  PASSIVE_TREE.nodes.special_reserve_test = {
    id:'special_reserve_test', kind:'path', effects:[{ stat:'mystique', val:1 }]
  };
  PASSIVE_TREE.nodes.special_tradeoff_test = {
    id:'special_tradeoff_test', kind:'major', effects:[
      { stat:'mystique', val:-1 }, { stat:'spellPctDmg', val:10 }, { stat:'gemLevel', val:1 }
    ],
    activationRequirement:{ type:'special-stat-reserve', statId:'mystique', minimum:1 }
  };
  game.passives = ['special_tradeoff_test'];
`, context);
assert.strictEqual(context.getPassiveNodeActivationState(context.PASSIVE_TREE.nodes.special_tradeoff_test).active, false,
  '특수 스탯 지불 여력이 없으면 교환 노드가 비활성화되어야 한다');
assert.deepStrictEqual(JSON.parse(JSON.stringify(context.getEffectivePassiveNodeEffects(
  context.PASSIVE_TREE.nodes.special_tradeoff_test, null))), [], '비활성 노드는 강력 효과도 주면 안 된다');
const inactiveTradeoffLabel = context.getPassiveEffectLabel(context.PASSIVE_TREE.nodes.special_tradeoff_test);
assert.ok(inactiveTradeoffLabel.includes('신비 -1') && inactiveTradeoffLabel.includes('비활성'),
  '교환 노드 툴팁은 음수 비용과 현재 비활성 상태를 명확히 표시해야 한다');
assert.ok(!inactiveTradeoffLabel.includes('+-1'), '음수 패시브 수치를 +− 형태로 표시하면 안 된다');
vm.runInContext("game.passives = ['special_reserve_test', 'special_tradeoff_test'];", context);
assert.strictEqual(context.getPassiveNodeActivationState(context.PASSIVE_TREE.nodes.special_tradeoff_test).active, true,
  '다른 노드의 신비 1을 지불할 수 있으면 교환 노드가 활성화되어야 한다');
assert.strictEqual(context.getAllocatedPassiveStatValue('mystique'), 0,
  '교환 노드가 활성화되면 보유 신비 1을 정확히 상쇄해야 한다');
assert.ok(context.getEffectivePassiveNodeEffects(context.PASSIVE_TREE.nodes.special_tradeoff_test, null)
  .some(effect => effect.stat === 'gemLevel' && effect.val === 1), '활성화된 교환 노드는 희소 보상을 제공해야 한다');
assert.strictEqual(context.isStarWedgeNodeMutable(context.PASSIVE_TREE.nodes.special_tradeoff_test), false,
  '별쐐기 변성으로 특수 스탯 지불 조건을 우회할 수 없어야 한다');
vm.runInContext("game.passives = [];", context);

const affinity = context.getMystiqueAffinity(10, { phys: 20, fire: 60, cold: 5, light: 10, chaos: 0 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(affinity)), {
  element: 'fire', ailment: 'ignite', damagePct: 10, potencyPct: 10, chancePct: 3,
}, 'mystique should strengthen the ailment matching the highest player damage type');

assert.strictEqual(context.recordPassiveCycleAilmentEnd('shock', 12, 1000), true);
const cycleEffects = JSON.parse(JSON.stringify(context.getActivePassiveCycleBuffEffects(2000)));
assert.ok(cycleEffects.some(row => row.stat === 'lightPctDmg' && row.val === 24));
assert.ok(cycleEffects.some(row => row.stat === 'aspd' && row.val === 6));
assert.deepStrictEqual(JSON.parse(JSON.stringify(context.getActivePassiveCycleBuffEffects(7001))), [],
  'cycle buffs should expire after six seconds');

vm.runInContext(`
  PASSIVE_TREE.nodes.devotion_test = { id:'devotion_test', kind:'path', title:'헌신 시험', effects:[{ stat:'devotion', val:1 }] };
  PASSIVE_TREE.nodes.karma_test = { id:'karma_test', kind:'keystone', title:'카르마', effects:[] };
  PASSIVE_TREE.nodes.ashura_test = { id:'ashura_test', kind:'keystone', title:'아슈라', effects:[] };
  PASSIVE_TREE.nodes.cycle_stone_test = { id:'cycle_stone_test', kind:'keystone', title:'순환의 원석', effects:[] };
  game.passives = [];
`, context);
assert.strictEqual(context.setPassiveRevelation('guard'), false, '헌신이 없으면 계시를 선택할 수 없어야 한다');
assert.strictEqual(vm.runInContext('ensurePassiveSpecializationState().revelation', context), 'combat',
  '실패한 계시 선택은 기존 계시를 변경하면 안 된다');
vm.runInContext("game.passives = ['devotion_test', 'karma_test', 'ashura_test', 'cycle_stone_test'];", context);
assert.strictEqual(context.getAllocatedPassiveStatValue('devotion'), 1, '할당된 헌신을 계시 잠금 조건에 사용해야 한다');
assert.strictEqual(context.setPassiveRevelation('guard'), true, '헌신이 1이면 계시를 선택할 수 있어야 한다');

const authoredRules = JSON.parse(vm.runInContext(`
(() => {
  const buckets = Object.fromEntries(['gearBase','gearExplicit','passive','support','season','ascend','reward','starBlessing']
    .map(key => [key, createEmptyStatBucket()]));
  buckets.passive.strength = 60;
  buckets.passive.cycle = 1;
  buckets.passive.devotion = 25;
  setPassiveRevelation('guard');
  return JSON.stringify(applyAuthoredPassiveStatRules({ buckets, skillElement:'phys', now:1000 }));
})()
`, context));
assert.strictEqual(authoredRules.cycle, 3, 'cycle stone should grant one cycle per 30 strength');
assert.strictEqual(authoredRules.cycleAddedFireFromPhysicalPct, 9,
  'cycle stone should add 3% fire damage from physical damage per cycle');
assert.strictEqual(authoredRules.guardTakenLessPct, 5, 'guard revelation should grant 1% less damage per five devotion');

const normalEnemy = { id: 1, hp: 100 };
const bossEnemy = { id: 2, hp: 100, isBoss: true };
assert.strictEqual(context.recordPassiveKarmaLoss(normalEnemy, 50), 0, 'normal enemies must not collect karma');
assert.strictEqual(context.recordPassiveKarmaLoss(bossEnemy, 27), 27, 'actual resource loss should be bound to its boss');

for (let action = 0; action < 5; action++) {
  const karmaAttack = context.beginPassiveKarmaAttack(bossEnemy, 2000 + action * 100);
  assert.strictEqual(karmaAttack.multiplier, 1.05, '27 karma should grant 5% more target-bound damage');
}
assert.strictEqual(context.beginPassiveKarmaAttack(bossEnemy, 2600).multiplier, 1,
  'the karma bonus must end after five damaging actions');

context.recordPassiveKarmaLoss(bossEnemy, 50);
assert.strictEqual(context.beginPassiveKarmaAttack(bossEnemy, 5000).multiplier, 1.1);
assert.strictEqual(context.beginPassiveKarmaAttack(bossEnemy, 9001).multiplier, 1,
  'the karma bonus must also end after four seconds');
context.recordPassiveKarmaLoss(bossEnemy, 999999);
assert.strictEqual(context.beginPassiveKarmaAttack(bossEnemy, 10000).multiplier, 2,
  '대상별 카르마는 500에서 멈춰 무한 피해 증폭을 만들면 안 된다');

assert.ok(Math.abs(context.getPassiveAshuraAilmentChance(0.1, 20) - 0.3) < 1e-9,
  'ashura should add one percentage point of matching ailment chance per cycle');
assert.strictEqual(context.getPassiveAshuraDamageMultiplier('fire', [], 20), 1,
  'the hit which creates the matching ailment must not receive ashura reduction');
assert.strictEqual(context.getPassiveAshuraDamageMultiplier('fire', [{ type: 'ignite', time: 5 }], 20), 0.9);
assert.strictEqual(context.getPassiveAshuraDamageMultiplier('cold', [{ type: 'ignite', time: 5 }], 20), 1);
const reduced = JSON.parse(JSON.stringify(context.applyPassiveAshuraDamageBreakdown([
  { ele: 'fire', amount: 100 }, { ele: 'cold', amount: 100 },
], [{ type: 'ignite', time: 5 }], 20)));
assert.deepStrictEqual(reduced, [{ ele: 'fire', amount: 90 }, { ele: 'cold', amount: 100 }],
  'ashura must reduce only the damage type matching an already-active ailment');

const awakening = JSON.parse(vm.runInContext(`JSON.stringify((() => {
  const hubs = Object.values(PASSIVE_TREE.nodes).filter(node => node.kind === 'hub' && node.starWedgeMode === 'constellation');
  game.passives = [];
  game.expertise.levels.astronomer = 15;
  game.starWedge = {
    unlocked: true,
    wedges: hubs.map((hub, index) => ({ id: 1000 + index, lines: [{ stat:'flatHp', val:10 }] })),
    sockets: hubs.map((hub, index) => ({ nodeId:hub.id, wedgeId:1000 + index }))
  };
  assignStarWedgeSockets();
  recalculateStarWedgeMutations(true);
  const options = hubs.map(hub => Object.values(PASSIVE_TREE.nodes)
    .find(node => node.kind === 'star_option' && node.requiresStarWedgeSocketNodeId === hub.id && node.starWedgeLineIndex === 0));
  game.passives = options.map(node => node.id);
  const before = getPassiveConstellationAwakeningProgress();
  const unlocked = unlockPassiveStarEvolution({ silent:true });
  return { before, unlocked, evolution:game.passiveStarEvolution, source:game.passiveStarEvolutionSource,
    journal:game.journalEntries.includes('passive_star_evolution') };
})())`, context));
assert.deepStrictEqual(awakening.before, { mode:'outer_constellation', required:6, completed:6, socketed:6 },
  '여섯 외곽 성률에서 생성 패시브를 하나씩 투자하면 성좌 각성이 준비되어야 한다');
assert.strictEqual(awakening.unlocked, true, '새 트리에서도 성좌 각성이 해금되어야 한다');
assert.strictEqual(awakening.evolution, true);
assert.strictEqual(awakening.source, 'outer_constellation');
assert.strictEqual(awakening.journal, true, '성좌 각성 영구 보너스 기록을 함께 해금해야 한다');

console.log('smoke-passive-tree-special-mechanics passed');
