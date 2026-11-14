// GENERATED from modules/combat-enemy-build*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/enemy-entry-tuning.mjs
  var ENTRY_BOSS_EASING = /* @__PURE__ */ Object.freeze({
    underworld: /* @__PURE__ */ Object.freeze([/* @__PURE__ */ Object.freeze({ hp: 0.81, damage: 0.74 })]),
    skyTower: /* @__PURE__ */ Object.freeze([
      /* @__PURE__ */ Object.freeze({ hp: 0.81, damage: 0.3 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.85, damage: 0.45 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.89, damage: 0.6 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.92, damage: 0.75 }),
      /* @__PURE__ */ Object.freeze({ hp: 0.96, damage: 0.9 })
    ])
  });
  var UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER = 0.85;
  var UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER = 0.82;

  // modules/combat/core-values.mjs
  var COMBAT_TACTIC_TARGET_LOCK_MS = 750;
  var COMBAT_TACTIC_STALL_MS = 2e3;
  var COMBAT_TACTIC_MAX_RETREATS = 2;

  // modules/combat/player-targets.mjs
  function buildAddUncappedSkillTargets(env2, skill, name) {
    skill.targets = Math.max(1, (skill.targets || 1) + Math.max(0, Math.floor(Number(skill.engraveTargets) || 0)));
    env2.deps.skillEffectExpansion.applyToSkill(skill, name);
  }
  function buildGetSkillTargetPreference(env2, tactics, now) {
    const locked = env2.deps.actExplorationState.lockedEnemy(env2.deps.actExplorationState.current(env2.owner));
    if (!tactics && !locked) return null;
    const held = tactics && now < env2.runtime.combatTacticsRuntime.targetLockedUntil ? env2.runtime.combatTacticsRuntime.targetId : null;
    return { targetPriority: tactics ? tactics.targetPriority : void 0, preferredEnemyId: locked ? locked.id : held };
  }
  function buildSelectCombatGemTargets(env2, name, skill, source, { enemies, options }) {
    if (skill.nativeCastId) return env2.deps.skillGemCasts.targets(skill.nativeCastId, source, enemies, env2.deps.skillEffectExpansion.extra(skill)).map((enemy) => ({ enemy, mult: 1 }));
    const dormant = options && options.dormant;
    if (!dormant || !dormant.length) return env2.deps.selectGridSkillTargets(name, skill, source, enemies, options);
    return env2.deps.selectGridSkillTargets(name, skill, source, enemies.concat(dormant), { ...options, splashOnly: new Set(dormant) });
  }
  function buildGetSplashDormantEnemies(env2) {
    return env2.deps.actExplorationState.dormantNear(env2.owner, env2.owner.gridPlayer, env2.deps.ACT_EXPLORATION_VISION.splashReach);
  }
  function buildGetAttackTargets(env2, pStats) {
    let targets = buildGetSkillTargets(env2, pStats, buildGetSplashDormantEnemies(env2));
    env2.deps.actExplorationState.wake(env2.owner, targets.map((hit) => hit.enemy));
    return targets;
  }
  function buildGetSkillTargets(env2, pStats, dormant = []) {
    let living = (env2.owner.enemies || []).filter((enemy) => enemy.hp > 0);
    let alive = living.filter((enemy) => env2.deps.actExplorationState.inSight(enemy));
    if (alive.length === 0) return [];
    env2.deps.ensureCombatGridRuntime();
    let skill = skillWithFanShots(pStats);
    let now = env2.deps.getCombatTime();
    let tactics = env2.owner.combatTacticsUnlocked ? env2.deps.resolveConditionalCombatTactics(env2.deps.normalizeCombatTacticsSettings(env2.owner.settings), pStats, env2.owner, now) : null;
    let options = buildGetSkillTargetPreference(env2, tactics, now);
    let unseen = living.filter((enemy) => !alive.includes(enemy));
    let targets = buildSelectCombatGemTargets(env2, env2.owner.activeSkill, skill, env2.owner.gridPlayer, { enemies: alive, options: { ...options, dormant: dormant.concat(unseen) } });
    if (tactics && targets.length > 0 && String(targets[0].enemy.id) !== String(env2.runtime.combatTacticsRuntime.targetId)) {
      env2.runtime.combatTacticsRuntime.targetId = targets[0].enemy.id;
      env2.runtime.combatTacticsRuntime.targetLockedUntil = now + COMBAT_TACTIC_TARGET_LOCK_MS;
    }
    return targets;
  }
  function skillWithFanShots(pStats) {
    const skill = pStats.sSkill, pattern = skill && skill.projectilePattern;
    if (!pattern || pattern.kind !== "fan" || !(pStats.projectileExtraShots > 0)) return skill;
    const rays = Math.min(8, Math.max(1, Math.floor(pattern.rays || 1)) + Math.floor(pStats.projectileExtraShots));
    return { ...skill, targets: rays, projectilePattern: { ...pattern, rays } };
  }

  // modules/combat/player-skill-mobility.mjs
  function buildMovePlayerForCharge(env2, target, maxCells) {
    env2.deps.actExplorationMotion.cancel(env2.owner.actExploration);
    let origin = env2.deps.copyCombatGridCell(env2.owner.gridPlayer);
    let moved = false;
    for (let step = 0; step < maxCells; step++) {
      if (env2.deps.getGridUnitDistance(env2.owner.gridPlayer, target) <= 1) break;
      if (!env2.deps.gridStepToward(env2.owner.gridPlayer, target.gx, target.gy, env2.deps.getGridBlockedCells(env2.owner.gridPlayer))) break;
      moved = true;
    }
    return moved ? origin : null;
  }
  function buildMovePlayerForBlink(env2, target) {
    if (env2.deps.getGridUnitDistance(env2.owner.gridPlayer, target) <= 1) return null;
    let destination = env2.deps.findFreeGridCell(env2.deps.getGridBlockedCells(env2.owner.gridPlayer), target);
    if (!destination || env2.deps.getGridUnitDistance(destination, target) > 1) return null;
    let origin = env2.deps.copyCombatGridCell(env2.owner.gridPlayer);
    if (origin && origin.gx === destination.gx && origin.gy === destination.gy) return null;
    env2.deps.actExplorationMotion.cancel(env2.owner.actExploration);
    env2.owner.gridPlayer.gx = destination.gx;
    env2.owner.gridPlayer.gy = destination.gy;
    return origin;
  }
  function* buildBeginSkillMobility(env2, pStats, target, isStageReplay) {
    const moved = !isStageReplay && (yield* buildApplySkillMobilityBeforeAttack(env2, pStats.sSkill, target, pStats));
    const landingMs = moved ? Math.max(0, Number(pStats.sSkill.mobilityPattern.airMs) || 0) : 0;
    return { landingMs, kickoff: moved && buildIsKickoffBlink(pStats.sSkill.mobilityPattern) };
  }
  function* buildApplySkillMobilityBeforeAttack(env2, skill, target, pStats) {
    let pattern = skill && skill.mobilityPattern;
    if (!pattern || !target || !env2.deps.hasGridCell(target) || !env2.deps.hasGridCell(env2.owner.gridPlayer)) return false;
    let maxCells = Math.max(1, Math.min(6, Math.floor(Number(pattern.maxCells) || 1)));
    let origin = pattern.kind === "blink" ? buildMovePlayerForBlink(env2, target) : buildMovePlayerForCharge(env2, target, maxCells);
    if (!origin) return false;
    holdAttackAfterSkillMove(env2, pStats);
    yield { kind: "addBattleFx", args: ["playerMobility", {
      skillName: env2.owner.activeSkill,
      fromCell: origin,
      toCell: env2.deps.copyCombatGridCell(env2.owner.gridPlayer),
      duration: pattern.kind === "blink" ? 180 : 280,
      kickoff: buildIsKickoffBlink(pattern)
    }] };
    return true;
  }
  function holdAttackAfterSkillMove(env2, pStats) {
    const moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    const delayMs = env2.deps.getTacticalMoveAttackDelayMs(moveSpeed);
    env2.runtime.combatTacticsRuntime.attackDelayUntil = Math.max(env2.runtime.combatTacticsRuntime.attackDelayUntil, env2.deps.getCombatTime() + delayMs);
  }
  function buildIsKickoffBlink(pattern) {
    return pattern.kind === "blink" && !(Number(pattern.airMs) > 0);
  }

  // modules/combat/player-tactical-move.mjs
  function buildGetPlayerTacticalMovePlan(env2, pStats, target) {
    let tactics = env2.deps.resolveConditionalCombatTactics(env2.deps.normalizeCombatTacticsSettings(env2.owner.settings), pStats, env2.owner, env2.deps.getCombatTime());
    let profile = env2.deps.getSkillGridProfile(env2.owner.activeSkill, pStats.sSkill);
    let distance = env2.deps.getGridUnitDistance(env2.owner.gridPlayer, target);
    if (pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.farshot && distance < 3) {
      return { direction: "away", range: Math.max(3, Number(profile.range) || 1) };
    }
    return positionMovePlan(tactics, profile, distance);
  }
  function positionMovePlan(tactics, profile, distance) {
    if (tactics.positionMode === "auto") return null;
    if (tactics.positionMode === "pressure") return distance > 1 ? { direction: "toward", range: profile.range } : null;
    let desiredRange = Math.max(1, Math.floor(Number(profile.range) || 1));
    return desiredRange > 1 && distance < desiredRange ? { direction: "away", range: desiredRange } : null;
  }
  function buildTryPlayerTacticalMove(env2, pStats, target, plan, now) {
    if (!plan || now < env2.runtime.combatTacticsRuntime.nextMoveAt || env2.deps.isPlayerAttackRecovering(now)) return false;
    if (plan.direction === "away" && env2.runtime.combatTacticsRuntime.consecutiveRetreats >= COMBAT_TACTIC_MAX_RETREATS) return false;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    let result = env2.deps.advanceGridTacticalMovement(env2.owner.gridPlayer, target, {
      direction: plan.direction,
      maxRange: plan.range,
      previousCell: env2.runtime.combatTacticsRuntime.previousCell,
      dtSec: 0.1,
      intervalSec: env2.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * (100 / moveSpeed),
      keepRows: env2.deps.getSkillBand(env2.owner.activeSkill, pStats.sSkill).rows
    });
    if (!result.moved) return false;
    let delayMs = Math.round(env2.deps.getTacticalMoveAttackDelayMs(moveSpeed) * 0.45);
    env2.runtime.combatTacticsRuntime.previousCell = result.from;
    env2.runtime.combatTacticsRuntime.attackDelayUntil = Math.max(env2.runtime.combatTacticsRuntime.attackDelayUntil, now + delayMs);
    env2.runtime.combatTacticsRuntime.nextMoveAt = now + delayMs;
    if (result.retreat) env2.runtime.combatTacticsRuntime.consecutiveRetreats++;
    return true;
  }
  function buildGetPlayerGridStepSec(env2, pStats) {
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    moveSpeed *= 1 + Math.max(0, Number(pStats.uniquePursuitMovePct) || 0) / 100;
    return env2.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * (100 / moveSpeed);
  }

  // modules/combat/player-approach.mjs
  function buildAdvancePlayerExplorationFrame(env2, now, pStats) {
    if (env2.deps.actExplorationState.current(env2.owner)) env2.deps.actExplorationProgress.tick(now, pStats);
  }
  function buildContinuePlayerExplorationApproach(env2, pStats) {
    if (env2.deps.actExplorationProgress.holdPosition(false) || env2.deps.hasPlayerChannelBreakingAilment()) return;
    const warned = env2.deps.getBossWarningCells(env2.owner, env2.runtime.pendingEnemyCombatAttacks);
    if (env2.deps.isTrialHazardPositionHeld() || warned.length && env2.deps.isApexFight()) return;
    const approach = env2.deps.bossWarningApproach(warned);
    if (approach.hold) return;
    if (env2.deps.getCombatChannelGate(pStats, env2.deps.getCombatTime()).locked) return;
    if (buildGetSkillTargets(env2, pStats).length > 0) return;
    buildUpdatePlayerGridEngagement(env2, pStats, { avoidCells: { hard: approach.block, soft: env2.deps.groundHazardCells(), warned: approach.block } });
  }
  function buildUpdatePlayerGridEngagement(env2, pStats, options) {
    if (env2.deps.actExplorationProgress.moving() || env2.deps.mobilitySkill.moving()) return false;
    let config = options || {};
    let alive = (env2.owner.enemies || []).filter((enemy) => enemy.hp > 0);
    if (alive.length === 0) return false;
    env2.deps.syncCombatTacticsEncounterRuntime();
    let targets = buildGetSkillTargets(env2, pStats);
    if (!config.holdPosition && buildApproachLockedEnemy(env2, pStats, targets, config.avoidCells)) return false;
    if (targets.length > 0) return engageTargetInRange(env2, pStats, config, targets[0].enemy);
    return approachTargetOutOfRange(env2, pStats, alive, config);
  }
  function approachTargetOutOfRange(env2, pStats, alive, config) {
    if (config.holdPosition) return false;
    let nearest = env2.deps.resolvePlayerApproachTarget(alive);
    if (!nearest) return false;
    if (env2.deps.isPlayerAttackRecovering()) return false;
    buildApproachPlayerTarget(env2, pStats, alive, nearest, config.avoidCells);
    return false;
  }
  function engageTargetInRange(env2, pStats, config, target) {
    env2.runtime.combatTacticsRuntime.approachTargetId = null;
    const now = env2.deps.getCombatTime();
    const stalled = now - env2.runtime.combatTacticsRuntime.lastAttackAt >= COMBAT_TACTIC_STALL_MS;
    const plan = !config.holdPosition && !buildHasHardDanger(config.avoidCells) && env2.owner.combatTacticsUnlocked && !stalled ? buildGetPlayerTacticalMovePlan(env2, pStats, target) : null;
    return !buildTryPlayerTacticalMove(env2, pStats, target, plan, now);
  }
  function buildApproachPlayerTarget(env2, pStats, alive, target, avoidCells) {
    const stepSec = buildGetPlayerGridStepSec(env2, pStats), cell = buildGetPlayerApproachCell(env2, pStats, target);
    if (!buildWarningAllowsStep(env2, cell, avoidCells)) return false;
    if (env2.deps.advanceGridUnitMovement(env2.owner.gridPlayer, cell, 0.1, stepSec, avoidCells)) return true;
    const canStep = (enemy) => env2.deps.canGridUnitStepToward(env2.owner.gridPlayer, buildGetPlayerApproachCell(env2, pStats, enemy), avoidCells);
    if (canStep(target)) return false;
    const open = env2.deps.findNearestGridEnemy(env2.owner.gridPlayer, alive.filter((enemy) => enemy !== target && canStep(enemy)));
    if (!open || !buildWarningAllowsStep(env2, buildGetPlayerApproachCell(env2, pStats, open), avoidCells)) return false;
    env2.runtime.combatTacticsRuntime.approachTargetId = open.id;
    return env2.deps.advanceGridUnitMovement(env2.owner.gridPlayer, buildGetPlayerApproachCell(env2, pStats, open), 0, stepSec, avoidCells);
  }
  function buildApproachLockedEnemy(env2, pStats, targets, avoidCells) {
    const locked = env2.deps.actExplorationState.lockedEnemy(env2.deps.actExplorationState.current(env2.owner));
    if (!locked || !env2.owner.enemies.includes(locked) || targets.some((hit) => hit.enemy === locked) || env2.deps.isPlayerAttackRecovering()) return false;
    const cell = buildGetPlayerApproachCell(env2, pStats, locked);
    if (!buildWarningAllowsStep(env2, cell, avoidCells)) return targets.length === 0;
    return env2.deps.advanceGridUnitMovement(env2.owner.gridPlayer, cell, 0.1, buildGetPlayerGridStepSec(env2, pStats), avoidCells);
  }
  function buildWarningAllowsStep(env2, target, avoidCells) {
    const warned = avoidCells?.warned;
    if (!warned?.length) return true;
    const keys = new Set(warned.map((cell) => env2.deps.gridCellKey(cell.gx, cell.gy)));
    const baseHard = avoidCells.hard.filter((cell) => !keys.has(env2.deps.gridCellKey(cell.gx, cell.gy)));
    const ordinary = env2.deps.getGridApproachStep(env2.owner.gridPlayer, target, { ...avoidCells, hard: baseHard });
    const safe = env2.deps.getGridApproachStep(env2.owner.gridPlayer, target, avoidCells);
    return !!ordinary && !!safe && ordinary.gx === safe.gx && ordinary.gy === safe.gy;
  }
  function buildGetPlayerApproachCell(env2, pStats, enemy) {
    const band = env2.deps.getSkillBand(env2.owner.activeSkill, pStats.sSkill);
    return band.rows ? env2.deps.getGridBandApproachCell(env2.owner.gridPlayer, enemy, band) : enemy;
  }
  function buildHasHardDanger(avoid) {
    return Boolean(avoid && avoid.hard && avoid.hard.length);
  }

  // modules/domain/enemy-resources.mjs
  function enemyLifeDamagePct(enemy) {
    if (!enemy || !(enemy.maxHp > 0)) return 0;
    return Math.max(0, Math.min(100, (1 - Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1)) * 100));
  }

  // modules/combat/chaos-floor-rewards.mjs
  function* buildMaybeUnlockChaosRealmFromWoodsman(env2, enemy, options) {
    if (!enemy || !enemy.isBoss) return;
    let zone = env2.deps.getZone(env2.owner.currentZoneId) || env2.deps.getZone(0);
    if (!zone || zone.id !== env2.deps.OUTSIDE_CHAOS_ZONE_ID) return;
    let st = env2.deps.ensureChaosRealmState();
    let pct = enemyLifeDamagePct(enemy);
    st.woodsmanBestDamagePct = Math.max(st.woodsmanBestDamagePct || 0, pct);
    yield* finalizeChaosUnlock(env2, st, options);
    if (options && options.log) {
      yield { kind: "addLog", args: [env2.deps._t("🪓 나무꾼 피해율 기록: {woodsmanBestDamagePct}% / 해금 조건 10%", { woodsmanBestDamagePct: st.woodsmanBestDamagePct.toFixed(1) }), st.woodsmanBestDamagePct >= 10 ? "season-up" : "attack-monster"] };
    }
  }
  function* finalizeChaosUnlock(env2, st, options) {
    if (!options || !options.finalize || st.unlocked || !(st.woodsmanBestDamagePct >= 10)) return;
    st.unlocked = true;
    st.highestFloor = Math.max(1, Math.floor(st.highestFloor || 0));
    env2.owner.noti.map = true;
    yield { kind: "addLog", args: [env2.deps._t("🌌 나무꾼의 경계가 갈라지며 혼돈계가 해금되었습니다."), "loot-unique"] };
  }
  function* buildGrantChaosRealmFloorBonus(env2, floor) {
    let st = env2.deps.ensureChaosRealmState();
    let b = st.permanentBonuses;
    b.pctDmg += 0.5;
    b.move += 0.5;
    if (floor % 3 === 0) b.pctHp += 1;
    if (floor % 5 === 0) b.resChaos += 1;
    if (floor % 10 === 0) b.crit += 1;
    if (floor % 15 === 0) {
      b.armorPct += 10;
      b.evasionPct += 10;
      b.energyShieldPct += 10;
    }
    if (floor % 25 === 0) {
      b.critDmg += 5;
      b.aspd += 5;
    }
    const message = yield { kind: "chaosFloorBonusMessage", args: [floor] };
    yield { kind: "addLog", args: [message, "loot-unique"] };
  }

  // modules/combat/chaos-enemy-affixes.mjs
  function buildApplyChaosRealmAffixesToEnemy(env2, enemy, zone) {
    if (!enemy || !zone || zone.type !== "chaosRealm" && !zone.bloomTrialAffixFloor) return enemy;
    let floor = Math.max(1, Math.floor(zone.bloomTrialAffixFloor || zone.floor || 1));
    let scale = env2.deps.getChaosRealmAffixScale(floor);
    let affixes = env2.deps.getChaosRealmAffixes(floor);
    enemy.chaosRealmFloor = floor;
    enemy.chaosRealmAffixes = affixes;
    enemy.traitName = affixes.map((a) => a.name).join(", ");
    affixes.forEach((affix) => {
      let s = affix.scale || scale;
      applyChaosDefence(enemy, affix, floor, s);
      applyChaosLeechAndDampening(enemy, affix, floor);
      applyChaosCurses(enemy, affix, floor, s);
      applyChaosStrikes(enemy, affix, floor, s);
    });
    return enemy;
  }
  function applyChaosDefence(enemy, affix, floor, s) {
    if (affix.id === "elemental_wall") {
      enemy.resF += Math.floor(58 * s);
      enemy.resC += Math.floor(58 * s);
      enemy.resL += Math.floor(58 * s);
    }
    if (affix.id === "iron_bark") {
      enemy.dr += Math.floor(34 * s);
      enemy.armorGuard = Math.max(enemy.armorGuard || 0, 0.16 + 0.05 * s);
    }
    if (affix.id === "mirage_step") enemy.evasionChance = Math.max(enemy.evasionChance || 0, Math.min(55, 22 + floor * 0.9));
    if (affix.id === "soul_shell") {
      enemy.maxEnergyShield = Math.max(enemy.maxEnergyShield || 0, enemy.maxHp);
      enemy.energyShield = enemy.maxEnergyShield;
    }
  }
  function applyChaosLeechAndDampening(enemy, affix, floor) {
    if (affix.id === "projectile_dampening") enemy.projectileDamageTakenMul = Math.min(enemy.projectileDamageTakenMul || 1, 0.5);
    if (affix.id === "spell_dampening") enemy.spellDamageTakenMul = Math.min(enemy.spellDamageTakenMul || 1, 0.5);
    if (affix.id === "blood_drinker") enemy.leechPct = Math.max(enemy.leechPct || 0, 2.5 + floor * 0.08);
    if (affix.id === "bloodless") enemy.leechEffMul = Math.min(enemy.leechEffMul || 1, Math.max(0.08, 0.28 - floor * 2e-3));
  }
  function applyChaosCurses(enemy, affix, floor, s) {
    if (affix.id === "curse_blade") {
      enemy.curseBlade = true;
      enemy.atkMul = (enemy.atkMul || 1) * (1.18 + floor * 6e-3);
      enemy.penetration += Math.floor(8 * s);
    }
    if (affix.id === "curse_immune") enemy.curseImmune = true;
    if (affix.id === "phys_dampening") enemy.physicalDamageTakenMul = Math.min(enemy.physicalDamageTakenMul || 1, 0.5);
  }
  function applyChaosStrikes(enemy, affix, floor, s) {
    if (affix.id === "deadly_crit") {
      enemy.critChance += Math.floor(18 * s);
      enemy.critDamageMul = Math.max(enemy.critDamageMul || 1.55, 1.95 + floor * 0.01);
    }
    if (affix.id === "multi_strike") enemy.doubleStrikeChance = Math.max(enemy.doubleStrikeChance || 0, Math.min(45, 18 + floor * 0.6));
    if (affix.id === "deep_penetration") enemy.penetration += Math.floor(18 * s);
  }
  function buildApplyZoneEnemyMods(env2, enemy, zone) {
    buildApplyChaosRealmAffixesToEnemy(env2, enemy, zone);
    return env2.deps.atlasMaps.applyEnemyMods(enemy, zone);
  }

  // modules/combat/cosmos-player-debuffs.mjs
  function buildGetCosmosDebuffSpec(env2, type, power) {
    const p = Math.max(1, Number(power || 1));
    const table = {
      cosmos_regen_down: { type, label: env2.deps._t("재생 효율 감소"), value: Math.min(70, Math.floor(32 * p)), duration: 5.5 },
      cosmos_leech_down: { type, label: env2.deps._t("흡혈 효율 감소"), value: Math.min(75, Math.floor(36 * p)), duration: 5.5 },
      cosmos_res_down: { type, label: env2.deps._t("저항 감소"), value: Math.min(38, Math.floor(16 * p)), duration: 5 },
      cosmos_aspd_down: { type, label: env2.deps._t("공격 속도 감소"), value: Math.min(46, Math.floor(20 * p)), duration: 4.5 }
    };
    return table[type] || null;
  }
  function* buildApplyCosmosBossPlayerDebuff(env2, enemy) {
    if (!hasBossDebuffs(enemy)) return;
    const due = dueBossDebuff(env2, enemy);
    if (!due) return;
    const { spec, now } = due;
    env2.owner.cosmosPlayerDebuffs = Array.isArray(env2.owner.cosmosPlayerDebuffs) ? env2.owner.cosmosPlayerDebuffs : [];
    let row = env2.owner.cosmosPlayerDebuffs.find((d) => d && d.type === spec.type);
    if (!row) {
      row = { type: spec.type, label: spec.label, value: 0, expiresAt: 0, durationMs: 0 };
      env2.owner.cosmosPlayerDebuffs.push(row);
    }
    row.label = env2.deps._t(spec.label);
    row.value = Math.max(Number(row.value || 0), spec.value);
    row.durationMs = Math.floor(spec.duration * 1e3);
    row.expiresAt = Math.max(Number(row.expiresAt || 0), now + Math.floor(spec.duration * 1e3));
    if (env2.owner.settings && env2.owner.settings.showCombatLog) yield { kind: "addLog", args: [env2.deps._t("🌌 {name}의 우주계 보스 디버프: {label} -{value}%", { name: env2.deps.i18n.enemyName(enemy.name), label: env2.deps._t(spec.label), value: spec.value }), "attack-monster", { noToast: true }] };
  }
  function hasBossDebuffs(enemy) {
    if (!enemy || !enemy.isBoss || !Array.isArray(enemy.cosmosBossDebuffs) || enemy.cosmosBossDebuffs.length <= 0) return;
    return true;
  }
  function dueBossDebuff(env2, enemy) {
    if (typeof env2.deps.getCosmosGalaxyBossMechanic === "function" && env2.deps.getCosmosGalaxyBossMechanic(enemy.cosmosBossId)) return;
    const now = env2.deps.getCombatTime();
    if (now < Math.floor(enemy.nextCosmosBossDebuffAt || 0)) return;
    enemy.nextCosmosBossDebuffAt = now + 3200;
    const type = enemy.cosmosBossDebuffs[Math.abs((enemy.variantSeed || 0) + Math.floor(now / 3200)) % enemy.cosmosBossDebuffs.length];
    const spec = buildGetCosmosDebuffSpec(env2, type, enemy.cosmosBossDebuffPower || 1);
    if (!spec) return;
    return { spec, now };
  }
  function buildApplyCosmosBossSpecialDebuff(env2, enemy, type) {
    const spec = buildGetCosmosDebuffSpec(env2, type, enemy.cosmosBossDebuffPower || 1);
    if (!spec) return;
    env2.owner.cosmosPlayerDebuffs = Array.isArray(env2.owner.cosmosPlayerDebuffs) ? env2.owner.cosmosPlayerDebuffs : [];
    let row = env2.owner.cosmosPlayerDebuffs.find((debuff) => debuff && debuff.type === spec.type);
    if (!row) {
      row = { type: spec.type, label: spec.label, value: 0, expiresAt: 0, durationMs: 0 };
      env2.owner.cosmosPlayerDebuffs.push(row);
    }
    row.label = env2.deps._t(spec.label);
    row.value = Math.max(Number(row.value || 0), spec.value);
    row.durationMs = Math.floor(spec.duration * 1e3);
    row.expiresAt = Math.max(Number(row.expiresAt || 0), env2.deps.getCombatTime() + row.durationMs);
  }
  function buildApplyCosmosPlayerDebuffsToStats(env2, pStats) {
    env2.owner.cosmosPlayerDebuffs = Array.isArray(env2.owner.cosmosPlayerDebuffs) ? env2.owner.cosmosPlayerDebuffs : [];
    const currentZone = env2.deps.getZone(env2.owner.currentZoneId);
    if (!currentZone || currentZone.type !== "cosmos") {
      env2.owner.cosmosPlayerDebuffs = [];
      return;
    }
    const now = env2.deps.getCombatTime();
    env2.owner.cosmosPlayerDebuffs = env2.owner.cosmosPlayerDebuffs.filter((d) => d && (d.expiresAt || 0) > now);
    env2.owner.cosmosPlayerDebuffs.forEach((d) => {
      const value = Math.max(0, Math.min(90, Number(d.value || 0)));
      if (d.type === "cosmos_regen_down") {
        pStats.regen = Math.max(0, (pStats.regen || 0) * (1 - value / 100));
        pStats.energyShieldRegenRate = Math.max(0, (pStats.energyShieldRegenRate || 0) * (1 - value / 100));
      } else if (d.type === "cosmos_leech_down") {
        pStats.leech = Math.max(0, (pStats.leech || 0) * (1 - value / 100));
        pStats.spellLeech = Math.max(0, (pStats.spellLeech || 0) * (1 - value / 100));
      } else if (d.type === "cosmos_res_down") {
        pStats.resF -= value;
        pStats.resC -= value;
        pStats.resL -= value;
        pStats.resChaos -= value;
      } else if (d.type === "cosmos_aspd_down") {
        pStats.aspd *= Math.max(0.2, 1 - value / 100);
      }
    });
  }

  // modules/combat/cosmos-attack-setup.mjs
  function buildApplyCosmosJudgmentOnHit(enemy, pStats, element) {
    const judgment = pStats.cosmosJudgmentLightning;
    if (!judgment || element !== "light") return;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    const mark = enemy.ailments.find((ail) => ail && ail.type === "cosmosJudgment");
    if (mark) mark.time = Math.max(mark.time || 0, Number(judgment.duration || 4));
    else enemy.ailments.push({ type: "cosmosJudgment", time: Number(judgment.duration || 4), power: Number(judgment.resDown || 15) });
  }
  function buildGetCosmosBossAttackElement(enemy, pattern, pStats) {
    if (!pattern) return enemy && (enemy.cosmosBaseElement || enemy.ele) || "phys";
    if (pattern.elementRule === "alternatingWeakest" && pattern.attackNumber % 2 === 1) return "phys";
    if (pattern.elementRule === "weakestResistance" || pattern.elementRule === "alternatingWeakest") {
      return weakestRuleElement(enemy, pattern, pStats);
    }
    return explicitRuleElement(enemy, pattern);
  }
  function weakestRuleElement(enemy, pattern, pStats) {
    if (!pattern.isSpecial && pattern.elementRule !== "alternatingWeakest") return enemy.cosmosBaseElement || enemy.ele || "phys";
    const elements = ["fire", "cold", "light", "chaos"];
    return elements.reduce((weakest, element) => {
      const current = playerCosmosResistance(pStats, element);
      const weakestValue = playerCosmosResistance(pStats, weakest);
      return current < weakestValue ? element : weakest;
    }, elements[0]);
  }
  function playerCosmosResistance(pStats, element) {
    return Number(pStats && pStats[`res${element === "fire" ? "F" : element === "cold" ? "C" : element === "light" ? "L" : "Chaos"}`] || 0);
  }
  function explicitRuleElement(enemy, pattern) {
    if (!pattern.isSpecial) return enemy.cosmosBaseElement || enemy.ele || "phys";
    if (pattern.elementRule === "physical") return "phys";
    if (pattern.elementRule === "chaos") return "chaos";
    return enemy.cosmosBaseElement || enemy.ele || "phys";
  }
  function buildApplyCosmosBossAttackSetup(env2, enemy, pattern, pStats) {
    if (!enemy || !pattern || pattern.cosmosSetupApplied) return pattern;
    pattern.cosmosSetupApplied = true;
    enemy.ele = buildGetCosmosBossAttackElement(enemy, pattern, pStats);
    if (pattern.shieldRestorePct > 0 && enemy.maxEnergyShield > 0) {
      const restore = Math.max(1, Math.floor(enemy.maxEnergyShield * pattern.shieldRestorePct / 100));
      enemy.energyShield = Math.min(enemy.maxEnergyShield, Math.max(0, enemy.energyShield || 0) + restore);
    }
    if (pattern.debuffType) buildApplyCosmosBossSpecialDebuff(env2, enemy, pattern.debuffType);
    applyCosmosMoveCounter(pattern, pStats);
    return pattern;
  }
  function applyCosmosMoveCounter(pattern, pStats) {
    if (pattern.moveCounterPct > 0) {
      const moveBonus = Math.max(0, Number(pStats && pStats.moveSpeed || 100) - 100);
      const moveRatio = Math.max(0, Math.min(1, moveBonus / 70));
      const extraDamage = Math.max(0, Number(pattern.damageMul || 1) - 1);
      pattern.damageMul = 1 + extraDamage * (1 - moveRatio * pattern.moveCounterPct / 100);
      pattern.countered = moveRatio >= 0.98;
    }
  }

  // modules/combat/enemy-spawn-wards.mjs
  function buildGetBossDefenseTargets(env2, zone, ele) {
    const rules = env2.deps.BOSS_DEFENSE_SPECIALTIES, values = env2.deps.ENEMY_DEFENSE_TIER20;
    const byValues = ({ dr, res }) => ({ dr, resF: res, resC: res, resL: res, resChaos: res });
    const special = byValues(values.bossSpecialty);
    const fixed = zone.loopScaleExempt || Number.isFinite(zone.fixedSeason) || zone.difficultyBenchmark || zone.milestonePinnacle;
    if (fixed || !["act", "abyss"].includes(zone.type)) return special;
    const seed = env2.deps.hashSeed(String(zone.id) + ":boss-guard") >>> 0;
    const first = rules.byElement[ele] || rules.stats[seed % rules.stats.length];
    const rest = rules.stats.filter((stat) => stat !== first);
    const second = (seed >>> 8) % 1e3 < rules.secondChance * 1e3 ? rest[(seed >>> 16) % rest.length] : null;
    const targets = byValues(values.elite);
    [first, second].filter(Boolean).forEach((stat) => {
      targets[stat] = special[stat];
    });
    return targets;
  }
  function buildGetZoneDefenseVariance(env2, zone) {
    let key = String(zone && zone.id || "zone");
    let seed = Math.abs(env2.deps.hashSeed(key + ":def-var")) % 7;
    return (seed - 3) * 0.02;
  }
  function buildGetZoneElementWardProfile(env2, zone) {
    if (!zone) return null;
    const cacheKey = zone.type + "|" + zone.id + "|" + zone.name;
    if (env2.memory.wards.has(cacheKey)) return env2.memory.wards.get(cacheKey);
    if (env2.memory.wards.size >= 512) env2.memory.wards.clear();
    const profile = buildRollZoneElementWardProfile(env2, zone);
    env2.memory.wards.set(cacheKey, profile);
    return profile;
  }
  function buildRollZoneElementWardProfile(env2, zone) {
    let specialBossZone = zone.type === "outsideChaos" || zone.id === "beehive_run" || zone.id === "grand_breach_run" || zone.type === "meteor" || zone.type === "seasonBoss" || zone.type === "trial";
    if (specialBossZone) return null;
    let key = String(zone.id || zone.name || "zone");
    let elemList = ["fire", "cold", "light"];
    let elem = elemList[Math.abs(env2.deps.hashSeed(key + ":elem-ward")) % elemList.length];
    let strength = 6 + Math.abs(env2.deps.hashSeed(key + ":elem-ward-strength")) % 13;
    return { elem, strength };
  }
  function createEnemyWardMemory() {
    return { wards: /* @__PURE__ */ new Map() };
  }

  // modules/combat/enemy-spawn-values.mjs
  var COSMOS_TRAIT_ARCHETYPES = /* @__PURE__ */ Object.freeze({
    critResist: (trait, c) => {
      trait.name = c.name;
      trait.critResistPct = Math.floor((c.isBoss ? 42 : 26) * c.power);
      trait.critDamageResistPct = Math.floor((c.isBoss ? 38 : 22) * c.power);
    },
    critDamageResist: (trait, c) => {
      trait.name = c.name;
      trait.critDamageResistPct = Math.floor((c.isBoss ? 58 : 36) * c.power);
      trait.dr = Math.floor((c.isBoss ? 10 : 6) * c.power);
      trait.armorMul = 1 + (c.isBoss ? 0.85 : 0.55) * c.power;
    },
    comboGuard: (trait, c) => {
      trait.name = c.name;
      trait.hitRateGuard = Math.min(0.28, (c.isBoss ? 0.12 : 0.08) * c.power);
      trait.comboTakenLessPct = Math.min(70, Math.floor((c.isBoss ? 38 : 24) * c.power));
    },
    heavySlow: (trait, c) => {
      trait.name = c.name;
      trait.atkMul = 1 + (c.isBoss ? 0.62 : 0.38) * c.power;
      trait.damageMul = 1 + (c.isBoss ? 0.28 : 0.16) * c.power;
      trait.attackSpeedVarMul = Math.max(0.42, 1 - (c.isBoss ? 0.32 : 0.22) * c.power);
      trait.penetration = Math.floor((c.isBoss ? 8 : 4) * c.power);
    },
    fast: (trait, c) => {
      trait.name = c.name;
      trait.attackSpeedVarMul = 1 + (c.isBoss ? 0.55 : 0.34) * c.power;
      trait.critChanceBonus = Math.floor((c.isBoss ? 12 : 7) * c.power);
      trait.evasionChance = Math.floor((c.isBoss ? 18 : 10) * c.power);
    },
    energyShield: (trait, c) => {
      const esPct = Math.min(100, Math.max(50, Math.floor(50 + Math.abs(c.seed || 0) % 51 + (c.isBoss ? 18 : 0))));
      trait.name = `${c.name} ${esPct}%`;
      trait.energyShieldPct = esPct;
      trait.resAll = Math.floor((c.isBoss ? 8 : 4) * c.power);
    },
    evasion: (trait, c) => {
      trait.name = c.name;
      trait.evasionMul = 1 + (c.isBoss ? 1.65 : 1.05) * c.power;
      trait.evasionChance = Math.min(72, Math.floor((c.isBoss ? 42 : 28) * c.power));
    },
    armor: (trait, c) => {
      trait.name = c.name;
      trait.armorMul = 1 + (c.isBoss ? 2.2 : 1.35) * c.power;
      trait.armorGuard = Math.min(0.72, (c.isBoss ? 0.36 : 0.24) * c.power);
      trait.dr = Math.floor((c.isBoss ? 14 : 8) * c.power);
    }
  });
  var COSMOS_BOSS_DEBUFF_SETS = /* @__PURE__ */ Object.freeze({
    critResist: ["cosmos_res_down", "cosmos_aspd_down"],
    critDamageResist: ["cosmos_regen_down", "cosmos_res_down"],
    comboGuard: ["cosmos_aspd_down", "cosmos_leech_down"],
    heavySlow: ["cosmos_res_down", "cosmos_regen_down"],
    fast: ["cosmos_aspd_down", "cosmos_leech_down"],
    energyShield: ["cosmos_regen_down", "cosmos_leech_down"],
    evasion: ["cosmos_aspd_down", "cosmos_res_down"],
    armor: ["cosmos_leech_down", "cosmos_regen_down"]
  });
  var METEOR_CORE_GUARD = /* @__PURE__ */ Object.freeze({ fire: "resF", cold: "resC", light: "resL", chaos: "resChaos", phys: "dr" });

  // modules/combat/cosmos-enemy-traits.mjs
  function buildGetCosmosExclusiveEnemyTrait(env2, zone, isElite, isBoss, seed) {
    if (!zone || zone.type !== "cosmos") return null;
    const power = cosmosTraitPower(zone, isElite, isBoss);
    const mechanic = env2.deps.cosmosRouteRuntime.mechanic(zone, isBoss, seed);
    if (!mechanic) return null;
    const archetype = mechanic.id;
    const trait = cosmosTraitRecord(archetype, isElite, isBoss);
    if (Object.hasOwn(COSMOS_TRAIT_ARCHETYPES, archetype)) COSMOS_TRAIT_ARCHETYPES[archetype](trait, { name: env2.deps._t("우주계: {name}", { name: mechanic.name }), isBoss, power, seed });
    if (isBoss) {
      trait.bossDebuffs = (Object.hasOwn(COSMOS_BOSS_DEBUFF_SETS, archetype) ? COSMOS_BOSS_DEBUFF_SETS[archetype] : ["cosmos_res_down"]).slice();
      trait.debuffPower = Math.min(1.7, power);
    }
    return trait;
  }
  function cosmosTraitPower(zone, isElite, isBoss) {
    const sizeClass = Math.max(1, Math.min(5, Math.floor(zone.sizeClass || 1)));
    const gravity = Math.max(1, Number(zone.gravity || 1));
    const rankPower = isBoss ? 1.45 : isElite ? 1 : 0.72;
    return rankPower * (1 + Math.max(0, sizeClass - 1) * 0.06 + Math.max(0, gravity - 1) * 0.04);
  }
  function cosmosTraitRecord(archetype, isElite, isBoss) {
    return {
      id: `cosmos_${archetype}`,
      name: "",
      expMul: 1 + (isBoss ? 0.16 : isElite ? 0.08 : 0.03),
      dropMul: 1 + (isBoss ? 0.12 : isElite ? 0.06 : 0.02),
      bossDebuffs: []
    };
  }
  function buildApplyCosmosExclusiveTraitToEnemy(enemy, trait) {
    if (!enemy || !trait) return;
    enemy.traitName = enemy.traitName ? `${enemy.traitName}, ${trait.name}` : trait.name;
    applyTraitDefences(enemy, trait);
    applyTraitHitGuards(enemy, trait);
    applyTraitCritAndPenetration(enemy, trait);
    applyTraitShieldAndDebuffs(enemy, trait);
  }
  function applyTraitDefences(enemy, trait) {
    if (Number.isFinite(trait.dr)) enemy.dr = Math.min(90, Math.max(0, enemy.dr + trait.dr));
    if (Number.isFinite(trait.resAll)) {
      enemy.resF = Math.min(95, enemy.resF + trait.resAll);
      enemy.resC = Math.min(95, enemy.resC + trait.resAll);
      enemy.resL = Math.min(95, enemy.resL + trait.resAll);
      enemy.resChaos = Math.min(95, enemy.resChaos + trait.resAll);
    }
    if (Number.isFinite(trait.armorMul)) enemy.armor = Math.floor(enemy.armor * Math.max(0.1, trait.armorMul));
    if (Number.isFinite(trait.evasionMul)) enemy.evasion = Math.floor(enemy.evasion * Math.max(0.1, trait.evasionMul));
  }
  function applyTraitHitGuards(enemy, trait) {
    if (Number.isFinite(trait.armorGuard)) enemy.armorGuard = Math.max(Number(enemy.armorGuard || 0), trait.armorGuard);
    if (Number.isFinite(trait.evasionChance)) enemy.evasionChance = Math.max(Number(enemy.evasionChance || 0), Math.min(78, trait.evasionChance));
    if (Number.isFinite(trait.hitRateGuard)) enemy.hitRateGuard = Math.max(Number(enemy.hitRateGuard || 0), trait.hitRateGuard);
    if (Number.isFinite(trait.comboTakenLessPct)) enemy.comboTakenLessPct = Math.max(Number(enemy.comboTakenLessPct || 0), trait.comboTakenLessPct);
  }
  function applyTraitCritAndPenetration(enemy, trait) {
    if (Number.isFinite(trait.critResistPct)) enemy.critResistPct = Math.max(Number(enemy.critResistPct || 0), trait.critResistPct);
    if (Number.isFinite(trait.critDamageResistPct)) enemy.critDamageResistPct = Math.max(Number(enemy.critDamageResistPct || 0), trait.critDamageResistPct);
    if (Number.isFinite(trait.penetration)) enemy.penetration = Math.max(Number(enemy.penetration || 0), Number(enemy.penetration || 0) + trait.penetration);
  }
  function applyTraitShieldAndDebuffs(enemy, trait) {
    if (Number.isFinite(trait.energyShieldPct)) {
      enemy.maxEnergyShield = Math.max(Math.floor(Number(enemy.maxEnergyShield || 0)), Math.floor((enemy.maxHp || 1) * trait.energyShieldPct / 100));
      enemy.energyShield = Math.max(Math.floor(Number(enemy.energyShield || 0)), enemy.maxEnergyShield);
    }
    if (Array.isArray(trait.bossDebuffs) && trait.bossDebuffs.length > 0) {
      enemy.cosmosBossDebuffs = trait.bossDebuffs.slice();
      enemy.cosmosBossDebuffPower = Math.max(1, Number(trait.debuffPower || 1));
    }
  }

  // modules/combat/cosmos-enemy-modifiers.mjs
  function buildGetZoneStaticBossMods(zone, isBoss) {
    if (!isBoss || !zone || !zone.bossMods || typeof zone.bossMods !== "object") return null;
    return zone.bossMods;
  }
  function buildApplyCosmosDirectiveModifiers(env2, modifiers, zone) {
    const directive = zone && zone.cosmosDirective && typeof zone.cosmosDirective === "object" ? zone.cosmosDirective : null;
    if (!directive) return modifiers;
    modifiers.hpMul *= Math.max(0.5, Math.min(3, Number(directive.enemyHpMul) || 1));
    modifiers.damageMul *= Math.max(0.5, Math.min(3, Number(directive.enemyDamageMul) || 1));
    modifiers.attackSpeedMul *= Math.max(0.5, Math.min(2, Number(directive.enemyAttackSpeedMul) || 1));
    const name = String(directive.name || "").trim();
    if (name) modifiers.traitName = env2.deps._t("{traitName}, 탐사:{name}", { traitName: modifiers.traitName, name });
    return modifiers;
  }
  function buildGetCosmosEnemyModifiers(env2, zone, isElite, isBoss) {
    if (!zone || zone.type !== "cosmos") return null;
    const { mod, tag, bossMul } = cosmosModifierBase(env2, zone, isElite, isBoss);
    applyCosmosTagModifiers(mod, tag);
    applyGalaxyEnvironment(env2, mod, zone);
    mod.hpMul = Math.max(0.5, mod.hpMul * bossMul * buildGetCosmosNonBossHpMultiplier(zone, isElite, isBoss));
    mod.damageMul = Math.max(0.5, mod.damageMul * (isBoss ? 1.1 : 1));
    applyGalaxyBossModifiers(env2, mod, zone, isBoss);
    return buildApplyCosmosDirectiveModifiers(env2, env2.deps.cosmosRouteRuntime.modifyEncounter(mod, zone, isBoss), zone);
  }
  function cosmosModifierBase(env2, zone, isElite, isBoss) {
    let tag = String(zone.cosmosTag || "").trim();
    let sizeClass = Math.max(1, Math.min(5, Math.floor(zone.sizeClass || 1)));
    let gravity = Math.max(1, Number(zone.gravity || 1));
    let sizePressure = Math.max(0, sizeClass - 1);
    let gravityHarness = env2.deps.cosmosGravityHarness;
    let gravityPressure = Math.max(0, gravity - 1) * Math.max(0.5, 1 - gravityHarness * 0.01);
    let bossMul = isBoss ? 1.35 : isElite ? 1.12 : 1;
    let mod = {
      hpMul: 1 + sizePressure * 0.1 + gravityPressure * 0.13,
      damageMul: 1 + sizePressure * 0.025 + gravityPressure * 0.055,
      atkMul: 1 + gravityPressure * 0.035,
      attackSpeedMul: Math.max(0.72, 1 - gravityPressure * 0.018 + sizePressure * 0.012),
      dr: Math.floor(sizePressure * 2 + gravityPressure * 3),
      resAll: Math.floor(gravityPressure * 4),
      armorMul: 1 + sizePressure * 0.09 + gravityPressure * 0.08,
      evasionMul: 1 + Math.max(0, 3 - sizeClass) * 0.035,
      critChanceBonus: 0,
      penetration: Math.floor(gravityPressure * 2),
      regenMul: 1,
      ailmentChanceBonus: 0,
      firstHitGuard: 0,
      patternMode: null,
      traitName: env2.deps._t("우주계:{tag} {sizeClass}등급/{gravity}g", { tag: tag || "stellar", sizeClass, gravity: gravity.toFixed(1) })
    };
    return { mod, tag, bossMul };
  }
  var tagMods = {
    gateway: { resAll: 3, firstHitGuard: 0.08 },
    arcane: { resChaos: 8, penetration: 3 },
    cold: { resC: 14, attackSpeedMul: 0.94, ailmentChanceBonus: 0.04 },
    fire: { resF: 14, damageMul: 0.09, ailmentChanceBonus: 0.03 },
    hunt: { attackSpeedMul: 1.08, critChanceBonus: 5 },
    venom: { resChaos: 10, regenMul: 1.25, ailmentChanceBonus: 0.05 },
    relic: { armorMul: 1.16, dr: 4 },
    guard: { dr: 7, firstHitGuard: 0.14 },
    speed: { attackSpeedMul: 1.18, evasionMul: 1.18 },
    projectile: { penetration: 5, damageMul: 0.04 },
    map: { resAll: 5, evasionMul: 1.08 },
    seed: { regenMul: 1.45 },
    shield: { firstHitGuard: 0.2, resAll: 5 },
    loop: { attackSpeedMul: 1.08, hpMul: 0.08 },
    wealth: { dropMul: 1.08 },
    mirror: { evasionMul: 1.14, firstHitGuard: 0.1 },
    vital: { hpMul: 0.18, regenMul: 1.35 },
    crit: { critChanceBonus: 9 },
    belt: { armorMul: 1.12, resAll: 4 },
    gate: { penetration: 4, resChaos: 8 },
    bind: { attackSpeedMul: 0.92, dr: 5 },
    reflect: { firstHitGuard: 0.18, resAll: 4 },
    aoe: { damageMul: 0.1, hpMul: 0.08 },
    curse: { resChaos: 14, ailmentChanceBonus: 0.06 },
    charge: { atkMul: 0.12, penetration: 4 },
    chaos: { resChaos: 16, damageMul: 0.08 },
    warp: { attackSpeedMul: 1.12, evasionMul: 1.1 },
    asteroid: { armorMul: 1.08, dropMul: 1.04 },
    boss: { hpMul: 0.35, damageMul: 0.18, dr: 8, resAll: 8, penetration: 6, critChanceBonus: 7, firstHitGuard: 0.22, patternMode: "cosmos" }
  };
  function applyCosmosTagModifiers(mod, tag) {
    let extra = tagMods[tag] || {};
    Object.keys(extra).forEach((key) => {
      if (key === "patternMode") mod.patternMode = extra[key];
      else if (key === "traitName") mod.traitName = extra[key];
      else if (key === "attackSpeedMul" || key === "armorMul" || key === "evasionMul" || key === "regenMul" || key === "dropMul") mod[key] = (mod[key] || 1) * extra[key];
      else mod[key] = (mod[key] || 0) + extra[key];
    });
  }
  function applyGalaxyEnvironment(env2, mod, zone) {
    const galaxyEnvironment = Array.isArray(env2.deps.cosmosGalaxyEnvironment) ? env2.deps.cosmosGalaxyEnvironment.find((row) => row && row.galaxy === Math.floor(zone.cosmosGalaxy || 0)) : null;
    Object.keys(galaxyEnvironment || {}).forEach((key) => {
      if (["name", "summary", "counter", "galaxy"].includes(key)) return;
      if (key === "hybridElement") mod.hybridElement = galaxyEnvironment[key];
      else if (key === "energyShieldPct") mod.energyShieldPct = Math.max(mod.energyShieldPct || 0, galaxyEnvironment[key]);
      else if (["attackSpeedMul", "armorMul", "evasionMul"].includes(key)) mod[key] = (mod[key] || 1) * galaxyEnvironment[key];
      else mod[key] = (mod[key] || 0) + galaxyEnvironment[key];
    });
  }
  function applyGalaxyBossModifiers(env2, mod, zone, isBoss) {
    const galaxyBossMechanic = isBoss && typeof env2.deps.getCosmosGalaxyBossMechanic === "function" ? env2.deps.getCosmosGalaxyBossMechanic(zone.cosmosNodeId) : null;
    if (galaxyBossMechanic) {
      mod.hpMul += 0.22;
      mod.damageMul += 0.08;
      mod.hpMul *= Math.max(0.5, Number(galaxyBossMechanic.hpScale || 1));
      mod.damageMul *= Math.max(0.2, Number(galaxyBossMechanic.damageScale || 1));
      mod.dr += 5;
      mod.resAll += 5;
      mod.penetration += 4;
      mod.critChanceBonus += 5;
      mod.patternMode = "cosmosBoss";
      mod.traitName = env2.deps._t("은하 보스: {name}", { name: galaxyBossMechanic.name });
    }
  }
  function buildGetCosmosNonBossHpMultiplier(zone, isElite, isBoss) {
    if (isBoss) return 1;
    const galaxy = Math.max(1, Math.min(5, Math.floor(Number(zone && zone.cosmosGalaxy) || 1)));
    const galaxyMultiplier = 4 + (galaxy - 1) * 0.125;
    return galaxyMultiplier * (isElite ? 1.35 : 1);
  }

  // modules/domain/enemy-content-difficulty.mjs
  function buildIsUnderworldEntryBenchmark(zone) {
    return !!zone && zone.difficultyBenchmark === "underworld1";
  }
  function buildGetDifficultyBenchmarkProfile(zone) {
    const benchmark = String(zone && zone.difficultyBenchmark || "");
    if (benchmark === "rival31") return { hp: 1, damage: 1, attackRate: 1, clearTimeSec: 30 };
    if (benchmark === "underworld1") return { hp: 5, damage: 0.78, attackRate: 0.76, clearTimeSec: 24 };
    if (benchmark === "underworld30") return { hp: 5 * (1 + 29 * 0.045), damage: 0.78, attackRate: 0.76, clearTimeSec: 30 };
    if (benchmark === "ocean1000") return { hp: 5 * (1 + 10 * 0.05), damage: 1, attackRate: 1, clearTimeSec: 30 };
    if (benchmark === "sky30") return { hp: 4.2 * (1 + 29 * 0.035), damage: 1.08, attackRate: 1.05, clearTimeSec: 30 };
    if (benchmark === "cosmosFinal") return { hp: 1, damage: 1, attackRate: 1, clearTimeSec: 45 };
    return null;
  }
  function buildGetEntryBossTuning(zone, isBoss) {
    if (!isBoss || !zone) return { hp: 1, damage: 1 };
    if (buildIsUnderworldEntryBenchmark(zone)) {
      return { hp: UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER, damage: UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER };
    }
    const floors = Object.hasOwn(ENTRY_BOSS_EASING, zone.type) ? ENTRY_BOSS_EASING[zone.type] : [];
    return floors[Math.max(1, Math.floor(Number(zone.floor) || 1)) - 1] || { hp: 1, damage: 1 };
  }
  function buildGetUnderworldEnemyDamageMultiplier(env2, zone) {
    if (!zone || zone.type !== "underworld") return 1;
    let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
    let mediumStart = env2.deps.UNDERWORLD_DIFFICULTY_CONFIG.flatDamageThroughFloor;
    let deepStart = env2.deps.UNDERWORLD_DIFFICULTY_CONFIG.mediumDamageThroughFloor;
    let deepEnd = env2.deps.UNDERWORLD_DIFFICULTY_CONFIG.deepDamageThroughFloor;
    let mediumFloors = Math.min(Math.max(0, floor - mediumStart), deepStart - mediumStart);
    let deepFloors = Math.min(Math.max(0, floor - deepStart), deepEnd - deepStart);
    return 1 + mediumFloors * env2.deps.UNDERWORLD_DIFFICULTY_CONFIG.mediumDamagePerFloor + deepFloors * env2.deps.UNDERWORLD_DIFFICULTY_CONFIG.deepDamagePerFloor;
  }
  function buildResolveMapEstimateContentScale(env2, zone) {
    const benchmark = buildGetDifficultyBenchmarkProfile(zone);
    if (benchmark) return benchmarkContentScale(zone, benchmark);
    let scale = { hp: 1, damage: 1, clearTimeSec: 24 };
    let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
    if (zone.type === "act") scale.clearTimeSec = 18;
    if (zone.type === "chaosRealm") scale.hp = 5 * (1 + (floor - 1) * 0.06);
    if (zone.type === "underworld") {
      scale.hp = 5 * (1 + (floor - 1) * 0.045);
      scale.damage = 0.78 * buildGetUnderworldEnemyDamageMultiplier(env2, zone);
    }
    if (zone.type === "oceanDepth") scale.hp = 5 * (1 + Math.max(0, Math.floor(zone.depthTier || 0)) * 0.05);
    applyChallengeEstimateScale(env2, zone, scale);
    return scale;
  }
  function benchmarkContentScale(zone, benchmark) {
    return {
      hp: benchmark.hp * (zone.type === "beyondBoundary" ? Math.max(1, Number(zone.boundaryHpMul) || 1) : 1),
      damage: benchmark.damage * (zone.type === "beyondBoundary" ? Math.max(1, Number(zone.boundaryDamageMul) || 1) : 1),
      clearTimeSec: benchmark.clearTimeSec
    };
  }
  function applyChallengeEstimateScale(env2, zone, scale) {
    if (zone.type === "timeRift" || zone.type === "seasonBoss") scale.clearTimeSec = 30;
    if (zone.type === "beehive") scale.clearTimeSec = 30;
    if (zone.type === "colony") {
      scale.hp = 3.4;
      scale.damage = 1.45;
    }
    if (zone.type === "grandBreach") scale.clearTimeSec = 35;
    if (zone.type === "cosmos") {
      const galaxyBoss = typeof env2.deps.getCosmosGalaxyBossMechanic === "function" && !!env2.deps.getCosmosGalaxyBossMechanic(zone.cosmosNodeId);
      scale.clearTimeSec = galaxyBoss ? 55 : 40;
    }
  }

  // modules/domain/enemy-loop-difficulty.mjs
  function buildGetSoftenedLoopDepth(depth) {
    let d = Math.max(0, depth || 0);
    const knee = 19;
    if (d <= knee) return d;
    return knee + (d - knee) * 0.5;
  }
  function buildGetLoopDifficultyInputs(env2, zone) {
    const fixed = buildGetFixedLoopDifficultyInputs(zone);
    if (fixed) return fixed;
    let exempt = !!zone && (zone.type === "trial" || zone.type === "outsideChaos" || !!zone.loopScaleExempt);
    if (exempt) return { exempt: true, seasonLoops: 0, loopCount: 0 };
    let cap = buildGetLoopScaleCap(env2, zone);
    return {
      exempt: false,
      seasonLoops: Math.min(cap, Math.max(0, (env2.owner.season || 1) - 1)),
      loopCount: Math.min(cap, Math.max(0, Math.floor(env2.owner.loopCount || 0)))
    };
  }
  function buildGetLoopScaleCap(env2, zone) {
    if (!zone) return Infinity;
    if (zone.type === "act") return env2.deps.ACT_LOOP_SCALE_CAP;
    if (zone.type === "abyss") return env2.deps.ACT_LOOP_SCALE_CAP + env2.deps.getAbyssDepthFromZoneId(zone.id) * env2.deps.CHAOS_LOOP_RAMP_PER_DEPTH;
    return zone.type === "cosmos" ? 30 : Infinity;
  }
  function buildGetFixedLoopDifficultyInputs(zone) {
    if (buildGetDifficultyBenchmarkProfile(zone)) return { exempt: false, seasonLoops: 30, loopCount: 30 };
    if (!zone || !Number.isFinite(zone.fixedSeason)) return null;
    const loops = Math.max(0, Math.floor(zone.fixedSeason) - 1);
    return { exempt: false, seasonLoops: loops, loopCount: loops };
  }
  function buildGetLoopDefenseScale(loopCount) {
    let loop = Math.max(0, loopCount || 0);
    const bands = [
      { upTo: 24, rate: 0.05 },
      { upTo: 60, rate: 0.02 },
      { upTo: Infinity, rate: 8e-3 }
    ];
    let scale = 1, prevBound = 0;
    for (let band of bands) {
      scale += Math.max(0, Math.min(loop, band.upTo) - prevBound) * band.rate;
      prevBound = band.upTo;
      if (loop <= band.upTo) break;
    }
    return scale;
  }
  function buildGetMonsterLoopGrowthScale(env2, zone, kind, seasonDepth, tierShare) {
    const growth = (zone && zone.type === "cosmos" ? env2.deps.MONSTER_LOOP_GROWTH.fixed : env2.deps.MONSTER_LOOP_GROWTH)[kind];
    return 1 + seasonDepth * (growth.base + tierShare * growth.tier);
  }
  function buildIsCosmosLadderZone(zone) {
    return !!zone && (zone.type === "cosmos" || zone.difficultyBenchmark === "cosmosFinal");
  }
  function buildGetMonsterLoopHpMultiplier(env2, zone, loopInputs, tierProgress) {
    if (buildIsCosmosLadderZone(zone)) {
      return buildGetMonsterLoopGrowthScale(env2, zone, "hp", buildGetSoftenedLoopDepth(loopInputs.seasonLoops), tierProgress) * buildGetLoopHpScale(loopInputs.loopCount) * buildGetMonsterLoopPowerScale(env2, zone, "hp");
    }
    if (loopInputs.exempt) return buildGetMonsterLoopPowerScale(env2, zone, "hp");
    return buildInterpolateLoopCurve(env2.deps.MONSTER_LOOP_HP_CURVE, loopInputs.seasonLoops + 1);
  }
  function buildGetBossHpEase(env2, tier, loopMul) {
    const loopShare = loopMul > 1 ? (1 + (loopMul - 1) * env2.deps.BOSS_LOOP_HP_SHARE) / loopMul : 1;
    return loopShare * buildInterpolateLoopCurve(env2.deps.BOSS_TIER_HP_EASE, Number(tier) || 1);
  }
  function buildGetEliteLoopHpMultiplier(zone, loopCount) {
    const share = buildGetSoftenedLoopDepth(loopCount) * 0.05;
    return 1.4 + (buildIsCosmosLadderZone(zone) ? share : Math.min(0.3, share));
  }
  function buildGetMonsterLoopPowerScale(env2, zone, kind) {
    const inputs = buildGetLoopDifficultyInputs(env2, zone);
    const loop = inputs.exempt ? Math.max(1, Math.floor(env2.owner.season || 1)) : inputs.seasonLoops + 1;
    return buildInterpolateLoopCurve(env2.deps.MONSTER_LOOP_POWER_SCALE[kind], loop);
  }
  function buildInterpolateLoopCurve(points, loop) {
    if (!Array.isArray(points) || !points.length) return 1;
    if (loop <= points[0][0]) return points[0][1];
    const next = points.findIndex((point) => loop <= point[0]);
    if (next < 0) return points[points.length - 1][1];
    const [x0, y0] = points[next - 1], [x1, y1] = points[next];
    return y0 + (y1 - y0) * (loop - x0) / (x1 - x0);
  }
  function buildGetLoopHpScale(loopCount) {
    let loop = Math.max(0, loopCount || 0);
    const bands = [
      { upTo: 1, rate: 0.12 },
      { upTo: 10, rate: 0.1 },
      { upTo: 20, rate: 0.08 },
      { upTo: 40, rate: 0.04 },
      { upTo: 100, rate: 0.018 },
      { upTo: Infinity, rate: 6e-3 }
    ];
    let scale = 1, prevBound = 0;
    for (let band of bands) {
      scale += Math.max(0, Math.min(loop, band.upTo) - prevBound) * band.rate;
      prevBound = band.upTo;
      if (loop <= band.upTo) break;
    }
    return scale;
  }

  // modules/combat/enemy-spawn-look.mjs
  function buildRollEnemyTrait(env2, zone, isElite, isBoss, seed) {
    if (!isElite && !isBoss) return null;
    let list = env2.deps.ENEMY_TRAIT_POOL.slice();
    list = trialTraitPool(list, zone);
    if ((env2.owner.season || 1) >= 10 && zone && zone.type === "abyss" && zone.ele === "chaos") {
      list.unshift({ id: "veryFast_loop10", name: "매우 빠름", outlineColor: "#82d8de", attackSpeedVarMul: 1.34, expMul: 1.1, dropMul: 1.08 });
    }
    let idx = Math.abs(seed || 0) % list.length;
    return { ...list[idx] };
  }
  function trialTraitPool(list, zone) {
    if (zone && zone.type === "trial" && zone.id === "trial_3") {
      list = list.filter((trait) => trait.id !== "bloodless");
    }
    if (zone && zone.type === "trial" && zone.id === "trial_4") {
      list = list.map((trait) => trait.id === "bloodless" ? { ...trait, id: "leechResist_trial4", name: "흡혈저항", leechEffMul: 0.45 } : trait);
    }
    return list;
  }
  function buildGetChaosBossVisual(env2, zone, variantSeed) {
    if (!zone || !["abyss", "chaosRealm", "atlasMap"].includes(zone.type) || typeof env2.deps.getBossAssetKeyForZone !== "function") return null;
    const seed = Math.abs(Math.floor(variantSeed || 0)), fixedAct = Number.isInteger(zone.bossAct);
    const actId = fixedAct ? zone.bossAct : seed % 10;
    const assetKey = env2.deps.getBossAssetKeyForZone({ type: "act", id: actId }, fixedAct ? seed : Math.floor(seed / 10));
    let hues = [286, 318, 202, 266, 334, 178, 244, 302, 222, 274];
    return { assetKey, tint: hues[actId] };
  }
  function buildGetWispEnemyDefenseBonuses(env2, monsterVariant) {
    const isWisp = !!(monsterVariant && String(monsterVariant.id || "").startsWith("wisp-"));
    const elements = new Set(isWisp && Array.isArray(monsterVariant.elements) ? monsterVariant.elements : []);
    const rules = isWisp ? env2.deps.WISP_ENEMY_RULES : env2.deps.WISP_NEUTRAL_RULES;
    return {
      isWisp,
      evasionMul: rules.evasionMul,
      armorMul: rules.armorMul,
      hpMul: rules.hpMul,
      ...wispElementDefences(elements)
    };
  }
  function wispElementDefences(elements) {
    return {
      dr: elements.has("phys") ? 18 : 0,
      resF: elements.has("fire") ? 30 : 0,
      resC: elements.has("cold") ? 30 : 0,
      resL: elements.has("light") ? 30 : 0,
      resChaos: elements.has("chaos") ? 30 : 0
    };
  }
  function buildGetEnemyLook(env2, zone, marker, ctx) {
    const { isBoss, isElite, enemyEle, variantSeed } = ctx;
    const art = buildGetEnemyBossArt(env2, zone, marker, isBoss, variantSeed);
    const trait = buildRollEnemyTrait(env2, zone, isElite, isBoss, variantSeed);
    const realmVisualSet = typeof env2.deps.getRealmMonsterVisualSet === "function" ? env2.deps.getRealmMonsterVisualSet(zone) : null;
    const realmVisual = buildGetRealmVisualFor(env2, realmVisualSet, { isBoss, isElite, variantSeed }, marker.packVisualId);
    const monsterVariant = !realmVisual && !isBoss && typeof env2.deps.getMonsterVariantDefinition === "function" ? env2.deps.getMonsterVariantDefinition(variantSeed, enemyEle, zone, marker) : null;
    const wispDefense = buildGetWispEnemyDefenseBonuses(env2, monsterVariant);
    return { ...art, trait, realmVisualSet, realmVisual, monsterVariant, wispDefense, wispVisual: wispDefense.isWisp ? monsterVariant : null };
  }
  function buildGetEnemyBossArt(env2, zone, marker, isBoss, variantSeed) {
    const chaosBossVisual = isBoss ? buildGetChaosBossVisual(env2, zone, variantSeed) : null;
    const bossAssetKey = chaosBossVisual ? chaosBossVisual.assetKey : isBoss && typeof env2.deps.getBossAssetKeyForZone === "function" ? env2.deps.getBossAssetKeyForZone(zone, variantSeed, marker.storyStage ?? 0) : null;
    const bossVisualId = isBoss ? zone.bossVisualId || null : null;
    return { chaosBossVisual: bossVisualId ? null : chaosBossVisual, bossAssetKey, bossVisualId };
  }
  function buildGetRealmVisualFor(env2, realmVisualSet, { isBoss, isElite, variantSeed }, packVisualId) {
    const requested = !isBoss && realmVisualSet?.members.find((member) => member.id === packVisualId && member.role !== "boss");
    if (requested) return requested;
    const realmVisualRole = isBoss ? "boss" : isElite ? "elite" : "normal";
    return typeof env2.deps.getRealmMonsterVisualDefinition === "function" ? env2.deps.getRealmMonsterVisualDefinition(realmVisualSet, realmVisualRole, variantSeed) : null;
  }
  function buildGetEnemyLookName(name, isBoss, isElite, look) {
    if (isBoss) return name;
    const shown = look.realmVisual || look.monsterVariant;
    if (shown) return isElite && look.trait ? `${look.trait.name} ${shown.name}` : shown.name;
    return isElite && look.trait ? `${look.trait.name} ${name}` : name;
  }

  // modules/domain/enemy-spawn-bonuses.mjs
  function buildByEnemyRank(rank, values) {
    return rank.isBoss ? values[0] : rank.isElite ? values[1] : values[2];
  }
  function buildFromLoopOn(env2, n, value) {
    return (env2.owner.season || 1) >= n ? value : 0;
  }
  function buildEnemyBonus(source, key, fallback = 0) {
    return source && source[key] ? source[key] : fallback;
  }
  function buildEnemyRewardMul(source, key) {
    return source && Number.isFinite(source[key]) ? Math.max(1, source[key]) : 1;
  }
  function buildBoundaryMul(zone, key) {
    return zone.type === "beyondBoundary" ? Math.max(1, Number(zone[key]) || 1) : 1;
  }
  function buildGetTierDropMulWithCaps(tier, zone) {
    let t = Math.max(1, Math.floor(Number(tier) || 1));
    let preSoft = Math.min(10, t - 1);
    let postSoft = Math.max(0, Math.min(20, t) - 10);
    let baseMul = 1 + preSoft * 0.02 + postSoft * 8e-3;
    if (zone && zone.type === "labyrinth") {
      let floor = Math.max(1, Math.floor(zone.floor || 1));
      let floor30SoftCapMul = 1.236;
      if (floor <= 30) return baseMul;
      if (floor <= 200) return Math.min(baseMul, floor30SoftCapMul);
      return floor30SoftCapMul;
    }
    return baseMul;
  }
  function buildGetEnemyGemDropMul(env2, enemy) {
    const wisp = enemy && enemy.monsterArchetype === "wisp" ? env2.deps.WISP_ENEMY_RULES.gemDropMul : 1;
    return wisp * (Number(enemy && enemy.gemDropMul) || 1);
  }

  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/combat/enemy-spawn-life.mjs
  function buildGetEnemyBaseHp(env2, zone, ctx) {
    const { loopInputs, tierProgress, isBoss, isElite } = ctx;
    const lateGameHpScale = 1 + tierProgress * 9;
    let hp = Math.floor((56 + zone.tier * 30) * 1.15 * lateGameHpScale * buildGetMonsterLoopHpMultiplier(env2, zone, loopInputs, tierProgress));
    if (loopInputs.exempt) hp = Math.floor(hp * (Number(zone.fixedDifficultyMul) || 1));
    hp = buildApplyContentEnemyHp(env2, zone, hp, isBoss, isElite);
    if (isElite) hp = Math.floor(hp * buildGetEliteLoopHpMultiplier(zone, loopInputs.loopCount));
    if (isBoss) hp = Math.floor(hp * (1.8 + zone.tier * 0.6) * buildGetBossHpEase(env2, zone.tier, buildGetMonsterLoopHpMultiplier(env2, zone, loopInputs, tierProgress)));
    if (isBoss) hp = Math.floor(hp * (1 + tierProgress * 4));
    return buildApplyEnemyHpScales(zone, hp, isBoss, ctx.abyssScale);
  }
  function buildApplyContentEnemyHp(env2, zone, hp, isBoss, isElite) {
    if (zone.type === "abyss" && !isElite && !isBoss) hp = buildApplyDeepChaosNormalHp(env2, zone, hp);
    if (zone.type === "chaosRealm") {
      const realmFloor = Math.max(1, Math.floor(zone.floor || 1));
      const realmBaseMul = 5;
      const realmFloorMul = 1 + Math.max(0, realmFloor - 1) * 0.06;
      hp = Math.floor(hp * realmBaseMul * realmFloorMul);
    }
    hp = buildApplyFloorContentEnemyHp(zone, hp);
    if (zone.type === "beyondBoundary") hp = Math.floor(hp * Math.max(1, Number(zone.boundaryHpMul) || 1));
    return hp;
  }
  function buildApplyDeepChaosNormalHp(env2, zone, hp) {
    const abyssDepth = Math.max(1, Math.floor(zone.depth || env2.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    const hpRamp = Math.min(0.2, Math.max(0, abyssDepth - 1) * 0.015);
    const deepNormalHpMul = abyssDepth >= 21 && abyssDepth <= 30 ? 1.2 : 1;
    return Math.floor(hp * (1 + hpRamp) * deepNormalHpMul);
  }
  function buildApplyFloorContentEnemyHp(zone, hp) {
    const benchmarkProfile = buildGetDifficultyBenchmarkProfile(zone);
    if (benchmarkProfile) return Math.floor(hp * benchmarkProfile.hp);
    if (zone.type === "skyTower") {
      const towerFloor = Math.max(1, Math.floor(zone.floor || 1));
      return Math.floor(hp * 4.2 * (1 + Math.max(0, towerFloor - 1) * 0.035));
    }
    if (zone.type === "underworld") {
      const underFloor = Math.max(1, Math.floor(zone.floor || 1));
      return Math.floor(hp * 5 * (1 + Math.max(0, underFloor - 1) * 0.045));
    }
    if (zone.type !== "oceanDepth") return hp;
    const depthTier = Math.max(0, Math.floor(zone.depthTier || 0));
    const oceanBaseMul = 5;
    const oceanTierMul = 1 + depthTier * 0.05;
    return Math.floor(hp * oceanBaseMul * oceanTierMul);
  }
  function buildApplyEnemyHpScales(zone, hp, isBoss, abyssScale) {
    const entryTuning = buildGetEntryBossTuning(zone, isBoss);
    hp = Math.floor(hp * entryTuning.hp * (zone.mapHpMul || 1));
    hp = Math.floor(hp * (abyssScale.hpMul || 1) * (isBoss ? abyssScale.bossMul || 1 : 1));
    hp = Math.max(1, Math.floor(hp * 0.92));
    if (isBoss && zone.type === "trial" && zone.id === "trial_3") hp = Math.floor(hp * 0.85);
    return hp;
  }
  function buildApplyEnemyTraitHp(hp, mods) {
    for (const source of [mods.trait, mods.cosmosMods, mods.cosmosExclusiveTrait]) if (source && source.hpMul) hp = Math.floor(hp * source.hpMul);
    return hp;
  }

  // modules/combat/enemy-spawn-defence.mjs
  function buildGetEnemyDefence(env2, zone, ctx) {
    const { enemyEle, isBoss, isElite, wispDefense } = ctx;
    const zoneProgress = clampNumber(((zone.tier || 1) - 1) / 19, 0, 1);
    const curved = zoneProgress * zoneProgress;
    const variance = buildGetZoneDefenseVariance(env2, zone);
    const defenseRamp = clampNumber(curved + variance, 0, 1);
    const bossTargets = isBoss ? buildGetBossDefenseTargets(env2, zone, enemyEle) : null;
    const rankDefense = env2.deps.ENEMY_DEFENSE_TIER20[isElite ? "elite" : "normal"];
    const rampTo = (floor, target) => floor + Math.floor(Math.max(0, target - floor) * defenseRamp);
    const drBase = isBoss ? rampTo(10, bossTargets.dr) : rampTo(0, rankDefense.dr);
    const resistBase = rampTo(5, rankDefense.res);
    const resistBases = isBoss ? { resF: rampTo(15, bossTargets.resF), resC: rampTo(15, bossTargets.resC), resL: rampTo(15, bossTargets.resL) } : { resF: resistBase, resC: resistBase, resL: resistBase };
    const chaosResBase = isBoss ? rampTo(15, bossTargets.resChaos) : resistBase;
    return { drBase, resistBases, chaosResBase, ...buildGetEnemyArmourAndEvasion(zone, ctx.loopInputs, { isBoss, isElite, wispDefense }) };
  }
  function buildGetEnemyArmourAndEvasion(zone, loopInputs, rank) {
    const defenseTierScale = Math.min(1.9, 0.6 + zone.tier * 0.08);
    const defenseLoopScale = buildGetLoopDefenseScale(loopInputs.loopCount);
    const baseArmor = Math.floor((18 + zone.tier * 26) * defenseTierScale * defenseLoopScale * buildByEnemyRank(rank, [2.2, 1.6, 1]) * rank.wispDefense.armorMul);
    const baseEvasion = Math.floor((16 + zone.tier * 24) * defenseTierScale * defenseLoopScale * buildByEnemyRank(rank, [2.1, 1.5, 1]));
    return { baseArmor, baseEvasion: Math.floor(baseEvasion * rank.wispDefense.evasionMul) };
  }
  function buildApplySpawnDefences(env2, enemy, zone, spawn) {
    const { cosmosMods, cosmosExclusiveTrait } = spawn.mods;
    buildApplyBoundaryDefenceToEnemy(enemy, zone);
    buildApplyZoneElementWard(env2, enemy, zone);
    if (typeof env2.deps.refreshBossPatternPreview === "function") env2.deps.refreshBossPatternPreview(enemy);
    if (cosmosMods) buildApplyCosmosModsToEnemy(enemy, zone, cosmosMods, spawn.isBoss);
    if (zone.id === "cosmos_astra" && spawn.isBoss) {
      enemy.astraBase = {
        dr: enemy.dr,
        armor: enemy.armor,
        evasion: enemy.evasion,
        resF: enemy.resF,
        resC: enemy.resC,
        resL: enemy.resL,
        resChaos: enemy.resChaos,
        penetration: enemy.penetration,
        critChance: enemy.critChance,
        atkMul: enemy.atkMul,
        attackSpeedVar: enemy.attackSpeedVar,
        regenRate: enemy.regenRate
      };
    }
    buildApplyCosmosExclusiveTraitToEnemy(enemy, cosmosExclusiveTrait);
    if (enemy.cosmosBossId && typeof env2.deps.refreshBossPatternPreview === "function") env2.deps.refreshBossPatternPreview(enemy);
    if (zone.type === "outsideChaos") buildApplyWoodsmanToEnemy(enemy);
  }
  function buildApplyBoundaryDefenceToEnemy(enemy, zone) {
    if (zone.type !== "beyondBoundary") return;
    enemy.dr = Math.min(90, enemy.dr + Math.max(0, Number(zone.boundaryDrBonus) || 0));
    enemy.penetration += Math.max(0, Number(zone.boundaryPenetrationBonus) || 0);
  }
  function buildApplyZoneElementWard(env2, enemy, zone) {
    const zoneWard = buildGetZoneElementWardProfile(env2, zone);
    if (!zoneWard) return;
    if (zoneWard.elem === "fire") enemy.resF = Math.min(95, enemy.resF + zoneWard.strength);
    else if (zoneWard.elem === "cold") enemy.resC = Math.min(95, enemy.resC + zoneWard.strength);
    else if (zoneWard.elem === "light") enemy.resL = Math.min(95, enemy.resL + zoneWard.strength);
  }
  function buildApplyCosmosModsToEnemy(enemy, zone, cosmosMods, isBoss) {
    const resAll = cosmosMods.resAll || 0;
    enemy.dr = Math.min(90, Math.max(0, enemy.dr + (cosmosMods.dr || 0)));
    for (const key of ["resF", "resC", "resL", "resChaos"]) enemy[key] = Math.min(95, enemy[key] + resAll + (cosmosMods[key] || 0));
    enemy.armor = Math.floor(enemy.armor * (cosmosMods.armorMul || 1));
    enemy.evasion = Math.floor(enemy.evasion * (cosmosMods.evasionMul || 1));
    enemy.dropMul *= cosmosMods.dropMul || 1;
    buildMarkCosmosEnemy(enemy, zone, isBoss);
    if (cosmosMods.hybridElement) enemy.hybridElement = cosmosMods.hybridElement;
    if (cosmosMods.energyShieldPct) buildGiveEnemyEnergyShield(enemy, cosmosMods.energyShieldPct);
    enemy.traitName = [enemy.traitName, cosmosMods.traitName].filter(Boolean).join(", ");
  }
  function buildMarkCosmosEnemy(enemy, zone, isBoss) {
    enemy.cosmosTag = zone.cosmosTag || "";
    enemy.cosmosSizeClass = Math.max(1, Math.floor(zone.sizeClass || 1));
    enemy.cosmosGravity = Math.max(1, Number(zone.gravity || 1));
    enemy.cosmosBossId = isBoss ? zone.cosmosNodeId || null : null;
    enemy.cosmosBaseElement = zone.ele || enemy.ele || "phys";
  }
  function buildGiveEnemyEnergyShield(enemy, pct) {
    enemy.maxEnergyShield = Math.max(enemy.maxEnergyShield || 0, Math.floor(enemy.maxHp * pct / 100));
    enemy.energyShield = Math.max(enemy.energyShield || 0, enemy.maxEnergyShield);
  }
  function buildApplyWoodsmanToEnemy(enemy) {
    enemy.ailResFreeze = Math.max(Number(enemy.ailResFreeze || 0), 50);
    enemy.isWoodsman = true;
    enemy.dr = Math.max(50, enemy.dr + 8);
    enemy.maxResCap = 85;
    enemy.baseResF = enemy.resF;
    enemy.baseResC = enemy.resC;
    enemy.baseResL = enemy.resL;
    enemy.baseResChaos = enemy.resChaos;
    enemy.armor = Math.floor(enemy.armor * 1.35);
    enemy.evasion = Math.floor(enemy.evasion * 1.3);
    enemy.armorGuard = Math.max(Number(enemy.armorGuard || 0), 0.12);
    enemy.evasionChance = Math.max(Number(enemy.evasionChance || 0), 12);
  }

  // modules/combat/enemy-spawn-record.mjs
  function buildBuildEnemyRecord(env2, zone, marker, spawn) {
    const { look, mods, defence, rolled } = spawn;
    const pressure = buildGetEnemyPressureRecord(env2, zone, mods.cosmosMods, spawn);
    const guards = buildGetEnemyGuardRecord(env2, look.trait, mods.cosmosMods, spawn.isBoss);
    return {
      ...buildGetEnemyIdentityRecord(env2, marker, spawn),
      ele: spawn.enemyEle,
      ...buildGetEnemyResistRecord(defence, look.trait, spawn.abyssScale, look.wispDefense),
      armor: defence.baseArmor,
      evasion: defence.baseEvasion,
      ...buildGetEnemyOffenceRecord(env2, zone, mods, spawn),
      regenRate: pressure.regenRate,
      regenSuppressPct: 0,
      penetration: pressure.penetration,
      resistanceReduction: pressure.resistanceReduction,
      hybridElement: rolled.hybridElement,
      ailmentChance: pressure.ailmentChance,
      firstHitGuard: guards.firstHitGuard,
      hitRateGuard: guards.hitRateGuard,
      recentHitsTaken: 0,
      recentHitsTimer: 0,
      patternMode: rolled.patternMode,
      patternAttackCount: 0,
      nextPatternState: null,
      patternTelegraphKey: null,
      patternTelegraphStartedAt: 0,
      ...buildGetEnemyCapRecord(zone),
      ...buildGetEnemyTraitRecord(look.trait, spawn.isElite),
      ...buildGetEnemyRewardRecord(env2, zone, mods),
      isSky: spawn.isSky
    };
  }
  function buildGetEnemyIdentityRecord(env2, marker, spawn) {
    const { look } = spawn;
    return {
      id: env2.owner.nextEnemyId++,
      level: spawn.level,
      hp: spawn.hp,
      maxHp: spawn.hp,
      name: spawn.name,
      isElite: spawn.isElite,
      isBoss: spawn.isBoss,
      bossAssetKey: look.bossAssetKey,
      bossVisualTint: look.chaosBossVisual ? look.chaosBossVisual.tint : null,
      attackTimer: ((spawn.zoneSeed + 1) * 13 + (marker.at || 0) * 3 + spawn.groupIndex * 7) % 10 / 20,
      spawnAt: marker.at,
      groupIndex: spawn.groupIndex,
      variantSeed: spawn.variantSeed,
      spriteVariantId: look.monsterVariant ? look.monsterVariant.id : null,
      monsterArchetype: look.wispVisual ? "wisp" : null,
      monsterVisualSetId: look.realmVisualSet ? look.realmVisualSet.id : null,
      monsterVisualId: look.bossVisualId || (look.realmVisual ? look.realmVisual.id : null),
      baseMonsterName: look.realmVisual ? look.realmVisual.name : look.monsterVariant ? look.monsterVariant.name : null
    };
  }
  function buildGetEnemyResistRecord(defence, trait, abyssScale, wispDefense) {
    const res = (base, key) => Math.min(95, base + buildEnemyBonus(trait, key) + (abyssScale.resistBonus || 0) + wispDefense[key]);
    return {
      dr: Math.min(90, Math.max(0, defence.drBase + buildEnemyBonus(trait, "dr") + wispDefense.dr)),
      resF: res(defence.resistBases.resF, "resF"),
      resC: res(defence.resistBases.resC, "resC"),
      resL: res(defence.resistBases.resL, "resL"),
      resChaos: res(defence.chaosResBase, "resChaos")
    };
  }
  function buildGetEnemyOffenceRecord(env2, zone, mods, spawn) {
    const { trait, cosmosMods, cosmosExclusiveTrait } = mods;
    const woodsman = zone.type === "outsideChaos";
    const guardEscort = zone.type === "cosmos" && zone.cosmosHabitat === "guard" && spawn.isElite && spawn.look.realmVisual?.id === "cosmos-ooze";
    const escortAttackSpeed = guardEscort ? env2.deps.COSMOS_ROUTE_G1.habitats.guard.escortAttackSpeed : 1;
    return {
      atkMul: buildEnemyBonus(trait, "atkMul", 1) * buildEnemyBonus(cosmosMods, "atkMul", 1) * buildEnemyBonus(cosmosExclusiveTrait, "atkMul", 1),
      damageMul: (zone.mapDamageMul || 1) * (woodsman ? 2 : 1) * buildEnemyBonus(cosmosMods, "damageMul", 1) * buildEnemyBonus(cosmosExclusiveTrait, "damageMul", 1) * buildBoundaryMul(zone, "boundaryDamageMul"),
      attackSpeedVar: (0.85 + spawn.variantSeed % 11 / 10 * 0.5) * buildEnemyBonus(trait, "attackSpeedVarMul", 1) * (woodsman ? 1.5 : 1) * buildEnemyBonus(cosmosMods, "attackSpeedMul", 1) * buildEnemyBonus(cosmosExclusiveTrait, "attackSpeedVarMul", 1) * buildBoundaryMul(zone, "boundaryAttackSpeedMul") * escortAttackSpeed,
      critChance: buildFromLoopOn(env2, 2, buildByEnemyRank(spawn, [16, 10, 4])) + buildEnemyBonus(trait, "critChanceBonus") + buildEnemyBonus(cosmosMods, "critChanceBonus") + buildEnemyBonus(cosmosExclusiveTrait, "critChanceBonus")
    };
  }
  function buildGetEnemyPressureRecord(env2, zone, cosmosMods, rank) {
    const regenMul = (zone.type === "outsideChaos" && rank.isBoss ? 0.1 : 1) * buildEnemyBonus(cosmosMods, "regenMul", 1);
    const baselineResistancePressure = buildFromLoopOn(env2, 4, buildByEnemyRank(rank, [14, 8, 3]));
    const isDeepChaos = zone.type === "abyss";
    return {
      regenRate: Math.max(buildFromLoopOn(env2, 3, buildByEnemyRank(rank, [4e-3, 22e-4, 12e-4])) * 0.12 * regenMul, Number(zone.boundaryRegenRate) || 0),
      penetration: (isDeepChaos ? 0 : baselineResistancePressure) + buildEnemyBonus(cosmosMods, "penetration"),
      resistanceReduction: isDeepChaos ? baselineResistancePressure : 0,
      ailmentChance: buildFromLoopOn(env2, 4, buildByEnemyRank(rank, [0.14, 0.08, 0.03])) + buildEnemyBonus(cosmosMods, "ailmentChanceBonus")
    };
  }
  function buildGetEnemyGuardRecord(env2, trait, cosmosMods, isBoss) {
    return {
      firstHitGuard: Math.max(buildFromLoopOn(env2, 5, isBoss ? 0.75 : trait && trait.firstHitGuard || 0), buildEnemyBonus(cosmosMods, "firstHitGuard")),
      hitRateGuard: buildFromLoopOn(env2, 5, trait && trait.hitRateGuard || (isBoss ? 0.06 : 0))
    };
  }
  function buildGetEnemyCapRecord(zone) {
    const capped = zone.type === "outsideChaos" || zone.id === "cosmos_astra" || !!zone.milestonePinnacle;
    return { disableExecute: capped, disableHpScaleDamage: capped };
  }
  function buildGetEnemyTraitRecord(trait, isElite) {
    return {
      trait: trait ? { ...trait } : null,
      traitName: trait ? trait.name : null,
      traitOutlineColor: isElite && trait ? trait.outlineColor || "#e2b94f" : null,
      leechEffMul: trait && Number.isFinite(trait.leechEffMul) ? Math.max(0, trait.leechEffMul) : 1
    };
  }
  function buildGetEnemyRewardRecord(env2, zone, mods) {
    const reward = buildBoundaryMul(zone, "boundaryRewardMul") * env2.deps.loopMutation.rewardMul(zone);
    return {
      expMul: buildEnemyRewardMul(mods.trait, "expMul") * buildEnemyRewardMul(mods.cosmosExclusiveTrait, "expMul") * reward,
      dropMul: buildEnemyRewardMul(mods.trait, "dropMul") * buildEnemyRewardMul(mods.cosmosExclusiveTrait, "dropMul") * buildGetTierDropMulWithCaps(zone.tier, zone) * reward
    };
  }

  // modules/combat/enemy-spawn.mjs
  function* buildCreateEnemy(env2, zone, marker, groupIndex) {
    const level = env2.deps.levelProgression.monsterLevel(zone, marker);
    zone = env2.deps.levelProgression.combatZone(zone);
    const loopInputs = buildGetLoopDifficultyInputs(env2, zone);
    const tierProgress = clampNumber(((zone.tier || 1) - 1) / 18, 0, 1);
    const abyssScale = env2.deps.getAbyssMonsterScales(zone);
    const markedBoss = !!marker.boss;
    const isElite = !!marker.elite && !markedBoss;
    let hp = buildGetEnemyBaseHp(env2, zone, { loopInputs, tierProgress, abyssScale, isBoss: markedBoss, isElite });
    const enemyEle = env2.deps.cosmosRouteRuntime.enemyElement(zone, markedBoss, env2.deps.pickEnemyElement(zone, buildGetEnemyElementPool(zone), markedBoss));
    const woodsman = zone.type === "outsideChaos";
    const isBoss = markedBoss || woodsman;
    if (woodsman) hp = Math.floor(hp * 120);
    let name = isBoss ? `👿 ${env2.deps.getBossNameForZone(zone, marker.storyStage ?? 0)}` : env2.deps._t("{split} 추종자", { split: zone.name.split(":")[0] });
    const { zoneSeed, variantSeed } = buildGetEnemySeeds(env2, zone, marker, groupIndex);
    const look = buildGetEnemyLook(env2, zone, marker, { isBoss, isElite, enemyEle, variantSeed });
    hp = Math.floor(hp * look.wispDefense.hpMul);
    name = buildGetEnemyLookName(name, isBoss, isElite, look);
    const cosmosMods = buildGetCosmosEnemyModifiers(env2, zone, isElite, isBoss) || buildGetZoneStaticBossMods(zone, isBoss);
    const mods = { trait: look.trait, cosmosMods, cosmosExclusiveTrait: buildGetCosmosExclusiveEnemyTrait(env2, zone, isElite, isBoss, variantSeed) };
    hp = buildApplyEnemyTraitHp(hp, mods);
    const isSky = buildRollEnemySky(env2, zone, isBoss);
    if (isSky) name = env2.deps._t("부유하는 {name}", { name });
    const defence = buildGetEnemyDefence(env2, zone, { enemyEle, isBoss, isElite, loopInputs, wispDefense: look.wispDefense });
    const rolled = { hybridElement: buildRollEnemyHybridElement(env2, zone, isBoss), patternMode: buildRollEnemyPatternMode(env2, cosmosMods, isBoss) };
    const spawn = { level, hp, name, isElite, isBoss, groupIndex, zoneSeed, variantSeed, enemyEle, abyssScale, look, mods, defence, rolled, isSky, plainBoss: !!marker.plainBoss };
    const enemy = buildBuildEnemyRecord(env2, zone, marker, spawn);
    buildFinishEnemySpawn(env2, enemy, zone, spawn);
    yield { kind: "primeEnemyHpDamageGhost", args: [enemy.id, 100] };
    return enemy;
  }
  function buildGetEnemySeeds(env2, zone, marker, groupIndex) {
    const zoneSeed = Number.isFinite(zone.id) ? zone.id : env2.deps.hashSeed(zone.id || zone.name || "zone");
    return { zoneSeed, variantSeed: ((zoneSeed + 1) * 37 + (marker.at || 0) * 13 + groupIndex * 17) % 997 };
  }
  function buildRollEnemyHybridElement(env2, zone, isBoss) {
    return (env2.owner.season || 1) >= 3 ? (isBoss && env2.deps.getChaosBossElements(zone) || [null, env2.deps.rndChoice(env2.deps.CHAOS_BOSS_ELEMENTS)])[1] : null;
  }
  function buildRollEnemyPatternMode(env2, cosmosMods, isBoss) {
    return cosmosMods && cosmosMods.patternMode || (isBoss ? env2.deps.rndChoice(env2.deps.getBossPatternModesForLoop(env2.owner.season || 1)) || null : null);
  }
  function buildHardenMeteorCore(enemy, ele) {
    const key = METEOR_CORE_GUARD[ele] || "resF";
    enemy[key] = Math.min(key === "dr" ? 90 : 95, (enemy[key] || 0) + 12);
  }
  function buildTuneMeteorEnemy(env2, enemy, zone) {
    if (zone.type !== "meteor") return;
    const kind = env2.deps.METEOR_KINDS.find((row) => row.id === zone.meteorKind) || env2.deps.METEOR_KINDS[0];
    enemy.ele = kind.ele;
    if (enemy.isBoss) {
      buildHardenMeteorCore(enemy, kind.ele);
    } else if (enemy.isElite) {
      enemy.ele = kind.eliteEle || kind.ele;
      enemy.attackRange = env2.deps.COMBAT_GRID_CONFIG.rangedEnemyMaxRange;
      enemy.attackDelivery = "projectileCell";
      enemy.projectileToEdge = true;
      enemy.attackCastMs = 900;
      enemy.attackCastSpecial = true;
      enemy.attackLabel = "별철 관통";
    } else if (enemy.monsterVisualId === "meteor-shard") {
      enemy.attackSpeedVar *= 1.2;
      enemy.maxHp = Math.floor(enemy.maxHp * 0.85);
    } else {
      enemy.dr = Math.min(90, enemy.dr + 6);
      enemy.maxHp = Math.floor(enemy.maxHp * 1.2);
    }
    enemy.hp = enemy.maxHp;
  }
  function buildFinishEnemySpawn(env2, enemy, zone, spawn) {
    buildApplySpawnDefences(env2, enemy, zone, spawn);
    buildApplyZoneEnemyMods(env2, enemy, zone);
    env2.deps.applyGrandBreachMobTuning(zone, enemy);
    env2.deps.assignEnemyGridCombatProfile(enemy);
    buildTuneMeteorEnemy(env2, enemy, zone);
    if (typeof env2.deps.maybeApplySeveredWanderer === "function") env2.deps.maybeApplySeveredWanderer(enemy, zone, spawn.isElite, spawn.isBoss);
    if (!spawn.plainBoss) buildFinishBossSpawn(env2, enemy, zone);
    env2.deps.atlasEndgame.markOmenBearer(env2.owner, enemy, zone);
  }
  function buildFinishBossSpawn(env2, enemy, zone) {
    if (!enemy.isBoss) return;
    env2.deps.startHiddenJournalBossRun(enemy, zone);
    if (typeof env2.deps.bossVariants === "object") env2.deps.bossVariants.maybeApply(enemy, zone);
  }
  function buildGetEnemyElementPool(zone) {
    return zone.ele === "chaos" ? ["fire", "cold", "light", "chaos"] : ["phys", zone.ele || "phys", "fire", "cold", "light", "chaos"];
  }
  function buildRollEnemySky(env2, zone, isBoss) {
    return (env2.owner.season || 1) >= 4 && zone.type === "abyss" && !isBoss && Math.random() < 0.08;
  }

  // modules/combat/zone-encounter-profiles.mjs
  var encounterProfiles = /* @__PURE__ */ Object.freeze({
    beyondBoundary: encounterForBeyondBoundary,
    cosmos: encounterForCosmos,
    chaosRealm: buildGetChaosRealmEncounterProfile,
    skyTower: encounterForSkyTower,
    underworld: buildGetUnderworldEncounterProfile,
    meteor: encounterForMeteor,
    trial: encounterForTrial,
    timeRift: encounterForTimeRift,
    seasonBoss: encounterForSeasonBoss,
    labyrinth: buildGetLabyrinthEncounterProfile,
    abyss: buildGetAbyssEncounterProfile,
    oceanDepth: encounterForOceanDepth
  });
  function buildGetZoneEncounterProfile(env2, zone) {
    if (Object.hasOwn(encounterProfiles, zone.type)) return encounterProfiles[zone.type](env2, zone);
    let minPack = 1;
    let zoneIdNum = Number.isFinite(zone.id) ? zone.id : Number(zone.tier) || 1;
    let maxPack = Math.min(3, 1 + Math.floor((zoneIdNum + 2) / 3));
    return {
      markerCount: 3 + Math.floor(zone.tier * 0.8),
      minPack,
      maxPack,
      eliteChance: 0.05 + zone.tier * 0.015,
      bossAdds: zone.tier >= 4 ? 1 : 0,
      label: env2.deps._t("{minPack}-{maxPack}기", { minPack, maxPack })
    };
  }
  function encounterForBeyondBoundary(env2, zone) {
    let difficulty = Math.max(1, Math.floor(Number(zone.boundaryDifficultyTier) || Number(zone.boundaryTier) || 1));
    let displayTier = Math.max(1, Math.floor(Number(zone.boundaryTier) || 1));
    return {
      markerCount: Math.min(8, 3 + Math.floor(difficulty / 20)),
      minPack: 2,
      maxPack: Math.min(7, 3 + Math.floor(difficulty / 12)),
      eliteChance: Math.min(0.65, 0.2 + difficulty * 8e-3),
      bossAdds: Math.min(4, Math.floor(difficulty / 15)),
      label: env2.deps._t("경계 너머 {displayTier}단계", { displayTier })
    };
  }
  function encounterForCosmos(env2, zone) {
    let gravity = Math.max(1, Number(zone.gravity || 1));
    let sizeClass = Math.max(1, Math.floor(zone.sizeClass || 1));
    let markerCount = Math.max(4, Math.min(12, 4 + sizeClass + Math.floor((gravity - 1) * 4)));
    let minPack = Math.max(2, Math.min(6, 2 + Math.floor(sizeClass / 2)));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2 + Math.floor((gravity - 1) * 2)));
    return env2.deps.cosmosRouteRuntime.encounterProfile(zone, { markerCount, minPack, maxPack, eliteChance: Math.min(0.75, 0.16 + sizeClass * 0.05), bossAdds: 2 + Math.floor(sizeClass / 2), label: zone.name || "우주계" });
  }
  function encounterForSkyTower(env2, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(9, 2 + Math.floor(floor / 10));
    let maxPack = Math.min(10, minPack + 2 + Math.floor(floor / 18));
    return { markerCount: 40 + Math.floor(floor / 3), minPack, maxPack: Math.max(minPack, maxPack), eliteChance: Math.min(0.5, 0.18 + floor * 6e-3), bossAdds: 2 + Math.floor(floor / 12), label: env2.deps._t("창공의 탑 {floor}층", { floor }) };
  }
  function encounterForMeteor(env2) {
    return { markerCount: 2, minPack: 2, maxPack: 3, eliteChance: 0.5, bossAdds: 0, label: env2.deps._t("운석") };
  }
  function encounterForTrial(env2) {
    return { markerCount: 3, minPack: 1, maxPack: 2, eliteChance: 1, bossAdds: 2, label: env2.deps._t("시련") };
  }
  function encounterForTimeRift(env2, zone) {
    let pressure = Math.max(1, Math.floor(zone.pressure || 1));
    return { markerCount: 3 + Math.floor(pressure / 3), minPack: 2, maxPack: Math.min(6, 3 + Math.floor(pressure / 4)), eliteChance: Math.min(0.8, 0.3 + pressure * 0.05), bossAdds: 1 + Math.floor(pressure / 5), label: env2.deps._t("시간의 균열 (시간압 {pressure})", { pressure }) };
  }
  function encounterForSeasonBoss(env2) {
    return { markerCount: 1, minPack: 1, maxPack: 1, eliteChance: 1, bossAdds: 0, label: env2.deps._t("보스") };
  }
  function encounterForOceanDepth(env2, zone) {
    let depthTier = Math.max(0, Math.floor(zone.depthTier || 0));
    let minPack = Math.min(6, 2 + Math.floor(depthTier / 4));
    let maxPack = Math.min(8, minPack + 2);
    return {
      markerCount: 4 + Math.floor(depthTier * 0.5),
      minPack,
      maxPack,
      eliteChance: Math.min(0.4, 0.08 + depthTier * 0.01),
      bossAdds: 0,
      label: zone.name || "심해"
    };
  }
  function buildGetChaosRealmEncounterProfile(env2, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    return {
      markerCount: Math.min(16, 4 + Math.floor(floor / 8)),
      minPack: 2,
      maxPack: Math.min(8, 3 + Math.floor(floor / 6)),
      eliteChance: 0.35,
      bossAdds: Math.min(6, 2 + Math.floor(floor / 12)),
      label: env2.deps._t("혼돈계 {floor}층", { floor })
    };
  }
  function buildGetUnderworldEncounterProfile(env2, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(7, 3 + Math.floor(floor / 12));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2 + Math.floor(floor / 20)));
    return {
      markerCount: Math.min(16, 5 + Math.floor(floor / 8)),
      minPack,
      maxPack,
      eliteChance: Math.min(0.55, 0.2 + floor * 0.012),
      bossAdds: Math.min(6, 2 + Math.floor(floor / 20)),
      label: env2.deps._t("지하계 {floor}층", { floor })
    };
  }
  function buildGetLabyrinthEncounterProfile(env2, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(7, 2 + Math.floor(floor / 10));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2));
    return {
      markerCount: Math.min(18, 5 + Math.floor(floor / 5)),
      minPack,
      maxPack,
      eliteChance: Math.min(0.46, 0.14 + floor * 9e-3),
      bossAdds: floor % 5 === 0 ? 2 : 1,
      label: env2.deps._t("미궁 {floor}층", { floor })
    };
  }
  function buildGetAbyssEncounterProfile(env2, zone) {
    let scale = env2.deps.getAbyssMonsterScales(zone);
    let depth = Math.max(1, Math.floor(zone.depth || env2.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    let minPack = Math.max(1, Math.floor((2 + Math.floor(zone.tier / 7)) * (scale.hordeMul || 1)));
    let maxPack = Math.max(minPack, Math.floor(Math.min(10, 4 + Math.floor(zone.tier * 0.42)) * (scale.hordeMul || 1)));
    let markerCount = Math.max(6, Math.floor((8 + Math.floor(zone.tier * 0.48)) * (scale.mapLengthMul || 1)));
    let bossAdds = 2 + Math.floor(zone.tier / 4);
    if (depth >= 21) {
      minPack = Math.min(7, minPack);
      maxPack = Math.max(minPack, Math.min(11, maxPack));
      markerCount = Math.min(20, markerCount);
      bossAdds = Math.min(7, bossAdds);
    }
    return {
      markerCount,
      minPack,
      maxPack,
      eliteChance: Math.min(0.8, 0.13 + zone.tier * 0.012 + (scale.eliteBonus || 0)),
      bossAdds,
      label: env2.deps._t("{minPack}-{maxPack}기", { minPack, maxPack })
    };
  }

  // modules/ui/chaos-bonus-details.mjs
  function buildGetChaosRealmBonusSummary(env2) {
    let b = env2.deps.ensureChaosRealmState().permanentBonuses || {};
    const rows = [
      ["피해 +{pctDmg}%", "pctDmg", "pctDmg", true],
      ["이속 +{move}%", "move", "move", true],
      ["생명력 +{pctHp}%", "pctHp", "pctHp", true],
      ["카오스저항 +{floor}%", "resChaos", "floor"],
      ["치명 +{floor}%", "crit", "floor"],
      ["관통 +{floor}%", "resPen", "floor"],
      ["방어/회피/보호막 +{floor}%", "armorPct", "floor"],
      ["치피 +{floor}%", "critDmg", "floor"],
      ["공속 +{floor}%", "aspd", "floor"]
    ];
    return rows.map(([label, field, param, decimal]) => env2.deps._t(label, {
      [param]: decimal ? (b[field] || 0).toFixed(1) : Math.floor(b[field] || 0)
    })).join(", ");
  }

  // modules/combat-enemy-build-classic.mjs
  var deps = {
    get skillEffectExpansion() {
      return skillEffectExpansion;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get skillGemCasts() {
      return skillGemCasts;
    },
    get selectGridSkillTargets() {
      return selectGridSkillTargets;
    },
    get ACT_EXPLORATION_VISION() {
      return ACT_EXPLORATION_VISION;
    },
    get ensureCombatGridRuntime() {
      return ensureCombatGridRuntime;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get resolveConditionalCombatTactics() {
      return resolveConditionalCombatTactics;
    },
    get normalizeCombatTacticsSettings() {
      return normalizeCombatTacticsSettings;
    },
    get getSkillGridProfile() {
      return getSkillGridProfile;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get isPlayerAttackRecovering() {
      return isPlayerAttackRecovering;
    },
    get advanceGridTacticalMovement() {
      return advanceGridTacticalMovement;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get getSkillBand() {
      return getSkillBand;
    },
    get getTacticalMoveAttackDelayMs() {
      return getTacticalMoveAttackDelayMs;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    },
    get copyCombatGridCell() {
      return copyCombatGridCell;
    },
    get gridStepToward() {
      return gridStepToward;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get findFreeGridCell() {
      return findFreeGridCell;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get hasPlayerChannelBreakingAilment() {
      return hasPlayerChannelBreakingAilment;
    },
    get getBossWarningCells() {
      return getBossWarningCells;
    },
    get isTrialHazardPositionHeld() {
      return isTrialHazardPositionHeld;
    },
    get isApexFight() {
      return isApexFight;
    },
    get bossWarningApproach() {
      return bossWarningApproach;
    },
    get getCombatChannelGate() {
      return getCombatChannelGate;
    },
    get groundHazardCells() {
      return groundHazardCells;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get syncCombatTacticsEncounterRuntime() {
      return syncCombatTacticsEncounterRuntime;
    },
    get resolvePlayerApproachTarget() {
      return resolvePlayerApproachTarget;
    },
    get advanceGridUnitMovement() {
      return advanceGridUnitMovement;
    },
    get canGridUnitStepToward() {
      return canGridUnitStepToward;
    },
    get findNearestGridEnemy() {
      return findNearestGridEnemy;
    },
    get gridCellKey() {
      return gridCellKey;
    },
    get getGridApproachStep() {
      return getGridApproachStep;
    },
    get getGridBandApproachCell() {
      return getGridBandApproachCell;
    },
    get getChaosRealmAffixScale() {
      return getChaosRealmAffixScale;
    },
    get getChaosRealmAffixes() {
      return getChaosRealmAffixes;
    },
    get atlasMaps() {
      return atlasMaps;
    },
    get getZone() {
      return getZone;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get ensureChaosRealmState() {
      return ensureChaosRealmState;
    },
    get _t() {
      return _t;
    },
    get cosmosRouteRuntime() {
      return cosmosRouteRuntime;
    },
    get getCosmosGalaxyBossMechanic() {
      return typeof getCosmosGalaxyBossMechanic === "undefined" ? void 0 : getCosmosGalaxyBossMechanic;
    },
    get i18n() {
      return i18n;
    },
    get cosmosGravityHarness() {
      return typeof window.getCosmosMasteryValue === "function" ? Math.max(0, Number(window.getCosmosMasteryValue("gravityHarness")) || 0) : 0;
    },
    get cosmosGalaxyEnvironment() {
      return globalThis.COSMOS_GALAXY_ENVIRONMENT_DB;
    },
    get ACT_LOOP_SCALE_CAP() {
      return ACT_LOOP_SCALE_CAP;
    },
    get getAbyssDepthFromZoneId() {
      return getAbyssDepthFromZoneId;
    },
    get CHAOS_LOOP_RAMP_PER_DEPTH() {
      return CHAOS_LOOP_RAMP_PER_DEPTH;
    },
    get MONSTER_LOOP_GROWTH() {
      return MONSTER_LOOP_GROWTH;
    },
    get MONSTER_LOOP_HP_CURVE() {
      return MONSTER_LOOP_HP_CURVE;
    },
    get BOSS_LOOP_HP_SHARE() {
      return BOSS_LOOP_HP_SHARE;
    },
    get BOSS_TIER_HP_EASE() {
      return BOSS_TIER_HP_EASE;
    },
    get MONSTER_LOOP_POWER_SCALE() {
      return MONSTER_LOOP_POWER_SCALE;
    },
    get UNDERWORLD_DIFFICULTY_CONFIG() {
      return UNDERWORLD_DIFFICULTY_CONFIG;
    },
    get BOSS_DEFENSE_SPECIALTIES() {
      return BOSS_DEFENSE_SPECIALTIES;
    },
    get ENEMY_DEFENSE_TIER20() {
      return ENEMY_DEFENSE_TIER20;
    },
    get hashSeed() {
      return hashSeed;
    },
    get ENEMY_TRAIT_POOL() {
      return ENEMY_TRAIT_POOL;
    },
    get getBossAssetKeyForZone() {
      return typeof getBossAssetKeyForZone === "undefined" ? void 0 : getBossAssetKeyForZone;
    },
    get WISP_ENEMY_RULES() {
      return WISP_ENEMY_RULES;
    },
    get WISP_NEUTRAL_RULES() {
      return WISP_NEUTRAL_RULES;
    },
    get getRealmMonsterVisualSet() {
      return typeof getRealmMonsterVisualSet === "undefined" ? void 0 : getRealmMonsterVisualSet;
    },
    get getMonsterVariantDefinition() {
      return typeof getMonsterVariantDefinition === "undefined" ? void 0 : getMonsterVariantDefinition;
    },
    get getRealmMonsterVisualDefinition() {
      return typeof getRealmMonsterVisualDefinition === "undefined" ? void 0 : getRealmMonsterVisualDefinition;
    },
    get refreshBossPatternPreview() {
      return typeof refreshBossPatternPreview === "undefined" ? void 0 : refreshBossPatternPreview;
    },
    get COSMOS_ROUTE_G1() {
      return COSMOS_ROUTE_G1;
    },
    get loopMutation() {
      return loopMutation;
    },
    get levelProgression() {
      return levelProgression;
    },
    get getAbyssMonsterScales() {
      return getAbyssMonsterScales;
    },
    get pickEnemyElement() {
      return pickEnemyElement;
    },
    get getBossNameForZone() {
      return getBossNameForZone;
    },
    get getChaosBossElements() {
      return getChaosBossElements;
    },
    get rndChoice() {
      return rndChoice;
    },
    get CHAOS_BOSS_ELEMENTS() {
      return CHAOS_BOSS_ELEMENTS;
    },
    get getBossPatternModesForLoop() {
      return getBossPatternModesForLoop;
    },
    get METEOR_KINDS() {
      return METEOR_KINDS;
    },
    get applyGrandBreachMobTuning() {
      return applyGrandBreachMobTuning;
    },
    get assignEnemyGridCombatProfile() {
      return assignEnemyGridCombatProfile;
    },
    get maybeApplySeveredWanderer() {
      return typeof maybeApplySeveredWanderer === "undefined" ? void 0 : maybeApplySeveredWanderer;
    },
    get atlasEndgame() {
      return atlasEndgame;
    },
    get startHiddenJournalBossRun() {
      return startHiddenJournalBossRun;
    },
    get bossVariants() {
      return typeof bossVariants === "undefined" ? void 0 : bossVariants;
    }
  };
  var runtime = {
    get combatTacticsRuntime() {
      return window.GameModules.state.combat.combatTacticsRuntime;
    },
    get pendingEnemyCombatAttacks() {
      return window.GameModules.state.combat.pendingEnemyCombatAttacks;
    }
  };
  var env = { get owner() {
    return game;
  }, runtime, memory: createEnemyWardMemory(), deps };
  var presentation = {
    chaosFloorBonusMessage(floor) {
      const chaosRealmBonusSummary = buildGetChaosRealmBonusSummary(env);
      return _t("🌌 혼돈계 {floor}층 최초 돌파 보너스: {chaosRealmBonusSummary}", { floor, chaosRealmBonusSummary });
    },
    get addBattleFx() {
      return addBattleFx;
    },
    get addLog() {
      return addLog;
    },
    get primeEnemyHpDamageGhost() {
      return typeof primeEnemyHpDamageGhost === "undefined" ? void 0 : primeEnemyHpDamageGhost;
    }
  };
  function runCommands(commands) {
    let step = commands.next();
    while (!step.done) {
      const command = step.value, effect = presentation[command.kind];
      if (command.kind === "primeEnemyHpDamageGhost" && typeof effect !== "function") step = commands.next();
      else step = commands.next(effect(...command.args));
    }
    return step.value;
  }
  var api = {
    addUncappedSkillTargets(skill, name) {
      return buildAddUncappedSkillTargets(env, skill, name);
    },
    getSkillTargetPreference(tactics, now) {
      return buildGetSkillTargetPreference(env, tactics, now);
    },
    selectCombatGemTargets(name, skill, source, enemies, options) {
      return buildSelectCombatGemTargets(env, name, skill, source, { enemies, options });
    },
    getSplashDormantEnemies() {
      return buildGetSplashDormantEnemies(env);
    },
    getAttackTargets(pStats) {
      return buildGetAttackTargets(env, pStats);
    },
    beginSkillMobility(pStats, target, isStageReplay) {
      return runCommands(buildBeginSkillMobility(env, pStats, target, isStageReplay));
    },
    applySkillMobilityBeforeAttack(skill, target, pStats) {
      return runCommands(buildApplySkillMobilityBeforeAttack(env, skill, target, pStats));
    },
    advancePlayerExplorationFrame(now, pStats) {
      return buildAdvancePlayerExplorationFrame(env, now, pStats);
    },
    continuePlayerExplorationApproach(pStats) {
      return buildContinuePlayerExplorationApproach(env, pStats);
    },
    updatePlayerGridEngagement(pStats, options) {
      return buildUpdatePlayerGridEngagement(env, pStats, options);
    },
    warningAllowsStep(target, avoidCells) {
      return buildWarningAllowsStep(env, target, avoidCells);
    },
    maybeUnlockChaosRealmFromWoodsman(enemy, options) {
      return runCommands(buildMaybeUnlockChaosRealmFromWoodsman(env, enemy, options));
    },
    applyZoneEnemyMods(enemy, zone) {
      return buildApplyZoneEnemyMods(env, enemy, zone);
    },
    grantChaosRealmFloorBonus(floor) {
      return runCommands(buildGrantChaosRealmFloorBonus(env, floor));
    },
    applyCosmosJudgmentOnHit(enemy, pStats, element) {
      return buildApplyCosmosJudgmentOnHit(enemy, pStats, element);
    },
    getBossDefenseTargets(zone, ele) {
      return buildGetBossDefenseTargets(env, zone, ele);
    },
    getCosmosExclusiveEnemyTrait(zone, isElite, isBoss, seed) {
      return buildGetCosmosExclusiveEnemyTrait(env, zone, isElite, isBoss, seed);
    },
    applyCosmosBossPlayerDebuff(enemy) {
      return runCommands(buildApplyCosmosBossPlayerDebuff(env, enemy));
    },
    applyCosmosBossAttackSetup(enemy, pattern, pStats) {
      return buildApplyCosmosBossAttackSetup(env, enemy, pattern, pStats);
    },
    applyCosmosPlayerDebuffsToStats(pStats) {
      return buildApplyCosmosPlayerDebuffsToStats(env, pStats);
    },
    getCosmosEnemyModifiers(zone, isElite, isBoss) {
      return buildGetCosmosEnemyModifiers(env, zone, isElite, isBoss);
    },
    getSoftenedLoopDepth(depth) {
      return buildGetSoftenedLoopDepth(depth);
    },
    getLoopDifficultyInputs(zone) {
      return buildGetLoopDifficultyInputs(env, zone);
    },
    getMonsterLoopGrowthScale(zone, kind, seasonDepth, tierShare) {
      return buildGetMonsterLoopGrowthScale(env, zone, kind, seasonDepth, tierShare);
    },
    getMonsterLoopHpMultiplier(zone, loopInputs, tierProgress) {
      return buildGetMonsterLoopHpMultiplier(env, zone, loopInputs, tierProgress);
    },
    getBossHpEase(tier, loopMul) {
      return buildGetBossHpEase(env, tier, loopMul);
    },
    getEliteLoopHpMultiplier(zone, loopCount) {
      return buildGetEliteLoopHpMultiplier(zone, loopCount);
    },
    getMonsterLoopPowerScale(zone, kind) {
      return buildGetMonsterLoopPowerScale(env, zone, kind);
    },
    interpolateLoopCurve(points, loop) {
      return buildInterpolateLoopCurve(points, loop);
    },
    getLoopHpScale(loopCount) {
      return buildGetLoopHpScale(loopCount);
    },
    getDifficultyBenchmarkProfile(zone) {
      return buildGetDifficultyBenchmarkProfile(zone);
    },
    getEntryBossTuning(zone, isBoss) {
      return buildGetEntryBossTuning(zone, isBoss);
    },
    getUnderworldEnemyDamageMultiplier(zone) {
      return buildGetUnderworldEnemyDamageMultiplier(env, zone);
    },
    getWispEnemyDefenseBonuses(monsterVariant) {
      return buildGetWispEnemyDefenseBonuses(env, monsterVariant);
    },
    getEnemyGemDropMul(enemy) {
      return buildGetEnemyGemDropMul(env, enemy);
    },
    createEnemy(zone, marker, groupIndex) {
      return runCommands(buildCreateEnemy(env, zone, marker, groupIndex));
    },
    getEnemySeeds(zone, marker, groupIndex) {
      return buildGetEnemySeeds(env, zone, marker, groupIndex);
    },
    getEnemyRewardRecord(zone, mods) {
      return buildGetEnemyRewardRecord(env, zone, mods);
    },
    tuneMeteorEnemy(enemy, zone) {
      return buildTuneMeteorEnemy(env, enemy, zone);
    },
    giveEnemyEnergyShield(enemy, pct) {
      return buildGiveEnemyEnergyShield(enemy, pct);
    },
    finishBossSpawn(enemy, zone) {
      return buildFinishBossSpawn(env, enemy, zone);
    },
    getZoneEncounterProfile(zone) {
      return buildGetZoneEncounterProfile(env, zone);
    },
    resolveMapEstimateContentScale(zone) {
      return buildResolveMapEstimateContentScale(env, zone);
    },
    getSkillTargets(pStats, dormant) {
      return buildGetSkillTargets(env, pStats, dormant);
    }
  };
  safeExposeGlobals(api);
})();
