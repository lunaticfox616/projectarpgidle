import { bloomPreciseGetPreciseTalentLevel } from './talent-precise-levels.mjs';

export function bloomPreciseIsTalentMonsterAlwaysHit(env, owner) {
    return !!bloomPreciseGetPreciseTalentLevel(env, owner, 'hero3__gladiator');
}

export function bloomPreciseIsTalentPlayerAttackDisabled(env, owner) {
    return !!bloomPreciseGetPreciseTalentLevel(env, owner, 'hero3__soulbinder');
}

export function bloomPreciseEnforceTalentCombatState(env, owner, pStats) {
    if (!pStats || !bloomPreciseGetPreciseTalentLevel(env, owner, 'hero9__crusader')) return;
    owner.playerHp = Math.min(1, Math.max(0, Number(owner.playerHp) || 0));
}
