/** Selected hunts retain their bonus until the target is defeated or the player loses. */
const bountyRuntime = (() => {
    function isUnlocked(owner=game) {
        return contentProgression.isUnlocked('bounty',owner) && owner.season>=BOUNTY_HUNT_CONFIG.unlockLoop;
    }
    function restoreCountdown(value) {
        const oldReady=!!value.activeId || (Array.isArray(value.offerIds) && value.offerIds.length>0);
        const remaining=value.version>=2 ? Number(value.remaining) : oldReady ? 0 : 10-(Number(value.pity)||0);
        return Math.max(0,Math.min(10,Math.floor(Number.isFinite(remaining)?remaining:10)));
    }
    function restoreHuntState(pending, version) {
        // Only already-earned v2 rewards bypass the restored hunting step.
        const targetId=BOUNTY_TARGET_DB[pending.targetId] ? pending.targetId : 'iron_collector';
        const status=version===2 || pending.status==='reward' ? 'reward' : pending.status==='queued' ? 'queued' : 'offered';
        const offered=Array.isArray(pending.offerIds) ? pending.offerIds : [targetId];
        const offerIds=status==='offered'
            ? [...new Set(offered.filter(id=>BOUNTY_TARGET_DB[id]))].slice(0,BOUNTY_HUNT_CONFIG.offerCount) : [];
        return {targetId:status==='offered' ? null : targetId,status,offerIds};
    }
    function restorePending(pending, version) {
        const def=TREASURE_EVENT_DB[pending?.id];
        if (!def) return null;
        const hunt=restoreHuntState(pending,version);
        if (def.key) return {id:pending.id,item:null,...hunt};
        const item=pending.item;
        if (!item || item.rarity!==def.rarity || !EQUIPMENT_DROP_SLOTS.includes(item.slot)) return null;
        if (def.slot && item.slot!==def.slot) return null;
        if (typeof item.name!=='string') return null;
        return {id:pending.id,item:normalizeItem(item),...hunt};
    }
    /** Snapshot only loot inputs; live realm depth and the claim location must not change an earned hunt. */
    function captureSource(zone) {
        const cap=getRealmEquipmentHiddenTierCap(zone);
        const dropZone=restoreDropZone({...zone,tier:Math.max(1,Math.floor(Number(zone.tier)||1))},zone.type);
        if (zone.type==='act') dropZone.storyOrder=cap;
        return {itemTier:rollRealmItemDropTier(zone,{isBoss:true}),dropRealm:zone.type,zone:dropZone,
            materialMultiplier:1+Math.floor((cap-1)/BOUNTY_HUNT_CONFIG.materialTierStep)};
    }
    function restoreDropZone(zone, realm) {
        if (!zone || zone.type!==realm || !Number.isFinite(zone.tier) || zone.tier<1) return null;
        const restored={type:zone.type,tier:Math.floor(zone.tier)};
        for (const key of ['depth','lootTier','storyOrder']) {
            if (Number.isFinite(zone[key]) && zone[key]>0) restored[key]=zone[key];
        }
        return restored;
    }
    function restoreSource(source) {
        if (!source || !Number.isInteger(source.itemTier) || source.itemTier<1 || source.itemTier>20
            || !BOUNTY_HUNT_CONFIG.eligibleZoneTypes.includes(source.dropRealm)) return null;
        const restored={itemTier:source.itemTier,dropRealm:source.dropRealm,zone:null,materialMultiplier:1};
        restored.zone=restoreDropZone(source.zone,source.dropRealm);
        if (!restored.zone) return restored;
        const cap=getRealmEquipmentHiddenTierCap(restored.zone);
        restored.materialMultiplier=1+Math.floor((cap-1)/BOUNTY_HUNT_CONFIG.materialTierStep);
        return restored;
    }
    /** Save boundary: legacy hunts become ready treasures; pending rewards survive reload without a new roll. */
    function restore(raw) {
        const value=raw && typeof raw==='object' ? raw : {};
        const completed=Number(value.completed);
        const pending=restorePending(value.pending,value.version);
        const remaining=pending ? 0 : restoreCountdown(value);
        let source=restoreSource(value.source);
        // Older partial counts have no boss history. Keep their kills, using T1 for the unknown portion.
        if (!source && remaining>0 && remaining<BOUNTY_HUNT_CONFIG.guaranteedAt) {
            source={itemTier:1,dropRealm:'act',zone:{type:'act',tier:1,storyOrder:1},materialMultiplier:1};
        }
        return {version:5,remaining,pending,source,
            completed:Number.isFinite(completed) ? Math.max(0,Math.floor(completed)) : 0};
    }
    function ensureState(owner=game) {
        if (owner.bountyHunt?.version!==5) owner.bountyHunt=restore(owner.bountyHunt);
        return owner.bountyHunt;
    }
    function recordBossSource(state, zone) {
        const bossTier=Math.max(1,Math.floor(Number(zone.tier)||1));
        if (!state.source || (state.source.zone && bossTier<state.source.zone.tier)) state.source=captureSource(zone);
    }
    function advanceAfterBossKill(zone,enemy,owner=game) {
        const state=ensureState(owner);
        if (!isUnlocked(owner) || !enemy?.isBoss || !zone || zone.loopScaleExempt
            || !BOUNTY_HUNT_CONFIG.eligibleZoneTypes.includes(zone.type)) return {offered:false,reason:'ineligible'};
        if (state.remaining===0) return {offered:false,reason:'pending'};
        recordBossSource(state,zone);
        state.remaining--;
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
    function fillTargetOffers(pending) {
        if (pending.status!=='offered') return;
        const pool=Object.values(BOUNTY_TARGET_DB).filter(target=>game.season>=(target.unlockLoop || 2)
            && !pending.offerIds.includes(target.id));
        while (pending.offerIds.length<BOUNTY_HUNT_CONFIG.offerCount && pool.length) {
            const index=Math.floor(Math.random()*pool.length);
            pending.offerIds.push(pool.splice(index,1)[0].id);
        }
    }
    function openTreasure() {
        const state=ensureState();
        if (!isUnlocked() || state.remaining>0) return null;
        if (state.pending) {
            fillTargetOffers(state.pending);
            return state.pending;
        }
        // Legacy ready saves have no source; resolve once, then persist with the opened reward.
        const zone=getZone(game.currentZoneId) || getZone(0);
        const source=state.source || {itemTier:rollRealmItemDropTier(zone,{isBoss:true}),dropRealm:zone.type,
            zone:null,materialMultiplier:1};
        const tier=source.itemTier;
        const affixTierCap=getRealmEquipmentAffixTierCap({type:source.dropRealm},tier);
        const origin={dropRealm:source.dropRealm,affixTierCap,affixTierFloor:getDroppedAffixTierRange(affixTierCap).min,
            tierWeightFalloff:DROPPED_AFFIX_TIER_WEIGHT_FALLOFF};
        const id=rollEventId(tier), def=TREASURE_EVENT_DB[id];
        let item=null;
        if (def.slot) item=generateUniqueItem(tier,def.slot,rndChoice(uniquePool(def.slot,tier)).name);
        else if (!def.key) item=createItemFromBase(chooseItemBase(rndChoice(EQUIPMENT_DROP_SLOTS),tier),'rare',tier,origin);
        state.source=source;
        state.pending={id,item:item ? normalizeItem(item) : null,targetId:null,status:'offered',offerIds:[]};
        fillTargetOffers(state.pending);
        return state.pending;
    }
    function rewardLabel(pending) {
        const def=TREASURE_EVENT_DB[pending.id];
        return def.key ? `${ORB_DB[def.key].name} ${rewardAmount(def)}개` : `${pending.item.slot} · ${pending.item.name}`;
    }
    function rewardAmount(def) {
        return def.amount*(def.common ? ensureState().source?.materialMultiplier || 1 : 1);
    }
    function targetRewardLabel(targetId) {
        const reward=BOUNTY_TARGET_DB[targetId].reward;
        const growth=reward.growthCount && contentProgression.isUnlocked('growth');
        const count=(reward.equipmentCount || 0)+(growth ? 0 : reward.fallbackEquipmentCount || 0);
        const parts=[];
        if (count) parts.push(`희귀 이상 장비 ${count}개`);
        if (growth) parts.push(`생장 아이템 ${reward.growthCount}개`);
        for (const [key,amount] of Object.entries(reward.currencies || {})) {
            if (contentProgression.canDropCurrency(key)) parts.push(`${ORB_DB[key].name} ${rewardAmount({amount,common:true})}개`);
        }
        return parts.join(' · ');
    }
    function claimTreasure() {
        const state=ensureState(), pending=state.pending;
        if (!pending || pending.status!=='reward' || !isUnlocked()) return {ok:false};
        const def=TREASURE_EVENT_DB[pending.id];
        if (!available(def)) return {ok:false};
        const label=rewardLabel(pending);
        if (def.key) awardCurrency(def.key,rewardAmount(def));
        else if (!addItemToInventory(pending.item,{guaranteedKeep:true})) return {ok:false};
        state.pending=null;state.source=null;state.remaining=BOUNTY_HUNT_CONFIG.guaranteedAt;state.completed++;
        return {ok:true,label,event:def,item:pending.item};
    }
    function canAdvanceLoop() {
        const status=ensureState().pending?.status;
        return !isUnlocked() || (status!=='queued' && status!=='reward');
    }
    /** Accepted hunt defeat: no reward; a fresh boss countdown is required before selecting another. */
    function failHunt() {
        const state=ensureState();
        if (state.pending?.status!=='queued') return false;
        state.pending=null;state.source=null;state.remaining=BOUNTY_HUNT_CONFIG.guaranteedAt;
        return true;
    }
    function startHunt(targetId) {
        const pending=ensureState().pending;
        if (!pending || pending.status!=='offered' || !isUnlocked()) return false;
        if (!pending.offerIds.includes(targetId)) return false;
        pending.targetId=targetId;
        pending.offerIds=[];
        pending.status='queued';
        // Resume hunting without discarding this loop's already-earned completion records.
        game.pendingLoopReady=false;game.pendingLoopDecision=false;
        return true;
    }
    function injectEncounterMarker(plan, zone) {
        const pending=ensureState().pending;
        if (!pending || pending.status!=='queued' || !isUnlocked() || zone.loopScaleExempt
            || !BOUNTY_HUNT_CONFIG.eligibleZoneTypes.includes(zone.type)) return false;
        if (plan.some(marker=>marker.bountyId)) return false;
        plan.push({at:55,count:1,elite:true,bountyId:pending.targetId});
        plan.sort((a,b)=>a.at-b.at);
        return true;
    }
    function applyTargetToEnemy(enemy, targetId) {
        const pending=ensureState().pending, target=BOUNTY_TARGET_DB[targetId];
        if (!target || pending?.targetId!==targetId || pending.status!=='queued') return false;
        const mod={armorMul:1,evasionMul:1,drAdd:0,resAllAdd:0,resChaosAdd:0,damageMul:1,
            attackSpeedMul:1,penetrationAdd:0,critChanceAdd:0,regenMul:1,regenRateAdd:0,firstHitGuard:0,...target.modifiers};
        enemy.maxHp=Math.max(1,Math.floor(enemy.maxHp*mod.hpMul));enemy.hp=enemy.maxHp;
        enemy.armor=Math.floor(enemy.armor*mod.armorMul);
        enemy.evasion=Math.floor(enemy.evasion*mod.evasionMul);
        enemy.dr=Math.min(90,enemy.dr+mod.drAdd);
        for (const key of ['resF','resC','resL','resChaos']) enemy[key]=Math.min(95,enemy[key]+mod.resAllAdd);
        enemy.resChaos=Math.min(95,enemy.resChaos+mod.resChaosAdd);
        enemy.damageMul*=mod.damageMul;enemy.attackSpeedVar*=mod.attackSpeedMul;
        enemy.penetration+=mod.penetrationAdd;enemy.critChance+=mod.critChanceAdd;
        enemy.regenRate=(enemy.regenRate || 0)*mod.regenMul+mod.regenRateAdd;
        enemy.firstHitGuard=Math.max(enemy.firstHitGuard || 0,mod.firstHitGuard);
        enemy.ele=mod.element || enemy.ele;enemy.name=`보물사냥 · ${target.name}`;
        enemy.isBountyTarget=true;enemy.bountyId=targetId;enemy.expMul*=2;
        return true;
    }
    function grantTargetGrowth(enemy, reward) {
        if (!reward.growthCount || !contentProgression.isUnlocked('growth')) return 0;
        const item=generateGrowthDrop(enemy,{zone:ensureState().source?.zone});
        return item && addDroppedGrowthItem(item,{guaranteedKeep:true}) ? 1 : 0;
    }
    function grantTargetLoot(enemy, reward) {
        const growthCount=grantTargetGrowth(enemy,reward);
        const count=(reward.equipmentCount || 0)+(growthCount<(reward.growthCount || 0) ? reward.fallbackEquipmentCount : 0);
        for (let i=0;i<count;i++) {
            const item=generateEquipmentDrop(enemy,{minimumRarity:reward.minimumRarity,zone:ensureState().source?.zone});
            if (item) addItemToInventory(item,{guaranteedKeep:true});
        }
        for (const [key,amount] of Object.entries(reward.currencies || {})) {
            if (contentProgression.canDropCurrency(key)) awardCurrency(key,rewardAmount({amount,common:true}));
        }
    }
    function completeTarget(enemy) {
        const pending=ensureState().pending;
        if (!pending || pending.status!=='queued' || !enemy.isBountyTarget || enemy.hp>0
            || pending.targetId!==enemy.bountyId) return false;
        grantTargetLoot(enemy,BOUNTY_TARGET_DB[pending.targetId].reward);
        pending.status='reward';
        return true;
    }
    function processKill(zone, enemy) {
        const completed=completeTarget(enemy);
        return {...advanceAfterBossKill(zone,enemy),completed};
    }
    return Object.freeze({isUnlocked,restore,ensureState,advanceAfterBossKill,openTreasure,claimTreasure,rewardLabel,canAdvanceLoop,
        startHunt,failHunt,injectEncounterMarker,applyTargetToEnemy,completeTarget,processKill,targetRewardLabel});
})();
safeExposeGlobals({bountyRuntime});
