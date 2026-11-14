import { runePresetFailure, runePresetLoadoutShapeReason } from './rune-loadout-record.mjs';
import { runePresetAttackSlotReason, runePresetMobilitySlotReason, runePresetSummonSlotReason, runePresetSupportSlotReason } from './rune-loadout-ownership.mjs';

export function runePresetLoadoutLimitInspection(env, config, state, stats) {
    const supportCount = config.equippedSupports.length, supportCap = Math.max(0, Math.floor(stats.suppCap || 0));
    const resonance = config.equippedSupports.reduce((sum, name) => sum + env.deps.getSupportResonanceCostAtTier(name, config.supportTiers[name]), 0);
    const resonanceCap = env.deps.gemDropRewards.resonanceCap(state, stats);
    const summonCount = Object.values(config.summonSkillCounts).reduce((sum, count) => sum + count, 0);
    const summonCap = stats.passiveKeystoneFlags?.soleMinion ? 1 : Math.max(1, Math.floor(stats.summonCap || 1));
    const totals = { supportCount, supportCap, resonance, resonanceCap, summonCount, summonCap };
    if (supportCount > supportCap) return { ...runePresetFailure(env.deps._t('보조룬 칸이 부족합니다. ({supportCount}/{supportCap})', { supportCount, supportCap })), ...totals };
    if (resonance > resonanceCap && !env.deps.gemDropRewards.allowsResonanceOverflow(stats)) return { ...runePresetFailure(env.deps._t('공명력이 부족합니다. ({resonance}/{resonanceCap})', { resonance, resonanceCap })), ...totals };
    if (summonCount > summonCap) return { ...runePresetFailure(env.deps._t('소환 한도를 넘었습니다. ({summonCount}/{summonCap})', { summonCount, summonCap })), ...totals };
    return { ok: true, reason: '', ...totals };
}

export function runePresetInspectRuneLoadout(env, config, state, stats) {
    if (!config) return { ok: true, reason: '' };
    const shape = config.invalidReason || runePresetLoadoutShapeReason(config);
    if (shape) return runePresetFailure(shape);
    const reason = runePresetAttackSlotReason(env, config, state) || runePresetMobilitySlotReason(env, config, state)
        || runePresetSummonSlotReason(env, config, state) || runePresetSupportSlotReason(env, config, state);
    if (reason) return runePresetFailure(reason);
    return stats ? runePresetLoadoutLimitInspection(env, config, state, stats) : { ok: true, reason: '' };
}
