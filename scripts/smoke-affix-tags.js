// 옵션 태그(2026-10-07, 드랍 풀 2단계 B, data/affix-tags.js): 굴러 나오는 능력치마다 태그가 있고, 화폐가 노리는 목록 26개를
// 태그 규칙에서 만들어도 손으로 적던 목록과 똑같다. 아래 목록은 바꾸기 전 코드에서 그대로 옮겨 적었다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const sorted = list => [...list].sort();

// 1. 태그 표: 24종, 굴러 나오는 능력치와 복합 줄의 능력치 모두에 태그가 있다.
const labels = json('AFFIX_TAG_LABELS');
assert.strictEqual(Object.keys(labels).length, 24, 'twenty-four tags');
const rolled = json('[...new Set(MOD_DB.flatMap(mod => [mod.statId || mod.id, ...(mod.compound || []).map(part => part.statId)]))]');
assert.deepStrictEqual(rolled.filter(statId => !json(`getStatAffixTags(${JSON.stringify(statId)})`).length), [], 'every rolled stat has tags');
assert.deepStrictEqual(json('Object.values(STAT_AFFIX_TAGS).flat().filter(tag => !AFFIX_TAG_LABELS[tag])'), [], 'only known tags');
assert.deepStrictEqual(sorted(json('getAffixTags(MOD_DB.find(mod => mod.id === "compoundArmor"))')), ['defense'], 'a compound row joins its stats');
assert.deepStrictEqual(sorted(json('getAffixTags({ id: "flatDmg", extraStats: [{ id: "weaponFlatDmgPct" }] })')), ['attack', 'damage', 'physical'],
    'a rolled compound line joins its extra stat');

// 2. 목록 26개: 태그 규칙에서 만든 목록이 예전 목록과 같다.
const ORIGINAL = {
    spore: {
        fire: ['fireFlatDmg', 'firePctDmg', 'resF', 'aspd', 'crit', 'critDmg', 'resPen', 'ds', 'targetAny', 'targetProjectile'],
        cold: ['coldFlatDmg', 'coldPctDmg', 'resC', 'crit', 'critDmg', 'aspd', 'ds', 'targetAny', 'targetProjectile'],
        light: ['lightFlatDmg', 'lightPctDmg', 'resL', 'aspd', 'ds', 'crit', 'critDmg', 'targetAny', 'targetProjectile'],
        chaos: ['chaosFlatDmg', 'chaosPctDmg', 'resChaos', 'dotPctDmg', 'resPen', 'leech', 'spellLeech', 'regenSuppress', 'targetAny', 'targetProjectile'],
        damage: ['flatDmg', 'physFlatDmg', 'spellFlatDmg', 'fireFlatDmg', 'coldFlatDmg', 'lightFlatDmg', 'chaosFlatDmg', 'physPctDmg', 'attackPctDmg',
            'spellPctDmg', 'firePctDmg', 'coldPctDmg', 'lightPctDmg', 'chaosPctDmg', 'pctDmg', 'dotPctDmg', 'critDmg']
    },
    rotSpore: ['fireFlatDmg', 'coldFlatDmg', 'lightFlatDmg', 'firePctDmg', 'coldPctDmg', 'lightPctDmg', 'elementalPctDmg', 'resF', 'resC', 'resL'],
    fossil: {
        fossilJagged: ['physPctDmg', 'meleePctDmg', 'flatDmg', 'physIgnore'],
        fossilBound: ['flatHp', 'pctHp', 'dr', 'armor', 'armorPct', 'evasion', 'evasionPct', 'energyShield', 'energyShieldPct'],
        fossilGale: ['aspd', 'crit', 'move'],
        fossilPrismatic: ['resAll', 'resF', 'resC', 'resL', 'elementalPctDmg', 'resPen'],
        fossilAbyssal: ['chaosPctDmg', 'leech', 'regen'],
        fossilPrimordial: ['physIgnore', 'resPen', 'chaosPctDmg', 'critDmg'],
        fossilBulwark: ['maxResF', 'maxResC', 'maxResL'],
        fossilWedge: ['projectileExtraChance', 'projectilePctDmg', 'crit'],
        fossilOld: [],
        fossilRift: []
    },
    sea: {
        '공격': ['flatDmg', 'weaponFlatDmgPct', 'pctDmg', 'meleePctDmg', 'projectilePctDmg', 'physPctDmg', 'elementalPctDmg', 'firePctDmg', 'coldPctDmg',
            'lightPctDmg', 'chaosPctDmg', 'aoePctDmg', 'dotPctDmg', 'crit', 'critDmg', 'physIgnore', 'resPen', 'physFlatDmg', 'fireFlatDmg', 'coldFlatDmg',
            'lightFlatDmg', 'chaosFlatDmg', 'summonFlatDmg', 'summonPctDmg', 'summonCrit', 'summonCritDmg', 'summonResPen'],
        '방어·생명': ['flatHp', 'pctHp', 'armor', 'armorPct', 'evasion', 'evasionPct', 'energyShield', 'energyShieldPct', 'deflectChance', 'regen',
            'regenFlat', 'regenSuppress', 'leech', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap', 'blockChancePct'],
        '속도·치명': ['aspd', 'move', 'summonAspd', 'summonEfficiency'],
        '저항': ['resF', 'resC', 'resL', 'resAll', 'resChaos']
    },
    quality: {
        fire: ['firePctDmg', 'resF', 'igniteChance', 'igniteDamageMultiplierPct'],
        cold: ['coldPctDmg', 'resC', 'freezeChance', 'chillEffect'],
        light: ['lightPctDmg', 'resL', 'shockChance', 'shockEffect'],
        chaos: ['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance', 'poisonDamageMultiplierPct'],
        physical: ['physPctDmg', 'flatDmg', 'bleedChance', 'physIgnore', 'maxDmgRoll', 'minDmgRoll'],
        defense: ['flatHp', 'pctHp', 'armor', 'armorPct', 'evasion', 'evasionPct', 'energyShield', 'energyShieldPct', 'resAll', 'dr'],
        speed: ['aspd', 'move', 'ds']
    },
    venomStinger: ['flatDmg', 'aspd', 'crit', 'critDmg', 'resPen', 'physPctDmg', 'elementalPctDmg', 'chaosPctDmg', 'leech', 'minDmgRoll', 'maxDmgRoll',
        'summonFlatDmg', 'summonPctDmg', 'summonAspd', 'summonCrit', 'summonCritDmg']
};
const sporeRows = mode => json(`[...new Set(equipmentCrafting.filterSporeMods(MOD_DB, ${JSON.stringify(mode)}).map(mod => mod.statId || mod.id))]`);
Object.entries(ORIGINAL.spore).forEach(([mode, list]) => assert.deepStrictEqual(sorted(sporeRows(mode)), sorted(list), `${mode} spore`));
assert.deepStrictEqual(sporeRows('none'), [], 'an unknown spore mode guarantees nothing');
assert.deepStrictEqual(sorted(json('ROT_SPORE_STAT_IDS')), sorted(ORIGINAL.rotSpore), 'rot spore');
const fossils = json('Object.fromEntries(FOSSIL_DB.map(fossil => [fossil.key, fossil.guaranteedStats]))');
assert.deepStrictEqual(Object.keys(fossils), Object.keys(ORIGINAL.fossil), 'every fossil keeps its place');
Object.entries(ORIGINAL.fossil).forEach(([key, list]) => assert.deepStrictEqual(sorted(fossils[key]), sorted(list), key));
const sea = json('Object.fromEntries(OCEAN_MOD_CATEGORY_RULES.map(rule => [rule.category, rule.ids]))');
assert.deepStrictEqual(Object.keys(sea), Object.keys(ORIGINAL.sea), 'sea categories in order');
Object.entries(ORIGINAL.sea).forEach(([category, list]) => assert.deepStrictEqual(sorted(sea[category]), sorted(list), `sea ${category}`));
const quality = json('QUALITY_ATTRIBUTE_STAT_GROUPS');
Object.entries(ORIGINAL.quality).forEach(([mode, list]) => assert.deepStrictEqual(sorted(quality[mode]), sorted(list), `quality ${mode}`));
assert.deepStrictEqual(sorted(json('VENOM_STINGER_STAT_IDS')), sorted(ORIGINAL.venomStinger), 'venom stinger');

// 3. 예외는 꼭 필요한 것만: plus는 태그로 안 들어오는 능력치, minus는 태그로 들어오는 능력치다(지우면 태그 그대로가 된다).
const rules = json(`(() => {
    const out = [];
    const walk = (name, rule) => rule.any ? out.push({ name, rule }) : Object.entries(rule).forEach(([key, child]) => walk(name + '.' + key, child));
    Object.entries(AFFIX_TAG_LISTS).forEach(([key, rule]) => walk(key, rule));
    return out.map(({ name, rule }) => ({ name, plus: (rule.plus || []).filter(statId => matchesAffixTags(getStatAffixTags(statId), rule)),
        minus: (rule.minus || []).filter(statId => !matchesAffixTags(getStatAffixTags(statId), rule)) }));
})()`);
assert.strictEqual(rules.length, 26, 'twenty-six lists');
rules.forEach(row => assert.deepStrictEqual([row.plus, row.minus], [[], []], `${row.name}: exceptions the tags already cover`));

// 4. 노리는 옵션의 태그 조건(15번 D): 그 태그가 붙은 줄을 티어 이상으로 센다. 복합 줄은 한 줄이다.
const policy = rules => `equipmentLootPolicy.normalizeTargets({ enabled: true, minMatches: 1, rules: ${JSON.stringify(rules)} })`;
assert.deepStrictEqual(json(policy([{ tag: 'fire', minCount: 9, minTier: 25 }, { tag: 'nope', minCount: 1, minTier: 0 }, { tag: 'fire', minCount: 1, minTier: 0 },
    { tag: 'cold', minCount: null, minTier: 0 }, { statId: 'flatHp', minValue: 5, minTier: 1 }])).rules,
    [{ tag: 'fire', minCount: 6, minTier: 20 }, { statId: 'flatHp', minValue: 5, minTier: 1 }], 'known tags, clamped counts, one rule per tag');
const tagMatch = (rules, stats, scope = 'explicit') => run(`equipmentLootPolicy.matches({ slot: '무기', stats: ${JSON.stringify(stats)}, baseStats: [{ id: 'fireFlatDmg', val: 5 }] },
    { settings: { equipmentTargets: equipmentLootPolicy.normalizeTargets({ enabled: true, scope: '${scope}', minMatches: 1, rules: ${JSON.stringify(rules)} }) } })`);
const fireTwo = [{ tag: 'fire', minCount: 2, minTier: 10 }];
const fireLines = [{ id: 'firePctDmg', val: 30, tier: 12 }, { id: 'fireFlatDmg', val: 40, tier: 10 }, { id: 'aspd', val: 9, tier: 15 }];
assert.strictEqual(tagMatch(fireTwo, fireLines), true, 'two fire lines at T10 or more');
assert.strictEqual(tagMatch(fireTwo, [fireLines[0], { ...fireLines[1], tier: 9 }]), false, 'a line under the tier does not count');
assert.strictEqual(tagMatch(fireTwo, [fireLines[0]]), false, 'one fire line is not two');
assert.strictEqual(tagMatch([{ tag: 'fire', minCount: 2, minTier: 0 }], [fireLines[0]], 'all'), true, 'base lines count when the rule reads every line');
assert.strictEqual(tagMatch([{ tag: 'defense', minCount: 2, minTier: 0 }], [{ id: 'armor', val: 30, tier: 5, extraStats: [{ id: 'armorPct', val: 10 }] }]), false,
    'a compound line is one line');
assert.strictEqual(run(`equipmentLootPolicy.lineMatchesRule({ id: 'resF', val: 20, tier: 4 }, { tag: 'resistance', minCount: 1, minTier: 3 })`), true, 'one line carries the tag');
const saved = json(`(() => {
    game = cloneDefaultGame();
    game.settings.equipmentTargets = ${policy([{ tag: 'crit', minCount: 2, minTier: 8 }])};
    return mergeDefaults(JSON.parse(serializeSaveState())).settings.equipmentTargets.rules;
})()`);
assert.deepStrictEqual(saved, [{ tag: 'crit', minCount: 2, minTier: 8 }], 'tag rules survive a save');

// 작업대 목표: 태그는 지금 굴릴 수 있는 줄이 있을 때만, 남은 줄 수와 가장 높은 티어로.
const goalTags = json(`(() => {
    const weapon = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === '무기' && getWeaponCategoryId({ slot: row.slot, baseId: row.id }) === 'greatsword'), 'rare', 12);
    weapon.stats = [];
    const reroll = craftingGoalOptions.tags(weapon, { key: 'formlessDew', kind: 'reroll' }, 'none');
    weapon.stats = [{ id: 'firePctDmg', val: 20, tier: 7, lockedByHoney: true }];
    const locked = craftingGoalOptions.tags(weapon, { key: 'formlessDew', kind: 'reroll' }, 'none');
    return { tags: reroll.map(row => row.id), fire: reroll.find(row => row.id === 'fire'), lockedFire: locked.find(row => row.id === 'fire'),
        value: craftingGoalOptions.tags(weapon, { key: 'goldenRule', kind: 'value' }, 'none') };
})()`);
assert(goalTags.tags.includes('fire') && goalTags.tags.includes('attack') && !goalTags.tags.includes('summon'), 'a plain greatsword can roll fire and attack lines, not summon ones');
assert(goalTags.fire.maxCount >= 2 && goalTags.fire.maxTier >= 1, 'several fire lines can roll');
assert.strictEqual(goalTags.lockedFire.maxCount, goalTags.fire.maxCount, 'a kept fire line counts and its stat leaves the pool');
assert.deepStrictEqual(goalTags.value, [], 'value crafts have no line goals');

console.log('affix tags: 24 tags on every rolled stat, 26 currency lists from tag rules match the hand-written lists, tag rules in loot targets and craft goals: OK');
