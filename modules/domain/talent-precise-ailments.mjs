import { bloomPreciseGetPreciseTalentLevel, bloomPreciseGetPreciseTalentRatio } from './talent-precise-levels.mjs';

export function bloomPreciseGetTalentAilmentReplacement(env, owner, type) {
    if (bloomPreciseGetPreciseTalentLevel(env, owner, 'hero9__warlock') && ['ignite', 'chill', 'freeze', 'shock'].includes(type)) return 'poison';
    return type;
}

export function bloomPreciseShouldTalentSkipColdFreeze(env, owner) {
    return !!bloomPreciseGetPreciseTalentLevel(env, owner, 'hero9__warlock');
}

export function bloomPreciseEnhanceTalentAilmentReapplication(env, owner, enemy, row, ...selection) {
    const [type, pStats] = selection;
    if (!row || type !== 'ignite' || !row.talentNitroAmplified || !bloomPreciseGetPreciseTalentLevel(env, owner, 'hero6__catalyst')) return;
    let remaining = env.deps.getEnemyDamageAilmentDps(row, pStats) * Math.max(0, row.time || 0) * 0.15;
    if (remaining > 0) env.deps.applyDamageToEnemyResource(enemy, Math.floor(remaining));
}

export function bloomPreciseDecorateTalentAilmentPayload(env, owner, type, payload, pStats) {
    if (type !== 'ignite' || !bloomPreciseGetPreciseTalentLevel(env, owner, 'hero6__catalyst')) return payload;
    let chance = env.deps.getPlayerAilmentChance(pStats, 'ignite') * 0.40 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero6__catalyst');
    if (env.deps.talentRandom() >= chance) return payload;
    payload.talentNitroAmplified = true;
    payload.talentDamageMorePct = (payload.talentDamageMorePct || 0) + 30 * bloomPreciseGetPreciseTalentRatio(env, owner, 'hero6__catalyst');
    return payload;
}

export function bloomPreciseAfterTalentAilmentApplied(env, owner, enemy, type) {
    let stored = enemy && enemy.talentAilmentSeed;
    if (stored && stored.type !== type && bloomPreciseGetPreciseTalentLevel(env, owner, 'hero3__catalyst')) {
        env.deps.applyDamageToEnemyResource(enemy, Math.max(0, Math.floor(stored.damage || 0)));
        delete enemy.talentAilmentSeed;
    }
}

export function bloomPreciseStoreExpiredTalentAilmentSeed(env, owner, enemy, ailment, remainingDamage) {
    if (!bloomPreciseGetPreciseTalentLevel(env, owner, 'hero3__catalyst') || !env.deps.isDamageAilmentType(ailment && ailment.type)) return;
    enemy.talentAilmentSeed = { type: ailment.type, damage: Math.max(0, Number(remainingDamage) || 0) };
}

export function bloomPreciseGetTalentDotOccupancyDamage(env, owner, enemy, pStats) {
    if (!enemy || !bloomPreciseGetPreciseTalentLevel(env, owner, 'hero1__catalyst')) return 0;
    return (enemy.ailments || []).reduce((sum, row) => {
        if (!row || !env.deps.isDamageAilmentType(row.type) || (row.time || 0) <= 0) return sum;
        return sum + env.deps.getEnemyDamageAilmentDps(row, pStats) * Math.max(0, row.time || 0) * Math.max(1, row.stacks || 1);
    }, 0);
}

export function bloomPreciseGetTalentEnemyRegenMultiplier(env, owner, enemy) {
    return bloomPreciseGetPreciseTalentLevel(env, owner, 'hero5__assassin') && enemy && enemy.talentHitByChaos ? 0.5 : 1;
}
