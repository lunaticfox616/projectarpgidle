// tooltip: explicit account state and dependency ports; no ambient game/global state.
export class SocialTooltip {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["ensureSocialTooltip","tipMapByScope","showSocialTip","moveSocialTip","openTipModal"].forEach(name => { this[name] = this[name].bind(this); });
    }

    ensureSocialTooltip() {
        let tip = this.deps.document.getElementById('social-tooltip');
        if (tip) return tip;
        tip = this.deps.document.createElement('div');
        tip.id = 'social-tooltip'; tip.className = 'social-tooltip'; tip.style.display = 'none';
        this.deps.document.body.appendChild(tip);
        return tip;
    }

    tipMapByScope(scope) {
        return scope === 'chat' ? this.state.current.chatTips : (scope === 'pick' ? this.state.current.pickTips : this.state.current.profileTips);
    }

    showSocialTip(event, scope, key) {
        let html = this.tipMapByScope(scope)[key];
        if (!html) return;
        let tip = this.ensureSocialTooltip();
        tip.innerHTML = html; tip.style.display = 'block';
        this.moveSocialTip(event);
    }

    moveSocialTip(event) {
        let tip = this.deps.document.getElementById('social-tooltip');
        if (!tip || tip.style.display === 'none') return;
        let pad = 16, w = tip.offsetWidth * this.deps.uiDisplay.factor, h = tip.offsetHeight * this.deps.uiDisplay.factor;
        let x = event.clientX + pad, y = event.clientY + pad;
        if (x + w > this.deps.window.innerWidth - 8) x = event.clientX - w - pad;
        if (x < 8) x = 8;
        if (y + h > this.deps.window.innerHeight - 8) y = this.deps.window.innerHeight - h - 8;
        if (y < 8) y = 8;
        tip.style.left = x / this.deps.uiDisplay.factor + 'px'; tip.style.top = y / this.deps.uiDisplay.factor + 'px';
    }

    openTipModal(scope, key) {
        let html = this.tipMapByScope(scope)[key];
        if (!html) return;
        this.services.reset.hideSocialTip();
        if (scope === 'profile' && this.services.profileView.showProfileItemDetail(html)) return;
        let modal = this.services.profileView.ensureProfileModal();
        modal.style.display = 'flex';
        let body = this.deps.document.getElementById('social-profile-body');
        if (body) body.innerHTML = `<div class="social-equip-grid">${html}</div>`;
    }
}
