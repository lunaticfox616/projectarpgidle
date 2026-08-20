const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();

const tagResult = vm.runInContext(`(() => {
  let generic = Object.entries(PASSIVE_TREE.nodes).find(([, node]) => node.stat === 'gemLevel');
  let chaos = Object.entries(PASSIVE_TREE.nodes).find(([, node]) => node.stat === 'chaosGemLevel');
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
  let genericValue = Number(generic[1].val || 0);
  let chaosValue = Number(chaos[1].val || 0);
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
assert(Math.abs(equipmentResult.fireGemGear - 23.5) < 1e-9,
  'the Star must no longer turn integer gem levels into fractional gem levels');
assert.strictEqual(equipmentResult.arcanaDamage.gemLevels, 23.5,
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

console.log('smoke-summon-tag-gem-level passed');
