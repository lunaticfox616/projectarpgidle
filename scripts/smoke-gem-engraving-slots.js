const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const logs = [];
const context = {
  console,
  window: null,
  globalThis: null,
  game: {
    season: 4,
    activeSkill: '테스트 젬',
    skills: ['테스트 젬'],
    equippedSummonSkills: [],
    gemEnhanceTargetSkill: '테스트 젬',
    gemEngraveSelectedSlot: 0,
    gemData: {
      '테스트 젬': { level: 1, exp: 0, skyEnhanceCap: 1 }
    },
    skyGemEnhancements: {
      '테스트 젬': ['sky_a']
    },
    currencies: { skyEssence: 10 }
  },
  SKILL_DB: {
    '테스트 젬': { isGem: true, tags: ['melee'] }
  },
  SUPPORT_GEM_DB: {},
  GEM_SKY_ENHANCEMENTS: {
    sky_a: { id: 'sky_a', name: '각인 A', desc: '테스트 A' },
    sky_b: { id: 'sky_b', name: '각인 B', desc: '테스트 B' }
  },
  normalizeGemRecord(raw) {
    return {
      ...(raw || {}),
      level: Math.max(1, Math.floor(Number(raw && raw.level) || 1)),
      exp: Math.max(0, Math.floor(Number(raw && raw.exp) || 0)),
      skyEnhanceCap: Math.max(1, Math.min(5, Math.floor(Number(raw && raw.skyEnhanceCap) || 1)))
    };
  },
  getExpertLevel() { return 7; },
  addLog(message) { logs.push(message); },
  updateStaticUI() {},
  grantExpertExpByAction() {},
  safeExposeGlobals(map) { Object.assign(context, map); }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/skills.js', 'utf8'), context, { filename: 'js/skills.js' });

let slots = context.getSkyEnhancementSlotsForSkill('테스트 젬');
assert.deepStrictEqual(Array.from(slots), ['sky_a', null, null, null, null], 'legacy compact engravings should occupy slots from the front');
assert.deepStrictEqual(Array.from(context.getSkyEnhancementForSkill('테스트 젬')), ['sky_a'], 'combat calculations should ignore empty slots');

assert.strictEqual(context.selectGemEngraveSlot(1), true, 'clicking the next locked slot should unlock and select it');
assert.strictEqual(context.game.gemData['테스트 젬'].skyEnhanceCap, 2);
assert.strictEqual(context.game.gemEngraveSelectedSlot, 1);
assert.strictEqual(context.game.currencies.skyEssence, 8, 'second slot unlock should cost two sky essence');

context.applySkyGemEnhancementToActive('sky_b');
slots = context.getSkyEnhancementSlotsForSkill('테스트 젬');
assert.deepStrictEqual(Array.from(slots), ['sky_a', 'sky_b', null, null, null], 'engraving should be written to the selected slot');
assert.strictEqual(context.game.currencies.skyEssence, 7);

context.removeSkyGemEnhancementFromActive('sky_a', 0);
slots = context.getSkyEnhancementSlotsForSkill('테스트 젬');
assert.deepStrictEqual(Array.from(slots), [null, 'sky_b', null, null, null], 'removing one engraving must not shift later slots');
assert.deepStrictEqual(Array.from(context.getSkyEnhancementForSkill('테스트 젬')), ['sky_b']);

assert.strictEqual(context.toggleSkyGemEnhancement('sky_a'), true, 'the full engraving list should apply into the first empty unlocked slot');
slots = context.getSkyEnhancementSlotsForSkill('테스트 젬');
assert.deepStrictEqual(Array.from(slots), ['sky_a', 'sky_b', null, null, null]);
assert.strictEqual(context.toggleSkyGemEnhancement('sky_a'), true, 'clicking an applied engraving again should remove it');
slots = context.getSkyEnhancementSlotsForSkill('테스트 젬');
assert.deepStrictEqual(Array.from(slots), [null, 'sky_b', null, null, null]);

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
assert.ok(uiSource.includes('openGemEngraveSlotOverlay'), 'engraving slots should open a dedicated choice overlay');
assert.ok(uiSource.includes('onpointerdown="event.stopPropagation()"'), 'slot controls should isolate pointer input from surrounding drag handlers');

console.log('smoke-gem-engraving-slots passed');
