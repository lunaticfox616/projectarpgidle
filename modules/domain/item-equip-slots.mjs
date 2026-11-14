

export function itemFlowGetEquipCandidateSlots(env, owner, item, targetGame = owner) {
    if (!item || env.deps.getPassiveEquipmentRestriction(item, targetGame)) return [];
    if (item.slot === '반지') return env.deps.getTranscendentVoidPassiveCount('thirdFinger', targetGame) > 0 ? ['반지1', '반지2', '반지3'] : ['반지1', '반지2'];
    if (item.slot === '장갑') return ['장갑1', '장갑2'];
    const special = env.deps.bagItems.candidateSlots(item, targetGame); // 주얼, 코어, 액막이(js/bag-items.js)
    if (special) return special;
    let warriorDualTrain = env.deps.hasKeystone('w3', targetGame);
    if (item.slot === '무기') return warriorDualTrain ? ['무기', '방패'] : ['무기'];
    return [item.slot];
}

export function itemFlowCanEquipItemToSlot(env, owner, item, preferredSlot) {
    return !!preferredSlot && itemFlowGetEquipCandidateSlots(env, owner, item).includes(preferredSlot)
        && env.deps.combatEquipmentStats.inspect(item, preferredSlot, owner).ok;
}

export function itemFlowPickEquipSlot(env, owner, item, preferredSlot) {
    let candidates = itemFlowGetEquipCandidateSlots(env, owner, item);
    if (candidates.length === 0) return null;
    if (preferredSlot && candidates.includes(preferredSlot)) return preferredSlot;
    if (item.slot === env.deps.COLONY_WARD_RULES.slot) return env.deps.colonyWards.pickSlot(owner);
    if (item.slot === '반지') return pickEmptyRingSlot(env, owner);
    if (item.slot === '장갑') {
        if (!owner.equipment['장갑1']) return '장갑1';
        if (!owner.equipment['장갑2']) return '장갑2';
        return null;
    }
    if (item.slot === '무기') return pickWeaponSlot(env, owner, preferredSlot, candidates[0]);
    return candidates[0];
}

function pickEmptyRingSlot(env, owner) {
    if (!owner.equipment['반지1']) return '반지1';
    if (!owner.equipment['반지2']) return '반지2';
    if ((typeof env.deps.getTranscendentVoidPassiveCount === 'function' && env.deps.getTranscendentVoidPassiveCount('thirdFinger', owner) > 0) && !owner.equipment['반지3']) return '반지3';
    return null;
}

function pickWeaponSlot(env, owner, preferredSlot, firstCandidate) {
    const warriorDualTrain = typeof env.deps.hasKeystone === 'function' && env.deps.hasKeystone('w3', owner);
    if (!warriorDualTrain || preferredSlot) return firstCandidate;
    if (owner.equipment['무기'] && !owner.equipment['방패']) return '방패';
    if (!owner.equipment['무기']) return '무기';
    if (!owner.equipment['방패']) return '방패';
    const shieldItem = owner.equipment['방패'];
    return shieldItem && shieldItem.slot === '방패' ? '방패' : null;
}

export function itemFlowIsDualSlotItem(env, owner, slotName) {
    if (slotName === '반지' || slotName === '장갑') return true;
    return slotName === '무기' && typeof env.deps.hasKeystone === 'function' && env.deps.hasKeystone('w3', owner);
}

export function itemFlowDualSlotBothOccupied(env, owner, slotName) {
    if (slotName === '반지') return !!(owner.equipment['반지1'] && owner.equipment['반지2'] && (!(typeof env.deps.getTranscendentVoidPassiveCount === 'function' && env.deps.getTranscendentVoidPassiveCount('thirdFinger', owner) > 0) || owner.equipment['반지3']));
    if (slotName === '장갑') return !!(owner.equipment['장갑1'] && owner.equipment['장갑2']);
    return false;
}

export function itemFlowFindInventoryIndexById(owner, itemId) {
    return (owner.inventory || []).findIndex(item => item && item.id === itemId);
}
