// 생장 아이템 생성: 드랍, 고유, 타락 결과.
// 기존 옵션 풀(MOD_DB)·베이스 롤(rollBaseStats)·등급 규칙을 그대로 재사용하고,
// 생장판 고유 요소(종류/태그/형태)만 추가한다.

// 종류별 옵션 풀 매핑 (spec 15: 무기 전용 → 꽃, 방어구/방패 → 가지, 장신구 → 잎).
const GROWTH_CATEGORY_MOD_SLOTS = {
    flower: ['무기', '장갑'],
    branch: ['갑옷', '방패', '투구'],
    leaf: ['목걸이', '반지', '신발', '허리띠'],
    fruit: ['반지', '목걸이'], root: ['갑옷', '방패', '투구'],
    thorn: ['무기', '장갑'], stem: ['신발', '장갑'],
    spore: ['목걸이', '반지'], seed: ['반지', '허리띠'],
    vine: ['허리띠', '목걸이', '신발']
};

function getGrowthCategoryModSlots(category) {
    // 석판은 옵션 풀이 없다 — 정체성이 곧 효과라 제작으로 바뀌지 않는다.
    if (category === 'slab') return [];
    return GROWTH_CATEGORY_MOD_SLOTS[category] || ['목걸이'];
}

// 제작 계열 판정을 위한 내부 슬롯 매핑 (화석 풀·혼돈 주입기·방어 타입 제한이 이 값을 읽는다).
// 사용자에게는 노출하지 않는다 — 표시용 라벨은 getItemSlotDisplayLabel이 종류로 만든다.
function getGrowthCraftSlot(category) {
    return (GROWTH_CATEGORY_INFO[category] || {}).craftSlot || '목걸이';
}

/** 마법은 1줄, 희귀는 2줄이다. 형태 크기는 베이스 성능과 공간 비용으로 보상한다. */
function getGrowthItemAffixCap(item) {
    if (!isGrowthItem(item)) return 6;
    let cap = getGrowthCategoryAffixCap(item.growthCategory);
    if (cap <= 0) return 0;
    if (item.rarity === 'magic') return Math.min(1, cap);
    if (item.rarity === 'normal') return 0;
    return cap;
}

function isGrowthBaseUnlockedAtTier(base, tier) {
    if (!base) return false;
    return tier >= Math.max(1, Math.floor(base.reqTier || 1));
}

// 콘텐츠별 드랍 성향 (spec 23): 지역 종류에 따라 선호 종류/태그 가중치를 준다.
const GROWTH_ZONE_DROP_BIAS = {
    labyrinth: { tags: ['벽', '방어'], categories: ['branch', 'root', 'thorn'] },
    beehive: { tags: ['소환수', '상태이상', '군집'], categories: ['spore', 'seed', 'fruit'] },
    chaosRealm: { tags: ['카오스', '폭발', '상태이상'], categories: ['flower', 'thorn', 'spore'] },
    underworld: { tags: ['방어', '회복'], categories: ['root', 'stem'] },
    cosmos: { tags: ['원소', '변환', '연결'], categories: ['leaf', 'fruit', 'vine'] },
    timeRift: { tags: ['성장'], categories: ['flower', 'branch', 'leaf', 'seed', 'stem', 'vine'] }
};

function getGrowthDropWeight(base, zone) {
    let bias = GROWTH_ZONE_DROP_BIAS[(zone || {}).type];
    if (!bias) return 1;
    let weight = 1;
    if ((bias.categories || []).includes(base.category)) weight *= 2.2;
    if ((bias.tags || []).some(tag => (base.tags || []).includes(tag))) weight *= 1.8;
    return weight;
}

function pickGrowthBaseForDrop(tier, preferredCategory) {
    let zone = (typeof getZone === 'function' ? getZone(game.currentZoneId) : null) || {};
    let candidates = GROWTH_BASE_DB.filter(base => isGrowthBaseUnlockedAtTier(base, tier)
        && (!preferredCategory || base.category === preferredCategory));
    if (candidates.length === 0) candidates = GROWTH_BASE_DB.filter(base => isGrowthBaseUnlockedAtTier(base, tier));
    if (candidates.length === 0) candidates = GROWTH_BASE_DB.filter(base => (base.reqTier || 1) <= 1);
    if (candidates.length === 0) return null;
    let weights = candidates.map(base => getGrowthDropWeight(base, zone));
    let total = weights.reduce((sum, value) => sum + value, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

function pickGrowthWeightedEntry(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    let weights = candidates.map(row => Math.max(0.001, Number(row.weight) || 1));
    let roll = Math.random() * weights.reduce((sum, value) => sum + value, 0);
    for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

function createGrowthItemFromBase(base, rarity, tier, options) {
    if (!base) return null;
    let zoneTier = Math.max(1, Math.floor(Number(tier) || 1));
    let affixTierFloor = Math.max(1, Math.min(zoneTier, Math.floor(Number(options && options.affixTierFloor) || 1)));
    itemIdCounter++;
    let item = {
        id: itemIdCounter,
        growthBaseId: base.id,
        growthShapeId: base.shapeId,
        growthCategory: base.category,
        slot: getGrowthCraftSlot(base.category),
        baseId: null,
        baseName: base.name,
        name: base.name,
        rarity: rarity,
        itemTier: zoneTier,
        hiddenTier: zoneTier,
        affixTierCap: zoneTier,
        baseStats: rollBaseStats(base, zoneTier),
        stats: [],
        growthTags: [],
        growthRemovedTags: []
    };
    if (rarity === 'magic' || rarity === 'rare') rerollExplicitMods(item, rarity, zoneTier, { minTier: affixTierFloor });
    updateItemName(item);
    return item;
}

function generateGrowthUniqueItem(tier, forcedName) {
    let zoneTier = Math.max(1, Math.floor(Number(tier) || 1));
    let pool = GROWTH_UNIQUE_DB.filter(unique => zoneTier >= (unique.reqTier || 1));
    let unique = forcedName ? GROWTH_UNIQUE_DB.find(row => row && row.name === forcedName) : null;
    if (!unique) unique = pickGrowthWeightedEntry(pool.length > 0 ? pool : GROWTH_UNIQUE_DB.slice(0, 1));
    if (!unique) return null;
    let base = unique.baseId ? GROWTH_BASE_DB.find(row => row && row.id === unique.baseId) : null;
    let category = unique.category || (base ? base.category : 'flower');
    let shapeId = unique.shapeId || (base ? base.shapeId : 'dot1');
    itemIdCounter++;
    let item = {
        id: itemIdCounter,
        growthBaseId: base ? base.id : null,
        growthShapeId: shapeId,
        growthCategory: category,
        slot: getGrowthCraftSlot(category),
        baseId: null,
        baseName: base ? base.name : unique.name,
        name: unique.name,
        rarity: 'unique',
        itemTier: Math.max(zoneTier, unique.reqTier || 1),
        hiddenTier: Math.max(zoneTier, unique.reqTier || 1),
        baseStats: base ? rollBaseStats(base, Math.max(zoneTier, unique.reqTier || 1)) : [],
        stats: [],
        growthTags: Array.isArray(unique.tags) ? unique.tags.slice() : [],
        growthRemovedTags: [],
        uniqueEffect: unique.uniqueEffect || '',
        uniqueEffectKey: unique.uniqueEffectKey || '',
        uniqueEffectParams: unique.uniqueEffectParams ? JSON.parse(JSON.stringify(unique.uniqueEffectParams)) : null,
        growthEffectKey: unique.growthEffectKey || null,
        growthChase: !!unique.chase,
        flavorText: unique.flavorText || ''
    };
    (unique.stats || []).forEach(stat => {
        let rolled = rollUniqueStatValue(stat);
        item.stats.push({ id: stat.id, val: rolled.val, valMin: rolled.min, valMax: rolled.max, tier: 0, statName: getStatName(stat.id) });
    });
    return item;
}

// ── 석판 생성 ────────────────────────────────────────────────────────────
// 석판은 옵션·등급·품질이 없다. 정체성이 곧 효과이며 제작 대상이 아니다.
function pickGrowthSlabDef(tier) {
    let candidates = GROWTH_SLAB_DB.filter(def => (def.reqTier || 1) <= tier);
    if (candidates.length === 0) candidates = GROWTH_SLAB_DB.filter(def => (def.reqTier || 1) <= 1);
    return pickGrowthWeightedEntry(candidates);
}

function createGrowthSlabItem(tier) {
    let zoneTier = Math.max(1, Math.floor(Number(tier) || 1));
    let def = pickGrowthSlabDef(zoneTier);
    if (!def) return null;
    itemIdCounter++;
    return {
        id: itemIdCounter,
        growthSlabId: def.id,
        growthShapeId: 'dot1',
        growthCategory: 'slab',
        growthBaseId: null,
        slot: null,
        baseId: null,
        baseName: def.name,
        name: def.name,
        rarity: def.chase ? 'unique' : 'magic',
        itemTier: zoneTier,
        hiddenTier: zoneTier,
        baseStats: [],
        stats: [],
        growthTags: ['석판'],
        growthRemovedTags: [],
        growthChase: !!def.chase,
        flavorText: def.flavorText || ''
    };
}

/** 일반 석판의 문양을 같은 티어 이하의 다른 일반 석판으로 재각인한다. */
function reforgeGrowthSlabDefinition(item) {
    if (!isGrowthSlab(item) || item.growthChase) return null;
    let tier = Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier) || 1));
    let pool = GROWTH_SLAB_DB.filter(def => !def.chase && def.id !== item.growthSlabId
        && (def.reqTier || 1) <= tier);
    let def = pickGrowthWeightedEntry(pool);
    if (!def) return null;
    item.growthSlabId = def.id;
    item.baseName = def.name;
    item.name = def.name;
    item.flavorText = '';
    return def;
}

// 석판이 드랍에서 차지하는 비중. 너무 흔하면 레벨 인플레가, 너무 귀하면 시스템 체감이 사라진다.
const GROWTH_SLAB_DROP_RATE = 0.10;

function rollGrowthDropRarity(enemy) {
    let roll = Math.random();
    if (enemy && enemy.isBoss) {
        if (roll < 0.04) return 'unique';
        return roll < 0.36 ? 'rare' : (roll < 0.80 ? 'magic' : 'normal');
    }
    if (enemy && enemy.isElite) {
        if (roll < 0.02) return 'unique';
        return roll < 0.24 ? 'rare' : (roll < 0.62 ? 'magic' : 'normal');
    }
    if (roll < 0.006) return 'unique';
    return roll < 0.09 ? 'rare' : (roll < 0.30 ? 'magic' : 'normal');
}

function generateGrowthDrop(enemy) {
    let zone = (typeof getZone === 'function' ? getZone(game.currentZoneId) : null) || {};
    let tierCap = typeof getRealmEquipmentHiddenTierCap === 'function' ? getRealmEquipmentHiddenTierCap(zone) : Math.max(1, Math.floor(zone.tier || 1));
    let dropTier = typeof rollRealmItemDropTier === 'function' ? rollRealmItemDropTier(zone, enemy) : tierCap;
    if (Math.random() < GROWTH_SLAB_DROP_RATE) {
        let slab = createGrowthSlabItem(dropTier);
        if (slab) return slab;
    }
    let rarity = rollGrowthDropRarity(enemy);
    if (rarity === 'unique') {
        let unique = generateGrowthUniqueItem(dropTier);
        if (unique) return unique;
        rarity = 'rare';
    }
    let base = pickGrowthBaseForDrop(dropTier);
    if (!base) return null;
    let affixTierRange = typeof getDroppedAffixTierRange === 'function'
        ? getDroppedAffixTierRange(dropTier)
        : { min: Math.max(1, dropTier - 4), max: dropTier };
    let item = createGrowthItemFromBase(base, rarity, dropTier, { affixTierFloor: affixTierRange.min });
    if (!item) return null;
    if (typeof maybeApplyExceptionalBase === 'function') maybeApplyExceptionalBase(item);
    if (typeof maybeApplyDroppedFossilExclusiveAffix === 'function') item = maybeApplyDroppedFossilExclusiveAffix(item, enemy, dropTier);
    if (typeof maybeApplyChaosRealmEncroachment === 'function') item = maybeApplyChaosRealmEncroachment(item, enemy, zone);
    return item;
}

// ── 타락 (spec 18) ───────────────────────────────────────────────────────
// 타락은 저장 형태를 바꾸지 않고 태그·옵션·회전 봉인으로 갈린다.
const GROWTH_CORRUPTION_OUTCOMES = [
    { weight: 22, key: 'addAffix' },
    { weight: 16, key: 'empowerAffix' },
    { weight: 12, key: 'addTag' },
    { weight: 8, key: 'removeTag' },
    { weight: 10, key: 'lockRotation' },
    { weight: 22, key: 'nothing' },
    { weight: 6, key: 'destroy' },
    { weight: 4, key: 'grow' }
];

const GROWTH_CORRUPTION_TAG_POOL = ['폭발', '연쇄', '반복', '충전', '보호막', '반격', '이동', '상태이상', '회복', '변환'];

function pickGrowthCorruptionOutcome(item) {
    let pool = GROWTH_CORRUPTION_OUTCOMES.filter(row => {
        if (row.key === 'lockRotation') return !item.rotationLocked;
        if (row.key === 'removeTag') return getGrowthItemTags(item).size > 1;
        return true;
    });
    let total = pool.reduce((sum, row) => sum + row.weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
        roll -= pool[i].weight;
        if (roll <= 0) return pool[i].key;
    }
    return 'nothing';
}

function applyGrowthCorruptionOutcome(item) {
    let outcome = pickGrowthCorruptionOutcome(item);
    if (outcome === 'destroy') {
        destroySelectedCraftItem(item);
        return addLog('💥 타락: 아이템이 파괴되었습니다.', 'attack-monster');
    }
    if (outcome === 'addAffix') return applyGrowthCorruptionAffix(item, false);
    if (outcome === 'empowerAffix') return applyGrowthCorruptionAffix(item, true);
    if (outcome === 'addTag') {
        let owned = getGrowthItemTags(item);
        let candidates = GROWTH_CORRUPTION_TAG_POOL.filter(tag => !owned.has(tag));
        if (candidates.length === 0) return addLog('🩸 타락: 변화가 없습니다.', 'attack-monster');
        let tag = rndChoice(candidates);
        item.growthTags = (Array.isArray(item.growthTags) ? item.growthTags : []).concat([tag]);
        return addLog(`🩸 타락: [${tag}] 태그가 추가되었습니다.`, 'loot-unique');
    }
    if (outcome === 'removeTag') {
        let tags = Array.from(getGrowthItemTags(item));
        let tag = rndChoice(tags);
        item.growthRemovedTags = (Array.isArray(item.growthRemovedTags) ? item.growthRemovedTags : []).concat([tag]);
        return addLog(`🩸 타락: [${tag}] 태그가 사라졌습니다.`, 'attack-monster');
    }
    if (outcome === 'lockRotation') {
        item.rotationLocked = true;
        (item.baseStats || []).forEach(stat => {
            if (stat && Number.isFinite(Number(stat.val))) stat.val = Number((Number(stat.val) * 1.25).toFixed(2));
        });
        return addLog('🩸 타락: 회전이 봉인된 대신 베이스 옵션이 25% 강해졌습니다.', 'loot-unique');
    }
    if (outcome === 'grow') {
        item.growthTags = (Array.isArray(item.growthTags) ? item.growthTags : []).concat(['만개']);
        (item.baseStats || []).forEach(stat => {
            if (stat && Number.isFinite(Number(stat.val))) stat.val = Number((Number(stat.val) * 1.4).toFixed(2));
        });
        return addLog('🩸 타락: 아이템이 만개해 베이스 옵션이 40% 강해졌습니다! (매우 희귀)', 'loot-unique');
    }
    return addLog('🩸 타락: 아이템에 변화가 생기지 않았습니다.', 'attack-monster');
}

function applyGrowthCorruptionAffix(item, empowerExisting) {
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (empowerExisting && item.stats.length > 0) {
        let stat = rndChoice(item.stats);
        stat.val = Number((Number(stat.val || 0) * 1.3).toFixed(2));
        stat.corruptedEmpower = true;
        return addLog(`🩸 타락: ${stat.statName || getStatName(stat.id)} 옵션이 30% 강해졌습니다.`, 'loot-unique');
    }
    let mod = pickWeightedMod(getAvailableMods(item));
    if (!mod) return addLog('🩸 타락: 부여 가능한 추가 옵션이 없습니다.', 'attack-monster');
    item.stats.push(rollAffixValue(mod, getItemCraftTier(item)));
    updateItemName(item);
    return addLog('🩸 타락: 추가 옵션이 부여되었습니다. (옵션 상한 초과 가능)', 'loot-unique');
}

safeExposeGlobals({
    getGrowthCategoryModSlots, getGrowthCraftSlot, getGrowthItemAffixCap, isGrowthBaseUnlockedAtTier,
    pickGrowthBaseForDrop, createGrowthItemFromBase, generateGrowthUniqueItem, generateGrowthDrop,
    applyGrowthCorruptionOutcome, pickGrowthCorruptionOutcome,
    createGrowthSlabItem, pickGrowthSlabDef, reforgeGrowthSlabDefinition
});
