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
        return getRerollSpaceReason(item, 1, ['transmute', 'alteration'].includes(action) ? magicLineCap() : EXPLICIT_AFFIX_LINE_CAP);
    }

    function getFossilBlockReason(item, fossilKey) {
        // The blank + amplifier are one fossil effect with a two-affix cost, not two fossil crafts.
        const marker = fossilKey === 'fossilRift' ? 'fossilRiftBlank' : '';
        return getBlockReason(item, 'fossil', true, marker) || getRerollSpaceReason(item, marker ? 2 : 1, EXPLICIT_AFFIX_LINE_CAP, marker);
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

    /** MOD_DB 줄의 종류: 'prefix' | 'suffix'. 그 밖의 줄('special')은 종류 한도를 세지 않는다. */
    function affixKind(mod) {
        return mod && (mod.type === 'prefix' || mod.type === 'suffix') ? mod.type : 'special';
    }

    /** 저장된 추가 옵션 한 줄의 종류. 화석 전용 줄, 균열 표식, 심해 고정 옵션은 'special'. */
    function storedAffixKind(item, stat) {
        if (!stat || stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore || stat.oceanBenchOptionId) return 'special';
        return affixKind(findStoredEquipmentAffix(item, stat));
    }

    /** 종류별 줄 수(혼돈 주입 포함). skip은 바꿀 줄처럼 셈에서 뺄 한 줄. */
    function affixCounts(item, skip = null) {
        const counts = { prefix: 0, suffix: 0, special: 0 };
        const lines = (item.stats || []).concat(item.chaosInfusion ? [item.chaosInfusion] : []);
        for (const stat of lines) if (stat && stat !== skip) counts[storedAffixKind(item, stat)]++;
        return counts;
    }

    /**
     * 종류별 남은 자리(data/items.js EXPLICIT_AFFIX_RULES). 한도가 없는 희귀도(일반, 고유)는 null.
     * 예전 규칙으로 한도를 넘은 장비도 줄을 지우지 않는다: 그 종류는 0 자리일 뿐이다.
     */
    function affixRoom(item, rarity = item.rarity, skip = null) {
        const rule = EXPLICIT_AFFIX_RULES[rarity];
        if (!rule) return null;
        const used = affixCounts(item, skip);
        return { prefix: Math.max(0, rule.prefix - used.prefix), suffix: Math.max(0, rule.suffix - used.suffix) };
    }

    /** room이 null이면 제한 없음. */
    function fitsRoom(room, mod) {
        const kind = affixKind(mod);
        return !room || kind === 'special' || room[kind] > 0;
    }

    function magicLineCap() {
        return EXPLICIT_AFFIX_RULES.magic.prefix + EXPLICIT_AFFIX_RULES.magic.suffix;
    }

    /**
     * 한 줄을 바꾸는 제작(바다의 선물 확정 부여와 변환, 심해의 파편, 봉인 재단): 새 줄은 바뀔 줄을 뺀 자리가 남는 종류에서만 고른다.
     * indexes는 바뀔 수 있는 줄(봉인 안 된 줄)의 번호. pick(mods)가 새 줄을 고르고, 바뀔 줄은 같은 종류를 먼저, choose가
     * 'lowest'면 가장 낮은 단계(같으면 뒤 줄), 'random'이면 무작위. 고를 수 없으면 null.
     */
    function pickReplacement(item, pool, indexes, pick, choose = 'random') {
        const room = affixRoom(item), kindOf = index => storedAffixKind(item, item.stats[index]);
        const freed = new Set(indexes.map(kindOf));
        const mod = pick(pool.filter(row => fitsRoom(room, row) || freed.has(affixKind(row))));
        if (!mod) return null;
        const kind = affixKind(mod), same = indexes.filter(index => kindOf(index) === kind);
        const candidates = same.length || !fitsRoom(room, mod) ? same : indexes;
        if (!candidates.length) return null;
        if (choose !== 'lowest') return { mod, index: candidates[Math.floor(Math.random() * candidates.length)] };
        const tier = index => Number(item.stats[index].tier) || 0;
        return { mod, index: candidates.reduce((best, index) => (tier(index) <= tier(best) ? index : best)) };
    }

    /**
     * 추가 옵션 머리말(게임 툴팁과 공개 프로필): "추가 옵션 5/6 (접두 2/3, 접미 3/3)". used가 없거나(예전 프로필) 한도가 없는
     * 희귀도(일반, 고유)면 "추가 옵션 (5/6)". over는 예전 규칙으로 한도를 넘은 장비.
     */
    function affixHeader(rarity, count, used) {
        const rule = EXPLICIT_AFFIX_RULES[rarity];
        if (!rule || !used) return { text: `추가 옵션 (${count}/${EXPLICIT_AFFIX_LINE_CAP})`, over: false };
        const cap = rarity === 'magic' ? magicLineCap() : EXPLICIT_AFFIX_LINE_CAP;
        return { text: `추가 옵션 ${count}/${cap} (접두 ${used.prefix}/${rule.prefix}, 접미 ${used.suffix}/${rule.suffix})`,
            over: used.prefix > rule.prefix || used.suffix > rule.suffix };
    }

    return Object.freeze({ getSource, getLabel, filterSporeMods, resolveAction, getBlockReason, getSporeBlockReason, getFossilBlockReason, getFossilUseReason,
        affixKind, storedAffixKind, affixCounts, affixRoom, fitsRoom, pickReplacement, affixHeader });
})();
safeExposeGlobals({ equipmentCrafting });
