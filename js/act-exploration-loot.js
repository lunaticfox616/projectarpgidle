// Pending loot owns already-rolled rewards, never a random seed or a second drop simulation.
// Capture is synchronous and limited to enemy loot; purchases, quests and XP stay outside it.
const actExplorationLoot=(()=>{
    let captureOwner=null;
    function create(){return {version:6,phase:'pending',currencies:{},equipment:[],flasks:[],alchemyGlass:0,gems:[],blurred45:0,growthItems:[],jewels:[],growthCodex:[],salvagedEquipment:[]};}
    function reservedItems(state){
        const loot=state.actExploration?.loot;
        return loot ? [...loot.equipment,...loot.growthItems,...loot.jewels,...loot.salvagedEquipment.map(row=>row.item)] : [];
    }
    function capture(state,run,produce) {
        // The last boss can trigger corpse explosions before completion is committed.
        if(!run || !['active','cleared'].includes(run.status))return produce();
        if(run.loot.phase!=='pending')throw Error('종료된 탐험에 보상을 추가할 수 없습니다.');
        if(captureOwner?.state===state && captureOwner.run===run)return produce();
        const previous=captureOwner,loot={...run.loot,currencies:{...run.loot.currencies},
            equipment:[...run.loot.equipment],flasks:[...run.loot.flasks],gems:[...run.loot.gems],
            growthItems:[...run.loot.growthItems],jewels:[...run.loot.jewels],growthCodex:[...run.loot.growthCodex],
            salvagedEquipment:[...run.loot.salvagedEquipment]};
        captureOwner={state,run,loot};
        try{const result=produce();run.loot=loot;return result;}finally{captureOwner=previous;}
    }
    function pending(state) {
        return captureOwner?.state===state ? captureOwner.loot : null;
    }
    /** Amount has already passed unlock checks and expert gain modifiers. */
    function currency(state,key,amount) {
        const loot=pending(state);if(!loot)return false;
        if(!Object.hasOwn(ORB_DB,key) || !Number.isFinite(amount) || amount<=0)throw Error('잘못된 탐험 재화 보상');
        const total=(loot.currencies[key]||0)+amount;
        if(!Number.isFinite(total))throw Error('탐험 재화 보상 범위 초과');
        loot.currencies[key]=total;return true;
    }
    function validEquipment(item) {
        return item && Number.isSafeInteger(item.id) && typeof item.name==='string'
            && typeof item.slot==='string' && Array.isArray(item.stats) && Array.isArray(item.baseStats);
    }
    function validGrowth(item) {
        return validJewel(item)&&Array.isArray(item.baseStats)
            &&(typeof item.slot==='string'||item.slot===null&&item.growthCategory==='slab')
            &&Object.hasOwn(GROWTH_SHAPE_DB,item.growthShapeId)
            &&Object.hasOwn(GROWTH_CATEGORY_INFO,item.growthCategory);
    }
    function validJewel(item) {
        return item&&Number.isSafeInteger(item.id)&&typeof item.name==='string'
            &&['normal','magic','rare','unique'].includes(item.rarity)&&Array.isArray(item.stats);
    }
    /** Optional delivery boundary used by the existing pickup/filter/salvage policy. */
    function delivery(state,kind) {
        const loot=pending(state);if(!loot)return null;
        if(!['equipment','growthItems','jewels'].includes(kind))throw Error('알 수 없는 탐험 아이템 보관함');
        return {heldCount:loot[kind].length,currency:currency.bind(null,state),
            canStore:item=>canStoreEquipmentItems(loot.equipment.concat(item),state),
            recovery:(item,rewards)=>{
                loot.salvagedEquipment.push({item,rewards});
                loot.salvagedEquipment=loot.salvagedEquipment.slice(-SALVAGE_RECOVERY_CAP);
            },
            discover:item=>{if(kind==='growthItems'&&item.rarity==='unique')loot.growthCodex.push(item);},store:item=>{
            const valid={equipment:validEquipment,growthItems:validGrowth,jewels:validJewel}[kind];
            if(!valid(item)||loot[kind].some(row=>row.id===item.id))throw Error('잘못된 탐험 아이템 보상');
            loot[kind].push(item);return true;
        }};
    }
    /** Discovery candidates include pending bottles; equipping still reads owned foundKeys only. */
    function foundFlasks(state,owned) {return owned.concat(pending(state)?.flasks||[]);}
    function flask(state,key) {
        const loot=pending(state);if(!loot)return false;
        if(!Object.hasOwn(FLASK_DB,key))throw Error('잘못된 탐험 플라스크 보상');
        if(loot.flasks.includes(key))throw Error('중복된 탐험 플라스크 보상');
        loot.flasks.push(key);return true;
    }
    function alchemyGlass(state,amount) {
        const loot=pending(state);if(!loot)return false;
        const total=loot.alchemyGlass+amount;
        if(!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(total))throw Error('잘못된 탐험 연금 유리 보상');
        loot.alchemyGlass=total;return true;
    }
    function gem(state,row) {
        const loot=pending(state);if(!loot)return false;
        gemDropRewards.validateGem(row);
        const index=loot.gems.findIndex(held=>held.kind===row.kind&&held.name===row.name);
        if(index<0)loot.gems.push({...row});
        else {
            if(row.kind!=='support'||row.tier<=loot.gems[index].tier)throw Error('중복된 탐험 젬 보상');
            loot.gems[index]={...row};
        }
        return true;
    }
    function blurred45(state,amount) {
        const loot=pending(state);if(!loot)return false;
        const total=loot.blurred45+amount;
        if(!Number.isSafeInteger(amount)||amount<=0||!Number.isSafeInteger(total))throw Error('잘못된 탐험 큐브 재료 보상');
        loot.blurred45=total;return true;
    }
    function validate(loot) {
        if(!loot || loot.version!==6 || !['pending','claimed','lost'].includes(loot.phase))throw Error('지원하지 않는 탐험 보상 저장');
        validateCurrencies(loot.currencies);
        validateSupplies(loot);
        gemDropRewards.validate(loot.gems);
        validateItemList(loot.equipment,validEquipment);
        validateItemList(loot.growthItems,validGrowth);
        validateItemList(loot.growthCodex,validGrowth);
        validateItemList(loot.jewels,validJewel);
        validateSalvagedEquipment(loot);
        if(loot.phase!=='pending' && hasRewards(loot))throw Error('정산된 탐험 보상이 남아 있습니다.');
    }
    function hasRewards(loot) {
        return [loot.equipment.length,Object.keys(loot.currencies).length,loot.flasks.length,loot.alchemyGlass,
            loot.gems.length,loot.blurred45,loot.growthItems.length,loot.jewels.length,loot.growthCodex.length,
            loot.salvagedEquipment.length].some(Boolean);
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
    function validateSupplies(loot) {
        if(!Array.isArray(loot.flasks)||!loot.flasks.every(key=>typeof key==='string'&&Object.hasOwn(FLASK_DB,key)))throw Error('잘못된 탐험 플라스크 저장');
        if(new Set(loot.flasks).size!==loot.flasks.length)throw Error('중복된 탐험 플라스크 저장');
        if(!Number.isSafeInteger(loot.alchemyGlass)||loot.alchemyGlass<0)throw Error('잘못된 탐험 연금 유리 저장');
        if(!Number.isSafeInteger(loot.blurred45)||loot.blurred45<0)throw Error('잘못된 탐험 큐브 재료 저장');
    }
    function validateCurrencies(currencies) {
        if(!currencies || typeof currencies!=='object' || Array.isArray(currencies))throw Error('잘못된 탐험 재화 목록');
        for(const [key,amount] of Object.entries(currencies)) {
            if(!Object.hasOwn(ORB_DB,key) || !Number.isFinite(amount) || amount<=0)throw Error('잘못된 탐험 재화 저장');
        }
    }
    /** Prepare all inventory values before committing. Overflow is retained, never discarded. */
    function claim(state,run) {
        if(!run || run.status!=='cleared')return null;
        const loot=run.loot;validate(loot);if(loot.phase!=='pending')return null;
        const {currencies,skyPower}=prepareCurrencyBalances(state,loot.currencies);
        const flasks=prepareFlasks(state.flasks,loot);
        const gems=gemDropRewards.prepare(state,loot.gems);
        const cube=loot.blurred45 ? prepareCoreCubeBlurred45(state,loot.blurred45) : {};
        const inventories=prepareInventories(state,loot);
        const recovery=loot.salvagedEquipment.length?{salvageRecovery:salvageRecoveryRuntime.prepareRecords(loot.salvagedEquipment,state)}:{};
        const receipt={currencies:loot.currencies,equipment:loot.equipment,flasks:loot.flasks,alchemyGlass:loot.alchemyGlass,gems:loot.gems,blurred45:loot.blurred45,growthItems:loot.growthItems,jewels:loot.jewels,growthCodex:loot.growthCodex};
        // Retain the currency object's legacy non-enumerable accessors and consumers' references.
        Object.assign(state.currencies,currencies);Object.assign(state,inventories);
        Object.assign(state,recovery);
        state.skyTower.condensedPower=skyPower;
        Object.assign(state,cube);
        Object.assign(state.flasks,flasks);
        if(loot.flasks.length)state.noti.flask=true;
        Object.assign(state,gems);if(loot.gems.length)state.noti.skills=true;
        markItemsReceived(state,loot);
        state.currencyDropVersion=Math.max(0,Math.floor(state.currencyDropVersion||0))+Object.keys(loot.currencies).length;
        Object.assign(loot,create(),{phase:'claimed'});
        return receipt;
    }
    function prepareInventories(state,loot) {
        const inventory=state.inventory.concat(loot.equipment);
        const growthInventory=(state.growthInventory||[]).concat(loot.growthItems);
        const jewelInventory=(state.jewelInventory||[]).concat(loot.jewels);
        const owned=[...state.inventory,...(state.growthInventory||[]),...(state.jewelInventory||[]),
            ...Object.values(state.equipment),...(state.jewelSlots||[])].filter(Boolean);
        const ids=new Set(owned.map(item=>item.id));
        for(const item of [...loot.equipment,...loot.growthItems,...loot.jewels]) {
            if(ids.has(item.id))throw Error('이미 소유한 탐험 장비 보상');
            ids.add(item.id);
        }
        return {inventory,growthInventory,jewelInventory};
    }
    function markItemsReceived(state,loot) {
        if(loot.growthItems.length)state.noti.items=true;
        if(loot.jewels.length)state.noti.jewel=true;
    }
    function prepareFlasks(owned,loot) {
        const alchemyGlass=owned.alchemyGlass+loot.alchemyGlass;
        if(!Number.isSafeInteger(alchemyGlass)||alchemyGlass<0)throw Error('연금 유리 수령 한도 초과');
        return {foundKeys:[...new Set(owned.foundKeys.concat(loot.flasks))],alchemyGlass};
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
    function discard(run) {
        if(!run || run.loot.phase!=='pending')return;
        Object.assign(run.loot,create(),{phase:'lost'});
    }
    function migrateLegacyLoot(run) {
        // Earlier opt-in review saves already granted their drops; never reconstruct them.
        if(run.loot===undefined) {
            run.loot=create();
            if(run.status==='failed')run.loot.phase='lost';
            if(run.completionApplied)run.loot.phase='claimed';
        }
        if(run.loot===null)return; // validate() reports the malformed save below.
        // Version 1 granted flask drops immediately, so it has no pending flask rewards to recover.
        if(run.loot.version===1)Object.assign(run.loot,{version:2,flasks:[],alchemyGlass:0});
        // v2 already granted gem drops. Only future rolls enter the pending collection.
        if(run.loot.version===2)Object.assign(run.loot,{version:3,gems:[]});
        // v3 granted cube material immediately; its previous drops must not be paid twice.
        if(run.loot.version===3)Object.assign(run.loot,{version:4,blurred45:0});
        // v4 paid these collections immediately, including their auto-salvage rewards.
        if(run.loot.version===4)Object.assign(run.loot,{version:5,growthItems:[],jewels:[],growthCodex:[]});
        // v5 bypassed equipment salvage, so it has no deferred recovery records.
        if(run.loot.version===5)Object.assign(run.loot,{version:6,salvagedEquipment:[]});
    }
    function restore(run) {
        migrateLegacyLoot(run);
        validate(run.loot);
        if(run.status==='active' && run.loot.phase!=='pending')throw Error('진행 중 탐험의 보상이 이미 종료되었습니다.');
        if(run.status==='failed' && run.loot.phase!=='lost')throw Error('실패한 탐험에 보상이 남아 있습니다.');
        if(run.completionApplied && run.loot.phase!=='claimed')throw Error('완료된 탐험 보상이 정산되지 않았습니다.');
    }
    return {create,reservedItems,capture,pending,currency,delivery,foundFlasks,flask,alchemyGlass,gem,blurred45,validate,claim,discard,restore};
})();
safeExposeGlobals({actExplorationLoot});
