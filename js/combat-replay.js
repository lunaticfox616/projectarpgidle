// GENERATED from modules/combat-replay*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/combat/replay-rules.mjs
  var ReplayRules = class {
    constructor(deps) {
      this.deps = deps;
    }
    cloneBackgroundCombatState(state) {
      let snapshot = JSON.parse(JSON.stringify(state));
      return snapshot;
    }
    getBackgroundTotalExperience(state) {
      if (!state || typeof state !== "object") return 0;
      let level = Math.max(1, Math.floor(Number(state.level) || 1));
      let total = Math.max(0, Math.floor(Number(state.exp) || 0));
      if (typeof this.deps.getExpReq !== "function") return total;
      for (let currentLevel = 1; currentLevel < level; currentLevel++) {
        total += Math.max(0, Math.floor(Number(this.deps.getExpReq(currentLevel)) || 0));
      }
      return total;
    }
    createBackgroundCombatMetrics(state) {
      const current = state || {}, deathLog = current.lastDeathLog || {};
      return {
        kills: 0,
        exp: 0,
        expLost: 0,
        deaths: 0,
        consecutiveDeaths: 0,
        lastKillAtMs: 0,
        elapsedSinceLastKillMs: 0,
        previousLevel: Math.max(1, Math.floor(Number(current.level) || 1)),
        previousExp: Math.max(0, Math.floor(Number(current.exp) || 0)),
        previousKills: Math.max(0, Math.floor(Number(current.loopKills) || 0)),
        previousDeaths: Math.max(0, Math.floor(Number(current.loopDeaths) || 0)),
        previousDeathAt: Math.max(0, Number(deathLog.at) || 0)
      };
    }
    updateKillMetrics(metrics, state, elapsedMs) {
      let kills = Math.max(0, Math.floor(Number(state.loopKills) || 0));
      let killDelta = kills >= metrics.previousKills ? kills - metrics.previousKills : kills;
      metrics.kills += killDelta;
      if (killDelta > 0) {
        metrics.consecutiveDeaths = 0;
        metrics.lastKillAtMs = Math.max(0, Number(elapsedMs) || 0);
      }
      metrics.previousKills = kills;
    }
    updateDeathMetrics(metrics, state) {
      const deathLog = state.lastDeathLog || {};
      let deaths = Math.max(0, Math.floor(Number(state.loopDeaths) || 0));
      let deathDelta = deaths >= metrics.previousDeaths ? deaths - metrics.previousDeaths : deaths;
      metrics.deaths += deathDelta;
      if (deathDelta > 0) metrics.consecutiveDeaths += deathDelta;
      metrics.previousDeaths = deaths;
      let deathAt = Math.max(0, Number(deathLog.at) || 0);
      let lostThisStep = deathAt > metrics.previousDeathAt ? Math.max(0, Math.floor(Number(deathLog.expLost) || 0)) : 0;
      metrics.previousDeathAt = Math.max(metrics.previousDeathAt, deathAt);
      return lostThisStep;
    }
    updateExperienceMetrics(metrics, state, lostThisStep) {
      let level = Math.max(1, Math.floor(Number(state.level) || 1));
      let exp = Math.max(0, Math.floor(Number(state.exp) || 0));
      let earnedThisStep = exp - metrics.previousExp;
      if (level > metrics.previousLevel && typeof this.deps.getExpReq === "function") {
        for (let currentLevel = metrics.previousLevel; currentLevel < level; currentLevel++) {
          earnedThisStep += Math.max(0, Math.floor(Number(this.deps.getExpReq(currentLevel)) || 0));
        }
      } else if (level < metrics.previousLevel) {
        earnedThisStep = this.getBackgroundTotalExperience(state) - this.getBackgroundTotalExperience({ level: metrics.previousLevel, exp: metrics.previousExp });
      }
      metrics.exp += Math.max(0, earnedThisStep + lostThisStep);
      metrics.expLost += lostThisStep;
      metrics.previousLevel = level;
      metrics.previousExp = exp;
    }
    updateBackgroundCombatMetrics(metrics, state, elapsedMs) {
      if (!metrics || !state) return;
      this.updateKillMetrics(metrics, state, elapsedMs);
      const lostThisStep = this.updateDeathMetrics(metrics, state);
      this.updateExperienceMetrics(metrics, state, lostThisStep);
      metrics.elapsedSinceLastKillMs = Math.max(0, (Number(elapsedMs) || 0) - metrics.lastKillAtMs);
    }
    shouldStopBackgroundReplay(state) {
      if (!state || state.playerHp <= 0 || state.combatHalted) return true;
      return !!this.deps.isCombatDecisionPending(state);
    }
    /** estimated: some maps were projected (realMs of real combat measured their pace, projectedMs followed it). */
    finishCombatReplay(replay2) {
      let overflowSalvaged = replay2.game.backgroundOverflowSalvageCount;
      let stopReason = replay2.game.backgroundStopReason;
      let projectedMs = replay2.projection ? replay2.projection.projectedMs : 0;
      for (let field of ["isBackgroundCalculation", "backgroundOverflowSalvageCount", "backgroundKillMix", "backgroundStopReason", "backgroundProjecting"]) delete replay2.game[field];
      return {
        game: replay2.game,
        runtime: replay2.runtime,
        steps: replay2.processedMs / 100,
        simulatedNow: replay2.simulatedNow,
        processedMs: replay2.processedMs,
        metrics: replay2.metrics,
        stopped: replay2.processedMs < replay2.elapsedMs,
        stopReason,
        overflowSalvaged,
        skippedMs: replay2.skippedMs,
        estimated: projectedMs > 0,
        realMs: replay2.processedMs - projectedMs,
        projectedMs,
        heldZone: !!(replay2.projection && replay2.projection.held),
        cutMs: replay2.projection ? replay2.projection.cutMs : 0
      };
    }
    /** Only discard unprocessed time. Never extrapolate rewards or advance combat timers across it. */
    applyCombatReplayControl(replay2, control) {
      if (!control) return;
      const tier = Math.max(replay2.accelerationTier, Math.min(4, Math.floor(control.tier || 0)));
      const remaining = replay2.elapsedMs - replay2.processedMs;
      const retained = control.finish ? 0 : Math.floor(remaining / 2 ** (tier - replay2.accelerationTier) / 100) * 100;
      replay2.skippedMs += remaining - retained;
      replay2.elapsedMs = replay2.processedMs + retained;
      replay2.accelerationTier = tier;
    }
    /** The new time away of a return mid-settlement joins what is left. Each speed-up the player chose keeps half of it, as it kept
    * half of the time left then (applyCombatReplayControl). */
    extendCombatReplay(replay2, extraMs) {
      if (!(extraMs > 0)) return;
      const retained = Math.floor(extraMs / 2 ** replay2.accelerationTier / 100) * 100;
      replay2.skippedMs += extraMs - retained;
      replay2.elapsedMs += retained;
    }
  };

  // modules/combat/replay-projection.mjs
  var PACK_KINDS = ["boss", "encounter", "elite", "ordinary"];
  var NO_KILLS = Object.freeze({ full: 0, partial: 0, share: 0 });
  var ReplayProjection = class {
    constructor(owner, deps, rules) {
      this.owner = owner;
      this.deps = deps;
      this.rules = rules;
    }
    projectionZoneKey(state) {
      const zone = this.deps.getZone(state.currentZoneId);
      if (!zone) return String(state.currentZoneId);
      if (zone.type === "atlasMap") return `atlas|${state.atlas && state.atlas.run ? state.atlas.run.map.tier : "closed"}`;
      return `${zone.id}|${zone.name}|${zone.tier}`;
    }
    /** A fight or rule the projection does not model: an entry-ticket boss, the woodsman, a void rift, a hunt that stops at the map's end. */
    isProjectionHeldBack(state) {
      const rift = !!(state.voidRift && state.voidRift.active);
      return !!(state.inTicketBossFight || state.woodsmanBuildLock || rift || state.settings.mapCompleteAction === "stop");
    }
    isProjectionStopped(state) {
      return !!(this.rules.shouldStopBackgroundReplay(state) || state.backgroundStopReason);
    }
    isProjectionEligible(state) {
      const zone = this.deps.getZone(state.currentZoneId);
      if (!zone || !this.deps.rules.zoneTypes.includes(zone.type) || !this.deps.actExplorationState.current(state)) return false;
      return !this.isProjectionHeldBack(state) && !this.isProjectionStopped(state);
    }
    // ------------------------------------------------------------------ measuring the real part
    projectionPackKind(pack) {
      if (pack.stage !== null && pack.stage !== void 0) return "boss";
      if (pack.encounter) return "encounter";
      return pack.eliteIds.length ? "elite" : "ordinary";
    }
    /** The living members of a pack, still waiting in their room or already in the fight. */
    projectionPackMembers(pack, state) {
      return pack.aliveIds.map((id) => pack.waiting.find((enemy) => enemy.id === id) || state.enemies.find((enemy) => enemy.id === id)).filter(Boolean);
    }
    openProjectionCycle(run, state, atMs) {
      const packs = run.packs.filter((pack) => !pack.objectId).map((pack) => ({
        pack,
        kind: this.projectionPackKind(pack),
        size: pack.aliveIds.length,
        hp: this.projectionPackMembers(pack, state).reduce((sum, enemy) => sum + (enemy.maxHp || 0), 0)
      }));
      return { key: this.projectionZoneKey(state), run, packs, startMs: atMs, deaths: state.loopDeaths || 0 };
    }
    countProjectionObjects(run) {
      const use = {};
      for (const row of run.objects && run.objects.entries || []) {
        const count = use[row.kind] || (use[row.kind] = { seen: 0, used: 0 });
        count.seen++;
        if (row.phase === "spent") count.used++;
      }
      return use;
    }
    closeProjectionCycle(log, state, atMs) {
      const cycle = log.open;
      log.open = null;
      if (!cycle) return;
      const packs = cycle.packs.map((row) => ({
        kind: row.kind,
        size: row.size,
        hp: row.hp,
        killed: Math.max(0, row.size - row.pack.aliveIds.length)
      }));
      log.closed.push({
        key: cycle.key,
        ms: atMs - cycle.startMs,
        packs,
        objects: this.countProjectionObjects(cycle.run),
        deaths: Math.max(0, (state.loopDeaths || 0) - cycle.deaths),
        level: state.level || 1
      });
      log.sinceMeasureMs = 0;
    }
    readProjectionPackModel(cycles) {
      const model = {};
      for (const kind of PACK_KINDS) {
        const rows = cycles.flatMap((cycle) => cycle.packs.filter((row) => row.kind === kind && row.size > 0));
        if (!rows.length) continue;
        const partial = rows.filter((row) => row.killed > 0 && row.killed < row.size);
        model[kind] = {
          full: rows.filter((row) => row.killed >= row.size).length / rows.length,
          partial: partial.length / rows.length,
          share: partial.length ? partial.reduce((sum, row) => sum + row.killed / row.size, 0) / partial.length : 0
        };
      }
      model.encounter = model.encounter || model.elite || model.ordinary || NO_KILLS;
      return model;
    }
    /** Two maps cannot measure a rare kind, so each follows its offline rule: supply chests and nests open only by hand (never
     * offline), pots and crates share one measured break rate, and a sealed chest or an ambush on the route uses its own rate
     * once enough were seen, else how much of the map the route covers (the ordinary packs' full-kill rate). */
    readProjectionObjectRates(cycles, packs) {
      const total = (kinds) => cycles.reduce((sum, cycle) => kinds.reduce((acc, kind) => {
        const use = cycle.objects[kind];
        return use ? { seen: acc.seen + use.seen, used: acc.used + use.used } : acc;
      }, sum), { seen: 0, used: 0 });
      const props = total(["pot", "crate"]), coverage = (packs.ordinary || NO_KILLS).full;
      const route = (kind) => {
        const seen = total([kind]);
        return seen.seen >= this.deps.rules.objectSampleMin ? seen.used / seen.seen : coverage;
      };
      const breakRate = props.seen ? props.used / props.seen : 0;
      return { chest: 0, nest: 0, pot: breakRate, crate: breakRate, sealed: route("sealed"), ambush: route("ambush") };
    }
    /** Newest first: every cycle at the hero's newest level, and older ones only while too few or too short were measured. A hero
     * that grows (the first hour of a loop levels every minute) is projected at its newest pace, a steady one on every cycle. */
    selectCalibrationCycles(cycles) {
      const picked = [], newest = cycles.length ? cycles[cycles.length - 1].level : 0;
      let measuredMs = 0;
      for (let index = cycles.length - 1; index >= 0; index--) {
        const enough = picked.length >= this.deps.rules.minCycles && measuredMs >= this.deps.rules.minMeasuredMs;
        if (enough && cycles[index].level < newest) break;
        picked.push(cycles[index]);
        measuredMs += cycles[index].ms;
      }
      return { cycles: picked, measuredMs, level: newest };
    }
    /** Mean map time and life killed per map. A cycle from an older level counts half as much per level behind the newest: a
     * growing hero's newest maps are its pace (the first hour of a loop: map time 140 s at level 8, 58 s at level 15), older
     * ones only fill the minimum. A steady hero's cycles share one level and count evenly. */
    readProjectionPace(cycles, level) {
      let total = 0, ms = 0, hp = 0;
      for (const cycle of cycles) {
        const weight = 0.5 ** Math.max(0, level - cycle.level);
        total += weight;
        ms += weight * cycle.ms;
        hp += weight * cycle.packs.reduce((sum, row) => sum + row.hp * row.killed / Math.max(1, row.size), 0);
      }
      return { cycleMs: ms / total, killedHp: hp / total };
    }
    /** Pace only: never a reward. Null until the zone has enough whole cycles, and enough time in them. */
    readProjectionCalibration(log, key) {
      const { cycles, measuredMs, level } = this.selectCalibrationCycles(log.closed.filter((cycle) => cycle.key === key && cycle.ms > 0));
      if (cycles.length < this.deps.rules.minCycles || measuredMs < this.deps.rules.minMeasuredMs) return null;
      const packs = this.readProjectionPackModel(cycles);
      return {
        key,
        level,
        ...this.readProjectionPace(cycles, level),
        packs,
        objects: this.readProjectionObjectRates(cycles, packs),
        deathRate: Math.min(1, cycles.reduce((sum, cycle) => sum + cycle.deaths, 0) / cycles.length)
      };
    }
    /** Every whole cycle of the zone so far, so a cycle measured again during the projection refines the pace. */
    readyProjectionCalibration(log, state, realMs) {
      if (realMs < this.deps.rules.minRealMs || !this.isProjectionEligible(state)) return null;
      const key = this.projectionZoneKey(state), calibration = this.readProjectionCalibration(log, key);
      if (calibration) log.cache.set(key, calibration);
      return log.cache.get(key) || null;
    }
    /** advanceCombatReplay calls this after every real tick. A run that was not there before closes the last cycle and opens a
     * new one; returns true when the projection takes over at this map's start, so the real slice stops exactly here. A cycle
     * due to be measured is measured first: taking over here would hand it straight back (no progress, 0.1 s per round trip). */
    observeReplayCycle(replay2, state) {
      const log = replay2.projection, run = log ? this.deps.actExplorationState.current(state) : null;
      if (!run || run.arrival || run === log.run) return false;
      this.closeProjectionCycle(log, state, replay2.processedMs);
      log.run = run;
      log.open = this.openProjectionCycle(run, state, replay2.processedMs);
      const calibration = this.readyProjectionCalibration(log, state, replay2.processedMs - log.projectedMs);
      log.active = calibration && !this.isProjectionRemeasureDue(replay2, calibration, state) ? calibration : null;
      log.fresh = !!log.active;
      return !!log.active;
    }
    // ------------------------------------------------------------------ projecting one map
    /** The next map at once: travel time is in the measured cycle. A death or a completion may already have set out. */
    beginProjectedEncounter() {
      if (this.deps.actExplorationState.current(this.owner.game) || !(this.owner.game.moveTimer > 0)) this.deps.startMoving(false);
      this.owner.game.moveTimer = 0;
      this.deps.startEncounterRun();
    }
    /** Whether the hero falls in this map, else whether it reaches the boss before the time runs out (share < 1: the last map). */
    planProjectedCycle(calibration, share) {
      const dies = Math.random() < calibration.deathRate * share;
      return { dies, bossDown: !dies && Math.random() < share, share };
    }
    chooseProjectedMembers(pack, calibration, plan) {
      const members = this.projectionPackMembers(pack, this.owner.game), kind = this.projectionPackKind(pack);
      if (kind === "boss") return plan.bossDown ? members : [];
      if (plan.bossDown && pack.eliteIds.length) return members;
      const model = calibration.packs[kind] || NO_KILLS, roll = Math.random();
      if (roll < model.full * plan.share) return members;
      if (roll >= (model.full + model.partial) * plan.share) return [];
      return members.filter(() => Math.random() < model.share);
    }
    /** The real kill path on a board of one: rewards roll fresh, corpse effects find nobody else, the pack and map update. */
    killProjectedEnemy(pack, enemy, pStats) {
      if (pack) pack.waiting = pack.waiting.filter((row) => row !== enemy);
      const board = this.owner.game.enemies.filter((row) => row !== enemy);
      enemy.hp = 0;
      this.owner.game.enemies = [enemy];
      this.deps.handleEnemyDeath(enemy, pStats);
      this.owner.game.enemies = board.concat(this.owner.game.enemies);
      return enemy.maxHp || 0;
    }
    isProjectionInterrupted() {
      return this.isProjectionHeldBack(this.owner.game) || this.isProjectionStopped(this.owner.game);
    }
    killProjectedPacks(run, calibration, plan, pStats) {
      const stage = (pack) => pack.stage === null || pack.stage === void 0 ? -1 : pack.stage;
      let hp = 0;
      for (const pack of run.packs.filter((row) => !row.objectId).sort((a, b) => stage(a) - stage(b))) {
        for (const enemy of this.chooseProjectedMembers(pack, calibration, plan)) {
          hp += this.killProjectedEnemy(pack, enemy, pStats);
          if (this.isProjectionInterrupted()) return { hp, interrupted: true };
        }
      }
      return { hp, interrupted: false };
    }
    settleProjectedObjects(run, calibration, plan, pStats) {
      for (const row of run.objects && run.objects.entries || []) {
        if (row.phase !== "ready" || Math.random() >= (calibration.objects[row.kind] || 0) * plan.share) continue;
        this.deps.actExplorationProgress.objects.settleProjected(run, row, (enemy) => this.killProjectedEnemy(null, enemy, pStats));
        if (this.isProjectionInterrupted()) return true;
      }
      return false;
    }
    /** The hero falls (the real defeat rule: experience, atlas portal, act retreat) or, with the boss down, the real completion. */
    finishProjectedCycle(plan, pStats) {
      if (plan.dies) {
        this.owner.game.playerHp = 0;
        this.deps.handlePlayerDefeat(this.deps.getZone(this.owner.game.currentZoneId), pStats, null, { fatalElement: "other", noToast: true });
      } else if (this.deps.actExplorationProgress.canFinish()) this.deps.playerStatCache.during(this.deps.finishEncounterRun);
    }
    /** A map takes the measured cycle time, stretched or shortened by how much life fell in it against the measured mean. A map
     * the hero falls in keeps the whole time: it fought until it fell (shortened, a dying build ran 9% more maps than real). */
    projectedCycleMs(replay2, calibration, plan, outcome) {
      const [low, high] = this.deps.rules.timeScale, expected = plan.dies ? 0 : calibration.killedHp * plan.share;
      const scale = expected > 0 ? Math.min(high, Math.max(outcome.interrupted ? 0 : low, outcome.hp / expected)) : 1;
      return Math.min(replay2.elapsedMs - replay2.processedMs, Math.round(calibration.cycleMs * plan.share * scale / 100) * 100);
    }
    advanceProjectedClock(replay2, ms) {
      if (!(ms > 0)) return;
      this.owner.game.combatTimeMs = this.deps.getCombatTime() + ms;
      const loop = this.owner.game.records && this.owner.game.records.currentLoop;
      if (loop) Object.assign(loop, { activeMs: Math.max(0, Math.floor(loop.activeMs || 0)) + ms, lastTickAt: this.owner.game.combatTimeMs });
      replay2.simulatedNow = this.owner.game.combatTimeMs;
      replay2.processedMs += ms;
      replay2.projection.projectedMs += ms;
      replay2.projection.sinceMeasureMs += ms;
    }
    /** Another real cycle is due after a level-up since the newest measured cycle ended (until realHoldMs of real combat: the
     * first hour of a loop levels every few minutes and gets faster with each, a late hero levels every few hours), or every
     * remeasureEveryMs of projection while realBudgetMs lasts. */
    isProjectionRemeasureDue(replay2, calibration, state) {
      const log = replay2.projection, realMs = replay2.processedMs - log.projectedMs;
      if ((state.level || 1) > calibration.level) return realMs < this.deps.rules.realHoldMs;
      return log.sinceMeasureMs >= this.deps.rules.remeasureEveryMs && realMs < this.deps.rules.realBudgetMs;
    }
    /** One projected map. Returns 'start' when real combat takes this map from its start (a new zone, a rule it does not model,
     * a cycle due to be measured), 'middle' when it stops inside it (a void rift opened), else ''. */
    projectReplayCycle(replay2, calibration, fresh) {
      if (!fresh) this.beginProjectedEncounter();
      if (!this.isProjectionEligible(this.owner.game) || this.projectionZoneKey(this.owner.game) !== calibration.key) return "start";
      if (this.isProjectionRemeasureDue(replay2, calibration, this.owner.game)) return "start";
      const plan = this.planProjectedCycle(calibration, Math.min(1, (replay2.elapsedMs - replay2.processedMs) / calibration.cycleMs));
      const pStats = this.deps.getPlayerStats(), run = this.deps.actExplorationState.current(this.owner.game);
      const outcome = this.killProjectedPacks(run, calibration, plan, pStats);
      if (!outcome.interrupted) outcome.interrupted = this.settleProjectedObjects(run, calibration, plan, pStats);
      if (!outcome.interrupted) this.finishProjectedCycle(plan, pStats);
      this.advanceProjectedClock(replay2, this.projectedCycleMs(replay2, calibration, plan, outcome));
      this.deps.clearBackgroundBuildMemo(this.owner.game);
      this.rules.updateBackgroundCombatMetrics(replay2.metrics, this.owner.game, replay2.processedMs);
      return outcome.interrupted && !this.isProjectionStopped(this.owner.game) ? "middle" : "";
    }
    /** Real combat goes on from here. A map the projection had not touched yet is measured; one it was inside is not. */
    handBackProjection(log, where) {
      log.active = null;
      log.open = null;
      log.run = where === "start" ? null : this.deps.actExplorationState.current(this.owner.game);
    }
    /** Projected maps for one slice, on the replay's own state like advanceCombatReplay. */
    projectReplaySlice(replay2, budgetMs) {
      const committed = this.owner.game, committedRuntime = this.deps.captureCombatRuntime(), log = replay2.projection, started = this.deps.performance.now();
      try {
        this.owner.game = replay2.game;
        this.deps.restoreCombatRuntime(replay2.runtime);
        this.owner.game.backgroundProjecting = true;
        let handBack = "";
        while (!handBack && replay2.processedMs < replay2.elapsedMs && !this.isProjectionStopped(this.owner.game)) {
          handBack = this.deps.combatEquipmentStats.withinTick(() => this.projectReplayCycle(replay2, log.active, log.fresh));
          log.fresh = false;
          if (this.deps.performance.now() - started >= budgetMs) break;
        }
        if (handBack) this.handBackProjection(log, handBack);
        delete this.owner.game.backgroundProjecting;
        replay2.game = this.owner.game;
        replay2.runtime = this.deps.captureCombatRuntime();
      } finally {
        this.owner.game = committed;
        this.deps.restoreCombatRuntime(committedRuntime);
      }
      return replay2.processedMs < replay2.elapsedMs && !this.isProjectionStopped(replay2.game);
    }
    // ------------------------------------------------------------------ settlement entry points (js/combat-replay.js)
    /** The settlement path (js/ui.js) projects; the diagnostic simulateBackgroundCombat stays fully real. The map running when
     * the player left is never measured: it may be a boss about to fall. */
    attachReplayProjection(replay2) {
      replay2.projection = {
        run: this.deps.actExplorationState.current(replay2.game),
        open: null,
        closed: [],
        cache: /* @__PURE__ */ new Map(),
        active: null,
        fresh: false,
        projectedMs: 0,
        sinceMeasureMs: 0,
        held: false,
        cutMs: 0
      };
      return replay2;
    }
    /** Real combat the projection never took over: a push through zones it clears at once repeats the zone it is in after
     * realHoldMs (the settlement restores the player's own setting), so that zone is measured and projected; anything still
     * real at realCapMs (a zone type it does not model, a map that never ends) stops there and the result says so. */
    limitLongRealCombat(replay2) {
      const log = replay2.projection, realMs = replay2.processedMs - log.projectedMs, settings = replay2.game.settings;
      if (realMs >= this.deps.rules.realHoldMs && !log.held && !["repeatZone", "stop"].includes(settings.mapCompleteAction) && this.isHoldUseful(replay2.game)) {
        settings.mapCompleteAction = "repeatZone";
        log.held = true;
      }
      if (realMs < this.deps.rules.realCapMs) return;
      log.cutMs += replay2.elapsedMs - replay2.processedMs;
      replay2.skippedMs += replay2.elapsedMs - replay2.processedMs;
      replay2.elapsedMs = replay2.processedMs;
    }
    /** The hold only helps in a zone the projection models (or before any zone): the labyrinth, the underworld and the other floor
     * contents are never projected, so holding them only stopped their climb at realHoldMs. */
    isHoldUseful(state) {
      const type = (this.deps.getZone(state.currentZoneId) || {}).type;
      return !type || this.deps.rules.zoneTypes.includes(type);
    }
    /** For the progress card: 'measure' before the first projected map, 'project' while projecting, '' otherwise. */
    getReplayProjectionPhase(replay2) {
      const log = replay2.projection;
      if (!log) return "";
      if (log.active) return "project";
      return log.projectedMs > 0 ? "" : "measure";
    }
  };

  // modules/combat/replay.mjs
  var REPLAY_SLICE_MS = 12;
  function checkReplayCancelled(options) {
    if (!options.isCancelled?.()) return;
    const error = new Error("정산 작업이 종료되었습니다.");
    error.name = "AbortError";
    throw error;
  }
  var CombatReplay = class {
    constructor(owner, deps) {
      this.owner = owner;
      this.deps = deps;
      this.rules = new ReplayRules(deps);
      this.projection = new ReplayProjection(owner, deps, this.rules);
    }
    // Runs the real combat rules. No reward extrapolation and no process-wide clock replacement.
    // A slice borrows the current state owner synchronously; callbacks always see committed state.
    // The settlement path may project the rest of a long absence from measured pace (replay-projection.mjs).
    /** @param {number} elapsedMs @param {typeof defaultGame} snapshot @param {number} startNowMs */
    createCombatReplay(elapsedMs, snapshot, startNowMs) {
      if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError("Replay duration must be finite and non-negative");
      let state = this.rules.cloneBackgroundCombatState(snapshot);
      state.isBackgroundCalculation = true;
      this.deps.playerStatCache.adopt(state);
      state.backgroundOverflowSalvageCount = 0;
      state.backgroundKillMix = { normal: 0, elite: 0, boss: 0 };
      state.backgroundStopReason = null;
      return {
        game: state,
        elapsedMs: Math.max(0, Math.floor(elapsedMs / 100) * 100),
        processedMs: 0,
        skippedMs: 0,
        accelerationTier: 0,
        simulatedNow: state.combatTimeMs || startNowMs || Date.now(),
        metrics: this.rules.createBackgroundCombatMetrics(state),
        // structuredClone keeps the stage rows of one cast sharing their wave/whirl state (one hit per monster).
        runtime: this.deps.structuredClone(this.deps.captureCombatRuntime())
      };
    }
    /** Execute at most budgetMs of CPU work; restore all shared state before yielding or throwing. */
    advanceCombatReplay(replay2, budgetMs) {
      let committed = this.owner.game;
      let committedRuntime = this.deps.captureCombatRuntime();
      let started = this.deps.performance.now();
      try {
        this.owner.game = replay2.game;
        this.deps.restoreCombatRuntime(replay2.runtime);
        do {
          if (replay2.processedMs >= replay2.elapsedMs || this.rules.shouldStopBackgroundReplay(this.owner.game)) break;
          replay2.simulatedNow += 100;
          const killsBefore = this.owner.game.loopKills;
          this.deps.combatEquipmentStats.withinTick(() => this.deps.coreLoop(replay2.simulatedNow));
          if (this.owner.game.loopKills !== killsBefore) this.deps.clearBackgroundBuildMemo(this.owner.game);
          replay2.processedMs += 100;
          this.rules.updateBackgroundCombatMetrics(replay2.metrics, this.owner.game, replay2.processedMs);
          if (this.projection.observeReplayCycle(replay2, this.owner.game)) break;
          if (this.owner.game.backgroundStopReason) break;
        } while (this.deps.performance.now() - started < budgetMs);
        replay2.game = this.owner.game;
        replay2.runtime = this.deps.captureCombatRuntime();
      } finally {
        this.owner.game = committed;
        this.deps.restoreCombatRuntime(committedRuntime);
      }
      return replay2.processedMs < replay2.elapsedMs && !this.rules.shouldStopBackgroundReplay(replay2.game) && !replay2.game.backgroundStopReason;
    }
    /**
    * @typedef {{elapsedMs:number, snapshot:typeof defaultGame, startNowMs?:number, project?:boolean,
    * isPaused?:()=>boolean, isCancelled?:()=>boolean, getElapsedMs?:()=>number, getControl?:()=>({tier:number,finish:boolean}),
    * onProgress?:(doneMs:number,totalMs:number,skippedMs:number,phase:string)=>void}} CombatReplayOptions
    * snapshot must already have passed save migration. Durations are effective combat milliseconds.
    * project: measure the pace with real combat, then project the rest (replay-projection.mjs). The settlement uses it.
    * getElapsedMs: read when the page comes back from a pause: the whole duration to settle by now. The replay goes on where it
    * stopped and takes the new time away too (it used to give up and replay the whole time away from the start on the return).
    */
    /** @param {CombatReplayOptions} options Synchronous replay for diagnostics. Does not commit or persist. */
    simulateBackgroundCombat(options) {
      let replay2 = this.createCombatReplay(options.elapsedMs, options.snapshot, options.startNowMs);
      let pending;
      do {
        pending = this.advanceCombatReplay(replay2, 50);
      } while (pending);
      return this.rules.finishCombatReplay(replay2);
    }
    /** Waits while the page is away (no CPU while the app is inactive), then grows the replay to the duration due by now. */
    async waitCombatReplayPause(replay2, options, durationMs) {
      if (!options.isPaused?.()) return durationMs;
      while (options.isPaused()) {
        checkReplayCancelled(options);
        await this.deps.scheduler.delay(250);
      }
      checkReplayCancelled(options);
      const dueMs = Math.max(durationMs, options.getElapsedMs ? options.getElapsedMs() : durationMs);
      this.rules.extendCombatReplay(replay2, Math.floor(dueMs / 100) * 100 - Math.floor(durationMs / 100) * 100);
      return dueMs;
    }
    /** @param {CombatReplayOptions} options Progress callbacks run outside the replay state and may throw. */
    async simulateBackgroundCombatChunked(options) {
      checkReplayCancelled(options);
      let replay2 = this.createCombatReplay(options.elapsedMs, options.snapshot, options.startNowMs);
      if (options.project) this.projection.attachReplayProjection(replay2);
      let pending, durationMs = options.elapsedMs;
      do {
        durationMs = await this.waitCombatReplayPause(replay2, options, durationMs);
        checkReplayCancelled(options);
        this.rules.applyCombatReplayControl(replay2, options.getControl?.());
        pending = this.advanceProjectedReplay(replay2, REPLAY_SLICE_MS);
        if (options.onProgress) options.onProgress(
          replay2.processedMs + replay2.skippedMs,
          replay2.elapsedMs + replay2.skippedMs,
          replay2.skippedMs,
          this.projection.getReplayProjectionPhase(replay2)
        );
        if (pending) await this.deps.scheduler.waitFrame();
      } while (pending);
      return this.rules.finishCombatReplay(replay2);
    }
    /** One slice: projected maps while a measured zone holds, else real combat (which keeps measuring). */
    advanceProjectedReplay(replay2, budgetMs) {
      if (replay2.projection && replay2.projection.active) return this.projection.projectReplaySlice(replay2, budgetMs);
      if (replay2.projection) this.projection.limitLongRealCombat(replay2);
      return this.advanceCombatReplay(replay2, budgetMs);
    }
  };

  // modules/browser/replay-scheduler.mjs
  function createReplayScheduler(deps) {
    const pending = /* @__PURE__ */ new Set();
    let active = true;
    function waitFrame() {
      if (!active) return Promise.resolve();
      return new Promise((resolve) => {
        let timer = null, frame = null, paintTimer = null, finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          if (timer !== null) deps.clearTimeout(timer);
          if (paintTimer !== null) deps.clearTimeout(paintTimer);
          if (frame !== null && typeof deps.cancelAnimationFrame === "function") deps.cancelAnimationFrame(frame);
          pending.delete(finish);
          resolve();
        };
        pending.add(finish);
        timer = deps.setTimeout(finish, 100);
        if (typeof deps.requestAnimationFrame === "function") frame = deps.requestAnimationFrame(() => {
          frame = null;
          if (!finished) paintTimer = deps.setTimeout(finish, 0);
        });
      });
    }
    function delay(ms) {
      if (!active) return Promise.resolve();
      return new Promise((resolve) => {
        let timer = null;
        const finish = () => {
          if (timer !== null) deps.clearTimeout(timer);
          pending.delete(finish);
          resolve();
        };
        pending.add(finish);
        timer = deps.setTimeout(finish, ms);
      });
    }
    function dispose() {
      active = false;
      for (const finish of pending) finish();
      pending.clear();
    }
    return Object.freeze({ waitFrame, delay, dispose });
  }

  // modules/combat-replay-classic.mjs
  var replay = new CombatReplay(window.GameModules.state, {
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    captureCombatRuntime: function replayCallCaptureCombatRuntime(...args) {
      return captureCombatRuntime(...args);
    },
    clearBackgroundBuildMemo: function replayCallClearBackgroundBuildMemo(...args) {
      return clearBackgroundBuildMemo(...args);
    },
    get combatEquipmentStats() {
      return combatEquipmentStats;
    },
    coreLoop: function replayCallCoreLoop(...args) {
      return coreLoop(...args);
    },
    finishEncounterRun: function replayCallFinishEncounterRun(...args) {
      return finishEncounterRun(...args);
    },
    getCombatTime: function replayCallGetCombatTime(...args) {
      return getCombatTime(...args);
    },
    get getExpReq() {
      return getExpReq;
    },
    getPlayerStats: function replayCallGetPlayerStats(...args) {
      return getPlayerStats(...args);
    },
    getZone: function replayCallGetZone(...args) {
      return getZone(...args);
    },
    handleEnemyDeath: function replayCallHandleEnemyDeath(...args) {
      return handleEnemyDeath(...args);
    },
    handlePlayerDefeat: function replayCallHandlePlayerDefeat(...args) {
      return handlePlayerDefeat(...args);
    },
    get isCombatDecisionPending() {
      return isCombatDecisionPending;
    },
    get performance() {
      return performance;
    },
    get playerStatCache() {
      return playerStatCache;
    },
    restoreCombatRuntime: function replayCallRestoreCombatRuntime(...args) {
      return restoreCombatRuntime(...args);
    },
    startEncounterRun: function replayCallStartEncounterRun(...args) {
      return startEncounterRun(...args);
    },
    startMoving: function replayCallStartMoving(...args) {
      return startMoving(...args);
    },
    structuredClone: function cloneReplayRuntime(value) {
      return structuredClone(value);
    },
    rules: OFFLINE_PROJECTION,
    scheduler: createReplayScheduler({
      setTimeout: windowSetTimeout,
      clearTimeout: windowClearTimeout,
      cancelAnimationFrame: typeof cancelAnimationFrame === "function" ? windowCancelAnimationFrame : void 0,
      requestAnimationFrame: typeof requestAnimationFrame === "function" ? windowRequestAnimationFrame : void 0
    })
  });
  safeExposeGlobals({
    cloneBackgroundCombatState: (...args) => replay.rules.cloneBackgroundCombatState(...args),
    getBackgroundTotalExperience: (...args) => replay.rules.getBackgroundTotalExperience(...args),
    updateBackgroundCombatMetrics: (...args) => replay.rules.updateBackgroundCombatMetrics(...args),
    createCombatReplay: (...args) => replay.createCombatReplay(...args),
    shouldStopBackgroundReplay: (...args) => replay.rules.shouldStopBackgroundReplay(...args),
    advanceCombatReplay: (...args) => replay.advanceCombatReplay(...args),
    finishCombatReplay: (...args) => replay.rules.finishCombatReplay(...args),
    simulateBackgroundCombat: (...args) => replay.simulateBackgroundCombat(...args),
    simulateBackgroundCombatChunked: (...args) => replay.simulateBackgroundCombatChunked(...args)
  });
})();
