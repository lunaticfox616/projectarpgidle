import { ACCOUNT_DELETE_ERROR_TEXTS } from '../data/cloud-tools.mjs';
export class CloudAccountMaintenance {
    constructor(deps, links, state) { this.deps = deps; this.links = links; this.state = state; }

    async openCloudSaveHistory() {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        if (!this.deps.cloudState || !this.deps.cloudState.user) return (0, this.deps.showGameToast)((0, this.deps._t)('클라우드 로그인이 필요합니다.'), 'warning');
        const ticket = this.links.dialog.openCloudToolsDialog('클라우드 저장 이력', '<p class="cloud-tools-empty">불러오는 중…</p>');
        try {
            let rows = await this.links.session.request(accountContext, '/rest/v1/rpc/list_cloud_save_versions', { method: 'POST', body: {} });
            if (!this.links.dialog.current(ticket)) return;
            this.deps.document.getElementById('cloud-tools-body').innerHTML = this.links.format.renderCloudHistoryRows(Array.isArray(rows) ? rows : []);
        } catch (error) {
            if (!this.links.session.current(accountContext) || !this.links.dialog.current(ticket)) return;
            this.deps.document.getElementById('cloud-tools-body').innerHTML = `<p class="cloud-tools-error">불러오기 실패: ${this.links.format.cloudToolsEscape(error.message || error)}</p>`;
        }
    }

    async restoreCloudSaveVersion(revision) {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        const context = (0, this.deps.captureCloudSaveContext)();
        let confirmed = await (0, this.deps.requestGameConfirmation)(`리비전 ${revision}의 저장으로 복구할까요?\n현재 저장은 복구 직전 이력으로 보관됩니다.`, {
            title: '클라우드 저장 복구', tone: 'warning', confirmLabel: '복구'
        });
        if (!confirmed || !this.links.session.current(accountContext)) return;
        if (this.deps.cloudState.busy) return (0, this.deps.showGameToast)((0, this.deps._t)('클라우드 작업이 끝난 뒤 다시 눌러 주세요.'), 'warning');
        return this.restoreVersion(revision, context, accountContext);
    }

    async restoreVersion(revision, context, accountContext) {
        // 복구와 그 저장을 받는 사이에 자동 업로드가 같은 리비전으로 끼어들지 않게 막는다(2026-11-07 리뷰).
        this.deps.cloudState.busy = true;
        (0, this.deps.cancelScheduledCloudSync)();
        try {
            await this.commitCloudSaveRestore(revision, context);
            await this.receiveRestoredCloudSave(accountContext);
        } catch (error) {
            if (!this.links.session.current(accountContext)) return;
            const message = /CLOUD_SAVE_HALL_HISTORY_CONFLICT/.test(String(error.message || error))
                ? (0, this.deps._t)('전당 거래 전의 저장으로는 복구할 수 없습니다. 현재 저장은 유지됩니다.') : error.message || error;
            (0, this.deps.showGameToast)((0, this.deps._t)('저장 복구 실패: {value}', { value: message }), 'danger');
        } finally {
            if (this.links.session.current(accountContext)) {
                this.deps.cloudState.busy = false;
                (0, this.deps.updateCloudSaveUI)();
            }
        }
    }

    /** The server takes the chosen revision as its newest save (db restore_cloud_save_version), or this throws. */
    async commitCloudSaveRestore(revision, context) {
        (0, this.deps.assertCloudSaveContext)(context);
        let rows = await (0, this.deps.cloudJsonRequest)('/rest/v1/rpc/restore_cloud_save_version', {
            method: 'POST', expectedUserId: context.userId, expectedSessionEpoch: context.sessionEpoch,
            body: { target_revision: revision, expected_revision: (0, this.deps.getLocalCloudRevision)() }
        });
        (0, this.deps.assertCloudSaveContext)(context);
        let result = Array.isArray(rows) ? rows[0] : rows;
        if (!result || result.restored !== true) throw new Error('다른 기기에서 저장이 변경되었습니다. 서버 저장을 다시 불러오세요.');
    }

    /** The restored save comes down. When it cannot, the restore still stands on the server: uploads stop so this device's older copy
     * never goes over it, and the player is told to fetch it (전: "복구 실패"로 보여 옛 사본으로 계속하다 다음 접속에 그 진행이 지워졌다). */
    async receiveRestoredCloudSave(accountContext) {
        const ticket = this.links.dialog.capture();
        try {
            await (0, this.deps.pullCloudSave)({ silent: true });
        } catch (error) {
            this.deps.console.warn('restored cloud save could not be fetched:', error);
            if (!this.links.session.current(accountContext)) return;
            this.deps.cloudState.syncHalted = true;
            (0, this.deps.showGameToast)((0, this.deps._t)('복구는 끝났지만 복구한 저장을 받지 못했습니다. 설정의 서버 저장 다시 받기를 눌러 주세요.'), 'warning');
            return;
        }
        if (!this.links.session.current(accountContext)) return;
        if (this.links.dialog.current(ticket)) this.links.dialog.closeCloudToolsDialog();
        (0, this.deps.showGameToast)((0, this.deps._t)('선택한 클라우드 저장을 복구했습니다.'), 'success');
    }

    /** 설정 > 클라우드 세이브의 계정 삭제 단추. 지워지는 것을 알린 뒤 "삭제"를 그대로 쳐야 delete_my_account(db/cloud-and-playtest.sql)를 부른다.
     * 서버가 auth.users 한 줄을 지우면 모든 표가 외래키로 따라 지워지므로 이쪽은 이 기기의 토큰과 그 계정의 저장 칸을 치우고(js/ui.js
     * forgetDeletedAccountSave) 게스트 저장으로 시작 화면을 연다. 게스트 저장은 그대로 있다. */
    async deleteCloudAccount() {
        if (!this.state.active) return;
        const accountContext = this.links.session.capture();
        if (!this.deps.cloudState || !this.deps.cloudState.user) return (0, this.deps.setCloudMessage)((0, this.deps._t)('로그인한 계정이 없습니다.'));
        if (this.deps.cloudState.busy) return (0, this.deps.setCloudMessage)((0, this.deps._t)('클라우드 작업이 끝난 뒤 다시 눌러 주세요.'));
        if (!(await this.confirmAccountDeletion())) return;
        if (!this.links.session.current(accountContext) || this.deps.cloudState.busy) return;
        return this.deleteConfirmedAccount(accountContext);
    }

    async deleteConfirmedAccount(accountContext) {
        let userId = this.deps.cloudState.user.id;
        this.deps.cloudState.busy = true;
        (0, this.deps.setCloudMessage)((0, this.deps._t)('계정을 지우는 중입니다...'));
        (0, this.deps.updateCloudSaveUI)();
        let outcome = await this.requestAccountDeletion(accountContext);
        if (!this.links.session.current(accountContext)) return;
        if (outcome.failed) {
            this.deps.cloudState.busy = false;
            (0, this.deps.updateCloudSaveUI)();
            (0, this.deps.setCloudMessage)((0, this.deps._t)('계정을 지우지 못했습니다: {failed}', { failed: outcome.failed }));
            return (0, this.deps.showGameToast)((0, this.deps._t)('계정을 지우지 못했습니다.'), 'danger');
        }
        const clearedContext = await this.forgetDeletedAccountSession();
        if (!this.links.session.current(clearedContext)) return;
        this.deps.cloudState.busy = false;
        (0, this.deps.forgetDeletedAccountSave)(userId);
        (0, this.deps.setCloudMessage)(outcome.alreadyGone
            ? '이미 지워진 계정이라 이 기기의 로그인 정보와 계정 저장을 치웠습니다. 게스트 저장은 그대로 있습니다.'
            : '계정과 클라우드 자료를 지웠습니다. 게스트 저장은 그대로 있습니다.');
        (0, this.deps.showGameToast)((0, this.deps._t)('계정을 지웠습니다.'), 'success');
    }

    /** 설정 > 클라우드 세이브의 "계정과 데이터 삭제 요청" 링크(2026-10-27 사용자: 로그인한 계정은 게임 안 계정 삭제 창이 바로 열리게): 로그인했으면
     * 메일 대신 계정 삭제(deleteCloudAccount)를 연다. 메일 앱이 없는 PC에서는 메일 링크가 아무 일도 하지 않았다. 로그인하지 않았으면 메일 링크
     * 그대로 간다(서버에 지울 계정이 없다). */
    openAccountDeletionRequest(event) {
        if (!this.state.active) return;
        if (!this.deps.cloudState || !this.deps.cloudState.user) return;
        event.preventDefault();
        this.deleteCloudAccount();
    }

    /** delete_my_account를 부른다. 다른 기기에서 이미 지운 계정(ACCOUNT_NOT_FOUND)은 성공으로 본다: 이 기기의 로그인 정보만 치우면 된다(검토 지적 2026-10-27). */
    async requestAccountDeletion(accountContext) {
        try {
            await this.links.session.request(accountContext, '/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} });
            return { alreadyGone: false };
        } catch (error) {
            let message = String((error && error.message) || error);
            if (/ACCOUNT_NOT_FOUND/.test(message)) return { alreadyGone: true };
            let known = ACCOUNT_DELETE_ERROR_TEXTS.find(([pattern]) => pattern.test(message));
            return { failed: known ? known[1] : message };
        }
    }

    /** 두 단계 확인: 지워지는 것의 목록, 그 다음 "삭제"를 그대로 쳐야 한다(다른 글은 입력 칸 아래 안내로 막힌다). */
    async confirmAccountDeletion() {
        let agreed = await (0, this.deps.requestGameConfirmation)(
            '이 계정을 지울까요?\n클라우드 저장과 저장 이력, 공개 프로필과 닉네임, 채팅, 전당 전시와 구매, 고스트 기록이 모두 지워지고 되돌릴 수 없습니다.\n이 기기의 게스트 저장은 남습니다.',
            { title: '계정 삭제', tone: 'danger', confirmLabel: '계속' });
        if (!agreed) return false;
        let typed = await (0, this.deps.requestGameText)({
            title: '계정 삭제', tone: 'danger', message: '정말 지우려면 삭제 라고 입력해 주세요.', placeholder: '삭제', maxLength: 10,
            confirmLabel: '영구 삭제', validate: value => String(value || '').trim() === '삭제' ? true : '삭제 라고 입력해야 지워집니다.'
        });
        return typeof typed === 'string';
    }

    /** 지워진 계정의 흔적을 이 기기에서 치운다. 먼저 게임 세션을 기다림 없이 비워(clearCloudSessionLocally: 사용자, 토큰, 자동 저장 대기와 타이머)
     * 죽은 토큰으로 나가는 저장이나 갱신이 없게 하고, 그 다음 supabase-js의 세션을 서버에 묻지 않고(local) 지운다. 서버 로그아웃은 부르지 않는다:
     * 계정이 없어 세션도 함께 사라졌고, 부르면 만료 직전 토큰을 갱신하려다 "세션 만료" 경고를 남긴다(검토 지적 2026-10-27).
     * supabase-js의 signOut은 던지지 않고 { error }를 돌려준다. */
    async forgetDeletedAccountSession() {
        if (!this.state.active) return;
        (0, this.deps.clearCloudSessionLocally)();
        const context = this.links.session.capture();
        let client = typeof this.deps.getSupabaseClient === 'function' ? (0, this.deps.getSupabaseClient)() : null;
        if (!client) return context;
        try {
            let result = await client.auth.signOut({ scope: 'local' });
            if (result && result.error) this.deps.console.warn('supabase local sign-out after deletion failed:', result.error);
        } catch (error) {
            this.deps.console.warn('supabase local sign-out after deletion failed:', error);
        }
        return context;
    }
}
