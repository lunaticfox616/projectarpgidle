import { runeFlowGetFossilGuaranteedPool, runeFlowGetFossilExclusivePool, runeFlowWeighFossilTagMods } from './rune-fossil-pools.mjs';
import { formatSignedValue, formatValue } from '../common/formatting.mjs';

// Admission precedes mutation; all roll state is local to this one craft.
export function* runeFlowApplyFossilChaosCraft(env, owner, fossilKey, retained = null) {
    let fossil = env.deps.FOSSIL_DB.find(entry => entry.key === fossilKey);
    let item = env.deps.getSelectedCraftItem();
    const craftBlock = env.deps.equipmentCrafting.fossilCraftReason(owner, item, fossil);
    const staleSelection = !craftBlock && !canRetainFossilLine(env, item, fossilKey, retained);
    if (craftBlock || staleSelection) {
        yield { kind: 'runeLog', args: [craftBlock || env.deps._t('보존할 일반 옵션을 다시 선택하세요.'), 'attack-monster'] };
        return false;
    }
    const inputs = fossilCraftPools(env, item, fossil, fossilKey, retained);
    if (inputs.reason) {
        yield { kind: 'runeLog', args: [inputs.reason, 'attack-monster'] };
        return false;
    }
    const {result, line} = rollFossilResult(env, item, inputs);
    const { stats, rarity, chaosInfusion, name } = result;
    Object.assign(item, { stats, rarity, chaosInfusion, name });
    owner.currencies[fossilKey]--;
    (yield { kind: 'runeLog', args: [env.deps._t('🪨 {name} 재련 성공! {line}', { name: env.deps._t(fossil.name), line }), 'loot-magic'] });
    if (Object.values(owner.equipment || {}).includes(item)) yield { kind: 'runeInvalidateStats', args: [] };
    (yield { kind: 'runeRefresh', args: [] });
    return true;
}

function canRetainFossilLine(env, item, fossilKey, retained) {
    return retained === null || (fossilKey === 'fossilOld' && env.deps.equipmentCrafting.inspectFossilRetention(item).rows.some(row => row.stat === retained));
}

function rollFossilResult(env, item, inputs) {
    const roll = beginFossilRoll(env, item, inputs);
    const rolledAffix = rollGuaranteedFossilLine(env, inputs, roll);
    fillFossilCraftLines(env, item, inputs, roll);
    const { fossilKey, lockedStats } = inputs;
    const { newStats, previousChaosInfusion, reservedInfusionCount } = roll;
    const stats = fossilKey === 'fossilRift' ? fossilRiftMarkerStats(env, newStats, lockedStats, reservedInfusionCount) : newStats;
    const result = { ...item, stats, rarity: 'rare', chaosInfusion: null };
    if (typeof env.deps.rerollChaosInfusionForItem === 'function') env.deps.rerollChaosInfusionForItem(result, previousChaosInfusion);
    env.deps.updateItemName(result);
    const granted = fossilKey === 'fossilRift' ? stats.filter(stat => stat.id === 'fossilRiftBlank' || stat.id === 'fossilRiftAmp') : [rolledAffix].filter(Boolean);
    const line = fossilResultDetail(env, granted);
    return {result, line};
}

function fossilResultDetail(env, granted) {
    const { _t } = env.deps;
    const details = granted.flatMap(stat => {
        if (stat.id === 'fossilRiftBlank') return [_t('균열 옵션: 균열 표식 (제거/변경 불가)')];
        if (stat.id === 'fossilRiftAmp') return [_t('균열 옵션: 추가 옵션 효과 {value}% 증폭', { value: formatValue(stat.id, stat.val) })];
        return [stat, ...(stat.extraStats || [])].map(row => `${_t(row.statName || row.id)} ${formatSignedValue(row.id, row.val)}`);
    });
    return details.length ? _t('확정 옵션: {affixes}', { affixes: details.join(', ') }) : '';
}

function fossilCraftPools(env, item, fossil, fossilKey, retained) {
    let immutableIds = new Set(typeof env.deps.getImmutableItemSpecialStats === 'function' ? env.deps.getImmutableItemSpecialStats(item).map(stat => stat && stat.id).filter(Boolean) : []);
    let lockedStats = (item.stats || []).filter(stat => stat === retained || env.deps.equipmentCrafting.keptOnReroll(item, stat));
    let rerollCandidate = { ...item, stats: lockedStats, chaosInfusion: null };
    let guaranteedPool = runeFlowGetFossilGuaranteedPool(env, item, fossil);
    let specialFossil = ['fossilOld', 'fossilRift'].includes(fossilKey);
    if (!specialFossil && guaranteedPool.length === 0) return { reason: env.deps._t('해당 화석은 이 아이템 슬롯에 사용할 수 없습니다.') };
    let fossilExclusivePool = fossilKey === 'fossilOld' ? runeFlowGetFossilExclusivePool(env, rerollCandidate) : null;
    if (fossilExclusivePool && fossilExclusivePool.length <= 0) return { reason: env.deps._t('화석 전용 옵션을 부여할 수 없습니다.') };
    return { fossilKey, immutableIds, lockedStats, guaranteedPool, specialFossil, fossilExclusivePool, retained };
}

function beginFossilRoll(env, item, inputs) {
    const { immutableIds, lockedStats, guaranteedPool, specialFossil } = inputs;
    const tierRange = fossilCraftTierRange(env, item);
    let maxTier = tierRange.max;
    let previousChaosInfusion = item.chaosInfusion || null;
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
            return guaranteedRoll;
        }
    } else if (fossilKey === 'fossilOld') {
        let row = env.deps.rndChoice(fossilExclusivePool);
        let fixedVal = Number.isFinite(Number(row.fixedVal)) ? Number(row.fixedVal) : Number((row.base + Math.max(0, hiddenTier - 1) * row.step).toFixed(2));
        let rolled = Number(fixedVal.toFixed(2));
        const exclusive = { id: row.id, statName: row.statName, val: rolled, valMin: rolled, valMax: rolled, fossilExclusive: true, craftSource: 'fossil' };
        newStats.push(exclusive);
        return exclusive;
    }
    return null;
}

function fillFossilCraftLines(env, item, inputs, roll) {
    const { lockedStats, fossilKey } = inputs;
    const { maxTier, previousChaosInfusion, reservedInfusionCount, newStats, blockedIds } = roll;
    let count = 4 + Math.floor(env.deps.runeRandom() * 2) - Number(!!inputs.retained);
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
