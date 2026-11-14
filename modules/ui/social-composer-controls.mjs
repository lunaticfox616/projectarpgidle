// composer-controls: explicit account state and dependency ports; no ambient game/global state.
export class SocialComposerControls {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["updateChatSendButton"].forEach(name => { this[name] = this[name].bind(this); });
    }

    updateChatSendButton() {
        const button = this.deps.document.getElementById('social-chat-send');
        if (!button) return;
        button.disabled = this.state.current.chatSending || !this.services.session.socialCloudReady() || !this.services.identity.getMyNickname();
        button.textContent = this.state.current.chatSending ? this.deps._t('전송 중') : this.deps._t('전송');
        button.setAttribute('aria-busy', String(this.state.current.chatSending));
    }
}
