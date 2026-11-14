// GENERATED from modules/player-stat-cache*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/player-stat-readers.mjs
  function timedStacks(expiresAt, stacks, max, now) {
    return (expiresAt || 0) > now ? Math.max(0, Math.min(max, Math.floor(stacks || 0))) : 0;
  }
  function countInventoryRarity(owner) {
    const inventory = Array.isArray(owner.inventory) ? owner.inventory : [], result = { normal: 0, magic: 0, rare: 0, unique: 0 };
    inventory.forEach((item) => {
      const rarity = item && item.rarity || "normal";
      if (result[rarity] !== void 0) result[rarity]++;
    });
    return result;
  }
  var PLAYER_STAT_READERS = Object.freeze({
    inventoryRarity: (owner) => countInventoryRarity(owner),
    eliteTraitBuff: (owner, now) => {
      const buff = owner.uniqueEliteTraitBuff;
      return buff && (buff.expiresAt || 0) > now ? buff : null;
    },
    incidentBreath: (owner, now) => {
      const breath = owner.incidentBreath;
      return breath && (breath.until || 0) > now ? breath : null;
    },
    cycleBuffEffects: (owner, now, deps) => deps.cycleBuffEffects(owner, now),
    fanaticismStacks: (owner, now, deps) => deps.specialization(owner).fanaticism.stacks,
    playerAilmentCount: (owner) => (owner.playerAilments || []).filter((row) => row && row.time > 0).length,
    leechActive: (owner) => Array.isArray(owner.playerLeechInstances) && owner.playerLeechInstances.some((instance) => instance && Number(instance.remaining) > 0),
    evasionDanceStacks: (owner, now) => {
      const state = owner.uniqueEvasionDanceState || {};
      return (state.expiresAt || 0) > now ? Math.floor(state.stacks || 0) : null;
    },
    shadowStealth: (owner, now) => (owner.shadowStealthExpiresAt || 0) > now,
    killMoveStacks: (owner, now) => {
      const state = owner.uniqueKillMoveStacksState;
      return state && (state.expiresAt || 0) > now ? Math.max(0, Math.floor(state.stacks || 0)) : null;
    },
    regionMoveBonus: (owner, now, deps) => deps.regionAffixEffects.moveBonus(owner, now),
    leechEfficiency: (owner, now) => !!owner.uniqueLeechEfficiencyUntil && now < owner.uniqueLeechEfficiencyUntil,
    aliveEnemies: (owner) => (owner.enemies || []).filter((e) => e && e.hp > 0).length,
    meleeArmorAmpStacks: (owner, now) => (owner.uniqueMeleeArmorAmpExpiresAt || 0) > now ? Math.floor(owner.uniqueMeleeArmorAmpStacks || 0) : null,
    targetCurseCount: (owner) => {
      const target = (owner.enemies || []).find((x) => x && x.hp > 0), debuffs = owner.enemyConditionDebuffs;
      return target && debuffs && Array.isArray(debuffs[target.id]) ? debuffs[target.id].length : 0;
    },
    warriorRhythmStacks: (owner, now) => timedStacks(owner.warriorRhythmExpiresAt, owner.warriorRhythmStacks, 5, now) + timedStacks(owner.warriorRhythmDoubleExpiresAt, owner.warriorRhythmDoubleStacks, 5, now),
    warriorRageStacks: (owner, now, deps) => deps.rageStacks(owner, now),
    warriorRageMultiplier: (owner, now, deps) => deps.rageMultiplier(owner, now),
    gladiatorFlurryStacks: (owner, now) => timedStacks(owner.gladiatorFlurryExpiresAt, owner.gladiatorFlurryStacks, 12, now),
    gladiatorVeteranCrit: (owner) => Math.max(0, Math.floor(owner.gladiatorVeteranCritBonus || 0)),
    gladiatorSwiftGuard: (owner) => !!owner.gladiatorSwiftGuardReady,
    assassinBlurred: (owner) => !!owner.assassinBlurred,
    sinceHitSeconds: (owner, now) => {
      if (!Number.isFinite(owner.playerLastHitAt) || owner.playerLastHitAt <= 0) owner.playerLastHitAt = now;
      return Math.floor(Math.max(0, (now - Math.floor(owner.playerLastHitAt || 0)) / 1e3));
    },
    crusaderAegis: (owner, now) => (owner.crusaderLightningAegisUntil || 0) > now,
    elementalistOverload: (owner, now, deps) => deps.overload(owner),
    guardianEnduranceStacks: (owner, now) => timedStacks(owner.guardianEnduranceExpiresAt, owner.guardianEnduranceStacks, 5, now),
    warriorUnyielding: (owner, now, deps) => deps.ascendancyNodeRules.unyieldingActive(owner, now),
    bladedancerFlowStacks: (owner, now, deps) => deps.ascendancyNodeRules.flowStacks(owner, now),
    grovewardenRooted: (owner, now, deps) => deps.ascendancyNodeRules.rooted(owner, now),
    playerHp: (owner) => owner.playerHp,
    playerEnergyShield: (owner) => owner.playerEnergyShield || 0,
    summonDeathDamagePct: (owner, now) => (owner.summonDeathDamageBuffExpiresAt || 0) > now ? Math.max(0, Number(owner.summonDeathDamageBuffPct || 0)) : 0,
    summonCritAspd: (owner, now) => (owner.summonCritAspdExpiresAt || 0) > now ? Math.max(0, Math.floor(owner.summonCritAspdStacks || 0)) * Math.max(0, Number(owner.summonCritAspdPerStack || 0)) : 0,
    mistralStacks: (owner, now, deps) => deps.mistralStacks(owner, now),
    mossRecoveryOccupied: (owner, now, deps) => deps.mossRecovery(owner)
  });

  // modules/domain/player-stat-tick.mjs
  var fingerprint = (value) => value !== null && typeof value === "object" ? JSON.stringify(value) : value;
  function createPlayerStatTick(deps) {
    let observer = null;
    const readValue = (name, state, now) => {
      if (!observer) return PLAYER_STAT_READERS[name](state, now, deps);
      observer.reading(true);
      try {
        return PLAYER_STAT_READERS[name](state, now, deps);
      } finally {
        observer.reading(false);
      }
    };
    const create = (state) => {
      const now = deps.now(), values = /* @__PURE__ */ new Map(), read = /* @__PURE__ */ new Set(), tests = [];
      const value = (name) => {
        if (!values.has(name)) values.set(name, readValue(name, state, now));
        return values.get(name);
      };
      return {
        get(name) {
          read.add(name);
          return value(name);
        },
        when(name, test) {
          const result = test(value(name));
          tests.push([name, test, result]);
          return result;
        },
        restart() {
          read.clear();
          tests.length = 0;
        },
        reads() {
          return { values: [...read].map((name) => [name, fingerprint(values.get(name))]), tests: tests.slice() };
        }
      };
    };
    const matches = (tick2, reads) => reads.values.every(([name, print]) => Object.is(fingerprint(tick2.get(name)), print)) && reads.tests.every(([name, test, result]) => tick2.when(name, test) === result);
    return Object.freeze({ create, matches, observe: (next) => {
      observer = next || null;
    }, names: Object.keys(PLAYER_STAT_READERS) });
  }

  // modules/domain/player-stat-cache.mjs
  var PlayerStatCache = class {
    constructor(config, deps) {
      this.deps = deps;
      this.CONTEXT_NAMES = Object.keys(config.contextFields);
      this.selfCheckAnswers = config.selfCheckAnswers;
      this.kept = /* @__PURE__ */ new WeakMap();
      this.signed = /* @__PURE__ */ new WeakMap();
      this.settlementStates = /* @__PURE__ */ new WeakSet();
      this.health = { answers: 0, misses: 0, bypassed: 0, checks: 0, repairs: 0, lastRepair: [] };
      this.eventDepth = 0;
      this.generation = 0;
      this.closeCheckPending = false;
      this.verifier = null;
      this.observer = null;
      this.disabled = false;
      this.warned = false;
    }
    usable(state) {
      return !this.disabled && this.eventDepth === 0 && (this.settlementStates.has(state) || !state.isBackgroundCalculation);
    }
    zonePrint(state) {
      return JSON.stringify(this.deps.zone(state.currentZoneId) || null, (key, value) => key === "exploration" ? void 0 : value);
    }
    context(includeBreakdowns, memo, status, state) {
      return {
        includeBreakdowns: !!includeBreakdowns,
        memo,
        status,
        generation: this.generation,
        activeSkill: state.activeSkill,
        zone: this.zonePrint(state),
        fields: JSON.stringify(this.CONTEXT_NAMES.map((name) => state[name]))
      };
    }
    sameContext(a, b) {
      return Object.keys(a).every((key) => a[key] === b[key]);
    }
    calculate(includeBreakdowns, tick2, state) {
      if (!this.observer) return this.deps.calculate(state, includeBreakdowns, tick2);
      this.observer.calculating(true);
      try {
        return this.deps.calculate(state, includeBreakdowns, tick2);
      } finally {
        this.observer.calculating(false);
      }
    }
    slotsOf(state) {
      let slots = this.kept.get(state);
      if (!slots) this.kept.set(state, slots = [null, null]);
      return slots;
    }
    read(includeBreakdowns, memo, status, state) {
      const tick2 = this.deps.tick.create(state);
      if (!this.usable(state)) {
        if (!this.disabled && this.settlementStates.has(state)) return this.readSigned(includeBreakdowns, tick2, state, null);
        this.health.bypassed++;
        return this.deps.finish(this.calculate(includeBreakdowns, tick2, state), includeBreakdowns);
      }
      const slots = this.slotsOf(state), slot = includeBreakdowns ? 1 : 0, current = this.context(includeBreakdowns, memo, status, state);
      const entry = slots[slot];
      if (entry && this.sameContext(entry.context, current) && this.deps.tick.matches(tick2, entry.reads)) return this.answer(entry, includeBreakdowns, state);
      if (this.settlementStates.has(state)) return this.readSigned(includeBreakdowns, tick2, state, current);
      this.health.misses++;
      tick2.restart();
      const core = this.calculate(includeBreakdowns, tick2, state);
      slots[slot] = { context: current, core, reads: tick2.reads(), answers: 0 };
      return this.deps.finish(core, includeBreakdowns);
    }
    settlementContext(includeBreakdowns, state) {
      return JSON.stringify([!!includeBreakdowns, this.CONTEXT_NAMES.map((name) => state[name])]) + this.zonePrint(state);
    }
    matchesSigned(entry, settlement, tick2, state) {
      return !!entry && entry.settlement === settlement && this.deps.tick.matches(tick2, entry.reads) && entry.signature === this.deps.signature(state);
    }
    readSigned(includeBreakdowns, tick2, state, current) {
      let slots = this.signed.get(state);
      if (!slots) this.signed.set(state, slots = [null, null]);
      const slot = includeBreakdowns ? 1 : 0, settlement = this.settlementContext(includeBreakdowns, state), entry = slots[slot];
      if (this.matchesSigned(entry, settlement, tick2, state)) {
        if (current) this.slotsOf(state)[slot] = { context: current, core: entry.core, reads: entry.reads, answers: 0 };
        return this.answer(entry, includeBreakdowns, state);
      }
      if (current) this.health.misses++;
      else this.health.bypassed++;
      tick2.restart();
      const core = this.calculate(includeBreakdowns, tick2, state), reads = tick2.reads();
      if (current) this.slotsOf(state)[slot] = { context: current, core, reads, answers: 0 };
      else slots[slot] = { settlement, signature: this.deps.signature(state), core, reads, answers: 0 };
      return this.deps.finish(core, includeBreakdowns);
    }
    answer(entry, includeBreakdowns, state) {
      this.health.answers++;
      if (++entry.answers % this.selfCheckAnswers === 0) this.selfCheck(entry, includeBreakdowns, state);
      const stats = this.deps.finish(entry.core, includeBreakdowns);
      if (this.verifier) this.verifier(stats, entry, () => this.deps.finish(this.calculate(includeBreakdowns, this.deps.tick.create(state), state), includeBreakdowns));
      return stats;
    }
    changedKeys(before, after) {
      return Object.keys({ ...before, ...after }).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).slice(0, 8);
    }
    selfCheck(entry, includeBreakdowns, state) {
      this.health.checks++;
      const tick2 = this.deps.tick.create(state), fresh = this.calculate(includeBreakdowns, tick2, state);
      if (JSON.stringify(fresh.stats) === JSON.stringify(entry.core.stats)) return;
      this.health.repairs++;
      this.health.lastRepair = this.changedKeys(entry.core.stats, fresh.stats);
      entry.core = fresh;
      entry.reads = tick2.reads();
      if (this.warned) return;
      this.warned = true;
      this.deps.warn(
        "[player stat cache] kept stats went stale and were recalculated (an input changed without notice, see js/player-stat-cache.js):",
        this.health.lastRepair.join(", ")
      );
    }
    adopt(state) {
      this.settlementStates.add(state);
    }
    beginEvent() {
      this.eventDepth++;
      if (this.closeCheckPending) return;
      this.closeCheckPending = true;
      this.deps.defer(() => this.closeAbandonedEvents());
    }
    endEvent() {
      this.eventDepth = Math.max(0, this.eventDepth - 1);
      this.generation++;
    }
    closeAbandonedEvents() {
      this.closeCheckPending = false;
      if (this.eventDepth === 0) return;
      this.eventDepth = 0;
      this.generation++;
      this.deps.warn("[player stat cache] a kill or map completion ended by an error; kept stat calculations resume");
    }
    during(work) {
      this.beginEvent();
      try {
        return work();
      } finally {
        this.endEvent();
      }
    }
    invalidate() {
      this.generation++;
    }
    verify(callback) {
      this.verifier = typeof callback === "function" ? callback : null;
    }
    observe(next) {
      this.observer = next || null;
    }
    setDisabled(flag) {
      this.disabled = !!flag;
    }
    report() {
      return { ...this.health, lastRepair: [...this.health.lastRepair] };
    }
  };
  function createPlayerStatCache(config, deps) {
    const runtime = new PlayerStatCache(config, deps);
    return Object.freeze({
      read: runtime.read.bind(runtime),
      adopt: runtime.adopt.bind(runtime),
      beginEvent: runtime.beginEvent.bind(runtime),
      endEvent: runtime.endEvent.bind(runtime),
      during: runtime.during.bind(runtime),
      invalidate: runtime.invalidate.bind(runtime),
      verify: runtime.verify.bind(runtime),
      observe: runtime.observe.bind(runtime),
      setDisabled: runtime.setDisabled.bind(runtime),
      report: runtime.report.bind(runtime)
    });
  }

  // modules/player-stat-cache-classic.mjs
  var tick = createPlayerStatTick({
    now: () => getCombatTime(),
    cycleBuffEffects: (owner, now) => getActivePassiveCycleBuffEffects(now),
    specialization: () => ensurePassiveSpecializationState(),
    rageStacks: (owner, now) => getWarriorRageStacks(now),
    rageMultiplier: (owner, now) => getWarriorRagePhysicalDamageMultiplier(now),
    overload: () => getElementalistOverloadStacks(),
    mistralStacks: (owner, now) => getTalentMistralStackCount(now),
    mossRecovery: () => getMossRecoveryOccupied(),
    regionAffixEffects: { moveBonus: (owner, now) => regionAffixEffects.moveBonus(now) },
    ascendancyNodeRules: {
      unyieldingActive: (owner, now) => ascendancyNodeRules.unyieldingActive(now),
      flowStacks: (owner, now) => ascendancyNodeRules.flowStacks(now),
      rooted: (owner, now) => ascendancyNodeRules.rooted(now)
    }
  });
  var playerStatTick = Object.freeze({ ...tick, create: () => tick.create(game) });
  var cache = createPlayerStatCache({ contextFields: PLAYER_STAT_CONTEXT_FIELDS, selfCheckAnswers: PLAYER_STAT_SELF_CHECK_ANSWERS }, {
    tick,
    zone: (id) => getZone(id),
    signature: (state) => getPersistentBuildSignature(state),
    calculate: (state, includeBreakdowns, inputTick) => equipmentStatCalculator(includeBreakdowns, false, true, inputTick),
    finish: (core, includeBreakdowns) => finishPlayerStats(core, includeBreakdowns),
    defer: (callback) => Promise.resolve().then(callback),
    warn: (...args) => console.warn(...args)
  });
  var playerStatCache = Object.freeze({ ...cache, read: (includeBreakdowns, memo, status, state = game) => cache.read(includeBreakdowns, memo, status, state) });
  safeExposeGlobals({ playerStatTick, playerStatCache });
})();
