// 방치 정산 가속(2026-10-07, 사용자 "처음 2분에 운 좋게 극도로 희귀한 재화/아이템을 먹었다고 나머지 부분에 모두 복제하는 건 금물").
// The settlement first runs real combat (js/combat-replay.js) and records whole map cycles: one encounter start to the next,
// travel and deaths included. Once the zone has enough of them, the rest of the absence is projected one map at a time: the
// real generator lays out a fresh map, packs and objects fall at the measured rates, and every kill goes through the real
// handleEnemyDeath with fresh random rolls. Only pace crosses over from the measured part (cycle time, kill rate per pack kind,
// object use, death rate), never a currency or an item, so a lucky early drop is never multiplied. A new zone, a void rift or
// a rule the projection does not model hands the settlement back to real combat; a measured zone is projected again as soon
// as the hero is back in it. Rules: data/offline-progress.js OFFLINE_PROJECTION.
const replayProjection = (() => {
    const RULES = OFFLINE_PROJECTION;
    const PACK_KINDS = ['boss', 'encounter', 'elite', 'ordinary'];
    const NO_KILLS = Object.freeze({ full: 0, partial: 0, share: 0 });
    const SCRIPTED_ACTS = Object.freeze(['forced_defeat', 'loop_gate']);

    function projectionZoneKey(state) {
        const zone = getZone(state.currentZoneId);
        if (!zone) return String(state.currentZoneId);
        if (zone.type === 'atlasMap') return `atlas|${state.atlas && state.atlas.run ? state.atlas.run.map.tier : 'closed'}`;
        return `${zone.id}|${zone.name}|${zone.tier}`;
    }
    /** A fight or rule the projection does not model: an entry-ticket boss, the woodsman, a void rift, a hunt that stops, a
     * scripted story boss. */
    function isProjectionHeldBack(state) {
        const rift = !!(state.voidRift && state.voidRift.active);
        return !!(state.inTicketBossFight || state.woodsmanBuildLock || rift || state.offlineHuntMode === 'stopBeforeBoss'
            || state.settings.mapCompleteAction === 'stop' || isScriptedStoryAct(state));
    }
    /** A story act whose boss stops at 1 life (forced defeat, loop gate): only real combat resolves it. Every other act is
     * 'normal' and projects (a truthy check here held all ten acts in real combat). */
    function isScriptedStoryAct(state) {
        const zone = getZone(state.currentZoneId), act = zone && zone.type === 'act' ? getStoryActByZoneId(zone.id) : null;
        return !!(act && SCRIPTED_ACTS.includes(act.specialType));
    }
    function isProjectionStopped(state) {
        return !!(shouldStopBackgroundReplay(state) || state.backgroundStopReason);
    }
    function isProjectionEligible(state) {
        const zone = getZone(state.currentZoneId);
        if (!zone || !RULES.zoneTypes.includes(zone.type) || !actExplorationState.current(state)) return false;
        return !isProjectionHeldBack(state) && !isProjectionStopped(state);
    }

    // ------------------------------------------------------------------ measuring the real part
    function projectionPackKind(pack) {
        if (pack.stage !== null && pack.stage !== undefined) return 'boss';
        if (pack.encounter) return 'encounter';
        return pack.eliteIds.length ? 'elite' : 'ordinary';
    }
    /** The living members of a pack, still waiting in their room or already in the fight. */
    function projectionPackMembers(pack, state) {
        return pack.aliveIds.map(id => pack.waiting.find(enemy => enemy.id === id) || state.enemies.find(enemy => enemy.id === id))
            .filter(Boolean);
    }
    function openProjectionCycle(run, state, atMs) {
        const packs = run.packs.filter(pack => !pack.objectId).map(pack => ({ pack, kind: projectionPackKind(pack),
            size: pack.aliveIds.length, hp: projectionPackMembers(pack, state).reduce((sum, enemy) => sum + (enemy.maxHp || 0), 0) }));
        return { key: projectionZoneKey(state), run, packs, startMs: atMs, deaths: state.loopDeaths || 0 };
    }
    function countProjectionObjects(run) {
        const use = {};
        for (const row of (run.objects && run.objects.entries) || []) {
            const count = use[row.kind] || (use[row.kind] = { seen: 0, used: 0 });
            count.seen++;
            if (row.phase === 'spent') count.used++;
        }
        return use;
    }
    function closeProjectionCycle(log, state, atMs) {
        const cycle = log.open;
        log.open = null;
        if (!cycle) return;
        const packs = cycle.packs.map(row => ({ kind: row.kind, size: row.size, hp: row.hp,
            killed: Math.max(0, row.size - row.pack.aliveIds.length) }));
        log.closed.push({ key: cycle.key, ms: atMs - cycle.startMs, packs, objects: countProjectionObjects(cycle.run),
            deaths: Math.max(0, (state.loopDeaths || 0) - cycle.deaths), level: state.level || 1 });
        log.sinceMeasureMs = 0;
    }
    function readProjectionPackModel(cycles) {
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
    function readProjectionObjectRates(cycles, packs) {
        const total = kinds => cycles.reduce((sum, cycle) => kinds.reduce((acc, kind) => {
            const use = cycle.objects[kind];
            return use ? { seen: acc.seen + use.seen, used: acc.used + use.used } : acc;
        }, sum), { seen: 0, used: 0 });
        const props = total(['pot', 'crate']), coverage = (packs.ordinary || NO_KILLS).full;
        const route = kind => { const seen = total([kind]); return seen.seen >= RULES.objectSampleMin ? seen.used / seen.seen : coverage; };
        const breakRate = props.seen ? props.used / props.seen : 0;
        return { chest: 0, nest: 0, pot: breakRate, crate: breakRate, sealed: route('sealed'), ambush: route('ambush') };
    }
    /** Newest first: every cycle at the hero's newest level, and older ones only while too few or too short were measured. A hero
     * that grows (the first hour of a loop levels every minute) is projected at its newest pace, a steady one on every cycle. */
    function selectCalibrationCycles(cycles) {
        const picked = [], newest = cycles.length ? cycles[cycles.length - 1].level : 0;
        let measuredMs = 0;
        for (let index = cycles.length - 1; index >= 0; index--) {
            const enough = picked.length >= RULES.minCycles && measuredMs >= RULES.minMeasuredMs;
            if (enough && cycles[index].level < newest) break;
            picked.push(cycles[index]);
            measuredMs += cycles[index].ms;
        }
        return { cycles: picked, measuredMs, level: newest };
    }
    /** Mean map time and life killed per map. A cycle from an older level counts half as much per level behind the newest: a
     * growing hero's newest maps are its pace (the first hour of a loop: map time 140 s at level 8, 58 s at level 15), older
     * ones only fill the minimum. A steady hero's cycles share one level and count evenly. */
    function readProjectionPace(cycles, level) {
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
    function readProjectionCalibration(log, key) {
        const { cycles, measuredMs, level } = selectCalibrationCycles(log.closed.filter(cycle => cycle.key === key && cycle.ms > 0));
        if (cycles.length < RULES.minCycles || measuredMs < RULES.minMeasuredMs) return null;
        const packs = readProjectionPackModel(cycles);
        return { key, level, ...readProjectionPace(cycles, level), packs, objects: readProjectionObjectRates(cycles, packs),
            deathRate: Math.min(1, cycles.reduce((sum, cycle) => sum + cycle.deaths, 0) / cycles.length) };
    }
    /** Every whole cycle of the zone so far, so a cycle measured again during the projection refines the pace. */
    function readyProjectionCalibration(log, state, realMs) {
        if (realMs < RULES.minRealMs || !isProjectionEligible(state)) return null;
        const key = projectionZoneKey(state), calibration = readProjectionCalibration(log, key);
        if (calibration) log.cache.set(key, calibration);
        return log.cache.get(key) || null;
    }
    /** advanceCombatReplay calls this after every real tick. A run that was not there before closes the last cycle and opens a
     * new one; returns true when the projection takes over at this map's start, so the real slice stops exactly here. A cycle
     * due to be measured is measured first: taking over here would hand it straight back (no progress, 0.1 s per round trip). */
    function observeReplayCycle(replay, state) {
        const log = replay.projection, run = log ? actExplorationState.current(state) : null;
        if (!run || run.arrival || run === log.run) return false;
        closeProjectionCycle(log, state, replay.processedMs);
        log.run = run;
        log.open = openProjectionCycle(run, state, replay.processedMs);
        const calibration = readyProjectionCalibration(log, state, replay.processedMs - log.projectedMs);
        log.active = calibration && !isProjectionRemeasureDue(replay, calibration, state) ? calibration : null;
        log.fresh = !!log.active;
        return !!log.active;
    }

    // ------------------------------------------------------------------ projecting one map
    /** The next map at once: travel time is in the measured cycle. A death or a completion may already have set out. */
    function beginProjectedEncounter() {
        if (actExplorationState.current(game) || !(game.moveTimer > 0)) startMoving(false);
        game.moveTimer = 0;
        startEncounterRun();
    }
    /** Whether the hero falls in this map, else whether it reaches the boss before the time runs out (share < 1: the last map). */
    function planProjectedCycle(calibration, share) {
        const dies = Math.random() < calibration.deathRate * share;
        return { dies, bossDown: !dies && Math.random() < share, share };
    }
    function chooseProjectedMembers(pack, calibration, plan) {
        const members = projectionPackMembers(pack, game), kind = projectionPackKind(pack);
        if (kind === 'boss') return plan.bossDown ? members : [];
        // The boss rises only after every elite of the map has fallen (actExplorationState bossReady).
        if (plan.bossDown && pack.eliteIds.length) return members;
        const model = calibration.packs[kind] || NO_KILLS, roll = Math.random();
        if (roll < model.full * plan.share) return members;
        if (roll >= (model.full + model.partial) * plan.share) return [];
        return members.filter(() => Math.random() < model.share);
    }
    /** The real kill path on a board of one: rewards roll fresh, corpse effects find nobody else, the pack and map update. */
    function killProjectedEnemy(pack, enemy, pStats) {
        if (pack) pack.waiting = pack.waiting.filter(row => row !== enemy);
        const board = game.enemies.filter(row => row !== enemy);
        enemy.hp = 0;
        game.enemies = [enemy];
        handleEnemyDeath(enemy, pStats);
        game.enemies = board.concat(game.enemies);
        return enemy.maxHp || 0;
    }
    function isProjectionInterrupted() {
        return isProjectionHeldBack(game) || isProjectionStopped(game);
    }
    function killProjectedPacks(run, calibration, plan, pStats) {
        const stage = pack => (pack.stage === null || pack.stage === undefined ? -1 : pack.stage);
        let hp = 0;
        for (const pack of run.packs.filter(row => !row.objectId).sort((a, b) => stage(a) - stage(b))) {
            for (const enemy of chooseProjectedMembers(pack, calibration, plan)) {
                hp += killProjectedEnemy(pack, enemy, pStats);
                if (isProjectionInterrupted()) return { hp, interrupted: true };
            }
        }
        return { hp, interrupted: false };
    }
    function settleProjectedObjects(run, calibration, plan, pStats) {
        for (const row of (run.objects && run.objects.entries) || []) {
            if (row.phase !== 'ready' || Math.random() >= (calibration.objects[row.kind] || 0) * plan.share) continue;
            actExplorationProgress.objects.settleProjected(run, row, enemy => killProjectedEnemy(null, enemy, pStats));
            if (isProjectionInterrupted()) return true;
        }
        return false;
    }
    /** The hero falls (the real defeat rule: experience, atlas portal, act retreat) or, with the boss down, the real completion. */
    function finishProjectedCycle(plan, pStats) {
        if (plan.dies) {
            game.playerHp = 0;
            handlePlayerDefeat(getZone(game.currentZoneId), pStats, null, { fatalElement: 'other', noToast: true });
        } else if (actExplorationProgress.canFinish()) playerStatCache.during(finishEncounterRun);
    }
    /** A map takes the measured cycle time, stretched or shortened by how much life fell in it against the measured mean. A map
     * the hero falls in keeps the whole time: it fought until it fell (shortened, a dying build ran 9% more maps than real). */
    function projectedCycleMs(replay, calibration, plan, outcome) {
        const [low, high] = RULES.timeScale, expected = plan.dies ? 0 : calibration.killedHp * plan.share;
        const scale = expected > 0 ? Math.min(high, Math.max(outcome.interrupted ? 0 : low, outcome.hp / expected)) : 1;
        return Math.min(replay.elapsedMs - replay.processedMs, Math.round(calibration.cycleMs * plan.share * scale / 100) * 100);
    }
    function advanceProjectedClock(replay, ms) {
        if (!(ms > 0)) return;
        game.combatTimeMs = getCombatTime() + ms;
        const loop = game.records && game.records.currentLoop;
        // Records count only gaps of 5 s or less (js/records.js tickRecordActiveTime), so the projected time is added here.
        if (loop) Object.assign(loop, { activeMs: Math.max(0, Math.floor(loop.activeMs || 0)) + ms, lastTickAt: game.combatTimeMs });
        replay.simulatedNow = game.combatTimeMs;
        replay.processedMs += ms;
        replay.projection.projectedMs += ms;
        replay.projection.sinceMeasureMs += ms;
    }
    /** Another real cycle is due after a level-up since the newest measured cycle ended (until realHoldMs of real combat: the
     * first hour of a loop levels every few minutes and gets faster with each, a late hero levels every few hours), or every
     * remeasureEveryMs of projection while realBudgetMs lasts. */
    function isProjectionRemeasureDue(replay, calibration, state) {
        const log = replay.projection, realMs = replay.processedMs - log.projectedMs;
        if ((state.level || 1) > calibration.level) return realMs < RULES.realHoldMs;
        return log.sinceMeasureMs >= RULES.remeasureEveryMs && realMs < RULES.realBudgetMs;
    }
    /** One projected map. Returns 'start' when real combat takes this map from its start (a new zone, a rule it does not model,
     * a cycle due to be measured), 'middle' when it stops inside it (a void rift opened), else ''. */
    function projectReplayCycle(replay, calibration, fresh) {
        if (!fresh) beginProjectedEncounter();
        if (!isProjectionEligible(game) || projectionZoneKey(game) !== calibration.key) return 'start';
        if (isProjectionRemeasureDue(replay, calibration, game)) return 'start';
        const plan = planProjectedCycle(calibration, Math.min(1, (replay.elapsedMs - replay.processedMs) / calibration.cycleMs));
        const pStats = getPlayerStats(), run = actExplorationState.current(game);
        const outcome = killProjectedPacks(run, calibration, plan, pStats);
        if (!outcome.interrupted) outcome.interrupted = settleProjectedObjects(run, calibration, plan, pStats);
        if (!outcome.interrupted) finishProjectedCycle(plan, pStats);
        advanceProjectedClock(replay, projectedCycleMs(replay, calibration, plan, outcome));
        getBackgroundBuildMemo(game).clear();
        updateBackgroundCombatMetrics(replay.metrics, game, replay.processedMs);
        const reason = getOfflineSafetyStopReason(game, replay.metrics, replay.processedMs);
        if (reason) game.backgroundStopReason = reason;
        return outcome.interrupted && !isProjectionStopped(game) ? 'middle' : '';
    }
    /** Real combat goes on from here. A map the projection had not touched yet is measured; one it was inside is not. */
    function handBackProjection(log, where) {
        log.active = null;
        log.open = null;
        log.run = where === 'start' ? null : actExplorationState.current(game);
    }
    /** Projected maps for one slice, on the replay's own state like advanceCombatReplay. */
    function projectReplaySlice(replay, budgetMs) {
        const committed = game, committedRuntime = captureCombatRuntime(), log = replay.projection, started = performance.now();
        try {
            game = replay.game;
            restoreCombatRuntime(replay.runtime);
            game.backgroundProjecting = true;
            let handBack = '';
            while (!handBack && replay.processedMs < replay.elapsedMs && !isProjectionStopped(game)) {
                // One projected map is one tick for build validation (a level-up or a new item inside it still re-validates).
                handBack = combatEquipmentStats.withinTick(() => projectReplayCycle(replay, log.active, log.fresh));
                log.fresh = false;
                if (performance.now() - started >= budgetMs) break;
            }
            if (handBack) handBackProjection(log, handBack);
            delete game.backgroundProjecting;
            replay.game = game;
            replay.runtime = captureCombatRuntime();
        } finally {
            game = committed;
            restoreCombatRuntime(committedRuntime);
        }
        return replay.processedMs < replay.elapsedMs && !isProjectionStopped(replay.game);
    }

    // ------------------------------------------------------------------ settlement entry points (js/combat-replay.js)
    /** The settlement path (js/ui.js) projects; the diagnostic simulateBackgroundCombat stays fully real. The map running when
     * the player left is never measured: it may be a boss about to fall. */
    function attachReplayProjection(replay) {
        replay.projection = { run: actExplorationState.current(replay.game), open: null, closed: [], cache: new Map(),
            active: null, fresh: false, projectedMs: 0, sinceMeasureMs: 0, held: false, cutMs: 0 };
        return replay;
    }
    /** Real combat the projection never took over: a push through zones it clears at once repeats the zone it is in after
     * realHoldMs (the settlement restores the player's own setting), so that zone is measured and projected; anything still
     * real at realCapMs (a zone type it does not model, a map that never ends) stops there and the result says so. */
    function limitLongRealCombat(replay) {
        const log = replay.projection, realMs = replay.processedMs - log.projectedMs, settings = replay.game.settings;
        if (realMs >= RULES.realHoldMs && !log.held && !['repeatZone', 'stop'].includes(settings.mapCompleteAction)) {
            settings.mapCompleteAction = 'repeatZone';
            log.held = true;
        }
        if (realMs < RULES.realCapMs) return;
        log.cutMs += replay.elapsedMs - replay.processedMs;
        replay.skippedMs += replay.elapsedMs - replay.processedMs;
        replay.elapsedMs = replay.processedMs;
    }
    /** One slice: projected maps while a measured zone holds, else real combat (which keeps measuring). */
    function advanceProjectedReplay(replay, budgetMs) {
        if (replay.projection && replay.projection.active) return projectReplaySlice(replay, budgetMs);
        if (replay.projection) limitLongRealCombat(replay);
        return advanceCombatReplay(replay, budgetMs);
    }
    /** For the progress card: 'measure' before the first projected map, 'project' while projecting, '' otherwise. */
    function getReplayProjectionPhase(replay) {
        const log = replay.projection;
        if (!log) return '';
        if (log.active) return 'project';
        return log.projectedMs > 0 ? '' : 'measure';
    }
    return { attachReplayProjection, advanceProjectedReplay, observeReplayCycle, getReplayProjectionPhase };
})();
safeExposeGlobals({ replayProjection });
