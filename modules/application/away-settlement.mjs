import { awayProgressLimits, calculateBackgroundProgressMs, getBackgroundCombatSignature, offlineCombatEligible } from '../domain/away-progress.mjs';
import { AwayPauseGate } from './away-pause-gate.mjs';
import { backgroundRewardSummary } from './away-rewards.mjs';

const MIN_REAL_MS=60*1000;

/** One settlement owner. Replay produces a candidate; persistence commits it before result presentation. */
export class AwaySettlement {
    constructor(owner, deps, view) {
        this.owner=owner; this.deps=deps; this.view=view; this.pause=new AwayPauseGate(owner,deps); this.active=true;
    }

    get runtime() { return this.deps.backgroundCombatRuntime; }

    record(nowMs) {
        this.deps.window.playerGuideUi?.dismissReplay();
        const rt=this.runtime;
        if (!this.active || rt.processing || rt.failed || !this.deps.gameplayStarted) return;
        rt.hiddenAtMs=Number.isFinite(nowMs) ? nowMs : Date.now();
        rt.signature=getBackgroundCombatSignature(this.owner.game);
        rt.snapshot=this.pause.eligible(this.owner.game) ? this.deps.cloneBackgroundCombatState(this.owner.game) : null;
    }

    recordOffline(nowMs) {
        const game=this.owner.game, rt=this.runtime, savedAt=Math.max(0,Math.floor(Number(game.saveMeta.playedUntil) || 0));
        rt.launchSettlementPending=false;
        const now=Number.isFinite(nowMs) ? nowMs : Date.now(), key=this.deps.getSaveSlot().key;
        if (rt.offlineSettledSlots.includes(key) || savedAt<=0 || now<=savedAt) return false;
        rt.offlineSettledSlots.push(key);
        rt.signature=getBackgroundCombatSignature(game);
        rt.snapshot=offlineCombatEligible(game) ? this.deps.cloneBackgroundCombatState(game) : null;
        rt.hiddenAtMs=rt.snapshot ? savedAt : 0;
        return !!rt.snapshot;
    }

    mayApply(signature) {
        const game=this.owner.game;
        return getBackgroundCombatSignature(game)===signature && !(game.pendingLoopDecision || game.pendingLoopReady);
    }

    commit(result, expectedGame) {
        if (this.owner.game!==expectedGame) throw new Error('정산 중 저장 계정 또는 게임 상태가 변경되었습니다.');
        const candidate=this.deps.mergeDefaults(result.game), rt=this.runtime;
        candidate.saveMeta={...expectedGame.saveMeta};
        candidate.settings.mapCompleteAction=expectedGame.settings.mapCompleteAction;
        this.deps.yieldTutorialCardToResult();
        this.owner.game=candidate;
        rt.processing=false;
        const awaySince=rt.hiddenAtMs;
        rt.hiddenAtMs=0;
        try {
            this.deps.contentUnlockUi.announceSettledUnlocks(expectedGame);
            if (!this.deps.persistLocalSave({allowRecoveryWrite:this.deps.getLocalSaveStatus().status==='write-failed'})) throw new Error('방치 보상 저장에 실패했습니다. 이전 진행은 유지됩니다.');
            this.deps.restoreCombatRuntime(result.runtime);
            rt.snapshot=null; rt.signature='';
        } catch (error) {
            this.owner.game=expectedGame;
            this.owner.tutorials.sync(expectedGame);
            rt.hiddenAtMs=awaySince;
            throw error;
        }
        if (this.deps.document.hidden || rt.appInactive) this.record(Date.now());
    }

    begin(nowMs) {
        const rt=this.runtime;
        if (!this.active || rt.processing || rt.appInactive || this.deps.document.hidden) return null;
        const snapshot=rt.snapshot, original=this.owner.game, startedAtMs=rt.hiddenAtMs;
        const actualElapsedMs=Math.max(0,nowMs-startedAtMs), limits=awayProgressLimits(this.deps.getOfflineProgressConfig,snapshot || original);
        const effectiveProgressMs=calculateBackgroundProgressMs(actualElapsedMs,MIN_REAL_MS,limits.efficiencyRate,limits.effectiveLimitMs);
        if (!snapshot || effectiveProgressMs<=0) { rt.snapshot=null; rt.hiddenAtMs=0; return null; }
        rt.processing=true; rt.failed=false; rt.accelerationTier=0; rt.finishRequested=false;
        return {snapshot,original,startedAtMs,actualElapsedMs,limits,effectiveProgressMs,committed:false};
    }

    simulate(run) {
        return this.deps.simulateBackgroundCombatChunked({
            elapsedMs:run.effectiveProgressMs,snapshot:run.snapshot,startNowMs:run.startedAtMs,project:true,
            isCancelled:()=>!this.active,
            isPaused:()=>this.deps.document.hidden || this.runtime.appInactive,
            getElapsedMs:()=>{
                run.actualElapsedMs=Math.max(run.actualElapsedMs,Date.now()-run.startedAtMs);
                return calculateBackgroundProgressMs(run.actualElapsedMs,MIN_REAL_MS,run.limits.efficiencyRate,run.limits.effectiveLimitMs);
            },
            getControl:()=>({tier:this.runtime.accelerationTier,finish:this.runtime.finishRequested}),
            onProgress:(done,total,skipped,phase)=>this.view.updateBackgroundProgressOverlay(done,total,run.actualElapsedMs,skipped,phase)
        });
    }

    async presentResult(run, result, summary) {
        const total=result.processedMs+result.skippedMs;
        this.view.updateBackgroundProgressOverlay(total,total,run.actualElapsedMs,result.skippedMs);
        this.view.complete();
        await this.deps.waitFrame();
        if (!this.active) return;
        this.view.showBackgroundCombatResult({actualElapsedMs:run.actualElapsedMs,effectiveProgressMs:result.processedMs,summary,
            capped:run.actualElapsedMs>=run.limits.recognitionLimitMs,limits:run.limits,stopped:result.stopped,stopReason:result.stopReason,
            skippedMs:result.skippedMs,realMs:result.realMs,projectedMs:result.projectedMs,heldZone:result.heldZone,cutMs:result.cutMs});
        this.view.restoreBattlefieldBeforeBackgroundReplay();
    }

    async start(nowMs) {
        const run=this.begin(nowMs);
        if (!run) return false;
        this.deps.setBattleFxSuppressed(true);
        try {
            this.view.restoreBattlefieldBeforeBackgroundReplay(false);
            this.view.hideBackgroundProgressOverlay();
            this.view.updateBackgroundProgressOverlay(0,run.effectiveProgressMs,run.actualElapsedMs);
            await this.deps.waitFrame();
            if (!this.active) return false;
            const result=await this.simulate(run);
            if (!this.active) return false;
            if (!this.mayApply(this.runtime.signature)) throw new Error('정산 중 사냥 상태가 변경되었습니다.');
            const summary=backgroundRewardSummary(this.deps,run.snapshot,result.game,result.metrics,result.overflowSalvaged);
            this.commit(result,run.original);
            run.committed=true;
            await this.presentResult(run,result,summary);
            return true;
        } catch (error) {
            if (this.active) this.reportFailure(error,run.committed);
            return run.committed;
        } finally {
            this.runtime.processing=false;
            this.deps.setBattleFxSuppressed(false);
            if (!this.runtime.failed) this.view.hideBackgroundProgressOverlay();
        }
    }

    reportFailure(error, committed) {
        this.deps.console.error('offline combat settlement failed:',error);
        if (committed) { this.deps.addLog('방치 보상은 저장되었습니다. 결과 화면을 표시하지 못했습니다: '+error.message,'loot-rare'); return; }
        this.runtime.failed=true;
        this.view.failure(error);
    }

    async startOffline(nowMs) {
        if (!this.active || !this.recordOffline(nowMs)) return false;
        return this.start(nowMs);
    }

    faster(finish=false) {
        const rt=this.runtime;
        if (!this.active || !rt.processing || rt.finishRequested) return;
        rt.finishRequested=finish;
        rt.accelerationTier=Math.min(4,rt.accelerationTier+(finish ? 0 : 1));
        this.view.renderBackgroundSpeedControls(finish);
    }

    visibility() {
        if (!this.active || typeof this.deps.document==='undefined') return;
        if (this.deps.document.hidden) this.record(Date.now());
        else this.start(Date.now());
    }

    dispose() { this.active=false; this.deps.disposePaint(); this.view.dispose(); }
}
