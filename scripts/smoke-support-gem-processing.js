const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const logs = [];
const context = {
  console,
  window: null,
  globalThis: null,
  game: {
    woodsmanBuildLock: false,
    supports: ['수액 골렘 소환', '일반 보조'],
    supportGemData: {
      '수액 골렘 소환': { level: 5, exp: 0, unlockedTier: 3, activeTier: 3 },
      '일반 보조': { level: 5, exp: 0, unlockedTier: 1, activeTier: 1 }
    },
    currencies: { skyEssence: 20 }
  },
  SUPPORT_GEM_DB: {
    '수액 골렘 소환': { noTiers: true },
    '일반 보조': {}
  },
  normalizeGemRecord(raw) {
    return {
      level: Math.max(1, Math.floor(Number(raw && raw.level) || 1)),
      exp: Math.max(0, Math.floor(Number(raw && raw.exp) || 0)),
      unlockedTier: Math.max(1, Math.floor(Number(raw && raw.unlockedTier) || 1)),
      activeTier: Math.max(1, Math.floor(Number(raw && raw.activeTier) || 1))
    };
  },
  getSupportTierCap(name) {
    return context.SUPPORT_GEM_DB[name] && context.SUPPORT_GEM_DB[name].noTiers ? 1 : 3;
  },
  getExpertCombinedCostReduction() { return 0; },
  getExpertLevel() { return 5; },
  addLog(message) { logs.push(message); },
  updateStaticUI() {},
  normalizeSupportLoadout() {},
  grantExpertExpByAction() {},
  safeExposeGlobals(map) { Object.assign(context, map); }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/skills.js', 'utf8'), context, { filename: 'js/skills.js' });

let tierless = context.getSupportGemSkyProcessState('수액 골렘 소환');
assert.strictEqual(tierless.tierCap, 1, 'tierless support gems must use their tier cap');
assert.strictEqual(tierless.improvingTier, false, 'tierless support gems must level instead of unlocking tiers');
assert.strictEqual(tierless.record.unlockedTier, 1, 'legacy tierless records must be clamped to tier 1');
assert.strictEqual(tierless.record.activeTier, 1, 'legacy tierless active tiers must be clamped to tier 1');
assert.strictEqual(tierless.nextTier, 1);

context.processSupportGemWithSkyEssence('수액 골렘 소환');
assert.strictEqual(context.game.supportGemData['수액 골렘 소환'].level, 6, 'tierless processing must increase gem level');
assert.strictEqual(context.game.supportGemData['수액 골렘 소환'].unlockedTier, 1);
assert.strictEqual(context.game.supportGemData['수액 골렘 소환'].activeTier, 1);
assert.strictEqual(context.game.currencies.skyEssence, 17, 'tierless leveling should consume the level-processing cost once');

let regular = context.getSupportGemSkyProcessState('일반 보조');
assert.strictEqual(regular.tierCap, 3);
assert.strictEqual(regular.improvingTier, true, 'normal support gems should still unlock tiers first');
assert.strictEqual(regular.nextTier, 2);
context.processSupportGemWithSkyEssence('일반 보조');
assert.strictEqual(context.game.supportGemData['일반 보조'].unlockedTier, 2);
assert.strictEqual(context.game.supportGemData['일반 보조'].level, 5);
assert.strictEqual(context.game.currencies.skyEssence, 15);

context.game.supportGemData['수액 골렘 소환'].level = 30;
const beforeMaxedProcess = context.game.currencies.skyEssence;
context.processSupportGemWithSkyEssence('수액 골렘 소환');
assert.strictEqual(context.game.currencies.skyEssence, beforeMaxedProcess, 'maxed tierless gems must not consume sky essence');
assert.ok(logs.some(message => message.includes('이미 최대 등급·레벨')), 'maxed processing should explain why it was blocked');

console.log('smoke-support-gem-processing passed');
