import { bloomPreciseGetPreciseTalentLevel, bloomPreciseGetPreciseTalentRatio } from './talent-precise-levels.mjs';

export function bloomPreciseRollTalentPlayerCrit(env, owner, chancePct) {
    let chance = Math.max(0, Number(chancePct) || 0) / 100;
    let lucky = bloomPreciseGetPreciseTalentLevel(env, owner, 'hero4__assassin') || bloomPreciseGetPreciseTalentLevel(env, owner, 'hero6__ranger');
    if (!lucky) return env.deps.talentRandom() < chance;
    return env.deps.talentRandom() < chance || env.deps.talentRandom() < chance;
}

export function bloomPreciseGetTalentCritDamageMultiplier(env, owner, isCrit) {
    if (!isCrit) return 1;
    let alive = (owner.enemies || []).filter(row => row && row.hp > 0).length;
    return alive === 1 ? 1 + 0.12 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero1__hunter') : 1;
}

export function bloomPreciseGetTalentPrecisePlayerHitMultiplier(env, owner, ele) {
    return ele === 'chaos' ? 1 + 0.10 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero9__warlock') : 1;
}

export function bloomPreciseGetTalentDotDamageMultiplier(env, owner) {
    return 1 + 0.10 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero9__warlock');
}

export function bloomPreciseGetTalentButcherBossMultiplier(env, owner, enemy) {
    if (!enemy || !enemy.isBoss || !bloomPreciseGetPreciseTalentLevel(env, owner, 'hero2__assassin')) return 1;
    let row = owner.talentButcherMarks && owner.talentButcherMarks[enemy.id];
    let lifeRatio = Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1);
    if (!row || row.hits < 4 || lifeRatio > 0.30) return 1;
    let missing = Math.min(0.50, Math.max(0, 1 - lifeRatio));
    return 1 + 0.12 * (missing / 0.50) * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero2__assassin');
}

export function bloomPreciseGetTalentDamageConversion(env, owner, hitElement) {
    let result = { element: hitElement, mainPct: 1, added: {} };
    if (hitElement === 'light' && bloomPreciseGetPreciseTalentLevel(env, owner, 'hero5__assassin')) result.element = 'chaos';
    if (hitElement === 'phys' && bloomPreciseGetPreciseTalentLevel(env, owner, 'hero5__ranger')) {
        result.mainPct = 0.5;
        result.added.light = 50 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero5__ranger');
    }
    return result;
}
