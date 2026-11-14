import { itemFlowDualSlotBothOccupied, itemFlowPickEquipSlot, itemFlowFindInventoryIndexById, itemFlowGetEquipCandidateSlots } from './item-equip-slots.mjs';
import { itemFlowIsCraftSelectionEquip, itemFlowGetCraftSelectionRef } from './item-craft-selection.mjs';

export function* itemFlowEquipItem(env, owner, idx, preferredSlot) {
    let item = owner.inventory[idx];
    if (!item) return;
    const restriction = env.deps.getPassiveEquipmentRestriction(item, owner);
    if (restriction) return (yield { kind: 'itemLog', args: [restriction, 'attack-monster', { toast: true }] });
    if ((yield { kind: 'itemEquipSpecial', args: [item, preferredSlot] })) return; // 주얼은 그 장비의 빈 소켓에, 액막이는 열린 칸이 없으면 이유를 알린다
    const choice = equipmentChoice(env, owner, item, preferredSlot);
    if (choice) {
        yield { kind: choice, args: [item.id] };
        return;
    }
    let targetSlot = itemFlowPickEquipSlot(env, owner, item, preferredSlot);
    if (!targetSlot) return;
    const eligibility = env.deps.combatEquipmentStats.inspect(item, targetSlot, owner);
    if (!eligibility.ok) return (yield { kind: 'itemLog', args: ['장착 실패, ' + eligibility.reason, 'attack-monster', { toast: true }] });
    replaceEquipment(env, owner, item, idx, targetSlot);
    (yield { kind: 'itemHideTooltip', args: [] });
    env.deps.normalizeSupportLoadout(true);
    (yield { kind: 'itemRefresh', args: [] });
}

function equipmentChoice(env, owner, item, preferredSlot) {
    const warriorDualTrain = typeof env.deps.hasKeystone === 'function' && env.deps.hasKeystone('w3', owner);
    if (needsWeaponChoice(owner, item, preferredSlot, warriorDualTrain)) return 'itemWeaponChoice';
    if (preferredSlot) return null;
    if (!['반지', '장갑'].includes(item.slot)) return null;
    if (!itemFlowDualSlotBothOccupied(env, owner, item.slot)) return null;
    return item.slot === '반지' ? 'itemRingChoice' : 'itemGloveChoice';
}

function needsWeaponChoice(owner, item, preferredSlot, warriorDualTrain) {
    return item.slot === '무기' && warriorDualTrain && !preferredSlot && owner.equipment['무기'] && owner.equipment['방패'];
}

function replaceEquipment(env, owner, item, idx, targetSlot) {
    delete item.legacyRequirementGrace;
    let old = owner.equipment[targetSlot];
    if (old) delete old.legacyRequirementGrace;
    let movedId = item.id;
    owner.equipment[targetSlot] = item;
    if (old) owner.inventory[idx] = old;
    else owner.inventory.splice(idx, 1);
    if (!itemFlowIsCraftSelectionEquip(env) && itemFlowGetCraftSelectionRef(env) === movedId) {
        env.craftingSelectionState.ref = targetSlot;
        env.craftingSelectionState.isEquip = true;
    }
}

export function* itemFlowEquipItemById(env, owner, itemId, preferredSlot) {
    let idx = itemFlowFindInventoryIndexById(owner, itemId);
    if (idx < 0) return false;
    if (preferredSlot && !itemFlowGetEquipCandidateSlots(env, owner, owner.inventory[idx]).includes(preferredSlot)) return false;
    const targetItem = owner.inventory[idx];
    (yield* itemFlowEquipItem(env, owner, idx, preferredSlot));
    return Object.values(owner.equipment).includes(targetItem) || !owner.inventory.includes(targetItem); // 주얼은 소켓으로 가 가방에서만 빠진다
}

export function* itemFlowEquipSelectedCraftInventoryItem(env, owner) {
    if (itemFlowIsCraftSelectionEquip(env)) return false;
    let itemId = itemFlowGetCraftSelectionRef(env);
    if (itemId === null) return false;
    return (yield* itemFlowEquipItemById(env, owner, itemId));
}

export function itemFlowFindUnequipPlacement(env, owner, item, column, row) {
    if (Number.isFinite(Number(column)) && Number.isFinite(Number(row))) return env.deps.equipmentInventoryGridRuntime.canAdd(item, column, row, owner);
    let result = env.deps.equipmentInventoryGridRuntime.findAddPlacement(item, owner);
    if (!result.ok && env.deps.equipmentInventoryGridRuntime.canStoreItems([item], owner)) return { ok: true, placement: null };
    return result;
}

export function* itemFlowUnequipItemToGrid(env, owner, slot, column, row) {
    let item = owner.equipment[slot];
    if (!item) return false;
    let placementResult = itemFlowFindUnequipPlacement(env, owner, item, column, row);
    if (!placementResult.ok) {
        (yield { kind: 'itemLog', args: [placementResult.reason || '인벤토리 공간이 부족해 장착 해제할 수 없습니다.', 'attack-monster'] });
        return false;
    }
    let itemKey = env.deps.equipmentLoadoutRuntime.ensureItemIdentity(item);
    delete item.legacyRequirementGrace;
    owner.inventory.push(item);
    owner.equipment[slot] = null;
    if (placementResult.placement) owner.equipmentInventoryPlacements = { ...(owner.equipmentInventoryPlacements || {}), [itemKey]: placementResult.placement };
    if (itemFlowIsCraftSelectionEquip(env) && itemFlowGetCraftSelectionRef(env) === slot) {
        env.craftingSelectionState.ref = item.id;
        env.craftingSelectionState.isEquip = false;
    }
    env.deps.normalizeSupportLoadout(true);
    (yield { kind: 'itemRefresh', args: [] });
    return true;
}

export function* itemFlowUnequipItem(env, owner, slot) {
    return (yield* itemFlowUnequipItemToGrid(env, owner, slot));
}

export function* itemFlowReleaseClosedThirdRing(env, owner, say) {
    const ring = owner.equipment && owner.equipment['반지3'];
    if (!ring || owner.isBackgroundCalculation || owner.woodsmanBuildLock || env.deps.getTranscendentVoidPassiveCount('thirdFinger', owner) > 0) return false;
    if (!itemFlowFindUnequipPlacement(env, owner, ring).ok || !(yield* itemFlowUnequipItemToGrid(env, owner, '반지3'))) return false;
    say(`세 번째 손가락이 사라져 [${ring.name}]${env.deps.pickParticle(ring.name, '을', '를')} 가방에 넣었습니다.`, 'loot-normal');
    return true;
}

export function* itemFlowSalvageItemById(owner, itemId) {
    let idx = itemFlowFindInventoryIndexById(owner, itemId);
    if (idx < 0) return false;
    (yield { kind: 'itemSalvage', args: [idx] });
    return true;
}

export function* itemFlowToggleItemLockById(env, owner, itemId) {
    let idx = itemFlowFindInventoryIndexById(owner, itemId);
    if (idx < 0) return false;
    let item = owner.inventory[idx];
    if (!item) return false;
    if (item.hallReplica) {
        (yield { kind: 'itemLog', args: [env.deps._t('전당 소장품의 보호 잠금은 해제할 수 없습니다.'), 'attack-monster'] });
        return false;
    }
    item.locked = !item.locked;
    (yield { kind: 'itemLog', args: [`${item.locked ? env.deps._t('🔒 잠금') : env.deps._t('🔓 잠금 해제')}: [${item.name}]`, 'loot-normal'] });
    (yield { kind: 'itemRefresh', args: [] });
    return true;
}
