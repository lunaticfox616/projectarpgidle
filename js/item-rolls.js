// 장비 굴림과 장비 손보기(2026-11-10에 js/passives.js의 뒤쪽을 그대로 옮겼다): 옛 저장의 장비 옵션 맞추기, 접사 굴림과 티어, 드롭 장비 만들기,
// 이름 짓기, 해체와 줍기, 주얼, 재화로 장비 고치기. js/passives.js와 js/battle-assets.js 뒤에 읽어 순서는 옮기기 전과 같다.

/** Save boundary: convert old projectile counts once; stat id records the new percent unit. */
function migrateEquipmentProjectileOption(stat) {
    if (!stat) return;
    if (stat.id === 'projectileExtraShots') {
        stat.id = 'projectileExtraChance';
        for (const key of ['val', 'valMin', 'valMax', 'baseRollMin', 'baseRollMax', 'originalVal']) {
            if (stat[key] !== null && Number.isFinite(Number(stat[key]))) stat[key] = Number(stat[key]) * 50;
        }
        stat.statName = getStatName(stat.id);
    }
    (stat.extraStats || []).forEach(migrateEquipmentProjectileOption);
}

function migrateEquipmentAffixValue(stat, mod, preserveValue = stat.affixBalanceVersion >= 1) {
    const tier = Math.max(1, Math.min(mod.tierValues.length, stat.tier || 1));
    const range = mod.tierValues[tier - 1];
    const [min, max] = Array.isArray(range) ? range : [range, range];
    const oldWidth = stat.valMax - stat.valMin;
    const rank = oldWidth > 0 ? Math.max(0, Math.min(1, (stat.val - stat.valMin) / oldWidth)) : 0.5;
    const step = mod.valueStep || (Number.isInteger(min) && Number.isInteger(max) ? 1 : 0.01);
    // Version 2 only widens tier ranges downwards: keep existing rolls, including crafting bonuses.
    if (!preserveValue) stat.val = Number((min + Math.round(rank * (max - min) / step) * step).toFixed(2));
    Object.assign(stat, {valMin:min, valMax:max, tier, valueStep:step, fixedValue:!!mod.fixedValue,
        sourceModId:mod.id, affixBalanceVersion:mod.affixBalanceVersion, statName:mod.statName || getStatName(stat.id)});
}

function findStoredEquipmentAffix(item, stat) {
    const candidates = MOD_DB.filter(mod => (mod.slots.includes(item.slot) || mod.retiredSlots?.includes(item.slot)) && (mod.statId || mod.id) === stat.id)
        .map(mod => makeDualDefenseAffixMod(item, mod));
    const extraIds = (stat.extraStats || []).map(extra => extra.id);
    return candidates.find(row => row.id === stat.sourceModId)
        || candidates.find(row => getExplicitModStatIds(row).filter(id => id !== stat.id)
            .every(id => extraIds.includes(id)) && (row.compound || []).length === extraIds.length);
}

/** 룬 레벨 줄(2026-10-08, 사용자 "새곡선기준으로해줘"): 예전 값(방패 주문 +1.7~15.4, 소환수 무기 +1~5, 나머지 +1 고정)을
 * 그 줄의 티어에서 새 20티어 곡선(1~8 +1, 9~15 +2, 16~19 +3, 20 +4) 값으로 맞춘다. 맞춘 줄은 버전 3이라 다시 건드리지 않는다. */
function refitGemLevelAffix(item, stat) {
    if (!stat || stat.affixBalanceVersion >= 3 || !/GemLevel$/.test(stat.id)) return;
    const mod = findStoredEquipmentAffix(item, stat);
    if (!mod || !(mod.affixBalanceVersion >= 3)) return;
    const tier = Math.max(1, Math.min(mod.tierValues.length, Math.floor(Number(stat.tier) || 1)));
    const value = mod.tierValues[tier - 1][0];
    Object.assign(stat, { val: value, valMin: value, valMax: value, tier, valueStep: 1, fixedValue: false, sourceModId: mod.id,
        affixBalanceVersion: mod.affixBalanceVersion });
}

function migrateEquipmentAffixBalance(item) {
    [...item.baseStats, ...item.stats, item.underEnchant, item.chaosInfusion].forEach(migrateEquipmentProjectileOption);
    if (item.rarity === 'unique') return;
    // Bench and echo lines keep their authored values, including when their stat ID also exists in MOD_DB.
    for (const stat of item.stats.filter(stat => !stat.oceanBenchOptionId && !stat.isEchoMod)) {
        refitGemLevelAffix(item, stat);
        if (stat.affixBalanceVersion >= 2 || !stat.tier
            || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore) continue;
        const mod = findStoredEquipmentAffix(item, stat);
        if (!mod) continue;
        const preserveValue = stat.affixBalanceVersion >= 1;
        migrateEquipmentAffixValue(stat, mod);
        (stat.extraStats || []).forEach(extra => {
            const sub = mod.compound.find(row => (row.statId || row.id) === extra.id);
            if (sub) migrateEquipmentAffixValue(extra, sub, preserveValue);
        });
    }
}

function syncStoredUniqueEffect(item) {
    if (item.rarity !== 'unique') return;
    const source = UNIQUE_DB.find(unique => unique.syncEffectOnLoad && unique.name === item.name);
    if (!source) return;
    item.uniqueEffect = source.uniqueEffect || '';
    item.uniqueEffectKey = source.uniqueEffectKey || '';
    item.uniqueEffectParams = source.uniqueEffectParams ? JSON.parse(JSON.stringify(source.uniqueEffectParams)) : null;
}

// legacyDamageBase is the pre-2026-09-11 definition. Keep rolled rank and exceptional overflow,
// and mark each base stat once; hidden/affix tiers never determine weapon base strength.
function migrateWeaponBaseDamage(item) {
    if (item.slot !== '무기') return;
    if (item.baseStats.every(stat => stat.baseDamageBalanceVersion >= 1
        || !['flatDmg', 'spellFlatDmg'].includes(stat.id))) return;
    const base = BASE_ITEM_DB.find(row => row.id === item.baseId)
        || BASE_ITEM_DB.find(row => row.slot === '무기' && row.name === item.baseName);
    if (!base || base.slot !== '무기') return;
    for (const stat of item.baseStats) {
        if (stat.baseDamageBalanceVersion >= 1) continue;
        const definition = base.baseStats.find(row => row.id === stat.id && row.legacyDamageBase > 0);
        if (definition) migrateWeaponBaseDamageStat(stat, definition);
    }
}

function migrateWeaponBaseDamageStat(stat, definition) {
    const oldMin = Math.max(1, Math.floor(definition.legacyDamageBase * 0.8));
    const oldMax = Math.max(oldMin, Math.floor(definition.legacyDamageBase * 1.2));
    const nextMin = Math.max(1, Math.floor(definition.base * 0.8));
    const nextMax = Math.max(nextMin, Math.floor(definition.base * 1.2));
    const convert = value => {
        if (value > oldMax) return Math.floor(value * nextMax / oldMax);
        if (value < oldMin) return Math.floor(value * nextMin / oldMin);
        const rank = oldMax > oldMin ? (value - oldMin) / (oldMax - oldMin) : 0.5;
        return nextMin + Math.round(rank * (nextMax - nextMin));
    };
    stat.val = convert(stat.val);
    if (Number.isFinite(stat.originalVal)) stat.originalVal = convert(stat.originalVal);
    Object.assign(stat, {valMin:nextMin, valMax:nextMax, baseRollMin:nextMin, baseRollMax:nextMax,
        baseDamageBalanceVersion:1});
}

/** Convert a saved implicit by roll rank; retain exceptional/quality rolls above the normal maximum. */
function migrateUniqueBaseStat(stat, old) {
    const width = old ? old.valMax - old.valMin : 0;
    const percentile = width > 0 ? clampNumber((old.val - old.valMin) / width, 0, 1) : 0.5;
    const rolled = rollBaseStat(stat, percentile);
    const result = { ...old, ...rolled, originalVal: null };
    if (!old) return result;
    const convert = value => {
        if (value <= old.valMax || old.valMax <= 0) {
            return rollBaseStat(stat, width > 0 ? clampNumber((value - old.valMin) / width, 0, 1) : 0.5).val;
        }
        const valueScale = getBaseStatRollRange(stat).usesDecimalRoll ? 10 : 1;
        return Math.floor(rolled.valMax * value / old.valMax * valueScale) / valueScale;
    };
    result.val = convert(old.val);
    if (Number.isFinite(old.originalVal)) result.originalVal = convert(old.originalVal);
    return result;
}

function migrateUniqueBaseStats(item, base) {
    const remaining = item.baseStats.filter(stat => stat.id !== 'flaskUtilSlots');
    return base.baseStats.map(stat => {
        const index = Math.max(0, remaining.findIndex(row => row.id === stat.id));
        return migrateUniqueBaseStat(stat, remaining.splice(index, 1)[0]);
    });
}

/** Restore old unique bases once; keep the original rolls for recovery, never reroll affixes. */
function migrateUniqueEquipmentIdentity(item) {
    if (item.uniqueEquipmentVersion === 1) return;
    const rule = item.rarity === 'unique' && UNIQUE_EQUIPMENT_RULES[item.name];
    if (!rule) return;
    const base = BASE_ITEM_DB.find(row => row.id === rule.baseId);
    item.uniqueEquipmentVersion = 1;
    if (item.baseId === base.id && item.slot === base.slot) return;
    if (hasLegacyUniqueBaseUpgrade(item, base.slot)) return;
    item.uniqueBaseLegacy ??= { baseId: item.baseId, baseName: item.baseName, slot: item.slot,
        baseStats: JSON.parse(JSON.stringify(item.baseStats)) };
    item.baseStats = migrateUniqueBaseStats(item, base);
    item.baseId = base.id;
    item.baseName = base.name;
    item.slot = base.slot;
    item.exceptionalStatNames = item.baseStats.filter(stat => stat.exceptional).map(stat => stat.statName);
    item.exceptionalBase = item.exceptionalStatNames.length > 0;
    item.exceptionalStatName = item.exceptionalStatNames.join(', ');
    item.exceptionalAllLines = item.exceptionalBase && item.exceptionalStatNames.length === item.baseStats.length;
}

/** The old upgrade action raised itemTier, but left the original hiddenTier unchanged. */
function hasLegacyUniqueBaseUpgrade(item, slot) {
    const previous = BASE_ITEM_DB.find(base => base.id === item.baseId);
    return previous && previous.slot === slot && item.slot === slot
        && item.itemTier > item.hiddenTier && previous.reqTier === item.itemTier;
}

/** 허리띠를 불러올 때: 물약 삭제(2026-10-01)로 쓸 곳이 없는 '유틸리티 플라스크 슬롯' 베이스 옵션을 지우고, 제 액막이 칸 수(1~3)를
 * 적어 둔다(2026-10-11, js/colony-wards.js stampBelt). */
function normalizeBelt(item) {
    item.baseStats = item.baseStats.filter(stat => !stat || stat.id !== 'flaskUtilSlots');
    if (typeof colonyWards === 'object') colonyWards.stampBelt(item);
}

/** Stat ids older data put on item lines, and what they are now: venomStingerBonus (벌집 장비, never a stat) is 중독 피해 증가 since
 * 2026-10-18. The 독벌침 craft's own marker (stat.venomStingerBonus = true) is a property, not an id, and stays. Returns the item
 * (null for none). */
const RETIRED_ITEM_STAT_IDS = Object.freeze({ venomStingerBonus: 'poisonDamageMultiplierPct' });
function renameRetiredItemStatIds(item) {
    if (!item) return null;
    [item.baseStats, item.stats].forEach(list => (Array.isArray(list) ? list : []).forEach(stat => {
        if (!stat || !Object.hasOwn(RETIRED_ITEM_STAT_IDS, stat.id)) return;
        stat.id = RETIRED_ITEM_STAT_IDS[stat.id];
        stat.statName = getStatName(stat.id);
    }));
    if (item.rarity === 'unique' && Object.hasOwn(RENAMED_UNIQUES, item.name)) item.name = RENAMED_UNIQUES[item.name];
    normalizeArmGuardIdentity(item);
    return item;
}

/** Old shield IDs/slot keys remain save-compatible; only the authored equipment names change. */
/** Renamed bases keep their ids (shields became 완갑, 2026-10-23 weapons took their category's noun): old base name → id per slot. */
const RENAMED_BASE_NAMES_BY_SLOT = Object.freeze({ 방패: ARM_GUARD_BASE_LEGACY_NAMES, 무기: WEAPON_BASE_LEGACY_NAMES });
function normalizeArmGuardIdentity(item) {
    const legacyNames = RENAMED_BASE_NAMES_BY_SLOT[item.slot];
    if (!legacyNames) return;
    const previousName = item.baseName || item.name || '';
    const legacy = Object.entries(legacyNames).find(([name]) => name === previousName || name === item.name
        || String(item.name || '').endsWith(' ' + name));
    const base = BASE_ITEM_DB.find(row => row.id === (item.baseId || legacy?.[1]));
    if (!base || base.slot !== item.slot) return;
    item.baseId = base.id;
    item.baseName = base.name;
    const oldName = legacy?.[0] || previousName;
    replaceArmGuardBaseName(item, oldName, base.name);
    if (equipmentCrafting.normalizeImprint(item.imprint)) replaceArmGuardBaseName(item.imprint, oldName, base.name);
}

function replaceArmGuardBaseName(item, previousName, nextName) {
    if (item.rarity === 'unique') return;
    if (!item.name || item.name === previousName) item.name = nextName;
    else if (previousName && item.name.endsWith(' ' + previousName)) item.name = item.name.slice(0, -previousName.length) + nextName;
}

/** 2026-10-23: only guard/focus bracers have innate block; all greatsword bases gain 5%. This is one-time so later altar
 * replacements stay replaced. Affixes, sockets and already converted implicit lines are never rerolled. */
function migrateEquipmentBlockBases(item) {
    if (item.blockBaseVersion >= 1 || !['무기', '방패'].includes(item.slot)) return;
    const base = BASE_ITEM_DB.find(row => row.id === item.baseId || (row.slot === item.slot && row.name === item.baseName));
    if (!base) return;
    migrateVowBlockAffix(item);
    const block = base.baseStats.find(stat => stat.id === 'baseBlockChance');
    if (item.slot === '방패' && !block) {
        item.baseStats = item.baseStats.filter(stat => stat.id !== 'baseBlockChance');
        item.exceptionalStatNames = item.baseStats.filter(stat => stat.exceptional).map(stat => stat.statName);
        item.exceptionalBase = item.exceptionalStatNames.length > 0;
        item.exceptionalStatName = item.exceptionalStatNames.join(', ');
        item.exceptionalAllLines = item.exceptionalBase && item.exceptionalStatNames.length === item.baseStats.length;
    }
    if (item.slot === '무기' && block
        && !item.baseStats.some(stat => stat.id === 'baseBlockChance')) item.baseStats.push({ ...rollBaseStat(block, 0), originalVal: null });
    item.blockBaseVersion = 1;
}

/** 고요한 맹세 keeps its old rolled quality while its original unique multiplier becomes +2~3%p block.
 * A crafted or fused rare line is independent of that authored tier-0 line and keeps its existing percent effect. */
function migrateVowBlockAffix(item) {
    if (item.rarity !== 'unique' || item.name !== '고요한 맹세') return;
    const stat = item.stats.find(row => row.id === 'blockChancePct' && row.tier === 0 && !row.fusedFromRare);
    if (!stat) return;
    stat.id = 'blockChance';
    stat.statName = getStatName(stat.id);
    for (const key of ['val', 'valMin', 'valMax', 'baseRollMin', 'baseRollMax', 'originalVal']) {
        if (Number.isFinite(stat[key])) stat[key] = Number((stat[key] / 10).toFixed(2));
    }
}

/** Retired stat ids renamed, then the slim-saved fields of every line put back (js/item-save-slim.js): the bag, a cloud save and the
 * equipment received from the hall and the stall all pass here. @returns {object|null} the item, or null for nothing */
function renameAndExpandItemLines(item) {
    return renameRetiredItemStatIds(item) ? itemSaveSlim.expandItem(item) : null;
}

function normalizeItem(item) {
    if (!renameAndExpandItemLines(item)) return null;
    if (typeof bagItems === 'object' && bagItems.ownShape(item)) return bagItems.normalize(item); // 가방의 주얼과 코어는 제 모양(js/bag-items.js)
    function coerceFiniteNumber(value, fallback) {
        let num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    }
    function normalizeStatRecord(stat) {
        if (!stat || !stat.id) return null;
        let val = coerceFiniteNumber(stat.val, NaN);
        if (!Number.isFinite(val)) val = coerceFiniteNumber(stat.value, NaN);
        if (!Number.isFinite(val)) val = coerceFiniteNumber(stat.base, NaN);
        if (!Number.isFinite(val)) val = coerceFiniteNumber(stat.amount, 0);
        let min = coerceFiniteNumber(stat.valMin, NaN);
        if (!Number.isFinite(min)) min = coerceFiniteNumber(stat.min, NaN);
        if (!Number.isFinite(min)) min = coerceFiniteNumber(stat.base, val);
        let max = coerceFiniteNumber(stat.valMax, NaN);
        if (!Number.isFinite(max)) max = coerceFiniteNumber(stat.max, NaN);
        if (!Number.isFinite(max)) max = coerceFiniteNumber(stat.base, val);
        if (max < min) max = min;
        let normalized = {
            ...stat,
            val: val,
            valMin: min,
            valMax: max,
            tier: Math.max(0, Math.floor(coerceFiniteNumber(stat.tier, 0))),
            statName: stat.statName || getStatName(stat.id),
            originalVal: coerceFiniteNumber(stat.originalVal ?? NaN, null)
        };
        normalized.craftSource = equipmentCrafting.getSource(stat);
        // 복합 옵션의 추가 스탯도 정규화한다.
        if (Array.isArray(stat.extraStats)) {
            normalized.extraStats = stat.extraStats.map(normalizeStatRecord).filter(Boolean);
            if (normalized.extraStats.length === 0) delete normalized.extraStats;
        }
        return normalized;
    }
    item.baseStats = Array.isArray(item.baseStats) ? item.baseStats.map(normalizeStatRecord).filter(Boolean) : [];
    item.stats = Array.isArray(item.stats) ? item.stats.map(normalizeStatRecord).filter(Boolean) : [];
    let abyssCap = getAbyssSocketCapacity(item);
    if (abyssCap > 0) {
        item.abyssSockets = Array.isArray(item.abyssSockets)
            ? item.abyssSockets.slice(0, abyssCap).map(sock => ({ jewel: (sock && typeof sock.jewel === 'object') ? sock.jewel : null }))
            : [];
    } else {
        item.abyssSockets = [];
    }
    // Corruption socket (2026-10-05): only its shape is kept; a jewel already in it is never dropped.
    if (item.corruptionSocket !== undefined) {
        if (item.corruptionSocket && typeof item.corruptionSocket === 'object') item.corruptionSocket = { jewel: (item.corruptionSocket.jewel && typeof item.corruptionSocket.jewel === 'object') ? item.corruptionSocket.jewel : null };
        else delete item.corruptionSocket;
    }
    item.chaosInfusion = item.chaosInfusion ? normalizeStatRecord(item.chaosInfusion) : null;
    if ('imprint' in item && !equipmentCrafting.normalizeImprint(item.imprint)) delete item.imprint; // 기억 조각칼(js/equipment-crafting.js)
    if (item.encroached && typeof item.encroached === 'object') {
        let pendingOptions = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions.map(normalizeStatRecord).filter(Boolean).slice(0, 3) : [];
        let chosen = item.encroached.chosen ? normalizeStatRecord({ ...item.encroached.chosen, encroachedFinal: true }) : null;
        item.encroached = {
            liberated: !!item.encroached.liberated && !!chosen,
            sourceFloor: Math.max(1, Math.floor(coerceFiniteNumber(item.encroached.sourceFloor, 1))),
            pendingOptions: chosen ? [] : pendingOptions,
            chosen: chosen
        };
    } else item.encroached = null;
    item.rarity = item.rarity || 'magic';
    item.hiddenTier = Math.max(1, Math.floor(coerceFiniteNumber(item.hiddenTier, coerceFiniteNumber(item.itemTier, 1), 1)));
    migrateUniqueEquipmentIdentity(item); migrateEquipmentBlockBases(item);
    const existingHighAffixTier = item.stats.reduce((max, stat) => Math.max(max, Math.floor(coerceFiniteNumber(stat && stat.tier, 0))), 0);
    const storedHighAffixCap = Number.isFinite(Number(item.affixTierCap)) && Number(item.affixTierCap) >= 11;
    const legacyProgressionProvenance = item.dropRealm === 'cosmos' || storedHighAffixCap || existingHighAffixTier >= 11;
    item.dropRealm = typeof item.dropRealm === 'string' ? item.dropRealm : null;
    normalizeItemOrigin(item);
    item.affixTierCap = clampNumber(Math.floor(coerceFiniteNumber(
        item.affixTierCap,
        legacyProgressionProvenance ? item.hiddenTier : Math.min(10, item.hiddenTier)
    )), 1, legacyProgressionProvenance ? 20 : 10);
    if (item.slot === '허리띠') normalizeBelt(item);
    item.baseName = item.baseName || item.name || '알 수 없는 장비';
    item.name = item.name || item.baseName;
    syncStoredUniqueEffect(item);
    item.locked = !!item.locked;
    migrateWeaponBaseDamage(item);
    migrateEquipmentAffixBalance(item);
    item.hallReplica = !!item.hallReplica;
    item.hallRelistBlocked = !!item.hallRelistBlocked;
    if (item.hallReplica) {
        item.locked = true;
        item.tradeLocked = true;
        item.hallSourceId = Math.max(0, Math.floor(coerceFiniteNumber(item.hallSourceId, 0)));
        item.hallAppraisalScore = Math.max(0, Math.floor(coerceFiniteNumber(item.hallAppraisalScore, 0)));
        item.hallCuratorName = String(item.hallCuratorName || '').slice(0, 24);
    }
    if (!item.id) item.id = ++itemIdCounter;
    return levelProgression.stampItem(item);
}

/** 고유는 자기 등급(최대 20)이다. 17등급 이상 고유는 아틀라스와 우주계에서만 나오고, 그곳의 희귀 장비도 20까지 간다(2026-10-09:
 * 예전에는 옵션 등급 정규화의 상한 10에 걸려 20등급 고유가 "등급 T10"으로 보이고 분해 황금률 확률도 8%에서 멈췄다). */
function getUniqueCraftTier(item) {
    return clampNumber(Math.floor(Number(item.hiddenTier || item.itemTier) || 1), 1, 20);
}

function getItemCraftTier(item) {
    if (!item) return 1;
    if (item.rarity === 'unique') return getUniqueCraftTier(item);
    if (Number.isFinite(item.affixTierCap)) return clampNumber(Math.floor(item.affixTierCap), 1, item.affixTierCap >= 11 ? 20 : 10);
    const existingHighAffixTier = (Array.isArray(item.stats) ? item.stats : []).reduce((max, stat) => Math.max(max, Math.floor(Number(stat && stat.tier) || 0)), 0);
    if (existingHighAffixTier >= 11) return clampNumber(Math.max(existingHighAffixTier, Math.floor(Number(item.hiddenTier) || 1)), 11, 20);
    if (Number.isFinite(item.hiddenTier)) return clampNumber(Math.floor(item.hiddenTier), 1, 10);
    if (Number.isFinite(item.itemTier)) return clampNumber(Math.floor(item.itemTier), 1, 10);
    return 1;
}

function getRealmEquipmentHiddenTierCap(zone) {
    if (!zone) return 1;
    const cap = REALM_EQUIPMENT_TIER_CAPS[zone.type];
    return cap ? cap(zone) : Math.min(15, Math.max(1, Math.floor(Number(zone.tier) || 1)));
}
/** The highest equipment tier a plain monster of the zone drops (elites and bosses can roll a little higher). */
function getZoneEquipmentTierCap(zone) {
    if (!zone) return 1;
    const itemLevel = levelProgression.itemLevel(zone, { isBoss: false, isElite: false });
    return Math.min(getRealmEquipmentHiddenTierCap(zone), levelProgression.maxDropTier(itemLevel));
}
function getChaosDepthEquipmentTierCap(depth) {
    return Math.min(15, 10 + Math.floor((Math.max(1, Math.floor(Number(depth) || 1)) - 1) / 5));
}
// 콘텐츠별 장비 베이스 티어 상한(표에 없는 콘텐츠는 전투 tier, 최대 15).
const REALM_EQUIPMENT_TIER_CAPS = Object.freeze({
    act: zone => Math.min(9, Math.max(1, Math.floor(Number(zone.storyOrder) || Number(zone.id) + 1 || 1))),
    abyss: zone => getChaosDepthEquipmentTierCap(zone.depth),
    timeRift: zone => getChaosDepthEquipmentTierCap(zone.equivalentChaosDepth),
    // 전투 tier는 지하계 환산값(첫 지역도 50+)이다. 전리품은 아틀라스에 표시된
    // 1~25 티어를 사용해야 G1~G5가 각각 T16~T20으로 한 단계씩 열린다.
    cosmos: zone => Math.min(20, 16 + Math.floor((Math.max(1, Math.floor(Number(zone.lootTier) || Number(zone.tier) || 1)) - 1) / 5)),
    // 세계수 아틀라스: 지도 등급이 오를수록 T15 → T20 (js/atlas.js lootTier).
    atlasMap: zone => atlas.lootTier(zone.atlasTier)
});

function getRealmEquipmentAffixTierCap(zone, hiddenTierCap) {
    const itemTier = Math.max(1, Math.floor(Number(hiddenTierCap) || 1));
    return Math.min(zone && ['cosmos', 'atlasMap'].includes(zone.type) ? 20 : 15, itemTier);
}

/**
 * @param {{type?: string, storyOrder?: number, id?: number, depth?: number, equivalentChaosDepth?: number, tier?: number}|null} zone
 * @param {{isBoss?: boolean, isElite?: boolean}|null} enemy
 * @returns {{min: number, max: number}}
 */
function getRealmItemDropTierRange(zone, enemy) {
    const maxTier = getRealmEquipmentHiddenTierCap(zone);
    const width = enemy && enemy.isBoss ? 2 : (enemy && enemy.isElite ? 3 : 4);
    return { min: Math.max(1, maxTier - width), max: maxTier };
}

function getDroppedAffixTierRange(itemTier) {
    const maxTier = clampNumber(Math.floor(Number(itemTier) || 1), 1, 20);
    return { min: 1, max: maxTier };
}

const DROPPED_AFFIX_TIER_WEIGHT_FALLOFF = 0.2;

function getCraftTierRangeForItem(item, source) {
    let maxTier = getItemCraftTier(item);
    if (maxTier < 11) return { min: 1, max: maxTier };
    return { min: source === 'spore' ? 9 : 10, max: maxTier };
}

/** Includes legacy special rolls that predate fixedValue metadata. Does not change their values. */
function isFixedEquipmentAffix(stat) {
    if (stat.fixedValue) return true;
    if (!stat.fossilExclusive && !stat.fossilExclusiveDrop && !stat.fossilExclusiveSpore) return false;
    if (stat.fossilExclusive && !stat.tier) return true;
    return FOSSIL_EXCLUSIVE_MODS.some(mod => (mod.statId || mod.id) === stat.id && mod.step === 0);
}

function getTierDisplayLevel(tierValue) {
    return clampNumber(Math.max(1, Math.floor(Number(tierValue) || 1)), 1, 20);
}

/** tier-1 ~ tier-20. 색은 css/layout.css가 T10, T11~T14, T15, T16~T19, T20으로 묶는다. */
function getTierClassName(tierValue) {
    return `tier-${getTierDisplayLevel(tierValue)}`;
}

function getTierBadgeHtml(tierValue, labelPrefix) {
    // 고유 아이템 확정(고정) 옵션은 tier 0 으로 생성된다. 이 경우 T1 대신 U로 표기.
    if (Math.floor(Number(tierValue)) === 0) {
        return `<span class="tier-badge tier-badge-unique" style="color:#ff9f43;">[U]</span>`;
    }
    let tier = getTierDisplayLevel(tierValue);
    let label = labelPrefix || 'T';
    return `<span class="tier-badge ${getTierClassName(tier)}">[${label}${tier}]</span>`;
}

function getUniqueCodexKeyByItem(item) {
    if (!item || item.rarity !== 'unique') return null;
    if (typeof bagItems === 'object' && bagItems.isSpecial(item)) return null; // 고유 주얼과 고유 액막이는 도감에 없다
    return `${item.slot}|${item.name}`;
}

// 고유 아이템 획득 시 도감에 즉시 등록(아이템을 소모하지 않는 수집 기록 개념).
function registerUniqueToCodexOnAcquire(item, owner = game) {
    let key = getUniqueCodexKeyByItem(item);
    if (!key) return false;
    owner.uniqueCodex ??= {};
    let existing = owner.uniqueCodex[key];
    // 이미 옵션까지 기록된 경우 첫 등록 기록을 유지한다(루프 리셋 후 정보만 남은 경우는 다시 채움).
    if (existing && existing.baseName) return false;
    owner.uniqueCodex[key] = JSON.parse(JSON.stringify(item));
    let firstTime = !existing;
    if (!firstTime) return true;
    owner.codexNewlyRegistered ??= {};
    owner.codexNewlyRegistered[key] = true;
    if (owner.noti) owner.noti.codex = true;
    if (owner !== game) return true; // Restore collection history without live UI effects during save migration.
    addLog(_t("📚 도감 신규 등록: <span class='loot-unique'>[{name}]</span>", { name: _t(item.name) }), 'loot-unique');
    if (typeof tryGrantCodexCompletionReward === 'function') tryGrantCodexCompletionReward();
    return true;
}

const EQUIPMENT_DROP_SLOTS = ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠', '방패'];

/** 뿌리촉수 드랍: 후보에 그 무기 대분류 바탕이 있으면 그것만 남긴다(그 지역 단계에 없으면 후보 그대로). */
function keepWeaponCategoryBases(candidates, weaponCategory) {
    const own = weaponCategory ? candidates.filter(base => getWeaponCategoryOfBase(base.id) === weaponCategory) : [];
    return own.length > 0 ? own : candidates;
}

/** 승급 체인 맨 위: 6단계 체인의 6단계(더 긴 체인은 그 맨 위), 또는 20단계 이상 베이스(듀얼 방어구의 4단계 등). */
function isBaseChainTop(base) {
    return getBaseChainRank(getBaseChainInfo(base)) >= 6 || (base.reqTier || 0) >= 20;
}

/** 드랍 후보 베이스의 가중치(data/items.js BASE_DROP_WEIGHTS): 체인 맨 위는 드물게, 드랍 티어보다 한참 낮은 일반 베이스는 덜. */
function getBaseDropWeight(base, dropTier) {
    const rules = BASE_DROP_WEIGHTS;
    if (base.dropOnly || base.realmBase) return (base.reqTier || 0) >= 20 ? rules.contentTop : 1;
    const top = (isBaseChainTop(base) ? rules.chainTop : 1) * getHorizontalBaseDropShare(base);
    return (base.reqTier || 1) < dropTier - rules.windowTiers ? top * rules.belowWindow : top;
}
/** A horizontal base (js/state.js family) drops at BASE_DROP_WEIGHTS.horizontal of a plain one, amulets lower. */
function getHorizontalBaseDropShare(base) {
    const share = BASE_DROP_WEIGHTS.horizontal;
    if (!base.family || !share) return 1;
    return Object.hasOwn(share, base.slot) ? share[base.slot] : share.default;
}

function chooseItemBase(slot, zoneTier, zone = getZone(game.currentZoneId) || {}, weaponCategory) {
    const zoneRealm = zone.type === 'chaosRealm' ? 'chaos' : (zone.type === 'underworld' ? 'underworld' : (zone.type === 'cosmos' ? 'cosmos' : null));
    let candidates = BASE_ITEM_DB.filter(base => {
        // Realm bases retain their equip tier while using the realm's reachable drop tier.
        if (base.slot !== slot || (base.dropOnly?.minTier ?? base.reqTier) > zoneTier) return false;
        if (base.realmBase && base.realmBase !== zoneRealm) return false;
        if (!base.dropOnly) return true;
        if (base.dropOnly.type && zone.type !== base.dropOnly.type) return false;
        if (base.dropOnly.id && zone.id !== base.dropOnly.id) return false;
        if (base.dropOnly.minFloor && Math.floor(zone.floor || 0) < base.dropOnly.minFloor) return false;
        return true;
    });
    if (candidates.length === 0) candidates = BASE_ITEM_DB.filter(base => base.slot === slot && !base.realmBase);
    candidates = keepWeaponCategoryBases(candidates, weaponCategory);
    let weights = candidates.map(base => getBaseDropWeight(base, zoneTier));
    let totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) return rndChoice(candidates);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

function getBaseStatRollRange(stat) {
    let minBase = Number.isFinite(stat.baseMin) ? stat.baseMin : ((stat.base || 0) * 0.8);
    let maxBase = Number.isFinite(stat.baseMax) ? stat.baseMax : ((stat.base || 0) * 1.2);
    let scale = (stat.id === 'energyShield') ? 1.5 : 1;
    let scaledMin = minBase * scale;
    let scaledMax = maxBase * scale;
    let usesDecimalRoll = isTenthStat(stat.id);
    if (scaledMax > 0) {
        let positiveMinimum = usesDecimalRoll ? 0.1 : 1;
        scaledMin = Math.max(positiveMinimum, scaledMin);
        scaledMax = Math.max(scaledMin, scaledMax);
    }
    return { scaledMin, scaledMax, usesDecimalRoll };
}

/** The bounds a base line rolls between, on the line's grid (tenths for leech/regen lines, whole numbers at least 1 for the rest,
 * 기본 피해 at least 1): what rollBaseStat writes as valMin/valMax and baseRollMin/baseRollMax, and what the slim save remakes
 * (js/item-save-slim.js) and the hall base table lists (scripts/export-hall-affix-table.cjs). */
function baseStatRollBounds(stat) {
    let { scaledMin, scaledMax, usesDecimalRoll } = getBaseStatRollRange(stat);
    if (usesDecimalRoll) {
        scaledMin = Math.round(scaledMin * 10) / 10;
        scaledMax = Math.round(scaledMax * 10) / 10;
    } else {
        scaledMin = Math.floor(scaledMin);
        scaledMax = Math.floor(scaledMax);
        if (scaledMax > 0) scaledMin = Math.max(1, scaledMin);
    }
    if (stat.id === 'flatDmg') {
        scaledMin = Math.max(1, scaledMin);
        scaledMax = Math.max(scaledMin, scaledMax);
    }
    return { min: scaledMin, max: scaledMax, usesDecimalRoll };
}

function rollBaseStat(stat, percentile = Math.random()) {
    const { min, max, usesDecimalRoll } = baseStatRollBounds(stat);
    let val;
    if (usesDecimalRoll) {
        const minStep = Math.round(min * 10), maxStep = Math.round(max * 10);
        val = Math.min(maxStep, minStep + Math.floor(percentile * (maxStep - minStep + 1))) / 10;
    } else {
        val = Math.min(max, min + Math.floor(percentile * (max - min + 1)));
    }
    if (stat.id === 'flatDmg') val = Math.max(1, val);
    return {
        id: stat.id,
        val: val,
        valMin: min,
        valMax: max,
        baseRollMin: min,
        baseRollMax: max,
        ...(stat.legacyDamageBase > 0 ? { baseDamageBalanceVersion: 1 } : {}),
        tier: 0,
        statName: getStatName(stat.id)
    };
}

function rollBaseStats(base) {
    return base.baseStats.map(stat => rollBaseStat(stat));
}


/**
 * The value range of one tier of an affix (or a compound line's sub-stat): tierValues rows as listed, otherwise
 * base + tier × step widened by 1.6 steps, on 0.1 steps for leech/regen lines and whole numbers for the rest.
 * @param {object} mod MOD_DB row or a compound sub-stat
 * @param {string} statId
 * @param {number} tier clamped to the tierValues length
 * @param {boolean} [roundInteger] round instead of floor whole-number ranges (crafting sources that ask for it)
 * @returns {{min: number, max: number, step: number, tier: number}}
 */
function getAffixTierRange(mod, statId, tier, roundInteger = false) {
    if (Array.isArray(mod.tierValues)) return getListedAffixTierRange(mod, tier);
    const min = mod.base + (tier * mod.step);
    const max = min + mod.step * 1.6;
    if (isTenthStat(statId)) {
        return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10, step: 0.1, tier };
    }
    const toInt = roundInteger ? Math.round : Math.floor;
    const high = toInt(max);
    return { min: high > 0 ? Math.max(1, toInt(min)) : toInt(min), max: high, step: 1, tier };
}

function getListedAffixTierRange(mod, tier) {
    const effectiveTier = Math.max(1, Math.min(mod.tierValues.length, Math.floor(Number(tier) || 1)));
    const range = mod.tierValues[effectiveTier - 1];
    let min = Array.isArray(range) ? Number(range[0]) : Number(range);
    let max = Array.isArray(range) ? Number(range[1]) : min;
    if (!Number.isFinite(min)) min = Number(mod.base) || 0;
    if (!Number.isFinite(max)) max = min;
    [min, max] = [Math.min(min, max), Math.max(min, max)];
    const step = mod.valueStep >= 1 ? mod.valueStep : getAffixRollStep(mod.statId || mod.id, [min, max]);
    [min, max] = snapAffixRange(min, max, step);
    return { min, max, step, tier: effectiveTier };
}

/** The step a listed option range rolls on (2026-10-27 사용자: 회피 같은 옵션은 정수로만, 저항 관통, 흡혈 캡, 공격 속도 같은 강한 옵션은
 * 소수 한 자리까지, "애초에 그 단위로만"): whole numbers for a WHOLE_ROLL_STAT_IDS stat or ranges of whole numbers, else 0.1. */
function getAffixRollStep(statId, values) {
    return WHOLE_ROLL_STAT_IDS.includes(statId) || values.every(Number.isInteger) ? 1 : 0.1;
}

/** [min, max] with each end on the nearest step (8.51 to 9.7 rolls 9 to 10 on whole steps): a narrow tier keeps some spread,
 * where cutting inward left one value per tier. */
function snapAffixRange(min, max, step) {
    const onStep = value => Number((Math.round(value / step + 1e-9) * step).toFixed(1));
    const low = onStep(min);
    return [low, Math.max(low, onStep(max))];
}

/** One roll inside a base/step range from getAffixTierRange (0.1 or whole-number steps). */
function rollSteppedAffixValue(range) {
    if (range.step === 0.1) {
        const minStep = Math.round(range.min * 10);
        return (minStep + Math.floor(Math.random() * (Math.round(range.max * 10) - minStep + 1))) / 10;
    }
    return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
}

function rollTierValueAffix(mod, statId, tier) {
    const { min, max, step: valueStep, tier: effectiveTier } = getAffixTierRange(mod, statId, tier);
    const val = Number((min + Math.floor(Math.random() * (Math.round((max - min) / valueStep) + 1)) * valueStep).toFixed(2));
    return { id: statId, val, valMin: min, valMax: max, tier: effectiveTier, statName: mod.statName,
        valueStep, fixedValue: !!mod.fixedValue, sourceModId: mod.id, affixBalanceVersion: mod.affixBalanceVersion };
}

function rerollStoredAffixValue(stat) {
    let min = Number(stat && stat.valMin);
    let max = Number(stat && stat.valMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    if (max < min) { let tmp = min; min = max; max = tmp; }
    if (stat.valueStep) {
        // A line rolled before 2026-10-27 may carry 0.01 steps: it rerolls on the option's own step, inside its old range.
        const step = stat.valueStep >= 1 ? stat.valueStep : getAffixRollStep(stat.id, [min, max]);
        [min, max] = snapAffixRange(min, max, step);
        Object.assign(stat, { valMin: min, valMax: max, valueStep: step });
        stat.val = Number((min + Math.floor(Math.random() * (Math.round((max - min) / step) + 1)) * step).toFixed(2));
        return;
    }
    if (isTenthStat(stat.id)) {
        let minStep = Math.round(min * 10);
        let maxStep = Math.round(max * 10);
        stat.val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
        return;
    }
    let minInt = Math.round(min);
    let maxInt = Math.round(max);
    stat.val = minInt + Math.floor(Math.random() * (maxInt - minInt + 1));
}

// 복합 옵션(한 줄에 두 스탯)을 위해, 주 스탯과 동일한 티어로 추가 스탯들을 굴린다.
function rollCompoundExtraStats(mod, tier, roundInteger) {
    if (!mod || !Array.isArray(mod.compound) || mod.compound.length === 0) return null;
    return mod.compound.map(sub => {
        let subId = sub.statId || sub.id;
        if (Array.isArray(sub.tierValues)) return rollTierValueAffix(sub, subId, tier);
        const range = getAffixTierRange(sub, subId, tier, roundInteger);
        return { id: subId, val: rollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier: tier, statName: sub.statName || getStatName(subId) };
    });
}

function rollAffixValue(mod, maxTier, opts) {
    let roundInteger = !!(opts && opts.roundInteger);
    let statId = mod.statId || mod.id;
    let tier = 1;
    maxTier = clampNumber(Math.floor(Number(maxTier) || 1), 1, 20);
    if (Array.isArray(mod.tierValues)) maxTier = Math.min(maxTier, mod.tierValues.length);
    while (tier < maxTier && Math.random() < 0.58) tier++;
    let result;
    if (Array.isArray(mod.tierValues)) {
        result = rollTierValueAffix(mod, statId, tier);
    } else {
        const range = getAffixTierRange(mod, statId, tier, roundInteger);
        result = { id: statId, val: rollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier: tier, statName: mod.statName, fixedValue: !!mod.fixedValue };
    }
    let extras = rollCompoundExtraStats(mod, result.tier, roundInteger);
    if (extras) result.extraStats = extras;
    return result;
}

function pickTierInRangeWeighted(minTier, maxTier, tierWeightFalloff) {
    minTier = Math.max(1, Math.floor(minTier || 1));
    maxTier = Math.max(minTier, Math.floor(maxTier || minTier));
    let requestedFalloff = Number(tierWeightFalloff);
    let falloff = Number.isFinite(requestedFalloff) ? Math.max(0, requestedFalloff) : 0.85;
    let pool = [];
    for (let tier = minTier; tier <= maxTier; tier++) {
        let dist = tier - minTier;
        let weight = 1 / (1 + dist * falloff);
        pool.push({ tier: tier, weight: weight });
    }
    let total = pool.reduce((sum, row) => sum + row.weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
        if (roll < pool[i].weight) return pool[i].tier;
        roll -= pool[i].weight;
    }
    return pool[pool.length - 1].tier;
}

function rollRealmItemDropTier(zone, enemy) {
    const range = getRealmItemDropTierRange(zone, enemy);
    return pickTierInRangeWeighted(range.min, range.max);
}

function rollAffixValueInTierRange(mod, minTier, maxTier, tierWeightFalloff) {
    let statId = mod.statId || mod.id;
    minTier = clampNumber(Math.floor(Number(minTier) || 1), 1, 20);
    maxTier = clampNumber(Math.floor(Number(maxTier) || minTier), minTier, 20);
    if (Array.isArray(mod.tierValues)) {
        maxTier = Math.min(maxTier, mod.tierValues.length);
        minTier = Math.min(minTier, maxTier);
    }
    let tier = pickTierInRangeWeighted(minTier, maxTier, tierWeightFalloff);
    let result;
    if (Array.isArray(mod.tierValues)) {
        result = rollTierValueAffix(mod, statId, tier);
    } else {
        const range = getAffixTierRange(mod, statId, tier);
        result = { id: statId, val: rollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier: tier, statName: mod.statName, fixedValue: !!mod.fixedValue };
    }
    let extras = rollCompoundExtraStats(mod, result.tier, false);
    if (extras) result.extraStats = extras;
    return result;
}


function getImmutableItemSpecialStats(item) {
    if (!item) return [];
    // 타오른 잿불가지의 타락 전용 줄(12번 루프 30, js/ember-corruption.js)과 목걸이에 바른 기름의 노드(루프 36, js/garden-oils.js)도
    // 제작으로 바뀌지 않는 줄이다: 스탯 합, 소환수 한도, 감정에 든다.
    const ember = [...(Array.isArray(item.emberLines) ? item.emberLines : []), ...(typeof gardenOils === 'object' ? gardenOils.lines(item) : [])];
    if (!item.encroached || !item.encroached.liberated || !item.encroached.chosen) return ember;
    let stat = item.encroached.chosen;
    return [{ ...stat, statName: _t('[잠식] {statName}', { statName: stat.statName || getStatName(stat.id) }), encroachedFinal: true }, ...ember];
}
function getItemExplicitOptionCount(item) {
    if (!item) return 0;
    return (Array.isArray(item.stats) ? item.stats.length : 0) + (item.chaosInfusion ? 1 : 0);
}
function getItemOccupiedExplicitModIds(item) {
    let ids = new Set();
    (item && Array.isArray(item.stats) ? item.stats : []).forEach(stat => {
        if (!stat) return;
        if (stat.id) ids.add(stat.id);
        if (Array.isArray(stat.extraStats)) stat.extraStats.forEach(extra => { if (extra && extra.id) ids.add(extra.id); });
    });
    if (item && item.chaosInfusion && item.chaosInfusion.id) ids.add(item.chaosInfusion.id);
    getImmutableItemSpecialStats(item).forEach(stat => {
        if (stat && stat.id) ids.add(stat.id);
    });
    return ids;
}
function applyEncroachmentToItem(item, sourceFloor) {
    if (!item || item.rarity === 'unique' || item.encroached) return item;
    item.encroached = {
        liberated: false,
        sourceFloor: Math.max(1, Math.floor(sourceFloor || 1)),
        pendingOptions: [],
        chosen: null
    };
    return item;
}
function getEncroachmentDropChance(enemy) {
    if (!enemy) return 0;
    if (enemy.isBoss) return 0.10;
    if (enemy.isElite) return 0.04;
    return 0.012;
}
function maybeApplyChaosRealmEncroachment(item, enemy, zone) {
    if (!item || !zone || zone.type !== 'chaosRealm' || item.rarity === 'unique') return item;
    if (Math.random() >= getEncroachmentDropChance(enemy)) return item;
    applyEncroachmentToItem(item, Math.max(1, Math.floor(zone.floor || 1)));
    return item;
}
function getEncroachmentLiberationTier(item) {
    let sourceFloor = Math.max(1, Math.floor(Number(item && item.encroached && item.encroached.sourceFloor) || 1));
    let sourceTier = typeof getChaosRealmTier === 'function' ? getChaosRealmTier(sourceFloor) : 15;
    let sourceZone = { type: 'chaosRealm', tier: sourceTier, floor: sourceFloor };
    let realmCap = getRealmEquipmentAffixTierCap(sourceZone, getRealmEquipmentHiddenTierCap(sourceZone));
    return Math.max(getItemCraftTier(item), realmCap);
}
function rollEncroachmentLiberationOptions(item) {
    if (!item || !item.encroached || item.encroached.liberated) return [];
    let liberationTier = getEncroachmentLiberationTier(item);
    item.encroached.pendingOptions = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions.filter(Boolean).slice(0, 3) : [];
    let pendingMatchesTier = item.encroached.pendingOptions.length > 0
        && item.encroached.pendingOptions.every(option => Math.floor(Number(option && option.tier) || 0) === liberationTier);
    if (pendingMatchesTier) return item.encroached.pendingOptions;
    let existing = getItemOccupiedExplicitModIds(item);
    let pool = getAvailableMods(item).filter(mod => !existing.has(mod.statId || mod.id));
    let picks = pickRandomMods(pool, 3);
    item.encroached.pendingOptions = picks.map(mod => ({ ...rollAffixValueInTierRange(mod, liberationTier, liberationTier), encroachedCandidate: true }));
    return item.encroached.pendingOptions;
}
function liberateSelectedEncroachedItem() {
    let item = getSelectedCraftItem();
    if (!item || !item.encroached) return addLog(_t('잠식된 아이템을 선택하세요.'), 'attack-monster');
    if (item.encroached.liberated) return addLog(_t('이미 잠식 해방이 완료된 아이템입니다.'), 'attack-monster');
    let options = rollEncroachmentLiberationOptions(item);
    if (!options || options.length <= 0) return addLog(_t('해방 가능한 최고 티어 옵션 후보가 없습니다.'), 'attack-monster');
    openEncroachmentLiberationOverlay(item, options);
}

// 잠식 해방: 셋 중 하나를 반드시 골라야 하는 오버레이. 취소 없음.
// 옵션은 한 줄에 하나씩 서서히 공개된다.
function openEncroachmentLiberationOverlay(item, options) {
    game.pendingEncroachmentLiberation = { itemId: item.id };
    let overlay = document.getElementById('encroachment-liberation-overlay');
    if (!overlay) {
        document.body.insertAdjacentHTML('beforeend', '<div id="encroachment-liberation-overlay" style="position:fixed;inset:0;background:rgba(6,4,14,.82);z-index:10000;display:flex;align-items:center;justify-content:center;padding:14px;"></div>');
        overlay = document.getElementById('encroachment-liberation-overlay');
    }
    let rows = options.map((stat, idx) => {
        let label = `${_t(stat.statName || getStatName(stat.id))} +${formatValue(stat.id, stat.val)}`;
        return `<button id="encroach-opt-${idx}" onclick="confirmEncroachmentLiberation(${idx})" disabled style="opacity:0;transform:translateY(12px);transition:opacity .55s ease,transform .55s ease;pointer-events:none;display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 14px;border:1px solid #5a3f8f;border-radius:10px;background:linear-gradient(90deg,rgba(40,24,64,.92),rgba(24,16,40,.92));color:#e7d8ff;font-size:15px;cursor:pointer;"><span>${label}</span><span style="color:#b79bff;font-size:12px;">[T${stat.tier || 10}]</span></button>`;
    }).join('');
    overlay.innerHTML = `<div style="width:min(520px,calc(95vw / var(--scale-display-factor, 1)));background:#120c1e;border:1px solid #6a47b3;border-radius:14px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,.6);">`
        + `<div style="color:#caa6ff;font-size:19px;font-weight:700;margin-bottom:4px;">${_t('잠식 해방')}</div>`
        + `<div style="color:#b9a7d8;font-size:13px;margin-bottom:14px;line-height:1.5;">${_t('[{name}], 최고 티어 옵션 셋 중', { name: item.name })} <strong style="color:#e7d8ff;">${_t('반드시 하나')}</strong>${_t('를 선택해야 합니다.')}</div>`
        + `<div style="display:grid;gap:10px;">${rows}</div>`
        + `<div id="encroach-hint" style="opacity:0;transition:opacity .5s ease;margin-top:12px;color:#9b86c4;font-size:12px;text-align:center;">${_t('옵션이 모두 드러나면 하나를 선택하세요.')}</div>`
        + `</div>`;
    options.forEach((_, idx) => {
        setTimeout(() => {
            let el = document.getElementById(`encroach-opt-${idx}`);
            if (!el) return;
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.disabled = false;
            el.style.pointerEvents = 'auto';
            if (idx === options.length - 1) {
                let hint = document.getElementById('encroach-hint');
                if (hint) hint.style.opacity = '1';
            }
        }, 280 + idx * 620);
    });
}

function confirmEncroachmentLiberation(pickIdx) {
    let pending = game.pendingEncroachmentLiberation;
    if (!pending) return;
    let item = (game.inventory || []).find(v => v && v.id === pending.itemId);
    if (!item) {
        let equipMatch = Object.entries(game.equipment || {}).find(([, eq]) => eq && eq.id === pending.itemId);
        if (equipMatch) item = equipMatch[1];
    }
    if (!item || !item.encroached || item.encroached.liberated) { closeEncroachmentLiberationOverlay(); return; }
    let options = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions : [];
    let idx = Math.floor(Number(pickIdx) || 0);
    if (idx < 0 || idx >= options.length) return;
    let chosen = { ...options[idx], encroachedFinal: true, encroachedCandidate: false };
    item.encroached.liberated = true;
    item.encroached.chosen = chosen;
    item.encroached.pendingOptions = [];
    closeEncroachmentLiberationOverlay();
    addLog(_t('🕳️ 잠식 해방 완료: {value} +{value2} 확정', { value: _t(chosen.statName || getStatName(chosen.id)), value2: formatValue(chosen.id, chosen.val) }), 'loot-unique');
    updateStaticUI();
}

function closeEncroachmentLiberationOverlay() {
    game.pendingEncroachmentLiberation = null;
    let overlay = document.getElementById('encroachment-liberation-overlay');
    if (overlay) overlay.remove();
}
safeExposeGlobals({ liberateSelectedEncroachedItem, openEncroachmentLiberationOverlay, confirmEncroachmentLiberation, closeEncroachmentLiberationOverlay });

const DEFENSE_TYPE_PCT_STAT = { armor: 'armorPct', evasion: 'evasionPct', energyShield: 'energyShieldPct' };
const DEFENSE_PCT_TYPE_STAT = { armorPct: 'armor', evasionPct: 'evasion', energyShieldPct: 'energyShield' };
const DUAL_DEFENSE_AFFIX_RATIO = 0.6;

function getItemBaseDefenseTypes(item) {
    return new Set((item && Array.isArray(item.baseStats) ? item.baseStats : [])
        .map(stat => stat && stat.id)
        .filter(id => id === 'armor' || id === 'evasion' || id === 'energyShield'));
}

function getPrimaryBaseDefenseType(item) {
    let row = (item && Array.isArray(item.baseStats) ? item.baseStats : [])
        .find(stat => stat && (stat.id === 'armor' || stat.id === 'evasion' || stat.id === 'energyShield'));
    return row ? row.id : null;
}

function getDefenseTypeForAffixStat(statId) {
    statId = String(statId || '');
    if (DEFENSE_TYPE_PCT_STAT[statId]) return statId;
    return DEFENSE_PCT_TYPE_STAT[statId] || null;
}

function scaleDefenseCompoundStat(source, statId) {
    const scaledRanges = source.tierValues?.map(range => (Array.isArray(range) ? range : [range, range])
        .map(value => Number((value * DUAL_DEFENSE_AFFIX_RATIO).toFixed(2))));
    const valueStep = getAffixRollStep(statId, scaledRanges ? scaledRanges.flat() : []);
    return {
        statId: statId,
        statName: getStatName(statId),
        base: (Number(source && source.base) || 0) * DUAL_DEFENSE_AFFIX_RATIO,
        step: (Number(source && source.step) || 0) * DUAL_DEFENSE_AFFIX_RATIO,
        affixBalanceVersion: source.affixBalanceVersion,
        valueStep,
        tierValues: scaledRanges?.map((range, index) => index === 0 ? range
            : [Number((scaledRanges[index - 1][1] + valueStep).toFixed(2)), range[1]])
    };
}

function isPrimaryDualDefenseAffixMod(item, mod) {
    let sourceDefenseType = getDefenseTypeForAffixStat(mod && (mod.statId || mod.id));
    let defenseTypes = getItemBaseDefenseTypes(item);
    if (!sourceDefenseType || defenseTypes.size < 2) return true;
    return sourceDefenseType === getPrimaryBaseDefenseType(item);
}

function makeDualDefenseAffixMod(item, mod) {
    let statId = mod && (mod.statId || mod.id);
    let sourceDefenseType = getDefenseTypeForAffixStat(statId);
    let defenseTypes = Array.from(getItemBaseDefenseTypes(item));
    if (!sourceDefenseType || defenseTypes.length < 2 || !defenseTypes.includes(sourceDefenseType)) return mod;
    let extras = Array.isArray(mod.compound) ? mod.compound.slice() : [];
    defenseTypes.forEach(type => {
        if (type === sourceDefenseType) return;
        if (Array.isArray(mod.compound)) {
            extras.push(scaleDefenseCompoundStat(mod, type));
            let ownPct = mod.compound.find(sub => getDefenseTypeForAffixStat(sub && (sub.statId || sub.id)) === sourceDefenseType);
            if (ownPct) extras.push(scaleDefenseCompoundStat(ownPct, DEFENSE_TYPE_PCT_STAT[type]));
            return;
        }
        if (statId === sourceDefenseType) extras.push(scaleDefenseCompoundStat(mod, type));
        if (statId === DEFENSE_TYPE_PCT_STAT[sourceDefenseType]) extras.push(scaleDefenseCompoundStat(mod, DEFENSE_TYPE_PCT_STAT[type]));
    });
    if (extras.length === 0) return mod;
    return { ...mod, compound: extras };
}
// 방어구는 베이스가 가진 방어 타입(방어도/회피/보호막)에 해당하는 옵션만 허용한다.
// 예) 회피 베이스에 방어도(%)가, 방어도 베이스에 회피(%)가 붙지 않도록 막는다.
// 고유 아이템과 방어구가 아닌 슬롯(장신구 등)은 제한 대상에서 제외한다.
function isDefenseTypeStatAllowed(item, statId) {
    let defenseSlots = new Set(['투구', '갑옷', '장갑', '신발', '방패']);
    if (!item || item.rarity === 'unique' || !defenseSlots.has(item.slot)) return true;
    statId = String(statId || '');
    if (item.slot === '방패' && statId === 'blockChancePct') return (item.baseStats || []).some(stat => stat.id === 'baseBlockChance' && stat.val > 0);
    const defenseType = getDefenseTypeForAffixStat(statId);
    if (!defenseType) return true;
    let baseDefenseTypes = getItemBaseDefenseTypes(item);
    return baseDefenseTypes.size <= 0 || baseDefenseTypes.has(defenseType);
}

function isKaleidoscopeShieldItem(item) {
    return !!(item && item.rarity === 'unique' && item.uniqueEffectKey === 'kaleidoscopeShield');
}

function getAvailableModSlotsForItem(item) {
    if (isKaleidoscopeShieldItem(item)) return EQUIPMENT_DROP_SLOTS.slice();
    return [item && item.slot].filter(Boolean);
}

function getExplicitModStatIds(mod) {
    return [mod.statId || mod.id, ...(mod.compound || []).map(sub => sub.statId || sub.id)];
}

/** 무기 대분류 전용 줄(MOD_DB weaponCategories)은 그 대분류 무기에만 붙는다(data/weapon-categories.js). */
function isModForWeaponCategory(mod, weaponCategory) {
    return !mod.weaponCategories || mod.weaponCategories.includes(weaponCategory);
}

/** 세계수 기운(12번 루프 27): 지역 전용 줄(MOD_DB regions, data/region-affixes.js)은 그 지역 아틀라스 지도에서 떨어진 장비에만 붙는다. */
function isModForDropRegion(mod, region) {
    return !mod.regions || mod.regions.includes(region);
}

/** 지역 전용 줄은 그 지역 장비에만, 수호자와 마름의 전용 줄은 그 영향을 띤 장비에만(영향 장비, js/item-influences.js). */
function isModForOrigin(mod, item) {
    return isModForDropRegion(mod, item.dropRegion) && itemInfluences.isModForInfluence(mod, item.influence);
}

/** A known atlas region id (data/atlas.js ATLAS.regions), otherwise null: what an item may remember as its drop region. */
/** Save boundary for where an item came from and what burned it: its atlas region (loop 27) and the burning branch's mark and
 * lines (loop 30, js/ember-corruption.js). */
function normalizeItemOrigin(item) {
    item.dropRegion = normalizeDropRegion(item.dropRegion);
    if (typeof emberCorruption === 'object') emberCorruption.normalize(item);
    if (typeof gardenOils === 'object') gardenOils.normalize(item);
    itemInfluences.normalizeInfluences(item);
}

function normalizeDropRegion(value) {
    const regions = typeof ATLAS === 'object' && ATLAS && Array.isArray(ATLAS.regions) ? ATLAS.regions : [];
    return typeof value === 'string' && regions.some(row => row.id === value) ? value : null;
}

/** The region an equipment drop remembers: an atlas map's region once 세계수 기운 is open, none elsewhere. */
function getEquipmentDropRegion(zone, state = game) {
    if (!zone || zone.type !== 'atlasMap' || !contentProgression.holds('regionAffix', state)) return null;
    return normalizeDropRegion(zone.atlasRegion);
}

/** 대분류에 어울리지 않는 줄(WEAPON_CATEGORY_OFF_MODS)은 가중치를 낮춘 사본으로 돌려준다. */
function weighModForWeaponCategory(mod, weaponCategory) {
    const off = WEAPON_CATEGORY_OFF_MODS.byCategory[weaponCategory];
    if (!off || !off.includes(mod.id)) return mod;
    return { ...mod, weight: (Number(mod.weight) || 1) * WEAPON_CATEGORY_OFF_MODS.weight };
}

// Summon lines on a weapon or ring need a base that already has one of these.
const AVAILABLE_MOD_SUMMON_STAT_IDS = new Set(['summonPctDmg', 'summonFlatDmg', 'summonEfficiency', 'summonHpPct', 'summonCrit', 'summonCritDmg',
    'summonAspd', 'summonCap', 'summonResPen', 'summonGemLevel']);
// The rows an item can take before its own lines are taken out depend only on the key below, so each pool is built once
// (2026-10-07: building it was most of a roll, about 0.18 ms per drop or craft preview). Rows keep MOD_DB order: seeded
// rolls and tests pick by position.
const availableModPools = new Map();

function hasSummonBaseStat(item) {
    return !!(item && Array.isArray(item.baseStats) && item.baseStats.some(stat => stat && AVAILABLE_MOD_SUMMON_STAT_IDS.has(stat.id)));
}

/** Slot, unique, kaleidoscope shield, weapon category, summon base (weapon and ring), base defence types in base order, drop region and
 * influence (js/item-influences.js). */
function getAvailableModPoolKey(item) {
    const summonSlot = item.slot === '무기' || item.slot === '반지';
    return [item.slot, item.rarity === 'unique' ? 'unique' : '', isKaleidoscopeShieldItem(item) ? 'kaleidoscope' : '', getWeaponCategoryId(item) || '',
        summonSlot && hasSummonBaseStat(item) ? 'summon' : '', [...getItemBaseDefenseTypes(item)].join('+'),
        isDefenseTypeStatAllowed(item, 'blockChancePct') ? 'block' : '', item.dropRegion || '', item.influence || ''].join('|');
}

/** Stats this base never takes: deflection without evasion, spell gem levels on a shield without energy shield (the kaleidoscope
 * shield aside), summon lines on a weapon or ring without a summon base stat. */
function getBlockedAvailableModStats(item) {
    const defenseTypes = getItemBaseDefenseTypes(item), blocked = new Set();
    if (!defenseTypes.has('evasion')) { blocked.add('deflectChance'); blocked.add('deflectDamageReduce'); }
    if (item.slot === '방패' && !isKaleidoscopeShieldItem(item) && !defenseTypes.has('energyShield')) blocked.add('spellGemLevel');
    if ((item.slot === '무기' || item.slot === '반지') && !hasSummonBaseStat(item)) AVAILABLE_MOD_SUMMON_STAT_IDS.forEach(id => blocked.add(id));
    return blocked;
}

/** Every row the item's kind can take, each with the stats it would occupy (dual defence parts included). */
function buildAvailableModPool(item) {
    const allowedSlots = getAvailableModSlotsForItem(item), blocked = getBlockedAvailableModStats(item), weaponCategory = getWeaponCategoryId(item);
    return Object.freeze(MOD_DB.filter(mod => isModForWeaponCategory(mod, weaponCategory) && isModForOrigin(mod, item) && !blocked.has(mod.statId || mod.id)
        && isDefenseTypeStatAllowed(item, mod.statId || mod.id) && isPrimaryDualDefenseAffixMod(item, mod)
        && allowedSlots.some(slot => mod.slots.includes(slot))).map(mod => {
        const shaped = makeDualDefenseAffixMod(item, mod);
        return Object.freeze({ mod: weighModForWeaponCategory(shaped, weaponCategory), statIds: getExplicitModStatIds(shaped) });
    }));
}

function getAvailableMods(item) {
    const existing = getItemOccupiedExplicitModIds(item), key = getAvailableModPoolKey(item);
    if (!availableModPools.has(key)) availableModPools.set(key, buildAvailableModPool(item));
    return availableModPools.get(key).filter(row => !row.statIds.some(id => existing.has(id))).map(row => row.mod);
}

/** getAvailableMods 가운데 종류 자리가 남은 줄만(접두 3, 접미 3; data/items.js EXPLICIT_AFFIX_RULES).
 * skip은 교체할 줄을 자리 계산에서만 뺀다. 원본 장비의 중복 옵션 ID 제외는 유지한다. */
function getOpenAffixMods(item, rarity = item.rarity, skip = null) {
    const room = equipmentCrafting.affixRoom(item, rarity, skip);
    return getAvailableMods(item).filter(mod => equipmentCrafting.fitsRoom(room, mod));
}

function updateItemName(item) {
    if (!item) return;
    if (item.rarity === 'normal') item.name = item.baseName;
    else if (item.rarity === 'magic') item.name = `마법의 ${item.baseName}`;
    else if (item.rarity === 'rare') item.name = `희귀한 ${item.baseName}`;
}

function rerollChaosInfusionForItem(item, previousInfusion, side = '') {
    if (!item || !previousInfusion) return null;
    let pool = getChaosInfuserOptionsForItem(item).filter(option => !side || equipmentCrafting.storedAffixKind(item, option) === side);
    if (pool.length === 0) {
        item.chaosInfusion = null;
        return null;
    }
    let option = rndChoice(pool);
    item.chaosInfusion = rollChaosInfusionOption(option);
    return item.chaosInfusion;
}

/** How rerollExplicitMods rolls each new line: options.rollLine (제작 뿌리), else between options.minTier and maxTier with
 * options.tierWeightFalloff, else up to maxTier. */
function rerollLineRoll(options, maxTier) {
    if (options.rollLine) return options.rollLine;
    let minTier = clampNumber(Math.floor(Number(options.minTier) || 1), 1, maxTier);
    let falloff = Number(options.tierWeightFalloff);
    return minTier > 1 || Number.isFinite(falloff)
        ? mod => rollAffixValueInTierRange(mod, minTier, maxTier, falloff)
        : mod => rollAffixValue(mod, maxTier);
}

/** Prepare retained rows and infusion before rolling; a side-only craft preserves every other kind. */
function prepareExplicitReroll(item, options) {
    const side = options.side || '', onSide = stat => !side || equipmentCrafting.storedAffixKind(item, stat) === side;
    let rerollChaosInfusion = !!options.rerollChaosInfusion && (!item.chaosInfusion || onSide(item.chaosInfusion));
    const previousInfusion = item.chaosInfusion;
    if (rerollChaosInfusion) item.chaosInfusion = null;
    let locked = (item.stats || []).filter(stat => equipmentCrafting.keptOnReroll(item, stat) || !onSide(stat));
    item.stats = locked.concat(options.guaranteedStat ? [options.guaranteedStat] : []);
    // 주입을 먼저 다시 굴려 그 종류 자리를 차지하게 한다(접두 3, 접미 3).
    if (rerollChaosInfusion) rerollChaosInfusionForItem(item, previousInfusion, side);
    return side;
}

/** options.weigh(pool, picked) → pool reweighs the mods each pick (제작 뿌리 엮음). */
function rerollExplicitMods(item, rarity, zoneTier, options = {}) {
    const maxTier = Math.max(1, zoneTier), rollLine = rerollLineRoll(options, maxTier);
    const side = prepareExplicitReroll(item, options);
    let count = 0;
    if (rarity === 'magic') count = Math.random() < 0.5 ? 1 : 2;
    if (rarity === 'rare') count = 4 + Math.floor(Math.random() * 2);
    count = Math.max(0, count - getItemExplicitOptionCount(item));
    let mods = pickRandomMods(getAvailableMods(item).filter(mod => !side || equipmentCrafting.affixKind(mod) === side), count, equipmentCrafting.affixRoom(item, rarity), options.weigh);
    mods.forEach(mod => item.stats.push(rollLine(mod)));
    updateItemName(item);
}


const CHAOS_INFUSER_OPTIONS = [
    { optionId: 'weapon_flatDmg', id: 'flatDmg', min: 12, max: 18, currency: 'chaos', cost: 6, label: '무기 기본 피해', slots: ['무기'] },
    { optionId: 'weapon_pctDmg', id: 'pctDmg', min: 18, max: 26, currency: 'chaos', cost: 6, label: '무기 피해 증가', slots: ['무기'] },
    { optionId: 'weapon_aspd', id: 'aspd', min: 8, max: 12, currency: 'alteration', cost: 12, label: '무기 공격 속도', slots: ['무기'] },
    { optionId: 'armor_pctHp', id: 'pctHp', min: 12, max: 18, currency: 'exalted', cost: 1, label: '갑옷 생명력 증가', slots: ['갑옷'] },
    { optionId: 'armor_flatHp', id: 'flatHp', min: 55, max: 80, currency: 'transmute', cost: 18, label: '갑옷/완갑 최대 생명력', slots: ['갑옷', '방패'] },
    { optionId: 'armor_defensePct', id: 'armorPct', min: 18, max: 26, currency: 'augment', cost: 12, label: '갑옷/완갑 방어도 증가', slots: ['갑옷', '방패'] },
    { optionId: 'boots_move', id: 'move', min: 16, max: 22, currency: 'exalted', cost: 1, label: '장화 이동 속도', slots: ['신발'] },
    { optionId: 'boots_evasionPct', id: 'evasionPct', min: 18, max: 26, currency: 'augment', cost: 12, label: '장화 회피 증가', slots: ['신발'] },
    { optionId: 'gloves_aspd', id: 'aspd', min: 8, max: 12, currency: 'alteration', cost: 12, label: '장갑 공격 속도', slots: ['장갑'] },
    { optionId: 'gloves_crit', id: 'crit', min: 4, max: 6, currency: 'exalted', cost: 1, label: '장갑 치명타 확률', slots: ['장갑'] },
    { optionId: 'helmet_flatHp', id: 'flatHp', min: 45, max: 70, currency: 'transmute', cost: 14, label: '투구 최대 생명력', slots: ['투구'] },
    { optionId: 'helmet_critDmg', id: 'critDmg', min: 22, max: 32, currency: 'divine', cost: 1, label: '투구 치명타 피해', slots: ['투구'] },
    { optionId: 'belt_pctHp', id: 'pctHp', min: 10, max: 16, currency: 'exalted', cost: 1, label: '허리띠 생명력 증가', slots: ['허리띠'] },
    { optionId: 'belt_flatHp', id: 'flatHp', min: 50, max: 76, currency: 'transmute', cost: 16, label: '허리띠 최대 생명력', slots: ['허리띠'] },
    { optionId: 'jewelry_pctDmg', id: 'pctDmg', min: 16, max: 24, currency: 'chaos', cost: 6, label: '장신구 피해 증가', slots: ['반지', '목걸이'] },
    { optionId: 'jewelry_resPen', id: 'resPen', min: 4, max: 6, currency: 'chaos', cost: 8, label: '장신구 저항 관통', slots: ['반지', '목걸이'] },
    { optionId: 'res_all', id: 'resAll', min: 4, max: 7, currency: 'chaos', cost: 5, label: '낮은 모든 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'res_fire', id: 'resF', min: 12, max: 18, currency: 'chaos', cost: 5, label: '화염 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'res_cold', id: 'resC', min: 12, max: 18, currency: 'chaos', cost: 5, label: '냉기 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'res_light', id: 'resL', min: 12, max: 18, currency: 'chaos', cost: 5, label: '번개 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'shield_chaos_res', id: 'resChaos', min: 8, max: 12, currency: 'chaos', cost: 6, label: '완갑 카오스 저항', slots: ['방패'] },
    { optionId: 'shield_block_pct', id: 'blockChancePct', min: 16, max: 24, currency: 'augment', cost: 12, label: '기본 막기 확률 증가', slots: ['방패'] }
];
CHAOS_INFUSER_OPTIONS.forEach(option => {
    let merged = Object.entries(CURRENCY_LEGACY_MERGE || {}).find(([, legacyKeys]) => legacyKeys.includes(option.currency));
    if (merged) option.currency = merged[0];
});
function getChaosInfuserOptionsForItem(item) {
    let slot = item && item.slot ? item.slot.replace(/[12]/, '') : '';
    let occupied = getItemOccupiedExplicitModIds(item);
    return CHAOS_INFUSER_OPTIONS.filter(opt => (!opt.slots || opt.slots.includes(slot)) && isDefenseTypeStatAllowed(item, opt.id) && (!occupied.has(opt.id) || (item && item.chaosInfusion && item.chaosInfusion.id === opt.id)))
        .filter(opt => !item || chaosInfusionFitsAffixRoom(item, opt));
}
/** 주입 줄도 접두 3, 접미 3 가운데 제 종류 자리를 쓴다. 이미 있는 주입은 바꿔 끼우므로 빼고 센다. */
function chaosInfusionFitsAffixRoom(item, option) {
    const room = equipmentCrafting.affixRoom(item, 'rare', item.chaosInfusion || null);
    return !room || equipmentCrafting.storedAffixKind(item, { id: option.id }) === 'special'
        || room[equipmentCrafting.storedAffixKind(item, { id: option.id })] > 0;
}
function isChaosInfusionEligibleItem(item) {
    if (!item) return { ok: false, reason: _t('아이템 미선택') };
    if (item.corrupted) return { ok: false, reason: _t('타락된 아이템에는 혼돈 주입을 할 수 없습니다.') };
    if (item.rarity === 'unique') return { ok: false, reason: _t('고유 아이템에는 혼돈 주입을 할 수 없습니다.') };
    if (item.rarity === 'normal' || item.rarity === 'magic') return { ok: false, reason: _t('일반/마법 등급 아이템에는 혼돈 주입을 할 수 없습니다.') };
    if (item.rarity !== 'rare') return { ok: false, reason: _t('희귀 장비에만 혼돈 주입을 할 수 있습니다.') };
    let explicitCount = getItemExplicitOptionCount(item);
    if (!item.chaosInfusion && explicitCount >= EXPLICIT_AFFIX_LINE_CAP) return { ok: false, reason: _t('추가 옵션 6줄 제한에 걸려 더 주입할 수 없습니다.') };
    if (item.chaosInfusion && explicitCount > EXPLICIT_AFFIX_LINE_CAP) return { ok: false, reason: _t('추가 옵션이 6줄을 초과했습니다. 기존 주입을 제거하세요.') };
    return { ok: true, reason: _t('사용 가능') };
}
function rollChaosInfusionOption(option) {
    let min = Number(option && option.min);
    let max = Number(option && option.max);
    if (!Number.isFinite(min)) min = Number(option && option.value) || 0;
    if (!Number.isFinite(max)) max = min;
    if (max < min) { let tmp = min; min = max; max = tmp; }
    let val;
    if (isTenthStat(option.id)) {
        let minStep = Math.round(min * 10);
        let maxStep = Math.round(max * 10);
        val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
        min = minStep / 10;
        max = maxStep / 10;
    } else {
        min = Math.floor(min);
        max = Math.floor(max);
        val = min + Math.floor(Math.random() * (max - min + 1));
    }
    return { id: option.id, val: val, valMin: min, valMax: max, tier: 5, statName: getStatName(option.id), temporary: true, source: 'chaosInfuser', sourceOptionId: option.optionId || option.id };
}
function isChaosInfuserUnlocked() {
    return !!(game.chaosInfuserUnlocked || game.woodsmanSimulatorSeenLoop || (game.woodsmanDefeatAttempts || 0) > 0 || (game.journalEntries || []).includes('woodsman'));
}
function getChaosInfuserOption(optionId) {
    return CHAOS_INFUSER_OPTIONS.find(opt => (opt.optionId || opt.id) === optionId || opt.id === optionId) || null;
}
function getChaosInfusionCost(option, item) {
    if (!option) return null;
    let costs = [{ key: option.currency, amount: option.cost }];
    if (item && item.chaosInfusion) costs.push({ key: 'blightSpore', amount: 1 });
    return costs;
}
function canPayCurrencyCosts(costs) {
    return (costs || []).every(row => (game.currencies[row.key] || 0) >= row.amount);
}
function formatCurrencyCosts(costs) {
    return (costs || []).map(row => `${(ORB_DB[row.key] || {}).name || row.key} ${row.amount}`).join(' + ');
}
function payCurrencyCosts(costs) {
    if (!canPayCurrencyCosts(costs)) return false;
    (costs || []).forEach(row => { game.currencies[row.key] = Math.max(0, Math.floor(game.currencies[row.key] || 0) - row.amount); });
    return true;
}
function applyChaosInfusionToSelectedItem(optionId) { if (game.woodsmanBuildLock) return addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    if (!isChaosInfuserUnlocked()) return addLog(_t('나무꾼을 한 번 이상 마주친 뒤 혼돈 주입을 사용할 수 있습니다.'), 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog(_t('혼돈 주입 대상 아이템을 선택하세요.'), 'attack-monster');
    let eligibility = isChaosInfusionEligibleItem(item);
    if (!eligibility.ok) return addLog(eligibility.reason, 'attack-monster');
    let option = getChaosInfuserOption(optionId);
    if (!option || !P_STATS[option.id]) return;
    if (!getChaosInfuserOptionsForItem(item).some(opt => (opt.optionId || opt.id) === (option.optionId || option.id))) return addLog(_t('이 부위에는 해당 혼돈 주입 옵션을 사용할 수 없습니다.'), 'attack-monster');
    let costs = getChaosInfusionCost(option, item);
    if (!canPayCurrencyCosts(costs)) return addLog(_t('혼돈 주입 재화가 부족합니다. (필요: {costs})', { costs: formatCurrencyCosts(costs) }), 'attack-monster');
    if (!payCurrencyCosts(costs)) return;
    let infusion = rollChaosInfusionOption(option);
    item.chaosInfusion = infusion;
    addLog(_t('🧪 혼돈 주입: [{name}] {id} +{value} 부여', { name: _t(item.name), id: getStatName(option.id), value: formatValue(option.id, infusion.val) }), 'loot-rare');
    normalizeItem(item);
    updateStaticUI();
}
function removeChaosInfusionFromSelectedItem() { if (game.woodsmanBuildLock) return addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item || !item.chaosInfusion) return;
    let costs = [{ key: 'blightSpore', amount: 1 }];
    if (!canPayCurrencyCosts(costs)) return addLog(_t('혼돈 주입 제거에는 {name} 1개가 필요합니다.', { name: _t(ORB_DB.blightSpore.name) }), 'attack-monster');
    if (!payCurrencyCosts(costs)) return;
    item.chaosInfusion = null;
    addLog(_t('🧼 혼돈 주입 제거: [{name}]', { name: _t(item.name) }), 'loot-normal');
    updateStaticUI();
}

window.CHAOS_INFUSER_OPTIONS = CHAOS_INFUSER_OPTIONS;
window.getChaosInfuserOptionsForItem = getChaosInfuserOptionsForItem;
window.isChaosInfusionEligibleItem = isChaosInfusionEligibleItem;
window.getItemExplicitOptionCount = getItemExplicitOptionCount;
window.isChaosInfuserUnlocked = isChaosInfuserUnlocked;
window.getChaosInfusionCost = getChaosInfusionCost;
window.formatCurrencyCosts = formatCurrencyCosts;

function applyEnchantedHoneyToSelectedItem() { if (game.woodsmanBuildLock) return addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog(_t('먼저 아이템을 선택하세요.'), 'attack-monster');
    if (item.fusedRelic) return addLog(_t('융합 유물은 시간에 굳어, 황금률/잿불가지/축복의 꽃잎만 받아들입니다.'), 'attack-monster');
    if ((game.currencies.enchantedHoney || 0) <= 0) return addLog(_t('마력 깃든 벌꿀이 부족합니다.'), 'attack-monster');
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length < 4) return addLog(_t('벌꿀 고정은 추가 옵션이 4개 이상일 때만 사용할 수 있습니다.'), 'attack-monster');
    if (item.stats.some(stat => stat && stat.lockedByHoney)) return addLog(_t('이 장비에는 이미 고정 옵션이 있습니다.'), 'attack-monster');
    let candidates = item.stats.filter(stat => stat && !stat.lockedByRift);
    if (candidates.length <= 0) return addLog(_t('고정 가능한 옵션이 없습니다.'), 'attack-monster');
    let pick = candidates[Math.floor(Math.random() * candidates.length)];
    pick.lockedByHoney = true;
    game.currencies.enchantedHoney--;
    addLog(_t('🍯 [{name}] 옵션 고정 적용: {value}', { name: _t(item.name), value: _t(pick.statName || getStatName(pick.id)) }), 'loot-unique');
    updateStaticUI();
}


/** 독벌침을 쓸 수 없는 까닭. 마법, 희귀, 고유 무기에 쓰고(일반은 줄 한도가 없어 막는다, 고유는 사용자 결정 2026-11-07),
 * 새 줄은 추가 옵션 6줄 안에서만 붙는다(이미 붙은 독벌침 줄은 바꿔 끼우므로 자리를 묻지 않는다). */
function getVenomStingerRefusal(item) {
    if (item.slot !== '무기') return '독벌침은 무기에만 사용할 수 있습니다.';
    if (!['magic', 'rare', 'unique'].includes(item.rarity)) return '독벌침은 마법, 희귀, 고유 무기에만 사용할 수 있습니다.';
    const replaces = (Array.isArray(item.stats) ? item.stats : []).some(stat => stat && stat.venomStingerBonus);
    return !replaces && getItemExplicitOptionCount(item) >= EXPLICIT_AFFIX_LINE_CAP ? '추가 옵션이 6줄이라 독벌침 줄을 붙일 수 없습니다.' : '';
}
const VENOM_STINGER_STAT_IDS = resolveAffixTagList(AFFIX_TAG_LISTS.venomStinger, MOD_DB);
/** 독벌침이 굴릴 무기 공격 줄: 없는 능력치이면서, 이미 붙은 독벌침 줄을 뺀 접두 3, 접미 3 자리가 남는 종류. 지역 줄은 그 지역 장비만. */
function getVenomStingerMods(item) {
    const occupiedIds = getItemOccupiedExplicitModIds(item);
    const room = equipmentCrafting.affixRoom(item, item.rarity, (item.stats || []).find(stat => stat && stat.venomStingerBonus) || null);
    return MOD_DB.filter(mod => mod.slots.includes('무기') && VENOM_STINGER_STAT_IDS.includes(mod.statId || mod.id) && isModForOrigin(mod, item)
        && !occupiedIds.has(mod.statId || mod.id) && equipmentCrafting.fitsRoom(room, mod));
}

function applyVenomStingerToSelectedItem() { if (game.woodsmanBuildLock) return addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog(_t('먼저 아이템을 선택하세요.'), 'attack-monster');
    if (item.fusedRelic) return addLog(_t('융합 유물은 시간에 굳어, 황금률/잿불가지/축복의 꽃잎만 받아들입니다.'), 'attack-monster');
    if ((game.currencies.venomStinger || 0) <= 0) return addLog(_t('독벌침이 부족합니다.'), 'attack-monster');
    const refusal = getVenomStingerRefusal(item);
    if (refusal) return addLog(refusal, 'attack-monster');
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let attackMods = getVenomStingerMods(item);
    if (attackMods.length <= 0) return addLog(_t('독벌침이 붙일 수 있는 공격 옵션 자리가 없습니다(접두 3, 접미 3).'), 'attack-monster');
    let mod = pickWeightedMod(attackMods);
    let rolled = rollAffixValue(mod, getItemCraftTier(item));
    let idx = item.stats.findIndex(stat => stat && stat.venomStingerBonus);
    rolled.venomStingerBonus = true;
    if (idx >= 0) item.stats[idx] = rolled;
    else item.stats.push(rolled);
    game.currencies.venomStinger--;
    addLog(_t('🦂 독벌침 적용: {value} +{value2}', { value: _t(rolled.statName || getStatName(rolled.id)), value2: formatValue(rolled.id, rolled.val) }), 'loot-rare');
    updateStaticUI();
}

/** 제작실의 공허의 끌: 선택한 장비에 공허 소켓을 뚫는다(규칙은 equipmentSockets). */
function applyVoidChiselToSelectedItem() {
    let item = getSelectedCraftItem();
    if (!item) return addLog(_t('먼저 아이템을 선택하세요.'), 'attack-monster');
    let result = equipmentSockets.chisel(item);
    if (!result.ok) return addLog(result.reason, 'attack-monster');
    addLog(_t('🕳️ [{name}]에 공허 소켓을 뚫었습니다.', { name: _t(item.name) }), 'loot-rare');
    updateStaticUI();
}

function applyWoodsmanTouchToSelectedItem() { if (game.woodsmanBuildLock) return addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog(_t('먼저 봉인할 장비를 선택하세요.'), 'attack-monster');
    if ((game.currencies.ouroboros || 0) < 1) return addLog(_t('우로보로스가 부족합니다.'), 'attack-monster');
    if (item.loopSealed) return addLog(_t('이미 봉인된 장비입니다.'), 'attack-monster');
    game.currencies.ouroboros--;
    item.loopSealed = true;
    addLog(_t('🌿 [{name}]{particle} 나무꾼의 손길로 봉인했습니다. 루프가 진행되어도 사라지지 않습니다.', { name: getItemDisplayName(item), particle: pickParticle(item.name, '을', '를') }), 'loot-unique');
    updateStaticUI();
    queueImportantSave(200);
}

function getAbyssSocketCapacity(item) {
    if (!item || item.rarity !== 'unique') return 0;
    if (item.uniqueEffectKey === 'abyssSocketOnItem') return Math.max(1, Math.min(2, Math.floor((item.uniqueEffectParams && item.uniqueEffectParams.max) || 2)));
    if (item.uniqueEffectKey === 'abyssSocketAndJewelAmp') return Math.max(1, Math.min(2, Math.floor((item.uniqueEffectParams && item.uniqueEffectParams.socketsMax) || 2)));
    return 0;
}

function ensureAbyssSockets(item) {
    let cap = getAbyssSocketCapacity(item);
    if (!item || cap <= 0) return;
    if (Array.isArray(item.abyssSockets) && item.abyssSockets.length > 0) return;
    let p = item.uniqueEffectParams || {};
    let min = Math.max(1, Math.floor(Number(p.min || p.socketsMin || 1)));
    let max = Math.max(min, Math.min(cap, Math.floor(Number(p.max || p.socketsMax || cap))));
    let count = min + Math.floor(Math.random() * (max - min + 1));
    item.abyssSockets = Array.from({ length: count }, () => ({ jewel: null }));
}

safeExposeGlobals({ applyVoidChiselToSelectedItem, drawJewelRefine, salvageJewel });

function createItemFromBase(base, rarity, zoneTier, origin) {
    itemIdCounter++;
    origin = origin && typeof origin === 'object' ? origin : {};
    const dropRealm = typeof origin.dropRealm === 'string' ? origin.dropRealm : null;
    const affixTierCap = clampNumber(Math.floor(Number(origin.affixTierCap) || Math.min(15, Math.max(1, Number(zoneTier) || 1))), 1, 20);
    const affixTierFloor = clampNumber(Math.floor(Number(origin.affixTierFloor) || 1), 1, affixTierCap);
    let item = {
        id: itemIdCounter,
        slot: base.slot,
        baseId: base.id,
        baseName: base.name,
        name: base.name,
        rarity: rarity,
        blockBaseVersion: 1,
        itemTier: zoneTier,
        hiddenTier: Math.max(1, Math.floor(Number(zoneTier) || 1)),
        affixTierCap: affixTierCap,
        itemLevel: levelProgression.tierLevel(zoneTier), requirementsVersion: 1,
        dropRealm: dropRealm,
        dropRegion: normalizeDropRegion(origin.dropRegion),
        baseStats: rollBaseStats(base, zoneTier),
        stats: []
    };
    if (rarity === 'magic' || rarity === 'rare') rerollExplicitMods(item, rarity, affixTierCap, {
        minTier: affixTierFloor,
        tierWeightFalloff: origin.tierWeightFalloff,
        weigh: origin.weigh
    });
    return item;
}

function pickWeightedMod(mods) {
    if (!Array.isArray(mods) || mods.length === 0) return null;
    let totalWeight = mods.reduce((sum, mod) => sum + Math.max(0.01, Number(mod.weight) || 1), 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < mods.length; i++) {
        let weight = Math.max(0.01, Number(mods[i].weight) || 1);
        if (roll < weight) return mods[i];
        roll -= weight;
    }
    return mods[mods.length - 1];
}

/** room({prefix, suffix} 남은 자리, 없으면 제한 없음): 고를 때마다 자리가 남은 종류에서만 고른다.
 * weigh(pool, picks) → pool(없어도 됨): 고를 때마다 가중치를 다시 매긴다(제작 뿌리 엮음, js/equipment-crafting.js). */
function pickRandomMods(mods, count, room, weigh) {
    let pool = Array.isArray(mods) ? mods.slice() : [];
    const left = room && { ...room };
    let picks = [];
    let wanted = Math.max(0, Math.floor(count || 0));
    while (picks.length < wanted) {
        if (left) pool = pool.filter(mod => equipmentCrafting.fitsRoom(left, mod));
        let picked = pickWeightedMod(weigh ? weigh(pool, picks) : pool);
        if (!picked) break;
        picks.push(picked);
        if (left && equipmentCrafting.affixKind(picked) !== 'special') left[equipmentCrafting.affixKind(picked)]--;
        const occupied = new Set(getExplicitModStatIds(picked));
        pool = pool.filter(mod => !getExplicitModStatIds(mod).some(id => occupied.has(id)));
    }
    return picks;
}

/** The values a unique's stat line (data min~max, or base) can roll: tenths for tenth stats, otherwise whole numbers rounded down
 * (data 30.7~34.9 rolls 30~34). Cards that show a unique before it exists (black market, unique codex) show this range.
 * @returns {{min:number, max:number}} */
function getUniqueStatRollRange(stat) {
    let min = stat.min !== undefined ? stat.min : stat.base;
    let max = stat.max !== undefined ? stat.max : stat.base;
    if (max < min) max = min;
    if (isTenthStat(stat.id)) return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
    return { min: Math.floor(min), max: Math.floor(max) };
}

function rollUniqueStatValue(stat) {
    let { min, max } = getUniqueStatRollRange(stat);
    if (isTenthStat(stat.id)) {
        let minStep = Math.round(min * 10);
        let maxStep = Math.round(max * 10);
        return { min, max, val: (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10 };
    }
    return { min, max, val: min + Math.floor(Math.random() * (max - min + 1)) };
}


/** A unique drop comes from the chase pool at 0.16%, more in atlas maps past their T20 tier (js/atlas-maps.js chaseMul). */
function getChaseUniqueChance(zone) {
    return 0.0016 * (typeof atlasMaps === 'object' ? atlasMaps.chaseMul(zone) : 1);
}

/** Whether unique can be rolled in zone: a content unique (dropOnly) only in its own content (type, id, floor). */
function uniqueDropsInZone(unique, zone) {
    if (!contentProgression.canDropUnique(unique)) return false;
    if (!unique.dropOnly) return true;
    let dropOnly = unique.dropOnly;
    if (dropOnly.type && zone.type !== dropOnly.type) return false;
    if (dropOnly.id && zone.id !== dropOnly.id) return false;
    if (dropOnly.minFloor && Math.floor(zone.floor || 0) < dropOnly.minFloor) return false;
    return true;
}
/** Whether unique rolls at tier (a content unique's own minimum tier first). */
const uniqueMeetsTier = (unique, tier) => !!unique && tier >= ((unique.dropOnly && unique.dropOnly.minTier) || unique.reqTier || 1);
/** 요정의 고리가 바꿀 수 있는 고유: 그 장비의 부위에 그 등급까지 이 지역에서 나오는 것 { chase, normal }. 다른 부위의 고유로 바뀌면
 * 장비 칸과 가방 칸이 어긋났다(2026-10-20 검토: 착용한 허리띠가 방패가 됐다). */
function getFairyRingUniquePools(item, zone = getZone(game.currentZoneId) || {}) {
    const tier = Math.max(1, Math.floor(item.hiddenTier || item.itemTier || 1));
    const fits = unique => unique.slots.includes(item.slot) && uniqueDropsInZone(unique, zone) && uniqueMeetsTier(unique, tier);
    return { tier, chase: UNIQUE_DB.filter(unique => unique.ultraRare && fits(unique)), normal: UNIQUE_DB.filter(unique => !unique.ultraRare && fits(unique)) };
}

function generateUniqueItem(zoneTier, preferredSlot, forcedUniqueName, zone = getZone(game.currentZoneId) || {}) {
    let canDropUniqueInZone = unique => uniqueDropsInZone(unique, zone);
    let meetsUniqueTier = unique => uniqueMeetsTier(unique, zoneTier);
    let forcedUnique = UNIQUE_DB.find(unique => unique.name === (RENAMED_UNIQUES[forcedUniqueName] || forcedUniqueName));
    if (forcedUnique && !contentProgression.canDropUnique(forcedUnique)) return null;
    let slot = forcedUnique?.slots?.[0] || preferredSlot || rndChoice(EQUIPMENT_DROP_SLOTS);
    let normalOptions = UNIQUE_DB.filter(unique => !unique.ultraRare && canDropUniqueInZone(unique));
    let chaseOptions = UNIQUE_DB.filter(unique => unique.ultraRare
        && canDropUniqueInZone(unique)
        && meetsUniqueTier(unique));
    let canRollChase = !forcedUnique && chaseOptions.length > 0 && Math.random() < getChaseUniqueChance(zone);
    let poolSource = canRollChase ? chaseOptions : normalOptions;
    let options = poolSource.filter(unique => unique.slots.includes(slot) && meetsUniqueTier(unique));
    if (options.length === 0) options = poolSource.filter(meetsUniqueTier);
    if (options.length === 0) options = poolSource.length > 0 ? poolSource : UNIQUE_DB.filter(canDropUniqueInZone);
    let unique = forcedUnique || rndChoice(options);
    let uniqueTier = unique.reqTier || zoneTier;
    let base = BASE_ITEM_DB.find(row => row.id === UNIQUE_EQUIPMENT_RULES[unique.name].baseId);
    itemIdCounter++;
    let item = {
        id: itemIdCounter,
        slot: unique.slots[0],
        baseId: base.id,
        baseName: base.name,
        name: unique.name,
        rarity: 'unique',
        uniqueEquipmentVersion: 1, blockBaseVersion: 1,
        itemTier: uniqueTier,
        hiddenTier: uniqueTier,
        baseStats: rollBaseStats(base, uniqueTier),
        stats: [],
        uniqueEffect: unique.uniqueEffect || '',
        uniqueEffectKey: unique.uniqueEffectKey || '',
        uniqueEffectParams: unique.uniqueEffectParams ? JSON.parse(JSON.stringify(unique.uniqueEffectParams)) : null
    };
    if (item.uniqueEffectKey === 'abyssSocketOnItem' || item.uniqueEffectKey === 'abyssSocketAndJewelAmp') {
        let p = item.uniqueEffectParams || {};
        let min = Math.max(1, Math.floor(Number(p.min || p.socketsMin || 1)));
        let max = Math.max(min, Math.floor(Number(p.max || p.socketsMax || 2)));
        let count = min + Math.floor(Math.random() * (max - min + 1));
        item.abyssSockets = Array.from({ length: count }, () => ({ jewel: null }));
        if (item.uniqueEffectKey === 'abyssSocketAndJewelAmp') {
            let ampMin = Math.max(1, Math.floor(Number(p.ampMin || 1)));
            let ampMax = Math.max(ampMin, Math.floor(Number(p.ampMax || 100)));
            p.ampPct = ampMin + Math.floor(Math.random() * (ampMax - ampMin + 1));
            item.uniqueEffectParams = p;
            item.uniqueEffect = _t('심연 주얼 슬롯 ({count})개, 장착 심연 주얼 효과 +{ampPct}%', { count, ampPct: p.ampPct });
        }
    }
    unique.stats.forEach(stat => {
        let rolled = rollUniqueStatValue(stat);
        let boost = 1;
        let val = isTenthStat(stat.id) ? Math.round(rolled.val * boost * 10) / 10 : Math.floor(rolled.val * boost);
        let min = isTenthStat(stat.id) ? Math.round(rolled.min * boost * 10) / 10 : Math.floor(rolled.min * boost);
        let max = isTenthStat(stat.id) ? Math.round(rolled.max * boost * 10) / 10 : Math.floor(rolled.max * boost);
        item.stats.push({ id: stat.id, val: val, valMin: min, valMax: max, tier: 0, statName: getStatName(stat.id) });
    });
    if (unique.ultraRare && canRollChase) {
        game.seasonChaseUniqueDrops = Array.isArray(game.seasonChaseUniqueDrops) ? game.seasonChaseUniqueDrops : [];
        if (!game.seasonChaseUniqueDrops.includes(unique.name)) game.seasonChaseUniqueDrops.push(unique.name);
        game.seasonChaseUniqueDropped = game.seasonChaseUniqueDrops.length > 0;
        addLog(_t('🌠 체이싱 유니크 발견! [{name}]', { name: _t(unique.name) }), 'loot-unique');
    }
    maybeApplyExceptionalBase(item);
    return levelProgression.stampItem(item);
}

function maybeApplyDroppedFossilExclusiveAffix(item, enemy, zoneTier) {
    if (!contentProgression.isUnlocked('fossilRestore') || !item || item.rarity === 'unique') return item;
    let chance = enemy && enemy.isBoss ? 0.12 : (enemy && enemy.isElite ? 0.06 : 0.018);
    if (Math.random() >= chance) return item;
    let pool = typeof getFossilExclusivePool === 'function'
        ? getFossilExclusivePool(item)
        : FOSSIL_EXCLUSIVE_MODS.filter(mod => mod.slots.includes(item.slot));
    if (!pool || pool.length <= 0) return item;
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length >= EXPLICIT_AFFIX_LINE_CAP) item.stats.pop();
    let tierRange = getDroppedAffixTierRange(zoneTier);
    let roll = rollAffixValueInTierRange(
        pickWeightedMod(pool), tierRange.min, tierRange.max, DROPPED_AFFIX_TIER_WEIGHT_FALLOFF
    );
    roll.fossilExclusiveDrop = true;
    item.stats.push(roll);
    if (item.rarity === 'normal') item.rarity = 'magic';
    updateItemName(item);
    return item;
}

/** 정해 준 칸, 아니면 아무 칸(지도 기운이 부위 가중치를 주면 그 가중치로, js/loot-omens.js slotWeights). 뿌리촉수의 제 무기는 따로
 * 굴린다(js/combat-kill-rewards.js grantRootWeaponPick, data/bosses.js). */
function getEquipmentDropSlot(options, zone) {
    if (EQUIPMENT_DROP_SLOTS.includes(options?.slot)) return options.slot;
    const weights = lootOmens.slotWeights(zone);
    if (!weights) return rndChoice(EQUIPMENT_DROP_SLOTS);
    let roll = Math.random() * EQUIPMENT_DROP_SLOTS.reduce((sum, slot) => sum + (weights[slot] || 1), 0);
    return EQUIPMENT_DROP_SLOTS.find(slot => (roll -= weights[slot] || 1) < 0) || EQUIPMENT_DROP_SLOTS[EQUIPMENT_DROP_SLOTS.length - 1];
}

function generateEquipmentDrop(enemy, options) {
    let zone = options && options.zone ? options.zone : (getZone(game.currentZoneId) || {});
    const itemLevel = levelProgression.itemLevel(zone, enemy);
    let hiddenTierCap = Math.min(getRealmEquipmentHiddenTierCap(zone), levelProgression.maxDropTier(itemLevel));
    let dropTier = Math.min(rollRealmItemDropTier(zone, enemy), levelProgression.maxDropTier(itemLevel));
    let affixTierCap = Math.min(levelProgression.affixCap(itemLevel), getRealmEquipmentAffixTierCap(zone, dropTier));
    let affixTierRange = getDroppedAffixTierRange(affixTierCap);
    let slot = getEquipmentDropSlot(options, zone);
    let base = chooseItemBase(slot, dropTier, zone, getRootMonsterWeapon(enemy));
    let rarity = getEquipmentDropRarity(enemy, Math.random());
    if (rarity === 'unique') return levelProgression.stampItem(generateUniqueItem(hiddenTierCap, slot, null, zone), itemLevel);
    let minimumRarity = options && ['normal', 'magic', 'rare'].includes(options.minimumRarity) ? options.minimumRarity : null;
    if (minimumRarity && getRarityRank(rarity) < getRarityRank(minimumRarity)) rarity = minimumRarity;
    let item = createItemFromBase(base, rarity, dropTier, getEquipmentDropOrigin(zone, affixTierCap, affixTierRange, options));
    maybeApplyExceptionalBase(item);
    equipmentSockets.rollDropSocket(item);
    item = maybeApplyDroppedFossilExclusiveAffix(item, enemy, dropTier);
    return levelProgression.stampItem(itemInfluences.onDrop(maybeApplyChaosRealmEncroachment(item, enemy, zone), enemy, zone), itemLevel);
}

/** createItemFromBase's origin for a drop in zone; options.weigh reweighs the explicit lines (the NPC shops, js/npc-shop.js). */
function getEquipmentDropOrigin(zone, affixTierCap, affixTierRange, options) {
    return { dropRealm: zone.type || null, dropRegion: getEquipmentDropRegion(zone), affixTierCap, affixTierFloor: affixTierRange.min,
        tierWeightFalloff: DROPPED_AFFIX_TIER_WEIGHT_FALLOFF, weigh: options && options.weigh };
}

/** A base stat value scaled by factor, kept on its own grid: 0.1 steps for leech/regen lines, whole numbers (at least 1) otherwise. */
function boostItemStatValue(statId, value, factor) {
    if (isTenthStat(statId)) return Math.round(value * factor * 10) / 10;
    return Math.max(1, Math.floor(value * factor));
}

// 장비 드랍 시, 각 베이스 옵션 줄마다 독립적으로 1% 확률로 '특출'해진다(최대 롤 +20%).
// 줄마다 따로 굴리므로 모든 줄이 동시에 특출날 확률은 1%^(줄 수)로 극악이다.
/** One base line raised to 120% of its best roll and marked exceptional; the item's exceptional fields then list every such line
 * (a drop's 1% per line below, and the cube's 고유 장비 리롤, js/stump-cube-recipes.js). */
function boostExceptionalBaseLine(item, stat) {
    let max = Number.isFinite(stat.baseRollMax) ? stat.baseRollMax
        : (Number.isFinite(stat.valMax) ? stat.valMax : Number(stat.val) || 0);
    stat.val = boostItemStatValue(stat.id, max, 1.2);
    stat.exceptional = true;
    let names = item.baseStats.filter(row => row && row.exceptional).map(row => _t(row.statName || getStatName(row.id)));
    item.exceptionalBase = true;
    item.exceptionalStatNames = names;
    item.exceptionalStatName = names.join(', ');
    item.exceptionalAllLines = names.length === item.baseStats.length;
}

function maybeApplyExceptionalBase(item) {
    if (!item || !Array.isArray(item.baseStats) || item.baseStats.length === 0) return item;
    item.baseStats.forEach(stat => { if (stat && Math.random() < 0.01) boostExceptionalBaseLine(item, stat); });
    return item;
}

/** @param {string} currencyKey @param {number} amount @param {'reward'|'drop'} source */
/** The currency and whole amount an award would commit; refused when a drop of a still-locked currency is dropped. */
function resolveCurrencyAward(currencyKey, amount, source = 'reward') {
    const key = getCanonicalCurrencyKey(currencyKey);
    if (source === 'drop' && !contentProgression.canDropCurrency(key)) return { key, gain: 0, refused: true };
    let gain = Number(amount || 0);
    if (gain > 0) gain = Math.max(1, Math.floor(gain));
    return { key, gain, refused: false };
}

function awardCurrency(currencyKey, amount, source = 'reward') {
    const award = resolveCurrencyAward(currencyKey, amount, source);
    if (award.refused) return 0;
    commitCurrencyGain(award.key, award.gain);
    return award.gain;
}

/** Commit an already resolved amount without applying expert multipliers again. */
function commitCurrencyGain(currencyKey, gain) {
    if (currencyKey === 'condensedSkyPower') {
        let st = ensureSkyTowerState();
        st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0)) + gain;
        combatLootReceipts.currency(game,currencyKey,gain);
        game.currencyDropVersion = Math.max(0, Math.floor(game.currencyDropVersion || 0)) + 1;
        return;
    }
    game.currencies[currencyKey] = (game.currencies[currencyKey] || 0) + gain;
    currencyExchange.noteSeen(game, currencyKey);
    combatLootReceipts.currency(game,currencyKey,gain);
    game.currencyDropVersion = Math.max(0, Math.floor(game.currencyDropVersion || 0)) + 1;
    notifyCurrencyAcquisition(currencyKey, gain);
}

function notifyCurrencyAcquisition(currencyKey, gain) {
    if ((currencyKey === 'chaosKey' || currencyKey === 'coreKey') && gain > 0) {
        // 둘 중 하나라도 습득하면 지도 알람을 띄운다(5차 미궁 시련/재능 개화 도전 알림).
        if (game.noti) game.noti.map = true;
    }
    if (currencyKey === 'ouroboros' && gain > 0) {
        game.woodsmanTouchSeen = true;
    }
    const unlocked=unlockLegacyCurrencyFeatures(currencyKey);
    dispatchRuntimeEvent('currency-acquired',{currencyKey,gain,unlocked});
}

function unlockLegacyCurrencyFeatures(currencyKey) {
    const unlocked={gem:false};
    if (!game.contentProgression && !game.gemEnhanceUnlocked && (currencyKey === 'bossCore' || currencyKey === 'skyEssence')) {
        game.gemEnhanceUnlocked = true;
        game.noti.skills = true;
        unlocked.gem=true;
    }
    return unlocked;
}

// Explicit returns from crafting stay in inventory; ordinary drops keep the auto-equip setting. The first loop's starter weapon waits in the
// bag for its equip guide (js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill, starterWeaponTutorialPending).
function getAcquiredItemAutoEquipSlot(item, options) {
    if (options?.skipAutoEquip || (item && item.id === game.starterWeaponTutorialPending)) return null;
    return typeof tryAutoEquipEmptySlot === 'function' ? tryAutoEquipEmptySlot(item) : null;
}

/** guaranteedKeep: 유실되면 안 되는 반환/정산 아이템(시간의 균열 융합·제단 회수 등)과 목표·보호 장비, 주얼과 코어.
 * 습득 필터·자동해체를 우회하고, 가득 찬 인벤토리에서도 해체 대신 초과 보관한다. 항상 줍기의 액막이는 필터와 등급 해체만 건너뛰고,
 * 가방이 차면 다른 장비처럼 해체된다(2026-11-03 사용자: 임시 보관함으로 들어오지 않게). */
function isGuaranteedEquipmentPickup(item, options) {
    return !!(options && options.guaranteedKeep) || uniqueHuntRuntime.isTargetItem(item) || equipmentLootPolicy.matches(item)
        || bagItems.ownShape(item);
}

/** What picking `item` up would do before space is considered: 'kept', 'filtered' (pickup filter) or 'salvaged' (auto-salvage).
 * An exploration drop that would be kept waits on the floor (js/exploration-ground-loot.js); the others resolve at once. */
function previewEquipmentPickup(item, options) {
    normalizeItem(item);
    if (isGuaranteedEquipmentPickup(item, options) || bagItems.keptOnPickup(item)) return 'kept';
    if (!passesItemPickupFilter(item)) return 'filtered';
    return game.settings.autoSalvageEnabled && game.settings.autoSalvageRarities?.[item.rarity] ? 'salvaged' : 'kept';
}

function addItemToInventory(item, options) {
    normalizeItem(item);
    const logLoot = game.settings.showLootLog;
    let guaranteedKeep = isGuaranteedEquipmentPickup(item, options), alwaysPicked = bagItems.keptOnPickup(item);
    let ignoreFilter = guaranteedKeep || alwaysPicked || !!(options && options.ignoreFilter);
    let ignoreAutoSalvage = guaranteedKeep || alwaysPicked || !!(options && options.ignoreAutoSalvage);
    let autoEquipSlot = getAcquiredItemAutoEquipSlot(item, options);
    if (autoEquipSlot) {
        recordEquipmentAcquisition(item);
        if (logLoot) addLog(_t("🛡️ 빈 {autoEquipSlot} 슬롯에 자동 장착: <span class='loot-{rarity}'>[{name}]</span>", { autoEquipSlot, rarity: item.rarity, name: _t(item.name) }), 'loot-rare', { item });
        checkUnlocks();
        return true;
    }
    if (!ignoreFilter && !passesItemPickupFilter(item)) {
        if (logLoot) addLog(_t("🚫 아이템 필터로 미습득: <span class='loot-{rarity}'>[{name}]</span>", { rarity: item.rarity, name: _t(item.name) }), 'attack-monster');
        return false;
    }
    const result = storeEquipmentPickup(item, { guaranteedKeep, ignoreAutoSalvage });
    if (result.accepted) { recordEquipmentAcquisition(item); checkUnlocks(); }
    if (result.kind === 'protected') addLog(_t('🎒 인벤토리가 가득 찼지만 [{name}]{particle} 유실 방지를 위해 초과 보관됩니다.', { name: getItemDisplayName(item), particle: pickParticle(item.name, '은', '는') }), 'attack-monster');
    else if (logLoot && result.rewards && result.log) {
        const label = result.kind === 'overflow' ? '공간 부족 자동해체' : '자동해체';
        addLog(`${label}: <span class='loot-${item.rarity}'>[${_t(item.name)}]</span>, ${formatSalvageRewardSummary(result.rewards)}`, 'loot-normal');
    }
    return result.accepted;
}

/** A bought item into the bag (the NPC shops js/npc-shop.js, the black market js/black-market.js): kept whatever the pickup filter
 * and auto-salvage say, never worn on its own, then moved to place (a bag cell { column, row }, row over all pages) when given.
 * The shop checked the room first: a full bag would salvage it. */
function stowBoughtItem(item, place = null) {
    if (!addItemToInventory(item, { ignoreFilter: true, ignoreAutoSalvage: true, skipAutoEquip: true })) return false;
    equipmentInventoryGridRuntime.ensureState(game);
    if (place) equipmentInventoryGridRuntime.placeInventoryItem(equipmentInventoryGridRuntime.getItemKey(item), place.column, place.row, game);
    return true;
}

/** One more gear salvaged for room during an away settlement (the result's 자동해체 count, js/combat-replay.js finishCombatReplay). */
const countBackgroundOverflowSalvage = () => { game.backgroundOverflowSalvageCount = Math.max(0, Math.floor(Number(game.backgroundOverflowSalvageCount) || 0)) + 1; };

/** Resolve capacity and auto-salvage at pickup time. */
function storeEquipmentPickup(item, { guaranteedKeep, ignoreAutoSalvage }) {
    const fits = canStoreEquipmentItems([item], game);
    if (!fits && !guaranteedKeep) return salvageEquipmentPickup(item, true);
    if (!ignoreAutoSalvage && game.settings.autoSalvageEnabled && game.settings.autoSalvageRarities?.[item.rarity])
        return salvageEquipmentPickup(item, false);
    game.inventory.push(item);
    return { accepted: true, kind: fits ? 'stored' : 'protected' };
}

function salvageEquipmentPickup(item, overflow) {
    const rewards = salvageItemObject(item, true, { noDivine: overflow });
    if (overflow && game.isBackgroundCalculation) countBackgroundOverflowSalvage();
    return { accepted: false, kind: overflow ? 'overflow' : 'salvaged', rewards, log: !overflow || !game.isBackgroundCalculation };
}

/** Gear ids picked up since the 장비 button last rated them (js/equipment-triage.js checkFreshGear), oldest first, at most 40.
 * Gear worn on pickup is noted too and dropped there (only bag gear is rated). */
const freshGearIds = [];

function recordEquipmentAcquisition(item) {
    freshGearIds.push(item.id);
    if (freshGearIds.length > 40) freshGearIds.shift();
    combatLootReceipts.item(game,item);
    return recordUniqueAcquisition(item);
}

/** Takes up to `limit` of the gear ids noted above, oldest first. */
const takeFreshGearIds = limit => freshGearIds.splice(0, limit);

function recordUniqueAcquisition(item) {
    if (item.rarity !== 'unique') return false;
    registerUniqueToCodexOnAcquire(item);
    if (typeof uniqueHuntRuntime === 'undefined') return true;
    let target = uniqueHuntRuntime.complete(item);
    if (!target) return true;
    addLog(_t("🎯 파밍 목표 획득: <span class='loot-unique'>[{name}]</span>", { name: _t(item.name) }), 'loot-unique', { item, toast: true });
    return true;
}

/** Explicit lines at the tier threshold or above. Unique lines have no tier, so uniques skip the count (2026-10-08: they were
 * all dropped once a count was set). */
function passesPickupTierCount(item, settings) {
    const minTierCount = Math.max(0, Math.floor(settings.itemFilterMinTierCount || 0));
    if (minTierCount <= 0 || item.rarity === 'unique') return true;
    const tierThreshold = Math.max(1, Math.floor(settings.itemFilterTierThreshold || 10));
    return (item.stats || []).filter(stat => Number.isFinite(stat.tier) && stat.tier >= tierThreshold).length >= minTierCount;
}

/** 항상 줍기(2026-10-10): 특출난 베이스, 상급 옵션 희귀(data/loot-omens.js fineRare), 소켓, 타락, 도감에 없는 고유는 다른 조건과 상관없이 줍는다. */
const PICKUP_EXCEPTIONS = Object.freeze({
    exceptional: item => !!item.exceptionalBase,
    fineRare: item => item.rarity === 'rare' && lootMoments.fineLines(item) >= LOOT_OMENS.fineRare.good,
    socket: item => !!item.voidSocket || (Array.isArray(item.sockets) && item.sockets.length > 0),
    corrupted: item => !!item.corrupted,
    newUnique: item => lootMoments.isNewUnique(item),
    influenced: item => itemInfluences.influenceKeys(item).some(key => key !== 'swapped'),
    ward: item => colonyWards.isWard(item)
});
function isPickupException(item, always) {
    return !!always && Object.entries(PICKUP_EXCEPTIONS).some(([key, test]) => always[key] === true && test(item));
}

/** 부위와 무기 종류(itemFilterSlots, itemFilterWeaponCategories). A ring's 반지1 or 반지2 counts as 반지. */
function passesPickupSlot(item, settings) {
    const slot = String(item.slot || '').replace(/[123]$/, '');
    if (settings.itemFilterSlots && settings.itemFilterSlots[slot] === false) return false;
    const category = slot === '무기' ? getWeaponCategoryId(item) : null;
    return !category || !settings.itemFilterWeaponCategories || settings.itemFilterWeaponCategories[category] !== false;
}

function passesItemPickupFilter(item) {
    let settings = game.settings || {};
    if (!settings.itemFilterEnabled) return true;
    if (isPickupException(item, settings.itemFilterAlways)) return true;
    let rarities = { normal: true, magic: true, rare: true, unique: true, ...(settings.itemFilterRarities || {}) };
    if (!rarities[item.rarity] || !passesPickupSlot(item, settings)) return false;
    let minTier = Math.max(1, Math.floor((settings.itemFilterMinTiers || {})[item.rarity] || settings.itemFilterMinHiddenTier || 1));
    if ((item.hiddenTier || item.itemTier || 1) < minTier) return false;
    if (!passesPickupTierCount(item, settings)) return false;
    if (item.rarity === 'unique' && settings.itemFilterOnlyNewCodexUnique) {
        let key = getUniqueCodexKeyByItem(item);
        if (key && game.uniqueCodex && game.uniqueCodex[key]) return false;
    }
    return true;
}



/** A unique jewel's effect text from UNIQUE_JEWEL_DB by its uniqueId (each jewel keeps the text it dropped with, which can be older),
 * else the stored text. */
function getJewelUniqueEffectText(jewel) {
    const row = jewel && jewel.uniqueId ? UNIQUE_JEWEL_DB.find(entry => entry.id === jewel.uniqueId) : null;
    return (row && row.uniqueEffect) || (jewel && jewel.uniqueEffect) || '';
}
const UNIQUE_JEWEL_DB = [
    { id:'uj_crown_empty', name:'비어 있는 왕좌', ultra:true, uniqueEffect:'다른 고유 주얼이 없으면 피해 +25%, 룬 레벨 +1 추가', stats:[{id:'pctDmg',val:25},{id:'gemLevel',val:1}] },
    { id:'uj_mirror_heart', name:'거울 심장', ultra:true, uniqueEffect:'반지 소켓에 끼우면 반대쪽 반지 소켓의 주얼 복제', stats:[{id:'pctDmg',val:8},{id:'resAll',val:8}] },
    { id:'uj_old_box', name:'오래된 보석함', ultra:true, uniqueEffect:'가방의 마법 아이템 하나마다 공격 속도 +0.5%(최대 30%), 희귀 하나마다 피해 +1.2%(최대 60%), 고유 하나마다 물리 피해 감소 +1.5%(최대 12%)', stats:[{id:'aspd',val:6},{id:'resAll',val:10}] },
    { id:'uj_hurried_mind', name:'다급해지는 마음', ultra:true, uniqueEffect:'적이 없으면 이동속도 +50%', stats:[{id:'move',val:12},{id:'regen',val:1.2}] },
    { id:'uj_condensed_curse', name:'응축된 저주', ultra:true, uniqueEffect:'저주 최대치 +1, 대상 저주당 최종 피해 +10%', stats:[{id:'dotPctDmg',val:14},{id:'resPen',val:6}] },
    { id:'uj_burning_will', name:'불같은 의지', ultra:true, uniqueEffect:'최대치를 넘는 화염 저항 1%마다 기본 피해 +0.5%(최대 35%)', stats:[{id:'maxResF',val:2},{id:'firePctDmg',val:12}] },
    { id:'uj_closed_eyes', name:'질끈 감은 눈', ultra:true, uniqueEffect:'플레이어 상태이상 면역, 부적의 수호, 함성, 저주 줄 비활성', stats:[{id:'dr',val:6},{id:'resAll',val:12}] },
    { id:'uj_spark_ember', name:'불씨의 파편', stats:[{id:'firePctDmg',val:14},{id:'igniteChance',val:10}] },
    { id:'uj_frost_nail', name:'서리 못', stats:[{id:'coldPctDmg',val:14},{id:'chillChance',val:10}] },
    { id:'uj_storm_shard', name:'폭풍 조각', stats:[{id:'lightPctDmg',val:14},{id:'shockEffectReducePct',val:12}] },
    { id:'uj_venom_eye', name:'독안', stats:[{id:'chaosPctDmg',val:14},{id:'poisonChance',val:12}] },
    { id:'uj_blood_tine', name:'혈극', stats:[{id:'physPctDmg',val:14},{id:'bleedChance',val:12}] },
    { id:'uj_iron_husk', name:'강철 껍질', stats:[{id:'armorPct',val:16},{id:'dr',val:5}] },
    { id:'uj_windstep', name:'바람걸음', stats:[{id:'move',val:14},{id:'aspd',val:8}] },
    { id:'uj_null_seed', name:'영점 씨앗', stats:[{id:'resPen',val:7},{id:'crit',val:1.2}] },
    { id:'uj_root_charm', name:'뿌리 부적', stats:[{id:'flatHp',val:55},{id:'regen',val:1.5}] },
    { id:'uj_tide_mark', name:'조류 각인', stats:[{id:'dotPctDmg',val:12},{id:'dotTakenDamageReducePct',val:8}] },
    { id:'uj_ash_loop', name:'잿빛 고리', stats:[{id:'critDmg',val:18},{id:'crit',val:1}] },
    { id:'uj_horizon_pin', name:'지평 핀', stats:[{id:'projectilePctDmg',val:16},{id:'minDmgRoll',val:4}] },
    { id:'uj_stone_beat', name:'석맥 박동', stats:[{id:'slamPctDmg',val:16},{id:'maxDmgRoll',val:4}] },
    { id:'uj_lattice', name:'격자 파편', stats:[{id:'resAll',val:10},{id:'energyShieldPct',val:12}] },
    { id:'uj_bramble', name:'가시덩굴', stats:[{id:'evasionPct',val:12},{id:'takenDamageReduceWhen2EnemiesPct',val:6}] },
    { id:'uj_dawn_chip', name:'새벽 조각', stats:[{id:'pctDmg',val:12},{id:'takenDamageReduceWhen1EnemyPct',val:4}] },
    // 2026-10-02 재능 정리: 얻을 수 없게 된 옛 재능 카드의 효과(bloomMechanic, js/talent-cards.js getGrantedBloomMechanics).
    // 일반 고유 풀에 둔다(울트라 풀이면 고유 주얼 하나당 약 0.4%로 너무 드물다).
    { id:'uj_judgment_mark', name:'심판의 표식', bloomMechanic:'hero1__inquisitor', uniqueEffect:'공격하면 5초 동안 피해를 모으는 표식을 남기고, 5초 뒤 모은 피해의 12%로 터짐(재사용 6초)', stats:[{id:'pctDmg',val:8},{id:'crit',val:1}] },
    { id:'uj_hex_burst', name:'터지는 저주', bloomMechanic:'hero1__warlock', uniqueEffect:'저주에 걸린 적을 공격하면 그 저주를 터뜨려 적 모두에게 0.2배 피해', stats:[{id:'chaosPctDmg',val:10},{id:'dotPctDmg',val:10}] },
    { id:'uj_stinger', name:'독침의 끝', bloomMechanic:'hero1__catalyst', uniqueEffect:'남은 지속 피해가 적의 남은 생명력보다 많으면 그 적을 바로 마무리', stats:[{id:'dotPctDmg',val:14},{id:'poisonChance',val:8}] },
    { id:'uj_crowd_roar', name:'관중의 함성', bloomMechanic:'hero2__gladiator', uniqueEffect:'처치마다 관중의 함성 1중첩, 5중첩이면 다음 공격이 주변 적 다섯에게 120% 피해(적이 하나면 피해 20% 증폭)', stats:[{id:'meleePctDmg',val:12},{id:'aspd',val:5}] },
    { id:'uj_moon_shadow', name:'달그림자', bloomMechanic:'hero3__assassin', uniqueEffect:'치명타 피해의 20%가 모든 피해 감소를 무시하는 고정 피해로 바뀜', stats:[{id:'critDmg',val:15},{id:'crit',val:1}] },
    { id:'uj_forest_ring', name:'숲마당', bloomMechanic:'hero3__gladiator', uniqueEffect:'플레이어와 몬스터의 모든 공격이 반드시 명중함', stats:[{id:'flatHp',val:40},{id:'aspd',val:4}] },
    { id:'uj_defiant_bolt', name:'거역의 번개', bloomMechanic:'hero5__assassin', uniqueEffect:'번개 피해가 카오스 피해로 바뀌고, 카오스 피해를 준 적의 생명력 재생 50% 감소', stats:[{id:'chaosPctDmg',val:12},{id:'lightPctDmg',val:8}] },
    { id:'uj_pilgrim_spark', name:'순례자의 번개', bloomMechanic:'hero5__ranger', uniqueEffect:'물리 피해의 50%가 번개 피해로 바뀜', stats:[{id:'lightPctDmg',val:12},{id:'physPctDmg',val:8}] },
    { id:'uj_endless_night', name:'끝없는 밤', bloomMechanic:'hero5__warlock', uniqueEffect:'적에게 거는 저주가 끝나지 않음', stats:[{id:'dotPctDmg',val:10},{id:'resPen',val:4}] },
    { id:'uj_marksman_eye', name:'명사수의 눈', bloomMechanic:'hero6__ranger', uniqueEffect:'치명타 확률을 두 번 굴려 좋은 쪽을 쓰고, 치명타 확률이 100%를 넘으면 넘는 몫의 50%가 치명타 피해로 바뀜', stats:[{id:'crit',val:1.5},{id:'critDmg',val:12}] },
    { id:'uj_three_way', name:'삼갈래 화살', bloomMechanic:'hero6__gladiator', uniqueEffect:'투사체가 세 갈래로 나뉘어 날아감, 투사체 추가 발사 +1, 투사체 연속 타격 확률 +50%', stats:[{id:'projectilePctDmg',val:12},{id:'aspd',val:4}] },
    { id:'uj_elemental_oath', name:'원소 성전', bloomMechanic:'hero9__crusader', uniqueEffect:'생명력이 1로 고정되는 대신 받는 카오스 피해 50% 감소', stats:[{id:'energyShieldPct',val:20},{id:'resAll',val:10}] },
    { id:'uj_root_bond', name:'뿌리 결속', bloomMechanic:'hero3__soulbinder', uniqueEffect:'소환수의 공격 속도가 플레이어의 공격 속도와 같아지는 대신 플레이어는 공격하지 않음', stats:[{id:'summonPctDmg',val:15},{id:'summonHpPct',val:10}] },
    { id:'uj_blue_judgment', name:'푸른 심판', bloomMechanic:'hero3__inquisitor', uniqueEffect:'원소 공격의 15%가 적의 원소 저항을 반대로 셈', stats:[{id:'elementalPctDmg',val:12},{id:'resPen',val:3}] }
];

const JEWEL_SUMMON_OPTION_IDS = new Set(['summonFlatDmg', 'summonPctDmg', 'summonAspd', 'summonHpPct', 'summonCrit', 'summonCritDmg', 'summonEfficiency', 'summonResPen']);
const JEWEL_SUMMON_OPTION_GROUP = { id: '__summonOptionGroup', name: '소환수 옵션군' };

const JEWEL_OPTION_POOL = [
    { id: 'pctDmg', name: '피해 증폭', min: 4, max: 10 },
    { id: 'physPctDmg', name: '물리 증폭', min: 6, max: 15 },
    { id: 'firePctDmg', name: '화염 증폭', min: 6, max: 15 },
    { id: 'coldPctDmg', name: '냉기 증폭', min: 6, max: 15 },
    { id: 'lightPctDmg', name: '번개 증폭', min: 6, max: 15 },
    { id: 'chaosPctDmg', name: '카오스 증폭', min: 6, max: 15 },
    { id: 'flatHp', name: '생명력 주입', min: 20, max: 45 },
    { id: 'crit', name: '치명 보석', min: 1, max: 3 },
    { id: 'aspd', name: '질주 보석', min: 3, max: 7 },
    // 재사용 대기시간 세팅(2026-10-21): 한 개로는 작고, 여러 개를 모아야 난사에 다가간다.
    { id: 'cooldownRecovery', name: '순환 수정', min: 2, max: 4 },
    { id: 'mobilityCooldownRecovery', name: '바람결 파편', min: 3, max: 6 },
    { id: 'resAll', name: '수호 보석', min: 4, max: 9 },
    { id: 'resF', name: '화염 수호', min: 8, max: 18 },
    { id: 'resC', name: '냉기 수호', min: 8, max: 18 },
    { id: 'resL', name: '번개 수호', min: 8, max: 18 },
    { id: 'resChaos', name: '공허 수호', min: 4, max: 8 },
    { id: 'physIgnore', name: '절개 파편', min: 2, max: 6 },
    { id: 'dr', name: '강인 파편', min: 3, max: 8 },
    { id: 'resPen', name: '관통 수정', min: 2, max: 6 },
    { id: 'dotPctDmg', name: '부패 수정', min: 4, max: 10 },
    { id: 'regenSuppress', name: '봉쇄 파편', min: 0.5, max: 0.5, step: 0.1 },
    { id: 'minDmgRoll', name: '하한 수정', min: 1, max: 3 },
    { id: 'maxDmgRoll', name: '상한 수정', min: 1, max: 3 },
    { id: 'armorPct', name: '강화 외피', min: 4, max: 10 },
    { id: 'evasionPct', name: '유동 보법', min: 4, max: 10 },
    { id: 'energyShieldPct', name: '보호막 기동', min: 4, max: 10 },
    { id: 'summonFlatDmg', name: '사역 피해 주입', min: 4, max: 12 },
    { id: 'summonPctDmg', name: '지배자의 파편', min: 6, max: 16 },
    { id: 'summonAspd', name: '무리의 가속', min: 3, max: 9, step: 0.5 },
    { id: 'summonHpPct', name: '사역 생명핵', min: 6, max: 16 },
    { id: 'summonCrit', name: '야수의 눈', min: 1, max: 4, step: 0.5 },
    { id: 'summonCritDmg', name: '포식의 송곳니', min: 10, max: 28 },
    { id: 'summonEfficiency', name: '영혼 결속정', min: 4, max: 12 },
    { id: 'summonResPen', name: '사역 관통석', min: 1, max: 5, step: 0.5 },
    { id: 'ailResIgnite', name: '소염 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResShock', name: '절연 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResFreeze', name: '방한 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResPoison', name: '해독 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResBleed', name: '지혈 수정', min: 12.5, max: 50, step: 0.5 },
];
const JEWEL_HIDDEN_TIER_COUNT = 5;
const JEWEL_PETITE_OPTION_POOL = [
    { id: 'pctDmg', name: '작은 피해결', magic: [1, 1], rare: [1, 2] },
    { id: 'flatHp', name: '작은 생명결', magic: [4, 6], rare: [6, 9] },
    { id: 'crit', name: '작은 치명결', magic: [0.5, 0.5], rare: [0.5, 1] },
    { id: 'aspd', name: '작은 가속결', magic: [1, 1], rare: [1, 2] },
    { id: 'resAll', name: '작은 수호결', magic: [1, 1], rare: [1, 2] },
    { id: 'resPen', name: '작은 관통결', magic: [1, 1], rare: [1, 2] },
    { id: 'regen', name: '작은 재생결', magic: [0.1, 0.1], rare: [0.1, 0.2], step: 0.1 }
];

function getJewelOptionDef(statId) {
    return JEWEL_OPTION_POOL.find(option => option.id === statId) || null;
}

function getJewelRollOptionPool(excludeIds) {
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let hasSummon = JEWEL_OPTION_POOL.some(option => JEWEL_SUMMON_OPTION_IDS.has(option.id) && !excluded.has(option.id));
    let pool = JEWEL_OPTION_POOL.filter(option => !JEWEL_SUMMON_OPTION_IDS.has(option.id) && !excluded.has(option.id));
    if (hasSummon) pool.push(JEWEL_SUMMON_OPTION_GROUP);
    return pool.length > 0 ? pool : JEWEL_OPTION_POOL;
}

function resolveJewelRollOption(option, excludeIds) {
    if (!option || option.id !== JEWEL_SUMMON_OPTION_GROUP.id) return option || null;
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let pool = JEWEL_OPTION_POOL.filter(row => JEWEL_SUMMON_OPTION_IDS.has(row.id) && !excluded.has(row.id));
    return rndChoice(pool.length > 0 ? pool : JEWEL_OPTION_POOL.filter(row => JEWEL_SUMMON_OPTION_IDS.has(row.id)));
}

function rollRandomJewelStat(excludeIds, tierRange) {
    let pool = getJewelRollOptionPool(excludeIds);
    return rollJewelStat(resolveJewelRollOption(rndChoice(pool), excludeIds), tierRange);
}

function rollJewelCraftStats(count, keepStats, tierRange) {
    let stats = (keepStats || []).map(cloneJewelStat).filter(Boolean);
    let usedIds = stats.map(stat => stat.id);
    while (stats.length < count) {
        let stat = rollRandomJewelStat(usedIds, tierRange);
        if (!stat) break;
        stats.push(stat);
        usedIds.push(stat.id);
    }
    return stats;
}

function isJewelPetiteStat(stat) {
    return !!(stat && stat.petite && !stat.waxBonus);
}

function formatJewelStatValue(statId, value) {
    let option = getJewelOptionDef(statId);
    if (option && Number.isFinite(option.step) && option.step < 1) return Number(value || 0).toFixed(2);
    if (Math.abs(Number(value) || 0) < 1 && !Number.isInteger(Number(value))) return Number(value || 0).toFixed(2);
    return formatValue(statId, value);
}

function getJewelStatHiddenTier(statId, value, valMin, valMax) {
    let min = Number.isFinite(Number(valMin)) ? Number(valMin) : Number(value);
    let max = Number.isFinite(Number(valMax)) ? Number(valMax) : Number(value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 1;
    let ratio = (Number(value) - min) / (max - min);
    ratio = Math.max(0, Math.min(0.999999, ratio));
    return Math.max(1, Math.min(JEWEL_HIDDEN_TIER_COUNT, Math.floor(ratio * JEWEL_HIDDEN_TIER_COUNT) + 1));
}

function normalizeJewelStat(stat) {
    if (!stat || !stat.id) return null;
    let option = getJewelOptionDef(stat.id);
    let val = Number(stat.val);
    if (!Number.isFinite(val)) val = option ? option.min : 0;
    let valMin = Number.isFinite(Number(stat.valMin)) ? Number(stat.valMin) : (option ? option.min : val);
    let valMax = Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : (option ? option.max : val);
    let tier = Number.isFinite(Number(stat.tier)) ? Math.floor(Number(stat.tier)) : getJewelStatHiddenTier(stat.id, val, valMin, valMax);
    tier = Math.max(1, Math.min(JEWEL_HIDDEN_TIER_COUNT, tier));
    return { id: stat.id, val: val, valMin: valMin, valMax: valMax, tier: tier, petite: !!stat.petite, waxBonus: !!stat.waxBonus };
}

function cloneJewelStat(stat) {
    let normalized = normalizeJewelStat(stat);
    return normalized ? { ...normalized } : null;
}

function rollJewelStat(option, tierRange) {
    if (!option) return null;
    let requestedMinTier = tierRange ? Math.max(1, Math.min(JEWEL_HIDDEN_TIER_COUNT, Math.floor(Number(tierRange.min) || 1))) : 1;
    let requestedMaxTier = tierRange ? Math.max(requestedMinTier, Math.min(JEWEL_HIDDEN_TIER_COUNT, Math.floor(Number(tierRange.max) || requestedMinTier))) : JEWEL_HIDDEN_TIER_COUNT;
    let ailResIds = new Set(['ailResIgnite','ailResShock','ailResFreeze','ailResPoison','ailResBleed']);
    if (ailResIds.has(option.id)) {
        let tier = tierRange
            ? pickTierInRangeWeighted(requestedMinTier, requestedMaxTier)
            : 1 + Math.floor(Math.random() * JEWEL_HIDDEN_TIER_COUNT);
        let tierRanges = { 1:[12.5,25], 2:[17,30], 3:[22,36], 4:[26,43], 5:[30,50] };
        let rng = tierRanges[tier] || [12.5,50];
        let step = 0.5;
        let slots = Math.max(0, Math.floor(((rng[1]-rng[0])/step)+0.000001));
        let val = rng[0] + Math.floor(Math.random() * (slots + 1)) * step;
        val = Number(val.toFixed(2));
        return normalizeJewelStat({ id: option.id, val: val, valMin: rng[0], valMax: rng[1], tier: tier });
    }
    let hasDecimalRange = !Number.isInteger(Number(option.min)) || !Number.isInteger(Number(option.max));
    let step = Number.isFinite(option.step) && option.step > 0 ? option.step : (hasDecimalRange ? 0.1 : 1);
    let slots = Math.max(0, Math.floor(((option.max - option.min) / step) + 0.000001));
    let selectedTier = slots > 0 && tierRange ? pickTierInRangeWeighted(requestedMinTier, requestedMaxTier) : 1;
    let slotStart = tierRange ? Math.ceil(((selectedTier - 1) * (slots + 1)) / JEWEL_HIDDEN_TIER_COUNT) : 0;
    let slotEnd = tierRange ? Math.max(slotStart + 1, Math.ceil((selectedTier * (slots + 1)) / JEWEL_HIDDEN_TIER_COUNT)) : slots + 1;
    let slotIndex = slotStart + Math.floor(Math.random() * Math.max(1, slotEnd - slotStart));
    let val = option.min + Math.min(slots, slotIndex) * step;
    val = (step < 1 || !Number.isInteger(Number(val))) ? Number(val.toFixed(2)) : Math.floor(val);
    let rolled = { id: option.id, val: val, valMin: option.min, valMax: option.max };
    if (tierRange && slots > 0) rolled.tier = selectedTier;
    return normalizeJewelStat(rolled);
}

function getJewelDropTierRange(zoneTier) {
    let boundedZoneTier = Math.max(1, Math.min(20, Math.floor(Number(zoneTier) || 1)));
    let maxTier = Math.max(1, Math.min(JEWEL_HIDDEN_TIER_COUNT, Math.ceil(boundedZoneTier / 4)));
    return { min: Math.max(1, maxTier - 1), max: maxTier };
}

function makeFixedJewelStat(statId, val) {
    let stat = normalizeJewelStat({ id: statId, val: val, valMin: val, valMax: val, tier: 1 });
    return stat || { id: statId, val: val, valMin: val, valMax: val, tier: 1 };
}

function rollJewelPetiteStat(rarity, excludeIds) {
    if (rarity !== 'magic' && rarity !== 'rare') return null;
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let pool = JEWEL_PETITE_OPTION_POOL.filter(option => !excluded.has(option.id));
    if (pool.length <= 0) pool = JEWEL_PETITE_OPTION_POOL;
    let option = rndChoice(pool);
    let range = rarity === 'rare' ? option.rare : option.magic;
    let min = range[0];
    let max = range[1];
    let hasDecimalRange = !Number.isInteger(Number(min)) || !Number.isInteger(Number(max));
    let step = Number.isFinite(option.step) && option.step > 0 ? option.step : (hasDecimalRange ? 0.5 : 1);
    let slots = Math.max(0, Math.floor(((max - min) / step) + 0.000001));
    let val = min + Math.floor(Math.random() * (slots + 1)) * step;
    val = (step < 1 || !Number.isInteger(Number(val))) ? Number(val.toFixed(2)) : Math.floor(val);
    let stat = normalizeJewelStat({ id: option.id, val: val, valMin: min, valMax: max, tier: 1, petite: true });
    return stat;
}

/**
 * @param {number|{type?: string, storyOrder?: number, id?: number, depth?: number, equivalentChaosDepth?: number, tier?: number}} zoneOrTier
 * @returns {{id: number, name: string, rarity: string, hiddenTier: number, stats: Array<{id: string, val: number, valMin: number, valMax: number, tier: number}>}}
 */
/** odds: {rare, unique} chances in place of the ordinary ones (보석 광맥 omen, js/loot-omens.js jewelOdds). */
function generateJewelDrop(zoneOrTier, odds = null) {
    let tier = zoneOrTier && typeof zoneOrTier === 'object'
        ? getRealmEquipmentHiddenTierCap(zoneOrTier)
        : Math.max(1, Number(zoneOrTier) || 1);
    let dropTierRange = getJewelDropTierRange(tier);
    let uniqueChance = odds ? odds.unique : Math.max(0.003, Math.min(0.03, 0.002 + (tier / 2000)));
    if (Math.random() < uniqueChance) {
        let pool = UNIQUE_JEWEL_DB.filter(v => !v.ultra);
        let ultraPool = UNIQUE_JEWEL_DB.filter(v => v.ultra);
        let canRollUltra = ultraPool.length > 0;
        let baseRow = pool.length > 0 ? rndChoice(pool) : rndChoice(UNIQUE_JEWEL_DB);
        let row = (canRollUltra && Math.random() < 0.08) ? rndChoice(ultraPool) : baseRow;
        // 고유 주얼: 구성은 그대로 두고 파워만 약간(+10%) 상승
        let uniquePower = 1.1;
        let stats = (row.stats || []).map(st => {
            let boosted = isTenthStat(st.id) ? Math.round(st.val * uniquePower * 10) / 10 : Math.round(st.val * uniquePower);
            return makeFixedJewelStat(st.id, boosted);
        });
        let petite = rollJewelPetiteStat('rare', stats.map(st => st.id));
        if (petite) stats.push(petite);
        return { id: ++itemIdCounter, uniqueId: row.id, name: row.name, rarity: 'unique', uniqueEffect: row.uniqueEffect || '', hiddenTier: Math.max(1, ...stats.map(st => st.tier || 1)), stats: stats };
    }
    // 주얼 제작이 없어졌으므로(2026-09-30) 옵션 없는 일반 주얼은 떨어지지 않는다: 마법 1~2줄 85%, 희귀 2~4줄 15%.
    let rarity = Math.random() > (odds ? 1 - odds.rare : 0.85) ? 'rare' : 'magic';
    let lineCount = rarity === 'rare' ? (2 + Math.floor(Math.random() * 3)) : (1 + Math.floor(Math.random() * 2));
    let stats = rollJewelCraftStats(lineCount, null, dropTierRange);
    let hiddenTier = stats.length ? Math.max(1, ...stats.map(st => st.tier || 1)) : 1;
    let name = stats.length ? _t('{id} 주얼', { id: getStatName(stats[0].id) }) : '미가공 주얼';
    return { id: ++itemIdCounter, name: name, tier: 1, hiddenTier: hiddenTier, rarity: rarity, stats: stats };
}

/** Jewels go straight into the bag (js/bag-items.js addJewel): with the bag full a rare or unique one waits in the temporary
 * storage and the rest are salvaged into jewel shards. One whose rarity the auto-salvage takes is salvaged instead of kept
 * (bagItems.salvagedOnDrop); the receipt then reads stored: false with the bag not full. */
function receiveJewelDrop(jewel) {
    if(bagItems.salvagedOnDrop(jewel))return {jewel,inventoryFull:false,stored:false,protectOverflow:false,shardGain:salvageJewelObject(jewel,true)};
    combatLootReceipts.item(game,jewel,'jewel'); // 가방에 들어온 것만 지도 결과에 적는다(장비와 같다)
    const added=bagItems.addJewel(jewel);
    return {jewel,inventoryFull:added.protectOverflow||!added.stored,...added};
}

function getJewelStats(jewel) {
    if (!jewel) return [];
    if (Array.isArray(jewel.stats) && jewel.stats.length > 0) return jewel.stats.map(cloneJewelStat).filter(Boolean);
    if (jewel.stat && jewel.stat.id) return [cloneJewelStat(jewel.stat)].filter(Boolean);
    return [];
}

function getJewelRarityLabel(rarity) {
    if (rarity === 'unique') return '고유';
    if (rarity === 'rare') return ITEM_RARITY_LABELS.rare;
    if (rarity === 'magic') return ITEM_RARITY_LABELS.magic;
    return '일반';
}

function getJewelRarityClass(rarity) {
    if (rarity === 'unique') return 'unique';
    if (rarity === 'rare') return 'rare';
    if (rarity === 'magic') return 'magic';
    return 'normal';
}

function getJewelSalvageShardGain(jewel) {
    if (!jewel) return 0;
    let rarity = jewel.rarity || 'normal';
    return rarity === 'unique' ? 18 : (rarity === 'rare' ? 9 : (rarity === 'magic' ? 5 : 2));
}

function salvageJewelObject(jewel, silent) {
    let shardGain = getJewelSalvageShardGain(jewel);
    if (shardGain <= 0) return 0;
    awardCurrency('jewelShard', shardGain, 'reward');
    if (!silent) addLog(_t('💠 [{name}] 주얼 해체 ({rewards})', { name: _t(jewel.name), rewards: formatSalvageRewardSummary({ jewelShard: shardGain }) }), 'loot-normal');
    return shardGain;
}

/** @returns {number} socketed jewels returned to the bag before the item went away */
function destroySelectedCraftItem(item) {
    if (typeof getCraftSelectionRef !== 'function' || typeof isCraftSelectionEquip !== 'function') return 0;
    const jewels = equipmentSockets.returnJewels(item);
    let ref = getCraftSelectionRef();
    if (isCraftSelectionEquip()) game.equipment[ref] = null;
    else game.inventory = (game.inventory || []).filter(entry => entry !== item);
    if (typeof clearCraftSelection === 'function') clearCraftSelection();
    return jewels;
}

function drawJewelRefine() { if (game.woodsmanBuildLock) return addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    let cost = 12;
    if ((game.currencies.jewelShard || 0) < cost) return addLog(_t('주얼 가공에 필요한 주얼 결정이 부족합니다. (필요: {cost})', { cost }), 'attack-monster');
    if (!equipmentInventoryGridRuntime.findAddPlacement({ slot: bagItems.JEWEL }, game).ok) return addLog(_t('가방에 자리가 없습니다.'), 'attack-monster');
    game.currencies.jewelShard -= cost;
    let zoneTier = Math.max(1, Math.floor(((getZone(game.currentZoneId) || {}).tier || 1)));
    let jewel = generateJewelDrop(zoneTier + 8);
    if (!jewel) {
        awardCurrency('jewelShard', cost);
        return addLog(_t('주얼 가공 결과를 생성하지 못했습니다. 소모 재화를 반환합니다.'), 'attack-monster');
    }
    bagItems.put(bagItems.asJewel(jewel), game, true);
    let lineText = getJewelStats(jewel).map(stat => `${isJewelPetiteStat(stat) ? _t('쁘띠 ') : ''}${getStatName(stat.id)} +${formatJewelStatValue(stat.id, stat.val)}${Number.isFinite(Number(stat.tier)) && !isJewelPetiteStat(stat) ? ` T${Math.floor(stat.tier)}` : ''}`).join(' / ');
    addLog(_t('🎰 주얼 가공: {rarity} [{name}] 획득! ({lineText})', { rarity: getJewelRarityLabel(jewel.rarity), name: _t(jewel.name), lineText }), jewel.rarity === 'unique' ? 'loot-unique' : 'loot-rare', { item:jewel, itemKind:'jewel' });
    updateStaticUI();
}


/** 가방의 주얼 한 개를 해체한다(고유는 확인을 거친다). 확인 사이에 주얼이 가방을 떠났으면(소켓 등) 취소한다. */
async function salvageJewel(jewelId) {
    let jewel = bagItems.jewels().find(row => row.id === jewelId);
    if (!jewel) return false;
    if (jewel.rarity === 'unique' && !await requestGameConfirmation(`[${jewel.name || _t('고유 주얼')}]${pickParticle(jewel.name || '고유 주얼', '을', '를')} 해체합니다.\n주얼 결정 ${getJewelSalvageShardGain(jewel)}개를 획득하며 되돌릴 수 없습니다.`, {
        title: _t('고유 주얼 해체'),
        tone: 'danger',
        confirmLabel: _t('해체')
    })) return false;
    if (!bagItems.take(jewel)) return false;
    salvageJewelObject(jewel, false);
    dispatchRuntimeEvent('items-salvaged', { count: 1 });
    updateStaticUI();
    return true;
}

function isChaseUniqueItem(item) {
    if (!item || item.rarity !== 'unique') return false;
    if (item.ultraRare || item.chaseUnique) return true;
    let uniqueDef = UNIQUE_DB.find(unique => unique && unique.name === item.name);
    return !!(uniqueDef && uniqueDef.ultraRare);
}
function getUniqueDismantleDivineChance(item) {
    if (!item || item.rarity !== 'unique') return 0;
    if (isChaseUniqueItem(item)) return 1;
    let tier = getItemCraftTier(item);
    return Math.min(0.12, 0.01 + ((tier - 1) / 14) * 0.11);
}

function getItemSalvageRewardProfile(item, options) {
    if (bagItems.isSpecial(item)) return bagItems.salvageProfile(item); // 주얼: 주얼 결정, 액막이: 군락지 편린, 코어: 없음
    let noDivine = !!(options && options.noDivine);
    let rarity = item && item.rarity || 'normal';
    let guaranteed = {};
    let chances = [];
    if (rarity === 'normal') {
        guaranteed.magicBud = 1;
    } else if (rarity === 'magic') {
        guaranteed.magicBud = 1;
    } else if (rarity === 'rare') {
        guaranteed.formlessDew = 1;
        let tier = Math.max(1, getItemCraftTier(item));
        let explicitCount = Math.max(0, getItemExplicitOptionCount(item));
        chances.push({ key: 'formlessDew', amount: 1, chance: Math.min(0.35, 0.04 + tier * 0.01 + explicitCount * 0.02) });
    } else if (rarity === 'unique') {
        guaranteed.formlessDew = 2;
        chances.push({ key: 'sapBud', amount: 1, chance: 0.55 });
        if (!noDivine) chances.push({ key: 'goldenRule', amount: 1, chance: getUniqueDismantleDivineChance(item) });
    }
    return { guaranteed, chances };
}

function addSalvageRewardAmount(rewards, key, amount) {
    let gain = Math.max(0, Math.floor(Number(amount) || 0));
    if (!key || gain <= 0) return rewards;
    let currencyKey = getCanonicalCurrencyKey(key);
    rewards[currencyKey] = Math.max(0, Math.floor(Number(rewards[currencyKey]) || 0)) + gain;
    return rewards;
}

function mergeSalvageRewards(target, source) {
    let result = target && typeof target === 'object' ? target : {};
    Object.entries(source || {}).forEach(([key, amount]) => addSalvageRewardAmount(result, key, amount));
    return result;
}

function formatSalvageRewardSummary(rewards) {
    let normalized = mergeSalvageRewards({}, rewards);
    let entries = Object.entries(normalized).filter(([, amount]) => Number(amount) > 0);
    if (entries.length <= 0) return '회수 재화 없음';
    return entries.map(([key, amount]) => `${getStyledOrbName(key)} +${Math.floor(amount)}`).join(', ');
}

function getItemSalvagePreviewText(item, compact) {
    let profile = getItemSalvageRewardProfile(item);
    let guaranteed = Object.entries(profile.guaranteed)
        .filter(([, amount]) => amount > 0)
        .map(([key, amount]) => {
            let label = getCurrencyInfo(key).name;
            return `${label} ${amount}`;
        });
    let chances = profile.chances
        .filter(row => row && row.chance > 0)
        .map(row => compact && item && item.rarity === 'unique'
            ? null
            : `${getCurrencyInfo(row.key).name} ${Math.round(row.chance * 100)}%`)
        .filter(Boolean);
    if (compact && item && item.rarity === 'unique' && profile.chances.length > 0) chances.push('고급 재화 확률');
    return _t('해체 {concat}', { concat: guaranteed.concat(chances).join(', ') || _t('보상 없음') });
}

function rollItemSalvageRewards(item, options) {
    let replayRewards = typeof salvageRecoveryRuntime !== 'undefined'
        ? salvageRecoveryRuntime.getReplayRewards(item)
        : null;
    if (replayRewards) return replayRewards;
    let profile = getItemSalvageRewardProfile(item, options);
    let rewards = {};
    mergeSalvageRewards(rewards, profile.guaranteed);
    profile.chances.forEach(row => {
        if (row && Math.random() < Math.max(0, Math.min(1, Number(row.chance) || 0))) {
            addSalvageRewardAmount(rewards, row.key, row.amount);
        }
    });
    return rewards;
}

function salvageItemObject(item, silent, options) {
    if (!item) return {};
    const jewels = equipmentSockets.returnJewels(item);
    if (jewels > 0) addLog(_t('💠 [{name}]에 끼운 주얼 {jewels}개를 가방으로 돌려받았습니다.', { name: _t(item.name), jewels }), 'loot-rare');
    let rewards = rollItemSalvageRewards(item, options);
    Object.entries(rewards).forEach(([key, amount]) => awardCurrency(key, amount, 'reward'));
    if (typeof salvageRecoveryRuntime !== 'undefined') salvageRecoveryRuntime.record(item, rewards);
    if (!silent) addLog(_t("🧪 <span class='loot-{rarity}'>[{name}]</span> 해체, {rewards}", { rarity: item.rarity, name: _t(item.name), rewards: formatSalvageRewardSummary(rewards) }), "loot-normal");
    return rewards;
}

function salvageItem(idx) {
    let item = game.inventory[idx];
    if (!item) return;
    if (item.locked) return addLog(_t('🔒 잠금된 아이템은 해체할 수 없습니다. [{name}]', { name: _t(item.name) }), 'attack-monster');
    if (typeof equipmentLoadoutRuntime !== 'undefined' && equipmentLoadoutRuntime.isReferenced(item)) {
        return addLog(_t('🧰 장비 세팅에 저장된 아이템은 해체할 수 없습니다. [{name}]', { name: _t(item.name) }), 'attack-monster');
    }
    if (!isCraftSelectionEquip() && getCraftSelectionRef() === item.id) clearCraftSelection();
    salvageItemObject(item, false);
    game.inventory.splice(idx, 1);
    dispatchRuntimeEvent('items-salvaged', { count: 1 });
    updateStaticUI();
}

function syncSalvageControlsFromSettings() {
    game.settings.autoSalvageRarities = game.settings.autoSalvageRarities || { normal: true, magic: true, rare: false, unique: false };
    ['normal', 'magic', 'rare', 'unique'].forEach(rarity => {
        let el = document.getElementById(`chk-salvage-${rarity}`);
        if (el) el.checked = !!game.settings.autoSalvageRarities[rarity];
    });
    // 장비창 도구 줄의 해체 단추: 자동해체가 켜져 있으면 초록 점(css/equipment-window.css)
    let btn = document.getElementById('eqw-rail-salvage');
    if (btn) {
        let enabled = !!game.settings.autoSalvageEnabled;
        btn.dataset.enabled = String(enabled);
        btn.setAttribute('aria-label', _t('해체, 자동해체 {value}', { value: enabled ? _t('켜짐') : _t('꺼짐') }));
    }
}

function toggleAutoSalvage() {
    let f = game.settings.autoSalvageRarities || {};
    if (!game.settings.autoSalvageEnabled) {
        let active = ['normal', 'magic', 'rare', 'unique'].filter(r => f[r]);
        if (active.length === 0) return addLog(_t('자동해체할 등급을 먼저 선택하세요.'), 'attack-monster');
    }
    game.settings.autoSalvageEnabled = !game.settings.autoSalvageEnabled;
    syncSalvageControlsFromSettings();
    queueImportantSave(200);
    addLog(`⚙️ ${_t('자동해체')} ${_t(game.settings.autoSalvageEnabled ? '활성화' : '비활성화')}`, 'loot-normal');
}

// 일괄 해체 보호: 잠금·장비 프리셋 아이템은 대상에서 제외한다.
function isBulkSalvageProtectedItem(item) {
    if (!item) return true;
    if (item.locked || equipmentLootPolicy.matches(item)) return true;
    return typeof equipmentLoadoutRuntime !== 'undefined' && equipmentLoadoutRuntime.isReferenced(item);
}

/** Salvages `targets` (bag items) and returns the summed rewards. The bag keeps the rest and whatever came into it on the way:
 * an item hands its socketed jewels back to the bag as it is salvaged, and a bag rebuilt from a list made beforehand lost them
 * (2026-10-12). Jewels, cores and wards go the same way as gear (js/bag-items.js salvageProfile gives their rewards). */
function salvageBagItems(targets) {
    const rewards = {}, gone = new Set(targets);
    targets.forEach(item => mergeSalvageRewards(rewards, salvageItemObject(item, true)));
    game.inventory = game.inventory.filter(item => !gone.has(item));
    // Manual bulk salvage emits once; automatic drop salvage never goes through this function.
    if (targets.length) dispatchRuntimeEvent('items-salvaged', { count: targets.length });
    return rewards;
}

/** Of the items a bulk salvage asked about, those still in the bag and still unprotected once the player has answered. */
function confirmedSalvageTargets(items) {
    return items.filter(item => game.inventory.includes(item) && !isBulkSalvageProtectedItem(item));
}

function getActiveRarityFilterSet() {
    let f = (typeof getInventoryRarityFilter === 'function')
        ? getInventoryRarityFilter()
        : ((game.settings && game.settings.inventoryViewRarities) || { normal: true, magic: true, rare: true, unique: true });
    return ['normal', 'magic', 'rare', 'unique'].filter(rarity => !!f[rarity]);
}

/** The kind the bag's 필터 panel shows alone, or 'all'. A picked kind the bag no longer holds shows every kind again
 * (js/ui.js getSortedEquipmentInventoryRows), so it counts as 'all' here too. */
function getShownSlotFilter() {
    let slot = String((game.settings && game.settings.equipmentSlotFilter) || 'all');
    return slot !== 'all' && (game.inventory || []).some(item => item && item.slot === slot) ? slot : 'all';
}

/** 표시 등급 해체: what the bag shows, the grades left on and the kind picked in the 필터 panel (2026-10-19: the kind used to be ignored,
 * so picking 무기 and 일반 salvaged every normal item). */
async function bulkSalvageSelected() {
    let selectedRarities = getActiveRarityFilterSet();
    if (selectedRarities.length === 0) return addLog(_t('해체할 등급을 먼저 선택하세요. (등급 필터에서 선택)'), 'attack-monster');
    let rarityLabels = ITEM_RARITY_LABELS;
    let shownSlot = getShownSlotFilter();
    let isShown = item => selectedRarities.includes(item.rarity) && (shownSlot === 'all' || item.slot === shownSlot);
    let targetItems = (game.inventory || []).filter(item => item && !isBulkSalvageProtectedItem(item) && isShown(item));
    let targetCount = targetItems.length;
    if (targetCount <= 0) return addLog(_t('선택한 등급의 해체 가능한 장비가 없습니다.'), 'attack-monster');
    let labelText = selectedRarities.map(r => rarityLabels[r] || r).join('/');
    const note = bagItems.countNote(targetItems);
    if (!await requestGameConfirmation(`[${labelText}] 등급 ${shownSlot === 'all' ? _t('장비') : shownSlot} ${targetCount}개를 해체합니다.${note ? `\n${note} 포함` : ''}\n잠금, 세팅, 우선 보관 장비는 빼고 해체합니다.`, {
        title: _t('등급 일괄 해체'),
        tone: 'danger',
        confirmLabel: _t('{targetCount}개 해체', { targetCount })
    })) return;
    const targets = confirmedSalvageTargets(targetItems);
    const lockedSkipped = game.inventory.filter(item => isShown(item) && isBulkSalvageProtectedItem(item)).length;
    if (targets.length === 0) {
        if (lockedSkipped > 0) return addLog(_t('🔒 고른 장비가 모두 보호 중입니다(잠금, 세팅, 우선 보관 {lockedSkipped}개).', { lockedSkipped }), 'attack-monster');
        return addLog(_t('선택한 등급의 장비가 없습니다.'), 'attack-monster');
    }
    const rewards = salvageBagItems(targets);
    ensureCraftSelectionValid();
    addLog(_t('🧪 선택한 등급 장비 {count}개 해체, {rewards}{kept}', { count: targets.length, rewards: formatSalvageRewardSummary(rewards), kept: lockedSkipped > 0 ? ` ${_t('(잠금, 세팅, 우선 보관 {n}개는 남김)', { n: lockedSkipped })}` : '' }), 'loot-normal');
    updateStaticUI();
}
/** 전체 해체, from the panel's button or the rail's 해체 button double-clicked (js/equipment-window-ui.js RAIL_DOUBLE_CLICK). Both ask
 * first with a summary of what goes (2026-11-06; the double-click used to salvage at once). Locked, set and priority-kept gear stays. */
async function bulkSalvageAllInventory() {
    if (!Array.isArray(game.inventory) || game.inventory.length <= 0) return addLog(_t('해체할 장비가 없습니다.'), 'attack-monster');
    let lockedCount = game.inventory.filter(item => isBulkSalvageProtectedItem(item)).length;
    let targetItems = game.inventory.filter(item => !isBulkSalvageProtectedItem(item));
    if (targetItems.length <= 0) return addLog(_t('🔒 잠금, 세팅, 우선 보관 장비뿐이라 전체 해체할 장비가 없습니다.'), 'attack-monster');
    if (!await confirmBulkSalvageAll(targetItems, lockedCount)) return;
    const targets = confirmedSalvageTargets(targetItems), rewards = salvageBagItems(targets);
    if (!isCraftSelectionEquip()) clearCraftSelection();
    addLog(_t('🧪 인벤토리 전체해체 완료 ({count}개), {rewards}{kept}', { count: targets.length, rewards: formatSalvageRewardSummary(rewards), kept: lockedCount > 0 ? `, ${_t('잠금, 세팅, 우선 보관 {n}개는 남김', { n: lockedCount })}` : '' }), 'loot-normal');
    updateStaticUI();
}
function confirmBulkSalvageAll(targetItems, lockedCount) {
    const count = targetItems.length;
    // 주얼, 코어, 액막이도 요약의 종류 칸에 나온다(예전에는 "주얼 N개 포함" 줄).
    return requestGameConfirmation(`인벤토리 장비 ${count}개를 모두 해체합니다.${lockedCount > 0 ? `\n잠금, 세팅, 우선 보관 장비 ${lockedCount}개는 빼고 해체합니다.` : ''}`, {
        title: _t('인벤토리 전체 해체'),
        tone: 'danger',
        confirmLabel: _t('{count}개 해체', { count }),
        summaryHtml: equipmentWindowUi.salvageSummaryHtml(targetItems)
    });
}

function getAvailableSporeCraftModes() {
    let modes = ['none', 'fire', 'cold', 'light'];
    if (contentProgression.isUnlocked('advancedSpores')) modes.push('chaos', 'damage');
    return modes;
}

/** 카오스 · 피해 계열 수확 제작은 고급 수확 제작 해금 뒤에만 쓴다. 저장된 선택도 쓰는 순간 다시 본다(제작 · 미리보기 · 다시 사용 공통).
 * 이름의 spore는 이 제작의 옛 이름(홀씨)이다: 계열 선택(game.sporeCraftModes)과 줄의 출처(craftSource 'spore')가 저장에 그대로 남는다. */
function getSporeCraftBlockReason(item, actionKey, mode, omen = null) {
    if (['chaos', 'damage'].includes(mode) && !getAvailableSporeCraftModes().includes(mode)) return '카오스, 피해 계열 수확 제작은 고급 수확 제작을 해금해야 쓸 수 있습니다.';
    const reason = equipmentCrafting.getSporeBlockReason(item, actionKey, mode);
    if (reason || mode === 'none' || !equipmentCrafting.basicActions.includes(actionKey)) return reason;
    return equipmentCrafting.sporePool(item, actionKey, mode, omen).length ? '' : '선택한 수확 계열에서 새로 부여할 수 있는 옵션이 없습니다.';
}

function isSporeCraftEquipment(item) {
    if (!item) return false;
    let slot = String(item.slot || '').replace(/[123]$/, '');
    return EQUIPMENT_DROP_SLOTS.includes(slot);
}

// The elemental lines a rot harvest removes (data/affix-tags.js AFFIX_TAG_LISTS.rotSpore).
const ROT_SPORE_STAT_IDS = resolveAffixTagList(AFFIX_TAG_LISTS.rotSpore, MOD_DB);
/** 부패 수확의 값: 화염, 냉기, 번개 식물 하나씩(data/stump-box.js STUMP_BOX_HARVEST_CRAFT.rot). */
const rotHarvestKeys = () => STUMP_BOX_HARVEST_CRAFT.rot.map(color => stumpBox.harvestPriceKey('any', color));
const riftHarvestKey = () => stumpBox.harvestPriceKey(STUMP_BOX_HARVEST_CRAFT.riftKind);
const holdsHarvest = key => stumpBox.harvestPriceHeld(game, key) >= 1;
/** Why a rot harvest cannot take a line off the item, or '': corrupted gear, a fused relic (as for the pruning shears, craftCurrencyUse
 * RELIC_ACTIONS) and a hall piece. */
function getRotHarvestRefusal(item) {
    if (item.corrupted) return '타락한 아이템에는 사용할 수 없습니다.';
    if (item.fusedRelic) return '융합 유물은 황금률, 잿불가지, 축복의 꽃잎만 사용할 수 있습니다.';
    return item.hallReplica ? '전당 소장품은 원본 상태를 보존하므로 제작할 수 없습니다.' : '';
}
function applyCorruptSporeToSelectedItem() { if (game.woodsmanBuildLock) return addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    if (!contentProgression.isUnlocked('advancedSpores')) return addLog(_t('부패 수확은 고급 수확 제작을 해금해야 쓸 수 있습니다.'), 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog(_t('먼저 아이템을 선택하세요.'), 'attack-monster');
    if (!isSporeCraftEquipment(item)) return addLog(_t('수확 제작은 장비에만 사용할 수 있습니다.'), 'attack-monster');
    const refusal = getRotHarvestRefusal(item);
    if (refusal) return addLog(_t(refusal), 'attack-monster');
    if (!rotHarvestKeys().every(holdsHarvest)) return addLog(_t('부패 수확에는 화염, 냉기, 번개 식물이 하나씩 필요합니다.'), 'attack-monster');
    let ids = new Set(ROT_SPORE_STAT_IDS);
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let candidates = item.stats.map((stat, idx) => ({ stat, idx })).filter(row => row.stat && !row.stat.lockedByHoney && !row.stat.lockedByRift && ids.has(row.stat.id));
    if (candidates.length <= 0) return addLog(_t('제거할 원소 계열 옵션이 없습니다.'), 'attack-monster');
    rotHarvestKeys().forEach(key => stumpBox.payHarvestPrice(game, key));
    let pick = rndChoice(candidates);
    let removed = item.stats.splice(pick.idx, 1)[0];
    updateItemName(item);
    addLog(_t('🌿 부패 수확 적용: {value} 옵션 제거', { value: _t(removed.statName || getStatName(removed.id)) }), 'loot-rare');
    updateStaticUI();
}

function applyRiftSporeToSelectedItem() { if (game.woodsmanBuildLock) return addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    if (!contentProgression.isUnlocked('advancedSpores')) return addLog(_t('균열 수확은 고급 수확 제작을 해금해야 쓸 수 있습니다.'), 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog(_t('먼저 아이템을 선택하세요.'), 'attack-monster');
    if (!isSporeCraftEquipment(item)) return addLog(_t('수확 제작은 장비에만 사용할 수 있습니다.'), 'attack-monster');
    const craftBlock = equipmentCrafting.getRiftHarvestBlockReason(item);
    if (craftBlock) return addLog(craftBlock, 'attack-monster');
    if ((game.currencies.fossil || 0) < 1 || !holdsHarvest(riftHarvestKey())) return addLog(_t('균열 수확에는 미궁 화석 1개와 뿌리 1개가 필요합니다.'), 'attack-monster');
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let pool = typeof getFossilExclusivePool === 'function' ? getFossilExclusivePool(item) : FOSSIL_EXCLUSIVE_MODS.filter(mod => mod.slots.includes(item.slot));
    if (!pool || pool.length <= 0) return addLog(_t('이 장비 슬롯에 붙일 수 있는 화석 전용 옵션이 없습니다.'), 'attack-monster');
    game.currencies.fossil--;
    stumpBox.payHarvestPrice(game, riftHarvestKey());
    let roll = rollAffixValue(pickWeightedMod(pool), getItemCraftTier(item));
    roll.fossilExclusiveSpore = true;
    roll.craftSource = 'fossil';
    item.stats.push(roll);
    item.rarity = item.rarity === 'normal' ? 'magic' : item.rarity;
    updateItemName(item);
    addLog(_t('🌿 균열 수확 적용: {value} +{value2}', { value: _t(roll.statName || getStatName(roll.id)), value2: formatValue(roll.id, roll.val) }), 'loot-unique');
    updateStaticUI();
}

function isRemovableExplicitStat(stat) {
    return !!(stat && !stat.lockedByHoney && !stat.lockedByRift && !stat.encroachedFinal && !stat.unremovable);
}


const QUALITY_ATTRIBUTE_MODES = ['base', 'fire', 'cold', 'light', 'chaos', 'physical', 'defense', 'speed'];
// 기폭제(12번 루프 32, js/sap-catalysts.js)만 주는 품질 속성: 심연 촉매의 순환(QUALITY_ATTRIBUTE_MODES)에는 들지 않는다.
const QUALITY_CATALYST_MODES = ['crit', 'summon'];
const QUALITY_ATTRIBUTE_LABELS = { base: '기본', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스', physical: '물리', defense: '방어', speed: '속도',
    crit: '치명', summon: '소환' };
// The lines each quality mode scales come from its tag rule (data/affix-tags.js AFFIX_TAG_LISTS.quality), unique lines included.
const QUALITY_ATTRIBUTE_STAT_GROUPS = Object.fromEntries(Object.entries(AFFIX_TAG_LISTS.quality)
    .map(([mode, rule]) => [mode, resolveAffixTagList(rule, MOD_DB)]));

function getItemQualityAttributeMode(item) {
    let mode = item && typeof item.qualityAttribute === 'string' ? item.qualityAttribute : 'base';
    return QUALITY_ATTRIBUTE_MODES.includes(mode) || QUALITY_CATALYST_MODES.includes(mode) ? mode : 'base';
}

function getItemQualityAttributeLabel(mode) {
    return QUALITY_ATTRIBUTE_LABELS[mode] || QUALITY_ATTRIBUTE_LABELS.base;
}

function getNextItemQualityAttributeMode(mode) {
    let current = QUALITY_ATTRIBUTE_MODES.indexOf(QUALITY_ATTRIBUTE_MODES.includes(mode) ? mode : 'base');
    return QUALITY_ATTRIBUTE_MODES[(current + 1) % QUALITY_ATTRIBUTE_MODES.length];
}

function isQualityAttributeStat(mode, statId) {
    let group = QUALITY_ATTRIBUTE_STAT_GROUPS[mode] || [];
    return group.includes(statId);
}

function applyAbyssCatalystToItemQuality(item) {
    let nextMode = getNextItemQualityAttributeMode(getItemQualityAttributeMode(item));
    item.qualityAttribute = nextMode;
    return getItemQualityAttributeLabel(nextMode);
}

function getCosmosBossRelicStatTotals() {
    let atlas = (game && game.cosmosAtlas) || {};
    let equipped = (atlas.equippedStones && typeof atlas.equippedStones === 'object') ? atlas.equippedStones : {};
    let legacyEquippedGalaxy = Math.max(0, Math.min(6, Math.floor(atlas.equippedStoneGalaxy || 0)));
    let optionsByGalaxy = (atlas.bossStoneOptions && typeof atlas.bossStoneOptions === 'object') ? atlas.bossStoneOptions : {};
    let totals = {};
    Object.keys(optionsByGalaxy).forEach(galaxyKey => {
        let galaxy = Math.max(1, Math.min(6, Math.floor(Number(galaxyKey) || 0)));
        let isEquipped = !!equipped[galaxyKey] || (Object.keys(equipped).length === 0 && legacyEquippedGalaxy >= galaxy);
        if (!isEquipped) return;
        (Array.isArray(optionsByGalaxy[galaxyKey]) ? optionsByGalaxy[galaxyKey] : []).forEach(option => {
            if (!option || !option.stat) return;
            totals[option.stat] = (totals[option.stat] || 0) + Number(option.value || 0);
        });
    });
    return totals;
}

safeExposeGlobals({ getItemQualityAttributeMode, getItemQualityAttributeLabel, isQualityAttributeStat, getCosmosBossRelicStatTotals });

function getAnnulmentRemovableStats(item) {
    return (item && Array.isArray(item.stats) ? item.stats : [])
        .map((stat, index) => ({ stat, index }))
        .filter(row => isRemovableExplicitStat(row.stat));
}

/** 수확 계열 하나의 값: 그 계열 색의 다 자란 식물 하나(data/stump-box.js STUMP_BOX_HARVEST_CRAFT, 꽃, 열매, 덩굴, 뿌리 어느 것이든). */
function getSporeCraftPriceKey(mode) {
    return stumpBox.harvestPriceKey('any', STUMP_BOX_HARVEST_CRAFT.colors[mode]);
}

function hasSporeCraftCost(mode) {
    if (!mode || mode === 'none' || !Object.hasOwn(STUMP_BOX_HARVEST_CRAFT.colors, mode)) return true;
    return holdsHarvest(getSporeCraftPriceKey(mode));
}

// 잿불가지(타락) 제작 결과(2026-10-05 사용자 요청, data/items.js TAINTED_CRAFT_OUTCOMES): 이 장비에 쓸 수 없는 결과는 빼고 남은 비중으로 한 번 고른다.
function getTaintedRerollLines(item) {
    return (item.stats || []).map((stat, index) => ({ stat, index }))
        .filter(({ stat }) => stat && !stat.lockedByHoney && !stat.lockedByRift);
}

function canApplyTaintedOutcome(item, kind) {
    if (kind === 'addMod') return getAvailableMods(item).length > 0;
    if (kind === 'quality') return Math.floor(Number(item.quality) || 0) < TAINTED_CRAFT_OUTCOMES.quality.cap;
    if (kind === 'rerollMod') return getTaintedRerollLines(item).length > 0 && getAvailableMods(item).length > 0;
    if (kind === 'socket') return contentProgression.isUnlocked('jewel') && equipmentSockets.canAddCorruptionSocket(item);
    return kind === 'nothing';
}

function pickTaintedOutcome(item) {
    const rows = TAINTED_CRAFT_OUTCOMES.weights.filter(([kind]) => canApplyTaintedOutcome(item, kind));
    let roll = Math.random() * rows.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [kind, weight] of rows) {
        if (roll < weight) return kind;
        roll -= weight;
    }
    return 'nothing';
}

/** One random explicit line (not honey/rift locked) becomes a different random mod rolled at the item's craft tier. */
function rerollTaintedLine(item) {
    const { stat, index } = rndChoice(getTaintedRerollLines(item));
    const name = stat.statName || getStatName(stat.id);
    item.stats.splice(index, 1);
    // 새 줄은 빠진 줄을 뺀 접두 3, 접미 3 자리가 남는 종류에서(옵션 추가만 한도를 넘는다). 고를 줄이 없으면 원래 줄이 남는다.
    const open = getOpenAffixMods(item);
    const mod = pickWeightedMod(open.filter(row => (row.statId || row.id) !== stat.id)) || pickWeightedMod(open);
    item.stats.splice(index, 0, mod ? rollAffixValue(mod, getItemCraftTier(item)) : stat);
    updateItemName(item);
    return _t('{name} 옵션이 {statName} 옵션으로 바뀌었습니다.', { name, statName: item.stats[index].statName || getStatName(item.stats[index].id) });
}

/**
 * Corrupts the item and applies one outcome. Quality may pass the usual 20% up to the outcome cap (corrupted items resolve
 * quality up to 30%, js/equipment-stat-resolution.js). The socket outcome opens the corruption socket (js/equipment-sockets.js):
 * a second socket beside an accessory's void socket, or the item's only socket.
 * @returns {{kind: 'addMod'|'quality'|'rerollMod'|'socket'|'nothing', text: string}}
 */
function corruptCraftedItem(item) {
    const kind = pickTaintedOutcome(item);
    item.corrupted = true;
    if (kind === 'addMod') {
        item.stats.push(rollAffixValue(pickWeightedMod(getAvailableMods(item)), getItemCraftTier(item)));
        if (item.rarity === 'normal') item.rarity = 'magic'; // 줄이 붙은 일반 장비는 마법이 된다(균열 수확과 같다)
        updateItemName(item);
        return { kind, text: _t('추가 옵션이 부여되었습니다.') };
    }
    if (kind === 'quality') {
        const { min, max, cap } = TAINTED_CRAFT_OUTCOMES.quality, before = Math.floor(Number(item.quality) || 0);
        item.quality = Math.min(cap, before + min + Math.floor(Math.random() * (max - min + 1)));
        return { kind, text: _t('품질이 {before}% → {quality}%로 올랐습니다.', { before, quality: item.quality }) };
    }
    if (kind === 'rerollMod') return { kind, text: rerollTaintedLine(item) };
    if (kind === 'socket') {
        equipmentSockets.addCorruptionSocket(item);
        return { kind, text: equipmentSockets.count(item) > 1 ? '두 번째 소켓, 타락 소켓이 열렸습니다!' : '타락 소켓이 하나 생겼습니다.' };
    }
    return { kind, text: _t('아이템에 변화가 없습니다.') };
}

/**
 * @param {string} currencyKey Crafting action; pays one of that currency.
 * @returns {Promise<true|undefined>} True only after the item and payment are committed.
 */
// 제작실의 재화 한 번(js/crafting-workspace-ui.js workspaceExecuteCraft): 막는 까닭, 수확 보장과 뿌리 준비, 값 치르기, 효과, 기록.
// 2026-10-18 정리: 한 함수(복잡도 145, 288줄)를 책임별로 나눴다. 기본 제작의 굴림은 js/equipment-crafting.js가 맡는다.
const craftCurrencyUse = (() => {
    const qualityFits = slots => item => slots.includes(String(item.slot || '')) && Math.max(0, Math.floor(item.quality || 0)) < 20 && !item.qualityLockedByLimitBreak;
    /** Whether each action fits the item now (rarity, room, slot, quality). An action missing here never fits. */
    const FITS = Object.freeze({
        ...Object.fromEntries(equipmentCrafting.basicActions.map(action=>[action,item=>equipmentCrafting.basicFits(item,action)])),
        divine: item => item.rarity !== 'normal', chance: item => item.rarity === 'normal' && getFairyRingUniquePools(item).normal.length > 0,
        scour: item => item.rarity !== 'normal' && item.rarity !== 'unique',
        tainted: item => !item.corrupted || (isKaleidoscopeShieldItem(item) && getItemExplicitOptionCount(item) <= EXPLICIT_AFFIX_LINE_CAP),
        blessing: item => Array.isArray(item.baseStats) && item.baseStats.length > 0,
        annulment: item => getAnnulmentRemovableStats(item).length > 0,
        abyssCatalyst: item => Math.max(0, Math.floor(item.quality || 0)) > 0 && Array.isArray(item.stats) && item.stats.length > 0,
        deepWhetstone: qualityFits(['무기']), rootIron: qualityFits(['투구', '갑옷', '방패', '장갑', '신발', '허리띠']), jewelPolish: qualityFits(['목걸이', '반지'])
    });
    const RELIC_ACTIONS = Object.freeze(['divine', 'tainted', 'blessing']);
    /** Why action cannot be used on item now, or '': the build lock, a 성화의 뿌리 pick waits, corruption, a fused relic, or the action does
     * not fit. */
    function blockReason(item, action) {
        const locked = equipmentCrafting.buildLockReason(game);
        if (locked) return locked;
        const waiting = equipmentCrafting.choiceWaitReason(game);
        if (waiting) return waiting;
        if (item.corrupted && action !== 'tainted') return '타락한 아이템은 더 이상 제작할 수 없습니다.';
        if (item.fusedRelic && !RELIC_ACTIONS.includes(action)) return '융합 유물은 황금률, 잿불가지, 축복의 꽃잎만 사용할 수 있습니다.';
        return Object.hasOwn(FITS, action) && FITS[action](item) ? '' : '지금 선택한 아이템에는 사용할 수 없습니다.';
    }

    /** The harvest line family set for this currency (saved as a spore mode); it guarantees lines on gear only. */
    function sporeMode(item, currencyKey) {
        game.sporeCraftModes = game.sporeCraftModes || {};
        return isSporeCraftEquipment(item) ? (game.sporeCraftModes[currencyKey] || 'none') : 'none';
    }
    /** Why the harvest guarantee stops a basic craft, or '': the family's unlock, no line of the family to give, or no plant of its colour. */
    function sporeReason(item, action, mode, guaranteedMod) {
        const blocked = getSporeCraftBlockReason(item, action, mode);
        if (blocked || mode === 'none' || !equipmentCrafting.basicActions.includes(action)) return blocked;
        if (!guaranteedMod) return equipmentCrafting.rerollActions.includes(action) ? '이 장비에는 선택한 수확 계열로 출현 가능한 옵션이 없어 제작할 수 없습니다.'
            : '선택한 수확 계열에서 새로 부여할 수 있는 옵션이 없습니다. 수확 제작을 사용 안 함으로 바꾸거나 해당 계열의 기존 옵션을 제거하세요.';
        return hasSporeCraftCost(mode) ? '' : '식물이 없어 제작을 시작하지 않았습니다.';
    }
    /** One plant of the family's colour: stored currency first, then the plainest stored plant (js/stump-box.js payHarvestPrice). */
    function spendSpores(mode) {
        if (mode !== 'none') stumpBox.payHarvestPrice(game, getSporeCraftPriceKey(mode));
    }
    /** Everything decided before payment: { reason }, or { spore, guaranteedMod, omen, addedMod } (the spore mode a basic craft uses,
     * its guaranteed mod, the 제작 뿌리 it uses and the line a 수액 봉오리 on a rare adds). */
    function plan(item, currencyKey, action) {
        const mode = sporeMode(item, currencyKey), spore = equipmentCrafting.basicActions.includes(action) ? mode : 'none';
        const sideBlock = equipmentCrafting.armedSideReason(game, item, action, spore);
        if (sideBlock) return { reason: sideBlock };
        const omen = equipmentCrafting.omenFor(game, action, item, mode);
        const guaranteedMod = spore === 'none' ? null : equipmentCrafting.pickSporeMod(item, action, spore, omen);
        const reason = sporeReason(item, action, mode, guaranteedMod);
        if (reason) return { reason };
        const addedMod = action === 'exalted' ? guaranteedMod || equipmentCrafting.pickAddMod(item, omen) : null;
        return action === 'exalted' && !addedMod ? { reason: _t('이 장비에 추가로 부여할 수 있는 옵션이 없습니다.') } : { spore, guaranteedMod, omen, addedMod };
    }
    function addonReason(item, action, mode) {
        return equipmentCrafting.armedSideReason(game, item, action, mode)
            || getSporeCraftBlockReason(item, action, mode, equipmentCrafting.omenFor(game, action, item, mode));
    }

    // ---------------------------------------------------------------- effects after payment (basic crafts: equipmentCrafting.craftBasic)
    function raiseQuality(item, run) {
        item.quality = Math.max(0, Math.min(20, Math.floor(item.quality || 0) + 1));
        run.logs.push([_t('🛠️ 장비 퀄리티 +1% (현재 {quality}%)', { quality: item.quality }), 'loot-magic']);
    }
    /** 황금률: every value rolled again inside its tier (locked lines kept), the infusion, and a socket amp unique's amp. */
    function rerollValues(item, run) {
        const onSide = stat => equipmentCrafting.onOmenSide(item, stat, run.omen);
        item.stats.forEach(stat => { if (!stat.lockedByHoney && !stat.lockedByRift && onSide(stat)) rerollStoredAffixValue(stat); });
        const infusion = item.chaosInfusion;
        if (infusion && onSide(infusion) && Number.isFinite(Number(infusion.valMin)) && Number.isFinite(Number(infusion.valMax))) rerollStoredAffixValue(infusion);
        if (!run.omen && item.uniqueEffectKey === 'abyssSocketAndJewelAmp' && item.uniqueEffectParams) rerollAbyssAmp(item);
    }
    function rerollAbyssAmp(item) {
        const p = item.uniqueEffectParams;
        const ampMin = Math.max(1, Math.floor(Number(p.ampMin || 1)));
        const ampMax = Math.max(ampMin, Math.floor(Number(p.ampMax || 100)));
        p.ampPct = ampMin + Math.floor(Math.random() * (ampMax - ampMin + 1));
        item.uniqueEffectParams = p;
        const socketCount = Array.isArray(item.abyssSockets) ? item.abyssSockets.length : Math.max(1, Math.floor(Number(p.socketsMin || 1)));
        item.uniqueEffect = _t('심연 주얼 슬롯 ({socketCount})개, 장착 심연 주얼 효과 +{ampPct}%', { socketCount, ampPct: p.ampPct });
    }
    const jewelsBack = jewels => (jewels ? _t(' 끼운 주얼 {jewels}개는 가방으로 돌아왔습니다.', { jewels }) : '');
    // 요정의 고리로 고유가 되어도 남는 칸: id와 instanceId(가방 자리, 장비 프리셋, 그루터기 큐브가 이것으로 찾는다), 우로보로스 봉인, 잠금,
    // 거래 막힘 표시.
    const FAIRY_RING_KEPT_FIELDS = Object.freeze(['id', 'instanceId', 'loopSealed', 'locked', 'tradeLocked', 'hallRelistBlocked']);
    /** 요정의 고리: a quarter of the time the item breaks, else it becomes a unique of its slot and tier (same id), a chase one at the
     * drop's chase chance. false when no unique exists for it (FITS.chance refuses that before the payment). */
    function fairyRing(item, run) {
        if (Math.random() < 0.25) {
            run.logs.push([_t('💥 요정의 고리: 아이템이 파괴되었습니다.{item}', { item: jewelsBack(destroySelectedCraftItem(item)) }), 'attack-monster']);
            return true;
        }
        const pools = getFairyRingUniquePools(item), pool = pools.chase.length && Math.random() < getChaseUniqueChance(getZone(game.currentZoneId) || {}) ? pools.chase : pools.normal;
        const unique = pool.length ? generateUniqueItem(pools.tier, item.slot, rndChoice(pool).name) : null;
        if (!unique) { run.logs.push([_t('승급할 수 있는 고유가 없습니다.'), 'attack-monster']); return false; }
        // The unique is a fresh item: socketed jewels go back to storage before the old keys are cleared. What names the piece and what was
        // set on it stay (FAIRY_RING_KEPT_FIELDS).
        const kept = Object.fromEntries(FAIRY_RING_KEPT_FIELDS.filter(key => Object.hasOwn(item, key)).map(key => [key, item[key]]));
        const jewels = equipmentSockets.returnJewels(item);
        Object.keys(item).forEach(key => delete item[key]);
        Object.assign(item, unique, kept);
        run.logs.push([_t('🌟 요정의 고리: [{name}] 고유로 진화했습니다.{jewels}', { name: _t(item.name), jewels: jewelsBack(jewels) }), 'loot-unique']);
        return true;
    }
    function annul(item, run) {
        const candidates = getAnnulmentRemovableStats(item).filter(row => equipmentCrafting.onOmenSide(item, row.stat, run.omen));
        const picked = equipmentCrafting.pickPruneLine(candidates, run.omen);
        const removed = item.stats.splice(picked.index, 1)[0];
        updateItemName(item);
        run.logs.push([_t('🕳️ 전정 가위: {value} 옵션 제거', { value: _t(removed.statName || getStatName(removed.id)) }), 'loot-unique']);
    }
    function scour(item, run) {
        const sideOnly = run.omen && run.omen.effect === 'side', onSide = stat => equipmentCrafting.onOmenSide(item, stat, run.omen);
        item.stats = (item.stats || []).filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift || !onSide(stat)));
        if (item.chaosInfusion && onSide(item.chaosInfusion)) item.chaosInfusion = null;
        const remaining = getItemExplicitOptionCount(item) > 0;
        item.rarity = remaining ? (sideOnly ? item.rarity : 'magic') : 'normal';
        updateItemName(item);
    }
    function taint(item, run) {
        const outcome = corruptCraftedItem(item);
        run.token.meta.outcome = outcome.text; // 제작 경과가 그 줄로 시작한다(js/crafting-workspace-ui.js)
        run.logs.push([_t('🩸 타락: {text}', { text: outcome.text }), outcome.kind === 'nothing' ? 'attack-monster' : 'loot-unique', { toast: true }]);
    }
    function catalyse(item, run) {
        const label = applyAbyssCatalystToItemQuality(item);
        run.logs.push([_t('🧪 심연 촉매: [{name}] 퀄리티 속성 → {label}', { name: _t(item.name), label }), 'loot-unique']);
    }
    /** A base line's roll range [low, high]: its base roll, else its range, else its value. */
    function blessRange(stat) {
        let low = Number.isFinite(Number(stat.baseRollMin)) ? Number(stat.baseRollMin) : Number(stat.valMin);
        let high = Number.isFinite(Number(stat.baseRollMax)) ? Number(stat.baseRollMax) : Number(stat.valMax);
        if (!Number.isFinite(low) || !Number.isFinite(high)) {
            const fallback = Number.isFinite(Number(stat.val)) ? Number(stat.val) : Number(stat.base || 0);
            low = fallback;
            high = fallback;
        }
        return high < low ? [high, low] : [low, high];
    }
    /** 축복의 꽃잎: one base line rolled again inside its base range (in tenths for the leech and regen lines). */
    function blessBaseStat(stat) {
        let [low, high] = blessRange(stat);
        if (isTenthStat(stat.id)) {
            const minStep = Math.round(low * 10), maxStep = Math.round(high * 10);
            stat.val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
            low = minStep / 10;
            high = maxStep / 10;
        } else {
            low = Math.floor(low);
            high = Math.floor(high);
            if (high > 0) low = Math.max(1, low);
            stat.val = low + Math.floor(Math.random() * (high - low + 1));
        }
        Object.assign(stat, { baseRollMin: low, baseRollMax: high, valMin: low, valMax: high });
    }
    function bless(item) {
        (item.baseStats || []).forEach(blessBaseStat);
        if (typeof colonyWards === 'object') colonyWards.rerollBelt(item); // 허리띠는 액막이 칸 수(1~3)도 다시 굴린다
    }
    const EFFECTS = Object.freeze({ deepWhetstone: raiseQuality, rootIron: raiseQuality, jewelPolish: raiseQuality, divine: rerollValues,
        chance: fairyRing, annulment: annul, scour, tainted: taint, abyssCatalyst: catalyse, blessing: bless });
    /** The action's effect on item; false when it could not happen after all (a fairy ring with no unique for the slot). */
    function apply(item, action, run) {
        if (!equipmentCrafting.basicActions.includes(action)) return EFFECTS[action](item, run);
        // 수확 보장 줄: 첫 결과는 값을 치르기 전에 고른 종류로, 성화의 뿌리의 나머지 결과는 저마다 같은 풀에서 다시 골라 굴린다.
        const guaranteedFor = copy => (run.guaranteedMod ? equipmentCrafting.rollSporeLine(copy,
            equipmentCrafting.pickSporeMod(copy, action, run.spore, run.omen) || run.guaranteedMod, run.omen) : null);
        equipmentCrafting.craftBasic(game, item, action, { addedMod: run.addedMod, guaranteedStat: equipmentCrafting.rollSporeLine(item, run.guaranteedMod, run.omen),
            guaranteedFor, omen: run.omen });
        return true;
    }

    /** One use of currencyKey on the selected item, nothing logged or drawn here: { reason } when nothing happened, else { ok, logs }
     * (ok false: paid but no change, a fairy ring with no unique). logs are addLog arguments in order. */
    function use(currencyKey) {
        const item = getSelectedCraftItem();
        if (!item) return { reason: _t('먼저 아이템을 선택하세요.') };
        const payment = getCraftPayment(currencyKey);
        // A key that is no craft currency (the old 'divine', merged into 황금률) is refused like a missing one.
        if (!Object.hasOwn(ORB_DB, currencyKey) || !payment || !payment.affordable) return { reason: _t('제작 재화가 부족하거나 사용할 수 없는 제작 방식입니다.') };
        const action = equipmentCrafting.resolveAction(currencyKey, item.rarity);
        const block = blockReason(item, action);
        if (block) return { reason: block };
        const run = plan(item, currencyKey, action);
        if (run.reason) return { reason: run.reason };
        run.token = craftingResultLedger.begin(item, { currencyKey, actionKey: action });
        run.logs = [];
        spendSpores(run.spore);
        game.currencies[payment.key] -= payment.cost;
        if (apply(item, action, run) === false) return { ok: false, logs: run.logs };
        const note = (run.spore !== 'none' && run.guaranteedMod ? _t(', 수확 보장: {statName}', { statName: run.guaranteedMod.statName }) : '') + equipmentCrafting.spendOmen(game, run.omen);
        craftingResultLedger.commit(run.token, item);
        run.logs.push([_t('⚒️ {name} 사용{note}', { name: _t(ORB_DB[payment.key].name), note }), 'loot-magic']);
        return { ok: true, logs: run.logs };
    }
    return Object.freeze({ use, blockReason, addonReason });
})();

/** The crafting workspace's currency use (js/crafting-workspace-ui.js): craftCurrencyUse.use, its log lines, a redraw. true when it
 * crafted. Kept async for its callers. */
async function useCurrency(currencyKey) {
    const result = craftCurrencyUse.use(currencyKey);
    if (result.reason) return addLog(result.reason, 'attack-monster');
    result.logs.forEach(args => addLog(...args));
    if (!result.ok) return undefined;
    updateStaticUI();
    return true;
}

function isMarketUnlocked() {
    return contentProgression.isUnlocked('market');
}

safeExposeGlobals({
    getRealmEquipmentHiddenTierCap,
    getRealmItemDropTierRange,
    getDroppedAffixTierRange,
    rollRealmItemDropTier,
    getAnnulmentRemovableStats,
    getSporeCraftPriceKey,
    hasSporeCraftCost,
    isSporeCraftEquipment,
    getItemSalvageRewardProfile,
    getItemSalvagePreviewText,
    rollItemSalvageRewards,
    mergeSalvageRewards,
    formatSalvageRewardSummary
});
