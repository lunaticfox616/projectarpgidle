

// legacyDamageBase is the pre-2026-09-11 definition. Keep rolled rank and exceptional overflow,
// and mark each base stat once; hidden/affix tiers never determine weapon base strength.
export function equipmentSaveMigrateWeaponBaseDamage(env, item) {
    if (item.slot !== '무기') return;
    if (item.baseStats.every(stat => stat.baseDamageBalanceVersion >= 1
        || !['flatDmg', 'spellFlatDmg'].includes(stat.id))) return;
    const base = env.deps.BASE_ITEM_DB.find(row => row.id === item.baseId)
        || env.deps.BASE_ITEM_DB.find(row => row.slot === '무기' && row.name === item.baseName);
    if (!base || base.slot !== '무기') return;
    for (const stat of item.baseStats) {
        if (stat.baseDamageBalanceVersion >= 1) continue;
        const definition = base.baseStats.find(row => row.id === stat.id && row.legacyDamageBase > 0);
        if (definition) equipmentSaveMigrateWeaponBaseDamageStat(stat, definition);
    }
}

export function equipmentSaveMigrateWeaponBaseDamageStat(stat, definition) {
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
export function equipmentSaveMigrateUniqueBaseStat(env, stat, old) {
    const width = old ? old.valMax - old.valMin : 0;
    const percentile = width > 0 ? env.deps.clampNumber((old.val - old.valMin) / width, 0, 1) : 0.5;
    const rolled = env.deps.rollBaseStat(stat, percentile);
    const result = { ...old, ...rolled, originalVal: null };
    if (!old) return result;
    const convert = value => {
        if (value <= old.valMax || old.valMax <= 0) {
            return env.deps.rollBaseStat(stat, width > 0 ? env.deps.clampNumber((value - old.valMin) / width, 0, 1) : 0.5).val;
        }
        const valueScale = env.deps.getBaseStatRollRange(stat).usesDecimalRoll ? 10 : 1;
        return Math.floor(rolled.valMax * value / old.valMax * valueScale) / valueScale;
    };
    result.val = convert(old.val);
    if (Number.isFinite(old.originalVal)) result.originalVal = convert(old.originalVal);
    return result;
}

export function equipmentSaveMigrateUniqueBaseStats(env, item, base) {
    const remaining = item.baseStats.filter(stat => stat.id !== 'flaskUtilSlots');
    return base.baseStats.map(stat => {
        const index = Math.max(0, remaining.findIndex(row => row.id === stat.id));
        return equipmentSaveMigrateUniqueBaseStat(env, stat, remaining.splice(index, 1)[0]);
    });
}

/** Restore old unique bases once; keep the original rolls for recovery, never reroll affixes. */
export function equipmentSaveMigrateUniqueEquipmentIdentity(env, item) {
    if (item.uniqueEquipmentVersion === 1) return;
    const rule = item.rarity === 'unique' && env.deps.UNIQUE_EQUIPMENT_RULES[item.name];
    if (!rule) return;
    const base = env.deps.BASE_ITEM_DB.find(row => row.id === rule.baseId);
    item.uniqueEquipmentVersion = 1;
    if (item.baseId === base.id && item.slot === base.slot) return;
    if (equipmentSaveHasLegacyUniqueBaseUpgrade(env, item, base.slot)) return;
    item.uniqueBaseLegacy ??= { baseId: item.baseId, baseName: item.baseName, slot: item.slot,
        baseStats: JSON.parse(JSON.stringify(item.baseStats)) };
    item.baseStats = equipmentSaveMigrateUniqueBaseStats(env, item, base);
    item.baseId = base.id;
    item.baseName = base.name;
    item.slot = base.slot;
    item.exceptionalStatNames = item.baseStats.filter(stat => stat.exceptional).map(stat => stat.statName);
    item.exceptionalBase = item.exceptionalStatNames.length > 0;
    item.exceptionalStatName = item.exceptionalStatNames.join(', ');
    item.exceptionalAllLines = item.exceptionalBase && item.exceptionalStatNames.length === item.baseStats.length;
}

/** The old upgrade action raised itemTier, but left the original hiddenTier unchanged. */
export function equipmentSaveHasLegacyUniqueBaseUpgrade(env, item, slot) {
    const previous = env.deps.BASE_ITEM_DB.find(base => base.id === item.baseId);
    return previous && previous.slot === slot && item.slot === slot
        && item.itemTier > item.hiddenTier && previous.reqTier === item.itemTier;
}

/** 허리띠를 불러올 때: 물약 삭제(2026-10-01)로 쓸 곳이 없는 '유틸리티 플라스크 슬롯' 베이스 옵션을 지우고, 제 액막이 칸 수(1~3)를
 * 적어 둔다(2026-10-11, js/colony-wards.js stampBelt). */
export function equipmentSaveNormalizeBelt(env, item) {
    item.baseStats = item.baseStats.filter(stat => !stat || stat.id !== 'flaskUtilSlots');
    if (typeof env.deps.colonyWards === 'object') env.deps.colonyWards.stampBelt(item);
}
