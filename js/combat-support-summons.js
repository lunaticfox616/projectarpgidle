// Summon-local support application. The player's own support bucket never leaks into another summon.
(function () {
    'use strict';
    window.GameModules.combat = window.GameModules.combat || {};
    const api = () => window.GameModules.skills.supports;

    function skill(summon) {
        const name = summon?.gemName, def = SKILL_DB[name];
        if (!def) return { tags: [], supportEffects: { applied: [], damageMultiplier: 1, speedMultiplier: 1 } };
        const tags = def.tags.slice();
        if (wispSummons.elements(name)) {
            ['fire', 'cold', 'lightning'].forEach(tag => { const index = tags.indexOf(tag); if (index >= 0) tags.splice(index, 1); });
        }
        return api().prepare({ ...def, tags, ele: summon.ele || def.ele });
    }

    function localStats(summon, stats) {
        const key = `${summon?.gemName || ''}:${summon?.ele || SKILL_DB[summon?.gemName]?.ele || ''}`;
        if (stats.summonSupportOwner === key) return stats;
        const prepared = skill(summon), result = { ...stats, summonSupportOwner: key,
            summonSupportSkill: prepared, summonSupportEffects: prepared.supportEffects, summonSupportApplied: {} };
        Object.entries(stats.summonSupportApplied || {}).forEach(([stat, amount]) => { result[stat] -= amount; });
        prepared.supportEffects.applied.forEach(name => {
            const def = SUPPORT_GEM_DB[name], target = api().summonStatMap[def.stat];
            if (!target) return;
            const amount = stats.supportValues?.[name] ?? getSupportGemPresentation(name, stats, { total: 0 }, getSupportActiveTier).value;
            result[target] = (result[target] || 0) + amount;
            result.summonSupportApplied[target] = (result.summonSupportApplied[target] || 0) + amount;
        });
        return result;
    }

    function playerSupportValue(stats, stat) {
        const prepared = api().prepare(SKILL_DB[game.activeSkill] || SKILL_DB['기본 공격']);
        return (game.equippedSupports || []).reduce((sum, name) => {
            const def = SUPPORT_GEM_DB[name];
            if (!def || def.stat !== stat || !api().matches(name, prepared, 'main')) return sum;
            return sum + (stats.supportValues?.[name] ?? api().value(name));
        }, 0);
    }

    function hpMultiplier(stats) { return stats.summonSupportEffects.summon?.hpMultiplier || 1; }
    function inheritedLeech(stats) { return Math.max(0, Number(stats.summonInheritedLeech ?? stats.leech) || 0); }
    function scaleContact(hit, multiplier = 1) {
        hit.damage = Math.floor(hit.damage * multiplier);
        hit.ailmentSourceDamage = Math.floor(hit.ailmentSourceDamage * multiplier);
        hit.parts.forEach(part => { part.damage *= multiplier; part.source *= multiplier; });
    }

    /** Auras reserve their normal slot first; reinforcement adds one physical summon per equipped attack rune. */
    function runtimeDefs(defs, stats) {
        const base = defs.slice(0, getSummonRuntimeCap(stats)).filter(row => !row.db.tags.includes('summon_buff'));
        const extra = [], reinforced = new Set();
        if (!stats?.passiveKeystoneFlags?.soleMinion) base.forEach(row => {
            const bonus = api().prepare(row.db).supportEffects.summon?.extra || 0;
            if (!bonus || reinforced.has(row.name)) return;
            reinforced.add(row.name);
            const count = base.filter(other => other.name === row.name).length;
            for (let i = 0; i < bonus; i++) extra.push({ ...row, duplicateIndex: count + i, supportReinforcement: true });
        });
        return [...base, ...extra].map((row, slotIdx) => ({ ...row, slotIdx }));
    }

    function scalePart(hit, ctx, element, fraction) {
        const part = { ...hit, dmg: hit.dmg * fraction, ailmentSourceDmg: hit.ailmentSourceDmg * fraction };
        applySummonHitTargetScales(part, { ...ctx, s: { ...ctx.s, ele: element }, ele: element, expected: true });
        return part;
    }

    function scaleHit(hit, ctx) {
        const effects = ctx.pStats.summonSupportEffects, conversion = effects.conversion;
        if (!ctx.expected && ctx.target) dodgeSummonHitByEntropy(hit, ctx.target);
        const unscaled = { ...hit };
        const ratio = conversion ? conversion.pct / 100 : 0;
        const original = scalePart(hit, ctx, ctx.ele, 1 - ratio);
        const converted = conversion ? scalePart(hit, ctx, conversion.element, ratio) : { dmg: 0, ailmentSourceDmg: 0 };
        hit.parts = [{ element: ctx.ele, damage: original.dmg, source: original.ailmentSourceDmg }];
        if (conversion) hit.parts.push({ element: conversion.element, damage: converted.dmg, source: converted.ailmentSourceDmg });
        hit.dmg = original.dmg + converted.dmg;
        hit.ailmentSourceDmg = original.ailmentSourceDmg + converted.ailmentSourceDmg;
        addAuraDamage(hit, unscaled, ctx);
        if (effects.execute && ctx.target) {
            const low = ctx.target.hp / Math.max(1, ctx.target.maxHp) <= effects.execute.thresholdPct / 100;
            const multiplier = low ? 1 + effects.execute.damageMorePct / 100 : effects.execute.otherwiseMultiplier;
            scaleSummonHit(hit, multiplier);
            hit.parts.forEach(part => { part.damage *= multiplier; part.source *= multiplier; });
        }
    }

    function addAuraDamage(hit, unscaled, ctx) {
        const conversion = ctx.pStats.summonSupportEffects.conversion;
        Object.entries(ctx.pStats.supportAuraFlat || {}).forEach(([element, amount]) => {
            if (!(amount > 0)) return;
            const fraction = amount / Math.max(1, ctx.s.baseDamage), converted = conversion ? conversion.pct / 100 : 0;
            const original = scalePart(unscaled, ctx, element, fraction * (1 - converted));
            const extra = conversion ? scalePart(unscaled, ctx, conversion.element, fraction * converted) : { dmg: 0, ailmentSourceDmg: 0 };
            hit.dmg += original.dmg + extra.dmg;
            hit.ailmentSourceDmg += original.ailmentSourceDmg + extra.ailmentSourceDmg;
            hit.parts.push({ element, damage: original.dmg, source: original.ailmentSourceDmg });
            if (conversion) hit.parts.push({ element: conversion.element, damage: extra.dmg, source: extra.ailmentSourceDmg });
        });
    }

    function ailmentStats(summon, stats, element) {
        const local = localStats(summon, stats), prepared = local.summonSupportSkill;
        const result = getSummonAilmentStats(local, element);
        result.sSkill = { ...prepared, ele: element };
        return result;
    }

    function afterHit(summon, stats, target, hit) {
        const local = localStats(summon, stats), effects = local.summonSupportEffects;
        const element = effects.conversion?.pct === 100 ? effects.conversion.element : hit.element;
        (hit.parts || [{ element, damage: hit.damage, source: hit.ailmentSourceDamage }]).forEach(part => {
            if (part.damage <= 0) return;
            applyEnemyAilmentFromHit(target, ailmentStats(summon, stats, part.element), part.damage, hit.crit, {
                ailmentSourceDamage: part.source, critDotBonusPct: hit.crit ? 50 : 0
            });
        });
        if (effects.push) pushEnemyAwayOnHit(target, { pushAwayCells: effects.push });
        window.GameModules.combat.supports.afterHit(target, { ...local, sSkill: { ...local.summonSupportSkill, ele: element } }, hit.damage);
    }

    function nearby(from, enemies, seen, distance) {
        return enemies.filter(enemy => !seen.has(enemy.id) && getGridUnitDistance(from, enemy) <= distance)
            .sort((a, b) => getGridUnitDistance(from, a) - getGridUnitDistance(from, b));
    }

    function addChain(plan, count, enemies, seen, config) {
        let from = plan[0].target;
        for (let i = 1; i <= count; i++) {
            const target = nearby(from, enemies, seen, 3)[0];
            if (!target) break;
            seen.add(target.id);
            plan.push({ target, multiplier: Math.pow(1 + config.stepDamagePct / 100, i), delayMs: plan[0].delayMs + i * 120 });
            from = target;
        }
    }

    function inProjectilePath(summon, first, target, fan) {
        if (![summon, first, target].every(hasGridCell)) return false;
        const ax = first.gx - summon.gx, ay = first.gy - summon.gy, bx = target.gx - summon.gx, by = target.gy - summon.gy;
        const distance = Math.hypot(ax, ay), range = Math.hypot(bx, by);
        if (!distance || !range || range > Math.max(summon.gridRange || 1, distance) + 2) return false;
        const forward = (ax * bx + ay * by) / distance;
        return fan ? forward / range >= Math.cos(Math.PI * 55 / 180) : forward > 0 && Math.abs(ax * by - ay * bx) / distance <= 0.55;
    }

    function attackPlan(summon, targets, stats) {
        const fx = localStats(summon, stats).summonSupportEffects, enemies = game.enemies.filter(enemy => enemy.hp > 0);
        const plan = targets.map(target => ({ target, multiplier: 1, delayMs: fx.mineDelayMs || 0 }));
        const seen = new Set(targets.map(target => target.id)), first = targets[0];
        if (fx.chain) addChain(plan, fx.chain.count, enemies, seen, fx.chain);
        const extra = (fx.projectiles?.extra || 0) + (fx.pierce || 0);
        enemies.filter(enemy => !seen.has(enemy.id) && inProjectilePath(summon, first, enemy, !!fx.projectiles))
            .slice(0, extra).forEach(target => { seen.add(target.id); plan.push({ target, multiplier: 1, delayMs: fx.mineDelayMs || 0 }); });
        const spread = (fx.spreadRadius || 0) + (fx.expansion || 0);
        if (spread) nearby(first, enemies, seen, spread).forEach(target => plan.push({ target, multiplier: 1, delayMs: fx.mineDelayMs || 0 }));
        if (fx.repeat) plan.push(...plan.map(row => ({ ...row, multiplier: row.multiplier * fx.repeat.damagePct / 100, delayMs: row.delayMs + 180 })));
        return plan.slice(0, 32);
    }

    window.GameModules.combat.summonSupports = Object.freeze({ skill, localStats, runtimeDefs, scaleHit, afterHit, attackPlan,
        playerSupportValue, hpMultiplier, inheritedLeech, scaleContact });
})();
