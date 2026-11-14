// GENERATED from modules/ascendancy-node-rules*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/domain/ascendancy-rule-runtime.mjs
  function ascendNodeReset(env) {
    env.cracks = [];
    env.echoes = [];
    env.currentEcho = null;
    env.rams = 0;
    env.castRamMul = 1;
    env.counterReadyAt = 0;
    env.flow = { stacks: 0, until: 0 };
    env.unyielding = { until: 0, readyAt: 0 };
    env.focus = { enemyId: null, since: 0, last: 0 };
    env.images = { count: 0, until: 0 };
    env.gale = env.NO_GALE;
    env.mosses = [];
    env.sap = 0;
    env.still = { gx: null, gy: null, since: 0 };
    env.stormAt = 0;
  }
  function ascendNodeCapture(env) {
    const echoIndex = env.echoes.indexOf(env.currentEcho);
    return env.deps.cloneSnapshot({ cracks: env.cracks, echoes: env.echoes, echoIndex, rams: env.rams, castRamMul: env.castRamMul, counterReadyAt: env.counterReadyAt, flow: env.flow, unyielding: env.unyielding, focus: env.focus, images: env.images, gale: env.gale, mosses: env.mosses, sap: env.sap, still: env.still, stormAt: env.stormAt });
  }
  function ascendNodeRestore(env, snapshot) {
    if (!snapshot) return ascendNodeReset(env);
    ascendNodeReset(env);
    const copy = env.deps.cloneSnapshot(snapshot);
    env.cracks = copy.cracks;
    env.echoes = copy.echoes;
    env.rams = copy.rams;
    env.castRamMul = copy.castRamMul;
    env.counterReadyAt = copy.counterReadyAt;
    env.flow = copy.flow;
    env.unyielding = copy.unyielding;
    env.focus = copy.focus;
    env.images = copy.images === void 0 ? env.images : copy.images;
    env.gale = copy.gale === void 0 ? env.gale : copy.gale;
    env.mosses = copy.mosses === void 0 ? env.mosses : copy.mosses;
    env.sap = copy.sap === void 0 ? env.sap : copy.sap;
    env.still = copy.still === void 0 ? env.still : copy.still;
    env.stormAt = copy.stormAt === void 0 ? env.stormAt : copy.stormAt;
    env.currentEcho = copy.echoIndex >= 0 ? env.echoes[copy.echoIndex] : null;
  }

  // modules/domain/ascendancy-rule-values.mjs
  function ascendNodeValue(env, id) {
    return env.deps.ASCENDANCY_KEYSTONE_VALUES[id];
  }
  function ascendNodeTagged(skill, tag) {
    return Array.isArray(skill && skill.tags) && skill.tags.includes(tag);
  }
  function ascendNodeLiving(enemy) {
    return !!enemy && enemy.hp > 0;
  }

  // modules/domain/ascendancy-rule-reads.mjs
  function ascendNodeFlowStacks(env, now) {
    return env.flow.until > now ? env.flow.stacks : 0;
  }
  function ascendNodeUnyieldingActive(env, now) {
    return env.unyielding.until > now;
  }
  function ascendNodeImageCount(env, now) {
    return env.images.until > now ? env.images.count : 0;
  }
  function ascendNodeOnCrack(env, enemy, now) {
    return env.deps.hasGridCell(enemy) && env.cracks.some((crack) => crack.until > now && crack.gx === enemy.gx && crack.gy === enemy.gy);
  }
  function ascendNodeDancerHitMul(env, owner, enemy, now) {
    return env.deps.hasKeystone("bd3", owner) && (Number(enemy.parryExposedUntil) || 0) > now ? 1 + ascendNodeValue(env, "bd3").takenMorePct / 100 : 1;
  }
  function ascendNodeArcherHitMul(env, owner, enemy, pStats) {
    let mul = env.gale.active ? 1 + ascendNodeValue(env, "sa3").damageMorePct / 100 : 1;
    if (!ascendNodeTagged(pStats.sSkill, "projectile") || !owner.gridPlayer || !env.deps.hasGridCell(enemy)) return mul;
    if (env.deps.hasKeystone("sa2", owner)) mul *= 1 + Math.min(ascendNodeValue(env, "sa2").maxCells, env.deps.getGridUnitDistance(owner.gridPlayer, enemy)) * ascendNodeValue(env, "sa2").pctPerCell / 100;
    if (env.deps.hasKeystone("sa8", owner) && !ascendNodeEnemyWithin(env, owner, ascendNodeValue(env, "sa8").calmCells)) mul *= 1 + ascendNodeValue(env, "sa8").calmMorePct / 100;
    return mul;
  }
  function ascendNodeEnemyWithin(env, owner, cells) {
    return (owner.enemies || []).some((enemy) => ascendNodeLiving(enemy) && env.deps.hasGridCell(enemy) && env.deps.getGridUnitDistance(owner.gridPlayer, enemy) <= cells);
  }
  function ascendNodeWardenHitMul(env, owner, enemy, now) {
    return env.deps.hasKeystone("gw1", owner) && enemy.lastHitElement === "cold" && ascendNodeOnMoss(env, enemy, now) ? 1 + ascendNodeValue(env, "gw1").coldTakenMorePct / 100 : 1;
  }
  function ascendNodeOnMoss(env, enemy, now) {
    return env.deps.hasGridCell(enemy) && env.mosses.some((moss) => moss.until > now && moss.gx === enemy.gx && moss.gy === enemy.gy);
  }
  function ascendNodeMossSlowPct(env, owner, enemy, now) {
    return env.deps.hasKeystone("gw1", owner) && ascendNodeOnMoss(env, enemy, now) ? ascendNodeValue(env, "gw1").slowPct : 0;
  }
  function ascendNodeArmorBreak(env, owner, enemy, element, now) {
    const row = enemy && enemy.armorBreak;
    return element === "phys" && env.deps.hasKeystone("w4", owner) && row && row.until > now ? row.stacks * ascendNodeValue(env, "w4").perHit : 0;
  }
  function ascendNodeBeforeHit(env, owner, damage, enemy, ...selection) {
    const [pStats, now] = selection;
    let out = damage * ascendNodeDancerHitMul(env, owner, enemy, now) * ascendNodeArcherHitMul(env, owner, enemy, pStats) * ascendNodeWardenHitMul(env, owner, enemy, now);
    if (env.deps.hasKeystone("jg1", owner) && ascendNodeOnCrack(env, enemy, now)) out *= 1 + ascendNodeValue(env, "jg1").takenMorePct / 100;
    if (env.castRamMul !== 1 && ascendNodeTagged(pStats.sSkill, "slam")) out *= env.castRamMul;
    return out;
  }
  function ascendNodeRooted(env, owner, now) {
    return env.deps.hasKeystone("gw6", owner) && env.still.gx !== null && now - env.still.since >= ascendNodeValue(env, "gw6").stillMs;
  }
  function ascendNodePoisonHeld(env, owner, enemy) {
    return env.deps.hasKeystone("gw5", owner) && (enemy.ailments || []).some((row) => row && (row.type === "chill" || row.type === "freeze") && (row.time || 0) > 0);
  }
  function ascendNodeAilmentStep(ail, held, dt) {
    return held && ail.type === "poison" ? 0 : dt;
  }
  function ascendNodeDotMultiplier(env, owner, now) {
    const guard = owner.playerUniqueGuard;
    return env.deps.hasKeystone("gw8", owner) && guard && (guard.amount || 0) > 0 && now < (guard.expiresAt || 0) ? 1 + ascendNodeValue(env, "gw8").dotMorePct / 100 : 1;
  }
  function ascendNodeSummonHitMultiplier(env, owner, pStats) {
    if (!env.deps.hasKeystone("sb8", owner)) return 1;
    const alive = (owner.summons || []).filter((summon) => summon && summon.alive && summon.hp > 0).length;
    return 1 + Math.max(0, env.deps.getSummonRuntimeCap(pStats) - alive) * ascendNodeValue(env, "sb8").perEmptyPct / 100;
  }

  // modules/domain/ascendancy-rule-attacks.mjs
  function ascendNodeOnAttack(env, owner, pStats, now) {
    if (env.deps.hasKeystone("bd1", owner)) env.flow = { stacks: Math.min(ascendNodeValue(env, "bd1").maxStacks, ascendNodeFlowStacks(env, now) + 1), until: now + ascendNodeValue(env, "bd1").idleMs };
    env.currentEcho = ascendNodeRollPotionEcho(env, owner, pStats, now);
    env.castRamMul = ascendNodeLoadRams(env, owner, pStats);
    env.gale = ascendNodeNextGale(env, owner, pStats);
  }
  function ascendNodeLoadRams(env, owner, pStats) {
    if (!env.deps.hasKeystone("jg2", owner) || !ascendNodeTagged(pStats.sSkill, "slam")) return 1;
    const mul = 1 + env.rams * ascendNodeValue(env, "jg2").pctPerStack / 100;
    env.rams = 0;
    return mul;
  }
  function ascendNodeRollPotionEcho(env, owner, pStats, now) {
    if (!env.deps.hasKeystone("bm4", owner) || !ascendNodeTagged(pStats.sSkill, "potion") || env.deps.ascendancyRandom() * 100 >= ascendNodeValue(env, "bm4").chance) return null;
    const echo = { rolledAt: now, at: 0, hits: [] };
    env.echoes.push(echo);
    return echo;
  }
  function ascendNodeNextGale(env, owner, pStats) {
    if (!env.deps.hasKeystone("sa3", owner)) return env.NO_GALE;
    if (ascendNodeTagged(pStats.sSkill, "mobility")) return { charges: ascendNodeValue(env, "sa3").shots, active: false, splashed: false };
    return env.gale.charges > 0 ? { charges: env.gale.charges - 1, active: true, splashed: false } : env.NO_GALE;
  }
  function ascendNodeStoreArmorBlow(env, owner, pStats, physicalPortion) {
    if (env.deps.hasKeystone("jg2", owner) && physicalPortion > 0) env.rams = Math.min(ascendNodeValue(env, "jg2").maxStacks, env.rams + 1);
  }
  function ascendNodeBlastMultiplier(env, owner, pStats, count) {
    if (!env.deps.hasKeystone("bm2", owner) || !ascendNodeTagged(pStats.sSkill, "aoe")) return 1;
    return 1 + Math.min(ascendNodeValue(env, "bm2").maxEnemies, Math.max(0, Number(count) || 0)) * ascendNodeValue(env, "bm2").pctPerEnemy / 100;
  }

  // modules/domain/ascendancy-rule-defense.mjs
  function* ascendNodeOnLifeDrop(env, owner, pStats, before, ...selection) {
    const [after, now] = selection;
    const next = ascendNodeDrainSap(env, owner, before, after);
    if (!env.deps.hasKeystone("w7", owner) || next <= 0 || now < env.unyielding.readyAt) return next;
    const half = Math.max(1, Number(pStats.maxHp) || 1) * 0.5;
    if (before <= half || next > half) return next;
    env.unyielding = { until: now + ascendNodeValue(env, "w7").burstMs, readyAt: now + ascendNodeValue(env, "w7").cooldownMs };
    yield { kind: "ascendancyFx", args: ["statusText", { text: env.deps._t("불굴"), color: "#ffcf8a", duration: 700, bodyCue: true }] };
    return next;
  }
  function ascendNodeDrainSap(env, owner, before, after) {
    if (!env.deps.hasKeystone("gw3", owner) || env.sap <= 0 || after >= before) return after;
    const soaked = Math.min(env.sap, before - after);
    env.sap -= soaked;
    return Math.floor(after + soaked);
  }
  function ascendNodeFillSap(env, owner, pStats) {
    if (!env.deps.hasKeystone("gw3", owner) || !(owner.playerHp > 0) || owner.playerHp < env.deps.getPlayerRecoveryHpCap(pStats)) return;
    const maxHp = Number(pStats.maxHp) || 0;
    env.sap = Math.min(maxHp * ascendNodeValue(env, "gw3").sapMaxPct / 100, env.sap + maxHp * (Number(pStats.regen) || 0) / 100 * 0.1);
  }
  function* ascendNodeCounter(env, owner, pStats, enemy, ...selection) {
    const [kind, now] = selection;
    if (kind === "evade" && env.deps.hasKeystone("bd2", owner)) env.images = { count: Math.min(ascendNodeValue(env, "bd2").maxImages, ascendNodeImageCount(env, now) + 1), until: now + ascendNodeValue(env, "bd2").lifeMs };
    if (kind === "deflect" && env.deps.hasKeystone("bd3", owner) && ascendNodeLiving(enemy)) Object.assign(enemy, { parryExposedUntil: now + ascendNodeValue(env, "bd3").exposeMs, parryStaggerUntil: now + ascendNodeValue(env, "bd3").staggerMs });
    const id = kind === "deflect" ? "bd6" : "bd5";
    if (!env.deps.hasKeystone(id, owner) || !ascendNodeLiving(enemy) || now < env.counterReadyAt) return;
    env.counterReadyAt = now + ascendNodeValue(env, id).icdMs;
    yield* ascendNodeStrikeBack(env, owner, pStats, enemy, ascendNodeValue(env, id).counterPct);
  }
  function* ascendNodeStrikeBack(env, owner, pStats, enemy, pct) {
    const ele = pStats.sSkill && pStats.sSkill.ele || "phys";
    const dealt = env.deps.applyDamageToEnemyResource(enemy, ascendNodeMitigatedBlow(env, owner, pStats, enemy, ele, pct));
    yield { kind: "ascendancyFx", args: ["hit", { enemyId: enemy.id, color: env.deps.getElementColor(ele), damage: dealt, duration: 240, element: ele, syncToSwing: false }] };
    yield { kind: "ascendancyFx", args: ["statusText", { enemyId: enemy.id, text: env.deps._t("반격"), color: "#d6f0ff", duration: 600 }] };
    if (enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, pStats);
  }
  function ascendNodeMitigatedBlow(env, owner, pStats, enemy, ...selection) {
    const [ele, pct] = selection;
    const res = env.deps.getEffectiveEnemyMitigation(ele, (env.deps.getZone(owner.currentZoneId) || {}).tier || 1, enemy, pStats);
    return Math.max(1, Math.floor((pStats.baseDmg || 1) * pct / 100 * (1 - res / 100)));
  }

  // modules/domain/ascendancy-rule-hits.mjs
  function* ascendNodeAfterHit(env, owner, pStats, enemy, ...selection) {
    const [dealt, now] = selection;
    if (!(dealt > 0) || !env.deps.hasGridCell(enemy)) return;
    const element = enemy.lastHitElement || "phys";
    if (element === "phys" && env.deps.hasKeystone("w4", owner)) ascendNodeStackArmorBreak(env, owner, enemy, now);
    if (env.deps.hasKeystone("bz5", owner)) ascendNodeKeepFocus(env, owner, enemy, now);
    if (env.deps.hasKeystone("jg1", owner) && ascendNodeTagged(pStats.sSkill, "slam")) env.cracks.push({ gx: enemy.gx, gy: enemy.gy, until: now + ascendNodeValue(env, "jg1").crackMs });
    if (env.currentEcho) ascendNodeNoteEchoHit(env, env.currentEcho, enemy, dealt, element, now);
    yield* ascendNodeAfterHitRedesigned(env, owner, pStats, enemy, dealt, element, now);
  }
  function* ascendNodeAfterHitRedesigned(env, owner, pStats, enemy, ...selection) {
    const [dealt, element, now] = selection;
    if (ascendNodeImageCount(env, now) > 0) yield* ascendNodeReleaseImages(env, enemy, dealt, element, now);
    if (env.gale.active && !env.gale.splashed) yield* ascendNodeSplashGale(env, owner, pStats, enemy, dealt, element);
    if (element === "cold" && env.deps.hasKeystone("gw1", owner)) ascendNodeLayMoss(env, enemy, now);
  }
  function* ascendNodeReleaseImages(env, enemy, dealt, element, now) {
    const blow = Math.max(1, Math.floor(dealt * ascendNodeValue(env, "bd2").perImagePct / 100 * ascendNodeImageCount(env, now)));
    env.images = { count: 0, until: 0 };
    const extra = env.deps.applyDamageToEnemyResource(enemy, blow);
    yield { kind: "ascendancyFx", args: ["hit", { enemyId: enemy.id, color: "#cfe6ff", damage: extra, duration: 260, element, syncToSwing: false }] };
    yield { kind: "ascendancyFx", args: ["statusText", { enemyId: enemy.id, text: env.deps._t("잔상"), color: "#cfe6ff", duration: 600 }] };
  }
  function* ascendNodeSplashGale(env, owner, pStats, enemy, ...selection) {
    const [dealt, element] = selection;
    env.gale = { ...env.gale, splashed: true };
    const near = (owner.enemies || []).filter((other) => other !== enemy && ascendNodeLiving(other) && env.deps.hasGridCell(other) && env.deps.getGridUnitDistance(enemy, other) <= ascendNodeValue(env, "sa3").splashCells).sort((a, b) => env.deps.getGridUnitDistance(enemy, a) - env.deps.getGridUnitDistance(enemy, b))[0];
    if (!near) return;
    const hit = env.deps.applyDamageToEnemyResource(near, dealt);
    yield { kind: "ascendancyFx", args: ["hit", { enemyId: near.id, color: "#bfefff", damage: hit, duration: 240, element, syncToSwing: false }] };
    if (near.hp <= 0) env.deps.handleEnemyDeath(near, pStats);
  }
  function ascendNodeLayMoss(env, enemy, now) {
    env.mosses = env.mosses.filter((moss) => moss.gx !== enemy.gx || moss.gy !== enemy.gy);
    env.mosses.push({ gx: enemy.gx, gy: enemy.gy, until: now + ascendNodeValue(env, "gw1").mossMs });
  }
  function ascendNodeStackArmorBreak(env, owner, enemy, now) {
    const v = ascendNodeValue(env, "w4"), stacks = ascendNodeArmorBreak(env, owner, enemy, "phys", now) / v.perHit;
    enemy.armorBreak = { stacks: Math.min(v.maxStacks, stacks + 1), until: now + v.durationMs };
  }
  function ascendNodeKeepFocus(env, owner, enemy, now) {
    if (env.focus.enemyId !== enemy.id || now - env.focus.last > 1e3) env.focus = { enemyId: enemy.id, since: now, last: now };
    env.focus.last = now;
    if (now - env.focus.since >= ascendNodeValue(env, "bz5").focusMs) owner.uniqueLeechEfficiencyUntil = Math.max(Number(owner.uniqueLeechEfficiencyUntil) || 0, now + 1e3);
  }
  function ascendNodeNoteEchoHit(env, echo, enemy, dealt, ...selection) {
    const [element, now] = selection;
    if (!echo.at) echo.at = now + ascendNodeValue(env, "bm4").delayMs;
    echo.hits.push({ enemyId: enemy.id, gx: enemy.gx, gy: enemy.gy, damage: dealt, element });
  }

  // modules/domain/ascendancy-rule-ticks.mjs
  function* ascendNodeTick(env, owner, pStats, now) {
    env.cracks = env.cracks.filter((crack) => crack.until > now);
    env.mosses = env.mosses.filter((moss) => moss.until > now);
    ascendNodeNoteStillness(env, owner, now);
    ascendNodeFillSap(env, owner, pStats);
    if (env.deps.hasKeystone("sa8", owner) && now >= env.stormAt) yield* ascendNodeStrikeStorm(env, owner, pStats, now);
    if (!env.echoes.length) return;
    const due = env.echoes.filter((echo) => echo.at && echo.at <= now);
    env.echoes = env.echoes.filter((echo) => !due.includes(echo) && (echo.at || now - echo.rolledAt < env.ECHO_WAIT_MS));
    for (const echo of due) yield* ascendNodeBurst(env, owner, echo, pStats);
  }
  function ascendNodeNoteStillness(env, owner, now) {
    const at = owner.gridPlayer || {};
    const moving = typeof env.deps.mobilitySkill === "object" && env.deps.mobilitySkill.moving();
    if (moving || env.still.gx !== at.gx || env.still.gy !== at.gy) env.still = { gx: at.gx, gy: at.gy, since: now };
  }
  function* ascendNodeStrikeStorm(env, owner, pStats, now) {
    env.stormAt = now + ascendNodeValue(env, "sa8").stormEveryMs;
    if (!owner.gridPlayer) return;
    const shockStats = { ...pStats, sSkill: { ...pStats.sSkill || {}, ele: "light" } };
    const targets = (owner.enemies || []).filter((enemy) => ascendNodeLiving(enemy) && env.deps.hasGridCell(enemy) && env.deps.getGridUnitDistance(owner.gridPlayer, enemy) <= ascendNodeValue(env, "sa8").calmCells);
    for (const enemy of targets) {
      const dealt = env.deps.applyDamageToEnemyResource(enemy, ascendNodeMitigatedBlow(env, owner, pStats, enemy, "light", ascendNodeValue(env, "sa8").stormPct));
      yield { kind: "ascendancyFx", args: ["hit", { enemyId: enemy.id, color: env.deps.getElementColor("light"), damage: dealt, duration: 240, element: "light", syncToSwing: false }] };
      if (enemy.hp > 0) env.deps.applyEnemyAilmentFromHit(enemy, shockStats, dealt, false);
      else env.deps.handleEnemyDeath(enemy, pStats);
    }
  }
  function* ascendNodeBurst(env, owner, echo, pStats) {
    const element = echo.hits[0].element;
    const first = (owner.enemies || []).find((enemy) => ascendNodeLiving(enemy) && enemy.id === echo.hits[0].enemyId);
    if (first) yield { kind: "ascendancyFx", args: ["statusText", { enemyId: first.id, text: env.deps._t("이중 폭발"), color: "#ffb36b", duration: 700 }] };
    const targets = (owner.enemies || []).filter((enemy) => ascendNodeLiving(enemy) && env.deps.hasGridCell(enemy));
    for (const enemy of targets) {
      const damage = echo.hits.reduce((best, hit) => env.deps.getGridUnitDistance(hit, enemy) <= 1 ? Math.max(best, hit.damage) : best, 0);
      if (damage <= 0) continue;
      const dealt = env.deps.applyDamageToEnemyResource(enemy, damage);
      yield { kind: "ascendancyFx", args: ["hit", { enemyId: enemy.id, color: env.deps.getElementColor(element), damage: dealt, duration: 260, element, syncToSwing: false }] };
      if (enemy.hp <= 0) env.deps.handleEnemyDeath(enemy, pStats);
    }
  }

  // modules/domain/ascendancy-rule-summons.mjs
  function ascendNodeStoreSharedBlow(env, owner, summon, taken) {
    if (env.deps.hasKeystone("sb2", owner) && taken > 0) summon.sharedBlow = (Number(summon.sharedBlow) || 0) + taken * ascendNodeValue(env, "sb2").storePct / 100;
  }
  function ascendNodeTakeSharedBlow(summon) {
    const stored = Math.floor(Number(summon.sharedBlow) || 0);
    summon.sharedBlow = 0;
    return stored;
  }
  function ascendNodeOnSummonKill(env, owner, pStats) {
    if (!env.deps.hasKeystone("sb3", owner)) return;
    const v = ascendNodeValue(env, "sb3"), es = Math.max(0, Number(pStats.energyShield) || 0);
    owner.playerHp = Math.min(env.deps.getPlayerRecoveryHpCap(pStats), (owner.playerHp || 0) + (pStats.maxHp || 0) * v.healPct / 100);
    owner.playerEnergyShield = Math.min(es, (owner.playerEnergyShield || 0) + es * v.healPct / 100);
    const fallen = (owner.summons || []).filter((summon) => summon && !summon.alive && summon.respawnAt).sort((a, b) => a.respawnAt - b.respawnAt)[0];
    if (fallen) fallen.respawnAt -= v.reviveMs;
  }

  // modules/domain/ascendancy-node-rules.mjs
  function createAscendancyNodeRules(deps) {
    const env = { deps };
    env.ECHO_WAIT_MS = 3e3;
    env.NO_GALE = Object.freeze({ charges: 0, active: false, splashed: false });
    ascendNodeReset(env);
    return Object.freeze({
      reset: (...args) => ascendNodeReset(env, ...args),
      capture: (...args) => ascendNodeCapture(env, ...args),
      restore: (...args) => ascendNodeRestore(env, ...args),
      onAttack: (...args) => ascendNodeOnAttack(env, ...args),
      flowStacks: (...args) => ascendNodeFlowStacks(env, ...args),
      unyieldingActive: (...args) => ascendNodeUnyieldingActive(env, ...args),
      onLifeDrop: (...args) => ascendNodeOnLifeDrop(env, ...args),
      storeArmorBlow: (...args) => ascendNodeStoreArmorBlow(env, ...args),
      counter: (...args) => ascendNodeCounter(env, ...args),
      beforeHit: (...args) => ascendNodeBeforeHit(env, ...args),
      mossSlowPct: (...args) => ascendNodeMossSlowPct(env, ...args),
      armorBreak: (...args) => ascendNodeArmorBreak(env, ...args),
      afterHit: (...args) => ascendNodeAfterHit(env, ...args),
      blastMultiplier: (...args) => ascendNodeBlastMultiplier(env, ...args),
      tick: (...args) => ascendNodeTick(env, ...args),
      rooted: (...args) => ascendNodeRooted(env, ...args),
      poisonHeld: (...args) => ascendNodePoisonHeld(env, ...args),
      ailmentStep: ascendNodeAilmentStep,
      dotMultiplier: (...args) => ascendNodeDotMultiplier(env, ...args),
      summonHitMultiplier: (...args) => ascendNodeSummonHitMultiplier(env, ...args),
      storeSharedBlow: (...args) => ascendNodeStoreSharedBlow(env, ...args),
      takeSharedBlow: ascendNodeTakeSharedBlow,
      onSummonKill: (...args) => ascendNodeOnSummonKill(env, ...args)
    });
  }

  // modules/ascendancy-node-rules-classic.mjs
  var rules = createAscendancyNodeRules({
    cloneSnapshot: (value) => structuredClone(value),
    get ASCENDANCY_KEYSTONE_VALUES() {
      return ASCENDANCY_KEYSTONE_VALUES;
    },
    get hasKeystone() {
      return hasKeystone;
    },
    ascendancyRandom: () => Math.random(),
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get getSummonRuntimeCap() {
      return getSummonRuntimeCap;
    },
    get _t() {
      return _t;
    },
    get getPlayerRecoveryHpCap() {
      return getPlayerRecoveryHpCap;
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
    get getEffectiveEnemyMitigation() {
      return getEffectiveEnemyMitigation;
    },
    get getZone() {
      return getZone;
    },
    get mobilitySkill() {
      return typeof mobilitySkill === "undefined" ? void 0 : mobilitySkill;
    },
    get applyEnemyAilmentFromHit() {
      return applyEnemyAilmentFromHit;
    }
  });
  var effects = { get ascendancyFx() {
    return addBattleFx.bind(void 0);
  } };
  var ascendancyNodeRules = Object.freeze({
    reset: rules.reset,
    capture: rules.capture,
    restore: rules.restore,
    onAttack: (...args) => rules.onAttack(game, ...args),
    flowStacks: rules.flowStacks,
    unyieldingActive: rules.unyieldingActive,
    onLifeDrop: (...args) => consumeDomainCommands(rules.onLifeDrop(game, ...args), effects),
    storeArmorBlow: (...args) => rules.storeArmorBlow(game, ...args),
    counter: (...args) => consumeDomainCommands(rules.counter(game, ...args), effects),
    beforeHit: (...args) => rules.beforeHit(game, ...args),
    mossSlowPct: (...args) => rules.mossSlowPct(game, ...args),
    armorBreak: (...args) => rules.armorBreak(game, ...args),
    afterHit: (...args) => consumeDomainCommands(rules.afterHit(game, ...args), effects),
    blastMultiplier: (...args) => rules.blastMultiplier(game, ...args),
    tick: (...args) => consumeDomainCommands(rules.tick(game, ...args), effects),
    rooted: (...args) => rules.rooted(game, ...args),
    poisonHeld: (...args) => rules.poisonHeld(game, ...args),
    ailmentStep: rules.ailmentStep,
    dotMultiplier: (...args) => rules.dotMultiplier(game, ...args),
    summonHitMultiplier: (...args) => rules.summonHitMultiplier(game, ...args),
    storeSharedBlow: (...args) => rules.storeSharedBlow(game, ...args),
    takeSharedBlow: rules.takeSharedBlow,
    onSummonKill: (...args) => rules.onSummonKill(game, ...args)
  });
  safeExposeGlobals({ ascendancyNodeRules });
})();
