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

console.log('affix tags: 24 tags on every rolled stat, 26 currency lists from tag rules match the hand-written lists: OK');
