/** Persisted subtab fields are unchanged; callers validate availability before selection. */
export function selectSubtab(owner, field, subtabId) {
    owner[field] = subtabId;
}

export function acknowledgeEquipmentTab(owner, subtabId) {
    if (subtabId === 'item-tab-equip' && owner.noti) owner.noti.items = false;
}
