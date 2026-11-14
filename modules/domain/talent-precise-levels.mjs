import { TALENT_CARD_MAX_LEVEL } from '../data/talent-card-levels.mjs';


export function bloomPreciseGetPreciseTalentLevel(env, owner, cardId) {
    return typeof env.deps.isTalentCardActive === 'function' ? Math.max(0, Number(env.deps.isTalentCardActive(cardId, owner)) || 0) : 0;
}

export function bloomPreciseGetPreciseTalentRatio(env, owner, cardId) {
    return Math.min(1, bloomPreciseGetPreciseTalentLevel(env, owner, cardId) / TALENT_CARD_MAX_LEVEL);
}

export function bloomPreciseIsTalentElementalSkill(skill) {
    if (!skill) return false;
    return ['fire', 'cold', 'light'].includes(skill.ele)
        || (Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0);
}
