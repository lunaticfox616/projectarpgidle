

/** Prepare all inventory values before committing. Overflow is retained, never discarded. */
export function escrowClaim(env, state,run) {
    const loot=run.loot;
    const {currencies,skyPower}=escrowPrepareCurrencyBalances(state,loot.currencies);
    const gems=env.deps.gemDropRewards.prepare(state,loot.gems);
    const inventories=escrowPrepareInventories(env, state,loot);
    const recovery=loot.salvagedEquipment.length?{salvageRecovery:env.deps.salvageRecoveryRuntime.prepareRecords(loot.salvagedEquipment,state)}:{};
    // Retain the currency object's legacy non-enumerable accessors and consumers' references.
    Object.assign(state.currencies,currencies);Object.assign(state,inventories);
    Object.assign(state,recovery);
    state.skyTower.condensedPower=skyPower;
    Object.assign(state,gems);if(loot.gems.length)state.noti.skills=true;
    escrowMarkItemsReceived(env, state,loot);
    state.currencyDropVersion=Math.max(0,Math.floor(state.currencyDropVersion||0))+Object.keys(loot.currencies).length;
}

function escrowPrepareInventories(env, state,loot) {
    // 2026-10-10부터 주얼과 코어도 가방에 들어간다(js/bag-items.js): 장비와 같은 가방 목록에 붙인다.
    const inventory=state.inventory.concat(loot.equipment,loot.jewels.map(jewel=>env.deps.bagItems.asJewel({...jewel})),
        loot.cores.map(core=>env.deps.bagItems.asCore({...core})));
    const owned=[...state.inventory,...(state.jewelInventory||[]),
        ...Object.values(state.equipment),...env.deps.coreItems.ownedItems(state)].filter(Boolean);
    const ids=new Set(owned.map(item=>item.id));
    for(const item of [...loot.equipment,...loot.jewels,...loot.cores]) {
        if(ids.has(item.id))throw Error('이미 소유한 탐험 장비 보상');
        ids.add(item.id);
    }
    return {inventory};
}

function escrowMarkItemsReceived(env, state,loot) {
    if(loot.jewels.length || loot.equipment.length || loot.cores.length)state.noti.items=true;
    for(const item of loot.equipment.filter(row=>row.rarity==='unique')) {
        env.deps.registerUniqueToCodexOnAcquire(item,state);
        env.deps.uniqueHuntRuntime.complete(item,state);
    }
}

function escrowPrepareCurrencyBalances(state,rewards) {
    const currencies={...state.currencies};
    const ordinary=Object.entries(rewards).filter(([key])=>key!=='condensedSkyPower');
    for(const [key,amount] of ordinary) {
        currencies[key]=(currencies[key]||0)+amount;
        if(!Number.isFinite(currencies[key]))throw Error('탐험 보상 수령 한도 초과');
    }
    const skyGain=rewards.condensedSkyPower||0;
    const skyPower=(state.skyTower.condensedPower||0)+skyGain;
    if(!Number.isFinite(skyPower))throw Error('창공 보상 수령 한도 초과');
    return {currencies,skyPower};
}
