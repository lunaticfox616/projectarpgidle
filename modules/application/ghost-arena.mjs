import { getGhostArenaError } from '../common/ghost-arena-error.mjs';

/** Orchestrates server-owned outcomes and rendering; neither the view nor state calls back here. */
export class GhostArena {
    constructor(deps, owner, view, session) {
        this.deps = deps; this.owner = owner; this.view = view; this.session = session;
        this.onReady = () => this.injectGhostArenaStyles();
        this.installed = false;
    }

    prepare() {
        const context = this.session.capture();
        if (this.owner.syncAccount(context)) this.deps.ghostDuelStage.stop();
        return context;
    }

    busy() { return this.owner.current.loading || this.owner.current.friendlyBusy; }

    renderGhostArena() {
        if (!this.owner.active) return;
        this.prepare();
        if (!this.view.renderGhostArena()) return;
        if (this.deps.socialCloudReady() && this.owner.loadDue()) {
            this.loadGhostArena().catch(error => this.deps.console.error('ghost arena rendering failed:', error));
        }
    }

    async loadGhostArena() {
        if (!this.owner.active || !this.deps.socialCloudReady()) return;
        const context = this.prepare();
        if (this.busy()) return;
        const state = this.owner.current;
        state.loading = true;
        this.view.renderGhostArena();
        try {
            const data = await this.session.request(context, '/rest/v1/rpc/get_ghost_arena', {
                method: 'POST', body: { p_combat_version: this.deps.getGhostCombatVersion() }
            });
            this.session.assertCurrent(context);
            state.data = data;
            state.message = this.owner.serverReady() ? '' : '고스트 대결 서버를 준비 중입니다. 잠시 후 다시 시도해주세요.';
            state.loadedAt = Date.now();
            state.failedAt = 0;
        } catch (error) {
            if (this.session.current(context)) { state.message = getGhostArenaError(error); state.failedAt = Date.now(); }
        } finally {
            if (this.session.current(context)) { state.loading = false; this.view.renderGhostArena(); }
        }
    }

    async registerMyGhost() {
        if (!this.owner.active) return;
        const context = this.prepare();
        if (!this.deps.socialCloudReady()) return this.deps.showGameToast(this.deps._t('클라우드 로그인이 필요합니다.'), 'warning');
        if (!this.owner.serverReady()) return this.deps.showGameToast(this.deps._t('고스트 실전투 DB 업데이트가 필요합니다.'), 'warning');
        if (this.busy()) return;
        const character = this.deps.game, state = this.owner.current;
        state.loading = true; state.message = '';
        this.view.renderGhostArena();
        try {
            if (!await this.prepareNickname(context)) return;
            const snapshot = this.registrationSnapshot(character);
            await this.deps.uploadPlayerProfile({ required: true });
            this.session.assertCurrent(context);
            if (this.deps.game !== character) throw new Error('GHOST_SNAPSHOT_UNAVAILABLE');
            await this.session.request(context, '/rest/v1/rpc/register_my_ghost', {
                method: 'POST', body: { p_combat_version: this.deps.getGhostCombatVersion(), p_snapshot: snapshot }
            });
            this.session.assertCurrent(context);
            state.result = null; state.duel = null;
            this.deps.showGameToast(this.deps._t('현재 세팅으로 고스트를 등록했습니다.'), 'success');
        } catch (error) {
            if (this.session.current(context)) state.message = getGhostArenaError(error);
        } finally { await this.finishRanked(context); }
    }

    async prepareNickname(context) {
        await this.deps.restoreNicknameFromServer();
        this.session.assertCurrent(context);
        if (!this.deps.getMyNickname()) await this.deps.promptAndSetNickname();
        this.session.assertCurrent(context);
        return !!this.deps.getMyNickname();
    }

    registrationSnapshot(character) {
        if (this.deps.game !== character || typeof this.deps.getGhostCombatSnapshot !== 'function') throw new Error('GHOST_SNAPSHOT_UNAVAILABLE');
        return this.deps.getGhostCombatSnapshot();
    }

    async finishRanked(context) {
        if (!this.session.current(context)) return;
        this.owner.current.loading = false;
        await this.loadGhostArena();
    }

    clearDuel() {
        this.owner.current.duel = null;
        this.owner.current.duelMode = '';
        this.deps.ghostDuelStage.stop();
    }

    async fightRandomGhost() {
        if (!this.owner.active || !this.deps.socialCloudReady()) return;
        const context = this.prepare();
        if (this.busy() || !this.owner.serverReady()) return;
        const state = this.owner.current;
        state.loading = true; state.message = ''; state.result = null;
        this.clearDuel();
        this.view.renderGhostArena();
        try {
            const result = await this.session.request(context, '/rest/v1/rpc/fight_ghost', {
                method: 'POST', body: { p_combat_version: this.deps.getGhostCombatVersion() }
            });
            this.session.assertCurrent(context);
            state.result = result;
            this.applyDuel(result, 'ranked');
        } catch (error) {
            if (this.session.current(context)) state.message = getGhostArenaError(error);
        } finally { await this.finishRanked(context); }
    }

    fightCurrentProfileGhost() {
        if (!this.owner.active) return;
        const targetId = this.deps.socialState.currentProfileUserId;
        if (!targetId || targetId === this.deps.socialLoggedInUserId()) return;
        const profile = this.deps.socialState.currentProfile || {};
        this.prepare();
        this.owner.current.selectedProfile = { userId: String(targetId), nickname: String(profile.nickname || '선택한 플레이어') };
        this.owner.current.friendlyResult = null;
        this.clearDuel();
        this.deps.closePlayerProfile();
        this.deps.switchTab('tab-map', { keepWindowOpen: true });
        this.deps.switchMapSubtab('map-tab-pvp');
        this.renderGhostArena();
    }

    async fightSelectedProfileGhost() {
        if (!this.owner.active || !this.deps.socialCloudReady()) return;
        const context = this.prepare(), state = this.owner.current, selected = state.selectedProfile;
        if (!selected || this.busy() || !this.owner.serverReady()) return;
        state.friendlyBusy = true; state.friendlyResult = null; state.message = '';
        this.clearDuel();
        this.view.renderGhostArena();
        return this.performFriendlyFight(context, selected);
    }

    async performFriendlyFight(context, selected) {
        const state = this.owner.current;
        try {
            const result = await this.session.request(context, '/rest/v1/rpc/fight_ghost_target', {
                method: 'POST', body: { p_target_user_id: selected.userId, p_combat_version: this.deps.getGhostCombatVersion() }
            });
            this.session.assertCurrent(context);
            if (state.selectedProfile !== selected) return;
            state.friendlyResult = result || {};
            this.applyDuel(result, 'friendly');
        } catch (error) {
            if (this.session.current(context) && state.selectedProfile === selected) state.message = getGhostArenaError(error);
        } finally {
            if (this.session.current(context)) { state.friendlyBusy = false; this.view.renderGhostArena(); }
        }
    }

    applyDuel(result, mode) {
        this.owner.current.duel = result && result.duel || null;
        this.owner.current.duelMode = mode;
        this.playGhostDuel();
    }

    playGhostDuel() {
        if (!this.owner.active) return;
        this.prepare();
        const state = this.owner.current;
        if (!state.duel) return;
        const result = state.duelMode === 'ranked' ? state.result : state.friendlyResult;
        this.deps.ghostDuelStage.play(state.duel, { mode: state.duelMode, result });
    }

    injectGhostArenaStyles() { if (this.owner.active) this.view.injectGhostArenaStyles(); }

    install() {
        if (this.installed || !this.owner.active) return;
        this.installed = true;
        if (this.deps.document.readyState === 'loading') this.deps.document.addEventListener('DOMContentLoaded', this.onReady, { once: true });
        else this.injectGhostArenaStyles();
    }

    dispose() {
        if (!this.owner.active) return;
        this.owner.dispose();
        this.deps.document.removeEventListener('DOMContentLoaded', this.onReady);
        this.deps.ghostDuelStage.stop();
        this.view.dispose();
    }
}
