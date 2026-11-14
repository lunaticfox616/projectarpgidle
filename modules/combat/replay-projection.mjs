// Projection generates each reward afresh; only measured combat pace is carried forward.
const PACK_KINDS = ['boss', 'encounter', 'elite', 'ordinary'];
const NO_KILLS = Object.freeze({ full: 0, partial: 0, share: 0 });

export class ReplayProjection {
    constructor(owner, deps, rules) {
        this.owner = owner;
        this.deps = deps;
        this.rules = rules;
    }

    projectionZoneKey(state) {
        const zone = this.deps.getZone(state.currentZoneId);
        if (!zone) return String(state.currentZoneId);
        if (zone.type === 'atlasMap') return `atlas|${state.atlas && state.atlas.run ? state.atlas.run.map.tier : 'closed'}`;
        return `${zone.id}|${zone.name}|${zone.tier}`;
    }

    /** A fight or rule the projection does not model: an entry-ticket boss, the woodsman, a void rift, a hunt that stops at the map's end. */
    isProjectionHeldBack(state) {
        const rift = !!(state.voidRift && state.voidRift.active);
        return !!(state.inTicketBossFight || state.woodsmanBuildLock || rift || state.settings.mapCompleteAction === 'stop');
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
        if (pack.stage !== null && pack.stage !== undefined) return 'boss';
        if (pack.encounter) return 'encounter';
        return pack.eliteIds.length ? 'elite' : 'ordinary';
    }

    /** The living members of a pack, still waiting in their room or already in the fight. */
    projectionPackMembers(pack, state) {
        return pack.aliveIds.map(id => pack.waiting.find(enemy => enemy.id === id) || state.enemies.find(enemy => enemy.id === id))
            .filter(Boolean);
    }

    openProjectionCycle(run, state, atMs) {
        const packs = run.packs.filter(pack => !pack.objectId).map(pack => ({ pack, kind: this.projectionPackKind(pack),
            size: pack.aliveIds.length, hp: this.projectionPackMembers(pack, state).reduce((sum, enemy) => sum + (enemy.maxHp || 0), 0) }));
        return { key: this.projectionZoneKey(state), run, packs, startMs: atMs, deaths: state.loopDeaths || 0 };
    }

    countProjectionObjects(run) {
        const use = {};
        for (const row of (run.objects && run.objects.entries) || []) {
            const count = use[row.kind] || (use[row.kind] = { seen: 0, used: 0 });
            count.seen++;
            if (row.phase === 'spent') count.used++;
        }
        return use;
    }

    closeProjectionCycle(log, state, atMs) {
        const cycle = log.open;
        log.open = null;
        if (!cycle) return;
        const packs = cycle.packs.map(row => ({ kind: row.kind, size: row.size, hp: row.hp,
            killed: Math.max(0, row.size - row.pack.aliveIds.length) }));
        log.closed.push({ key: cycle.key, ms: atMs - cycle.startMs, packs, objects: this.countProjectionObjects(cycle.run),
            deaths: Math.max(0, (state.loopDeaths || 0) - cycle.deaths), level: state.level || 1 });
        log.sinceMeasureMs = 0;
    }

    readProjectionPackModel(cycles) {
        const model = {};
        for (const kind of PACK_KINDS) {
            const rows = cycles.flatMap(cycle => cycle.packs.filter(row => row.kind === kind && row.size > 0));
            if (!rows.length) continue;
            const partial = rows.filter(row => row.killed > 0 && row.killed < row.size);
            model[kind] = { full: rows.filter(row => row.killed >= row.size).length / rows.length, partial: partial.length / rows.length,
                share: partial.length ? partial.reduce((sum, row) => sum + row.killed / row.size, 0) / partial.length : 0 };
        }
        // Content rooms are route targets like elite packs (atlas measurement: 38 of 38 cleared).
        model.encounter = model.encounter || model.elite || model.ordinary || NO_KILLS;
        return model;
    }

    /** Two maps cannot measure a rare kind, so each follows its offline rule: supply chests and nests open only by hand (never
     * offline), pots and crates share one measured break rate, and a sealed chest or an ambush on the route uses its own rate
     * once enough were seen, else how much of the map the route covers (the ordinary packs' full-kill rate). */
    readProjectionObjectRates(cycles, packs) {
        const total = kinds => cycles.reduce((sum, cycle) => kinds.reduce((acc, kind) => {
            const use = cycle.objects[kind];
            return use ? { seen: acc.seen + use.seen, used: acc.used + use.used } : acc;
        }, sum), { seen: 0, used: 0 });
        const props = total(['pot', 'crate']), coverage = (packs.ordinary || NO_KILLS).full;
        const route = kind => { const seen = total([kind]); return seen.seen >= this.deps.rules.objectSampleMin ? seen.used / seen.seen : coverage; };
        const breakRate = props.seen ? props.used / props.seen : 0;
        return { chest: 0, nest: 0, pot: breakRate, crate: breakRate, sealed: route('sealed'), ambush: route('ambush') };
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
        const { cycles, measuredMs, level } = this.selectCalibrationCycles(log.closed.filter(cycle => cycle.key === key && cycle.ms > 0));
        if (cycles.length < this.deps.rules.minCycles || measuredMs < this.deps.rules.minMeasuredMs) return null;
        const packs = this.readProjectionPackModel(cycles);
        return { key, level, ...this.readProjectionPace(cycles, level), packs, objects: this.readProjectionObjectRates(cycles, packs),
            deathRate: Math.min(1, cycles.reduce((sum, cycle) => sum + cycle.deaths, 0) / cycles.length) };
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
    observeReplayCycle(replay, state) {
        const log = replay.projection, run = log ? this.deps.actExplorationState.current(state) : null;
        if (!run || run.arrival || run === log.run) return false;
        this.closeProjectionCycle(log, state, replay.processedMs);
        log.run = run;
        log.open = this.openProjectionCycle(run, state, replay.processedMs);
        const calibration = this.readyProjectionCalibration(log, state, replay.processedMs - log.projectedMs);
        log.active = calibration && !this.isProjectionRemeasureDue(replay, calibration, state) ? calibration : null;
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
        if (kind === 'boss') return plan.bossDown ? members : [];
        // The boss rises only after every elite of the map has fallen (actExplorationState bossReady).
        if (plan.bossDown && pack.eliteIds.length) return members;
        const model = calibration.packs[kind] || NO_KILLS, roll = Math.random();
        if (roll < model.full * plan.share) return members;
        if (roll >= (model.full + model.partial) * plan.share) return [];
        return members.filter(() => Math.random() < model.share);
    }

    /** The real kill path on a board of one: rewards roll fresh, corpse effects find nobody else, the pack and map update. */
    killProjectedEnemy(pack, enemy, pStats) {
        if (pack) pack.waiting = pack.waiting.filter(row => row !== enemy);
        const board = this.owner.game.enemies.filter(row => row !== enemy);
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
        const stage = pack => (pack.stage === null || pack.stage === undefined ? -1 : pack.stage);
        let hp = 0;
        for (const pack of run.packs.filter(row => !row.objectId).sort((a, b) => stage(a) - stage(b))) {
            for (const enemy of this.chooseProjectedMembers(pack, calibration, plan)) {
                hp += this.killProjectedEnemy(pack, enemy, pStats);
                if (this.isProjectionInterrupted()) return { hp, interrupted: true };
            }
        }
        return { hp, interrupted: false };
    }

    settleProjectedObjects(run, calibration, plan, pStats) {
        for (const row of (run.objects && run.objects.entries) || []) {
            if (row.phase !== 'ready' || Math.random() >= (calibration.objects[row.kind] || 0) * plan.share) continue;
            this.deps.actExplorationProgress.objects.settleProjected(run, row, enemy => this.killProjectedEnemy(null, enemy, pStats));
            if (this.isProjectionInterrupted()) return true;
        }
        return false;
    }

    /** The hero falls (the real defeat rule: experience, atlas portal, act retreat) or, with the boss down, the real completion. */
    finishProjectedCycle(plan, pStats) {
        if (plan.dies) {
            this.owner.game.playerHp = 0;
            this.deps.handlePlayerDefeat(this.deps.getZone(this.owner.game.currentZoneId), pStats, null, { fatalElement: 'other', noToast: true });
        } else if (this.deps.actExplorationProgress.canFinish()) this.deps.playerStatCache.during(this.deps.finishEncounterRun);
    }

    /** A map takes the measured cycle time, stretched or shortened by how much life fell in it against the measured mean. A map
     * the hero falls in keeps the whole time: it fought until it fell (shortened, a dying build ran 9% more maps than real). */
    projectedCycleMs(replay, calibration, plan, outcome) {
        const [low, high] = this.deps.rules.timeScale, expected = plan.dies ? 0 : calibration.killedHp * plan.share;
        const scale = expected > 0 ? Math.min(high, Math.max(outcome.interrupted ? 0 : low, outcome.hp / expected)) : 1;
        return Math.min(replay.elapsedMs - replay.processedMs, Math.round(calibration.cycleMs * plan.share * scale / 100) * 100);
    }

    advanceProjectedClock(replay, ms) {
        if (!(ms > 0)) return;
        this.owner.game.combatTimeMs = this.deps.getCombatTime() + ms;
        const loop = this.owner.game.records && this.owner.game.records.currentLoop;
        // Records count only gaps of 5 s or less (js/records.js tickRecordActiveTime), so the projected time is added here.
        if (loop) Object.assign(loop, { activeMs: Math.max(0, Math.floor(loop.activeMs || 0)) + ms, lastTickAt: this.owner.game.combatTimeMs });
        replay.simulatedNow = this.owner.game.combatTimeMs;
        replay.processedMs += ms;
        replay.projection.projectedMs += ms;
        replay.projection.sinceMeasureMs += ms;
    }

    /** Another real cycle is due after a level-up since the newest measured cycle ended (until realHoldMs of real combat: the
     * first hour of a loop levels every few minutes and gets faster with each, a late hero levels every few hours), or every
     * remeasureEveryMs of projection while realBudgetMs lasts. */
    isProjectionRemeasureDue(replay, calibration, state) {
        const log = replay.projection, realMs = replay.processedMs - log.projectedMs;
        if ((state.level || 1) > calibration.level) return realMs < this.deps.rules.realHoldMs;
        return log.sinceMeasureMs >= this.deps.rules.remeasureEveryMs && realMs < this.deps.rules.realBudgetMs;
    }

    /** One projected map. Returns 'start' when real combat takes this map from its start (a new zone, a rule it does not model,
     * a cycle due to be measured), 'middle' when it stops inside it (a void rift opened), else ''. */
    projectReplayCycle(replay, calibration, fresh) {
        if (!fresh) this.beginProjectedEncounter();
        if (!this.isProjectionEligible(this.owner.game) || this.projectionZoneKey(this.owner.game) !== calibration.key) return 'start';
        if (this.isProjectionRemeasureDue(replay, calibration, this.owner.game)) return 'start';
        const plan = this.planProjectedCycle(calibration, Math.min(1, (replay.elapsedMs - replay.processedMs) / calibration.cycleMs));
        const pStats = this.deps.getPlayerStats(), run = this.deps.actExplorationState.current(this.owner.game);
        const outcome = this.killProjectedPacks(run, calibration, plan, pStats);
        if (!outcome.interrupted) outcome.interrupted = this.settleProjectedObjects(run, calibration, plan, pStats);
        if (!outcome.interrupted) this.finishProjectedCycle(plan, pStats);
        this.advanceProjectedClock(replay, this.projectedCycleMs(replay, calibration, plan, outcome));
        this.deps.clearBackgroundBuildMemo(this.owner.game);
        this.rules.updateBackgroundCombatMetrics(replay.metrics, this.owner.game, replay.processedMs);
        return outcome.interrupted && !this.isProjectionStopped(this.owner.game) ? 'middle' : '';
    }

    /** Real combat goes on from here. A map the projection had not touched yet is measured; one it was inside is not. */
    handBackProjection(log, where) {
        log.active = null;
        log.open = null;
        log.run = where === 'start' ? null : this.deps.actExplorationState.current(this.owner.game);
    }

    /** Projected maps for one slice, on the replay's own state like advanceCombatReplay. */
    projectReplaySlice(replay, budgetMs) {
        const committed = this.owner.game, committedRuntime = this.deps.captureCombatRuntime(), log = replay.projection, started = this.deps.performance.now();
        try {
            this.owner.game = replay.game;
            this.deps.restoreCombatRuntime(replay.runtime);
            this.owner.game.backgroundProjecting = true;
            let handBack = '';
            while (!handBack && replay.processedMs < replay.elapsedMs && !this.isProjectionStopped(this.owner.game)) {
                // One projected map is one tick for build validation (a level-up or a new item inside it still re-validates).
                handBack = this.deps.combatEquipmentStats.withinTick(() => this.projectReplayCycle(replay, log.active, log.fresh));
                log.fresh = false;
                if (this.deps.performance.now() - started >= budgetMs) break;
            }
            if (handBack) this.handBackProjection(log, handBack);
            delete this.owner.game.backgroundProjecting;
            replay.game = this.owner.game;
            replay.runtime = this.deps.captureCombatRuntime();
        } finally {
            this.owner.game = committed;
            this.deps.restoreCombatRuntime(committedRuntime);
        }
        return replay.processedMs < replay.elapsedMs && !this.isProjectionStopped(replay.game);
    }

    // ------------------------------------------------------------------ settlement entry points (js/combat-replay.js)
    /** The settlement path (js/ui.js) projects; the diagnostic simulateBackgroundCombat stays fully real. The map running when
     * the player left is never measured: it may be a boss about to fall. */
    attachReplayProjection(replay) {
        replay.projection = { run: this.deps.actExplorationState.current(replay.game), open: null, closed: [], cache: new Map(),
            active: null, fresh: false, projectedMs: 0, sinceMeasureMs: 0, held: false, cutMs: 0 };
        return replay;
    }

    /** Real combat the projection never took over: a push through zones it clears at once repeats the zone it is in after
     * realHoldMs (the settlement restores the player's own setting), so that zone is measured and projected; anything still
     * real at realCapMs (a zone type it does not model, a map that never ends) stops there and the result says so. */
    limitLongRealCombat(replay) {
        const log = replay.projection, realMs = replay.processedMs - log.projectedMs, settings = replay.game.settings;
        if (realMs >= this.deps.rules.realHoldMs && !log.held && !['repeatZone', 'stop'].includes(settings.mapCompleteAction) && this.isHoldUseful(replay.game)) {
            settings.mapCompleteAction = 'repeatZone';
            log.held = true;
        }
        if (realMs < this.deps.rules.realCapMs) return;
        log.cutMs += replay.elapsedMs - replay.processedMs;
        replay.skippedMs += replay.elapsedMs - replay.processedMs;
        replay.elapsedMs = replay.processedMs;
    }

    /** The hold only helps in a zone the projection models (or before any zone): the labyrinth, the underworld and the other floor
     * contents are never projected, so holding them only stopped their climb at realHoldMs. */
    isHoldUseful(state) {
        const type = (this.deps.getZone(state.currentZoneId) || {}).type;
        return !type || this.deps.rules.zoneTypes.includes(type);
    }

    /** For the progress card: 'measure' before the first projected map, 'project' while projecting, '' otherwise. */
    getReplayProjectionPhase(replay) {
        const log = replay.projection;
        if (!log) return '';
        if (log.active) return 'project';
        return log.projectedMs > 0 ? '' : 'measure';
    }
}
