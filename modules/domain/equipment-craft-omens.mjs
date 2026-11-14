import { craftBasicRule, craftFilterSporeMods, craftKeptOnReroll, craftStoredAffixKind, craftAffixKind, craftGetSource } from './equipment-craft-rules.mjs';

/** The affix a spore mode guarantees for action on item, or null (spore mode off, or nothing of its family is open): picked by
 * weight among the open affixes in the spore's family, counted against the result's rarity (새싹 transmute and alteration: magic,
 * one and one; the rest: rare, three and three). A reroll counts only the lines it keeps (keptOnReroll, as rerollExplicitMods).
 * The live craft (js/item-rolls.js useCurrency) and the bench's rehearsal (js/crafting-goal-options.js rehearse) both pick here. */
export function craftSporePool(env, item, action, mode, omen = null) {
    if (mode === 'none' || !craftBasicRule(env, action)) return [];
    const base = env.rerollActions.includes(action) ? { ...item, stats: (item.stats || []).filter(stat => craftKeptOnReroll(item, stat) || !craftOnOmenSide(env, item, stat, omen)) } : item;
    return craftFilterOmenMods(craftFilterSporeMods(env, env.deps.getOpenAffixMods(base, craftBasicRule(env, action).rarity), mode), omen);
}

export function craftPickSporeMod(env, item, action, mode, omen = null) {
    const pool = craftSporePool(env, item, action, mode, omen);
    return pool.length ? env.deps.pickWeightedMod(pool) : null;
}

/** mod's guaranteed line, rolled over the whole spore tier range of item (the family is promised, the top two tiers are not). With
 * 거름의 뿌리 (omen effect 'floor') it rolls above the floor too, as every new line does (2026-10-20 hunt: only this line ignored it). */
export function craftRollSporeLine(env, item, mod, omen = null) {
    if (!mod) return null;
    const range = env.deps.getCraftTierRangeForItem(item, 'spore');
    const min = omen && omen.effect === 'floor' ? Math.min(range.max, Math.max(range.min, craftFloorTier(env, range.max))) : range.min;
    return { ...env.deps.rollAffixValueInTierRange(mod, min, range.max), craftSource: 'spore' };
}

// ---------------------------------------------------------------- 제작 뿌리 (data/items.js CRAFT_OMENS)
// 2026-10-18 사용자: "craft of exile 사이트를 참고해서 ... 가중치 메커니즘, 크래프팅 방법 및 컨텐츠와 연계성". 걸어 둔 뿌리 하나가 자기가
// 바꾸는 다음 제작 한 번에 쓰이고 하나 줄어든다. 실제 제작(js/item-rolls.js useCurrency)과 제작 연구의 연습(rehearse)이 같은 규칙을 쓴다.
/** omen key with side as the rolls read it: { key, side, effect } (practice uses it without owning one), or null. */
export function craftOmenSpec(env, key, side) {
    const armed = env.deps.normalizeCraftOmen({ key, side });
    return armed && { ...armed, effect: env.deps.CRAFT_OMENS.effects[armed.key].effect };
}

/** Arms omen key (side for 허기) for the next craft it fits; an empty key disarms. { ok, reason }. */
export function craftArmOmen(env, state, key, side) {
    if (!key) { state.craftOmen = null; return { ok: true }; }
    if (!env.deps.CRAFT_OMENS.keys.includes(key)) return { ok: false, reason: env.deps._t('알 수 없는 뿌리입니다.') };
    if ((state.currencies[key] || 0) < 1) return { ok: false, reason: env.deps._t('{name}가 없습니다.', { name: env.deps._t(env.deps.ORB_DB[key].name) }) };
    state.craftOmen = env.deps.normalizeCraftOmen({ key, side });
    return { ok: true };
}

/** Side membership is shared by rolling, value changes, removal and pre-payment admission. Special lines stay untouched. */
export function craftOnOmenSide(env, item, stat, omen) { return !omen || omen.effect !== 'side' || craftStoredAffixKind(env, item, stat) === omen.side; }

/** Candidate restrictions shared by actual rolls, guaranteed spores and every research view. */
export function craftFilterOmenMods(pool, omen) { return !omen || omen.effect !== 'side' ? pool : pool.filter(mod => craftAffixKind(mod) === omen.side); }

export function craftSideReason(env, item, action, omen, sporeMode) {
    const label = omen.side === 'prefix' ? '접두어' : '접미어';
    if (env.basicActions.includes(action)) return craftSideRollReason(env, item, action, omen, sporeMode);
    const lines = action === 'annulment' ? env.deps.getAnnulmentRemovableStats(item).map(row => row.stat)
        : [...item.stats, ...(item.chaosInfusion ? [item.chaosInfusion] : [])].filter(stat => !stat.lockedByHoney && !stat.lockedByRift);
    return lines.some(stat => craftOnOmenSide(env, item, stat, omen)) ? '' : env.deps._t('변경 가능한 {label} 옵션이 없습니다.', { label });
}

export function craftSideRollReason(env, item, action, omen, sporeMode) {
    const label = omen.side === 'prefix' ? '접두어' : '접미어';
    const kept = env.rerollActions.includes(action) ? item.stats.filter(stat => craftKeptOnReroll(item, stat) || !craftOnOmenSide(env, item, stat, omen)) : item.stats;
    if (sporeMode !== 'none' && kept.some(stat => craftGetSource(env, stat) === 'spore')) return '보존되는 수확 옵션이 있어 수확 제작을 함께 쓸 수 없습니다.';
    const pool = craftFilterOmenMods(env.deps.getOpenAffixMods({ ...item, stats: kept }, 'rare'), omen);
    if (!pool.length) return env.deps._t('{label}에 새로 부여할 수 있는 옵션이나 빈자리가 없습니다.', { label });
    return sporeMode !== 'none' && !craftFilterSporeMods(env, pool, sporeMode).length ? env.deps._t('{label}에 선택한 수확 계열 옵션을 부여할 수 없습니다.', { label }) : '';
}

/** A short reason for an unavailable combination; this is also used before paying, never silently falling back to both sides. */
export function craftOmenReason(env, item, action, omen, sporeMode = 'none') {
    if (!omen || !env.deps.CRAFT_OMENS.effects[omen.key].actions.includes(action)) return '이 재화에는 적용되지 않습니다.';
    if (!item) return '장비를 선택하세요.';
    if (omen.effect === 'side') return craftSideReason(env, item, action, omen, sporeMode);
    if (['regal', 'exalted'].includes(action) && sporeMode !== 'none') return '옵션 추가 시 수확 제작과 함께 쓸 수 없습니다.';
    return '';
}

export function craftOmenFits(env, item, action, omen, sporeMode = 'none') {
    return !craftOmenReason(env, item, action, omen, sporeMode);
}

export function craftArmedSideReason(env, state, item, action, sporeMode = 'none') {
    const armed = env.deps.normalizeCraftOmen(state.craftOmen), omen = armed && craftOmenSpec(env, armed.key, armed.side);
    if (!omen || omen.effect !== 'side' || !env.deps.CRAFT_OMENS.effects[omen.key].actions.includes(action) || !(state.currencies[omen.key] > 0)) return '';
    return craftOmenReason(env, item, action, omen, sporeMode);
}

/** The armed omen that changes this craft ({ key, side, effect }), or null: none armed, none left, or it does not fit. */
export function craftOmenFor(env, state, action, item, sporeMode = 'none') {
    const armed = env.deps.normalizeCraftOmen(state.craftOmen), omen = armed && (state.currencies[armed.key] || 0) > 0 ? craftOmenSpec(env, armed.key, armed.side) : null;
    return craftOmenFits(env, item, action, omen, sporeMode) ? omen : null;
}

/** After the craft omen changed: one fewer, disarmed. The log's words for it ('' without one). */
export function craftSpendOmen(env, state, omen) {
    if (!omen) return '';
    state.currencies[omen.key] = Math.max(0, (state.currencies[omen.key] || 0) - 1);
    state.craftOmen = null;
    return `, ${env.deps._t(env.deps.ORB_DB[omen.key].name)}`;
}

export function craftFloorTier(env, tier) { return Math.max(1, Math.ceil(tier * env.deps.CRAFT_OMENS.floorShare)); }

/** One new line of mod at item tier: 거름 rolls above a tier floor. */
export function craftRollOmenLine(env, mod, tier, omen) {
    return omen && omen.effect === 'floor' ? env.deps.rollAffixValueInTierRange(mod, craftFloorTier(env, tier), tier) : env.deps.rollAffixValue(mod, tier);
}

/** 엮음: (pool, picked) → pool where a mod sharing a tag with a line on item (or a mod picked before it this craft) weighs
 * weaveMul times more, as fossils weigh their tags (js/skills.js). */
export function craftWeighOmenPool(env, item, pool, omen, picked = []) {
    const candidates = craftFilterOmenMods(pool, omen);
    if (!omen || omen.effect !== 'weave') return candidates;
    const held = new Set([...(item.stats || []), ...picked].flatMap(env.deps.getAffixTags));
    return candidates.map(mod => env.deps.getAffixTags(mod).some(tag => held.has(tag)) ? { ...mod, weight: (Number(mod.weight) || 1) * env.deps.CRAFT_OMENS.weaveMul } : mod);
}

/** The line an added craft (regal, exalted) picks: an open mod of item, on 허기's side, weighed by 엮음. */
export function craftPickAddMod(env, item, omen) {
    return env.deps.pickWeightedMod(craftWeighOmenPool(env, item, env.deps.getOpenAffixMods(item, 'rare'), omen));
}

/** The row 전정 가위 cuts among removable rows ({ index, stat }): with 가지치기 the lowest tier among tiered lines (a fixed line,
 * shown as T0 whatever tier it stores, is not low: it has no better roll), else any. */
export function craftPickPruneLine(env, removable, omen) {
    const tiered = removable.filter(row => !env.deps.isFixedEquipmentAffix(row.stat) && Number(row.stat.tier) > 0);
    if (!omen || omen.effect !== 'prune' || !tiered.length) return env.deps.rndChoice(removable);
    const low = Math.min(...tiered.map(row => Number(row.stat.tier)));
    return env.deps.rndChoice(tiered.filter(row => Number(row.stat.tier) === low));
}

/** What an omen changes in a reroll (js/item-rolls.js rerollExplicitMods): each new line's roll, and 엮음's weights. */
export function craftOmenRerollOptions(env, item, tier, omen) {
    if (!omen) return {};
    const before = { ...item, stats: item.stats.slice() };
    return { side: omen.effect === 'side' ? omen.side : '', rollLine: mod => craftRollOmenLine(env, mod, tier, omen),
        weigh: (pool, picked) => craftWeighOmenPool(env, before, pool, omen, picked) };
}
