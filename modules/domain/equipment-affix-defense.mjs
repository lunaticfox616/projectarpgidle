import { equipmentAffixGetAffixRollStep } from './equipment-affix-values.mjs';

export function equipmentAffixGetItemBaseDefenseTypes(item) {
    return new Set((item && Array.isArray(item.baseStats) ? item.baseStats : [])
        .map(stat => stat && stat.id)
        .filter(id => id === 'armor' || id === 'evasion' || id === 'energyShield'));
}

export function equipmentAffixGetPrimaryBaseDefenseType(item) {
    let row = (item && Array.isArray(item.baseStats) ? item.baseStats : [])
        .find(stat => stat && (stat.id === 'armor' || stat.id === 'evasion' || stat.id === 'energyShield'));
    return row ? row.id : null;
}

export function equipmentAffixGetDefenseTypeForAffixStat(env, statId) {
    statId = String(statId || '');
    if (env.DEFENSE_TYPE_PCT_STAT[statId]) return statId;
    return env.DEFENSE_PCT_TYPE_STAT[statId] || null;
}

export function equipmentAffixScaleDefenseCompoundStat(env, source, statId) {
    const scaledRanges = source.tierValues?.map(range => (Array.isArray(range) ? range : [range, range])
        .map(value => Number((value * env.DUAL_DEFENSE_AFFIX_RATIO).toFixed(2))));
    const valueStep = equipmentAffixGetAffixRollStep(env, statId, scaledRanges ? scaledRanges.flat() : []);
    return {
        statId: statId,
        statName: env.deps.getStatName(statId),
        base: (Number(source && source.base) || 0) * env.DUAL_DEFENSE_AFFIX_RATIO,
        step: (Number(source && source.step) || 0) * env.DUAL_DEFENSE_AFFIX_RATIO,
        affixBalanceVersion: source.affixBalanceVersion,
        valueStep,
        tierValues: scaledRanges?.map((range, index) => index === 0 ? range
            : [Number((scaledRanges[index - 1][1] + valueStep).toFixed(2)), range[1]])
    };
}

export function equipmentAffixIsPrimaryDualDefenseAffixMod(env, item, mod) {
    let sourceDefenseType = equipmentAffixGetDefenseTypeForAffixStat(env, mod && (mod.statId || mod.id));
    let defenseTypes = equipmentAffixGetItemBaseDefenseTypes(item);
    if (!sourceDefenseType || defenseTypes.size < 2) return true;
    return sourceDefenseType === equipmentAffixGetPrimaryBaseDefenseType(item);
}

export function equipmentAffixMakeDualDefenseAffixMod(env, item, mod) {
    let statId = mod && (mod.statId || mod.id);
    let sourceDefenseType = equipmentAffixGetDefenseTypeForAffixStat(env, statId);
    let defenseTypes = Array.from(equipmentAffixGetItemBaseDefenseTypes(item));
    if (!sourceDefenseType || defenseTypes.length < 2 || !defenseTypes.includes(sourceDefenseType)) return mod;
    let extras = Array.isArray(mod.compound) ? mod.compound.slice() : [];
    defenseTypes.forEach(type => {
        if (type === sourceDefenseType) return;
        if (Array.isArray(mod.compound)) {
            extras.push(equipmentAffixScaleDefenseCompoundStat(env, mod, type));
            let ownPct = mod.compound.find(sub => equipmentAffixGetDefenseTypeForAffixStat(env, sub && (sub.statId || sub.id)) === sourceDefenseType);
            if (ownPct) extras.push(equipmentAffixScaleDefenseCompoundStat(env, ownPct, env.DEFENSE_TYPE_PCT_STAT[type]));
            return;
        }
        if (statId === sourceDefenseType) extras.push(equipmentAffixScaleDefenseCompoundStat(env, mod, type));
        if (statId === env.DEFENSE_TYPE_PCT_STAT[sourceDefenseType]) extras.push(equipmentAffixScaleDefenseCompoundStat(env, mod, env.DEFENSE_TYPE_PCT_STAT[type]));
    });
    if (extras.length === 0) return mod;
    return { ...mod, compound: extras };
}

// 방어구는 베이스가 가진 방어 타입(방어도/회피/보호막)에 해당하는 옵션만 허용한다.
// 예) 회피 베이스에 방어도(%)가, 방어도 베이스에 회피(%)가 붙지 않도록 막는다.
// 고유 아이템과 방어구가 아닌 슬롯(장신구 등)은 제한 대상에서 제외한다.
export function equipmentAffixIsDefenseTypeStatAllowed(env, item, statId) {
    let defenseSlots = new Set(['투구', '갑옷', '장갑', '신발', '방패']);
    if (!item || item.rarity === 'unique' || !defenseSlots.has(item.slot)) return true;
    statId = String(statId || '');
    if (item.slot === '방패' && statId === 'blockChancePct') return (item.baseStats || []).some(stat => stat.id === 'baseBlockChance' && stat.val > 0);
    const defenseType = equipmentAffixGetDefenseTypeForAffixStat(env, statId);
    if (!defenseType) return true;
    let baseDefenseTypes = equipmentAffixGetItemBaseDefenseTypes(item);
    return baseDefenseTypes.size <= 0 || baseDefenseTypes.has(defenseType);
}
