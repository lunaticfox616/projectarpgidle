import { runePresetLoadoutShapeReason } from './rune-loadout-record.mjs';
import { keepSupportSlotAssignments } from '../common/support-gems.mjs';

export function runePresetSavedSupportTier(env, name, state) {
    const gem = env.deps.normalizeGemRecord(state.supportGemData?.[name]);
    return Math.min(env.deps.getSupportTierCap(name), gem.activeTier);
}

export function runePresetCaptureRuneLoadout(env, state) {
    const summons = (state.equippedSummonSkills || []).slice(), supports = (state.equippedSupports || []).slice();
    return { version: 1, activeSkill: state.activeSkill, mobilitySkill: state.mobilitySkill || '',
        equippedSummonSkills: summons,
        summonSkillCounts: Object.fromEntries(summons.map(name => [name, state.summonSkillCounts?.[name] ?? 1])),
        equippedSupports: supports, supportSlotByName: keepSupportSlotAssignments(state),
        supportTiers: Object.fromEntries(supports.map(name => [name, runePresetSavedSupportTier(env, name, state)])) };
}

export function runePresetApplyRuneLoadout(config, state) {
    if (!config) return;
    state.activeSkill = config.activeSkill;
    state.weaponBlockedSkill = '';
    state.mobilitySkill = config.mobilitySkill;
    state.equippedSummonSkills = config.equippedSummonSkills.slice();
    state.summonSkillCounts = { ...config.summonSkillCounts };
    state.equippedSupports = config.equippedSupports.slice();
    state.supportSlotByName = runePresetSlotPlaces(config, state);
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
        && runePresetSameRuneRows(config.equippedSupports, current.equippedSupports, config.supportTiers, current.supportTiers)
        && config.equippedSupports.every(name => !Object.hasOwn(config.supportSlotByName || {}, name) || config.supportSlotByName[name] === current.supportSlotByName[name]);
}

/** The set's saved places first; a rune the set saved no place for keeps the place it holds now when that place is free. */
const runePresetSlotPlaces = (config, state) => {
    const saved = keepSupportSlotAssignments(config), taken = new Set(Object.values(saved)), now = keepSupportSlotAssignments(state);
    const kept = config.equippedSupports.flatMap(name => {
        if (Object.hasOwn(saved, name) || !Object.hasOwn(now, name) || taken.has(now[name])) return [];
        taken.add(now[name]);
        return [[name, now[name]]];
    });
    return { ...saved, ...Object.fromEntries(kept) };
};

export function runePresetSameRuneRows(wanted, current, values, currentValues) {
    return wanted.length === current.length && wanted.every((name, index) => name === current[index] && values[name] === currentValues[name]);
}
