// GENERATED from modules/act-exploration-progress*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/exploration-progress-rules.mjs
  var AUTO_RESUME_GRACE_MS = 1500;
  var AUTO_START_GRACE_MS = 1e3;
  var COMMAND_GIVE_UP_STEPS = 15;
  function progressClockOf(env, run) {
    return run.motionTimeMs || env.deps.getCombatTime();
  }
  function progressHoldAuto(env, run, ms) {
    env.memo.autoHolds.set(run, Math.max(env.memo.autoHolds.get(run) || 0, progressClockOf(env, run) + ms));
  }
  function progressAutoHeld(env, run) {
    return !env.owner.isBackgroundCalculation && (env.memo.autoHolds.get(run) || 0) > progressClockOf(env, run);
  }
  function progressWaitsForAutoGrace(env, run) {
    if (run.destination || env.deps.actExplorationState.lockedEnemy(run)) {
      progressHoldAuto(env, run, AUTO_RESUME_GRACE_MS);
      return false;
    }
    return progressRunMode(env, run) !== "manual" && progressAutoHeld(env, run);
  }
  function progressHoldAutoStart(env, run) {
    if (run) progressHoldAuto(env, run, AUTO_START_GRACE_MS);
  }
  function progressHoldAutoManual(env, run) {
    progressHoldAuto(env, run, AUTO_RESUME_GRACE_MS);
    env.memo.manualSteerHolds.set(run, progressClockOf(env, run) + AUTO_RESUME_GRACE_MS);
  }
  function progressClearManualSteerHold(env, run) {
    return env.memo.manualSteerHolds.delete(run);
  }
  function progressStartMode(settings) {
    return settings.autoMove === false ? "manual" : settings.actExplorationMode;
  }
  function progressRunMode(env, run, state = env.owner) {
    if (run.mode !== "manual" || !state.isBackgroundCalculation) return run.mode;
    return state.settings.actExplorationMode === "full" ? "full" : "direct";
  }
  function progressHoldPosition(env, requested) {
    const run = env.deps.actExplorationState.current(env.owner);
    if (!run) return !!requested;
    const locked = !!env.deps.actExplorationState.lockedEnemy(run);
    return requested || progressRunMode(env, run) === "manual" && !locked || !!run.destination || progressHoldsManualSteer(env, run, locked);
  }
  function progressHoldsManualSteer(env, run, locked) {
    return locked ? (env.memo.manualSteerHolds.get(run) || 0) > progressClockOf(env, run) : progressAutoHeld(env, run);
  }

  // modules/combat/exploration-progress-loot.mjs
  var GREED_PICKUP_RANGE = 999;
  var MANUAL_LOOT_WAIT_MS = 2e4;
  function progressWalkStep(env, target, stats) {
    const interval = env.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * 100 / stats.moveSpeed;
    const diagonal = stats.moveSpeed >= env.deps.COMBAT_GRID_CONFIG.explorationDiagonalMoveSpeed && !env.owner.enemies.some((enemy) => enemy.hp > 0);
    return !!target && env.deps.beginExplorationGridStep(target, interval, void 0, diagonal);
  }
  function progressPickupRange(env, stats) {
    if (env.deps.blessingGreed(env.owner)) return GREED_PICKUP_RANGE;
    return stats.moveSpeed >= env.deps.COMBAT_GRID_CONFIG.explorationWidePickupMoveSpeed ? 1 : 0;
  }
  function* progressPickUp(env, run, stats) {
    const range = progressPickupRange(env, stats);
    const rows = env.owner.isBackgroundCalculation ? env.deps.ground.takeAll(run) : env.deps.ground.takeNear(run, env.owner.gridPlayer, env.deps.getCombatTime(), range);
    if (rows.length) yield { kind: "collectExplorationFloorLoot", args: [rows] };
  }
  function* progressWalkToLoot(env, run, stats) {
    const now = env.deps.getCombatTime(), pile = env.deps.ground.nearest(run, env.owner.gridPlayer, now);
    if (!pile) return env.deps.ground.falling(run, now);
    const memo2 = env.memo.lootWalks.get(run) || { stalls: 0 };
    env.memo.lootWalks.set(run, memo2);
    if (env.deps.isPlayerAttackRecovering(run.motionTimeMs)) return true;
    memo2.stalls = progressWalkStep(env, env.deps.actExplorationDoors.toward(run, pile), stats) ? 0 : memo2.stalls + 1;
    if (memo2.stalls >= COMMAND_GIVE_UP_STEPS) {
      memo2.stalls = 0;
      yield { kind: "collectExplorationFloorLoot", args: [env.deps.ground.takeAt(run, pile)] };
    }
    return true;
  }
  function progressCollectingLoot(env, run) {
    if (run.status !== "cleared" || run.completionApplied || env.owner.isBackgroundCalculation || !env.deps.ground.nearest(run, env.owner.gridPlayer)) return false;
    if (progressRunMode(env, run) !== "manual") return true;
    const memo2 = env.memo.lootWalks.get(run) || { stalls: 0 };
    env.memo.lootWalks.set(run, memo2);
    const now = env.deps.getCombatTime();
    if (memo2.clearedAt === void 0) memo2.clearedAt = now;
    return now - memo2.clearedAt < MANUAL_LOOT_WAIT_MS;
  }
  function progressCanMove(env, run) {
    return !!run && (run.status === "active" || progressCollectingLoot(env, run));
  }
  function* progressCollectPile(env, cell) {
    const run = env.deps.actExplorationState.current(env.owner);
    const rows = run ? env.deps.ground.takeAt(run, cell) : [];
    if (rows.length) {
      yield { kind: "collectExplorationFloorLoot", args: [rows] };
      yield { kind: "queueImportantSave", args: [220] };
    }
    return rows.length;
  }

  // modules/combat/exploration-progress-lifecycle.mjs
  function* progressRecordVisitedInscription(env, run) {
    if (!env.deps.JOURNAL_DB["inscription_" + run.zoneId]) return;
    const hero = env.owner.gridPlayer, prior = env.memo.inscriptionVisits.get(run);
    if (prior && prior.gx === hero.gx && prior.gy === hero.gy) return;
    const room = env.deps.actExplorationDoors.room(run);
    env.memo.inscriptionVisits.set(run, { gx: hero.gx, gy: hero.gy, roomId: room?.id });
    if (room && room.id !== prior?.roomId) yield* progressRecordInscription(env, run, false);
  }
  function* progressRecordInscription(env, run, completed) {
    const id = "inscription_" + run.zoneId, entry = env.deps.JOURNAL_DB[id];
    if (!entry || entry.afterClear !== completed || env.owner.journalEntries.includes(id)) return;
    if (!env.deps.actExplorationDoors.stageMap(run)) return;
    if (!completed && env.deps.actExplorationDoors.room(run)?.role !== "optional") return;
    env.deps.unlockJournalEntry(id);
    if (!env.owner.isBackgroundCalculation) yield { kind: "queueImportantSave", args: [220] };
  }
  function progressLive(env, state = env.owner) {
    const run = env.deps.actExplorationState.current(state);
    return run && !run.arrival ? run : null;
  }
  function progressCanFinish(env) {
    const run = progressLive(env);
    if (run) return run.status === "cleared" && !run.completionApplied && !progressCollectingLoot(env, run);
    return env.owner.runProgress >= 100 && env.owner.encounterIndex >= env.owner.encounterPlan.length && env.owner.enemies.length === 0;
  }
  function* progressBeginCompletion(env, zone) {
    const run = progressLive(env);
    if (!run) return true;
    if (!progressCanFinish(env)) return false;
    env.deps.actExplorationMotion.cancel(run);
    env.deps.actExplorationState.retireCombat(env.owner);
    run.completionApplied = true;
    yield* progressRecordInscription(env, run, true);
    env.owner.runProgress = 100;
    if (Number.isFinite(zone.maxKills)) env.owner.killsInZone = Math.max(env.owner.killsInZone, zone.maxKills - 1);
    return true;
  }
  function progressShouldTrackStall(env) {
    return !progressLive(env) && env.owner.moveTimer <= 0 && env.owner.enemies.length === 0;
  }
  function progressWaiting(env, state) {
    const run = env.deps.actExplorationState.current(state);
    return !!(run && (run.status === "failed" || run.completionApplied && !run.departure));
  }
  function progressDeferDeparture(env, state) {
    const run = state.actExploration;
    if (!run?.completionApplied || state.isBackgroundCalculation) return false;
    run.departure = { zoneId: state.currentZoneId, remainingMs: env.deps.actExplorationState.settlementMs };
    state.currentZoneId = run.zoneId;
    state.combatHalted = false;
    return true;
  }
  function* progressDepart(env, state) {
    const run = state.actExploration;
    if (run && ["colony_run", "grand_breach_run"].includes(run.zoneId)) env.deps.ground.discardEncounter(state, run.zoneId);
    else if (run && state === env.owner) {
      const rows = env.deps.ground.takeAll(run);
      if (rows.length) yield { kind: "collectExplorationFloorLoot", args: [rows] };
    } else if (run) env.deps.ground.settleOnLoad(state, run);
    state.actExploration = null;
  }
  function progressStopAfterCompletion(env, state) {
    state.combatHalted = true;
    state.enemies = [];
    state.encounterPlan = [];
    state.encounterIndex = 0;
    state.runProgress = env.deps.actExplorationState.current(state)?.completionApplied ? 100 : 0;
  }
  function* progressReconcileDeparture(env, state) {
    if (state.actExploration && !env.deps.actExplorationState.current(state)) yield* progressDepart(env, state);
  }
  function progressDefeat(env, state) {
    const run = env.deps.actExplorationState.current(state);
    if (run && !run.completionApplied) {
      env.deps.actExplorationMotion.cancel(run);
      run.status = "failed";
    }
  }

  // modules/combat/exploration-progress-movement.mjs
  function* progressAdvance(env, stats) {
    const run = env.deps.actExplorationState.current(env.owner);
    if (!run) return false;
    yield* progressTick(env, env.deps.getCombatTime(), stats);
    return true;
  }
  function progressStepsLeft(env, run) {
    return progressCanMove(env, run) || run.status === "cleared" && (run.motion || env.deps.actExplorationMotion.freeMoving(run));
  }
  function* progressTick(env, now, stats) {
    const run = env.deps.actExplorationState.current(env.owner);
    if (!run || !progressStepsLeft(env, run)) return;
    if (env.owner.combatHalted || env.owner.moveTimer > 0) {
      env.deps.actExplorationMotion.rebase(run, now);
      return;
    }
    if (run.arrival) delete run.arrival;
    env.deps.actExplorationDoors.sendStraysBack(run);
    if (!run.motionTimeMs) run.motionTimeMs = now;
    if (now - run.motionTimeMs > 1e3) env.deps.actExplorationMotion.rebase(run, now - 100);
    while (run.motionTimeMs + 20 <= now) {
      run.motionTimeMs += 20;
      yield* progressStepFrame(env, run, stats);
    }
  }
  function* progressStepFrame(env, run, stats) {
    const walking = run.motion;
    const freeWalking = env.deps.actExplorationMotion.freeBusy(run);
    yield* progressStep(env, run, stats);
    progressContinueApproachAfterStep(env, run, walking, stats);
    if (freeWalking && !env.deps.actExplorationMotion.freeBusy(run)) env.deps.continuePlayerExplorationApproach(stats);
    if (walking || env.deps.actExplorationMotion.freeMoving(run)) env.memo.walkedMs.set(run, (env.memo.walkedMs.get(run) || 0) + 20);
  }
  function progressContinueApproachAfterStep(env, run, walking, stats) {
    if (walking && walking.elapsed === walking.duration && !run.motion) env.deps.continuePlayerExplorationApproach(stats);
  }
  function* progressStep(env, run, stats) {
    env.deps.objects.step(run, 20);
    const from = progressAdvanceMovement(env, run, stats);
    env.deps.swapSummonOutOfHeroTile(from);
    if (run.motion || env.deps.actExplorationMotion.freeBusy(run)) return;
    if (!(yield* progressExplore(env, run, stats))) {
      yield* progressWalkClearedCommand(env, run, stats);
      return;
    }
    env.deps.actExplorationDoors.cross(run);
    env.deps.actExplorationState.discover(run, env.owner.gridPlayer, stats);
    yield* progressRecordVisitedInscription(env, run);
    const opened = env.deps.actExplorationState.entrance(run);
    progressWakeBosses(env, env.deps.actExplorationState.engage(env.owner, run.motionTimeMs));
    yield* progressAnnounceAlerted(env.deps.actExplorationState.wake(env.owner, env.deps.actExplorationState.alerted(env.owner)));
    const entrance = yield* progressWatchEntrance(env, run, opened);
    const cleared = run.packs.filter((pack) => pack.aliveIds.length === 0).length;
    if (!(run.source && run.source.chain === true)) env.owner.runProgress = Math.min(99, 100 * cleared / run.packs.length);
    if (yield* progressHoldsOrDetours(env, run, entrance, stats)) return;
    const target = env.deps.actExplorationState.destination(run, env.owner.gridPlayer, progressRunMode(env, run));
    if (!target) return;
    if (target.gx === env.owner.gridPlayer.gx && target.gy === env.owner.gridPlayer.gy) {
      run.destination = null;
      return;
    }
    progressWalk(env, run, target, stats);
  }
  function progressAdvanceMovement(env, run, stats) {
    const motion = env.deps.actExplorationMotion, player = env.owner.gridPlayer;
    if (env.deps.bossMoves.observer.playerBoundary(run)) {
      const from2 = { gx: player.gx, gy: player.gy };
      const interval = env.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec * 100 / stats.moveSpeed / env.deps.actExplorationDoors.pace(run);
      const point = motion.takeDirectAim(run) || motion.preciseTarget(run, player);
      if (point) motion.startFree(run, player, point, interval);
      let blocked;
      motion.advanceFree(run, player, interval, (cell) => {
        blocked || (blocked = env.deps.getHeroStepBlockedCells());
        return env.deps.canPlaceGridFootprint(blocked, cell.gx, cell.gy, { columns: 1, rows: 1 });
      });
      return from2;
    }
    motion.stopFree(run);
    const from = run.motion && run.motion.from;
    motion.advance(run, player, run.motionTimeMs, progressCanEnterMotionTile(env, run));
    return from;
  }
  function* progressWalkClearedCommand(env, run, stats) {
    if (run.status !== "cleared" || run.motion) return;
    if (progressCollectingLoot(env, run)) env.deps.actExplorationDoors.cross(run);
    yield* progressRecordVisitedInscription(env, run);
    const target = run.destination;
    if (!target) return;
    if (target.gx === env.owner.gridPlayer.gx && target.gy === env.owner.gridPlayer.gy) {
      run.destination = null;
      return;
    }
    progressWalk(env, run, target, stats);
  }
  function progressWalk(env, run, target, stats) {
    if (env.deps.isPlayerAttackRecovering(run.motionTimeMs)) return;
    const stepped = progressWalkStep(env, env.deps.actExplorationDoors.toward(run, target), stats);
    if (stepped || target !== run.destination) {
      env.memo.commandStalls.delete(run);
      return;
    }
    const stalls = (env.memo.commandStalls.get(run) || 0) + 1;
    env.memo.commandStalls.set(run, stalls);
    if (stalls >= COMMAND_GIVE_UP_STEPS) {
      run.destination = null;
      env.deps.objects.cancel(run);
      env.memo.commandStalls.delete(run);
    }
  }
  function* progressHoldsOrDetours(env, run, entrance, stats) {
    if (entrance) return true;
    if (progressWaitsForAutoGrace(env, run)) return true;
    if (run.destination) return false;
    if (env.deps.actExplorationDoors.fightingHere(run)) return true;
    return progressRunMode(env, run) !== "manual" && (yield* progressWalkToLoot(env, run, stats));
  }
  function* progressExplore(env, run, stats) {
    yield* progressPickUp(env, run, stats);
    if (run.status === "cleared" && progressCollectingLoot(env, run) && progressRunMode(env, run) !== "manual") yield* progressWalkToLoot(env, run, stats);
    return run.status === "active";
  }
  function* progressWatchEntrance(env, run, opened) {
    const entrance = env.deps.actExplorationState.entrance(run);
    if (!entrance || entrance === opened) return entrance;
    const pack = run.packs.find((row) => row.key === entrance.key);
    env.deps.roomInvaders.onBossEntrance(run, pack);
    const holdMs = env.deps.woodsmanBattle.introduction() ? env.deps.WOODSMAN_BATTLE.intro.revealMs : entrance.holdMs;
    yield { kind: "addBattleFx", args: ["bossEntrance", { enemies: pack.waiting, enemyIds: pack.waiting.map((enemy) => enemy.id), holdMs, duration: holdMs + 600, red: pack.waiting.some((enemy) => enemy.redEntrance) }] };
    return entrance;
  }
  function* progressAnnounceAlerted(woken) {
    if (woken.length) yield { kind: "dispatchRuntimeEvent", args: ["exploration-alert", { enemyIds: woken.map((enemy) => enemy.id) }] };
  }
  function progressWakeBosses(env, woken) {
    const zone = env.deps.getZone(env.owner.currentZoneId);
    for (const enemy of woken) if (enemy.isBoss && !enemy.roomInvader && !enemy.uninvited) {
      env.deps.restartHiddenJournalBossRun(enemy, zone);
      env.deps.beginRoomBossRules(zone);
    }
  }
  function progressCanEnterMotionTile(env, run) {
    const motion = run.motion;
    if (!motion || motion.elapsed >= motion.duration / 2 || run.motionTimeMs - motion.startedAt < motion.duration / 2) return true;
    return env.deps.canPlaceGridFootprint(env.deps.getHeroStepBlockedCells(), motion.to.gx, motion.to.gy, { columns: 1, rows: 1 });
  }
  function progressMoving(env) {
    const run = env.deps.actExplorationState.current(env.owner);
    return !!run?.motion || env.deps.actExplorationMotion.freeMoving(run);
  }
  function progressTakeWalkedMs(env) {
    const run = env.deps.actExplorationState.current(env.owner), ms = run ? env.memo.walkedMs.get(run) || 0 : 0;
    if (run) env.memo.walkedMs.delete(run);
    return ms;
  }

  // modules/act-exploration-progress-classic.mjs
  var memo = { commandStalls: /* @__PURE__ */ new WeakMap(), lootWalks: /* @__PURE__ */ new WeakMap(), walkedMs: /* @__PURE__ */ new WeakMap(), inscriptionVisits: /* @__PURE__ */ new WeakMap(), autoHolds: /* @__PURE__ */ new WeakMap(), manualSteerHolds: /* @__PURE__ */ new WeakMap() };
  var deps = {
    get getCombatTime() {
      return getCombatTime;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get beginExplorationGridStep() {
      return beginExplorationGridStep;
    },
    get isPlayerAttackRecovering() {
      return isPlayerAttackRecovering;
    },
    get actExplorationDoors() {
      return actExplorationDoors;
    },
    get JOURNAL_DB() {
      return JOURNAL_DB;
    },
    get unlockJournalEntry() {
      return unlockJournalEntry;
    },
    get actExplorationMotion() {
      return actExplorationMotion;
    },
    get continuePlayerExplorationApproach() {
      return continuePlayerExplorationApproach;
    },
    get swapSummonOutOfHeroTile() {
      return swapSummonOutOfHeroTile;
    },
    get bossMoves() {
      return bossMoves;
    },
    get getHeroStepBlockedCells() {
      return getHeroStepBlockedCells;
    },
    get canPlaceGridFootprint() {
      return canPlaceGridFootprint;
    },
    get roomInvaders() {
      return roomInvaders;
    },
    get woodsmanBattle() {
      return woodsmanBattle;
    },
    get WOODSMAN_BATTLE() {
      return WOODSMAN_BATTLE;
    },
    get getZone() {
      return getZone;
    },
    get restartHiddenJournalBossRun() {
      return restartHiddenJournalBossRun;
    },
    get beginRoomBossRules() {
      return beginRoomBossRules;
    },
    ground: actExplorationState.groundLoot,
    get objects() {
      return actExplorationProgress.objects;
    },
    get blessingGreed() {
      return window.GameModules.combat.supports.blessingGreed;
    }
  };
  var effects = { get queueImportantSave() {
    return queueImportantSave;
  }, get addBattleFx() {
    return addBattleFx;
  }, get dispatchRuntimeEvent() {
    return dispatchRuntimeEvent;
  }, get collectExplorationFloorLoot() {
    return collectExplorationFloorLoot;
  } };
  function present(iterator) {
    let step = iterator.next();
    while (!step.done) {
      const command = step.value;
      step = iterator.next(effects[command.kind](...command.args));
    }
    return step.value;
  }
  var actExplorationProgress = {
    advance(stats) {
      return present(progressAdvance({ owner: game, deps, memo }, stats));
    },
    tick(now, stats) {
      return present(progressTick({ owner: game, deps, memo }, now, stats));
    },
    moving() {
      return progressMoving({ owner: game, deps, memo });
    },
    takeWalkedMs() {
      return progressTakeWalkedMs({ owner: game, deps, memo });
    },
    collectPile(cell) {
      return present(progressCollectPile({ owner: game, deps, memo }, cell));
    },
    canMove(run) {
      return progressCanMove({ owner: game, deps, memo }, run);
    },
    canFinish() {
      return progressCanFinish({ owner: game, deps, memo });
    },
    beginCompletion(zone) {
      return present(progressBeginCompletion({ owner: game, deps, memo }, zone));
    },
    shouldTrackStall() {
      return progressShouldTrackStall({ owner: game, deps, memo });
    },
    holdPosition(requested) {
      return progressHoldPosition({ owner: game, deps, memo }, requested);
    },
    holdAutoStart(run) {
      return progressHoldAutoStart({ owner: game, deps, memo }, run);
    },
    holdAutoManual(run) {
      return progressHoldAutoManual({ owner: game, deps, memo }, run);
    },
    clearManualSteerHold(run) {
      return progressClearManualSteerHold({ owner: game, deps, memo }, run);
    },
    runMode(run, state = game) {
      return progressRunMode({ owner: game, deps, memo }, run, state);
    },
    startMode(settings) {
      return progressStartMode(settings);
    },
    waiting(state) {
      return progressWaiting({ owner: game, deps, memo }, state);
    },
    deferDeparture(state) {
      return progressDeferDeparture({ owner: game, deps, memo }, state);
    },
    stopAfterCompletion(state) {
      return progressStopAfterCompletion({ owner: game, deps, memo }, state);
    },
    depart(state) {
      return present(progressDepart({ owner: game, deps, memo }, state));
    },
    reconcileDeparture(state) {
      return present(progressReconcileDeparture({ owner: game, deps, memo }, state));
    },
    defeat(state) {
      return progressDefeat({ owner: game, deps, memo }, state);
    }
  };
  safeExposeGlobals({ actExplorationProgress });
})();
