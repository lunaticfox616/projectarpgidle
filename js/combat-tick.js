// GENERATED from modules/combat-tick*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/grid-units.mjs
  function cellGridCellKey(gx, gy) {
    return gx + "," + gy;
  }
  function cellGridChebyshevDist(ax, ay, bx, by) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
  }

  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // modules/combat/skill-delivery-rules.mjs
  function tickCopyCombatGridCell(env2, unit) {
    return env2.deps.hasGridCell(unit) ? { gx: unit.gx, gy: unit.gy } : null;
  }
  function tickGetSkillCombatDelivery(skill) {
    let tags = skill && Array.isArray(skill.tags) ? skill.tags : [];
    if (skill && skill.combatPattern && skill.combatPattern.kind === "channel") return "magicCell";
    if (tags.includes("projectile") || tickPiercesWithDelivery(skill)) {
      return tickPiercesWithDelivery(skill) ? "projectileCell" : "projectileTarget";
    }
    return tickAreaCombatDelivery(tags);
  }
  function tickPiercesWithDelivery(skill) {
    return skill && skill.targetMode === "pierce";
  }
  function tickAreaCombatDelivery(tags) {
    if (tags.includes("spell") || tags.includes("aoe") && !tags.includes("melee")) return "magicCell";
    return "instantTarget";
  }
  function tickGetCombatTravelMs(env2, sourceCell, targetCell, skill) {
    let distance = sourceCell && targetCell ? cellGridChebyshevDist(sourceCell.gx, sourceCell.gy, targetCell.gx, targetCell.gy) : 0;
    let baseTravelMs = env2.deps.COMBAT_PROJECTILE_MIN_TRAVEL_MS + distance * env2.deps.COMBAT_PROJECTILE_MS_PER_CELL;
    return Math.max(36, Math.round(baseTravelMs * tickGetCombatTravelMultiplier(skill)));
  }
  function tickGetCombatTravelMultiplier(skill) {
    return clampNumber(Number(skill && skill.projectileTravelTimeMultiplier) || 1, 0.15, 2);
  }
  function tickGetCombatTravelCellMs(env2, skill) {
    return env2.deps.COMBAT_PROJECTILE_MS_PER_CELL * tickGetCombatTravelMultiplier(skill);
  }
  function tickGetPendingSkillTravelCellMs(env2, row) {
    return row.delivery?.startsWith("projectile") ? tickGetCombatTravelCellMs(env2, row.pStats && row.pStats.sSkill) : 0;
  }
  function tickGetAttackMotionMs(tags) {
    if (tags.includes("slam") && !tags.includes("mobility")) return 460;
    return tags.includes("projectile") ? 400 : 360;
  }
  function tickGetStageIndexInShot(stage, offset) {
    return stage.shotStage === void 0 ? offset : stage.shotStage;
  }

  // modules/combat/skill-contact-targets.mjs
  function tickGetPendingSkillCollisionCells(env2, row) {
    if (!row || !row.sourceCell || !row.targetCells || row.targetCells.length <= 0) return row && row.targetCells || [];
    if (row.delivery !== "projectileCell" && row.delivery !== "magicMoving") return row.targetCells;
    let target = row.targetCells[0];
    let maxLen = Math.max(1, cellGridChebyshevDist(row.sourceCell.gx, row.sourceCell.gy, target.gx, target.gy));
    let path = env2.deps.gridLineCells(row.sourceCell.gx, row.sourceCell.gy, target.gx, target.gy, maxLen);
    return path.length > 0 ? path.map((cell) => ({ ...cell, mult: target.mult })) : row.targetCells;
  }
  function tickPickWhirlSpinTargets(env2, row) {
    let struck = row.whirl.struck;
    let fresh = (env2.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0 && !struck.includes(enemy.id));
    let pick = env2.deps.selectGridSkillTargets(row.options.skillName, row.pStats.sSkill, env2.owner.gridPlayer, fresh)[0];
    if (!pick) return [];
    struck.push(pick.enemy.id);
    row.options.sourceCell = tickCopyCombatGridCell(env2, env2.owner.gridPlayer);
    return [{ enemy: pick.enemy, mult: env2.deps.getGridSkillTargetMult("whirl", struck.length - 1) }];
  }
  function tickPickWaveFrontTargets(env2, row) {
    const wave = row.wave, now = env2.deps.getCombatTime(), start = row.at - (Number(row.options.stageDelayMs) || 0);
    const span = { start, from: Math.min(now, Math.max(start, wave.checkedAt ?? start)), now };
    wave.checkedAt = now;
    const inside = (enemy) => !wave.cells || env2.deps.getGridUnitCells(enemy).some((cell) => wave.cells.has(cellGridCellKey(cell.gx, cell.gy)));
    const reached = (env2.owner.enemies || []).filter((enemy) => enemy && enemy.hp > 0 && !wave.struck.includes(enemy.id) && inside(enemy)).map((enemy) => ({ enemy, touchedAt: tickWaveTouchTime(env2, wave, enemy, span) })).filter((entry) => entry.touchedAt !== null).sort((a, b) => a.touchedAt - b.touchedAt).slice(0, Math.max(0, wave.limit - wave.struck.length));
    reached.forEach((entry) => wave.struck.push(entry.enemy.id));
    return reached.map((entry) => ({ enemy: entry.enemy, mult: wave.mults[entry.enemy.id] ?? 1 }));
  }
  function tickWaveTouchTime(env2, wave, enemy, span) {
    const step = Math.max(1, env2.deps.COMBAT_GRID_CONFIG.waveContactSampleMs);
    for (let t = span.from; ; t = Math.min(span.now, t + step)) {
      const ring = Math.min(wave.reach, Math.max(0, t - span.start) / wave.msPerCell);
      if (env2.deps.getGridWaveDrawnDistance(wave, enemy, t) <= ring) return t;
      if (t >= span.now) return null;
    }
  }
  function tickGetPendingSkillImpactTargets(env2, row) {
    if (!row || row.delivery === "instantTarget" || row.delivery === "projectileTarget") {
      return (row && row.targetEntries || []).map((entry) => {
        let enemy = (env2.owner.enemies || []).find((candidate) => candidate && candidate.id === entry.enemyId && candidate.hp > 0);
        return enemy ? { enemy, mult: entry.mult } : null;
      }).filter(Boolean);
    }
    let used = /* @__PURE__ */ new Set();
    let maxTargets = Math.max(1, row.options?.targetLimit || (row.targetEntries || []).length);
    let cells = tickGetPendingSkillCollisionCells(env2, row);
    function keptCastTargets() {
      if (!row.pStats?.sSkill?.combatPattern?.keepCastTargets) return [];
      const kept = [];
      for (let entry of row.targetEntries) {
        let enemy = (env2.owner.enemies || []).find((candidate) => candidate && candidate.id === entry.enemyId && candidate.hp > 0);
        let cell = enemy && !used.has(enemy.id) && cells.find((c) => env2.deps.getGridUnitCells(enemy).some((o) => o.gx === c.gx && o.gy === c.gy));
        if (!cell) continue;
        used.add(enemy.id);
        kept.push({ enemy, mult: cell.mult });
      }
      return kept;
    }
    return keptCastTargets().concat(cells.map((cell) => {
      let enemy = (env2.owner.enemies || []).find((candidate) => candidate && candidate.hp > 0 && env2.deps.getGridUnitCells(candidate).some((occupied) => occupied.gx === cell.gx && occupied.gy === cell.gy) && !used.has(candidate.id));
      if (!enemy) return null;
      used.add(enemy.id);
      return { enemy, mult: cell.mult };
    }).filter(Boolean)).slice(0, maxTargets);
  }

  // modules/combat/skill-stage-resolution.mjs
  function tickAdvanceHeroForStage(env2, row) {
    if (!row.advanceHero) return;
    const aim = row.aimCell || row.targetCells && row.targetCells[0];
    if (!aim || !env2.deps.hasGridCell(env2.owner.gridPlayer) || env2.deps.getGridUnitDistance(env2.owner.gridPlayer, aim) <= 1) return;
    if (env2.deps.actExplorationState.current(env2.owner)) env2.deps.beginExplorationGridStep(aim, env2.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec);
    else env2.deps.gridStepToward(env2.owner.gridPlayer, aim.gx, aim.gy, env2.deps.getGridBlockedCells(env2.owner.gridPlayer));
  }
  function tickProcessPendingSkillStageHits(env2) {
    if (env2.runtime.pendingSkillStageHits.length <= 0) return;
    let now = env2.deps.getCombatTime();
    let ready = [];
    let next = [];
    env2.runtime.pendingSkillStageHits.forEach((row) => {
      if (!row || row.at > now) next.push(row);
      else ready.push(row);
    });
    env2.runtime.pendingSkillStageHits = next;
    ready.sort((a, b) => a.at - b.at).forEach((row) => {
      if (row && row.contactState) row.contactState.resolved = true;
      if (!row || row.zoneId !== env2.owner.currentZoneId || !row.pStats) return;
      let targets = row.whirl ? tickPickWhirlSpinTargets(env2, row) : row.wave ? tickPickWaveFrontTargets(env2, row) : tickGetPendingSkillImpactTargets(env2, row);
      env2.deps.actExplorationProgress.objects.stage(row);
      tickAdvanceHeroForStage(env2, row);
      env2.deps.supports.repeatReleased(row);
      if (targets.length <= 0) return;
      env2.deps.performPlayerAttack(row.pStats, {
        ...row.options || {},
        targetEntries: targets.map((entry) => ({ enemyId: entry.enemy.id, mult: entry.mult }))
      });
    });
  }

  // modules/combat/tick-values.mjs
  var CONDITION_ELEMENT_BONUS = Object.freeze([["fireBonus", "fire"], ["coldBonus", "cold"], ["chaosBonus", "chaos"], ["physBonus", "phys"]]);
  var CONDITION_FLAG_KEYS = Object.freeze(["poisonToHeal", "disableEnemyLeech"]);
  var CONDITION_IMMUNITIES = Object.freeze(["immuneIgnite", "immuneChill", "immuneFreeze", "immuneShock", "immuneBleed"]);
  var CONDITION_CLEANSES = Object.freeze({ cleanseIgnite: "ignite", cleanseChill: "chill", cleanseFreeze: "freeze", cleanseShock: "shock", cleanseBleed: "bleed" });
  var CHAIN_HOP_MS = 120;
  var PROJECTILE_RELEASE_SHARE = 0.55;
  var TALENT_CARD_MAX_LEVEL_REF = 10;

  // modules/combat/tick-delayed-damage.mjs
  function* tickProcessPendingSlamEchoHits(env2) {
    let now = env2.deps.getCombatTime();
    let list = Array.isArray(env2.owner.pendingSlamEchoHits) ? env2.owner.pendingSlamEchoHits : [];
    let next = [];
    for (let i = 0, length = list.length; i < length; i++) {
      if (!(i in list)) continue;
      yield* tickProcessSlamEchoRow(env2, list[i], now, next);
    }
    env2.owner.pendingSlamEchoHits = next;
  }
  function* tickProcessSlamEchoRow(env2, row, now, next) {
    if (!row || !row.enemyId || !row.at) return;
    if (row.at > now) {
      next.push(row);
      return;
    }
    let enemy = (env2.owner.enemies || []).find((e) => e && e.id === row.enemyId && e.hp > 0);
    if (!enemy) return;
    yield* tickApplySlamEchoHit(env2, row, enemy);
  }
  function* tickApplySlamEchoHit(env2, row, enemy) {
    let bonus = Math.max(1, Math.floor(row.damage || 0));
    env2.deps.applyDamageToEnemyResource(enemy, bonus);
    yield { kind: "addBattleFx", args: ["hit", { enemyId: enemy.id, color: env2.deps.getElementColor(row.element || "phys"), damage: bonus, duration: 220, syncToSwing: false }] };
    if (env2.owner.settings && env2.owner.settings.showCombatLog !== false) yield { kind: "addLog", args: [env2.deps._t("🌋 여진으로 {name}에게 {bonus} 추가 피해", { name: env2.deps.i18n.enemyName(enemy.name), bonus: env2.deps.formatNumberKR(bonus) }), "attack-player", { noToast: true }] };
    if (enemy.hp <= 0) env2.deps.handleEnemyDeath(enemy, env2.deps.getPlayerStats());
  }
  function* tickProcessTalentInquisitorMarks(env2) {
    let store = env2.owner.talentInquisitorMarks;
    if (!store || typeof store !== "object") return;
    let now = env2.deps.getCombatTime();
    let lv = typeof env2.deps.isTalentCardActive === "function" ? env2.deps.isTalentCardActive("hero1__inquisitor") : 0;
    const timing = { now, lv };
    for (const id of Object.keys(store)) yield* tickProcessInquisitorMark(env2, store, id, timing);
  }
  function* tickProcessInquisitorMark(env2, store, id, timing) {
    let mk = store[id];
    if (!mk) {
      delete store[id];
      return;
    }
    let enemy = env2.deps.getAliveEnemyByRuntimeKey(id);
    if (!enemy) {
      delete store[id];
      return;
    }
    if (mk.explodeAt && timing.now >= mk.explodeAt) yield* tickExplodeInquisitorMark(env2, mk, enemy, timing);
  }
  function* tickExplodeInquisitorMark(env2, mk, enemy, { now, lv }) {
    let dmg = Math.max(1, Math.floor((mk.accumulated || 0) * 0.12 * Math.max(1, lv) / TALENT_CARD_MAX_LEVEL_REF));
    env2.deps.applyDamageToEnemyResource(enemy, dmg);
    yield { kind: "addBattleFx", args: ["hit", { enemyId: enemy.id, color: env2.deps.getElementColor("phys"), damage: dmg, duration: 240, syncToSwing: false }] };
    if (env2.owner.settings && env2.owner.settings.showCombatLog !== false) yield { kind: "addLog", args: [env2.deps._t("⚖️ 심판 표식 폭발로 {name}에게 {dmg} 피해", { name: env2.deps.i18n.enemyName(enemy.name), dmg: env2.deps.formatNumberKR(dmg) }), "attack-player", { noToast: true }] };
    mk.accumulated = 0;
    mk.explodeAt = 0;
    mk.cooldownUntil = now + 6e3;
    if (enemy.hp <= 0) env2.deps.handleEnemyDeath(enemy, env2.deps.getPlayerStats());
  }

  // modules/combat/tick-conditions.mjs
  function* tickApplyTickConditions(env2, pStats) {
    if (pStats.uniqueClosedEyes) {
      env2.owner.enemyConditionDebuffs = {};
    } else {
      env2.deps.expireConditionEffects(env2.deps.getCombatTime());
      env2.deps.runReturnRules(pStats);
      env2.deps.talismanCombat.applyHexes(pStats, env2.deps.getCombatTime());
    }
    env2.deps.advanceSkillGemCasts(pStats);
    env2.deps.updateCombatChannelRuntime(env2.deps.getCombatTime());
    tickProcessPendingSkillStageHits(env2);
    yield* tickProcessPendingSlamEchoHits(env2);
    env2.deps.ascendancyNodeRules.tick(pStats, env2.deps.getCombatTime());
    yield* tickProcessTalentInquisitorMarks(env2);
    const activeConditionEffects = env2.deps.talismanCombat.effects(pStats);
    env2.deps.applyConditionPhysicalReductionEffects(pStats, activeConditionEffects);
    activeConditionEffects.forEach(({ delta }) => tickApplyConditionDelta(env2, pStats, delta));
    env2.deps.applyCosmosPlayerDebuffsToStats(pStats);
    env2.deps.tickAilments(pStats, 0.1);
    tickApplyPlayerAilmentsToTick(env2, pStats);
  }
  function tickApplyPlayerAilmentsToTick(env2, pStats) {
    const ailmentMap = {};
    let activePlayerShock = null;
    (env2.owner.playerAilments || []).forEach((ail) => {
      ailmentMap[ail.type] = Math.max(ailmentMap[ail.type] || 0, ail.time || 0);
      if (tickIsStrongerShock(ail, activePlayerShock)) activePlayerShock = ail;
    });
    if (ailmentMap.chill) pStats.aspd *= 1 - 0.32 * (1 - clampNumber(pStats.chillEffectReducePct || 0, 0, 100) / 100);
    pStats.playerShockTakenDamageIncreasePct = activePlayerShock ? env2.deps.getPlayerShockTakenDamageIncreasePct(pStats, activePlayerShock.power) : 0;
  }
  function tickApplyConditionDelta(env2, pStats, delta) {
    tickApplyConditionOffence(pStats, delta);
    tickApplyConditionDefence(pStats, delta);
    tickApplyConditionElement(pStats, delta);
    tickApplyConditionFlags(pStats, delta);
    tickApplyConditionCleanse(env2, pStats, delta);
  }
  function tickApplyConditionOffence(pStats, delta) {
    if (delta.pctDmg) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta.pctDmg / 100));
    if (delta.aspd) pStats.aspd *= 1 + delta.aspd / 100;
    for (const key of ["regen", "crit", "critDmg", "resPen"]) if (delta[key]) pStats[key] += delta[key];
    if (delta.targetAny) pStats.sSkill.targets = Math.min(12, (pStats.sSkill.targets || 1) + delta.targetAny);
    for (const key of ["leech", "move"]) if (delta[key]) pStats[key] += delta[key];
  }
  function tickApplyConditionDefence(pStats, delta) {
    for (const key of ["resAll", "maxResAll"]) {
      if (!delta[key]) continue;
      pStats.resF += delta[key];
      pStats.resC += delta[key];
      pStats.resL += delta[key];
    }
    if (delta.resChaos) pStats.resChaos += delta.resChaos;
    if (delta.energyShieldRegen) pStats.energyShieldRegenRate = Math.max(0, (pStats.energyShieldRegenRate || 0) + delta.energyShieldRegen);
  }
  function tickApplyConditionElement(pStats, delta) {
    for (const [key, ele] of CONDITION_ELEMENT_BONUS) if (delta[key] && pStats.sSkill.ele === ele) pStats.baseDmg = Math.floor(pStats.baseDmg * (1 + delta[key]));
    if (delta.energyShieldRechargeDelayDelta) pStats.energyShieldRechargeDelay = Math.max(0, (pStats.energyShieldRechargeDelay || 3) + delta.energyShieldRechargeDelayDelta);
  }
  function tickApplyConditionFlags(pStats, delta) {
    for (const key of CONDITION_FLAG_KEYS) if (delta[key]) pStats[key] = true;
    if (delta.delayedRegenFromTakenDamage) pStats.delayedRegenFromTakenDamage = Math.max(pStats.delayedRegenFromTakenDamage || 0, delta.delayedRegenFromTakenDamage);
    for (const key of CONDITION_IMMUNITIES) if (delta[key]) pStats[key] = true;
  }
  function tickApplyConditionCleanse(env2, pStats, delta) {
    const types = Object.entries(CONDITION_CLEANSES).filter(([key]) => delta[key]).map(([, type]) => type);
    if (!types.length) return;
    env2.owner.playerAilments = (env2.owner.playerAilments || []).filter((ail) => {
      if (!ail) return false;
      if (!types.includes(ail.type)) return true;
      if (typeof env2.deps.recordPassiveCycleAilmentEnd === "function") env2.deps.recordPassiveCycleAilmentEnd(ail.type, pStats.cycle, env2.deps.getCombatTime());
      return false;
    });
  }
  function tickIsStrongerShock(ail, current) {
    return Boolean(ail && ail.type === "shock" && (ail.time || 0) > 0 && (!current || (ail.power || 0) > (current.power || 0)));
  }

  // modules/combat/tick-travel.mjs
  function tickStopTickBeforeCombat(env2, pStats) {
    tickSanitizeRunTimers(env2);
    if ((Number(env2.owner.playerHp) || 0) <= 0) {
      env2.deps.handlePlayerDefeat(env2.deps.getZone(env2.owner.currentZoneId) || env2.deps.getZone(0), pStats, "☠️ 치명상을 입어 쓰러졌습니다.", { fatalElement: "other", sourceName: "치명상" });
      return true;
    }
    if (env2.owner.woodsmanEntrancePending && env2.owner.moveTimer <= 0) {
      env2.deps.finishWoodsmanEntrance();
      return true;
    }
    return tickStopHaltedTick(env2);
  }
  function tickSanitizeRunTimers(env2) {
    if (!Number.isFinite(env2.owner.runProgress) || env2.owner.runProgress < 0) env2.owner.runProgress = 0;
    if (!Number.isFinite(env2.owner.moveTimer)) env2.owner.moveTimer = 0;
  }
  function tickStopHaltedTick(env2) {
    if (!env2.owner.combatHalted) return false;
    if (env2.owner.moveTimer > 0) {
      tickFinishHaltedTravel(env2);
      return true;
    }
    return !tickResumeHaltedCombat(env2);
  }
  function tickFinishHaltedTravel(env2) {
    env2.owner.moveTimer -= 0.1;
    if (env2.owner.moveTimer > 0) return;
    env2.deps.markPlayerMovementCompleted();
    if (!env2.deps.finishWoodsmanEntrance()) env2.deps.startEncounterRun();
  }
  function tickResumeHaltedCombat(env2) {
    const beehive = env2.owner.beehive || {};
    const beehiveLocked = typeof env2.deps.isBeehiveRunLockedForMapTravel === "function" ? env2.deps.isBeehiveRunLockedForMapTravel() : !!beehive.inRun && env2.owner.currentZoneId === "beehive_run";
    const beehivePause = !!(beehiveLocked && env2.owner.currentZoneId === "beehive_run" && !beehive.awaitingClear);
    if (beehivePause || env2.owner.inTicketBossFight || tickIsCombatProgressStopped(env2)) return false;
    env2.owner.combatHalted = false;
    return true;
  }
  function tickIsCombatProgressStopped(env2, zone = env2.deps.getZone(env2.owner.currentZoneId)) {
    const settings = env2.owner.settings || {};
    return settings.mapCompleteAction === "stop" || settings.townReturnAction === "stop" || !!env2.owner.pendingLoopDecision || !!env2.owner.pendingLoopReady || env2.deps.isSkyTowerAtRewardLimit(zone);
  }
  function tickAdvanceTravelTick(env2) {
    if (env2.owner.moveTimer > 0) {
      env2.owner.moveTimer -= 0.1;
      if (env2.owner.moveTimer <= 0) tickFinishTravelMove(env2);
      return true;
    }
    if (!env2.owner.woodsmanEntrancePending) return false;
    env2.deps.finishWoodsmanEntrance();
    return true;
  }
  function tickFinishTravelMove(env2) {
    env2.deps.markPlayerMovementCompleted();
    if (env2.owner.isTownReturning) {
      env2.owner.isTownReturning = false;
      if (env2.deps.finishTownReturnAction()) return;
    }
    if (!env2.deps.finishWoodsmanEntrance()) env2.deps.startEncounterRun();
  }
  function tickPruneEnemyRuntimeOnSchedule(env2) {
    const now = env2.deps.getCombatTime();
    env2.owner._nextEnemyRuntimePruneAt = Number.isFinite(env2.owner._nextEnemyRuntimePruneAt) ? env2.owner._nextEnemyRuntimePruneAt : 0;
    if (now < env2.owner._nextEnemyRuntimePruneAt) return;
    env2.deps.pruneEnemyRuntimeDebuffMaps();
    env2.owner._nextEnemyRuntimePruneAt = now + 2e3;
  }
  function tickBeehiveHoldsTick(env2) {
    const locked = typeof env2.deps.isBeehiveRunLockedForMapTravel === "function" ? env2.deps.isBeehiveRunLockedForMapTravel() : !!(env2.owner.beehive && env2.owner.beehive.inRun);
    return locked && !(env2.owner.beehive && env2.owner.beehive.awaitingClear);
  }

  // modules/combat/tick-recovery.mjs
  function tickRecoverPlayerTick(env2, pStats) {
    const recoveryHpCap = env2.deps.getPlayerRecoveryHpCap(pStats);
    if (env2.owner.playerHp > 0 && env2.owner.playerHp < recoveryHpCap) {
      const bloomRegenMul = Math.max(0.05, 1 - Math.max(0, Math.min(0.95, env2.owner.bloomTrialRegenSuppress || 0)));
      env2.owner.playerHp = Math.min(recoveryHpCap, env2.owner.playerHp + pStats.maxHp * (pStats.regen / 100) * 0.1 * bloomRegenMul);
    }
    env2.deps.applyActRestRecovery(pStats, recoveryHpCap);
    if ((env2.owner.delayedGuardHealPool || 0) > 0) {
      const tickHeal = Math.max(0, env2.owner.delayedGuardHealPool / 4 * 0.1);
      env2.owner.playerHp = Math.min(recoveryHpCap, env2.owner.playerHp + tickHeal);
      env2.owner.delayedGuardHealPool = Math.max(0, env2.owner.delayedGuardHealPool - tickHeal);
    }
    env2.deps.tickPlayerLeech(pStats, 0.1);
    env2.deps.tickPlayerRecoup(pStats, 0.1);
    tickRechargeEnergyShieldTick(env2, pStats);
  }
  function tickRechargeEnergyShieldTick(env2, pStats) {
    const cap = env2.deps.getPlayerEnergyShieldRecoveryCap(pStats);
    tickSanitizeEnergyShieldTick(env2, pStats, cap);
    if ((pStats.energyShield || 0) > 0 && env2.owner.playerEnergyShield < cap) tickRefillEnergyShieldTick(env2, pStats, cap);
  }
  function tickSanitizeEnergyShieldTick(env2, pStats, cap) {
    if (!Number.isFinite(env2.owner.playerEnergyShield)) env2.owner.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    env2.owner.playerEnergyShield = Math.max(0, Math.min(env2.owner.playerEnergyShield, cap));
    if (!Number.isFinite(env2.owner.playerEsLastHitAt)) env2.owner.playerEsLastHitAt = 0;
  }
  function tickRefillEnergyShieldTick(env2, pStats, cap) {
    const add = (perSec) => {
      env2.owner.playerEnergyShield = Math.min(cap, env2.owner.playerEnergyShield + perSec * 0.1);
    };
    if (env2.deps.hasKeystone("cr5")) add((pStats.maxHp || 0) * ((pStats.regen || 0) / 100));
    if ((env2.owner.crusaderEsRegenUntil || 0) > env2.deps.getCombatTime()) add((pStats.energyShield || 0) * 0.25);
    if (tickEnergyShieldRechargesNow(env2, pStats)) add((pStats.energyShield || 0) * ((pStats.energyShieldRegenRate || 12.5) / 100));
  }
  function tickEnergyShieldRechargesNow(env2, pStats) {
    const sinceHit = (env2.deps.getCombatTime() - (env2.owner.playerEsLastHitAt || 0)) / 1e3;
    const noInterruptEsRegen = env2.deps.hasKeystone("e3") || tickUniqueShieldWindowOpen(env2, pStats);
    const allowRechargeWhileMoving = (env2.owner.moveTimer || 0) > 0 && (pStats.energyShieldRechargeDelay || 0) <= 0;
    return Boolean(noInterruptEsRegen || allowRechargeWhileMoving || sinceHit >= (pStats.energyShieldRechargeDelay || 3));
  }
  function tickUniqueShieldWindowOpen(env2, pStats) {
    return Boolean(pStats.uniqueEnergyShieldBreakRecharge && (env2.owner.uniqueEnergyShieldBreakRechargeUntil || 0) > env2.deps.getCombatTime());
  }

  // modules/combat/tick-hazards.mjs
  function tickTickZoneHazards(env2, zone, pStats) {
    if (zone?.type === "colony" && env2.owner.colony.inRun) env2.deps.tickColonyRun(pStats);
    if (!zone || zone.type !== "underworld" || env2.owner.playerHp <= 0) return;
    const floor = Math.max(1, Math.floor(zone.floor || 1));
    if (floor < 15) return;
    let tickDmg = env2.deps.getUnderworldLifeDrainPerTick(pStats.maxHp, floor, env2.deps.getSkyStoneReductionPct());
    tickDmg = env2.deps.floorIncomingDamage(tickDmg);
    tickDmg = env2.deps.absorbDamageWithTalentStoneShield(tickDmg);
    env2.owner.playerHp = Math.max(0, Math.floor(env2.owner.playerHp - tickDmg));
  }
  function tickTrackProgressStall(env2, progressBefore) {
    if (!env2.deps.actExplorationProgress.shouldTrackStall()) {
      env2.runtime.progressStallTicks = 0;
      return;
    }
    if (env2.owner.runProgress <= progressBefore + 1e-4) env2.runtime.progressStallTicks++;
    else env2.runtime.progressStallTicks = 0;
    if (env2.runtime.progressStallTicks < 20) return;
    env2.deps.ensureEncounterRun();
    env2.owner.runProgress = Math.min(99.9, progressBefore + 0.4);
    env2.runtime.progressStallTicks = 0;
  }

  // modules/combat/tick-fight.mjs
  function tickRunFightTick(env2, pStats, hazardEvasion, walkedMs) {
    env2.deps.tickEnemyDotEffects(pStats, 0.1);
    env2.deps.tickEnemyAilments(pStats, 0.1);
    const nowCast = env2.deps.getCombatTime();
    const channelGate = env2.deps.getCombatChannelGate(pStats, nowCast);
    const castBlocked = nowCast < tickGetAttackDelayUntil(env2, nowCast) || hazardEvasion.avoiding;
    const inSkillRange = tickResolveSkillRange(env2, pStats, channelGate, hazardEvasion);
    if (!castBlocked) {
      env2.runtime.pTimer += 0.1 * pStats.aspd * env2.deps.getWalkingChargeScale(pStats, walkedMs);
      if (!inSkillRange) env2.runtime.pTimer = Math.min(env2.runtime.pTimer, 1);
    }
    while (!castBlocked && inSkillRange && env2.runtime.pTimer >= 1 && env2.owner.enemies.length > 0) {
      env2.runtime.pTimer -= 1;
      env2.deps.performPlayerAttack(pStats);
      env2.deps.combatTacticsRuntime.recoverUntil = Math.max(env2.deps.combatTacticsRuntime.recoverUntil || 0, nowCast + env2.deps.getPlayerAttackRecoveryMs(pStats.aspd));
      tickPerformDoubleStrikes(env2, pStats);
    }
    env2.deps.mobilitySkill.cast({ blocked: castBlocked, inRange: inSkillRange, auto: !env2.deps.actExplorationProgress.holdPosition(hazardEvasion.holdPosition || hazardEvasion.warning), stats: pStats });
    env2.deps.runSummonAttackTick(pStats);
    env2.deps.performMonsterAttacks(pStats);
  }
  function tickResolveSkillRange(env2, pStats, channelGate, hazardEvasion) {
    if (hazardEvasion.avoiding) return false;
    if (channelGate.locked) return channelGate.hasTargets;
    return env2.deps.updatePlayerGridEngagement(pStats, { holdPosition: env2.deps.actExplorationProgress.holdPosition(hazardEvasion.holdPosition), avoidCells: hazardEvasion.avoidCells });
  }
  function tickGetAttackDelayUntil(env2, nowCast) {
    const castUntil = Math.max(0, Number(env2.deps.combatTacticsRuntime.attackDelayUntil) || 0);
    return castUntil > nowCast + 5e3 ? nowCast + 500 : castUntil;
  }
  function tickPerformDoubleStrikes(env2, pStats) {
    const dsChance = Math.max(0, pStats.ds || 0);
    const guaranteedExtra = Math.floor(dsChance / 100);
    const extraRemainder = dsChance - guaranteedExtra * 100;
    const extraHits = guaranteedExtra + (env2.deps.random() * 100 < extraRemainder ? 1 : 0);
    for (let chain = 0; chain < extraHits && env2.owner.enemies.length > 0; chain++) {
      env2.deps.performPlayerAttack(pStats, env2.deps.hasKeystone("bd4") ? { repeatChannelCast: true, forcedCrit: true } : { repeatChannelCast: true });
      if (env2.deps.hasKeystone("g2")) tickStackKeystoneRhythm(env2, "gladiatorFlurry", 12, 3e3);
      if (env2.deps.hasKeystone("w2")) tickStackKeystoneRhythm(env2, "warriorRhythmDouble", 5, 2e3);
    }
  }
  function tickStackKeystoneRhythm(env2, prefix, cap, durationMs) {
    const now = env2.deps.getCombatTime(), countKey = prefix + "Stacks", untilKey = prefix + "ExpiresAt";
    const stacks = (env2.owner[untilKey] || 0) > now ? Math.max(0, Math.min(cap, Math.floor(env2.owner[countKey] || 0))) : 0;
    env2.owner[countKey] = Math.min(cap, stacks + 1);
    env2.owner[untilKey] = now + durationMs;
  }

  // modules/combat/tick-rift.mjs
  function* tickTickVoidRiftWave(env2, zone) {
    if ((env2.owner.season || 1) < 9 || !env2.deps.isVoidRiftCombatZone(zone)) return;
    const v = env2.owner.voidRift || (env2.owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    if (!v.active) return;
    tickSanitizeVoidRiftWave(env2, v);
    if (env2.deps.spawnVoidBreachReinforcement(zone, v) && env2.owner.settings.showSpawnLog !== false) {
      yield { kind: "say", args: [env2.deps._t("🕳️ 균열 출현 {spawnedCount}/{totalToSpawn}", { spawnedCount: v.spawnedCount, totalToSpawn: v.totalToSpawn }), "attack-monster", { noToast: true }] };
    }
    if (tickVoidRiftWaveCleared(env2, v)) yield* tickCloseVoidRiftWave(env2, v);
  }
  function tickSanitizeVoidRiftWave(env2, v) {
    v.pendingWave = v.pendingWave !== false;
    v.totalToSpawn = Math.max(3, Math.floor(v.totalToSpawn || 6 + Math.floor(env2.deps.random() * 4)));
    v.spawnedCount = Math.max(0, Math.floor(v.spawnedCount || 0));
    v.spawnTick = Math.max(0, Math.floor(v.spawnTick || 0));
  }
  function* tickCloseVoidRiftWave(env2, v) {
    v.active = false;
    v.pendingWave = false;
    v.breachClears = (v.breachClears || 0) + 1;
    let reward = 1 + (env2.deps.random() < 0.2 ? 1 : 0);
    reward = env2.deps.combatLootReceipts.capture(env2.owner, () => env2.deps.awardCurrency("voidChisel", reward, "drop"));
    let unlockedGrand = false;
    if (env2.deps.random() < env2.deps.GRAND_BREACH_ENCOUNTER.unlockChance) {
      v.grandBreachUnlock = true;
      unlockedGrand = true;
    }
    yield { kind: "say", args: [env2.deps._t("🕳️ 공허의 구멍 정리 완료!{reward}", { reward: reward ? ` ${env2.deps._t("공허의 끌")} +${reward}` : "" }), "loot-magic", { noToast: true }] };
    if (unlockedGrand) yield* tickAnnounceGrandBreachOpen(env2, v);
  }
  function* tickAnnounceGrandBreachOpen(env2, v) {
    const enteredGrand = yield { kind: "enterGrand", args: [] };
    if (!enteredGrand) yield { kind: "say", args: [env2.deps._t("🚨 대균열이 열렸습니다! [대균열 입장] 버튼을 확인하세요."), "loot-unique"] };
    if (!enteredGrand && !v.grandNoticeShown && env2.deps.canQueueTutorialNotice) {
      v.grandNoticeShown = true;
      yield { kind: "queueTutorialNotice", args: ["void_grand_breach_ready_once", env2.deps._t("대균열"), env2.deps._t("대균열이 열렸습니다.\n‘지도 → 탐험 → 공허 균열, 대균열’에서 ‘대균열 입장’을 누르세요."), "tab-map"] };
    }
  }
  function tickVoidRiftWaveCleared(env2, v) {
    return v.spawnedCount >= v.totalToSpawn && (v.defeatedCount || 0) >= v.totalToSpawn && (env2.owner.enemies || []).filter((e) => e.hp > 0 && e.fromVoidRift).length === 0;
  }

  // modules/combat/skill-travel-effects.mjs
  function tickGetSkillTravelVisualEndpoints(env2, row) {
    if (row.delivery !== "projectileTarget" || row.travelPath || row.patternKind === "boomerang") {
      return { sourceCell: row.sourceCell, targetCells: row.targetCells };
    }
    const enemies = env2.owner.enemies || [];
    const source = enemies.find((enemy) => enemy.id === row.options.chainFromEnemyId);
    const targetCells = row.targetCells.map((cell, index) => {
      const target = enemies.find((enemy) => enemy.id === row.targetEntries[index]?.enemyId);
      return env2.deps.hasGridCell(target) ? env2.deps.getGridUnitCenter(target) : cell;
    });
    return { sourceCell: env2.deps.hasGridCell(source) ? env2.deps.getGridUnitCenter(source) : row.sourceCell, targetCells };
  }
  function* tickAddChainHopTravelFx(env2, row, attackContext, now) {
    const kind = row.options.stageKind, from = row.options.chainFromEnemyId;
    if (!["supportChain", "chainJump"].includes(kind) || from == null || !tickGetSkillCombatDelivery(row.pStats.sSkill).startsWith("projectile")) return;
    const source = (env2.owner.enemies || []).find((enemy) => enemy && enemy.id === from);
    if (!source || !env2.deps.hasGridCell(source)) return;
    tickDelayChainHopAfterSource(env2, row, from);
    const flightMs = Math.max(1, Math.min(CHAIN_HOP_MS, row.at - now));
    yield { kind: "addBattleFx", args: ["combatTravel", {
      owner: "player",
      delivery: "projectileTarget",
      chainHop: true,
      stageKind: kind,
      stageIndex: row.options.stageIndex,
      sourceCell: tickCopyCombatGridCell(env2, source),
      targetCells: row.targetCells,
      targetIds: row.targetEntries.map((entry) => entry.enemyId),
      skillName: attackContext.skillName,
      damageTextGroupId: row.options.damageTextGroupId,
      element: row.options.forcedElement,
      releaseDelayMs: Math.max(0, row.at - flightMs - now),
      flightMs,
      duration: Math.max(260, row.at - now + 260)
    }] };
  }
  function tickDelayChainHopAfterSource(env2, row, sourceId) {
    const sourceAt = env2.runtime.pendingSkillStageHits.reduce((latest, other) => other !== row && other.at < row.at + CHAIN_HOP_MS && (other.targetEntries || []).some((entry) => entry.enemyId === sourceId) ? Math.max(latest, other.at) : latest, -Infinity);
    const late = sourceAt + CHAIN_HOP_MS - row.at;
    if (!(late > 0)) return;
    row.at += late;
    row.launchAt += late;
  }
  function* tickAddPendingSkillTravelFx(env2, row, attackContext, now) {
    if (!row) return;
    if (row.delivery === "instantTarget") {
      yield* tickAddChainHopTravelFx(env2, row, attackContext, now);
      return;
    }
    if (["field", "channel", "meteor"].includes(row.patternKind) && row.options.stageIndex > 0) return;
    const visual = tickSkillTravelVisuals(env2, row);
    let fx = {
      owner: "player",
      channelId: row.channelId,
      delivery: row.delivery,
      patternKind: row.patternKind,
      stageKind: row.options.stageKind,
      stageIndex: row.options.stageIndex,
      stageDelayMs: row.options.stageDelayMs,
      sourceCell: visual.sourceCell,
      aimCell: tickTravelAimCell(env2, row, visual.targetCells),
      targetCells: visual.targetCells,
      travelPath: row.travelPath,
      contactSchedule: row.contactSchedule,
      attackFootprint: row.options.attackFootprint,
      targetIds: visual.targetIds,
      skillName: attackContext.skillName,
      damageTextGroupId: row.options.damageTextGroupId,
      element: row.options.forcedElement,
      releaseDelayMs: Math.max(0, row.launchAt - now),
      flightMs: Math.max(1, row.at - row.launchAt),
      travelCellMs: tickGetPendingSkillTravelCellMs(env2, row),
      waveDurationMs: Math.max(0, Number(row.waveDurationMs) || 0),
      duration: row.fieldDurationMs || Math.max(260, row.at - now + 260)
    };
    yield { kind: "addBattleFx", args: ["combatTravel", fx] };
  }
  function tickSkillTravelVisuals(env2, row) {
    const boomerangReturn = row.patternKind === "boomerang" && row.options.stageKind === "boomerangReturn";
    const visual = tickGetSkillTravelVisualEndpoints(env2, row);
    visual.targetIds = row.targetEntries.map((entry) => entry.enemyId);
    if (row.patternKind === "boomerang") {
      visual.targetCells = boomerangReturn ? [tickCopyCombatGridCell(env2, env2.owner.gridPlayer)] : row.targetCells.slice(-1);
      visual.targetIds = boomerangReturn ? [] : visual.targetIds.slice(-1);
    }
    return visual;
  }
  function tickTravelAimCell(env2, row, visualTargetCells) {
    return tickCopyCombatGridCell(env2, row.aimCell) || tickCopyCombatGridCell(env2, (env2.owner.enemies || []).find((enemy) => enemy && row.targetEntries[0] && String(enemy.id) === String(row.targetEntries[0].enemyId))) || visualTargetCells[0];
  }

  // modules/combat/skill-travel-paths.mjs
  function tickBuildRadialBurstVisualRow(rows, now) {
    let first = rows[0];
    let waveDurationMs = Math.max(120, Number(first.waveDurationMs) || 0);
    return {
      ...first,
      targetCells: rows.flatMap((row) => row.targetCells || []),
      targetEntries: rows.flatMap((row) => row.targetEntries || []),
      waveDurationMs,
      fieldDurationMs: Math.max(360, first.at - now + waveDurationMs + 180)
    };
  }
  function tickBuildLinearSkillVisualRow(env2, rows) {
    const first = rows[0], last = rows[rows.length - 1];
    const source = first.sourceCell;
    const distance = (cell) => cellGridChebyshevDist(source.gx, source.gy, cell.gx, cell.gy);
    const end = first.options.attackFootprint.cells.reduce((a, b) => distance(b) > distance(a) ? b : a);
    const path = [{ ...source, offsetMs: 0 }];
    const dx = end.gx - source.gx, dy = end.gy - source.gy, lengthSq = dx * dx + dy * dy;
    rows.forEach((row, index) => {
      const cell = row.targetCells[0];
      const progress = lengthSq ? clampNumber(((cell.gx - source.gx) * dx + (cell.gy - source.gy) * dy) / lengthSq, 0, 1) : 0;
      const point = { gx: source.gx + dx * progress, gy: source.gy + dy * progress, offsetMs: Math.max(path[path.length - 1].offsetMs, row.at - first.launchAt) };
      const next = rows[index + 1];
      path.push(point);
      if (next) path.push({ ...point, offsetMs: point.offsetMs + Math.min(env2.deps.SKILL_HIT_SEQUENCE_CONFIG.pierceHoldMs.longest, Math.max(0, (Number(next.holdMs) || 0) - (Number(row.holdMs) || 0))) });
    });
    const tip = path[path.length - 1];
    const remaining = cellGridChebyshevDist(tip.gx, tip.gy, end.gx, end.gy);
    if (remaining > 0) {
      const skill = first.pStats.sSkill;
      const tailMs = first.patternKind === "moving" ? remaining * Math.max(80, Number(skill.combatPattern.intervalMs) || 160) : tickGetCombatTravelMs(env2, tip, end, skill) - tickGetCombatTravelMs(env2, tip, tip, skill);
      path.push({ ...end, offsetMs: tip.offsetMs + Math.max(1, tailMs) });
    }
    return {
      ...first,
      at: first.launchAt + path[path.length - 1].offsetMs,
      contactSchedule: rows.map((row) => ({ offsetMs: row.at - first.launchAt, state: row.contactState })),
      targetCells: [{ ...end }],
      targetEntries: last.targetEntries,
      travelPath: path
    };
  }
  function tickGroupsSkillTravelOnRay(row) {
    const skill = row.pStats.sSkill;
    if (skill.projectilePattern?.trajectory === "stages" || skill.combatPattern?.stages) return false;
    return row.patternKind === "moving" || row.delivery === "projectileCell" && !row.patternKind;
  }

  // modules/combat/skill-travel-shots.mjs
  function* tickAddPendingSkillTravelFxRows(env2, rows, attackContext, now) {
    const shots = /* @__PURE__ */ new Map();
    (rows || []).filter(Boolean).forEach((row) => shots.set(row.shot, (shots.get(row.shot) || []).concat(row)));
    for (const shotRows of shots.values()) yield* tickAddShotTravelFx(env2, shotRows, attackContext, now);
  }
  function* tickAddShotTravelFx(env2, queuedRows, attackContext, now) {
    let firstRow = queuedRows[0];
    if (attackContext.skillName === "빙결 침식") {
      const last = queuedRows[queuedRows.length - 1];
      yield* tickAddPendingSkillTravelFx(env2, {
        ...firstRow,
        options: { ...firstRow.options, attackFootprint: last.options.attackFootprint },
        fieldDurationMs: Math.max(last.at - now + 160, firstRow.at - now + 1e3 / Math.max(0.01, firstRow.pStats.aspd))
      }, attackContext, now);
      return;
    }
    if (firstRow.patternKind === "radialBurst") {
      yield* tickAddPendingSkillTravelFx(env2, tickBuildRadialBurstVisualRow(queuedRows, now), attackContext, now);
      return;
    }
    if (!tickGroupsSkillTravelOnRay(firstRow)) {
      for (let i = 0, length = queuedRows.length; i < length; i++) {
        if (i in queuedRows) yield* tickAddPendingSkillTravelFx(env2, queuedRows[i], attackContext, now);
      }
      return;
    }
    yield* tickAddPendingSkillTravelFx(env2, tickBuildLinearSkillVisualRow(env2, queuedRows), attackContext, now);
  }

  // modules/combat/skill-attack-queue.mjs
  function* tickQueuePlayerAttackSequence(env2, pStats, stages, context) {
    const shots = env2.deps.projectileShots.plan(context.skillName, pStats, stages);
    stages = shots || env2.deps.supports.stages(stages, pStats.sSkill);
    if (shots) pStats = { ...pStats, projectileExtraShots: 0, uniqueProjExtraShotChance: null };
    env2.deps.ascendancyNodeRules.onAttack(pStats, env2.deps.getCombatTime());
    if (pStats.sSkill.nativeCastId) return env2.deps.startSkillGemCombat(pStats, context);
    let tags = pStats.sSkill.tags || [], now = env2.deps.getCombatTime();
    let motionMs = tickGetAttackMotionMs(tags);
    motionMs = Math.min(motionMs, Math.max(80, 800 / Math.max(0.01, pStats.aspd)));
    motionMs = Math.max(motionMs, context.landingMs);
    let isChannel = tags.includes("channeling");
    let cycleMs = isChannel ? env2.deps.getCombatChannelCycleMs(pStats.aspd) : 0;
    let timing = isChannel ? env2.deps.beginCombatChannel(context.skillName, motionMs, cycleMs, context) : { id: 0, startAt: now + motionMs };
    let delayMs = timing.startAt - now, channelId = timing.id;
    let duration = Math.max(80, delayMs + cycleMs);
    let damageTextGroupId = env2.runtime.nextPlayerDamageTextGroupId++;
    if (env2.runtime.nextPlayerDamageTextGroupId > 1e9) env2.runtime.nextPlayerDamageTextGroupId = 1;
    env2.deps.noteCombatTacticAttack(duration);
    const delivery = tickGetSkillCombatDelivery(pStats.sSkill);
    yield { kind: "addBattleFx", args: ["playerSwing", {
      color: env2.deps.getElementColor(context.forcedElement),
      element: context.forcedElement,
      crit: context.forcedCrit,
      projectile: tags.includes("projectile"),
      kickoff: !!context.kickoff,
      combatTravel: delivery !== "instantTarget",
      releaseDelayMs: delivery.startsWith("projectile") ? Math.floor(Math.max(0, delayMs) * PROJECTILE_RELEASE_SHARE) : void 0,
      skillName: context.skillName,
      sourceCell: tickCopyCombatGridCell(env2, env2.owner.gridPlayer),
      duration,
      impactDelayMs: Math.max(0, delayMs),
      // 옆으로만 치는 룬이 대상을 고를 때 정한 쪽(js/combat-grid.js band): 대상이 바로 위나 아래여도 무대의 주인공이 그 쪽을 본다
      bandSide: env2.deps.getSkillBandSide(context.skillName, pStats.sSkill)
    }] };
    yield* tickQueuePendingSkillStageHits(env2, isChannel ? env2.deps.createContinuousChannelStages(stages, cycleMs) : stages, pStats, {
      ...context,
      channelId,
      channelCycleMs: cycleMs,
      baseDelayMs: delayMs,
      damageTextGroupId
    });
  }
  function tickGetPendingStageTimes(env2, stage, delivery, cells, timing) {
    const { now, baseDelay, skill } = timing;
    const through = delivery.startsWith("projectile") && stage.kind === "pierceThrough";
    const stageDelay = (through ? 0 : Math.max(0, Math.floor(stage.delayMs))) + (Number(stage.shotDelayMs) || 0);
    if (delivery.startsWith("projectile")) {
      const launchAt = now + Math.floor(baseDelay * PROJECTILE_RELEASE_SHARE) + stageDelay;
      return { stageDelay, launchAt, at: launchAt + tickGetCombatTravelMs(env2, through ? env2.owner.gridPlayer : cells.source, cells.target, skill) + (Number(stage.holdMs) || 0) };
    }
    if (delivery === "magicMoving") {
      const launchAt = now + baseDelay + stageDelay;
      return { stageDelay, launchAt, at: launchAt + Math.max(80, Number(skill.combatPattern.intervalMs) || 160) };
    }
    return { stageDelay, launchAt: now, at: now + baseDelay + stageDelay };
  }
  function* tickQueuePendingSkillStageHits(env2, stages, pStats, attackContext) {
    let now = env2.deps.getCombatTime();
    let baseDelay = Number(attackContext.baseDelayMs) || 0;
    let delivery = tickGetSkillCombatDelivery(pStats && pStats.sSkill);
    let patternKind = pStats && pStats.sSkill && pStats.sSkill.combatPattern ? pStats.sSkill.combatPattern.kind : null;
    let queuedRows = [];
    let finalStageDelayMs = (stages || []).reduce((max, stage) => Math.max(max, Number(stage && stage.delayMs) || 0), 0);
    let channelDurationMs = Math.max(finalStageDelayMs, Math.floor(Number(attackContext.channelCycleMs) || 0));
    const batch = { now, baseDelay, delivery, patternKind, finalStageDelayMs, channelDurationMs, pStats, attackContext };
    (stages || []).forEach((stage, stageOffset) => {
      if (!stage || !Array.isArray(stage.targets) || stage.targets.length <= 0) return;
      const row = tickBuildQueuedStage(env2, stage, stageOffset, batch);
      env2.runtime.pendingSkillStageHits.push(row);
      queuedRows.push(row);
    });
    yield* tickAddPendingSkillTravelFxRows(env2, queuedRows, attackContext, now);
  }
  function tickBuildQueuedStage(env2, stage, stageOffset, batch) {
    const { pStats, attackContext, now, baseDelay, delivery, patternKind } = batch;
    let targetEntries = stage.targets.map((entry) => ({ enemyId: entry.enemy.id, mult: Math.max(0, Number(entry.mult) || 1) }));
    let targetCells = tickQueuedStageCells(env2, stage);
    let chainSource = stage.chainFromEnemyId != null ? (env2.owner.enemies || []).find((enemy) => enemy && enemy.id === stage.chainFromEnemyId) : null;
    let sourceCell = tickCopyCombatGridCell(env2, chainSource || env2.owner.gridPlayer);
    let stageDelivery = stage.delivery || (stage.kind.startsWith("moving") ? "magicMoving" : delivery);
    let { stageDelay, launchAt, at } = tickGetPendingStageTimes(
      env2,
      stage,
      stageDelivery,
      { source: sourceCell, target: targetCells[0] },
      { now, baseDelay, skill: pStats.sSkill }
    );
    let row = {
      at,
      launchAt,
      holdMs: stage.holdMs,
      zoneId: env2.owner.currentZoneId,
      pStats,
      delivery: stageDelivery,
      patternKind,
      sourceCell,
      targetCells,
      targetEntries,
      shot: stage.shot,
      contactState: { resolved: false },
      whirl: stage.whirl,
      wave: stage.wave,
      advanceHero: !!stage.advanceHero,
      aimCell: tickCopyCombatGridCell(env2, stage.aimCell),
      waveDurationMs: Math.max(0, Number(stage.waveDurationMs) || 0),
      channelId: Math.max(0, Math.floor(Number(attackContext.channelId) || 0)),
      fieldDurationMs: tickQueuedStageFieldDuration(batch),
      options: tickQueuedStageOptions(sourceCell, stage, stageOffset, attackContext, stageDelay)
    };
    row.options.attackFootprint = env2.deps.getSkillStageFootprint(attackContext.skillName, pStats.sSkill, stage, sourceCell);
    row.contactSchedule = [{ offsetMs: row.at - row.launchAt, state: row.contactState }];
    return row;
  }
  function tickQueuedStageCells(env2, stage) {
    return Array.isArray(stage.impactCells) && stage.impactCells.length > 0 ? stage.impactCells.map((cell) => ({ gx: cell.gx, gy: cell.gy, mult: 1 })) : stage.targets.map((entry) => ({ ...tickCopyCombatGridCell(env2, entry.enemy), mult: Math.max(0, Number(entry.mult) || 1) })).filter((cell) => Number.isInteger(cell.gx));
  }
  function tickQueuedStageFieldDuration(batch) {
    const { patternKind, baseDelay, channelDurationMs, finalStageDelayMs } = batch;
    return patternKind === "channel" ? baseDelay + channelDurationMs + 120 : ["field", "meteor"].includes(patternKind) ? baseDelay + finalStageDelayMs + 320 : 0;
  }
  function tickQueuedStageOptions(sourceCell, stage, stageOffset, attackContext, stageDelay) {
    return {
      sourceCell,
      stageReplay: true,
      skipSlamEcho: stageOffset > 0,
      skillName: attackContext.skillName,
      channelId: attackContext.channelId,
      // 강타 여진은 첫 타격에서만
      forcedCrit: !!attackContext.forcedCrit,
      forcedElement: stage.element || attackContext.forcedElement,
      talentAttackMultiplier: tickStageAttackMultiplier(attackContext.talentAttackMultiplier),
      stageKind: stage.kind,
      stageLabel: stage.label,
      stageIndex: tickGetStageIndexInShot(stage, stageOffset),
      stageDelayMs: stageDelay,
      targetLimit: stage.targetLimit,
      stageCount: attackContext.stageCount,
      chainFromEnemyId: stage.chainFromEnemyId || null,
      stageRepeatOnce: !!stage.singleRepeat,
      skipGridControl: stage.skipGridControl,
      restrictRandomTargets: !!stage.singleRepeat,
      primaryAilmentChance: tickStageAilmentChance(stage.primaryAilmentChance),
      talentMoonReturn: attackContext.talentMoonReturn || null,
      attackHitGuardCounts: attackContext.attackHitGuardCounts,
      damageTextGroupId: attackContext.damageTextGroupId ? `${attackContext.damageTextGroupId}:${stageOffset}` : "",
      hitDamageMultiplier: Math.max(0, Number(stage.damageMultiplier) || 0),
      attackDamageMultiplier: tickStageAttackMultiplier(attackContext.attackDamageMultiplier),
      passiveKarmaContext: attackContext.passiveKarmaContext || null
    };
  }
  function tickStageAttackMultiplier(value) {
    return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 1;
  }
  function tickStageAilmentChance(value) {
    return Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : void 0;
  }

  // modules/combat/skill-unique-rules.mjs
  function tickConvertSkillDamageToChaos(skill) {
    let next = { ...skill || {} };
    let tags = Array.isArray(next.tags) ? next.tags.slice() : [];
    let convertedTags = tags.filter((tag) => !["physical", "elemental", "fire", "cold", "lightning"].includes(tag));
    if (!convertedTags.includes("chaos")) convertedTags.push("chaos");
    next.tags = convertedTags;
    next.ele = "chaos";
    if (Array.isArray(next.randomElementPool)) next.randomElementPool = null;
    next.convertedToChaos = true;
    return next;
  }
  function tickGetUniqueEffectImplementationReport(env2) {
    let declared = [];
    if (typeof env2.deps.UNIQUE_DB !== "undefined" && Array.isArray(env2.deps.UNIQUE_DB)) {
      declared = env2.deps.UNIQUE_DB.map((unique) => unique && unique.uniqueEffectKey).filter(Boolean);
    }
    let uniqueKeys = Array.from(new Set(declared));
    let implemented = new Set(TICK_IMPLEMENTED_UNIQUE_EFFECTS);
    return {
      total: uniqueKeys.length,
      implemented: uniqueKeys.filter((k) => implemented.has(k)),
      missing: uniqueKeys.filter((k) => !implemented.has(k))
    };
  }
  function tickRecordPlayerEvadeUniqueEffects(env2, pStats, aliveEnemyCount, now) {
    let at = Number.isFinite(Number(now)) ? Number(now) : env2.deps.getCombatTime();
    let dance = pStats && pStats.uniqueEvasionDance;
    if (dance) tickRecordEvasionDance(env2.owner, dance, at);
    let counter = pStats && pStats.uniqueLoneEvasionCounter;
    if (!counter || aliveEnemyCount < 1 || aliveEnemyCount > Math.max(1, Math.floor(counter.maxEnemies || 2))) return;
    env2.owner.uniqueLoneEvasionCounterUntil = at + Math.max(0.1, Number(counter.duration || 3)) * 1e3;
  }
  function tickRecordEvasionDance(owner, dance, at) {
    let previous = owner.uniqueEvasionDanceState || {};
    let stacks = (previous.expiresAt || 0) > at ? Math.floor(previous.stacks || 0) : 0;
    owner.uniqueEvasionDanceState = {
      stacks: Math.min(Math.max(1, Math.floor(dance.maxStacks || 4)), stacks + 1),
      expiresAt: at + Math.max(0.1, Number(dance.duration || 4)) * 1e3
    };
  }
  var TICK_IMPLEMENTED_UNIQUE_EFFECTS = [
    "xpGainPct",
    "flatDmgPerLevel",
    "esAmpAndRecoverOnCrit",
    "invertShockTaken",
    "alwaysShock",
    "projectileDoubleStrikePct",
    "projectilePatternMode",
    "hitApplyChaosResDown",
    "corpseExplodeOnKill",
    "instantLeechAndDoubleDamage",
    "riderCompass",
    "maxRollBonusHit",
    "ceilingSmashDouble",
    "minRollEqualsMaxRoll",
    "hpToPhysPct",
    "immuneIgnite",
    "rollGapDamagePct",
    "rollGapCritAndDs",
    "crowdEvasionMore",
    "fewEnemyEvasionMore",
    "evasionDanceOnEvade",
    "loneEvasionCounter",
    "critAdvanceEnergyShieldRecharge",
    "energyShieldBreakRecharge",
    "esToLightPct",
    "underdogNonMaxRollMorePct",
    "instakillNormalOnHitPct",
    "projectileExtraShotChance",
    "abyssSocketOnItem",
    "abyssSocketAndJewelAmp",
    "leechEfficiencyOnKill",
    "overkillSplash",
    "dragonVeinGuard",
    "fateTwinRollSync",
    "realmBleedingEnemyDamageMore",
    "realmRiftWaveOnHit",
    "realmChaosDamageInstantLeech",
    "realmInvulnerableBarrierOnHit",
    "realmPoisonDuration",
    "realmArmorToPhysicalDamage",
    "realmDeathWard",
    "realmAllResDownOnHit",
    "realmKillMoveStacks",
    "realmCursedTakenAndRefresh",
    "realmEnemyRegenCutAndMinRoll",
    "realmPhysDrHalfTakenAsMore",
    "realmArmorAppliesToDot",
    "realmMeleeArmorAmp",
    "realmRepelMelee",
    "realmResonanceAndSuppCap",
    "realmRegenRateAndRegen",
    "realmMaxHpPct",
    "realmAllMaxRes",
    "frostSentinelBoots",
    "shockTracerGreaves",
    "venomStride",
    "bleedBlockHelm",
    "curseCrown",
    "guardianArmor",
    "warcryResonanceBelt",
    "stackingElementalResDownOnHit",
    "conditionManual",
    "cooldownReductionCap",
    "mobilityRuneAsAttack",
    "queenBeeSummonOnHit",
    "bleedWeightOnBleedingHit",
    "grandBreachCrown",
    "labyrinthShackles",
    "meteorFootsteps",
    "cosmosFinalDmg",
    "cosmosTakenLess",
    "cosmosSpeedBurst",
    "cosmosPenetration",
    "cosmosSustain",
    "cosmosBossSlayer",
    "cosmosStatBundle",
    "summonCapBonus",
    "summonDeathDamageBuff",
    "summonCritAspdStacks",
    "summonNonCritNoDamage",
    "summonEfficiencyBonus",
    "rightRingSummonCap",
    "genericTakenDamageReducePct",
    "uniqueBlockChance",
    "uniqueDeflectDamageReduce",
    "blockRecoverEnergyShieldPct",
    "blockedDamageTakenPct",
    "uniqueTakenReduceWhen2Enemies",
    "uniqueMaxResAll",
    "deflectGrantShadowStealth",
    "chaosTakenDamageReducePct",
    "uniqueGemLevelBonus",
    "lifeRecoupTakenDamage",
    "immuneBleed",
    "uniqueTakenReduceWhen1Enemy",
    "lifePctAsEnergyShield",
    "dsAndTargetAnyBonus",
    "poisonDamageMorePct",
    "immuneFreeze",
    "uniqueMinDmgRoll",
    "hitShockedEnemyDamageMorePct",
    "pursuitMoveSpeed",
    "projectileTargetBonus",
    "igniteDamageMorePct",
    "cosmosAlwaysFirstHit",
    "cosmosEnergyShieldAmpBypass",
    "cosmosOrbitCycle",
    "cosmosDeepSeaLeechCaps",
    "cosmosTideEsRegenToLife",
    "cosmosEqualDamageSplit",
    "cosmosBalanceMitigation",
    "cosmosTwinStarResonance",
    "cosmosJudgmentLightning",
    "cosmosDeathResist",
    "cosmosVerdictSupportDamage",
    "cosmosGuardianConditionInstant",
    "cosmosBossDamageMore",
    "cosmosCometChillNoFreeze",
    "fixedAllMaxRes",
    "kaleidoscopeShield",
    "stealEliteTrait",
    "mirrorOppositeRing",
    "astraUniqueConvergence",
    "thousandBottles",
    "implicitAmp",
    "loopGrowth",
    "familyBond",
    "sightBeyond",
    "chestLuck",
    "emberHeart",
    "amberTime",
    "witheredEcho",
    "nurseryBloom"
  ];

  // modules/combat-tick-classic.mjs
  var deps = {
    get expireConditionEffects() {
      return expireConditionEffects;
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get runReturnRules() {
      return runReturnRules;
    },
    get talismanCombat() {
      return talismanCombat;
    },
    get advanceSkillGemCasts() {
      return advanceSkillGemCasts;
    },
    get updateCombatChannelRuntime() {
      return updateCombatChannelRuntime;
    },
    get ascendancyNodeRules() {
      return ascendancyNodeRules;
    },
    get applyConditionPhysicalReductionEffects() {
      return applyConditionPhysicalReductionEffects;
    },
    get applyCosmosPlayerDebuffsToStats() {
      return applyCosmosPlayerDebuffsToStats;
    },
    get tickAilments() {
      return tickAilments;
    },
    get getPlayerShockTakenDamageIncreasePct() {
      return getPlayerShockTakenDamageIncreasePct;
    },
    get recordPassiveCycleAilmentEnd() {
      return typeof recordPassiveCycleAilmentEnd === "undefined" ? void 0 : recordPassiveCycleAilmentEnd;
    },
    get handlePlayerDefeat() {
      return handlePlayerDefeat;
    },
    get getZone() {
      return getZone;
    },
    get finishWoodsmanEntrance() {
      return finishWoodsmanEntrance;
    },
    get markPlayerMovementCompleted() {
      return markPlayerMovementCompleted;
    },
    get startEncounterRun() {
      return startEncounterRun;
    },
    get isBeehiveRunLockedForMapTravel() {
      return typeof isBeehiveRunLockedForMapTravel === "undefined" ? void 0 : isBeehiveRunLockedForMapTravel;
    },
    get isSkyTowerAtRewardLimit() {
      return isSkyTowerAtRewardLimit;
    },
    get finishTownReturnAction() {
      return finishTownReturnAction;
    },
    get pruneEnemyRuntimeDebuffMaps() {
      return pruneEnemyRuntimeDebuffMaps;
    },
    get getPlayerRecoveryHpCap() {
      return getPlayerRecoveryHpCap;
    },
    get applyActRestRecovery() {
      return applyActRestRecovery;
    },
    get tickPlayerLeech() {
      return tickPlayerLeech;
    },
    get tickPlayerRecoup() {
      return tickPlayerRecoup;
    },
    get getPlayerEnergyShieldRecoveryCap() {
      return getPlayerEnergyShieldRecoveryCap;
    },
    get hasKeystone() {
      return hasKeystone;
    },
    get tickEnemyDotEffects() {
      return tickEnemyDotEffects;
    },
    get tickEnemyAilments() {
      return tickEnemyAilments;
    },
    get getCombatChannelGate() {
      return getCombatChannelGate;
    },
    get getWalkingChargeScale() {
      return getWalkingChargeScale;
    },
    get performPlayerAttack() {
      return performPlayerAttack;
    },
    get combatTacticsRuntime() {
      return window.GameModules.state.combat.combatTacticsRuntime;
    },
    get getPlayerAttackRecoveryMs() {
      return getPlayerAttackRecoveryMs;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get runSummonAttackTick() {
      return runSummonAttackTick;
    },
    get performMonsterAttacks() {
      return performMonsterAttacks;
    },
    get updatePlayerGridEngagement() {
      return updatePlayerGridEngagement;
    },
    get random() {
      return Math.random;
    },
    get tickColonyRun() {
      return tickColonyRun;
    },
    get getUnderworldLifeDrainPerTick() {
      return getUnderworldLifeDrainPerTick;
    },
    get getSkyStoneReductionPct() {
      return getSkyStoneReductionPct;
    },
    get floorIncomingDamage() {
      return floorIncomingDamage;
    },
    get absorbDamageWithTalentStoneShield() {
      return absorbDamageWithTalentStoneShield;
    },
    get ensureEncounterRun() {
      return ensureEncounterRun;
    },
    get isVoidRiftCombatZone() {
      return isVoidRiftCombatZone;
    },
    get spawnVoidBreachReinforcement() {
      return spawnVoidBreachReinforcement;
    },
    get _t() {
      return _t;
    },
    get combatLootReceipts() {
      return combatLootReceipts;
    },
    get awardCurrency() {
      return awardCurrency;
    },
    get GRAND_BREACH_ENCOUNTER() {
      return GRAND_BREACH_ENCOUNTER;
    },
    get canQueueTutorialNotice() {
      return typeof queueTutorialNotice === "function";
    },
    get applyDamageToEnemyResource() {
      return applyDamageToEnemyResource;
    },
    get getElementColor() {
      return getElementColor;
    },
    get i18n() {
      return i18n;
    },
    get formatNumberKR() {
      return formatNumberKR;
    },
    get handleEnemyDeath() {
      return handleEnemyDeath;
    },
    get getPlayerStats() {
      return getPlayerStats;
    },
    get isTalentCardActive() {
      return typeof isTalentCardActive === "undefined" ? void 0 : isTalentCardActive;
    },
    get getAliveEnemyByRuntimeKey() {
      return getAliveEnemyByRuntimeKey;
    },
    get hasGridCell() {
      return hasGridCell;
    },
    get COMBAT_PROJECTILE_MIN_TRAVEL_MS() {
      return COMBAT_PROJECTILE_MIN_TRAVEL_MS;
    },
    get COMBAT_PROJECTILE_MS_PER_CELL() {
      return COMBAT_PROJECTILE_MS_PER_CELL;
    },
    get gridLineCells() {
      return gridLineCells;
    },
    get selectGridSkillTargets() {
      return selectGridSkillTargets;
    },
    get getGridSkillTargetMult() {
      return getGridSkillTargetMult;
    },
    get getGridUnitCells() {
      return getGridUnitCells;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get getGridWaveDrawnDistance() {
      return getGridWaveDrawnDistance;
    },
    get getGridUnitCenter() {
      return getGridUnitCenter;
    },
    get SKILL_HIT_SEQUENCE_CONFIG() {
      return SKILL_HIT_SEQUENCE_CONFIG;
    },
    get projectileShots() {
      return projectileShots;
    },
    get supports() {
      return window.GameModules.combat.supports;
    },
    get startSkillGemCombat() {
      return startSkillGemCombat;
    },
    get getCombatChannelCycleMs() {
      return getCombatChannelCycleMs;
    },
    get beginCombatChannel() {
      return beginCombatChannel;
    },
    get noteCombatTacticAttack() {
      return noteCombatTacticAttack;
    },
    get getSkillBandSide() {
      return getSkillBandSide;
    },
    get createContinuousChannelStages() {
      return createContinuousChannelStages;
    },
    get getSkillStageFootprint() {
      return getSkillStageFootprint;
    },
    get getGridUnitDistance() {
      return getGridUnitDistance;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get beginExplorationGridStep() {
      return beginExplorationGridStep;
    },
    get gridStepToward() {
      return gridStepToward;
    },
    get getGridBlockedCells() {
      return getGridBlockedCells;
    },
    get UNIQUE_DB() {
      return typeof UNIQUE_DB === "undefined" ? void 0 : UNIQUE_DB;
    }
  };
  var runtime = {
    get pTimer() {
      return window.GameModules.state.session.pTimer;
    },
    set pTimer(value) {
      window.GameModules.state.session.pTimer = value;
    },
    get progressStallTicks() {
      return window.GameModules.state.session.progressStallTicks;
    },
    set progressStallTicks(value) {
      window.GameModules.state.session.progressStallTicks = value;
    },
    get pendingSkillStageHits() {
      return window.GameModules.state.combat.pendingSkillStageHits;
    },
    set pendingSkillStageHits(value) {
      window.GameModules.state.combat.pendingSkillStageHits = value;
    },
    get nextPlayerDamageTextGroupId() {
      return window.GameModules.state.combat.nextPlayerDamageTextGroupId;
    },
    set nextPlayerDamageTextGroupId(value) {
      window.GameModules.state.combat.nextPlayerDamageTextGroupId = value;
    }
  };
  var env = { get owner() {
    return game;
  }, deps, runtime };
  var presentation = {
    get addBattleFx() {
      return addBattleFx;
    },
    get addLog() {
      return addLog;
    },
    get queueTutorialNotice() {
      return queueTutorialNotice;
    }
  };
  function runTickCommands(commands, ui) {
    let step = commands.next();
    while (!step.done) {
      const command = step.value;
      const receiver = command.kind === "say" || command.kind === "enterGrand" ? ui : presentation;
      const result = receiver[command.kind](...command.args);
      step = commands.next(result);
    }
    return step.value;
  }
  var combatTick = {
    applyTickConditions(pStats) {
      return runTickCommands(tickApplyTickConditions(env, pStats));
    },
    stopTickBeforeCombat(pStats) {
      return tickStopTickBeforeCombat(env, pStats);
    },
    isCombatProgressStopped(zone) {
      return tickIsCombatProgressStopped(env, zone);
    },
    recoverPlayerTick(pStats) {
      return tickRecoverPlayerTick(env, pStats);
    },
    advanceTravelTick() {
      return tickAdvanceTravelTick(env);
    },
    pruneEnemyRuntimeOnSchedule() {
      return tickPruneEnemyRuntimeOnSchedule(env);
    },
    beehiveHoldsTick() {
      return tickBeehiveHoldsTick(env);
    },
    tickZoneHazards(zone, pStats) {
      return tickTickZoneHazards(env, zone, pStats);
    },
    trackProgressStall(progressBefore) {
      return tickTrackProgressStall(env, progressBefore);
    },
    runFightTick(pStats, hazardEvasion, walkedMs) {
      return tickRunFightTick(env, pStats, hazardEvasion, walkedMs);
    },
    tickVoidRiftWave(zone, ui) {
      return runTickCommands(tickTickVoidRiftWave(env, zone), ui);
    },
    copyCombatGridCell(unit) {
      return tickCopyCombatGridCell(env, unit);
    },
    getSkillCombatDelivery(skill) {
      return tickGetSkillCombatDelivery(skill);
    },
    getCombatTravelMs(sourceCell, targetCell, skill) {
      return tickGetCombatTravelMs(env, sourceCell, targetCell, skill);
    },
    pickWhirlSpinTargets(row) {
      return tickPickWhirlSpinTargets(env, row);
    },
    pickWaveFrontTargets(row) {
      return tickPickWaveFrontTargets(env, row);
    },
    getPendingSkillImpactTargets(row) {
      return tickGetPendingSkillImpactTargets(env, row);
    },
    addChainHopTravelFx(row, attackContext, now) {
      return runTickCommands(tickAddChainHopTravelFx(env, row, attackContext, now));
    },
    queuePlayerAttackSequence(pStats, stages, context) {
      return runTickCommands(tickQueuePlayerAttackSequence(env, pStats, stages, context));
    },
    queuePendingSkillStageHits(stages, pStats, attackContext) {
      return runTickCommands(tickQueuePendingSkillStageHits(env, stages, pStats, attackContext));
    },
    advanceHeroForStage(row) {
      return tickAdvanceHeroForStage(env, row);
    },
    processPendingSkillStageHits() {
      return tickProcessPendingSkillStageHits(env);
    },
    processTalentInquisitorMarks() {
      return runTickCommands(tickProcessTalentInquisitorMarks(env));
    },
    convertSkillDamageToChaos(skill) {
      return tickConvertSkillDamageToChaos(skill);
    },
    getUniqueEffectImplementationReport() {
      return tickGetUniqueEffectImplementationReport(env);
    },
    recordPlayerEvadeUniqueEffects(pStats, aliveEnemyCount, now) {
      return tickRecordPlayerEvadeUniqueEffects(env, pStats, aliveEnemyCount, now);
    }
  };
  safeExposeGlobals(combatTick);
})();
