import { itemFlowGetEquipCandidateSlots } from './item-equip-slots.mjs';

export function itemFlowTryAutoEquipEmptySlot(env, owner, item) {
    if (!item || !owner.settings || owner.settings.autoEquipEmptySlots === false) return null;
    return itemFlowEquipIntoFirstEmptySlot(env, owner, item);
}

/** 맨손 전용 룬(2026-11-26 기공파, 야만스러운 난격)을 쓰는 동안 비운 무기 칸에는 주운 무기를 끼우지 않는다(끼우면 그 룬을 못 쓴다). */
export function itemFlowKeepsBareHands(env, owner, slot) {
    const family = env.deps.SKILL_RUNE_FAMILY[owner.activeSkill], weapons = family ? env.deps.SKILL_RUNE_WEAPONS[family] : null;
    return slot === '무기' && !!weapons && weapons.length === 1 && weapons[0] === 'unarmed';
}

export function itemFlowEquipIntoFirstEmptySlot(env, owner, item) {
    let slot = itemFlowGetEquipCandidateSlots(env, owner, item).find(candidate => candidate && Object.prototype.hasOwnProperty.call(owner.equipment, candidate) && !owner.equipment[candidate] && !itemFlowKeepsBareHands(env, owner, candidate));
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
