/** Explicit progress reset. Server acceptance must never revive the pre-reset save. */
export class CloudProgressReset {
    constructor(account, deps, links) { this.account = account; this.deps = deps; this.links = links; }

    async resetProgressStorage(userId) {
        const state = this.begin(userId);
        try {
            if (userId) {
                await this.resetCloudSaveProgress(userId, state.freshGame);
                state.serverCommitted = true;
                this.deps.game = state.freshGame;
            }
            this.deps.resetLocalSave(state.freshGame);
            this.deps.game = state.freshGame;
            this.account.current.pendingForcedSyncOptions = null;
            this.deps.location.reload();
        } catch (error) {
            throw this.recoverFailure(state, error);
        }
    }

    begin(userId) {
        const previousStatus = this.deps.getLocalSaveStatus();
        if (previousStatus.status === 'newer-build') throw new Error(previousStatus.message);
        const context = this.links.runtime.captureCloudSaveContext();
        this.links.runtime.assertCloudSaveContext(context);
        if (context.userId !== userId) throw new Error('로그인 계정이 변경되었습니다. 초기화 대상을 다시 확인해주세요.');
        const state = { context, previousStatus, previousSkipUnload: this.deps.window.__skipUnloadSaveOnce,
            serverCommitted: false, freshGame: this.deps.cloneDefaultGame() };
        state.freshGame.saveMeta.lastModifiedAt = Date.now();
        this.deps.setLocalSaveRuntimeState('resetting', { writable: false, message: this.deps._t('진행 데이터를 초기화하는 중입니다.') });
        this.deps.window.__skipUnloadSaveOnce = true;
        this.deps.setLoadingOverlayState(true, { title: this.deps._t('진행 데이터 초기화'), detail: this.deps._t('초기화가 끝날 때까지 기다려주세요.'), caption: this.deps._t('저장 처리 중') });
        return state;
    }

    async resetCloudSaveProgress(userId, freshGame) {
        await this.links.repository.fetchCloudSaveSummary();
        const expectedRevision = this.account.current.lastRemoteRevision;
        freshGame.saveMeta.cloudUserId = userId;
        const row = await this.links.repository.commitCloudSavePayload(this.deps.createCloudSavePayload(freshGame), { expectedRevision, expectedUserId: userId });
        freshGame.saveMeta.cloudRevision = row.revision;
        freshGame.saveMeta.lastCloudSyncAt = new Date(row.updated_at).getTime();
        freshGame.saveMeta.cloudPending = false;
        this.account.current.lastRemoteRevision = row.revision;
        this.account.current.lastRemoteUpdatedAt = freshGame.saveMeta.lastCloudSyncAt;
    }

    recoverFailure(state, error) {
        // A late reply from a replaced account/save may not reset the new screen's write guard.
        const current = this.links.runtime.isCloudSaveContextCurrent(state.context)
            || this.links.runtime.isCloudSaveContextCurrent({ ...state.context, owner: state.freshGame });
        if (!current) return error;
        this.deps.setLoadingOverlayState(false);
        this.deps.window.__skipUnloadSaveOnce = state.previousSkipUnload;
        if (!state.serverCommitted) {
            this.deps.setLocalSaveRuntimeState(state.previousStatus.status, state.previousStatus);
            return error;
        }
        this.deps.setLocalSaveRuntimeState('write-failed', { writable: false, message: this.deps._t('서버 초기화는 완료했지만 기기 저장에 실패했습니다.') });
        this.deps.gameplayStarted = false;
        this.deps.setStartupOverlayActive(true);
        return new Error('서버 초기화는 완료했지만 기기 저장에 실패했습니다. 저장공간을 확인한 뒤 서버 기록으로 이어가세요. ' + error.message);
    }
}
