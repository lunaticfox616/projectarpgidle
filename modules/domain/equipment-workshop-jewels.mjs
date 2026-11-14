/** The selection service owns its reference; it is read after sockets return their jewels. */
export function destroyWorkshopItem(env, owner, item) {
    if (typeof env.deps.getCraftSelectionRef !== 'function' || typeof env.deps.isCraftSelectionEquip !== 'function') return 0;
    const jewels = env.deps.equipmentSockets.returnJewels(item, owner);
    const ref = env.deps.getCraftSelectionRef();
    if (env.deps.isCraftSelectionEquip()) owner.equipment[ref] = null;
    else owner.inventory = (owner.inventory || []).filter(entry => entry !== item);
    if (typeof env.deps.clearCraftSelection === 'function') env.deps.clearCraftSelection();
    return jewels;
}

/** The refund resumes its acquisition notifications before the failure log. */
export function* refineWorkshopJewel(env, owner) {
    if (owner.woodsmanBuildLock) return yield { kind: 'workshopLog', args: [env.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster'] };
    const cost = 12;
    if ((owner.currencies.jewelShard || 0) < cost) return yield { kind: 'workshopLog', args: [env.deps._t('주얼 가공에 필요한 주얼 결정이 부족합니다. (필요: {cost})', { cost }), 'attack-monster'] };
    if (!env.deps.equipmentInventoryGridRuntime.findAddPlacement({ slot: env.deps.bagItems.JEWEL }, owner).ok) return yield { kind: 'workshopLog', args: [env.deps._t('가방에 자리가 없습니다.'), 'attack-monster'] };
    owner.currencies.jewelShard -= cost;
    const zoneTier = Math.max(1, Math.floor(((env.deps.getZone(owner.currentZoneId) || {}).tier || 1)));
    const jewel = env.deps.generateJewelDrop(zoneTier + 8);
    if (!jewel) {
        yield* env.deps.awardCurrency(owner, 'jewelShard', cost);
        return yield { kind: 'workshopLog', args: [env.deps._t('주얼 가공 결과를 생성하지 못했습니다. 소모 재화를 반환합니다.'), 'attack-monster'] };
    }
    env.deps.bagItems.put(env.deps.bagItems.asJewel(jewel), owner, true);
    yield { kind: 'workshopJewelCreated', args: [jewel] };
    yield { kind: 'workshopRefresh', args: [] };
}
