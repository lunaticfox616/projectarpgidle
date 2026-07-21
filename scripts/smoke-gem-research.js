const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

function readFunctionSource(source, name) {
    const start = source.indexOf(`function ${name}`);
    assert.ok(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = source.indexOf('{', start); index < source.length; index++) {
        if (source[index] === '{') depth++;
        if (source[index] !== '}') continue;
        depth--;
        if (depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

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

const combatSource = fs.readFileSync('js/combat.js', 'utf8');
const passiveSource = fs.readFileSync('js/passives.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const stateSource = fs.readFileSync('js/state.js', 'utf8');
const itemSource = fs.readFileSync('data/items.js', 'utf8');
const indexSource = fs.readFileSync('index.html', 'utf8');
const cssSource = fs.readFileSync('css/ui-game-overhaul.css', 'utf8');

const supportDetails = {
    dataset: { gemResearchSection: 'support' },
    open: false,
    addEventListener(event, handler) {
        if (event === 'toggle') this.onToggle = handler;
    }
};
const researchRoot = {
    innerHTML: '',
    querySelectorAll() { return [supportDetails]; }
};
context.document = { getElementById(id) { return id === 'ui-gem-research-panel' ? researchRoot : null; } };
context.game.currencies.gemShard = 8;
context.game.gemResearchExpanded = {};
context.getGemResearchCollectionState = () => ({
    attack: { missing: ['공격 미보유'], owned: 1, total: 2 },
    support: { missing: ['보조 미보유'], owned: 1, total: 2 }
});
context.getGemResearchCost = kind => kind === 'support' ? 8 : 12;
context.renderGemResearchCandidate = () => '<article>candidate</article>';
vm.runInContext(`${readFunctionSource(uiSource, 'renderGemResearchPanel')}\nthis.renderGemResearchPanel = renderGemResearchPanel;`, context, { filename: 'gem-research-ui.js' });

context.renderGemResearchPanel();
assert(!researchRoot.innerHTML.includes('data-gem-research-section="support" open'), '지원 젬 목록은 기본 규칙을 따르되 사용자가 열기 전에는 강제로 열리지 않아야 한다');
supportDetails.open = true;
supportDetails.onToggle();
assert.strictEqual(context.game.gemResearchExpanded.support, true, '사용자가 연 보조 젬 목록 상태를 저장해야 한다');
context.renderGemResearchPanel();
assert(researchRoot.innerHTML.includes('data-gem-research-section="support" open'), '화면을 다시 그려도 사용자가 연 보조 젬 목록은 펼친 상태를 유지해야 한다');

assert(combatSource.includes('let baseGemShardGain'), 'every random gem drop should grant deterministic research progress');
assert(combatSource.includes('최고 등급 보조 젬'), 'maxed support duplicates should be converted instead of disappearing');
assert(combatSource.includes('!hasSkillGemOwned(name)'), 'trial rewards must respect sealed attack gems');
assert(passiveSource.includes('중복 보조 젬 대신') && passiveSource.includes("grantGemResearchFragments(3)"), 'act reward duplicates should feed gem research');
assert(uiSource.includes('function renderGemResearchPanel()'), 'skill UI should render targeted gem research');
assert(stateSource.includes('gemResearchExpanded: {}'), 'new saves should initialize gem research fold preferences');
assert(uiSource.includes('getGemGrowthSummaryHtml'), 'gem growth screen should expose its level and output breakdown');
assert(uiSource.includes("getExpertCombinedCostReduction('gemQualityCostReducePct')"), 'displayed quality cost must respect the actual discount');
assert(stateSource.includes('gemShard: 0'), 'new saves should initialize gem fragments');
assert(itemSource.includes("gemShard: { name: '젬 잔향'"), 'gem fragments need a player-facing currency definition');
assert(indexSource.includes('id="ui-gem-research-panel"'), 'skill tab should contain the research workspace');
assert(cssSource.includes('.gem-research-panel'), 'research workspace should have responsive game UI styling');

console.log('smoke-gem-research passed');
