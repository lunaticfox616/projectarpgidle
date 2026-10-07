// Persistent discovery and UI preferences. Craft rolls and payment remain in their domains.
const craftingWorkspaceState = (() => {
    const defaults = ['formlessDew', 'sapBud', 'goldenRule', 'blightSpore'];
    const basic = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blessing', 'blightSpore', 'pruningShears', 'fairyRing'];
    const special = ['emberBranch', 'burningEmberBranch', 'ouroboros', 'deepWhetstone', 'rootIron', 'jewelPolish', 'abyssCatalyst', 'catalystFire', 'catalystCold', 'catalystLight', 'catalystChaos', 'catalystCrit', 'catalystSummon', 'enchantedHoney', 'venomStinger', 'voidChisel', 'oceanRerollShard'];
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
        return { discovered, pins: unique, goal: normalizeGoal(source.goal) };
    }

    /** One option ({statId}) or a tag count ({tag, minCount}, data/affix-tags.js), with a minimum tier. */
    function normalizeGoal(value) {
        const goal = value && typeof value === 'object' ? value : {};
        const tag = typeof goal.tag === 'string' && AFFIX_TAG_LABELS[goal.tag] ? goal.tag : '';
        return {
            statId: !tag && typeof goal.statId === 'string' ? goal.statId.slice(0, 80) : '', tag,
            minCount: Number.isFinite(goal.minCount) ? Math.max(1, Math.min(6, Math.floor(goal.minCount))) : 1,
            minTier: Number.isFinite(goal.minTier) ? Math.max(0, Math.min(20, Math.floor(goal.minTier))) : 0
        };
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
        const allowed=['item-tab-equip','item-tab-craft','item-tab-market','item-tab-hall'];
        return {craftingWorkspace:normalize(state.craftingWorkspace,state.currencies),itemSubtab:allowed.includes(tab)?tab:'item-tab-equip'};
    }

    return Object.freeze({ normalize, normalizeGoal, capture, group, materials, restore });
})();
safeExposeGlobals({ craftingWorkspaceState });
