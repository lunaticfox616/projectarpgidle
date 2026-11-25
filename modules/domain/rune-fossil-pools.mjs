

import { equipmentAffixGetExplicitModStatIds } from './equipment-affix-identity.mjs';

export function runeFlowGetFossilExclusivePool(env, item) {
    // 화석 전용 옵션끼리만 중복을 막고, 같은 효과의 기본 추가옵션과는 공존할 수 있도록 한다.
    let existing = new Set((item && Array.isArray(item.stats) ? item.stats : [])
        .filter(stat => stat && (stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore))
        .map(stat => stat.id)
        .filter(Boolean));
    return env.deps.FOSSIL_EXCLUSIVE_MODS
        .filter(mod => mod.slots.includes(item.slot))
        .filter(mod => {
            let resolvedId = mod.statId || (mod.id === 'fossilVoidHeart' ? 'chaosPctDmg' : (mod.id === 'fossilWarMarch' ? 'move' : (mod.id === 'fossilSoulWard' ? 'resAll' : (mod.id === 'fossilGemPulse' ? 'gemLevel' : 'suppCap'))));
            return !existing.has(resolvedId);
        })
        .map(mod => ({
            ...mod,
            id: mod.statId || (mod.id === 'fossilVoidHeart' ? 'chaosPctDmg' : (mod.id === 'fossilWarMarch' ? 'move' : (mod.id === 'fossilSoulWard' ? 'resAll' : (mod.id === 'fossilGemPulse' ? 'gemLevel' : 'suppCap'))))
        }));
}

export function runeFlowGetFossilGuaranteedPool(env, item, fossil) {
    const candidate = { ...item, stats: (item.stats || []).filter(stat => env.deps.equipmentCrafting.keptOnReroll(item, stat)), chaosInfusion: null };
    const room = env.deps.equipmentCrafting.affixRoom({ ...candidate, chaosInfusion: item.chaosInfusion || null }, 'rare');
    const pool = env.deps.getAvailableMods(candidate).filter(mod => fossil.guaranteedStats.includes(mod.statId || mod.id));
    if (fossil.key === 'fossilBulwark' && pool.length === 0 && ['투구', '갑옷', '장갑', '신발', '방패'].includes(item.slot)) {
        const occupied = fossilOccupiedIds(env, candidate);
        return env.deps.MOD_DB.filter(mod => fossil.guaranteedStats.includes(mod.statId || mod.id) && !equipmentAffixGetExplicitModStatIds(mod).some(id => occupied.has(id)))
            .filter(mod => env.deps.equipmentCrafting.fitsRoom(room, mod));
    }
    return pool.filter(mod => env.deps.equipmentCrafting.fitsRoom(room, mod));
}

function fossilOccupiedIds(env, item) {
    const immutable = env.deps.getImmutableItemSpecialStats?.(item) || [];
    return new Set([...item.stats, ...immutable].filter(Boolean)
        .flatMap(stat => [stat.id, ...(stat.extraStats || []).map(extra => extra?.id)]));
}

export function runeFlowWeighFossilTagMods(env, pool, fossilKey) {
    const rule = env.deps.AFFIX_TAG_LISTS.fossil[fossilKey];
    if (!rule || !(rule.any || []).length) return pool;
    return pool.map(mod => env.deps.matchesAffixTags(env.deps.getAffixTags(mod), rule) ? { ...mod, weight: (Number(mod.weight) || 1) * env.deps.FOSSIL_TAG_WEIGHT } : mod);
}
