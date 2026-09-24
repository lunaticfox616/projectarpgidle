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
        skills: ['공격 A'],
        sealedSkills: ['공격 B'],
        gemData: { '공격 A': { level: 1, exp: 0 } },
        supports: ['보조 A'],
        sealedSupports: ['보조 B'],
        supportGemData: { '보조 A': { level: 1, exp: 0, unlockedTier: 1, activeTier: 1 } },
        currencies: { gemShard: 20 },
        noti: {}
    },
    SKILL_DB: {
        '공격 A': { isGem: true },
        '공격 B': { isGem: true },
        '공격 C': { isGem: true },
        '기본 공격': { isGem: false }
    },
    SUPPORT_GEM_DB: {
        '보조 A': {},
        '보조 B': {},
        '보조 C': {}
    },
    GEM_SKY_ENHANCEMENTS: {},
    normalizeGemRecord(raw) {
        return {
            ...(raw || {}),
            level: Math.max(1, Math.floor(Number(raw && raw.level) || 1)),
            exp: Math.max(0, Math.floor(Number(raw && raw.exp) || 0)),
            unlockedTier: Math.max(1, Math.floor(Number(raw && raw.unlockedTier) || 1)),
            activeTier: Math.max(1, Math.floor(Number(raw && raw.activeTier) || 1))
        };
    },
    hasSkillGemOwned(name) {
        return context.game.skills.includes(name) || context.game.sealedSkills.includes(name);
    },
    hasSupportGemOwned(name) {
        return context.game.supports.includes(name) || context.game.sealedSupports.includes(name);
    },
    getExpertLevel() { return 1; },
    awardCurrency(key, amount) {
        context.game.currencies[key] = (context.game.currencies[key] || 0) + amount;
    },
    addLog(message) { logs.push(message); },
    updateStaticUI() {},
    checkUnlocks() {},
    queueImportantSave() {},
    grantExpertExpByAction() {},
    getPlayerStats() { return { suppCap: 1 }; },
    safeExposeGlobals(map) { Object.assign(context, map); }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
require('./lib/load-content-progression')(context);
vm.runInContext(fs.readFileSync('js/skills.js', 'utf8'), context, { filename: 'js/skills.js' });

let collection = context.getGemResearchCollectionState();
assert.deepStrictEqual(Array.from(collection.attack.missing), ['공격 C'], 'sealed attack gems must count as owned');
assert.deepStrictEqual(Array.from(collection.support.missing), ['보조 C'], 'sealed support gems must count as owned');
assert.strictEqual(context.getGemResearchCost('attack'), 12);
assert.strictEqual(context.getGemResearchCost('support'), 8);

assert.strictEqual(context.grantGemResearchFragments(2), 2);
assert.strictEqual(context.game.currencies.gemShard, 22);

assert.strictEqual(context.researchMissingGem('attack', '공격 C'), true);
assert(context.game.skills.includes('공격 C'));
assert.strictEqual(context.game.currencies.gemShard, 10);
assert.strictEqual(context.game.gemData['공격 C'].level, 1);

const beforeDuplicateResearch = context.game.currencies.gemShard;
context.researchMissingGem('attack', '공격 C');
assert.strictEqual(context.game.currencies.gemShard, beforeDuplicateResearch, 'researching an owned gem must not spend fragments');

assert.strictEqual(context.researchMissingGem('support', '보조 C'), true);
assert(context.game.supports.includes('보조 C'));
assert.strictEqual(context.game.currencies.gemShard, 2);
assert.strictEqual(context.game.supportGemData['보조 C'].unlockedTier, 1);

// Search, persistent fold choices, UI refresh and resource spending are exercised
// in a real browser against the actual game DOM when that screen changes.

console.log('smoke-gem-research passed');
