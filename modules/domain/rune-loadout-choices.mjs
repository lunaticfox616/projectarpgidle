import { runePresetLoadoutShapeReason } from './rune-loadout-record.mjs';

export function runePresetSavedSupportTier(env, name, state) {
    const gem = env.deps.normalizeGemRecord(state.supportGemData?.[name]);
    return Math.min(env.deps.getSupportTierCap(name), gem.activeTier);
}

export function runePresetCaptureRuneLoadout(env, state) {
    const summons = (state.equippedSummonSkills || []).slice(), supports = (state.equippedSupports || []).slice();
    return { version: 1, activeSkill: state.activeSkill, mobilitySkill: state.mobilitySkill || '',
        equippedSummonSkills: summons,
        summonSkillCounts: Object.fromEntries(summons.map(name => [name, state.summonSkillCounts?.[name] ?? 1])),
        equippedSupports: supports, supportTiers: Object.fromEntries(supports.map(name => [name, runePresetSavedSupportTier(env, name, state)])) };
}

export function runePresetApplyRuneLoadout(config, state) {
    if (!config) return;
    state.activeSkill = config.activeSkill;
    state.weaponBlockedSkill = '';
    state.mobilitySkill = config.mobilitySkill;
    state.equippedSummonSkills = config.equippedSummonSkills.slice();
    state.summonSkillCounts = { ...config.summonSkillCounts };
    state.equippedSupports = config.equippedSupports.slice();
    state.supportGemData = { ...state.supportGemData };
    for (const name of config.equippedSupports) {
        state.supportGemData[name] = { ...state.supportGemData[name], activeTier: config.supportTiers[name] };
    }
    state.summonLoadoutInitialized = true;
}

export function runePresetSameRuneLoadout(env, config, state) {
    if (!config) return true;
    if (config.invalidReason || runePresetLoadoutShapeReason(config)) return false;
    const current = runePresetCaptureRuneLoadout(env, state);
    return config.activeSkill === current.activeSkill && config.mobilitySkill === current.mobilitySkill
        && runePresetSameRuneRows(config.equippedSummonSkills, current.equippedSummonSkills, config.summonSkillCounts, current.summonSkillCounts)
        && runePresetSameRuneRows(config.equippedSupports, current.equippedSupports, config.supportTiers, current.supportTiers);
}

export function runePresetSameRuneRows(wanted, current, values, currentValues) {
    return wanted.length === current.length && wanted.every((name, index) => name === current[index] && values[name] === currentValues[name]);
}
