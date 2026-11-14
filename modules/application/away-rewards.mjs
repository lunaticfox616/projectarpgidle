function rarityCounts(list) {
    const counts={};
    for (const item of Array.isArray(list) ? list : []) {
        if (item && item.rarity) counts[item.rarity]=(counts[item.rarity] || 0)+1;
    }
    return counts;
}

function uniqueNames(list) { return (Array.isArray(list) ? list : []).filter(item=>item && item.rarity==='unique').map(item=>item.name); }

function inventoryGains(before, after) {
    const first=rarityCounts(before.inventory), last=rarityCounts(after.inventory), rarityGains={};
    for (const rarity of Object.keys(last)) {
        const gain=last[rarity]-(first[rarity] || 0);
        if (gain>0) rarityGains[rarity]=gain;
    }
    const previous=uniqueNames(before.inventory);
    const names=uniqueNames(after.inventory).filter(name=>{
        const index=previous.indexOf(name);
        if (index<0) return true;
        previous.splice(index,1); return false;
    });
    return {rarityGains,uniqueNames:names,
        items:Math.max(0,(Array.isArray(after.inventory) ? after.inventory.length : 0)-(Array.isArray(before.inventory) ? before.inventory.length : 0))};
}

export function backgroundAtlasGains(memoryLeaves, beforeState, afterState) {
    const before=beforeState && beforeState.atlas, after=afterState && afterState.atlas;
    if (!before || !after || !after.tally || typeof memoryLeaves!=='object') return null;
    const tally=key=>Math.max(0,(Number(after.tally[key]) || 0)-(Number((before.tally || {})[key]) || 0));
    const leaves=memoryLeaves.gainedBetween(before.leaves,after.leaves);
    const gains={maps:tally('maps'),treasure:tally('treasure'),golden:tally('golden'),leaves:leaves.total,newLeaves:leaves.fresh};
    return gains.maps || gains.treasure || gains.leaves ? gains : null;
}

function currencyGains(deps, before, after) {
    const first=before.currencies || {}, last=after.currencies || {}, currencies=[];
    for (const key of Object.keys(last)) {
        const gain=Math.floor((last[key] || 0)-(first[key] || 0));
        if (gain>0) currencies.push({key,name:deps.getCurrencyInfo(key).name,gain});
    }
    return currencies;
}

function combatGains(deps, before, after, metrics) {
    return {
        kills:metrics ? metrics.kills : Math.max(0,Math.floor((after.loopKills || 0)-(before.loopKills || 0))),
        exp:metrics ? metrics.exp : Math.max(0,deps.getBackgroundTotalExperience(after)-deps.getBackgroundTotalExperience(before)),
        expLost:metrics ? metrics.expLost : 0,
        deaths:metrics ? metrics.deaths : Math.max(0,Math.floor((after.loopDeaths || 0)-(before.loopDeaths || 0)))
    };
}

/** Build the result card's accounting from the same snapshots used by the replay; never apply rewards here. */
export function backgroundRewardSummary(deps, before, after, metrics, overflowSalvaged) {
    return {...combatGains(deps,before,after,metrics),...inventoryGains(before,after),
        currencies:currencyGains(deps,before,after),highlights:deps.equipmentLootPolicy.collectHighlights(before,after),
        overflowSalvaged:Math.max(0,Math.floor(Number(overflowSalvaged) || 0)),
        masteryGains:typeof deps.weaponMastery==='object' && before && after ? deps.weaponMastery.gains(before,after) : [],
        knitting:deps.knitting.gainedBetween(before.knitting,after.knitting),atlas:backgroundAtlasGains(deps.memoryLeaves,before,after)};
}
