const PLAYER_STATE_ACTIONS = new Set(['cheatHold', 'cheatClear', 'chatMute', 'muteNick']);

/** Owns dialog delegation and the manual-save listener. Views only produce markup. */
export class CloudToolsController {
    constructor(deps, links, state) {
        this.deps = deps; this.links = links; this.state = state;
        this.installed = false;
        this.ready = false;
        this.saveButton = null;
        this.actions = this.createActions();
        this.selector = this.actions.map(([key]) => `[data-${key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())}]`).join(', ');
        this.onReady = () => this.initializeCloudTools();
        this.onClick = event => this.handleClick(event);
        this.onKey = event => this.handleKey(event);
        this.onSave = () => this.saveManually();
    }

    createActions() {
        const { moderation: m, feedback: f, players: p, dashboard: d } = this.links;
        return [
            ['cheatHold', m.setCheatHold.bind(m)], ['cheatClear', m.clearCheatFlags.bind(m)],
            ['chatMute', m.setChatMute.bind(m)], ['chatDelete', m.deleteChatMessage.bind(m)], ['chatClear', m.clearAllChat.bind(m)],
            ['termAdd', button => m.setBannedTerm(button, false)], ['termRemove', button => m.setBannedTerm(button, true)],
            ['muteNick', m.setChatMuteByNickname.bind(m)], ['chatPeek', m.peekPlayerChat.bind(m)],
            ['feedbackSend', f.submitPlayerFeedback.bind(f)], ['feedbackFilter', f.setAdminFeedbackFilter.bind(f)],
            ['feedbackStatus', f.setFeedbackStatus.bind(f)], ['feedbackReply', f.replyFeedback.bind(f)],
            ['playerSearch', p.searchPlayers.bind(p)], ['playerDetail', p.openPlayerDetail.bind(p)],
            ['playerSave', p.downloadPlayerSave.bind(p)], ['opsJump', d.jumpToOpsSection.bind(d)]
        ];
    }

    install() {
        if (this.installed || !this.state.active) return;
        this.installed = true;
        if (this.deps.document.readyState === 'loading') this.deps.document.addEventListener('DOMContentLoaded', this.onReady, { once: true });
        else this.initializeCloudTools();
    }

    initializeCloudTools() {
        if (!this.state.active) return;
        this.links.dialog.injectCloudToolsStyles();
        if (!this.ready) {
            this.ready = true;
            this.deps.document.addEventListener('click', this.onClick);
            this.deps.document.addEventListener('keydown', this.onKey);
        }
        const saveButton = this.deps.document.querySelector('.cfg-btn--save');
        if (saveButton !== this.saveButton) {
            this.saveButton?.removeEventListener('click', this.onSave);
            this.saveButton = saveButton;
            this.saveButton?.addEventListener('click', this.onSave);
        }
        const adminButton = this.deps.document.getElementById('btn-ops-dashboard');
        if (adminButton && new this.deps.URLSearchParams(this.deps.location.search).get('admin') === '1') adminButton.hidden = false;
    }

    handleClick(event) {
        if (!this.state.active || !event.target.closest?.('#cloud-tools-dialog')) return;
        const button = event.target.closest(this.selector);
        if (!button) return;
        const action = this.actions.find(([key]) => button.dataset[key] !== undefined);
        if (action) this.runAction(action, button);
    }

    handleKey(event) {
        if (event.key !== 'Enter' || event.isComposing || event.target.id !== 'player-query') return;
        if (!event.target.closest('#cloud-tools-dialog')) return;
        this.runAction(this.actions.find(([key]) => key === 'playerSearch'), event.target);
    }

    async runAction([key, action], button) {
        if (!this.state.active) return;
        const context = this.links.session.capture();
        try {
            await action(button);
            if (this.links.session.current(context) && PLAYER_STATE_ACTIONS.has(key)) await this.links.players.refreshPlayerViews();
        } catch (error) {
            this.deps.console.warn('cloud tools action failed:', error);
        }
    }

    saveManually() {
        if (!this.state.active) return;
        try {
            const saved = this.deps.saveGame({ manual: true });
            const message = saved ? '이 기기에 진행을 저장했습니다.' : (this.deps.getLocalSaveStatus().message
                || '진행 정산 또는 저장 복구를 마친 뒤 다시 눌러 주세요.');
            this.deps.showGameToast(message, { tone: saved ? 'success' : 'warning', duration: saved ? 2400 : 6000 });
        } catch (error) {
            this.deps.console.error('[save-ui] 수동 저장 실패:', error);
            this.deps.showGameToast(this.deps._t('저장에 실패했습니다. 게임을 닫지 말고 다시 시도해 주세요.'), { tone: 'danger', duration: 6000 });
        }
    }

    dispose() {
        if (!this.state.active) return;
        this.state.active = false;
        this.deps.document.removeEventListener('DOMContentLoaded', this.onReady);
        this.deps.document.removeEventListener('click', this.onClick);
        this.deps.document.removeEventListener('keydown', this.onKey);
        this.saveButton?.removeEventListener('click', this.onSave);
        this.saveButton = null;
        this.links.dialog.dispose();
        this.links.players.dispose();
    }
}
