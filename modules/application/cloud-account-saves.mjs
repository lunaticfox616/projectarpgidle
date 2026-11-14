import { canMoveGuestSave, guestCanReplaceAccount, summarizeSaveProgress } from '../persistence/cloud-save-values.mjs';
export class CloudAccountSaves {
    constructor(account, deps, links) { this.account = account; this.deps = deps; this.links = links;  }

    /** Entering the account (login, sign-up, 계정 저장으로 이어하기): the server save is the truth (2026-10-30, user decision). The
     * account's slot on this device (js/save.js saveSlot) is read and compared with the server by revision alone:
     * - no server save: this device's copy (or the guest save on sign-up) becomes the first server save;
     * - the server is at this copy's revision: what the copy has not uploaded yet goes up, and play continues from the copy;
     * - the server moved on (another upload, a hall trade or a restore): its full save replaces the copy; progress the copy had not uploaded is dropped, with one
     *   log line (2026-11-01 사용자: 플레이어에게 파일을 받게 하지 않는다).
     * A matching lastModifiedAt is not evidence of our own upload: server trades preserve that client stamp while changing the body.
     * Revision mismatches always read the authoritative full body, including when our own page-exit reply was lost. */
    async enterAccountSave(options = {}) {
        const userId = this.links.session.getActiveCloudUserId();
        if (!userId) throw new Error('로그인이 필요합니다.');
        const context = this.links.runtime.captureCloudSaveContext();
        const record = this.links.runtime.cloudRecordForThisBuild(await this.links.repository.fetchCloudSaveSummary());
        this.links.runtime.assertCloudSaveContext(context);
        const previousUserId = (0, this.deps.getSaveSlot)().userId || null;
        this.activateAccountSaveSlot(userId);
        if (!record || !record.save_data) return await this.createFirstCloudSave(options.signUp === true);
        const accountContext = this.links.runtime.captureCloudSaveContext();
        const kept = await this.continueFromAccountCopy(userId);
        this.links.runtime.assertCloudSaveContext(accountContext);
        if (kept) return kept;
        return await this.pullAccountSave(userId, previousUserId, options);
    }

    /** The server moved past this device's copy: its full save replaces the copy. When the read fails, the slot that was in use comes back
     * (전: 이 기기에 사본이 없으면 빈 1레벨 캐릭터가 남았다). Progress is reported dropped only when the copy held something the server body
     * lacks: a page-exit upload whose reply was lost leaves the same content there, and the server's jsonb only reorders its keys. */
    async pullAccountSave(userId, previousUserId, options) {
        const context = this.links.runtime.captureCloudSaveContext();
        const pending = this.links.runtime.getCloudSaveOwnerId() === userId && this.deps.game.saveMeta.cloudPending;
        const localPrint = pending ? (0, this.deps.cloudSaveContentPrint)((0, this.deps.createCloudSyncPayload)(this.deps.game)) : '';
        let full;
        try {
            full = await this.links.repository.readFullCloudSaveForPull();
        } catch (error) {
            if (previousUserId !== userId && this.links.runtime.isCloudSaveContextCurrent(context)) this.loadSaveSlotIntoGame(previousUserId);
            throw error;
        }
        this.links.runtime.assertCloudSaveContext(context);
        const dropped = pending && localPrint !== (0, this.deps.cloudSaveContentPrint)(full.save_data);
        this.links.runtime.applyExternalSave(full.save_data, this.links.repository.getRemoteSaveStamp(full));
        const note = dropped ? '다른 기기에서 저장한 뒤라 서버 저장으로 이어서 합니다. 이 기기에서 올리지 못한 진행은 지웠습니다.' : '서버 저장으로 이어서 합니다.';
        (0, this.deps.setCloudMessage)(note);
        if (!options.silent) (0, this.deps.addLog)(note, 'loot-magic');
        return 'pulled-server';
    }

    /** The slot holds this account's copy at the server's revision, read and written without fault: what it has not uploaded yet goes up,
     * and play continues from it (the outcome). Otherwise null, and the server save replaces the copy (a copy that could not be written,
     * write-failed or corrupt, is repaired that way). */
    async continueFromAccountCopy(userId) {
        if (this.links.runtime.getCloudSaveOwnerId() !== userId || this.links.runtime.getLocalCloudRevision() !== this.account.current.lastRemoteRevision || (0, this.deps.getLocalSaveStatus)().status !== 'ok') return null;
        if (!this.deps.game.saveMeta.cloudPending) {
            (0, this.deps.setCloudMessage)((0, this.deps._t)('이 기기의 계정 저장이 서버와 같아 그대로 이어서 합니다.'));
            return 'cached-current';
        }
        await this.links.transfers.pushCloudSave();
        (0, this.deps.setCloudMessage)((0, this.deps._t)('이 기기에서 아직 올리지 않았던 진행을 서버에 올렸습니다.'));
        return 'pushed-pending';
    }

    /** Leaves the slot in use (its last state written, when it holds a save) and loads the account's slot into the running game: its copy of
     * the server save, or a fresh default when this device has none. The guest save that stays behind is noted for the move button. */
    activateAccountSaveSlot(userId) {
        if ((0, this.deps.getSaveSlot)().userId === userId) return;
        this.deps.window.playerGuideUi?.dismissReplay(false);
        if ((0, this.deps.getLocalSaveStatus)().status === 'ok' && (0, this.deps.canPersistLocalSave)()) (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
        this.loadSaveSlotIntoGame(userId);
    }

    /** Loads the guest slot back into the running game (leaving an account). */
    activateGuestSaveSlot() {
        if ((0, this.deps.getSaveSlot)().kind === 'guest') return;
        this.loadSaveSlotIntoGame(null);
    }

    /** Switches to a slot (an account's, or the guest's for null) and loads it into the running game, without writing the slot in use. */
    loadSaveSlotIntoGame(userId) {
        this.deps.window.playerGuideUi?.dismissReplay(false);
        (0, this.deps.selectSaveSlot)(userId);
        (0, this.deps.loadGame)();
        (0, this.deps.applySeasonContentProgression)({ silent: true });
        this.account.current.guestSaveSummary = userId ? this.summarizeGuestSave((0, this.deps.readGuestSave)()) : null;
        this.links.runtime.refreshRuntimeForLoadedSave();
    }

    /** Loop and level of a guest save with progress, or null (none, or a fresh default). Read once per account entry, not per screen update. */
    summarizeGuestSave(guestSave) {
        if (!guestSave || this.links.repository.isLikelyBootstrapLocalSave(guestSave)) return null;
        return this.saveProgressSummary(guestSave);
    }

    /** Loop and level of a save: what the move question names and what decides whether the guest save is ahead (guestSaveIsAhead). */
    saveProgressSummary(save) {
        return summarizeSaveProgress(save);
    }

    /** The account has no server save: the game in its slot (a fresh default, a copy whose first upload failed, or this device's guest save)
     * goes up as revision 1. Sign-up takes the guest save (the 2026-10-03 rule); a first login (a social account's first entry, an email
     * account confirmed by mail) asks, since a new account's first login is its sign-up (2026-11-08: before, the login uploaded a fresh
     * default and the settings' move button was the only way, gone after the first kill). */
    async createFirstCloudSave(signUp) {
        const context = this.links.runtime.captureCloudSaveContext();
        const guestSave = (0, this.deps.readGuestSave)();
        const wanted = await this.wantsGuestSaveAsFirstSave(guestSave, signUp);
        this.links.runtime.assertCloudSaveContext(context);
        const adopted = wanted && this.adoptGuestSaveIntoAccount(guestSave);
        this.links.runtime.markCurrentSaveCloudOwner();
        this.deps.game.saveMeta.cloudRevision = 0;
        await this.links.transfers.pushCloudSave();
        if (wanted && !adopted) {   // the refusal (why the guest save stayed a guest save) is the message to keep, and to show
            (0, this.deps.showGameToast)(this.account.current.lastMessage, { tone: 'warning', duration: 9000 });
            return 'pushed-first';
        }
        (0, this.deps.setCloudMessage)(adopted ? '게스트 저장을 이 계정의 첫 서버 저장으로 올렸습니다.' : '이 계정의 첫 서버 저장을 올렸습니다.');
        return adopted ? 'pushed-guest' : 'pushed-first';
    }

    /** Whether the guest save becomes the account's first server save: it has progress, the account's slot on this device is still a fresh
     * default (a copy whose first upload failed stays), and on a login the player says so (sign-up takes it without asking). */
    async wantsGuestSaveAsFirstSave(guestSave, signUp) {
        const summary = this.summarizeGuestSave(guestSave);
        if (!summary || !this.links.repository.isLikelyBootstrapLocalSave(this.deps.game)) return false;
        if (signUp) return true;
        const message = [
            (0, this.deps._t)('이 계정에는 아직 서버 저장이 없습니다. 이 기기의 게스트 저장(루프 {loop}, 레벨 {level})을 이 계정의 저장으로 옮길까요?', summary),
            (0, this.deps._t)('옮기면 게스트 저장은 이 기기에서 지워지고, 다른 계정으로는 옮길 수 없습니다. 옮기지 않으면 새 모험으로 시작하고, 게스트 저장은 이 기기에 남습니다.')
        ].join('\n');
        const answer = await (0, this.deps.requestGameConfirmation)(message, { title: (0, this.deps._t)('게스트 저장 옮기기'), tone: 'warning', confirmLabel: (0, this.deps._t)('옮기기'), cancelLabel: (0, this.deps._t)('새로 시작'), dismissOnBackdrop: false });
        return answer === true;   // 새로 시작 and Escape resolve null
    }

    /** Moves the guest save into the account's slot as this device's copy, keeping the slot's revision; the guest slot empties, so one guest
     * save never lives in two accounts. Returns false (and says why) when the check (js/guest-save-check.js) refuses it. */
    adoptGuestSaveIntoAccount(guestSave) {
        const candidate = (0, this.deps.mergeDefaults)(guestSave);
        const verdict = this.deps.guestSaveCheck.inspect(candidate, Date.now());
        if (!verdict.ok) {
            (0, this.deps.setCloudMessage)((0, this.deps._t)('정상 플레이로는 나올 수 없는 값이 있어 게스트 저장을 옮기지 않았습니다: {problems}', { problems: verdict.problems.join(', ') }));
            return false;
        }
        const revision = this.links.runtime.getLocalCloudRevision();
        this.deps.game = candidate;
        (0, this.deps.applySeasonContentProgression)({ silent: true });
        (0, this.deps.ensureSaveMeta)();
        this.links.runtime.markCurrentSaveCloudOwner();
        this.deps.game.saveMeta.cloudRevision = revision;
        this.deps.game.saveMeta.cloudPending = true;
        if (!(0, this.deps.persistLocalSave)({ touchModifiedAt: false, allowRecoveryWrite: true })) throw new Error('계정 저장 칸에 기록하지 못해 게스트 저장을 옮기지 않았습니다.');
        (0, this.deps.removeGuestSave)();
        this.account.current.guestSaveSummary = null;
        this.links.runtime.refreshRuntimeForLoadedSave();
        return true;
    }

    /** 설정 > 클라우드 세이브의 게스트 저장 옮기기 단추가 보이는 때: 계정 모드이고, 이 기기에 진행이 있는 게스트 저장이 있고, 계정의 저장이 아직
     * 아무것도 하지 않은 새 게임이거나 게스트 저장보다 뒤일 때(2026-11-08: 전에는 새 게임일 때만이라, 새 계정으로 들어간 뒤 자동 사냥의 첫
     * 처치만으로 단추가 사라졌고 게스트 저장을 옮길 길이 없었다). */
    canMoveGuestSaveIntoAccount() {
        return canMoveGuestSave(this.account.current, (0, this.deps.getSaveSlot)(), this.deps.game, this.deps.defaultGame);
    }

    /** The account save a guest save (its summary) may replace: a fresh default, or one behind it, a lower loop or the same loop and a lower level. */
    guestSaveIsAhead(guest, accountSave) {
        return guestCanReplaceAccount(guest, accountSave, this.deps.defaultGame);
    }

    /** The move question's text: the guest save (its summary), the account save it replaces unless that is a fresh default, and what the move means. */
    guestSaveMoveMessage(summary) {
        const lines = [(0, this.deps._t)('이 기기의 게스트 저장(루프 {loop}, 레벨 {level})을 이 계정의 저장으로 옮깁니다.', summary)];
        if (!this.links.repository.isLikelyBootstrapLocalSave(this.deps.game)) lines.push((0, this.deps._t)('이 계정의 지금 저장(루프 {loop}, 레벨 {level})은 지워집니다.', this.saveProgressSummary(this.deps.game)));
        lines.push((0, this.deps._t)('옮긴 뒤 게스트 저장은 이 기기에서 지워지고, 다른 계정으로는 옮길 수 없습니다.'));
        return lines.join('\n');
    }

    /** 설정 > 클라우드 세이브의 게스트 저장 옮기기: the guest save replaces the account's save (a fresh default, or one behind it) and goes up. */
    async moveGuestSaveIntoAccount() {
        if (!this.account.current.user || this.account.current.busy) return;
        const context = this.links.runtime.captureCloudSaveContext();
        const guestSave = (0, this.deps.readGuestSave)();
        if (!this.canMoveGuestSaveIntoAccount() || !this.summarizeGuestSave(guestSave)) return (0, this.deps.setCloudMessage)((0, this.deps._t)('옮길 게스트 저장이 없거나, 이 계정의 저장이 게스트 저장보다 앞서 있어 옮길 수 없습니다.'));
        const summary = this.summarizeGuestSave(guestSave);
        if (!await (0, this.deps.requestGameConfirmation)(this.guestSaveMoveMessage(summary), { title: (0, this.deps._t)('게스트 저장 옮기기'), tone: 'warning', confirmLabel: (0, this.deps._t)('옮기기') })) return;
        if (!this.links.runtime.isCloudSaveContextCurrent(context) || this.account.current.busy) return;
        await this.performGuestMove(guestSave, context);
    }

    async performGuestMove(guestSave, context) {
        this.account.current.busy = true;
        (0, this.deps.updateCloudSaveUI)();
        try {
            if (!this.adoptGuestSaveIntoAccount(guestSave)) return;
            await this.links.transfers.pushCloudSave();
            (0, this.deps.setCloudMessage)((0, this.deps._t)('게스트 저장을 이 계정으로 옮겼습니다.'));
            (0, this.deps.showGameToast)((0, this.deps._t)('게스트 저장을 이 계정으로 옮겼습니다.'), 'success');
        } catch (error) {
            if (!this.account.isCurrentAccount(context.userId, context.sessionEpoch)) {
                this.deps.console.warn('guest save move superseded:', error);
                return;
            }
            (0, this.deps.setCloudMessage)('게스트 저장 옮기기 실패: ' + (error.message || error));
            (0, this.deps.showGameToast)('게스트 저장을 옮기지 못했습니다: ' + (error.message || error), 'danger');
        } finally {
            if (this.account.isCurrentAccount(context.userId, context.sessionEpoch)) {
                this.account.current.busy = false;
                (0, this.deps.updateCloudSaveUI)();
            }
        }
    }

    /** Leave the signed-in account on this device only (the server session is not revoked) and keep using this device's save. */
    detachCloudSessionLocally() {
        this.links.session.markSkipOAuthRestoreOnce();
        this.links.session.clearSupabasePersistedSession();
        this.links.session.applyCloudSession(null);
        this.account.current.linkedProviders = [];
        this.account.current.lastRemoteUpdatedAt = 0;
    }

    /** Before leaving the account: what the copy has not uploaded goes up when the server can be reached (else it waits in the slot for
     * the next entry), and the slot is written as it stands. */
    async uploadPendingBeforeLeaving() {
        const context = this.links.runtime.captureCloudSaveContext();
        this.account.current.busy = true;
        (0, this.deps.updateCloudSaveUI)();
        try {
            if (this.links.runtime.isCloudSaveDirty()) {
                try {
                    await this.links.transfers.pushCloudSave();
                } catch (error) {
                    this.deps.console.warn('upload before leaving the account failed:', error);
                }
            } else if ((0, this.deps.getSaveSlot)().kind === 'account' && (0, this.deps.canPersistLocalSave)()) (0, this.deps.persistLocalSave)({ touchModifiedAt: false });
        } finally {
            if (this.account.isCurrentAccount(context.userId, context.sessionEpoch)) this.account.current.busy = false;
        }
    }

    /** Leaves the account on this device (다른 계정 사용, 게스트로 시작): pending changes go up, the session is dropped here (the server
     * session stays), and the guest slot comes back. */
    async leaveAccountForGuest() {
        const context = this.links.runtime.captureCloudSaveContext();
        await this.uploadPendingBeforeLeaving();
        this.links.runtime.assertCloudSaveContext(context);
        this.detachCloudSessionLocally();
        this.activateGuestSaveSlot();
    }

    /** A deleted account (js/cloud-tools-ui.js deleteCloudAccount): its slot leaves this device too, and the start screen opens on the guest slot. */
    forgetDeletedAccountSave(userId) {
        try {
            if (userId) this.deps.localStorage.removeItem((0, this.deps.accountSaveKey)(userId));
        } catch (error) {
            this.deps.console.warn('deleted account slot removal failed:', error);
        }
        this.activateGuestSaveSlot();
        (0, this.deps.openStartupGate)();
    }
}
