

/** Read explicit origin or known legacy flags; never infer origin from an affix value/tier. */
export function craftGetSource(env, stat) {
    if (!stat) return undefined;
    // A rift harvest (균열 수확) adds a fossil effect, so it shares the fossil allowance.
    if (stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore) return 'fossil';
    if (['fossilRiftBlank', 'fossilRiftAmp'].includes(stat.id)) return 'fossil';
    return Object.hasOwn(env.labels, stat.craftSource) ? stat.craftSource : undefined;
}

export function craftGetLabel(env, stat) {
    return env.labels[craftGetSource(env, stat)] || '';
}

/** Filter an already eligible pool without rolling or changing weights. */
export function craftFilterSporeMods(env, pool, mode) {
    const ids = env.sporeStatIds[mode] || new Set();
    return pool.filter(mod => ids.has(mod.statId || mod.id));
}

/** Resolve displayed currency names once for both admission UI and the actual craft. */
export function craftResolveAction(key, rarity) {
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
export function craftGetBlockReason(env, item, source, reroll = false, retainedMarker = '') {
    if (item.corrupted) return '타락한 아이템은 제작할 수 없습니다.';
    const existing = (item.stats || []).filter(stat => craftGetSource(env, stat) === source);
    if (!existing.length) return '';
    if (!reroll || source === 'transplant') return env.deps._t('이미 {labels} 옵션이 있어 추가할 수 없습니다.', { labels: env.labels[source] });
    const locked = existing.some(stat => stat.id !== retainedMarker && craftKeptOnReroll(item, stat));
    return locked ? env.deps._t('잠긴 {labels} 옵션이 있어 재련할 수 없습니다.', { labels: env.labels[source] }) : '';
}

/** action is the resolved orb action, and mode is 'none' for non-equipment crafting. */
export function craftGetSporeBlockReason(env, item, action, mode) {
    if (mode === 'none' || !env.sporeActions.has(action)) return '';
    const reroll = env.sporeRerolls.has(action);
    const reason = craftGetBlockReason(env, item, 'spore', reroll);
    if (reason || !reroll) return reason;
    return craftGetRerollSpaceReason(item, 1, ['transmute', 'alteration'].includes(action) ? craftMagicLineCap(env) : env.deps.EXPLICIT_AFFIX_LINE_CAP);
}

export function craftKeepsKind(item) { return item.rarity === 'unique' || !!item.fusedRelic || !!item.hallReplica; }

export function craftGetFossilBlockReason(env, item, fossilKey) {
    // A fossil rerolls the item as a rare one (js/skills.js applyFossilChaosCraft): a unique lost its line and effect (2026-10-20).
    if (craftKeepsKind(item)) return env.KEEPS_KIND;
    // The blank + amplifier are one fossil effect with a two-affix cost, not two fossil crafts.
    const marker = fossilKey === 'fossilRift' ? 'fossilRiftBlank' : '';
    return craftGetBlockReason(env, item, 'fossil', true, marker) || craftGetRerollSpaceReason(item, marker ? 2 : 1, env.deps.EXPLICIT_AFFIX_LINE_CAP, marker);
}

/** 균열 수확(js/item-rolls.js applyRiftSporeToSelectedItem): adds one fossil line, so the fossil rules hold, and the line needs a free
 * place among the six (the chaos infusion counts). */
export function craftGetRiftHarvestBlockReason(env, item) {
    if (craftKeepsKind(item)) return env.KEEPS_KIND;
    const reason = craftGetBlockReason(env, item, 'fossil');
    return reason || (env.deps.getItemExplicitOptionCount(item) >= env.deps.EXPLICIT_AFFIX_LINE_CAP ? '옵션이 가득 차 있습니다.' : '');
}

export function craftGetFossilUseReason(env, item, fossil, season, currencies) {
    if ((season || 1) < 3) return '미궁 제작은 루프3부터 사용할 수 있습니다.';
    if (!fossil) return '존재하지 않는 화석입니다.';
    if ((currencies[fossil.key] || 0) <= 0) return env.deps._t('{name}이 부족합니다.', { name: fossil.name });
    if (!item) return '먼저 아이템을 선택하세요.';
    return craftGetFossilBlockReason(env, item, fossil.key);
}

export function craftGetRerollSpaceReason(item, required, cap, retainedMarker = '') {
    const locked = (item.stats || []).filter(stat => stat && stat.id !== retainedMarker && craftKeptOnReroll(item, stat));
    const occupied = locked.length + (item.chaosInfusion ? 1 : 0);
    return occupied + required > cap ? '잠금/주입 옵션 때문에 보장 옵션을 넣을 자리가 없습니다.' : '';
}

/** MOD_DB 줄의 종류: 'prefix' | 'suffix'. 그 밖의 줄('special')은 종류 한도를 세지 않는다. */
export function craftAffixKind(mod) {
    return mod && (mod.type === 'prefix' || mod.type === 'suffix') ? mod.type : 'special';
}

/** 저장된 추가 옵션 한 줄의 종류. 화석 전용 줄, 균열 표식, 심해 고정 옵션은 'special'. */
export function craftStoredAffixKind(env, item, stat) {
    if (stat && stat.isEchoMod && ['prefix', 'suffix', 'special'].includes(stat.echoKind)) return stat.echoKind;
    if (!stat || stat.fossilExclusive || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore || stat.oceanBenchOptionId) return 'special';
    return craftAffixKind(env.deps.findStoredEquipmentAffix(item, stat));
}

/** A line a full reroll keeps: honey and rift locks. */
export function craftKeptOnReroll(item, stat) {
    return !!(stat && (stat.lockedByHoney || stat.lockedByRift));
}

/** 종류별 줄 수(혼돈 주입 포함). skip은 바꿀 줄처럼 셈에서 뺄 한 줄. */
export function craftAffixCounts(env, item, skip = null) {
    const counts = { prefix: 0, suffix: 0, special: 0 };
    const lines = (item.stats || []).concat(item.chaosInfusion ? [item.chaosInfusion] : []);
    for (const stat of lines) if (stat && stat !== skip) counts[craftStoredAffixKind(env, item, stat)]++;
    return counts;
}

/**
 * 종류별 남은 자리(data/items.js EXPLICIT_AFFIX_RULES). 한도가 없는 희귀도(일반, 고유)는 null.
 * 예전 규칙으로 한도를 넘은 장비도 줄을 지우지 않는다: 그 종류는 0 자리일 뿐이다.
 */
export function craftAffixRoom(env, item, rarity = item.rarity, skip = null) {
    const rule = env.deps.EXPLICIT_AFFIX_RULES[rarity];
    if (!rule) return null;
    const used = craftAffixCounts(env, item, skip);
    return { prefix: Math.max(0, rule.prefix - used.prefix), suffix: Math.max(0, rule.suffix - used.suffix) };
}

/** room이 null이면 제한 없음. */
export function craftFitsRoom(room, mod) {
    const kind = craftAffixKind(mod);
    return !room || kind === 'special' || room[kind] > 0;
}

export function craftMagicLineCap(env) {
    return env.deps.EXPLICIT_AFFIX_RULES.magic.prefix + env.deps.EXPLICIT_AFFIX_RULES.magic.suffix;
}

/**
 * 한 줄을 바꾸는 제작(바다의 선물 확정 부여와 변환, 심해의 파편, 봉인 재단): 새 줄은 바뀔 줄을 뺀 자리가 남는 종류에서만 고른다.
 * indexes는 바뀔 수 있는 줄(봉인 안 된 줄)의 번호. pick(mods)가 새 줄을 고르고, 바뀔 줄은 같은 종류를 먼저, choose가
 * 'lowest'면 가장 낮은 단계(같으면 뒤 줄), 'random'이면 무작위. 'all'은 난수 없이 가능한 모든
 * {mod,index}를 반환한다. 고를 수 없으면 null('all'은 빈 배열).
 */
export function craftPickReplacement(env, item, pool, indexes, ...selection) {
    const [pick, choose = 'random'] = selection;
    const room = craftAffixRoom(env, item), kindOf = index => craftStoredAffixKind(env, item, item.stats[index]);
    const freed = new Set(indexes.map(kindOf));
    const candidatesFor = mod => {
        const kind = craftAffixKind(mod);
        if (!craftFitsRoom(room, mod) && !freed.has(kind)) return [];
        const same = indexes.filter(index => kindOf(index) === kind);
        return same.length || !craftFitsRoom(room, mod) ? same : indexes;
    };
    if (choose === 'all') return pool.flatMap(mod => candidatesFor(mod).map(index => ({ mod, index })));
    const mod = pick(pool.filter(row => candidatesFor(row).length));
    if (!mod) return null;
    const candidates = candidatesFor(mod);
    if (choose !== 'lowest') return { mod, index: candidates[Math.floor(Math.random() * candidates.length)] };
    const tier = index => Number(item.stats[index].tier) || 0;
    return { mod, index: candidates.reduce((best, index) => (tier(index) <= tier(best) ? index : best)) };
}

/**
 * 추가 옵션 머리말(게임 툴팁과 공개 프로필): "추가 옵션 5/6 (접두 2/3, 접미 3/3)". used가 없거나(예전 프로필) 한도가 없는
 * 희귀도(일반, 고유)면 "추가 옵션 (5/6)". over는 예전 규칙으로 한도를 넘은 장비.
 */
export function craftAffixHeader(env, rarity, count, used) {
    const rule = env.deps.EXPLICIT_AFFIX_RULES[rarity];
    if (!rule || !used) return { text: env.deps._t('추가 옵션 ({count}/{cap})', { count, cap: env.deps.EXPLICIT_AFFIX_LINE_CAP }), over: false };
    const cap = rarity === 'magic' ? craftMagicLineCap(env) : env.deps.EXPLICIT_AFFIX_LINE_CAP;
    return { text: env.deps._t('추가 옵션 {count}/{cap} (접두 {prefix}/{prefixCap}, 접미 {suffix}/{suffixCap})', { count, cap, prefix: used.prefix, prefixCap: rule.prefix, suffix: used.suffix, suffixCap: rule.suffix }),
        over: used.prefix > rule.prefix || used.suffix > rule.suffix };
}

export function craftBasicRule(env, action) { return env.basicRules[action]; }

export function craftBasicFits(env, item, action) {
    const rule=craftBasicRule(env, action);
    return !!rule && item.rarity===rule.source && (rule.kind!=='add'||env.deps.getItemExplicitOptionCount(item)<env.deps.EXPLICIT_AFFIX_LINE_CAP);
}

/** Why the build may not change now, or '': the woodsman fight puts gear and bag back to its snapshot every tick (not the wallet),
 * so a craft paid then would be lost. */
export function craftBuildLockReason(state) {
    return state && state.woodsmanBuildLock ? '☠️ 나무꾼 전투 중에는 장비 옵션을 변경할 수 없습니다.' : '';
}
