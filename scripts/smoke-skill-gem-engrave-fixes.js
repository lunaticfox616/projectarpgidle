#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const skillsSource = fs.readFileSync('js/skills.js', 'utf8');
const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

function extract(source, name) {
  const re = new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n\\}', 'm');
  const m = source.match(re);
  assert(m, 'missing function ' + name);
  return m[0];
}

// --- Fix #1: gem-level engraving ('각성: 심층 초월' = 젬 레벨 +3) applies to both active and summon gems. ---
const context = {
  Math, Date, Array, Object, Number, JSON, console,
  GEM_SKY_ENHANCEMENTS: {
    sky_awakened_resonance: { id: 'sky_awakened_resonance', stat: 'awakenedGemLevel', gemLvVal: 3 },
    sky_fury: { id: 'sky_fury', stat: 'pctDmg', val: 8 }
  },
  game: {
    gemData: { '서리늑대 소환': { level: 10, exp: 0 } },
    supportGemData: {},
    skyGemEnhancements: {},
    equipment: {}, jewelSlots: [], jewelSlotAmplify: [],
    currencies: { skyEssence: 5 }
  },
  getGemBonusSources: () => ({ gear: 0, passive: 0, reward: 0, total: 0 }),
  getGemLevelTargetTags: () => ['summon_attack'],
  getJewelStats: () => [],
  getEquippedUniqueJewels: () => [],
  hasKeystone: () => false,
  getMaxJewelSlotCount: () => 2,
  getGemEnhanceTargetSkill: () => '서리늑대 소환',
  updateStaticUI: () => {},
  addLog: () => {}
};
context.window = context;
vm.createContext(context);

const helperBonus = extract(skillsSource, 'getGemSkyEnhanceGemLevelBonus');
const getSkyEnhancementForSkill = extract(skillsSource, 'getSkyEnhancementForSkill');
const getSummonGemLevel = extract(combatSource, 'getSummonGemLevel');
const getTargetGemBonusSources = extract(combatSource, 'getTargetGemBonusSources');
const getEquippedJewelGemLevelBonusSources = extract(combatSource, 'getEquippedJewelGemLevelBonusSources');
const hasEmptyThroneSoloBonus = extract(combatSource, 'hasEmptyThroneSoloBonus');

vm.runInContext([
  getSkyEnhancementForSkill, helperBonus, getEquippedJewelGemLevelBonusSources,
  hasEmptyThroneSoloBonus, getTargetGemBonusSources, getSummonGemLevel,
  'this.getGemSkyEnhanceGemLevelBonus = getGemSkyEnhanceGemLevelBonus;',
  'this.getSummonGemLevel = getSummonGemLevel;'
].join('\n'), context);

assert.strictEqual(context.getGemSkyEnhanceGemLevelBonus('서리늑대 소환'), 0, 'no engraving means no bonus');
const pStats = { gemBonusSources: { total: 0 } };
assert.strictEqual(context.getSummonGemLevel('서리늑대 소환', 'skill', pStats), 10, 'summon gem level without engraving stays at base');

context.game.skyGemEnhancements = { '서리늑대 소환': ['sky_awakened_resonance'] };
assert.strictEqual(context.getGemSkyEnhanceGemLevelBonus('서리늑대 소환'), 3, 'gem-level engraving must report +3');
assert.strictEqual(context.getSummonGemLevel('서리늑대 소환', 'skill', pStats), 13, 'summon gem level must include the +3 engraving');

// active skill path must use the shared helper too
assert(skillsSource.includes('let awakenedGemLevelBonus = skill.isGem ? getGemSkyEnhanceGemLevelBonus(game.activeSkill) : 0;'),
  'active skill stats must apply the shared engraving gem-level helper');
assert(combatSource.includes('getGemSkyEnhanceGemLevelBonus(gemName)'),
  'summon gem level must apply the shared engraving gem-level helper');

// --- Fix #3: engraving removal is re-enabled, paid with 창공의 힘 (free at gem engraver Lv.7). ---
const removeFn = extract(skillsSource, 'removeSkyGemEnhancementFromActive');
const removeCostFn = extract(skillsSource, 'getSkyGemEnhancementRemoveCost');
assert(!removeFn.includes("젬 각인사 Lv.7에 해금됩니다"), 'removal must no longer be hard-gated behind Lv.7');
assert(removeFn.includes('skyEssence'), 'removal must consume 창공의 힘 when not free');

const rmCtx = {
  Math, Object, Array, Number,
  GEM_SKY_ENHANCEMENTS: context.GEM_SKY_ENHANCEMENTS,
  game: { skyGemEnhancements: { '서리늑대 소환': ['sky_fury'] }, currencies: { skyEssence: 5 } },
  getGemEnhanceTargetSkill: () => '서리늑대 소환',
  updateStaticUI: () => {},
  addLog: () => {}
};
let expertLevel = 1;
rmCtx.getGemEngraverLevelForUnlocks = () => expertLevel;
vm.createContext(rmCtx);
vm.runInContext([removeCostFn, removeFn,
  'this.removeSkyGemEnhancementFromActive = removeSkyGemEnhancementFromActive;',
  'this.getSkyGemEnhancementRemoveCost = getSkyGemEnhancementRemoveCost;'].join('\n'), rmCtx);

assert.strictEqual(rmCtx.getSkyGemEnhancementRemoveCost(), 2, 'paid removal cost before Lv.7 must be 2');
rmCtx.removeSkyGemEnhancementFromActive('sky_fury');
assert.deepStrictEqual(rmCtx.game.skyGemEnhancements['서리늑대 소환'], [], 'paid removal must remove the engraving');
assert.strictEqual(rmCtx.game.currencies.skyEssence, 3, 'paid removal must consume 2 창공의 힘');

expertLevel = 7;
rmCtx.game.skyGemEnhancements['서리늑대 소환'] = ['sky_fury'];
assert.strictEqual(rmCtx.getSkyGemEnhancementRemoveCost(), 0, 'Lv.7 removal must be free');
rmCtx.removeSkyGemEnhancementFromActive('sky_fury');
assert.strictEqual(rmCtx.game.currencies.skyEssence, 3, 'free removal must not consume 창공의 힘');

// UI must allow clicking applied engravings to remove them (no longer disabled when applied).
assert(uiSource.includes('${!isGem || (locked && !applied) ? \'disabled\' : \'\'}'),
  'applied engraving buttons must remain clickable for removal');

// --- Fix #2: the skill gem enhance tab stays unlocked across loop resets. ---
assert(combatSource.includes('let preservedGemEnhanceUnlocked = !!game.gemEnhanceUnlocked;'),
  'loop reset must capture the gem enhance unlock state');
assert(combatSource.includes('game.gemEnhanceUnlocked = preservedGemEnhanceUnlocked;'),
  'loop reset must restore the gem enhance unlock state instead of forcing it false');
assert(!combatSource.includes('game.gemEnhanceUnlocked = false;'),
  'loop reset must not hard-reset the gem enhance unlock flag');

console.log('skill gem engrave fixes smoke checks passed');
