// Cached stat cores belong to explicit state objects; foreground/build-event and settlement keys remain separate.
class PlayerStatCache {
    constructor(config, deps) {
        this.deps = deps;
        this.CONTEXT_NAMES = Object.keys(config.contextFields);
        this.selfCheckAnswers = config.selfCheckAnswers;
        this.kept = new WeakMap(); this.signed = new WeakMap(); this.settlementStates = new WeakSet();
        this.health = { answers: 0, misses: 0, bypassed: 0, checks: 0, repairs: 0, lastRepair: [] };
        this.eventDepth = 0; this.generation = 0; this.closeCheckPending = false;
        this.verifier = null; this.observer = null; this.disabled = false; this.warned = false;
    }
    usable(state) {
        return !this.disabled && this.eventDepth === 0 && (this.settlementStates.has(state) || !state.isBackgroundCalculation);
    }

    zonePrint(state) {
        return JSON.stringify(this.deps.zone(state.currentZoneId) || null, (key, value) => (key === 'exploration' ? undefined : value));
    }

    context(includeBreakdowns, memo, status, state) {
        return { includeBreakdowns: !!includeBreakdowns, memo, status, generation: this.generation, activeSkill: state.activeSkill,
            zone: this.zonePrint(state), fields: JSON.stringify(this.CONTEXT_NAMES.map(name => state[name])) };
    }

    sameContext(a, b) {
        return Object.keys(a).every(key => a[key] === b[key]);
    }

    calculate(includeBreakdowns, tick, state) {
        if (!this.observer) return this.deps.calculate(state, includeBreakdowns, tick);
        this.observer.calculating(true);
        try { return this.deps.calculate(state, includeBreakdowns, tick); } finally { this.observer.calculating(false); }
    }

    slotsOf(state) {
        let slots = this.kept.get(state);
        if (!slots) this.kept.set(state, slots = [null, null]);
        return slots;
    }

    read(includeBreakdowns, memo, status, state) {
        const tick = this.deps.tick.create(state);
        if (!this.usable(state)) {
            if (!this.disabled && this.settlementStates.has(state)) return this.readSigned(includeBreakdowns, tick, state, null);
            this.health.bypassed++;
            return this.deps.finish(this.calculate(includeBreakdowns, tick, state), includeBreakdowns);
        }
        const slots = this.slotsOf(state), slot = includeBreakdowns ? 1 : 0, current = this.context(includeBreakdowns, memo, status, state);
        const entry = slots[slot];
        if (entry && this.sameContext(entry.context, current) && this.deps.tick.matches(tick, entry.reads)) return this.answer(entry, includeBreakdowns, state);
        if (this.settlementStates.has(state)) return this.readSigned(includeBreakdowns, tick, state, current);
        this.health.misses++;
        tick.restart();
        const core = this.calculate(includeBreakdowns, tick, state);
        slots[slot] = { context: current, core, reads: tick.reads(), answers: 0 };
        return this.deps.finish(core, includeBreakdowns);
    }

    settlementContext(includeBreakdowns, state) {
        return JSON.stringify([!!includeBreakdowns, this.CONTEXT_NAMES.map(name => state[name])]) + this.zonePrint(state);
    }

    matchesSigned(entry, settlement, tick, state) {
        return !!entry && entry.settlement === settlement && this.deps.tick.matches(tick, entry.reads)
            && entry.signature === this.deps.signature(state);
    }

    readSigned(includeBreakdowns, tick, state, current) {
        let slots = this.signed.get(state);
        if (!slots) this.signed.set(state, slots = [null, null]);
        const slot = includeBreakdowns ? 1 : 0, settlement = this.settlementContext(includeBreakdowns, state), entry = slots[slot];
        if (this.matchesSigned(entry, settlement, tick, state)) {
            if (current) this.slotsOf(state)[slot] = { context: current, core: entry.core, reads: entry.reads, answers: 0 };
            return this.answer(entry, includeBreakdowns, state);
        }
        if (current) this.health.misses++; else this.health.bypassed++;
        tick.restart();
        const core = this.calculate(includeBreakdowns, tick, state), reads = tick.reads();
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
        return Object.keys({ ...before, ...after }).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key])).slice(0, 8);
    }

    selfCheck(entry, includeBreakdowns, state) {
        this.health.checks++;
        const tick = this.deps.tick.create(state), fresh = this.calculate(includeBreakdowns, tick, state);
        if (JSON.stringify(fresh.stats) === JSON.stringify(entry.core.stats)) return;
        this.health.repairs++;
        this.health.lastRepair = this.changedKeys(entry.core.stats, fresh.stats);
        entry.core = fresh;
        entry.reads = tick.reads();
        if (this.warned) return;
        this.warned = true;
        this.deps.warn('[player stat cache] kept stats went stale and were recalculated (an input changed without notice, see js/player-stat-cache.js):',
            this.health.lastRepair.join(', '));
    }

    adopt(state) { this.settlementStates.add(state); }

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
        this.deps.warn('[player stat cache] a kill or map completion ended by an error; kept stat calculations resume');
    }

    during(work) {
        this.beginEvent();
        try { return work(); } finally { this.endEvent(); }
    }

    invalidate() { this.generation++; }

    verify(callback) { this.verifier = typeof callback === 'function' ? callback : null; }

    observe(next) { this.observer = next || null; }

    setDisabled(flag) { this.disabled = !!flag; }

    report() { return { ...this.health, lastRepair: [...this.health.lastRepair] }; }
}
export function createPlayerStatCache(config, deps) {
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
