// 옵션 태그(2026-10-07, 드랍 풀 2단계 B, data/affix-tags.js): 굴러 나오는 능력치마다 태그가 있고, 화폐가 노리는 목록 26개를
// 태그 규칙에서 만든다. B1은 손으로 적던 목록과 똑같이 맞췄고, B2(2026-10-08, 사용자 "태그대로 해")는 예외를 지워 태그 그대로다.
// 아래 BEFORE는 바꾸기 전 코드에서 그대로 옮겨 적은 예전 목록이다.
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

// 2. 목록 26개(B2): 예외 없이 태그 그대로다(방패 화석만 태그가 없어 예외 목록). 줄 수는 예전 목록(BEFORE)에서
// docs/affix-kinds-tags-plan-20261007.md B2 표대로 바뀐다.
const BEFORE = {
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
        speed: ['aspd', 'move', 'ds'],
        // 기폭제(12번 루프 32)만 주는 품질 속성: 예전에는 없었다.
        crit: [],
        summon: []
    },
    venomStinger: ['flatDmg', 'aspd', 'crit', 'critDmg', 'resPen', 'physPctDmg', 'elementalPctDmg', 'chaosPctDmg', 'leech', 'minDmgRoll', 'maxDmgRoll',
        'summonFlatDmg', 'summonPctDmg', 'summonAspd', 'summonCrit', 'summonCritDmg']
};
// [예전 줄 수, 지금 줄 수] (B2 표). 방패 화석은 태그로 적을 수 없어 그대로 3줄. 지금 줄 수에는 세계수 기운의 지역 줄(12번 루프 27,
// data/region-affixes.js)도 태그대로 들어간다: REGION_JOINS가 그 몫(그 지역 장비의 풀에 있을 때만 실제로 나온다).
const B2_COUNTS = {
    'spore.fire': [10, 8], 'spore.cold': [9, 8], 'spore.light': [9, 8], 'spore.chaos': [10, 9], 'spore.damage': [17, 39], rotSpore: [10, 25],
    'fossil.fossilJagged': [4, 12], 'fossil.fossilBound': [9, 17], 'fossil.fossilGale': [3, 5], 'fossil.fossilPrismatic': [6, 8],
    'fossil.fossilAbyssal': [3, 12], 'fossil.fossilPrimordial': [4, 9], 'fossil.fossilBulwark': [3, 3], 'fossil.fossilWedge': [3, 8],
    'fossil.fossilOld': [0, 0], 'fossil.fossilRift': [0, 0],
    'sea.공격': [27, 43], 'sea.방어·생명': [17, 24], 'sea.속도·치명': [4, 5], 'sea.저항': [5, 11],
    'quality.fire': [4, 10], 'quality.cold': [4, 10], 'quality.light': [4, 10], 'quality.chaos': [5, 10], 'quality.physical': [6, 7],
    'quality.defense': [10, 17], 'quality.speed': [3, 4], 'quality.crit': [0, 7], 'quality.summon': [0, 9], venomStinger: [16, 36]
};
const REGION_JOINS = {
    'spore.fire': 4, 'spore.cold': 4, 'spore.light': 3, 'spore.chaos': 4, 'spore.damage': 8, rotSpore: 10, 'fossil.fossilJagged': 1,
    'fossil.fossilBound': 5, 'fossil.fossilGale': 1, 'fossil.fossilAbyssal': 3, 'fossil.fossilPrimordial': 4, 'fossil.fossilWedge': 2,
    'sea.공격': 11, 'sea.방어·생명': 6, 'sea.속도·치명': 1, 'sea.저항': 1, 'quality.fire': 4, 'quality.cold': 4, 'quality.light': 3,
    'quality.chaos': 4, 'quality.physical': 1, 'quality.defense': 5, 'quality.speed': 1, 'quality.crit': 2, venomStinger: 8
};
const sporeRows = mode => json(`[...new Set(equipmentCrafting.filterSporeMods(MOD_DB, ${JSON.stringify(mode)}).map(mod => mod.statId || mod.id))]`);
assert.deepStrictEqual(sporeRows('none'), [], 'an unknown spore mode guarantees nothing');
const fossils = json('Object.fromEntries(FOSSIL_DB.map(fossil => [fossil.key, fossil.guaranteedStats]))');
assert.deepStrictEqual(Object.keys(fossils), Object.keys(BEFORE.fossil), 'every fossil keeps its place');
const sea = json('Object.fromEntries(OCEAN_MOD_CATEGORY_RULES.map(rule => [rule.category, rule.ids]))');
assert.deepStrictEqual(Object.keys(sea), Object.keys(BEFORE.sea), 'sea categories in order');
const quality = json('QUALITY_ATTRIBUTE_STAT_GROUPS');
const NOW = { rotSpore: json('ROT_SPORE_STAT_IDS'), venomStinger: json('VENOM_STINGER_STAT_IDS') };
Object.keys(BEFORE.spore).forEach(mode => { NOW[`spore.${mode}`] = sporeRows(mode); });
Object.entries(fossils).forEach(([key, list]) => { NOW[`fossil.${key}`] = list; });
Object.entries(sea).forEach(([category, list]) => { NOW[`sea.${category}`] = list; });
Object.entries(quality).forEach(([mode, list]) => { NOW[`quality.${mode}`] = list; });
const beforeOf = name => name.split('.').reduce((node, key) => node[key], BEFORE);
assert.deepStrictEqual(Object.keys(NOW).sort(), Object.keys(B2_COUNTS).sort(), 'every list is counted');
Object.entries(B2_COUNTS).forEach(([name, [before, now]]) => {
    assert.strictEqual(beforeOf(name).length, before, `${name}: the old list`);
    assert.strictEqual(NOW[name].length, now, `${name}: the tag list`);
    assert.strictEqual(NOW[name].filter(id => id.startsWith('region')).length, REGION_JOINS[name] || 0, `${name}: region lines by their tags`);
});
assert.deepStrictEqual(sorted(NOW['spore.fire']), sorted(['fireFlatDmg', 'firePctDmg', 'resF', 'maxResF', 'regionFullLifeFire', 'regionIgniteDuration',
    'regionIgniteSpread', 'regionIgnitedDamage']), 'a fire spore guarantees fire lines only (the garden region lines on garden gear)');
assert(!NOW['spore.fire'].includes('aspd') && NOW['spore.damage'].includes('summonPctDmg'), 'attack speed leaves the fire spore, minion damage joins the damage spore');
assert.deepStrictEqual(sorted(NOW['fossil.fossilBulwark']), sorted(BEFORE.fossil.fossilBulwark), 'the shield fossil keeps its maximum resistances');
// 태그 그대로: 방패 화석 밖에는 예외(plus, minus)가 없다.
assert.deepStrictEqual(json(`(() => {
    const out = [];
    const walk = (name, rule) => rule.any ? out.push({ name, rule }) : Object.entries(rule).forEach(([key, child]) => walk(name + '.' + key, child));
    Object.entries(AFFIX_TAG_LISTS).forEach(([key, rule]) => walk(key, rule));
    return out.filter(({ rule }) => rule.plus || rule.minus).map(({ name }) => name);
})()`), ['fossil.fossilBulwark'], 'only the shield fossil keeps an exception list');

// 3. 예외는 꼭 필요한 것만: plus는 태그로 안 들어오는 능력치, minus는 태그로 들어오는 능력치다(지우면 태그 그대로가 된다).
const rules = json(`(() => {
    const out = [];
    const walk = (name, rule) => rule.any ? out.push({ name, rule }) : Object.entries(rule).forEach(([key, child]) => walk(name + '.' + key, child));
    Object.entries(AFFIX_TAG_LISTS).forEach(([key, rule]) => walk(key, rule));
    return out.map(({ name, rule }) => ({ name, plus: (rule.plus || []).filter(statId => matchesAffixTags(getStatAffixTags(statId), rule)),
        minus: (rule.minus || []).filter(statId => !matchesAffixTags(getStatAffixTags(statId), rule)) }));
})()`);
assert.strictEqual(rules.length, 28, 'twenty-eight lists (crit and summon quality from the loop 32 catalysts)');
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

console.log('affix tags: 24 tags on every rolled stat, 26 currency lists are their tags (B2 counts), tag rules in loot targets and craft goals: OK');
