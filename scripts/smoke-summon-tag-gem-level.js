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
  game.growthInventory = [];
  game.growthBoard = { width:GROWTH_BOARD_W, height:GROWTH_BOARD_H, unlockedCellCount:0, activeLoadout:0, loadouts:[] };
  game.arcana = createDefaultArcanaState();
  game.passives = [generic[0], chaos[0]];
  game.starWedge = {};
  game.actRewardBonuses = [];
  game.journalBonuses = [];
  game.talismanPlacements = {};
  game.jewelSlots = [];
  game.ascendClass = null;
  game.ascendNodes = [];
  game.gemData = {
    '공허 유충 소환': { level:5 },
    '불곰 소환': { level:5 },
    '칼날까마귀 소환': { level:4, bossCoreLevel:2, skyCoreLevel:1, awakened:true }
  };
  let genericValue = Number(generic[1].effects.find(effect => effect.stat === 'gemLevel').val || 0);
  let chaosValue = Number(chaos[1].effects.find(effect => effect.stat === 'chaosGemLevel').val || 0);
  return {
    genericValue,
    chaosValue,
    voidBonus:getGemBonusSources('공허 유충 소환').total,
    fireBonus:getGemBonusSources('불곰 소환').total,
    voidLevel:getSummonGemLevel('공허 유충 소환', 'skill'),
    materialLevel:getSummonGemLevel('칼날까마귀 소환', 'skill')
  };
})()`, runtime);

assert.strictEqual(tagResult.voidBonus, tagResult.genericValue + tagResult.chaosValue,
  'chaos summon gems must receive both generic and chaos passive gem levels');
assert.strictEqual(tagResult.fireBonus, tagResult.genericValue,
  'non-chaos summon gems must not receive chaos-only passive gem levels');
assert.strictEqual(tagResult.voidLevel, 5 + tagResult.genericValue + tagResult.chaosValue,
  'summon combat level must use the same tag-matched passive bonus');
assert.strictEqual(tagResult.materialLevel, 4 + tagResult.genericValue + 2 + 1 + 2,
  'boss core, sky core, and awakening investments must affect the actual summon combat level');

const masterSummonerResult = vm.runInContext(`(() => {
  game.currentZoneId = 0;
  game.equipment = {};
  game.passives = [];
  game.actRewardBonuses = [];
  game.journalBonuses = [];
  game.talismanPlacements = {};
  game.jewelSlots = [];
  game.gemData['벼락멧돼지 소환'] = { level:5, quality:0 };
  game.gemData['화염 참격'] = { level:5, quality:0 };
  game.skills = Array.from(new Set([...(game.skills || []), '벼락멧돼지 소환']));
  game.equippedSummonSkills = ['벼락멧돼지 소환'];
  game.talentCards = { hero7__soulbinder:{ level:10, score:600, count:1 } };
  game.talentCardLoadout = ['hero7__soulbinder', null, null, null, null, null];
  let stats = getPlayerStats();
  let presentation = getGemPresentation('벼락멧돼지 소환', false, stats);
  let directPresentation = getGemPresentation('화염 참격', false, stats);
  let preview = getSummonTooltipPreview('벼락멧돼지 소환', stats);
  ensureSummonRuntime(stats);
  let runtimeSummon = (game.summons || []).find(row => row && row.gemName === '벼락멧돼지 소환');
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
  game.arcana = createDefaultArcanaState();
  game.arcana.cards.push({ uid:1, cardId:'star', obtainedLoop:1 });
  game.arcana.equipmentSlots['무기'] = 1;
  game.equipment = { '무기':{
    slot:'무기', quality:20,
    baseStats:[{ id:'gemLevel', val:10 }],
    stats:[{ id:'elementalGemLevel', val:5 }, { id:'fossilRiftAmp', val:50 }, { id:'flatHp', val:100, extraStats:[{ id:'fireGemLevel', val:1 }] }],
    underEnchant:{ id:'fireGemLevel', val:1 },
    chaosInfusion:{ id:'summonGemLevel', val:2 }
  }};
  let raw = getResolvedEquipmentStatLists('무기', game.equipment['무기'], game, false);
  let rawTotal = [...raw.baseStats, ...raw.explicitStats]
    .filter(stat => ['gemLevel', 'elementalGemLevel', 'fireGemLevel', 'summonGemLevel'].includes(stat.id))
    .reduce((sum, stat) => sum + stat.val, 0);
  let fireGemGear = getGemBonusSources('불곰 소환').gear;
  let arcanaDamage = getArcanaGemDamageBonus('불곰 소환');
  game.activeSkill = '화염 참격';
  game.gemData['화염 참격'] = { level:5, quality:0 };
  let activeSkillWithStar = getActiveSkillStats(getGemBonusSources('화염 참격').total);
  let playerDpsWithStar = getPlayerStats().dps;
  let summon = { gemName:'불곰 소환', ele:'fire', baseDamage:100, crit:0, critDmg:140, dmgRollMinPct:100 };
  let summonStats = { summonPctDmg:0, summonEfficiency:0, summonCrit:0, summonCritDmg:0,
    summonSharedPctDmg:0, summonSharedTaggedPctDmg:{}, resPen:0, physIgnore:0,
    finalDamageMultiplier:1, bossDamageDealtMultiplier:1, uniqueSummonNonCritNoDamage:false };
  let summonWithStar = getSummonHitDamageInfo(summon, summonStats, null, { rollOverridePct:100, forceCrit:false }).damage;
  game.arcana.equipmentSlots['무기'] = null;
  let activeSkillWithoutStar = getActiveSkillStats(getGemBonusSources('화염 참격').total);
  let playerDpsWithoutStar = getPlayerStats().dps;
  let summonWithoutStar = getSummonHitDamageInfo(summon, summonStats, null, { rollOverridePct:100, forceCrit:false }).damage;
  return { rawTotal, fireGemGear, arcanaDamage,
    activeArcanaPct:activeSkillWithStar.arcanaGemDamagePct, inactiveArcanaPct:activeSkillWithoutStar.arcanaGemDamagePct,
    playerDpsWithStar, playerDpsWithoutStar, summonWithStar, summonWithoutStar };
})()`, runtime);

assert.strictEqual(equipmentResult.rawTotal, 22.5,
  'the shared equipment resolver must apply quality and Rift amplification before Arcana');
assert(Math.abs(equipmentResult.fireGemGear - 24) < 1e-9,
  'compound gem levels receive Rift amplification, but the Star must not amplify them again');
assert.strictEqual(equipmentResult.arcanaDamage.gemLevels, 24,
  'the Star must count the same resolved and compound gem-level lines used by combat');
assert.strictEqual(equipmentResult.arcanaDamage.pct, 15,
  'the Star damage bonus must respect its global 15% cap');
assert.strictEqual(equipmentResult.activeArcanaPct, 15,
  'the active gem must expose the Star bonus to the additive damage pipeline');
assert.strictEqual(equipmentResult.inactiveArcanaPct, 0,
  'removing the Star must remove its active gem damage contribution');
assert(equipmentResult.playerDpsWithStar > equipmentResult.playerDpsWithoutStar,
  'the additive Star contribution must increase the actual player DPS result');
assert(equipmentResult.summonWithStar > equipmentResult.summonWithoutStar,
  'the Star must increase actual summon gem hit damage without changing summon gem levels');

const growthResult = vm.runInContext(`(() => {
  game.season = 25; game.contentProgression.inherited.push('growth');
  game.equipment = {};
  game.arcana = createDefaultArcanaState();
  game.growthInventory = [{ id:9001, name:'젬 새싹', growthCategory:'flower', growthShapeId:'dot1', baseStats:[], stats:[{ id:'gemLevel', val:3 }] }];
  game.growthBoard = { width:GROWTH_BOARD_W, height:GROWTH_BOARD_H, unlockedCellCount:1, activeLoadout:0,
    loadouts:[{ name:'세팅 1', placements:{ 9001:{ x:0, y:0, rotation:0 } } }] };
  let placed = getPlacedGrowthEntries();
  let bonus = getGemBonusSources('불곰 소환');
  return { placed:placed.length, gear:bonus.gear };
})()`, runtime);

assert.strictEqual(growthResult.placed, 1, 'the real growth board must expose the placed item');
assert.strictEqual(growthResult.gear, 3, 'a placed growth item gem-level affix must affect the actual gem level');

const evaluationResult = vm.runInContext(`(() => {
  const nodes = Object.entries(PASSIVE_TREE.nodes).filter(([, node]) =>
    (node.effects || []).some(effect => effect.stat === 'gemLevel' || effect.stat === 'chaosGemLevel'));
  game.passives = nodes.map(([id]) => id);
  game.starWedge = { disabledNodeEffects: { [nodes[0][0]]: true }, nodeMutations: {} };
  const lists = [{ baseStats: [{id:'flatHp', val:9, extraStats:[{id:'gemLevel', val:0.1},
    {id:'chaosGemLevel',val:0.2,extraStats:[{id:'gemLevel',val:0.3}]}]}],
    explicitStats: [{id:'gemLevel',val:-0.2}, {id:'gemLevel',val:Infinity}] },
    {baseStats: [{id:'gemLevel',val:0.7}], explicitStats: GEM_LEVEL_TAG_RULES.map(rule => ({id:rule.stat,val:0.1}))}];
  const input = JSON.stringify(lists);
  const evaluation = createGemBonusEvaluation(lists);
  const targets = ['불곰 소환','공허 유충 소환','서리늑대 소환','연속 베기', ...Object.keys(SUPPORT_GEM_DB).slice(0,12)];
  const pairs = targets.map(name => [getTargetGemBonusSources(name, undefined, lists),
    getTargetGemBonusSources(name, undefined, lists, evaluation)]);
  const gearPairs = targets.map(name => [getGemBonusSources(name, lists, evaluation).gear,
    lists.reduce((total, row) => total + getGemLevelValueFromStatLines([...row.baseStats, ...row.explicitStats], getGemLevelTargetTags(name)), 0)]);
  const first = getTargetGemBonusSources(targets[0], undefined, lists, evaluation);
  const original = first.total;
  first.total = -999;
  const isolated = getTargetGemBonusSources(targets[0], undefined, lists, evaluation).total === original;
  game.starWedge.disabledNodeEffects = {};
  game.actRewardBonuses.push({stat:'gemLevel',value:2});
  const fresh = createGemBonusEvaluation(lists);
  const changed = getTargetGemBonusSources(targets[0], undefined, lists, fresh);
  const direct = getTargetGemBonusSources(targets[0], undefined, lists);
  return { pairs, gearPairs, isolated, unchanged: input === JSON.stringify(lists),
    changed, direct, original, empty: createGemBonusEvaluation([]).gearLines.length };
})()`, runtime);
evaluationResult.pairs.forEach(([direct, shared]) => assert.deepStrictEqual(shared, direct,
  'shared inputs preserve recursive extra stats, fractional order, tags and disabled passives'));
evaluationResult.gearPairs.forEach(([filtered, recursive]) => assert.strictEqual(filtered, recursive,
  'filtered gear must equal the original recursive evaluator, including item grouping and non-finite values'));
assert.deepStrictEqual(evaluationResult.changed, evaluationResult.direct);
assert(evaluationResult.changed.total > evaluationResult.original, 'the next evaluation observes passive and reward changes');
assert(evaluationResult.isolated, 'target-specific additions cannot mutate the shared gem result');
assert(evaluationResult.unchanged, 'filtering gem lines cannot modify equipment inputs');
assert.strictEqual(evaluationResult.empty, 0);
console.log('smoke-summon-tag-gem-level passed');
