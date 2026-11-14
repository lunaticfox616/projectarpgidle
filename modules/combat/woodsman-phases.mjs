import { clampNumber } from '../common/numbers.mjs';

export function effectGetWoodsmanPhaseProgress(env, enemy) {
    if (!enemy || !(enemy.maxHp > 0)) return 0;
    let rawProgress = clampNumber(1 - ((enemy.hp || 0) / enemy.maxHp), 0, 1);
    if (rawProgress <= env.deps.WOODSMAN_PHASE_NEW_FINAL_PROGRESS) {
        return rawProgress * (env.deps.WOODSMAN_PHASE_OLD_FINAL_PROGRESS / env.deps.WOODSMAN_PHASE_NEW_FINAL_PROGRESS);
    }
    let finalWindow = 1 - env.deps.WOODSMAN_PHASE_NEW_FINAL_PROGRESS;
    let finalProgress = (rawProgress - env.deps.WOODSMAN_PHASE_NEW_FINAL_PROGRESS) / finalWindow;
    return clampNumber(env.deps.WOODSMAN_PHASE_OLD_FINAL_PROGRESS + finalProgress * (1 - env.deps.WOODSMAN_PHASE_OLD_FINAL_PROGRESS), 0, 1);
}

export function effectWoodsmanElementAt(env, progress) {
    return env.deps.WOODSMAN_ELEMENTS[Math.max(0, Math.floor(progress / 0.05)) % env.deps.WOODSMAN_ELEMENTS.length];
}

export function effectWoodsmanAttackFxElement(env, enemy) {
    return enemy.isWoodsman && env.owner.currentZoneId === env.deps.OUTSIDE_CHAOS_ZONE_ID
        ? effectWoodsmanElementAt(env, effectGetWoodsmanPhaseProgress(env, enemy)) : null;
}
