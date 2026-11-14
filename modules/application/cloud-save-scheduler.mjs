import { CLOUD_REVISION_CONFLICT_CODE } from '../persistence/cloud-save-values.mjs';

export class CloudSaveScheduler {
    constructor(account, deps, links, timers) {
        this.account = account; this.deps = deps; this.links = links;
        this.timers = timers; this.disposed = false;
    }

    cancelScheduledCloudSync() { this.timers.cancel(); }

    scheduleCloudAutoSync() {
        if (!this.cloudAutoSyncReady()) return;
        if (this.account.current.pendingForcedSyncOptions) return this.schedulePendingForcedCloudSyncDrain();
        if (!this.links.runtime.isCloudSaveDirty()) return;
        if (Date.now() - this.account.current.lastSyncAttemptAt < this.deps.CLOUD_SYNC_MIN_INTERVAL_MS) return;
        const context = this.links.runtime.captureCloudSaveContext();
        this.timers.scheduleAutomatic(() => {
            if (this.disposed || !this.links.runtime.isCloudSaveContextCurrent(context)) return;
            if (!this.links.runtime.isCloudSaveDirty() || this.account.current.syncHalted || this.deps.document.hidden) return;
            if (this.links.runtime.isCloudSaveUnchangedSinceUpload()) return this.links.runtime.markCloudSaveUnchanged();
            this.syncCloudSave({ automatic: true }).catch(error => {
                this.deps.console.warn('auto cloud sync failed:', error);
                if (this.links.runtime.isCloudSaveContextCurrent(context)) this.noteAutoCloudSyncFailure(error);
            });
        });
    }

    schedulePendingForcedCloudSyncDrain() {
        if (this.disposed || !this.account.active) return;
        if (this.account.current.pendingForcedSyncRetryTimer || this.deps.game.isGuideReplay) return;
        const context = this.links.runtime.captureCloudSaveContext();
        this.timers.scheduleForced(() => {
            if (!this.links.runtime.isCloudSaveContextCurrent(context)) return;
            let pendingForced = this.account.current.pendingForcedSyncOptions;
            if (!pendingForced || !this.account.current.configured || !this.account.current.user || this.deps.game.isGuideReplay) return;
            if (this.account.current.busy) {
                this.schedulePendingForcedCloudSyncDrain();
                return;
            }
            this.account.current.pendingForcedSyncOptions = null;
            this.syncCloudSave(pendingForced).catch(error => {
                this.deps.console.warn(`queued cloud save failed (${pendingForced.reason || 'important'}):`, error);
                if (this.links.runtime.isCloudSaveContextCurrent(context)) (0, this.deps.setCloudMessage)('대기 중이던 클라우드 저장 실패: ' + (error.message || error));
            });
        });
    }

    async syncCloudSave(options = {}) {
        if (this.disposed || !this.account.active) return;
        if (!this.account.current.configured || !this.account.current.user) return;
        const context = this.links.runtime.captureCloudSaveContext();
        await this.links.exitUpload.waitForPageExitUpload();
        if (this.disposed || !this.links.runtime.isCloudSaveContextCurrent(context)) return;
        if (this.account.current.busy || this.deps.game.isGuideReplay) {
            this.queueForcedSync(options);
            return;
        }
        await this.performSync(options, context);
    }

    queueForcedSync(options) {
        if (options.force !== true) return;
        this.account.current.pendingForcedSyncOptions = { ...options, force: true, reason: options.reason || 'important' };
        (0, this.deps.setCloudMessage)((0, this.deps._t)('클라우드 업로드 대기 중... ({reason})', { reason: this.account.current.pendingForcedSyncOptions.reason }));
        (0, this.deps.updateCloudSaveUI)();
        this.schedulePendingForcedCloudSyncDrain();
    }

    async performSync(options, context) {
        this.account.current.busy = true;
        this.account.current.lastSyncAttemptAt = Date.now();
        (0, this.deps.setCloudMessage)(options.reason ? (0, this.deps._t)('클라우드 업로드 중... ({reason})', { reason: options.reason }) : (options.automatic ? '자동 클라우드 업로드 중...' : '클라우드 업로드 중...'));
        (0, this.deps.updateCloudSaveUI)();
        try {
            let fresh = await this.links.tokens.ensureFresh(options.reason || '클라우드 저장');
            if (!fresh) return;
            this.links.runtime.assertCloudSaveContext(context);
            if (this.deps.game.isGuideReplay) {
                if (options.force === true) this.account.current.pendingForcedSyncOptions ??= options;
                return;
            }
            await this.links.transfers.pushCloudSave();
            (0, this.deps.setCloudMessage)(options.automatic ? '서버에 자동으로 올렸습니다.' : '서버에 올렸습니다.');
            if (!options.automatic) (0, this.deps.addLog)((0, this.deps._t)('서버에 저장을 올렸습니다.'), 'loot-magic');
        } finally {
            this.finishSync(context);
        }
    }

    finishSync(context) {
        if (this.disposed || !this.account.isCurrentAccount(context.userId, context.sessionEpoch)) return;
        this.account.current.busy = false;
        (0, this.deps.updateCloudSaveUI)();
        if (this.account.current.pendingForcedSyncOptions) this.schedulePendingForcedCloudSyncDrain();
    }

    /** An auto upload that failed. A conflict (another device committed since this copy's revision) halts every later auto upload until the
     * account is entered again, and says so once as a toast (2026-10-27 review: the losing device played on without knowing). A connection
     * failure says so once per streak: the progress stays in this device's slot and goes up when an attempt reaches the server. */
    noteAutoCloudSyncFailure(error) {
        let text = String(error && error.message || error);
        (0, this.deps.setCloudMessage)('자동 서버 저장 실패: ' + text);
        if (typeof this.deps.showGameToast !== 'function') return;
        if (error && error.code === CLOUD_REVISION_CONFLICT_CODE) {
            if (this.account.current.syncHalted) return;
            this.account.current.syncHalted = true;
            (0, this.deps.showGameToast)(text, { tone: 'warning', duration: 9000 });
            return;
        }
        if (this.account.current.uploadFailureNoticed) return;
        this.account.current.uploadFailureNoticed = true;
        (0, this.deps.showGameToast)((0, this.deps._t)('서버에 올리지 못했습니다. 진행은 이 기기에 남아 있고, 연결되면 다시 올립니다.'), { tone: 'warning', duration: 7000 });
    }

    requestImmediateCloudSave(reason) {
        if (this.disposed || !this.account.active) return false;
        if (!this.account.current.configured || !this.account.current.user) return false;
        if (!(0, this.deps.saveGame)({ skipCloudSync: true })) return false;
        const context = this.links.runtime.captureCloudSaveContext();
        this.syncCloudSave({ automatic: true, force: true, reason: reason || 'important' }).catch(error => {
            this.deps.console.warn(`immediate cloud save failed (${reason || 'important'}):`, error);
            if (this.links.runtime.isCloudSaveContextCurrent(context)) (0, this.deps.setCloudMessage)('즉시 클라우드 저장 실패: ' + (error.message || error));
        });
        return true;
    }
    cloudAutoSyncReady() {
        if (this.disposed || !this.account.active) return false;
        return this.account.current.configured && this.account.current.user && !this.account.current.busy && !this.account.current.syncHalted && !this.deps.isStartupOverlayOpen() && !this.deps.document.hidden;
    }

    dispose() {
        this.disposed = true;
        this.timers.dispose();
        this.account.current.pendingForcedSyncOptions = null;
    }
}
