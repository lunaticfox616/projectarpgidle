import { itemFlowGetEquipCandidateSlots } from './item-equip-slots.mjs';

export function itemFlowTryAutoEquipEmptySlot(env, owner, item) {
    if (!item || !owner.settings || owner.settings.autoEquipEmptySlots === false) return null;
    return itemFlowEquipIntoFirstEmptySlot(env, owner, item);
}

export function itemFlowEquipIntoFirstEmptySlot(env, owner, item) {
    let slot = itemFlowGetEquipCandidateSlots(env, owner, item).find(candidate => candidate && Object.prototype.hasOwnProperty.call(owner.equipment, candidate) && !owner.equipment[candidate]);
    if (!slot || !env.deps.combatEquipmentStats.inspect(item, slot, owner).ok) return null;
    delete item.legacyRequirementGrace;
    owner.equipment[slot] = item;
    if (typeof env.deps.normalizeSupportLoadout === 'function') env.deps.normalizeSupportLoadout(true);
    return slot;
}

export function itemFlowEquipIntoEmptySlots(env, owner, items) {
    const rank = item => (Number(item.itemTier) || 0) * 10 + env.deps.JEWEL_RARITY_ORDER.indexOf(item.rarity);
    let equipped = 0;
    for (const item of [...(items || [])].filter(Boolean).sort((a, b) => rank(b) - rank(a))) {
        const index = owner.inventory.indexOf(item);
        if (index < 0 || !itemFlowEquipIntoFirstEmptySlot(env, owner, item)) continue;
        owner.inventory.splice(index, 1);
        equipped++;
    }
    return equipped;
}

export function itemFlowCountFillableEmptySlots(env, owner) {
    const empty = Object.keys(owner.equipment).filter(slot => !owner.equipment[slot]);
    if (!empty.length) return 0;
    return empty.filter(slot => owner.inventory.some(item => item && itemFlowGetEquipCandidateSlots(env, owner, item).includes(slot)
        && env.deps.combatEquipmentStats.inspect(item, slot, owner).ok)).length;
}
