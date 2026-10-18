// Read-only candidates from the same pools used by currency/fossil crafting. No RNG or payment.
const craftingGoalOptions = (() => {
    function keptStats(item, recipe) {
        if (recipe.kind === 'add') return item.stats || [];
        return (item.stats || []).filter(stat => equipmentCrafting.keptOnReroll(item, stat) || stat.unremovable || stat.encroachedFinal);
    }

    function rollPool(item, recipe, mode) {
        const kept = keptStats(item, recipe);
        const occupied = kept.length + (item.chaosInfusion ? 1 : 0);
        const magic = recipe.key === 'magicBud', cap = magic ? EXPLICIT_AFFIX_RULES.magic.prefix + EXPLICIT_AFFIX_RULES.magic.suffix : EXPLICIT_AFFIX_LINE_CAP;
        if (occupied >= cap) return [];
        // Prefix 3 and suffix 3 (magic 1 and 1): only kinds with room after the kept lines can appear.
        let pool = getOpenAffixMods({ ...item, stats: kept }, magic ? 'magic' : 'rare');
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
        if(recipe.key==='fossilRift')return EXPLICIT_AFFIX_LINE_CAP-keptStats(item,recipe).filter(stat=>stat.id!=='fossilRiftBlank').length-(item.chaosInfusion?1:0)>2?pool:[];
        const candidate={...item,stats:keptStats(item,recipe),chaosInfusion:null};
        const guaranteed=recipe.key==='fossilOld'
            ? getFossilExclusivePool(candidate).map(mod=>({...mod,fixedValue:true}))
            : getFossilGuaranteedPool(item,FOSSIL_DB.find(row=>row.key===recipe.key));
        if(!guaranteed.length)return [];
        return maxRolled<=1?guaranteed:[...pool,...guaranteed];
    }

    function eligible(item,recipe) {
        if(!item||!['add','reroll','fossil','value'].includes(recipe.kind))return false;
        if(item.rarity==='unique'||item.corrupted||item.fusedRelic)return false;
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
    /** Tags this craft can still roll, with how many lines can carry one (kept lines plus distinct rollable stats) and the best tier. */
    function tags(item, recipe, mode) {
        if (!eligible(item, recipe) || recipe.kind === 'value') return [];
        const pool = rollPool(item, recipe, mode), kept = keptStats(item, recipe), cap = getItemCraftTier(item);
        return Object.keys(AFFIX_TAG_LABELS).map(tag => {
            const rows = pool.filter(mod => getAffixTags(mod).includes(tag)), held = kept.filter(stat => getAffixTags(stat).includes(tag));
            const tiers = [...rows.map(mod => mod.fixedValue ? 0 : Math.min(cap, mod.tierValues?.length || 20)), ...held.map(stat => Number(stat.tier) || 0)];
            const rollable = new Set(rows.map(mod => mod.statId || mod.id)).size;
            return { id: tag, name: AFFIX_TAG_LABELS[tag], rollable, maxTier: Math.max(0, ...tiers), maxCount: Math.min(EXPLICIT_AFFIX_LINE_CAP, held.length + rollable) };
        }).filter(row => row.rollable > 0);
    }
    /** The live pool, including blocked groups, using the same base, influence and prefix/suffix admission as actual rolls. */
    const maxTierFor = (item, mod) => mod.fixedValue ? 0 : Math.min(getItemCraftTier(item), mod.tierValues?.length || 20);
    function catalogue(item, recipe, mode) {
        if (!eligible(item, recipe) || recipe.kind === 'value') return [];
        const pool = rollPool(item, recipe, mode), ids = new Set(pool.map(mod => mod.id));
        const candidates = buildAvailableModPool(item).map(row => row.mod);
        const all = [...new Map([...candidates, ...pool].map(mod => [mod.id, mod])).values()];
        const kept = keptStats(item, recipe), occupied = new Set(kept.flatMap(getExplicitModStatIds));
        const room = equipmentCrafting.affixRoom({ ...item, stats: kept }, recipe.key === 'magicBud' ? 'magic' : 'rare');
        const weights = recipe.kind === 'fossil' ? weighFossilTagMods(pool, recipe.key) : pool;
        const weightOf = mod => Math.max(0.01, Number(mod.weight) || 1), total = weights.reduce((sum, mod) => sum + weightOf(mod), 0);
        return all.map(mod => {
            const allowed = ids.has(mod.id), maxTier = maxTierFor(item, mod);
            const reason = getExplicitModStatIds(mod).some(id => occupied.has(id)) ? '보존 옵션과 중복'
                : !equipmentCrafting.fitsRoom(room, mod) ? '접두나 접미 자리 부족' : '선택한 제작의 후보 아님';
            const weighted = weights.find(row => row.id === mod.id), weight = weighted ? weightOf(weighted) : 0;
            return { id: mod.id, name: mod.statName || getStatName(mod.statId || mod.id), kind: equipmentCrafting.affixKind(mod),
                tags: getAffixTags(mod), maxTier, weight, share: total ? weight / total : 0, allowed, reason: allowed ? '' : reason };
        }).sort((a, b) => Number(b.allowed) - Number(a.allowed) || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name, 'ko'));
    }

    function rehearsalReason(item, recipe, mode = 'none') {
        if (!eligible(item, recipe) || !equipmentCrafting.basicActions.includes(equipmentCrafting.resolveAction(recipe.key, item.rarity))) return '모의 제작은 마법의 새싹, 수액 봉오리, 형체 없는 이슬만 됩니다.';
        const action = equipmentCrafting.resolveAction(recipe.key, item.rarity);
        return equipmentCrafting.getSporeBlockReason(item, action, mode) || (!rollPool(item, recipe, mode).length ? '부여 가능한 옵션이 없습니다.' : '')
            || sporeGapReason(item, action, mode);
    }
    /** The live craft refuses a spore mode with nothing of its family left to give (js/passives.js useCurrency): so does practice. */
    function sporeGapReason(item, action, mode) {
        const spore = mode !== 'none' && isSporeCraftEquipment(item);
        return spore && !equipmentCrafting.sporePool(item, action, mode).length ? '선택한 홀씨 계열에서 새로 붙을 수 있는 옵션이 없습니다.' : '';
    }

    /** Roll on an isolated item only. Never swaps game, spends currency, allocates inventory ids, logs or saves. The result keeps the
     * item's id: it is shown, never put in the bag (a second item with that id would be a duplicate). omen: a 제작 징조 to practise
     * with ({ key, side, effect }, equipmentCrafting.omenSpec, owned or not): it changes the roll only where the live craft would use it. */
    function rehearse(item, recipe, mode = 'none', omen = null) {
        const reason = rehearsalReason(item, recipe, mode);
        if (reason) throw Error(reason);
        const result = JSON.parse(JSON.stringify(item)), action = equipmentCrafting.resolveAction(recipe.key, item.rarity);
        // 홀씨 보장은 실제 제작과 같은 함수로 고르고 굴린다(js/passives.js useCurrency와 같은 규칙).
        let guaranteedStat = null;
        if (mode !== 'none' && isSporeCraftEquipment(item)) {
            const mod = equipmentCrafting.pickSporeMod(item, action, mode);
            if (!mod) throw Error('보장할 홀씨 옵션이 없습니다.');
            guaranteedStat = equipmentCrafting.rollSporeLine(item, mod);
        }
        equipmentCrafting.applyBasic(result, action, { guaranteedStat, omen: equipmentCrafting.omenFits(item, action, omen, mode) ? omen : null });
        return result;
    }
    return Object.freeze({ get, tags, catalogue, rehearsalReason, rehearse });
})();
safeExposeGlobals({ craftingGoalOptions });
