// GENERATED from modules/combat-support-summons*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/support-summon-stats.mjs
  function liveSummonRuntimeDefs(env2, defs, stats) {
    return env2.deps.plans.runtimeDefs(
      defs,
      stats,
      env2.owner,
      stats?.passiveKeystoneFlags?.soleMinion ? void 0 : env2.deps.getSummonRuntimeCap(stats)
    );
  }
  function liveSummonAttackPlan(env2, summon, targets, stats) {
    return env2.deps.plans.attackPlan(summon, targets, liveSummonLocalStats(env2, summon, stats).summonSupportEffects, env2.owner);
  }
  function liveSummonApi(env2) {
    return env2.deps.supportRules;
  }
  function liveSummonSkill(env2, summon) {
    const name = summon?.gemName, def = env2.deps.SKILL_DB[name];
    if (!def) return { tags: [], supportEffects: { applied: [], damageMultiplier: 1, speedMultiplier: 1 } };
    const tags = def.tags.slice();
    if (env2.deps.wispSummons.elements(name)) {
      ["fire", "cold", "lightning"].forEach((tag) => {
        const index = tags.indexOf(tag);
        if (index >= 0) tags.splice(index, 1);
      });
    }
    return liveSummonApi(env2).prepare({ ...def, tags, ele: summon.ele || def.ele });
  }
  function liveSummonSummonKey(env2, summon) {
    return `${summon?.gemName || ""}:${summon?.ele || env2.deps.SKILL_DB[summon?.gemName]?.ele || ""}`;
  }
  function liveSummonLocalStats(env2, summon, stats) {
    const key = liveSummonSummonKey(env2, summon);
    if (stats.summonSupportOwner === key) return stats;
    let byKey = env2.locals.get(stats);
    if (!byKey) env2.locals.set(stats, byKey = /* @__PURE__ */ new Map());
    if (!byKey.has(key)) byKey.set(key, liveSummonBuildLocalStats(env2, summon, stats, key));
    return byKey.get(key);
  }
  function liveSummonBuildLocalStats(env2, summon, stats, key) {
    const prepared = liveSummonSkill(env2, summon), result = {
      ...stats,
      summonSupportOwner: key,
      summonSupportSkill: prepared,
      summonSupportEffects: prepared.supportEffects,
      summonSupportApplied: {}
    };
    Object.entries(stats.summonSupportApplied || {}).forEach(([stat, amount]) => {
      result[stat] -= amount;
    });
    const add = (target, amount) => {
      result[target] = (result[target] || 0) + amount;
      result.summonSupportApplied[target] = (result.summonSupportApplied[target] || 0) + amount;
    };
    prepared.supportEffects.applied.forEach((name) => {
      const def = env2.deps.SUPPORT_GEM_DB[name], target = liveSummonApi(env2).summonStatMap[def.stat];
      if (!target) return;
      add(target, stats.supportValues?.[name] ?? env2.deps.getSupportGemPresentation(name, stats, { total: 0 }, env2.deps.getSupportActiveTier).value);
    });
    const forge = env2.deps.gemCoreForge.forSkill(summon && summon.gemName);
    add("summonPctDmg", forge.damageInc);
    add("summonAspd", forge.speedInc);
    return result;
  }
  function liveSummonPlayerSupportValue(env2, stats, stat) {
    const prepared = liveSummonApi(env2).prepare(env2.deps.SKILL_DB[env2.owner.activeSkill] || env2.deps.SKILL_DB["기본 공격"]);
    return (env2.owner.equippedSupports || []).reduce((sum, name) => {
      const def = env2.deps.SUPPORT_GEM_DB[name];
      if (!def || def.stat !== stat || !liveSummonApi(env2).matches(name, prepared, "main")) return sum;
      return sum + (stats.supportValues?.[name] ?? liveSummonApi(env2).value(name));
    }, 0);
  }
  function liveSummonAilmentStats(env2, summon, stats, element) {
    const local = liveSummonLocalStats(env2, summon, stats), prepared = local.summonSupportSkill;
    const result = env2.deps.getSummonAilmentStats(local, element);
    result.sSkill = { ...prepared, ele: element };
    return result;
  }

  // modules/combat/support-summon-hits.mjs
  function liveSummonScalePart(env2, hit, ctx, element, fraction) {
    const part = { ...hit, dmg: hit.dmg * fraction, ailmentSourceDmg: hit.ailmentSourceDmg * fraction };
    env2.deps.applySummonHitTargetScales(part, { ...ctx, s: { ...ctx.s, ele: element }, ele: element, expected: true });
    return part;
  }
  function liveSummonScaleHit(env2, hit, ctx) {
    const effects = ctx.pStats.summonSupportEffects, conversion = effects.conversion;
    if (!ctx.expected && ctx.target) env2.deps.dodgeSummonHitByEntropy(hit, ctx.target);
    const unscaled = { ...hit };
    const ratio = conversion ? conversion.pct / 100 : 0;
    const original = liveSummonScalePart(env2, hit, ctx, ctx.ele, 1 - ratio);
    const converted = conversion ? liveSummonScalePart(env2, hit, ctx, conversion.element, ratio) : { dmg: 0, ailmentSourceDmg: 0 };
    hit.parts = [{ element: ctx.ele, damage: original.dmg, source: original.ailmentSourceDmg }];
    if (conversion) hit.parts.push({ element: conversion.element, damage: converted.dmg, source: converted.ailmentSourceDmg });
    hit.dmg = original.dmg + converted.dmg;
    hit.ailmentSourceDmg = original.ailmentSourceDmg + converted.ailmentSourceDmg;
    liveSummonAddAuraDamage(env2, hit, unscaled, ctx);
    if (effects.execute && ctx.target) {
      const low = ctx.target.hp / Math.max(1, ctx.target.maxHp) <= effects.execute.thresholdPct / 100;
      const multiplier = low ? 1 + effects.execute.damageMorePct / 100 : effects.execute.otherwiseMultiplier;
      env2.deps.scaleSummonHit(hit, multiplier);
      hit.parts.forEach((part) => {
        part.damage *= multiplier;
        part.source *= multiplier;
      });
    }
  }
  function liveSummonAddAuraDamage(env2, hit, unscaled, ctx) {
    const conversion = ctx.pStats.summonSupportEffects.conversion;
    Object.entries(ctx.pStats.supportAuraFlat || {}).forEach(([element, amount]) => {
      if (!(amount > 0)) return;
      const fraction = amount / Math.max(1, ctx.s.baseDamage), converted = conversion ? conversion.pct / 100 : 0;
      const original = liveSummonScalePart(env2, unscaled, ctx, element, fraction * (1 - converted));
      const extra = conversion ? liveSummonScalePart(env2, unscaled, ctx, conversion.element, fraction * converted) : { dmg: 0, ailmentSourceDmg: 0 };
      hit.dmg += original.dmg + extra.dmg;
      hit.ailmentSourceDmg += original.ailmentSourceDmg + extra.ailmentSourceDmg;
      hit.parts.push({ element, damage: original.dmg, source: original.ailmentSourceDmg });
      if (conversion) hit.parts.push({ element: conversion.element, damage: extra.dmg, source: extra.ailmentSourceDmg });
    });
  }
  function liveSummonAfterHit(env2, summon, stats, target, hit) {
    const local = liveSummonLocalStats(env2, summon, stats), effects = local.summonSupportEffects;
    const element = effects.conversion?.pct === 100 ? effects.conversion.element : hit.element;
    (hit.parts || [{ element, damage: hit.damage, source: hit.ailmentSourceDamage }]).forEach((part) => {
      if (part.damage <= 0) return;
      env2.deps.applyEnemyAilmentFromHit(target, liveSummonAilmentStats(env2, summon, stats, part.element), part.damage, hit.crit, {
        ailmentSourceDamage: part.source,
        critDotBonusPct: hit.crit ? 50 : 0
      });
    });
    if (effects.push) env2.deps.pushEnemyAwayOnHit(target, { pushAwayCells: effects.push });
    env2.deps.recordSupportHit(target, { ...local, sSkill: { ...local.summonSupportSkill, ele: element } }, hit.damage);
  }

  // modules/domain/support-summon-plan.mjs
  var SummonSupportPlan = class {
    constructor(rules, grid) {
      this.rules = rules;
      this.grid = grid;
    }
    hpMultiplier(stats) {
      return stats.summonSupportEffects.summon?.hpMultiplier || 1;
    }
    inheritedLeech(stats) {
      return Math.max(0, Number(stats.summonInheritedLeech ?? stats.leech) || 0);
    }
    scaleContact(hit, multiplier = 1) {
      hit.damage = Math.floor(hit.damage * multiplier);
      hit.ailmentSourceDamage = Math.floor(hit.ailmentSourceDamage * multiplier);
      hit.parts.forEach((part) => {
        part.damage *= multiplier;
        part.source *= multiplier;
      });
    }
    soleMinionDefs(defs) {
      const attack = defs.find((row) => row.db.tags.includes("summon_attack"));
      return [...attack ? [attack] : [], ...defs.filter((row) => row.db.tags.includes("summon_guard"))];
    }
    // Blessings reserve their normal slot before being removed from physical summon definitions.
    runtimeDefs(defs, stats, state, cap) {
      const sole = !!stats?.passiveKeystoneFlags?.soleMinion;
      const base = (sole ? this.soleMinionDefs(defs) : defs.slice(0, cap)).filter((row) => !row.db.tags.includes("summon_buff"));
      const extra = [], reinforced = /* @__PURE__ */ new Set();
      if (!sole) base.forEach((row) => {
        const bonus = this.rules.prepare(row.db, state).supportEffects.summon?.extra || 0;
        if (!bonus || reinforced.has(row.name)) return;
        reinforced.add(row.name);
        const count = base.filter((other) => other.name === row.name).length;
        for (let i = 0; i < bonus; i++) extra.push({ ...row, duplicateIndex: count + i, supportReinforcement: true });
      });
      return [...base, ...extra].map((row, slotIdx) => ({ ...row, slotIdx }));
    }
    nearby(from, enemies, seen, distance) {
      return enemies.filter((enemy) => !seen.has(enemy.id) && this.grid.distance(from, enemy) <= distance).sort((a, b) => this.grid.distance(from, a) - this.grid.distance(from, b));
    }
    addChain(plan, count, enemies, seen, config) {
      let from = plan[0].target;
      for (let i = 1; i <= count; i++) {
        const target = this.nearby(from, enemies, seen, 3)[0];
        if (!target) break;
        seen.add(target.id);
        plan.push({ target, multiplier: Math.pow(1 + config.stepDamagePct / 100, i), delayMs: plan[0].delayMs + i * 120 });
        from = target;
      }
    }
    inProjectilePath(summon, first, target, fan) {
      if (![summon, first, target].every((unit) => this.grid.validCell(unit))) return false;
      const ax = first.gx - summon.gx, ay = first.gy - summon.gy, bx = target.gx - summon.gx, by = target.gy - summon.gy;
      const distance = Math.hypot(ax, ay), range = Math.hypot(bx, by);
      if (!distance || !range || range > Math.max(summon.gridRange || 1, distance) + 2) return false;
      const forward = (ax * bx + ay * by) / distance;
      return fan ? forward / range >= Math.cos(Math.PI * 55 / 180) : forward > 0 && Math.abs(ax * by - ay * bx) / distance <= 0.55;
    }
    attackPlan(summon, targets, fx, world) {
      const enemies = world.enemies.filter((enemy) => enemy.hp > 0);
      const plan = targets.map((target) => ({ target, multiplier: 1, delayMs: fx.mineDelayMs || 0 }));
      const seen = new Set(targets.map((target) => target.id)), first = targets[0];
      if (fx.chain) this.addChain(plan, fx.chain.count, enemies, seen, fx.chain);
      const extra = (fx.projectiles?.extra || 0) + (fx.pierce || 0);
      enemies.filter((enemy) => !seen.has(enemy.id) && this.inProjectilePath(summon, first, enemy, !!fx.projectiles)).slice(0, extra).forEach((target) => {
        seen.add(target.id);
        plan.push({ target, multiplier: 1, delayMs: fx.mineDelayMs || 0 });
      });
      const spread = (fx.spreadRadius || 0) + (fx.expansion || 0);
      if (spread) this.nearby(first, enemies, seen, spread).forEach((target) => plan.push({ target, multiplier: 1, delayMs: fx.mineDelayMs || 0 }));
      if (fx.repeat) plan.push(...plan.map((row) => ({ ...row, multiplier: row.multiplier * fx.repeat.damagePct / 100, delayMs: row.delayMs + 180 })));
      return plan.slice(0, 32);
    }
  };
  function createSummonSupportPlan(rules, grid) {
    const service = new SummonSupportPlan(rules, grid);
    return Object.freeze(Object.fromEntries(["hpMultiplier", "inheritedLeech", "scaleContact", "runtimeDefs", "attackPlan"].map((name) => [name, service[name].bind(service)])));
  }

  // modules/combat-support-summons-classic.mjs
  var plans = createSummonSupportPlan(window.GameModules.skills.supports, {
    distance: (a, b) => getGridUnitDistance(a, b),
    validCell: (unit) => hasGridCell(unit)
  });
  var deps = {
    get plans() {
      return plans;
    },
    get getSummonRuntimeCap() {
      return getSummonRuntimeCap;
    },
    get supportRules() {
      return window.GameModules.skills.supports;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get wispSummons() {
      return wispSummons;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get getSupportGemPresentation() {
      return getSupportGemPresentation;
    },
    get getSupportActiveTier() {
      return getSupportActiveTier;
    },
    get gemCoreForge() {
      return gemCoreForge;
    },
    get getSummonAilmentStats() {
      return getSummonAilmentStats;
    },
    get applySummonHitTargetScales() {
      return applySummonHitTargetScales;
    },
    get dodgeSummonHitByEntropy() {
      return dodgeSummonHitByEntropy;
    },
    get scaleSummonHit() {
      return scaleSummonHit;
    },
    get applyEnemyAilmentFromHit() {
      return applyEnemyAilmentFromHit;
    },
    get pushEnemyAwayOnHit() {
      return pushEnemyAwayOnHit;
    },
    get recordSupportHit() {
      return window.GameModules.combat.supports.afterHit;
    }
  };
  var env = { get owner() {
    return game;
  }, deps, locals: /* @__PURE__ */ new WeakMap() };
  window.GameModules.combat = window.GameModules.combat || {};
  window.GameModules.combat.summonSupports = Object.freeze({
    skill(summon) {
      return liveSummonSkill(env, summon);
    },
    localStats(summon, stats) {
      return liveSummonLocalStats(env, summon, stats);
    },
    runtimeDefs(defs, stats) {
      return liveSummonRuntimeDefs(env, defs, stats);
    },
    scaleHit(hit, ctx) {
      return liveSummonScaleHit(env, hit, ctx);
    },
    afterHit(summon, stats, target, hit) {
      return liveSummonAfterHit(env, summon, stats, target, hit);
    },
    attackPlan(summon, targets, stats) {
      return liveSummonAttackPlan(env, summon, targets, stats);
    },
    playerSupportValue(stats, stat) {
      return liveSummonPlayerSupportValue(env, stats, stat);
    },
    hpMultiplier: plans.hpMultiplier,
    inheritedLeech: plans.inheritedLeech,
    scaleContact: plans.scaleContact
  });
})();
