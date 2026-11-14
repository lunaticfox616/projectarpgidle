

/** Save boundary: convert old projectile counts once; stat id records the new percent unit. */
export function equipmentSaveMigrateEquipmentProjectileOption(env, stat) {
    if (!stat) return;
    if (stat.id === 'projectileExtraShots') {
        stat.id = 'projectileExtraChance';
        for (const key of ['val', 'valMin', 'valMax', 'baseRollMin', 'baseRollMax', 'originalVal']) {
            if (stat[key] !== null && Number.isFinite(Number(stat[key]))) stat[key] = Number(stat[key]) * 50;
        }
        stat.statName = env.deps.getStatName(stat.id);
    }
    // Preserve the original recursive data callback; bind only the shared rule environment.
    (stat.extraStats || []).forEach(equipmentSaveMigrateEquipmentProjectileOption.bind(undefined, env));
}

export function equipmentSaveMigrateEquipmentAffixValue(env, stat, mod, preserveValue = stat.affixBalanceVersion >= 1) {
    const tier = Math.max(1, Math.min(mod.tierValues.length, stat.tier || 1));
    const range = mod.tierValues[tier - 1];
    const [min, max] = Array.isArray(range) ? range : [range, range];
    const oldWidth = stat.valMax - stat.valMin;
    const rank = oldWidth > 0 ? Math.max(0, Math.min(1, (stat.val - stat.valMin) / oldWidth)) : 0.5;
    const step = mod.valueStep || (Number.isInteger(min) && Number.isInteger(max) ? 1 : 0.01);
    // Version 2 only widens tier ranges downwards: keep existing rolls, including crafting bonuses.
    if (!preserveValue) stat.val = Number((min + Math.round(rank * (max - min) / step) * step).toFixed(2));
    Object.assign(stat, {valMin:min, valMax:max, tier, valueStep:step, fixedValue:!!mod.fixedValue,
        sourceModId:mod.id, affixBalanceVersion:mod.affixBalanceVersion, statName:mod.statName || env.deps.getStatName(stat.id)});
}

export function equipmentSaveFindStoredEquipmentAffix(env, item, stat) {
    const candidates = env.deps.MOD_DB.filter(mod => (mod.slots.includes(item.slot) || mod.retiredSlots?.includes(item.slot)) && (mod.statId || mod.id) === stat.id)
        .map(mod => env.deps.makeDualDefenseAffixMod(item, mod));
    const extraIds = (stat.extraStats || []).map(extra => extra.id);
    return candidates.find(row => row.id === stat.sourceModId)
        || candidates.find(row => env.deps.getExplicitModStatIds(row).filter(id => id !== stat.id)
            .every(id => extraIds.includes(id)) && (row.compound || []).length === extraIds.length);
}

/** 룬 레벨 줄(2026-10-08, 사용자 "새곡선기준으로해줘"): 예전 값(방패 주문 +1.7~15.4, 소환수 무기 +1~5, 나머지 +1 고정)을
 * 그 줄의 티어에서 새 20티어 곡선(1~8 +1, 9~15 +2, 16~19 +3, 20 +4) 값으로 맞춘다. 맞춘 줄은 버전 3이라 다시 건드리지 않는다. */
export function equipmentSaveRefitGemLevelAffix(env, item, stat) {
    if (!stat || stat.affixBalanceVersion >= 3 || !/GemLevel$/.test(stat.id)) return;
    const mod = equipmentSaveFindStoredEquipmentAffix(env, item, stat);
    if (!mod || !(mod.affixBalanceVersion >= 3)) return;
    const tier = Math.max(1, Math.min(mod.tierValues.length, Math.floor(Number(stat.tier) || 1)));
    const value = mod.tierValues[tier - 1][0];
    Object.assign(stat, { val: value, valMin: value, valMax: value, tier, valueStep: 1, fixedValue: false, sourceModId: mod.id,
        affixBalanceVersion: mod.affixBalanceVersion });
}

export function equipmentSaveMigrateEquipmentAffixBalance(env, item) {
    [...item.baseStats, ...item.stats, item.underEnchant, item.chaosInfusion].forEach((...args) => equipmentSaveMigrateEquipmentProjectileOption(env, ...args));
    if (item.rarity === 'unique') return;
    // Bench and echo lines keep their authored values, including when their stat ID also exists in MOD_DB.
    for (const stat of item.stats.filter(stat => !stat.oceanBenchOptionId && !stat.isEchoMod)) {
        equipmentSaveRefitGemLevelAffix(env, item, stat);
        if (stat.affixBalanceVersion >= 2 || !stat.tier
            || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore) continue;
        const mod = equipmentSaveFindStoredEquipmentAffix(env, item, stat);
        if (!mod) continue;
        const preserveValue = stat.affixBalanceVersion >= 1;
        equipmentSaveMigrateEquipmentAffixValue(env, stat, mod);
        (stat.extraStats || []).forEach(extra => {
            const sub = mod.compound.find(row => (row.statId || row.id) === extra.id);
            if (sub) equipmentSaveMigrateEquipmentAffixValue(env, extra, sub, preserveValue);
        });
    }
}

/** 고요한 맹세 keeps its old rolled quality while its original unique multiplier becomes +2~3%p block.
 * A crafted or fused rare line is independent of that authored tier-0 line and keeps its existing percent effect. */
export function equipmentSaveMigrateVowBlockAffix(env, item) {
    if (item.rarity !== 'unique' || item.name !== '고요한 맹세') return;
    const stat = item.stats.find(row => row.id === 'blockChancePct' && row.tier === 0 && !row.fusedFromRare);
    if (!stat) return;
    stat.id = 'blockChance';
    stat.statName = env.deps.getStatName(stat.id);
    for (const key of ['val', 'valMin', 'valMax', 'baseRollMin', 'baseRollMax', 'originalVal']) {
        if (Number.isFinite(stat[key])) stat[key] = Number((stat[key] / 10).toFixed(2));
    }
}

export function equipmentSaveCoerceFiniteNumber(value, fallback) {
    let num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function normalizeStoredNumericRange(stat) {
    let val = equipmentSaveCoerceFiniteNumber(stat.val, NaN);
    if (!Number.isFinite(val)) val = equipmentSaveCoerceFiniteNumber(stat.value, NaN);
    if (!Number.isFinite(val)) val = equipmentSaveCoerceFiniteNumber(stat.base, NaN);
    if (!Number.isFinite(val)) val = equipmentSaveCoerceFiniteNumber(stat.amount, 0);
    let min = equipmentSaveCoerceFiniteNumber(stat.valMin, NaN);
    if (!Number.isFinite(min)) min = equipmentSaveCoerceFiniteNumber(stat.min, NaN);
    if (!Number.isFinite(min)) min = equipmentSaveCoerceFiniteNumber(stat.base, val);
    let max = equipmentSaveCoerceFiniteNumber(stat.valMax, NaN);
    if (!Number.isFinite(max)) max = equipmentSaveCoerceFiniteNumber(stat.max, NaN);
    if (!Number.isFinite(max)) max = equipmentSaveCoerceFiniteNumber(stat.base, val);
    if (max < min) max = min;
    return { val, min, max };
}

export function equipmentSaveNormalizeStatRecord(env, stat) {
    if (!stat || !stat.id) return null;
    const { val, min, max } = normalizeStoredNumericRange(stat);
    let normalized = {
        ...stat,
        val: val,
        valMin: min,
        valMax: max,
        tier: Math.max(0, Math.floor(equipmentSaveCoerceFiniteNumber(stat.tier, 0))),
        statName: stat.statName || env.deps.getStatName(stat.id),
        originalVal: equipmentSaveCoerceFiniteNumber(stat.originalVal ?? NaN, null)
    };
    normalized.craftSource = env.deps.equipmentCrafting.getSource(stat);
    // 복합 옵션의 추가 스탯도 정규화한다.
    if (Array.isArray(stat.extraStats)) {
        normalized.extraStats = stat.extraStats.map(equipmentSaveNormalizeStatRecord.bind(undefined, env)).filter(Boolean);
        if (normalized.extraStats.length === 0) delete normalized.extraStats;
    }
    return normalized;
}
