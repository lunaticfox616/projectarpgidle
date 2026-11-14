// GENERATED from modules/region-affix-effects*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/region-affix-procs.mjs
  var SPREADS = Object.freeze([
    ["poison", "regionPoisonSpread", "독 번짐", "chaos"],
    ["shock", "regionShockSpread", "감전 번짐", "light"],
    ["ignite", "regionIgniteSpread", "불씨 옮김", "fire"]
  ]);
  function regionNearby(env2, source, range) {
    return (env2.owner.enemies || []).filter((target) => target && target.id !== source.id && target.hp > 0).map((target) => ({ target, distance: env2.deps.getGridUnitDistance(source, target) })).filter((row) => row.distance <= range).sort((a, b) => a.distance - b.distance).map((row) => row.target);
  }
  function* regionStrike(env2, target, pStats, { element, raw, from }) {
    const tier = (env2.deps.getZone(env2.owner.currentZoneId) || {}).tier || 1;
    const damage = Math.floor(Math.max(1, Math.floor(raw * (1 - env2.deps.getEffectiveEnemyMitigation(element, tier, target, pStats) / 100))) * env2.deps.loopMutation.takenMul(target, element));
    env2.deps.applyDamageToEnemyResource(target, damage);
    yield { kind: "addBattleFx", args: ["hit", {
      enemyId: target.id,
      color: env2.deps.getElementColor(element),
      damage,
      element,
      ...from ? { stageKind: "chainJump", chainFromEnemyId: from.id } : {}
    }] };
    if (target.hp <= 0) env2.deps.handleEnemyDeath(target, pStats);
  }
  function* regionChainLightning(env2, pStats, enemy, hit) {
    const chance = env2.stats.value(pStats, "regionShockChain");
    if (chance <= 0 || Math.random() * 100 >= chance) return;
    const target = regionNearby(env2, enemy, env2.rules.chainRange)[0];
    if (target) yield* regionStrike(env2, target, pStats, { element: "light", raw: env2.stats.num(hit.damage) * env2.rules.chainDamagePct / 100, from: enemy });
  }
  function* regionAfterHit(env2, pStats, enemy, hit) {
    if (!enemy || !pStats || !pStats.regionAffix) return;
    env2.stats.stackChaosShred(pStats, enemy);
    if (env2.stats.hasAilment(enemy, "shock")) yield* regionChainLightning(env2, pStats, enemy, hit);
    const move = env2.stats.value(pStats, "regionCritMove");
    if (hit.crit && move > 0) env2.owner.regionCritMove = { pct: move, until: env2.deps.getCombatTime() + env2.rules.critMoveMs };
    const leech = env2.stats.hasAilment(enemy, "poison") ? env2.stats.value(pStats, "regionPoisonedLeech") : 0;
    if (leech > 0 && env2.stats.num(hit.damage) > 0)
      env2.deps.addPlayerLeechInstance(env2.stats.num(hit.damage) * leech / 100, pStats, env2.deps.getPlayerHitLeechTarget(pStats));
  }
  function* regionSpreadAilment(env2, enemy, pStats, [type, id, text, element]) {
    const share = env2.stats.value(pStats, id) / 100, row = share > 0 ? env2.stats.activeRow(enemy, type) : null;
    const copy = row && env2.deps.cloneEnemyAilmentForSpread(row, pStats);
    if (!copy) return;
    copy.power *= share;
    if (copy.sourceHitDamage) copy.sourceHitDamage = Math.floor(copy.sourceHitDamage * share);
    if (copy.ailmentDotScore) copy.ailmentDotScore *= share;
    const targets = regionNearby(env2, enemy, env2.rules.spreadRange);
    targets.forEach((target) => env2.deps.mergeEnemyAilment(target, { ...copy }, pStats));
    if (targets.length) yield { kind: "addBattleFx", args: ["statusText", {
      enemyId: enemy.id,
      text,
      color: env2.deps.getElementColor(element),
      duration: 320,
      dedupeKey: `region-spread-${type}`
    }] };
  }
  function* regionShatter(env2, enemy, pStats) {
    const pct = env2.stats.value(pStats, "regionShatter");
    if (pct <= 0 || !env2.stats.hasAilment(enemy, "freeze")) return;
    const raw = Math.floor(env2.stats.num(enemy.maxHp) * pct / 100);
    const targets = regionNearby(env2, enemy, env2.rules.shatterRange);
    for (const target of targets) yield* regionStrike(env2, target, pStats, { element: "cold", raw, from: null });
  }
  function* regionOnEnemyDeath(env2, enemy, pStats) {
    if (!enemy || !pStats || !pStats.regionAffix) return;
    for (const spread of SPREADS) yield* regionSpreadAilment(env2, enemy, pStats, spread);
    yield* regionShatter(env2, enemy, pStats);
  }

  // modules/region-affix-effects-classic.mjs
  var stats = window.GameModules.combat.resources.regionAffixes;
  var env = { get owner() {
    return game;
  }, stats, rules: REGION_AFFIX_EFFECTS, deps: {
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get getZone() {
      return getZone;
    },
    get getEffectiveEnemyMitigation() {
      return getEffectiveEnemyMitigation;
    },
    get loopMutation() {
      return loopMutation;
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get getElementColor() {
      return getElementColor;
    },
    get handleEnemyDeath() {
      return handleEnemyDeath;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get addPlayerLeechInstance() {
      return addPlayerLeechInstance;
    },
    get getPlayerHitLeechTarget() {
      return getPlayerHitLeechTarget;
    },
    get cloneEnemyAilmentForSpread() {
      return cloneEnemyAilmentForSpread;
    },
    get mergeEnemyAilment() {
      return mergeEnemyAilment;
    }
  } };
  function runCommands(commands) {
    let step = commands.next();
    while (!step.done) step = commands.next(addBattleFx(...step.value.args));
    return step.value;
  }
  var regionAffixEffects = Object.freeze({
    collect(sum) {
      return stats.collect(sum);
    },
    resistanceShred(pStats, enemy, element) {
      return stats.resistanceShred(pStats, enemy, element);
    },
    damageMultiplier(pStats, enemy, element, isCrit) {
      return stats.damageMultiplier(pStats, enemy, element, isCrit, game);
    },
    afterHit(pStats, enemy, hit) {
      return runCommands(regionAfterHit(env, pStats, enemy, hit));
    },
    extraAilmentChances(pStats) {
      return stats.extraAilmentChances(pStats);
    },
    ailmentDurationMultiplier(pStats, type) {
      return stats.ailmentDurationMultiplier(pStats, type);
    },
    onEnemyDeath(enemy, pStats) {
      return runCommands(regionOnEnemyDeath(env, enemy, pStats));
    },
    onBlock(pStats, now) {
      return stats.onBlock(pStats, now, game);
    },
    consumeBlockEmpower(now) {
      return stats.consumeBlockEmpower(now, game);
    },
    takenDamageMultiplier(pStats, attacker) {
      return stats.takenDamageMultiplier(pStats, attacker, game);
    },
    moveBonus(now) {
      return stats.moveBonus(now, game);
    },
    hasAilment: stats.hasAilment
  });
  safeExposeGlobals({ regionAffixEffects });
})();
