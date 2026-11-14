import { runeFlowGetFossilGuaranteedPool, runeFlowGetFossilExclusivePool, runeFlowWeighFossilTagMods } from './rune-fossil-pools.mjs';

// Admission precedes mutation; all roll state is local to this one craft.
export function* runeFlowApplyFossilChaosCraft(env, owner, fossilKey) {
    let fossil = env.deps.FOSSIL_DB.find(entry => entry.key === fossilKey);
    let item = env.deps.getSelectedCraftItem();
    const craftBlock = env.deps.equipmentCrafting.fossilCraftReason(owner, item, fossil);
    if (craftBlock) return (yield { kind: 'runeLog', args: [craftBlock, 'attack-monster'] });
    const inputs = fossilCraftPools(env, item, fossil, fossilKey);
    if (inputs.reason) return yield { kind: 'runeLog', args: [inputs.reason, 'attack-monster'] };
    const roll = beginFossilRoll(env, item, inputs);
    rollGuaranteedFossilLine(env, inputs, roll);
    fillFossilCraftLines(env, item, inputs, roll);
    if (fossilKey === 'fossilRift') roll.newStats = fossilRiftMarkerStats(env, roll.newStats, inputs.lockedStats, roll.reservedInfusionCount);
    const { newStats, previousChaosInfusion, guaranteed, guaranteedMinTier, guaranteedMaxTier } = roll;
    item.stats = newStats;
    item.rarity = 'rare';
    if (typeof env.deps.rerollChaosInfusionForItem === 'function') env.deps.rerollChaosInfusionForItem(item, previousChaosInfusion);
    owner.currencies[fossilKey]--;
    env.deps.updateItemName(item);
    let line = guaranteed ? env.deps._t('확정 옵션: [{statName}] (T{guaranteedMinTier}~T{guaranteedMaxTier})', { statName: guaranteed.statName, guaranteedMinTier, guaranteedMaxTier }) : (fossilKey === 'fossilOld' ? '확정 옵션: [화석 전용 옵션]' : '확정 옵션 2줄: [균열 표식] + [추가 옵션 효과 50% 증폭]');
    (yield { kind: 'runeLog', args: [env.deps._t('🪨 {name} 재련 성공! {line}', { name: env.deps._t(fossil.name), line }), 'loot-magic'] });
    (yield { kind: 'runeRefresh', args: [] });
}

function fossilCraftPools(env, item, fossil, fossilKey) {
    let immutableIds = new Set(typeof env.deps.getImmutableItemSpecialStats === 'function' ? env.deps.getImmutableItemSpecialStats(item).map(stat => stat && stat.id).filter(Boolean) : []);
    let lockedStats = (item.stats || []).filter(stat => env.deps.equipmentCrafting.keptOnReroll(item, stat));
    let rerollCandidate = { ...item, stats: lockedStats, chaosInfusion: null };
    let guaranteedPool = runeFlowGetFossilGuaranteedPool(env, item, fossil);
    let specialFossil = ['fossilOld', 'fossilRift'].includes(fossilKey);
    if (!specialFossil && guaranteedPool.length === 0) return { reason: env.deps._t('해당 화석은 이 아이템 슬롯에 사용할 수 없습니다.') };
    let fossilExclusivePool = fossilKey === 'fossilOld' ? runeFlowGetFossilExclusivePool(env, rerollCandidate) : null;
    if (fossilExclusivePool && fossilExclusivePool.length <= 0) return { reason: env.deps._t('화석 전용 옵션을 부여할 수 없습니다.') };
    return { fossilKey, immutableIds, lockedStats, guaranteedPool, specialFossil, fossilExclusivePool };
}

function beginFossilRoll(env, item, inputs) {
    const { immutableIds, lockedStats, guaranteedPool, specialFossil } = inputs;
    const tierRange = fossilCraftTierRange(env, item);
    let maxTier = tierRange.max;
    let previousChaosInfusion = item.chaosInfusion || null;
    if (previousChaosInfusion) item.chaosInfusion = null;
    let reservedInfusionCount = previousChaosInfusion ? 1 : 0;
    let hiddenTier = Math.max(1, Math.floor(item.hiddenTier || item.itemTier || maxTier));
    let guaranteedMinTier = Math.max(tierRange.min || 1, hiddenTier >= 11 ? tierRange.min : hiddenTier - 3);
    let guaranteedMaxTier = Math.max(guaranteedMinTier, hiddenTier);
    let guaranteed = specialFossil ? null : env.deps.pickWeightedMod(guaranteedPool);
    let newStats = lockedStats.slice();
    let blockedIds = new Set([...immutableIds, ...newStats.map(stat => stat.id)]);
    return { maxTier, previousChaosInfusion, reservedInfusionCount, hiddenTier, guaranteedMinTier, guaranteedMaxTier, guaranteed, newStats, blockedIds };
}

function rollGuaranteedFossilLine(env, inputs, roll) {
    const { fossilKey, fossilExclusivePool } = inputs;
    const { guaranteed, guaranteedMinTier, guaranteedMaxTier, blockedIds, newStats, reservedInfusionCount, hiddenTier } = roll;
    if (guaranteed) {
        let guaranteedRoll = env.deps.rollAffixValueInTierRange(guaranteed, guaranteedMinTier, guaranteedMaxTier);
        guaranteedRoll.craftSource = 'fossil';
        if (!blockedIds.has(guaranteedRoll.id) && (newStats.length + reservedInfusionCount) < env.deps.EXPLICIT_AFFIX_LINE_CAP) {
            newStats.push(guaranteedRoll);
            blockedIds.add(guaranteedRoll.id);
        }
    } else if (fossilKey === 'fossilOld') {
        let row = env.deps.rndChoice(fossilExclusivePool);
        let fixedVal = Number.isFinite(Number(row.fixedVal)) ? Number(row.fixedVal) : Number((row.base + Math.max(0, hiddenTier - 1) * row.step).toFixed(2));
        let rolled = Number(fixedVal.toFixed(2));
        newStats.push({ id: row.id, statName: row.statName, val: rolled, valMin: rolled, valMax: rolled, fossilExclusive: true, craftSource: 'fossil' });
    }

}

function fillFossilCraftLines(env, item, inputs, roll) {
    const { lockedStats, fossilKey } = inputs;
    const { maxTier, previousChaosInfusion, reservedInfusionCount, newStats, blockedIds } = roll;
    let count = 4 + Math.floor(env.deps.runeRandom() * 2);
    while ((newStats.length + reservedInfusionCount) < Math.min(env.deps.EXPLICIT_AFFIX_LINE_CAP, Math.max(count, lockedStats.length + 1))) {
        let pool = env.deps.getOpenAffixMods({ ...item, stats: newStats, chaosInfusion: previousChaosInfusion }, 'rare')
            .filter(mod => !blockedIds.has(mod.statId || mod.id));
        if (pool.length === 0) break;
        // 화석이 보정하는 보장 옵션만 고티어 보정을 받고, 나머지 옵션은 일반 티어 분포(1티어부터)로 굴린다.
        let roll = env.deps.rollAffixValue(env.deps.pickWeightedMod(runeFlowWeighFossilTagMods(env, pool, fossilKey)), maxTier);
        newStats.push(roll);
        blockedIds.add(roll.id);
    }
}

function fossilRiftMarkerStats(env, newStats, lockedStats, reservedInfusionCount) {
    let riftMarker = lockedStats.find(stat => stat.id === 'fossilRiftBlank') || { id: 'fossilRiftBlank', statName: '균열 옵션: 균열 표식 (제거/변경 불가)', val: 0, lockedByRift: true, craftSource: 'fossil' };
    let ampMarker = { id: 'fossilRiftAmp', statName: '균열 옵션: 추가 옵션 효과 50% 증폭', val: 50, craftSource: 'fossil' };
    let markerIds = new Set(['fossilRiftBlank', 'fossilRiftAmp']);
    newStats = newStats.filter(stat => !(stat && markerIds.has(stat.id)));
    let ensureMarker = (marker) => {
        if ((newStats.length + reservedInfusionCount) < env.deps.EXPLICIT_AFFIX_LINE_CAP) { newStats.push(marker); return; }
        let replaceIdx = -1;
        for (let i = newStats.length - 1; i >= 0; i--) {
            let st = newStats[i];
            if (!st || st.lockedByHoney || st.lockedByRift) continue;
            replaceIdx = i;
            break;
        }
        if (replaceIdx >= 0) newStats[replaceIdx] = marker;
    };
    ensureMarker(riftMarker);
    ensureMarker(ampMarker);
    return newStats;
}

function fossilCraftTierRange(env, item) {
    return typeof env.deps.getCraftTierRangeForItem === 'function' ? env.deps.getCraftTierRangeForItem(item, 'fossil') : { min: 1, max: env.deps.getItemCraftTier(item) };
}
