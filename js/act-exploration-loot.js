// Migration boundary for saves made before immediate exploration pickups (2026-10-04).
// New runs have no escrow. Old pending rewards transfer once, then the legacy field is removed.
const actExplorationLoot=(()=>{
    /** Escrow holds any wallet currency: ORB_DB items and wallet-only counters (군락지 흔적 · 성핵 …). */
    const isCurrency=key=>Object.hasOwn(ORB_DB,key) || Object.hasOwn(defaultGame.currencies,key);
    function reservedItems(state){
        const loot=state.actExploration?.loot;
        return loot ? [...loot.equipment,...loot.jewels,...loot.cores,...loot.salvagedEquipment.map(row=>row.item)] : [];
    }
    function validEquipment(item) {
        return item && Number.isSafeInteger(item.id) && typeof item.name==='string'
            && typeof item.slot==='string' && Array.isArray(item.stats) && Array.isArray(item.baseStats);
    }
    /** A stored core is exactly its own normalized form: no unknown lines, no out-of-range values. */
    function validCore(item) {
        const core=coreItems.normalizeCore(item);
        return !!core && JSON.stringify(core)===JSON.stringify(item);
    }
    function validJewel(item) {
        return item&&Number.isSafeInteger(item.id)&&typeof item.name==='string'
            &&['normal','magic','rare','unique'].includes(item.rarity)&&Array.isArray(item.stats);
    }
    function validate(loot) {
        if(!loot || loot.version!==10 || !['pending','claimed','lost'].includes(loot.phase))throw Error('지원하지 않는 탐험 보상 저장');
        validateCurrencies(loot.currencies);
        gemDropRewards.validate(loot.gems);
        validateItemList(loot.equipment,validEquipment);
        validateItemList(loot.jewels,validJewel);
        validateItemList(loot.cores,validCore);
        validateSalvagedEquipment(loot);
        if(loot.phase!=='pending' && hasRewards(loot))throw Error('정산된 탐험 보상이 남아 있습니다.');
    }
    function hasRewards(loot) {
        return [loot.equipment.length,Object.keys(loot.currencies).length,
            loot.gems.length,loot.cores.length,loot.jewels.length,loot.salvagedEquipment.length].some(Boolean);
    }
    function validateSalvagedEquipment(loot) {
        if(!Array.isArray(loot.salvagedEquipment)||loot.salvagedEquipment.length>SALVAGE_RECOVERY_CAP)throw Error('잘못된 탐험 해체 기록');
        for(const row of loot.salvagedEquipment) {
            if(!row||!validEquipment(row.item)||!isSalvageRecoveryItem(row.item))throw Error('잘못된 탐험 해체 기록');
            validateCurrencies(row.rewards);
        }
        validateItemList([...loot.equipment,...loot.salvagedEquipment.map(row=>row.item)],validEquipment);
    }
    function validateItemList(items,valid) {
        if(!Array.isArray(items)||!items.every(valid))throw Error('잘못된 탐험 장비 저장');
        if(new Set(items.map(item=>item.id)).size!==items.length)throw Error('중복된 탐험 아이템 저장');
    }
    function validateCurrencies(currencies) {
        if(!currencies || typeof currencies!=='object' || Array.isArray(currencies))throw Error('잘못된 탐험 재화 목록');
        for(const [key,amount] of Object.entries(currencies)) {
            if(!isCurrency(key) || !Number.isFinite(amount) || amount<=0)throw Error('잘못된 탐험 재화 저장');
        }
    }
    /** Prepare all inventory values before committing. Overflow is retained, never discarded. */
    function claim(state,run) {
        const loot=run.loot;
        const {currencies,skyPower}=prepareCurrencyBalances(state,loot.currencies);
        const gems=gemDropRewards.prepare(state,loot.gems);
        const inventories=prepareInventories(state,loot);
        const recovery=loot.salvagedEquipment.length?{salvageRecovery:salvageRecoveryRuntime.prepareRecords(loot.salvagedEquipment,state)}:{};
        // Retain the currency object's legacy non-enumerable accessors and consumers' references.
        Object.assign(state.currencies,currencies);Object.assign(state,inventories);
        Object.assign(state,recovery);
        state.skyTower.condensedPower=skyPower;
        Object.assign(state,gems);if(loot.gems.length)state.noti.skills=true;
        markItemsReceived(state,loot);
        state.currencyDropVersion=Math.max(0,Math.floor(state.currencyDropVersion||0))+Object.keys(loot.currencies).length;
    }
    function prepareInventories(state,loot) {
        const inventory=state.inventory.concat(loot.equipment);
        const jewelInventory=(state.jewelInventory||[]).concat(loot.jewels);
        const owned=[...state.inventory,...(state.jewelInventory||[]),
            ...Object.values(state.equipment),...coreItems.ownedItems(state)].filter(Boolean);
        const ids=new Set(owned.map(item=>item.id));
        for(const item of [...loot.equipment,...loot.jewels,...loot.cores]) {
            if(ids.has(item.id))throw Error('이미 소유한 탐험 장비 보상');
            ids.add(item.id);
        }
        const store=coreItems.ensure(state);
        return {inventory,jewelInventory,cores:{...store,owned:store.owned.concat(loot.cores)}};
    }
    function markItemsReceived(state,loot) {
        if(loot.jewels.length || loot.equipment.length)state.noti.items=true;
        for(const item of loot.equipment.filter(row=>row.rarity==='unique')) {
            registerUniqueToCodexOnAcquire(item,state);
            uniqueHuntRuntime.complete(item,state);
        }
    }
    function prepareCurrencyBalances(state,rewards) {
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
    // One schema step per saved version. Each older version already granted what the new collection would hold.
    const LOOT_UPGRADES={
        // Version 1 granted flask drops immediately, so it has no pending flask rewards to recover.
        1:loot=>Object.assign(loot,{version:2,flasks:[],alchemyGlass:0}),
        // v2 already granted gem drops. Only future rolls enter the pending collection.
        2:loot=>Object.assign(loot,{version:3,gems:[]}),
        // v3 granted cube material immediately; its previous drops must not be paid twice.
        3:loot=>Object.assign(loot,{version:4,blurred45:0}),
        // v4 paid these collections immediately, including their auto-salvage rewards.
        4:loot=>Object.assign(loot,{version:5,growthItems:[],jewels:[],growthCodex:[]}),
        // v5 bypassed equipment salvage, so it has no deferred recovery records.
        5:loot=>Object.assign(loot,{version:6,salvagedEquipment:[]}),
        // v6 held core cube material. The cube became core items (2026-09-30); old progress resets without compensation.
        6:loot=>{delete loot.blurred45;Object.assign(loot,{version:7,cores:[]});},
        // v7 held growth items and growth essence. The growth board was removed (2026-09-30); they go without compensation.
        7:loot=>{
            delete loot.growthItems;delete loot.growthCodex;
            if(loot.currencies&&typeof loot.currencies==='object')delete loot.currencies.growthEssence;
            loot.version=8;
        },
        // v8 held flask discoveries and alchemy glass. Flasks were removed (2026-10-01); they go without compensation.
        8:loot=>{delete loot.flasks;delete loot.alchemyGlass;loot.version=9;},
        // v9 could hold meteor shards (atlas meteor craters) and other star-wedge currencies. Star wedges were removed
        // (2026-10-01); those currencies go without compensation.
        9:loot=>{
            if(loot.currencies&&typeof loot.currencies==='object')['meteorShard','incompleteStarWedge','starWedge','astralCore'].forEach(key=>delete loot.currencies[key]);
            loot.version=10;
        }
    };
    function migrateLegacyLoot(run) {
        if(run.loot===null)return; // validate() reports the malformed save below.
        while(Object.hasOwn(LOOT_UPGRADES,run.loot?.version))LOOT_UPGRADES[run.loot.version](run.loot);
    }
    function restore(state,run) {
        if(run.loot===undefined)return;
        migrateLegacyLoot(run);
        validate(run.loot);
        if(run.status==='active' && run.loot.phase!=='pending')throw Error('진행 중 탐험의 보상이 이미 종료되었습니다.');
        if(run.status==='failed' && run.loot.phase!=='lost')throw Error('실패한 탐험에 보상이 남아 있습니다.');
        if(run.completionApplied && run.loot.phase!=='claimed')throw Error('완료된 탐험 보상이 정산되지 않았습니다.');
        if(run.loot.phase==='pending')claim(state,run);
        delete run.loot;
    }
    // The exploration floor (js/exploration-ground-loot.js) validates its saved items with the same rules.
    return {reservedItems,restore,validEquipment,validJewel,validCore,isCurrency};
})();
safeExposeGlobals({actExplorationLoot});
