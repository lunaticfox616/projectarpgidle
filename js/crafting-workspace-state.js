// Persistent discovery and UI preferences. Craft rolls and payment remain in their domains.
const craftingWorkspaceState = (() => {
    const defaults = ['formlessDew', 'sapBud', 'goldenRule', 'blightSpore'];
    const basic = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blessing', 'blightSpore', 'pruningShears', 'fairyRing'];
    const special = ['emberBranch', 'ouroboros', 'deepWhetstone', 'rootIron', 'jewelPolish', 'abyssCatalyst', 'enchantedHoney', 'venomStinger', 'voidChisel', 'oceanRerollShard'];
    const materials = ['fossil', 'fossilPrimal', 'fossilAncientPrimal', 'sporeFire', 'sporeCold', 'sporeLight'];

    function group(key) {
        if (basic.includes(key)) return 'basic';
        if (materials.slice(3).includes(key)) return 'spore';
        if (materials.slice(0, 3).includes(key) || FOSSIL_DB.some(row => row.key === key)) return 'fossil';
        return special.includes(key) ? 'special' : '';
    }

    /** Migration boundary: only known keys and finite goal values survive; no discovery is inferred from loop. */
    function normalize(value, currencies = {}) {
        const source = value && typeof value === 'object' ? value : {};
        const seen = Array.isArray(source.discovered) ? source.discovered : [];
        const discovered = [...new Set([...seen, ...Object.keys(currencies).filter(key => currencies[key] > 0)].filter(key => group(key)))];
        const pins = Array.isArray(source.pins) ? source.pins.filter(key => group(key) && !materials.includes(key)) : defaults;
        const unique = [...new Set(pins)].slice(0, 4);
        defaults.forEach(key => { if (unique.length < 4 && !unique.includes(key)) unique.push(key); });
        const goal = source.goal && typeof source.goal === 'object' ? source.goal : {};
        return { discovered, pins: unique, goal: {
            statId: typeof goal.statId === 'string' ? goal.statId.slice(0, 80) : '',
            minTier: Number.isFinite(goal.minTier) ? Math.max(0, Math.min(20, Math.floor(goal.minTier))) : 0
        } };
    }

    function capture(state) {
        if (!state.craftingWorkspace) state.craftingWorkspace = normalize(null, state.currencies);
        const seen = state.craftingWorkspace.discovered;
        Object.keys(state.currencies).forEach(key => {
            if (state.currencies[key] > 0 && group(key) && !seen.includes(key)) seen.push(key);
        });
        return state.craftingWorkspace;
    }

    /** Saved panel migration and preferences are restored together without opening any UI. */
    function restore(state) {
        const tab=state.itemSubtab==='item-tab-fossil'?'item-tab-craft':state.itemSubtab;
        const allowed=['item-tab-equip','item-tab-craft','item-tab-market','item-tab-hall','item-tab-infuser'];
        return {craftingWorkspace:normalize(state.craftingWorkspace,state.currencies),itemSubtab:allowed.includes(tab)?tab:'item-tab-equip'};
    }

    return Object.freeze({ normalize, capture, group, materials, restore });
})();
safeExposeGlobals({ craftingWorkspaceState });
