// Explicit affix provenance and admission rules. No payment, rolling, DOM or state mutation.
const equipmentCrafting = (() => {
    const labels = Object.freeze({ spore: '홀씨', fossil: '화석', transplant: '이식' });
    const sporeActions = new Set(['transmute', 'augment', 'alteration', 'alchemy', 'exalted', 'regal', 'chaos']);
    const sporeRerolls = new Set(['transmute', 'alteration', 'alchemy', 'chaos']);

    /** Read explicit origin or known legacy flags; never infer origin from an affix value/tier. */
    function getSource(stat) {
        if (!stat) return undefined;
        // Rift spores consume spores but add a fossil effect, so share the fossil allowance.
        if (stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore) return 'fossil';
        if (['fossilRiftBlank', 'fossilRiftAmp'].includes(stat.id)) return 'fossil';
        return Object.hasOwn(labels, stat.craftSource) ? stat.craftSource : undefined;
    }

    function getLabel(stat) {
        return labels[getSource(stat)] || '';
    }

    /** Filter an already eligible pool without rolling or changing weights. */
    function filterSporeMods(pool, mode) {
        const ids = new Set(SPORE_CRAFT_MOD_IDS[mode] || []);
        return pool.filter(mod => ids.has(mod.statId || mod.id));
    }

    /** Resolve displayed currency names once for both admission UI and the actual craft. */
    function resolveAction(key, rarity) {
        if (key === 'magicBud') return rarity === 'normal' ? 'transmute' : 'alteration';
        if (key === 'sapBud') return rarity === 'magic' ? 'regal' : 'exalted';
        if (key === 'formlessDew') return rarity === 'normal' ? 'alchemy' : 'chaos';
        return { goldenRule: 'divine', fairyRing: 'chance', pruningShears: 'annulment', blightSpore: 'scour', emberBranch: 'tainted' }[key] || key;
    }

    /**
     * @param {{stats?: Array<{id: string, craftSource?: string, lockedByHoney?: boolean, lockedByRift?: boolean}>}} item
     * @param {EquipmentCraftSource} source One explicit effect from each source may coexist.
     * @param {boolean} reroll False for additive crafting; transplant never replaces an existing transplant.
     * @param {string} retainedMarker Existing immutable cost marker recreated by the SAME rift-fossil recipe.
     * @returns {string} Empty if allowed. Call before rolling, payment or mutation.
     */
    function getBlockReason(item, source, reroll = false, retainedMarker = '') {
        if (item.corrupted) return '타락한 아이템은 제작할 수 없습니다.';
        const existing = (item.stats || []).filter(stat => getSource(stat) === source);
        if (!existing.length) return '';
        if (!reroll || source === 'transplant') return `이미 ${labels[source]} 옵션이 있어 추가할 수 없습니다.`;
        const locked = existing.some(stat => stat.id !== retainedMarker && (stat.lockedByHoney || stat.lockedByRift));
        return locked ? `잠긴 ${labels[source]} 옵션이 있어 재련할 수 없습니다.` : '';
    }

    /** action is the resolved orb action, and mode is 'none' for non-equipment crafting. */
    function getSporeBlockReason(item, action, mode) {
        if (mode === 'none' || !sporeActions.has(action)) return '';
        const reroll = sporeRerolls.has(action);
        const reason = getBlockReason(item, 'spore', reroll);
        if (reason || !reroll) return reason;
        return getRerollSpaceReason(item, 1, ['transmute', 'alteration'].includes(action) ? 2 : 6);
    }

    function getFossilBlockReason(item, fossilKey) {
        // The blank + amplifier are one fossil effect with a two-affix cost, not two fossil crafts.
        const marker = fossilKey === 'fossilRift' ? 'fossilRiftBlank' : '';
        return getBlockReason(item, 'fossil', true, marker) || getRerollSpaceReason(item, marker ? 2 : 1, 6, marker);
    }

    function getFossilUseReason(item, fossil, season, currencies) {
        if ((season || 1) < 3) return '미궁 제작은 루프3부터 사용할 수 있습니다.';
        if (!fossil) return '존재하지 않는 화석입니다.';
        if ((currencies[fossil.key] || 0) <= 0) return `${fossil.name}이 부족합니다.`;
        if (!item) return '먼저 아이템을 선택하세요.';
        return getFossilBlockReason(item, fossil.key);
    }

    function getRerollSpaceReason(item, required, cap, retainedMarker = '') {
        const locked = (item.stats || []).filter(stat => stat && stat.id !== retainedMarker && (stat.lockedByHoney || stat.lockedByRift));
        const occupied = locked.length + (item.chaosInfusion ? 1 : 0);
        return occupied + required > cap ? '잠금·주입 옵션 때문에 보장 옵션을 넣을 자리가 없습니다.' : '';
    }

    return Object.freeze({ getSource, getLabel, filterSporeMods, resolveAction, getBlockReason, getSporeBlockReason, getFossilBlockReason, getFossilUseReason });
})();
safeExposeGlobals({ equipmentCrafting });
