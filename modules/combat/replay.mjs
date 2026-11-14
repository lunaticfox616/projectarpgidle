import { ReplayRules } from './replay-rules.mjs';
import { ReplayProjection } from './replay-projection.mjs';

const REPLAY_SLICE_MS = 12;

function checkReplayCancelled(options) {
    if (!options.isCancelled?.()) return;
    const error=new Error('정산 작업이 종료되었습니다.');
    error.name='AbortError';
    throw error;
}

/** Orchestrates real/projected slices. Browser callbacks run only after committed state is restored. */
export class CombatReplay {
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
        if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Replay duration must be finite and non-negative');
        let state = this.rules.cloneBackgroundCombatState(snapshot);
        state.isBackgroundCalculation = true;
        this.deps.playerStatCache.adopt(state);
        state.backgroundOverflowSalvageCount = 0;
        state.backgroundKillMix = { normal: 0, elite: 0, boss: 0 };
        state.backgroundStopReason = null;
        return {
            game: state, elapsedMs: Math.max(0, Math.floor(elapsedMs / 100) * 100), processedMs: 0,
            skippedMs: 0, accelerationTier: 0,
            simulatedNow: state.combatTimeMs || startNowMs || Date.now(),
            metrics: this.rules.createBackgroundCombatMetrics(state),
            // structuredClone keeps the stage rows of one cast sharing their wave/whirl state (one hit per monster).
            runtime: this.deps.structuredClone(this.deps.captureCombatRuntime())
        };
    }

    /** Execute at most budgetMs of CPU work; restore all shared state before yielding or throwing. */
    advanceCombatReplay(replay, budgetMs) {
        let committed = this.owner.game;
        let committedRuntime = this.deps.captureCombatRuntime();
        let started = this.deps.performance.now();
        try {
            this.owner.game = replay.game;
            this.deps.restoreCombatRuntime(replay.runtime);
            do {
                if (replay.processedMs >= replay.elapsedMs || this.rules.shouldStopBackgroundReplay(this.owner.game)) break;
                replay.simulatedNow += 100;
                const killsBefore = this.owner.game.loopKills;
                // One build validation per tick, as the foreground tick does (js/main.js): the build signature was 13% of a settlement.
                this.deps.combatEquipmentStats.withinTick(() => this.deps.coreLoop(replay.simulatedNow));
                if (this.owner.game.loopKills !== killsBefore) this.deps.clearBackgroundBuildMemo(this.owner.game);
                replay.processedMs += 100;
                this.rules.updateBackgroundCombatMetrics(replay.metrics, this.owner.game, replay.processedMs);
                if (this.projection.observeReplayCycle(replay, this.owner.game)) break;
                if (this.owner.game.backgroundStopReason) break;
            } while (this.deps.performance.now() - started < budgetMs);
            replay.game = this.owner.game;
            replay.runtime = this.deps.captureCombatRuntime();
        } finally {
            this.owner.game = committed;
            this.deps.restoreCombatRuntime(committedRuntime);
        }
        return replay.processedMs < replay.elapsedMs && !this.rules.shouldStopBackgroundReplay(replay.game)
        && !replay.game.backgroundStopReason;
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
        let replay = this.createCombatReplay(options.elapsedMs, options.snapshot, options.startNowMs);
        let pending;
        do { pending = this.advanceCombatReplay(replay, 50); } while (pending);
        return this.rules.finishCombatReplay(replay);
    }

    /** Waits while the page is away (no CPU while the app is inactive), then grows the replay to the duration due by now. */
    async waitCombatReplayPause(replay, options, durationMs) {
        if (!options.isPaused?.()) return durationMs;
        while (options.isPaused()) {
            checkReplayCancelled(options);
            await this.deps.scheduler.delay(250);
        }
        checkReplayCancelled(options);
        const dueMs = Math.max(durationMs, options.getElapsedMs ? options.getElapsedMs() : durationMs);
        // Whole 100 ms ticks, floored as createCombatReplay floors the first duration (the rest is not time given up).
        this.rules.extendCombatReplay(replay, Math.floor(dueMs / 100) * 100 - Math.floor(durationMs / 100) * 100);
        return dueMs;
    }

    /** @param {CombatReplayOptions} options Progress callbacks run outside the replay state and may throw. */
    async simulateBackgroundCombatChunked(options) {
        checkReplayCancelled(options);
        let replay = this.createCombatReplay(options.elapsedMs, options.snapshot, options.startNowMs);
        if (options.project) this.projection.attachReplayProjection(replay);
        let pending, durationMs = options.elapsedMs;
        do {
            durationMs = await this.waitCombatReplayPause(replay, options, durationMs);
            checkReplayCancelled(options);
            this.rules.applyCombatReplayControl(replay, options.getControl?.());
            pending = this.advanceProjectedReplay(replay, REPLAY_SLICE_MS);
            if (options.onProgress) options.onProgress(replay.processedMs + replay.skippedMs,
                replay.elapsedMs + replay.skippedMs, replay.skippedMs, this.projection.getReplayProjectionPhase(replay));
            if (pending) await this.deps.scheduler.waitFrame();
        } while (pending);
        return this.rules.finishCombatReplay(replay);
    }

    /** One slice: projected maps while a measured zone holds, else real combat (which keeps measuring). */
    advanceProjectedReplay(replay, budgetMs) {
        if (replay.projection && replay.projection.active) return this.projection.projectReplaySlice(replay, budgetMs);
        if (replay.projection) this.projection.limitLongRealCombat(replay);
        return this.advanceCombatReplay(replay, budgetMs);
    }
}
