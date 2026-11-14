

export function escrowIsCurrency(env, key) {return Object.hasOwn(env.deps.ORB_DB,key) || Object.hasOwn(env.deps.defaultGame.currencies,key);}

export function escrowReservedItems(state){
    const loot=state.actExploration?.loot;
    return loot ? [...loot.equipment,...loot.jewels,...loot.cores,...loot.salvagedEquipment.map(row=>row.item)] : [];
}

export function escrowValidEquipment(item) {
    return item && Number.isSafeInteger(item.id) && typeof item.name==='string'
        && typeof item.slot==='string' && Array.isArray(item.stats) && Array.isArray(item.baseStats);
}

/** A stored core is exactly its own normalized form: no unknown lines, no out-of-range values. */
export function escrowValidCore(env, item) {
    const core=env.deps.coreItems.normalizeCore(item);
    return !!core && JSON.stringify(core)===JSON.stringify(item);
}

export function escrowValidJewel(item) {
    return item&&Number.isSafeInteger(item.id)&&typeof item.name==='string'
        &&['normal','magic','rare','unique'].includes(item.rarity)&&Array.isArray(item.stats);
}

export function escrowValidate(env, loot) {
    if(!loot || loot.version!==10 || !['pending','claimed','lost'].includes(loot.phase))throw Error('지원하지 않는 탐험 보상 저장');
    escrowValidateCurrencies(env, loot.currencies);
    env.deps.gemDropRewards.validate(loot.gems);
    escrowValidateItemList(loot.equipment,escrowValidEquipment);
    escrowValidateItemList(loot.jewels,escrowValidJewel);
    escrowValidateItemList(loot.cores,(...args)=>escrowValidCore(env,...args));
    escrowValidateSalvagedEquipment(env, loot);
    if(loot.phase!=='pending' && escrowHasRewards(loot))throw Error('정산된 탐험 보상이 남아 있습니다.');
}

function escrowHasRewards(loot) {
    return [loot.equipment.length,Object.keys(loot.currencies).length,
        loot.gems.length,loot.cores.length,loot.jewels.length,loot.salvagedEquipment.length].some(Boolean);
}

function escrowValidateSalvagedEquipment(env, loot) {
    if(!Array.isArray(loot.salvagedEquipment)||loot.salvagedEquipment.length>env.deps.SALVAGE_RECOVERY_CAP)throw Error('잘못된 탐험 해체 기록');
    for(const row of loot.salvagedEquipment) {
        if(!row||!escrowValidEquipment(row.item)||!env.deps.isSalvageRecoveryItem(row.item))throw Error('잘못된 탐험 해체 기록');
        escrowValidateCurrencies(env, row.rewards);
    }
    escrowValidateItemList([...loot.equipment,...loot.salvagedEquipment.map(row=>row.item)],escrowValidEquipment);
}

function escrowValidateItemList(items,valid) {
    if(!Array.isArray(items)||!items.every(valid))throw Error('잘못된 탐험 장비 저장');
    if(new Set(items.map(item=>item.id)).size!==items.length)throw Error('중복된 탐험 아이템 저장');
}

function escrowValidateCurrencies(env, currencies) {
    if(!currencies || typeof currencies!=='object' || Array.isArray(currencies))throw Error('잘못된 탐험 재화 목록');
    for(const [key,amount] of Object.entries(currencies)) {
        if(!escrowIsCurrency(env, key) || !Number.isFinite(amount) || amount<=0)throw Error('잘못된 탐험 재화 저장');
    }
}
