import { runeFlowGetEquippedWeaponStance, runeFlowIsSkillRuneUsableWithStance } from './rune-weapon-rules.mjs';

export function runeFlowPickSkillRuneReward(env, owner, names, random = env.deps.runeRandom) {
    if (!names.length) return null;
    const stance = runeFlowGetEquippedWeaponStance(env, owner), weights = names.map(name => runeFlowGetSkillRuneRewardWeight(env, name, stance));
    let roll = random() * weights.reduce((sum, weight) => sum + weight, 0);
    for (let i = 0; i < names.length; i++) {
        roll -= weights[i];
        if (roll < 0) return names[i];
    }
    return names[names.length - 1];
}

export function runeFlowGetSkillRuneRewardWeights(env, owner, names) {
    const stance = runeFlowGetEquippedWeaponStance(env, owner);
    return new Map(names.map(name => [name, runeFlowGetSkillRuneRewardWeight(env, name, stance)]));
}

export function runeFlowGetSkillRuneRewardWeight(env, name, stance) { return (runeFlowIsSkillRuneUsableWithStance(env, name, stance) ? env.SKILL_RUNE_FIT_WEIGHT : 1) * (env.deps.SKILL_RUNE_DROP_WEIGHTS[name] ?? 1); }
