/** Deterministic resale appraisal in formlessDew. Never reads the player's current build or asking price. */
const itemAppraisal = (() => {
    function lines(item) {
        return (item.stats || []).flatMap(stat => [stat, ...(stat.extraStats || [])])
            .filter(stat => stat && typeof stat.id === 'string' && Number.isFinite(stat.val) && stat.val > 0);
    }
    function quality(stat) {
        const low = Number(stat.valMin), high = Number(stat.valMax);
        if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return 0.5;
        return Math.max(0, Math.min(1, (stat.val - low) / (high - low)));
    }
    function affinity(item, customer) {
        const useful = new Set(lines(item).filter(stat => customer.stats.includes(stat.id)).map(stat => stat.id));
        return Math.min(1, useful.size / 3 + (customer.slots.includes(item.slot) ? 0.15 : 0));
    }
    function uniquePrice(unique, fair) {
        const req = unique.reqTier || 1;
        const purchaseFloor = unique.ultraRare ? Math.max(30, Math.min(150, Math.floor(req * 2))) : Math.max(1, Math.floor(req / 10));
        const estimate = Math.min(PLAYER_STALL_RULES.maxAppraisal, Math.round(12 + fair + (unique.ultraRare ? 35 : 0)));
        // A conservative resale cap below even the cheapest merchant unique's 30-dew exchange value.
        const ceiling = Math.min(Math.floor(estimate * PLAYER_STALL_RULES.pricePremium), Math.floor(purchaseFloor * 30 * 0.6));
        return { fair: Math.min(estimate, ceiling), ceiling };
    }
    function quote(item) {
        const base = BASE_ITEM_DB.find(row => row.id === item?.baseId)
            || BASE_ITEM_DB.find(row => row.slot === item?.slot && row.name === item?.baseName);
        if (!base || !['normal','magic','rare','unique'].includes(item.rarity)) return null;
        const tier = Math.max(1, Math.min(20, getItemCraftTier(item)));
        const stats = lines(item), unique = item.rarity === 'unique' && UNIQUE_DB.find(row => row.name === item.name);
        const seen = new Set();
        const strength = stats.reduce((total, stat) => {
            if (seen.has(stat.id)) return total;
            seen.add(stat.id);
            const rank = Math.max(1, Math.min(tier, Number(stat.tier) || 1));
            return total + (0.25 + rank / 20) * (0.55 + quality(stat) * 0.45);
        }, 0);
        const fit = Math.max(...PLAYER_STALL_CUSTOMERS.map(customer => affinity(item, customer)));
        const baseValue = 0.7 + Math.min(20, base.reqTier || 1) * 0.12;
        let fair = Math.max(1, Math.round(baseValue + Math.min(8, strength) * 2.2 * (1 + fit * 0.25)));
        let ceiling = Math.max(1, Math.floor(fair * PLAYER_STALL_RULES.pricePremium));
        if (unique) {
            ({ fair, ceiling } = uniquePrice(unique, fair));
        } else if (!stats.length) {
            const merchantBasePrice = Math.ceil(15 * 0.45) + 2;
            ceiling = Math.min(ceiling, Math.floor(merchantBasePrice * 0.6));
        }
        return { fair, ceiling, tier, quality: stats.length ? Math.round(stats.reduce((sum, stat) => sum + quality(stat), 0) / stats.length * 100) : 0,
            options: seen.size, fit: Math.round(fit * 100) };
    }
    return Object.freeze({ quote, affinity });
})();
safeExposeGlobals({ itemAppraisal });
