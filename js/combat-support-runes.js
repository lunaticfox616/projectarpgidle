// GENERATED from modules/combat-support-runes*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/support-damage.mjs
  function rememberSupportHit(enemy, stats, damage, readClock) {
    if (damage <= 0) return;
    enemy.supportDeathSource = stats;
    const fx = stats.sSkill.supportEffects?.dot;
    if (!fx || enemy.hp <= 0) return;
    const now = readClock(), rows = enemy.supportDots || [];
    rows.push({ remaining: damage * fx.damagePct / 100, pending: 0, until: now + fx.durationMs, at: now, stats, element: stats.sSkill.ele });
    enemy.supportDots = rows;
  }
  function advanceDot(row, now) {
    const end = Math.min(now, row.until), span = row.until - row.at;
    if (end <= row.at || span <= 0) return null;
    const damage = row.remaining * (end - row.at) / span;
    row.remaining -= damage;
    row.at = end;
    row.pending = (row.pending || 0) + damage;
    const whole = Math.floor(row.pending);
    row.pending -= whole;
    return whole;
  }
  function* supportDotContacts(enemies, now) {
    for (const enemy of enemies.slice()) {
      for (const row of enemy.supportDots || []) {
        if (enemy.hp <= 0) break;
        const damage = advanceDot(row, now);
        if (damage !== null) yield { enemy, row, damage };
      }
      enemy.supportDots = (enemy.supportDots || []).filter((row) => row.until > now && row.remaining > 0);
    }
  }
  function* corpseTargets(enemy, enemies, distance) {
    for (const other of enemies) {
      if (other.hp <= 0 || distance(enemy, other) > 2) continue;
      yield other;
    }
  }
  function planCorpseExplosion(enemy, enemies, inputs) {
    const stats = enemy.supportDeathSource, fx = stats?.sSkill?.supportEffects?.corpse;
    if (!fx || inputs.random() * 100 >= fx.chancePct) return null;
    const source = { ...stats, sSkill: { ...stats.sSkill, supportEffects: { ...stats.sSkill.supportEffects, corpse: null } } };
    return { source, lifePct: fx.lifePct, targets: corpseTargets(enemy, enemies.slice(), inputs.distance) };
  }

  // modules/combat/support-live-hits.mjs
  function liveSupportResolve(env2, skill) {
    return env2.deps.shapes.resolve(skill, env2.owner);
  }
  function liveSupportStages(env2, rows, skill) {
    return env2.deps.contacts.stages(rows, skill, env2.owner);
  }
  function liveSupportRepeatNative(env2, command, targets) {
    const request = env2.deps.contacts.repeat(command, targets);
    if (request) env2.deps.queuePendingSkillStageHits(request.rows, request.stats, request.options);
  }
  function liveSupportAugmentNative(env2, command, targets) {
    const request = env2.deps.contacts.augment(command, targets, env2.owner);
    if (request) env2.deps.queuePendingSkillStageHits(request.rows, request.stats, request.options);
  }
  function liveSupportActiveSkillStats(env2, bonus) {
    const mobility = typeof env2.deps.mobilitySkill === "object" && env2.deps.mobilitySkill.mainGem() !== env2.owner.activeSkill;
    return liveSupportResolve(env2, env2.deps.getActiveSkillStats(bonus, mobility));
  }
  function liveSupportDealHit(env2, enemy, stats, damage) {
    const now = env2.deps.getCombatTime();
    const dealt = env2.deps.applyDamageToEnemyResource(enemy, env2.deps.ascendancyNodeRules.beforeHit(damage * env2.deps.targetMultiplier(enemy, stats.sSkill), enemy, stats, now));
    liveSupportAfterHit(env2, enemy, stats, dealt);
    env2.deps.ascendancyNodeRules.afterHit(stats, enemy, dealt, now);
    return dealt;
  }
  function liveSupportDeferAttack(env2, stats, options) {
    return liveSupportConversionContacts(env2, stats, options) || env2.deps.shouldDeferNativeGemCast(stats, options);
  }
  function* liveSupportRetire(env2, enemy) {
    env2.deps.retireDeadEnemyAttacks(enemy);
    yield* liveSupportOnDeath(env2, enemy);
  }
  function* liveSupportRepeatReleased(env2, row) {
    const options = row.options, skill = row.pStats.sSkill;
    if (options.stageKind !== "supportRepeat" || env2.owner.isBackgroundCalculation) return;
    yield { effect: ["supportEcho", {
      skillName: skill.visualName || options.skillName,
      element: options.forcedElement || skill.ele,
      stageKind: options.stageKind,
      damageTextGroupId: options.damageTextGroupId,
      sourceCell: options.sourceCell,
      attackFootprint: options.attackFootprint,
      duration: 420
    }] };
  }
  function liveSupportConversionContacts(env2, stats, options) {
    const fx = stats.sSkill.supportEffects?.conversion;
    if (!options.stageReplay || options.supportConverted || !fx || fx.pct < 100) return false;
    env2.deps.performPlayerAttack({ ...stats, sSkill: { ...stats.sSkill, ele: fx.element } }, { ...options, supportConverted: true, forcedElement: fx.element });
    return true;
  }
  function liveSupportAfterHit(env2, enemy, stats, damage) {
    rememberSupportHit(enemy, stats, damage, env2.deps.getCombatTime);
  }
  function* liveSupportTickDots(env2) {
    for (const { enemy, row, damage } of supportDotContacts(env2.owner.enemies, env2.deps.getCombatTime())) {
      const dealt = env2.deps.applyDamageToEnemyResource(enemy, damage);
      enemy.supportDeathSource = row.stats;
      if (dealt > 0) yield { effect: ["hit", { enemyId: enemy.id, damage: dealt, element: row.element, dot: true, noLine: true, duration: 200 }] };
      if (enemy.hp <= 0) env2.deps.handleEnemyDeath(enemy, row.stats);
    }
  }
  function* liveSupportOnDeath(env2, enemy) {
    const plan = planCorpseExplosion(enemy, env2.owner.enemies, { random: env2.deps.random, distance: env2.deps.getGridUnitDistance });
    if (!plan) return;
    const source = plan.source;
    for (const other of plan.targets) {
      const mitigation = env2.deps.getEffectiveEnemyMitigation(source.sSkill.ele, env2.deps.getZone(env2.owner.currentZoneId).tier, other, source);
      const damage = enemy.maxHp * plan.lifePct / 100 * (1 - mitigation / 100) * env2.deps.loopMutation.takenMul(other, source.sSkill.ele);
      const dealt = env2.deps.applyDamageToEnemyResource(other, damage);
      other.supportDeathSource = source;
      yield { effect: ["hit", { enemyId: other.id, damage: dealt, element: source.sSkill.ele, noLine: true, duration: 300 }] };
      if (other.hp <= 0) env2.deps.handleEnemyDeath(other, source);
    }
    yield { effect: ["corpseExplosion", { enemyId: enemy.id, sourceCell: { gx: enemy.gx, gy: enemy.gy }, element: source.sSkill.ele, duration: 400 }] };
  }

  // modules/combat/support-blessings.mjs
  function liveSupportActiveBlessing(env2, state, cap = Infinity) {
    let used = 0;
    for (const name of state.equippedSummonSkills || []) {
      const def = liveSupportSummonPlaceOf(env2, state, name);
      if (!def) continue;
      if (used >= cap) return null;
      if (def.aura) return name;
      used += liveSupportSummonPlaces(state, name, def);
    }
    return null;
  }
  function liveSupportSummonPlaceOf(env2, state, name) {
    const def = env2.deps.SKILL_DB[name];
    return def && (def.tags || []).includes("summon") && state.skills.includes(name) && env2.deps.canUseSkillWithCurrentEquipment(name) ? def : null;
  }
  function liveSupportSummonPlaces(state, name, def) {
    return def.tags.includes("summon_attack") ? Math.max(1, Math.floor(Number((state.summonSkillCounts || {})[name]) || 1)) : 1;
  }
  function liveSupportBlessingGreed(env2, state) {
    const name = liveSupportActiveBlessing(env2, state);
    return name && env2.deps.SKILL_DB[name].greed || null;
  }
  function liveSupportAuraValues(env2, state, bonus, cap) {
    const values = {}, name = liveSupportActiveBlessing(env2, state, cap), aura = name && env2.deps.SKILL_DB[name].aura;
    if (!aura) return values;
    const steps = env2.deps.getGemLevelGrowthSteps(liveSupportAuraLevel(env2, state, name, bonus(name)));
    if (aura.flatStat) values[aura.flatStat] = aura.flatBase + steps * aura.flatScale;
    for (const row of aura.stats) liveSupportAddAuraStat(values, row, steps);
    return values;
  }
  function liveSupportAuraLevel(env2, state, name, bonus) {
    return env2.deps.getSkillGemLevels(name, env2.deps.SKILL_DB[name], env2.deps.normalizeGemRecord(state.gemData[name]), { total: bonus }).finalLevel;
  }
  function liveSupportAddAuraStat(values, row, steps) {
    values[row.stat] = (values[row.stat] || 0) + row.base + steps * row.scale;
  }
  function liveSupportAuraFlat(values) {
    return Object.fromEntries(["phys", "fire", "cold", "light", "chaos"].map((ele) => [ele, values[ele + "FlatDmg"] || 0]));
  }

  // modules/combat/support-stat-values.mjs
  function liveSupportSupportValue(env2, name, level, ownStat) {
    const def = env2.deps.SUPPORT_GEM_DB[name], gem = env2.deps.normalizeGemRecord(env2.owner.supportGemData[name]);
    const { tierMul } = env2.deps.getSupportGemTier(name, gem, null);
    const value = (def.baseVal + env2.deps.getGemLevelGrowthSteps(level) * def.scale) * tierMul;
    if (def.tierValues) return env2.deps.supportRules.value(name);
    return def.scaleWithOwnStat ? Math.max(0, ownStat(def.scaleWithOwnStat)) * value / 100 : value;
  }
  function liveSupportValues(env2, skill, context) {
    const result = {};
    for (const name of context.names) {
      const def = env2.deps.SUPPORT_GEM_DB[name];
      if (!def) continue;
      const gem = env2.deps.normalizeGemRecord(env2.owner.supportGemData[name]);
      const level = Math.max(1, gem.level + context.bonus(name));
      result[name] = liveSupportSupportValue(env2, name, level, context.ownStat);
      if (!def.stat || !env2.deps.supportRules.matches(name, skill, "main")) continue;
      context.add(def.stat, result[name]);
      if (def.capStat) context.add(def.capStat, liveSupportCapValue(env2, def, level));
    }
    return result;
  }
  function liveSupportCapValue(env2, def, level) {
    return (def.capBase || 0) + env2.deps.getGemLevelGrowthSteps(level, def.capGrowAfterLevel || 0) * (def.capPerLevel || 0);
  }
  function liveSupportGrantsAttributes(env2, state, names) {
    const attribute = (stat) => stat === "strength" || stat === "dexterity" || stat === "intelligence";
    const support = names.some((name) => {
      const def = env2.deps.SUPPORT_GEM_DB[name];
      return !!def && (attribute(def.stat) || attribute(def.capStat));
    });
    return support || (state.equippedSummonSkills || []).some((name) => {
      const aura = env2.deps.SKILL_DB[name] && env2.deps.SKILL_DB[name].aura;
      return !!aura && (attribute(aura.flatStat) || aura.stats.some((row) => attribute(row.stat)));
    });
  }

  // modules/domain/support-attack.mjs
  var REPEAT_GAP_MS = 280;
  var LEAPS = /* @__PURE__ */ new Set([56, 77]);
  var LANDS_ONCE = /* @__PURE__ */ new Set([47, 48, 49, 79, 87]);
  var SupportAttack = class {
    constructor(rules) {
      this.rules = rules;
    }
    resolve(skill, state) {
      const out = this.rules.prepare(skill, state), fx = out.supportEffects;
      out.dmg = (out.dmg ?? out.baseDmg ?? 1) * fx.damageMultiplier;
      out.spd = (out.spd ?? out.baseSpd ?? 1) * fx.speedMultiplier;
      out.pushAwayCells = Math.max(out.pushAwayCells || 0, fx.push || 0);
      out.supportExpansion = Number(Boolean(fx.expansion));
      if (fx.conversion?.pct === 100) out.ele = fx.conversion.element;
      this.reshapeSkill(out, fx);
      return out;
    }
    reshapeSkill(out, fx) {
      const transforms = ["throwRange", "mineDelayMs", "channeling", "spreadRadius", "focus", "slam"];
      if (transforms.some((key) => fx[key])) delete out.combatPattern;
      if (transforms.some((key) => fx[key])) delete out.nativeCastId;
      if (transforms.concat(["chain", "pierce", "projectiles", "sweep", "expansion"]).some((key) => fx[key])) delete out.rangeText;
      out.targets = Math.max(1, out.targets || 1) + this.extraTargets(fx);
      if (fx.spreadRadius) out.targets = Math.max(9, out.targets);
      if (fx.focus) Object.assign(out, { targets: 1, multiHit: 1, targetMode: "single" });
      if (fx.slam) {
        out.aftershockDamagePct ?? (out.aftershockDamagePct = 38);
        out.aftershockDelayMs ?? (out.aftershockDelayMs = 420);
      }
    }
    extraTargets(fx) {
      return (fx.sweep?.extra || 0) + (fx.chain?.count || 0) + (fx.pierce || 0) + (fx.projectiles?.extra || 0);
    }
    grid(profile, skill) {
      const fx = skill?.supportEffects;
      if (!fx) return profile;
      const out = { ...profile };
      this.projectileGrid(out, fx, !!skill.combatPattern);
      if (fx.spreadRadius) Object.assign(out, { kind: "blast", radius: fx.spreadRadius + (skill.effectExpansion || 0) });
      if (fx.focus) Object.assign(out, { kind: "single", radius: 0, band: 0 });
      return out;
    }
    projectileGrid(out, fx, authored) {
      if (["throwRange", "sweep", "pierce", "chain", "projectiles", "aimedShots"].some((key) => fx[key])) delete out.band;
      if (fx.throwRange) Object.assign(out, { kind: "line", range: fx.throwRange, radius: 0 });
      if (fx.sweep) Object.assign(out, { kind: "cone", range: Math.max(1, out.range) });
      if (fx.pierce) Object.assign(out, { kind: "line", range: Math.max(4, out.range) });
      if (fx.chain && !authored) Object.assign(out, { kind: "chain", jump: 3 });
      if (fx.projectiles) Object.assign(out, { kind: "fan", rays: Math.min(8, (out.rays || 1) + fx.projectiles.extra), spreadDeg: 55 });
    }
    targetMultiplier(enemy, skill) {
      const fx = skill?.supportEffects?.execute;
      return fx ? enemy.hp / Math.max(1, enemy.maxHp) <= fx.thresholdPct / 100 ? 1 + fx.damageMorePct / 100 : fx.otherwiseMultiplier : 1;
    }
    expectedMultiplier(skill) {
      const fx = skill.supportEffects;
      if (!fx) return 1;
      return (1 + (fx.repeat?.damagePct || 0) / 100) * (1 + (fx.dot?.damagePct || 0) / 100) * this.shotsMultiplier(skill, fx);
    }
    shotsMultiplier(skill, fx) {
      const extra = fx.projectiles?.extra || 0, id = skill.nativeCastId;
      if (id === 44) return 1 + (extra + (fx.chain?.count || 0)) / 4;
      return !extra || skill.projectilePattern?.kind === "fan" || LEAPS.has(id) ? 1 : 1 + extra;
    }
    nativeDot(skill) {
      return (skill.supportBaseTags || skill.tags || []).includes("dot");
    }
    splitConversion(conversion, stats, hitElement) {
      const fx = stats.sSkill?.supportEffects?.conversion;
      if (!fx || fx.pct >= 100 || hitElement !== fx.sourceElement) return conversion;
      const added = { ...conversion.added, [fx.element]: (conversion.added[fx.element] || 0) + fx.pct * conversion.mainPct };
      return { ...conversion, mainPct: conversion.mainPct * (1 - fx.pct / 100), added };
    }
    playerProjectile(skill) {
      return skill.tags.includes("projectile") && !skill.tags.includes("summon");
    }
    igniteDuration(stats, type, duration) {
      return duration + (type === "ignite" ? (stats.sSkill?.supportEffects?.ignite?.durationMs || 0) / 1e3 : 0);
    }
    lockState(state) {
      return {
        equippedSummonSkills: state.equippedSummonSkills || [],
        summonSkillCounts: state.summonSkillCounts || {},
        sealedSkills: state.sealedSkills || [],
        sealedSupports: state.sealedSupports || []
      };
    }
  };
  function createSupportAttack(rules) {
    const service = new SupportAttack(rules);
    return Object.freeze(Object.fromEntries(["resolve", "grid", "targetMultiplier", "expectedMultiplier", "nativeDot", "splitConversion", "playerProjectile", "igniteDuration", "lockState"].map((name) => [name, service[name].bind(service)])));
  }

  // modules/domain/support-contact-plan.mjs
  var SupportContactPlanner = class {
    constructor(inputs) {
      this.inputs = inputs;
    }
    stages(rows, skill, world) {
      const fx = skill.supportEffects;
      if (!fx || !rows.length) return rows;
      let result = rows.map((row) => ({ ...row, targets: row.targets.map((entry, i) => ({
        ...entry,
        mult: this.stageTargetMultiplier(entry, i, skill)
      })) }));
      if (fx.chain) result = skill.combatPattern ? this.appendAuthoredChain(result, fx.chain, skill.combatPattern.kind === "authored", world) : this.chainStages(this.uniqueStageTargets(result), fx.chain);
      if (fx.repeat) {
        const delay = Math.max(...result.map((row) => row.delayMs || 0)) + REPEAT_GAP_MS;
        result = result.concat(result.map((row) => ({
          ...row,
          kind: "supportRepeat",
          label: this.inputs.translate("반복"),
          singleRepeat: true,
          delayMs: (row.delayMs || 0) + delay,
          damageMultiplier: row.damageMultiplier * fx.repeat.damagePct / 100
        })));
      }
      if (fx.mineDelayMs) result = result.map((row) => ({ ...row, delayMs: (row.delayMs || 0) + fx.mineDelayMs, delivery: "instantTarget" }));
      return result;
    }
    stageTargetMultiplier(entry, index, skill) {
      const fx = skill.supportEffects;
      if (fx.sweep && index > 0) return fx.sweep.damagePct / 100;
      if (fx.projectiles && skill.projectilePattern?.kind !== "fan") return 1;
      return entry.mult;
    }
    chainStages(targets, config) {
      return targets.map((entry, i) => ({
        kind: i ? "chainJump" : "chainPrimary",
        label: i ? "연쇄" : "직격",
        delayMs: i * 120,
        damageMultiplier: Math.pow(1 + config.stepDamagePct / 100, i),
        chainFromEnemyId: i ? targets[i - 1].enemy.id : null,
        targets: [{ ...entry, mult: 1 }]
      }));
    }
    uniqueStageTargets(rows) {
      return Array.from(new Map(rows.flatMap((row) => row.targets).map((entry) => [entry.enemy.id, entry])).values());
    }
    // Authored impacts chain once from their landing spot, without rewriting their original stages.
    appendAuthoredChain(rows, chain, once, world) {
      return rows.flatMap((row, index) => {
        const first = row.targets[0]?.enemy;
        if (!first || once && index) return [row];
        const plan = [], seen = new Set(row.targets.map((entry) => entry.enemy.id));
        this.nativeChain(plan, first, seen, chain, world);
        const extra = plan.map((contact) => ({
          ...row,
          kind: "supportChain",
          label: this.inputs.translate("추가 연쇄"),
          delayMs: (row.delayMs || 0) + contact.delay,
          damageMultiplier: row.damageMultiplier * contact.mult,
          chainFromEnemyId: contact.from,
          delivery: "instantTarget",
          singleRepeat: true,
          skipGridControl: true,
          targets: [{ enemy: contact.enemy, mult: 1 }]
        }));
        return [row, ...extra];
      });
    }
    repeat(command, targets) {
      const stats = command.stats, repeat = stats.sSkill.supportEffects?.repeat;
      if (!repeat) return null;
      const rows = [{
        kind: "supportRepeat",
        label: this.inputs.translate("반복"),
        delayMs: REPEAT_GAP_MS,
        damageMultiplier: (command.damagePct ?? 100) / 100 * repeat.damagePct / 100,
        targets: targets.map((enemy) => ({ enemy, mult: 1 })),
        singleRepeat: true
      }];
      return { rows, stats, options: {
        ...command.attackOptions,
        skillName: command.name,
        baseDelayMs: 0,
        forcedElement: stats.sSkill.ele,
        damageTextGroupId: command.key
      } };
    }
    // Native casts keep their own bounce/shard/movement contacts. Append only the support-owned contacts.
    augment(command, targets, world) {
      const fx = command.stats.sSkill.supportEffects, first = targets[0], seen = new Set(targets.map((enemy) => enemy.id));
      if (!fx || !first || command.noAugment) return null;
      const plan = [], id = command.stats.sSkill.nativeCastId;
      if (id !== 44 && (command.leadContact || !LANDS_ONCE.has(id))) this.nativeChain(plan, first, seen, fx.chain, world);
      this.nativeRays(plan, { source: command.sourceCell || world.gridPlayer, first }, seen, LEAPS.has(id) ? fx : { pierce: fx.pierce }, world);
      if (fx.sweep) this.nativeCandidates(first, seen, 1, world).slice(0, fx.sweep.extra).forEach((enemy) => {
        seen.add(enemy.id);
        plan.push({ enemy, mult: fx.sweep.damagePct / 100, delay: 0, from: first.id, kind: "supportSweep" });
      });
      return this.nativeExtras(command, plan);
    }
    nativeCandidates(from, seen, range, world) {
      return world.enemies.filter((enemy) => enemy.hp > 0 && !seen.has(enemy.id) && this.inputs.distance(from, enemy) <= range).sort((a, b) => this.inputs.distance(from, a) - this.inputs.distance(from, b));
    }
    nativeChain(plan, first, seen, chain, world) {
      if (!chain) return;
      let from = first;
      for (let i = 1; i <= chain.count; i++) {
        const enemy = this.nativeCandidates(from, seen, 3, world)[0];
        if (!enemy) break;
        seen.add(enemy.id);
        plan.push({ enemy, mult: Math.pow(1 + chain.stepDamagePct / 100, i), delay: i * 120, from: from.id, kind: "supportChain" });
        from = enemy;
      }
    }
    nativeRayTarget(source, first, enemy, fan) {
      const ax = first.gx - source.gx, ay = first.gy - source.gy, bx = enemy.gx - source.gx, by = enemy.gy - source.gy;
      const aim = Math.hypot(ax, ay), distance = Math.hypot(bx, by);
      if (!aim || !distance || distance > Math.max(4, aim + 2)) return false;
      const forward = (ax * bx + ay * by) / aim;
      return fan ? forward / distance >= Math.cos(Math.PI * 55 / 180) : forward > aim && Math.abs(ax * by - ay * bx) / aim <= 0.55;
    }
    nativeRays(plan, aim, seen, fx, world) {
      const { source, first } = aim;
      for (const [count, fan, kind] of [[fx.pierce, false, "supportPierce"], [fx.projectiles?.extra, true, "supportFan"]]) {
        if (!count) continue;
        this.nativeCandidates(source, seen, Math.max(4, this.inputs.distance(source, first) + 2), world).filter((enemy) => this.nativeRayTarget(source, first, enemy, fan)).slice(0, count).forEach((enemy) => {
          seen.add(enemy.id);
          plan.push({ enemy, mult: 1, delay: 80, from: first.id, kind });
        });
      }
    }
    nativeExtras(command, plan) {
      if (!plan.length) return null;
      const stats = command.stats, base = (command.bonus ? this.inputs.bonusShotDamagePct / 100 : 1) * (command.damagePct ?? 100) / 100;
      let rows = plan.map((row) => ({
        kind: row.kind,
        label: this.inputs.translate("추가 타격"),
        delayMs: row.delay,
        damageMultiplier: base * row.mult,
        chainFromEnemyId: row.from,
        delivery: "instantTarget",
        singleRepeat: true,
        skipGridControl: true,
        targets: [{ enemy: row.enemy, mult: 1 }]
      }));
      const repeat = stats.sSkill.supportEffects.repeat;
      if (repeat) rows = rows.concat(rows.map((row) => ({ ...row, delayMs: row.delayMs + REPEAT_GAP_MS, damageMultiplier: row.damageMultiplier * repeat.damagePct / 100 })));
      return { rows, stats, options: {
        ...command.attackOptions,
        skillName: command.name,
        baseDelayMs: 0,
        forcedElement: command.attackOptions?.forcedElement || stats.sSkill.ele,
        damageTextGroupId: command.key
      } };
    }
  };
  function createSupportContactPlanner(inputs) {
    const planner = new SupportContactPlanner(inputs);
    return Object.freeze({ stages: planner.stages.bind(planner), repeat: planner.repeat.bind(planner), augment: planner.augment.bind(planner) });
  }

  // modules/combat-support-runes-classic.mjs
  var shapes = createSupportAttack(window.GameModules.skills.supports);
  var contacts = createSupportContactPlanner({
    distance: (a, b) => getGridUnitDistance(a, b),
    translate: (...args) => _t(...args),
    bonusShotDamagePct: PROJECTILE_BONUS_SHOT_DAMAGE_PCT
  });
  var deps = {
    get shapes() {
      return shapes;
    },
    get contacts() {
      return contacts;
    },
    get queuePendingSkillStageHits() {
      return queuePendingSkillStageHits;
    },
    get mobilitySkill() {
      return typeof mobilitySkill === "object" ? mobilitySkill : void 0;
    },
    get getActiveSkillStats() {
      return getActiveSkillStats;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get ascendancyNodeRules() {
      return ascendancyNodeRules;
    },
    get targetMultiplier() {
      return shapes.targetMultiplier;
    },
    get shouldDeferNativeGemCast() {
      return shouldDeferNativeGemCast;
    },
    get retireDeadEnemyAttacks() {
      return retireDeadEnemyAttacks;
    },
    get performPlayerAttack() {
      return performPlayerAttack;
    },
    get handleEnemyDeath() {
      return handleEnemyDeath;
    },
    get random() {
      return Math.random;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get getEffectiveEnemyMitigation() {
      return getEffectiveEnemyMitigation;
    },
    get getZone() {
      return getZone;
    },
    get loopMutation() {
      return loopMutation;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get canUseSkillWithCurrentEquipment() {
      return canUseSkillWithCurrentEquipment;
    },
    get getGemLevelGrowthSteps() {
      return getGemLevelGrowthSteps;
    },
    get getSkillGemLevels() {
      return getSkillGemLevels;
    },
    get normalizeGemRecord() {
      return normalizeGemRecord;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get getSupportGemTier() {
      return getSupportGemTier;
    },
    get supportRules() {
      return window.GameModules.skills.supports;
    }
  };
  var env = { get owner() {
    return game;
  }, deps };
  function runSupportEffects(commands) {
    for (const command of commands) addBattleFx(...command.effect);
  }
  window.GameModules.combat = window.GameModules.combat || {};
  window.GameModules.combat.supports = Object.freeze({
    resolve(skill) {
      return liveSupportResolve(env, skill);
    },
    grid: shapes.grid,
    stages(rows, skill) {
      return liveSupportStages(env, rows, skill);
    },
    targetMultiplier: shapes.targetMultiplier,
    conversionContacts(stats, options) {
      return liveSupportConversionContacts(env, stats, options);
    },
    afterHit(enemy, stats, damage) {
      return liveSupportAfterHit(env, enemy, stats, damage);
    },
    tickDots() {
      return runSupportEffects(liveSupportTickDots(env));
    },
    onDeath(enemy) {
      return runSupportEffects(liveSupportOnDeath(env, enemy));
    },
    auraValues(state, bonus, cap) {
      return liveSupportAuraValues(env, state, bonus, cap);
    },
    values(skill, context) {
      return liveSupportValues(env, skill, context);
    },
    auraFlat(values) {
      return liveSupportAuraFlat(values);
    },
    activeBlessing(state, cap = Infinity) {
      return liveSupportActiveBlessing(env, state, cap);
    },
    blessingGreed(state) {
      return liveSupportBlessingGreed(env, state);
    },
    splitConversion: shapes.splitConversion,
    lockState: shapes.lockState,
    igniteDuration: shapes.igniteDuration,
    dealHit(enemy, stats, damage) {
      return liveSupportDealHit(env, enemy, stats, damage);
    },
    deferAttack(stats, options) {
      return liveSupportDeferAttack(env, stats, options);
    },
    retire(enemy) {
      return runSupportEffects(liveSupportRetire(env, enemy));
    },
    expectedMultiplier: shapes.expectedMultiplier,
    repeatNative(command, targets) {
      return liveSupportRepeatNative(env, command, targets);
    },
    augmentNative(command, targets) {
      return liveSupportAugmentNative(env, command, targets);
    },
    nativeDot: shapes.nativeDot,
    playerProjectile: shapes.playerProjectile,
    activeSkillStats(bonus) {
      return liveSupportActiveSkillStats(env, bonus);
    },
    grantsAttributes(state, names) {
      return liveSupportGrantsAttributes(env, state, names);
    },
    repeatGapMs: REPEAT_GAP_MS,
    repeatReleased(row) {
      return runSupportEffects(liveSupportRepeatReleased(env, row));
    }
  });
})();
