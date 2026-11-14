import { liveSummonLocalStats, liveSummonAilmentStats } from './support-summon-stats.mjs';

export function liveSummonScalePart(env, hit, ctx, element, fraction) {
    const part = { ...hit, dmg: hit.dmg * fraction, ailmentSourceDmg: hit.ailmentSourceDmg * fraction };
    env.deps.applySummonHitTargetScales(part, { ...ctx, s: { ...ctx.s, ele: element }, ele: element, expected: true });
    return part;
}

export function liveSummonScaleHit(env, hit, ctx) {
    const effects = ctx.pStats.summonSupportEffects, conversion = effects.conversion;
    if (!ctx.expected && ctx.target) env.deps.dodgeSummonHitByEntropy(hit, ctx.target);
    const unscaled = { ...hit };
    const ratio = conversion ? conversion.pct / 100 : 0;
    const original = liveSummonScalePart(env, hit, ctx, ctx.ele, 1 - ratio);
    const converted = conversion ? liveSummonScalePart(env, hit, ctx, conversion.element, ratio) : { dmg: 0, ailmentSourceDmg: 0 };
    hit.parts = [{ element: ctx.ele, damage: original.dmg, source: original.ailmentSourceDmg }];
    if (conversion) hit.parts.push({ element: conversion.element, damage: converted.dmg, source: converted.ailmentSourceDmg });
    hit.dmg = original.dmg + converted.dmg;
    hit.ailmentSourceDmg = original.ailmentSourceDmg + converted.ailmentSourceDmg;
    liveSummonAddAuraDamage(env, hit, unscaled, ctx);
    if (effects.execute && ctx.target) {
        const low = ctx.target.hp / Math.max(1, ctx.target.maxHp) <= effects.execute.thresholdPct / 100;
        const multiplier = low ? 1 + effects.execute.damageMorePct / 100 : effects.execute.otherwiseMultiplier;
        env.deps.scaleSummonHit(hit, multiplier);
        hit.parts.forEach(part => { part.damage *= multiplier; part.source *= multiplier; });
    }
}

export function liveSummonAddAuraDamage(env, hit, unscaled, ctx) {
    const conversion = ctx.pStats.summonSupportEffects.conversion;
    Object.entries(ctx.pStats.supportAuraFlat || {}).forEach(([element, amount]) => {
        if (!(amount > 0)) return;
        const fraction = amount / Math.max(1, ctx.s.baseDamage), converted = conversion ? conversion.pct / 100 : 0;
        const original = liveSummonScalePart(env, unscaled, ctx, element, fraction * (1 - converted));
        const extra = conversion ? liveSummonScalePart(env, unscaled, ctx, conversion.element, fraction * converted) : { dmg: 0, ailmentSourceDmg: 0 };
        hit.dmg += original.dmg + extra.dmg;
        hit.ailmentSourceDmg += original.ailmentSourceDmg + extra.ailmentSourceDmg;
        hit.parts.push({ element, damage: original.dmg, source: original.ailmentSourceDmg });
        if (conversion) hit.parts.push({ element: conversion.element, damage: extra.dmg, source: extra.ailmentSourceDmg });
    });
}

export function liveSummonAfterHit(env, summon, stats, target, hit) {
    const local = liveSummonLocalStats(env, summon, stats), effects = local.summonSupportEffects;
    const element = effects.conversion?.pct === 100 ? effects.conversion.element : hit.element;
    (hit.parts || [{ element, damage: hit.damage, source: hit.ailmentSourceDamage }]).forEach(part => {
        if (part.damage <= 0) return;
        env.deps.applyEnemyAilmentFromHit(target, liveSummonAilmentStats(env, summon, stats, part.element), part.damage, hit.crit, {
            ailmentSourceDamage: part.source, critDotBonusPct: hit.crit ? 50 : 0
        });
    });
    if (effects.push) env.deps.pushEnemyAwayOnHit(target, { pushAwayCells: effects.push });
    env.deps.recordSupportHit(target, { ...local, sSkill: { ...local.summonSupportSkill, ele: element } }, hit.damage);
}
