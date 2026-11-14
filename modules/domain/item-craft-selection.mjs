

export function itemFlowGetCraftSelectionRef(env) { return env.craftingSelectionState.ref; }

export function itemFlowIsCraftSelectionEquip(env) { return !!env.craftingSelectionState.isEquip; }

export function itemFlowClearCraftSelection(env) { env.craftingSelectionState.ref = null; env.craftingSelectionState.isEquip = false; }

export function itemFlowGetSelectedCraftItem(env, owner) {
    if (env.craftingSelectionState.ref === null) return null;
    const item = env.craftingSelectionState.isEquip ? owner.equipment[env.craftingSelectionState.ref]
        : (owner.inventory || []).find(row => row.id === env.craftingSelectionState.ref);
    return item && !item.hallReplica ? item : null;
}

export function itemFlowEnsureCraftSelectionValid(env, owner) {
    if (env.craftingSelectionState.ref !== null && !itemFlowGetSelectedCraftItem(env, owner)) itemFlowClearCraftSelection(env);
}

export function* itemFlowSelectForCrafting(env, owner, ref, isEquip) {
    let item = isEquip ? owner.equipment[ref] : (owner.inventory || []).find(row => row && Number(row.id) === Number(ref));
    if (item && item.hallReplica) {
        (yield { kind: 'itemLog', args: [env.deps._t('전당 소장품은 원본 상태를 보존하므로 제작할 수 없습니다.'), 'attack-monster'] });
        return false;
    }
    if (env.deps.bagItems.isSpecial(item)) {
        (yield { kind: 'itemLog', args: [env.deps._t('주얼, 코어, 액막이는 제작할 수 없습니다.'), 'attack-monster'] });
        return false;
    }
    env.craftingSelectionState.ref = ref;
    env.craftingSelectionState.isEquip = isEquip;
    (yield { kind: 'itemRefresh', args: [] });
    return true;
}
