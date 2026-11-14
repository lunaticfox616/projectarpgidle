import { gearGetChaosInfuserOptionsForItem, gearRollChaosInfusionOption } from './equipment-generation-infusion.mjs';
import { gearPickRandomMods } from './equipment-mod-selection.mjs';

export function gearRerollChaosInfusionForItem(env, item, previousInfusion, side = '') {
    if (!item || !previousInfusion) return null;
    let pool = gearGetChaosInfuserOptionsForItem(env, item).filter(option => !side || env.deps.equipmentCrafting.storedAffixKind(item, option) === side);
    if (pool.length === 0) {
        item.chaosInfusion = null;
        return null;
    }
    let option = env.deps.rndChoice(pool);
    item.chaosInfusion = gearRollChaosInfusionOption(env, option);
    return item.chaosInfusion;
}

/** How rerollExplicitMods rolls each new line: options.rollLine (제작 뿌리), else between options.minTier and maxTier with
 * options.tierWeightFalloff, else up to maxTier. */
export function gearRerollLineRoll(env, options, maxTier) {
    if (options.rollLine) return options.rollLine;
    let minTier = env.deps.clampNumber(Math.floor(Number(options.minTier) || 1), 1, maxTier);
    let falloff = Number(options.tierWeightFalloff);
    return minTier > 1 || Number.isFinite(falloff)
        ? mod => env.deps.rollAffixValueInTierRange(mod, minTier, maxTier, falloff)
        : mod => env.deps.rollAffixValue(mod, maxTier);
}

/** Prepare retained rows and infusion before rolling; a side-only craft preserves every other kind. */
export function gearPrepareExplicitReroll(env, item, options) {
    const side = options.side || '', onSide = stat => !side || env.deps.equipmentCrafting.storedAffixKind(item, stat) === side;
    let rerollChaosInfusion = !!options.rerollChaosInfusion && (!item.chaosInfusion || onSide(item.chaosInfusion));
    const previousInfusion = item.chaosInfusion;
    if (rerollChaosInfusion) item.chaosInfusion = null;
    let locked = (item.stats || []).filter(stat => env.deps.equipmentCrafting.keptOnReroll(item, stat) || !onSide(stat));
    item.stats = locked.concat(options.guaranteedStat ? [options.guaranteedStat] : []);
    // 주입을 먼저 다시 굴려 그 종류 자리를 차지하게 한다(접두 3, 접미 3).
    if (rerollChaosInfusion) gearRerollChaosInfusionForItem(env, item, previousInfusion, side);
    return side;
}

/** options.weigh(pool, picked) → pool reweighs the mods each pick (제작 뿌리 엮음). */
export function gearRerollExplicitMods(env, item, rarity, zoneTier, options = {}) {
    const maxTier = Math.max(1, zoneTier), rollLine = gearRerollLineRoll(env, options, maxTier);
    const side = gearPrepareExplicitReroll(env, item, options);
    let count = 0;
    if (rarity === 'magic') count = Math.random() < 0.5 ? 1 : 2;
    if (rarity === 'rare') count = 4 + Math.floor(Math.random() * 2);
    count = Math.max(0, count - env.deps.getItemExplicitOptionCount(item));
    let mods = gearPickRandomMods(env, env.deps.getAvailableMods(item).filter(mod => !side || env.deps.equipmentCrafting.affixKind(mod) === side), count, env.deps.equipmentCrafting.affixRoom(item, rarity), options.weigh);
    mods.forEach(mod => item.stats.push(rollLine(mod)));
    env.deps.updateItemName(item);
}
