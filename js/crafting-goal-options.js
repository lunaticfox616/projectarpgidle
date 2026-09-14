// Read-only candidates from the same pools used by currency/fossil crafting. No RNG or payment.
const craftingGoalOptions = (() => {
    function keptStats(item, recipe) {
        if (recipe.kind === 'add') return item.stats || [];
        return (item.stats || []).filter(stat => stat.lockedByHoney || stat.lockedByRift || stat.unremovable || stat.encroachedFinal);
    }

    function rollPool(item, recipe, mode) {
        const kept = keptStats(item, recipe);
        const occupied = kept.length + (item.chaosInfusion ? 1 : 0);
        const cap = recipe.key === 'magicBud' ? 2 : 6;
        if (occupied >= cap) return [];
        let pool = getAvailableMods({ ...item, stats: kept });
        // Rerolls fill at most 2 (magic) / 5 (rare) lines. A guaranteed line can replace the last random one.
        const maxRolled = Math.max(kept.length, cap === 2 ? 2 : 5) - occupied;
        if (recipe.kind === 'reroll' && maxRolled <= 0 && mode === 'none') return [];
        pool = filterSpore(pool,item,recipe,mode,maxRolled);
        if (recipe.kind === 'fossil') {
            pool = fossilPool(item,recipe,pool,maxRolled);
        }
        return pool;
    }

    function filterSpore(pool,item,recipe,mode,maxRolled) {
        if (!isSporeCraftEquipment(item) || mode === 'none') return pool;
        if (recipe.kind === 'add' || (recipe.kind === 'reroll' && maxRolled <= 1)) return equipmentCrafting.filterSporeMods(pool,mode);
        return pool;
    }

    function fossilPool(item,recipe,pool,maxRolled) {
        if(equipmentCrafting.getFossilBlockReason(item,recipe.key))return [];
        if(recipe.key==='fossilRift')return 6-keptStats(item,recipe).filter(stat=>stat.id!=='fossilRiftBlank').length-(item.chaosInfusion?1:0)>2?pool:[];
        const candidate={...item,stats:keptStats(item,recipe),chaosInfusion:null};
        const guaranteed=recipe.key==='fossilOld'
            ? getFossilExclusivePool(candidate).map(mod=>({...mod,fixedValue:true}))
            : getFossilGuaranteedPool(item,FOSSIL_DB.find(row=>row.key===recipe.key));
        if(!guaranteed.length)return [];
        return maxRolled<=1?guaranteed:[...pool,...guaranteed];
    }

    function eligible(item,recipe) {
        if(!item||!['add','reroll','fossil','value'].includes(recipe.kind))return false;
        if(isGrowthItem(item)||item.rarity==='unique'||item.corrupted||item.fusedRelic)return false;
        const rarities={magicBud:['normal','magic'],sapBud:['magic','rare'],formlessDew:['normal','rare']};
        return !rarities[recipe.key]||rarities[recipe.key].includes(item.rarity);
    }

    function get(item, recipe, mode) {
        if(!eligible(item,recipe))return [];
        if (recipe.kind === 'value') return [];
        const pool = rollPool(item, recipe, mode), cap = getItemCraftTier(item);
        const rows = pool.flatMap(mod => [mod,...(mod.compound || [])].map(stat => ({
            id: stat.statId || stat.id, name: getStatName(stat.statId || stat.id),
            maxTier: stat.fixedValue ? 0 : Math.min(cap, stat.tierValues?.length || 20)
        })));
        const unique=new Map();
        rows.forEach(row=>{if(!unique.has(row.id)||unique.get(row.id).maxTier<row.maxTier)unique.set(row.id,row);});
        return [...unique.values()].sort((a,b) => a.name.localeCompare(b.name,'ko'));
    }
    return Object.freeze({ get });
})();
safeExposeGlobals({ craftingGoalOptions });
