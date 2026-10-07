// 무기 대분류 여섯(data/weapon-categories.js, docs/weapon-categories-20261001.md): 무기 바탕은 전부 대분류가 하나씩 있고
// (새 무기 바탕을 빠뜨리면 여기서 걸린다), 대분류마다 1단계 바탕부터 20단계까지 제 대분류 안에서만 승급하며, 칸 크기 ·
// 아이템 제목 · 요구 능력치 · 포션 스킬 · 고유 장비가 대분류를 따른다. 무기 뿌리촉수(data/bosses.js ROOT_MONSTER_RULES)는
// 드물게 나오고, 처치마다 넷에 하나꼴로 제 대분류 무기를 따로 떨군다.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const root = path.resolve(__dirname, '..');
const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
/** Canvas size from a WebP's VP8X header (the browser's lossless encoder writes the extended form). */
function webpSize(file) {
    const bytes = fs.readFileSync(file);
    assert.strictEqual(bytes.toString('ascii', 12, 16), 'VP8X', `${file} is an extended WebP`);
    return [1 + bytes.readUIntLE(24, 3), 1 + bytes.readUIntLE(27, 3)];
}

// 1. 여섯 대분류 = 주인공 그림의 무기 여섯. 무기 바탕은 전부 대분류 하나에 들고, 없는 바탕을 가리키는 줄은 없다.
const categories = json('WEAPON_CATEGORIES');
assert.deepStrictEqual(Object.keys(categories).sort(), json('Object.keys(HANA_WEAPON_COMBOS.weapons)').sort(),
    'the six categories are the six weapons the hero can hold');
const weaponBases = json(`BASE_ITEM_DB.filter(b => b.slot === '무기').map(b => b.id)`);
const mapped = json('WEAPON_BASE_CATEGORIES');
assert.deepStrictEqual(weaponBases.filter(id => !mapped[id]), [], 'every weapon base has a category');
assert.deepStrictEqual(Object.keys(mapped).filter(id => !weaponBases.includes(id)), [], 'no category row for a base that does not exist');
assert.deepStrictEqual(Object.values(mapped).filter(id => !categories[id]), [], 'rows name one of the six categories');

// 2. 대분류마다: 일반 드랍 바탕이 1단계부터 있고(액트 1부터 떨어진다), 승급은 제 대분류 안에서만, 체인 맨 위는 20단계.
const lineup = json(`BASE_ITEM_DB.filter(b => b.slot === '무기' && !b.dropOnly && !b.realmBase).map(b => {
    const next = getBaseUpgradeCandidates(b)[0];
    return { id: b.id, name: b.name, tier: b.reqTier, cat: WEAPON_BASE_CATEGORIES[b.id], next: next ? next.id : null,
        req: b.requirementWeights, icon: ITEM_VISUAL_ASSET_DB.equipmentGrid.baseAssets[b.id] };
})`);
for (const category of Object.keys(categories)) {
    const own = lineup.filter(base => base.cat === category);
    assert(own.some(base => base.tier === 1), `${category} has a tier-1 base`);
    own.forEach(base => {
        if (base.next) assert.strictEqual(mapped[base.next], category, `${base.id} upgrades inside ${category} (→ ${base.next})`);
        else assert.strictEqual(base.tier, 20, `${base.id}: a ${category} chain ends at tier 20`);
    });
}
const scimitarReq = json(`BASE_ITEM_DB.filter(b => WEAPON_BASE_CATEGORIES[b.id] === 'scimitar').map(b => b.requirementWeights)`);
scimitarReq.forEach(req => assert.deepStrictEqual(req, { strength: 0.6, dexterity: 0.6 }, 'every scimitar asks for strength and dexterity'));
const scimitarUniques = json(`Object.values(UNIQUE_EQUIPMENT_RULES).filter(r => WEAPON_BASE_CATEGORIES[r.baseId] === 'scimitar' && r.level > 1).map(r => r.attributes)`);
scimitarUniques.forEach(attr => assert(attr.strength > 0 && attr.dexterity > 0, 'scimitar uniques too'));
for (const [category, tiers] of [['flask', [1, 5, 10, 15, 20]], ['censer', [1, 5, 10, 15, 20]], ['scimitar', [1, 3, 10, 14, 17, 20]], ['shortbow', [1, 5, 8, 10, 12, 15, 15, 20]]]) {
    assert.deepStrictEqual(lineup.filter(base => base.cat === category).map(base => base.tier).sort((a, b) => a - b), tiers, `${category} tiers`);
}
const drawn = ['cracked_flask', 'catalyst_flask', 'volatile_flask', 'alchemist_retort', 'philosopher_flask', 'tin_censer', 'incense_censer',
    'ember_censer', 'chapel_censer', 'sunrise_censer', 'crescent_scimitar', 'blackiron_scimitar', 'eclipse_scimitar', 'dull_greatsword',
    'iron_greatsword', 'warden_greatsword', 'hunting_shortbow'];
drawn.forEach(id => assert.deepStrictEqual(webpSize(path.join(root, lineup.find(base => base.id === id).icon)), [16, 48], `${id} icon is 16 × 48 dots`));

// 3. 칸 크기: 대검 대분류는 2×3, 완드 · 로드 · 홀 · 초점봉은 1×2, 나머지는 1×3. 세로 4칸 무기는 없다.
for (const base of lineup) {
    const footprint = json(`getEquipmentInventoryFootprint({ slot: '무기', baseId: '${base.id}', baseName: '${base.name}' })`);
    if (base.cat === 'greatsword') assert.deepStrictEqual(footprint, { columns: 2, rows: 3 }, `${base.id} is 2 × 3`);
    else assert(footprint.columns === 1 && footprint.rows <= 3, `${base.id} is one column and at most three rows`);
}

// 4. 아이템 제목의 [칸]: 무기는 대분류 이름, 고유 무기는 규칙의 바탕으로, 그 밖은 칸 이름 그대로.
const label = item => run(`getItemSlotDisplayLabel(${JSON.stringify(item)})`);
assert.strictEqual(label({ slot: '무기', baseId: 'cracked_flask' }), '플라스크');
assert.strictEqual(label({ slot: '무기', baseId: 'rusted_blade' }), '곡도');
assert.strictEqual(label({ slot: '무기', name: '세계파쇄자', rarity: 'unique' }), '대검', 'uniques use their rule base');
assert.strictEqual(label({ slot: '무기', baseName: '심연의 창' }), '대검', 'old items without a base id use their base name');
assert.strictEqual(label({ slot: '무기' }), '무기', 'a weapon without a known base keeps the slot name');
assert.strictEqual(label({ slot: '반지2', baseId: 'copper_ring' }), '반지');

// 5. 드랍 후보: 고른 무작위 값을 고르게 훑어 어느 바탕이 나오는지 센다(Math.random 대신 (i + 0.5) / n).
const sweep = (slot, tier, category, n) => json(`(() => {
    const keep = Math.random, seen = {};
    try {
        for (let i = 0; i < ${n}; i++) {
            Math.random = () => (i + 0.5) / ${n};
            const base = chooseItemBase('${slot}', ${tier}, getZone(4), ${JSON.stringify(category || null)});
            seen[base.id] = (seen[base.id] || 0) + 1;
        }
    } finally { Math.random = keep; }
    return Object.keys(seen);
})()`);
const firstAct = sweep('무기', 1, null, 2000);
Object.keys(categories).forEach(category => assert(firstAct.some(id => mapped[id] === category), `${category} drops from act 1`));
const ordinary = sweep('무기', 15, null, 4000);
['cracked_flask', 'catalyst_flask', 'volatile_flask', 'alchemist_retort', 'tin_censer', 'incense_censer', 'ember_censer', 'chapel_censer',
    'crescent_scimitar', 'warden_greatsword', 'starfall_ballista'].forEach(id => assert(ordinary.includes(id), `${id} drops like any other weapon base`));
const flasks = sweep('무기', 15, 'flask', 400);
assert.deepStrictEqual(flasks.sort(), ['alchemist_retort', 'catalyst_flask', 'cracked_flask', 'volatile_flask'], 'a flask root picks among the flasks of that tier');
assert.deepStrictEqual(sweep('무기', 1, 'greatsword', 200), ['dull_greatsword'], 'a greatsword root in act 1 drops the tier-1 greatsword');
const unknown = sweep('무기', 1, 'not-a-category', 200);
assert(unknown.length > 1 && unknown.includes('rusted_blade'), 'a category with no base at that tier falls back to every weapon of the tier');
assert(sweep('투구', 10, 'flask', 100).every(id => json(`BASE_ITEM_DB.find(b => b.id === '${id}').slot`) === '투구'), 'only the weapon slot leans');
const finalWeight = json(`['starfall_ballista', 'meteor_repeater', 'tempestlord_lance'].map(id => { const info = getBaseChainInfo(BASE_ITEM_DB.find(b => b.id === id)); return [info.step, info.total]; })`);
assert.deepStrictEqual(finalWeight, [[6, 7], [7, 7], [6, 6]], 'the seven-step bow line keeps its sixth step an ordinary drop (only chain tops are rare)');

// 6. 뿌리촉수: 든 무기 = 대분류. 마흔에 하나꼴로 드물게 나오고(2026-10-07 사용자 요청), 처치마다 weaponDropChance 확률로
//    제 대분류 무기를 하나 따로 떨군다. 보통 장비 드랍의 칸은 다른 적처럼 아홉 칸 중 하나다(무기 칸이면 제 대분류 바탕).
assert.strictEqual(run(`getRootMonsterWeapon({ spriteVariantId: 'root-scimitar' })`), 'scimitar');
assert.strictEqual(run(`getRootMonsterWeapon({ spriteVariantId: 'act1-ant' })`), null);
assert.strictEqual(run('getRootMonsterWeapon(null)'), null);
assert.deepStrictEqual(json('ROOT_MONSTER_RULES'), { spawnOneIn: 40, weaponDropChance: 0.25 });
const rootSeeds = json(`Array.from({ length: 4000 }, (_, seed) => seed).filter(seed => getRootMonsterVisualDefinition(seed)).length`);
assert.strictEqual(rootSeeds, 100, 'one monster seed in forty is a weapon root');
const weaponShare = (enemy, n) => json(`(() => {
    const keep = Math.random;
    let weapons = 0;
    try {
        for (let i = 0; i < ${n}; i++) { Math.random = () => (i + 0.5) / ${n}; if (getEquipmentDropSlot({}, ${JSON.stringify(enemy)}) === '무기') weapons++; }
    } finally { Math.random = keep; }
    return weapons / ${n};
})()`);
for (const variant of ['root-orb', 'act3-ant']) {
    assert(Math.abs(weaponShare({ spriteVariantId: variant }, 900) - 1 / 9) < 0.002, `${variant}: the ordinary equipment roll is even`);
}
const rootPicks = json(`(() => {
    const keep = Math.random, keepPick = grantEquipmentPick;
    let state = 7, picks = [];
    Math.random = () => { state = (state * 16807) % 2147483647; return (state - 1) / 2147483646; };
    grantEquipmentPick = (enemy, zone, minimumRarity, slot) => { picks.push(slot); return []; };
    try {
        for (let i = 0; i < 40000; i++) grantRootWeaponPick({ spriteVariantId: 'root-flask' }, getZone(9));
        for (let i = 0; i < 4000; i++) grantRootWeaponPick({ spriteVariantId: 'act3-ant' }, getZone(9));
    } finally { Math.random = keep; grantEquipmentPick = keepPick; }
    return picks;
})()`);
assert(rootPicks.every(slot => slot === '무기'), 'the root drop is a weapon');
assert(Math.abs(rootPicks.length / 40000 - 0.25) < 0.01, `a root drops its weapon on a quarter of its kills (${rootPicks.length}/40000), other monsters never`);
run('showGameToast = () => {};'); // 화면 알림은 검사 밖
const drops = json(`(() => {
    resetGame();
    let state = 20261002;
    const keep = Math.random;
    Math.random = () => {
        state = (state + 0x6D2B79F5) | 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    try {
        const zone = getZone(9), enemy = { spriteVariantId: 'root-flask', isElite: false, isBoss: false };
        return Array.from({ length: 300 }, () => generateEquipmentDrop(enemy, { zone, slot: '무기' }))
            .map(item => ({ slot: item.slot, rarity: item.rarity, category: getWeaponCategoryId(item) }));
    } finally { Math.random = keep; }
})()`);
const weaponDrops = drops.filter(item => item.slot === '무기');
assert.strictEqual(weaponDrops.length, drops.length, 'the weapon pick is a weapon');
const crafted = weaponDrops.filter(item => item.rarity !== 'unique');
assert(crafted.length > 0 && crafted.every(item => item.category === 'flask'), 'and those weapons are flasks (uniques aside)');

// 7. 던지는 플라스크 스킬은 모두 포션 스킬(포션 스킬 피해 · 폭약술사 · 포션 키스톤이 든다).
const potionSkills = json(`Object.entries(SKILL_DB).filter(([, s]) => (s.tags || []).includes('potion')).map(([name]) => name)`);
assert.deepStrictEqual(potionSkills.sort(), ['과냉각 혼합물', '빈 플라스크', '원소 포션 투척', '탄성 플라스크', '폭발 혼합물'].sort());
assert.strictEqual(run(`getPassiveKeystoneCombatFlags(SKILL_DB['빈 플라스크'].tags).potionOverdose !== undefined`), true);

// 8. 플라스크 · 향로 고유 장비 셋씩: 제 대분류 바탕, 플라스크는 민첩과 지능, 향로는 힘과 지능.
const uniques = json(`UNIQUE_DB.filter(u => ['flask', 'censer'].includes(WEAPON_BASE_CATEGORIES[(UNIQUE_EQUIPMENT_RULES[u.name] || {}).baseId]))
    .map(u => ({ name: u.name, cat: WEAPON_BASE_CATEGORIES[UNIQUE_EQUIPMENT_RULES[u.name].baseId], attr: UNIQUE_EQUIPMENT_RULES[u.name].attributes, key: u.uniqueEffectKey }))`);
for (const [category, pair] of [['flask', ['dexterity', 'intelligence']], ['censer', ['strength', 'intelligence']]]) {
    const own = uniques.filter(u => u.cat === category);
    assert.strictEqual(own.length, 3, `${category}: three uniques`);
    own.forEach(u => assert.deepStrictEqual(Object.keys(u.attr).sort(), pair.slice().sort(), `${u.name} asks for ${pair.join(' and ')}`));
}

// 9. 대분류 전용 옵션(2026-10-07 드랍 풀 1단계): MOD_DB weaponCategories의 대분류 무기에만 붙고(대분류마다 둘), 대분류에
//    어울리지 않는 줄(WEAPON_CATEGORY_OFF_MODS)은 가중치 1/4로 덜 붙는다. 반지 같은 다른 부위에는 대분류 줄이 없다.
const categoryMods = json(`MOD_DB.filter(mod => mod.weaponCategories).map(mod => ({ id: mod.id, cats: mod.weaponCategories, slots: mod.slots }))`);
assert.strictEqual(categoryMods.length, 12, 'two lines per category');
categoryMods.forEach(mod => {
    assert(mod.cats.every(cat => categories[cat]), `${mod.id} names a real category`);
    assert.deepStrictEqual(mod.slots, ['무기'], `${mod.id} is a weapon line`);
});
const offMods = json('WEAPON_CATEGORY_OFF_MODS');
for (const [cat, ids] of Object.entries(offMods.byCategory)) {
    assert(categories[cat], `${cat} is a category`);
    ids.forEach(id => assert(run(`MOD_DB.some(mod => mod.id === '${id}' && mod.slots.includes('무기'))`), `${id} is an existing weapon line`));
}
const sampleBase = cat => run(`BASE_ITEM_DB.find(b => WEAPON_BASE_CATEGORIES[b.id] === '${cat}' && !(b.baseStats || []).some(s => String(s.id).startsWith('summon'))).id`);
for (const cat of Object.keys(categories)) {
    const pool = json(`(() => {
        const item = createItemFromBase(BASE_ITEM_DB.find(b => b.id === '${sampleBase(cat)}'), 'rare', 20);
        item.stats = [];
        return getAvailableMods(item).map(mod => ({ id: mod.id, cats: mod.weaponCategories || null, weight: Number(mod.weight) || 1 }));
    })()`);
    const own = pool.filter(mod => mod.cats);
    assert.strictEqual(own.length, 2, `${cat}: its two category lines are in the pool`);
    assert(own.every(mod => mod.cats.includes(cat)), `${cat}: no other category's lines`);
    for (const id of offMods.byCategory[cat] || []) {
        const row = pool.find(mod => mod.id === id);
        if (row) assert.strictEqual(row.weight, run(`Number(MOD_DB.find(mod => mod.id === '${id}').weight) || 1`) * offMods.weight, `${cat}: ${id} weighs a quarter`);
    }
}
assert.strictEqual(run(`(() => { const item = createItemFromBase(BASE_ITEM_DB.find(b => b.slot === '반지'), 'rare', 20); item.stats = [];
    return getAvailableMods(item).filter(mod => mod.weaponCategories).length; })()`), 0, 'a ring never gets a category line');

console.log(`weapon categories: ${weaponBases.length} weapon bases in 6 categories from tier 1 to 20, footprints, item titles, potion skills, ` +
    `flask and censer uniques, root drops (${weaponDrops.length}/${drops.length} weapons), category lines: OK`);
