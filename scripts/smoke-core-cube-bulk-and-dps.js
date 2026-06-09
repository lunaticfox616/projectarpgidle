const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
assert(/selectGloveSlotFromOverlay\('장갑1'\)[^<]*>왼쪽 슬롯<\/button>/.test(html), 'left glove overlay button must equip 장갑1');
assert(/selectGloveSlotFromOverlay\('장갑2'\)[^<]*>오른쪽 슬롯<\/button>/.test(html), 'right glove overlay button must equip 장갑2');

function createHarness() {
    const host = { innerHTML: '' };
    const logs = [];
    const updateCalls = [];
    const randomValues = [0.98, 0.00, 0.03, 0.05, 0.00, 0.52, 0.50];
    const scopedMath = Object.create(Math);
    scopedMath.random = () => randomValues.length ? randomValues.shift() : 0.25;
    const context = {
        console,
        Date,
        Math: scopedMath,
        window: null,
        document: { getElementById: id => id === 'ui-core-cube-panel' ? host : null },
        game: makeGame(),
        safeExposeGlobals: obj => Object.assign(context, obj),
        addLog: (message, type) => logs.push({ message, type }),
        updateStaticUI: () => updateCalls.push('update'),
        P_STATS: {},
        PASSIVES: {},
        SEASON_NODES: {},
        ASCEND_NODES: {},
        SUPPORT_GEMS: {},
        SKILLS: { slash: { id: 'slash', name: '기본 공격', ele: 'phys', dmg: 1, spd: 1, tags: ['attack'], targets: 1 } },
        UNIQUE_EFFECTS: {},
        UNIQUE_JEWELS: {},
        UNIQUE_JEWEL_EFFECTS: {},
        UNDERWORLD_RUNE_DB: [],
        PASSIVE_STAR_BLESSING: {},
        DOT_TICK_INTERVAL: 1,
        DOT_EFFECT_DURATION: 4,
        DOT_STACK_MAX: 5,
        LEECH_BASE_INSTANCE_CAP_PCT: 10,
        LEECH_BASE_TOTAL_CAP_PCT: 20,
        LEECH_BASE_RATE_CAP_PCT: 2,
        getEquippedSupportGems: () => [],
        getSupportGemLevel: () => 1,
        getSkillGemLevel: () => 1,
        getSkillDef: id => context.SKILLS[id] || context.SKILLS.slash,
        getActiveSkillStats: () => ({ ...context.SKILLS.slash }),
        hasKeystone: () => false,
        isDualWielding: () => false,
        getHeroSelectionDef: () => ({ stats: [] }),
        getSkyTowerLoopBonus: () => ({}),
        getLoopDeepBonus: () => ({}),
        ensureChaosRealmState: () => ({ permanentBonuses: {} }),
        getFavorEffects: () => ({}),
        getActiveShrineBuff: () => null,
        getActiveConstellationBonus: () => null,
        getSkillTargets: skill => skill.targets || 1,
        getGemAddedBaseDamage: () => 0,
        getGemPresentation: () => ({}),
        getCodexBonusPct: () => 0,
        getZone: () => ({ resistPenalty: 0, accuracy: 100 }),
        getConditionGemStatDelta: () => 0,
        recalculateStarWedgeMutations: () => {},
        assignStarWedgeSockets: () => {},
        getArmorPhysicalReductionPct: () => 0,
        getEvasionChancePct: () => 0,
        getEnemyAccuracy: () => 100,
        getSkillTagDamageStatId: () => null,
        translateSkillTag: tag => tag,
        estimateSummonDps: () => ({ total: 0, lines: [] }),
        safeGetEquippedItem: () => null,
        getActiveSupportLinks: () => [],
        getActiveEnemyShockTakenDamageIncreasePct: () => 0,
        getPlayerShockTakenDamageIncreasePct: () => 0,
        getEnemyShockTakenDamageIncreasePct: () => 0,
        isDamageAilmentType: () => false,
        getDamageAilmentBaseDpsFromHit: () => 0,
        getDotStackMultiplier: stacks => stacks,
        dispatchRuntimeEvent: () => {},
        clamp: (value, min, max) => Math.max(min, Math.min(max, value))
    };
    context.window = context;
    vm.createContext(context);
    ['js/utils.js', 'js/core-cube.js', 'js/combat.js'].forEach(file => {
        vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
        if (file === 'js/utils.js') vm.runInContext('game = window.game;', context);
    });
    return { context, host, logs, updateCalls };
}

function makeGame(coreCube = {}) {
    return {
        level: 1,
        equipment: {},
        passives: [],
        seasonNodes: [],
        ascendNodes: [],
        actRewardBonuses: [],
        journalBonuses: [],
        equippedSupports: [],
        coreCube: {
            completed: false,
            revealedOptions: [],
            unlocked: true,
            everUnlocked: true,
            blurred45: 0,
            powers: {},
            faces: [null, null, null, null, null, null],
            selectedFace: 0,
            ...coreCube
        },
        selectedSkill: 'slash',
        skillLevels: { slash: 1 },
        supportLinks: {},
        season: 20,
        loopCount: 20,
        talismanPlacements: {},
        talismanBoard: [],
        jewelSlots: [],
        unlocks: {},
        enemies: [],
        class: 'warrior'
    };
}

const { context, host, logs, updateCalls } = createHarness();
context.game.coreCube.blurred45 = 7;
context.renderCoreCubePanel();
assert(host.innerHTML.includes('>5개</button>') && host.innerHTML.includes('>전부</button>'), 'core cube panel must render bulk blurred45 controls');
context.useCoreCubeBlurred45(5);
assert.strictEqual(context.game.coreCube.blurred45, 2, 'using five blurred45 must consume exactly five');
assert.deepStrictEqual(JSON.parse(JSON.stringify(context.game.coreCube.powers)), { 1: 2, 2: 1, 3: 1, 45: 1 }, 'bulk use must grant every rolled power source');
assert.strictEqual(context.game.coreCube.lastPower, 1, 'bulk use must remember the actual last roll, not the highest grouped roll');
assert.strictEqual(updateCalls.length, 1, 'bulk use must refresh static UI once');
assert(logs[0].message.includes('5개 해석') && logs[0].message.includes('1×2'), 'bulk use must write a compact aggregated log');
context.useCoreCubeBlurred45('all');
assert.strictEqual(context.game.coreCube.blurred45, 0, 'all bulk use must consume the remaining blurred45');
assert.strictEqual(context.game.coreCube.powers[23], 1, 'all bulk use must grant subsequent rolled power sources');
assert.strictEqual(context.game.coreCube.powers[24], 1, 'all bulk use must grant all remaining rolls');
assert.strictEqual(context.game.coreCube.lastPower, 23, 'all bulk use must preserve the last roll after grouped inserts');

context.game = makeGame();
vm.runInContext('game = window.game;', context);
const baseline = context.getPlayerStats();
context.game = makeGame({
    completed: true,
    revealedOptions: [{ stat: 'addedFireDamagePct', value: 10 }],
    faces: [1, 2, 3, 4, 5, 6]
});
vm.runInContext('game = window.game;', context);
const boosted = context.getPlayerStats();
assert.strictEqual(boosted.addedDamagePctByElement.fire, 10, 'core cube added fire damage must reach player stats');
assert(boosted.directDps > baseline.directDps, 'core cube added damage must increase displayed direct DPS');
assert(boosted.breakdowns.directDps.lines.some(line => line.includes('코어 큐브 추가 피해') && line.includes('화염 10%')), 'direct DPS breakdown must explain the added elemental damage contribution');

console.log('core cube bulk use, glove slot wiring, and added-damage DPS smoke checks passed');
