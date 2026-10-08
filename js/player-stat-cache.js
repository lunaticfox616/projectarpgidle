// Per-tick inputs and the kept calculation of the stat calculator (getPlayerStats, 2026-10-08), for settlements and normal play.
//
// How it stays correct, and what new content has to do (scripts/smoke-player-stat-cache*.js enforce 1 to 5):
// 1. Values that change during a fight (clock, the hero's life and charges, timed buffs, enemies) are read only through
//    playerStatTick. The calculation records which tick values it read (tick.get), or for a value it only compares with a
//    threshold, the answer of that comparison (tick.when); a kept calculation is used only while they are all the same.
// 2. Build values are listed in BUILD_STAT_FIELDS / BUILD_STAT_PARTS (data/build-stat-inputs.js). The equipment evaluation
//    re-reads that build signature on every call in normal play, and a settlement cannot edit its build between events.
// 3. Other game fields the calculation reads are listed in PLAYER_STAT_CONTEXT_FIELDS, and their values are part of the key.
// 4. The calculation writes to game only what PLAYER_STAT_DERIVED_WRITES lists; anything for every call goes in finishPlayerStats.
// 5. Module state outside game that the calculation reads (a test level, a memo) is listed with its reason in the smoke's
//    MODULE_STATE; whatever changes a real input there calls playerStatCache.invalidate().
// 6. Kill handling and map completion are bracketed (js/combat.js), player input drops kept calculations (js/main.js), and any
//    other code that edits the build in place calls playerStatCache.invalidate(). Events are synchronous: one left open by an
//    error is closed once the stack unwinds.
// 7. Callers may change the top level of the stats they get, sSkill and breakdowns; other nested objects are shared with the
//    kept calculation and must be copied before changing.
// As a last guard, every PLAYER_STAT_SELF_CHECK_ANSWERS kept answers a fresh calculation is compared; a difference is repaired at
// once and reported in the console.
const playerStatTick = (() => {
    /** Charges that last until a time: the old in-place shape `(until || 0) > now ? clamp(floor(stacks)) : 0`. */
    function timedStacks(expiresAt, stacks, max, now) {
        return (expiresAt || 0) > now ? Math.max(0, Math.min(max, Math.floor(stacks || 0))) : 0;
    }
    function countInventoryRarity() {
        let inv = Array.isArray(game.inventory) ? game.inventory : [];
        let r = { normal: 0, magic: 0, rare: 0, unique: 0 };
        inv.forEach(item => { let k = (item && item.rarity) || 'normal'; if (r[k] !== undefined) r[k]++; });
        return r;
    }
    // Each reader is the expression the calculation used to evaluate in place, moved here unchanged. A reader with a side effect
    // (expiry cleanup, the last-hit clock) still runs on every call that needs its value, because a kept calculation is checked
    // by reading its values again.
    const READERS = Object.freeze({
        inventoryRarity: () => countInventoryRarity(),
        eliteTraitBuff: now => {
            const buff = game.uniqueEliteTraitBuff;
            return buff && (buff.expiresAt || 0) > now ? buff : null;
        },
        cycleBuffEffects: now => getActivePassiveCycleBuffEffects(now),
        fanaticismStacks: () => ensurePassiveSpecializationState().fanaticism.stacks,
        leechActive: () => Array.isArray(game.playerLeechInstances)
            && game.playerLeechInstances.some(instance => instance && Number(instance.remaining) > 0),
        evasionDanceStacks: now => {
            const state = game.uniqueEvasionDanceState || {};
            return (state.expiresAt || 0) > now ? Math.floor(state.stacks || 0) : null;
        },
        shadowStealth: now => (game.shadowStealthExpiresAt || 0) > now,
        killMoveStacks: now => {
            const state = game.uniqueKillMoveStacksState;
            return state && (state.expiresAt || 0) > now ? Math.max(0, Math.floor(state.stacks || 0)) : null;
        },
        regionMoveBonus: now => regionAffixEffects.moveBonus(now),
        leechEfficiency: now => !!game.uniqueLeechEfficiencyUntil && now < game.uniqueLeechEfficiencyUntil,
        aliveEnemies: () => (game.enemies || []).filter(e => e && e.hp > 0).length,
        meleeArmorAmpStacks: now => ((game.uniqueMeleeArmorAmpExpiresAt || 0) > now ? Math.floor(game.uniqueMeleeArmorAmpStacks || 0) : null),
        targetCurseCount: () => {
            const target = (game.enemies || []).find(x => x && x.hp > 0), debuffs = game.enemyConditionDebuffs;
            return target && debuffs && Array.isArray(debuffs[target.id]) ? debuffs[target.id].length : 0;
        },
        warriorRhythmStacks: now => timedStacks(game.warriorRhythmExpiresAt, game.warriorRhythmStacks, 5, now)
            + timedStacks(game.warriorRhythmDoubleExpiresAt, game.warriorRhythmDoubleStacks, 5, now),
        warriorRageStacks: now => getWarriorRageStacks(now),
        warriorRageMultiplier: now => getWarriorRagePhysicalDamageMultiplier(now),
        gladiatorFlurryStacks: now => timedStacks(game.gladiatorFlurryExpiresAt, game.gladiatorFlurryStacks, 12, now),
        gladiatorVeteranCrit: () => Math.max(0, Math.floor(game.gladiatorVeteranCritBonus || 0)),
        gladiatorSwiftGuard: () => !!game.gladiatorSwiftGuardReady,
        assassinBlurred: () => !!game.assassinBlurred,
        sinceHitSeconds: now => {
            if (!Number.isFinite(game.playerLastHitAt) || game.playerLastHitAt <= 0) game.playerLastHitAt = now;
            return Math.floor(Math.max(0, (now - Math.floor(game.playerLastHitAt || 0)) / 1000));
        },
        crusaderAegis: now => (game.crusaderLightningAegisUntil || 0) > now,
        elementalistOverload: () => getElementalistOverloadStacks(),
        guardianEnduranceStacks: now => timedStacks(game.guardianEnduranceExpiresAt, game.guardianEnduranceStacks, 5, now),
        playerHp: () => game.playerHp,
        playerEnergyShield: () => game.playerEnergyShield || 0,
        summonDeathDamagePct: now => ((game.summonDeathDamageBuffExpiresAt || 0) > now ? Math.max(0, Number(game.summonDeathDamageBuffPct || 0)) : 0),
        summonCritAspd: now => ((game.summonCritAspdExpiresAt || 0) > now
            ? Math.max(0, Math.floor(game.summonCritAspdStacks || 0)) * Math.max(0, Number(game.summonCritAspdPerStack || 0)) : 0),
        mistralStacks: now => getTalentMistralStackCount(now),
        mossRecoveryOccupied: () => getMossRecoveryOccupied()
    });
    let observer = null;
    /** Objects compare by content: a reader may build a new array or hand out a live buff each call. */
    function fingerprint(value) {
        return value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
    }
    function readValue(name, now) {
        if (!observer) return READERS[name](now);
        observer.reading(true);
        try { return READERS[name](now); } finally { observer.reading(false); }
    }
    /**
     * One call's values: each reader runs at most once. What the calculation used since restart() is what a kept calculation
     * needs: the values it read (`get`), and for a value it only compared with a threshold (`when`), the answer of that test,
     * so the hero's life moving above a threshold keeps the calculation.
     */
    function create() {
        const now = getCombatTime(), values = new Map(), read = new Set(), tests = [];
        const value = name => {
            if (!values.has(name)) values.set(name, readValue(name, now));
            return values.get(name);
        };
        return {
            get(name) {
                read.add(name);
                return value(name);
            },
            /** @param {string} name @param {(value: unknown) => boolean} test The calculation's own comparison, unchanged. */
            when(name, test) {
                const result = test(value(name));
                tests.push([name, test, result]);
                return result;
            },
            restart() { read.clear(); tests.length = 0; },
            reads() { return { values: [...read].map(name => [name, fingerprint(values.get(name))]), tests: tests.slice() }; }
        };
    }
    function matches(tick, reads) {
        return reads.values.every(([name, print]) => Object.is(fingerprint(tick.get(name)), print))
            && reads.tests.every(([name, test, result]) => tick.when(name, test) === result);
    }
    /** Tests only: told when a reader starts and ends, so reads inside readers can be told apart. */
    function observe(next) { observer = next || null; }
    return Object.freeze({ create, matches, observe, names: Object.keys(READERS) });
})();

const playerStatCache = (() => {
    const CONTEXT_NAMES = Object.keys(PLAYER_STAT_CONTEXT_FIELDS);
    const kept = new WeakMap(); // state -> [lean entry, entry with breakdowns]
    // Settlement replay states (js/combat-replay.js createCombatReplay): only game logic edits them, between bracketed events.
    const settlementStates = new WeakSet();
    // answers: kept calculations handed out; misses: calculations kept for later; bypassed: calculated without keeping.
    const health = { answers: 0, misses: 0, bypassed: 0, checks: 0, repairs: 0, lastRepair: [] };
    // Kill handling and map completion change build inputs (experience and gem levels, mastery, the stump, rewards, trials):
    // stats asked for inside are calculated fresh and not kept, and a calculation kept before one ends is not used after it.
    let eventDepth = 0, generation = 0, closeCheckPending = false;
    let verifier = null, observer = null, disabled = false, warned = false;
    /** A settlement state, or a normal-play state whose equipment evaluation re-reads the build signature on every call outside a
     * tick. A live state with the background flag set by hand (tests, tools) is neither: its build may be edited in place. */
    function usable(state) {
        return !disabled && eventDepth === 0 && (settlementStates.has(state) || !state.isBackgroundCalculation);
    }
    function context(includeBreakdowns, memo, status) {
        return { includeBreakdowns: !!includeBreakdowns, memo, status, generation, activeSkill: game.activeSkill,
            zone: JSON.stringify(getZone(game.currentZoneId) || null), fields: JSON.stringify(CONTEXT_NAMES.map(name => game[name])) };
    }
    function sameContext(a, b) {
        return Object.keys(a).every(key => a[key] === b[key]);
    }
    function calculate(includeBreakdowns, tick) {
        if (!observer) return equipmentStatCalculator(includeBreakdowns, false, true, tick);
        observer.calculating(true);
        try { return equipmentStatCalculator(includeBreakdowns, false, true, tick); } finally { observer.calculating(false); }
    }
    function slotsOf(state) {
        let slots = kept.get(state);
        if (!slots) kept.set(state, slots = [null, null]);
        return slots;
    }
    /**
     * Stats for one call, inside combatEquipmentStats.read (disabled gear already masked).
     * @param {boolean} includeBreakdowns
     * @param {Map<string, unknown>|null} memo The settlement build memo, read before the gear mask; null outside settlements.
     * @param {object} status The equipment evaluation the mask came from (a new one when the build changes).
     */
    function read(includeBreakdowns, memo, status) {
        const tick = playerStatTick.create(), state = game;
        if (!usable(state)) {
            health.bypassed++;
            return finishPlayerStats(calculate(includeBreakdowns, tick), includeBreakdowns);
        }
        const slots = slotsOf(state), slot = includeBreakdowns ? 1 : 0, current = context(includeBreakdowns, memo, status);
        const entry = slots[slot];
        if (entry && sameContext(entry.context, current) && playerStatTick.matches(tick, entry.reads)) return answer(entry, includeBreakdowns);
        health.misses++;
        tick.restart();
        const core = calculate(includeBreakdowns, tick);
        slots[slot] = { context: current, core, reads: tick.reads(), answers: 0 };
        return finishPlayerStats(core, includeBreakdowns);
    }
    function answer(entry, includeBreakdowns) {
        health.answers++;
        if (++entry.answers % PLAYER_STAT_SELF_CHECK_ANSWERS === 0) selfCheck(entry, includeBreakdowns);
        const stats = finishPlayerStats(entry.core, includeBreakdowns);
        if (verifier) verifier(stats, entry, () => finishPlayerStats(calculate(includeBreakdowns, playerStatTick.create()), includeBreakdowns));
        return stats;
    }
    function changedKeys(before, after) {
        return Object.keys({ ...before, ...after }).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])).slice(0, 8);
    }
    /** The last guard: a kept calculation that went stale (an input changed without the notice above) is repaired and reported. */
    function selfCheck(entry, includeBreakdowns) {
        health.checks++;
        const tick = playerStatTick.create(), fresh = calculate(includeBreakdowns, tick);
        if (JSON.stringify(fresh.stats) === JSON.stringify(entry.core.stats)) return;
        health.repairs++;
        health.lastRepair = changedKeys(entry.core.stats, fresh.stats);
        entry.core = fresh;
        entry.reads = tick.reads();
        if (warned) return;
        warned = true;
        console.warn('[player stat cache] kept stats went stale and were recalculated (an input changed without notice, see js/player-stat-cache.js):',
            health.lastRepair.join(', '));
    }
    /** A settlement's replay state may keep calculations (js/combat-replay.js). */
    function adopt(state) { settlementStates.add(state); }
    function beginEvent() {
        eventDepth++;
        if (closeCheckPending) return;
        closeCheckPending = true;
        Promise.resolve().then(closeAbandonedEvents);
    }
    function endEvent() {
        eventDepth = Math.max(0, eventDepth - 1);
        generation++;
    }
    /** Events run synchronously, so one still open after the stack has unwound ended by an error: keeping resumes, reported. */
    function closeAbandonedEvents() {
        closeCheckPending = false;
        if (eventDepth === 0) return;
        eventDepth = 0;
        generation++;
        console.warn('[player stat cache] a kill or map completion ended by an error; kept stat calculations resume');
    }
    /** @template T @param {() => T} work @returns {T} */
    function during(work) {
        beginEvent();
        try { return work(); } finally { endEvent(); }
    }
    /** Player input, or code that edits the build in place outside kill handling and map completion: drop kept calculations. */
    function invalidate() { generation++; }
    /** Tests only (scripts/smoke-player-stat-cache.js): called on every kept answer with a way to calculate it fresh. */
    function verify(callback) { verifier = typeof callback === 'function' ? callback : null; }
    /** Tests only: told when a calculation starts and ends. */
    function observe(next) { observer = next || null; }
    /** Tests only: calculate every call, to compare a settlement with and without kept calculations. */
    function setDisabled(flag) { disabled = !!flag; }
    /** Kept answers, misses, bypassed calls, self-checks and repairs so far (tests and the console). */
    function report() { return { ...health, lastRepair: [...health.lastRepair] }; }
    return Object.freeze({ read, adopt, beginEvent, endEvent, during, invalidate, verify, observe, setDisabled, report });
})();

safeExposeGlobals({ playerStatTick, playerStatCache });
