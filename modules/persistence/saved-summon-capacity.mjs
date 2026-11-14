export function estimateSummonEquipCapForMergedSave(deps, state) {
    let bonus = 0;
    function statValue(stat) {
        if (!stat || typeof stat !== 'object') return 0;
        if (Number.isFinite(stat.val)) return stat.val;
        if (Number.isFinite(stat.value)) return stat.value;
        if (Number.isFinite(stat.base)) return stat.base;
        return 0;
    }
    bonus = accumulateSavedEquipmentSummons(deps, state, bonus, statValue);
    bonus = accumulateSavedProgressSummons(deps, state, bonus);
    let keystones = savedSummonKeystones(state);
    if (state && state.ascendClass === 'soulbinder') {
        if (keystones.includes('sb4')) bonus += 1;
        if (keystones.includes('sb8')) bonus += 3;
    }
    bonus = accumulateSavedTalentSummons(deps, state, bonus);
    let cap = Math.max(1, Math.floor(1 + bonus));
    let expandedCap = state && state.ascendClass === 'soulbinder' && keystones.includes('sb9');
    if (expandedCap) cap = Math.floor(cap * 1.5);
    return Math.min(expandedCap ? 12 : 8, cap);
}

function savedSummonKeystones(state) {
    return (state && Array.isArray(state.ascendKeystones)) ? state.ascendKeystones : [];
}

function savedSummonItemStats(deps, item) {
    return [...(item.baseStats || []), ...(item.stats || []), ...(typeof deps.getImmutableItemSpecialStats === 'function' ? (0, deps.getImmutableItemSpecialStats)(item) : [])];
}

function accumulateSavedEquipmentSummons(deps, state, bonus, statValue) {
    Object.entries((state && state.equipment) || {}).forEach(([slot, item]) => {
        if (!item) return;
        savedSummonItemStats(deps, item).forEach(stat => {
            if (stat && stat.id === 'summonCap') bonus += statValue(stat);
        });
        if (item.uniqueEffectKey === 'summonCapBonus') bonus += Number((item.uniqueEffectParams || {}).cap) || 1;
        if (item.uniqueEffectKey === 'rightRingSummonCap' && slot === '반지2') bonus += Number((item.uniqueEffectParams || {}).cap) || 1;
    });
    return bonus;
}

function accumulateSavedProgressSummons(deps, state, bonus) {
    (state && Array.isArray(state.passives) ? state.passives : []).forEach(id => {
        let node = deps.PASSIVE_TREE.nodes[id];
        if (node && node.stat === 'summonCap') bonus += node.val || 0;
    });
    (state && Array.isArray(state.actRewardBonuses) ? state.actRewardBonuses : []).forEach(entry => { if (entry && entry.stat === 'summonCap') bonus += Number(entry.value) || 0; });
    (state && Array.isArray(state.journalBonuses) ? state.journalBonuses : []).forEach(entry => { if (entry && entry.stat === 'summonCap') bonus += Number(entry.value) || 0; });
    return bonus;
}

function accumulateSavedTalentSummons(deps, state, bonus) {
    let ownedCards = Object.keys((state && state.talentCards) || {});
    let unlockedSlots = (typeof deps.TALENT_CARD_SLOT_UNLOCKS !== 'undefined' ? deps.TALENT_CARD_SLOT_UNLOCKS : [])
        .filter(requirement => ownedCards.length >= requirement).length;
    (state && Array.isArray(state.talentCardLoadout) ? state.talentCardLoadout.slice(0, unlockedSlots) : []).forEach(comboKey => {
        let rule = typeof deps.TALENT_PRECISE_CARD_RULES !== 'undefined' ? deps.TALENT_PRECISE_CARD_RULES[comboKey] : null;
        ((rule && rule.uniques) || []).forEach(effect => {
            if (effect && effect.key === 'summonCapBonus') bonus += Number((effect.params || {}).cap) || 1;
        });
    });
    return bonus;
}
