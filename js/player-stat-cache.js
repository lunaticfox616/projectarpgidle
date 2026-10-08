// Per-tick inputs and the settlement cache of the stat calculator (getPlayerStats, 2026-10-08).
// The calculation reads the clock, the hero's life and charges, timed buffs and the enemies only through a tick made here
// (playerStatTick). Everything else it reads is the build, which a settlement cannot change between kills, level-ups, deaths and
// map changes (js/background-build-cache.js). So a settlement keeps one calculation until the build memo turns over or a tick
// value the calculation read changes (playerStatCache); the per-call end (finishPlayerStats in js/combat.js) still runs every call.
// Each reader is the expression the calculation used to evaluate in place, moved here unchanged. A reader with a side effect
// (expiry cleanup, the last-hit clock) still runs on every call that needs its value, because a kept calculation is checked by
// reading its values again.
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
    /** Objects compare by content: a reader may build a new array or hand out a live buff each call. */
    function fingerprint(value) {
        return value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
    }
    /** One call's values: each reader runs at most once, and the names read since restart() are what a kept calculation needs. */
    function create() {
        const now = getCombatTime(), values = new Map(), read = new Set();
        return {
            get(name) {
                if (!values.has(name)) values.set(name, READERS[name](now));
                read.add(name);
                return values.get(name);
            },
            restart() { read.clear(); },
            reads() { return [...read].map(name => [name, fingerprint(values.get(name))]); }
        };
    }
    function matches(tick, reads) {
        return reads.every(([name, print]) => Object.is(fingerprint(tick.get(name)), print));
    }
    return Object.freeze({ create, matches, names: Object.keys(READERS) });
})();

const playerStatCache = (() => {
    const MEMO_KEY = 'player-stat-core';
    // Kill handling and map completion change build inputs under one memo revision (experience and gem levels, mastery, the
    // stump, rewards, trials): js/combat.js brackets them. Stats asked for inside are calculated fresh and not kept, and a
    // calculation kept before one ends is not used after it.
    let eventDepth = 0, generation = 0;
    let verifier = null, disabled = false;
    // Only a settlement's own replay state (js/combat-replay.js createCombatReplay), which game logic alone edits. A live state
    // with the background flag set by hand (tests, tools) may have its build edited in place, so it is calculated every call.
    const settlementStates = new WeakSet();
    function context(includeBreakdowns, status) {
        return { includeBreakdowns: !!includeBreakdowns, status, generation, activeSkill: game.activeSkill,
            zone: JSON.stringify(getZone(game.currentZoneId) || null) };
    }
    function sameContext(a, b) {
        return a.includeBreakdowns === b.includeBreakdowns && a.status === b.status && a.generation === b.generation
            && a.activeSkill === b.activeSkill && a.zone === b.zone;
    }
    function calculate(includeBreakdowns, tick) {
        return equipmentStatCalculator(includeBreakdowns, false, true, tick);
    }
    /**
     * Stats for one call, inside combatEquipmentStats.read (disabled gear already masked).
     * @param {boolean} includeBreakdowns
     * @param {Map<string, unknown>|null} memo The settlement build memo, read before the gear mask; null outside settlements.
     * @param {object} status The equipment evaluation the mask came from (a new one when the gear changes).
     */
    function read(includeBreakdowns, memo, status) {
        const tick = playerStatTick.create();
        if (!memo || eventDepth > 0 || disabled || !settlementStates.has(game)) return finishPlayerStats(calculate(includeBreakdowns, tick), includeBreakdowns);
        const current = context(includeBreakdowns, status), kept = memo.get(MEMO_KEY);
        if (kept && sameContext(kept.context, current) && playerStatTick.matches(tick, kept.reads)) {
            const stats = finishPlayerStats(kept.core, includeBreakdowns);
            if (verifier) verifier(stats, kept, () => finishPlayerStats(calculate(includeBreakdowns, playerStatTick.create()), includeBreakdowns));
            return stats;
        }
        tick.restart();
        const core = calculate(includeBreakdowns, tick);
        memo.set(MEMO_KEY, { context: current, core, reads: tick.reads() });
        return finishPlayerStats(core, includeBreakdowns);
    }
    /** A settlement's replay state may keep calculations (js/combat-replay.js). */
    function adopt(state) { settlementStates.add(state); }
    function beginEvent() { eventDepth++; }
    function endEvent() {
        eventDepth = Math.max(0, eventDepth - 1);
        generation++;
    }
    /** @template T @param {() => T} work @returns {T} */
    function during(work) {
        beginEvent();
        try { return work(); } finally { endEvent(); }
    }
    /** Tests only (scripts/smoke-player-stat-cache.js): called on every kept answer with a way to calculate it fresh. */
    function verify(callback) { verifier = typeof callback === 'function' ? callback : null; }
    /** Tests only: calculate every call, to compare a settlement with and without kept calculations. */
    function setDisabled(flag) { disabled = !!flag; }
    return Object.freeze({ read, adopt, beginEvent, endEvent, during, verify, setDisabled });
})();

safeExposeGlobals({ playerStatTick, playerStatCache });
