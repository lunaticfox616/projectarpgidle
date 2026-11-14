import { hasPendingCloudSave } from '../persistence/cloud-save-values.mjs';
export class CloudSaveRuntime {
    constructor(account, deps) { this.account = account; this.deps = deps; }

    rememberCloudUploadProfile(profile, owner = this.deps.game) {
        let normalized = (0, this.deps.normalizeCloudUploadProfile)(profile);
        if (!normalized) return null;
        (0, this.deps.ensureSaveMeta)(owner);
        normalized.at = normalized.at || Date.now();
        owner.saveMeta.lastCloudUploadProfile = normalized;
        this.account.current.lastSyncProfile = normalized;
        return normalized;
    }

    getCloudSaveOwnerId(snapshot = this.deps.game) {
        let ownerId = snapshot && snapshot.saveMeta && snapshot.saveMeta.cloudUserId;
        return typeof ownerId === 'string' && ownerId.trim() ? ownerId : null;
    }

    markCurrentSaveCloudOwner() {
        let userId = this.account.userId();
        if (!userId) return false;
        (0, this.deps.ensureSaveMeta)();
        this.deps.game.saveMeta.cloudUserId = userId;
        return true;
    }

    /** The running game was replaced by a loaded save (a server save, or a slot just selected): restarts what depends on it, combat runtimes,
     * hero selection, passives and the screens. */
    refreshRuntimeForLoadedSave() {
        (0, this.deps.discardQueuedNotices)();
        (0, this.deps.recoverRuntimeState)();
        (0, this.deps.applyLoadedSaveLook)();
        (0, this.deps.resetCombatRuntimesForLoadedSave)();
        (0, this.deps.resetHeroSelectionForSave)();
        this.deps.storyJournalUi.resetForSave();
        (0, this.deps.refreshPassiveVisibility)();
        (0, this.deps.refreshTabHeaderUiIfNeeded)();
        (0, this.deps.calculateReachableNodes)();
        (0, this.deps.normalizeSupportLoadout)(false);
        try {
            (0, this.deps.updateStaticUI)();
        } catch (error) {
            this.deps.console.error('updateStaticUI after save load failed:', error);
        }
        try {
            (0, this.deps.updateMobileBattlePipVisibility)();
            (0, this.deps.renderBattlefield)();
            (0, this.deps.updateMobileBattlePipVisibility)();
            (0, this.deps.renderMobileBattlePipFrame)();
        } catch (error) {
            this.deps.console.error('renderBattlefield after save load failed:', error);
        }
        (0, this.deps.updateCloudSaveUI)();
    }

    /** The server save becomes this device's copy of the account save: the slot takes it with the server's revision and time and nothing
     * pending (progress this device had not uploaded is gone from here on; enterAccountSave offered it as a file first). */
    applyExternalSave(snapshot, sourceStamp) {
        (0, this.deps.assertSaveFromKnownBuild)(snapshot);
        this.deps.window.playerGuideUi?.dismissReplay(false);
        this.deps.game = (0, this.deps.mergeDefaults)(snapshot || {});
        (0, this.deps.applySeasonContentProgression)({ silent: true });
        (0, this.deps.ensureSaveMeta)();
        this.markCurrentSaveCloudOwner();
        this.deps.game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(this.account.current.lastRemoteRevision) || 0));
        this.deps.game.saveMeta.cloudPending = false;
        if (sourceStamp) {
            this.account.current.lastRemoteUpdatedAt = sourceStamp;
            this.deps.game.saveMeta.lastCloudSyncAt = Math.max(this.deps.game.saveMeta.lastCloudSyncAt || 0, sourceStamp);
            if (!this.deps.game.saveMeta.lastModifiedAt) this.deps.game.saveMeta.lastModifiedAt = sourceStamp;
            if (!(this.deps.game.saveMeta.playedUntil > 0)) this.deps.game.saveMeta.playedUntil = this.deps.game.saveMeta.lastModifiedAt;
        }
        this.account.current.syncHalted = false;
        if (!(0, this.deps.persistLocalSave)({ touchModifiedAt: false, allowRecoveryWrite: true })) {
            throw new Error('클라우드 저장을 로컬에 기록하지 못했습니다.');
        }
        this.refreshRuntimeForLoadedSave();
    }

    getLocalCloudRevision() {
        (0, this.deps.ensureSaveMeta)();
        return Math.max(0, Math.floor(Number(this.deps.game.saveMeta.cloudRevision) || 0));
    }

    /** A commit acknowledges the body that was sent, not progress made while its reply was on the way. Advance the revision but keep
     * later changes pending (also for page-exit replies). The slot is written so a closed page keeps both the revision and that progress. */
    rememberCloudCommit(row, fingerprint) {
        const owner = this.deps.window.playerGuideUi?.liveGame() ?? this.deps.game;
        (0, this.deps.ensureSaveMeta)(owner);
        const meta = owner.saveMeta;
        meta.cloudRevision = Math.max(0, Math.floor(Number(row.revision) || 0));
        meta.lastCloudSyncAt = row.updated_at ? (new Date(row.updated_at).getTime() || Date.now()) : Date.now();
        meta.cloudPending = (0, this.deps.cloudSaveFingerprint)((0, this.deps.createCloudSyncPayload)(owner)) !== fingerprint;
        this.account.current.lastRemoteRevision = meta.cloudRevision;
        this.account.current.lastRemoteUpdatedAt = meta.lastCloudSyncAt;
        this.account.current.lastCloudCommitAt = Date.now();
        this.account.current.syncHalted = false;
        this.account.current.uploadFailureNoticed = false;
        this.account.current.lastUploadedFingerprint = fingerprint;
        (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
    }

    /** The cloud record (a full row or a summary, both carry saveMeta), passed through; throws when this page is an older release than the
     * one that wrote it (js/save.js outdatedBuildError), before any pull, upload or question. */
    cloudRecordForThisBuild(record) {
        (0, this.deps.assertSaveFromKnownBuild)(record && record.save_data);
        return record;
    }

    /** A save operation belongs to one live game, slot and account entry; a token refresh of that same entry is allowed. */
    captureCloudSaveContext() {
        return { owner: this.deps.window.playerGuideUi?.liveGame() ?? this.deps.game, userId: this.account.userId(), slotKey: (0, this.deps.getSaveSlot)().key, sessionEpoch: this.account.current.sessionEpoch };
    }

    isCloudSaveContextCurrent(context) {
        return this.account.isCurrentAccount(context.userId, context.sessionEpoch)
            && (this.deps.window.playerGuideUi?.liveGame() ?? this.deps.game) === context.owner
            && (0, this.deps.getSaveSlot)().key === context.slotKey;
    }

    assertCloudSaveContext(context) {
        if (!this.isCloudSaveContextCurrent(context)) throw new Error((0, this.deps._t)('로그인 계정이나 게임 상태가 바뀌어 클라우드 저장을 중단했습니다.'));
    }

    /** The account slot holds changes the server does not have (js/save.js persistLocalSave sets it, rememberCloudCommit clears it). */
    isCloudSaveDirty() {
        return hasPendingCloudSave(this.deps.game, (0, this.deps.getSaveSlot)());
    }

    /** Only clocks moved since the last upload: an upload would change nothing on the server. */
    isCloudSaveUnchangedSinceUpload() {
        return !!this.account.current.lastUploadedFingerprint && (0, this.deps.cloudSaveFingerprint)((0, this.deps.createCloudSyncPayload)(this.deps.game)) === this.account.current.lastUploadedFingerprint; // 올린 본문과 같은 모양
    }

    markCloudSaveUnchanged() {
        this.account.current.lastSyncAttemptAt = Date.now();
        (0, this.deps.ensureSaveMeta)();
        this.deps.game.saveMeta.cloudPending = false;
        (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
    }
}
