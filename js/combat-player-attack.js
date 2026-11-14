// GENERATED from modules/combat-player-attack*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/stat-bucket.mjs
  function createEmptyStatBucket() {
    return {
      flatDmg: 0,
      weaponFlatDmgPct: 0,
      pctDmg: 0,
      flatHp: 0,
      pctHp: 0,
      aspd: 0,
      crit: 0,
      move: 0,
      cooldownRecovery: 0,
      cooldownReduction: 0,
      mobilityCooldownRecovery: 0,
      mobilityCooldownReduction: 0,
      cooldownReductionCapBonus: 0,
      sight: 0,
      sightCap: 0,
      chestGrade: 0,
      gemLevel: 0,
      elementalGemLevel: 0,
      fireGemLevel: 0,
      coldGemLevel: 0,
      lightGemLevel: 0,
      chaosGemLevel: 0,
      physGemLevel: 0,
      projectileGemLevel: 0,
      meleeGemLevel: 0,
      slamGemLevel: 0,
      spellGemLevel: 0,
      dotGemLevel: 0,
      aoeGemLevel: 0,
      strGemLevel: 0,
      dexGemLevel: 0,
      intGemLevel: 0,
      suppCap: 0,
      runeResonancePower: 0,
      regenFlat: 0,
      dr: 0,
      physIgnore: 0,
      resPen: 0,
      resF: 0,
      resC: 0,
      resL: 0,
      maxResAll: 0,
      maxResF: 0,
      maxResC: 0,
      maxResL: 0,
      maxResChaos: 0,
      resChaos: 0,
      leech: 0,
      leechRateCap: 0,
      leechTotalCap: 0,
      leechInstanceCap: 0,
      leechKeepFullLife: 0,
      critDmg: 0,
      regen: 0,
      regenSuppress: 0,
      ds: 0,
      expGain: 0,
      minDmgRoll: 0,
      maxDmgRoll: 0,
      slamEchoChance: 0,
      slamEchoDamagePct: 0,
      doubleDamageChance: 0,
      blockChanceMax: 0,
      physFlatTakenReduce: 0,
      fireFlatTakenReduce: 0,
      coldFlatTakenReduce: 0,
      lightFlatTakenReduce: 0,
      chaosFlatTakenReduce: 0,
      allFlatTakenReduce: 0,
      physTakenAsFire: 0,
      physTakenAsCold: 0,
      physTakenAsLight: 0,
      physTakenAsChaos: 0,
      addedFireDamagePct: 0,
      addedColdDamagePct: 0,
      addedLightDamagePct: 0,
      addedChaosDamagePct: 0,
      addedPhysDamagePct: 0,
      fireFlatDmg: 0,
      coldFlatDmg: 0,
      lightFlatDmg: 0,
      chaosFlatDmg: 0,
      physFlatDmg: 0,
      meleePctDmg: 0,
      slamPctDmg: 0,
      projectilePctDmg: 0,
      physPctDmg: 0,
      elementalPctDmg: 0,
      firePctDmg: 0,
      coldPctDmg: 0,
      lightPctDmg: 0,
      chaosPctDmg: 0,
      aoePctDmg: 0,
      dotPctDmg: 0,
      spellPctDmg: 0,
      shieldPctDmg: 0,
      minePctDmg: 0,
      potionPctDmg: 0,
      mobilityPctDmg: 0,
      channelingPctDmg: 0,
      igniteChance: 0,
      chillChance: 0,
      freezeChance: 0,
      shockChance: 0,
      poisonChance: 0,
      bleedChance: 0,
      spellFlatDmg: 0,
      spellFlatPct: 0,
      targetAny: 0,
      targetProjectile: 0,
      targetSlam: 0,
      projectileExtraShots: 0,
      projectileExtraChance: 0,
      projectileChain: 0,
      igniteDurationPct: 0,
      chillDurationPct: 0,
      freezeDurationPct: 0,
      shockDurationPct: 0,
      poisonDurationPct: 0,
      bleedDurationPct: 0,
      skillDelayReduce: 0,
      attackPctDmg: 0,
      spellLeech: 0,
      spellCritDmg: 0,
      spellRepeatChance: 0,
      strength: 0,
      dexterity: 0,
      intelligence: 0,
      accuracy: 0,
      mystique: 0,
      devotion: 0,
      cycle: 0,
      ailmentDamagePct: 0,
      ailmentPotencyPct: 0,
      armor: 0,
      evasion: 0,
      energyShield: 0,
      armorPct: 0,
      evasionPct: 0,
      energyShieldPct: 0,
      energyShieldRegen: 0,
      energyShieldRechargeFaster: 0,
      deflectChance: 0,
      deflectDamageReduce: 0,
      blockChance: 0,
      blockChancePct: 0,
      ailResIgnite: 0,
      ailResShock: 0,
      ailResFreeze: 0,
      ailResPoison: 0,
      ailResBleed: 0,
      chillEffectReducePct: 0,
      freezeDurationReducePct: 0,
      shockEffectReducePct: 0,
      igniteDamageReducePct: 0,
      bleedDamageReducePct: 0,
      poisonDamageReducePct: 0,
      dotTakenDamageReducePct: 0,
      takenDamageReduceWhen2EnemiesPct: 0,
      takenDamageReduceWhen1EnemyPct: 0,
      genericTakenDamageReducePct: 0,
      critTakenDamageReducePct: 0,
      igniteTakenDurationReducePct: 0,
      shockTakenDurationReducePct: 0,
      coldTakenDurationReducePct: 0,
      poisonTakenDurationReducePct: 0,
      bleedTakenDurationReducePct: 0,
      shockedEnemyHitDamageMorePct: 0,
      shockedEnemyHitDamagePct: 0,
      igniteDamageMultiplierPct: 0,
      poisonDamageMultiplierPct: 0,
      accuracyBonusPct: 0,
      chillEffect: 0,
      shockEffect: 0,
      summonFlatDmg: 0,
      summonPctDmg: 0,
      summonAspd: 0,
      summonHpPct: 0,
      summonCrit: 0,
      summonCritDmg: 0,
      summonCap: 0,
      summonEfficiency: 0,
      summonGuardRedirectPct: 0,
      summonResPen: 0,
      summonGemLevel: 0,
      curseCap: 0,
      oxygenMax: 0,
      oxygenRegen: 0,
      oceanPressureResist: 0,
      oceanDepthGainPct: 0,
      oceanRareFishChancePct: 0,
      bossDamagePct: 0,
      eliteDamagePct: 0,
      firstStrikeDamagePct: 0,
      cullStrikePct: 0,
      echoPower: 0,
      chaosErosion: 0,
      chaosErosionCap: 0,
      // 우주계 보스 유물석과 보스 부적의 줄(js/combat.js가 reward에서 읽는다): 통에 없어 addStatToBucket이 버렸다(2026-10-20).
      firstHitDamageMorePct: 0,
      cosmosAlwaysFirstHitChancePct: 0,
      uniqueInstantLeechPct: 0,
      cosmosLightningVariance: 0,
      cosmosBossDamageMorePct: 0,
      regionPoisonSpread: 0,
      regionChaosShred: 0,
      regionPoisonedLeech: 0,
      regionChaosOvercap: 0,
      regionBlockEmpower: 0,
      regionArmorToPhys: 0,
      regionBleedingDamage: 0,
      regionLowLifeDR: 0,
      regionShockChain: 0,
      regionCritMove: 0,
      regionShockSpread: 0,
      regionShockedLightPen: 0,
      regionIgniteSpread: 0,
      regionFullLifeFire: 0,
      regionIgniteDuration: 0,
      regionIgnitedDamage: 0,
      regionFrozenCritDamage: 0,
      regionShatter: 0,
      regionChillOnHit: 0,
      regionChilledAttackerDR: 0
    };
  }
  var DIRECT_STAT_BUCKET_KEYS = new Set(Object.keys(createEmptyStatBucket()).filter((key) => key !== "oxygenMax" && key !== "oxygenRegen"));
  var COMPOSITE_STAT_BUCKET_LINES = Object.freeze({
    resAll: [["resF", 1, 0], ["resC", 1, 0], ["resL", 1, 0]],
    moveEvasion: [["move", 1, 0], ["evasionPct", 1, 0]],
    hpArmor: [["flatHp", 1, 0], ["armor", 2, 0]],
    aspdMove: [["aspd", 1, 0], ["move", 1, 0]],
    chaosResElemPenalty: [["resChaos", 1, 0], ["resF", -1, 0], ["resC", -1, 0], ["resL", -1, 0]],
    deflectMajor: [["deflectChance", 1, 0], ["deflectDamageReduce", 0, 3]],
    targetCount: [["targetAny", 1, 0]]
  });
  function addStatToBucket(bucket, statId, value) {
    value = Number(value);
    if (typeof statId !== "string" || !Number.isFinite(value)) return;
    if (DIRECT_STAT_BUCKET_KEYS.has(statId)) {
      bucket[statId] += value;
      return;
    }
    if (!Object.hasOwn(COMPOSITE_STAT_BUCKET_LINES, statId)) return;
    for (const [key, multiplier, flat] of COMPOSITE_STAT_BUCKET_LINES[statId]) {
      bucket[key] += value * multiplier + flat;
    }
  }

  // modules/combat/player-hit-modifiers.mjs
  function castGetPotionKeystoneHitScale(flags) {
    return (flags.explosiveDistill ? 0.75 : 1) * (flags.potionOverdose ? 1.5 : 1);
  }
  function castScaleKeystoneAttackSpeed(aspd, flags) {
    const scale = (flags.maximumRoll ? 0.7 : 1) * (flags.potionOverdose ? 0.75 : 1);
    return scale < 1 ? Math.max(0.1, aspd * scale) : aspd;
  }
  function castAddThousandBottlesStats(bucket) {
    addStatToBucket(bucket, "armorPct", 25);
    addStatToBucket(bucket, "resAll", 12);
    addStatToBucket(bucket, "aspd", 8);
    addStatToBucket(bucket, "pctDmg", 10);
  }
  function castGetPassiveKeystoneHitMultiplier(env2, pStats, target, contact) {
    const flags = pStats.passiveKeystoneFlags || {};
    let multiplier = castFarshotMultiplier(env2, target, flags);
    if (flags.projectileFormation && contact.targetIndex > 0) multiplier *= 0.6;
    multiplier *= castGetPotionKeystoneHitScale(flags);
    if (flags.erosionLegacy && pStats.sSkill.ele === "chaos") multiplier *= 0.85;
    if (flags.openingHunt) {
      multiplier *= target.passiveOpeningHuntConsumed ? 0.8 : 2;
      target.passiveOpeningHuntConsumed = true;
    }
    if (!flags.channelPath) return multiplier;
    return multiplier * castChannelPathMultiplier(env2, pStats, target, contact);
  }
  function castFarshotMultiplier(env2, target, flags) {
    if (!flags.farshot || !env2.owner.gridPlayer || !Number.isFinite(target.gx)) return 1;
    const distance = env2.deps.getGridUnitDistance(env2.owner.gridPlayer, target);
    return distance >= 3 ? 1.25 : distance <= 1 ? 0.75 : 1;
  }
  function castChannelPathMultiplier(env2, pStats, target, { hitIndex, targetIndex, skillName }) {
    if (!(pStats.sSkill.tags || []).includes("channeling")) {
      env2.owner.passiveChannelPath = null;
      return 0.8;
    }
    let state = env2.owner.passiveChannelPath || {};
    if (hitIndex === 0 && targetIndex === 0) {
      let sameTarget = state.skillName === skillName && String(state.targetId) === String(target.id);
      state = { skillName, targetId: target.id, stacks: sameTarget ? Math.min(6, (state.stacks || 0) + 1) : 1 };
      env2.owner.passiveChannelPath = state;
    }
    return 1 + Math.max(0, state.stacks || 0) * 0.07;
  }

  // modules/combat/player-cast-effects.mjs
  function* castAddPlayerHitVisualFx(env2, pStats, options, targetEnemy, hit) {
    let { stageKind, stageLabel, stageCount, skillName, hitCrit, hitIdx, hitElement, dealtToEnemy, dmg, isStageReplay } = hit;
    yield { kind: "addBattleFx", args: ["hit", {
      enemyId: targetEnemy.id,
      targetCell: env2.deps.hasGridCell(targetEnemy) ? env2.deps.getGridUnitCenter(targetEnemy) : null,
      channelId: options.channelId,
      color: env2.deps.getElementColor(hitElement),
      crit: hitCrit,
      projectile: (pStats.sSkill.tags || []).includes("projectile"),
      pierce: pStats.sSkill.targetMode === "pierce" || stageKind === "piercePrimary" || stageKind === "pierceThrough",
      chain: pStats.sSkill.targetMode === "chain" || stageKind === "chainJump",
      slam: stageKind === "slamPrimary" || stageKind === "slamAftershock",
      stageKind,
      stageLabel,
      stageIndex: Math.max(0, Math.floor(Number(options.stageIndex) || 0)),
      repeatIndex: hitIdx,
      stageCount,
      chainFromEnemyId: options.chainFromEnemyId,
      skillName: pStats.sSkill.visualName || skillName,
      damage: dealtToEnemy,
      rawDamage: dmg,
      damageTextGroupId: options.damageTextGroupId || "",
      attackFootprint: options.attackFootprint,
      sourceCell: options.sourceCell,
      duration: 320,
      element: hitElement,
      syncToSwing: !isStageReplay,
      resolvedSkillContact: isStageReplay
    }] };
  }
  function* castNoteNativeGemSwing(env2, name, stats) {
    const cast = env2.nativeCasts.casts.at(-1), swing = cast && (cast.move ? cast.move.swing : cast.swing);
    if (!swing || env2.owner.isBackgroundCalculation) return;
    yield { kind: "addBattleFx", args: ["playerSwing", {
      skillName: name,
      element: stats.sSkill.ele,
      color: env2.deps.getElementColor(stats.sSkill.ele),
      pose: swing.pose,
      contactFrame: swing.contactFrame,
      sourceCell: env2.deps.copyCombatGridCell(env2.owner.gridPlayer),
      impactDelayMs: swing.impact - cast.at,
      duration: Math.max(80, swing.until - cast.at)
    }] };
  }
  function* castNoteNativeGemArrivalSwing(env2, command) {
    if (env2.owner.isBackgroundCalculation) return;
    yield { kind: "addBattleFx", args: ["playerSwing", {
      skillName: command.name,
      element: command.element,
      color: env2.deps.getElementColor(command.element),
      pose: command.swing.pose,
      sourceCell: env2.deps.copyCombatGridCell(env2.owner.gridPlayer),
      impactDelayMs: command.swing.impactDelayMs,
      duration: command.swing.duration
    }] };
  }

  // modules/combat/player-cast-controls.mjs
  function castPetrifyEnemy(enemy, at, seconds) {
    if (enemy.isBoss) return;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    const row = enemy.ailments.find((ail) => ail && ail.petrified);
    if (row) row.time = Math.max(row.time || 0, seconds);
    else enemy.ailments.push({ type: "stun", time: seconds, power: 0, petrified: true, petrifiedAt: at });
  }
  function castEnemyTimeSlowed(env2, enemy) {
    const left = (Number(enemy.timeSlowUntil) || 0) - env2.deps.getCombatTime();
    return left > 0 && left <= TIME_SLOW_MS;
  }
  function castPullEnemyToward(env2, enemy, command) {
    if (!env2.deps.canPushEnemy(enemy)) return;
    const goal = command.column === void 0 ? command.center : { gx: command.column, gy: enemy.gy };
    for (let step = 0; step < command.cells; step++) if (!env2.deps.gridStepToward(enemy, goal.gx, goal.gy, env2.deps.getGridBlockedCells(enemy))) break;
  }
  var TIME_SLOW_MS = 1300;
  var TIME_SLOW_MOVE = 0.3;
  var castIsEnemyPetrified = (enemy) => Array.isArray(enemy.ailments) && enemy.ailments.some((ail) => ail && ail.petrified && ail.time > 0);
  var CAST_MARKS = Object.freeze({
    mist(_env, command, targets) {
      for (const enemy of targets) enemy.holyMistUntil = command.at + 4e3;
    },
    petrify(_env, command, targets) {
      for (const enemy of targets) castPetrifyEnemy(enemy, command.at, command.ms / 1e3);
    },
    timeSlow(_env, command, targets) {
      for (const enemy of targets) enemy.timeSlowUntil = command.at + command.ms;
    },
    pull(env2, command, targets) {
      for (const enemy of targets) castPullEnemyToward(env2, enemy, command);
    },
    weaken(_env, command, targets) {
      for (const enemy of targets) enemy.voidWeakUntil = command.at + command.ms;
    }
  });

  // modules/combat/player-attack-execution.mjs
  function* castPerformPlayerAttack(env2, pStats, attackOptions) {
    const result = env2.resolver.resolve(env2.owner, pStats, attackOptions);
    if (!result) return;
    if (result.hitLog) yield { kind: "addLog", args: [result.hitLog.line, "attack-player", result.hitLog.options] };
    env2.deps.performTalentMoonReturn(result.pStats, result.options, result.talentMoonPrimaryHit);
    (env2.owner.enemies || []).slice().forEach((enemy) => {
      if (enemy && enemy.hp <= 0) env2.deps.handleEnemyDeath(enemy, result.pStats);
    });
  }

  // modules/combat/player-cast-commands.mjs
  function* castApplySkillGemCommand(env2, command, stats) {
    if (command.type === "pose") return yield* castNoteNativeGemArrivalSwing(env2, command);
    if (command.type === "bellToll") {
      if (!env2.owner.isBackgroundCalculation) yield { kind: "addBattleFx", args: ["bellToll", { duration: 180 }] };
      return;
    }
    if (command.type === "teleport") {
      if (!env2.deps.skillGemCasts.free(command.to, env2.owner.enemies.filter((e) => e.hp > 0))) return;
      env2.deps.actExplorationMotion.cancel(env2.owner.actExploration);
      Object.assign(env2.owner.gridPlayer, command.to);
      yield { kind: "addBattleFx", args: ["playerMobility", { skillName: command.name, fromCell: command.from, toCell: command.to, instant: true, duration: 180 }] };
      if (command.swing) yield* castNoteNativeGemArrivalSwing(env2, command);
      return;
    }
    env2.deps.actExplorationProgress.objects.area(command.splashCells);
    env2.deps.actExplorationState.wake(env2.owner, env2.deps.getSplashDormantEnemies().filter((e) => command.targets.includes(e.id)));
    const targets = env2.owner.enemies.filter((e) => e.hp > 0 && command.targets.includes(e.id));
    if (CAST_MARKS[command.type]) return CAST_MARKS[command.type](env2, command, targets);
    if (command.type === "dot") return yield* castApplySkillGemDot(env2, command, targets);
    if (!targets.length) return;
    yield* castApplySkillGemContact(env2, command, targets, stats);
  }
  function* castApplySkillGemDot(env2, command, targets) {
    for (const enemy of targets) {
      const stats = command.stats, mitigation = env2.deps.getEffectiveEnemyMitigation("chaos", env2.deps.getZone(env2.owner.currentZoneId).tier, enemy, stats);
      const attackMultiplier = command.attackOptions?.attackDamageMultiplier ?? 1;
      const damage = env2.deps.applyDamageToEnemyResource(enemy, Math.floor(Math.max(1, Math.floor(stats.baseDmg * stats.dotDamageScale * attackMultiplier * (1 - mitigation / 100))) * env2.deps.loopMutation.takenMul(enemy, "chaos")));
      yield { kind: "addBattleFx", args: ["hit", {
        enemyId: enemy.id,
        damage,
        element: "chaos",
        color: env2.deps.getElementColor("chaos"),
        duration: 240,
        noLine: true,
        dot: true,
        resolvedSkillContact: true
      }] };
      if (enemy.hp <= 0) env2.deps.handleEnemyDeath(enemy, stats);
    }
  }
  function* castApplySkillGemContact(env2, command, targets) {
    const stats = command.stats;
    const before = targets.map((e) => e.hp + (e.energyShield || 0));
    yield* castPerformPlayerAttack(env2, { ...stats, projectileExtraShots: 0 }, {
      ...command.attackOptions,
      stageReplay: true,
      skillName: command.name,
      sourceCell: command.sourceCell,
      targetEntries: targets.map((e) => ({ enemyId: e.id, mult: 1 })),
      stageRepeatOnce: true,
      restrictRandomTargets: true,
      skipSlamEcho: true,
      skipGridControl: true,
      hitDamageMultiplier: (command.bonus ? env2.deps.PROJECTILE_BONUS_SHOT_DAMAGE_PCT / 100 : 1) * (command.damagePct ?? 100) / 100,
      damageTextGroupId: command.key
    });
    env2.deps.supports.repeatNative(command, targets);
    env2.deps.supports.augmentNative(command, targets);
    if (!command.ailment) return;
    targets.forEach((enemy, i) => {
      if (enemy.hp <= 0 || enemy.hp + (enemy.energyShield || 0) >= before[i]) return;
      const ele = command.ailment === "poison" ? "chaos" : "phys";
      env2.deps.applyEnemyAilmentFromHit(enemy, { ...stats, sSkill: { ...stats.sSkill, ele } }, stats.baseDmg, false, { primaryAilmentChance: 1 });
      if (enemy.hp <= 0) env2.deps.handleEnemyDeath(enemy, stats);
    });
  }

  // modules/combat/player-cast-runtime.mjs
  function* castStartSkillGemCombat(env2, stats, options) {
    env2.nativeCasts ?? (env2.nativeCasts = env2.deps.skillGemCasts.createState());
    const name = options.skillName || env2.owner.activeSkill;
    castInitializeSkillGemFacing(env2);
    if (castSkillGemRuntimeChanged(env2, name)) env2.nativeCasts = env2.deps.skillGemCasts.createState();
    const started = env2.deps.skillGemCasts.start(env2.nativeCasts, {
      id: stats.sSkill.nativeCastId,
      name,
      stats,
      source: env2.owner.gridPlayer,
      enemies: env2.owner.enemies,
      now: env2.deps.getCombatTime(),
      visuals: !env2.owner.isBackgroundCalculation,
      attackOptions: {
        forcedCrit: options.forcedCrit,
        forcedElement: options.forcedElement,
        attackDamageMultiplier: options.attackDamageMultiplier,
        talentAttackMultiplier: options.talentAttackMultiplier,
        passiveKarmaContext: options.passiveKarmaContext
      }
    });
    if (!started) return;
    yield* castNoteNativeGemSwing(env2, name, stats);
    env2.deps.noteCombatTacticAttack(300);
  }
  function castShouldDeferNativeGemCast(env2, stats, options) {
    if (options.stageReplay || !stats.sSkill.nativeCastId) return false;
    if (env2.deps.hasPlayerChannelBreakingAilment() || env2.owner.combatHalted) return true;
    if (!env2.nativeCasts) return false;
    return env2.deps.skillGemCasts.singleCast.has(stats.sSkill.nativeCastId) && env2.nativeCasts.casts.some((c) => c.id === stats.sSkill.nativeCastId);
  }
  function castGetAttackProjectileShots(env2, stats) {
    return stats.sSkill.nativeCastId ? stats.projectileExtraShots : env2.deps.rollProjectileExtraShots(stats.projectileExtraShots);
  }
  function* castUpdateSkillGemCombat(env2, stats) {
    const runtime = env2.nativeCasts;
    if (!runtime) return;
    if (env2.owner.combatHalted || env2.owner.playerHp <= 0 || castSkillGemRuntimeChanged(env2, env2.owner.activeSkill)) {
      env2.nativeCasts = null;
      env2.deps.cancelCombatChannel();
      return;
    }
    const commands = env2.deps.skillGemCasts.update(runtime, { source: env2.owner.gridPlayer, enemies: env2.owner.enemies.concat(env2.deps.getSplashDormantEnemies()), now: env2.deps.getCombatTime() });
    for (const command of commands) yield* castApplySkillGemCommand(env2, command, stats);
  }
  function* castAdvanceSkillGemCasts(env2, stats) {
    env2.deps.supports.tickDots();
    yield* castUpdateSkillGemCombat(env2, stats);
    env2.deps.mobilitySkill.advance();
  }
  function castSkillGemRuntimeChanged(env2, name) {
    return !!env2.nativeCasts.lastSkill && env2.nativeCasts.lastSkill !== name;
  }
  function castInitializeSkillGemFacing(env2) {
    for (const enemy of env2.owner.enemies) if (!enemy.facingDirection) enemy.facingDirection = env2.deps.skillGemCasts.facing(enemy, env2.owner.gridPlayer);
  }

  // modules/combat/player-defeat-progress.mjs
  function castGetDefeatRecoveryZoneId(env2) {
    let frontier = Math.max(0, Math.floor(Number(env2.owner.maxZoneId) || 0));
    return env2.deps.getZone(frontier) ? frontier : 0;
  }
  function* castRecordPlayerDefeatStart(env2, zone, options) {
    env2.deps.cosmosRouteRuntime.leave(env2.owner, "failed");
    env2.deps.resetHiddenJournalBossRun();
    yield { kind: "addBattleFx", args: ["playerDown", { color: "#ff6b6b", duration: 600 }] };
    yield { kind: "dispatchRuntimeEvent", args: ["player-defeated", {
      zoneId: zone && zone.id,
      zoneType: zone && zone.type,
      contentContext: env2.deps.getEncounterTelemetryContext(zone),
      background: !!env2.owner.isBackgroundCalculation,
      noToast: !!options.noToast
    }] };
  }
  function castRetreatAfterActDefeat(env2, zone) {
    if (zone?.type !== "act" || !(zone.id > 0)) return "";
    if ((env2.owner.settings.mapCompleteAction || "nextZone") !== "nextZone") return "";
    const target = env2.deps.getZone(zone.id - 1);
    if (target?.type !== "act") return "";
    env2.owner.actRetreat = { frontierZoneId: zone.id, level: env2.owner.level };
    env2.owner.currentZoneId = target.id;
    env2.owner.killsInZone = 0;
    return target.name;
  }
  function castGetCampaignResistPenalty(env2, maxZoneId) {
    return env2.deps.CAMPAIGN_RESIST_PENALTY.zones.filter((zoneId) => maxZoneId >= zoneId).length * env2.deps.CAMPAIGN_RESIST_PENALTY.each;
  }

  // modules/domain/player-attack-preparation.mjs
  function startAttack(c) {
    c.options = c.attackOptions || {};
    if (c.deps.supports.deferAttack(c.pStats, c.options)) return false;
    c.attackHitGuardCounts = c.options.attackHitGuardCounts instanceof Map ? c.options.attackHitGuardCounts : /* @__PURE__ */ new Map();
    c.isStageReplay = !!c.options.stageReplay;
    if (!c.isStageReplay) c.pStats = { ...c.pStats, projectileExtraShots: c.deps.getAttackProjectileShots(c.pStats) };
    if (!c.isStageReplay && typeof c.deps.isTalentPlayerAttackDisabled === "function" && c.deps.isTalentPlayerAttackDisabled()) return false;
    c.skillName = c.options.skillName || c.owner.activeSkill;
    c.channelContinuationRequested = !c.isStageReplay && c.deps.consumeCombatChannelContinuation(c.skillName);
  }
  function tickQueenBees(c) {
    if (!c.isStageReplay && Array.isArray(c.owner.queenBees) && c.owner.queenBees.length > 0) {
      let now = c.deps.getCombatTime();
      c.owner.queenBees = c.owner.queenBees.filter((bee) => bee && (bee.expiresAt || 0) > now && (bee.attacksLeft || 0) > 0);
      c.owner.queenBees.forEach((bee) => {
        if (now < (bee.nextAt || 0)) return;
        bee.nextAt = now + 1e3;
        bee.attacksLeft = Math.max(0, Math.floor((bee.attacksLeft || 0) - 1));
        let target = (c.owner.enemies || []).find((e) => e && e.hp > 0);
        if (!target) return;
        let beeDmg = Math.max(1, Math.floor((c.pStats.baseDmg || 1) * ((bee.hitPct || 125) / 100)));
        c.deps.applyDamageToEnemyResource(target, beeDmg);
      });
    }
  }
  function prepareTalentAttack(c) {
    if (!c.isStageReplay) c.deps.prepareTalentPlayerAttackContext(c.pStats);
    c.colosseumStrikeMul = Math.max(0, Number(c.options.attackDamageMultiplier) || 1);
    c.colosseumSavedTargets = null;
  }
  function prepareColosseumStrike(c) {
    if (!c.isStageReplay && typeof c.deps.isTalentCardActive === "function" && c.deps.isTalentCardActive("hero2__gladiator") && c.owner.talentRuntime && c.owner.talentRuntime.colosseumReady) {
      c.owner.talentRuntime.colosseumReady = false;
      let aliveCount = (c.owner.enemies || []).filter((e) => e && e.hp > 0).length;
      c.colosseumStrikeMul = 2.2 * (aliveCount <= 1 ? 1.2 : 1);
      c.colosseumSavedTargets = c.pStats.sSkill.targets;
      c.pStats.sSkill.targets = Math.max(5, c.pStats.sSkill.targets || 1);
    }
  }
  function selectAttackTargets(c) {
    c.targets = c.isStageReplay ? (c.options.targetEntries || []).map((entry) => {
      let enemy = (c.owner.enemies || []).find((row) => row && row.id === entry.enemyId && row.hp > 0);
      return enemy ? { enemy, mult: Math.max(0, Number(entry.mult) || 1) } : null;
    }).filter(Boolean) : c.deps.getAttackTargets(c.pStats);
    if (c.colosseumSavedTargets !== null) c.pStats.sSkill.targets = c.colosseumSavedTargets;
    if (c.targets.length === 0) return false;
  }
  function beginAttackMobility(c) {
    c.passiveKarmaContext = c.options.passiveKarmaContext || null;
    if (!c.isStageReplay && typeof c.deps.beginPassiveKarmaAttack === "function") {
      c.passiveKarmaContext = c.deps.beginPassiveKarmaAttack(c.targets[0].enemy, c.deps.getCombatTime());
    }
    if (!c.isStageReplay) c.colosseumStrikeMul *= c.deps.consumeLoneEvasionCounterMultiplier(c.pStats, c.deps.getCombatTime());
    ({ landingMs: c.landingMs, kickoff: c.kickoff } = c.deps.beginSkillMobility(c.pStats, c.targets[0].enemy, c.isStageReplay));
    c.talentMoonReturn = !c.isStageReplay && typeof c.deps.getTalentMoonReturnConfig === "function" ? c.deps.getTalentMoonReturnConfig(c.targets) : null;
  }
  function selectHitSequence(c) {
    c.pendingStages = [];
    c.stageKind = c.options.stageKind || "primary";
    c.stageLabel = c.options.stageLabel || "직격";
    c.stageCount = Math.max(1, Math.floor(Number(c.options.stageCount) || 1));
    c.stageDamageMultiplier = Number.isFinite(Number(c.options.hitDamageMultiplier)) ? Math.max(0, Number(c.options.hitDamageMultiplier)) : 1;
    if (!c.isStageReplay && typeof c.deps.buildSkillHitSequence === "function") {
      let sequence = c.deps.buildSkillHitSequence(c.skillName, c.pStats.sSkill, c.targets);
      if (sequence.length > 0) {
        let firstStage = sequence[0];
        c.stageKind = firstStage.kind;
        c.stageLabel = firstStage.label;
        c.stageCount = sequence.length;
        c.stageDamageMultiplier = Math.max(0, Number(firstStage.damageMultiplier) || 0);
        c.pendingStages = sequence;
      }
    }
  }
  function recordFanaticism(c) {
    c.isDotSkill = c.deps.supports.nativeDot(c.pStats.sSkill);
    c.previousFanaticismStacks = Math.max(0, Number(c.pStats.passiveFanaticismStacks) || 0);
    c.currentFanaticismStacks = !c.isStageReplay && typeof c.deps.recordPassiveFanaticSkillUse === "function" ? c.deps.recordPassiveFanaticSkillUse(c.skillName, c.pStats.devotion) : c.previousFanaticismStacks;
  }
  function rollAttackCritical(c) {
    c.guaranteedCrit = c.deps.hasKeystone("a5") || c.deps.hasKeystone("ct7") && Array.isArray(c.pStats.sSkill.tags) && c.pStats.sSkill.tags.includes("attack");
    c.isCrit = c.options.forcedCrit !== void 0 ? !!c.options.forcedCrit : c.guaranteedCrit || (typeof c.deps.rollTalentPlayerCrit === "function" ? c.deps.rollTalentPlayerCrit(c.pStats.crit) : c.deps.random() < c.pStats.crit / 100);
    if (!c.isStageReplay && typeof c.deps.talentOnPlayerAttack === "function") c.deps.talentOnPlayerAttack(c.pStats, c.isCrit);
  }
  function recordWarriorRhythm(c) {
    if (!c.isStageReplay && c.deps.hasKeystone("w2") && c.isCrit) {
      let now = c.deps.getCombatTime();
      let active = (c.owner.warriorRhythmExpiresAt || 0) > now;
      let stacks = active ? Math.max(0, Math.min(5, Math.floor(c.owner.warriorRhythmStacks || 0))) : 0;
      c.owner.warriorRhythmStacks = Math.min(5, stacks + 1);
      c.owner.warriorRhythmExpiresAt = now + 2e3;
    }
  }
  function recordVeteranCritical(c) {
    if (!c.isStageReplay && c.deps.hasKeystone("g3")) {
      c.owner.gladiatorVeteranCritBonus = Math.max(0, Math.floor(c.owner.gladiatorVeteranCritBonus || 0));
      if (c.isCrit) c.owner.gladiatorVeteranCritBonus = 0;
      else c.owner.gladiatorVeteranCritBonus = Math.min(100, c.owner.gladiatorVeteranCritBonus + 5);
    }
  }
  function recordOverload(c) {
    c.preloadElementalistStacks = c.deps.getElementalistOverloadStacks();
    if (!c.isStageReplay && c.deps.hasKeystone("e8")) {
      c.deps.recordElementalistOverloadAttack(c.isCrit);
    }
    if (c.currentFanaticismStacks !== c.previousFanaticismStacks) {
      let previousMultiplier = 1 + c.previousFanaticismStacks * 0.015;
      let currentMultiplier = 1 + c.currentFanaticismStacks * 0.015;
      c.colosseumStrikeMul *= currentMultiplier / previousMultiplier;
    }
  }
  function prepareRiderCompass(c) {
    c.riderCompassReady = !!(c.pStats.uniqueRiderCompass && (c.owner.lastMoveEndedAt || 0) > 0 && !c.owner.uniqueRiderCompassConsumed);
  }
  function consumeBloodPact(c) {
    if (!c.isStageReplay && c.deps.hasKeystone("wlk7")) {
      let bloodPactCost = Math.floor((c.pStats.maxHp || c.owner.playerHp || 1) * 0.04);
      if (bloodPactCost > 0 && (c.owner.playerHp || 0) > bloodPactCost) {
        c.owner.playerHp -= bloodPactCost;
        c.colosseumStrikeMul *= 1 + c.deps.ASCENDANCY_KEYSTONE_VALUES.wlk7.bloodPactMorePct / 100;
      }
    }
  }
  function rollSingularity(c) {
    if (!c.isStageReplay && c.deps.hasKeystone("wlk6")) {
      let singularityMaxPct = 100 + (Math.max(0, c.pStats.resPen || 0) + Math.max(0, c.pStats.critDmg || 0)) * c.deps.ASCENDANCY_KEYSTONE_VALUES.wlk6.rangePct / 100;
      let singularityPct = 100 + c.deps.random() * Math.max(0, singularityMaxPct - 100);
      c.colosseumStrikeMul *= singularityPct / 100;
    }
  }
  function selectAttackElement(c) {
    c.getHitElement = () => {
      let pool = Array.isArray(c.pStats.sSkill.randomElementPool) ? c.pStats.sSkill.randomElementPool.filter(Boolean) : null;
      if (pool && pool.length > 0) return pool[Math.floor(c.deps.random() * pool.length)];
      return c.pStats.sSkill.ele || "phys";
    };
    c.swingElement = c.options.forcedElement || c.getHitElement();
    if (!["phys", "fire", "cold", "light", "chaos"].includes(c.swingElement)) c.swingElement = c.pStats.sSkill && c.pStats.sSkill.ele || "phys";
    if (typeof c.deps.getTalentDamageConversion === "function") c.swingElement = c.deps.getTalentDamageConversion(c.swingElement).element;
  }
  function readTalentAttackMultiplier(c) {
    c.talentAttackMul = Number.isFinite(Number(c.options.talentAttackMultiplier)) ? Math.max(0, Number(c.options.talentAttackMultiplier)) : c.deps.getTalentPlayerAttackDamageMultiplier();
  }
  function queueInitialCast(c) {
    if (!c.isStageReplay) {
      c.deps.queuePlayerAttackSequence(c.pStats, c.pendingStages, {
        skillName: c.skillName,
        forcedCrit: c.isCrit,
        forcedElement: c.swingElement,
        stageCount: c.stageCount,
        talentAttackMultiplier: c.talentAttackMul,
        attackDamageMultiplier: c.colosseumStrikeMul,
        talentMoonReturn: c.talentMoonReturn,
        attackHitGuardCounts: c.attackHitGuardCounts,
        passiveKarmaContext: c.passiveKarmaContext,
        channelContinuation: c.channelContinuationRequested,
        repeatChannelCast: !!c.options.repeatChannelCast,
        landingMs: c.landingMs,
        kickoff: c.kickoff
      });
      return false;
    }
  }
  function prepareSlamEcho(c) {
    c.zoneTier = c.deps.getZone(c.owner.currentZoneId).tier;
    c.slamEchoPct = 0;
    c.slamEchoDelayMs = 1e3;
    c.slamEchoGuaranteed = false;
    c.passiveSlamEchoChance = Math.max(0, Math.min(100, c.pStats.slamEchoChance || 0)) / 100;
    if (c.passiveSlamEchoChance > 0 && Array.isArray(c.pStats.sSkill.tags) && c.pStats.sSkill.tags.includes("slam")) c.slamEchoPct = Math.max(c.slamEchoPct, Math.max(0.25, Number(c.pStats.slamEchoDamagePct || 0) / 100));
    c.deps.talismanCombat.active().forEach(({ delta }) => {
      if (delta.slamEchoPct) {
        c.slamEchoPct = Math.max(c.slamEchoPct, delta.slamEchoPct);
        c.slamEchoGuaranteed = true;
      }
      if (delta.slamEchoDelaySec) c.slamEchoDelayMs = Math.max(100, Math.floor(delta.slamEchoDelaySec * 1e3));
    });
    c.hits = [];
    c.totalLeechableDamage = 0;
    c.totalChaosDamage = 0;
    c.talentMoonPrimaryHit = false;
  }
  function prepareProjectileFeedback(c) {
    c.hasSkillConditionalFeedback = hasConditionalCue(c.pStats.sSkill);
    c.isProjectileSkill = Array.isArray(c.pStats.sSkill.tags) && c.pStats.sSkill.tags.includes("projectile");
    c.isFanProjectile = c.isProjectileSkill && c.pStats.sSkill.projectilePattern && c.pStats.sSkill.projectilePattern.kind === "fan";
    c.projectileBonusShots = c.isProjectileSkill && !c.isFanProjectile ? Math.max(0, Math.floor(c.pStats.projectileExtraShots || 0)) : 0;
    c.curseProjectileExtraHits = 0;
  }
  function hasConditionalCue(skill) {
    return !!(skill.activeAilmentDamageMore || (skill.consumeAilmentDamageMore || []).length || skill.fullLifeDamageMorePct || skill.distanceDamageMoreCapPct);
  }
  function readCurseProjectileRepeats(c) {
    if (c.isProjectileSkill) {
      let aliveEnemies = (c.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0);
      for (let enemy of aliveEnemies) {
        let fx = c.deps.getEnemyConditionDebuffFactor(enemy);
        c.curseProjectileExtraHits = Math.max(c.curseProjectileExtraHits, Math.max(0, Math.floor(fx.projectileExtraHits || 0)));
      }
    }
  }
  function rollProjectileRepeats(c) {
    c.projectileRepeatPct = c.isProjectileSkill ? Math.max(0, Number(c.pStats.uniqueProjectileDoubleStrikePct) || 0) : 0;
    c.uniqueProjectileExtraHits = Math.floor(c.projectileRepeatPct / 100);
    if (c.isProjectileSkill && c.deps.random() * 100 < c.projectileRepeatPct % 100) c.uniqueProjectileExtraHits += 1;
    c.chanceProjExtraShots = c.isProjectileSkill && c.pStats.uniqueProjExtraShotChance && c.deps.random() * 100 < Number(c.pStats.uniqueProjExtraShotChance.chance || 0) ? Math.max(0, Math.floor(c.pStats.uniqueProjExtraShotChance.shots || 0)) : 0;
  }
  function countAttackRepeats(c) {
    c.addedProjectileRepeatCount = c.projectileBonusShots + c.chanceProjExtraShots + c.curseProjectileExtraHits + c.uniqueProjectileExtraHits;
    c.nativeRepeats = c.options.stageRepeatOnce ? 1 : Math.max(1, Math.floor(c.pStats.sSkill.multiHit || 1));
    c.repeats = Math.max(1, Math.min(12, c.nativeRepeats + c.addedProjectileRepeatCount));
    c.baseRepeats = c.nativeRepeats;
    if (c.deps.hasKeystone("h7")) {
      c.pStats.sSkill.targets = 1;
    }
  }
  function createHitTracking(c) {
    c.perEnemyHitCount = /* @__PURE__ */ new Map();
    c.originalPierceTargets = new Set(c.targets.map((entry) => entry && entry.enemy).filter(Boolean));
    c.pierceOverkillCarryStartedTargets = /* @__PURE__ */ new Set();
    c.hitSummary = { totalHits: 0, totalDamage: 0, uniqueTargets: /* @__PURE__ */ new Set() };
    c.attackFeedbackGroup = c.options.damageTextGroupId ? String(c.options.damageTextGroupId) : "";
    c.attackFeedbackKeys = /* @__PURE__ */ new Set();
  }
  function preparePlayerCast(c) {
    if (startAttack(c) === false) return false;
    tickQueenBees(c);
    prepareTalentAttack(c);
    prepareColosseumStrike(c);
    if (selectAttackTargets(c) === false) return false;
    beginAttackMobility(c);
    selectHitSequence(c);
    recordFanaticism(c);
    rollAttackCritical(c);
    recordWarriorRhythm(c);
    recordVeteranCritical(c);
    recordOverload(c);
    prepareRiderCompass(c);
    consumeBloodPact(c);
    rollSingularity(c);
    selectAttackElement(c);
    readTalentAttackMultiplier(c);
    if (queueInitialCast(c) === false) return false;
    prepareSlamEcho(c);
    prepareProjectileFeedback(c);
    readCurseProjectileRepeats(c);
    rollProjectileRepeats(c);
    countAttackRepeats(c);
    createHitTracking(c);
  }

  // modules/domain/player-attack-target.mjs
  function readHitTarget(c, h) {
    h.targetEnemy = h.hit.enemy;
  }
  function pickRandomHitTarget(c, h) {
    if (c.pStats.sSkill.randomTargetEachHit) {
      let alive = c.options.restrictRandomTargets ? c.targets.map((entry) => entry.enemy).filter((enemy) => enemy && enemy.hp > 0) : (c.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0);
      if (alive.length <= 0) return false;
      let eligible = alive.filter((enemy) => (c.perEnemyHitCount.get(enemy.id) || 0) < 2);
      if (eligible.length > 0) h.targetEnemy = eligible[Math.floor(c.deps.random() * eligible.length)];
      else if (!c.randomTargetCapFallbackUsed) {
        c.randomTargetCapFallbackUsed = true;
        h.targetEnemy = alive[Math.floor(c.deps.random() * alive.length)];
      } else return false;
    }
  }
  function guardRepeatedTarget(c, h) {
    if (!h.targetEnemy || h.targetEnemy.hp <= 0) return false;
    c.deps.transferPassiveChaosErosionToTarget(h.targetEnemy, c.pStats);
    h.priorGuardedHits = Math.max(0, Math.floor(Number(c.attackHitGuardCounts.get(h.targetEnemy.id)) || 0));
    h.nextHitCount = (c.perEnemyHitCount.get(h.targetEnemy.id) || 0) + 1;
    if (c.pStats.passiveKeystoneFlags && c.pStats.passiveKeystoneFlags.projectileFormation && h.nextHitCount > 1) return false;
    c.perEnemyHitCount.set(h.targetEnemy.id, h.nextHitCount);
  }
  function readTargetResistance(c, h) {
    h.hitElement = c.swingElement;
    h.curseFx = c.deps.getEnemyConditionDebuffFactor(h.targetEnemy, c.pStats);
    h.enemyRes = c.deps.getHitEnemyResistance(h.hitElement, c.zoneTier, h.targetEnemy, c.pStats, h.curseFx) - c.deps.ascendancyNodeRules.armorBreak(h.targetEnemy, h.hitElement, c.deps.getCombatTime());
    if (c.deps.getPassiveChaosConversionShare(c.pStats, h.hitElement) > 0) {
      let chaosShare = c.deps.getPassiveChaosConversionShare(c.pStats, h.hitElement);
      let chaosRes = c.deps.getEffectiveEnemyMitigation("chaos", c.zoneTier, h.targetEnemy, c.pStats) - (h.curseFx.resChaosShred || 0);
      h.enemyRes = h.enemyRes * (1 - chaosShare) + chaosRes * chaosShare;
    }
  }
  function applyJudgmentResistance(c, h) {
    if (h.targetEnemy && Array.isArray(h.targetEnemy.ailments)) {
      let cj = h.targetEnemy.ailments.find((a) => a && a.type === "cosmosJudgment" && (a.time || 0) > 0);
      if (cj) h.enemyRes -= Math.max(0, Number(cj.power || 0));
    }
  }
  function applyStackedResistance(c, h) {
    if (h.targetEnemy && Array.isArray(h.targetEnemy.ailments)) {
      let rs = h.targetEnemy.ailments.find((a) => a && a.type === "realmAllResDown" && (a.time || 0) > 0);
      if (rs) h.enemyRes -= Math.max(0, Math.floor(rs.stacks || 0)) * Math.max(0, Number(c.pStats.uniqueAllResDownOnHit && c.pStats.uniqueAllResDownOnHit.perHit || 0));
    }
  }
  function selectContactCritical(c, h) {
    h.hitCrit = c.isCrit;
    h.passiveGuaranteedCrit = false;
    if (c.pStats.passiveKeystoneFlags && (c.pStats.passiveKeystoneFlags.explosiveDistill || c.pStats.passiveKeystoneFlags.taintedWarhead)) h.hitCrit = false;
    if (c.pStats.passiveKeystoneFlags && c.pStats.passiveKeystoneFlags.fullEvasion && (c.pStats.sSkill.tags || []).includes("melee") && c.owner.passiveFullEvasionCritReady) {
      h.hitCrit = true;
      h.passiveGuaranteedCrit = true;
      c.owner.passiveFullEvasionCritReady = false;
    }
  }
  function invertTargetResistance(c, h) {
    h.invertEnemyResistance = false;
    if (["fire", "cold", "light"].includes(h.hitElement) && typeof c.deps.getPreciseTalentRatio === "function" && c.deps.random() < 0.15 * c.deps.getPreciseTalentRatio("hero3__inquisitor")) h.invertEnemyResistance = true;
    if (h.invertEnemyResistance) h.enemyRes = -h.enemyRes;
  }
  function stackTargetResistanceLoss(c, h) {
    if (c.pStats.uniqueAllResDownOnHit && h.targetEnemy) {
      c.deps.getCombatTime();
      h.targetEnemy.ailments = Array.isArray(h.targetEnemy.ailments) ? h.targetEnemy.ailments : [];
      let row = h.targetEnemy.ailments.find((a) => a && a.type === "realmAllResDown");
      if (!row) {
        row = { type: "realmAllResDown", stacks: 0, time: 0 };
        h.targetEnemy.ailments.push(row);
      }
      row.stacks = Math.min(Math.max(1, Math.floor(c.pStats.uniqueAllResDownOnHit.max || 4)), Math.max(0, Math.floor(row.stacks || 0)) + 1);
      row.time = Math.max(row.time || 0, Number(c.pStats.uniqueAllResDownOnHit.duration || 5));
    }
  }
  function selectPlayerContact(c, h) {
    readHitTarget(c, h);
    if (pickRandomHitTarget(c, h) === false) return false;
    if (guardRepeatedTarget(c, h) === false) return false;
    readTargetResistance(c, h);
    applyJudgmentResistance(c, h);
    applyStackedResistance(c, h);
    selectContactCritical(c, h);
    invertTargetResistance(c, h);
    stackTargetResistanceLoss(c, h);
  }

  // modules/domain/player-attack-damage-base.mjs
  function rollHunterCritical(c, h) {
    h.hitBaseDamage = c.pStats.baseDmg;
    h.ailmentBaseDamage = c.pStats.baseDmg;
    if (c.deps.hasKeystone("h8")) {
      let critCount = 0;
      let critChancePct = Math.max(0, Number(c.pStats.crit) || 0);
      while (critChancePct > 0) {
        let slice = Math.min(100, critChancePct);
        if (c.deps.random() * 100 < slice) critCount++;
        critChancePct -= 100;
      }
      if (critCount > 0) {
        h.hitCrit = true;
        let critMul = Math.max(1, c.pStats.critDmg / 100);
        h.hitBaseDamage = Math.floor(h.hitBaseDamage * (1 + (critMul - 1) * critCount));
      }
    } else {
      h.hitBaseDamage = h.hitCrit ? Math.floor(c.pStats.baseDmg * (c.pStats.critDmg / 100)) : c.pStats.baseDmg;
    }
  }
  function clearForbiddenCritical(c, h) {
    if (c.pStats.passiveKeystoneFlags && (c.pStats.passiveKeystoneFlags.explosiveDistill || c.pStats.passiveKeystoneFlags.taintedWarhead)) {
      h.hitCrit = false;
      h.hitBaseDamage = c.pStats.baseDmg;
    }
  }
  function resistCriticalChance(c, h) {
    if (h.hitCrit && !c.guaranteedCrit && !h.passiveGuaranteedCrit && (h.targetEnemy.critResistPct || 0) > 0 && c.deps.random() * 100 < Math.max(0, Math.min(95, h.targetEnemy.critResistPct || 0))) {
      h.hitCrit = false;
      h.hitBaseDamage = c.pStats.baseDmg;
    }
  }
  function scaleTalentCritical(c, h) {
    h.talentCritDmgMultiplier = typeof c.deps.getTalentCritDamageMultiplier === "function" ? c.deps.getTalentCritDamageMultiplier(h.hitCrit) : 1;
    if (h.talentCritDmgMultiplier !== 1) h.hitBaseDamage = Math.floor(h.hitBaseDamage * h.talentCritDmgMultiplier);
    if (h.hitCrit && (h.targetEnemy.critDamageResistPct || 0) > 0) {
      let critResist = Math.max(0, Math.min(95, Number(h.targetEnemy.critDamageResistPct || 0))) / 100;
      let basePart = Math.max(1, Math.floor(c.pStats.baseDmg || 1));
      h.hitBaseDamage = Math.max(1, Math.floor(basePart + Math.max(0, h.hitBaseDamage - basePart) * (1 - critResist)));
    }
  }
  function consumeRiderCompass(c, h) {
    if (c.riderCompassReady) {
      h.hitBaseDamage = Math.floor(h.hitBaseDamage * 2);
      h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * 2);
      c.riderCompassReady = false;
      c.owner.uniqueRiderCompassConsumed = true;
    }
  }
  function scaleCriticalAndElement(c, h) {
    if (h.hitCrit && c.deps.hasKeystone("a7") && (c.owner.enemies || []).filter((e) => e && e.hp > 0).length === 1) h.hitBaseDamage *= 1 + c.deps.ASCENDANCY_KEYSTONE_VALUES.a7.extraHitPct / 100;
    if (h.hitCrit) h.hitBaseDamage *= c.deps.getGemCritHitPerkMul(c.skillName, c.pStats);
    h.randomElementPct = c.pStats.randomElementDamagePct && Number(c.pStats.randomElementDamagePct[h.hitElement]) ? Number(c.pStats.randomElementDamagePct[h.hitElement]) : 0;
    if (h.randomElementPct) {
      h.hitBaseDamage = Math.floor(h.hitBaseDamage * (1 + h.randomElementPct / 100));
      h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * (1 + h.randomElementPct / 100));
    }
  }
  function scalePhysicalHit(c, h) {
    if (h.hitElement === "phys") {
      let physMul = Math.max(0, Number(c.pStats.warriorPhysDamageMultiplier) || 1);
      h.hitBaseDamage = Math.floor(h.hitBaseDamage * physMul);
      h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * physMul);
    }
  }
  function scaleLoneHunter(c, h) {
    if (c.deps.hasKeystone("h1")) {
      let aliveCnt = (c.owner.enemies || []).filter((e) => e && e.hp > 0).length;
      let hunterMul = 1 + (aliveCnt === 1 ? c.deps.ASCENDANCY_KEYSTONE_VALUES.h1.singleMorePct : c.deps.ASCENDANCY_KEYSTONE_VALUES.h1.multiMorePct) / 100;
      h.hitBaseDamage = Math.floor(h.hitBaseDamage * hunterMul);
      h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * hunterMul);
    }
  }
  function scaleAilmentAndBossHit(c, h) {
    [h.hitBaseDamage, h.ailmentBaseDamage] = c.deps.applyAilingTargetDamage(c.pStats, h.targetEnemy, h.hitElement, h.hitCrit, [h.hitBaseDamage, h.ailmentBaseDamage]);
    if (h.targetEnemy.isBoss) {
      let bossMul = Math.max(0, Number(c.pStats.bossDamageDealtMultiplier) || 1);
      bossMul *= 1 + Math.max(0, Number(c.pStats.bossDamagePct) || 0) / 100;
      h.hitBaseDamage = Math.floor(h.hitBaseDamage * bossMul * (1 + Math.max(0, c.pStats.cosmosBossDamageMorePct || 0) / 100));
      h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * bossMul * (1 + Math.max(0, c.pStats.cosmosBossDamageMorePct || 0) / 100));
    } else if (h.targetEnemy.isElite && (c.pStats.eliteDamagePct || 0) > 0) {
      let eliteMul = 1 + Math.max(0, Number(c.pStats.eliteDamagePct) || 0) / 100;
      h.hitBaseDamage = Math.floor(h.hitBaseDamage * eliteMul);
      h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * eliteMul);
    }
  }
  function consumeSwiftOpening(c, h) {
    if (c.deps.hasKeystone("g5") && c.owner.gladiatorSwiftOpeningReady) {
      h.hitBaseDamage = Math.floor(h.hitBaseDamage * 1.3);
      h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * 1.3);
      c.owner.gladiatorSwiftOpeningReady = false;
    }
  }
  function scaleTalentHit(c, h) {
    h.talentKeystoneMul = 1;
    if (typeof c.deps.getTalentPrecisePlayerHitMultiplier === "function") {
      h.talentKeystoneMul *= c.deps.getTalentPrecisePlayerHitMultiplier(h.hitElement);
    }
    if (typeof c.deps.getTalentButcherBossMultiplier === "function") h.talentKeystoneMul *= c.deps.getTalentButcherBossMultiplier(h.targetEnemy);
    h.talentHitMul = c.talentAttackMul * h.talentKeystoneMul * (c.colosseumStrikeMul || 1);
    h.talentHitMul *= c.deps.getPassiveKeystoneHitMultiplier(c.pStats, h.targetEnemy, h.hitIdx, h.targetIndex, c.skillName) * c.deps.ascendancyNodeRules.blastMultiplier(c.pStats, h.hitEntries.length);
    h.hitBaseDamage = Math.floor(h.hitBaseDamage * h.talentHitMul);
    h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * h.talentHitMul);
  }
  function advanceOrbitMultiplier(c, h) {
    if (c.pStats.cosmosOrbitCycle && h.targetEnemy) {
      let cycle = c.pStats.cosmosOrbitCycle;
      let current = Number.isFinite(h.targetEnemy.cosmosOrbitMul) ? h.targetEnemy.cosmosOrbitMul : Number(cycle.high || 1.3);
      h.hitBaseDamage = Math.floor(h.hitBaseDamage * current);
      h.ailmentBaseDamage = Math.floor(h.ailmentBaseDamage * current);
      advanceOrbitState(h.targetEnemy, cycle, current);
    }
  }
  function advanceOrbitState(enemy, cycle, current) {
    let dir = Number.isFinite(enemy.cosmosOrbitDir) ? enemy.cosmosOrbitDir : -1;
    let next = current + dir * Math.max(0.01, Number(cycle.step || 0.2));
    if (next <= Number(cycle.low || 0.7)) {
      next = Number(cycle.low || 0.7);
      dir = 1;
    }
    if (next >= Number(cycle.high || 1.3)) {
      next = Number(cycle.high || 1.3);
      dir = -1;
    }
    enemy.cosmosOrbitMul = Number(next.toFixed(2));
    enemy.cosmosOrbitDir = dir;
  }
  function rollHitDamage(c, h) {
    h.dmg = Math.floor(h.hitBaseDamage * (h.hit.mult || 1));
    h.ailmentSourceDamage = Math.floor(h.ailmentBaseDamage * (h.hit.mult || 1));
    h.dmg = Math.floor(h.dmg * c.stageDamageMultiplier);
    h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * c.stageDamageMultiplier);
    h.repeatDamageMultiplier = c.deps.getSkillRepeatDamageMultiplier(c.pStats.sSkill, h.hitIdx, c.baseRepeats);
    h.dmg = Math.floor(h.dmg * h.repeatDamageMultiplier);
    h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * h.repeatDamageMultiplier);
    if (!Number.isFinite(h.dmg)) h.dmg = 0;
    h.minRoll = Math.max(1, Math.floor(c.pStats.minDmgRoll || 80));
    h.maxRoll = Math.max(h.minRoll, Math.floor(c.pStats.maxDmgRoll || 100));
    h.rollPct = h.minRoll + c.deps.random() * (h.maxRoll - h.minRoll);
    if (c.pStats.uniqueCeilingSmashDouble && h.rollPct >= 140 && c.deps.random() < 0.15) {
      h.dmg *= 2;
      h.ailmentSourceDamage *= 2;
    }
  }
  function scaleUnderdogRoll(c, h) {
    if ((c.pStats.uniqueUnderdogMorePct || 0) > 0 && h.rollPct < h.maxRoll) {
      let underdogMul = 1 + Math.max(0, c.pStats.uniqueUnderdogMorePct) / 100;
      h.dmg = Math.floor(h.dmg * underdogMul);
      h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * underdogMul);
    }
    h.dmg = Math.floor(h.dmg * (h.rollPct / 100));
    h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * (h.rollPct / 100));
  }
  function scaleChaosRoll(c, h) {
    if (h.hitElement === "chaos") {
      let chaosMultiplier = Math.max(0, Number(c.pStats.chaosDamageMultiplier) || 1);
      h.dmg = Math.floor(h.dmg * chaosMultiplier);
      h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * chaosMultiplier);
    } else if (c.deps.getPassiveChaosConversionShare(c.pStats, h.hitElement) > 0) {
      let chaosShare = c.deps.getPassiveChaosConversionShare(c.pStats, h.hitElement);
      let convertedMultiplier = 1 - chaosShare + Math.max(0, Number(c.pStats.chaosDamageMultiplier) || 1) * chaosShare;
      h.dmg = Math.floor(h.dmg * convertedMultiplier);
      h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * convertedMultiplier);
    }
  }
  function rollFirstHit(c, h) {
    h.cosmosFirstHitRoll = c.pStats.cosmosAlwaysFirstHit || (c.pStats.cosmosAlwaysFirstHitChancePct || 0) > 0 && c.deps.random() * 100 < (c.pStats.cosmosAlwaysFirstHitChancePct || 0);
    if ((c.pStats.firstHitDamageMorePct || 0) > 0 && (h.cosmosFirstHitRoll || !h.targetEnemy.firstHitConsumed)) {
      let firstMul = 1 + Math.max(0, Number(c.pStats.firstHitDamageMorePct || 0)) / 100;
      h.dmg = Math.floor(h.dmg * firstMul);
      h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * firstMul);
    }
  }
  function applyFirstHitGuard(c, h) {
    if ((h.targetEnemy.firstHitGuard || 0) > 0 && (h.cosmosFirstHitRoll || !h.targetEnemy.firstHitConsumed)) {
      h.dmg = Math.floor(h.dmg * (1 - h.targetEnemy.firstHitGuard));
      h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * (1 - h.targetEnemy.firstHitGuard));
      if (!h.cosmosFirstHitRoll) h.targetEnemy.firstHitConsumed = true;
    }
  }
  function applyRepeatedHitGuard(c, h) {
    h.hitGuard = Math.max(0, Number(h.targetEnemy.hitRateGuard) || 0) * Math.min(5, h.priorGuardedHits);
    if (h.hitGuard > 0) {
      let hitGuardMul = Math.max(0.2, 1 - h.hitGuard);
      h.dmg = Math.floor(h.dmg * hitGuardMul);
      h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * hitGuardMul);
    }
  }
  function applyBurstGuard(c, h) {
    h.burstHits = Math.max(0, (h.targetEnemy.recentHitsTaken || 0) - 2);
    if ((h.targetEnemy.comboTakenLessPct || 0) > 0 && h.burstHits > 0) {
      let comboLess = Math.max(0, Math.min(85, Number(h.targetEnemy.comboTakenLessPct || 0) * Math.min(5, h.burstHits) / 5));
      h.dmg = Math.floor(h.dmg * (1 - comboLess / 100));
      h.ailmentSourceDamage = Math.floor(h.ailmentSourceDamage * (1 - comboLess / 100));
    }
    h.damageBeforeMitigation = h.dmg;
    h.addedDamageSource = h.damageBeforeMitigation;
  }
  function rollPlayerContact(c, h) {
    rollHunterCritical(c, h);
    clearForbiddenCritical(c, h);
    resistCriticalChance(c, h);
    scaleTalentCritical(c, h);
    consumeRiderCompass(c, h);
    scaleCriticalAndElement(c, h);
    scalePhysicalHit(c, h);
    scaleLoneHunter(c, h);
    scaleAilmentAndBossHit(c, h);
    consumeSwiftOpening(c, h);
    scaleTalentHit(c, h);
    advanceOrbitMultiplier(c, h);
    rollHitDamage(c, h);
    scaleUnderdogRoll(c, h);
    scaleChaosRoll(c, h);
    rollFirstHit(c, h);
    applyFirstHitGuard(c, h);
    applyRepeatedHitGuard(c, h);
    applyBurstGuard(c, h);
  }

  // modules/domain/enemy-mitigation.mjs
  var CURSE_ELEMENT_SHRED_KEYS = Object.freeze({ fire: "resFShred", cold: "resCShred", light: "resLShred", chaos: "resChaosShred", phys: "physDrShred" });

  // modules/domain/player-attack-mitigation.mjs
  function prepareConditionalHit(c, h) {
    h.ailmentDamageBeforeCritMitigation = Math.max(0, Math.floor(h.ailmentSourceDamage));
    h.skillConditionalCues = c.hasSkillConditionalFeedback ? [] : null;
    h.skillConditionalMultiplier = c.deps.getSkillConditionalDamageMultiplier(
      c.pStats.sSkill,
      h.targetEnemy,
      h.skillConditionalCues ? (cue) => h.skillConditionalCues.push(cue) : null
    );
    h.dmg = Math.floor(h.dmg * h.skillConditionalMultiplier);
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * h.skillConditionalMultiplier);
    h.dmg = Math.floor(h.dmg * Math.max(0, c.pStats.instantDamageMultiplier || 1));
    rollConditionalDamage(c, h);
    h.enemyTotalEvadeChance = c.deps.getEnemyTotalEvadeChance(h.targetEnemy, c.pStats.accuracy);
  }
  function rollConditionalDamage(c, h) {
    if ((c.pStats.cosmosLightningVariance || 0) > 0 && h.hitElement === "light") h.dmg = Math.floor(h.dmg * (0.8 + c.deps.random() * 0.7));
    if ((c.pStats.uniqueDoubleDamageChancePct || 0) > 0 && c.deps.random() < (c.pStats.uniqueDoubleDamageChancePct || 0) / 100) h.dmg = Math.floor(h.dmg * Math.max(1, c.pStats.uniqueDoubleDamageMultiplier || 2));
  }
  function evadeContact(c, h) {
    if (!c.pStats.passiveAlwaysHit && !(typeof c.deps.getTalentAlwaysHit === "function" && c.deps.getTalentAlwaysHit()) && c.deps.resolveEntropyEvasion(h.targetEnemy, h.enemyTotalEvadeChance, c.deps.getCombatTime())) {
      c.deps.addBattleFx("enemyEvade", { enemyId: h.targetEnemy.id, text: c.deps._t("회피!"), color: "#c4e2ff", duration: 260 });
      c.deps.addEvasionCombatLog(h.targetEnemy, false);
      return false;
    }
    if ((h.targetEnemy.hitRateGuard || 0) > 0) c.attackHitGuardCounts.set(h.targetEnemy.id, h.priorGuardedHits + 1);
  }
  function convertMainDamage(c, h) {
    h.talentConversion = c.deps.supports.splitConversion(typeof c.deps.getTalentDamageConversion === "function" ? c.deps.getTalentDamageConversion(h.hitElement) : { mainPct: 1, added: {} }, c.pStats, h.hitElement);
    h.wisdomMainMultiplier = c.deps.getPassiveWisdomLeapDamageMultiplier(c.pStats, h.hitElement);
    h.dmg = Math.floor(h.dmg * Math.max(0, Number(h.talentConversion.mainPct) || 0) * (1 - h.enemyRes / 100) * h.wisdomMainMultiplier * c.deps.mutationHitScale(h.targetEnemy, h.hitElement));
    h.damageBeforeMitigation = Math.floor(h.damageBeforeMitigation * h.wisdomMainMultiplier);
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * h.wisdomMainMultiplier);
  }
  function applyPhysicalMitigation(c, h) {
    if (h.hitElement === "phys") {
      let physicalTakenMul = h.targetEnemy.physicalDamageTakenMul || 1;
      h.dmg = Math.floor(h.dmg * physicalTakenMul);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * physicalTakenMul);
    }
    if ((h.targetEnemy.armorGuard || 0) > 0 && h.hitElement === "phys") {
      let armorGuardMul = Math.max(0.2, 1 - h.targetEnemy.armorGuard);
      h.dmg = Math.floor(h.dmg * armorGuardMul);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * armorGuardMul);
    }
  }
  function applyElementMitigation(c, h) {
    if (h.hitElement === "light") {
      let lightTakenMul = h.curseFx.lightTakenMul || 1;
      h.dmg = Math.floor(h.dmg * lightTakenMul);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * lightTakenMul);
    }
    applyChaosTaken(c, h);
  }
  function applyChaosTaken(c, h) {
    if (h.hitElement === "chaos") {
      let chaosTakenMul = h.curseFx.chaosTakenMul || 1;
      if (c.deps.hasKeystone("wlk9") && h.targetEnemy && h.targetEnemy.hp > 0) {
        c.owner.enemyWitherStacks = c.owner.enemyWitherStacks && typeof c.owner.enemyWitherStacks === "object" ? c.owner.enemyWitherStacks : {};
        let wStacks = Math.max(0, Math.min(10, Math.floor(c.owner.enemyWitherStacks[h.targetEnemy.id] || 0)));
        chaosTakenMul *= 1 + wStacks * c.deps.ASCENDANCY_KEYSTONE_VALUES.wlk9.chaosTakenPctPerStack / 100;
        c.owner.enemyWitherStacks[h.targetEnemy.id] = Math.min(10, wStacks + 1);
      }
      h.dmg = Math.floor(h.dmg * chaosTakenMul);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * chaosTakenMul);
    }
  }
  function addConvertedElements(c, h) {
    h.addedDamagePctByElement = c.pStats && c.pStats.addedDamagePctByElement || {};
    for (const element of ["phys", "fire", "cold", "light", "chaos"]) {
      const pct = addedElementPercent(c, h, element);
      const wisdom = c.deps.getPassiveWisdomLeapDamageMultiplier(c.pStats, element);
      const raw = Math.floor(h.addedDamageSource * pct / 100 * wisdom);
      if (raw <= 0) continue;
      const damage = mitigateAddedElement(c, h, element, raw, h.hitElement !== "phys");
      if (damage > 0) h.dmg += damage;
    }
  }
  function addedElementPercent(c, h, element) {
    let pct = Math.max(0, Number(h.addedDamagePctByElement[element] || 0) + Number(h.talentConversion.added && h.talentConversion.added[element] || 0));
    if (h.hitElement === "phys" && element === "fire") pct += Math.max(0, Number(c.pStats.passiveCycleAddedFireFromPhysicalPct) || 0);
    return pct;
  }
  function addFlatElements(c, h) {
    h.flatElementHitDamage = c.pStats && c.pStats.flatElementHitDamage || {};
    for (const element of ["phys", "fire", "cold", "light", "chaos"]) {
      const base = Math.max(0, Number(h.flatElementHitDamage[element]) || 0);
      if (base <= 0) continue;
      const wisdom = c.deps.getPassiveWisdomLeapDamageMultiplier(c.pStats, element);
      const raw = base * wisdom * (h.hitCrit ? Math.max(1, (Number(c.pStats.critDmg) || 100) / 100) * h.talentCritDmgMultiplier : 1) * (h.rollPct / 100) * (h.hit.mult || 1) * h.repeatDamageMultiplier;
      const damage = mitigateAddedElement(c, h, element, raw, true);
      if (damage > 0) h.dmg += damage;
    }
  }
  function mitigateAddedElement(c, h, element, raw, scaleWarrior) {
    const resistance = c.deps.getEffectiveEnemyMitigation(element, c.zoneTier, h.targetEnemy, c.pStats) - (h.curseFx.resShred || 0) - (h.curseFx[CURSE_ELEMENT_SHRED_KEYS[element]] || 0);
    let damage = Math.floor(raw * (1 - resistance / 100) * c.deps.loopMutation.takenMul(h.targetEnemy, element));
    if (element === "phys") return mitigateAddedPhysical(c, h, damage, scaleWarrior);
    if (element === "light") damage = Math.floor(damage * (h.curseFx.lightTakenMul || 1));
    if (element === "chaos") damage = Math.floor(damage * (h.curseFx.chaosTakenMul || 1));
    return damage;
  }
  function mitigateAddedPhysical(c, h, damage, scaleWarrior) {
    if (scaleWarrior) damage = Math.floor(damage * Math.max(0, Number(c.pStats.warriorPhysDamageMultiplier) || 1));
    return Math.floor(damage * (h.targetEnemy.physicalDamageTakenMul || 1) * Math.max(0.2, 1 - (h.targetEnemy.armorGuard || 0)));
  }
  function applyCurseTaken(c, h) {
    h.dmg = Math.floor(h.dmg * (h.curseFx.mul || 1));
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * (h.curseFx.mul || 1));
    if ((c.pStats.sSkill.tags || []).includes("projectile")) {
      let projectileTakenMul = (h.curseFx.projectileTakenMul || 1) * (h.targetEnemy.projectileDamageTakenMul || 1);
      h.dmg = Math.floor(h.dmg * projectileTakenMul);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * projectileTakenMul);
    }
    applySpellCurseTaken(c, h);
  }
  function applySpellCurseTaken(c, h) {
    if ((c.pStats.sSkill.tags || []).includes("spell")) {
      let spellTakenMul = h.targetEnemy.spellDamageTakenMul || 1;
      h.dmg = Math.floor(h.dmg * spellTakenMul);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * spellTakenMul);
    }
    if (h.hitCrit) h.dmg = Math.floor(h.dmg * (h.curseFx.critDmgTakenMul || 1));
  }
  function applyShockIncrease(c, h) {
    h.enemyShockTakenIncreasePct = c.deps.getActiveEnemyShockTakenDamageIncreasePct(h.targetEnemy, c.pStats);
    if (h.enemyShockTakenIncreasePct > 0) {
      let enemyShockTakenMul = 1 + h.enemyShockTakenIncreasePct / 100;
      h.dmg = Math.floor(h.dmg * enemyShockTakenMul);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * enemyShockTakenMul);
    }
    h.shockedIncreaseMul = c.deps.getShockedEnemyHitDamageIncreaseMultiplier(h.targetEnemy, c.pStats);
    if (h.shockedIncreaseMul > 1) {
      h.dmg = Math.floor(h.dmg * h.shockedIncreaseMul);
    }
  }
  function applyShockedMore(c, h) {
    if ((c.pStats.shockedEnemyHitDamageMorePct || 0) > 0 && Array.isArray(h.targetEnemy.ailments) && h.targetEnemy.ailments.some((a) => a && a.type === "shock" && (a.time || 0) > 0)) {
      let shockedMore = 1 + Math.max(0, Number(c.pStats.shockedEnemyHitDamageMorePct || 0)) / 100;
      h.dmg = Math.floor(h.dmg * shockedMore);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * shockedMore);
    }
  }
  function applyBleedingWeight(c, h) {
    if (c.pStats.uniqueBleedWeightOnBleedingHit && Array.isArray(h.targetEnemy.ailments) && h.targetEnemy.ailments.some((a) => a && a.type === "bleed" && (a.time || 0) > 0)) {
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * 2);
    }
  }
  function applyBleedingMore(c, h) {
    if ((c.pStats.uniqueBleedingEnemyDamageMorePct || 0) > 0 && Array.isArray(h.targetEnemy.ailments) && h.targetEnemy.ailments.some((a) => a && a.type === "bleed" && (a.time || 0) > 0)) {
      let bleedingMore = 1 + Math.max(0, Number(c.pStats.uniqueBleedingEnemyDamageMorePct) || 0) / 100;
      h.dmg = Math.floor(h.dmg * bleedingMore);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * bleedingMore);
    }
  }
  function applyArmorAmplifier(c) {
    if (c.pStats.uniqueMeleeArmorAmp && Array.isArray(c.pStats.sSkill.tags) && c.pStats.sSkill.tags.includes("melee")) {
      let now = c.deps.getCombatTime();
      let active = (c.owner.uniqueMeleeArmorAmpExpiresAt || 0) > now;
      let stacks = active ? Math.max(0, Math.floor(c.owner.uniqueMeleeArmorAmpStacks || 0)) : 0;
      c.owner.uniqueMeleeArmorAmpStacks = Math.min(Math.floor(c.pStats.uniqueMeleeArmorAmp.maxStacks || 3), stacks + 1);
      c.owner.uniqueMeleeArmorAmpExpiresAt = now + Math.floor((c.pStats.uniqueMeleeArmorAmp.duration || 2) * 1e3);
    }
  }
  function applyFinalTaken(c, h) {
    h.keystoneTakenMul = c.deps.getKeystoneEnemyTakenMultiplier(h.targetEnemy, h.hitElement);
    h.dmg = Math.floor(h.dmg * h.keystoneTakenMul);
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * h.keystoneTakenMul);
    h.dmg = Math.floor(h.dmg * (c.deps.getAbyssMonsterScales(c.deps.getZone(c.owner.currentZoneId)).playerDamageMul || 1));
    if (h.targetEnemy.isBoss && (c.pStats.damageScales || {}).talismanBossFinalDmgBonusPct) {
      let talismanBossMul = 1 + (c.pStats.damageScales.talismanBossFinalDmgBonusPct || 0) / 100;
      h.dmg = Math.floor(h.dmg * talismanBossMul);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * talismanBossMul);
    }
    h.finalDamageMul = Number(c.pStats.finalDamageMultiplier);
    if (!Number.isFinite(h.finalDamageMul)) h.finalDamageMul = 1;
    h.finalDamageMul = Math.max(0, h.finalDamageMul);
    h.dmg = Math.floor(h.dmg * h.finalDamageMul);
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * h.finalDamageMul);
  }
  function applyKarmaAndTrueDamage(c, h) {
    if (c.passiveKarmaContext && String(c.passiveKarmaContext.targetId) === String(h.targetEnemy.id)) {
      let karmaMul = Math.max(1, Number(c.passiveKarmaContext.multiplier) || 1);
      h.dmg = Math.floor(h.dmg * karmaMul);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * karmaMul);
    }
    if ((c.pStats.passiveOmniscientTrueDamagePct || 0) > 0) {
      h.dmg += Math.floor(Math.max(0, Number(c.pStats.baseDmg) || 0) * c.pStats.passiveOmniscientTrueDamagePct / 100);
    }
    if (!Number.isFinite(h.dmg) || h.dmg < 0) h.dmg = 0;
  }
  function applyHunterVulnerability(c, h) {
    if (c.deps.hasKeystone("h2") && h.targetEnemy) {
      h.targetEnemy.ailments = Array.isArray(h.targetEnemy.ailments) ? h.targetEnemy.ailments : [];
      let weak = h.targetEnemy.ailments.find((a) => a && a.type === "hunterExpose");
      if (weak) weak.time = 3;
      else h.targetEnemy.ailments.push({ type: "hunterExpose", time: 3, power: 1 });
    }
    if (c.deps.hasKeystone("h2") && Array.isArray(h.targetEnemy.ailments) && h.targetEnemy.ailments.some((a) => a && a.type === "hunterExpose" && (a.time || 0) > 0)) {
      h.dmg = Math.floor(h.dmg * (1 + c.deps.ASCENDANCY_KEYSTONE_VALUES.h2.takenMorePct / 100));
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * (1 + c.deps.ASCENDANCY_KEYSTONE_VALUES.h2.takenMorePct / 100));
    }
  }
  function refreshHitCurse(c, h) {
    if (h.targetEnemy && h.targetEnemy.id && c.pStats.uniqueCursedTakenAndRefresh) {
      let refreshSec = Math.max(0, Number(c.pStats.uniqueCursedTakenAndRefresh.refreshSec || 0));
      if (refreshSec > 0 && c.owner.enemyConditionDebuffs && Array.isArray(c.owner.enemyConditionDebuffs[h.targetEnemy.id])) {
        let nextExpire = c.deps.getCombatTime() + Math.floor(refreshSec * 1e3);
        c.owner.enemyConditionDebuffs[h.targetEnemy.id] = c.owner.enemyConditionDebuffs[h.targetEnemy.id].map((deb) => {
          if (!deb) return deb;
          if ((deb.expiresAt || 0) > c.deps.getCombatTime()) deb.expiresAt = Math.max(deb.expiresAt || 0, nextExpire);
          return deb;
        });
      }
    }
  }
  function applyFirstStrikeAndDistance(c, h) {
    h.talentWasFull = h.targetEnemy.hp >= (h.targetEnemy.maxHp || h.targetEnemy.hp || 1);
    if (h.talentWasFull && (c.pStats.firstStrikeDamagePct || 0) > 0) {
      let firstStrikeMul = 1 + Math.max(0, Number(c.pStats.firstStrikeDamagePct) || 0) / 100;
      h.dmg = Math.floor(h.dmg * firstStrikeMul);
      h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * firstStrikeMul);
    }
    h.directHitDistanceMul = c.deps.getGridDirectHitDistanceMultiplier(c.owner.gridPlayer, h.targetEnemy);
    h.dmg = Math.floor(h.dmg * h.directHitDistanceMul);
    h.damageBeforeMitigation = Math.floor(h.damageBeforeMitigation * h.directHitDistanceMul);
    h.ailmentDamageBeforeCritMitigation = Math.floor(h.ailmentDamageBeforeCritMitigation * h.directHitDistanceMul);
  }
  function mitigatePlayerContact(c, h) {
    prepareConditionalHit(c, h);
    if (evadeContact(c, h) === false) return false;
    convertMainDamage(c, h);
    applyPhysicalMitigation(c, h);
    applyElementMitigation(c, h);
    addConvertedElements(c, h);
    addFlatElements(c, h);
    applyCurseTaken(c, h);
    applyShockIncrease(c, h);
    applyShockedMore(c, h);
    applyBleedingWeight(c, h);
    applyBleedingMore(c, h);
    applyArmorAmplifier(c, h);
    applyFinalTaken(c, h);
    applyKarmaAndTrueDamage(c, h);
    applyHunterVulnerability(c, h);
    refreshHitCurse(c, h);
    applyFirstStrikeAndDistance(c, h);
  }

  // modules/domain/player-attack-on-hit.mjs
  function dealContactDamage(c, h) {
    h.targetEnemy.lastHitElement = h.hitElement;
    h.moonShadowRatio = h.hitCrit && typeof c.deps.getPreciseTalentRatio === "function" ? 0.2 * c.deps.getPreciseTalentRatio("hero3__assassin") : 0;
    h.normalDamage = h.moonShadowRatio > 0 ? Math.floor(h.dmg * (1 - h.moonShadowRatio)) : h.dmg;
    h.dealtToEnemy = c.deps.supports.dealHit(h.targetEnemy, c.pStats, h.normalDamage);
  }
  function showConditionalFeedback(c, h) {
    if (h.dealtToEnemy > 0) {
      if (h.skillConditionalCues) h.skillConditionalCues.forEach((cue) => c.showAttackFeedback(h.targetEnemy, cue));
      if (c.stageKind === "slamAftershock") {
        c.showAttackFeedback(h.targetEnemy, { key: "slam-aftershock", text: c.stageLabel || "여진", color: "#f0bd79" });
      }
      if (h.talentWasFull && (c.pStats.firstStrikeDamagePct || 0) > 0) {
        c.showAttackFeedback(h.targetEnemy, {
          key: "first-strike",
          text: c.deps._t("선제 타격"),
          // 2026-11-05 사용자: 수치 없이 이름만(전: 선제 타격: 피해 n% 증폭)
          color: "#ffd27a"
        });
      }
    }
  }
  function dealShadowDamage(c, h) {
    if (h.moonShadowRatio > 0) {
      let trueDamage = Math.max(0, Math.floor(h.damageBeforeMitigation * h.moonShadowRatio));
      h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, trueDamage);
    }
    if (h.dealtToEnemy > 0 && h.hitElement === "chaos") h.targetEnemy.talentHitByChaos = true;
    if (h.dealtToEnemy > 0 && c.options.talentMoonReturn && h.targetEnemy.id === c.options.talentMoonReturn.targetId) {
      c.talentMoonPrimaryHit = true;
    }
  }
  function triggerRiftWave(c, h) {
    if (c.pStats.uniqueRiftWaveOnHit && h.dealtToEnemy > 0 && c.deps.random() * 100 < Math.max(0, Number(c.pStats.uniqueRiftWaveOnHit.chance) || 0)) {
      let waveDamage = Math.max(1, Math.floor(h.dealtToEnemy * Math.max(0, Number(c.pStats.uniqueRiftWaveOnHit.damagePct) || 0) / 100));
      (c.owner.enemies || []).forEach((otherEnemy) => {
        if (!otherEnemy || otherEnemy.hp <= 0 || otherEnemy.id === h.targetEnemy.id) return;
        let waveDealt = c.deps.applyDamageToEnemyResource(otherEnemy, waveDamage);
        if (waveDealt > 0) {
          c.deps.addBattleFx("hit", { enemyId: otherEnemy.id, color: "#a879ff", damage: waveDealt, duration: 210, element: "chaos", syncToSwing: true });
          if (otherEnemy.hp <= 0) c.deps.handleEnemyDeath(otherEnemy, c.pStats);
        }
      });
    }
  }
  function executeCullStrike(c, h) {
    if (h.dmg > 0 && h.targetEnemy.hp > 0 && !h.targetEnemy.isBoss && (c.pStats.cullStrikePct || 0) > 0) {
      let cullThr = Math.max(0, Math.min(20, Number(c.pStats.cullStrikePct) || 0)) / 100;
      if (cullThr > 0 && withinCullThreshold(h.targetEnemy, cullThr)) {
        h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, c.deps.getEnemyLifeAndShield(h.targetEnemy));
        c.showAttackFeedback(h.targetEnemy, { key: "cull", text: c.deps._t("처형"), color: "#ff9b79" });
      }
    }
  }
  function withinCullThreshold(enemy, threshold) {
    return enemy.hp / Math.max(1, enemy.maxHp || enemy.hp || 1) <= threshold;
  }
  function executeNormalMonster(c, h) {
    if (h.dmg > 0 && h.targetEnemy.hp > 0 && !h.targetEnemy.isBoss && !h.targetEnemy.isElite && !h.targetEnemy.elite && (c.pStats.uniqueInstakillNormalPct || 0) > 0 && c.deps.random() * 100 < c.pStats.uniqueInstakillNormalPct) {
      h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, c.deps.getEnemyLifeAndShield(h.targetEnemy));
      c.showAttackFeedback(h.targetEnemy, { key: "instant-kill", text: c.deps._t("즉시 처치"), color: "#d7b0ff" });
    }
  }
  function executeOccupiedDot(c, h) {
    if (h.dmg > 0 && h.targetEnemy.hp > 0 && typeof c.deps.getTalentDotOccupancyDamage === "function" && c.deps.getTalentDotOccupancyDamage(h.targetEnemy, c.pStats) >= c.deps.getEnemyLifeAndShield(h.targetEnemy)) {
      h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, c.deps.getEnemyLifeAndShield(h.targetEnemy));
      c.showAttackFeedback(h.targetEnemy, { key: "dot-execute", text: c.deps._t("지속 피해 처형"), color: "#c88cff" });
    }
  }
  function accumulateInquisitorMark(c, h) {
    if (h.dmg > 0 && h.targetEnemy.hp > 0 && typeof c.deps.isTalentCardActive === "function" && c.deps.isTalentCardActive("hero1__inquisitor")) {
      c.owner.talentInquisitorMarks = c.owner.talentInquisitorMarks && typeof c.owner.talentInquisitorMarks === "object" ? c.owner.talentInquisitorMarks : {};
      let nowMk = c.deps.getCombatTime();
      let mk = c.owner.talentInquisitorMarks[h.targetEnemy.id] || { accumulated: 0, explodeAt: 0, cooldownUntil: 0 };
      chargeInquisitorMark(c, h, mk, nowMk);
    }
  }
  function chargeInquisitorMark(c, h, mk, nowMk) {
    if ((mk.cooldownUntil || 0) <= nowMk) {
      if (!mk.explodeAt) mk.explodeAt = nowMk + 5e3;
      mk.accumulated = (mk.accumulated || 0) + h.dealtToEnemy;
      c.owner.talentInquisitorMarks[h.targetEnemy.id] = mk;
    }
  }
  function detonateHexbowCurse(c, h) {
    if (h.dmg > 0 && typeof c.deps.isTalentCardActive === "function" && c.deps.isTalentCardActive("hero1__warlock") && c.owner.enemyConditionDebuffs && Array.isArray(c.owner.enemyConditionDebuffs[h.targetEnemy.id]) && c.owner.enemyConditionDebuffs[h.targetEnemy.id].some((d) => d && (d.expiresAt || 0) > c.deps.getCombatTime())) {
      let activeCurses = c.owner.enemyConditionDebuffs[h.targetEnemy.id];
      let consumedCurseIndex = activeCurses.findIndex((d) => d && (d.expiresAt || 0) > c.deps.getCombatTime());
      if (consumedCurseIndex >= 0) activeCurses.splice(consumedCurseIndex, 1);
      let splash = Math.max(1, Math.floor(h.dmg * 0.2));
      (c.owner.enemies || []).forEach((e) => {
        if (!e || e.hp <= 0) return;
        c.deps.applyDamageToEnemyResource(e, splash);
        c.deps.addBattleFx("hit", { enemyId: e.id, color: c.deps.getElementColor("chaos"), damage: splash, duration: 220, syncToSwing: true });
        if (e.hp <= 0) c.deps.handleEnemyDeath(e, c.pStats);
      });
    }
  }
  function applyMaxRollBonus(c, h) {
    if (h.targetEnemy.hp <= 0) h.targetEnemy.lastOverkillDamage = Math.max(0, h.dmg - h.dealtToEnemy);
    if (c.pStats.uniqueMaxRollBonusHit && h.rollPct >= 130 && h.dealtToEnemy > 0 && h.targetEnemy.hp > 0) {
      let bonus = Math.max(1, Math.floor(h.dealtToEnemy * 0.5));
      h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, bonus);
    }
  }
  function applyRangerWeakpoint(c, h) {
    if (c.deps.hasKeystone("r5") && h.targetEnemy.hp > 0) {
      c.owner.rangerWeakpointMarks = c.owner.rangerWeakpointMarks || {};
      let mark = c.owner.rangerWeakpointMarks[h.targetEnemy.id] || { hits: 0 };
      mark.hits = Math.max(0, Math.floor(mark.hits || 0)) + 1;
      if (mark.hits >= 3) {
        mark.hits = 0;
        let bonus = c.deps.getRangerWeakpointBonus(h.targetEnemy, h.dmg);
        h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, bonus);
        c.deps.addBattleFx("hit", { enemyId: h.targetEnemy.id, color: c.deps.getElementColor("phys"), damage: bonus, duration: 280, element: "phys", syncToSwing: true });
      }
      c.owner.rangerWeakpointMarks[h.targetEnemy.id] = mark;
    }
    c.deps.maybeUnlockChaosRealmFromWoodsman(h.targetEnemy);
  }
  function carryPierceOverkill(c, h) {
    if (h.targetEnemy.hp <= 0 && h.dmg > h.dealtToEnemy) {
      let overkillDamage = h.dmg - h.dealtToEnemy;
      let ailmentOverkillSourceDamage = h.dmg > 0 ? Math.floor(h.ailmentDamageBeforeCritMitigation * (overkillDamage / h.dmg)) : 0;
      let isOriginalPierceTarget = c.originalPierceTargets.size === 0 || c.originalPierceTargets.has(h.targetEnemy);
      let canStartPierceCarry = !c.pStats.sSkill.pierceOverkillCarry || isOriginalPierceTarget && !c.pierceOverkillCarryStartedTargets.has(h.targetEnemy);
      if (canStartPierceCarry) {
        if (c.pStats.sSkill.pierceOverkillCarry) c.pierceOverkillCarryStartedTargets.add(h.targetEnemy);
        c.applyPierceOverkillCarry(h.targetEnemy, overkillDamage, h.hitElement, h.hitCrit, ailmentOverkillSourceDamage);
      }
    }
  }
  function scheduleSlamEcho(c, h) {
    if (c.options.skipSlamEcho || !(c.slamEchoPct > 0) || !(c.pStats.sSkill.tags || []).includes("slam")) return;
    rollSlamEcho(c, h);
  }
  function rollSlamEcho(c, h) {
    if (h.dmg > 0 && h.targetEnemy.hp > 0 && (c.slamEchoGuaranteed || c.passiveSlamEchoChance <= 0 || c.deps.random() < c.passiveSlamEchoChance)) {
      let slamEchoBaseDamage = c.stageKind === "slamPrimary" ? Math.floor(h.dmg / Math.max(0.01, c.stageDamageMultiplier)) : h.dmg;
      c.owner.pendingSlamEchoHits = Array.isArray(c.owner.pendingSlamEchoHits) ? c.owner.pendingSlamEchoHits : [];
      c.owner.pendingSlamEchoHits.push({
        at: c.deps.getCombatTime() + c.slamEchoDelayMs,
        enemyId: h.targetEnemy.id,
        damage: Math.max(1, Math.floor(slamEchoBaseDamage * c.slamEchoPct)),
        element: h.hitElement
      });
    }
  }
  function executeTalismanBoss(c, h) {
    if ((c.pStats.damageScales || {}).talismanBossFinalDmgBonusPct && h.targetEnemy.hp > 0 && h.targetEnemy.hp / Math.max(1, h.targetEnemy.maxHp || h.targetEnemy.hp) <= 0.05) {
      h.targetEnemy.hp = 0;
      c.showAttackFeedback(h.targetEnemy, { key: "boss-finish", text: c.deps._t("마무리"), color: "#f4c779" });
    }
  }
  function executeTalentChain(c, h) {
    if (h.targetEnemy.hp > 0 && !h.targetEnemy.isBoss && !h.targetEnemy.isElite && !h.targetEnemy.elite && c.deps.getCombatTalentCardLevel("hero2__assassin") > 0) {
      executeButcherMark(c, h);
    }
  }
  function executeButcherMark(c, h) {
    let butcherRow = c.owner.talentButcherMarks && c.owner.talentButcherMarks[h.targetEnemy.id];
    let butcherLifeRatio = h.targetEnemy.hp / Math.max(1, h.targetEnemy.maxHp || h.targetEnemy.hp);
    if (butcherRow && butcherRow.hits >= 4 && butcherLifeRatio <= 0.3) {
      h.targetEnemy.hp = 0;
      c.showAttackFeedback(h.targetEnemy, { key: "butcher-execute", text: c.deps._t("처형"), color: "#ff9b79" });
    }
  }
  function executeSkillThreshold(c, h) {
    c.deps.updateTalentButcherHitMark(h.targetEnemy);
    if (c.deps.canApplyTalentExecuteThreshold(h.targetEnemy, c.pStats.sSkill.executeThreshold) && h.targetEnemy.hp > 0 && h.targetEnemy.hp / Math.max(1, h.targetEnemy.maxHp || h.targetEnemy.hp) < c.pStats.sSkill.executeThreshold) {
      h.targetEnemy.hp = 0;
      c.showAttackFeedback(h.targetEnemy, { key: "skill-execute", text: c.deps._t("처형"), color: "#ff9b79" });
    }
  }
  function executeGladiator(c, h) {
    if (c.deps.hasKeystone("g6") && h.targetEnemy.hp > 0) {
      let executeThreshold = h.targetEnemy.isBoss ? 0.1 : 0.2;
      if (h.targetEnemy.hp / Math.max(1, h.targetEnemy.maxHp || h.targetEnemy.hp) < executeThreshold) {
        h.targetEnemy.hp = 0;
        c.showAttackFeedback(h.targetEnemy, { key: "gladiator-execute", text: c.deps._t("처형"), color: "#ff9b79" });
      }
    }
  }
  function applyPlayerContact(c, h) {
    dealContactDamage(c, h);
    showConditionalFeedback(c, h);
    dealShadowDamage(c, h);
    triggerRiftWave(c, h);
    executeCullStrike(c, h);
    executeNormalMonster(c, h);
    executeOccupiedDot(c, h);
    accumulateInquisitorMark(c, h);
    detonateHexbowCurse(c, h);
    applyMaxRollBonus(c, h);
    applyRangerWeakpoint(c, h);
    carryPierceOverkill(c, h);
    scheduleSlamEcho(c, h);
    executeTalismanBoss(c, h);
    executeTalentChain(c, h);
    executeSkillThreshold(c, h);
    executeGladiator(c, h);
  }

  // modules/domain/player-attack-hit-effects.mjs
  function recordRecentHit(c, h) {
    if ((c.pStats.regenSuppress || 0) > 0) h.targetEnemy.regenSuppressPct = Math.min(95, (h.targetEnemy.regenSuppressPct || 0) + c.pStats.regenSuppress);
    h.targetEnemy.recentHitsTaken = (h.targetEnemy.recentHitsTaken || 0) + 1;
    h.targetEnemy.recentHitsTimer = 1.8;
  }
  function stackChaosResistanceLoss(c, h) {
    if (c.pStats.uniqueChaosResDownOnHit) {
      c.owner.enemyUniqueChaosResDown = c.owner.enemyUniqueChaosResDown || {};
      let row = c.owner.enemyUniqueChaosResDown[h.targetEnemy.id] || { stacks: 0, perHit: c.pStats.uniqueChaosResDownOnHit.perHit, maxStacks: c.pStats.uniqueChaosResDownOnHit.maxStacks };
      row.stacks = Math.min(row.maxStacks, Math.max(0, row.stacks + 1));
      row.perHit = c.pStats.uniqueChaosResDownOnHit.perHit;
      row.maxStacks = c.pStats.uniqueChaosResDownOnHit.maxStacks;
      c.owner.enemyUniqueChaosResDown[h.targetEnemy.id] = row;
    }
  }
  function stackElementResistanceLoss(c, h) {
    if (c.pStats.uniqueStackingElementalResDownOnHit && ["fire", "cold", "light"].includes(h.hitElement)) {
      c.owner.enemyUniqueElementalResDown = c.owner.enemyUniqueElementalResDown || {};
      let row = c.owner.enemyUniqueElementalResDown[h.targetEnemy.id] || { stacks: 0, perHit: c.pStats.uniqueStackingElementalResDownOnHit.perHit, max: c.pStats.uniqueStackingElementalResDownOnHit.max };
      row.stacks = Math.min(Math.ceil(row.max / Math.max(1, row.perHit)), Math.max(0, row.stacks + 1));
      row.perHit = c.pStats.uniqueStackingElementalResDownOnHit.perHit;
      row.max = c.pStats.uniqueStackingElementalResDownOnHit.max;
      c.owner.enemyUniqueElementalResDown[h.targetEnemy.id] = row;
    }
  }
  function summonQueenBee(c) {
    if (c.pStats.uniqueQueenBeeSummon && c.deps.random() < Math.max(0, Math.min(1, (c.pStats.uniqueQueenBeeSummon.chance || 0) / 100))) {
      let bees = c.owner.queenBees || [];
      bees.push({ expiresAt: c.deps.getCombatTime() + Math.max(1e3, Math.floor((c.pStats.uniqueQueenBeeSummon.attacks || 3) * 1e3)), nextAt: c.deps.getCombatTime() + 1e3, attacksLeft: Math.max(1, Math.floor(c.pStats.uniqueQueenBeeSummon.attacks || 3)), hitPct: Math.max(1, Number(c.pStats.uniqueQueenBeeSummon.hitPct || 125)) });
      while (bees.length > Math.max(1, Math.floor(c.pStats.uniqueQueenBeeSummon.maxBees || 10))) bees.shift();
      c.owner.queenBees = bees;
    }
  }
  function triggerMeteor(c, h) {
    if (h.hitCrit && c.pStats.uniqueMeteorFootsteps && c.deps.random() < Math.max(0, Math.min(1, (c.pStats.uniqueMeteorFootsteps.chance || 0) / 100))) {
      let meteor = Math.max(1, Math.floor(h.dmg * (Math.max(1, Number(c.pStats.uniqueMeteorFootsteps.damagePct || 180)) / 100)));
      (c.owner.enemies || []).forEach((e) => {
        if (!e || e.hp <= 0) return;
        c.deps.applyDamageToEnemyResource(e, meteor);
      });
    }
  }
  function triggerShockTracer(c, h) {
    if (c.pStats.uniqueShockTracer && Array.isArray(h.targetEnemy.ailments) && h.targetEnemy.ailments.some((a) => a && a.type === "shock" && (a.time || 0) > 0)) {
      let now = c.deps.getCombatTime();
      c.owner.uniqueShockTracerNextAt = Number(c.owner.uniqueShockTracerNextAt || 0);
      if (now >= c.owner.uniqueShockTracerNextAt) {
        let icdMs = Math.max(100, Math.floor(Number(c.pStats.uniqueShockTracer.icdSec || 0.5) * 1e3));
        c.owner.uniqueShockTracerNextAt = now + icdMs;
        let strikePct = Math.max(1, Number(c.pStats.uniqueShockTracer.strikeDamagePct || 500));
        let strike = Math.max(1, Math.floor(h.dmg * (strikePct / 100)));
        h.dealtToEnemy += c.deps.applyDamageToEnemyResource(h.targetEnemy, strike);
      }
    }
  }
  function grantDragonGuard(c) {
    if (c.pStats.uniqueDragonVeinGuard && c.deps.random() < Math.max(0, Math.min(1, (c.pStats.uniqueDragonVeinGuard.chance || 0) / 100))) {
      let guardAmt = Math.max(1, Math.floor((c.pStats.maxHp || 0) * Math.max(0, Number(c.pStats.uniqueDragonVeinGuard.hpPct || 8)) / 100));
      c.owner.playerUniqueGuard = { amount: guardAmt, expiresAt: c.deps.getCombatTime() + Math.max(500, Math.floor((c.pStats.uniqueDragonVeinGuard.duration || 2) * 1e3)) };
    }
  }
  function recordContactSummary(c, h) {
    c.totalLeechableDamage += h.dealtToEnemy * (h.targetEnemy && h.targetEnemy.leechEffMul !== void 0 ? h.targetEnemy.leechEffMul : 1);
    if (h.hitElement === "chaos") c.totalChaosDamage += h.dealtToEnemy;
    c.hits.push(h.dealtToEnemy);
    c.deps.notePlayerHitSummary(c.hitSummary, h.targetEnemy, h.dealtToEnemy);
    c.deps.addPlayerHitVisualFx(c.pStats, c.options, h.targetEnemy, {
      stageKind: c.stageKind,
      stageLabel: c.stageLabel,
      stageCount: c.stageCount,
      skillName: c.skillName,
      hitCrit: h.hitCrit,
      hitIdx: h.hitIdx,
      hitElement: h.hitElement,
      dealtToEnemy: h.dealtToEnemy,
      dmg: h.dmg,
      isStageReplay: c.isStageReplay
    });
  }
  function stackAssassinWeakness(c, h) {
    if (h.hitCrit && c.deps.hasKeystone("a3")) {
      let now = c.deps.getCombatTime();
      c.owner.enemyKeystoneDebuffs = c.owner.enemyKeystoneDebuffs || {};
      let list = (c.owner.enemyKeystoneDebuffs[h.targetEnemy.id] || []).filter((row) => row && (row.expiresAt || 0) > now);
      list.push({ type: "a3", expiresAt: now + 5e3 });
      while (list.filter((row) => row.type === "a3").length > 10) {
        let idx = list.findIndex((row) => row.type === "a3");
        if (idx >= 0) list.splice(idx, 1);
        else break;
      }
      c.owner.enemyKeystoneDebuffs[h.targetEnemy.id] = list;
      h.targetEnemy.ailments = Array.isArray(h.targetEnemy.ailments) ? h.targetEnemy.ailments : [];
      let stacks = list.filter((row) => row.type === "a3").length;
      let mark = h.targetEnemy.ailments.find((ail) => ail && ail.type === "assassinWeakness");
      if (mark) {
        mark.time = 5;
        mark.power = stacks;
      } else h.targetEnemy.ailments.push({ type: "assassinWeakness", time: 5, power: stacks });
    }
  }
  function applyContactAilments(c, h) {
    if (c.isDotSkill) c.deps.applySkillDotFromHit(h.targetEnemy, h.damageBeforeMitigation, c.pStats);
    h.ailmentType = c.deps.getAilmentTypeFromElement(h.hitElement);
    h.conditionAilmentTakenMul = h.curseFx && h.curseFx.ailmentTakenMul ? h.curseFx.ailmentTakenMul[h.ailmentType] || 1 : 1;
    h.ailmentStats = c.deps.getSkillAilmentStats(c.pStats, h.hitElement, h.curseFx);
    c.deps.applyEnemyAilmentFromHit(h.targetEnemy, h.ailmentStats, h.dmg, h.hitCrit, {
      ailmentSourceDamage: Math.floor(h.ailmentDamageBeforeCritMitigation * h.conditionAilmentTakenMul),
      critDotBonusPct: h.hitCrit ? 50 : 0,
      primaryAilmentChance: c.options.primaryAilmentChance,
      additionalAilmentChances: c.deps.regionAffixEffects.extraAilmentChances(c.pStats)
    });
    c.deps.spreadSkillAilmentOnHit(h.targetEnemy, c.pStats.sSkill, c.pStats);
    c.deps.applySkillPeriodicOnHit(h.targetEnemy, c.pStats.sSkill, h.dealtToEnemy, c.pStats.sSkill.visualName || c.skillName);
    c.deps.applySkillGridControlOnHit(h.targetEnemy, c.pStats.sSkill, c.options);
    c.deps.applySupportEchoOnHit(h.targetEnemy, c.pStats, h.dealtToEnemy);
    c.deps.applySupportChaosErosionOnHit(h.targetEnemy, c.pStats, h.hitElement);
    c.deps.applyCosmosJudgmentOnHit(h.targetEnemy, c.pStats, h.hitElement);
    c.deps.regionAffixEffects.afterHit(c.pStats, h.targetEnemy, { crit: h.hitCrit, damage: h.dealtToEnemy });
  }
  function applyAlwaysShock(c, h) {
    if (c.pStats.uniqueAlwaysShock && !c.pStats.cosmosCometChillNoFreeze) {
      let shockStats = { ...c.pStats, sSkill: { ...c.pStats.sSkill, ele: "light" } };
      let shockHit = Math.max(1, Math.floor(h.dmg * 0.25 * (1 + Math.max(0, Number(c.pStats.shockEffectBonusPct) || 0) / 100)));
      c.deps.applyEnemyAilmentFromHit(h.targetEnemy, shockStats, shockHit, true);
    }
  }
  function finishPlayerContact(c, h) {
    recordRecentHit(c, h);
    stackChaosResistanceLoss(c, h);
    stackElementResistanceLoss(c, h);
    summonQueenBee(c, h);
    triggerMeteor(c, h);
    triggerShockTracer(c, h);
    grantDragonGuard(c, h);
    recordContactSummary(c, h);
    stackAssassinWeakness(c, h);
    applyContactAilments(c, h);
    applyAlwaysShock(c, h);
  }

  // modules/domain/player-attack-carry.mjs
  function showAttackFeedback(c, enemy, cue) {
    if (!cue || !cue.key || !cue.text || c.attackFeedbackKeys.has(cue.key)) return;
    c.attackFeedbackKeys.add(cue.key);
    c.deps.addBattleFx("statusText", {
      enemyId: enemy && enemy.id,
      text: cue.text,
      color: cue.color || "#f3d9a4",
      duration: 900,
      dedupeKey: c.attackFeedbackGroup ? `attack:${c.attackFeedbackGroup}:${cue.key}` : "",
      dedupeWindowMs: 1400
    });
  }
  function applyPierceOverkillCarry(c, carry) {
    const hunterSingle = c.deps.hasKeystone("h4") && (c.owner.enemies || []).filter((e) => e && e.hp > 0).length === 1;
    if (!c.pStats.sSkill.pierceOverkillCarry && !hunterSingle || carry.carryDamage <= 0) return;
    runPierceCarry(c, carry);
  }
  function runPierceCarry(c, carry) {
    const { sourceEnemy, carryDamage, ailmentCarrySourceDamage } = carry;
    const chain = {
      remaining: Math.max(0, Math.floor(carryDamage)),
      ailment: Math.max(0, Math.floor(Number(ailmentCarrySourceDamage !== void 0 ? ailmentCarrySourceDamage : carryDamage) || 0)),
      visited: new Set(sourceEnemy && sourceEnemy.id ? [sourceEnemy.id] : []),
      source: sourceEnemy
    };
    const limit = Math.max(1, Math.min(12, Math.floor(c.pStats.sSkill.targets || 1)));
    for (let index = 0; index < limit && chain.remaining > 0; index++) {
      const target = pickCarryTarget(c, chain.visited);
      if (!target) return;
      chain.visited.add(target.id);
      const damage = resolveCarryDamage(c, carry.hitElement, target, chain.remaining);
      const dealt = c.deps.applyDamageToEnemyResource(target, Math.max(1, damage));
      recordCarryHit(c, carry, chain, target, dealt);
      advanceCarry(chain, target, dealt);
    }
  }
  function pickCarryTarget(c, visited) {
    return (c.owner.enemies || []).find((enemy) => enemy && enemy.hp > 0 && !visited.has(enemy.id) && (!c.pStats.sSkill.pierceOverkillCarry || !c.originalPierceTargets.has(enemy)));
  }
  function resolveCarryDamage(c, element, target, remaining) {
    const zone = c.deps.getZone(c.owner.currentZoneId);
    const resistance = c.deps.getEffectiveEnemyMitigation(element, zone.tier, target, c.pStats);
    let damage = Math.floor(remaining * (1 - resistance / 100) * c.deps.mutationHitScale(target, element));
    if ((c.pStats.sSkill.tags || []).includes("projectile")) damage = Math.floor(damage * (target.projectileDamageTakenMul || 1));
    if (element === "phys") damage = Math.floor(damage * (target.physicalDamageTakenMul || 1));
    return damage;
  }
  function recordCarryHit(c, carry, chain, target, dealt) {
    c.deps.maybeUnlockChaosRealmFromWoodsman(target);
    target.recentHitsTaken = (target.recentHitsTaken || 0) + 1;
    target.recentHitsTimer = 1.8;
    c.totalLeechableDamage += dealt * (target && target.leechEffMul !== void 0 ? target.leechEffMul : 1);
    c.hits.push(dealt);
    c.deps.notePlayerHitSummary(c.hitSummary, target, dealt);
    c.deps.addBattleFx("hit", {
      enemyId: target.id,
      color: c.deps.getElementColor(carry.hitElement),
      crit: carry.hitCrit,
      projectile: true,
      chain: true,
      stageKind: "chainJump",
      chainFromEnemyId: chain.source && chain.source.id,
      skillName: c.skillName,
      damage: dealt,
      duration: 320,
      element: carry.hitElement,
      syncToSwing: true
    });
    c.deps.applyEnemyAilmentFromHit(target, { ...c.pStats, sSkill: { ...c.pStats.sSkill, ele: carry.hitElement } }, chain.remaining, carry.hitCrit, {
      ailmentSourceDamage: chain.ailment,
      critDotBonusPct: carry.hitCrit ? 50 : 0
    });
  }
  function advanceCarry(chain, target, dealt) {
    if (target.hp <= 0) {
      const previous = chain.remaining;
      chain.remaining = Math.max(0, Math.floor((chain.remaining - dealt) * 0.8));
      const ratio = previous > 0 ? chain.remaining / previous : 0;
      chain.ailment = Math.max(0, Math.floor(chain.ailment * ratio));
    } else {
      chain.remaining = 0;
      chain.ailment = 0;
    }
    chain.source = target;
  }

  // modules/domain/player-attack-finish.mjs
  function finishAttackRecovery(c) {
    c.instantLeechRecovered = c.deps.applyPlayerHitLeech(c.pStats, c.totalLeechableDamage, c.totalChaosDamage);
    recoverAttackCriticalShield(c);
    c.firstResolvedSkillHit = !c.isStageReplay || Number(c.options.stageIndex) === 0;
    if (c.firstResolvedSkillHit && c.isCrit && c.hitSummary.totalDamage > 0) c.deps.advanceEnergyShieldRechargeOnCrit(c.pStats, c.deps.getCombatTime());
    c.hitLog = c.deps.getPlayerHitCombatLog(c.hitSummary, { skillName: c.skillName, swingElement: c.swingElement, isCrit: c.isCrit, isDotSkill: c.isDotSkill, targets: c.targets, pStats: c.pStats, instantLeechRecovered: c.instantLeechRecovered });
  }
  function recoverAttackCriticalShield(c) {
    if (!c.isStageReplay && c.isCrit && (c.pStats.uniqueEsRecoverOnCritPct || 0) > 0 && (c.pStats.energyShield || 0) > 0) {
      let recover = Math.max(1, Math.floor((c.pStats.energyShield || 0) * ((c.pStats.uniqueEsRecoverOnCritPct || 0) / 100)));
      c.owner.playerEnergyShield = Math.min(c.deps.getPlayerEnergyShieldRecoveryCap(c.pStats), Math.max(0, (c.owner.playerEnergyShield || 0) + recover));
    }
  }

  // modules/domain/player-attack.mjs
  function resolvePlayerAttack(owner, pStats, attackOptions, deps2) {
    const c = { owner, pStats, attackOptions, deps: deps2 };
    if (preparePlayerCast(c) === false) return;
    c.showAttackFeedback = (enemy, cue) => showAttackFeedback(c, enemy, cue);
    c.applyPierceOverkillCarry = (sourceEnemy, carryDamage, hitElement, hitCrit, ailmentCarrySourceDamage) => applyPierceOverkillCarry(c, { sourceEnemy, carryDamage, hitElement, hitCrit, ailmentCarrySourceDamage });
    c.randomTargetCapFallbackUsed = false;
    for (let hitIdx = 0; hitIdx < c.repeats; hitIdx++) {
      const hitEntries = c.pStats.sSkill.randomTargetEachHit ? [{ mult: 1 }] : c.targets;
      hitEntries.forEach((hit, targetIndex) => {
        const h = { hitIdx, hitEntries, hit, targetIndex };
        resolvePlayerContact(c, h);
      });
    }
    finishAttackRecovery(c);
    return { pStats: c.pStats, options: c.options, hitLog: c.hitLog, talentMoonPrimaryHit: c.talentMoonPrimaryHit };
  }
  function createPlayerAttackResolver(deps2) {
    return Object.freeze({ resolve: (owner, stats, options) => resolvePlayerAttack(owner, stats, options, deps2) });
  }
  function resolvePlayerContact(c, h) {
    if (selectPlayerContact(c, h) === false) return;
    rollPlayerContact(c, h);
    if (mitigatePlayerContact(c, h) === false) return;
    applyPlayerContact(c, h);
    finishPlayerContact(c, h);
  }

  // modules/combat-player-attack-classic.mjs
  var resolver = createPlayerAttackResolver({
    get getAttackProjectileShots() {
      return getAttackProjectileShots;
    },
    get isTalentPlayerAttackDisabled() {
      return typeof isTalentPlayerAttackDisabled === "undefined" ? void 0 : isTalentPlayerAttackDisabled;
    },
    get consumeCombatChannelContinuation() {
      return consumeCombatChannelContinuation;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get prepareTalentPlayerAttackContext() {
      return prepareTalentPlayerAttackContext;
    },
    get isTalentCardActive() {
      return typeof isTalentCardActive === "undefined" ? void 0 : isTalentCardActive;
    },
    get getAttackTargets() {
      return getAttackTargets;
    },
    get beginPassiveKarmaAttack() {
      return typeof beginPassiveKarmaAttack === "undefined" ? void 0 : beginPassiveKarmaAttack;
    },
    get consumeLoneEvasionCounterMultiplier() {
      return consumeLoneEvasionCounterMultiplier;
    },
    get beginSkillMobility() {
      return beginSkillMobility;
    },
    get getTalentMoonReturnConfig() {
      return typeof getTalentMoonReturnConfig === "undefined" ? void 0 : getTalentMoonReturnConfig;
    },
    get buildSkillHitSequence() {
      return typeof buildSkillHitSequence === "undefined" ? void 0 : buildSkillHitSequence;
    },
    get recordPassiveFanaticSkillUse() {
      return typeof recordPassiveFanaticSkillUse === "undefined" ? void 0 : recordPassiveFanaticSkillUse;
    },
    get hasKeystone() {
      return hasKeystone;
    },
    get rollTalentPlayerCrit() {
      return typeof rollTalentPlayerCrit === "undefined" ? void 0 : rollTalentPlayerCrit;
    },
    get talentOnPlayerAttack() {
      return typeof talentOnPlayerAttack === "undefined" ? void 0 : talentOnPlayerAttack;
    },
    get getElementalistOverloadStacks() {
      return getElementalistOverloadStacks;
    },
    get recordElementalistOverloadAttack() {
      return recordElementalistOverloadAttack;
    },
    get ASCENDANCY_KEYSTONE_VALUES() {
      return ASCENDANCY_KEYSTONE_VALUES;
    },
    get getTalentDamageConversion() {
      return typeof getTalentDamageConversion === "undefined" ? void 0 : getTalentDamageConversion;
    },
    get getTalentPlayerAttackDamageMultiplier() {
      return getTalentPlayerAttackDamageMultiplier;
    },
    get queuePlayerAttackSequence() {
      return queuePlayerAttackSequence;
    },
    get getZone() {
      return getZone;
    },
    get talismanCombat() {
      return talismanCombat;
    },
    get getEnemyConditionDebuffFactor() {
      return getEnemyConditionDebuffFactor;
    },
    get addBattleFx() {
      return addBattleFx;
    },
    get getEffectiveEnemyMitigation() {
      return getEffectiveEnemyMitigation;
    },
    get mutationHitScale() {
      return mutationHitScale;
    },
    get maybeUnlockChaosRealmFromWoodsman() {
      return maybeUnlockChaosRealmFromWoodsman;
    },
    get notePlayerHitSummary() {
      return notePlayerHitSummary;
    },
    get getElementColor() {
      return getElementColor;
    },
    get applyEnemyAilmentFromHit() {
      return applyEnemyAilmentFromHit;
    },
    get transferPassiveChaosErosionToTarget() {
      return transferPassiveChaosErosionToTarget;
    },
    get getHitEnemyResistance() {
      return getHitEnemyResistance;
    },
    get ascendancyNodeRules() {
      return ascendancyNodeRules;
    },
    get getPassiveChaosConversionShare() {
      return getPassiveChaosConversionShare;
    },
    get getPreciseTalentRatio() {
      return typeof getPreciseTalentRatio === "undefined" ? void 0 : getPreciseTalentRatio;
    },
    get getTalentCritDamageMultiplier() {
      return typeof getTalentCritDamageMultiplier === "undefined" ? void 0 : getTalentCritDamageMultiplier;
    },
    get getGemCritHitPerkMul() {
      return getGemCritHitPerkMul;
    },
    get applyAilingTargetDamage() {
      return applyAilingTargetDamage;
    },
    get getTalentPrecisePlayerHitMultiplier() {
      return typeof getTalentPrecisePlayerHitMultiplier === "undefined" ? void 0 : getTalentPrecisePlayerHitMultiplier;
    },
    get getTalentButcherBossMultiplier() {
      return typeof getTalentButcherBossMultiplier === "undefined" ? void 0 : getTalentButcherBossMultiplier;
    },
    get getPassiveKeystoneHitMultiplier() {
      return getPassiveKeystoneHitMultiplier;
    },
    get getSkillRepeatDamageMultiplier() {
      return getSkillRepeatDamageMultiplier;
    },
    get getSkillConditionalDamageMultiplier() {
      return getSkillConditionalDamageMultiplier;
    },
    get getEnemyTotalEvadeChance() {
      return getEnemyTotalEvadeChance;
    },
    get getTalentAlwaysHit() {
      return typeof getTalentAlwaysHit === "undefined" ? void 0 : getTalentAlwaysHit;
    },
    get resolveEntropyEvasion() {
      return resolveEntropyEvasion;
    },
    get _t() {
      return _t;
    },
    get addEvasionCombatLog() {
      return addEvasionCombatLog;
    },
    get getPassiveWisdomLeapDamageMultiplier() {
      return getPassiveWisdomLeapDamageMultiplier;
    },
    get loopMutation() {
      return loopMutation;
    },
    get getActiveEnemyShockTakenDamageIncreasePct() {
      return getActiveEnemyShockTakenDamageIncreasePct;
    },
    get getShockedEnemyHitDamageIncreaseMultiplier() {
      return getShockedEnemyHitDamageIncreaseMultiplier;
    },
    get getKeystoneEnemyTakenMultiplier() {
      return getKeystoneEnemyTakenMultiplier;
    },
    get getAbyssMonsterScales() {
      return getAbyssMonsterScales;
    },
    get getGridDirectHitDistanceMultiplier() {
      return getGridDirectHitDistanceMultiplier;
    },
    get handleEnemyDeath() {
      return handleEnemyDeath;
    },
    get getEnemyLifeAndShield() {
      return getEnemyLifeAndShield;
    },
    get getTalentDotOccupancyDamage() {
      return typeof getTalentDotOccupancyDamage === "undefined" ? void 0 : getTalentDotOccupancyDamage;
    },
    get getRangerWeakpointBonus() {
      return getRangerWeakpointBonus;
    },
    get getCombatTalentCardLevel() {
      return getCombatTalentCardLevel;
    },
    get updateTalentButcherHitMark() {
      return updateTalentButcherHitMark;
    },
    get canApplyTalentExecuteThreshold() {
      return canApplyTalentExecuteThreshold;
    },
    get addPlayerHitVisualFx() {
      return addPlayerHitVisualFx;
    },
    get applySkillDotFromHit() {
      return applySkillDotFromHit;
    },
    get getAilmentTypeFromElement() {
      return getAilmentTypeFromElement;
    },
    get getSkillAilmentStats() {
      return getSkillAilmentStats;
    },
    get regionAffixEffects() {
      return regionAffixEffects;
    },
    get spreadSkillAilmentOnHit() {
      return spreadSkillAilmentOnHit;
    },
    get applySkillPeriodicOnHit() {
      return applySkillPeriodicOnHit;
    },
    get applySkillGridControlOnHit() {
      return applySkillGridControlOnHit;
    },
    get applySupportEchoOnHit() {
      return applySupportEchoOnHit;
    },
    get applySupportChaosErosionOnHit() {
      return applySupportChaosErosionOnHit;
    },
    get applyCosmosJudgmentOnHit() {
      return applyCosmosJudgmentOnHit;
    },
    get applyPlayerHitLeech() {
      return applyPlayerHitLeech;
    },
    get getPlayerEnergyShieldRecoveryCap() {
      return getPlayerEnergyShieldRecoveryCap;
    },
    get advanceEnergyShieldRechargeOnCrit() {
      return advanceEnergyShieldRechargeOnCrit;
    },
    get getPlayerHitCombatLog() {
      return getPlayerHitCombatLog;
    },
    get supports() {
      return window.GameModules.combat.supports;
    },
    random: () => Math.random()
  });
  var deps = {
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get getGridUnitCenter() {
      return getGridUnitCenter;
    },
    get getElementColor() {
      return getElementColor;
    },
    get copyCombatGridCell() {
      return copyCombatGridCell;
    },
    get skillGemCasts() {
      return skillGemCasts;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get noteCombatTacticAttack() {
      return noteCombatTacticAttack;
    },
    get hasPlayerChannelBreakingAilment() {
      return hasPlayerChannelBreakingAilment;
    },
    get rollProjectileExtraShots() {
      return rollProjectileExtraShots;
    },
    get cancelCombatChannel() {
      return cancelCombatChannel;
    },
    get getSplashDormantEnemies() {
      return getSplashDormantEnemies;
    },
    get supports() {
      return window.GameModules.combat.supports;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get canPushEnemy() {
      return canPushEnemy;
    },
    get gridStepToward() {
      return gridStepToward;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get getEffectiveEnemyMitigation() {
      return getEffectiveEnemyMitigation;
    },
    get getZone() {
      return getZone;
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get loopMutation() {
      return loopMutation;
    },
    get handleEnemyDeath() {
      return handleEnemyDeath;
    },
    get PROJECTILE_BONUS_SHOT_DAMAGE_PCT() {
      return PROJECTILE_BONUS_SHOT_DAMAGE_PCT;
    },
    get applyEnemyAilmentFromHit() {
      return applyEnemyAilmentFromHit;
    },
    get cosmosRouteRuntime() {
      return cosmosRouteRuntime;
    },
    get resetHiddenJournalBossRun() {
      return resetHiddenJournalBossRun;
    },
    get getEncounterTelemetryContext() {
      return getEncounterTelemetryContext;
    },
    get CAMPAIGN_RESIST_PENALTY() {
      return CAMPAIGN_RESIST_PENALTY;
    },
    get performTalentMoonReturn() {
      return performTalentMoonReturn;
    }
  };
  var env = {
    get owner() {
      return game;
    },
    deps,
    resolver,
    get nativeCasts() {
      return window.GameModules.state.combat.skillGemCombatRuntime;
    },
    set nativeCasts(value) {
      window.GameModules.state.combat.skillGemCombatRuntime = value;
    }
  };
  var presentation = {
    get addBattleFx() {
      return addBattleFx;
    },
    get addLog() {
      return addLog;
    },
    get dispatchRuntimeEvent() {
      return dispatchRuntimeEvent;
    }
  };
  function runPlayerCastEffects(commands) {
    for (const command of commands) {
      presentation[command.kind](...command.args);
    }
  }
  var playerCastRuntime = {
    scaleKeystoneAttackSpeed(aspd, flags) {
      return castScaleKeystoneAttackSpeed(aspd, flags);
    },
    addThousandBottlesStats(bucket) {
      return castAddThousandBottlesStats(bucket);
    },
    getPassiveKeystoneHitMultiplier(pStats, target, hitIndex, targetIndex, skillName) {
      return castGetPassiveKeystoneHitMultiplier(env, pStats, target, { hitIndex, targetIndex, skillName });
    },
    addPlayerHitVisualFx(pStats, options, targetEnemy, hit) {
      return runPlayerCastEffects(castAddPlayerHitVisualFx(env, pStats, options, targetEnemy, hit));
    },
    startSkillGemCombat(stats, options) {
      return runPlayerCastEffects(castStartSkillGemCombat(env, stats, options));
    },
    noteNativeGemSwing(name, stats) {
      return runPlayerCastEffects(castNoteNativeGemSwing(env, name, stats));
    },
    shouldDeferNativeGemCast(stats, options) {
      return castShouldDeferNativeGemCast(env, stats, options);
    },
    getAttackProjectileShots(stats) {
      return castGetAttackProjectileShots(env, stats);
    },
    updateSkillGemCombat(stats) {
      return runPlayerCastEffects(castUpdateSkillGemCombat(env, stats));
    },
    advanceSkillGemCasts(stats) {
      return runPlayerCastEffects(castAdvanceSkillGemCasts(env, stats));
    },
    skillGemRuntimeChanged(name) {
      return castSkillGemRuntimeChanged(env, name);
    },
    petrifyEnemy(enemy, at, seconds) {
      return castPetrifyEnemy(enemy, at, seconds);
    },
    enemyTimeSlowed(enemy) {
      return castEnemyTimeSlowed(env, enemy);
    },
    pullEnemyToward(enemy, command) {
      return castPullEnemyToward(env, enemy, command);
    },
    getDefeatRecoveryZoneId() {
      return castGetDefeatRecoveryZoneId(env);
    },
    recordPlayerDefeatStart(zone, options) {
      return runPlayerCastEffects(castRecordPlayerDefeatStart(env, zone, options));
    },
    retreatAfterActDefeat(zone) {
      return castRetreatAfterActDefeat(env, zone);
    },
    getCampaignResistPenalty(maxZoneId) {
      return castGetCampaignResistPenalty(env, maxZoneId);
    },
    performPlayerAttack(pStats, attackOptions) {
      return runPlayerCastEffects(castPerformPlayerAttack(env, pStats, attackOptions));
    }
  };
  safeExposeGlobals({
    scaleKeystoneAttackSpeed: playerCastRuntime.scaleKeystoneAttackSpeed,
    addThousandBottlesStats: playerCastRuntime.addThousandBottlesStats,
    getPassiveKeystoneHitMultiplier: playerCastRuntime.getPassiveKeystoneHitMultiplier,
    addPlayerHitVisualFx: playerCastRuntime.addPlayerHitVisualFx,
    startSkillGemCombat: playerCastRuntime.startSkillGemCombat,
    noteNativeGemSwing: playerCastRuntime.noteNativeGemSwing,
    shouldDeferNativeGemCast: playerCastRuntime.shouldDeferNativeGemCast,
    getAttackProjectileShots: playerCastRuntime.getAttackProjectileShots,
    updateSkillGemCombat: playerCastRuntime.updateSkillGemCombat,
    advanceSkillGemCasts: playerCastRuntime.advanceSkillGemCasts,
    skillGemRuntimeChanged: playerCastRuntime.skillGemRuntimeChanged,
    petrifyEnemy: playerCastRuntime.petrifyEnemy,
    enemyTimeSlowed: playerCastRuntime.enemyTimeSlowed,
    pullEnemyToward: playerCastRuntime.pullEnemyToward,
    getDefeatRecoveryZoneId: playerCastRuntime.getDefeatRecoveryZoneId,
    recordPlayerDefeatStart: playerCastRuntime.recordPlayerDefeatStart,
    retreatAfterActDefeat: playerCastRuntime.retreatAfterActDefeat,
    getCampaignResistPenalty: playerCastRuntime.getCampaignResistPenalty,
    performPlayerAttack: playerCastRuntime.performPlayerAttack,
    isEnemyPetrified: castIsEnemyPetrified,
    TIME_SLOW_MOVE
  });
})();
