import { craftPickAddMod, craftRollOmenLine, craftOmenRerollOptions } from './equipment-craft-omens.mjs';
import { craftBasicRule, craftBuildLockReason, craftGetFossilUseReason, craftKeepsKind } from './equipment-craft-rules.mjs';

export function craftAddedLine(env, item, options) {
    if (options.guaranteedStat) return options.guaranteedStat;
    const mod = options.addedMod || craftPickAddMod(env, item, options.omen);
    return mod ? craftRollOmenLine(env, mod, env.deps.getItemCraftTier(item), options.omen) : null;
}

/** Shared item-only roll for live currency use and the crafting bench's rehearsal. Payment and saves stay with the caller.
 * options.omen: the 제작 뿌리 that changes this craft ({ key, side, effect }, omenFor or omenSpec). */
export function craftApplyBasic(env, item, action, options = {}) {
    if (!env.basicActions.includes(action)) throw Error('지원하지 않는 기본 제작');
    const tier = env.deps.getItemCraftTier(item), guaranteed = options.guaranteedStat || null;
    if (craftBasicRule(env, action).kind === 'add') {
        const line = craftAddedLine(env, item, options);
        if (line) item.stats.push(line);
        item.rarity = craftBasicRule(env, action).rarity;
        env.deps.updateItemName(item);
        return;
    }
    item.rarity = craftBasicRule(env, action).rarity;
    env.deps.rerollExplicitMods(item, item.rarity, tier, { guaranteedStat: guaranteed, rerollChaosInfusion: item.rarity === 'rare', ...craftOmenRerollOptions(env, item, tier, options.omen) });
}

/** A deep copy of item's craft fields (a missing one as null). */
export function craftCraftFields(env, item) {
    return JSON.parse(JSON.stringify(Object.fromEntries(env.CRAFT_FIELDS.map(key => [key, item[key] === undefined ? null : item[key]]))));
}

/** Puts saved craft fields back on item, as a copy. */
export function craftPutCraftFields(item, fields) {
    Object.assign(item, JSON.parse(JSON.stringify(fields)));
}

/** What tells whether an item still holds a craft result: rarity, name, the chaos infusion's line and each line's id,
 * value and tier. A load (js/item-rolls.js normalizeItem) fills other line fields (originalVal, valMin, statName, craftSource), so the
 * whole-field JSON of a loaded item never matched the saved pick, and a reload dropped a waiting 성화 pick (2026-10-20). */
export function craftLineMark(stat) { return stat ? [stat.id, Number(stat.val), Math.floor(Number(stat.tier) || 0)] : null; }

export function craftCraftMark(fields) { return JSON.stringify([fields.rarity || null, fields.name || null, craftLineMark(fields.chaosInfusion),
    (fields.stats || []).map(craftLineMark)]); }

export function craftSameCraftFields(env, item, fields) { return craftCraftMark(craftCraftFields(env, item)) === craftCraftMark(fields); }

/** The bag or worn item with id, or null. */
export function craftFindCraftItem(state, id) {
    return (state.inventory || []).find(row => row && row.id === id) || Object.values(state.equipment || {}).find(row => row && row.id === id) || null;
}

/** A live basic craft (js/item-rolls.js useCurrency): applyBasic, and with 성화의 뿌리 more rolls on copies of the item as it was. The
 * item keeps the first result; all of them wait in state.craftChoice for the player's pick (pickChoice). options.guaranteedFor(copy)
 * gives each other result its own spore line (as the research simulator rolls them), else they share options.guaranteedStat. */
export function craftCraftBasic(env, state, item, action, options) {
    const before = options.omen && options.omen.effect === 'choice' ? JSON.parse(JSON.stringify(item)) : null;
    craftApplyBasic(env, item, action, options);
    if (!before) return;
    const others = Array.from({ length: env.deps.CRAFT_OMENS.choices - 1 }, () => {
        const copy = JSON.parse(JSON.stringify(before));
        const guaranteedStat = options.guaranteedFor ? options.guaranteedFor(copy) : options.guaranteedStat;
        craftApplyBasic(env, copy, action, { ...options, addedMod: null, guaranteedStat });
        return craftCraftFields(env, copy);
    });
    state.craftChoice = { itemId: item.id, options: [craftCraftFields(env, item), ...others] };
}

/** The 성화의 뿌리 pick waiting ({ item, options }), or null. One whose item is gone or changed since (sold, crafted another way)
 * is dropped here. */
export function craftPendingChoice(env, state) {
    const choice = state.craftChoice;
    if (!choice) return null;
    const item = craftFindCraftItem(state, choice.itemId);
    if (item && craftSameCraftFields(env, item, choice.options[0])) return { item, options: choice.options };
    state.craftChoice = null;
    return null;
}

/** Why another craft must wait now, or '': a 성화의 뿌리 pick is waiting. */
export function craftChoiceWaitReason(env, state) { return craftPendingChoice(env, state) ? '성화의 뿌리로 굴린 결과 가운데 하나를 먼저 고르세요.' : ''; }

/** Why the fossil craft (js/skills.js applyFossilChaosCraft) cannot run now, or '': the build lock, a waiting pick, then the fossil's
 * own rules (the crafting room checked the first two for it before). */
export function craftFossilCraftReason(env, state, item, fossil) { return craftBuildLockReason(state) || craftChoiceWaitReason(env, state)
    || craftGetFossilUseReason(env, item, fossil, state.season, state.currencies); }

/** Puts result index of the waiting pick on its item and ends the pick. Returns the item, or null when nothing waits. */
export function craftPickChoice(env, state, index) {
    const pending = craftPendingChoice(env, state);
    if (!pending || !pending.options[index]) return null;
    craftPutCraftFields(pending.item, pending.options[index]);
    state.craftChoice = null;
    return pending.item;
}

/** A saved imprint (craft fields of a magic or rare item), or null: the load boundary (js/item-rolls.js normalizeItem). */
export function craftNormalizeImprint(value) {
    return value && typeof value === 'object' && ['magic', 'rare'].includes(value.rarity) && Array.isArray(value.stats) ? value : null;
}

export function craftImprintBlock(env, item) {
    if (!item) return '아이템을 선택하세요.';
    if (item.corrupted) return '타락한 장비는 새기거나 되돌릴 수 없습니다.';
    return craftKeepsKind(item) ? env.KEEPS_KIND : '';
}

/** Why item cannot be engraved now, or '': the build lock, a magic or rare piece, and a 기억 조각칼 in the wallet. */
export function craftEngraveReason(env, state, item) {
    const reason = craftBuildLockReason(state) || craftImprintBlock(env, item);
    if (reason) return reason;
    if (!['magic', 'rare'].includes(item.rarity)) return '마법이나 희귀 장비에 새깁니다.';
    return (state.currencies[env.IMPRINT_KEY] || 0) > 0 ? '' : env.deps._t('{name}이 없습니다.', { name: env.deps._t(env.deps.ORB_DB[env.IMPRINT_KEY].name) });
}

/** Engraves item's craft fields for one 기억 조각칼 (an older imprint is replaced). { ok, reason }. */
export function craftEngrave(env, state, item) {
    const reason = craftEngraveReason(env, state, item);
    if (reason) return { ok: false, reason };
    state.currencies[env.IMPRINT_KEY] -= 1;
    item.imprint = craftCraftFields(env, item);
    return { ok: true };
}

/** Why item cannot go back to its imprint now, or ''. Its rarity may have changed since (a scour makes it normal). */
export function craftRestoreReason(env, item) {
    return craftImprintBlock(env, item) || (craftNormalizeImprint(item.imprint) ? '' : '새긴 기억이 없습니다.');
}

/** Puts item back to its imprint; the imprint is used up. { ok, reason }. */
export function craftRestoreImprint(env, item) {
    const reason = craftRestoreReason(env, item);
    if (reason) return { ok: false, reason };
    craftPutCraftFields(item, item.imprint);
    delete item.imprint;
    return { ok: true };
}
