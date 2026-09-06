/** Saved field bountyHunt is retained to migrate old progress; all new play uses treasure events. */
const bountyRuntime = (() => {
    function isUnlocked(owner=game) {
        return contentProgression.isUnlocked('bounty',owner) && owner.season>=BOUNTY_HUNT_CONFIG.unlockLoop;
    }
    function restoreCountdown(value) {
        const oldReady=!!value.activeId || (Array.isArray(value.offerIds) && value.offerIds.length>0);
        const remaining=value.version===2 ? Number(value.remaining) : oldReady ? 0 : 10-(Number(value.pity)||0);
        return Math.max(0,Math.min(10,Math.floor(Number.isFinite(remaining)?remaining:10)));
    }
    function restorePending(pending) {
        const def=TREASURE_EVENT_DB[pending?.id];
        if (!def) return null;
        if (def.key) return {id:pending.id,item:null};
        const item=pending.item;
        if (!item || item.rarity!==def.rarity || !EQUIPMENT_DROP_SLOTS.includes(item.slot)) return null;
        if (def.slot && item.slot!==def.slot) return null;
        if (typeof item.name!=='string') return null;
        return {id:pending.id,item:normalizeItem(item)};
    }
    /** Save boundary: legacy hunts become ready treasures; pending rewards survive reload without a new roll. */
    function restore(raw) {
        const value=raw && typeof raw==='object' ? raw : {};
        const completed=Number(value.completed);
        const pending=restorePending(value.pending);
        const source=value.source;
        const validSource=source && Number.isInteger(source.itemTier) && source.itemTier>=1 && source.itemTier<=20
            && BOUNTY_HUNT_CONFIG.eligibleZoneTypes.includes(source.dropRealm);
        return {version:2,remaining:pending ? 0 : restoreCountdown(value),pending,
            source:validSource ? {itemTier:source.itemTier,dropRealm:source.dropRealm} : null,
            completed:Number.isFinite(completed) ? Math.max(0,Math.floor(completed)) : 0};
    }
    function ensureState(owner=game) {
        if (owner.bountyHunt?.version!==2) owner.bountyHunt=restore(owner.bountyHunt);
        return owner.bountyHunt;
    }
    function advanceAfterBossKill(zone,enemy,owner=game) {
        const state=ensureState(owner);
        if (!isUnlocked(owner) || !enemy?.isBoss || !zone || zone.loopScaleExempt
            || !BOUNTY_HUNT_CONFIG.eligibleZoneTypes.includes(zone.type)) return {offered:false,reason:'ineligible'};
        if (state.remaining===0) return {offered:false,reason:'pending'};
        state.remaining--;
        if (state.remaining===0) state.source={itemTier:rollRealmItemDropTier(zone,{isBoss:true}),dropRealm:zone.type};
        return {offered:state.remaining===0,remaining:state.remaining};
    }
    function available(def) { return !def.key || contentProgression.canDropCurrency(def.key); }
    function uniquePool(slot,tier) {
        return UNIQUE_DB.filter(item=>!item.ultraRare && !item.dropOnly && item.reqTier<=tier
            && item.slots[0]===slot && !item.name.includes('우로보로스'));
    }
    function rollEventId(tier) {
        const roll=Math.random(), config=BOUNTY_HUNT_CONFIG;
        if (roll<config.goldenChance && available(TREASURE_EVENT_DB.golden_reliquary)) return 'golden_reliquary';
        if (roll<config.goldenChance+config.fairyChance && available(TREASURE_EVENT_DB.fairy_hollow)) return 'fairy_hollow';
        const relics=['lost_weapon','lost_armor','lost_boots'].filter(id=>uniquePool(TREASURE_EVENT_DB[id].slot,tier).length>0);
        if (roll<config.goldenChance+config.fairyChance+config.uniqueChance && relics.length) return rndChoice(relics);
        return rndChoice(Object.keys(TREASURE_EVENT_DB).filter(id=>TREASURE_EVENT_DB[id].common && available(TREASURE_EVENT_DB[id])));
    }
    function openTreasure() {
        const state=ensureState();
        if (!isUnlocked() || state.remaining>0) return null;
        if (state.pending) return state.pending;
        // Legacy ready saves have no source; resolve once, then persist with the opened reward.
        const zone=getZone(game.currentZoneId) || getZone(0);
        const source=state.source || {itemTier:rollRealmItemDropTier(zone,{isBoss:true}),dropRealm:zone.type};
        const tier=source.itemTier;
        const affixTierCap=getRealmEquipmentAffixTierCap({type:source.dropRealm},tier);
        const origin={dropRealm:source.dropRealm,affixTierCap,affixTierFloor:getDroppedAffixTierRange(affixTierCap).min,
            tierWeightFalloff:DROPPED_AFFIX_TIER_WEIGHT_FALLOFF};
        const id=rollEventId(tier), def=TREASURE_EVENT_DB[id];
        let item=null;
        if (def.slot) item=generateUniqueItem(tier,def.slot,rndChoice(uniquePool(def.slot,tier)).name);
        else if (!def.key) item=createItemFromBase(chooseItemBase(rndChoice(EQUIPMENT_DROP_SLOTS),tier),'rare',tier,origin);
        state.source=source;
        state.pending={id,item:item ? normalizeItem(item) : null};
        return state.pending;
    }
    function rewardLabel(pending) {
        const def=TREASURE_EVENT_DB[pending.id];
        return def.key ? `${ORB_DB[def.key].name} ${def.amount}개` : `${pending.item.slot} · ${pending.item.name}`;
    }
    function claimTreasure() {
        const state=ensureState(), pending=state.pending;
        if (!pending || !isUnlocked()) return {ok:false};
        const def=TREASURE_EVENT_DB[pending.id];
        if (!available(def)) return {ok:false};
        const label=rewardLabel(pending);
        if (def.key) awardCurrency(def.key,def.amount);
        else if (!addItemToInventory(pending.item,{guaranteedKeep:true})) return {ok:false};
        state.pending=null;state.source=null;state.remaining=BOUNTY_HUNT_CONFIG.guaranteedAt;state.completed++;
        return {ok:true,label,event:def,item:pending.item};
    }
    function canAdvanceLoop() {
        return !isUnlocked() || ensureState().remaining>0;
    }
    return Object.freeze({isUnlocked,restore,ensureState,advanceAfterBossKill,openTreasure,claimTreasure,rewardLabel,canAdvanceLoop});
})();
safeExposeGlobals({bountyRuntime});
