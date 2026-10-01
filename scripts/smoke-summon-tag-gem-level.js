const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();

const tagResult = vm.runInContext(`(() => {
  let generic = Object.entries(PASSIVE_TREE.nodes).find(([, node]) => !node.activationRequirement
    && (node.effects || []).some(effect => effect.stat === 'gemLevel'));
  let chaos = Object.entries(PASSIVE_TREE.nodes).find(([, node]) => (node.effects || []).some(effect => effect.stat === 'chaosGemLevel'));
  if (!generic || !chaos) throw new Error('required passive gem-level nodes are missing');
  game.equipment = {};
  game.passives = [generic[0], chaos[0]];
  game.actRewardBonuses = [];
  game.journalBonuses = [];
  game.stumpBox = stumpBox.empty();
  game.jewelSlots = [];
  game.ascendClass = null;
  game.ascendNodes = [];
  game.gemData = {
    '카오스 위습 소환': { level:5 },
    '화염 위습 소환': { level:5 },
    '물리 위습 소환': { level:4, bossCoreLevel:2, skyCoreLevel:1, awakened:true }
  };
  let genericValue = Number(generic[1].effects.find(effect => effect.stat === 'gemLevel').val || 0);
  let chaosValue = Number(chaos[1].effects.find(effect => effect.stat === 'chaosGemLevel').val || 0);
  return {
    genericValue,
    chaosValue,
    voidBonus:getGemBonusSources('카오스 위습 소환').total,
    fireBonus:getGemBonusSources('화염 위습 소환').total,
    voidLevel:getSummonGemLevel('카오스 위습 소환', 'skill'),
    materialLevel:getSummonGemLevel('물리 위습 소환', 'skill')
  };
})()`, runtime);

assert.strictEqual(tagResult.voidBonus, tagResult.genericValue + tagResult.chaosValue,
  'chaos summon gems must receive both generic and chaos passive gem levels');
assert.strictEqual(tagResult.fireBonus, tagResult.genericValue,
  'non-chaos summon gems must not receive chaos-only passive gem levels');
assert.strictEqual(tagResult.voidLevel, 5 + tagResult.genericValue + tagResult.chaosValue,
  'summon combat level must use the same tag-matched passive bonus');
assert.strictEqual(tagResult.materialLevel, 4 + tagResult.genericValue + 2,
  'partial core enhancements grant effects, while awakening still grants two summon levels');

const masterSummonerResult = vm.runInContext(`(() => {
  game.currentZoneId = 0;
  game.equipment = {};
  game.passives = [];
  game.actRewardBonuses = [];
  game.journalBonuses = [];
  game.stumpBox = stumpBox.empty();
  game.jewelSlots = [];
  game.gemData['번개 위습 소환'] = { level:5, quality:0 };
  game.gemData['화염 참격'] = { level:5, quality:0 };
  game.skills = Array.from(new Set([...(game.skills || []), '번개 위습 소환']));
  game.equippedSummonSkills = ['번개 위습 소환'];
  game.talentCards = { hero7__soulbinder:{ level:10, score:600, count:1 } };
  game.talentCardLoadout = ['hero7__soulbinder', null, null, null, null, null];
  let stats = getPlayerStats();
  let presentation = getGemPresentation('번개 위습 소환', false, stats);
  let directPresentation = getGemPresentation('화염 참격', false, stats);
  let preview = getSummonTooltipPreview('번개 위습 소환', stats);
  ensureSummonRuntime(stats);
  let runtimeSummon = (game.summons || []).find(row => row && row.gemName === '번개 위습 소환');
  return {
    talentBonus:stats.talentSummonGemLevelBonus,
    presentationLevel:presentation.finalLevel,
    presentationTalentBonus:presentation.talentBonus,
    directPresentationLevel:directPresentation.finalLevel,
    directPresentationTalentBonus:directPresentation.talentBonus,
    previewLevel:preview.gemLevel,
    runtimeLevel:runtimeSummon && runtimeSummon.gemLevel
  };
})()`, runtime);

assert.strictEqual(masterSummonerResult.talentBonus, 2,
  'Master Summoner must expose its +2 summon attack gem level to player stats');
assert.strictEqual(masterSummonerResult.presentationTalentBonus, 2,
  'summon gem presentation must identify the Master Summoner contribution');
assert.strictEqual(masterSummonerResult.presentationLevel, 7,
  'summon gem presentation must include the Master Summoner +2 levels');
assert.strictEqual(masterSummonerResult.directPresentationTalentBonus, 0,
  'Master Summoner must not grant gem levels to direct attack gems');
assert.strictEqual(masterSummonerResult.directPresentationLevel, 5,
  'direct attack gem presentation must keep its original level under Master Summoner');
assert.strictEqual(masterSummonerResult.previewLevel, masterSummonerResult.runtimeLevel,
  'summon tooltip and live summon runtime must use the same effective level');

const equipmentResult = vm.runInContext(`(() => {
  game.passives = [];
  game.equipment = { '무기':{
    slot:'무기', quality:20,
    baseStats:[{ id:'gemLevel', val:10 }],
    stats:[{ id:'elementalGemLevel', val:5 }, { id:'fossilRiftAmp', val:50 }, { id:'flatHp', val:100, extraStats:[{ id:'fireGemLevel', val:1 }] }],
    underEnchant:{ id:'fireGemLevel', val:1 },
    chaosInfusion:{ id:'summonGemLevel', val:2 }
  }};
  let raw = getResolvedEquipmentStatLists('무기', game.equipment['무기'], game);
  let rawTotal = [...raw.baseStats, ...raw.explicitStats]
    .filter(stat => ['gemLevel', 'elementalGemLevel', 'fireGemLevel', 'summonGemLevel'].includes(stat.id))
    .reduce((sum, stat) => sum + stat.val, 0);
  return { rawTotal, fireGemGear: getGemBonusSources('화염 위습 소환').gear };
})()`, runtime);

assert.strictEqual(equipmentResult.rawTotal, 22.5,
  'the shared equipment resolver must apply quality and Rift amplification');
assert(Math.abs(equipmentResult.fireGemGear - 24) < 1e-9,
  'compound gem levels receive Rift amplification exactly once');

// 그루터기 함에서 깨어난 부적의 젬 레벨 줄(예전 생장판 자리)도 실제 젬 레벨에 들어간다.
const talismanResult = vm.runInContext(`(() => {
  game.season = 25; game.contentProgression.inherited.push('talisman'); contentProgression.sync(game);
  game.equipment = {};
  stumpBox.sync(game, 'test');
  game.stumpBox.board = game.stumpBox.board.map(() => null);
  const before = getGemBonusSources('화염 위습 소환').reward;
  const item = stumpBox.addTalisman(game, { name: '젬 부적', rarity: 'magic', lines: [{ kind: 'stat', id: 'gemLevel', value: 3 }] }, true);
  Object.assign(item, { xp: STUMP_BOX_GROWTH.need.talisman, ripe: true });
  stumpBox.place(game, item.id, 12);
  return { before, after: getGemBonusSources('화염 위습 소환').reward };
})()`, runtime);
assert.strictEqual(talismanResult.after - talismanResult.before, 3, 'an awake talisman gem-level line must affect the actual gem level');

const evaluationResult = vm.runInContext(`(() => {
  const nodes = Object.entries(PASSIVE_TREE.nodes).filter(([, node]) =>
    (node.effects || []).some(effect => effect.stat === 'gemLevel' || effect.stat === 'chaosGemLevel'));
  game.passives = nodes.slice(1).map(([id]) => id);
  const lists = [{ baseStats: [{id:'flatHp', val:9, extraStats:[{id:'gemLevel', val:0.1},
    {id:'chaosGemLevel',val:0.2,extraStats:[{id:'gemLevel',val:0.3}]}]}],
    explicitStats: [{id:'gemLevel',val:-0.2}, {id:'gemLevel',val:Infinity}] },
    {baseStats: [{id:'gemLevel',val:0.7}], explicitStats: GEM_LEVEL_TAG_RULES.map(rule => ({id:rule.stat,val:0.1}))}];
  const input = JSON.stringify(lists);
  const evaluation = createGemBonusEvaluation(lists);
  const targets = ['화염 위습 소환','카오스 위습 소환','냉기 위습 소환','연속 베기', ...Object.keys(SUPPORT_GEM_DB).slice(0,12)];
  const pairs = targets.map(name => [getTargetGemBonusSources(name, undefined, lists),
    getTargetGemBonusSources(name, undefined, lists, evaluation)]);
  const gearPairs = targets.map(name => [getGemBonusSources(name, lists, evaluation).gear,
    lists.reduce((total, row) => total + getGemLevelValueFromStatLines([...row.baseStats, ...row.explicitStats], getGemLevelTargetTags(name)), 0)]);
  const first = getTargetGemBonusSources(targets[0], undefined, lists, evaluation);
  const original = first.total;
  first.total = -999;
  const isolated = getTargetGemBonusSources(targets[0], undefined, lists, evaluation).total === original;
  game.passives = nodes.map(([id]) => id);
  game.actRewardBonuses.push({stat:'gemLevel',value:2});
  const fresh = createGemBonusEvaluation(lists);
  const changed = getTargetGemBonusSources(targets[0], undefined, lists, fresh);
  const direct = getTargetGemBonusSources(targets[0], undefined, lists);
  return { pairs, gearPairs, isolated, unchanged: input === JSON.stringify(lists),
    changed, direct, original, empty: createGemBonusEvaluation([]).gearLines.length };
})()`, runtime);
evaluationResult.pairs.forEach(([direct, shared]) => assert.deepStrictEqual(shared, direct,
  'shared inputs preserve recursive extra stats, fractional order, tags and allocated passives'));
evaluationResult.gearPairs.forEach(([filtered, recursive]) => assert.strictEqual(filtered, recursive,
  'filtered gear must equal the original recursive evaluator, including item grouping and non-finite values'));
assert.deepStrictEqual(evaluationResult.changed, evaluationResult.direct);
assert(evaluationResult.changed.total > evaluationResult.original, 'the next evaluation observes passive and reward changes');
assert(evaluationResult.isolated, 'target-specific additions cannot mutate the shared gem result');
assert(evaluationResult.unchanged, 'filtering gem lines cannot modify equipment inputs');
assert.strictEqual(evaluationResult.empty, 0);
console.log('smoke-summon-tag-gem-level passed');
